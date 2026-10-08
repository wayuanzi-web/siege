// node test/review7/wetsurvive.js [自動玩家=casual] [場數=20] [seed0=600]：第六關真的對局裡，有沒有兵泡在河裡（wet > 0）連續超過 3 秒還活著（沒被沖走）
const G = require('../load')('PH');
const { S, simInit, simStep, BOTS } = G;
const bot = process.argv[2] || 'casual', N = +(process.argv[3] || 20), seed0 = +(process.argv[4] || 600);
let cases = 0; const ex = [];
for (let g = 0; g < N; g++) {
  const seed = seed0 + g * 7919 + 5 * 131; simInit(5, {}, seed, 1, { botA: BOTS[bot] });
  const since = new Map(), flagged = new Set();
  while (S.state === 'play' && S.round < 40) {
    simStep(1 / 60);
    for (const u of S.units) { if (u.alive && u.wet > 0) { if (!since.has(u)) since.set(u, S.time); else if (S.time - since.get(u) > 3 && !flagged.has(u)) { flagged.add(u); cases++; if (ex.length < 5) ex.push(`seed ${seed} R${S.round}: side${u.side} #${u.slot} in the river for 3 s+ at (${u.x.toFixed(1)},${u.y.toFixed(1)}) wet ${u.wet.toFixed(2)}`); } } else since.delete(u); }
  }
}
console.log(`L6 [${bot}] ${N} games: ${cases} soldiers stayed alive in the river > 3 s`);
for (const s of ex) console.log('   ' + s);
