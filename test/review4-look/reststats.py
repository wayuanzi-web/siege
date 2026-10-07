"""統計回合結束時靜止狀態的怪樣子（兵懸空、站在邊角、卡進磚裡；磚懸空）。 python3 test/review4-look/reststats.py --levels=1,2,3,4,5,6 --seeds=1,2,3 --bot=casual"""
import asyncio, sys, json, pathlib, time, collections
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '1,2,3,4,5,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1,2,3').split(',')]; bot = opt.get('bot', 'casual')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    tot = collections.Counter(); ends = 0; uchecks = 0; allr = []; turnsWith = collections.Counter()
    async with Game(844, 390, scale=1, save=save) as g:
        await g.sec(0.5); await g.js(pathlib.Path(__file__).with_name('hook_rest.js').read_text())
        for lvl in levels:
            for seed in seeds:
                await g.js(START, start_args(lvl, seed, bot)); await g.until("G.mode === 'result'", max_sec=500, step=4)
                st = await g.state(); r = await g.js('window.__hookResult()')
                ends += r['ends']; uchecks += r['unitChecks']
                c = collections.Counter(f[0] for rec in r['recs'] for f in rec['flags']); tot.update(c)
                for rec in r['recs']:
                    rec['seed'] = seed; allr.append(rec)
                    for k in set(f[0] for f in rec['flags']): turnsWith[k] += 1
                print(f"L{lvl} seed{seed}: {st['state']} r{st['round']} turn-ends {r['ends']} flags {dict(c)}", flush=True)
                for rec in r['recs']:
                    fl = [f for f in rec['flags'] if f[0] in ('U_AIR', 'U_EDGE', 'U_PEN', 'U_ONUNIT', 'B_FLOAT')]
                    if fl: print('      t', rec['t'], 'r', rec['round'], rec['next'], fl[:4], flush=True)
                await g.js("window.__qp.goHome()"); await g.pump(10)
    (OUT / 'reststats.json').write_text(json.dumps(allr))
    print(f'TOTAL turn-ends {ends}, unit checks {uchecks}; flags (count of unit/block instances): {dict(tot)}')
    print('turn-ends with at least one:', {k: f'{v} ({100 * v / max(1, ends):.0f}%)' for k, v in turnsWith.items()})
asyncio.run(main())
