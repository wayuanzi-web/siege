"""主畫面背景的示範對戰：每次重開（換關、或一場打完自動重來）都會重畫整張佈景。量 demoStart + 下一格要多久。
   python3 test/review8/demo_hitch.py [寬x高=844x390] [dpr=2]"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent.parent
W, H = [int(x) for x in (sys.argv[1] if len(sys.argv) > 1 else '844x390').split('x')]; dpr = float(sys.argv[2]) if len(sys.argv) > 2 else 2
JS = """(l) => { const q = window.__qp, cx = document.getElementById('cv').getContext('2d'); q.G.freeze = true; const out = [];
  for (let rep = 0; rep < 3; rep++) { let t0 = performance.now(); q.demoStart(l - 1); const a = performance.now() - t0; t0 = performance.now(); q.renderFrame(1 / 60, 1 / 60); cx.getImageData(0, 0, 1, 1); const b = performance.now() - t0;
    t0 = performance.now(); q.renderFrame(1 / 60, 1 / 60); cx.getImageData(0, 0, 1, 1); const c = performance.now() - t0; out.push([+a.toFixed(0), +b.toFixed(0), +c.toFixed(0)]); }
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=dpr)
        await ctx.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
        pg = await ctx.new_page(); await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
        print(f'{W}x{H} dpr{dpr}   [demoStart ms, first frame ms, second frame ms] x3 restarts')
        for lvl in range(1, 13):
            r = await pg.evaluate(JS, lvl)
            print(f'L{lvl:<2}', r, ' total first restart', r[0][0] + r[0][1], 'ms; later restarts', [x[0] + x[1] for x in r[1:]])
        await b.close()
asyncio.run(main())
