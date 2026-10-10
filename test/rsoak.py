"""整場走「真的那個每一格的迴圈」快轉跑完（畫面、資訊列、提示、結算都會跑到），抓執行期錯誤。
   Node 那邊的測試只載模擬的部分，畫面那一半（70-render / 55-fx / 80-ui / 85-main）裡少見的分支只有這裡跑得到。

   python3 test/rsoak.py [每關幾局=2] [關卡清單=1,2,3,4,5,6] [--monkey] [--size=844x390]
     關卡清單裡寫 p0–p11 是演武場的戰場（雙方的兵每一局隨機挑、誤傷七成開著）
     預設：我方交給自動玩家（casual / newbie / expert 輪流），一路打到結算畫面，再按「下一關／再來一次」
     --monkey：我方不用自動玩家，改成亂拖亂按（瞄準拖曳、發射鈕、兩個技能、暫停再繼續、開關設定）

   做法：把 requestAnimationFrame 和 performance.now 換成假的時鐘，一口氣推很多格（每一格 1/60 秒），
   遊戲自己完全不知道，走的就是玩家玩的時候那條路。
"""
import asyncio, sys, pathlib, json, time
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
GAMES = int(args[0]) if args else 2
LEVELS = [x if x.startswith('p') else int(x) for x in (args[1] if len(args) > 1 else '1,2,3,4,5,6,7,8,9,10,11,12').split(',')]
W, H = [int(x) for x in opts.get('size', '844x390').split('x')]
MONKEY = 'monkey' in opts
PAGE = opts.get('page', str(ROOT / 'src/dist/index.html'))

CLOCK = r"""
(() => {
  let vt = 1000, cbs = [];
  const realRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { cbs.push(cb); return cbs.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => vt;
  window.__pump = (n) => { for (let i = 0; i < n; i++) { vt += 1000 / 60; const c = cbs; cbs = []; for (const f of c) f(vt); } return vt; };
  // 沒人推的時候照正常速度走（開機、字型載入那一段）
  const idle = () => { if (!window.__hold) window.__pump(1); realRaf(idle); }; realRaf(idle);
})();
"""

DRIVE = r"""
async ([lvl, bot, seed, monkey, maxSec]) => {
  const q = window.__qp, S = q.S, G = q.G, $ = (id) => document.getElementById(id);
  window.__hold = true;
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  q.SV.open = 12; q.SV.seen = true;
  const prac = typeof lvl === 'string' && lvl[0] === 'p';
  if (prac) {
    // 演武場：雙方各挑六個兵（十八種隨機），戰場照清單
    const U = ['rocket', 'bolt', 'bomb', 'fire', 'ice', 'zap', 'flak', 'bal', 'stone', 'chain', 'drill', 'cluster', 'sapper', 'magnet', 'wind', 'acid', 'sniper', 'eng'];
    const crew = () => Array.from({ length: 6 }, () => U[(rnd() * U.length) | 0]);
    q.SV.prac = { map: +lvl.slice(1) || 0, me: crew(), foe: crew(), ff: rnd() < 0.7 ? 1 : 0 };
    q.UI.prac = true; q.UI.chap = 2; q.UI.sel = 0;
  } else { q.UI.prac = false; q.UI.sel = lvl - 1; }
  if (G.mode !== 'home') q.goHome();
  $('btnGo').click();
  if (!monkey) q.aiInit(S.team[0], q.BOTS[bot], { aiErr: 1 });
  const stage = $('stage'), r = stage.getBoundingClientRect();
  const pe = (t, x, y) => stage.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true }));
  const tap = (id) => { const b = $(id); if (!b || b.hidden || b.disabled) return false; b.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true })); b.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true })); b.click(); return true; };
  let frames = 0, fired = 0, paused = 0, skills = 0, rounds = 0;
  const lim = maxSec * 60;
  while (frames < lim && G.mode !== 'result') {
    if (monkey && G.mode === 'play' && S.state === 'play') {
      if (S.phase === 'aim' && S.turn === 0) {
        // 亂拖一下再放開（放開就發射）；偶爾改按發射鈕、偶爾先按技能
        if (rnd() < 0.25 && tap('btnUlt')) skills++;
        if (rnd() < 0.25 && tap('btnShield')) skills++;
        const x0 = r.left + r.width * (0.2 + rnd() * 0.5), y0 = r.top + r.height * (0.3 + rnd() * 0.5);
        pe('pointerdown', x0, y0);
        const dx = (rnd() - 0.6) * 160, dy = (rnd() - 0.3) * 120, n = 3 + (rnd() * 6 | 0);
        for (let i = 1; i <= n; i++) { pe('pointermove', x0 + dx * i / n, y0 + dy * i / n); window.__pump(1); frames++; }
        if (rnd() < 0.3) { pe('pointercancel', x0 + dx, y0 + dy); tap('btnFire'); } else pe('pointerup', x0 + dx, y0 + dy);
        if (S.phase === 'aim' && S.turn === 0) tap('btnFire');
        fired++;
      } else if (rnd() < 0.004) {
        // 砲彈還在飛的時候暫停、開設定、關掉、繼續
        if (tap('btnPause')) { paused++; window.__pump(8); if (G.mode === 'pause') $('btnResume').click(); window.__pump(2); }
      }
    }
    window.__pump(4); frames += 4;
    if (frames % 240 === 0) await new Promise((res) => setTimeout(res, 0));       // 讓版面、計時器有機會跑
  }
  rounds = S.round;
  const out = { lvl, bot: monkey ? 'monkey' : bot, state: S.state, mode: G.mode, rounds, sec: +(frames / 60).toFixed(0), fired, paused, skills, crew: prac ? q.SV.prac.me.join(',') + ' vs ' + q.SV.prac.foe.join(',') + (q.SV.prac.ff ? ' ff' : '') : undefined,
    result: !$('result').hidden, title: ($('resTitle') || {}).textContent || '', low: !!q.FX.low };
  // 結算畫面：等按鈕解鎖再按
  if (G.mode === 'result') {
    window.__pump(90); await new Promise((res) => setTimeout(res, 700));
    window.__pump(30);
    const pick = S.state === 'won' ? (rnd() < 0.5 ? 'btnNext' : 'btnHome') : (rnd() < 0.5 ? 'btnAgain' : 'btnHome');
    const b = $(pick); out.btn = pick + (b && !b.hidden ? '' : '(hidden)');
    if (b && !b.hidden) b.click();
    window.__pump(120);
    out.after = G.mode;
    if (G.mode !== 'home') q.goHome();
    window.__pump(30);
  }
  window.__hold = false;
  return out;
}
"""


async def main():
    bots = ['casual', 'newbie', 'expert']
    bad = 0; t00 = time.time()
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, has_touch=True, is_mobile=True)
        await ctx.add_init_script(CLOCK)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e) + '\n' + (getattr(e, 'stack', '') or '')))
        await pg.goto(PAGE if '://' in PAGE else pathlib.Path(PAGE).as_uri()); await pg.wait_for_timeout(900)
        k = 0
        for lvl in LEVELS:
            for g in range(GAMES):
                bot = bots[k % 3]; seed = 1000 + k * 7919; k += 1; t0 = time.time(); n0 = len(msgs)
                try:
                    r = await pg.evaluate(DRIVE, [lvl, bot, seed, MONKEY, 420])
                except Exception as e:
                    r = {'lvl': lvl, 'bot': bot, 'error': str(e)[:400]}
                new = msgs[n0:]
                ok = 'error' not in r and not new and r.get('mode') == 'result' and r.get('result')
                if not ok: bad += 1
                print(('ok  ' if ok else 'BAD ') + json.dumps(r, ensure_ascii=False) + f'  {time.time() - t0:.0f}s', flush=True)
                for m in new[:6]: print('     ' + m[:600], flush=True)
        await b.close()
    print(f'{"全部正常" if not bad else str(bad) + " 局有問題"}（{k} 局，{time.time() - t00:.0f} 秒）')
    sys.exit(1 if bad else 0)

asyncio.run(main())
