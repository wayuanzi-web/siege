"""review4：(a) 兩根手指：一根拖著瞄準，另一根按護罩再放開（第一根不放）；(b) 重新整理頁面，進度和設定還在。"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT

async def main():
    async with Game(844, 390, scale=2) as g:       # 全新存檔，不注入任何東西
        await g.sec(1)
        # (b) 設定：關音效、解鎖全部 → 重新整理
        await g.tap_el('#btnOpt'); await g.pump(20); await g.tap_el('#tSfx'); await g.pump(5); await g.tap_el('#btnUnlock'); await g.pump(20)
        before = await g.js("localStorage.getItem('qianpao-pocheng-1')")
        await g.pg.reload(); await g.pg.wait_for_timeout(300); await g.pump(40)
        r = await g.js("(() => { const q = window.__qp; return {sfx: q.SV.sfx, open: q.SV.open, sel: q.UI.sel, locked: document.querySelectorAll('#lvls .locked').length, sfxPressed: document.getElementById('tSfx').getAttribute('aria-pressed')}; })()")
        print('b reload after settings change: before', before[:90], '-> after', r)
        # 打贏一關（直接讓敵軍全倒），拿到星星和錢 → 重新整理
        await g.tap_el('#lvls > button:nth-child(1)'); await g.pump(20); await g.tap_el('#btnGo'); await g.until("S.phase === 'aim' && S.turn === 0", 10)
        await g.js("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()"); await g.until("G.mode === 'result'", 10); await g.pump(100)
        s1 = await g.js("localStorage.getItem('qianpao-pocheng-1')")
        await g.pg.reload(); await g.pg.wait_for_timeout(300); await g.pump(40)
        r = await g.js("(() => { const q = window.__qp; return {coins: q.SV.coins, stars: q.SV.stars, open: q.SV.open, seen: q.SV.seen, homeCoins: document.getElementById('homeCoins').textContent, lv1stars: document.querySelector('#lvls button .stars em').textContent.length, mode: q.G.mode}; })()")
        print('b reload after a win: saved', s1[:70], '-> after reload', r); await g.shot('misc_7_reload_home')
        # (a) 兩根手指
        await g.tap_el('#lvls > button:nth-child(2)'); await g.pump(20); await g.tap_el('#btnGo'); await g.until("S.phase === 'aim' && S.turn === 0", 10); await g.pump(20)
        await g.js("window.__qp.S.team[0].shield.c = 100; window.__qp.S.team[0].ult.c = 100"); await g.pump(8)
        vol = lambda: g.js("window.__qp.S.team[0].volleys")
        rs = await g.center('#btnShield'); ru = await g.center('#btnUlt')
        T = lambda typ, pts: g.cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for (i, x, y) in pts]})
        await T('touchStart', [(0, 300, 250)]); await g.pump(2)
        for i in range(1, 6): await T('touchMove', [(0, 300 + i * 8, 250 - i * 5)]); await g.pump(1)
        a1 = (await g.state())['aim']
        await T('touchStart', [(0, 340, 225), (1, rs[0], rs[1])]); await g.pump(3)             # 第二根手指按護罩
        st = await g.state(); print('a second finger DOWN on 護罩 while dragging: shield on =', st['shOn'], '| still dragging =', st['drag'], '| phase', st['phase'], '| volleys', await vol())
        await T('touchMove', [(0, 340, 225)]); await g.pump(3)                                   # 第二根手指放開（只剩第一根）
        st = await g.state(); print('a second finger UP: still dragging =', st['drag'], '| phase', st['phase'], '| volleys', await vol())
        await T('touchStart', [(0, 340, 225), (1, ru[0], ru[1])]); await g.pump(3); await T('touchMove', [(0, 340, 225)]); await g.pump(3)
        st = await g.state(); print('a second finger taps 連珠: armed =', st['armed'], '| still dragging =', st['drag'], '| phase', st['phase'])
        for i in range(1, 4): await T('touchMove', [(0, 340 + i * 6, 225 - i * 6)]); await g.pump(1)
        a2 = (await g.state())['aim']; await g.shot('misc_3_two_fingers')
        await T('touchEnd', []); await g.pump(4); st = await g.state(); print('a first finger released: aim', a1, '->', a2, '| phase', st['phase'], '| volleys', await vol())
        print('console:', g.msgs[:8])
asyncio.run(main())
