"""量效能：python3 test/perf.py [關卡=4] [寬x高=844x390] [dpr=3]
   在一次大爆炸之後（很多磚醒著）量 simStep 和 renderFrame 各花多久。"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
a = sys.argv[1:]; lvl = int(a[0]) if a else 4
W, H = [int(x) for x in (a[1] if len(a) > 1 else '844x390').split('x')]; dpr = float(a[2]) if len(a) > 2 else 3
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=dpr)
        pg = await ctx.new_page(); await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
        r = await pg.evaluate("""(l) => { const q = window.__qp, S = q.S; q.G.freeze = true; q.startLevel(l - 1); q.aiInit(S.team[0], q.BOTS.expert, {aiErr: 1});
          const out = {canvas: [q.V.W, q.V.H]};
          const aw = () => { let n = 0, t = 0; for (let b = q.PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic()) { t++; if (b.isAwake()) n++; } return [n, t]; };
          const time = (fn, n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); return +((performance.now() - t0) / n).toFixed(3); };
          out.idleRender = time(() => q.renderFrame(1 / 60, 1 / 60), 40); out.idleStep = time(() => q.simStep(1 / 60), 60);
          // 打到第一次大坍塌
          let worst = 0, n = 0; const hist = [];
          while (n++ < 60 * 200 && S.state === 'play') { const t0 = performance.now(); q.simStep(1 / 60); const dt = performance.now() - t0; if (dt > worst) worst = dt; const a = aw()[0]; if (a > 45 && q.SH.n > 20) break; }
          out.at = {t: +S.time.toFixed(1), round: S.round, awake: aw(), shots: q.SH.n, blocks: S.blocks.length, nfrag: S.nfrag};
          out.busyStep = time(() => q.simStep(1 / 60), 30); out.busyRender = time(() => { q.fxStep(1 / 60, 1 / 60); q.renderFrame(1 / 60, 1 / 60); }, 30);
          out.after = {awake: aw(), shots: q.SH.n, parts: q.FX.n};
          // 一整場的統計
          let tot = 0, cnt = 0, w2 = 0, over4 = 0;
          while (cnt < 60 * 240 && S.state === 'play') { const t0 = performance.now(); q.simStep(1 / 60); const dt = performance.now() - t0; tot += dt; cnt++; if (dt > w2) w2 = dt; if (dt > 4) over4++; }
          out.game = {steps: cnt, avg: +(tot / cnt).toFixed(3), worst: +w2.toFixed(1), over4ms: over4, state: S.state, round: S.round};
          return out; }""", lvl)
        print(json.dumps(r, ensure_ascii=False, indent=1)); await b.close()
asyncio.run(main())
