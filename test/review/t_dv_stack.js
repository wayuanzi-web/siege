// 第 8 項：DV_MAX（一次爆炸最多把磚加速到 38）是「每一次爆炸」的上限，同一步裡好幾發一起炸會一直疊，
// 直到物理引擎自己的上限（每步位移 2 → 120/秒）。兵也是（每次最多 26）。倍增之後一群砲彈同時落下時，兵就是這樣被轟出畫面的。
const G = require('./h')();
const { S, simInit, simStep, physExplode, WPN } = G;
for (const n of [1, 3, 10, 30]) {
  simInit(0, {}, 3, 1, { mute: 1 }); S.team[0].mute = true; S.team[0].ai = null;
  while (S.phase !== 'aim') simStep(1 / 60);
  const u = S.team[1].units[0], b = S.st[1].blocks.find((k) => !k.prop && k.cy === 9);
  const up = u.body.getPosition(), ux = up.x, uy = up.y;
  u.hp = u.hpMax = 1e6;                                             // 只看速度，不讓它被打死
  for (let k = 0; k < n; k++) physExplode(ux - 2.5, uy - 0.5, WPN.rocket, 0, 0.38, 0, null, 1, -1);       // 穿過 ×5 符之後的火箭（威力 0.38）
  const v0 = u.body.getLinearVelocity(), sp0 = Math.hypot(v0.x, v0.y);
  simStep(1 / 60);
  const v1 = u.body.getLinearVelocity(), sp1 = Math.hypot(v1.x, v1.y);
  let t = 0; while (u.alive && t < 6 && (Math.abs(u.vx) + Math.abs(u.vy) > 0.5 || t < 0.3)) { simStep(1 / 60); t += 1 / 60; }
  console.log(`${String(n).padStart(2)} split rockets on one unit in the same step: speed right after = ${sp0.toFixed(0)} u/s (after one physics step ${sp1.toFixed(0)}); unit ends ${u.alive ? 'ALIVE at x=' + u.x.toFixed(0) + (u.x > 121 ? '  <-- beyond the visible field (x <= 121)' : '') : 'removed (left the field at x > 142)'}`);
}
