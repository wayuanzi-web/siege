// node test/review4-sim/first_volley_win.js <關卡> <角度> <力道> [場數=60] [難度=1]
// 每回合同一個角度和力道、不用技能：有幾場在「敵軍還沒開過火」之前（第一回合我方那一輪）就贏了；幾場在第二回合結束前贏
const L = require('./lib4'); const G = L.load('', { hooks: {}, tag: false });
const { S, simInit, simStep, simAim, simFire } = G;
const li = +(process.argv[2] || 1) - 1, a = +process.argv[3], v = +process.argv[4], N = +(process.argv[5] || 60), diff = +(process.argv[6] === undefined ? 1 : process.argv[6]);
let w1 = 0, w2 = 0, w = 0, noFoeShot = 0; const ex = [];
for (let sd = 0; sd < N; sd++) {
  const seed = 5550000 + sd * 7919 + li * 131; let foeVol = 0;
  simInit(li, {}, seed, diff, {});
  S.on = (t, s) => { if (t === 'volley' && s === 1) foeVol++; };
  while (S.state === 'play' && S.round < 30) { if (S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.2) { simAim(0, Math.cos(a) * v, Math.sin(a) * v); simFire(0); } simStep(1 / 60); }
  if (S.state === 'won') { w++; if (S.round === 1) w1++; if (S.round <= 2) w2++; if (!foeVol) { noFoeShot++; if (ex.length < 5) ex.push(seed); } }
}
console.log(`L${li + 1} diff${diff} constant aim (${a} rad = ${(a * 180 / Math.PI).toFixed(0)} deg, power ${v} = ${Math.round((v - 32) / 54 * 100)} on the HUD): won ${w}/${N}; won in round 1: ${w1} (${(100 * w1 / N).toFixed(0)}%), before the enemy fired a single volley: ${noFoeShot} (${(100 * noFoeShot / N).toFixed(0)}%); by end of round 2: ${w2} (${(100 * w2 / N).toFixed(0)}%)  e.g. seeds ${ex.join(', ')}`);
