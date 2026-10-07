"""瞄準到一半、砲彈還在天上的時候改變視窗大小／把手機轉向。看有沒有例外、畫面有沒有壞、操作還接不接得上。
python3 test/review2-ui/19_resize_rotate.py"""
import asyncio, io
from playwright.async_api import async_playwright
from PIL import Image, ImageStat
from common import *

GEOM = """(() => { const q = window.__qp, G = q.G, V = q.V, cv = document.getElementById('cv'), st = document.getElementById('stage').getBoundingClientRect(), u = parseFloat(getComputedStyle(document.getElementById('stage')).getPropertyValue('--u'));
  const off = []; for (const id of ['btnPause', 'hpA', 'hpB', 'btnFire', 'btnShield', 'btnUlt', 'turnChip', 'aimInfo']) { const e = document.getElementById(id); if (e.hidden) continue; const r = e.getBoundingClientRect(); if (r.left < st.left - 1 || r.top < st.top - 1 || r.right > st.right + 1 || r.bottom > st.bottom + 1) off.push(id); }
  return {rot: G.rot, stage: [G.sw, G.sh, G.ox, G.oy], u, cv: [cv.width, cv.height], V: [V.W, V.H], hud: V.hud, hudExpected: Math.round(8 * u * V.W / G.sw), s: +V.s.toFixed(2), offStage: off, shots: q.SH.n, phase: q.S.phase + q.S.turn, drag: !!G.drag, turnOverlay: !document.getElementById('turn').hidden}; })()"""


async def blank(pg):
    im = Image.open(io.BytesIO(await pg.screenshot())).convert('L'); st = ImageStat.Stat(im)
    return {'mean': round(st.mean[0]), 'stddev': round(st.stddev[0])}


async def main():
    async with async_playwright() as p:
        # ---- 桌機：滑鼠 ----
        b, ctx, pg, msgs = await open_page(p, 1280, 720, dsf=1)
        M = pg.mouse
        print('A. desktop: window resized while the left button is held (mid-drag)')
        await fresh(pg); a0 = await pg.evaluate(AIM)
        await M.move(640, 360); await M.down(); await M.move(700, 320, steps=5); a1 = await pg.evaluate(AIM)
        for (w, h) in ((1000, 600), (700, 900), (1600, 500), (1280, 720)):
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(250)
            g = await pg.evaluate(GEOM); await M.move(700 + w % 37, 320 - h % 29, steps=2); a = await pg.evaluate(AIM)
            print(f'   {w}x{h}: {pj(g)} aim {a} volleys {await pg.evaluate(VOLLEYS)} {await blank(pg)}')
        await M.up(); await pg.wait_for_timeout(200)
        print('   released: volleys', await pg.evaluate(VOLLEYS), '(expected 1)')

        print('B. desktop: resized several times while the volley is in the air')
        await fresh(pg, 1)
        await pg.evaluate("(() => { const q = window.__qp; q.simAim(0, 40, 52); })()")
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(500)
        for (w, h) in ((900, 500), (500, 800), (1920, 1080), (1024, 768), (1280, 720)):
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(300)
            g = await pg.evaluate(GEOM); print(f'   {w}x{h}: {pj(g)} {await blank(pg)}')
            if (w, h) in ((500, 800), (1024, 768)): await pg.screenshot(path=shot_path(f'resize_midvolley_{w}x{h}'))
        await pg.evaluate(JS_TO_MY_AIM, 60); await pg.evaluate("window.__qp.G.freeze = false"); await pg.wait_for_timeout(200)
        print('   next turn reached:', pj(await pg.evaluate(JS_STATE)))
        # 上一輪的彈道虛線還在對的位置嗎（戰場座標，不該跟著視窗跑掉）
        print('   trail kept:', await pg.evaluate("(() => { const t = window.__qp.RD.trail; return t ? {n: t.n, first: [+t.x[0].toFixed(1), +t.y[0].toFixed(1)], last: [+t.x[t.n - 1].toFixed(1), +t.y[t.n - 1].toFixed(1)]} : null; })()"))
        print('   errors:', msgs); await b.close()

        # ---- 手機：轉向 ----
        b, ctx, pg, msgs = await open_page(p, 844, 390, touch=True)
        cdp = await ctx.new_cdp_session(pg); T = Touch(cdp)
        print('C. phone: rotated while the volley is in the air, then while paused, then on the result screen')
        await fresh(pg, 3)
        r = await pg.evaluate("(() => { const b = document.getElementById('btnFire').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(400)
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(500)
        g = await pg.evaluate(GEOM); print('   -> portrait mid-volley:', pj(g), await blank(pg)); await pg.screenshot(path=shot_path('rotate_midvolley_portrait'))
        await pg.wait_for_timeout(3500); print('   3.5s later overlay hidden:', not (await pg.evaluate(GEOM))['turnOverlay'])
        await pg.set_viewport_size({'width': 844, 'height': 390}); await pg.wait_for_timeout(400)
        g = await pg.evaluate(GEOM); print('   -> back to landscape:', pj(g), await blank(pg))
        await pg.evaluate(JS_TO_MY_AIM, 60); await pg.evaluate("window.__qp.G.freeze = false"); await pg.wait_for_timeout(200)
        # 直拿之後還能照轉過的方向拖曳瞄準
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(500)
        a0 = await pg.evaluate(AIM); await T.down(1, 195, 422); await T.drag(1, 195, 422, 40, 0, n=6, pg=pg); a1 = await pg.evaluate(AIM)       # 螢幕往右 = 舞台往上
        await T.drag(1, 235, 422, 0, 40, n=6, pg=pg); a2 = await pg.evaluate(AIM); await T.up(1); await pg.wait_for_timeout(200)
        print('   portrait: drag screen-right 40px', a0, '->', a1, '(steeper expected); then screen-down 40px ->', a2, '(stronger expected); volleys', await pg.evaluate(VOLLEYS))
        # 暫停中轉向
        await pg.evaluate(JS_TO_MY_AIM, 60); await pg.evaluate("window.__qp.G.freeze = false"); await pg.wait_for_timeout(200)
        await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(200)
        await pg.set_viewport_size({'width': 844, 'height': 390}); await pg.wait_for_timeout(400)
        m = await pg.evaluate("(() => { const p = document.querySelector('#opt .plaque').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(); return {plaque: [p.left, p.top, p.right, p.bottom].map(Math.round), stage: [s.left, s.top, s.right, s.bottom].map(Math.round), mode: window.__qp.G.mode}; })()")
        print('   rotated while paused:', pj(m), await blank(pg))
        await pg.keyboard.press('KeyP')
        # 結算畫面上轉向
        await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
        await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(500)
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(600)
        m = await pg.evaluate("(() => { const p = document.querySelector('#result .plaque').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(); return {plaque: [p.left, p.top, p.right, p.bottom].map(Math.round), stage: [s.left, s.top, s.right, s.bottom].map(Math.round), mode: window.__qp.G.mode}; })()")
        print('   rotated on the result screen:', pj(m)); await pg.screenshot(path=shot_path('rotate_result_portrait'))
        r = await pg.evaluate("(() => { const b = document.getElementById('btnHome').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await pg.wait_for_timeout(3500); await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(300)
        print('   tap 回主畫面 in portrait ->', await pg.evaluate("window.__qp.G.mode"))
        print('   errors:', msgs); await b.close()

        print('D. 40 rapid size changes during a volley (address bar sliding in and out)')
        b, ctx, pg, msgs = await open_page(p, 844, 390, touch=True)
        await fresh(pg, 4); await pg.evaluate("window.__qp.simFire(0)")
        t = await pg.evaluate("performance.now()"); f0 = await pg.evaluate("window.__qp.RD.frame")
        for k in range(40):
            await pg.set_viewport_size({'width': 844, 'height': 390 - (k % 5) * 12}); await pg.wait_for_timeout(30)
        dt = (await pg.evaluate("performance.now()")) - t; f1 = await pg.evaluate("window.__qp.RD.frame")
        print(f'   {dt:.0f}ms for 40 resizes, frames rendered {f1 - f0} ({(f1 - f0) / dt * 1000:.0f} fps), final {pj(await pg.evaluate(GEOM))} errors {msgs}')
        await b.close()

asyncio.run(main())
