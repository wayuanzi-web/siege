// node test/why.js <關卡> <bot> [場數]：兵是怎麼死的（0 被打死、1 被壓死、2 摔死、3 燒死），各在第幾秒
const G = require('./load')();
const { S, simInit, simStep, BOTS, teamBar } = G;
const li = +(process.argv[2] || 1) - 1, bot = process.argv[3] || 'casual', n = +(process.argv[4] || 4);
for (let sd = 0; sd < n; sd++) {
  simInit(li, {}, 1000 + sd * 7919 + li * 131, 1, bot === 'idle' ? null : { botA: BOTS[bot] });
  const log = [];
  S.on = (t, a, b, c, d, e, f) => { if (t === 'udie') log.push(`${c === 0 ? 'ME ' : 'foe'}:${d}@${S.time.toFixed(0)}s/${['hit', 'crush', 'fall', 'burn'][e]}(bar ${(teamBar(c) * 100).toFixed(0)}%)`); };
  while (S.state === 'play' && S.time < 320) simStep(1 / 60);
  console.log(`${S.state} t=${S.time.toFixed(0)} me=${(teamBar(0) * 100).toFixed(0)}% foe=${(teamBar(1) * 100).toFixed(0)}% | ` + log.join('  '));
}
