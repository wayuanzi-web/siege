// node test/review5-sim/l3_slab.js
// 第三關的新提示講的事會不會發生（不開火，直接把那一格打穿，看 8 秒後）：
//   A. 「把冰塔腳下的冰板打穿，塔一歪，上面的兵就溜下來」：長冰板九格，一格一格試
//   B. 「打斷冰柱，冰板再破一格，就整片垮進大廳」：先拿掉一根／兩根冰柱，再一格一格試
const L = require('./lib5');
function trial(pillars, cell) {
  const H = {}; const G = L.load('', H); const { S, simInit, simStep, blockHurt, blockKill, CS } = G; simInit(2, {}, 5, 1, {});
  const st = S.st[1], slab = st.blocks.filter((b) => b.seg && b.cw === 9)[0];
  const deaths = []; H.kill = (u, sd, how, ctx) => { if (u.side === 1) deaths.push(`${u.type}#${u.slot}:${ctx}`); };
  for (let i = 0; i < 20; i++) { S.phaseT = 0; simStep(1 / 60); }
  // 冰柱：藍圖第 3、5 欄（鏡射之後是 cols-1-cx），大廳那兩列
  for (const cx of pillars) for (const b of st.blocks) if (!b.dead && !b.seg && b.mat === G.M_ICE && b.cw === 1 && b.cx === st.cols - 1 - cx && (b.cy === 4 || b.cy === 5)) blockKill(b, 0, 0, true);
  if (cell >= 0) { const p = slab.body.getPosition(), lx = -slab.w / 2 + (cell + 0.5) * CS; blockHurt(slab, 99999, 0, 0, p.x + lx, p.y); }
  for (let i = 0; i < 60 * 8; i++) { S.phaseT = 0; simStep(1 / 60); }
  return S.team[1].units.map((u) => `#${u.slot} ${!u.alive ? 'DEAD' : Math.hypot(u.x - u.hx, u.y - u.hy) < 1 ? 'home' : `moved(${(u.x - u.hx).toFixed(0)},${(u.y - u.hy).toFixed(0)})`}`).join(' ') + (deaths.length ? '   [' + deaths.join(', ') + ']' : '') + (S.state !== 'play' ? '  -> ' + S.state.toUpperCase() : '');
}
console.log('L3 enemy castle (world columns left to right; tower A stands on slab cells 1-3 with walls on 1 and 3, tower B on cells 5-7 with walls on 5 and 7; ice pillars under cells 3 and 5). Units: #1 and #2 on the towers, #3 in the hall');
console.log('A. pillars intact, one slab cell punched out:');
for (let c = 0; c < 9; c++) console.log(`   cell ${c}: ${trial([], c)}`);
console.log('B. one pillar removed first (blueprint column 3), then a slab cell:'); console.log(`   no cell: ${trial([3], -1)}`);
for (let c = 0; c < 9; c++) console.log(`   cell ${c}: ${trial([3], c)}`);
console.log('C. both pillars removed, then a slab cell:'); console.log(`   no cell: ${trial([3, 5], -1)}`);
for (let c = 0; c < 9; c++) console.log(`   cell ${c}: ${trial([3, 5], c)}`);
