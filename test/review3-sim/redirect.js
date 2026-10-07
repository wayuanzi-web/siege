// node test/review3-sim/redirect.js
// 爆炸推兵的上限 UKB_V = 9：「最多把兵推到多快」。pushScale() 的規則是「推完不能比 vmax 快；本來就比 vmax 快的，不能再更快」。
// 那正在往下掉的兵（速度已經超過 9）旁邊炸幾發，會怎樣？把一個敵兵放在半空中、讓他以不同的速度往下掉，
// 在他左邊連炸 n 發火箭（我方的），量他最後的水平速度。SIEGE_SRC 可以換舊版比較
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, physExplode, WPN } = G;
console.log('src=' + G.__dir);
for (const fall of [0, 10, 20, 30, 40]) for (const n of [1, 3, 8]) {
  simInit(0, {}, 3, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'resolve';
  const u = S.team[1].units[0];
  u.body.setTransform({ x: 60, y: 90 }, 0); u.body.setLinearVelocity({ x: 0, y: -fall }); u.body.setAwake(true);
  let vx = 0;
  for (let k = 0; k < n; k++) {
    const p = u.body.getPosition();
    physExplode(p.x - 2.0, p.y, WPN.rocket, 0, 1, 0, null, 60, -20);
    if (!u.alive) break;
    vx = u.body.getLinearVelocity().x;
    S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60);
  }
  const v = u.alive ? u.body.getLinearVelocity() : { x: NaN, y: NaN };
  console.log(`falling at ${String(fall).padStart(2)} , ${n} rocket blast(s) on his left: horizontal speed ${vx.toFixed(1)}  (velocity now ${v.x.toFixed(1)}, ${v.y.toFixed(1)}; hp ${u.alive ? (100 * u.hp / u.hpMax).toFixed(0) + '%' : 'dead'})`);
}
