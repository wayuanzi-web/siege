"""每一關跑很多場自動玩家，統計幾回合分出勝負、第一輪就贏的比例。 python3 test/review4-look/rounds.py --levels=2 --seeds=1-16 --bot=casual"""
import asyncio, sys, json, pathlib, time, collections
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '2').split(',')]; a, b = [int(x) for x in opt.get('seeds', '1-12').split('-')]; bot = opt.get('bot', 'casual')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': int(opt.get('diff', 1)), 'flip': False}
    async with Game(844, 390, scale=1, save=save) as g:
        await g.sec(0.5)
        for lvl in levels:
            res = []
            for seed in range(a, b + 1):
                await g.js(START, start_args(lvl, seed, bot))
                await g.until("G.mode === 'result'", max_sec=500, step=6)
                st = await g.state(); r = await g.js("(() => { const q = window.__qp, S = q.S; return {state: S.state, round: S.round, t: +S.time.toFixed(1), lost: S.stat.lost, kills: S.stat.kills, foeVolleys: S.team[1].volleys, myVolleys: S.team[0].volleys, stars: document.querySelectorAll('#resStars .on').length, bar: document.getElementById('rsBar').textContent}; })()")
                r['seed'] = seed; res.append(r)
                await g.js("window.__qp.goHome()"); await g.pump(10)
            won = [r for r in res if r['state'] == 'won']
            print(f"L{lvl} {bot} diff{save['diff']}: {len(res)} games, won {len(won)}; rounds: {collections.Counter(r['round'] for r in res).most_common()}; won before the enemy fired once: {sum(1 for r in won if r['foeVolleys'] == 0)}; enemy fired <=1 volley: {sum(1 for r in won if r['foeVolleys'] <= 1)}; median game time {sorted(r['t'] for r in res)[len(res) // 2]} s", flush=True)
            print('   ', [(r['seed'], r['state'][0], r['round'], r['foeVolleys'], r['t']) for r in res], flush=True)
            print('   msgs', g.msgs[-3:], flush=True)
asyncio.run(main())
