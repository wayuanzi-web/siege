"""開關卡之後的第一格為什麼慢：startLevel 之後，量第 0、1、2 格（renderFrame 分開量），再用 Profiler 看第 0 格花在哪。
   python3 test/review8/first.py <關卡,…> [寬x高=844x390] [dpr=2]"""
import asyncio, sys, pathlib, json, collections
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent.parent
LV = [int(x) for x in sys.argv[1].split(',')]; W, H = [int(x) for x in (sys.argv[2] if len(sys.argv) > 2 else '844x390').split('x')]; dpr = float(sys.argv[3]) if len(sys.argv) > 3 else 2
JS = """(l) => { const q = window.__qp, S = q.S, cx = document.getElementById('cv').getContext('2d'); q.G.freeze = true;
  let t0 = performance.now(); q.startLevel(l - 1); const ts = performance.now() - t0; S.team[0].ai = null; S.team[1].ai = null;
  const out = { start: +ts.toFixed(1), frames: [] };
  for (let i = 0; i < 4; i++) { t0 = performance.now(); q.simStep(1 / 60); q.fxStep(1 / 60, 1 / 60); q.renderFrame(1 / 60, 1 / 60); cx.getImageData(0, 0, 1, 1); out.frames.push(+(performance.now() - t0).toFixed(1)); }
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=dpr)
        await ctx.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
        pg = await ctx.new_page(); await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
        cdp = await ctx.new_cdp_session(pg)
        for lvl in LV:
            for rep in (1, 2):
                await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {'interval': 100}); await cdp.send('Profiler.start')
                r = await pg.evaluate(JS, lvl)
                prof = (await cdp.send('Profiler.stop'))['profile']
                nodes = {n['id']: n for n in prof['nodes']}; parent = {}
                for n in prof['nodes']:
                    for c in n.get('children', []): parent[c] = n['id']
                dt = collections.Counter()
                for sid, d in zip(prof['samples'], prof['timeDeltas']):
                    # 往上找第一個「有名字的遊戲函式」
                    k = sid; chain = []
                    while k in nodes and len(chain) < 6:
                        cf = nodes[k]['callFrame']
                        if cf['functionName'] and cf['url'] == '' or cf['functionName'] in ('drawImage',): pass
                        chain.append(cf['functionName'] or '(anon)'); k = parent.get(k)
                    dt[' < '.join(chain[:4])] += d
                print(f"L{lvl} rep{rep}: startLevel {r['start']}ms  frames {r['frames']}")
                for k, v in dt.most_common(8): print(f'     {v / 1000:7.1f}ms  {k}')
        await b.close()
asyncio.run(main())
