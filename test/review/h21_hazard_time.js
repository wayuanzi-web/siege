// G：落石（還有城裡的石球、木桶）滾很久才停。球在平地上滾只靠 angularDamping 0.7 慢下來（時間常數約 4 秒），
// 所以災害階段（hazard）和結算階段（resolve）常常要等到 9 秒上限才換下一步；第六關的隕石還會滾到畫面外去。
//   node test/review/h21_hazard_time.js [seeds=4] [levels=4,6]
const G = require('./h')();
const { S, simInit, simStep, BOTS } = G;
const NSEED = +(process.argv[2] || 4), lvs = (process.argv[3] || '4,6').split(',').map((x) => +x - 1);
for (const li of lvs) {
  let hz = 0, hzSum = 0, hzCap = 0, rs = 0, rsSum = 0, rsCap = 0, gameSec = 0, rounds = 0, offRock = 0;
  for (const bot of ['casual', 'expert']) for (let sd = 0; sd < NSEED; sd++) {
    simInit(li, {}, 88000 + sd * 7919 + li * 131 + bot.length, 1, { botA: BOTS[bot] });
    while (S.state === 'play' && S.round < 40) {
      const ph = S.phase, pt = S.phaseT; simStep(1 / 60);
      if (S.state === 'play' && S.phase !== ph) {
        if (ph === 'hazard' && S.hz) { hz++; hzSum += pt; if (pt > 8.9) { hzCap++; let off = false; for (const b of S.rubble.blocks) if (!b.dead && (b.body.getPosition().x < -9 || b.body.getPosition().x > 121) && b.body.isAwake()) off = true; if (off) offRock++; } }
        if (ph === 'resolve') { rs++; rsSum += pt; if (pt > 8.9) rsCap++; }
      }
    }
    gameSec += S.time; rounds += S.round;
  }
  console.log(`L${li + 1}: rock hazard phases ${hz}, mean ${(hzSum / hz).toFixed(1)}s, ran to the 9 s cap ${hzCap} (${(100 * hzCap / hz).toFixed(0)}%; a rock still rolling OFF-SCREEN in ${offRock} of them);  resolve phases ${rs}, mean ${(rsSum / rs).toFixed(1)}s, capped ${rsCap};  ${(gameSec / rounds).toFixed(1)}s per round`);
}
