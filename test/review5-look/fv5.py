"""review5 第 6 項：第一輪就破城有多容易——比 review4 的 firstvolley.py 更細的格子（dvx、dvy 每 1 一格），只跑指定的關卡，可以指定舊版頁面來比。
   每一發：從開場預設的砲口速度加上 (dvx, dvy)（就是玩家第一下隨手拖一小段的範圍），用真的戰局模擬打第一輪，一直算到輪到敵軍瞄準（或 30 秒）。
   python3 test/review5-look/fv5.py --levels=3 [--seeds=3] [--page=<index.html>] [--tag=new]"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
import q4
from q4 import Game, parse_opts
OUT = HERE.parent.parent / 'shots' / 'review5'
SWEEP = r"""
([lvl, sd, dvxs, dvys]) => {
  const q = window.__qp, S = q.S, out = [], keepOn = S.on;
  for (const dvy of dvys) for (const dvx of dvxs) {
    q.simInit(lvl - 1, {}, 1000 + sd * 77 + lvl, 1); S.on = null;
    let n = 0; while (S.phase !== 'aim' && n++ < 200) q.simStep(1 / 60);
    const a0 = [S.team[0].aim[0], S.team[0].aim[1]];
    q.simAim(0, a0[0] + dvx, a0[1] + dvy); q.simFire(0); n = 0;
    while (S.state === 'play' && !(S.phase === 'aim' && S.turn === 1) && n++ < 1800) q.simStep(1 / 60);
    out.push([dvx, dvy, S.stat.kills, S.state === 'won' ? 1 : 0, Math.round(q.teamBar(1) * 100), S.stat.swarm, +S.time.toFixed(1)]);
  }
  S.on = keepOn; return out;
}
"""
async def main():
    args, opt = parse_opts(sys.argv[1:]); levels = [int(x) for x in opt.get('levels', '3').split(',')]; seeds = int(opt.get('seeds', 3)); tag = opt.get('tag', 'new')
    if 'page' in opt: q4.PAGE = pathlib.Path(opt['page'])
    dvxs = list(range(-4, 11)); dvys = list(range(-2, 13)); res = {}
    async with Game(844, 390, scale=1) as g:
        await g.sec(0.3)
        for lvl in levels:
            rows = []
            for sd in range(1, seeds + 1):
                r = await g.js(SWEEP, [lvl, sd, dvxs, dvys]); rows += [x + [sd] for x in r]
            res[lvl] = rows; n = len(rows); won = [x for x in rows if x[3]]; k2 = [x for x in rows if x[2] >= 2]; k1 = [x for x in rows if x[2] >= 1]
            print(f"{tag} L{lvl}: {n} first volleys (dvx -4..10, dvy -2..12, {seeds} seeds): WON outright {len(won)} ({100 * len(won) / n:.1f}%), >=2 kills {len(k2)} ({100 * len(k2) / n:.1f}%), >=1 kill {len(k1)} ({100 * len(k1) / n:.1f}%), mean enemy bar left {sum(x[4] for x in rows) / n:.0f}%", flush=True)
            for dvy in reversed(dvys):
                print(f"      dvy {dvy:+3d} | " + ' '.join(''.join('W' if x[3] else (str(x[2]) if x[2] else '.') for x in rows if x[0] == dvx and x[1] == dvy) for dvx in dvxs))
            print('      dvx       ' + ' '.join(f'{d:+3d}'[:3].ljust(seeds) for d in dvxs))
            print('      winning aims (dvx, dvy, seed, gate multiplier, sim time):', [(x[0], x[1], x[7], x[5], x[6]) for x in won][:20], flush=True)
    (OUT / f'fv5_{tag}.json').write_text(json.dumps(res))
asyncio.run(main())
