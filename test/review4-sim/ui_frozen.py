"""輪到我方、可是每個兵都被凍住（或電暈）開不了火：
     A. 護罩沒滿 → 應該提示之後自動跳過這一輪（約 1.6 秒）
     B. 護罩滿了 → 提示可以開護罩；不開就要自己按「發射」跳過；按了護罩之後應該馬上能正常開火
     C. A 的等待中途暫停再繼續 → 繼續之後還是會自動跳過，不會卡住
   python3 test/review4-sim/ui_frozen.py"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
src = (pathlib.Path(__file__).parent / 'ui_scen.py').read_text(encoding='utf8')
CLOCK = src.split('CLOCK = r"""')[1].split('"""')[0]; HELPERS = src.split('HELPERS = r"""')[1].split('"""')[0]
JS = r"""
async ([mode]) => {
  const q = window.__qp, S = q.S, G = q.G, h = window.__h, $ = (id) => document.getElementById(id);
  window.__hold = true; const log = [], bad = [];
  h.start(3, null);
  const T = S.team[0];
  const wait = async (ms) => { const n = Math.round(ms / (1000 / 60)); for (let i = 0; i < n; i += 6) { window.__pump(6); await new Promise((r) => setTimeout(r, 30)); } };
  // 第一回合：正常開火；敵軍那一輪打完之前把我方全部凍住
  let n = 0; while (!(S.phase === 'aim' && S.turn === 0) && n++ < 900) window.__pump(1);
  $('btnFire').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true }));
  n = 0; while (!(S.turn === 1 && S.phase === 'resolve') && n++ < 3000) window.__pump(1);
  for (const u of T.units) if (u.alive) { u.frozen = 1; u.immune = false; }
  T.shield.c = mode === 'B' ? T.shield.need : 0;
  n = 0; while (!(S.phase === 'aim' && S.turn === 0 && S.round === 2) && n++ < 3000) window.__pump(1);
  if (!(S.phase === 'aim' && S.turn === 0)) return { bad: ['never got to my second turn: ' + JSON.stringify(h.ui())], errs: window.__errs.splice(0) };
  const t0 = S.time; log.push(`my turn r${S.round} at t=${t0.toFixed(2)}; frozen ${T.units.filter((u) => u.alive && u.frozen > 0).length}/${T.alive}; shield ${T.shield.c}/${T.shield.need}; say="${$('say').textContent}"`);
  if (mode === 'A') {
    await wait(3500);
    log.push(`after 3.5 s: phase ${S.phase}/${S.turn} t=${S.time.toFixed(2)}`);
    if (S.phase === 'aim' && S.turn === 0) bad.push('A: not auto-skipped after 3.5 s with nobody able to fire and no shield');
  } else if (mode === 'C') {
    await wait(700); h.tap('btnPause'); if (G.mode !== 'pause') bad.push('C: could not pause'); await wait(3000);
    if (S.phase !== 'aim') bad.push('C: turn moved on while paused');
    $('btnResume').click(); await wait(3500);
    log.push(`after pause 3 s + resume + 3.5 s: phase ${S.phase}/${S.turn} mode ${G.mode}`);
    if (S.phase === 'aim' && S.turn === 0) bad.push('C: not auto-skipped after resuming');
  } else {
    await wait(4000);
    log.push(`shield ready, waited 4 s: phase ${S.phase}/${S.turn} (should still be my aim) say="${$('say').textContent}"`);
    if (!(S.phase === 'aim' && S.turn === 0)) bad.push('B: turn moved on by itself although the shield could have thawed the units');
    $('btnShield').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true })); window.__pump(2);
    const thawed = T.units.filter((u) => u.alive && u.frozen <= 0).length;
    log.push(`after shield: thawed ${thawed}/${T.alive}, shield on ${T.shield.on}`);
    if (thawed !== T.alive) bad.push('B: shield did not thaw everyone');
    let fired = 0; const on = S.on; S.on = (t, a, b, c, d, e, f) => { if (t === 'fire' && c === 0) fired++; return on(t, a, b, c, d, e, f); };
    $('btnFire').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true })); window.__pump(90);
    log.push(`fired ${fired} shots after thawing`); if (!fired) bad.push('B: no shots after thawing with the shield');
  }
  bad.push(...h.sane());
  const out = { mode, end: h.ui(), bad, log, errs: window.__errs.splice(0) };
  q.goHome(); window.__pump(5); window.__hold = false; return out;
}
"""
async def main():
    nbad = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, has_touch=True, is_mobile=True)
        await ctx.add_init_script(CLOCK); pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(900); await pg.evaluate(HELPERS)
        for mode in 'ABC':
            r = await pg.evaluate(JS, [mode]); bad = r.get('bad', []) + r.get('errs', []) + msgs; nbad += len(bad)
            print(('ok  ' if not bad else 'BAD ') + 'all-frozen ' + mode + ' ' + json.dumps(r.get('end'), ensure_ascii=False))
            for l in r.get('log', []): print('      . ' + l)
            for l in bad[:10]: print('      ✗ ' + str(l)[:500])
            del msgs[:]
        await b.close()
    print('frozen: ' + ('all fine' if not nbad else f'{nbad} problems'))
asyncio.run(main())
