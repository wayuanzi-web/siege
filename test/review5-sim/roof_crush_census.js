// node test/review5-sim/roof_crush_census.js [每關幾場=40] [bot=casual] [第幾份=0] [共幾份=1]
// 被「壓扁」（load）的兵，頭上壓著的是什麼：只有完整的屋瓦（屋瓦慢慢落在頭上、沒有「砸」到，所以沒碎）、還是別的東西。
// 順便數：屋瓦砸頭就碎的規則觸發幾次；敵軍第一、二輪（我方回合數 <= 2）就被自己屋瓦壓死的我方兵
const L = require('./lib5'); const H = {}; const G = L.load('', H);
const { S, simInit, simStep, BOTS, LEVELS, M_ROOF } = G;
const N = +(process.argv[2] || 40), bot = process.argv[3] || 'casual', shard = +(process.argv[4] || 0), nsh = +(process.argv[5] || 1);
const R = { games: 0, load: [0, 0], roofOnly: [0, 0], roofMostly: [0, 0], early: 0, fired: 0, byLv: {} }, ex = [];
let cur = '';
H.roof = () => { R.fired++; };
H.kill = (u, side, how, ctx) => {
  if (ctx !== 'load' || S.state !== 'play') return;
  R.load[u.side]++;
  const ov = L.over(G, u).filter((b) => !b.frag), roofs = ov.filter((b) => b.mat === M_ROOF), mr = roofs.reduce((s, b) => s + b.mass, 0), mo = ov.reduce((s, b) => s + b.mass, 0) - mr;
  if (roofs.length && roofs.length === ov.length) { R.roofOnly[u.side]++; R.byLv[S.idx + 1] = (R.byLv[S.idx + 1] || 0) + 1; if (u.side === 0 && S.round <= 2) R.early++; if (ex.length < 12) ex.push(`${cur} r${S.round} ${S.phase}/${S.turn} t=${S.time.toFixed(1)} side${u.side} ${u.type}#${u.slot} crushed with only intact roof tiles overhead: ${roofs.map((b) => b.cw + 'w/' + b.mass.toFixed(0) + 'kg').join(' + ')} = ${(mr / u.mass).toFixed(2)}x his weight`); }
  else if (mr > mo && roofs.length) R.roofMostly[u.side]++;
};
let g = 0;
for (let li = 0; li < LEVELS.length; li++) for (let sd = 0; sd < N; sd++) {
  if (g++ % nsh !== shard) continue;
  const seed = 770000 + sd * 7919 + li * 131; cur = `L${li + 1} ${bot} seed${seed}`;
  simInit(li, {}, seed, 1, { botA: BOTS[bot] }); R.games++;
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
}
console.log(`${R.games} games (${bot}): crush kills mine ${R.load[0]} / foe ${R.load[1]}; with ONLY intact roof tiles overhead: mine ${R.roofOnly[0]} / foe ${R.roofOnly[1]} (by level ${JSON.stringify(R.byLv)}); roof tiles were most of the weight: mine ${R.roofMostly[0]} / foe ${R.roofMostly[1]}; my units crushed by roof tiles alone in rounds 1-2: ${R.early}; roof-on-head rule fired ${R.fired} times`);
for (const e of ex) console.log('   ' + e);
