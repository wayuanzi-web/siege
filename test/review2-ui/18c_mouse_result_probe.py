"""18_touch_modals.py A 的滑鼠對照：滑鼠在結算跳出來之前按下去、之後才放開，不會點到剛出現的按鈕（瀏覽器的 click 要按下和放開在同一個元素上）；
之後正常再點一下才會。
python3 test/review2-ui/18c_mouse_result_probe.py"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *
async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, dsf=1)
        M = pg.mouse
        for (name, x, y) in (('btnNext', 236, 262), ('btnHome', 422, 315)):
            await fresh(pg, 0)
            await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
            await pg.wait_for_function("window.__qp.G.endT > 3.9", timeout=15000)
            await M.move(x, y); await M.down()
            await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=5000); await pg.wait_for_timeout(150)
            await M.up(); await pg.wait_for_timeout(250)
            m1 = await pg.evaluate("window.__qp.G.mode")
            await M.click(x, y); await pg.wait_for_timeout(250)
            print(f'mouse held across the modal appearing, released over {name}: mode {m1} (no activation expected) | a fresh click right after -> {await pg.evaluate("window.__qp.G.mode")}')
            await pg.evaluate("window.__qp.SV.open = 6")
        await b.close()
asyncio.run(main())
