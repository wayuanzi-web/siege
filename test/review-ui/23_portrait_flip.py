"""直拿（舞台轉 90 度）時的設定「畫面上下顛倒」：用真的觸控點按鈕，看轉向後按鈕還點不點得到、存檔有沒有記住。
   python3 test/review-ui/23_portrait_flip.py"""
import asyncio, json
from playwright.async_api import async_playwright
from PIL import Image
from common import *

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 390, 844, touch=True)
        await pg.wait_for_timeout(3500)
        async def tap(sel):
            r = await pg.evaluate("(s) => { const e = document.querySelector(s), b = e.getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + b.height / 2, t = document.elementFromPoint(x, y); return [x, y, t === e || e.contains(t)]; }", sel)
            await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(250); return r[2]
        print('tap 設定 hit:', await tap('#btnOpt'), '| flip button visible:', await pg.evaluate("!document.getElementById('btnFlip').hidden"))
        print('tap 畫面上下顛倒 hit:', await tap('#btnFlip'), '-> rot', await pg.evaluate("window.__qp.G.rot"), 'saved flip', await pg.evaluate("JSON.parse(localStorage.getItem('qianpao-pocheng-1')).flip"), '| turn hint shown again:', await pg.evaluate("!document.getElementById('turn').hidden"))
        await pg.screenshot(path=shot_path('portrait_flip_opt'))
        print('tap 返回 hit:', await tap('#opt [data-close]'), '-> opt hidden', await pg.evaluate("document.getElementById('opt').hidden"))
        print('tap 出戰 hit:', await tap('#btnGo'), '-> mode', await pg.evaluate("window.__qp.G.mode"))
        await wait_my_aim(pg); await pg.wait_for_timeout(3600)
        print('tap 暫停 hit:', await tap('#btnPause'), '-> mode', await pg.evaluate("window.__qp.G.mode"))
        await pg.screenshot(path=shot_path('portrait_flip_pause'))
        print('tap 主畫面 hit:', await tap('#btnQuit'), '-> mode', await pg.evaluate("window.__qp.G.mode"))
        await pg.reload(); await pg.wait_for_timeout(800)
        print('after reload rot:', await pg.evaluate("window.__qp.G.rot"))
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
