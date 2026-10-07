"""A/B：同一格畫面，(A) 遊戲照現在的樣子畫；(B) 只把粒子陣列重新排一下（煙、塵排到最前面，不會吃到碎屑留下來的旋轉座標）再畫一次。
   兩張的差別就是 fxDraw 沒把座標還原造成的：B 才是煙塵本來該在的位置。
   python3 test/review4-look/ab_fxorder.py <關卡> <種子> <t1,t2,...> [--bot=expert]"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, parse_opts, label
from PIL import Image

REORDER = r"""
() => {
  const q = window.__qp, FX = q.FX, n = FX.n, keys = ['x', 'y', 'vx', 'vy', 'life', 'max', 'size', 'rot', 'vr', 'type', 'col'];
  const idx = []; for (let i = 0; i < n; i++) if (FX.type[i] === 1 || FX.type[i] === 6) idx.push(i);
  const nsd = idx.length; for (let i = 0; i < n; i++) if (!(FX.type[i] === 1 || FX.type[i] === 6)) idx.push(i);
  const keep = {}; for (const k of keys) { keep[k] = FX[k].slice(0, n); for (let j = 0; j < n; j++) FX[k][j] = keep[k][idx[j]]; }
  q.renderFrame(0, 0);
  window.__keepFX = keep; return { n, nsd };
}
"""
RESTORE = "() => { const q = window.__qp, FX = q.FX, keep = window.__keepFX; for (const k in keep) FX[k].set(keep[k]); q.renderFrame(0, 0); }"

async def main():
    args, opt = parse_opts(sys.argv[1:])
    lvl = int(args[0]); seed = int(args[1]); times = [float(x) for x in args[2].split(',')]; bot = opt.get('bot', 'expert')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    async with Game(844, 390, scale=2, save=save) as g:
        await g.sec(0.5)
        await g.pg.add_style_tag(content='#say,#hint,#mile,#banner{display:none!important}')
        await g.js(START, start_args(lvl, seed, bot))
        rows = []
        for t in times:
            await g.until(f"S.time >= {t}", max_sec=200, step=1)
            st = await g.state()
            a = await g.shot(None)
            info = await g.js(REORDER)
            b = await g.shot(None)
            await g.js(RESTORE)
            label(a, f"A (as shipped)  L{lvl} seed{seed} t={st['t']} {st['phase']}{st['turn']}"); label(b, f"B (same frame, smoke/dust drawn first)  particles {info['n']}, smoke+dust {info['nsd']}")
            rows.append((a, b)); print(lvl, seed, st['t'], st['phase'], info)
        w, h = rows[0][0].size
        out = Image.new('RGB', (w * 2 + 6, (h + 6) * len(rows) - 6), (0, 0, 0))
        for i, (a, b) in enumerate(rows): out.paste(a, (0, i * (h + 6))); out.paste(b, (w + 6, i * (h + 6)))
        out = out.resize((out.size[0] // 2, out.size[1] // 2), Image.LANCZOS)
        f = OUT / f'ab_fxorder_L{lvl}_s{seed}.png'; out.save(f); print('saved', f, out.size)
asyncio.run(main())
