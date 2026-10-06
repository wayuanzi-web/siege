"""觸控操作規則，用 CDP 的 Input.dispatchTouchEvent 送「真的」觸控（會走瀏覽器的 pointer capture、click 合成），
   不是 dispatchEvent 假事件。橫拿 844x390、直拿 390x844（舞台轉 90 度）各跑一次。
   python3 test/review-ui/02_input_touch.py [only=<名稱片段>]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
from common import *

ONLY = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('only=')]


class Touch:
    def __init__(self, cdp): self.cdp = cdp; self.pts = {}
    async def _send(self, typ):
        await self.cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in self.pts.items()]})
    async def down(self, i, x, y): self.pts[i] = (x, y); await self._send('touchStart')
    async def move(self, i, x, y): self.pts[i] = (x, y); await self._send('touchMove')
    async def up(self, i):
        # CDP：touchEnd 帶的是「要放開的那幾點」，空的表示全部放開（實測：帶剩下的點會把剩下的放開）
        x, y = self.pts.pop(i)
        await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [{'x': x, 'y': y, 'id': i}] if self.pts else []})
    async def cancel(self): self.pts = {}; await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
    async def drag(self, i, x0, y0, dx, dy, n=10, step_ms=16, pg=None):
        for k in range(1, n + 1):
            await self.move(i, x0 + dx * k / n, y0 + dy * k / n)
            if pg and step_ms: await pg.wait_for_timeout(step_ms)


LOGGER = """(() => { window.__ev = []; const t0 = performance.now();
  for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'click'])
    document.addEventListener(t, (e) => window.__ev.push(t + '#' + (e.pointerId === undefined ? '' : e.pointerId) + '@' + (e.target.id || e.target.tagName) + '+' + Math.round(performance.now() - t0)), true); })()"""
AIM = "(() => { const a = window.__qp.S.team[0].aim; return [+(Math.atan2(a[1], a[0]) * 180 / Math.PI).toFixed(1), +Math.hypot(a[0], a[1]).toFixed(1)]; })()"
FIRED = "window.__qp.S.team[0].volleys"


async def fresh(pg, lv=0, seen=True):
    await pg.evaluate("([lv, seen]) => { const q = window.__qp; q.G.freeze = false; q.SV.seen = seen; q.SV.open = 6; q.startLevel(lv); window.__ev = []; }", [lv, seen])
    await wait_my_aim(pg)
    await pg.wait_for_timeout(120)


async def run(p, W, H, name, flip=False):
    b, ctx, pg, msgs = await open_page(p, W, H, touch=True)
    cdp = await ctx.new_cdp_session(pg); T = Touch(cdp)
    await pg.evaluate(LOGGER)
    if flip:
        await pg.evaluate("(() => { const q = window.__qp; q.SV.flip = true; q.layout(); })()")
    rot = await pg.evaluate("window.__qp.G.rot")
    # 遊戲裡的「往右上」換成螢幕位移
    def scr(gx, gy):
        return (gx, gy) if rot == 0 else ((-gy, gx) if rot == 1 else (gy, -gx))
    cx, cy = W * 0.5, H * 0.5
    out = {}
    aim = lambda: pg.evaluate(AIM)
    fired = lambda: pg.evaluate(FIRED)
    want = lambda n: (not ONLY) or any(o in n for o in ONLY)
    print(f'===== {name} {W}x{H} rot={rot}', flush=True)

    if want('tap'):
        await fresh(pg)
        a0 = await aim()
        await T.down(1, cx, cy); await pg.wait_for_timeout(60); await T.up(1); await pg.wait_for_timeout(150)
        out['tap: no fire'] = (await fired()) == 0
        out['tap: toast'] = await pg.evaluate("document.getElementById('say').textContent")
        out['tap: events'] = await pg.evaluate("window.__ev.join(' ')")

    if want('drag'):
        await fresh(pg)
        a0 = await aim()
        dx, dy = scr(40, -40)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg); a1 = await aim(); await T.up(1); await pg.wait_for_timeout(150)
        out['drag: aim up+stronger'] = [a0, a1, a1[0] > a0[0] and a1[1] > a0[1]]
        out['drag: fires once'] = await fired()
        out['drag: events'] = await pg.evaluate("window.__ev.join(' ')")

    if want('hold'):
        # 按住不動 0.6 秒才開始拖（先想一下再拖）：應該照樣能瞄準、放開要發射
        for hold in (100, 300, 450, 700, 1500):
            await fresh(pg)
            a0 = await aim()
            dx, dy = scr(40, -40)
            await T.down(1, cx, cy); await pg.wait_for_timeout(hold)
            await T.drag(1, cx, cy, dx, dy, pg=pg); a1 = await aim(); drag_alive = await pg.evaluate("!!window.__qp.G.drag")
            await T.up(1); await pg.wait_for_timeout(150)
            out[f'hold {hold}ms then drag'] = {'aim': [a0, a1], 'dragAliveBeforeRelease': drag_alive, 'volleys': await fired(), 'ev': await pg.evaluate("window.__ev.join(' ')")}

    if want('cancel'):
        await fresh(pg)
        dx, dy = scr(40, -40)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg); await T.cancel(); await pg.wait_for_timeout(150)
        out['cancel: no fire'] = [(await fired()) == 0, await pg.evaluate("!!window.__qp.G.drag")]

    if want('enemy'):
        # 敵軍回合開始拖，拖到輪到我才放：不能發射
        await fresh(pg)
        await pg.evaluate("document.getElementById('btnFire').click()"); await pg.wait_for_timeout(200)
        v0 = await fired()
        dx, dy = scr(30, -20)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg)
        ph0 = await pg.evaluate("window.__qp.S.phase + window.__qp.S.turn")
        await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.G.freeze = true; let n = 0; while (n++ < 60 * 60 && !(S.phase === 'aim' && S.turn === 0 && S.round >= 2)) q.advance(1 / 60); q.G.freeze = false; })()")
        ph1 = await pg.evaluate("window.__qp.S.phase + window.__qp.S.turn + ' r' + window.__qp.S.round")
        dx2, dy2 = scr(50, -30)
        await T.move(1, cx + dx2, cy + dy2); await pg.wait_for_timeout(50); await T.up(1); await pg.wait_for_timeout(150)
        out['enemy-turn drag released on my turn: no fire'] = [ph0, ph1, (await fired()) == v0]

    if want('intro'):
        # 關卡開場的 1.1 秒（intro）就開始拖，輪到我之後才放
        await pg.evaluate("(() => { const q = window.__qp; q.G.freeze = false; q.SV.seen = true; q.startLevel(0); window.__ev = []; })()")
        await pg.wait_for_timeout(300)
        dx, dy = scr(60, -40)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, n=20, step_ms=60, pg=pg)
        ph = await pg.evaluate("window.__qp.S.phase + window.__qp.S.turn")
        chip = await pg.evaluate("document.getElementById('turnChip').hidden ? null : document.getElementById('turnChip').textContent")
        await T.up(1); await pg.wait_for_timeout(200)
        out['drag begun in intro, released in my aim'] = {'phaseAtRelease': ph, 'chip': chip, 'volleys': await fired(), 'toast': await pg.evaluate("getComputedStyle(document.getElementById('say')).opacity")}

    if want('second'):
        # 第二根手指：2 秒內不搶；第一根手指放開只發射一次
        await fresh(pg)
        dx, dy = scr(40, -40)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg); a1 = await aim()
        await T.down(2, cx + 100 * (1 if rot == 0 else 0), cy + 100 * (0 if rot == 0 else 1)); await pg.wait_for_timeout(50)
        id_after = await pg.evaluate("window.__qp.G.drag && window.__qp.G.drag.id")
        ex, ey = scr(30, 30)
        await T.move(2, T.pts[2][0] + ex, T.pts[2][1] + ey); await pg.wait_for_timeout(30); a2 = await aim()
        await T.up(2); await pg.wait_for_timeout(80); v_mid = await fired()
        await T.up(1); await pg.wait_for_timeout(150)
        out['2nd finger <2s: no hijack'] = {'aimSame': a1 == a2, 'afterSecondUp': v_mid, 'afterFirstUp': await fired(), 'ev': await pg.evaluate("window.__ev.join(' ')")}

        # 第一根手指按住不動超過 2 秒（等倍增符飄到位），另一隻手碰到螢幕
        await fresh(pg)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg); a1 = await aim()
        id1 = await pg.evaluate("window.__qp.G.drag && window.__qp.G.drag.id")
        await pg.wait_for_timeout(2200)
        await T.down(2, cx + 100 * (1 if rot == 0 else 0), cy + 100 * (0 if rot == 0 else 1)); await pg.wait_for_timeout(60)
        id2 = await pg.evaluate("window.__qp.G.drag && window.__qp.G.drag.id")
        await T.up(2); await pg.wait_for_timeout(80); v_mid = await fired()
        d_after = await pg.evaluate("!!window.__qp.G.drag")
        await T.up(1); await pg.wait_for_timeout(200)
        out['2nd finger after 2.2s hold'] = {'dragIdBefore': id1, 'dragIdAfter2ndDown': id2, 'volleysAfter2ndUp': v_mid, 'dragAliveAfter2ndUp': d_after, 'volleysAfterFirstUp(should be 1)': await fired(), 'toast': await pg.evaluate("document.getElementById('say').textContent")}

        # 兩根手指都拖、都放：最多一輪
        await fresh(pg)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg)
        await T.down(2, cx - 60, cy + 40); await T.drag(2, cx - 60, cy + 40, dx, dy, pg=pg)
        await T.up(1); await T.up(2); await pg.wait_for_timeout(200)
        out['two fingers both drag+release'] = await fired()

    if want('button'):
        await fresh(pg)
        res = {}
        for bid in ('btnFire', 'btnShield', 'btnUlt', 'btnPause'):
            r = await pg.evaluate("(id) => { const b = document.getElementById(id).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height]; }", bid)
            await pg.evaluate("window.__qp.S.team[0].shield.c = 0")
            await T.down(1, r[0], r[1]); await pg.wait_for_timeout(40)
            d = await pg.evaluate("!!window.__qp.G.drag")
            ex, ey = scr(60, -60)
            await T.move(1, r[0] + ex * 0.5, r[1] + ey * 0.5); await T.move(1, r[0] + ex, r[1] + ey); await pg.wait_for_timeout(40)
            d2 = await pg.evaluate("!!window.__qp.G.drag")
            await T.up(1); await pg.wait_for_timeout(120)
            res[bid] = {'dragOnDown': d, 'dragAfterSlide': d2, 'volleys': await fired(), 'mode': await pg.evaluate("window.__qp.G.mode")}
            if (await pg.evaluate("window.__qp.G.mode")) == 'pause': await pg.evaluate("document.getElementById('btnResume').click()")
        out['press HUD button then slide away'] = res
        # 從畫布拖到「發射」按鈕上放開：只發射一次、不會多按一次按鈕
        await fresh(pg)
        r = await pg.evaluate("(() => { const b = document.getElementById('btnPause').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await T.down(1, cx, cy); await T.drag(1, cx, cy, r[0] - cx, r[1] - cy, pg=pg); await T.up(1); await pg.wait_for_timeout(200)
        out['drag from canvas, release over pause button'] = {'volleys': await fired(), 'mode': await pg.evaluate("window.__qp.G.mode"), 'ev': await pg.evaluate("window.__ev.slice(-4).join(' ')")}
        # 不是我的回合按「發射」
        await pg.wait_for_timeout(300)
        v0 = await fired(); ph = await pg.evaluate("window.__qp.S.phase + window.__qp.S.turn")
        r = await pg.evaluate("(() => { const b = document.getElementById('btnFire').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(150)
        out['fire button when not my turn'] = [ph, (await fired()) == v0]

    if want('pause'):
        # 拖到一半，另一根手指按暫停；繼續之後第一根手指放開
        await fresh(pg)
        dx, dy = scr(40, -40)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg)
        r = await pg.evaluate("(() => { const b = document.getElementById('btnPause').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await T.down(2, r[0], r[1]); await pg.wait_for_timeout(40); await T.up(2); await pg.wait_for_timeout(250)
        m1 = await pg.evaluate("window.__qp.G.mode + ' drag=' + !!window.__qp.G.drag")
        await pg.evaluate("document.getElementById('btnResume').click()"); await pg.wait_for_timeout(100)
        ex, ey = scr(60, -60)
        await T.move(1, cx + ex, cy + ey); a = await aim(); await T.up(1); await pg.wait_for_timeout(150)
        out['pause during drag'] = {'afterPauseTap': m1, 'volleysAfterResumeRelease': await fired(), 'mode': await pg.evaluate("window.__qp.G.mode")}
        # 分頁切走（visibilitychange）
        await fresh(pg)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg)
        await pg.evaluate("(() => { Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); })()")
        await pg.wait_for_timeout(100)
        m = await pg.evaluate("window.__qp.G.mode + ' drag=' + !!window.__qp.G.drag + ' opt=' + !document.getElementById('opt').hidden + ' au=' + (window.__qp.AU.ctx ? window.__qp.AU.ctx.state : 'none')")
        await pg.evaluate("(() => { Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); })()")
        await T.up(1); await pg.wait_for_timeout(100)
        out['visibilitychange during drag'] = [m, 'volleys', await fired(), await pg.evaluate("window.__qp.G.mode")]
        await pg.evaluate("document.getElementById('btnResume').click()")

    if want('jitter'):
        # 長按不拖，但手指有 ±1px 的抖動（淨位移 0~1px）：不該發射
        await fresh(pg)
        a0 = await aim()
        await T.down(1, cx, cy)
        for k in range(16):
            await T.move(1, cx + (k % 2), cy); await pg.wait_for_timeout(30)
        d = await pg.evaluate("window.__qp.G.drag && window.__qp.G.drag.dist")
        await T.up(1); await pg.wait_for_timeout(150)
        out['long-press with 1px jitter (net move <=1px)'] = {'pathLen': d, 'volleys(should be 0)': await fired(), 'aim': [a0, await aim()]}

    if want('rotate'):
        # 瞄準中把手機轉向（視窗大小對調）
        await fresh(pg)
        dx, dy = scr(40, -40)
        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, pg=pg); a1 = await aim()
        await pg.set_viewport_size({'width': H, 'height': W}); await pg.wait_for_timeout(400)
        rot2 = await pg.evaluate("window.__qp.G.rot"); v = await fired(); d = await pg.evaluate("!!window.__qp.G.drag")
        await pg.screenshot(path=shot_path(f'input_rotated_mid_aim_{name}'))
        await T.up(1); await pg.wait_for_timeout(150)
        out['rotate device mid-drag'] = {'rot': [rot, rot2], 'volleysBeforeRelease': v, 'dragAlive': d, 'volleysAfterRelease': await fired(), 'aim': [a1, await aim()]}
        await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(300)

    for k, v in out.items(): print('  ', k, '=>', json.dumps(v, ensure_ascii=False), flush=True)
    print('   errors:', msgs, flush=True)
    await b.close()


async def main():
    async with async_playwright() as p:
        await run(p, 844, 390, 'landscape')
        await run(p, 390, 844, 'portrait')
        await run(p, 390, 844, 'portrait-flip', flip=True)

asyncio.run(main())
