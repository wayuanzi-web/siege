// 第 4 項：魔王結界三段全關的時候（把每回合的缺口也關掉來測），我方還有沒有角度打得進去？
// 結界只蓋 95°～210° 這一段弧（BAR_LANES），從正上方偏右、或是貼著地面從下面進去的砲彈不會被擋。
const G = require('./h')();
const { S, SH, simInit, simStep, spawnShot, WPN, F_IN, STEP } = G;
simInit(5, {}, 21, 1, { mute: 0 }); S.team[1].mute = true; S.team[0].ai = null;
const bu = G.bossUnit(); bu.hp = bu.hpMax * 0.6;
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
const bar = S.objs.find((o) => o.t === 'barrier'); if (!bar) throw new Error('no barrier');
for (const sg of bar.segs) { sg.on = true; sg.dead = 0; sg.hp = 1e9; }
for (const sp of S.gsp) if (sp.g) G.gateRemove(sp.g, 3);
let aims = 0, blocked = 0, inside = 0, hitBoss = 0, other = 0; const entry = [], bossAims = [];
for (const u of S.team[0].units) {
  const mx = u.x + 1.3, my = u.y + 2.3;
  for (let a = 0.10; a <= 1.5; a += 0.01) for (let v = 32; v <= 86; v += 1) {
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v; aims++;
    let res = null, t = 0; S.on = (e, x, y) => { if (res) return; if (e === 'bar' || e === 'barbreak') res = { k: 'bar' }; else if (e === 'boom') res = { k: 'boom', x, y, o: G.RAY.o }; };
    const n0 = SH.n; spawnShot(0, WPN.bolt.i, mx, my, vx, vy, 1, F_IN, 0, 1);
    let ex = null;
    while (SH.n > n0 && t < 9.5 && !res) { const px = SH.x[n0], py = SH.y[n0]; G.shotsStep(STEP); t += STEP; if (SH.n > n0 && !ex) { const d0 = Math.hypot(px - bar.x, py - bar.y), d1 = Math.hypot(SH.x[n0] - bar.x, SH.y[n0] - bar.y); if (d0 > bar.R && d1 <= bar.R) ex = Math.atan2(SH.y[n0] - bar.y, SH.x[n0] - bar.x); } }
    while (SH.n > n0) G.killShot(SH.n - 1); S.on = null;
    if (res && res.k === 'bar') blocked++;
    else if (res && res.o && (res.o.side === 1) && Math.hypot(res.x - bar.x, res.y - bar.y) < bar.R) { inside++; if (ex !== null) entry.push((ex < 0 ? ex + 2 * Math.PI : ex) * 57.3); if (!res.o.isBlock && res.o.type === 'boss') { hitBoss++; if (bossAims.length < 3) bossAims.push(`${u.type}: angle ${(a * 57.3).toFixed(0)}deg power ${v}`); } }
    else other++;
  }
}
entry.sort((a, b) => a - b);
const hist = {}; for (const e of entry) { const k = e < 95 ? 'above (<95deg)' : e > 210 ? 'below (>210deg)' : 'through a lane?!'; hist[k] = (hist[k] || 0) + 1; }
console.log(`all three barrier lanes closed: ${aims} aims; stopped by the barrier ${blocked}; reached the enemy castle/units INSIDE the barrier anyway ${inside} (${(100 * inside / aims).toFixed(1)}%), of which direct hits on the boss ${hitBoss}; missed everything ${other}`);
console.log('  where the unblocked shots crossed the barrier circle:', JSON.stringify(hist));
if (bossAims.length) console.log('  e.g. boss hit with barrier fully closed:', bossAims.join('; '));
