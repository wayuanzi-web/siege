// node test/review7/findaim.js <關卡> <兵位> <tx,ty> [ropeTag]：掃 tau，找出這個兵的試射（simTrace）會打中那條繩子（或打到目標附近）的瞄準
const G = require('../load')('PH, clampAim');
const { S, simInit, simStep, aimFor, simTrace } = G;
const li = +process.argv[2] - 1, slot = +process.argv[3], [tx, ty] = process.argv[4].split(',').map(Number), tag = process.argv[5];
simInit(li, {}, 1, 1, {}); S.team[0].ai = null;
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
const u = S.team[0].units.find((q) => q.slot === slot);
for (let dy = -1.5; dy <= 1.5; dy += 0.5) for (let tau = 0.7; tau <= 3.4; tau += 0.05) {
  const v = aimFor(u.x + 1.3, u.y + 2.3, tx, ty + dy, tau, S.wind, [0, 0]), a = G.clampAim(v[0], v[1], 1);
  if (Math.abs(a[0] - v[0]) > 0.01 || Math.abs(a[1] - v[1]) > 0.01) continue;
  const R = simTrace(0, u.x + 1.3, u.y + 2.3, a[0], a[1], S.wind, S.time, 150);
  if (R.hit === 6 && (!tag || R.rope.tag === tag)) console.log(`dy ${dy} tau ${tau.toFixed(2)} aim (${a[0].toFixed(2)},${a[1].toFixed(2)}) hits rope ${R.rope.tag} at (${R.x.toFixed(1)},${R.y.toFixed(1)}) mult ${R.mult}`);
}
