// node test/review3-sim/cells_stat.js：結算用的「打掉幾塊磚」（S.stat.cells）。同一根三格的敵方木樑：(a) 一發大的整根炸掉 (b) 一格一格打穿，各算幾塊？
// 順便測：碎塊數量已經到上限（FRAG_MAX）的時候把樓板打斷，會不會出錯
const L = require('./lib'); const G = L.load('K_CRUSH, FRAG_MAX, segBlast, K_HEAVY');
const { S, simInit, blockHurt, K_CRUSH, FRAG_MAX, segBlast, K_HEAVY, PH } = G;
function beam() { simInit(0, {}, 1, 1, null); S.phase = 'resolve'; S.turn = 0; return S.blocks.find((b) => b.seg && b.side === 1 && b.cy === 9); }
let b = beam(); const c0 = S.stat.cells;
segBlast(b, b.x0, b.y0, 20, 1e4, K_HEAVY, 0, false);
console.log(`(a) whole 3-cell beam destroyed by one blast from side 0: S.stat.cells +${S.stat.cells - c0}`);
b = beam(); const w = b.w / b.cw, x0 = b.x0 - b.w / 2, c1 = S.stat.cells;
for (let k = 0; k < 3; k++) { const cur = S.blocks.find((q) => !q.dead && q.seg && q.side === 1 && q.cy === 9 && q.cx <= b.cx + k && q.cx + q.cw > b.cx + k); blockHurt(cur, 1e4, K_CRUSH, 0, x0 + (k + 0.5) * w, b.y0); }
console.log(`(b) the same beam broken one cell at a time from side 0: S.stat.cells +${S.stat.cells - c1}`);
b = beam(); const real = S.nfrag; S.nfrag = FRAG_MAX - 1;
let err = null; try { blockHurt(b, 1e4, K_CRUSH, 0, b.x0, b.y0); } catch (e) { err = e; }
const frags = S.blocks.filter((q) => q.frag && !q.dead).length, kids = S.blocks.filter((q) => !q.dead && q.seg && q.side === 1 && q.cy === 9).length;
console.log(`(c) split with the fragment counter at FRAG_MAX-1: ${err ? 'EXCEPTION ' + err.message : 'no error'}; fragments made ${frags}, surviving pieces ${kids}`);
