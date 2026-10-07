"""查：拖曳瞄準中，用第二根手指按「連珠」有沒有上膛。把按鈕收到的事件和每一步的 ult 狀態印出來。也測單指直接點。"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT

async def main():
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    async with Game(844, 390, scale=2, save=save) as g:
        await g.sec(1)
        await g.tap_el('#lvls > button:nth-child(2)'); await g.pump(20); await g.tap_el('#btnGo'); await g.until("S.phase === 'aim' && S.turn === 0", 10); await g.pump(20)
        await g.js("""() => { const q = window.__qp; q.S.team[0].ult.c = 100; window.__ev = []; for (const id of ['btnUlt', 'btnShield', 'stage']) { const el = document.getElementById(id); for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'touchstart', 'touchend']) el.addEventListener(t, (e) => window.__ev.push(id + ':' + t + (e.pointerId !== undefined ? '#' + e.pointerId : '') + '@' + (e.target.id || e.target.tagName) + ' armed=' + q.S.team[0].ult.armed), true); } }""")
        await g.pump(8)
        ult = lambda: g.js("(() => { const u = window.__qp.S.team[0].ult; return [u.c, u.need, u.armed]; })()")
        ru = await g.center('#btnUlt'); print('btnUlt centre', [round(v) for v in ru], 'ult', await ult())
        T = lambda typ, pts: g.cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for (i, x, y) in pts]})
        # 單指點
        await T('touchStart', [(0, ru[0], ru[1])]); await g.pump(3); print('single finger down:', await ult()); await T('touchEnd', []); await g.pump(3); print('single finger up:', await ult(), await g.js("window.__ev.splice(0)"))
        await T('touchStart', [(0, ru[0], ru[1])]); await g.pump(3); await T('touchEnd', []); await g.pump(3); print('second single tap (toggle off):', await ult(), await g.js("window.__ev.splice(0)"))
        # 兩指
        await T('touchStart', [(0, 300, 250)]); await g.pump(2)
        for i in range(1, 6): await T('touchMove', [(0, 300 + i * 8, 250 - i * 5)]); await g.pump(1)
        await g.js("window.__ev.splice(0)")
        await T('touchStart', [(0, 340, 225), (1, ru[0], ru[1])]); await g.pump(3); print('2nd finger down on 連珠:', await ult(), await g.js("window.__ev.splice(0)"))
        await T('touchMove', [(0, 340, 225)]); await g.pump(3); print('2nd finger up:', await ult(), await g.js("window.__ev.splice(0)"))
        await T('touchEnd', []); await g.pump(3); print('1st finger up:', await ult(), 'phase', (await g.state())['phase'], await g.js("window.__ev.splice(0)"))
asyncio.run(main())
