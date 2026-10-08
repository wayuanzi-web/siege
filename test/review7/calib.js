// node test/review7/calib.js [levels=6-12] [秒數=3]
// 超載上限是開場 12 步量出來的。叫醒整座城、照「砲擊進行中」跑幾秒讓它真的靜下來，再看每一塊現在撐的力（sL）跟上限（cap）比：
// 沒受傷的磚，cap / sL 應該接近材質的 stress（竹 1.8、木 2.4、琉璃 1.7、五重塔柱 1.45）。比這個小很多 = 開場量少了，
// 那塊磚只要掉一點血（cap 會跟著血量打折），就會自己嘎吱嘎吱斷掉
const G = require('../load')('PH');
const { S, simInit, simStep, LEVELS, MAT } = G;
const rg = (process.argv[2] || '6-12').split('-').map(Number), T = +(process.argv[3] || 3);
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1; simInit(li, {}, 1, 1, {});
  S.team[0].ai = null; S.team[1].ai = null;
  S.phase = 'resolve'; S.turn = 0; S.round = 1;
  for (const b of S.blocks) b.body.setAwake(true); for (const u of S.units) u.body.setAwake(true);
  // 記下每一塊 sL 在最後 1 秒的平均（避免抖動）
  const acc = new Map();
  for (let i = 0; i < T * 60; i++) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); if (i >= (T - 1) * 60) for (const b of S.blocks) if (!b.dead && b.cap) acc.set(b, (acc.get(b) || 0) + b.sL); }
  const rows = [];
  for (const [b, s] of acc) {
    const sL = s / 60, k = b.sk || MAT[b.mat].stress, L0 = b.cap / k, floor = b.mass * G.GRAV * 1.2 + 60;
    const capped = Math.abs(b.cap - floor) < 1e-6;
    rows.push({ b, sL, margin: b.cap / Math.max(1e-6, sL), k, ratio: sL / L0, capped });
  }
  rows.sort((a, b) => a.margin - b.margin);
  console.log(`L${L} ${LEVELS[li].name}: ${rows.length} 塊有超載上限（照 stress 倍數）。最緊的幾塊（cap/現在撐的力；應該 ≈ k）：`);
  for (const r of rows.slice(0, 10)) { const p = r.b.body.getPosition(); console.log(`   ${MAT[r.b.mat].k.padEnd(6)} (${r.b.x0.toFixed(1)},${r.b.y0.toFixed(1)}) ${r.b.w.toFixed(1)}x${r.b.h.toFixed(1)} cap ${r.b.cap.toFixed(0)} 現在 ${r.sL.toFixed(0)}  cap/現在 ${r.margin.toFixed(2)}（k=${r.k}${r.capped ? '，下限' : ''}）  現在/開場 ${r.ratio.toFixed(2)}`); }
}
