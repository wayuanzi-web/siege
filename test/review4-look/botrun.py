"""用自動玩家快速跑完整場（真的每一格迴圈＋假時鐘），掛一個 hook，印出 hook 的結果。
   python3 test/review4-look/botrun.py --levels=4,2 --seeds=1,2,3 --hook=test/review4-look/hook_dust.js [--bot=expert] [--size=844x390] [--maxsec=400]"""
import asyncio, sys, json, pathlib, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts

async def main():
    args, opt = parse_opts(sys.argv[1:])
    W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
    levels = [int(x) for x in opt.get('levels', '1').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1').split(',')]
    bot = opt.get('bot', 'expert'); maxsec = int(opt.get('maxsec', 400))
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': int(opt.get('diff', 1)), 'flip': False}
    async with Game(W, H, scale=float(opt.get('scale', 1)), save=save) as g:
        await g.sec(0.5)
        for lvl in levels:
            for seed in seeds:
                t0 = time.time()
                if 'hook' in opt: await g.js(pathlib.Path(opt['hook']).read_text())
                await g.js(START, start_args(lvl, seed, bot))
                ok = await g.until("G.mode === 'result'", max_sec=maxsec, step=4)
                st = await g.state()
                res = await g.js('window.__hookResult ? window.__hookResult() : null') if 'hook' in opt else None
                print(json.dumps({'lvl': lvl, 'seed': seed, 'bot': bot, 'state': st['state'], 'round': st['round'], 't': st['t'], 'ok': ok, 'msgs': g.msgs[-3:]}, ensure_ascii=False), f'{time.time() - t0:.0f}s', flush=True)
                if res is not None:
                    for r in (res if isinstance(res, list) else [res]): print('   ', json.dumps(r, ensure_ascii=False)[:1500], flush=True)
                await g.js("window.__qp.goHome()"); await g.pump(20)
asyncio.run(main())
