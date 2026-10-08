// node test/review5-sim/stale_load.js
// 兵在井底被石球壓住、整組睡著之後，把石球「直接拿掉」（清場、掉出戰場那種不留碎塊的消失）或炸碎：他還會不會繼續被扣血（u.load 卡在睡著前的數字）？
const L = require('./lib5');
for (const how of ['clean kill (no fragments)', 'normal kill', 'ball set to hp 1 then hit by a rocket blast']) {
  const H = {}; const G = L.load('', H); const { S, PH, PL, simInit, simStep, mkBlock, mkUnit, M_ROCK, CS } = G;
  simInit(3, {}, 7, 1, {}); const X0 = 50, GY = -3.5;
  const wall = PH.world.createBody({ type: 'static' }); for (const sx of [-1, 1]) wall.createFixture({ shape: new PL.Box(0.5, 6, { x: X0 + sx * (3.4 / 2 + 0.5), y: GY + 6 }, 0), friction: 0.7 });
  const fake = { side: 0, x0: X0 - 10, x1: X0 + 10, y0: GY, units: [] };
  const u = mkUnit(0, 'bomb', fake, { slot: 9, cx: (X0 - fake.x0) / CS - 0.5, cy: 0 }, 3); S.team[0].alive++; u.body.setAwake(true);     // 血多一點（360），才看得出來拿掉之後有沒有繼續扣
  let ball = null, removedAt = -1, hpAtRemove = 0, loadAtRemove = 0, log = '';
  for (let i = 0; i < 60 * 8; i++) {
    S.phaseT = 0;
    if (i === 30) { ball = mkBlock(S.rubble, { mat: M_ROCK, kind: 'ball', x: X0, y: u.y + u.bh + 1.598 + 0.3, r: 1.598, den: 4, awake: true }); ball.inPlace = false; }
    if (removedAt < 0 && ball && !u.body.isAwake() && !ball.body.isAwake() && u.loadT > 0.5) {
      removedAt = S.time; hpAtRemove = u.hp; loadAtRemove = u.load;
      if (how.startsWith('clean')) G.blockKill(ball, 2, G.K_CRUSH, true); else if (how.startsWith('normal')) G.blockKill(ball, 2, G.K_CRUSH, false); else { ball.hp = 1; const p = ball.body.getPosition(); G.physExplode(p.x, p.y + 1.7, G.WPN.rocket, 0, 1, 0, ball, 0, -1); }
    }
    simStep(1 / 60);
    if (removedAt >= 0 && Math.abs(S.time - removedAt - 0.5) < 0.009) log = `0.5 s later: hp ${u.hp.toFixed(0)}, load ${u.load.toFixed(2)}, ${u.body.isAwake() ? 'awake' : 'asleep'}`;
    if (!u.alive) break;
  }
  console.log(`${how}: removed at t=${removedAt.toFixed(2)} (unit asleep, load ${loadAtRemove.toFixed(2)}, hp ${hpAtRemove.toFixed(0)}); ${log}; at the end: ${u.alive ? 'alive hp ' + u.hp.toFixed(0) + ' load ' + u.load.toFixed(2) : 'DEAD'}`);
}
