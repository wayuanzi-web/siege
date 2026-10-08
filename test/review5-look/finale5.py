"""review5 第 8(a) 項：城破的演出（真的每一格迴圈＋假時鐘，所以慢動作、橫幅、結算畫面跳出來的時機都跟玩家看到的一樣）。
   自動玩家打到分出勝負；從那一刻起每 0.2 秒（真實時間）截一張，直到結算畫面出現後 0.6 秒。裁出垮掉的那座城（含它往前倒的空間）排成一張表。
   同時記下每一張：endT、那座城還有幾塊磚在動（速度 > 1.5）、最高的磚在多高；以及結算畫面跳出來那一刻還有幾塊在動、多少塊還懸在半空。
   python3 test/review5-look/finale5.py "lvl,seed,bot[,lose]" ... [--tag=fin] [--size=844x390]
     lose：讓我方只瞄不打（S.team[0].mute），一定輸，看我方城樓垮。"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from start4 import START, start_args
from q4 import Game, parse_opts, label, sheet
OUT = HERE.parent.parent / 'shots' / 'review5'

PROBE = r"""
(() => { const q = window.__qp, S = q.S, G = q.G, st = S.st[S.loser]; if (!st) return null;
  let alive = 0, moving = 0, top = 0, air = 0, frag = 0;
  for (const b of st.blocks) { if (b.dead) continue; const p = b.body.getPosition(), v = b.body.getLinearVelocity(); if (p.y < -8 || p.x < -12 || p.x > 124) continue; alive++; if (b.frag) frag++; const sp = Math.hypot(v.x, v.y); if (sp > 1.5) moving++; if (sp > 1.5 && p.y > st.y0 + 4) air++; if (p.y > top) top = p.y; }
  return { endT: +G.endT.toFixed(2), t: +S.time.toFixed(2), mode: G.mode, alive, frag, moving, air, top: +top.toFixed(1), slow: +q.FX.slow.toFixed(2), banner: document.getElementById('banner').classList.contains('show') ? document.getElementById('banner').textContent : '', res: !document.getElementById('result').hidden, units: st.units.filter((u) => u.alive).length, fx: q.FX.n };
})()
"""

async def main():
    args, opt = parse_opts(sys.argv[1:]); tag = opt.get('tag', 'fin')
    W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    async with Game(W, H, scale=1.5, save=save) as g:
        await g.sec(0.5); await g.pg.add_style_tag(content='#say,#hint,#mile{display:none!important}')
        for a in args:
            v = a.split(','); lvl = int(v[0]); seed = int(v[1]); bot = v[2]; lose = len(v) > 3 and v[3] == 'lose'
            await g.js(START, start_args(lvl, seed, bot))
            if lose: await g.js("() => { window.__qp.S.team[0].mute = true; }")
            ok = await g.until("S.state !== 'play' || G.mode === 'result'", max_sec=500, step=1)
            st = await g.state()
            if st['state'] == 'play': print(a, 'never ended'); continue
            v0 = await g.js("(() => { const q = window.__qp, V = q.V, S = q.S; return {s: V.s / V.dpr, cx: V.cx / V.dpr, gy: V.gy / V.dpr, st: S.st.map((t) => [t.x0, t.y0, t.x1, t.y1]), loser: S.loser}; })()")
            t = v0['st'][v0['loser']]
            wx0, wx1 = (t[0] - 24, t[2] + 10) if v0['loser'] == 1 else (t[0] - 10, t[2] + 24)
            X = lambda wx: (wx - 56) * v0['s'] + v0['cx']; Y = lambda wy: v0['gy'] - wy * v0['s']
            clip = {'x': max(0, round(X(wx0))), 'y': max(0, round(Y(t[3] + 14))), 'width': 0, 'height': 0}
            clip['width'] = min(W, round(X(wx1))) - clip['x']; clip['height'] = min(H, round(Y(-7))) - clip['y']
            tiles = []; rows = []; after = 0; at_result = None
            for i in range(60):
                p = await g.js(PROBE)
                im = await g.shot(None, clip=clip)
                label(im, f"#{i + 1} endT {p['endT']} slow {p['slow']}  moving {p['moving']} (in air {p['air']}) of {p['alive']}", (p['banner'] + ('  [RESULT SCREEN]' if p['res'] else ''))[:40])
                tiles.append(im); rows.append(p)
                if p['res']:
                    if at_result is None: at_result = p
                    after += 1
                    if after >= 4: break
                await g.pump(12)
            # 表上放 16 格：前面密一點
            n = len(tiles); idx = sorted(set([0, 1, 2, 3, 4, 5, 6, 7, 8] + [round(9 + (n - 10) * k / 6) for k in range(7)])); idx = [k for k in idx if k < n]
            name = f"{tag}_L{lvl}_s{seed}_{bot}{'_lose' if lose else ''}"
            out = sheet([tiles[k] for k in idx], 4, max_w=2200); out.save(OUT / f'{name}.png')
            first_quiet = next((r['endT'] for r in rows if r['moving'] == 0), None)
            print(json.dumps({'case': a, 'state': st['state'], 'round': st['round'], 'loser': v0['loser'], 'frames': n, 'result_at_endT': at_result and at_result['endT'], 'moving_at_result': at_result and at_result['moving'], 'in_air_at_result': at_result and at_result['air'], 'blocks_left_at_result': at_result and at_result['alive'], 'frags': at_result and at_result['frag'], 'top_at_result': at_result and at_result['top'], 'first_all_still_endT': first_quiet,
                              'trace': [(r['endT'], r['moving'], r['air'], r['alive'], r['top']) for r in rows[::2]], 'file': str(OUT / f'{name}.png'), 'msgs': g.msgs[:3]}), flush=True)
            await g.js("window.__qp.goHome()"); await g.pump(10)
asyncio.run(main())
