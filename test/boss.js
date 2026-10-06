// node test/boss.js [bot=casual] [場數=4] [foe.hp] [foe.dmg]：魔王關每一回合魔王剩多少血、我方剩幾個兵
const G = require('./load')('bossUnit');
const { S, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const bot = process.argv[2] || 'casual', N = +(process.argv[3] || 4);
if (process.argv[4]) LEVELS[5].foe.hp = +process.argv[4]; if (process.argv[5]) LEVELS[5].foe.dmg = +process.argv[5];
for (let sd = 0; sd < N; sd++) {
  simInit(5, {}, 500 + sd * 7919 + 5 * 131, 1, { botA: BOTS[bot] }); let lr = 0; const row = [];
  S.on = (t, a, b, c, d, e) => { if (t === 'phase') row.push('[P' + a + ']'); if (t === 'udie') row.push((c === 0 ? 'me-' : 'foe-') + d); if (t === 'barbreak') row.push('bar!'); if (t === 'orbdie') row.push('orb!'); if (t === 'bossback') row.push('BACK'); if (t === 'bonus') row.push((c ? 'foe+' : 'me+') + d); if (t === 'sudden') row.push('[SUDDEN]'); if (t === 'shield' && c === 0) row.push('sh'); if (t === 'ult' && c === 0) row.push('ULT'); };
  while (S.state === 'play' && S.round < 40) { simStep(1 / 60); if (S.round !== lr) { lr = S.round; const bu = G.bossUnit(); row.push('r' + lr + ':' + Math.round(bu.hp) + '/' + S.team[0].alive); } }
  console.log(S.state, row.join(' '));
}
