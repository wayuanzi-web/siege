"""「逆轉」小牌子：我方兵比敵軍少的時候掛在連珠按鈕上。各尺寸量它跟護罩按鈕的距離、有沒有超出舞台，截圖。
   python3 test/review8/boost.py"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from r8 import Game, OUT, label, sheet, upright, SAVE_ALL

M = r"""(() => { const q = window.__qp, $ = (id) => document.getElementById(id), st = $('stage');
  const loc = (e) => { let x = 0, y = 0; for (let n = e; n && n !== st; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y, e.offsetWidth, e.offsetHeight]; };
  const u = parseFloat(getComputedStyle(st).getPropertyValue('--u'));
  const bu = $('btnUlt'), bs = $('btnShield'), a = getComputedStyle(bu, '::after');
  const U = loc(bu), Sh = loc(bs);
  const bt = U[1] + parseFloat(a.top), bh = parseFloat(a.lineHeight) || parseFloat(a.fontSize) * 1.5, bw = parseFloat(a.width);
  return { boost: bu.classList.contains('boost'), content: a.content, u, ult: U, sh: Sh, badgeTop: +bt.toFixed(1), badgeBottom: +(bt + bh).toFixed(1), badgeW: bw, shBottom: Sh[1] + Sh[3], shBottomScaled: +(Sh[1] + Sh[3] * 1.035).toFixed(1), stageW: st.offsetWidth, stageH: st.offsetHeight,
    gap: +(bt - (Sh[1] + Sh[3])).toFixed(1), alive: [q.S.team[0].alive, q.S.team[1].alive], ultK: q.S.team[0].ult.c, say: $('say').textContent }; })()"""


async def one(W, H, port=False):
    async with Game(W, H, scale=2, touch=True, save=SAVE_ALL) as g:
        await g.sec(0.5)
        await g.js("() => { const q = window.__qp; q.UI.sel = 7; q.homeRender(); }")
        await g.tap_el('#btnGo'); await g.pump(2)
        await g.until("S.phase === 'aim' && S.turn === 0", 30)
        await g.js("() => { const q = window.__qp, S = q.S; let n = 0; for (const u of S.team[0].units) if (u.alive && n < 2) { q.killUnit(u, 1, 0); n++; } }")
        await g.sec(1.2)
        m = await g.js(M)
        rot = await g.js("window.__qp.G.rot")
        im = await g.shot(f'boost_{W}x{H}')
        print(f'{W}x{H}', json.dumps(m, ensure_ascii=False))
        # 連珠集滿（按鈕在跳）的時候
        await g.js("() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; }")
        await g.sec(0.6)
        m2 = await g.js(M)
        im2 = await g.shot(f'boost_ready_{W}x{H}')
        print(f'   ready:', json.dumps({k: m2[k] for k in ('boost', 'gap', 'badgeTop', 'shBottom')}, ensure_ascii=False))
        print('   console:', g.msgs[:4])
        return upright(im, rot), rot


async def main():
    for W, H in ((844, 390), (667, 375), (740, 360), (932, 430), (1280, 720), (390, 844)):
        await one(W, H)

asyncio.run(main())
