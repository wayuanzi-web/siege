"""有觸控螢幕的電腦（滑鼠為主、navigator.maxTouchPoints > 0），瀏覽器視窗比較高的時候：layout() 也會把舞台轉 90 度。
   python3 test/review-ui/21_touch_laptop.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for (w, h) in [(900, 1000), (700, 900), (960, 1040)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, has_touch=True, is_mobile=False)
            pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(600)
            r = await pg.evaluate("(() => ({coarse: matchMedia('(pointer: coarse)').matches, fine: matchMedia('(pointer: fine)').matches, hover: matchMedia('(hover: hover)').matches, maxTouchPoints: navigator.maxTouchPoints, rot: window.__qp.G.rot, turnHint: !document.getElementById('turn').hidden}))()")
            print(f'{w}x{h}', r)
            if (w, h) == (700, 900): await pg.screenshot(path=shot_path('touch_laptop_700x900_rotated'))
            await ctx.close()
        await b.close()
asyncio.run(main())
