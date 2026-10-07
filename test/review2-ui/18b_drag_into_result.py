"""瞄準的手指一直沒放，戰局就結束、結算跳出來了（真觸控）：
  a. 我方砲擊中就按住預先瞄準（這時還在打，會抓住指標）→ 敵軍全倒 → 結算出現 → 手指在「下一關」的位置放開
  b. 同上，但手指是垮城演出中才放上去的（對照：18_touch_modals.py 的 A）
python3 test/review2-ui/18b_drag_into_result.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, touch=True)
        cdp = await ctx.new_cdp_session(pg); T = Touch(cdp)
        await pg.evaluate("(() => { window.__ev = []; for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'lostpointercapture']) document.addEventListener(t, (e) => window.__ev.push(t + '@' + (e.target.id || e.target.tagName)), true); })()")
        NX = (236, 262)
        for case in ('a', 'b'):
            await fresh(pg, 0); await pg.evaluate("window.__ev = []")
            r = await pg.evaluate("(() => { const b = document.getElementById('btnFire').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
            await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(300)                 # 發射
            if case == 'a':
                await T.down(1, 400, 200); await T.drag(1, 400, 200, -80, 30, n=6, pg=pg)       # 砲擊中預先瞄準（手指不放）
            await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
            await pg.wait_for_timeout(1500)
            if case == 'b': await T.down(1, 320, 230)
            await T.move(1, NX[0], NX[1])                                                           # 手指滑到之後「下一關」會出現的地方
            d = await pg.evaluate("!!window.__qp.G.drag")
            await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(500)
            await T.up(1); await pg.wait_for_timeout(300)
            s = await pg.evaluate("(() => { const q = window.__qp; return {mode: q.G.mode, idx: q.S.idx, drag: !!q.G.drag}; })()")
            print(f'case {case}: drag object alive during the collapse: {d}; finger lifted over 下一關 0.5s after the result appeared -> {pj(s)} | events: {await pg.evaluate("window.__ev.join(chr(32))".replace("chr(32)", repr(" ")))}')
            if s['mode'] == 'result':
                await pg.touchscreen.tap(NX[0], NX[1]); await pg.wait_for_timeout(300)
                print('   a normal tap on 下一關 afterwards ->', await pg.evaluate("window.__qp.G.mode + ' idx ' + window.__qp.S.idx"))
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
