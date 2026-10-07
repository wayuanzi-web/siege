"""review4：輸掉的流程。用很爛的打法（亂拖）連輸同一關幾場，看：城樓失守的橫幅、垮城演出、結算畫面（沒有星星、提示文字）、按「再戰」、連輸三場之後有沒有提醒調難度。
   python3 test/review4-look/lose4.py --size=844x390 --lvl=3 --n=3 --tag=LOSE"""
import asyncio, sys, json, pathlib, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT, parse_opts, upright
from layout4 import LAYOUT
import play4

async def main():
    args, opt = parse_opts(sys.argv[1:])
    W, H = [int(x) for x in opt.get('size', '844x390').split('x')]; lvl = int(opt.get('lvl', 3)); n = int(opt.get('n', 3)); tag = opt.get('tag', 'LOSE')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': False, 'seenSh': False, 'diff': int(opt.get('diff', 1)), 'flip': False}
    async with Game(W, H, scale=2, save=save) as g:
        await g.sec(1.0)
        select = True
        for k in range(n):
            t0 = time.time()
            out, rec = await play4.play_level(g, lvl, f'{tag}{k + 1}', 'bad', 40 + k, 400, select=select)
            res = out.get('result', {})
            print(json.dumps({'try': k + 1, 'state': out['state'], 'round': out['round'], 'sec': out['sec'], 'title': res.get('title'), 'starsHidden': res.get('starsHidden'), 'coins': res.get('coins'), 'tip': res.get('tip'), 'next': res.get('next'), 'again': res.get('again'), 'bar': res.get('bar'), 'flags': list(out.get('flags', {}).values())[:6], 'msgs': out['msgs'][-3:]}, ensure_ascii=False), f'{time.time() - t0:.0f}s', flush=True)
            lay = await g.js(LAYOUT); print('   result layout flags:', lay['flags'], 'small:', [s for s in lay['small'] if s[1] < 10.4])
            if out.get('mode') != 'result': break
            ok, st = await play4.after_result(g, tag, lvl, out, 'again'); select = False
            print('   again ->', ok, st['mode'], st['phase'], 'idx', await g.js('window.__qp.S.idx'), 'lossN', await g.js('window.__qp.G.lossN'))
        print('console:', g.msgs[:8])
asyncio.run(main())
