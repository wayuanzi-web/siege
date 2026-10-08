// node test/review7/debriscreak.js <關卡範圍> [自動玩家=casual] [場數=8] [seed0=5150]
// 超載只該管還在原位、還在撐東西的磚。數一數：嘎吱作響、超載扣血的磚裡面，有多少已經不在原位（掉下來的樓板、躺在地上的柱子）
const G = require('../load')('PH');
const { S, simInit, simStep, LEVELS, BOTS, MAT } = G;
const rg = (process.argv[2] || '6-11').split('-').map(Number), bot = process.argv[3] || 'casual', N = +(process.argv[4] || 8), seed0 = +(process.argv[5] || 5150);
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1; let tot = 0, off = 0, offDmg = 0; const ex = [];
  for (let g = 0; g < N; g++) {
    const seed = seed0 + g * 7919 + li * 131; simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    const hp = new Map();
    while (S.state === 'play' && S.round < 40) {
      for (const b of S.blocks) if (!b.dead && b.cap && b.sT > 0.22) hp.set(b, b.hp);
      simStep(1 / 60);
      for (const [b, h] of hp) { if (b.sT > 0.22 && (S.phase === 'volley' || S.phase === 'resolve' || S.phase === 'hazard')) { tot++; if (!b.inPlace) { off++; offDmg += Math.max(0, h - (b.dead ? 0 : b.hp)); if (ex.length < 4 && !ex.some((s) => s.b === b)) { const p = b.dead ? { x: b.x, y: b.y } : b.body.getPosition(); ex.push({ b, s: `seed ${seed} R${S.round}: ${MAT[b.mat].k} from (${b.x0.toFixed(1)},${b.y0.toFixed(1)}) now at (${p.x.toFixed(1)},${p.y.toFixed(1)}) off its place, overloaded (sL/cap ${(b.sL / b.cap).toFixed(2)})` }); } } } }
      hp.clear();
    }
  }
  console.log(`L${L} ${LEVELS[li].name} [${bot}] ${N} games: overloaded block-steps ${tot}, of which off-place debris ${off} (${tot ? (100 * off / tot).toFixed(0) : 0}%), overload damage to debris ${offDmg.toFixed(0)} hp`);
  for (const e of ex) console.log('   ' + e.s);
}
