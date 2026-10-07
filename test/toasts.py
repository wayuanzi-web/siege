"""把一整場打完（真的那個每一格的迴圈，快轉），記下每一句提示是什麼時候跳出來的、當時輪到誰、場上有什麼。
   python3 test/toasts.py <關卡=6> [bot=expert] [seed=3] [--fresh]（--fresh：全新存檔，會走新手教學）
   用來檢查「講的時候那個東西還在不在」：×20 的符、天燈、氣球、光球、該打的柱子……"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]; fresh = '--fresh' in sys.argv
lvl = int(args[0]) if args else 6; bot = args[1] if len(args) > 1 else 'expert'; seed = int(args[2]) if len(args) > 2 else 3
CLOCK = r"""
(() => { let vt = 1000, cbs = [], tms = [], tid = 1;
  const realRaf = window.requestAnimationFrame.bind(window), realSet = window.setTimeout.bind(window);
  window.requestAnimationFrame = (cb) => { cbs.push(cb); return cbs.length; }; window.cancelAnimationFrame = () => {};
  performance.now = () => vt;
  // 計時器也跟著假時鐘走（提示排隊、延後講的話都是用 setTimeout 排的）
  window.setTimeout = (fn, ms) => { const id = tid++; tms.push({ id, t: vt + (ms || 0), fn }); return id; };
  window.clearTimeout = (id) => { tms = tms.filter((q) => q.id !== id); };
  window.__pump = (n) => { for (let i = 0; i < n; i++) { vt += 1000 / 60; const due = tms.filter((q) => q.t <= vt); tms = tms.filter((q) => q.t > vt); for (const q of due) { try { q.fn(); } catch (e) { console.error(e); } } const c = cbs; cbs = []; for (const f of c) f(vt); } return vt; };
  const idle = () => { if (!window.__hold) window.__pump(1); realRaf(idle); }; realRaf(idle);
})();
"""
RUN = r"""
async ([lvl, bot, seed, fresh]) => { const q = window.__qp, S = q.S, G = q.G, $ = (id) => document.getElementById(id);
  window.__hold = true; let s = seed; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  q.SV.open = 6; if (!fresh) { q.SV.seen = true; } q.UI.sel = lvl - 1; if (G.mode !== 'home') q.goHome();
  $('btnGo').click(); q.aiInit(S.team[0], q.BOTS[bot], { aiErr: 1 });
  const log = []; let last = '';
  const world = () => ({ gates: S.gates.filter((g) => !g.dead).map((g) => (g.owner === 0 ? '我' : g.owner === 1 ? '敵' : '中') + '×' + g.mult).join(' '), objs: S.objs.filter((o) => o.t === 'lantern' || o.t === 'balloon' || o.t === 'orb').map((o) => o.t + ':' + (o.st || '') + (o.hp > 0 ? '' : '(dead)')).join(' '), sh: Math.round(S.team[0].shield.c) + '/' + S.team[0].shield.need, boss: S.boss ? S.boss.phase : 0 });
  let frames = 0;
  while (frames < 420 * 60 && G.mode !== 'result') {
    window.__pump(2); frames += 2;
    const el = $('say'), t = el.classList.contains('show') ? el.textContent : '';
    if (t && t !== last) log.push({ t: +S.time.toFixed(1), r: S.round, ph: S.phase + '/' + S.turn, txt: t, ...world() });
    last = t;
    if (frames % 300 === 0) await new Promise((res) => (window.__realSet || ((f) => f()))(res));
  }
  window.__hold = false;
  return { state: S.state, round: S.round, log }; }
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, has_touch=True, is_mobile=True)
        await ctx.add_init_script(CLOCK)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(700)
        r = await pg.evaluate(RUN, [lvl, bot, seed, fresh])
        print(f"L{lvl} {bot} seed{seed}: {r['state']} 第 {r['round']} 回合結束；提示 {len(r['log'])} 句")
        for m in r['log']: print(f"  t={m['t']:6.1f} r{m['r']} {m['ph']:10s} 〔{m['txt']}〕  符[{m['gates']}] 物[{m['objs']}] 護罩{m['sh']}" + (f" 魔王階段{m['boss']}" if m['boss'] else ''))
        if errs: print('ERRORS', errs)
        await b.close()
asyncio.run(main())
