// H6：每一關每一個「小東西」（木箱、陶甕、木桶、石球、城垛）和兵，腳下有沒有東西撐著？
// 開場時整座城是睡著的，所以懸空的東西看起來沒事；第一次被震醒就會掉下去（陶甕會直接摔碎）。
const G = require('./h')();
const { S, PH, LEVELS, simInit, CS } = G;
let bad = 0;
for (let li = 0; li < LEVELS.length; li++) {
  simInit(li, {}, 1, 1, null);
  const items = [];
  for (const b of S.blocks) items.push({ o: b, name: `${b.prop ? 'prop' : 'block'} mat${b.mat} ${b.kind} side${b.side} cell(${b.cx},${b.cy})`, x: b.x0, bottom: b.y0 - (b.kind === 'ball' ? b.r : b.h / 2), hw: (b.kind === 'ball' ? b.r : b.w / 2) });
  for (const u of S.units) items.push({ o: u, name: `unit ${u.type} side${u.side} slot${u.slot}`, x: u.hx, bottom: u.hy, hw: u.bw / 2 });
  for (const it of items) {
    // 從底部往下射一條短短的線：0.25 以內有沒有別的東西（或地面）
    let best = 1e9;
    for (const dx of [-it.hw * 0.8, 0, it.hw * 0.8]) {
      PH.world.rayCast({ x: it.x + dx, y: it.bottom + 0.05 }, { x: it.x + dx, y: it.bottom - 6 }, (f, p, n, fr) => { const o = f.getUserData(); if (o === it.o) return -1; const d = it.bottom - p.y; if (d < best) best = d; return fr; });
    }
    if (best > 0.25) { bad++; console.log(`L${li + 1} ${LEVELS[li].name}: ${it.name} 懸空，底下 ${best > 100 ? '什麼都沒有' : best.toFixed(2) + ' 才有東西'}`); }
  }
}
console.log(bad ? `${bad} 個懸空的東西` : '沒有懸空的東西');
