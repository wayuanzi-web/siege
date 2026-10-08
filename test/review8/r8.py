"""review8 共用工具（第二篇審查）：假的時鐘驅動真的迴圈（setTimeout、CSS 動畫一起推），CDP 真觸控，擋掉所有對外連線。
圖存 shots/review8/。不改 src/ 底下任何東西。"""
import asyncio, io, json, pathlib
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'shots' / 'review8'
OUT.mkdir(parents=True, exist_ok=True)
PAGE = ROOT / 'src' / 'dist' / 'index.html'
try:
    FONT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 16, index=3)
    FONT_S = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 12, index=3)
except Exception:
    FONT = FONT_S = ImageFont.load_default()

CLOCK = r"""
(() => {
  let vt = 1000, rafCbs = [], tid = 1;
  const timers = new Map(), seen = new WeakSet();
  window.requestAnimationFrame = (cb) => { rafCbs.push(cb); return rafCbs.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => vt;
  window.setTimeout = (fn, ms, ...args) => { const id = tid++; timers.set(id, { at: vt + Math.max(0, +ms || 0), fn, args, seq: id }); return id; };
  window.clearTimeout = (id) => { timers.delete(id); };
  const runTimers = () => {
    for (let guard = 0; guard < 500; guard++) {
      let best = null, bid = 0;
      for (const [id, t] of timers) if (t.at <= vt && (!best || t.at < best.at || (t.at === best.at && t.seq < best.seq))) { best = t; bid = id; }
      if (!best) break;
      timers.delete(bid);
      try { if (typeof best.fn === 'function') best.fn(...best.args); } catch (e) { console.error('TIMER ' + (e && e.stack || e)); }
    }
  };
  const syncAnims = (dt) => {
    if (!document.getAnimations) return;
    for (const a of document.getAnimations()) {
      try {
        const tgt = a.effect && a.effect.target;
        if (!seen.has(a)) { seen.add(a); a.playbackRate = 0; a.currentTime = 0; continue; }
        if (tgt && a.animationName && getComputedStyle(tgt).animationPlayState === 'paused') continue;
        a.currentTime = (a.currentTime || 0) + dt;
      } catch (e) { }
    }
  };
  window.__frames = 0;
  window.__ft = [];
  window.__pump = (n) => {
    for (let i = 0; i < n; i++) {
      vt += 1000 / 60; window.__frames++;
      runTimers();
      const c = rafCbs; rafCbs = [];
      for (const f of c) { try { f(vt); } catch (e) { console.error('RAF ' + (e && e.stack || e)); } }
      syncAnims(1000 / 60);
      if (window.__hook) { try { window.__hook(); } catch (e) { console.error('HOOK ' + (e && e.stack || e)); } }
    }
    return vt;
  };
})();
"""

STATE = r"""
(() => {
  const q = window.__qp, S = q.S, G = q.G, $ = (id) => document.getElementById(id);
  const vis = (el) => { if (!el || el.hidden) return 0; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; return +(+cs.opacity).toFixed(2); };
  const T = S.team[0], E = S.team[1];
  return {
    mode: G.mode, state: S.state, phase: S.phase, turn: S.turn, round: S.round, t: +S.time.toFixed(2), idx: S.idx,
    me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100), a0: T ? T.alive : 0, a1: E ? E.alive : 0, shots: q.SH.n,
    chip: $('turnChip').hidden ? '' : $('turnChip').textContent, say: vis($('say')) > 0.05 ? $('say').textContent : '',
    banner: vis($('banner')) > 0.05 ? $('banner').textContent : '', res: !$('result').hidden,
    pops: q.FX.pops.map((p) => p.txt), ropes: S.ropes.filter((r) => r.cut).length + '/' + S.ropes.length
  };
})()
"""


class Game:
    def __init__(self, W=844, H=390, scale=2, touch=True, save=None, clock=True, mobile=None):
        self.W, self.H, self.scale, self.touch, self.save, self.clock = W, H, scale, touch, save, clock
        self.mobile = touch if mobile is None else mobile
        self.msgs = []

    async def __aenter__(self):
        self.p = await async_playwright().start()
        self.b = await self.p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        self.ctx = await self.b.new_context(viewport={'width': self.W, 'height': self.H}, device_scale_factor=self.scale, has_touch=self.touch, is_mobile=self.mobile)

        async def block(route):
            if route.request.url.startswith('http'): await route.abort()
            else: await route.continue_()
        await self.ctx.route('**/*', block)
        if self.clock: await self.ctx.add_init_script(CLOCK)
        if self.save is not None:
            await self.ctx.add_init_script("try { if (!sessionStorage.getItem('r8')) { sessionStorage.setItem('r8', '1'); localStorage.setItem('qianpao-pocheng-1', %s); } } catch (e) {}" % json.dumps(json.dumps(self.save)))
        self.pg = await self.ctx.new_page()
        self.pg.on('console', lambda m: self.msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        self.pg.on('pageerror', lambda e: self.msgs.append('PAGEERR ' + str(e)))
        await self.pg.goto(PAGE.as_uri())
        self.cdp = await self.ctx.new_cdp_session(self.pg)
        await self.pg.wait_for_timeout(300)
        if self.clock: await self.pump(30)
        return self

    async def __aexit__(self, *a):
        await self.b.close(); await self.p.stop()

    async def pump(self, n=1):
        left = int(n)
        while left > 0:
            k = min(left, 240); await self.pg.evaluate("(n) => window.__pump(n)", k); left -= k

    async def sec(self, s): await self.pump(round(s * 60))
    async def state(self): return await self.pg.evaluate(STATE)
    async def js(self, code, arg=None): return await self.pg.evaluate(code, arg)

    async def until(self, cond, max_sec=60, step=2):
        fn = "([c, n, step]) => { const q = window.__qp, S = q.S, G = q.G; const f = new Function('q', 'S', 'G', 'return (' + c + ')'); for (let i = 0; i < n; i += step) { if (f(q, S, G)) return true; window.__pump(step); } return !!f(q, S, G); }"
        left = int(max_sec * 60)
        while left > 0:
            k = min(left, 240)
            if await self.pg.evaluate(fn, [cond, k, step]): return True
            left -= k
        return False

    async def shot(self, name=None, clip=None):
        png = await self.pg.screenshot(clip=clip)
        im = Image.open(io.BytesIO(png)).convert('RGB')
        if name: im.save(OUT / f'{name}.png')
        return im

    async def _touch(self, typ, pts): await self.cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})

    async def tap(self, x, y, hold_frames=3):
        await self._touch('touchStart', [(x, y)]); await self.pump(hold_frames)
        await self._touch('touchEnd', []); await self.pump(2)

    async def center(self, sel):
        return await self.pg.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height]; }", sel)

    async def tap_el(self, sel, hold_frames=3):
        r = await self.center(sel)
        if not r or r[2] <= 0: return False
        await self.tap(r[0], r[1], hold_frames); return True

    async def click_el(self, sel):
        r = await self.center(sel)
        if not r or r[2] <= 0: return False
        await self.pg.mouse.click(r[0], r[1]); await self.pump(2); return True


def label(im, txt, sub=None, col=(255, 255, 255)):
    d = ImageDraw.Draw(im)
    d.text((6, 4), txt, fill=col, font=FONT, stroke_width=3, stroke_fill=(0, 0, 0))
    if sub: d.text((6, 24), sub, fill=(255, 230, 120), font=FONT_S, stroke_width=3, stroke_fill=(0, 0, 0))
    return im


def sheet(tiles, cols, gap=4, max_w=None):
    tw, th = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
    out = Image.new('RGB', (tw * cols + gap * (cols - 1), th * rows + gap * (rows - 1)), (20, 20, 28))
    for i, im in enumerate(tiles):
        if im.size != (tw, th): im = im.resize((tw, th))
        out.paste(im, ((i % cols) * (tw + gap), (i // cols) * (th + gap)))
    if max_w and out.size[0] > max_w: out = out.resize((max_w, round(out.size[1] * max_w / out.size[0])), Image.LANCZOS)
    return out


def upright(im, rot):
    if rot == 1: return im.rotate(90, expand=True)
    if rot == -1: return im.rotate(-90, expand=True)
    return im


SAVE_NEW = None
SAVE_ALL = {'coins': 500, 'stars': [3, 3, 2, 2, 1, 2, 1, 3, 2, 0, 0, 0], 'open': 12, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
SAVE_OLD6 = {'coins': 900, 'stars': [3, 3, 2, 2, 1, 2], 'open': 6, 'up': {'dmg': 2, 'aim': 1, 'hp': 1, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True}
