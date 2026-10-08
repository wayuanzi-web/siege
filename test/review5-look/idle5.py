"""review5：玩家慢慢瞄準（20 秒不放手）的時候，場上是不是真的靜止——兵有沒有左右晃、有沒有東西自己繼續動、有沒有人這時候才倒下。
   自動玩家把戰局打到指定的時間點（輪到我方瞄準），拿掉我方的自動玩家，原地等 20 秒（真的迴圈、假時鐘），逐格量每個兵和每塊磚。
   python3 test/review5-look/idle5.py "lvl,seed,bot,t" ...   （t：戰局時間過了 t 秒之後第一次輪到我方瞄準）"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from start4 import START, start_args
from q4 import Game, parse_opts, label, sheet
OUT = HERE.parent.parent / 'shots' / 'review5'
HOOK = r"""
(() => { const q = window.__qp, S = q.S; let on = false, U = null, B = null, n = 0, deaths = [];
  window.__idleStart = () => { on = true; n = 0; deaths = []; U = new Map(); B = new Map(); for (const u of S.units) if (u.alive) U.set(u, { x0: u.x, y0: u.y, lx: u.x, path: 0, rev: 0, sg: 0, awake: 0, sep: 0, edge: 0, maxSp: 0, lastMove: -1 }); for (const b of S.blocks) if (!b.dead) { const p = b.body.getPosition(); B.set(b, [p.x, p.y, 0, -1]); } };
  window.__hook = () => { if (!on) return; n++;
    if (S.on && !S.on.__w8) { const o = S.on; S.on = function (t, a, b, c, d, e) { if (t === 'udie' && on) deaths.push([+(n / 60).toFixed(1), c, d, e]); return o.apply(this, arguments); }; S.on.__w8 = 1; }
    for (const [u, a] of U) { if (!u.alive) continue; const d = u.x - a.lx; a.lx = u.x; a.path += Math.abs(d); if (Math.abs(d) > 0.001) { const sg = d > 0 ? 1 : -1; if (a.sg && sg !== a.sg) a.rev++; a.sg = sg; a.lastMove = n; } if (u.body.isAwake()) a.awake++; if (u.sepNow) a.sep++; if (u.edge) a.edge++; const sp = Math.hypot(u.vx, u.vy); if (sp > a.maxSp) a.maxSp = sp; }
    for (const [b, r] of B) { if (b.dead) continue; const p = b.body.getPosition(); if (p.y < -8) continue; const d = Math.hypot(p.x - r[0], p.y - r[1]); if (d > r[2]) { r[2] = d; r[3] = n; } } };
  window.__idleStop = () => { on = false; const us = []; for (const [u, a] of U) us.push({ who: (u.side ? 'foe:' : 'me:') + u.type + '#' + u.slot, alive: u.alive, x: +a.x0.toFixed(1), y: +a.y0.toFixed(1), path: +a.path.toFixed(2), net: u.alive ? +Math.abs(u.x - a.x0).toFixed(2) : -1, dy: u.alive ? +(u.y - a.y0).toFixed(2) : 0, rev: a.rev, awakeFrac: +(a.awake / n).toFixed(2), sepFrac: +(a.sep / n).toFixed(2), edgeFr: a.edge, maxSp: +a.maxSp.toFixed(2), lastMoveSec: +(a.lastMove / 60).toFixed(1) });
    let moved = 0, big = 0, lastB = -1, worst = ''; for (const [b, r] of B) { if (r[2] > 0.3) { moved++; if (r[3] > lastB) lastB = r[3]; } if (r[2] > 1.5) { big++; worst = (b.frag ? 'frag' : 'block') + ' mat' + b.mat + ' s' + b.side + ' moved ' + r[2].toFixed(1); } }
    let awakeB = 0; for (const b of S.blocks) if (!b.dead && b.body.isAwake() && b.body.getPosition().y > -8) awakeB++;
    return { frames: n, phase: S.phase + S.turn, state: S.state, units: us, blocksMoved03: moved, blocksMoved15: big, worst, lastBlockMoveSec: +(lastB / 60).toFixed(1), awakeBlocksAtEnd: awakeB, deaths }; };
})();
"""
async def main():
    args, opt = parse_opts(sys.argv[1:]); secs = float(opt.get('secs', 20))
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    tiles = []
    async with Game(844, 390, scale=1.5, save=save) as g:
        await g.sec(0.5); await g.pg.add_style_tag(content='#say,#hint,#mile,#banner{display:none!important}'); await g.js(HOOK)
        for a in args:
            lvl, seed, bot, t = a.split(','); lvl = int(lvl); seed = int(seed); t = float(t)
            await g.js(START, start_args(lvl, seed, bot))
            ok = await g.until(f"G.mode === 'result' || (S.time >= {t} && S.state === 'play' && S.phase === 'aim' && S.turn === 0)", max_sec=400, step=1)
            st = await g.state()
            if st['mode'] == 'result' or not ok: print(a, 'game ended first', st['state'], st['round']); continue
            await g.js("() => { window.__qp.S.team[0].ai = null; window.__idleStart(); }")
            im0 = await g.shot(None); await g.sec(secs); r = await g.js("window.__idleStop()"); im1 = await g.shot(None)
            odd = [u for u in r['units'] if u['path'] > 0.15 or u['awakeFrac'] > 0.25 or u['rev'] >= 3 or not u['alive'] or abs(u['dy']) > 0.2]
            print(json.dumps({'case': a, 't0': st['t'], 'round': st['round'], 'phaseAfter': r['phase'], 'unitsFlagged': odd, 'unitsTotal': len(r['units']), 'blocksMoved>0.3': r['blocksMoved03'], 'blocksMoved>1.5': r['blocksMoved15'], 'worst': r['worst'], 'lastBlockMoveSec': r['lastBlockMoveSec'], 'awakeBlocksAtEnd': r['awakeBlocksAtEnd'], 'deaths': r['deaths'], 'maxUnitPath': max(u['path'] for u in r['units'])}, ensure_ascii=False), flush=True)
            label(im0, f"L{lvl} seed{seed} {bot} t{st['t']} r{st['round']} start of a 20 s idle aim"); label(im1, f"after {secs:.0f}s: units flagged {len(odd)}, blocks moved>0.3: {r['blocksMoved03']}, >1.5: {r['blocksMoved15']}, deaths {len(r['deaths'])}")
            if odd or r['blocksMoved03'] or r['deaths']: tiles += [im0, im1]
            await g.js("window.__qp.goHome()"); await g.pump(10)
        print('console:', g.msgs[:3])
    if tiles: sheet(tiles, 2, max_w=2400).save(OUT / 'idle5.png'); print('saved', OUT / 'idle5.png')
asyncio.run(main())
