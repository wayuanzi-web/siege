"""review3：統計「這一輪被判定結束之後，場上還有多少東西在動」。不截圖，只跑戰局。
   每一關跑幾局（自動玩家 casual / expert、不同的種子），每次輪替（resolve → 下一邊瞄準／落石）的那一刻記下所有磚和兵的位置，
   然後讓下一邊先不要開火、空轉 4 秒，看：有幾塊磚又移動了多遠、有沒有兵在這段時間倒下、有沒有火藥桶在這段時間才爆。
   另外記每一輪從開火到被判定結束花了幾秒、是不是被 9 秒的上限硬切掉的。
   python3 test/review3-look/survey.py [每關幾局=4] [最多幾回合=8]
"""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from r3 import Session, start_level, OUT

JS = r"""
([maxRounds]) => { const q = window.__qp, S = q.S, PH = q.PH, STEP = 1 / 60, out = [];
  const snap = () => { const m = new Map(); for (const b of S.blocks) if (!b.dead) { const p = b.body.getPosition(); m.set(b, [p.x, p.y, b.body.getAngle()]); } const u = new Map(); for (const k of S.units) if (k.alive) u.set(k, [k.x, k.y]); return [m, u]; };
  let phase = S.phase, turn = S.turn, tFire = S.time, guard = 0;
  while (S.state === 'play' && S.round <= maxRounds && guard++ < 60 * 600) {
    const p0 = S.phase, t0 = S.turn, pT = S.phaseT;
    q.simStep(STEP);
    if (p0 === 'aim' && S.phase === 'volley') tFire = S.time;
    if ((p0 === 'resolve' || p0 === 'hazard') && S.phase !== p0 && S.state === 'play') {
      // 這一輪剛被判定結束
      const dur = +(S.time - tFire).toFixed(2), timeout = pT + STEP > 9 ? 1 : 0, side = t0, kind = p0;
      let aw = 0, vmax = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic() && b.isAwake()) { const p = b.getPosition(); if (p.y < -10 || p.x < -11 || p.x > 123) continue; aw++; const v = b.getLinearVelocity(), s = Math.hypot(v.x, v.y); if (s > vmax) vmax = s; }
      const [m, u] = snap(), log0 = R3.log.length;
      // 兩邊都先不准開火，空轉 4 秒
      const ai = [S.team[0].ai, S.team[1].ai]; S.team[0].ai = null; S.team[1].ai = null;
      const keep = { phase: S.phase, phaseT: S.phaseT, quietT: S.quietT };
      for (let i = 0; i < 240; i++) { if (S.phase === 'hazard') break; q.simStep(STEP); S.phaseT = keep.phaseT; }
      let moved05 = 0, moved2 = 0, dmax = 0, umax = 0, what = '';
      for (const [b, p] of m) { if (b.dead) continue; const c = b.body.getPosition(); if (c.y < -10 || c.x < -11 || c.x > 123) continue; const d = Math.hypot(c.x - p[0], c.y - p[1]); if (d > 0.5) moved05++; if (d > 2) moved2++; if (d > dmax) { dmax = d; what = (b.frag ? 'frag ' : b.prop ? 'prop ' : '') + 'mat' + b.mat + ' ' + b.kind + ' ' + b.w.toFixed(1) + 'x' + b.h.toFixed(1); } }
      let died = 0; for (const [k, p] of u) { if (!k.alive) { died++; continue; } const d = Math.hypot(k.x - p[0], k.y - p[1]); if (d > umax) umax = d; }
      let booms = 0, cells = 0; for (let i = log0; i < R3.log.length; i++) { const e = R3.log[i]; if (e[1] === 'boom') booms++; else if (e[1] === 'cell') cells++; }
      S.team[0].ai = ai[0]; S.team[1].ai = ai[1];
      out.push({ round: S.round, side, kind, dur, timeout, aw, vmax: +vmax.toFixed(2), moved05, moved2, dmax: +dmax.toFixed(1), what, umax: +umax.toFixed(1), died, booms, cells });
      tFire = S.time;
    }
  }
  return { out, state: S.state, round: S.round };
}
"""


async def main():
    games = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    max_rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    allrows = {}
    async with Session() as s:
        for lvl in range(1, 7):
            rows = []
            for g in range(games):
                ctx, pg, msgs = await s.page()
                await start_level(pg, lvl, 100 + lvl * 10 + g, 'expert' if g % 2 else 'casual')
                r = await pg.evaluate(JS, [max_rounds])
                for o in r['out']: o['game'] = g
                rows += r['out']
                await ctx.close()
            allrows[lvl] = rows
            for side, nm in ((0, 'player volleys'), (1, 'enemy volleys')):
                rr = [o for o in rows if o['side'] == side and o['kind'] == 'resolve']
                if not rr: continue
                n = len(rr); durs = sorted(o['dur'] for o in rr)
                print(f"L{lvl} {nm}: n={n}  time to settle median {durs[n // 2]:.1f}s  p90 {durs[int(n * 0.9)]:.1f}s  max {durs[-1]:.1f}s  cut by 9s cap: {sum(o['timeout'] for o in rr)}"
                      f" | still awake at end: {sum(1 for o in rr if o['aw'] > 0)}  | a block moved >0.5 afterwards: {sum(1 for o in rr if o['moved05'] > 0)}  >2: {sum(1 for o in rr if o['moved2'] > 0)}"
                      f" | unit moved >1 afterwards: {sum(1 for o in rr if o['umax'] > 1)}  unit died afterwards: {sum(1 for o in rr if o['died'] > 0)}  explosion afterwards: {sum(1 for o in rr if o['booms'] > 0)}", flush=True)
                worst = sorted(rr, key=lambda o: -o['dmax'])[:3]
                for o in worst:
                    if o['dmax'] > 0.5: print(f"      game{o['game']} r{o['round']}: {o['what']} moved {o['dmax']} after the turn ended (awake {o['aw']}, vmax {o['vmax']}, blocks>0.5: {o['moved05']}, died {o['died']}, booms {o['booms']}, cells {o['cells']}, dur {o['dur']}s{' TIMEOUT' if o['timeout'] else ''})")
            hz = [o for o in rows if o['kind'] == 'hazard']
            if hz: print(f"L{lvl} hazard phases: n={len(hz)}  a block moved >0.5 afterwards: {sum(1 for o in hz if o['moved05'] > 0)}")
    (OUT / 'survey.json').write_text(json.dumps(allrows))

asyncio.run(main())
