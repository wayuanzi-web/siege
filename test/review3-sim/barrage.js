// node test/review3-sim/barrage.js [組數=120]：密集轟炸。同一幀裡幾十到上百發小砲彈（各種砲彈、怒火 ×3、滿級強化）炸在同一座城的同一帶，連炸好幾幀；
// 碎塊數量頂到上限的時候樓板照樣要能斷開。每一步檢查內部一致性，最後看有沒有例外、多久靜止、每一步最久算多久
const L = require('./lib'); const G = L.load('FRAG_MAX');
const { S, PH, simInit, simStep, LEVELS, physExplode, WPN, FRAG_MAX } = G;
const N = +(process.argv[2] || 120), chk = L.mkCheck(G, { stuckT: 1e9 });
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const WS = ['rocket', 'bolt', 'dark', 'fire', 'ice', 'zap', 'bomb', 'drop'];
let worst = 0, worstTag = '', fragCap = 0, splits = 0, exc = 0, slow = 0, tot = 0, steps = 0;
for (let g = 0; g < N; g++) {
  const li = g % 6, side = (g / 6 | 0) % 2; seed = g * 7919 + 13; rnd();
  simInit(li, g % 4 === 0 ? L.UPMAX : {}, 3, g % 3, null); S.team[1].ai = null; S.phase = 'resolve'; S.round = 1; S.turn = 1 - side; S.rage = [1, 1, 2, 3][g % 4]; chk.reset();
  const st = S.st[side], cx = st.x0 + rnd() * st.w, cy = st.y0 + rnd() * st.h, per = 20 + ((rnd() * 80) | 0), frames = 1 + ((rnd() * 10) | 0), tag = `barrage g${g} L${li + 1} castle${side} ${per}/frame x ${frames} frames around (${cx.toFixed(0)},${cy.toFixed(0)}) rage${S.rage}`;
  S.on = (t, a, b, c, d, e, f) => { if (t === 'cell' && f && !f.isBlock) splits++; };
  try {
    for (let i = 0; i < 600; i++) {
      S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0;
      if (i < frames) for (let k = 0; k < per; k++) { const w = WS[(rnd() * WS.length) | 0]; physExplode(cx + (rnd() - 0.5) * 16, Math.max(0.3, cy + (rnd() - 0.5) * 16), WPN[w], 1 - side, 0.15 + rnd() * 0.5, rnd() < 0.2 ? 4 : 0, null, (rnd() - 0.5) * 40, -30); }
      const t0 = process.hrtime.bigint(); simStep(1 / 60); const ms = Number(process.hrtime.bigint() - t0) / 1e6; tot += ms; steps++; if (ms > worst) { worst = ms; worstTag = tag + ` step ${i}`; } if (ms > 8) slow++;
      chk.step(tag); if (S.nfrag >= FRAG_MAX - 1) fragCap++;
    }
  } catch (e) { exc++; chk.fail('EXCEPTION', `${tag}: ${e.stack.split('\n').slice(0, 4).join(' | ')}`); }
}
console.log(`${N} barrages, ${steps} steps: exceptions ${exc}; splits ${splits}; steps with the fragment count at its cap ${fragCap}; mean step ${(tot / steps).toFixed(2)}ms, slowest ${worst.toFixed(1)}ms (${worstTag}), steps over 8ms: ${slow}`);
if (chk.fails.size) { console.log(`${chk.fails.size} kinds of invariant failure:`); console.log(L.report(chk.fails)); } else console.log('no invariant failures');
