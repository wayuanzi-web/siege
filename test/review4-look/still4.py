"""review4：把自動玩家的對戰（真的迴圈、跟 *stats.py 同一種種子）跑到某個時刻，在某個位置附近裁一張放大的截圖。多個場景排成一張。
   python3 test/review4-look/still4.py --name=rest_cases "lvl,seed,t,x,y[,r[,label]]" ...   （r：半徑，戰場單位，預設 9）"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts, label
from PIL import Image

async def main():
    args, opt = parse_opts(sys.argv[1:]); bot = opt.get('bot', 'casual'); name = opt.get('name', 'still4')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    cases = []
    for a in args:
        v = a.split(','); cases.append((int(v[0]), int(v[1]), float(v[2]), float(v[3]), float(v[4]), float(v[5]) if len(v) > 5 and v[5] else 9.0, v[6] if len(v) > 6 else ''))
    tiles = []
    async with Game(844, 390, scale=3, save=save) as g:
        await g.sec(0.5); await g.pg.add_style_tag(content='#say,#hint,#mile,#banner{display:none!important}')
        cur = None
        for (lvl, seed, t, x, y, r, lab) in sorted(cases, key=lambda c: (c[0], c[1], c[2])):
            if cur != (lvl, seed) or (await g.state())['t'] > t:
                await g.js(START, start_args(lvl, seed, bot)); cur = (lvl, seed)
            await g.until(f"S.time >= {t} || G.mode === 'result'", max_sec=300, step=1)
            if 'settle' in opt: await g.pump(int(opt['settle']))
            st = await g.state()
            v = await g.js("(() => { const q = window.__qp, V = q.V; return {s: V.s / V.dpr, cx: V.cx / V.dpr, gy: V.gy / V.dpr}; })()")
            X = lambda wx: (wx - 56) * v['s'] + v['cx']; Y = lambda wy: v['gy'] - wy * v['s']
            x0 = max(0, X(x - r)); y0 = max(0, Y(y + r)); x1 = min(844, X(x + r)); y1 = min(390, Y(y - r * 0.8))
            im = await g.shot(None, clip={'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0})
            im = im.resize((480, round(im.size[1] * 480 / im.size[0])), Image.LANCZOS)
            label(im, f"L{lvl} seed{seed} t{st['t']} r{st['round']} {st['phase']}{st['turn']}", lab or f"({x},{y})")
            tiles.append(im); print(lvl, seed, st['t'], st['phase'], st['state'], lab)
    h = max(t.size[1] for t in tiles); cols = int(opt.get('cols', 4)); rows = (len(tiles) + cols - 1) // cols
    out = Image.new('RGB', (486 * cols - 6, (h + 6) * rows - 6), (0, 0, 0))
    for i, t in enumerate(tiles): out.paste(t, ((i % cols) * 486, (i // cols) * (h + 6)))
    f = OUT / f'{name}.png'; out.save(f); print('saved', f, out.size)
asyncio.run(main())
