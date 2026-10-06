// H7 補充：玩家的虛線只畫前 0.75～1.2 秒（RD.aimT）。只看「在這段時間內到達傳送門」的角度，虛線和實際還差多少？
const G = require('./h')();
const { S, SH, simInit, simStep, simTrace, spawnShot, WPN, F_IN } = G;
const WIN = 1.2;
let both = 0, traceOnly = 0, realOnly = 0, bothLate = 0, tOnlyLate = 0, rOnlyLate = 0;
for (const [seed, warm] of [[11, 0], [11, 90], [11, 200], [23, 330], [23, 470]]) {
  simInit(4, {}, seed, 1, { mute: 1 }); S.team[0].mute = true;
  while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
  for (let i = 0; i < warm; i++) simStep(1 / 60);
  for (const u of S.team[0].units) {
    const mx = u.x + 1.3, my = u.y + 2.3;
    for (let a = 0.15; a <= 1.45; a += 0.0125) for (let v = 34; v <= 86; v += 2) {
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      const R = simTrace(0, mx, my, vx, vy, S.wind, S.time, 150), tp = R.port, tt = R.t, t0 = S.time;
      let real = false, rt = 0; S.on = (t, a, b, c, d) => { if (t === 'port' && c === 0 && d === 0) real = true; };
      const n0 = SH.n; spawnShot(0, WPN.bolt.i, mx, my, vx, vy, 1, F_IN, 0, 1);
      let t = 0; while (SH.n > n0 && t < 6 && !real) { S.time += 1 / 60; t += 1 / 60; G.objsStep(1 / 60); G.shotsStep(1 / 60); }
      rt = t; while (SH.n > n0) G.killShot(SH.n - 1); S.time = t0; G.objsStep(0); S.on = null;
      if (!tp && !real) continue;
      const early = (tp ? tt : 99) <= WIN || (real ? rt : 99) <= WIN;
      if (early) { if (tp && real) both++; else if (tp) traceOnly++; else realOnly++; } else { if (tp && real) bothLate++; else if (tp) tOnlyLate++; else rOnlyLate++; }
    }
  }
}
const m = traceOnly + realOnly, n = m + both, ml = tOnlyLate + rOnlyLate, nl = ml + bothLate;
console.log(`portal reached within the ${WIN}s the dotted line shows: ${n} aims, dotted line wrong on ${m} (${(100 * m / n).toFixed(0)}%) [line ends in the portal but the shot misses: ${traceOnly}; line passes by but the shot is teleported: ${realOnly}]`);
console.log(`portal reached later (only the AI's and the bots' aim search sees this): ${nl} aims, trace wrong on ${ml} (${(100 * ml / nl).toFixed(0)}%)`);
