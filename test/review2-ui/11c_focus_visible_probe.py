"""證明：Chrome 在 keydown 的那一刻就把目前有焦點的按鈕變成 :focus-visible（即使它是被滑鼠右鍵點到才拿到焦點的），
所以 bindInput 裡的 kbFocus() 分不出「Tab 選到的」和「滑鼠點到的」。
python3 test/review2-ui/11c_focus_visible_probe.py"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *
async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 1280, 720, dsf=1)
        await fresh(pg)
        await pg.evaluate("(() => { window.__fv = []; window.addEventListener('keydown', (e) => { const ae = document.activeElement; window.__fv.push(e.code + ': active=' + (ae.id || ae.tagName) + ' focus-visible=' + ae.matches(':focus-visible')); }, true); const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; })()")
        r = await pg.evaluate("(() => { const b = document.getElementById('btnUlt').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await pg.mouse.click(r[0], r[1], button='right'); await pg.wait_for_timeout(100)
        print('after right-click, before any key: focus-visible =', await pg.evaluate("document.activeElement.matches(':focus-visible')"), 'active', await pg.evaluate("document.activeElement.id"))
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(150)
        print('at keydown (capture listener, runs before the game handler):', await pg.evaluate("window.__fv"))
        print('result: armed', await pg.evaluate("window.__qp.S.team[0].ult.armed"), 'volleys', await pg.evaluate(VOLLEYS))
        await b.close()
asyncio.run(main())
