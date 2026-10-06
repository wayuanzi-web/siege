// node test/tune.js [場數] [強化等級]：六關 × 三種自動玩家的勝率、用時、過關時我方城防、敵方有幾場是「守軍全滅」結束
const G = require('./load')();
const { S, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const N = +(process.argv[2] || 10), upL = +(process.argv[3] || 0), diff = process.env.DIFF === undefined ? 1 : +process.env.DIFF;
const only = process.env.LV ? process.env.LV.split(',').map(Number) : null;
const up = { dmg: upL, rate: upL, hp: upL, shield: upL, ult: upL };
console.log(`diff ${diff} up ${upL} N ${N}        很會玩                   普通                     新手`);
for (let li = 0; li < LEVELS.length; li++) {
  if (only && !only.includes(li + 1)) continue;
  let row = `L${li + 1} ${LEVELS[li].name}  `;
  for (const bot of ['expert', 'casual', 'newbie']) {
    let w = 0, ts = 0, bs = 0, bu = 0, lostU = 0, s3 = 0;
    for (let k = 0; k < N; k++) {
      simInit(li, up, 5000 + k * 7919 + li * 131, diff, { botA: BOTS[bot] });
      while (S.state === 'play' && S.time < 400) simStep(1 / 60);
      ts += S.time; lostU += S.team[0].units.length - S.team[0].alive;
      if (S.state === 'won') { w++; bs += teamBar(0); if (S.team[1].alive <= 0) bu++; if (teamBar(0) >= 0.6) s3++; }
    }
    row += `${String(w).padStart(2)}/${N} ${(ts / N).toFixed(0).padStart(3)}s 城${w ? (bs / w * 100).toFixed(0).padStart(3) : '  -'}% ★3:${String(s3).padStart(2)} 滅${String(bu).padStart(2)} 損${(lostU / N).toFixed(1)} | `;
  }
  console.log(row);
}
