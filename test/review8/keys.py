"""主畫面分頁的鍵盤與滑鼠：Tab 走到「第二篇」按 Enter，看焦點留在哪；再按 Tab 會去哪；方向鍵；滑鼠點分頁。
   python3 test/review8/keys.py"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from r8 import Game, OUT, SAVE_ALL, SAVE_OLD6

FOC = r"""(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; return (a.id ? '#' + a.id : a.className) + ' [' + (a.textContent || '').trim().slice(0, 10) + '] sel=' + a.getAttribute('aria-selected'); })()"""
INFO = r"""(() => { const q = window.__qp; return { sel: q.UI.sel, chap: q.UI.chap, tabs: [...document.querySelectorAll('#chaps .chap')].map((e) => e.getAttribute('aria-selected')).join(','), name: document.getElementById('liName').textContent }; })()"""


async def main():
    async with Game(1280, 720, scale=1, touch=False, save=SAVE_ALL) as g:
        await g.sec(1.0)
        # 從頭開始按 Tab，最多 20 下，記下每一下焦點在哪
        seq = []
        for i in range(20):
            await g.pg.keyboard.press('Tab'); await g.pump(2)
            f = await g.js(FOC); seq.append(f)
            if '第一篇' in f: break
        print('Tab sequence to 第一篇:', seq)
        # 在「第一篇」分頁上按 Enter（目前選的是第二篇，因為存檔全開 → 第十二關）
        await g.pg.keyboard.press('Enter'); await g.pump(10)
        print('after Enter on 第一篇: focus =', await g.js(FOC), await g.js(INFO))
        await g.shot('keys_after_enter_tab1')
        await g.pg.keyboard.press('Tab'); await g.pump(2)
        print('next Tab ->', await g.js(FOC))
        await g.pg.keyboard.press('Tab'); await g.pump(2)
        print('next Tab ->', await g.js(FOC))
        # 方向鍵在分頁上
        for i in range(6):
            f = await g.js(FOC)
            if '第二篇' in f or '第一篇' in f: break
            await g.pg.keyboard.press('Shift+Tab'); await g.pump(2)
        print('focus now', await g.js(FOC))
        await g.pg.keyboard.press('ArrowRight'); await g.pump(6)
        print('after ArrowRight on a tab: focus =', await g.js(FOC), await g.js(INFO))
        # 用空白鍵在第二篇分頁上
        for i in range(10):
            f = await g.js(FOC)
            if '第二篇' in f: break
            await g.pg.keyboard.press('Tab'); await g.pump(2)
        print('focus on', await g.js(FOC))
        await g.pg.keyboard.press('Space'); await g.pump(10)
        print('after Space on 第二篇: focus =', await g.js(FOC), await g.js(INFO))
        await g.shot('keys_after_space_tab2')
        # 選關卡卡片（Enter）：焦點應該留在同一張
        for i in range(10):
            f = await g.js(FOC)
            if '琉璃宮' in f: break
            await g.pg.keyboard.press('Tab'); await g.pump(2)
        await g.pg.keyboard.press('Enter'); await g.pump(10)
        print('after Enter on card 10: focus =', await g.js(FOC), await g.js(INFO))
        # 滑鼠點分頁
        await g.click_el('#chaps .chap:nth-child(1)'); await g.pump(10)
        print('mouse click 第一篇:', await g.js(INFO), 'focus', await g.js(FOC))
        await g.click_el('#chaps .chap:nth-child(2)'); await g.pump(10)
        print('mouse click 第二篇:', await g.js(INFO), 'focus', await g.js(FOC))
        print('console:', g.msgs[:5])
    # 舊存檔：鍵盤走到第二篇
    async with Game(1280, 720, scale=1, touch=False, save=SAVE_OLD6) as g:
        await g.sec(1.0)
        await g.click_el('#chaps .chap:nth-child(2)'); await g.pump(10)
        print('old6 click 第二篇:', await g.js(INFO))
        await g.click_el('#lvls .lv:nth-child(6)'); await g.pump(10)
        print('old6 click 魔王城:', await g.js(INFO), 'go disabled', await g.js("document.getElementById('btnGo').disabled"), 'stars text', await g.js("document.querySelector('#lvls .lv:nth-child(6) .stars').innerHTML"), await g.js("getComputedStyle(document.querySelector('#lvls .lv:nth-child(6) .stars')).visibility"))
        await g.shot('keys_old6_L12')

asyncio.run(main())
