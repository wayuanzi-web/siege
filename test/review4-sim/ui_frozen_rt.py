"""真實時間（不用假時鐘）：輪到我方、全員被凍住、護罩沒滿。看畫面底下那一句提示在自動跳過之前有沒有講出來。
   python3 test/review4-sim/ui_frozen_rt.py [關卡=3] [第幾回合凍=2]"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
LVL = int(sys.argv[1]) if len(sys.argv) > 1 else 3
RND = int(sys.argv[2]) if len(sys.argv) > 2 else 2
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(800)
        r = await pg.evaluate(r"""async ([lvl, rnd]) => {
          const q = window.__qp, S = q.S, G = q.G, $ = (id) => document.getElementById(id), T = () => S.team[0];
          q.SV.open = 6; q.SV.seen = true; q.UI.sel = lvl - 1; $('btnGo').click();
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const log = []; const t00 = performance.now(); const ts = () => ((performance.now() - t00) / 1000).toFixed(1);
          // 每一回合輪到我就按發射，直到指定的回合；那一回合之前（敵軍那一輪打完之前）把我方全凍住、護罩清空
          let froze = false, turnAt = 0, skippedAt = 0, lastSay = '', saw = [];
          for (let i = 0; i < 1200; i++) {
            await sleep(50);
            if (S.state !== 'play') break;
            const mine = S.phase === 'aim' && S.turn === 0;
            if (mine && S.round < rnd) $('btnFire').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true }));
            if (!froze && S.round === rnd - 1 && S.turn === 1 && (S.phase === 'resolve' || S.phase === 'hazard')) { for (const u of T().units) if (u.alive) { u.frozen = 1; u.immune = false; } T().shield.c = 0; froze = true; }
            if (froze && S.round === rnd - 1) { for (const u of T().units) if (u.alive) u.frozen = 1; T().shield.c = 0; }
            if (froze && mine && S.round === rnd && !turnAt) { turnAt = performance.now(); log.push(`${ts()}s: my turn (round ${S.round}), ${T().units.filter((u) => u.alive && u.frozen > 0).length}/${T().alive} frozen, shield ${T().shield.c}`); }
            if (turnAt) {
              const el = $('say'), txt = el.classList.contains('show') ? el.textContent : '';
              if (txt !== lastSay) { lastSay = txt; saw.push(`+${((performance.now() - turnAt) / 1000).toFixed(1)}s "${txt}"`); }
              if (!skippedAt && !(S.phase === 'aim' && S.turn === 0)) { skippedAt = performance.now(); log.push(`turn auto-skipped +${((skippedAt - turnAt) / 1000).toFixed(1)}s after it started; toast on screen at that moment: "${txt}"`); }
              if (performance.now() - turnAt > 9000) break;
            }
          }
          return { log, saw, round: S.round, state: S.state };
        }""", [LVL, RND])
        for l in r['log']: print('  ' + l)
        print('  toasts seen from the start of that turn: ' + ' | '.join(r['saw']))
        expl = [s for s in r['saw'] if '動不了' in s]
        print('  explanation ("兵都動不了…") first shown: ' + (expl[0] if expl else 'NEVER within 9 s'))
        if errs: print('  page errors: ' + '; '.join(errs))
        await b.close()
asyncio.run(main())
