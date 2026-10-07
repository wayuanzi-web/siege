"""統計「回合結束之後，被打的那座城自己又動」有多常見。 python3 test/review4-look/latestats.py --levels=1,2,3,4,5,6 --seeds=1,2,3 --bot=casual"""
import asyncio, sys, json, pathlib, time, collections
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '1,2,3,4,5,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1,2,3').split(',')]; bot = opt.get('bot', 'casual')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    allr = []
    async with Game(844, 390, scale=1, save=save) as g:
        await g.sec(0.5); await g.js(pathlib.Path(__file__).with_name('hook_late.js').read_text())
        for lvl in levels:
            for seed in seeds:
                t0 = time.time()
                await g.js(START, start_args(lvl, seed, bot)); await g.until("G.mode === 'result'", max_sec=500, step=4)
                st = await g.state(); recs = await g.js('window.__hookResult()')
                for r in recs: r['seed'] = seed
                allr += recs
                clean = [r for r in recs if not r['hazard']]
                late = [r for r in clean if r['maxMove'] > 1.0 and r['startedAt'] > 0.3]
                print(f"L{lvl} seed{seed}: {st['state']} r{st['round']} windows {len(recs)} (no-hazard {len(clean)}), late movers>1.0: {len(late)}  {time.time() - t0:.0f}s", flush=True)
                for r in late: print('     ', json.dumps(r, ensure_ascii=False), flush=True)
                await g.js("window.__qp.goHome()"); await g.pump(10)
    (OUT / 'latestats.json').write_text(json.dumps(allr))
    clean = [r for r in allr if not r['hazard']]; n = len(clean)
    for th in (0.5, 1.0, 3.4):
        l = [r for r in clean if r['maxMove'] > th and r['startedAt'] > 0.3]
        print(f'windows without hazard {n}: something in the castle moved > {th} starting >0.3 s after the turn ended: {len(l)} ({100 * len(l) / max(1, n):.1f}%)')
    d = [r for r in clean if r['deaths']]; print('windows with a death in that castle after the turn ended:', len(d), [(r['lvl'], r['seed'], r['round'], r['castle'], r['deaths']) for r in d][:12])
    byl = collections.defaultdict(list)
    for r in clean: byl[r['lvl']].append(r)
    for l, rs in sorted(byl.items()): print(f"  L{l}: windows {len(rs)}, >1.0: {sum(1 for r in rs if r['maxMove'] > 1.0 and r['startedAt'] > 0.3)}, >3.4: {sum(1 for r in rs if r['maxMove'] > 3.4 and r['startedAt'] > 0.3)}; by castle 0/1: {sum(1 for r in rs if r['maxMove'] > 1.0 and r['startedAt'] > 0.3 and r['castle'] == 0)}/{sum(1 for r in rs if r['maxMove'] > 1.0 and r['startedAt'] > 0.3 and r['castle'] == 1)}")
    w = sorted(r['window'] for r in clean); print('window length median', w[len(w) // 2] if w else None)
asyncio.run(main())
