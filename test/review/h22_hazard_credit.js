// H22：災害階段（落石、清碎塊）進行時 S.turn 還停在 1，physStep / burnStep 都把傷害記在 S.turn 那一邊，
// 所以落石砸我方城樓、砸我方的兵，都在替「敵軍的連珠」集氣（還算進敵軍的 T.dealt）。
//   node test/review/h22_hazard_credit.js [seeds=4]
const G = require('./h')();
const { S, simInit, simStep, BOTS } = G;
const N = +(process.argv[2] || 4);
for (const li of [3, 5]) {
  let hz = 0, gain = 0, maxGain = 0, total = 0, ults = 0, games = 0, filled = 0;
  for (const bot of ['casual', 'expert']) for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 47000 + sd * 7919 + li * 131 + bot.length, 1, { botA: BOTS[bot] }); games++;
    let prev = 0, inHz = false, start = 0, lastC = 0;
    while (S.state === 'play' && S.round < 40) {
      const T = S.team[1], c0 = T.ult.c, ph0 = S.phase;
      simStep(1 / 60);
      const d = Math.max(0, T.ult.c - c0);
      total += d;
      if (ph0 === 'hazard') { if (!inHz) { inHz = true; start = 0; if (S.hz) hz++; } start += d; gain += d; } else if (inHz) { inHz = false; if (start > maxGain) maxGain = start; if (start > 0 && c0 >= T.ult.need) filled++; }
    }
    ults += S.team[1].ult.uses;
  }
  console.log(`L${li + 1}: ${games} games, ${hz} rock falls; enemy ult charge gained DURING hazard phases: ${gain.toFixed(0)} of ${total.toFixed(0)} total (${(100 * gain / total).toFixed(0)}%), biggest single hazard +${maxGain.toFixed(0)}/100; enemy ult volleys fired: ${ults}`);
}
