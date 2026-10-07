"""跑幾場自動玩家的完整對戰（真的每一格迴圈），統計回合是怎麼結束的。 python3 test/review4-look/turnstats.py --levels=1,2,3,4,5,6 --seeds=1,2,3 [--bot=casual]"""
import asyncio, sys, json, pathlib, time, collections
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '1,2,3,4,5,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1,2').split(',')]; bot = opt.get('bot', 'casual')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    allrec = []
    async with Game(844, 390, scale=1, save=save) as g:
        await g.sec(0.5)
        await g.js(pathlib.Path(__file__).with_name('hook_turns.js').read_text())
        for lvl in levels:
            for seed in seeds:
                t0 = time.time()
                await g.js(START, start_args(lvl, seed, bot))
                await g.until("G.mode === 'result'", max_sec=500, step=4)
                st = await g.state(); recs = await g.js('window.__hookResult()')
                for r in recs: r['seed'] = seed
                allrec += recs
                caps = [r for r in recs if r['how'] == 'cap']
                print(f"L{lvl} seed{seed} {bot}: {st['state']} r{st['round']} t{st['t']}  turns={len(recs)} cap={len(caps)} medianWait={sorted(r['waited'] for r in recs)[len(recs) // 2] if recs else 0} maxWait={max((r['waited'] for r in recs), default=0)}  {time.time() - t0:.0f}s", flush=True)
                for r in recs:
                    if r['how'] == 'cap' or r.get('movedAfter', 0) > 1.5 or r['idleBefore'] > 1.6: print('    ', json.dumps(r, ensure_ascii=False), flush=True)
                await g.js("window.__qp.goHome()"); await g.pump(20)
    (OUT / 'turnstats.json').write_text(json.dumps(allrec))
    norm = [r for r in allrec if not r['to'].startswith('hazard')]
    late = [r for r in norm if r.get('movedAfter', 0) > 1.0 and 'm6s2' not in r.get('movedWho', '')]
    print(f"turn-ends excluding resolve->hazard: {len(norm)}; in-castle piece/unit moved >1.0 unit during the following aim phase (<=2 s): {len(late)} ({100 * len(late) / max(1, len(norm)):.1f}%)")
    for r in late: print('   LATE', json.dumps(r, ensure_ascii=False))
    n = len(allrec); cap = [r for r in allrec if r['how'] == 'cap']; mv = [r for r in allrec if r.get('movedAfter', 0) > 1.5]; mv3 = [r for r in allrec if r.get('movedAfter', 0) > 3.4]; idle = [r for r in allrec if r['idleBefore'] > 1.6]
    print(f'TOTAL turn-ends {n}: by cap {len(cap)} ({100 * len(cap) / max(1, n):.0f}%), something moved >1.5 units within 2 s after the end {len(mv)} ({100 * len(mv) / max(1, n):.0f}%), >3.4 units (one cell) {len(mv3)} ({100 * len(mv3) / max(1, n):.0f}%), idle >1.6 s before end {len(idle)} ({100 * len(idle) / max(1, n):.0f}%)')
    w = sorted(r['waited'] for r in allrec); print('wait after volley (s): median', w[n // 2], 'p90', w[int(n * 0.9)], 'max', w[-1])
    byl = collections.defaultdict(list)
    for r in allrec: byl[r['lvl']].append(r)
    for l, rs in sorted(byl.items()): print(f"  L{l}: turn-ends {len(rs)}, cap {sum(1 for r in rs if r['how'] == 'cap')}, movedAfter>1.5: {sum(1 for r in rs if r.get('movedAfter', 0) > 1.5)}, >3.4: {sum(1 for r in rs if r.get('movedAfter', 0) > 3.4)}, idle>1.6: {sum(1 for r in rs if r['idleBefore'] > 1.6)}")
asyncio.run(main())
