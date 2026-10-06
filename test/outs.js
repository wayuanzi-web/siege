// node test/outs.js <關卡 1-6> [場數=6]：每個「出局」的兵是怎麼出去的（死的那一刻的位置、速度；出事前一秒在哪）
const G = require('./load')(); const { S, simInit, simStep, LEVELS, BOTS } = G;
const li = +(process.argv[2] || 3) - 1, N = +(process.argv[3] || 6);
const HOW = ['擊倒', '砸扁', '?', '燒', '摔出場', '出城'];
for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, 9000 + sd * 7919 + li * 131, 1, { botA: BOTS.casual });
  const hist = new Map();
  S.on = (t, a, b, c, d, e, f) => {
    if (t !== 'udie') return;
    const u = S.units.find((k) => !k.alive && k.side === c && k.slot === f && !k._seen); if (u) u._seen = 1;
    const h = u ? hist.get(u) : null, st = S.st[c];
    const tr = h ? h.slice(-8).map((p) => `(${(p[0] - st.x0).toFixed(0)},${p[1].toFixed(0)}|${p[2].toFixed(0)},${p[3].toFixed(0)})`).join(' ') : '';
    console.log(`#${sd} r${S.round} ${S.phase}${S.turn} ${c ? '敵' : '我'}${d} ${HOW[e]} 在 x-x0=${(a - st.x0).toFixed(1)} (城寬 ${st.w.toFixed(0)}) y=${b.toFixed(1)}  軌跡(每0.25s 位置|速度): ${tr}`);
  };
  let n = 0;
  while (S.state === 'play' && S.round < 40) { simStep(1 / 60); if (++n % 15 === 0) for (const u of S.units) if (u.alive) { let h = hist.get(u); if (!h) hist.set(u, h = []); h.push([u.x, u.y, u.vx, u.vy]); if (h.length > 40) h.shift(); } }
}
