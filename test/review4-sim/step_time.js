// node test/review4-sim/step_time.js [每關幾場=4]
// 每一步模擬花多久（Node、這台機器）。最慢的幾步各發生在什麼時候；敵軍「選好角度」那一步（aiChoose：最多八種打法 × 每個兵各試射一發）多慢
const L = require('./lib4');
const G = L.load('', { hooks: {}, tag: false, patch: [['function aiChoose(T) {', 'function aiChoose(T) { __H.choose = (__H.choose || 0) + 1; __H.inChoose = true;'], ['  A.px = a[0]; A.py = a[1]; A.warn = v.mult;\n}', '  A.px = a[0]; A.py = a[1]; A.warn = v.mult; __H.inChoose = false;\n}']] });
const { S, simInit, simStep, LEVELS, BOTS } = G; const H = G.__H;
const N = +(process.argv[2] || 4); const { performance } = require('perf_hooks');
for (let li = 0; li < LEVELS.length; li++) {
  const ts = [], slow = []; let chooseMax = 0, chooseN = 0, chooseSum = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 31000 + sd * 7919 + li * 131, 1, { botA: BOTS.casual });
    while (S.state === 'play' && S.round < 40) {
      const c0 = H.choose || 0, t0 = performance.now(); simStep(1 / 60); const dt = performance.now() - t0; ts.push(dt);
      if ((H.choose || 0) > c0) { chooseN++; chooseSum += dt; if (dt > chooseMax) chooseMax = dt; }
      if (dt > 8) slow.push(`${dt.toFixed(1)}ms r${S.round} ${S.phase}/${S.turn}${(H.choose || 0) > c0 ? ' (aiChoose step)' : ''} shots ${G.SH.n}`);
    }
  }
  ts.sort((a, b) => a - b);
  console.log(`L${li + 1}: ${ts.length} steps; median ${ts[ts.length >> 1].toFixed(2)}ms, p99 ${ts[(ts.length * 0.99) | 0].toFixed(2)}ms, p99.9 ${ts[(ts.length * 0.999) | 0].toFixed(2)}ms, max ${ts[ts.length - 1].toFixed(1)}ms; steps over 8 ms: ${slow.length}; aiChoose steps: ${chooseN}, mean ${(chooseSum / Math.max(1, chooseN)).toFixed(1)}ms, max ${chooseMax.toFixed(1)}ms`);
  for (const s of slow.slice(0, 4)) console.log('     ' + s);
}
