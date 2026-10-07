"""開機檢查：頁面起得來、__qp 在、主畫面和第一關第一回合各截一張（844x390 觸控）。
python3 test/review2-ui/00_smoke.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, touch=True)
        print('qp keys:', await pg.evaluate("Object.keys(window.__qp).join(',')"))
        print('state:', pj(await pg.evaluate(JS_STATE)))
        print('G:', pj(await pg.evaluate("(() => { const G = window.__qp.G, V = window.__qp.V; return {rot: G.rot, sw: G.sw, sh: G.sh, ox: G.ox, oy: G.oy, u: getComputedStyle(document.getElementById('stage')).getPropertyValue('--u'), V: {W: V.W, H: V.H, s: V.s, hud: V.hud, dpr: V.dpr, gy: V.gy, top: V.top, topVis: V.topVis, x0: V.x0, x1: V.x1}}; })()")))
        await pg.screenshot(path=shot_path('smoke_home_844'))
        await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.startLevel(0); })()")
        print('to aim:', pj(await pg.evaluate(JS_TO_MY_AIM, 10)))
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=shot_path('smoke_L1_aim_844'))
        print('texts:', pj(await pg.evaluate(JS_TEXTS)))
        print('fonts:', pj(await pg.evaluate("(() => { const f = (sel) => getComputedStyle(document.querySelector(sel)).fontFamily; return {h1: f('.logo h1'), body: f('body'), num: f('#aimDeg')}; })()")))
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
