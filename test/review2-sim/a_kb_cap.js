// node test/review2-sim/a_kb_cap.js
// A1：爆炸推兵的上限（UKB_V = 9）、推磚的上限（DV_MAX = 24）現在是「累計」的嗎？有沒有辦法光靠爆炸（不是被磚撞）把兵加速到遠超過 9？
// 全部都是「同一步裡連續引爆」：中間沒有任何物理步，所以量到的速度只可能來自爆炸的衝量。
const G = require('./h')();
const { S, simInit, simStep, physExplode, WPN, UKB_V, DV_MAX, CS } = G;
function fresh(li) { simInit(li, {}, 3, 1, {}); S.team[0].ai = null; S.team[0].mute = true; S.team[1].mute = true; while (S.phase !== 'aim') simStep(1 / 60); }
function sp(b) { const v = b.getLinearVelocity(); return Math.hypot(v.x, v.y); }
const out = [];
const line = (s) => { console.log(s); };

// --- (1) 同一點、同一步、N 發：兩邊各試一次（敵城是鏡射的） ---
line('(1) N blasts at the same spot in the same physics step (unit hp set huge; speed read before any physics step)');
for (const side of [1, 0]) for (const [wn, mass] of [['rocket', 1], ['rocket', 0.38], ['bomb', 1], ['fire', 1], ['ice', 1], ['zap', 1], ['dark', 1], ['doom', 1], ['keg', 1], ['drop', 1]]) {
  const row = [];
  for (const n of [1, 3, 10, 40]) {
    fresh(0);
    const u = S.team[side].units[0]; u.hp = u.hpMax = 1e9;
    const p = u.body.getPosition(), dir = side === 1 ? 1 : -1;      // 攻方的砲彈從 dir 的反方向飛來
    for (let k = 0; k < n; k++) physExplode(p.x - dir * 2.5, p.y - 0.5, WPN[wn], 1 - side, mass, 0, null, dir, -1);
    const v = u.body.getLinearVelocity(); row.push(`${n}:${sp(u.body).toFixed(1)}(vx ${(v.x * dir).toFixed(1)},vy ${v.y.toFixed(1)})`);
  }
  line(`   target side ${side} ${wn.padEnd(6)} mass ${mass}:  ${row.join('  ')}`);
}

// --- (2) 不同方向的爆炸輪流來：上限是「沿著每一發自己的方向」算的，換個方向又可以再推 ---
line('\n(2) blasts from alternating directions in the same step (each blast is capped only along its own direction)');
function ring(desc, pts, wn, mass, reps) {
  fresh(0);
  const u = S.team[1].units[0]; u.hp = u.hpMax = 1e9; const p = u.body.getPosition(), x0 = p.x, y0 = p.y;
  let peak = 0;
  for (let r = 0; r < reps; r++) for (const [dx, dy] of pts) { physExplode(x0 + dx, y0 + dy, WPN[wn], 0, mass, 0, null, 1, -1); peak = Math.max(peak, sp(u.body)); }
  const v = u.body.getLinearVelocity();
  line(`   ${desc.padEnd(58)} ${wn} x${reps * pts.length}: speed ${sp(u.body).toFixed(1)} (vx ${v.x.toFixed(1)}, vy ${v.y.toFixed(1)})  = ${(sp(u.body) / UKB_V).toFixed(1)} x UKB_V`);
  return sp(u.body);
}
ring('left only (control)', [[-2.5, 0]], 'bomb', 1, 20);
ring('left, then below', [[-2.5, 0], [0, -2.5]], 'bomb', 1, 20);
ring('upper-left / lower-left alternating (±60° off the x axis)', [[-1.25, 2.17], [-1.25, -2.17]], 'bomb', 1, 20);
ring('upper-left / lower-left alternating (±80° off the x axis)', [[-0.43, 2.46], [-0.43, -2.46]], 'bomb', 1, 40);
ring('same, split rockets (mass 0.38, after a x5 gate)', [[-0.43, 2.46], [-0.43, -2.46]], 'rocket', 0.38, 40);
ring('same, split rockets, 150 shots', [[-0.43, 2.46], [-0.43, -2.46]], 'rocket', 0.38, 75);
ring('roof above + floor in front (a lobbed swarm on a room)', [[-1.0, 3.4], [-2.2, -1.5], [0.5, 3.4], [-1.6, -1.5]], 'rocket', 0.38, 20);

// --- (3) 磚：同一步 N 發 ---
line('\n(3) blocks: N bombs at the same spot in the same step (speed of the block centre; cap is DV_MAX = ' + DV_MAX + ' along the blast direction)');
for (const n of [1, 3, 10, 40]) {
  fresh(0);
  const st = S.st[1], b = st.blocks.find((k) => !k.prop && k.mat === 4 && k.cy === 11);      // 望樓的屋頂
  b.hp = b.hm = 1e9; const p = b.body.getPosition();
  for (let k = 0; k < n; k++) physExplode(p.x - 4, p.y - 1, WPN.bomb, 0, 1, 0, null, 1, -1);
  const v = b.body.getLinearVelocity(), tip = Math.abs(b.body.getAngularVelocity()) * b.w / 2;
  line(`   roof tile (mass ${b.mass.toFixed(0)}) x${n} bombs: centre speed ${sp(b.body).toFixed(1)} (vx ${v.x.toFixed(1)}, vy ${v.y.toFixed(1)}), spin ${b.body.getAngularVelocity().toFixed(1)} rad/s → edge speed up to ${(sp(b.body) + tip).toFixed(0)}`);
}
for (const [desc, pts] of [['left only', [[-1, 0]]], ['upper-left / lower-left ±80°', [[-0.5, 2.9], [-0.5, -2.9]]]]) {
  fresh(0);
  const st = S.st[1], b = st.blocks.find((k) => !k.prop && k.mat === 1 && k.cy === 4 && k.ch === 2);     // 望樓的一根木柱
  b.hp = b.hm = 1e9; const p = b.body.getPosition(), x0 = p.x, y0 = p.y;
  for (let r = 0; r < 30; r++) for (const [dx, dy] of pts) physExplode(x0 + dx - b.w / 2, y0 + dy, WPN.bomb, 0, 1, 0, null, 1, -1);
  const v = b.body.getLinearVelocity();
  line(`   wooden post (mass ${b.mass.toFixed(1)}), ${desc}, 30 rounds of bombs: centre speed ${sp(b.body).toFixed(1)} (vx ${v.x.toFixed(1)}, vy ${v.y.toFixed(1)}), spin ${b.body.getAngularVelocity().toFixed(1)}`);
}
