"""22b 的對照：在 iframe 裡替 #stage 的 pointerdown 多加一句 window.focus()（只加在測試頁面上，沒動 src），
點戰場之後鍵盤就回到遊戲了 —— 給修法參考。先跑過 22b_iframe_focus.py（它會產生 out/host_focus.html）。
python3 test/review2-ui/22c_focus_fix_probe.py"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *
HOST = HERE / 'out' / 'host_focus.html'
async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 1000, 700, dsf=1, url=HOST.as_uri())
        await pg.wait_for_timeout(500)
        fr = [f for f in pg.frames if f != pg.main_frame][0]
        M = pg.mouse; K = pg.keyboard
        await fr.evaluate("window.__qp.SV.seen = true")
        # 建議的修法：戰鬥中按下去的時候自己把焦點要回來
        await fr.evaluate("document.getElementById('stage').addEventListener('pointerdown', () => window.focus(), true)")
        r = await fr.evaluate("(() => { const b = document.getElementById('btnGo').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await M.click(60 + r[0], 60 + r[1])
        await fr.evaluate("(async () => { const q = window.__qp; q.G.freeze = true; let n = 0; while (n++ < 6000 && !(q.S.state === 'play' && q.S.phase === 'aim' && q.S.turn === 0)) q.advance(1 / 60); q.G.freeze = false; })()"); await pg.wait_for_timeout(150)
        await M.click(100, 20); await pg.wait_for_timeout(100)
        print('host text box focused; frame has focus:', await fr.evaluate("document.hasFocus()"))
        await M.click(60 + 400, 60 + 200); await pg.wait_for_timeout(150)
        print('clicked battlefield (with window.focus() added on pointerdown): frame has focus:', await fr.evaluate("document.hasFocus()"))
        await K.press('Space'); await pg.wait_for_timeout(200)
        print('Space -> volleys', await fr.evaluate("window.__qp.S.team[0].volleys"), '| host text box:', repr(await pg.evaluate("document.getElementById('t').value")))
        await b.close()
asyncio.run(main())
