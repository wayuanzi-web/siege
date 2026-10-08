"""分頁和關卡卡片的觸控大小（CSS 像素）。python3 test/review8/tabsize.py"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from r8 import Game, SAVE_ALL
async def main():
    for W, H in ((844, 390), (667, 375), (740, 360), (932, 430), (1280, 720)):
        async with Game(W, H, scale=1, touch=True, save=SAVE_ALL) as g:
            await g.sec(0.5)
            r = await g.js("(() => { const b = (s) => { const e = document.querySelector(s).getBoundingClientRect(); return [Math.round(e.width), Math.round(e.height)]; }; return { tab: b('#chaps .chap'), card: b('#lvls .lv'), pause: b('#btnPause'), go: b('#btnGo') }; })()")
            print(W, H, r)
asyncio.run(main())
