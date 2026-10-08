// node test/review7/frozen.js <關卡 8|9> [自動玩家=casual] [場數=16] [seed0=8800]
// 瞄準階段（天秤、插銷被卡死的時候）每一次都量一下：卡住它要出多少力矩，跟砲擊時真正撐得住的（o.tq）比。
// 比 o.tq 大 = 它其實正在翻 / 往下垂，只是因為換人瞄準被凍住了（而且凍住之後會睡著，下一輪不一定會醒）
const G = require('../load')('PH');
const { S, simInit, simStep, BOTS } = G;
const L = +process.argv[2], bot = process.argv[3] || 'casual', N = +(process.argv[4] || 16), seed0 = +(process.argv[5] || 8800);
let aims = 0, frozen = 0, games = 0, gamesF = 0; const ex = [];
for (let g = 0; g < N; g++) {
  const seed = seed0 + g * 7919; simInit(L - 1, {}, seed, 1, { botA: BOTS[bot] }); games++;
  let any = false, measured = -1;
  while (S.state === 'play' && S.round < 40) {
    simStep(1 / 60);
    if (S.phase === 'aim' && S.phaseT > 0.25 && measured !== S.vol * 2 + S.turn) {
      measured = S.vol * 2 + S.turn; aims++;
      const js = S.pivots.filter((o) => o.b && o.j).map((o) => ({ o, need: Math.abs(o.j.getMotorTorque(60)), cap: o.tq, what: 'pivot', ang: o.ang * 57.3 }))
        .concat(S.pins.filter((o) => !o.broke && o.j).map((o) => ({ o, need: Math.abs(o.j.getMotorTorque(60)), cap: o.tq, what: 'pin', ang: (o.b.body.getAngle() - o.a0) * o.droop * 57.3 })));
      for (const q of js) if (q.need > q.cap * 1.02) { frozen++; any = true; if (ex.length < 6) ex.push(`seed ${seed} R${S.round} aim turn${S.turn}: ${q.what} held by the aim lock with ${q.need.toFixed(0)} > its real limit ${q.cap.toFixed(0)} (angle ${q.ang.toFixed(1)}°, awake ${q.o.b.body.isAwake()})`); }
    }
  }
  if (any) gamesF++;
}
console.log(`L${L} [${bot}] ${games} games: ${frozen} times an aim phase started with a ${L === 9 ? 'pivot' : 'pin'} that was only held by the aim-phase lock (would be tipping/drooping); ${gamesF} games affected; ${aims} aim phases`);
for (const s of ex) console.log('   ' + s);
