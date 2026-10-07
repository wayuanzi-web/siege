"""觸控操作規則（CDP 真觸控）：橫拿 844x390、直拿 390x844（rot=1）、直拿上下顛倒（rot=-1）各跑一遍。
每一條印 PASS / FAIL / INFO。
python3 test/review2-ui/10_touch_rules.py [only=<名稱片段>] [mode=landscape|portrait|flip]"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *

ONLY = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('only=')]
MODES = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('mode=')]

LOGGER = """(() => { window.__ev = []; const t0 = performance.now();
  for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'click', 'contextmenu', 'touchend', 'touchcancel'])
    document.addEventListener(t, (e) => window.__ev.push(t + '#' + (e.pointerId === undefined ? '' : e.pointerId) + '@' + (e.target.id || e.target.tagName) + '+' + Math.round(performance.now() - t0)), true); })()"""
DRAG = "(() => { const d = window.__qp.G.drag; return d ? {id: d.id, type: d.type, far: +d.far.toFixed(1), live: d.live} : null; })()"
SAY = "(() => { const s = document.getElementById('say'); return +getComputedStyle(s).opacity > 0.05 ? s.textContent : null; })()"


async def run(p, W, H, name, flip=False):
    b, ctx, pg, msgs = await open_page(p, W, H, touch=True)
    cdp = await ctx.new_cdp_session(pg); T = Touch(cdp)
    await pg.evaluate(LOGGER)
    if flip:
        await pg.evaluate("(() => { const q = window.__qp; q.SV.flip = true; q.layout(); })()")
    rot = await pg.evaluate("window.__qp.G.rot")
    def scr(gx, gy):       # 遊戲裡的位移（右、下為正）→ 螢幕位移
        return (gx, gy) if rot == 0 else ((-gy, gx) if rot == 1 else (gy, -gx))
    cx, cy = W * 0.5, H * 0.5
    aim = lambda: pg.evaluate(AIM); vol = lambda: pg.evaluate(VOLLEYS); drag = lambda: pg.evaluate(DRAG)
    want = lambda n: (not ONLY) or any(o in n for o in ONLY)
    res = []
    def rep(ok, label, info=''):
        tag = 'INFO' if ok is None else ('PASS' if ok else 'FAIL')
        res.append((tag, label)); print(f'  [{tag}] {label} {info}', flush=True)
    async def rect(i):
        return await pg.evaluate("(id) => { const b = document.getElementById(id).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height]; }", i)
    async def gdrag(i, gx, gy, n=10, step_ms=16, x0=None, y0=None):
        dx, dy = scr(gx, gy); x0 = cx if x0 is None else x0; y0 = cy if y0 is None else y0
        await T.drag(i, x0, y0, dx, dy, n=n, step_ms=step_ms, pg=pg)
    print(f'===== {name} {W}x{H} rot={rot}', flush=True)

    if want('tap'):
        await fresh(pg); a0 = await aim()
        await T.down(1, cx, cy); await pg.wait_for_timeout(60); await T.up(1); await pg.wait_for_timeout(200)
        rep((await vol()) == 0 and (await aim()) == a0, 'tap: no fire, aim unchanged', pj({'say': await pg.evaluate(SAY)}))
        # 第二次輕點：提示只講一次
        await pg.wait_for_timeout(300); await T.down(1, cx, cy); await pg.wait_for_timeout(60); await T.up(1); await pg.wait_for_timeout(150)
        rep((await vol()) == 0, 'second tap: still no fire')

    if want('thresh'):
        for dist, should in ((8, False), (13, False), (16, True), (30, True)):
            await fresh(pg)
            await T.down(1, cx, cy); await gdrag(1, dist, 0, n=4); d = await drag(); await T.up(1); await pg.wait_for_timeout(150)
            v = await vol()
            rep((v == 1) == should, f'drag {dist}px game-right then release: {"fires" if should else "no fire"}', pj({'volleys': v, 'drag': d}))

    if want('dir'):
        await fresh(pg); a0 = await aim()
        await T.down(1, cx, cy); await gdrag(1, 0, -50); a1 = await aim()
        await gdrag(1, 60, 0, x0=cx + scr(0, -50)[0], y0=cy + scr(0, -50)[1]); a2 = await aim()
        await T.up(1); await pg.wait_for_timeout(150)
        rep(a1[0] > a0[0] + 3, 'drag game-up: steeper', pj([a0, a1]))
        rep(a2[1] > a1[1] + 3 and a2[0] < a1[0], 'drag game-right: stronger (and flatter)', pj([a1, a2]))
        rep((await vol()) == 1, 'release fires once')

    if want('back'):
        # 拖出去 30px 再拖回原點才放：照規則還是會發射（看最遠拖到哪）
        await fresh(pg); a0 = await aim()
        await T.down(1, cx, cy); await gdrag(1, 30, -30, n=6)
        ex, ey = scr(30, -30); await T.drag(1, cx + ex, cy + ey, -ex, -ey, n=6, pg=pg); a1 = await aim(); d = await drag()
        await T.up(1); await pg.wait_for_timeout(150)
        rep(None, 'drag out 42px and back to start, release', pj({'volleys': await vol(), 'aimBefore': a0, 'aimAtRelease': a1, 'drag': d}))

    if want('intro'):
        # 開場（intro 1.1 秒）就按住拖，輪到我之後繼續拖 >14px 才放：要發射
        await fresh(pg, wait=False); await pg.wait_for_timeout(250)
        ph0 = await pg.evaluate("window.__qp.S.phase")
        await T.down(1, cx, cy); await gdrag(1, 40, -20, n=8, step_ms=30); d0 = await drag()
        await wait_my_aim(pg); await pg.wait_for_timeout(100)
        ex, ey = scr(40, -20); await T.drag(1, cx + ex, cy + ey, *scr(30, -30), n=6, pg=pg); d1 = await drag()
        await T.up(1); await pg.wait_for_timeout(150)
        rep(ph0 == 'intro' and d0 and d0['live'] is False and d1 and d1['live'] is True and (await vol()) == 1, 'drag begun in intro, moved >14px after my turn started: fires', pj({'ph0': ph0, 'd0': d0, 'd1': d1, 'volleys': await vol()}))
        # 開場按住拖，輪到我之後完全不動就放開：不發射
        await fresh(pg, wait=False); await pg.wait_for_timeout(250)
        await T.down(1, cx, cy); await gdrag(1, 40, -20, n=8, step_ms=30)
        await wait_my_aim(pg); await pg.wait_for_timeout(300); d1 = await drag(); chip = await pg.evaluate("document.getElementById('turnChip').textContent")
        await T.up(1); await pg.wait_for_timeout(200)
        rep(None, 'drag begun in intro, finger held still after my turn started, release', pj({'volleys': await vol(), 'drag': d1, 'chip': chip, 'say': await pg.evaluate(SAY)}))
        # 開場按住拖，輪到我之後只動 5px 就放
        await fresh(pg, wait=False); await pg.wait_for_timeout(250)
        await T.down(1, cx, cy); await gdrag(1, 60, -40, n=8, step_ms=30)
        await wait_my_aim(pg); await pg.wait_for_timeout(200)
        ex, ey = scr(60, -40); await T.drag(1, cx + ex, cy + ey, *scr(5, 0), n=2, pg=pg); d1 = await drag()
        await T.up(1); await pg.wait_for_timeout(200)
        rep(None, 'drag 72px in intro, +5px after turn started, release', pj({'volleys': await vol(), 'drag': d1, 'say': await pg.evaluate(SAY)}))

    if want('enemy'):
        # 我方打完，敵軍回合中開始拖，放開：不能發射、但瞄準會動
        await fresh(pg)
        r = await rect('btnFire'); await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(250)
        v0 = await vol(); a0 = await aim(); ph = await pg.evaluate("window.__qp.S.phase + window.__qp.S.turn")
        await T.down(1, cx, cy); await gdrag(1, 30, -20); a1 = await aim(); await T.up(1); await pg.wait_for_timeout(150)
        rep((await vol()) == v0 and a1 != a0, 'drag+release during my volley: no fire, aim pre-adjusts', pj({'phase': ph, 'aim': [a0, a1]}))
        # 敵軍瞄準時按住，推進到輪到我，再拖 20px 放開：發射一次
        await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.G.freeze = true; let n = 0; while (n++ < 3600 && !(S.phase === 'aim' && S.turn === 1)) q.advance(1 / 60); q.G.freeze = false; })()")
        await T.down(1, cx, cy); await gdrag(1, 20, -10, n=4); d0 = await drag()
        await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.G.freeze = true; let n = 0; while (n++ < 3600 && !(S.phase === 'aim' && S.turn === 0 && S.round >= 2)) q.advance(1 / 60); q.G.freeze = false; })()")
        ex, ey = scr(20, -10); await T.drag(1, cx + ex, cy + ey, *scr(20, -10), n=4, pg=pg); d1 = await drag()
        await T.up(1); await pg.wait_for_timeout(150)
        rep(d0 and d0['live'] is False and d1 and d1['live'] is True and (await vol()) == v0 + 1, 'drag held from enemy aim into my turn, +22px, release: fires once', pj({'d0': d0, 'd1': d1, 'volleys': [v0, await vol()]}))
        # 發射按鈕：不是我的回合
        await pg.wait_for_timeout(200); v1 = await vol(); ph = await pg.evaluate("window.__qp.S.phase + window.__qp.S.turn")
        await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(150)
        rep((await vol()) == v1, 'fire button when not my turn: no fire', ph)

    if want('second'):
        await fresh(pg)
        await T.down(1, cx, cy); await gdrag(1, 40, -40); a1 = await aim(); id1 = (await drag())['id']
        sx, sy = scr(-100, 60); await T.down(2, cx + sx, cy + sy); await pg.wait_for_timeout(40)
        id2 = (await drag())['id']
        await T.drag(2, cx + sx, cy + sy, *scr(40, 40), n=5, pg=pg); a2 = await aim()
        await T.up(2); await pg.wait_for_timeout(120); vmid = await vol(); dmid = await drag()
        await T.up(1); await pg.wait_for_timeout(150)
        rep(id1 == id2 and a1 == a2 and vmid == 0 and dmid is not None and (await vol()) == 1, '2nd finger: no steal, its release does not fire, 1st release fires once', pj({'ids': [id1, id2], 'aim': [a1, a2], 'vMid': vmid, 'vEnd': await vol()}))
        # 第一根手指放開之後第二根還按著，再拖第二根、放開：第二根不該變成瞄準的手指（它是在瞄準中才放上來的）
        await fresh(pg)
        await T.down(1, cx, cy); await gdrag(1, 30, -30)
        await T.down(2, cx + sx, cy + sy); await pg.wait_for_timeout(40)
        await T.up(1); await pg.wait_for_timeout(120); v1 = await vol()
        await T.drag(2, cx + sx, cy + sy, *scr(40, 0), n=5, pg=pg); a3 = await aim(); d = await drag()
        await T.up(2); await pg.wait_for_timeout(150)
        rep(v1 == 1 and (await vol()) == 1, '1st up fires; 2nd finger still down then released: no second fire', pj({'v1': v1, 'vEnd': await vol(), 'dragFor2nd': d}))

    if want('pinch'):
        # 兩指捏合／張開（想放大畫面的直覺動作）
        await fresh(pg); a0 = await aim()
        ax, ay = scr(-40, 0); bx, by = scr(40, 0)
        await T.down(1, cx + ax, cy + ay); await T.down(2, cx + bx, cy + by); await pg.wait_for_timeout(30)
        for k in range(1, 9):
            T.pts[1] = (cx + ax * (1 + k * 0.25), cy + ay * (1 + k * 0.25)); T.pts[2] = (cx + bx * (1 + k * 0.25), cy + by * (1 + k * 0.25)); await T._send('touchMove'); await pg.wait_for_timeout(16)
        a1 = await aim(); d = await drag()
        await T.up(2); await pg.wait_for_timeout(40); await T.up(1); await pg.wait_for_timeout(200)
        rep(None, 'two-finger pinch-out (each finger 80px), lift both', pj({'volleys': await vol(), 'aim': [a0, a1], 'drag': d, 'scale': await pg.evaluate("window.visualViewport ? window.visualViewport.scale : 1")}))

    if want('cancel'):
        await fresh(pg)
        await T.down(1, cx, cy); await gdrag(1, 40, -40); await T.cancel(); await pg.wait_for_timeout(200)
        rep((await vol()) == 0 and (await drag()) is None, 'touchcancel mid-drag: no fire, drag cleared')
        # 取消之後還能正常再拖一次
        await T.down(1, cx, cy); await gdrag(1, 30, -10); await T.up(1); await pg.wait_for_timeout(150)
        rep((await vol()) == 1, 'drag again after cancel: fires')

    if want('lost'):
        # 指標捕捉被搶走（沒有 pointerup）：瞄準不能卡住
        await fresh(pg)
        await T.down(1, cx, cy); await gdrag(1, 40, -40); d0 = await drag()
        await pg.evaluate("(id) => { try { document.getElementById('stage').releasePointerCapture(id); } catch (e) { window.__err = String(e); } }", d0['id'])
        await T.move(1, cx + 1, cy + 1); await pg.wait_for_timeout(200); d1 = await drag()
        await T.up(1); await pg.wait_for_timeout(200)
        rep(None, 'capture released by script mid-drag', pj({'dragAfter': d1, 'volleys': await vol(), 'ev': await pg.evaluate("window.__ev.slice(-6).join(' ')")}))
        await T.down(1, cx, cy); await gdrag(1, 30, -10); await T.up(1); await pg.wait_for_timeout(150)
        rep((await vol()) >= 1, 'can aim+fire again afterwards', pj(await vol()))

    if want('pause'):
        await fresh(pg)
        await T.down(1, cx, cy); await gdrag(1, 40, -40)
        r = await rect('btnPause'); await T.down(2, r[0], r[1]); await pg.wait_for_timeout(40); await T.up(2); await pg.wait_for_timeout(250)
        m1 = await pg.evaluate("window.__qp.G.mode"); d = await drag()
        rr = await rect('btnResume')
        await T.up(1); await pg.wait_for_timeout(100); vp = await vol()
        await pg.touchscreen.tap(rr[0], rr[1]); await pg.wait_for_timeout(200)
        rep(m1 == 'pause' and d is None and vp == 0 and (await pg.evaluate("window.__qp.G.mode")) == 'play', '2nd finger taps pause mid-drag: paused, drag dropped, release does not fire, resume works', pj({'mode': m1, 'v': vp}))
        # 暫停時第一根手指一直沒放，繼續之後再拖再放：照規則這根手指已經失效
        await T.down(1, cx, cy); await gdrag(1, 40, -40)
        await pg.evaluate("document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyP', bubbles: true}))"); await pg.wait_for_timeout(100)
        await pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyP', bubbles: true}))"); await pg.wait_for_timeout(100)
        m = await pg.evaluate("window.__qp.G.mode")
        if m == 'pause': await pg.evaluate("document.getElementById('btnResume').click()")
        a0 = await aim(); ex, ey = scr(40, -40); await T.drag(1, cx + ex, cy + ey, *scr(40, 0), n=5, pg=pg); a1 = await aim()
        await T.up(1); await pg.wait_for_timeout(150)
        rep(None, 'finger held across pause/resume, then moved 40px and released', pj({'modeAfterKeys': m, 'aimMoved': a0 != a1, 'volleys': await vol()}))

    if want('blur'):
        await fresh(pg)
        await T.down(1, cx, cy); await gdrag(1, 40, -40)
        await pg.evaluate("window.dispatchEvent(new Event('blur'))"); await pg.wait_for_timeout(50); d = await drag()
        await T.up(1); await pg.wait_for_timeout(150)
        rep(d is None and (await vol()) == 0, 'window blur mid-drag: drag dropped, release does not fire')
        await fresh(pg)
        await T.down(1, cx, cy); await gdrag(1, 40, -40)
        await pg.evaluate("(() => { Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); })()"); await pg.wait_for_timeout(100)
        m = await pg.evaluate("window.__qp.G.mode + '/' + !!window.__qp.G.drag + '/' + !document.getElementById('opt').hidden")
        await pg.evaluate("(() => { Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); })()")
        await T.up(1); await pg.wait_for_timeout(100)
        rep(m == 'pause/false/true' and (await vol()) == 0, 'tab hidden mid-drag: auto-pause, no fire', m)
        await pg.evaluate("document.getElementById('btnResume').click()")

    if want('hud'):
        # 從 HUD 的非按鈕元件上開始拖：應該照樣能瞄準
        await fresh(pg, extra="q.SV.seen = true;")
        outs = {}
        for hid in ('hpA', 'crewB', 'hudName', 'aimInfo', 'turnChip', 'say'):
            await pg.evaluate("(() => { const q = window.__qp, S = q.S; if (!(S.phase === 'aim' && S.turn === 0)) { q.G.freeze = true; let n = 0; while (n++ < 3600 && !(S.phase === 'aim' && S.turn === 0)) q.advance(1 / 60); q.G.freeze = false; } })()")
            r = await rect(hid)
            if r[2] == 0: outs[hid] = 'not visible'; continue
            v0 = await vol(); a0 = await aim()
            tgt = await pg.evaluate("([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.tagName) : null; }", r[:2])
            await T.down(1, r[0], r[1]); await T.drag(1, r[0], r[1], *scr(30, 20), n=5, pg=pg); a1 = await aim(); await T.up(1); await pg.wait_for_timeout(200)
            outs[hid] = {'hitTarget': tgt, 'aimMoved': a0 != a1, 'fired': (await vol()) - v0}
        ok = all(isinstance(v, dict) and v['aimMoved'] and v['fired'] == 1 for v in outs.values() if v != 'not visible')
        rep(ok, 'drag starting on HUD non-button elements aims and fires', pj(outs))

    if want('btnslide'):
        # 從按鈕開始拖出去：不該變成瞄準；發射鈕按下去就發射一次
        await fresh(pg)
        outs = {}
        for bid in ('btnShield', 'btnUlt', 'btnFire'):
            r = await rect(bid); v0 = await vol(); a0 = await aim()
            await T.down(1, r[0], r[1]); await pg.wait_for_timeout(30); d = await drag()
            await T.drag(1, r[0], r[1], *scr(-60, -60), n=5, pg=pg); a1 = await aim()
            await T.up(1); await pg.wait_for_timeout(150)
            outs[bid] = {'drag': d, 'aimMoved': a0 != a1, 'fired': (await vol()) - v0}
        rep(outs['btnFire']['fired'] == 1 and outs['btnShield']['fired'] == 0 and not any(o['aimMoved'] or o['drag'] for o in outs.values()), 'press button and slide away: no aim drag; fire fires once', pj(outs))
        # 從畫布拖到暫停鈕上放開：發射一次、不暫停
        await fresh(pg)
        r = await rect('btnPause')
        await T.down(1, cx, cy); await T.drag(1, cx, cy, r[0] - cx, r[1] - cy, n=10, pg=pg); await T.up(1); await pg.wait_for_timeout(250)
        rep((await vol()) == 1 and (await pg.evaluate("window.__qp.G.mode")) == 'play', 'drag from canvas, release over pause button: fires once, no pause')

    if want('long'):
        # 長按按鈕（>700ms）再放：只算一次
        await fresh(pg)
        await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; T.shield.c = T.shield.need; })()")
        r = await rect('btnUlt')
        await T.down(1, r[0], r[1]); await pg.wait_for_timeout(900); armed_mid = await pg.evaluate("window.__qp.S.team[0].ult.armed")
        await T.up(1); await pg.wait_for_timeout(300)
        armed = await pg.evaluate("window.__qp.S.team[0].ult.armed")
        rep(armed_mid is True and armed is True, 'long-press 連珠 900ms: armed once (not toggled back on release)', pj({'ev': await pg.evaluate("window.__ev.slice(-6).join(' ')")}))
        # 快速連點兩下連珠：上膛→取消（這是設計：再按一次取消）
        await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(120)
        rep(None, 'tap 連珠 again', pj({'armed': await pg.evaluate("window.__qp.S.team[0].ult.armed")}))
        # 一般輕點護罩：只開一次
        r = await rect('btnShield'); await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(200)
        rep((await pg.evaluate("window.__qp.S.team[0].shield.uses")) == 1, 'tap 護罩: one use', pj(await pg.evaluate("window.__qp.S.team[0].shield")))
        # 發射鈕快速連點三下：只發射一次
        r = await rect('btnFire')
        for _ in range(3): await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(40)
        await pg.wait_for_timeout(150)
        rep((await vol()) == 1, 'triple-tap 發射: one volley', pj(await vol()))

    if want('flick'):
        await fresh(pg); a0 = await aim()
        await T.down(1, cx, cy); await T.move(1, cx + scr(150, -90)[0], cy + scr(150, -90)[1]); await T.up(1); await pg.wait_for_timeout(150)
        rep((await vol()) == 1, 'fast flick (one 175px move, immediate release): fires once', pj([a0, await aim()]))
        await fresh(pg); a0 = await aim()
        await T.down(1, cx, cy)
        for k in range(1, 31):
            await T.move(1, cx + scr(k, 0)[0], cy + scr(k, 0)[1]); await pg.wait_for_timeout(60)
        a1 = await aim(); await T.up(1); await pg.wait_for_timeout(150)
        rep((await vol()) == 1 and a1[1] > a0[1], 'very slow drag (30px over 1.8s): aims and fires', pj([a0, a1]))

    if want('rotate'):
        await fresh(pg)
        await T.down(1, cx, cy); await gdrag(1, 40, -40); a1 = await aim()
        await pg.set_viewport_size({'width': H, 'height': W}); await pg.wait_for_timeout(500)
        rot2 = await pg.evaluate("window.__qp.G.rot"); v = await vol(); d = await drag()
        await T.up(1); await pg.wait_for_timeout(200)
        rep(v == 0, 'rotate device mid-drag: no spurious fire before release', pj({'rot': [rot, rot2], 'dragAlive': d, 'volleysAfterRelease': await vol(), 'aim': [a1, await aim()]}))
        await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(400)

    print('   console/page errors:', msgs, flush=True)
    await b.close()
    return res


async def main():
    allr = {}
    async with async_playwright() as p:
        for (nm, W, H, fl) in (('landscape', 844, 390, False), ('portrait', 390, 844, False), ('flip', 390, 844, True)):
            if MODES and nm not in MODES: continue
            allr[nm] = await run(p, W, H, nm, fl)
    print('\n===== summary')
    for nm, r in allr.items():
        print(nm, 'PASS', sum(1 for t, _ in r if t == 'PASS'), 'FAIL', sum(1 for t, _ in r if t == 'FAIL'), 'INFO', sum(1 for t, _ in r if t == 'INFO'))
        for t, l in r:
            if t == 'FAIL': print('   FAIL:', l)

asyncio.run(main())
