// node test/review2-sim/trace_volley.js <關卡> <場次 sd> <bot> <回合> [哪一邊開火=1] [難度=1] [強化=0] [種子基數=9000] [-v] [-q]
// 把某一場的某一輪砲擊攤開來看：挨打那一邊每個兵這一輪受到的每一筆傷害、被爆炸推了幾次（推到多快）、
// 腳下／身邊哪些磚被打掉、最後怎麼倒的（位置、速度）。種子算法跟 batch.js / test/table.js 一樣。
//   -v：每 0.1 秒印一次挨打那邊每個兵的位置和速度；-q：只印摘要
const { load, HOW, KIND, H } = require('./lib');
const a = process.argv.slice(2).filter((x) => x[0] !== '-'), verbose = process.argv.includes('-v'), quiet = process.argv.includes('-q');
const li = +a[0] - 1, sd = +a[1], bot = a[2] || 'casual', R = +a[3], side = a[4] === undefined ? 1 : +a[4], diff = a[5] === undefined ? 1 : +a[5], upL = +(a[6] || 0), base = +(a[7] || 9000);
const G = load();
const { S, SH, simInit, simStep, BOTS, WL, MAT, CS } = G;
const seed = sd > 100000 ? sd : H.seed(base, sd, li);
simInit(li, H.UP(upL), seed, diff, { botA: BOTS[bot] });
const vic = 1 - side, st = S.st[vic];
let on = false, t0 = 0, log = [], booms = [], kb = new Map(), hurt = new Map(), traj = [], cells = [], gatesUsed = {}, nShots = 0, done = false;
const nm = (u) => `${u.type}#${u.slot}`;
const rel = (x) => (vic === 0 ? x - st.x0 : st.x1 - x);          // 離城樓「背面」多遠（我方：左緣；敵方：右緣）……兩邊都用「從自己城的背面算起」
const P = (s) => { if (!quiet) console.log(s); };
S.onHurt = (u, d, by, kind) => { if (!on || u.side !== vic) return; let h = hurt.get(u); if (!h) hurt.set(u, h = []); h.push({ t: S.time - t0, d, by, kind: KIND[kind] }); };
S.onPin = (u, load, moved) => { if (on && u.side === vic) log.push(`  t=${(S.time - t0).toFixed(2)} PINNED ${nm(u)} load ${load.toFixed(0)} moved=${moved ? 1 : 0} → ${(14 + Math.min(load, 80) * 0.7).toFixed(0)} dmg`); };
S.onKb = (u, j, nx, ny, w, by, ov) => {
  if (!on || u.side !== vic) return; let k = kb.get(u); if (!k) kb.set(u, k = { n: 0, sx: 0, sy: 0, vmax: 0, frames: new Map() });
  k.n++; k.sx += nx * j / u.mass; k.sy += (ny * j + 0.3 * j) / u.mass; const v = u.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > k.vmax) { k.vmax = sp; k.vt = S.time - t0; k.vv = [v.x, v.y]; }
  const f = k.frames.get(S.frame) || { x: 0, y: 0, n: 0 }; f.x += nx * j / u.mass; f.y += (ny * j + 0.3 * j) / u.mass; f.n++; k.frames.set(S.frame, f);
};
S.onKill = (b, by, kind, clean) => { if (on && b.side === vic && !b.frag && !b.prop) cells.push({ t: S.time - t0, cx: b.cx, cy: b.cy, cw: b.cw, ch: b.ch, mat: MAT[b.mat].k, kind: kind === 99 ? 'fin' : KIND[kind], by, inPlace: b.inPlace }); };
S.on = (t, x, y, c, d, e, f) => {
  if (t === 'volley' && x === side && S.round === R && !done) {
    on = true; t0 = S.time; const T = S.team[side], A = T.ai;
    console.log(`L${li + 1} sd ${sd} (seed ${seed}) ${bot} diff ${diff} up ${upL}: round ${R}, side ${side} fires. aim (${T.aim[0].toFixed(1)}, ${T.aim[1].toFixed(1)})  ${A && A.best ? 'AI target ' + JSON.stringify({ x: +A.best.t.x.toFixed(1), y: +A.best.t.y.toFixed(1), w: A.best.t.w, tau: +A.best.tau.toFixed(1) }) + ' mult ' + A.mult : ''}  victim shield ${S.team[vic].shield.on ? 'ON' : 'off'}  rage ${S.rage.toFixed(1)}`);
    console.log(`  shooters: ${T.units.filter((u) => u.alive).map((u) => nm(u) + (u.held ? '(held)' : '')).join(' ')}   victims: ${S.team[vic].units.map((u) => u.alive ? `${nm(u)} hp${u.hp.toFixed(0)} @(${rel(u.x).toFixed(1)},${u.y.toFixed(1)})${Math.abs(u.x - u.hx) > 2.7 || Math.abs(u.y - u.hy) > 2 ? ' [displaced from home (' + rel(u.hx).toFixed(1) + ',' + u.hy.toFixed(1) + ')]' : ''}` : `${nm(u)} dead`).join(', ')}`);
  }
  if (!on) return;
  if (t === 'boom' && e === side) { booms.push({ t: S.time - t0, x, y, r: c, w: WL[d].id, m: f }); }
  else if (t === 'boom') log.push(`  t=${(S.time - t0).toFixed(2)} boom by side ${e}: ${WL[d].id} at (${rel(x).toFixed(1)},${y.toFixed(1)})`);
  else if (t === 'gate' && e === side) gatesUsed['x' + c] = (gatesUsed['x' + c] || 0) + 1;
  else if (t === 'fire' && c === side) nShots++;
  else if (t === 'udie' && c === vic) { const u = S.team[vic].units.find((k) => k.slot === f); log.push(`  t=${(S.time - t0).toFixed(2)} DIES ${nm(u)} (${HOW[e]}) at (${rel(x).toFixed(1)},${(y - 1.8).toFixed(1)}) v=(${u.vx.toFixed(1)},${u.vy.toFixed(1)}) home (${rel(u.hx).toFixed(1)},${u.hy.toFixed(1)})`); }
  else if (t === 'shieldhit' || t === 'flak') { gatesUsed[t] = (gatesUsed[t] || 0) + 1; }
  else if ((t === 'turn' || t === 'round' || t === 'end') && S.time > t0 + 0.2) {
    on = false; done = true;
    // 摘要
    const inC = booms.filter((b) => b.x > st.x0 - 2 && b.x < st.x1 + 2), byW = {}; for (const b of booms) byW[b.w] = (byW[b.w] || 0) + 1;
    console.log(`  volley lasted ${(S.time - t0).toFixed(1)}s; unit shots fired ${nShots}; gates ${JSON.stringify(gatesUsed)}; explosions ${booms.length} (${Object.keys(byW).map((k) => k + ' ' + byW[k]).join(', ')}), ${inC.length} on/in the victim castle; avg mass ${(booms.reduce((s, b) => s + (b.m % 100), 0) / (booms.length || 1)).toFixed(2)}`);
    if (!quiet) { const rows = {}; for (const b of inC) { const k = Math.floor(b.y / CS); rows[k] = (rows[k] || 0) + 1; } console.log('  explosions by castle row (cy:count): ' + Object.keys(rows).sort((p, q) => q - p).map((k) => k + ':' + rows[k]).join(' ')); }
    if (cells.length) console.log('  victim blocks destroyed: ' + cells.map((c2) => `${c2.mat}(${c2.cx},${c2.cy}${c2.cw > 1 || c2.ch > 1 ? ' ' + c2.cw + 'x' + c2.ch : ''})@${c2.t.toFixed(1)}s/${c2.kind}`).join(' '));
    for (const u of S.team[vic].units) {
      const h = hurt.get(u) || [], k = kb.get(u), by = {}; let tot = 0; for (const q of h) { by[q.kind] = (by[q.kind] || 0) + q.d; tot += q.d; }
      let fmax = 0; if (k) for (const f2 of k.frames.values()) { const s = Math.hypot(f2.x, f2.y); if (s > fmax) fmax = s; }
      console.log(`  ${nm(u).padEnd(9)} ${u.alive ? 'alive hp ' + u.hp.toFixed(0) : 'DEAD'}  damage this volley ${tot.toFixed(0)} {${Object.keys(by).map((q) => q + ' ' + by[q].toFixed(0)).join(', ')}}  blast pushes ${k ? k.n : 0}${k ? `, sum of pushes ${Math.hypot(k.sx, k.sy).toFixed(1)} u/s (${k.sx.toFixed(1)},${k.sy.toFixed(1)}), most in one step ${fmax.toFixed(1)}, top speed right after a push ${k.vmax.toFixed(1)} at t=${k.vt.toFixed(2)} v=(${k.vv[0].toFixed(1)},${k.vv[1].toFixed(1)})` : ''}  ${u.alive ? `now @(${rel(u.x).toFixed(1)},${u.y.toFixed(1)})` : ''}`);
      if (!quiet && h.length) { const big = h.filter((q) => q.d >= 6).slice(0, 14); console.log('      hits ≥6: ' + big.map((q) => `${q.t.toFixed(2)}s ${q.kind} ${q.d.toFixed(0)}${q.by === 2 ? '(nobody)' : ''}`).join(', ')); }
    }
    for (const l of log) console.log(l);
    if (verbose) for (const l of traj) console.log(l);
  }
};
let n = 0;
while (S.state === 'play' && S.round <= R + 1 && !done) {
  simStep(1 / 60);
  if (on && verbose && ++n % 6 === 0) traj.push(`    t=${(S.time - t0).toFixed(1)} ` + S.team[vic].units.map((u) => u.alive ? `${nm(u)} (${rel(u.x).toFixed(1)},${u.y.toFixed(1)}) v(${u.vx.toFixed(0)},${u.vy.toFixed(0)})${u.air ? '~' : ''}` : `${nm(u)} x`).join('  '));
}
if (!done) console.log(`(round ${R} side ${side} volley not reached: state ${S.state}, round ${S.round})`);
