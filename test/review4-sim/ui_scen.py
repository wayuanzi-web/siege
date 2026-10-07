"""第四輪審查：畫面那一半的情境測試（走真的每一格迴圈，用假時鐘快轉）。
   python3 test/review4-sim/ui_scen.py <情境> [--page=…]
     pause     每一個階段暫停再繼續（按鈕、Esc、P、分頁切到背景），包含分出勝負之後的垮城演出
     result    結算畫面一跳出來就連點、三顆按鈕快速連按、強化視窗開關
     resize    戰鬥中途改視窗大小、直橫互換、極端尺寸
     storage   localStorage 不能用、存了垃圾、舊版格式
     taps      發射／技能按鈕每一格都按、鍵盤亂按
     tut       全新玩家第一關（教學提示那條路）
"""
import asyncio, sys, pathlib, json, time
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
SCEN = args[0] if args else 'pause'
PAGE = opts.get('page', str(ROOT / 'src/dist/index.html'))

CLOCK = r"""
(() => {
  let vt = 1000, cbs = [];
  const realRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { cbs.push(cb); return cbs.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => vt;
  window.__errs = [];
  window.addEventListener('error', (e) => { window.__errs.push('ERR ' + (e.message || e) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  window.addEventListener('unhandledrejection', (e) => { window.__errs.push('REJ ' + (e.reason && e.reason.message || e.reason)); });
  window.__pump = (n) => { for (let i = 0; i < n; i++) { vt += 1000 / 60; const c = cbs; cbs = []; for (const f of c) { try { f(vt); } catch (e) { window.__errs.push('FRAME ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')); } } } return vt; };
  window.__adv = (ms) => { vt += ms; };
  const idle = () => { if (!window.__hold) window.__pump(1); realRaf(idle); }; realRaf(idle);
})();
"""

HELPERS = r"""
(() => {
  const q = window.__qp, $ = (id) => document.getElementById(id);
  window.__h = {
    tap(id) { const b = $(id); if (!b || b.hidden || b.disabled || b.offsetParent === null) return false; const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; const o = { pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true, clientX: x, clientY: y }; b.dispatchEvent(new PointerEvent('pointerdown', o)); b.dispatchEvent(new PointerEvent('pointerup', o)); return true; },
    key(code) { window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); },
    hide(h) { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); },
    start(lvl, bot) { q.SV.open = 6; q.SV.seen = true; q.UI.sel = lvl - 1; if (q.G.mode !== 'home') q.goHome(); $('btnGo').click(); if (bot) q.aiInit(q.S.team[0], q.BOTS[bot], { aiErr: 1 }); },
    ui() { const G = q.G, S = q.S; return { mode: G.mode, demo: G.demo, state: S.state, phase: S.phase, turn: S.turn, round: S.round, t: +S.time.toFixed(2), hud: !$('hud').hidden, home: !$('home').hidden, result: !$('result').hidden, opt: !$('opt').hidden, shop: !$('shop').hidden, idx: S.idx }; },
    sane() {
      // 畫面上顯示的東西跟目前的模式對不對得上
      const u = this.ui(), bad = [];
      if (u.mode === 'play') { if (!u.hud) bad.push('play but hud hidden'); if (u.home) bad.push('play but home visible'); if (u.result) bad.push('play but result visible'); if (u.opt) bad.push('play but options visible'); if (u.demo) bad.push('play but G.demo'); }
      if (u.mode === 'home') { if (u.hud) bad.push('home but hud visible'); if (!u.home) bad.push('home but home hidden'); if (u.result) bad.push('home but result visible'); if (!u.demo) bad.push('home but not demo'); }
      if (u.mode === 'pause') { if (!u.opt) bad.push('pause but options hidden'); if ($('pauseBtns').hidden) bad.push('pause but pause buttons hidden'); }
      if (u.mode === 'result') { if (!u.result) bad.push('result but result hidden'); }
      return bad;
    }
  };
})();
"""

PAUSE = r"""
async ([lvl, bot, maxSec]) => {
  const q = window.__qp, S = q.S, G = q.G, h = window.__h, $ = (id) => document.getElementById(id);
  window.__hold = true; const log = [], bad = [];
  h.start(lvl, bot);
  const seen = {}; let frames = 0, n = 0, finaleTried = false;
  const ways = ['btn', 'Escape', 'KeyP', 'hidden'];
  while (frames < maxSec * 60 && G.mode !== 'result') {
    const key = (S.state === 'play' ? S.phase + S.turn : 'finale') + (S.phase === 'hazard' ? (S.hz ? 'R' : 'f') : '');
    if (S.state === 'play' && G.mode === 'play' && (seen[key] || 0) < 4) {
      const way = ways[(seen[key] || 0) % 4]; seen[key] = (seen[key] || 0) + 1; n++;
      const t0 = S.time, f0 = S.frame;
      if (way === 'btn') h.tap('btnPause'); else if (way === 'hidden') h.hide(true); else h.key(way);
      if (G.mode !== 'pause') bad.push(`pause via ${way} in ${key} did not pause (mode ${G.mode})`);
      window.__pump(40);
      if (S.time !== t0 || S.frame !== f0) bad.push(`sim advanced while paused in ${key}: ${t0} -> ${S.time}`);
      const s = h.sane(); if (s.length) bad.push(`while paused in ${key}: ${s.join(', ')}`);
      if (way === 'hidden') h.hide(false);
      if (G.mode === 'pause') { const back = ['btnResume', 'Escape', 'KeyP'][n % 3]; if (back === 'btnResume') $('btnResume').click(); else h.key(back); }
      if (G.mode !== 'play') bad.push(`resume in ${key} failed (mode ${G.mode})`);
      const s2 = h.sane(); if (s2.length) bad.push(`after resume in ${key}: ${s2.join(', ')}`);
      window.__pump(2); frames += 2;
      if (S.time === t0 && S.state === 'play') bad.push(`sim did not continue after resume in ${key}`);
    }
    if (S.state !== 'play' && G.mode === 'play' && !finaleTried) {
      finaleTried = true; const t0 = S.time;
      // 垮城演出中：暫停鈕、Esc、P、分頁切走，都不該卡住
      h.tap('btnPause'); h.key('Escape'); h.key('KeyP'); h.hide(true); const m1 = G.mode, o1 = !$('opt').hidden; window.__pump(30); h.hide(false);
      log.push(`finale: after pause attempts mode=${m1} optVisible=${o1}; endT=${G.endT.toFixed(2)}`);
      if (m1 !== 'play') bad.push('finale: pause attempt changed mode to ' + m1);
    }
    window.__pump(1); frames++;
    if (frames % 300 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  const out = { lvl, bot, pauses: n, phases: Object.keys(seen).sort().join(' '), end: h.ui(), bad, log, errs: window.__errs.splice(0) };
  window.__hold = false; return out;
}
"""

RESULT = r"""
async ([lvl, bot, variant, maxSec]) => {
  const q = window.__qp, S = q.S, G = q.G, h = window.__h, $ = (id) => document.getElementById(id);
  window.__hold = true; const log = [], bad = [];
  h.start(lvl, bot);
  let frames = 0;
  while (frames < maxSec * 60 && G.mode !== 'result') {
    // 垮城演出一開始就狂點畫面（想跳過）
    if (S.state !== 'play' && G.mode === 'play' && variant !== 0) { const st = $('stage'), r = st.getBoundingClientRect(); const o = { pointerId: 3, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true, clientX: r.left + r.width * 0.5, clientY: r.top + r.height * 0.75 }; st.dispatchEvent(new PointerEvent('pointerdown', o)); st.dispatchEvent(new PointerEvent('pointerup', o)); }
    window.__pump(1); frames++;
    if (frames % 300 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  if (G.mode !== 'result') { window.__hold = false; return { lvl, bot, variant, bad: ['never reached result: ' + JSON.stringify(h.ui())], errs: window.__errs.splice(0) }; }
  const won = S.state === 'won', idx = S.idx;
  log.push(`result: ${S.state} L${idx + 1} round ${S.round}; next ${!$('btnNext').hidden}`);
  // 剛跳出來的那一下：連點三顆按鈕（應該被擋掉）
  for (const id of ['btnNext', 'btnAgain', 'btnHome', 'btnUp']) h.tap(id);
  if (G.mode !== 'result' || !$('shop').hidden) bad.push('a tap in the first 0.8 s of the result screen was accepted: ' + JSON.stringify(h.ui()));
  window.__pump(60);
  let s = h.sane(); if (s.length) bad.push('result screen: ' + s.join(', '));
  if (variant === 0) { for (const id of ['btnAgain', 'btnHome', 'btnNext']) h.tap(id); }
  else if (variant === 1) { for (const id of ['btnHome', 'btnAgain', 'btnNext']) h.tap(id); }
  else if (variant === 2) { h.tap('btnUp'); window.__pump(5); if ($('shop').hidden) bad.push('shop did not open from result'); for (const b of document.querySelectorAll('#upList button')) { const r = b.getBoundingClientRect(), o = { pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true, clientX: r.left + 5, clientY: r.top + 5 }; b.dispatchEvent(new PointerEvent('pointerdown', o)); b.dispatchEvent(new PointerEvent('pointerup', o)); } window.__pump(5); h.key('Escape'); window.__pump(2); if (!$('shop').hidden) bad.push('Escape did not close shop'); if (G.mode !== 'result') bad.push('mode after shop: ' + G.mode); h.tap(won && !$('btnNext').hidden ? 'btnNext' : 'btnAgain'); h.tap('btnHome'); }
  else { h.tap(won && !$('btnNext').hidden ? 'btnNext' : 'btnAgain'); window.__pump(1); h.key('Escape'); h.key('KeyP'); h.key('Space'); h.tap('btnPause'); window.__pump(3); if (G.mode === 'pause') { h.tap('btnRetry'); window.__pump(2); h.tap('btnPause'); window.__pump(2); if (G.mode === 'pause') h.tap('btnQuit'); } }
  window.__pump(90);
  s = h.sane(); if (s.length) bad.push('after buttons: ' + s.join(', '));
  log.push('after buttons: ' + JSON.stringify(h.ui()));
  // 新的一局（或主畫面的示範）真的在跑
  const t0 = S.time; window.__pump(120); if (!(S.time > t0)) bad.push('nothing running after leaving the result screen: ' + JSON.stringify(h.ui()));
  if (G.mode === 'play') { if ($('turnChip').hidden && S.phase !== 'intro') bad.push('turn chip hidden in play'); if (S.round < 1) bad.push('round did not start'); }
  const out = { lvl, bot, variant, end: h.ui(), bad, log, errs: window.__errs.splice(0) };
  if (G.mode !== 'home') q.goHome(); window.__pump(10);
  window.__hold = false; return out;
}
"""

RESIZE_STEP = r"""
async ([n]) => {
  const q = window.__qp, S = q.S, G = q.G, h = window.__h, V = q.V;
  await new Promise((r) => setTimeout(r, 30));          // 讓 ResizeObserver、resize 事件先跑
  window.__hold = true; window.__pump(n);
  const cv = document.getElementById('cv'), st = document.getElementById('stage');
  const out = { ui: h.ui(), W: cv.width, H: cv.height, s: +V.s.toFixed(3), rot: G.rot, sw: G.sw, sh: G.sh, errs: window.__errs.splice(0), sane: h.sane() };
  return out;
}
"""

TAPS = r"""
async ([lvl, maxSec, seed]) => {
  const q = window.__qp, S = q.S, G = q.G, h = window.__h, $ = (id) => document.getElementById(id);
  window.__hold = true; const bad = [];
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  h.start(lvl, null);
  const down = (id) => { const b = $(id), r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 20 + (rnd() * 3 | 0), pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: false, clientX: r.left + 4, clientY: r.top + 4 })); };
  const stage = $('stage'), r = stage.getBoundingClientRect();
  let frames = 0, fires = 0, ult = 0, sh = 0, keys = 0, vol0 = 0;
  S.on = ((orig) => (t, a, b, c, d, e, f) => { if (t === 'volley' && a === 0) vol0++; return orig(t, a, b, c, d, e, f); })(S.on);
  const KEYS = ['Space', 'Enter', 'KeyX', 'KeyC', 'KeyZ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
  while (frames < maxSec * 60 && G.mode !== 'result') {
    const k = rnd();
    // 每一格都按：發射鈕、兩個技能、鍵盤；偶爾拖一下
    down('btnFire'); fires++;
    if (k < 0.5) { down('btnUlt'); ult++; } if (k > 0.3) { down('btnShield'); sh++; }
    if (rnd() < 0.5) { window.dispatchEvent(new KeyboardEvent('keydown', { code: KEYS[(rnd() * KEYS.length) | 0], bubbles: true, cancelable: true })); keys++; }
    if (rnd() < 0.3) { window.dispatchEvent(new KeyboardEvent('keyup', { code: KEYS[(rnd() * KEYS.length) | 0], bubbles: true })); }
    if (rnd() < 0.05) { const x0 = r.left + r.width * (0.3 + rnd() * 0.4), y0 = r.top + r.height * (0.3 + rnd() * 0.4), o = (t, x, y) => stage.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true })); o('pointerdown', x0, y0); o('pointermove', x0 + (rnd() - 0.5) * 200, y0 + (rnd() - 0.5) * 150); if (rnd() < 0.7) o('pointerup', x0, y0); else if (rnd() < 0.5) o('pointercancel', x0, y0); }
    window.__pump(1); frames++;
    const T = S.team[0];
    if (!(T.aim[0] === T.aim[0]) || !(T.aim[1] === T.aim[1])) { bad.push('aim NaN'); break; }
    if (frames % 300 === 0) await new Promise((res) => setTimeout(res, 0));
  }
  const sane = h.sane(); if (sane.length) bad.push(sane.join(', '));
  const out = { lvl, frames, fires, ult, sh, keys, myVolleys: vol0, rounds: S.round, end: h.ui(), ultUses: S.team[0].ult.uses, shieldUses: S.team[0].shield.uses, bad, errs: window.__errs.splice(0) };
  if (G.mode !== 'home') q.goHome(); window.__pump(10);
  window.__hold = false; return out;
}
"""

TUT = r"""
async ([maxSec, seed]) => {
  const q = window.__qp, S = q.S, G = q.G, h = window.__h, $ = (id) => document.getElementById(id);
  window.__hold = true; const bad = [], said = [];
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // 全新玩家：不動存檔，直接按「出戰」
  if (q.SV.seen) bad.push('SV.seen already true for a fresh player');
  $('btnGo').click();
  if (G.tut !== 1) bad.push('tutorial not started: tut=' + G.tut);
  const stage = $('stage'), r = stage.getBoundingClientRect();
  const pe = (t, x, y) => stage.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true }));
  let frames = 0, last = '', hintSeen = false;
  while (frames < maxSec * 60 && G.mode !== 'result') {
    const txt = $('say').textContent; if (txt && txt !== last && $('say').classList.contains('show')) { last = txt; said.push(`r${S.round} ${S.phase}/${S.turn}: ${txt}`); }
    if (!$('hint').hidden) hintSeen = true;
    if (G.mode === 'play' && S.state === 'play' && S.phase === 'aim' && S.turn === 0 && S.phaseT > 1.2) {
      const x0 = r.left + r.width * 0.5, y0 = r.top + r.height * 0.6; pe('pointerdown', x0, y0);
      const dx = (rnd() - 0.5) * 60, dy = (rnd() - 0.5) * 60; for (let i = 1; i <= 4; i++) { pe('pointermove', x0 + dx * i / 4, y0 + dy * i / 4); window.__pump(1); frames++; }
      pe('pointerup', x0 + dx, y0 + dy);
    }
    window.__pump(1); frames++;
    if (frames % 300 === 0) await new Promise((res) => setTimeout(res, 0));
  }
  if (!hintSeen) bad.push('the drag hint never showed');
  const out = { end: h.ui(), tut: G.tut, seen: q.SV.seen, hintSeen, said, bad, errs: window.__errs.splice(0) };
  window.__hold = false; return out;
}
"""


async def new_page(p, w=844, h=390, touch=True, init=None, mobile=True):
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, has_touch=touch, is_mobile=mobile)
    if init: await ctx.add_init_script(init)
    await ctx.add_init_script(CLOCK)
    pg = await ctx.new_page(); msgs = []
    pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
    pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
    await pg.goto(PAGE if '://' in PAGE else pathlib.Path(PAGE).as_uri()); await pg.wait_for_timeout(900)
    await pg.evaluate(HELPERS)
    return b, pg, msgs


def show(tag, r, msgs):
    bad = (r.get('bad') or []) + (r.get('errs') or []) + msgs
    print(('ok  ' if not bad else 'BAD ') + tag + ' ' + json.dumps({k: v for k, v in r.items() if k not in ('bad', 'errs', 'log', 'said')}, ensure_ascii=False), flush=True)
    for l in (r.get('log') or []): print('      . ' + l, flush=True)
    for l in (r.get('said') or []): print('      " ' + l, flush=True)
    for l in bad[:12]: print('      ✗ ' + str(l)[:700], flush=True)
    del msgs[:]
    return len(bad)


async def main():
    nbad = 0; t0 = time.time()
    async with async_playwright() as p:
        if SCEN == 'pause':
            b, pg, msgs = await new_page(p)
            for lvl, bot in [(4, 'casual'), (6, 'expert'), (5, 'casual'), (1, 'newbie')]:
                r = await pg.evaluate(PAUSE, [lvl, bot, 300]); nbad += show(f'pause L{lvl}', r, msgs)
            await b.close()
        elif SCEN == 'result':
            b, pg, msgs = await new_page(p)
            for i, (lvl, bot) in enumerate([(1, 'expert'), (2, 'expert'), (6, 'newbie'), (3, 'expert'), (6, 'expert'), (5, 'newbie'), (1, 'casual'), (4, 'newbie')]):
                r = await pg.evaluate(RESULT, [lvl, bot, i % 4, 300]); nbad += show(f'result L{lvl} v{i % 4}', r, msgs)
            await b.close()
        elif SCEN == 'resize':
            sizes = [(844, 390), (390, 844), (1024, 768), (320, 568), (568, 320), (2000, 400), (400, 2000), (300, 60), (300, 30), (80, 20), (844, 390), (1920, 1080), (360, 640), (640, 360)]
            for touch in (True, False):
                b, pg, msgs = await new_page(p, touch=touch, mobile=touch)
                await pg.evaluate("([l, b]) => { window.__hold = true; window.__h.start(l, b); window.__pump(120); }", [4, 'casual'])
                for (w, h) in sizes:
                    await pg.set_viewport_size({'width': w, 'height': h})
                    r = await pg.evaluate(RESIZE_STEP, [150])
                    r['bad'] = list(r.pop('sane'))
                    if not (r['W'] > 0 and r['H'] > 0): r['bad'].append('canvas has no size')
                    if not (r['s'] > 0): r['bad'].append(f"view scale not positive: {r['s']}")
                    nbad += show(f'resize touch={touch} {w}x{h}', r, msgs)
                # 回到正常大小之後還能打完
                await pg.set_viewport_size({'width': 844, 'height': 390})
                r = await pg.evaluate("async () => { await new Promise((r) => setTimeout(r, 30)); const q = window.__qp; let n = 0; while (n < 60 * 300 && q.G.mode !== 'result') { window.__pump(4); n += 4; if (n % 240 === 0) await new Promise((r) => setTimeout(r, 0)); } return { ui: window.__h.ui(), errs: window.__errs.splice(0), bad: q.G.mode === 'result' ? [] : ['did not finish after resizing'] }; }")
                nbad += show(f'resize touch={touch} play on', r, msgs)
                await b.close()
        elif SCEN == 'storage':
            cases = {
                'throws': "Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });",
                'getItem throws': "Storage.prototype.getItem = function () { throw new Error('nope'); }; Storage.prototype.setItem = function () { throw new Error('quota'); };",
                'undefined': "Object.defineProperty(window, 'localStorage', { configurable: true, get() { return undefined; } });",
                'not json': "localStorage.setItem('qianpao-pocheng-1', '{oops');",
                'array': "localStorage.setItem('qianpao-pocheng-1', '[1,2,3]');",
                'number': "localStorage.setItem('qianpao-pocheng-1', '42');",
                'string': "localStorage.setItem('qianpao-pocheng-1', '\"hello\"');",
                'strings everywhere': "localStorage.setItem('qianpao-pocheng-1', JSON.stringify({ coins: 'abc', stars: 'xyz', open: 'x', up: 'no', diff: '2', sfx: 'no', flip: 'yes' }));",
                'huge': "localStorage.setItem('qianpao-pocheng-1', JSON.stringify({ coins: 1e300, stars: [9, -5, 2.7, null, {}, 'a', 7, 7, 7], open: 99, up: { dmg: 99, aim: -3, hp: 2.9, shield: null, ult: {} }, diff: 7 }));",
                'negative': "localStorage.setItem('qianpao-pocheng-1', JSON.stringify({ coins: -50, stars: [-1, -1], open: -4, up: { dmg: -1 }, diff: -1 }));",
                'old shape': "localStorage.setItem('qianpao-pocheng-1', JSON.stringify({ coins: 300, stars: [3, 2, 1], open: 2, up: { dmg: 2, rate: 4, hp: 1 }, sfx: false }));",
                'nested junk': "localStorage.setItem('qianpao-pocheng-1', JSON.stringify({ coins: { a: 1 }, stars: [[1], [2]], open: [3], up: [1, 2, 3], seen: 'x' }));",
                'stars object': "localStorage.setItem('qianpao-pocheng-1', JSON.stringify({ stars: { 0: 3, 5: 3, length: 6 }, open: 1 }));",
                'null': "localStorage.setItem('qianpao-pocheng-1', 'null');",
                'proto': "localStorage.setItem('qianpao-pocheng-1', '{\"__proto__\":{\"coins\":5},\"up\":{\"__proto__\":{\"dmg\":5}}}');",
            }
            for name, js in cases.items():
                b, pg, msgs = await new_page(p, init=js)
                r = await pg.evaluate(r"""async () => {
                  const q = window.__qp, h = window.__h, $ = (id) => document.getElementById(id), bad = [];
                  if (!q) return { bad: ['game did not boot'], errs: window.__errs };
                  const SV = JSON.parse(JSON.stringify(q.SV));
                  const num = (v, lo, hi) => typeof v === 'number' && v === Math.floor(v) && v >= lo && v <= hi;
                  if (!num(SV.coins, 0, 9999999)) bad.push('coins ' + SV.coins); if (!num(SV.open, 1, 6)) bad.push('open ' + SV.open); if (!num(SV.diff, 0, 2)) bad.push('diff ' + SV.diff);
                  if (!Array.isArray(SV.stars) || SV.stars.length !== 6 || SV.stars.some((v) => !num(v, 0, 3))) bad.push('stars ' + JSON.stringify(SV.stars));
                  for (const k of ['dmg', 'aim', 'hp', 'shield', 'ult']) if (!num(SV.up[k], 0, 5)) bad.push('up.' + k + ' ' + SV.up[k]);
                  window.__hold = true; window.__pump(60);
                  // 主畫面、強化、設定、出戰、打 20 秒、暫停回主畫面
                  $('btnShop').click(); window.__pump(3); if ($('shop').hidden) bad.push('shop did not open'); for (const b of document.querySelectorAll('#upList button')) b.click(); document.querySelector('#shop [data-close]').click();
                  $('btnOpt').click(); window.__pump(3); for (const id of ['tSfx', 'tMus', 'tVib']) $(id).click(); document.querySelector('#diffSeg button[data-d="2"]').click(); document.querySelector('#opt [data-close]').click();
                  q.UI.sel = 0; $('btnGo').click(); window.__pump(3);
                  if (q.G.mode !== 'play') bad.push('level did not start: ' + q.G.mode);
                  q.aiInit(q.S.team[0], q.BOTS.expert, { aiErr: 1 });
                  let n = 0; while (n < 60 * 240 && q.G.mode !== 'result') { window.__pump(4); n += 4; if (n % 240 === 0) await new Promise((r) => setTimeout(r, 0)); }
                  if (q.G.mode !== 'result') bad.push('game did not reach the result screen'); else { window.__pump(80); $('btnHome').click(); window.__pump(10); }
                  bad.push(...h.sane());
                  return { SV, after: JSON.parse(JSON.stringify(q.SV)), ui: h.ui(), bad, errs: window.__errs.splice(0) };
                }""")
                nbad += show(f'storage [{name}]', r, msgs)
                await b.close()
        elif SCEN == 'taps':
            b, pg, msgs = await new_page(p)
            for lvl, seed in [(1, 11), (3, 22), (5, 33), (6, 44)]:
                r = await pg.evaluate(TAPS, [lvl, 240, seed]); nbad += show(f'taps L{lvl}', r, msgs)
            await b.close()
        elif SCEN == 'tut':
            for seed in (5, 6):
                b, pg, msgs = await new_page(p)
                r = await pg.evaluate(TUT, [240, seed]); nbad += show(f'tutorial seed{seed}', r, msgs)
                await b.close()
    print(f'{SCEN}: {"all fine" if not nbad else str(nbad) + " problems"} ({time.time() - t0:.0f}s)')
    sys.exit(1 if nbad else 0)

asyncio.run(main())
