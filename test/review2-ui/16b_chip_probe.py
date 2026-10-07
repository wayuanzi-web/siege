"""16_enemy_chip.py 的細部：每一次回合牌警告「敵軍瞄準了 ×N」的時候，印出 AI 選的彈道（加手抖之前／之後）在黃金符那裡的高度、
帶頭的是哪個兵、其他兵是不是被凍住，和敵軍砲彈實際穿過了哪些符。看得出假警報是怎麼來的。
python3 test/review2-ui/16b_chip_probe.py"""
import asyncio, sys, json
from playwright.async_api import async_playwright
from common import *

RUN = """(([lv, maxRound]) => { const q = window.__qp, S = q.S, G = q.G; G.freeze = true; q.SV.seen = true; q.SV.open = 6; q.startLevel(lv);
  const turns = []; let cur = null;
  const old = S.on; S.on = (t, a, b, c, d, e, f) => { if (t === 'gate' && e === 1 && cur) cur.passed.push(c + '/' + d); if (t === 'ghit' && cur && S.turn === 1) cur.blocked++; old(t, a, b, c, d, e, f); };
  if (lv === 5) { const bu = S.team[1].units.find(u => u.type === 'boss'); bu.hp = bu.hpMax * 0.38; }
  for (const u of S.team[0].units) { u.hpMax *= 50; u.hp = u.hpMax; }
  let n = 0;
  const cross = (mx, my, vx, vy, gx) => { const t = (gx - mx) / vx; return t > 0 ? +(my + vy * t - 24 * t * t).toFixed(1) : null; };
  while (n++ < 60 * 400 && S.state === 'play' && S.round <= maxRound) {
    if (S.phase === 'aim' && S.turn === 0) { q.simAim(0, 20 + (n * 7 % 30), 30 + (n * 13 % 40)); q.simFire(0); }
    const wasAim = S.turn === 1 && S.phase === 'aim', A = S.team[1].ai;
    let snap = null;
    if (wasAim && A.st === 2 && A.best) { const L = A.lead; snap = {lead: L.type, mx: A.mx, my: A.my, lx: L.x - 1.3 * (L.def.big ? 1.85 : 1), ly: L.y + 2.3 * (L.def.big ? 1.85 : 1), bvx: A.best.vx, bvy: A.best.vy, px: A.px, py: A.py, mult: A.mult, wind: S.wind,
      gates: S.gates.filter(g => !g.dead).map(g => ({o: g.owner, m: g.mult, x: g.x, y0: +(g.y - g.h).toFixed(1), y1: +(g.y + g.h).toFixed(1)})), others: S.team[1].units.filter(u => u.alive && u.w).map(u => u.type + '@' + u.x.toFixed(0) + ',' + u.y.toFixed(0) + (u.frozen > 0 || u.stun > 0 ? '(held)' : ''))}; }
    q.simStep(1 / 60); q.hudUpdate();
    if (S.turn === 1 && S.phase === 'aim') { if (!cur || cur.round !== S.round) { cur = {round: S.round, passed: [], blocked: 0, snap: null}; turns.push(cur); } if (snap) cur.snap = snap; }
    else if (wasAim && snap) { cur.snap = snap; cur.fireAim = [S.team[1].aim[0], S.team[1].aim[1]]; }
  }
  for (const t of turns) if (t.snap) { const s = t.snap; s.cross = s.gates.filter(g => g.o === 2).map(g => ({gate: 'x' + g.m + '@' + g.x + ' y' + g.y0 + '..' + g.y1, bestY: cross(s.mx, s.my, s.bvx, s.bvy, g.x), jitY: cross(s.lx, s.ly, s.px, s.py, g.x)})); }
  return turns.filter(t => t.snap && t.snap.mult >= 3); })"""

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, dsf=1)
        k = 0
        for lv in (4, 5):
            for run in range(10):
                for t in await pg.evaluate(RUN, [lv, 11 if lv == 4 else 9]):
                    s = t['snap']; gold = any(x.endswith('/2') for x in t['passed'])
                    print(f"L{lv+1} r{t['round']} chip x{round(s['mult'])} lead={s['lead']} muzzle@aiBegin=({s['mx']:.1f},{s['my']:.1f}) muzzle@fire=({s['lx']:.1f},{s['ly']:.1f}) best v=({s['bvx']:.1f},{s['bvy']:.1f}) fired v=({s['px']:.1f},{s['py']:.1f}) wind={s['wind']} cross={json.dumps(s['cross'])} -> passed {sorted(set(t['passed']))} blockedByMyGates={t['blocked']} {'OK' if gold else 'FALSE ALARM'}  units={s['others']}")
        await b.close()
asyncio.run(main())
