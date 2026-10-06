"""暫停 →「重來」之後的 1.1 秒開場：回合牌還留著上一局的「輪到你：拖曳瞄準，放開發射」，
   玩家照著拖、放開，卻不會發射（開場階段按下的拖曳 live=false）。真觸控（CDP）。
   python3 test/review-ui/19_retry_stale_chip.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

async def tp(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for (i, x, y) in pts]})

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, touch=True)
        cdp = await ctx.new_cdp_session(pg)
        await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.startLevel(0); })()"); await wait_my_aim(pg); await pg.wait_for_timeout(300)
        tap = lambda sel: pg.evaluate("(s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel)
        x, y = await tap('#btnPause'); await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(250)
        x, y = await tap('#btnRetry'); await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(150)
        st = await pg.evaluate("(() => { const q = window.__qp, c = document.getElementById('turnChip'); return {phase: q.S.phase, phaseT: +q.S.phaseT.toFixed(2), chipVisible: !c.hidden, chip: c.textContent, cls: c.className, canFire: q.S.phase === 'aim' && q.S.turn === 0}; })()")
        print('150ms after tapping 重來:', json.dumps(st, ensure_ascii=False))
        await pg.screenshot(path=shot_path('retry_stale_chip_your_turn'))
        # 照回合牌說的做：拖曳、放開
        cx, cy = 400, 200
        await tp(cdp, 'touchStart', [(1, cx, cy)])
        for k in range(1, 13): await tp(cdp, 'touchMove', [(1, cx + 4 * k, cy - 3 * k)]); await pg.wait_for_timeout(90)
        st2 = await pg.evaluate("(() => { const q = window.__qp; return {phase: q.S.phase + q.S.turn, chip: document.getElementById('turnChip').textContent, dragLive: q.G.drag && q.G.drag.live}; })()")
        await tp(cdp, 'touchEnd', []); await pg.wait_for_timeout(250)
        print('at release:', json.dumps(st2, ensure_ascii=False), '-> volleys fired:', await pg.evaluate("window.__qp.S.team[0].volleys"), '| any feedback toast:', await pg.evaluate("document.getElementById('say').className + ' / ' + document.getElementById('say').textContent.slice(0, 14)"))
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
