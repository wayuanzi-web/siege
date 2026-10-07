"""直拿手機的原始畫面（不轉回橫的）：開機時的「把手機橫過來玩」提示、戰鬥中、結算。390x844 和 360x640。
python3 test/review2-ui/31_portrait_raw.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *

async def main():
    async with async_playwright() as p:
        for (w, h) in ((390, 844), (360, 640)):
            b, ctx, pg, msgs = await open_page(p, w, h, touch=True, dsf=2)
            await pg.wait_for_timeout(400); await pg.screenshot(path=shot_path(f'raw_{w}x{h}_1_boot_overlay'))
            print(w, h, pj(await pg.evaluate("(() => { const t = document.getElementById('turn'), r = t.getBoundingClientRect(); return {turnHidden: t.hidden, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), rot: window.__qp.G.rot}; })()")))
            await pg.wait_for_timeout(3500)
            await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = false; q.startLevel(0); })()"); await wait_my_aim(pg); await pg.wait_for_timeout(1900)
            await pg.screenshot(path=shot_path(f'raw_{w}x{h}_2_L1_hint'))
            await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.SV.open = 6; q.startLevel(5); })()"); await wait_my_aim(pg); await pg.wait_for_timeout(2000)
            await pg.screenshot(path=shot_path(f'raw_{w}x{h}_3_L6'))
            await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(400); await pg.screenshot(path=shot_path(f'raw_{w}x{h}_4_pause')); await pg.keyboard.press('KeyP')
            await pg.evaluate("(() => { const q = window.__qp; q.killUnit(q.S.team[0].units[0], 1, 0); for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
            await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(1700); await pg.screenshot(path=shot_path(f'raw_{w}x{h}_5_result'))
            print('  errors', msgs); await b.close()
asyncio.run(main())
