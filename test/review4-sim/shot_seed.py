"""照某一場（關卡、自動玩家、種子、難度）推進到指定秒數，截圖（可以只截戰場的某一塊）。跟 Node 重播用同一個種子，所以畫面對得上。
   python3 test/review4-sim/shot_seed.py <關卡> <bot> <seed> <難度> <秒數,…> [x0,y0,x1,y1 戰場座標的範圍] [輸出資料夾]"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
lvl, bot, seed, diff = int(sys.argv[1]), sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
times = [float(x) for x in sys.argv[5].split(',')]
box = [float(x) for x in sys.argv[6].split(',')] if len(sys.argv) > 6 and sys.argv[6] != '-' else None
out = pathlib.Path(sys.argv[7]) if len(sys.argv) > 7 else pathlib.Path(__file__).parent / 'shots'
out.mkdir(parents=True, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 1100, 'height': 560}, device_scale_factor=2)
        pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(700)
        await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}')
        await pg.evaluate("([l, bot, seed, diff]) => { const q = window.__qp; q.G.freeze = true; q.SV.diff = diff; q.startLevel(l - 1); q.simInit(l - 1, {}, seed, diff, { botA: q.BOTS[bot] }); }", [lvl, bot, seed, diff])
        t = 0
        for tt in times:
            await pg.evaluate("(s) => window.__qp.advance(s)", tt - t); t = tt
            st = await pg.evaluate("(() => { const q = window.__qp, S = q.S; return { t: +S.time.toFixed(2), round: S.round, phase: S.phase, turn: S.turn, state: S.state, units: S.units.filter((u) => u.alive).map((u) => `s${u.side} ${u.type}#${u.slot} (${u.x.toFixed(1)},${u.y.toFixed(1)}) hp${u.hp.toFixed(0)}`) }; })()")
            clip = None
            if box:
                r = await pg.evaluate("([x0, y0, x1, y1]) => { const q = window.__qp, V = q.V, cv = document.getElementById('cv').getBoundingClientRect(), k = cv.width / V.W; const X = (wx) => ((wx - 56) * V.s + V.cx) * k + cv.left, Y = (wy) => (V.gy - wy * V.s) * k + cv.top; return { x: X(x0), y: Y(y1), width: X(x1) - X(x0), height: Y(y0) - Y(y1) }; }", box)
                clip = r
            name = out / f'L{lvl}_{bot}_{seed}_{int(round(tt * 10)):05d}.png'
            await pg.screenshot(path=str(name), clip=clip) if clip else await pg.screenshot(path=str(name))
            print(name.name, json.dumps(st, ensure_ascii=False))
        if msgs: print('errors:', msgs[:5])
        await b.close()
asyncio.run(main())
