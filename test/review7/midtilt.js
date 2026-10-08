// node test/review7/midtilt.js [自動玩家=casual] [場數=16] [seed0=8800]
// 第九關：每次換手時天秤的角度。在 0.5° 到 20° 之間（翻到一半、還沒到底）就換手，表示翻轉被切成好幾段、拖到之後的回合（常常是敵軍自己的回合）才翻完
const G = require('../load')('PH');
const { S, simInit, simStep, BOTS } = G;
const bot = process.argv[2] || 'casual', N = +(process.argv[3] || 16), seed0 = +(process.argv[4] || 8800);
let mid = 0, games = 0, gamesMid = 0, hand = 0; const ex = [];
for (let g = 0; g < N; g++) {
  const seed = seed0 + g * 7919; simInit(8, {}, seed, 1, { botA: BOTS[bot] }); games++;
  let any = false, last = 0;
  S.on = (t, a) => { if (t !== 'turn' || !S.pivots[0]) return; hand++; const d = Math.abs(S.pivots[0].ang * 57.3); if (d > 0.5 && d < 20) { mid++; any = true; if (ex.length < 6) ex.push(`seed ${seed} R${S.round} hand-off to side${a}: beam ${(S.pivots[0].ang * 57.3).toFixed(1)}° (was ${last.toFixed(1)}° at previous hand-off)`); } last = S.pivots[0].ang * 57.3; };
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  if (any) gamesMid++;
}
console.log(`L9 [${bot}] ${games} games: ${mid}/${hand} hand-offs happened with the beam part-way tipped (0.5°-20°); ${gamesMid} games affected`);
for (const s of ex) console.log('   ' + s);
