"""第二篇每一關實際打幾回合（我方交給自動玩家），在幾個時間點截圖：開場橫幅、輪到我（提示）、敵軍瞄準（紅色虛線）、第二、三回合。
   python3 test/review8/play.py [關卡,…=6..12] [尺寸,…=844x390,1280x720] [回合數=3] [bot=casual] [seed=7]"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from r8 import Game, OUT, label, sheet, SAVE_ALL

args = [a for a in sys.argv[1:]]
LV = [int(x) for x in (args[0] if len(args) > 0 else '6,7,8,9,10,11,12').split(',')]
SIZES = [tuple(int(v) for v in s.split('x')) for s in (args[1] if len(args) > 1 else '844x390,1280x720').split(',')]
ROUNDS = int(args[2]) if len(args) > 2 else 3
BOT = args[3] if len(args) > 3 else 'casual'
SEED = int(args[4]) if len(args) > 4 else 7

TXT = r"""(() => { const q = window.__qp, S = q.S, $ = (id) => document.getElementById(id); const vis = (el) => { if (!el || el.hidden) return 0; const cs = getComputedStyle(el); return cs.display === 'none' ? 0 : +cs.opacity; };
  return { chip: $('turnChip').hidden ? '' : $('turnChip').textContent, say: vis($('say')) > 0.05 ? $('say').textContent : '', banner: vis($('banner')) > 0.05 ? $('banner').textContent : '', round: $('roundTxt').textContent, wind: $('windBox').hidden ? '' : $('windTxt').textContent, ult: $('ultNum').textContent, sh: $('shNum').textContent, pops: q.FX.pops.map((p) => p.txt), phase: S.phase, turn: S.turn, state: S.state, a: [S.team[0].alive, S.team[1].alive], bar: [Math.round(q.teamBar(0) * 100), Math.round(q.teamBar(1) * 100)] }; })()"""


async def one(W, H, lvl):
    tiles = []
    async with Game(W, H, scale=2 if W < 1000 else 1, touch=True, save=SAVE_ALL) as g:
        await g.sec(0.8)
        await g.js("(s) => { let k = s; Math.random = () => { k = (k * 16807) % 2147483647; return k / 2147483647; }; }", SEED * 7919 + lvl)
        await g.js("(l) => { const q = window.__qp; q.UI.sel = l - 1; q.homeRender(); }", lvl)
        await g.tap_el('#btnGo'); await g.pump(2)
        await g.js("() => { const q = window.__qp; q.aiInit(q.S.team[0], q.BOTS['%s'], { aiErr: 1 }); }" % BOT)
        await g.sec(0.9)
        im = await g.shot(f'play_L{lvl}_{W}x{H}_0intro'); t = await g.js(TXT); tiles.append(label(im.copy(), f'L{lvl} intro', t['banner'] + ' | ' + t['chip']))
        print(f'L{lvl} {W}x{H} intro', json.dumps(t, ensure_ascii=False))
        for r in range(1, ROUNDS + 1):
            ok = await g.until("S.state !== 'play' || (S.phase === 'aim' && S.turn === 0 && S.round >= %d)" % r, 90)
            if not ok or (await g.js("window.__qp.S.state")) != 'play': break
            await g.js("() => { const S = window.__qp.S; window.__bot = S.team[0].ai; S.team[0].ai = null; }")
            await g.sec(0.9)
            im = await g.shot(f'play_L{lvl}_{W}x{H}_r{r}aim'); t = await g.js(TXT); tiles.append(label(im.copy(), f'L{lvl} r{r} my aim', (t['say'] or '')[:40]))
            print(f'L{lvl} {W}x{H} r{r} my aim', json.dumps(t, ensure_ascii=False))
            await g.js("() => { const S = window.__qp.S; S.team[0].ai = window.__bot; }")
            ok = await g.until("S.state !== 'play' || (S.phase === 'aim' && S.turn === 1)", 90)
            if not ok or (await g.js("window.__qp.S.state")) != 'play': break
            await g.sec(0.55)
            im = await g.shot(f'play_L{lvl}_{W}x{H}_r{r}foe'); t = await g.js(TXT); tiles.append(label(im.copy(), f'L{lvl} r{r} foe aim', t['chip']))
            print(f'L{lvl} {W}x{H} r{r} foe aim', json.dumps(t, ensure_ascii=False))
        print('   console:', g.msgs[:6])
    sh = sheet(tiles, 2, max_w=2400)
    sh.save(OUT / f'play_L{lvl}_{W}x{H}_sheet.png')


async def main():
    for W, H in SIZES:
        for lvl in LV:
            await one(W, H, lvl)

asyncio.run(main())
