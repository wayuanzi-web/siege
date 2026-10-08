// node test/review7/winrate.js <關卡> <自動玩家> <場數> [seed0=31000]：勝率、平均回合、超過 12 回合的場數（seed 跟 table.js 不同，用來交叉檢查）
const G = require('../load')();
const { S, simInit, simStep, LEVELS, BOTS } = G;
const li = +process.argv[2] - 1, bot = process.argv[3], N = +process.argv[4], seed0 = +(process.argv[5] || 31000);
let w = 0, r = 0, long = 0, lost = 0; const rs = [];
for (let g = 0; g < N; g++) {
  simInit(li, {}, seed0 + g * 104729 + li * 31, 1, { botA: BOTS[bot] });
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  if (S.state === 'won') w++; r += S.round; rs.push(S.round + (S.state === 'won' ? 'w' : S.state === 'lost' ? 'l' : '?')); if (S.round > 12) long++; lost += S.team[0].units.length - S.team[0].alive;
}
console.log(`L${li + 1} ${LEVELS[li].name} [${bot}] ${w}/${N} won (${(100 * w / N).toFixed(0)}%), avg rounds ${(r / N).toFixed(1)}, >12 rounds ${long}, avg lost ${(lost / N).toFixed(1)}  [${rs.join(' ')}]`);
