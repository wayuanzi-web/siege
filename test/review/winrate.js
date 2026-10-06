// node test/review/winrate.js [levels=3-6] [seeds=8] [bots=casual,newbie]：自動玩家的勝率（配合 PATCH=… 比較修法前後）
const G = require('./h')();
const { S, simInit, simStep, BOTS, LEVELS, teamBar } = G;
const m = (process.argv[2] || '3-6').split('-'), N = +(process.argv[3] || 8), bots = (process.argv[4] || 'casual,newbie').split(',');
let tw = 0, tg = 0;
for (let li = +m[0] - 1; li <= +(m[1] || m[0]) - 1; li++) {
  const row = [];
  for (const bot of bots) { let w = 0, r = 0, lost = 0; for (let sd = 0; sd < N; sd++) { simInit(li, {}, 9000 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] }); while (S.state === 'play' && S.round < 40) simStep(1 / 60); if (S.state === 'won') w++; r += S.round; lost += S.team[0].units.length - S.team[0].alive; } row.push(`${bot} ${w}/${N} wins, ${(r / N).toFixed(1)} rounds, ${(lost / N).toFixed(1)} units lost`); tw += w; tg += N; }
  console.log(`L${li + 1}: ` + row.join('  |  '));
}
console.log(`total ${tw}/${tg}`);
