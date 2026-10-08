"""平靜時偶爾一格很慢（>50ms）：是哪一段？分開量 simStep、fxStep、renderFrame，再用 CDP 的 Profiler 看最花時間的函式。
   python3 test/review8/prof.py <關卡> [寬x高=844x390] [dpr=2]"""
import asyncio, sys, pathlib, json, collections
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent.parent
lvl = int(sys.argv[1]); W, H = [int(x) for x in (sys.argv[2] if len(sys.argv) > 2 else '844x390').split('x')]; dpr = float(sys.argv[3]) if len(sys.argv) > 3 else 2
JS = """(l) => { const q = window.__qp, S = q.S; q.G.freeze = true; q.startLevel(l - 1); S.team[0].ai = null; S.team[1].ai = null;
  const STEP = 1 / 60; for (let i = 0; i < 120; i++) q.simStep(STEP);
  const rows = [];
  for (let i = 0; i < 240; i++) { let t0 = performance.now(); q.simStep(STEP); const a = performance.now() - t0; t0 = performance.now(); q.fxStep(STEP, STEP); const b = performance.now() - t0; t0 = performance.now(); q.renderFrame(STEP, STEP); const c = performance.now() - t0; rows.push([a, b, c]); }
  const slow = rows.map((r, i) => [i, r.map((v) => +v.toFixed(1))]).filter((x) => x[1][0] + x[1][1] + x[1][2] > 40);
  const avg = [0, 1, 2].map((k) => +(rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(2));
  return { avg, slow: slow.slice(0, 30), nslow: slow.length, phase: S.phase, parts: q.FX.n }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=dpr)
        await ctx.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
        pg = await ctx.new_page(); await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {'interval': 200})
        await cdp.send('Profiler.start')
        r = await pg.evaluate(JS, lvl)
        prof = (await cdp.send('Profiler.stop'))['profile']
        print(json.dumps({k: r[k] for k in ('avg', 'nslow', 'phase', 'parts')}))
        for s in r['slow'][:20]: print('  frame', s[0], 'sim/fx/render ms', s[1])
        # 每個函式的 self time
        nodes = {n['id']: n for n in prof['nodes']}
        dt = collections.Counter(); tot = 0
        samples, deltas = prof['samples'], prof['timeDeltas']
        for sid, d in zip(samples, deltas):
            n = nodes[sid]; cf = n['callFrame']; key = (cf['functionName'] or '(anon)') + ':' + str(cf['lineNumber']); dt[key] += d; tot += d
        print('top self time:')
        for k, v in dt.most_common(18): print(f'  {v / 1000:8.1f}ms  {100 * v / tot:5.1f}%  {k}')
        await b.close()
asyncio.run(main())
