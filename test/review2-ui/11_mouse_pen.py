"""滑鼠／觸控筆的邊角情況（1280x720，dpr 1，真的滑鼠事件；筆用 CDP Input.dispatchMouseEvent 的 pointerType=pen）。
每一條印 PASS / FAIL / INFO。
python3 test/review2-ui/11_mouse_pen.py [only=<名稱片段>]"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *

ONLY = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('only=')]
LOGGER = """(() => { window.__ev = []; const t0 = performance.now();
  for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'click', 'auxclick', 'contextmenu', 'dblclick'])
    document.addEventListener(t, (e) => window.__ev.push(t + (e.pointerType ? ':' + e.pointerType : '') + '#' + (e.pointerId === undefined ? '' : e.pointerId) + 'b' + e.button + '/' + e.buttons + '@' + (e.target.id || e.target.tagName) + (e.defaultPrevented ? '!' : '')), true);
  // 冒泡階段再記一次 contextmenu 有沒有被擋掉
  window.addEventListener('contextmenu', (e) => window.__ev.push('ctxmenu-default-' + (e.defaultPrevented ? 'prevented' : 'ALLOWED') + '@' + (e.target.id || e.target.tagName))); })()"""
DRAG = "(() => { const d = window.__qp.G.drag; return d ? {id: d.id, type: d.type, far: +d.far.toFixed(1), live: d.live} : null; })()"
EV = "window.__ev.join(' ')"


async def main():
    async with async_playwright() as p:
        W, H = 1280, 720
        b, ctx, pg, msgs = await open_page(p, W, H, dsf=1)
        cdp = await ctx.new_cdp_session(pg)
        await pg.evaluate(LOGGER)
        M = pg.mouse
        aim = lambda: pg.evaluate(AIM); vol = lambda: pg.evaluate(VOLLEYS); drag = lambda: pg.evaluate(DRAG)
        want = lambda n: (not ONLY) or any(o in n for o in ONLY)
        res = []
        def rep(ok, label, info=''):
            tag = 'INFO' if ok is None else ('PASS' if ok else 'FAIL')
            res.append((tag, label)); print(f'  [{tag}] {label} {info}', flush=True)
        async def rect(i):
            return await pg.evaluate("(id) => { const b = document.getElementById(id).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height]; }", i)
        async def clr(): await pg.evaluate("window.__ev = []")

        if want('basic'):
            await fresh(pg); a0 = await aim()
            await M.move(640, 360); await M.down(); await M.move(700, 300, steps=6); a1 = await aim(); d = await drag(); await M.up(); await pg.wait_for_timeout(150)
            rep((await vol()) == 1 and a1 != a0 and d and d['type'] == 'mouse', 'left drag 85px: aims, fires once', pj({'aim': [a0, a1], 'drag': d}))
            await fresh(pg); a0 = await aim()
            await M.move(640, 360); await M.down(); await pg.wait_for_timeout(80); await M.up(); await pg.wait_for_timeout(200)
            rep((await vol()) == 0 and (await aim()) == a0, 'click without moving: no fire, aim unchanged')
            await M.dblclick(640, 360); await pg.wait_for_timeout(200)
            rep((await vol()) == 0, 'double-click: no fire', pj({'sel': await pg.evaluate("String(getSelection())")}))
            # 沒按鍵的移動不能動到瞄準
            a0 = await aim(); await M.move(300, 200, steps=5); await M.move(900, 500, steps=5)
            rep((await aim()) == a0, 'hover (no button) does not move the aim')

        if want('right'):
            await fresh(pg); await clr()
            await M.move(640, 360); await M.down(); await M.move(700, 320, steps=4); a1 = await aim()
            await M.down(button='right'); await pg.wait_for_timeout(60); d_mid = await drag(); await M.up(button='right'); await pg.wait_for_timeout(120)
            v_mid = await vol(); d_after = await drag()
            await M.move(740, 300, steps=4); a2 = await aim()
            await M.up(); await pg.wait_for_timeout(200)
            rep(v_mid == 0 and d_after is not None and a2 != a1 and (await vol()) == 1, 'right-click in the middle of a left drag: drag survives, no early fire, one volley on left release', pj({'vMid': v_mid, 'dragAfterRight': d_after, 'vEnd': await vol(), 'ev': await pg.evaluate(EV)}))
            # 左鍵先放、右鍵還按著
            await fresh(pg); await clr()
            await M.move(640, 360); await M.down(); await M.move(700, 320, steps=4)
            await M.down(button='right'); await pg.wait_for_timeout(40)
            await M.up(); await pg.wait_for_timeout(200); v1 = await vol(); d1 = await drag()
            await M.move(760, 260, steps=4); a3 = await aim()
            await M.up(button='right'); await pg.wait_for_timeout(200)
            rep(None, 'left released while right still held, then right released', pj({'volleysAfterLeftUp': v1, 'dragStillAliveAfterLeftUp': d1, 'aimKeepsMovingWithOnlyRightHeld': a3, 'volleysAfterRightUp': await vol(), 'ev': await pg.evaluate(EV)}))
            # 只按右鍵拖
            await fresh(pg); await clr(); a0 = await aim()
            await M.move(640, 360); await M.down(button='right'); await M.move(720, 300, steps=4); d = await drag(); await M.up(button='right'); await pg.wait_for_timeout(200)
            rep((await vol()) == 0 and d is None and (await aim()) == a0, 'right-button drag alone: nothing', pj({'ev': await pg.evaluate(EV)}))
            # 先右鍵按著，再按左鍵拖（瀏覽器不會再送 pointerdown）
            await fresh(pg); await clr(); a0 = await aim()
            await M.move(640, 360); await M.down(button='right'); await M.down(); await M.move(720, 300, steps=4); d = await drag(); a1 = await aim(); await M.up(); await M.up(button='right'); await pg.wait_for_timeout(200)
            rep(None, 'right held first, then left drag', pj({'drag': d, 'aimMoved': a0 != a1, 'volleys': await vol()}))

        if want('middle'):
            await fresh(pg); await clr()
            await M.move(640, 360); await M.down(); await M.move(700, 320, steps=4)
            await M.down(button='middle'); await pg.wait_for_timeout(60); await M.up(button='middle'); await pg.wait_for_timeout(120)
            v_mid = await vol(); d_after = await drag()
            await M.move(740, 300, steps=4); await M.up(); await pg.wait_for_timeout(200)
            rep(v_mid == 0 and d_after is not None and (await vol()) == 1, 'middle-click in the middle of a left drag: one volley on left release', pj({'vMid': v_mid, 'drag': d_after, 'vEnd': await vol(), 'ev': await pg.evaluate(EV)}))
            await fresh(pg); a0 = await aim()
            await M.move(640, 360); await M.down(button='middle'); await M.move(720, 300, steps=4); d = await drag(); await M.up(button='middle'); await pg.wait_for_timeout(200)
            rep((await vol()) == 0 and d is None and (await aim()) == a0, 'middle-button drag alone: nothing', pj({'scroll': await pg.evaluate("[scrollX, scrollY, document.getElementById('app').scrollTop]")}))

        if want('buttons'):
            await fresh(pg)
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; T.shield.c = T.shield.need; })()")
            out = {}
            for bid in ('btnUlt', 'btnShield', 'btnFire', 'btnPause'):
                r = await rect(bid); await clr()
                await M.move(r[0], r[1]); await M.down(button='right'); await M.up(button='right'); await pg.wait_for_timeout(80)
                await M.down(button='middle'); await M.up(button='middle'); await pg.wait_for_timeout(80)
                out[bid] = await pg.evaluate("(() => { const q = window.__qp, T = q.S.team[0]; return {armed: T.ult.armed, sh: T.shield.on, v: T.volleys, mode: q.G.mode, ev: window.__ev.filter(e => /ctxmenu/.test(e)).join(' ')}; })()")
            ok = all(not o['armed'] and not o['sh'] and o['v'] == 0 and o['mode'] == 'play' and 'ALLOWED' not in o['ev'] for o in out.values())
            rep(ok, 'right/middle click on HUD buttons: no action, no browser context menu', pj(out))
            # 左鍵各按一下
            r = await rect('btnUlt'); await M.click(r[0], r[1]); await pg.wait_for_timeout(120); a1 = await pg.evaluate("window.__qp.S.team[0].ult.armed")
            r = await rect('btnShield'); await M.click(r[0], r[1]); await pg.wait_for_timeout(120); s1 = await pg.evaluate("window.__qp.S.team[0].shield.uses")
            r = await rect('btnFire'); await M.click(r[0], r[1]); await M.click(r[0], r[1]); await pg.wait_for_timeout(150)
            rep(a1 is True and s1 == 1 and (await vol()) == 1, 'left click: ult arms once, shield once, double-click on fire = one volley', pj({'armed': a1, 'shieldUses': s1, 'volleys': await vol(), 'focus': await pg.evaluate("document.activeElement.id || document.activeElement.tagName")}))
            # 按住按鈕很久再放
            await fresh(pg); await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; })()")
            r = await rect('btnUlt'); await clr(); await M.move(r[0], r[1]); await M.down(); await pg.wait_for_timeout(1500); mid = await pg.evaluate("window.__qp.S.team[0].ult.armed"); await M.up(); await pg.wait_for_timeout(250)
            rep(mid is True and (await pg.evaluate("window.__qp.S.team[0].ult.armed")) is True, 'mouse held 1.5s on 連珠 then released: stays armed', pj({'ev': await pg.evaluate(EV)}))
            # 從畫布拖到發射鈕上放開
            await fresh(pg); r = await rect('btnFire')
            await M.move(640, 360); await M.down(); await M.move(r[0], r[1], steps=8); await M.up(); await pg.wait_for_timeout(200)
            rep((await vol()) == 1, 'drag from canvas, release over 發射: exactly one volley', pj(await vol()))
            # 從發射鈕按下去拖到畫布放開
            await fresh(pg); r = await rect('btnFire'); a0 = await aim()
            await M.move(r[0], r[1]); await M.down(); await M.move(640, 300, steps=8); a1 = await aim(); await M.up(); await pg.wait_for_timeout(200)
            rep((await vol()) == 1 and a0 == a1, 'press 發射 and drag out to the canvas: one volley (at press), aim untouched', pj({'volleys': await vol()}))

        if want('outside'):
            await fresh(pg); await clr()
            await M.move(640, 360); await M.down(); await M.move(900, 200, steps=4); await M.move(1500, -80, steps=4); await pg.wait_for_timeout(60)
            d = await drag(); a = await aim()
            await M.up(); await pg.wait_for_timeout(200)
            rep(None, 'dragged out past the window corner, released outside', pj({'dragAliveOutside': d, 'aim': a, 'volleys': await vol(), 'ev': await pg.evaluate(EV)}))
            # 放開之後滑鼠回到畫面上亂動：瞄準不能再跟著動
            a0 = await aim(); await M.move(400, 300, steps=4); await M.move(800, 500, steps=4); await pg.wait_for_timeout(60)
            rep((await aim()) == a0 and (await drag()) is None, 'after the outside release, hovering does not move the aim')

        if want('keys'):
            # 滑鼠拖到一半按空白鍵發射；放開滑鼠不能再發射一次
            await fresh(pg)
            await M.move(640, 360); await M.down(); await M.move(700, 300, steps=4)
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(120); v1 = await vol(); d1 = await drag()
            await M.move(720, 280, steps=2); await M.up(); await pg.wait_for_timeout(200)
            rep(v1 == 1 and (await vol()) == 1, 'Space while mouse-dragging fires once; releasing the mouse during the volley does not fire again', pj({'dragStillAlive': d1}))
            # 滑鼠拖到一半按 Esc 暫停、再 Esc 繼續，放開
            await fresh(pg)
            await M.move(640, 360); await M.down(); await M.move(700, 300, steps=4)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(120); m1 = await pg.evaluate("window.__qp.G.mode")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(120); m2 = await pg.evaluate("window.__qp.G.mode")
            a0 = await aim(); await M.move(760, 260, steps=4); a1 = await aim(); await M.up(); await pg.wait_for_timeout(200)
            rep(m1 == 'pause' and m2 == 'play' and (await vol()) == 0, 'Esc pause + Esc resume in the middle of a mouse drag: release does not fire', pj({'aimStillFollowsHeldMouse': a0 != a1}))
            # 滑鼠拖著不放、用空白鍵發射、一直按到下一回合才放
            await fresh(pg)
            await M.move(640, 360); await M.down(); await M.move(700, 300, steps=4)
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(100)
            await pg.evaluate(JS_TO_MY_AIM, 60); await pg.evaluate("window.__qp.G.freeze = false"); await pg.wait_for_timeout(150)
            v1 = await vol(); r = await pg.evaluate("window.__qp.S.round"); d = await drag()
            await M.up(); await pg.wait_for_timeout(200)
            rep(None, 'mouse button held from round 1 (fired with Space) until my next turn, then released without moving', pj({'round': r, 'volleysBefore': v1, 'volleysAfterRelease': await vol(), 'drag': d}))

        if want('pen'):
            async def pen(typ, x, y, buttons=1):
                await cdp.send('Input.dispatchMouseEvent', {'type': typ, 'x': x, 'y': y, 'button': 'left' if typ != 'mouseMoved' or buttons else 'none', 'buttons': buttons, 'clickCount': 1 if typ != 'mouseMoved' else 0, 'pointerType': 'pen'})
            await fresh(pg); await clr(); a0 = await aim()
            await pen('mouseMoved', 640, 360, 0); await pen('mousePressed', 640, 360)
            for k in range(1, 7): await pen('mouseMoved', 640 + 10 * k, 360 - 8 * k); await pg.wait_for_timeout(16)
            d = await drag(); a1 = await aim()
            await pen('mouseReleased', 700, 312, 0); await pg.wait_for_timeout(200)
            rep(d is not None and d['type'] == 'pen' and a1 != a0 and (await vol()) == 1, 'pen drag: aims and fires once', pj({'drag': d, 'aim': [a0, a1], 'volleys': await vol(), 'ev': await pg.evaluate(EV)}))
            await fresh(pg); await clr(); a0 = await aim()
            await pen('mouseMoved', 640, 360, 0); await pen('mousePressed', 640, 360); await pg.wait_for_timeout(60); await pen('mouseReleased', 640, 360, 0); await pg.wait_for_timeout(200)
            rep((await vol()) == 0 and (await aim()) == a0, 'pen tap: no fire')
            # 筆在畫面上方懸空移動（沒碰到）
            await pen('mouseMoved', 500, 300, 0); await pen('mouseMoved', 800, 420, 0); await pg.wait_for_timeout(60)
            rep((await aim()) == a0, 'pen hover: aim does not move')
            # 筆按 HUD 按鈕
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; })()")
            r = await rect('btnUlt'); await clr(); await pen('mouseMoved', r[0], r[1], 0); await pen('mousePressed', r[0], r[1]); await pg.wait_for_timeout(50); await pen('mouseReleased', r[0], r[1], 0); await pg.wait_for_timeout(200)
            rep((await pg.evaluate("window.__qp.S.team[0].ult.armed")) is True, 'pen tap on 連珠: armed once (not toggled twice)', pj({'ev': await pg.evaluate(EV)}))
            r = await rect('btnFire'); await pen('mouseMoved', r[0], r[1], 0); await pen('mousePressed', r[0], r[1]); await pen('mouseReleased', r[0], r[1], 0); await pg.wait_for_timeout(200)
            rep((await vol()) == 1, 'pen tap on 發射: one volley')

        if want('letterbox'):
            # 4:3 的視窗上下有黑邊：從黑邊按下去拖
            await pg.set_viewport_size({'width': 1024, 'height': 768}); await pg.wait_for_timeout(300)
            await fresh(pg); a0 = await aim(); g = await pg.evaluate("(() => { const G = window.__qp.G; return [G.ox, G.oy, G.sw, G.sh]; })()")
            await M.move(500, 30); await M.down(); await M.move(560, 200, steps=6); d = await drag(); a1 = await aim(); await M.up(); await pg.wait_for_timeout(200)
            rep(None, 'press in the black letterbox bar (above the stage) and drag into the field', pj({'stage': g, 'drag': d, 'aimMoved': a0 != a1, 'volleys': await vol(), 'target': await pg.evaluate("(document.elementFromPoint(500, 30) || {}).id")}))
            await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(300)

        print('   console/page errors:', msgs, flush=True)
        await b.close()
        print('\nsummary: PASS', sum(1 for t, _ in res if t == 'PASS'), 'FAIL', sum(1 for t, _ in res if t == 'FAIL'), 'INFO', sum(1 for t, _ in res if t == 'INFO'))
        for t, l in res:
            if t == 'FAIL': print('   FAIL:', l)

asyncio.run(main())
