"""review-ui 共用：開瀏覽器、收集 console/page error、常用的小工具。"""
import asyncio, pathlib, json, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
URL = (ROOT / 'src/dist/index.html').as_uri()
SHOTS = ROOT / 'shots' / 'review-ui'
SHOTS.mkdir(parents=True, exist_ok=True)

IGNORE = ('ERR_', 'fonts.g', 'Failed to load resource')


async def open_page(p, W, H, touch=False, dsf=2, init=None, url=None, launch_args=None, **ctx_kw):
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'] + (launch_args or []))
    ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=dsf, has_touch=touch, is_mobile=touch, **ctx_kw)
    pg = await ctx.new_page()
    msgs = []
    pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and not any(k in m.text for k in IGNORE) else None)
    pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
    if init:
        await pg.add_init_script(init)
    await pg.goto(url or URL)
    await pg.wait_for_timeout(700)
    return b, ctx, pg, msgs


def shot_path(name):
    return str(SHOTS / (name + '.png'))


# 在頁面裡常用的片段
JS_STATE = """(() => { const q = window.__qp, S = q.S, G = q.G; return {mode: G.mode, demo: G.demo, state: S.state, phase: S.phase, turn: S.turn, round: S.round, idx: S.idx,
  fired: S.stat.fired, shots: q.SH.n, drag: !!G.drag, me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100)}; })()"""

# 觸控 pointer 事件（直接丟給 #stage；跟 test/touch.py 同一種作法）
JS_PEV = """([t, id, x, y, pt]) => { const el = document.elementFromPoint(x, y) || document.getElementById('stage');
  el.dispatchEvent(new PointerEvent(t, {pointerId: id, pointerType: pt || 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1, button: 0, buttons: t === 'pointerup' ? 0 : 1})); }"""


async def wait_my_aim(pg, timeout=40000):
    """等到輪到我瞄準（真實時間）。"""
    await pg.wait_for_function("(() => { const q = window.__qp, S = q.S; return q.G.mode === 'play' && S.state === 'play' && S.phase === 'aim' && S.turn === 0; })()", timeout=timeout)


async def wait_phase(pg, phase, turn=None, timeout=40000):
    cond = "S.phase === %s" % json.dumps(phase) + ("" if turn is None else " && S.turn === %d" % turn)
    await pg.wait_for_function("(() => { const S = window.__qp.S; return %s; })()" % cond, timeout=timeout)
