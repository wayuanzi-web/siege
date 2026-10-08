"""review5：主畫面卡片上「我方／敵軍」兩個小標籤有沒有被擠成直排（一個字一行），各尺寸、各關量一次。順便把 667x375 第五關放大截一張。"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from q4 import Game, upright
OUT = HERE.parent.parent / 'shots' / 'review5'
M = "(() => [...document.querySelectorAll('#liCrew small')].map((e) => { const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return [e.textContent, +parseFloat(cs.fontSize).toFixed(1), Math.round(e.offsetWidth), Math.round(e.offsetHeight), Math.round(e.offsetHeight / parseFloat(cs.fontSize) * 10) / 10]; }))()"
async def main():
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    for W, H in ((844, 390), (667, 375), (390, 844), (740, 360), (932, 430)):
        async with Game(W, H, scale=3, save=save) as g:
            await g.sec(1.0); rows = []
            for lvl in range(1, 7):
                await g.tap_el(f'#lvls > button:nth-child({lvl})'); await g.pump(20); m = await g.js(M)
                rows.append((lvl, [(t, f'{fz}px', f'{w}x{h}', 'WRAPPED' if r > 1.9 else 'one line') for t, fz, w, h, r in m]))
                if (W, H) == (667, 375) and lvl == 5:
                    r = await g.js("(() => { const b = document.querySelector('.lvinfo').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; })()")
                    im = await g.shot(None, clip={'x': r[0] - 4, 'y': r[1] - 4, 'width': r[2] + 8, 'height': r[3] + 8}); im.save(OUT / 'home_card_667_L5.png')
            wrapped = [lvl for lvl, m in rows if any(x[3] == 'WRAPPED' for x in m)]
            print(f'{W}x{H}: label wrapped to one character per line on levels {wrapped}; sample L5: {rows[4][1]}; L1: {rows[0][1]}')
asyncio.run(main())
