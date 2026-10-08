"""照 pokefilm 的寫法引爆、連拍，但留著資訊列（看跳出來的字有沒有蓋到資訊列、按鈕）；假時鐘，CSS 動畫同步。
   python3 test/review8/film.py <關卡> "<武器>@x,y[,t] ; ..." <秒數,…> <標籤> [寬x高=844x390] [--nohud]
   特殊動作：cut@tag（剪斷 tag 的繩子）、kill@slot（打倒敵軍第 slot 號兵）、pin@k（第 k 個插銷斷）、rope@i（第 i 條繩子斷，照 S.ropes 的順序）
   圖存 shots/review8/film_L<關>_<標籤>.png（拼好的連拍）和每一格的原圖"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from r8 import Game, OUT, label, sheet, SAVE_ALL

args = [a for a in sys.argv[1:] if not a.startswith('--')]; flags = [a for a in sys.argv[1:] if a.startswith('--')]
lvl = int(args[0]); script = args[1]; times = [float(x) for x in args[2].split(',')]; tag = args[3]
W, H = [int(x) for x in (args[4] if len(args) > 4 else '844x390').split('x')]
acts = []
for part in [x.strip() for x in script.split(';') if x.strip()]:
    w, rest = part.split('@'); xs = rest.split(',')
    if w in ('cut', 'kill', 'pin', 'rope'): acts.append({'w': w, 'arg': xs[0], 't': float(xs[1]) if len(xs) > 1 else 0.0})
    else: acts.append({'w': w, 'x': float(xs[0]), 'y': float(xs[1]), 't': float(xs[2]) if len(xs) > 2 else 0.0})

DO = r"""(a) => { const q = window.__qp, S = q.S;
  if (a.w === 'cut') { for (const r of S.ropes) if (!r.cut && r.side === 1 && (r.tag === a.arg || a.arg === '*')) { r.hp = 0.01; q.__ropeHurt ? 0 : 0; } return 'cut ' + a.arg; }
  if (a.w === 'kill') { const u = S.team[1].units.find((u) => u.slot === +a.arg && u.alive); if (u) q.killUnit(u, 0, 0); return 'kill ' + a.arg; }
  let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = q.blockDist(b, a.x, a.y); if (d < best) { best = d; hit = b; } }
  q.physExplode(a.x, a.y, q.WPN[a.w], 0, 1, 0, hit, 1, 0); return a.w; }"""

INFO = r"""(() => { const q = window.__qp, S = q.S; return { pops: q.FX.pops.map((p) => p.txt), ropes: S.ropes.map((r) => (r.tag || r.kind) + (r.cut ? 'X' : '')).join(' '), units: S.units.map((u) => (u.side ? 'E' : 'P') + u.slot + (u.alive ? '' : 'x')).join(' '), piv: S.pivots.map((o) => o.ang.toFixed(2)).join(','), pins: S.pins.map((o) => o.broke ? 'X' : 'ok').join(','), state: S.state }; })()"""

# 畫面上跳出來的字的位置（畫布像素→CSS 像素）和資訊列、按鈕的位置
POPBOX = r"""(() => { const q = window.__qp, V = q.V, RD = q.RD, c = document.getElementById('cv'); const k = c.getBoundingClientRect().width / V.W;
  const hud = document.querySelector('.hud-top').getBoundingClientRect();
  return { k, hudBottom: hud.bottom, vhud: V.hud * k, avoid: RD.avoid.map((r) => r.map((v) => Math.round(v * k))), pops: q.FX.pops.map((p) => ({ txt: p.txt, x: Math.round(q.X ? 0 : 0) })) }; })()"""


async def main():
    tiles = []
    async with Game(W, H, scale=2, touch=True, save=SAVE_ALL) as g:
        await g.sec(0.5)
        await g.js("(l) => { const q = window.__qp; q.G.freeze = true; q.startLevel(l - 1); q.S.team[0].ai = null; q.S.team[1].ai = null; q.advance(1.3); q.S.phase = 'resolve'; q.S.turn = 0; }", lvl)
        css = '#banner,#hint{display:none!important}' + ('#hud{display:none!important}' if '--nohud' in flags else '') + ('#say{display:none!important}' if '--nosay' in flags else '')
        await g.pg.add_style_tag(content=css)
        t = 0.0; done = [False] * len(acts)
        for tt in times:
            while t < tt - 1e-6:
                step = min(1 / 60, tt - t)
                for i, a in enumerate(acts):
                    if not done[i] and t >= a['t']:
                        done[i] = True
                        if a['w'] == 'cut':
                            await g.js("(tag) => { const S = window.__qp.S; for (const r of S.ropes) if (!r.cut && r.side === 1 && (r.tag === tag || tag === '*')) { r.hp = 0.001; } }", a['arg'])
                            # 讓下一個小傷害把它弄斷：直接用爆炸太亂，這裡用模擬自己的 ropeHurt 不在 __qp 裡 → 用一顆小箭打在繩子中點
                            await g.js("(tag) => { const q = window.__qp, S = q.S; for (const r of S.ropes) if (!r.cut && r.side === 1 && (r.tag === tag || tag === '*')) { const e = r.e; q.physExplode((e[0] + e[2]) / 2, (e[1] + e[3]) / 2, q.WPN.bomb, 0, 0.05, 0, null, 0, 0); } }", a['arg'])
                        elif a['w'] == 'kill':
                            await g.js("(slot) => { const q = window.__qp, S = q.S; const u = S.team[1].units.find((u) => u.slot === +slot && u.alive); if (u) q.killUnit(u, 0, 0); }", a['arg'])
                        else:
                            await g.js(DO, a)
                await g.js("(s) => { const q = window.__qp; if (q.S.state === 'play') { q.S.phase = 'resolve'; q.S.phaseT = 0; q.S.quietT = 0; } q.advance(s); window.__pump(1); }", step)
                t += step
            im = await g.shot(f'film_L{lvl}_{tag}_{int(round(tt * 10)):03d}')
            inf = await g.js(INFO)
            tiles.append(label(im.copy(), f'L{lvl} {tag} t={tt:.1f}', ' '.join(inf['pops'])[:60]))
            print(f't={tt:.1f}', json.dumps(inf, ensure_ascii=False))
        print('console:', g.msgs[:6])
    sh = sheet(tiles, 2 if len(tiles) > 1 else 1, max_w=2000)
    sh.save(OUT / f'film_L{lvl}_{tag}.png'); print(OUT / f'film_L{lvl}_{tag}.png')

asyncio.run(main())
