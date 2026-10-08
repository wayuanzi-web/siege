// node test/review7/monkey_replay.js <關卡> <g> [seed0=99] [從回合] [到回合]：重播 monkey.js 的第 g 場，印出那幾回合的換手、死亡、翻轉、兵的位置
const G = require('../load')('PH, simSkill');
const { S, simInit, simStep, simAim, simFire, LEVELS } = G;
const L = +process.argv[2], g = +process.argv[3], seed0 = +(process.argv[4] || 99), R0 = +(process.argv[5] || 1), R1 = +(process.argv[6] || 99);
let R = seed0 + g * 31 + L; const mr = () => { R = (R * 1103515245 + 12345) & 0x7fffffff; return R / 0x7fffffff; };
const li = L - 1; simInit(li, {}, seed0 + g * 7919 + li * 131, 1, {}); S.team[0].ai = null;
const f1 = (v) => typeof v === 'number' ? v.toFixed(1) : String(v);
S.on = (t, a, b, c, d, e, f) => { if (S.round < R0 || S.round > R1) return; if (['turn', 'udie', 'snap', 'volley', 'tilt'].includes(t)) console.log(`${S.time.toFixed(2)} R${S.round} [${S.phase}/turn${S.turn} phaseT ${S.phaseT.toFixed(1)}] ${t} ${f1(a)} ${f1(b)} ${c === undefined ? '' : f1(c)} ${d === undefined ? '' : f1(d)} ${e === undefined ? '' : f1(e)}`); };
let aimWait = 0, lastPh = '';
while (S.state === 'play' && S.round < 30 && S.round <= R1) {
  if (S.phase === 'aim' && S.turn === 0) { aimWait += 1 / 60; if (aimWait > 0.4) { const a = 0.1 + mr() * 1.4, v = 32 + mr() * 54; simAim(0, Math.cos(a) * v, Math.sin(a) * v); if (mr() < 0.2) G.simSkill(0, 'ult'); simFire(0); aimWait = 0; } }
  if (S.phase === 'volley' && S.turn === 1 && mr() < 0.01) G.simSkill(0, 'shield');
  const ph = S.phase + S.turn;
  if (ph !== lastPh && S.round >= R0) { if (S.phase === 'aim') console.log(`   ${S.time.toFixed(2)} R${S.round} aim starts turn${S.turn}: enemy units ` + S.team[1].units.map((u) => `#${u.slot}${u.alive ? `(${u.x.toFixed(1)},${u.y.toFixed(1)}) v(${u.vx.toFixed(1)},${u.vy.toFixed(1)})` : '✗'}`).join(' ') + (S.pivots[0] ? ` beam ${(S.pivots[0].ang * 57.3).toFixed(1)}°` : '')); lastPh = ph; }
  simStep(1 / 60);
}
