// node test/review5-sim/edge_rig.js [gap|fling|both=both]
// 邊緣規則的最小重現（不開火，停在開場階段）：
//   gap   兵站在兩塊不會動的平台中間，中間有一條縫（比鞋底窄，掉不下去）。看他會不會左右來回滑個不停（edge 判定每 8 格才更新一次、一變就把 1.5 秒的上限歸零）
//   fling 兵站在平台邊緣，身體中心已經懸空 d：滑出去的那一刻水平速度多快、落地時離邊緣多遠（平台高 H）
const L = require('./lib5');
const mode = process.argv[2] || 'both';
function world(type) {
  const H = {}; const G = L.load('', H); const { S, PH, PL, simInit, mkUnit, CS } = G;
  simInit(3, {}, 7, 1, {}); const X0 = 56, GY = -3.5;
  const fake = { side: 0, x0: X0 - 14, x1: X0 + 14, y0: GY, units: [] };
  const u = mkUnit(0, type || 'rocket', fake, { slot: 9, cx: (X0 - fake.x0) / CS - 0.5, cy: 0 }, 1); S.team[0].alive++;
  const plat = (x0, x1, top, fr) => { const b = PH.world.createBody({ type: 'static' }); b.createFixture({ shape: new PL.Box((x1 - x0) / 2, 1.5, { x: (x0 + x1) / 2, y: top - 1.5 }, 0), friction: fr === undefined ? 0.72 : fr }); return b; };
  return { G, H, S, u, X0, GY, plat };
}
function run(W, secs, each) { const { G, S } = W; for (let i = 0; i < secs * 60; i++) { S.phaseT = 0; G.simStep(1 / 60); if (each) each(i); } }
if (mode === 'gap' || mode === 'both') {
  console.log('GAP: unit over a slot between two fixed platforms (friction 0.72 = stone). 12 s each. flips = edge state changes; "moving at end" = still sliding back and forth when the run stops');
  for (const type of ['rocket', 'boss']) {
    const rows = [];
    for (let gap = 0.5; gap <= (type === 'boss' ? 2.0 : 1.5) + 1e-6; gap += 0.1) for (const off of [0, 0.2, 0.4]) {
      const W = world(type), { u, X0, GY, H, S } = W; const top = GY + 3;
      W.plat(X0 - 8, X0 - gap / 2, top); W.plat(X0 + gap / 2, X0 + 8, top);
      u.body.setTransform({ x: X0 + off, y: top + u.bh / 2 + 0.02 }, 0); u.body.setAwake(true);
      let flips = 0, lastFlip = 0, vmax = 0, xmin = 1e9, xmax = -1e9, travel = 0, px = X0 + off, lastMove = 0;
      H.edgeSet = () => { flips++; lastFlip = S.time; };
      const t0 = S.time;
      run(W, 12, () => { const v = Math.abs(u.body.getLinearVelocity().x); if (v > vmax) vmax = v; if (u.x < xmin) xmin = u.x; if (u.x > xmax) xmax = u.x; travel += Math.abs(u.x - px); px = u.x; if (v > 0.5) lastMove = S.time; });
      rows.push({ gap: +gap.toFixed(1), off, flips, vmax: +vmax.toFixed(1), swing: +(xmax - xmin).toFixed(2), travel: +travel.toFixed(1), until: +(lastMove - t0).toFixed(1), awake: u.body.isAwake(), alive: u.alive, y: +(u.y - top).toFixed(2) });
    }
    const bad = rows.filter((r) => r.until > 11);
    console.log(`  ${type} (sole ${(type === 'boss' ? 1.8 : 1.32).toFixed(2)} wide): ${rows.length} cases; still sliding back and forth after 12 s: ${bad.length}; more than 6 flips: ${rows.filter((r) => r.flips > 6).length}`);
    for (const r of rows) if (r.flips > 2 || r.until > 2) console.log(`     gap ${r.gap.toFixed(1)} start offset ${r.off}: ${r.flips} flips, peak speed ${r.vmax} m/s, swing ${r.swing} m, total travel ${r.travel} m, last moving at ${r.until}s${r.until > 11 ? '  << NEVER SETTLES' : ''}${r.y < -0.5 ? ' (fell into the gap)' : ''}`);
  }
}
if (mode === 'fling' || mode === 'both') {
  console.log('FLING: unit on a platform edge with his centre past the edge by d (sole half-width 0.66). Platform H above the ground.');
  for (const fr of [0.72, 0.05]) for (const Hh of [3.4, 6.8, 10.2]) for (const d of [0.1, 0.3, 0.5]) {
    const W = world('rocket'), { u, X0, GY, H, S } = W; const top = GY + Hh;
    W.plat(X0 - 8, X0, top, fr);
    u.body.setTransform({ x: X0 + d, y: top + u.bh / 2 + 0.02 }, 0); u.body.setAwake(true);
    let pushT = 0, vxLeave = 0, left = false, landX = null, landT = 0, hurt = 0; const t0 = S.time;
    H.edge = (k, dt) => { pushT += dt; };
    H.hurt = (k, dd) => { if (k === u) hurt += dd; };
    run(W, 4, () => { if (!u.alive) return; const v = u.body.getLinearVelocity(); if (!left && u.y < top - 0.3) { left = true; vxLeave = v.x; } if (left && landX === null && Math.abs(v.y) < 0.5 && u.y < GY + 0.5) { landX = u.x; landT = S.time - t0; } });
    console.log(`  friction ${fr} H=${Hh} d=${d}: pushed for ${pushT.toFixed(2)}s; horizontal speed when he drops off ${vxLeave.toFixed(1)} m/s; lands ${landX === null ? '?' : (landX - X0).toFixed(1)} m beyond the edge after ${landT.toFixed(2)}s; fall damage ${hurt.toFixed(0)}; alive=${u.alive}`);
  }
}
