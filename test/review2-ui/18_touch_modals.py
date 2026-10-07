"""觸控跟彈出視窗之間的幾個情況（CDP 真觸控，844x390；最後一段用小螢幕直拿）。
A. 結算視窗跳出來的那一刻手指正好按著：放開之後會不會「點到」剛出現在手指下面的按鈕
B. 垮城演出時一直點畫面（想跳過）：結算一出來就被點掉
C. 一根手指還放在螢幕上（剛才瞄準用的拇指沒抬起來），另一根手指去點結算／暫停視窗的按鈕
D. 同一瞬間：瞄準的手指放開 + 另一根手指按「發射」
E. 五根手指一起按在畫面上再全部放開
F. 小螢幕直拿（舞台轉 90 度）時，視窗內容超出畫面的話能不能用手指捲
python3 test/review2-ui/18_touch_modals.py [only=A,B,…]"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *

ONLY = [x for a in sys.argv[1:] if a.startswith('only=') for x in a.split('=', 1)[1].split(',')]
want = lambda n: (not ONLY) or n in ONLY
ST = "(() => { const q = window.__qp; return {mode: q.G.mode, idx: q.S.idx, state: q.S.state, v: q.S.team[0].volleys, result: !document.getElementById('result').hidden, shop: !document.getElementById('shop').hidden}; })()"


async def main():
    async with async_playwright() as p:
        W, H = 844, 390
        b, ctx, pg, msgs = await open_page(p, W, H, touch=True)
        cdp = await ctx.new_cdp_session(pg); T = Touch(cdp)
        await pg.evaluate("""(() => { window.__ev = []; for (const t of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend'])
          document.addEventListener(t, (e) => window.__ev.push(t + (e.pointerId === undefined ? '' : '#' + e.pointerId) + '@' + (e.target.id || e.target.className || e.target.tagName)), true); })()""")
        st = lambda: pg.evaluate(ST)
        async def rect(sel):
            return await pg.evaluate("(s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel)
        async def to_finale(lv=0, lose=False):
            await fresh(pg, lv)
            await pg.evaluate("(lose) => { const q = window.__qp, S = q.S; for (const u of S.team[lose ? 0 : 1].units) q.killUnit(u, lose ? 1 : 0, 0); window.__ev = []; }", lose)
        async def result_btn_pos():
            # 先讓結算出來一次，量出按鈕會在哪裡
            await to_finale(); await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(300)
            return {k: await rect('#' + k) for k in ('btnNext', 'btnAgain', 'btnUp', 'btnHome')}

        pos = await result_btn_pos()
        print('result buttons at', pj({k: [round(v[0]), round(v[1])] for k, v in pos.items()}))

        if want('A'):
            print('A. finger already down when the result modal appears')
            for name in ('btnNext', 'btnHome', 'btnUp'):
                for (before, after) in ((150, 120), (600, 150), (1200, 400)):
                    await to_finale()
                    # 結算在 endT > 4.2 秒時跳出來：算好時間，在它出現前 before 毫秒按下去
                    await pg.wait_for_function("window.__qp.G.endT > %f" % (4.2 - before / 1000), timeout=15000)
                    x, y = pos[name]
                    await T.down(1, x, y)
                    await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=5000); await pg.wait_for_timeout(after)
                    await T.up(1); await pg.wait_for_timeout(300)
                    s = await st(); ev = await pg.evaluate("window.__ev.filter(e => /click|pointerdown/.test(e)).join(' ')")
                    acted = (name == 'btnNext' and s['mode'] == 'play' and s['idx'] == 1) or (name == 'btnHome' and s['mode'] == 'home') or (name == 'btnUp' and s['shop'])
                    print(f'   finger down {before}ms before the modal at where {name} will be, lifted {after}ms after: {"BUTTON ACTIVATED" if acted else "nothing happened"} -> {pj(s)} | {ev}')
                    if s['shop']: await pg.evaluate("document.querySelector('#shop [data-close]').click()")
                    if s['mode'] == 'home': await pg.evaluate("window.__qp.SV.open = 6")

        if want('B'):
            print('B. tapping repeatedly during the 4.2s collapse (trying to skip)')
            for name in ('btnNext', 'btnAgain', 'btnHome'):
                await to_finale(); x, y = pos[name]; shown_at = None; t_show = None
                for i in range(60):
                    await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(110)
                    s = await st()
                    if s['result'] and shown_at is None: shown_at = i
                    if shown_at is None and s['mode'] != 'play': shown_at = i
                    if s['mode'] in ('home',) or (s['mode'] == 'play' and s['state'] == 'play'): break
                vis = await pg.evaluate("window.__resVis || 0")
                print(f'   tapping every ~120ms where {name} appears: result first seen at tap #{shown_at}, left the result screen at tap #{i} -> {pj(s)}')
                await pg.evaluate("window.__qp.SV.open = 6")

        if want('C'):
            print('C. one finger resting on the screen, another finger taps a modal button')
            await to_finale(); await pg.wait_for_timeout(1500)
            await T.down(1, 150, 300)                         # 左手拇指放在畫面左下（結算出來之前就放著）
            await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(500)
            x, y = pos['btnNext']; await pg.evaluate("window.__ev = []")
            await T.down(2, x, y); await pg.wait_for_timeout(60); await T.up(2); await pg.wait_for_timeout(300)
            s1 = await st(); ev1 = await pg.evaluate("window.__ev.join(' ')")
            await T.down(2, x, y); await pg.wait_for_timeout(60); await T.up(2); await pg.wait_for_timeout(300); s1b = await st()
            await T.up(1); await pg.wait_for_timeout(200); s2 = await st()
            await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(300); s3 = await st()
            print(f'   result screen, thumb resting at (150,300): tap 下一關 with another finger -> mode {s1["mode"]} (tapped twice: {s1b["mode"]}); events: {ev1}')
            print(f'   after lifting the resting thumb: mode {s2["mode"]}; tapping 下一關 again -> mode {s3["mode"]} idx {s3["idx"]}')
            # 暫停視窗
            await fresh(pg)
            await T.down(1, 300, 250); await T.drag(1, 300, 250, 40, -30, n=5, pg=pg)       # 正在瞄準的手指
            x, y = await rect('#btnPause'); await T.down(2, x, y); await pg.wait_for_timeout(50); await T.up(2); await pg.wait_for_timeout(300)
            m0 = (await st())['mode']; x, y = await rect('#btnResume'); await pg.evaluate("window.__ev = []")
            await T.down(2, x, y); await pg.wait_for_timeout(60); await T.up(2); await pg.wait_for_timeout(300)
            m1 = (await st())['mode']; ev = await pg.evaluate("window.__ev.join(' ')")
            await T.up(1); await pg.wait_for_timeout(200)
            await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(300); m2 = (await st())['mode']
            print(f'   aiming finger still down, 2nd finger taps 暫停 -> {m0}; 2nd finger taps 繼續 -> {m1} (events: {ev}); after lifting the first finger and tapping 繼續 -> {m2}')

        if want('D'):
            print('D. aiming finger lifts at the same moment another finger presses 發射')
            await fresh(pg); x, y = await rect('#btnFire')
            await T.down(1, 400, 200); await T.drag(1, 400, 200, 40, -30, n=5, pg=pg)
            # 同一個 CDP 訊息：2 號手指按下（1 號還在），下一個訊息 1 號放開；中間不等
            await asyncio.gather(T.down(2, x, y), T.up(1)); await pg.wait_for_timeout(250)
            s = await st(); print('   volleys after near-simultaneous lift+press:', s['v'], '| drag left over:', await pg.evaluate("!!window.__qp.G.drag"))
            await T.cancel(); await pg.wait_for_timeout(100)

        if want('E'):
            print('E. five fingers down together on the field, then all lifted')
            await fresh(pg); a0 = await pg.evaluate(AIM)
            for i in range(1, 6): T.pts[i] = (200 + i * 80, 150 + i * 20)
            await T._send('touchStart'); await pg.wait_for_timeout(60)
            for k in range(1, 6):
                for i in range(1, 6): T.pts[i] = (200 + i * 80 + k * 6, 150 + i * 20 - k * 4)
                await T._send('touchMove'); await pg.wait_for_timeout(20)
            d = await pg.evaluate("(() => { const d = window.__qp.G.drag; return d ? {id: d.id, far: Math.round(d.far)} : null; })()")
            T.pts = {}; await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(300)
            print('   drag while 5 fingers down:', d, '| volleys after lifting all:', (await st())['v'], '| aim', a0, '->', await pg.evaluate(AIM), '| drag left over:', await pg.evaluate("!!window.__qp.G.drag"))
        print('errors:', msgs)
        await b.close()

        if want('F'):
            print('F. do the modals overflow on small phones, and can they be scrolled by touch?')
            for (w, h) in ((390, 844), (360, 640), (320, 568), (280, 653), (568, 320), (640, 360)):
                b, ctx, pg, msgs = await open_page(p, w, h, touch=True)
                cdp = await ctx.new_cdp_session(pg); T = Touch(cdp)
                await pg.wait_for_timeout(300)
                rot = await pg.evaluate("window.__qp.G.rot")
                out = []
                for (name, js) in (('shop', "document.getElementById('btnShop').click()"), ('options', "document.getElementById('btnOpt').click()"), ('pause', "(() => { const q = window.__qp; q.SV.seen = true; q.startLevel(0); })()"), ('result-win', None), ('result-lose', None)):
                    if name == 'pause':
                        await pg.evaluate(js); await wait_my_aim(pg); await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(200); mid = 'opt'
                    elif name.startswith('result'):
                        await pg.evaluate("(lose) => { const q = window.__qp; q.SV.seen = true; q.G.freeze = false; q.startLevel(lose ? 3 : 0); }", name == 'result-lose'); await wait_my_aim(pg)
                        await pg.evaluate("(lose) => { const q = window.__qp, S = q.S; if (!lose) q.killUnit(S.team[0].units[0], 1, 0); for (const u of S.team[lose ? 0 : 1].units) q.killUnit(u, lose ? 1 : 0, 0); }", name == 'result-lose')
                        await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(300); mid = 'result'
                        if name == 'result-lose': await pg.evaluate("document.getElementById('resTip').textContent = '別只打屋頂：打斷柱子和牆，上面整層會自己塌下來。最底下的城基特別厚，打它沒什麼用。'")
                    else:
                        await pg.evaluate(js); await pg.wait_for_timeout(200); mid = 'shop' if name == 'shop' else 'opt'
                    m = await pg.evaluate("(id) => { const e = document.getElementById(id), p = e.querySelector('.plaque').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(); return {over: e.scrollHeight - e.clientHeight, sh: e.scrollHeight, ch: e.clientHeight, cut: Math.round(Math.max(s.left - p.left, s.top - p.top, p.right - s.right, p.bottom - s.bottom))}; }", mid)
                    scrolled = None
                    if m['over'] > 1:
                        # 用手指往「舞台的上方」滑（舞台轉了 90 度的話，螢幕上是橫著滑）
                        cx, cy = w / 2, h / 2; d = 120
                        dx, dy = (0, -d) if rot == 0 else ((d, 0) if rot == 1 else (-d, 0))
                        await T.down(1, cx, cy); await T.drag(1, cx, cy, dx, dy, n=8, pg=pg); await T.up(1); await pg.wait_for_timeout(300)
                        s1 = await pg.evaluate("(id) => document.getElementById(id).scrollTop", mid)
                        await pg.evaluate("(id) => { document.getElementById(id).scrollTop = 0; }", mid)
                        # 反方向、另一個軸也試
                        res = {}
                        for (lab, (ddx, ddy)) in (('screen-up', (0, -d)), ('screen-down', (0, d)), ('screen-left', (-d, 0)), ('screen-right', (d, 0))):
                            await pg.evaluate("(id) => { document.getElementById(id).scrollTop = 0; }", mid)
                            await T.down(1, cx, cy); await T.drag(1, cx, cy, ddx, ddy, n=8, pg=pg); await T.up(1); await pg.wait_for_timeout(250)
                            res[lab] = round(await pg.evaluate("(id) => document.getElementById(id).scrollTop", mid))
                        scrolled = res
                        await pg.screenshot(path=shot_path(f'modal_overflow_{w}x{h}_{name}'))
                    out.append(f"{name}: content {m['sh']}px in {m['ch']}px" + (f" -> OVERFLOWS by {m['over']}px; swipe scroll result {scrolled}" if m['over'] > 1 else ' ok'))
                    # 關掉
                    await pg.evaluate("(() => { for (const id of ['shop', 'opt']) document.getElementById(id).hidden = true; const q = window.__qp; if (q.G.mode === 'pause') q.G.mode = 'play'; })()")
                    if name in ('pause', 'result-win', 'result-lose'): await pg.evaluate("window.__qp.goHome()"); await pg.wait_for_timeout(150)
                u = await pg.evaluate("getComputedStyle(document.getElementById('stage')).getPropertyValue('--u')")
                print(f'   {w}x{h} rot={rot} u={u}:', ' | '.join(out), '| errors', msgs)
                await b.close()

asyncio.run(main())
