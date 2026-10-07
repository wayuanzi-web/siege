// node test/review2-sim/a_kb_bolt.js
// A1：連弩（穿刺、r = 0）直接打中兵的時候，推力是固定的衝量 (20, 20·uy + 8)，沒有上限、也不隨倍增後的威力變小。
// 同一步裡 N 支箭打中同一個兵：速度多少？受多少傷？
const G = require('./h')();
const { S, simInit, simStep, physExplode, WPN, UKB_V } = G;
function fresh() { simInit(0, {}, 3, 1, {}); S.team[0].ai = null; S.team[0].mute = true; S.team[1].mute = true; while (S.phase !== 'aim') simStep(1 / 60); }
for (const side of [1, 0]) for (const [mass, label] of [[1, 'full bolts'], [0.38, 'after a ×5 gate (mass 0.38)'], [0.197, 'after ×3 and ×5 (mass 0.2)']]) {
  const row = [];
  for (const n of [1, 6, 18, 30, 60]) {
    fresh(); const u = S.team[side].units[0], hp0 = u.hp; const dir = side === 1 ? 1 : -1; let alive = n, speedAtDeath = 0;
    for (let k = 0; k < n; k++) { if (!u.alive) { alive = k; break; } physExplode(u.x, u.y + 1.5, WPN.bolt, 1 - side, mass, 0, u, dir * 60, -20); if (u.body) speedAtDeath = Math.hypot(u.body.getLinearVelocity().x, u.body.getLinearVelocity().y); }
    row.push(`${n}: ${speedAtDeath.toFixed(0)} u/s${u.alive ? ` (hp ${u.hp.toFixed(0)}/${hp0})` : ` (dead after ${alive} hits)`}`);
  }
  console.log(`target side ${side}, ${label.padEnd(28)} bolts hitting one unit in the same step → speed: ${row.join('   ')}`);
}
console.log(`(explosive weapons are capped at UKB_V = ${UKB_V} along the blast direction; bolts are not capped)`);
