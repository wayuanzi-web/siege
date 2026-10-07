"""統計兵是在哪個階段倒下的。 python3 test/review4-look/udiestats.py --levels=1,2,3,4,5,6 --seeds=1,2,3 --bot=casual"""
import asyncio, sys, json, pathlib, time, collections
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '1,2,3,4,5,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1,2,3').split(',')]; bot = opt.get('bot', 'casual')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    allr = []; HOW = {0: 'shot', 1: 'crush/fall', 3: 'fire', 4: 'void', 5: 'out of castle', 6: 'off field'}
    async with Game(844, 390, scale=1, save=save) as g:
        await g.sec(0.5); await g.js(pathlib.Path(__file__).with_name('hook_udie.js').read_text())
        for lvl in levels:
            for seed in seeds:
                await g.js(START, start_args(lvl, seed, bot)); await g.until("G.mode === 'result'", max_sec=500, step=4)
                st = await g.state(); recs = await g.js('window.__hookResult()')
                for r in recs: r['seed'] = seed
                allr += recs
                late = [r for r in recs if r['phase'] == 'aim']
                print(f"L{lvl} seed{seed}: {st['state']} r{st['round']} deaths {len(recs)} during-aim {len(late)}", [(r['round'], 'turn' + str(r['turn']), 'side' + str(r['side']), r['type'], HOW.get(r['how'], r['how']), 'phaseT' + str(r['phaseT'])) for r in late], flush=True)
                await g.js("window.__qp.goHome()"); await g.pump(10)
    n = len(allr); late = [r for r in allr if r['phase'] == 'aim']
    print(f'TOTAL deaths while game undecided: {n}; during an aim phase (after the turn had passed): {len(late)} ({100 * len(late) / max(1, n):.0f}%)')
    print('  by cause (all):', collections.Counter(HOW.get(r['how'], r['how']) for r in allr).most_common())
    print('  by cause (during aim):', collections.Counter(HOW.get(r['how'], r['how']) for r in late).most_common())
    print('  by phase:', collections.Counter(r['phase'] for r in allr).most_common())
    (OUT / 'udiestats.json').write_text(json.dumps(allr))
asyncio.run(main())
