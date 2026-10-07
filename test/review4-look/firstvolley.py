"""第一輪就破城有多容易：每一關，從預設的砲口角度出發，做「隨手拖一下」範圍內的各種小調整（dvx、dvy 各 -6…+12），
   用真的戰局模擬打第一輪（不畫圖），記下這一輪打倒幾個守軍、是不是直接贏了（敵軍一發都還沒打）。
   python3 test/review4-look/firstvolley.py [--seeds=3]"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT, parse_opts

SWEEP = r"""
([lvl, seeds, grid]) => {
  const q = window.__qp, S = q.S, out = [];
  const keepOn = S.on;
  for (let sd = 1; sd <= seeds; sd++) for (const dvx of grid) for (const dvy of grid) {
    q.simInit(lvl - 1, {}, 1000 + sd * 77 + lvl, 1); S.on = null;
    let n = 0; while (S.phase !== 'aim' && n++ < 200) q.simStep(1 / 60);
    const a0 = [S.team[0].aim[0], S.team[0].aim[1]];
    q.simAim(0, a0[0] + dvx, a0[1] + dvy); const a = [S.team[0].aim[0], S.team[0].aim[1]];
    q.simFire(0); n = 0;
    while (S.state === 'play' && !(S.phase === 'aim' && S.turn === 1) && n++ < 1200) q.simStep(1 / 60);
    out.push({ dvx, dvy, sd, ang: Math.round(Math.atan2(a[1], a[0]) * 180 / Math.PI), pow: Math.round((Math.hypot(a[0], a[1]) - 32) / 54 * 100), kills: S.stat.kills, alive: S.team[1].alive, won: S.state === 'won' ? 1 : 0, foe: Math.round(q.teamBar(1) * 100), swarm: S.stat.swarm, t: +S.time.toFixed(1) });
  }
  S.on = keepOn;
  return out;
}
"""

async def main():
    args, opt = parse_opts(sys.argv[1:]); seeds = int(opt.get('seeds', 2))
    grid = [-6, -3, 0, 3, 6, 9, 12]
    async with Game(844, 390, scale=1) as g:
        await g.sec(0.3)
        allr = {}
        for lvl in range(1, 7):
            r = await g.js(SWEEP, [lvl, seeds, grid]); allr[lvl] = r
            n = len(r); won = [x for x in r if x['won']]; k1 = [x for x in r if x['kills'] >= 1]; gate = [x for x in r if x['swarm'] > 1]
            d0 = [x for x in r if x['dvx'] == 0 and x['dvy'] == 0]
            print(f"L{lvl}: {n} first volleys around the default aim: WON outright {len(won)} ({100 * len(won) / n:.0f}%), >=1 kill {len(k1)} ({100 * len(k1) / n:.0f}%), passed a multiplier gate {len(gate)} ({100 * len(gate) / n:.0f}%); default aim untouched: " + ', '.join(f"kills {x['kills']} foe {x['foe']}% x{x['swarm']}{' WON' if x['won'] else ''}" for x in d0), flush=True)
            # 表：列 = dvy（上到下 12 … -6），欄 = dvx（-6 … 12）；格子裡是 seed 1 的結果：W 贏了、數字 = 打倒幾個、. 沒打倒
            for dvy in reversed(grid):
                row = []
                for dvx in grid:
                    xs = [x for x in r if x['dvx'] == dvx and x['dvy'] == dvy]
                    row.append(''.join('W' if x['won'] else (str(x['kills']) if x['kills'] else '.') for x in xs))
                print(f"      dvy {dvy:+3d} | " + '  '.join(f'{c:>3s}' for c in row), flush=True)
            print('      dvx      ' + '  '.join(f'{d:+3d}' for d in grid), flush=True)
        (OUT / 'firstvolley.json').write_text(json.dumps(allr))
        print('console:', g.msgs[:5])
asyncio.run(main())
