"""（每一格畫完都 getImageData 一下，逼畫布把這一格真的畫出來，不然軟體算圖會攢好幾格一起畫，量到的是假的尖峰）
   每一關的一格要多久：平靜時、大爆炸後（同 perf.py 的炸法），各算平均、最久、超過 50ms 的格數、最久的是第幾格。
   同一關連跑兩次（第二次貼圖都已經做好了），分得出「第一次做貼圖」的尖峰和一直都慢的。
   python3 test/review8/perf8.py [寬x高=844x390] [dpr=2] [關卡=1..12]"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent.parent
a = sys.argv[1:]
W, H = [int(x) for x in (a[0] if a else '844x390').split('x')]; dpr = float(a[1]) if len(a) > 1 else 2
LV = [int(x) for x in (a[2].split(',') if len(a) > 2 else range(1, 13))]
JS = """([l, rep]) => { const q = window.__qp, S = q.S; q.G.freeze = true; q.startLevel(l - 1); S.team[0].ai = null; S.team[1].ai = null;
  const STEP = 1 / 60;
  for (let i = 0; i < 120; i++) q.simStep(STEP);
  const cx = document.getElementById('cv').getContext('2d'); const run = (n, sim) => { const ts = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); if (sim) q.simStep(STEP); q.fxStep(STEP, STEP); q.renderFrame(STEP, STEP); cx.getImageData(0, 0, 1, 1); ts.push(performance.now() - t0); } return ts; };
  const stat = (ts) => { const s = ts.slice().sort((x, y) => x - y); let mi = 0; ts.forEach((v, i) => { if (v > ts[mi]) mi = i; }); return { avg: +(ts.reduce((x, y) => x + y, 0) / ts.length).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1), at: mi, over50: ts.filter((v) => v > 50).length }; };
  const out = { lvl: l, rep };
  out.idle = stat(run(120, true));
  if (S.phase === 'aim') { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; }
  for (const st of [S.st[0], S.st[1]]) for (const [fx, fy] of [[0.3, 0.75], [0.7, 0.75], [0.5, 0.5], [0.3, 0.3], [0.7, 0.3]]) q.physExplode(st.x0 + (st.x1 - st.x0) * fx, st.y0 + (st.y1 - st.y0) * fy, q.WPN.bomb, 2, 1.6, 0, null, 0, 1);
  out.busy = stat(run(150, true));
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=dpr)
        await ctx.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
        pg = await ctx.new_page(); await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
        print(f'{W}x{H} dpr{dpr}')
        for lvl in LV:
            for rep in (1, 2):
                r = await pg.evaluate(JS, [lvl, rep])
                print(f"L{lvl:<2} run{rep}  idle avg {r['idle']['avg']:5}ms p95 {r['idle']['p95']:5} max {r['idle']['max']:6} (frame #{r['idle']['at']:3}) >50ms {r['idle']['over50']:3}   |  after blasts avg {r['busy']['avg']:5}ms p95 {r['busy']['p95']:5} max {r['busy']['max']:6} (frame #{r['busy']['at']:3}) >50ms {r['busy']['over50']:3}")
        await b.close()
asyncio.run(main())
