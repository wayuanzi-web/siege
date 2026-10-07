"""兩個滑鼠的重現：
A. 左鍵拖曳瞄準到一半按了一下右鍵（或中鍵）：瀏覽器把指標捕捉收走，bindInput 的 lostpointercapture 60ms 後把 G.drag 清掉，
   但左鍵其實還按著 —— 之後再拖，瞄準不動；放開也不發射。
B. 在戰鬥中的按鈕（暫停／連珠／護罩／發射）上按右鍵或中鍵：press() 在 e.preventDefault() 之前就 return，
   按鈕因此拿到焦點；之後按空白鍵／Enter（本來是發射）會變成「按那顆按鈕」。
python3 test/review2-ui/11b_rightclick_repro.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *

DRAG = "(() => { const d = window.__qp.G.drag; return d ? {id: d.id, type: d.type, far: +d.far.toFixed(1), live: d.live} : null; })()"


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 1280, 720, dsf=1)
        M = pg.mouse
        aim = lambda: pg.evaluate(AIM); vol = lambda: pg.evaluate(VOLLEYS); drag = lambda: pg.evaluate(DRAG)
        await pg.evaluate("""(() => { window.__ev = []; for (const t of ['pointerdown', 'pointerup', 'lostpointercapture', 'gotpointercapture', 'contextmenu', 'auxclick'])
          document.addEventListener(t, (e) => window.__ev.push(t + ' btn=' + e.button + ' buttons=' + e.buttons + ' @' + (e.target.id || e.target.tagName)), true); })()""")

        print('A. extra mouse button pressed during a left-button aim drag')
        for btn in ('right', 'middle'):
            await fresh(pg); await pg.evaluate("window.__ev = []")
            await M.move(640, 360); await M.down(); await M.move(700, 320, steps=6); await pg.wait_for_timeout(100)
            a1 = await aim(); d1 = await drag()
            await M.down(button=btn); await pg.wait_for_timeout(80); await M.up(button=btn); await pg.wait_for_timeout(300)
            d2 = await drag()
            await M.move(720, 310, steps=2); await pg.wait_for_timeout(300)       # 左鍵還按著，繼續拖
            d3 = await drag(); a3 = await aim()
            await M.move(800, 240, steps=8); await pg.wait_for_timeout(100)
            a4 = await aim(); buttons = await pg.evaluate("new Promise(r => { addEventListener('pointermove', e => r(e.buttons), {once: true}); })") if False else None
            await M.up(); await pg.wait_for_timeout(300)
            print(f'  {btn}-click mid-drag: drag before={pj(d1)} | 300ms after the {btn} click={pj(d2)} | after moving 22px more (left still held)={pj(d3)}')
            print(f'     aim before {btn} click {a1} -> after dragging 100px further with the left button still down {a4}  (aim follows mouse: {a4 != a1})')
            print(f'     left button released: volleys fired = {await vol()}  (expected 1)')
            print('     events:', await pg.evaluate("window.__ev.join(' | ')"))

        print('\nB. right/middle click on an in-battle button, then Space / Enter')
        for (bid, btn, key) in (('btnPause', 'right', 'Space'), ('btnUlt', 'right', 'Space'), ('btnUlt', 'middle', 'Enter'), ('btnShield', 'right', 'Enter')):
            await fresh(pg)
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; T.shield.c = T.shield.need; })()")
            r = await pg.evaluate("(id) => { const b = document.getElementById(id).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", bid)
            await M.click(r[0], r[1], button=btn); await pg.wait_for_timeout(120)
            st0 = await pg.evaluate("(() => { const q = window.__qp, T = q.S.team[0], ae = document.activeElement; return {focus: ae.id || ae.tagName, focusVisibleBeforeKey: ae.matches(':focus-visible'), armed: T.ult.armed, shield: T.shield.on, mode: q.G.mode, volleys: T.volleys}; })()")
            await M.move(640, 360)
            await pg.keyboard.press(key); await pg.wait_for_timeout(200)
            st1 = await pg.evaluate("(() => { const q = window.__qp, T = q.S.team[0], ae = document.activeElement; return {focus: ae.id || ae.tagName, armed: T.ult.armed, shield: T.shield.on, mode: q.G.mode, volleys: T.volleys}; })()")
            print(f'  {btn}-click {bid}: {pj(st0)}')
            print(f'     then {key}: {pj(st1)}   -> fired: {st1["volleys"] == 1}')
            if st1['mode'] == 'pause': await pg.evaluate("document.getElementById('btnResume').click()")
        # 上一輪留在按鈕上的焦點，重開一關之後還在
        await fresh(pg); await M.move(640, 360)
        print('  after restarting the level, focus is still on:', await pg.evaluate("document.activeElement.id || document.activeElement.tagName"))
        # 對照：沒有先按右鍵（焦點在 body）
        await pg.evaluate("document.activeElement.blur()"); await fresh(pg); await pg.keyboard.press('Space'); await pg.wait_for_timeout(200)
        print('  control (focus on body, no right-click first), Space: volleys =', await vol())
        # 對照：左鍵按按鈕之後焦點在哪
        await fresh(pg); await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; })()")
        r = await pg.evaluate("(() => { const b = document.getElementById('btnUlt').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await M.click(r[0], r[1]); await pg.wait_for_timeout(100)
        print('  control (LEFT click 連珠): focus =', await pg.evaluate("document.activeElement.id || document.activeElement.tagName"), '| armed =', await pg.evaluate("window.__qp.S.team[0].ult.armed"))
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(200)
        print('     then Space: volleys =', await vol(), '| armed (consumed by the volley) =', await pg.evaluate("window.__qp.S.team[0].ult.armed"))
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
