"""存檔裡的數字沒有取整：open 是小數時 boot() 在 homeRender() 丟例外，之後的 simInit / layout / 主迴圈都沒跑，畫面停在沒有背景的主畫面。
   python3 test/review-ui/24_save_fraction.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

async def main():
    async with async_playwright() as p:
        for g in ('{"open":2.5}', '{"up":{"dmg":2.5},"coins":500}'):
            b, ctx, pg, msgs = await open_page(p, 844, 390, init="try { localStorage.setItem('qianpao-pocheng-1', %s); } catch (e) {}" % json.dumps(g))
            await pg.wait_for_timeout(600)
            r = await pg.evaluate("(() => { const q = window.__qp; return {sel: q.UI.sel, lvName: document.getElementById('liName').textContent, frames: q.RD.frame, canvas: [document.getElementById('cv').width, document.getElementById('cv').height], goDisabled: document.getElementById('btnGo').disabled}; })()")
            await pg.mouse.click(260, 280); await pg.wait_for_timeout(500)          # 按「出戰」
            r['afterGo'] = await pg.evaluate("(() => { const q = window.__qp; return {mode: q.G.mode, frames: q.RD.frame, simTime: q.S.time}; })()")
            if 'up' in g:
                await pg.evaluate("window.__qp.goHome && 0"); await pg.evaluate("document.getElementById('btnPause').click(); document.getElementById('btnQuit').click(); document.getElementById('btnShop').click()"); await pg.wait_for_timeout(200)
                r['shopButtons'] = await pg.evaluate("[...document.querySelectorAll('#upList button')].map(b => b.textContent).join('|')")
            await pg.screenshot(path=shot_path('save_fraction_' + ('open' if 'open' in g else 'up')))
            print(g, '=>', json.dumps(r, ensure_ascii=False), '| errors:', msgs)
            await b.close()
asyncio.run(main())
