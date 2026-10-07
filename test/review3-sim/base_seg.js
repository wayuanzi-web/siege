// node test/review3-sim/base_seg.js：出貨的藍圖裡沒有「落在城基那幾列的長石板」，這裡自己造一張來測：城基的磚耐久 ×4（BASE_HP），
// 分段的石板斷開之後，新磚的每段耐久上限、整塊耐久是不是還是 ×4（沒有變成 ×16，也沒有掉回 ×1）
const L = require('./lib'); const G = L.load('K_CRUSH, BASE_HP, SEG_K, BASE_WT');
const { S, simInit, CASTLES, LEVELS, MAT, blockHurt, K_CRUSH, BASE_HP, SEG_K, BASE_WT, CS } = G;
CASTLES.T = { skin: 'sand', map: ['S.1.S', '_____', '#####'] };
LEVELS[0].foe.castle = 'T'; LEVELS[0].foe.crew = ['rocket'];
simInit(0, {}, 1, 1, null); S.phase = 'resolve';
const st = S.st[1], b = st.blocks.find((q) => q.seg), want = MAT[2].hp * SEG_K * st.hpMul * BASE_HP;
console.log(`castle base rows: ${st.base}; slab row ${b.cy}, ${b.cw} cells, base=${!!b.base}, wt=${b.wt} (BASE_WT ${BASE_WT}); segM=${b.segM.toFixed(2)} (expected ${want.toFixed(2)}), seg=[${Array.from(b.seg).map((v) => v.toFixed(1))}], hp=${b.hp.toFixed(1)} hm=${b.hm.toFixed(1)}`);
let bad = 0; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) bad++; };
ok(Math.abs(b.segM - want) < 1e-3 && Math.abs(b.hm - want * b.cw) < 1e-2, 'parent scaled once');
const id0 = S.bid; blockHurt(b, 1e5, K_CRUSH, 2, b.x0, b.y0);
const kids = S.blocks.filter((q) => q.id >= id0 && !q.frag);
for (const k of kids) { console.log(`   child cells ${k.cx}..${k.cx + k.cw - 1}: segM=${k.segM.toFixed(2)} seg=[${Array.from(k.seg).map((v) => v.toFixed(1))}] hp=${k.hp.toFixed(1)} hm=${k.hm.toFixed(1)} base=${!!k.base} wt=${k.wt}`); ok(Math.abs(k.segM - want) < 1e-3 && Math.abs(k.hm - want * k.cw) < 1e-2 && Math.abs(k.hp - want * k.cw) < 1e-2 && k.base === true && k.wt === BASE_WT, 'child keeps the single x' + BASE_HP + ' scaling, base flag and weight'); }
ok(kids.length === 2, 'two children');
process.exit(bad ? 1 : 0);
