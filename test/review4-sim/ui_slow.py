"""慢裝置那條路：每一格都很慢（40ms 以上）時，遊戲會先關掉一部分特效（FX.low），再一階一階降解析度（G.dprCap → layout）。
   用 3 倍像素密度的螢幕、假時鐘把每一格拉長，一路打到結算；另外在直拿（轉 90 度）時按「畫面上下顛倒」。
   python3 test/review4-sim/ui_slow.py"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
src = (pathlib.Path(__file__).parent / 'ui_scen.py').read_text(encoding='utf8')
CLOCK = src.split('CLOCK = r"""')[1].split('"""')[0]; HELPERS = src.split('HELPERS = r"""')[1].split('"""')[0]
JS = r"""
async ([lvl, slowMs]) => {
  const q = window.__qp, S = q.S, G = q.G, h = window.__h, FX = q.FX, cv = document.getElementById('cv');
  window.__hold = true; const log = [], bad = [];
  h.start(lvl, 'casual'); G.started = true;
  let n = 0, lastCap = G.dprCap, lastLow = FX.low, lastW = cv.width;
  log.push(`start: dprCap ${G.dprCap} low ${FX.low} canvas ${cv.width}x${cv.height} dpr ${window.devicePixelRatio}`);
  while (n < 60 * 400 && G.mode !== 'result') {
    window.__adv(slowMs); window.__pump(1); n++;
    if (G.dprCap !== lastCap || FX.low !== lastLow || cv.width !== lastW) { log.push(`frame ${n} t=${S.time.toFixed(1)} ${S.phase}: dprCap ${G.dprCap} low ${FX.low} canvas ${cv.width}x${cv.height} V.s ${q.V.s.toFixed(2)}`); lastCap = G.dprCap; lastLow = FX.low; lastW = cv.width; }
    if (n % 200 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  if (!FX.low) bad.push('FX.low never switched on'); if (G.dprCap !== 1 && window.devicePixelRatio > 1) bad.push('dprCap did not reach 1: ' + G.dprCap);
  bad.push(...h.sane());
  const out = { end: h.ui(), frames: n, low: FX.low, cap: G.dprCap, bad, log, errs: window.__errs.splice(0) };
  return out;
}
"""
FLIP = r"""
async () => {
  const q = window.__qp, S = q.S, G = q.G, h = window.__h, $ = (id) => document.getElementById(id);
  await new Promise((r) => setTimeout(r, 50)); window.__hold = true; const bad = [], log = [];
  if (G.mode !== 'home') q.goHome(); window.__pump(20);
  log.push(`portrait: rot ${G.rot} sw ${G.sw} sh ${G.sh} flip ${q.SV.flip}`);
  if (!G.rot) bad.push('stage not rotated in portrait on a touch device');
  $('btnOpt').click(); window.__pump(3); if ($('btnFlip').hidden) bad.push('flip button hidden while rotated'); else $('btnFlip').click(); window.__pump(3);
  log.push(`after flip: rot ${G.rot} flip ${q.SV.flip} transform ${$('stage').style.transform}`);
  document.querySelector('#opt [data-close]').click(); window.__pump(3);
  h.start(2, 'expert'); let n = 0;
  // 直拿的時候拖曳：往「舞台的右邊」拖，力道應該變大
  const st = $('stage'), T = S.team[0];
  while (!(S.phase === 'aim' && S.turn === 0) && n < 600) { window.__pump(1); n++; }
  q.S.team[0].ai = null;
  const a0 = [T.aim[0], T.aim[1]];
  const pe = (t, x, y) => st.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true }));
  // 視窗座標往下拖 60px：rot=1 時舞台的 +x 是視窗的 +y；rot=-1 時相反
  pe('pointerdown', 200, 300); pe('pointermove', 200, 330); pe('pointermove', 200, 360); window.__pump(2);
  const a1 = [T.aim[0], T.aim[1]];
  log.push(`drag down 60px in the window: aim (${a0[0].toFixed(1)},${a0[1].toFixed(1)}) -> (${a1[0].toFixed(1)},${a1[1].toFixed(1)}) with rot ${G.rot}`);
  const dvx = a1[0] - a0[0]; if (G.rot === 1 && !(dvx > 0)) bad.push('rot=1: dragging toward stage-right did not increase vx'); if (G.rot === -1 && !(dvx < 0)) bad.push('rot=-1: dragging toward stage-left did not decrease vx');
  pe('pointerup', 200, 360); window.__pump(5);
  if (S.phase === 'aim' && S.turn === 0) bad.push('release after a 60px drag did not fire');
  q.aiInit(S.team[0], q.BOTS.expert, { aiErr: 1 });
  while (n < 60 * 300 && G.mode !== 'result') { window.__pump(4); n += 4; if (n % 240 === 0) await new Promise((r) => setTimeout(r, 0)); }
  bad.push(...h.sane());
  return { end: h.ui(), bad, log, errs: window.__errs.splice(0) };
}
"""
async def main():
    nbad = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for dsf, (w, h), slow in [(3, (844, 390), 34), (2, (1280, 720), 60)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, has_touch=True, is_mobile=True)
            await ctx.add_init_script(CLOCK); pg = await ctx.new_page(); msgs = []
            pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
            pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
            await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(900); await pg.evaluate(HELPERS)
            r = await pg.evaluate(JS, [4, slow]); bad = r['bad'] + r['errs'] + msgs; nbad += len(bad)
            print(('ok  ' if not bad else 'BAD ') + f'slow dsf={dsf} {w}x{h} +{slow}ms/frame ' + json.dumps({k: v for k, v in r.items() if k not in ('bad', 'errs', 'log')}, ensure_ascii=False))
            for l in r['log']: print('      . ' + l)
            for l in bad[:10]: print('      ✗ ' + str(l)[:500])
            await ctx.close()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        await ctx.add_init_script(CLOCK); pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(900); await pg.evaluate(HELPERS)
        for k in range(2):
            r = await pg.evaluate(FLIP); bad = r['bad'] + r['errs'] + msgs; nbad += len(bad)
            print(('ok  ' if not bad else 'BAD ') + f'portrait flip #{k} ' + json.dumps(r['end'], ensure_ascii=False))
            for l in r['log']: print('      . ' + l)
            for l in bad[:10]: print('      ✗ ' + str(l)[:500])
            del msgs[:]
        await b.close()
    print('slow/flip: ' + ('all fine' if not nbad else f'{nbad} problems'))
asyncio.run(main())
