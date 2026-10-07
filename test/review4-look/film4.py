"""review4：在「真的每一格迴圈」裡拍一段（自動玩家對打，假時鐘），裁出一座城排成一張表。跟 turnstats.py 用同一種種子，所以它找到的回合可以直接拍。
   python3 test/review4-look/film4.py <關卡> <種子> --until="<JS 條件>" [--bot=casual] [--n=16] [--every=6] [--cam=0|1|mid|full] [--crop=x0,y0,x1,y1] [--name=...] [--cols=4] [--clean=1] [--pre=<JS>]
   --until 成立的那一格開始拍，每 every 格拍一張，共 n 張。頁面裡有 q=__qp, S, G。"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts, label, sheet
from PIL import Image

async def main():
    args, opt = parse_opts(sys.argv[1:])
    lvl = int(args[0]); seed = int(args[1]); bot = opt.get('bot', 'casual'); n = int(opt.get('n', 16)); every = int(opt.get('every', 6)); cols = int(opt.get('cols', 4))
    name = opt.get('name', f'f4_L{lvl}_s{seed}')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': int(opt.get('diff', 1)), 'flip': False}
    W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
    async with Game(W, H, scale=2, save=save) as g:
        await g.sec(0.5)
        if opt.get('clean', '1') == '1': await g.pg.add_style_tag(content='#say,#hint,#mile,#banner{display:none!important}')
        await g.js(START, start_args(lvl, seed, bot))
        if 'pre' in opt: await g.js("(code) => { const q = window.__qp, S = q.S, G = q.G; (new Function('q', 'S', 'G', code))(q, S, G); }", opt['pre'])
        ok = await g.until(opt.get('until', "S.phase === 'resolve'"), max_sec=float(opt.get('maxsec', 400)), step=1)
        st = await g.state()
        if not ok: print('condition never became true; state', st['state'], 'round', st['round'], st['phase']); return
        v = await g.js("(() => { const q = window.__qp, V = q.V, S = q.S; return {s: V.s / V.dpr, cx: V.cx / V.dpr, gy: V.gy / V.dpr, st: S.st.map((t) => [t.x0, t.y0, t.x1, t.y1])}; })()")
        cam = opt.get('cam', '1')
        if 'crop' in opt: wx0, wy0, wx1, wy1 = [float(x) for x in opt['crop'].split(',')]
        elif cam == 'full': wx0, wy0, wx1, wy1 = -20, -8, 132, 58
        elif cam == 'mid': wx0, wy0, wx1, wy1 = 34, -8, 78, 52
        else:
            t = v['st'][int(cam)]; wx0, wy0, wx1, wy1 = (t[0] - 12, -7, t[2] + 12, t[3] + 12)
        X = lambda wx: (wx - 56) * v['s'] + v['cx']; Y = lambda wy: v['gy'] - wy * v['s']
        clip = {'x': max(0, round(X(wx0))), 'y': max(0, round(Y(wy1))), 'width': 0, 'height': 0}
        clip['width'] = min(W, round(X(wx1))) - clip['x']; clip['height'] = min(H, round(Y(wy0))) - clip['y']
        tiles = []; rows = []
        t0 = st['t']
        for i in range(n):
            s2 = await g.state()
            im = await g.shot(None, clip=clip)
            label(im, f"#{i + 1} t{s2['t']:.2f} (+{s2['t'] - t0:.2f}) r{s2['round']} {s2['phase']}{s2['turn']} me{s2['me']} foe{s2['foe']} {s2['a0']}/{s2['a1']}", s2['chip'][:20])
            tiles.append(im); rows.append((round(s2['t'] - t0, 2), s2['phase'], s2['turn'], s2['me'], s2['foe']))
            await g.pump(every)
        out = sheet(tiles, cols, max_w=int(opt.get('maxw', 2400))); f = OUT / f'{name}.png'; out.save(f)
        print(name, 'L', lvl, 'seed', seed, 'start t', t0, 'saved', f, out.size, 'rows', rows[:3], '...', rows[-1], 'msgs', g.msgs[:3])
asyncio.run(main())
