"""直拿時的「把手機橫過來玩」提示：小手機圖示永遠往逆時針轉（@keyframes tilt 寫死 rotate(-90deg)），
設定裡開了「畫面上下顛倒」（舞台改成轉 -90 度）之後，玩家其實要順時針轉手機，圖示示範的方向就反了。
python3 test/review2-ui/34_flip_overlay.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *
Q = """(() => { const q = window.__qp, st = document.getElementById('stage'), i = document.querySelector('#turn i'), a = i.getAnimations()[0];
  return {rot: q.G.rot, stageTransform: st.style.transform.replace(/translate\\([^)]*\\)\\s*/, ''), overlayShown: !document.getElementById('turn').hidden, iconAnimation: a ? a.animationName : null, iconEndsAt: a ? a.effect.getKeyframes().slice(-1)[0].transform : null}; })()"""
async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 390, 844, touch=True)
        print('default      :', pj(await pg.evaluate(Q)))
        await pg.evaluate("(() => { const q = window.__qp; q.SV.flip = true; q.layout(); })()"); await pg.wait_for_timeout(400)
        print('flip setting :', pj(await pg.evaluate(Q)))
        await pg.screenshot(path=shot_path('flip_overlay'))
        await b.close()
asyncio.run(main())
