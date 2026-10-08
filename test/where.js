// node test/where.js <關卡 1-12>：印出敵城每一塊磚、每個兵、每條繩子在戰場上的座標（給 poke.js 找引爆點用）
const G = require('./load')('PH, ropeEnds');
const { S, simInit, LEVELS, MAT } = G;
const li = +process.argv[2] - 1;
simInit(li, {}, 1, 1, {});
const st = S.st[1];
console.log(`L${li + 1} ${LEVELS[li].name}：敵城 x ${st.x0.toFixed(1)}–${st.x1.toFixed(1)}，y ${st.y0.toFixed(1)}–${st.y1.toFixed(1)}`);
for (const b of st.blocks) { const p = b.body.getPosition(); console.log(`  ${MAT[b.mat].k.padEnd(6)} ${b.kind.padEnd(6)} (${p.x.toFixed(1)},${p.y.toFixed(1)}) ${b.w.toFixed(1)}x${b.h.toFixed(1)} hp ${b.hm.toFixed(0)}${b.seg ? ' 分段' : ''}${b.cap ? ' 超載上限 ' + b.cap.toFixed(0) : ''}${b.hang ? ' 吊著的' + b.hang : ''}${b.reso ? ' 共鳴' : ''}`); }
for (const u of S.units) if (u.side === 1) console.log(`  兵 #${u.slot} ${u.type} (${u.x.toFixed(1)},${u.y.toFixed(1)}) hp ${u.hpMax.toFixed(0)}`);
for (const r of S.ropes) { const e = G.ropeEnds(r); console.log(`  ${r.kind} ${r.tag} (${e[0].toFixed(1)},${e[1].toFixed(1)})–(${e[2].toFixed(1)},${e[3].toFixed(1)}) hp ${r.hm.toFixed(0)} 張力上限 ${r.tmax.toFixed(0)}`); }
for (const o of S.pivots) console.log(`  支點 (${o.x.toFixed(1)},${o.y.toFixed(1)}) 摩擦 ${o.tq.toFixed(0)}`);
for (const o of S.pins) console.log(`  插銷 (${o.x.toFixed(1)},${o.y.toFixed(1)}) 全重力矩 ${o.full.toFixed(0)} 撐 ${o.tq.toFixed(0)}`);
for (const q of S.structs) if (q.side === 2 && !q.loose) for (const b of q.blocks) { const p = b.body.getPosition(); console.log(`  中立 ${MAT[b.mat].k} (${p.x.toFixed(1)},${p.y.toFixed(1)}) ${b.w.toFixed(1)}x${b.h.toFixed(1)} hp ${b.hm.toFixed(0)}`); }
