"""review5 第 8(b)(c) 項：倍增之後幾十發一起爆、火藥桶連環爆的時候，畫面會不會整片白掉看不到城怎麼垮；被炸過的磚會不會黑成一團。
   新舊兩版各跑幾場（自動玩家、真的迴圈）。每一格把畫布縮小讀回來，量「被打的那座城的範圍裡，接近全白的像素佔幾成」；
   以一輪砲擊為單位記下：爆了幾下、白掉的比例最高到多少、超過 25%／40% 的格數（白了多久）。只比「一輪爆 15 下以上」的大場面。
   另外各截幾張：短時間內爆很多下的那一刻（看城還看不看得到）、第一次有磚被燻到最黑的時候。
   python3 test/review5-look/flash5.py --levels=4,5,6 --seeds=1,2 [--old=<舊版 index.html>]"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
import q4
from start4 import START, start_args
from q4 import Game, parse_opts, label, sheet
OUT = HERE.parent.parent / 'shots' / 'review5'

HOOK = r"""
(() => {
  const q = window.__qp, S = q.S, G = q.G, V = q.V, FX = q.FX, W = 106, H = 49;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d', { willReadFrequently: true });
  const vol = []; let cur = null, booms = [], want = [], sootDone = false, burstShots = 0, lastBurst = -9;
  window.__want = () => { const w = want; want = []; return w; };
  window.__hook = () => {
    if (S.on && !S.on.__w7) { const o = S.on; S.on = function (t, a, b, c) { if (t === 'boom' && cur) { cur.booms++; booms.push(S.time); } return o.apply(this, arguments); }; S.on.__w7 = 1; }
    if (G.mode !== 'play' || S.state !== 'play') { if (cur) { vol.push(cur); cur = null; } return; }
    const ph = S.phase, active = ph === 'volley' || ph === 'resolve';
    if (active) {
      if (!cur || cur.turn !== S.turn || cur.round !== S.round) { if (cur) vol.push(cur); cur = { lvl: S.idx + 1, round: S.round, turn: S.turn, booms: 0, maxW: 0, f25: 0, f40: 0, n: 0, maxGlare: 0, maxWAll: 0 }; }
      const st = S.st[1 - S.turn], k = W / V.W;
      cx.drawImage(q.RD.cv, 0, 0, W, H); const d = cx.getImageData(0, 0, W, H).data;
      const x0 = Math.max(0, Math.floor(((st.x0 - 4 - 56) * V.s + V.cx) * k)), x1 = Math.min(W, Math.ceil(((st.x1 + 4 - 56) * V.s + V.cx) * k)), y0 = Math.max(0, Math.floor((V.gy - (st.y1 + 6) * V.s) * k)), y1 = Math.min(H, Math.ceil(V.gy * k));
      let w = 0, n = 0, wa = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, white = d[i] > 232 && d[i + 1] > 222 && d[i + 2] > 195; if (white) wa++; if (x >= x0 && x < x1 && y >= y0 && y < y1) { n++; if (white) w++; } }
      const f = n ? w / n : 0; cur.n++; if (f > cur.maxW) cur.maxW = f; if (f > 0.25) cur.f25++; if (f > 0.4) cur.f40++; if ((FX.glare || 0) > cur.maxGlare) cur.maxGlare = FX.glare || 0; if (wa / (W * H) > cur.maxWAll) cur.maxWAll = wa / (W * H);
      while (booms.length && S.time - booms[0] > 0.3) booms.shift();
      if (booms.length >= 12 && S.time - lastBurst > 6 && burstShots < 2) { lastBurst = S.time; burstShots++; want.push('burst: ' + booms.length + ' explosions in 0.3 s, white ' + Math.round(f * 100) + '% of castle area'); }
    } else if (cur) { vol.push(cur); cur = null; }
    if (!sootDone && (S.frame & 15) === 0) { let m = 0, n9 = 0; for (const b of S.blocks) { if (b.dead || b.frag || !b.inPlace) continue; let s = b.soot || 0; if (b.sootS) for (const v of b.sootS) if (v > s) s = v; if (s > m) m = s; if (s >= 0.9) n9++; } if (n9 >= 3 && ph === 'aim') { sootDone = true; want.push('soot: ' + n9 + ' blocks still in place with soot >= 0.9 (max ' + m.toFixed(2) + ')'); } }
  };
  window.__hookResult = () => { if (cur) { vol.push(cur); cur = null; } const r = vol.slice(); vol.length = 0; sootDone = false; burstShots = 0; lastBurst = -9; return r; };
})();
"""

async def run(build, page, levels, seeds, bot):
    q4.PAGE = pathlib.Path(page)
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    vols = []; tiles = []
    async with Game(844, 390, scale=1.5, save=save) as g:
        await g.sec(0.5); await g.pg.add_style_tag(content='#say,#hint,#mile,#banner{display:none!important}')
        for lvl in levels:
            for seed in seeds:
                await g.js(HOOK); await g.js(START, start_args(lvl, seed, bot))
                while True:
                    done = await g.until("G.mode === 'result' || (window.__wantN = (window.__wantQ = (window.__wantQ || []).concat(window.__want())).length) > 0", max_sec=500, step=1)
                    st = await g.state()
                    if st['mode'] == 'result' or not done: break
                    why = await g.js("() => { const w = window.__wantQ; window.__wantQ = []; return w; }")
                    im = await g.shot(None); label(im, f"{build} L{lvl} seed{seed} t{st['t']} r{st['round']} {st['phase']}{st['turn']}", ' | '.join(why)[:110]); tiles.append(im)
                r = await g.js('window.__hookResult()'); vols += [dict(v, seed=seed) for v in r]
                print(build, 'L', lvl, 'seed', seed, st['state'], 'r', st['round'], 'volleys', len(r), flush=True)
                await g.js("window.__qp.goHome()"); await g.pump(10)
        print(build, 'console:', g.msgs[:3])
    return vols, tiles

def summ(build, vols):
    big = [v for v in vols if v['booms'] >= 15]
    if not big: print(build, 'no big volleys'); return
    mean = lambda xs: sum(xs) / max(1, len(xs))
    print(f"{build}: volleys {len(vols)}, big (>=15 explosions) {len(big)}: explosions per big volley mean {mean([v['booms'] for v in big]):.0f} max {max(v['booms'] for v in big)}; "
          f"peak white share of the target castle area: mean {100 * mean([v['maxW'] for v in big]):.0f}% max {100 * max(v['maxW'] for v in big):.0f}%; "
          f"frames with >25% white per big volley: mean {mean([v['f25'] for v in big]):.1f} max {max(v['f25'] for v in big)}; >40% white: mean {mean([v['f40'] for v in big]):.1f} max {max(v['f40'] for v in big)}; "
          f"big volleys with >=6 frames (0.1 s) over 40% white: {sum(1 for v in big if v['f40'] >= 6)} ({100 * sum(1 for v in big if v['f40'] >= 6) / len(big):.0f}%)")
    for lvl in sorted(set(v['lvl'] for v in big)):
        b = [v for v in big if v['lvl'] == lvl]; print(f"    L{lvl}: big volleys {len(b)}, peak white mean {100 * mean([v['maxW'] for v in b]):.0f}% max {100 * max(v['maxW'] for v in b):.0f}%, >40%-white frames mean {mean([v['f40'] for v in b]):.1f} max {max(v['f40'] for v in b)}")

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '4,5,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1,2').split(',')]; bot = opt.get('bot', 'expert')
    builds = [('new', str(HERE.parent.parent / 'src' / 'dist' / 'index.html'))]
    if 'old' in opt: builds.append(('old', opt['old']))
    res = {}; alltiles = []
    for build, page in builds:
        vols, tiles = await run(build, page, levels, seeds, bot); res[build] = vols; alltiles += tiles
        if tiles: sheet(tiles, 3, max_w=2400).save(OUT / f'flash5_{build}.png'); print('saved', OUT / f'flash5_{build}.png', len(tiles), 'tiles')
    (OUT / 'flash5.json').write_text(json.dumps(res))
    for build in res: summ(build, res[build])
asyncio.run(main())
