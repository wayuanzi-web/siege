"""review5：第三關跑很多場（自動玩家、真的迴圈），掛 hook_l3.js，結果完整存成 shots/review5/l3_<bot>.json。
   python3 test/review5-look/l3run.py --bot=expert --seeds=11,12,13"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from start4 import START, start_args
from q4 import Game, parse_opts
OUT = HERE.parent.parent / 'shots' / 'review5'
async def main():
    args, opt = parse_opts(sys.argv[1:]); bot = opt.get('bot', 'expert'); seeds = [int(x) for x in opt.get('seeds', '11,12,13').split(',')]
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    res = []
    async with Game(844, 390, scale=1, save=save) as g:
        await g.sec(0.5); await g.js((HERE / 'hook_l3.js').read_text())
        for seed in seeds:
            await g.js(START, start_args(3, seed, bot)); await g.until("G.mode === 'result'", max_sec=500, step=4)
            st = await g.state(); r = await g.js('window.__hookResult()')
            res.append({'seed': seed, 'bot': bot, 'state': st['state'], 'round': st['round'], 'r': r}); print(seed, st['state'], st['round'], flush=True)
            await g.js("window.__qp.goHome()"); await g.pump(10)
    (OUT / f'l3_{bot}.json').write_text(json.dumps(res))
asyncio.run(main())
