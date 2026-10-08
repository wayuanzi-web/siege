// node test/review7/swing.js <關卡> "<武器>@x,y" [秒數=30]
// 在吊著的東西（吊鐘、吊燈、配重籃）旁邊炸一下（繩子不斷），看它晃多久才停：worldQuiet() 對它的門檻是速度 > 1.79 或角速度 > 0.7 就不算靜止
const G = require('../load')('PH, blockDist, worldQuiet');
const { S, simInit, simStep, WPN, physExplode, LEVELS, MAT } = G;
const li = +process.argv[2] - 1, cmd = process.argv[3], T = +(process.argv[4] || 30);
simInit(li, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null;
S.phase = 'resolve'; S.turn = 0; S.round = 1;
const m = cmd.match(/^(\w+)@([-\d.]+),([-\d.]+)$/);
physExplode(+m[2], +m[3], WPN[m[1]], 0, 1, 0, null, 1, 0);
const hangs = S.blocks.filter((b) => b.hang);
let lastBusy = 0, lastQuietFalse = 0;
for (let i = 0; i < T * 60; i++) {
  S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60);
  for (const b of hangs) { if (b.dead) continue; const v = b.body.getLinearVelocity(), om = Math.abs(b.body.getAngularVelocity()); if (v.x * v.x + v.y * v.y > 3.2 || om > 0.7) lastBusy = S.time; }
  if (!G.worldQuiet()) lastQuietFalse = S.time;
  if (i % 60 === 59) console.log(`t=${((i + 1) / 60).toFixed(0)}s ` + hangs.map((b) => b.dead ? `${b.hang}✗` : `${b.hang} v${Math.hypot(b.body.getLinearVelocity().x, b.body.getLinearVelocity().y).toFixed(2)} w${b.body.getAngularVelocity().toFixed(2)} a${(b.body.getAngle() * 57.3).toFixed(0)}° awake${b.body.isAwake() ? 1 : 0}${b.inPlace ? '' : ' 離位'}`).join(' | ') + ` | worldQuiet ${G.worldQuiet()}`);
}
console.log(`hang objects last over the quiet threshold at ${lastBusy.toFixed(2)}s; worldQuiet() last false at ${lastQuietFalse.toFixed(2)}s; ropes cut: ${S.ropes.filter((r) => r.cut).map((r) => r.tag).join(',') || 'none'}`);
