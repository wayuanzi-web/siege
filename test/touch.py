"""觸控拖曳：橫拿與直拿（舞台轉 90 度）兩種情況下，手指往「遊戲裡的上／右」拖，砲口要往上／變強。"""
import asyncio, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
async def run(p, W, H, name):
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = await ctx.new_page(); msgs = []
    pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
    await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(700)
    await pg.evaluate("window.__qp.startLevel(0)"); await pg.wait_for_timeout(400)
    aim = lambda: pg.evaluate("(() => { const a = window.__qp.S.team[0].aim; return [Math.round(Math.atan2(a[1], a[0]) * 180 / Math.PI), Math.round(Math.hypot(a[0], a[1]))]; })()")
    rot = await pg.evaluate("window.__qp.G.rot")
    a0 = await aim()
    # 「遊戲裡往右」：橫拿是 clientX 增加；直拿（順時針轉 90 度）是 clientY 增加
    drag = """(d) => { const s = document.getElementById('stage'); const ev = (t, x, y) => s.dispatchEvent(new PointerEvent(t, {pointerId: 5, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true}));
        ev('pointerdown', 150, 200); for (let i = 1; i <= 20; i++) ev('pointermove', 150 + d[0] * i, 200 + d[1] * i); ev('pointerup', 150 + d[0] * 20, 200 + d[1] * 20); }"""
    right = [5, 0] if rot == 0 else [0, 5]
    up = [0, -5] if rot == 0 else [5, 0]
    await pg.evaluate(drag, right); a1 = await aim()
    await pg.evaluate(drag, up); a2 = await aim()
    ok = a1[1] > a0[1] and a2[0] > a1[0]
    # 按鈕點得到嗎（轉向後用畫面座標點）
    r = await pg.evaluate("(() => { const b = document.getElementById('btnShield').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
    await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(200)
    sh = await pg.evaluate("window.__qp.S.team[0].shield.uses")
    r = await pg.evaluate("(() => { const b = document.getElementById('btnPause').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
    await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(300)
    mode = await pg.evaluate("window.__qp.G.mode")
    print(f'{name}: rot={rot} aim {a0} → 往右拖 {a1} → 往上拖 {a2}  拖曳{"正確" if ok else "錯誤"}  護罩點擊={sh}  暫停後 mode={mode}  errors={msgs}')
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p, 844, 390, '橫拿')
        await run(p, 390, 700, '直拿')
asyncio.run(main())
