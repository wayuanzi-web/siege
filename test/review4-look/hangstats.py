"""統計回合結束時「重心在支撐點外側卻不動」的磚。 python3 test/review4-look/hangstats.py --levels=1,2,3,4,5,6 --seeds=1,2,3 --bot=casual"""
import asyncio, sys, json, pathlib, time, collections
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '1,2,3,4,5,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1,2,3').split(',')]; bot = opt.get('bot', 'casual')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    ends = 0; endsWith = 0; inst = 0; allr = []; games = 0; gamesWith = 0
    async with Game(844, 390, scale=1, save=save) as g:
        await g.sec(0.5); await g.js(pathlib.Path(__file__).with_name('hook_hang.js').read_text())
        for lvl in levels:
            for seed in seeds:
                await g.js(START, start_args(lvl, seed, bot)); await g.until("G.mode === 'result'", max_sec=500, step=4)
                st = await g.state(); r = await g.js('window.__hookResult()')
                ends += r['ends']; endsWith += len(r['recs']); games += 1; gamesWith += 1 if r['recs'] else 0
                # 同一塊磚連續好幾回合都掛著：只算一次（用位置當鍵）
                seen = {}
                for rec in r['recs']:
                    for f in rec['flags']:
                        key = (f['what'], round(f['x']), round(f['y']))
                        if key not in seen: seen[key] = dict(f, t=rec['t'], round=rec['round'], lvl=lvl, seed=seed, turns=0)
                        seen[key]['turns'] += 1
                inst += len(seen); allr += list(seen.values())
                print(f"L{lvl} seed{seed}: {st['state']} r{st['round']} turn-ends {r['ends']} with-hang {len(r['recs'])} distinct pieces {len(seen)}", flush=True)
                for v in seen.values(): print('      ', json.dumps(v, ensure_ascii=False), flush=True)
                await g.js("window.__qp.goHome()"); await g.pump(10)
    (OUT / 'hangstats.json').write_text(json.dumps(allr))
    big = [v for v in allr if v['over'] > 0.05 and max(float(x) for x in v['what'].split()[3].split('x')) >= 2.0]
    print(f'TOTAL: games {games} (with at least one hanging piece: {gamesWith}); turn-ends {ends}, with a hanging piece {endsWith} ({100 * endsWith / max(1, ends):.0f}%); distinct hanging pieces {inst}; of which a piece at least 2 units long: {len(big)}')
asyncio.run(main())
