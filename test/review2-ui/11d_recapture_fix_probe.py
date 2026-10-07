"""11b A 的修法對照（只改測試頁面，沒動 src）：lostpointercapture 來的時候如果左鍵其實還按著（e.buttons & 1），
就重新 setPointerCapture、不要把 G.drag 清掉。這樣按了右鍵／中鍵之後，左鍵還是能繼續拖、放開照樣發射一次。
python3 test/review2-ui/11d_recapture_fix_probe.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *

PATCH = """(() => { const stage = document.getElementById('stage');
  document.addEventListener('lostpointercapture', (e) => { if (e.pointerType === 'mouse' && (e.buttons & 1) && window.__qp.G.drag) { e.stopImmediatePropagation(); try { stage.setPointerCapture(e.pointerId); } catch (err) {} } }, true); })()"""

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 1280, 720, dsf=1)
        M = pg.mouse
        for patched in (False, True):
            if patched: await pg.evaluate(PATCH)
            for btn in ('right', 'middle'):
                await fresh(pg)
                await M.move(640, 360); await M.down(); await M.move(700, 320, steps=6); await pg.wait_for_timeout(100)
                await M.down(button=btn); await pg.wait_for_timeout(80); await M.up(button=btn); await pg.wait_for_timeout(300)
                a1 = await pg.evaluate(AIM)
                await M.move(720, 310, steps=2); await pg.wait_for_timeout(300)
                await M.move(800, 240, steps=8); await pg.wait_for_timeout(100)
                a2 = await pg.evaluate(AIM); d = await pg.evaluate("!!window.__qp.G.drag")
                await M.up(); await pg.wait_for_timeout(300)
                print(f'{"PATCHED " if patched else "original"} {btn}-click mid-drag: drag alive after it = {d}; aim {a1} -> {a2}; volleys on left release = {await pg.evaluate(VOLLEYS)}')
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
