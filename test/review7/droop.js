// node test/review7/droop.js <mode: forced|real>：L8 打掉上殿屋頂、剪斷上殿鐵鍊之後，每 0.1 秒印出上殿插銷的下垂角度、角速度、睡著沒、馬達力矩上限、階段
const G = require('../load')('PH, blockDist, blockKill, ropeCut, K_CRUSH');
const { S, simInit, simStep } = G;
const mode = process.argv[2] || 'real';
simInit(7, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].mute = true;
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
S.team[0].mute = true; G.simFire(0); S.team[0].mute = false;
const roof = S.blocks.find((b) => !b.dead && G.blockDist(b, 86.5, 28.9) < 0.3); G.blockKill(roof, 0, G.K_CRUSH); G.ropeCut(S.ropes[2], 0, G.K_CRUSH, false);
const o = S.pins[1];
for (let i = 0; i < 300; i++) {
  if (mode === 'forced') { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; }
  if (S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.3) { S.team[0].mute = true; G.simFire(0); S.team[0].mute = false; }
  simStep(1 / 60);
  if (i % 6 === 5 && !o.broke) console.log(`${S.time.toFixed(2)} ${S.phase}/t${S.turn} droop ${((o.b.body.getAngle() - o.a0) * o.droop * 57.3).toFixed(2)}° w ${(o.b.body.getAngularVelocity() * o.droop).toFixed(3)} awake ${o.b.body.isAwake()} maxT ${o.j ? o.j.getMaxMotorTorque().toExponential(2) : '-'} motorT ${o.j ? Math.abs(o.j.getMotorTorque(60)).toFixed(0) : '-'} tq ${o.tq.toFixed(0)}`);
  if (o.broke) { console.log(`${S.time.toFixed(2)} pin broke`); break; }
}
