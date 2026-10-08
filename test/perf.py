"""量效能：python3 test/perf.py [寬x高=844x390] [dpr=2] [--page=<另一份 index.html>]
   每一關：先量平靜時畫一格要多久，再在兩座城上各引爆幾顆炸彈（很多磚醒著、碎塊和粒子滿天飛），
   量接下來 1.5 秒裡 simStep 和 fxStep + renderFrame 各花多久（平均／最久）。
   這裡沒有顯示卡（軟體算圖），數字會比手機慢很多，主要拿來前後比較、看有沒有哪一關特別重。"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
a = [x for x in sys.argv[1:] if not x.startswith('--')]; opts = dict(x[2:].split('=', 1) for x in sys.argv[1:] if x.startswith('--') and '=' in x)
W, H = [int(x) for x in (a[0] if a else '844x390').split('x')]; dpr = float(a[1]) if len(a) > 1 else 2
page = opts.get('page', str(root / 'src/dist/index.html'))
JS = """(l) => { const q = window.__qp, S = q.S; q.G.freeze = true; q.startLevel(l - 1); S.team[0].ai = null; S.team[1].ai = null;
  const STEP = 1 / 60, aw = () => { let n = 0, t = 0; for (let b = q.PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic()) { t++; if (b.isAwake()) n++; } return [n, t]; };
  for (let i = 0; i < 120; i++) q.simStep(STEP);
  const tm = (fn, n) => { let tot = 0, w = 0; for (let i = 0; i < n; i++) { const t0 = performance.now(); fn(); const d = performance.now() - t0; tot += d; if (d > w) w = d; } return [+(tot / n).toFixed(2), +w.toFixed(1)]; };
  const out = { lvl: l, canvas: [q.V.W, q.V.H], idleRender: tm(() => { q.fxStep(STEP, STEP); q.renderFrame(STEP, STEP); }, 40)[0] };
  if (S.phase === 'aim') { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; }
  for (const st of [S.st[0], S.st[1]]) for (const [fx, fy] of [[0.3, 0.75], [0.7, 0.75], [0.5, 0.5], [0.3, 0.3], [0.7, 0.3]]) q.physExplode(st.x0 + (st.x1 - st.x0) * fx, st.y0 + (st.y1 - st.y0) * fy, q.WPN.bomb, 2, 1.6, 0, null, 0, 1);
  for (let i = 0; i < 12; i++) { q.simStep(STEP); q.fxStep(STEP, STEP); }
  out.awake = aw(); out.nfrag = S.nfrag; out.parts = q.FX.n;
  let sT = 0, sW = 0, rT = 0, rW = 0; const N = 90;
  for (let i = 0; i < N; i++) { let t0 = performance.now(); q.simStep(STEP); let d = performance.now() - t0; sT += d; if (d > sW) sW = d; t0 = performance.now(); q.fxStep(STEP, STEP); q.renderFrame(STEP, STEP); d = performance.now() - t0; rT += d; if (d > rW) rW = d; }
  out.busyStep = [+(sT / N).toFixed(2), +sW.toFixed(1)]; out.busyRender = [+(rT / N).toFixed(2), +rW.toFixed(1)]; out.low = !!q.FX.low;
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=dpr)
        pg = await ctx.new_page(); await pg.goto(page if '://' in page else pathlib.Path(page).as_uri()); await pg.wait_for_timeout(500)
        print(f'{page}  {W}x{H} dpr{dpr}')
        for lvl in range(1, 13):
            r = await pg.evaluate(JS, lvl)
            print(f"L{r['lvl']} 畫布 {r['canvas'][0]}x{r['canvas'][1]}  平靜時畫一格 {r['idleRender']}ms  ｜ 大爆炸後 醒著 {r['awake'][0]}/{r['awake'][1]} 碎塊 {r['nfrag']} 粒子 {r['parts']}  simStep 平均 {r['busyStep'][0]}ms（最久 {r['busyStep'][1]}）  畫一格 平均 {r['busyRender'][0]}ms（最久 {r['busyRender'][1]}）")
        await b.close()
asyncio.run(main())
