// node test/review2-sim/d_barrier.js
// D：魔王結界。三段光牆各蓋哪一段角度？把三段全關（平常每回合至少開一段），我方還有多少瞄準角度打得進城？從哪裡進去的？
// （第一輪審查的 t_barrier_bypass.js 的精簡版：角度每 0.03、力道每 3 取樣）
const G = require('./h')();
const { S, SH, simInit, simStep, spawnShot, WPN, F_IN, STEP, BAR_LANES } = G;
simInit(5, {}, 21, 1, {}); S.team[1].mute = true; S.team[0].ai = null; S.team[1].ai = null;
const bu = G.bossUnit(); bu.hp = bu.hpMax * 0.6;
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
S.team[0].mute = true;
for (let k = 0; k < 3 && !S.objs.find((o) => o.t === 'barrier'); k++) { G.simFire(0); while (!(S.phase === 'aim' && S.turn === 0) && S.state === 'play') simStep(1 / 60); }
const bar = S.objs.find((o) => o.t === 'barrier'); if (!bar) throw new Error('no barrier');
console.log(`barrier: centre (${bar.x.toFixed(1)}, ${bar.y.toFixed(1)}), radius ${bar.R.toFixed(1)}; lanes (deg from the +x axis): ${BAR_LANES.map((l) => (l[0] * 57.3).toFixed(0) + '–' + (l[1] * 57.3).toFixed(0)).join(', ')}; segment hp ${bar.segs[0].hm.toFixed(0)}; boss at (${bu.x.toFixed(1)}, ${bu.y.toFixed(1)})`);
for (const sg of bar.segs) { sg.on = true; sg.dead = 0; sg.hp = 1e9; }
for (const sp of S.gsp) if (sp.g) G.gateRemove(sp.g, 3);
let aims = 0, blocked = 0, inside = 0, hitBoss = 0, other = 0; const entry = [];
for (const u of S.team[0].units) {
  const mx = u.x + 1.3, my = u.y + 2.3;
  for (let a = 0.10; a <= 1.5; a += 0.03) for (let v = 32; v <= 86; v += 3) {
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v; aims++;
    let res = null, t = 0; S.on = (e, x, y) => { if (res) return; if (e === 'bar' || e === 'barbreak') res = { k: 'bar' }; else if (e === 'boom') res = { k: 'boom', x, y, o: G.RAY.o }; };
    const n0 = SH.n; spawnShot(0, WPN.bolt.i, mx, my, vx, vy, 1, F_IN, 0, 1);
    let ex = null;
    while (SH.n > n0 && t < 9.5 && !res) { const px = SH.x[n0], py = SH.y[n0]; G.shotsStep(STEP); t += STEP; if (SH.n > n0 && ex === null) { const d0 = Math.hypot(px - bar.x, py - bar.y), d1 = Math.hypot(SH.x[n0] - bar.x, SH.y[n0] - bar.y); if (d0 > bar.R && d1 <= bar.R) ex = Math.atan2(SH.y[n0] - bar.y, SH.x[n0] - bar.x); } }
    while (SH.n > n0) G.killShot(SH.n - 1); S.on = null;
    if (res && res.k === 'bar') blocked++;
    else if (res && res.o && res.o.side === 1 && Math.hypot(res.x - bar.x, res.y - bar.y) < bar.R) { inside++; if (ex !== null) entry.push((ex < 0 ? ex + 2 * Math.PI : ex) * 57.3); if (!res.o.isBlock && res.o.type === 'boss') hitBoss++; }
    else other++;
  }
}
const hist = {}; for (const e of entry) { const k = e < 95 ? 'from above, right of the top lane (<95°)' : e > 210 ? 'from below the low lane (>210°)' : 'through a lane?!'; hist[k] = (hist[k] || 0) + 1; }
console.log(`all three lanes forced closed: ${aims} sampled aims → stopped by the barrier ${blocked} (${(100 * blocked / aims).toFixed(0)}%); still landed on the enemy castle/units inside the barrier ${inside} (${(100 * inside / aims).toFixed(1)}%), direct boss hits ${hitBoss}; missed everything ${other}`);
console.log('   where the unblocked shots crossed the barrier circle: ' + JSON.stringify(hist));
