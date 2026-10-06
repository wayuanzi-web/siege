// H1：開火之後（volley 階段）還能用 simAim 改砲口，佇列裡還沒打出去的那幾發會照新的角度飛。
// 「一輪 = 一個角度 + 一個力道」的規則被繞過：連弩六箭、連珠三輪都可以邊打邊掃。
const G = require('./h')();
const { S, SH, simInit, simStep, simAim, simFire, simSkill } = G;
simInit(0, {}, 4242, 1, null);                      // 第一關，我方手動（火箭、連弩、火箭）
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
S.team[0].ult.c = S.team[0].ult.need; simSkill(0, 'ult');      // 連珠：每個兵打三輪，這一輪持續更久
simAim(0, 40, 30);
const aim0 = S.team[0].aim.slice();
const log = [];
S.on = (t, a, b, c, d) => { if (t === 'fire' && c === 0) { const i = SH.n - 1; log.push({ phaseT: +S.phaseT.toFixed(2), slot: arguments.length, ang: Math.atan2(SH.vy[i], SH.vx[i]), v: Math.hypot(SH.vx[i], SH.vy[i]) }); } };
console.log('fire accepted:', simFire(0), 'phase =', S.phase, ' queued shots =', S.vq.length);
console.log('second simFire(0) while in volley:', simFire(0), '| simFire(1) by wrong side:', simFire(1));
let changed = false;
while (S.phase === 'volley') {
  if (!changed && S.phaseT > 0.5) { simAim(0, 20, 70); changed = true; console.log(`t=${S.phaseT.toFixed(2)} (phase=${S.phase}) player drags: aim ${aim0.map((v) => v.toFixed(1))} -> ${S.team[0].aim.map((v) => v.toFixed(1))}`); }
  simStep(1 / 60);
}
const a0 = Math.atan2(aim0[1], aim0[0]);
let before = 0, after = 0;
for (const r of log) { if (Math.abs(r.ang - a0) < 0.06) before++; else after++; }
console.log(`shots launched with the ORIGINAL aim: ${before};  shots launched with the aim changed AFTER firing: ${after}`);
console.log('angles (deg) in firing order:', log.map((r) => (r.ang * 57.3).toFixed(0)).join(' '));
console.log(after > 0 ? 'CONFIRMED: aim is not locked for the duration of the volley' : 'not reproduced');
