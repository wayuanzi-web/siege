"""review4 共用工具：用「假的時鐘」驅動真的每一格迴圈，並且把 setTimeout 與 CSS 動畫也一起換成假的時間，
所以推到第幾格、畫面就是玩家在那一刻會看到的樣子（橫幅、提示、輪到誰的牌子的淡入淡出都對得上）。
操作一律走真的觸控事件（CDP Input.dispatchTouchEvent → 瀏覽器產生 pointer 事件），不直接叫遊戲的函式。

圖存 shots/review4/。不改 src/ 底下任何東西；網路請求一律擋掉（等於手機沒網路時的樣子）。
"""
import asyncio, io, json, math, pathlib, time
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'shots' / 'review4'
OUT.mkdir(parents=True, exist_ok=True)
PAGE = ROOT / 'src' / 'dist' / 'index.html'
try:
    FONT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 16, index=3)
    FONT_S = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 12, index=3)
except Exception:
    try:
        FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
        FONT_S = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12)
    except Exception:
        FONT = FONT_S = ImageFont.load_default()

CLOCK = r"""
(() => {
  let vt = 1000, rafCbs = [], tid = 1;
  const timers = new Map(), seen = new WeakSet();
  window.__realSetTimeout = window.setTimeout.bind(window);
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
  // CSS 動畫與轉場：播放速度設成 0，照假的時間往前推
  const syncAnims = (dt) => {
    if (!document.getAnimations) return;
    for (const a of document.getAnimations()) {
      try {
        const tgt = a.effect && a.effect.target;
        if (!seen.has(a)) { seen.add(a); a.playbackRate = 0; a.currentTime = 0; continue; }      // 不能用 pause()：Chromium 裡被 script 暫停過的 CSS 動畫，class 拿掉也不會被取消，會跟新的疊在一起
        if (tgt && a.animationName && getComputedStyle(tgt).animationPlayState === 'paused') continue;      // 遊戲自己暫停的（暫停選單開著時的提示）
        a.currentTime = (a.currentTime || 0) + dt;
      } catch (e) { /* 動畫剛好被拿掉 */ }
    }
  };
  window.__vt = () => vt;
  window.__frames = 0;
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
  window.__timers = () => [...timers.values()].map((t) => +(t.at - vt).toFixed(0));
})();
"""

# 每一格都可以問的狀態（給 Python 判斷現在該做什麼、該不該截圖）
STATE = r"""
(() => {
  const q = window.__qp, S = q.S, G = q.G, $ = (id) => document.getElementById(id);
  const vis = (el) => { if (!el || el.hidden) return 0; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; return +(+cs.opacity).toFixed(2); };
  const T = S.team[0], E = S.team[1];
  return {
    mode: G.mode, state: S.state, phase: S.phase, turn: S.turn, round: S.round, t: +S.time.toFixed(2), frames: window.__frames,
    me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100), a0: T ? T.alive : 0, a1: E ? E.alive : 0, shots: q.SH.n,
    chip: $('turnChip').hidden ? '' : $('turnChip').textContent, say: vis($('say')) > 0.05 ? $('say').textContent : '', sayOp: vis($('say')),
    hint: !$('hint').hidden, banner: vis($('banner')) > 0.05 ? $('banner').textContent : '', mile: vis($('mile')) > 0.05 ? $('mile').textContent : '',
    ult: T ? Math.round(T.ult.c / T.ult.need * 100) : 0, sh: T ? Math.round(T.shield.c / T.shield.need * 100) : 0, shOn: T ? T.shield.on : false, armed: T ? T.ult.armed : false,
    eArmed: E ? E.ult.armed : false, tut: G.tut, endT: +(G.endT || 0).toFixed(2), res: !$('result').hidden, rot: G.rot, low: q.FX.low, dpr: G.dprCap,
    pops: q.FX.pops.map((p) => p.txt), boss: S.boss ? S.boss.phase : 0, wind: S.wind, objs: S.objs.map((o) => o.t + (o.st ? ':' + o.st : '')), gates: S.gates.map((g) => g.owner + 'x' + g.mult),
    marks: S.marks.length, frozen: T ? T.units.filter((u) => u.alive && (u.frozen > 0 || u.stun > 0)).length : 0, drag: !!G.drag, aim: T ? [+T.aim[0].toFixed(1), +T.aim[1].toFixed(1)] : null
  };
})()
"""


def parse_opts(argv):
    args = [a for a in argv if not a.startswith('--')]
    opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in argv if a.startswith('--'))
    return args, opt


class Game:
    """一個瀏覽器分頁＋假的時鐘＋真的觸控。"""
    def __init__(self, W=844, H=390, scale=2, touch=True, save=None, clock=True, hang_fonts=False):
        self.W, self.H, self.scale, self.touch, self.save, self.clock = W, H, scale, touch, save, clock
        self.hang_fonts = hang_fonts
        self.msgs = []; self.net = []

    async def __aenter__(self):
        self.p = await async_playwright().start()
        self.b = await self.p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        self.ctx = await self.b.new_context(viewport={'width': self.W, 'height': self.H}, device_scale_factor=self.scale, has_touch=self.touch, is_mobile=self.touch)

        async def block(route):
            url = route.request.url
            if url.startswith('http'):
                self.net.append(url[:90])
                if self.hang_fonts: return          # 永遠不回應（網路卡住）
                await route.abort()
            else: await route.continue_()
        await self.ctx.route('**/*', block)
        if self.clock: await self.ctx.add_init_script(CLOCK)
        if self.save is not None:
            await self.ctx.add_init_script("try { localStorage.setItem('qianpao-pocheng-1', %s); } catch (e) {}" % json.dumps(json.dumps(self.save)))
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

    # ---- 時間 ----
    async def pump(self, n=1):
        if n <= 0: return
        left = int(n)
        while left > 0:                       # 一次最多推 240 格，中間讓瀏覽器喘口氣（版面、ResizeObserver）
            k = min(left, 240); await self.pg.evaluate("(n) => window.__pump(n)", k); left -= k

    async def sec(self, s): await self.pump(round(s * 60))

    async def state(self): return await self.pg.evaluate(STATE)

    async def js(self, code, arg=None): return await self.pg.evaluate(code, arg)

    async def until(self, cond, max_sec=60, step=2):
        """一格一格（step 格）推到 cond 成立。cond 是 JS 運算式（頁面裡有 q=__qp, S, G）。回傳有沒有等到。"""
        fn = "([c, n, step]) => { const q = window.__qp, S = q.S, G = q.G; const f = new Function('q', 'S', 'G', 'return (' + c + ')'); for (let i = 0; i < n; i += step) { if (f(q, S, G)) return true; window.__pump(step); } return !!f(q, S, G); }"
        left = int(max_sec * 60)
        while left > 0:
            k = min(left, 240)
            if await self.pg.evaluate(fn, [cond, k, step]): return True
            left -= k
        return False

    # ---- 亂數 ----
    async def seed_const(self, seed):
        """接下來 Math.random 一律回同一個數（由 seed 決定）：進關卡時戰局的種子就固定了，不管音效那邊先抽了幾次。進了關卡再呼叫 seed_lcg。"""
        await self.pg.evaluate("(k) => { Math.random = () => k; }", ((seed * 2654435761) % 999999937 + 1) / 1000000007)

    async def seed_lcg(self, seed):
        await self.pg.evaluate("(seed) => { let s = seed % 2147483646 + 1; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }", seed)

    # ---- 截圖 ----
    async def shot(self, name=None, clip=None):
        png = await self.pg.screenshot(clip=clip)
        im = Image.open(io.BytesIO(png)).convert('RGB')
        if name: im.save(OUT / f'{name}.png')
        return im

    # ---- 真的觸控 ----
    async def _touch(self, typ, pts): await self.cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})

    async def tap(self, x, y, hold_frames=3):
        await self._touch('touchStart', [(x, y)]); await self.pump(hold_frames)
        await self._touch('touchEnd', []); await self.pump(2)

    async def center(self, sel):
        r = await self.pg.evaluate("(s) => { const e = typeof s === 'string' ? document.querySelector(s) : null; if (!e) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height]; }", sel)
        return r

    async def tap_el(self, sel, hold_frames=3):
        r = await self.center(sel)
        if not r or r[2] <= 0: return False
        await self.tap(r[0], r[1], hold_frames); return True

    def to_client(self, sdx, sdy, rot):
        """舞台座標的位移 → 畫面（手指）座標的位移。rot 是 G.rot。"""
        if rot == 1: return (-sdy, sdx)
        if rot == -1: return (sdy, -sdx)
        return (sdx, sdy)

    async def drag_begin(self, x, y):
        self._dx, self._dy = x, y
        await self._touch('touchStart', [(x, y)]); await self.pump(1)

    async def drag_to(self, x, y, steps=8, frames_per=1):
        x0, y0 = self._dx, self._dy
        for i in range(1, steps + 1):
            px, py = x0 + (x - x0) * i / steps, y0 + (y - y0) * i / steps
            await self._touch('touchMove', [(px, py)]); await self.pump(frames_per)
        self._dx, self._dy = x, y

    async def drag_end(self):
        await self._touch('touchEnd', []); await self.pump(1)


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
    """直拿時舞台轉了 90 度：把截圖轉回橫的，比較好看（原圖另外存）。"""
    if rot == 1: return im.rotate(90, expand=True)
    if rot == -1: return im.rotate(-90, expand=True)
    return im
