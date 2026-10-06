"""一根手指在畫面上瞄準（按住或拖曳）時，另一根手指去按 HUD 按鈕（護罩、連珠、發射、暫停）有沒有反應。
   按鈕都掛在 click 事件上；瀏覽器只會替「單指輕點」合成 click，第二根手指的輕點不會有 click。
   用 CDP 的真觸控事件。python3 test/review-ui/04_multitouch_buttons.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

LOGGER = """(() => { window.__ev = []; for (const t of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend'])
  document.addEventListener(t, (e) => window.__ev.push(t + (e.pointerId === undefined ? '' : '#' + e.pointerId) + '@' + (e.target.id || e.target.tagName)), true); })()"""
ST = """(() => { const q = window.__qp, T = q.S.team[0]; return {shieldOn: T.shield.on, ultArmed: T.ult.armed, volleys: T.volleys, mode: q.G.mode, drag: !!q.G.drag}; })()"""


async def tp(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for (i, x, y) in pts]})


async def run(p, W, H, name):
    b, ctx, pg, msgs = await open_page(p, W, H, touch=True)
    cdp = await ctx.new_cdp_session(pg)
    await pg.evaluate(LOGGER)
    rot = await pg.evaluate("window.__qp.G.rot")
    print(f'===== {name} {W}x{H} rot={rot}')
    cx, cy = W * 0.45, H * 0.5

    async def fresh():
        await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.startLevel(0); })()")
        await wait_my_aim(pg); await pg.wait_for_timeout(100)
        await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.shield.c = 100; T.ult.c = 100; window.__ev = []; })()")
        await pg.wait_for_timeout(120)

    async def center(bid):
        return await pg.evaluate("(id) => { const b = document.getElementById(id).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", bid)

    for bid, key in (('btnShield', 'shieldOn'), ('btnUlt', 'ultArmed'), ('btnFire', 'volleys'), ('btnPause', 'mode')):
        # A. 單指輕點：有反應
        await fresh(); r = await center(bid)
        await tp(cdp, 'touchStart', [(1, r[0], r[1])]); await pg.wait_for_timeout(50); await tp(cdp, 'touchEnd', []); await pg.wait_for_timeout(200)
        a = (await pg.evaluate(ST))[key]
        if bid == 'btnPause': await pg.evaluate("document.getElementById('btnResume').click()")
        # B. 第一根手指按在畫面上（拖著瞄準），第二根手指輕點按鈕
        await fresh(); r = await center(bid)
        dx, dy = (30, -30) if rot == 0 else (30, 30)
        await tp(cdp, 'touchStart', [(1, cx, cy)])
        for k in range(1, 6): await tp(cdp, 'touchMove', [(1, cx + dx * k / 5, cy + dy * k / 5)])
        await pg.wait_for_timeout(80)
        await tp(cdp, 'touchStart', [(1, cx + dx, cy + dy), (2, r[0], r[1])]); await pg.wait_for_timeout(60)
        await tp(cdp, 'touchEnd', [(2, r[0], r[1])]); await pg.wait_for_timeout(250)
        st = await pg.evaluate(ST); ev = await pg.evaluate("window.__ev.join(' ')")
        if bid == 'btnShield' and name == 'landscape': await pg.screenshot(path=shot_path('multitouch_shield_ignored'))
        await tp(cdp, 'touchEnd', []); await pg.wait_for_timeout(150)
        print(f'  {bid}: single-finger tap -> {key}={a} | tap with 2nd finger while 1st is aiming -> {key}={st[key]} (drag alive {st["drag"]})')
        print('      events:', ev)
        if (await pg.evaluate("window.__qp.G.mode")) == 'pause': await pg.evaluate("document.getElementById('btnResume').click()")
    print('  errors:', msgs)
    await b.close()


async def main():
    async with async_playwright() as p:
        await run(p, 844, 390, 'landscape')
        await run(p, 390, 844, 'portrait')

asyncio.run(main())
