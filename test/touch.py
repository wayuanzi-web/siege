"""觸控：橫拿與直拿（舞台轉 90 度）兩種情況下，
   手指往「遊戲裡的上／右」拖，砲口要往上／變強；放開要發射；輕點一下不能發射；按鈕點得到。"""
import asyncio, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
EV = "([t, x, y]) => document.getElementById('stage').dispatchEvent(new PointerEvent(t, {pointerId: 5, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true}))"
async def run(p, W, H, name):
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = await ctx.new_page(); msgs = []
    pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: msgs.append(m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
    await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(700)
    await pg.evaluate("window.__qp.startLevel(0)"); await pg.wait_for_timeout(1800)
    aim = lambda: pg.evaluate("(() => { const a = window.__qp.S.team[0].aim; return [Math.round(Math.atan2(a[1], a[0]) * 180 / Math.PI), Math.round(Math.hypot(a[0], a[1]))]; })()")
    st = lambda: pg.evaluate("(() => { const q = window.__qp, S = q.S; return S.phase + '/' + S.turn + ' fired=' + S.stat.fired; })()")
    rot = await pg.evaluate("window.__qp.G.rot")
    async def drag(d, release=True, n=20):
        x0, y0 = W * 0.45, H * 0.5
        await pg.evaluate(EV, ['pointerdown', x0, y0])
        for i in range(1, n + 1): await pg.evaluate(EV, ['pointermove', x0 + d[0] * i, y0 + d[1] * i])
        await pg.wait_for_timeout(150)
        if release: await pg.evaluate(EV, ['pointerup', x0 + d[0] * n, y0 + d[1] * n])
        else: await pg.evaluate(EV, ['pointercancel', x0 + d[0] * n, y0 + d[1] * n])
    right = [3, 0] if rot == 0 else [0, 3]       # 直拿（順時針轉 90 度）時，「遊戲裡往右」是 clientY 增加
    up = [0, -3] if rot == 0 else [3, 0]
    a0 = await aim(); s0 = await st()
    # 1. 輕點：不能發射
    await pg.evaluate(EV, ['pointerdown', W * 0.5, H * 0.5]); await pg.wait_for_timeout(60); await pg.evaluate(EV, ['pointerup', W * 0.5, H * 0.5]); await pg.wait_for_timeout(200)
    s1 = await st()
    # 2. 拖了但被系統取消（pointercancel）：不能發射，但瞄準有改
    await drag(right, release=False); a1 = await aim(); s2 = await st()
    # 3. 往上拖、放開：發射
    await drag(up); a2 = await aim(); await pg.wait_for_timeout(300); s3 = await st()
    ok_aim = a1[1] > a0[1] and a2[0] > a1[0]
    ok_fire = 'fired=0' in s1 and 'fired=0' in s2 and 'fired=0' not in s3
    # 4. 輪到敵軍時拖曳：可以先調，放開不會發射
    # （看「第幾輪齊射」有沒有變，不看打出去幾發：上一輪的連射可能還沒射完，發數本來就還在增加）
    await pg.wait_for_timeout(900)
    f3 = await pg.evaluate("window.__qp.S.vol + ':' + window.__qp.S.turn + ':' + window.__qp.S.phase"); await drag(right, n=8); f4 = await pg.evaluate("window.__qp.S.vol + ':' + window.__qp.S.turn + ':' + window.__qp.S.phase")
    # 5. 按鈕點得到嗎（轉向後用畫面座標點）
    await pg.evaluate("window.__qp.S.team[0].shield.c = 100")
    r = await pg.evaluate("(() => { const b = document.getElementById('btnShield').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
    await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(200)
    sh = await pg.evaluate("window.__qp.S.team[0].shield.uses")
    r = await pg.evaluate("(() => { const b = document.getElementById('btnPause').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
    await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(300)
    mode = await pg.evaluate("window.__qp.G.mode")
    await pg.screenshot(path=str(root / f'shots/touch_{W}x{H}.png'))
    print(f'{name}: rot={rot} 瞄準 {a0} → 往右拖 {a1} → 往上拖 {a2}  方向{"正確" if ok_aim else "錯誤"}  發射規則{"正確" if ok_fire else "錯誤"} ({s1} | {s2} | {s3})  還沒輪到我時放開沒發射={f3.split(':')[0] == f4.split(':')[0]}（{f3} → {f4}）  護罩點擊={sh}  暫停後 mode={mode}  errors={msgs}')
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p, 844, 390, '橫拿')
        await run(p, 390, 844, '直拿')
        await run(p, 375, 667, '直拿小')
asyncio.run(main())
