// H7：simTrace（瞄準虛線、AI、上一輪軌跡都靠它）把傳送門當成不會動的；可是第五關的傳送門會上下飄（每秒約 1.6）。
// 所以虛線說「會進門」的角度，真的打出去常常擦邊飛過；反過來也有。倍增符有照開火時間推算位置（gatePosAt），傳送門沒有。
const G = require('./h')();
const { S, SH, simInit, simStep, simTrace, spawnShot, WPN, F_IN } = G;
function trial(seed, warm) {
  simInit(4, {}, seed, 1, { mute: 1 });
  S.team[0].mute = true;
  while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
  for (let i = 0; i < warm; i++) simStep(1 / 60);                // 傳送門飄到不同的相位
  const u = S.team[0].units[0], mx = u.x + 1.3, my = u.y + 2.3, port = S.objs.find((o) => o.t === 'portal' && o.owner === 0);
  const res = { both: 0, traceOnly: 0, realOnly: 0, neither: 0 };
  // 掃一片角度／力道，只留下軌跡會經過傳送門附近的
  const aims = [];
  for (let a = 0.15; a <= 1.45; a += 0.0125) for (let v = 34; v <= 86; v += 2) aims.push([Math.cos(a) * v, Math.sin(a) * v]);
  for (const [vx, vy] of aims) {
    const R = simTrace(0, mx, my, vx, vy, S.wind, S.time, 150), tp = R.port;
    // 真的打一發：同一個時間點、同一個砲口、同一個初速（沒有散布）
    const save = { time: S.time, frame: S.frame, py: port.y };
    let real = false; const on = S.on; S.on = (t, a, b, c, d) => { if (t === 'port' && c === 0) real = true; };
    const n0 = SH.n; spawnShot(0, WPN.bolt.i, mx, my, vx, vy, 1, F_IN, 0, 1);
    // 只跑砲彈和機關（不動物理），跑完把時間倒回去：每一個角度都從同一個瞬間出發
    let t = 0; while (SH.n > n0 && t < 6 && !real) { S.time += 1 / 60; t += 1 / 60; G.objsStep(1 / 60); stepShotOnly(); }
    while (SH.n > n0) G.killShot(SH.n - 1);
    S.time = save.time; G.objsStep(0); S.on = on;
    if (tp && real) res.both++; else if (tp) res.traceOnly++; else if (real) res.realOnly++; else res.neither++;
  }
  return res;
}
// 單獨走一步砲彈（跟 shotsStep 一樣，只是不想讓防空弩攪局）
function stepShotOnly() { G.shotsStep(1 / 60); }
let tot = { both: 0, traceOnly: 0, realOnly: 0 };
for (const [seed, warm] of [[11, 0], [11, 90], [11, 200], [23, 330], [23, 470]]) {
  const r = trial(seed, warm); console.log(`seed ${seed} warm ${warm}:`, JSON.stringify(r));
  tot.both += r.both; tot.traceOnly += r.traceOnly; tot.realOnly += r.realOnly;
}
const mism = tot.traceOnly + tot.realOnly, any = mism + tot.both;
console.log(`aims that touch the portal in either the preview or reality: ${any};  preview and reality disagree on ${mism} (${(100 * mism / any).toFixed(0)}%)  [preview says portal but real shot misses: ${tot.traceOnly}; preview says miss but real shot is teleported: ${tot.realOnly}]`);
