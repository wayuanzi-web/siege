"""review2-ui 共用：開瀏覽器（擋掉所有對外連線）、收集 console/page error、CDP 觸控、截圖拼圖。
   預設開 src/dist/index.html；環境變數 QP_URL 可以換成別的頁面。"""
import asyncio, json, os, pathlib, re, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
URL = os.environ.get('QP_URL') or (ROOT / 'src/dist/index.html').as_uri()
FRAG = ROOT / 'src/dist/qianpao.html'
SHOTS = ROOT / 'shots' / 'review2-ui'
SHOTS.mkdir(parents=True, exist_ok=True)
HERE = pathlib.Path(__file__).resolve().parent

IGNORE = ('ERR_', 'fonts.g', 'Failed to load resource', 'net::')


async def open_page(p, W, H, touch=False, dsf=2, init=None, url=None, launch_args=None, mobile=None, **ctx_kw):
    """回傳 (browser, context, page, msgs)。msgs 收 console 的 error/warning 和 pageerror。"""
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'] + (launch_args or []))
    ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=dsf, has_touch=touch,
                              is_mobile=touch if mobile is None else mobile, **ctx_kw)
    # 不碰網路：字型等對外連線一律擋掉
    await ctx.route(re.compile(r'^https?://'), lambda r: r.abort())
    pg = await ctx.new_page()
    msgs = []
    pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and not any(k in m.text for k in IGNORE) else None)
    pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
    if init:
        await pg.add_init_script(init)
    await pg.goto(url or URL)
    await pg.wait_for_timeout(600)
    return b, ctx, pg, msgs


def shot_path(name):
    return str(SHOTS / (name + '.png'))


class Touch:
    """CDP 的真觸控（會走瀏覽器的 pointer capture、click 合成、touch-action）。"""
    def __init__(self, cdp): self.cdp = cdp; self.pts = {}
    async def _send(self, typ):
        await self.cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in self.pts.items()]})
    async def down(self, i, x, y): self.pts[i] = (x, y); await self._send('touchStart')
    async def move(self, i, x, y): self.pts[i] = (x, y); await self._send('touchMove')
    async def up(self, i):
        # touchEnd 帶的是「要放開的那幾點」；空的表示全部放開
        x, y = self.pts.pop(i)
        await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [{'x': x, 'y': y, 'id': i}] if self.pts else []})
    async def cancel(self): self.pts = {}; await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
    async def drag(self, i, x0, y0, dx, dy, n=10, step_ms=16, pg=None):
        for k in range(1, n + 1):
            await self.move(i, x0 + dx * k / n, y0 + dy * k / n)
            if pg and step_ms: await pg.wait_for_timeout(step_ms)


JS_STATE = """(() => { const q = window.__qp, S = q.S, G = q.G; return {mode: G.mode, demo: G.demo, state: S.state, phase: S.phase, turn: S.turn, round: S.round, idx: S.idx,
  volleys: S.team[0] ? S.team[0].volleys : -1, shots: q.SH.n, drag: !!G.drag, me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100)}; })()"""
AIM = "(() => { const a = window.__qp.S.team[0].aim; return [+(Math.atan2(a[1], a[0]) * 180 / Math.PI).toFixed(2), +Math.hypot(a[0], a[1]).toFixed(2)]; })()"
VOLLEYS = "window.__qp.S.team[0].volleys"

# 畫面上所有玩家看得到的字（給文字檢查用）
JS_TEXTS = """(() => { const vis = (el) => { if (!el || el.hidden) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; let p = el; while (p) { if (p.hidden) return false; p = p.parentElement; } return true; };
  const g = (id) => { const el = document.getElementById(id); return vis(el) ? el.textContent.trim() : null; };
  const say = document.getElementById('say'), so = +getComputedStyle(say).opacity;
  const ban = document.getElementById('banner'), bo = +getComputedStyle(ban).opacity, mi = document.getElementById('mile'), mo = +getComputedStyle(mi).opacity;
  return {chip: g('turnChip'), hint: g('hint'), say: vis(say) && so > 0.05 ? say.textContent : null, sayAlert: say.classList.contains('alert'), banner: vis(ban) && bo > 0.05 ? ban.textContent : null, mile: vis(mi) && mo > 0.05 ? mi.textContent : null,
    round: g('roundTxt'), wind: g('windTxt'), ult: g('ultNum'), sh: g('shNum')}; })()"""


async def wait_my_aim(pg, timeout=60000):
    await pg.wait_for_function("(() => { const q = window.__qp, S = q.S; return q.G.mode === 'play' && S.state === 'play' && S.phase === 'aim' && S.turn === 0; })()", timeout=timeout)


async def fresh(pg, lv=0, seen=True, wait=True, extra=''):
    """重開一關（真實時間），等到輪到我瞄準。"""
    await pg.evaluate("([lv, seen]) => { const q = window.__qp; q.G.freeze = false; q.SV.seen = seen; q.SV.open = 6; " + extra + " q.startLevel(lv); window.__ev = []; }", [lv, seen])
    if wait:
        await wait_my_aim(pg)
        await pg.wait_for_timeout(120)


# 凍結即時迴圈，用 advance() 把戰局推到「輪到我瞄準」
JS_TO_MY_AIM = """(maxSec) => { const q = window.__qp, S = q.S; q.G.freeze = true; let n = 0; const lim = (maxSec || 60) * 60;
  while (n++ < lim && !(S.state === 'play' && S.phase === 'aim' && S.turn === 0)) q.advance(1 / 60); return {n, phase: S.phase, turn: S.turn, round: S.round, state: S.state}; }"""


def sheet(paths, out, cols=3, scale=None, max_w=2400, labels=None, bg=(20, 20, 26)):
    """把幾張截圖拼成一張。回傳輸出路徑。"""
    from PIL import Image, ImageDraw
    ims = [Image.open(p).convert('RGB') for p in paths]
    if not ims: return None
    cols = min(cols, len(ims))
    cw = max(i.width for i in ims)
    sc = scale if scale else min(1.0, (max_w / cols) / cw)
    ims = [i.resize((max(1, int(i.width * sc)), max(1, int(i.height * sc))), Image.LANCZOS) for i in ims]
    cw = max(i.width for i in ims); ch = max(i.height for i in ims); pad = 4; lab = 16 if labels else 0
    rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * (cw + pad) + pad, rows * (ch + pad + lab) + pad), bg)
    d = ImageDraw.Draw(S)
    for k, im in enumerate(ims):
        x = pad + (k % cols) * (cw + pad); y = pad + (k // cols) * (ch + pad + lab)
        if labels: d.text((x + 2, y + 1), str(labels[k])[:120], fill=(255, 230, 120))
        S.paste(im, (x, y + lab))
    S.save(out)
    return out


def crop(path, box, out, zoom=1):
    from PIL import Image
    im = Image.open(path).convert('RGB').crop(tuple(int(v) for v in box))
    if zoom != 1: im = im.resize((int(im.width * zoom), int(im.height * zoom)), Image.LANCZOS)
    im.save(out); return out


def pj(v):
    return json.dumps(v, ensure_ascii=False)
