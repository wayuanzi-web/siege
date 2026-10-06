"""進關卡／改視窗大小時卡多久：startLevel()、layout() 強制重畫各量幾次（桌機 CPU；手機大概要乘 3~5）。
   python3 test/review-ui/18_timing.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

async def main():
    async with async_playwright() as p:
        for (W, H, dsf) in [(844, 390, 2), (932, 430, 3)]:
            b, ctx, pg, msgs = await open_page(p, W, H, dsf=dsf)
            r = await pg.evaluate("""(() => { const q = window.__qp, out = {}; q.G.freeze = true; q.SV.seen = true;
              for (let l = 0; l < 6; l++) { const ts = []; for (let k = 0; k < 3; k++) { const t0 = performance.now(); q.startLevel(l); ts.push(performance.now() - t0); }
                const t1 = performance.now(); q.renderFrame(0, 0); const first = performance.now() - t1;
                const t2 = performance.now(); q.V.W = 0; q.layout(); const lay = performance.now() - t2;
                const t3 = performance.now(); q.renderFrame(0, 0); const first2 = performance.now() - t3;
                out['L' + (l + 1)] = {startLevel: ts.map(v => +v.toFixed(0)), firstFrame: +first.toFixed(0), layoutRebuild: +lay.toFixed(0), frameAfterRebuild: +first2.toFixed(0)}; }
              return out; })()""")
            print(f'{W}x{H} dpr{dsf}', json.dumps(r, indent=0).replace('\n', ' '))
            await b.close()
asyncio.run(main())
