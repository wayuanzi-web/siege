"""review5 第 1 項：煙、塵有沒有畫在該在的位置。
   自動玩家對打（真的每一格迴圈、假時鐘），在「煙塵和碎屑同時很多」的時刻做三件事：
     A/B   同一格畫兩次：(A) 粒子照原本的順序；(B) 把煙塵全部排到最前面。兩張應該一模一樣（上一版差很多：煙會吃到碎屑的旋轉座標）
     probe 在粒子陣列的最後面（所有碎屑之後）塞一顆大的煙，量它實際被畫在哪：應該正好在指定的戰場座標上
     看圖  把 A 存成一張表（shots/review5/fx5_<tag>.png），親眼看有沒有飄在不相干地方的灰色圓盤
   python3 test/review5-look/fx5.py --levels=2,4,6 --seeds=1 --bot=expert [--per=3] [--tag=a]"""
import asyncio, sys, json, pathlib, io
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from start4 import START, start_args
from q4 import Game, parse_opts, label, sheet
from PIL import Image, ImageChops
OUT = HERE.parent.parent / 'shots' / 'review5'

COUNT = "(() => { const FX = window.__qp.FX; let sd = 0, deb = 0; for (let i = 0; i < FX.n; i++) { const t = FX.type[i]; if (t === 1 || t === 6) sd++; else if (t === 2 || t === 5 || t === 7) deb++; } return [sd, deb, FX.n, window.__qp.FX.flung.length]; })()"
# 畫一次（固定亂數，天氣粒子不會兩次不一樣）；mode: 'A' 原順序、'B' 煙塵排前面、'P' 最後面多塞一顆煙、'P0' 同 P 但不塞（對照）
RENDER = r"""
([mode, px, py]) => {
  const q = window.__qp, FX = q.FX, n = FX.n, keys = ['x', 'y', 'vx', 'vy', 'life', 'max', 'size', 'rot', 'vr', 'type', 'col'];
  const keepRnd = Math.random; let s = 12345; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const shx = FX.shx, shy = FX.shy; FX.shx = 0; FX.shy = 0;
  // 畫圖的過程自己也會生粒子（火箭尾煙、著火的磚冒煙、地火的火星）：每次都從同一個 RD.frame、同一串亂數開始，畫完把多出來的粒子丟掉
  if (window.__f0 === undefined || window.__f0t !== q.S.time) { window.__f0 = q.RD.frame; window.__f0t = q.S.time; }
  q.RD.frame = window.__f0;
  let info = { n };
  if (mode === 'B') {
    const idx = []; for (let i = 0; i < n; i++) if (FX.type[i] === 1 || FX.type[i] === 6) idx.push(i);
    info.nsd = idx.length; for (let i = 0; i < n; i++) if (!(FX.type[i] === 1 || FX.type[i] === 6)) idx.push(i);
    const keep = {}; for (const k of keys) { keep[k] = FX[k].slice(0, n); for (let j = 0; j < n; j++) FX[k][j] = keep[k][idx[j]]; }
    q.renderFrame(0, 0); FX.n = n;
    for (const k of keys) FX[k].set(keep[k]);
  } else if (mode === 'P') {
    const i = n; FX.x[i] = px; FX.y[i] = py; FX.vx[i] = 0; FX.vy[i] = 0; FX.life[i] = 1; FX.max[i] = 1; FX.size[i] = 3; FX.rot[i] = 0; FX.vr[i] = 0; FX.type[i] = 1; FX.col[i] = 0; FX.n = n + 1;
    q.renderFrame(0, 0); FX.n = n;
    const V = q.V; info.expect = [((px - 56) * V.s + V.cx) / V.dpr, (V.gy - py * V.s) / V.dpr, 3 * V.s * 0.8 / V.dpr];
  } else { q.renderFrame(0, 0); FX.n = n; }
  FX.shx = shx; FX.shy = shy; Math.random = keepRnd;
  return info;
}
"""

def diffstat(a, b):
    d = ImageChops.difference(a, b).convert('L'); bb = d.point(lambda v: 255 if v > 12 else 0).getbbox()
    hist = d.histogram(); npx = sum(hist[13:]); mx = max(i for i, h in enumerate(hist) if h)
    return npx, mx, bb, d

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '2,4,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1').split(',')]; bot = opt.get('bot', 'expert'); per = int(opt.get('per', 3)); tag = opt.get('tag', 'a')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    tiles = []; rows = []
    async with Game(844, 390, scale=1.5, save=save) as g:
        await g.sec(0.5); await g.pg.add_style_tag(content='#say,#hint,#mile,#banner{display:none!important}')
        for lvl in levels:
            for seed in seeds:
                await g.js(START, start_args(lvl, seed, bot)); got = 0; tlast = -9
                while got < per:
                    ok = await g.until((f"G.mode === 'result' || (S.time > {tlast + 0.5} && S.state !== 'play' && G.endT > 1.7 && G.endT < 2.6 && (() => {{" if 'finale' in opt else f"G.mode === 'result' || (S.time > {tlast + 4} && (() => {{") + f""" const FX = q.FX; let sd = 0, deb = 0; for (let i = 0; i < FX.n; i++) {{ const t = FX.type[i]; if (t === 1 || t === 6) sd++; else if (t === 2 || t === 5 || t === 7) deb++; }} return sd >= 14 && deb >= 12; }})())""", max_sec=400, step=1)
                    st = await g.state()
                    if st['mode'] == 'result' or not ok: break
                    tlast = st['t']; got += 1
                    cnt = await g.js(COUNT)
                    await g.js(RENDER, ['A', 0, 0]); a = await g.shot(None)
                    info = await g.js(RENDER, ['B', 0, 0]); b = await g.shot(None)
                    npx, mx, bb, _ = diffstat(a, b)
                    # 探針：戰場正中間的空中 (56, 38)
                    await g.js(RENDER, ['A', 0, 0]); p0 = await g.shot(None)
                    pinfo = await g.js(RENDER, ['P', 56, 38]); p1 = await g.shot(None)
                    n2, mx2, bb2, dimg = diffstat(p0, p1)
                    cen = None
                    if bb2:
                        k = 1.5; cen = [round((bb2[0] + bb2[2]) / 2 / k, 1), round((bb2[1] + bb2[3]) / 2 / k, 1), round((bb2[2] - bb2[0]) / 2 / k, 1)]
                    await g.js(RENDER, ['A', 0, 0])
                    exp = [round(v, 1) for v in pinfo['expect']]
                    okp = bool(cen) and abs(cen[0] - exp[0]) < 2.5 and abs(cen[1] - exp[1]) < 2.5
                    rows.append({'lvl': lvl, 'seed': seed, 't': st['t'], 'phase': st['phase'] + str(st['turn']), 'smokeDust': cnt[0], 'debris': cnt[1], 'flung': cnt[3], 'AB_diff_px': npx, 'AB_max': mx, 'AB_bbox': bb, 'probe_expect': exp, 'probe_drawn': cen, 'probe_ok': okp})
                    print(json.dumps(rows[-1]), flush=True)
                    label(a, f"L{lvl} seed{seed} t={st['t']} {st['phase']}{st['turn']}  smoke+dust {cnt[0]} debris {cnt[1]}", f"A/B diff px {npx} (max {mx}); probe {'OK' if okp else 'OFF ' + str(cen) + ' vs ' + str(exp)}")
                    tiles.append(a)
                await g.js("window.__qp.goHome()"); await g.pump(10)
        print('console:', g.msgs[:5])
    if tiles:
        out = sheet(tiles, int(opt.get('cols', 2)), max_w=2400); f = OUT / f'fx5_{tag}.png'; out.save(f); print('saved', f, out.size)
    bad = [r for r in rows if r['AB_diff_px'] > 0 or not r['probe_ok']]
    print(f"{len(rows)} busy frames checked; A/B identical in {sum(1 for r in rows if r['AB_diff_px'] == 0)}; probe drawn in place in {sum(1 for r in rows if r['probe_ok'])}; problems: {len(bad)}")
asyncio.run(main())
