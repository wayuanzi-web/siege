"""有觸控螢幕的筆電（主要指標是滑鼠：pointer fine，但 navigator.maxTouchPoints > 0），視窗比較高：不該轉 90 度。
Playwright 的 has_touch 會把 (pointer: coarse) 也變成 true，所以這裡用「沒有觸控的 context + 把 maxTouchPoints 改成 10」來模擬。
python3 test/review2-ui/21b_touch_laptop.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *
async def main():
    async with async_playwright() as p:
        for (w, h) in ((700, 900), (900, 1000), (500, 800)):
            b, ctx, pg, msgs = await open_page(p, w, h, dsf=1, init="Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {get() { return 10; }}); window.ontouchstart = null;")
            print(f'{w}x{h}', await pg.evaluate("({coarse: matchMedia('(pointer: coarse)').matches, maxTouchPoints: navigator.maxTouchPoints, rot: window.__qp.G.rot, stage: [window.__qp.G.sw, window.__qp.G.sh, window.__qp.G.ox, window.__qp.G.oy], turnOverlay: !document.getElementById('turn').hidden, keyHelp: !document.getElementById('keyHelp').hidden})"), msgs)
            await b.close()
asyncio.run(main())
