"""城破的演出走「真的那個每一格的迴圈」（畫面、粒子、資訊列、結算都跑到），在各種時機硬把一邊的兵全部弄倒，看有沒有執行期錯誤、結算畫面出不出得來。
   python3 test/review5-sim/ui_finale.py [關卡清單=1,2,3,4,5,6]"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
LV = [int(x) for x in (sys.argv[1] if len(sys.argv) > 1 else '1,2,3,4,5,6').split(',')]
CLOCK = r"""
(() => { let vt = 1000, cbs = [], tms = [], tid = 1;
  const realRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { cbs.push(cb); return cbs.length; }; window.cancelAnimationFrame = () => {};
  performance.now = () => vt; window.__errs = [];
  window.addEventListener('error', (e) => { window.__errs.push('ERR ' + (e.message || e) + ' @' + e.lineno); });
  window.setTimeout = (fn, ms) => { const id = tid++; tms.push({ id, t: vt + (ms || 0), fn }); return id; };
  window.clearTimeout = (id) => { tms = tms.filter((q) => q.id !== id); };
  window.__pump = (n) => { for (let i = 0; i < n; i++) { vt += 1000 / 60; const due = tms.filter((q) => q.t <= vt); tms = tms.filter((q) => q.t > vt); for (const q of due) { try { q.fn(); } catch (e) { window.__errs.push('TIMER ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')); } } const c = cbs; cbs = []; for (const f of c) { try { f(vt); } catch (e) { window.__errs.push('FRAME ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')); } } } return vt; };
  const idle = () => { if (!window.__hold) window.__pump(1); realRaf(idle); }; realRaf(idle);
})();
"""
RUN = r"""
async ([lvl, scen]) => { const q = window.__qp, S = q.S, G = q.G, $ = (id) => document.getElementById(id);
  window.__hold = true; window.__errs.length = 0;
  q.SV.open = 6; q.SV.seen = true; q.UI.sel = lvl - 1; if (G.mode !== 'home') q.goHome();
  $('btnGo').click(); q.aiInit(S.team[0], q.BOTS.casual, { aiErr: 1 });
  const kill = (sd) => { for (const u of S.team[sd].units) if (u.alive) q.killUnit(u, 1 - sd, 0); };
  const W = { foeAim: () => S.round >= 2 && S.phase === 'aim' && S.turn === 0, foeFly: () => S.round >= 2 && S.turn === 1 && S.phase !== 'aim' && q.SH.cnt[1] >= 2, meAim: () => S.round >= 2 && S.phase === 'aim' && S.turn === 1, both: () => S.round >= 2 && S.phase === 'resolve', bare: () => S.round >= 2 && S.phase === 'aim' && S.turn === 0, hazard: () => S.phase === 'hazard' }[scen];
  let n = 0; while (n < 120 * 60 && S.state === 'play' && !W()) { window.__pump(2); n += 2; }
  if (S.state !== 'play' || !W()) { window.__hold = false; return { skip: true, state: S.state }; }
  if (scen === 'foeAim' || scen === 'foeFly' || scen === 'hazard') kill(1); else if (scen === 'meAim') kill(0); else if (scen === 'both') { kill(0); kill(1); } else { for (const b of S.st[1].blocks.slice()) if (!b.dead) q.blockKill(b, 0, 0, true); kill(1); }
  const lost0 = S.stat.lost; let frames = 0, maxFx = 0, maxFrag = 0, tSum = 0, tMax = 0;
  while (frames < 9 * 60 && G.mode !== 'result') { const t0 = Date.now(); window.__pump(1); const d = Date.now() - t0; tSum += d; if (d > tMax) tMax = d; frames++; if (q.FX.n > maxFx) maxFx = q.FX.n; if (S.nfrag > maxFrag) maxFrag = S.nfrag; }
  const r = { state: S.state, mode: G.mode, frames, title: $('resTitle') ? $('resTitle').textContent : '', result: !$('result').hidden, lost0, lost1: S.stat.lost, maxFx, maxFrag, msAvg: +(tSum / Math.max(1, frames)).toFixed(1), msMax: tMax, errs: window.__errs.slice(0, 4) };
  window.__hold = false; return r; }
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, has_touch=True, is_mobile=True)
        await ctx.add_init_script(CLOCK)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(700)
        bad = 0
        for lvl in LV:
            for scen in ['foeAim', 'foeFly', 'meAim', 'both', 'bare', 'hazard']:
                if scen == 'hazard' and lvl not in (4, 6): continue
                r = await pg.evaluate(RUN, [lvl, scen])
                if r.get('skip'): print(f'L{lvl} {scen}: state never reached ({r["state"]})'); continue
                ok = r['result'] and not r['errs']
                if not ok: bad += 1
                print(f"{'ok ' if ok else 'BAD'} L{lvl} {scen}: {r['state']}, result screen after {r['frames']} frames ({r['title']}), lost {r['lost0']}->{r['lost1']}, particles max {r['maxFx']}, fragments max {r['maxFrag']}, frame ms avg {r['msAvg']} max {r['msMax']}" + (f"  ERRORS {r['errs']}" if r['errs'] else ''))
        print('page errors:', errs if errs else 'none', '| bad:', bad)
        await b.close()
asyncio.run(main())
