// H7 的對照組：把傳送門固定不動，再比一次。剩下的差異就是 simTrace 每 1/30 秒才看一次位置造成的（真的砲彈每 1/60 秒看一次）。
const G = require('./h')();
const { S, SH, simInit, simStep, simTrace, spawnShot, WPN, F_IN } = G;
function trial(seed, warm, freeze) {
  simInit(4, {}, seed, 1, { mute: 1 }); S.team[0].mute = true;
  while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
  for (let i = 0; i < warm; i++) simStep(1 / 60);
  const u = S.team[0].units[0], mx = u.x + 1.3, my = u.y + 2.3, port = S.objs.find((o) => o.t === 'portal' && o.owner === 0);
  if (freeze) port.mv = null;
  const res = { both: 0, traceOnly: 0, realOnly: 0 };
  for (let a = 0.15; a <= 1.45; a += 0.0125) for (let v = 34; v <= 86; v += 2) {
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
    const tp = simTrace(0, mx, my, vx, vy, S.wind, S.time, 150).port, t0 = S.time;
    let real = false; S.on = (t, a, b, c) => { if (t === 'port' && c === 0) real = true; };
    const n0 = SH.n; spawnShot(0, WPN.bolt.i, mx, my, vx, vy, 1, F_IN, 0, 1);
    let t = 0; while (SH.n > n0 && t < 6 && !real) { S.time += 1 / 60; t += 1 / 60; G.objsStep(1 / 60); G.shotsStep(1 / 60); }
    while (SH.n > n0) G.killShot(SH.n - 1);
    S.time = t0; G.objsStep(0); S.on = null;
    if (tp && real) res.both++; else if (tp) res.traceOnly++; else if (real) res.realOnly++;
  }
  return res;
}
for (const freeze of [false, true]) {
  const tot = { both: 0, traceOnly: 0, realOnly: 0 };
  for (const [seed, warm] of [[11, 0], [11, 90], [11, 200], [23, 330], [23, 470]]) { const r = trial(seed, warm, freeze); tot.both += r.both; tot.traceOnly += r.traceOnly; tot.realOnly += r.realOnly; }
  const mism = tot.traceOnly + tot.realOnly, any = mism + tot.both;
  console.log(`${freeze ? 'portal held still (control)' : 'portal bobbing (as shipped)'}: ${any} portal aims, preview wrong on ${mism} (${(100 * mism / any).toFixed(0)}%)  [says-portal-but-misses ${tot.traceOnly}, says-miss-but-teleported ${tot.realOnly}]`);
}
