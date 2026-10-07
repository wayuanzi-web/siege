// node test/review2-sim/a_base_map.js
// A2：城基（st.base）到底標在哪些磚上？每一關兩座城＋中立冰壁，把藍圖一列一列印出來，
// 旁邊印同一列每一格「是不是城基磚」（B = b.base、厚四倍；b = 在城基列但沒有加厚（木門）；# 一般磚；小寫 p = 小擺設；. 屋內；空白 = 沒東西）。
// 另外列出：跨到房間那一層的城基磚（cy < base 但 cy + ch > base）、每塊城基磚的耐久。
const G = require('./h')();
const { S, simInit, LEVELS, CASTLES, MAT, CS } = G;
const seen = new Set();
for (let li = 0; li < LEVELS.length; li++) {
  simInit(li, {}, 1, 1, {});
  for (const st of S.structs) {
    if (st.loose) continue;
    const name = st === S.st[0] ? LEVELS[li].me.castle : st === S.st[1] ? LEVELS[li].foe.castle : LEVELS[li].extra[0].castle;
    const key = name + (st.side === 1 ? 'm' : '');
    if (seen.has(key)) continue; seen.add(key);
    const map = CASTLES[name].map, mirror = st.side === 1;
    console.log(`\n=== L${li + 1} ${name} (side ${st.side}${mirror ? ', mirrored in the field; printed here as in the field' : ''})  rows=${st.rows} cols=${st.cols}  st.base=${st.base}  hpMul=${st.hpMul.toFixed(2)}`);
    const grid = []; for (let cy = 0; cy < st.rows; cy++) grid.push(new Array(st.cols).fill(' '));
    for (let i = 0; i < st.n; i++) if (st.cellK[i] === 2) grid[(i / st.cols) | 0][i % st.cols] = '.';
    for (const b of st.blocks) {
      if (b.prop) { grid[b.cy][b.cx] = 'p'; continue; }
      for (let a = 0; a < b.cw; a++) for (let c = 0; c < b.ch; c++) grid[b.cy + c][b.cx + a] = b.base ? 'B' : b.cy < st.base ? 'b' : b.mat === 7 ? 'K' : '#';
    }
    for (let cy = st.rows - 1; cy >= 0; cy--) {
      let row = map[st.rows - 1 - cy]; row = row + ' '.repeat(st.cols - row.length); if (mirror) row = row.split('').reverse().join('');
      console.log(`  cy=${String(cy).padStart(2)}  ${row}   ${grid[cy].join('')}   ${cy < st.base ? '<- base row' : ''}`);
    }
    for (const b of st.blocks) {
      if (b.prop) continue;
      const spans = b.cy < st.base && b.cy + b.ch > st.base;
      if (spans) console.log(`  !! block ${MAT[b.mat].k} at cx=${b.cx} cy=${b.cy}..${b.cy + b.ch - 1} (${b.cw}x${b.ch}) starts in a base row but reaches up into room row(s) ${st.base}..${b.cy + b.ch - 1}: base=${!!b.base} hp=${b.hm.toFixed(0)} (without BASE_HP it would be ${(b.hm / (b.base ? 4 : 1)).toFixed(0)}) wt=${b.wt}`);
      if (b.cy < st.base && !b.base) console.log(`  -- block ${MAT[b.mat].k} at cx=${b.cx} cy=${b.cy}..${b.cy + b.ch - 1} (${b.cw}x${b.ch}) is in a base row but NOT thickened (wood): hp=${b.hm.toFixed(0)} wt=${b.wt}`);
      if (b.cy >= st.base && b.base) console.log(`  ?? block above base flagged base`);
    }
    const bb = st.blocks.filter((b) => b.base); let hpB = 0, hpAll = 0; for (const b of st.blocks) { hpAll += b.hm * b.wt; if (b.base) hpB += b.hm * b.wt; }
    console.log(`  base blocks: ${bb.length} of ${st.blocks.filter((b) => !b.prop).length}; share of the structure bar from base rows: ${(100 * hpB / hpAll).toFixed(0)}%; typical base brick hp ${bb.length ? bb.map((b) => b.hm.toFixed(0)).filter((v, i, a) => a.indexOf(v) === i).join('/') : '-'}`);
    console.log(`  unit slots: ${st.slots.map((s) => `#${s.slot}@(${s.cx},${s.cy})`).join(' ')}  crew: ${st.units.map((u) => u.type + '#' + u.slot + ' hp' + u.hpMax.toFixed(0)).join(', ')}`);
  }
}
