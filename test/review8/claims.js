// node test/review8/claims.js：把第二篇提示裡講的幾件事直接在模擬裡做一次，看結果是不是提示講的那樣
//  A 第六關：麻繩要幾箭才斷（主畫面說「繩子一箭就斷」）
//  B 第六關：打斷望樓的一根竹竿（各種武器、前後兩根），望樓的兵有沒有「連人倒進河裡」
//  C 第六關：前面那間吊腳樓整間滑進河裡之後，裡面的兵有沒有被沖走
//  D 第七關：只拿掉前面那根石頸／後面那根（不加推力），中間那棟往哪邊倒；用轟天砲、投石打前面那根又往哪邊倒
const G = require('../load')('PH, ropeEnds, blockDist, ropeHurt, segDist');
const { S, simInit, simStep, WPN, physExplode, blockKill } = G;
const run = (sec) => { for (let i = 0; i < sec * 60 && S.state === 'play'; i++) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); } };
const start = (li, seed) => { simInit(li, {}, seed || 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'resolve'; S.turn = 0; S.round = 1; };
const hitAt = (x, y) => { let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = G.blockDist(b, x, y); if (d < best) { best = d; hit = b; } } return hit; };
const boom = (w, x, y) => physExplode(x, y, WPN[w], 0, 1, 0, hitAt(x, y), 1, 0);
const unit = (slot) => S.team[1].units.find((u) => u.slot === slot);
const desc = (u) => u.alive ? `alive @(${u.x.toFixed(1)},${u.y.toFixed(1)}) home(${u.hx.toFixed(1)},${u.hy.toFixed(1)}) wet ${(u.wet || 0).toFixed(2)}` : 'DEAD';
let deaths = [];
const hook = () => { deaths = []; S.on = (t, a, b, c, d, e, f) => { if (t === 'udie') deaths.push(`${c ? 'E' : 'P'}#${f} ${['擊倒', '砸扁', '?', '燒', '摔下去', '出城', '轟飛', '沖走'][e]}@${S.time.toFixed(1)}s`); }; };

// A：一箭打在繩子正中間（直接命中），要幾箭
start(5); hook();
for (const r of S.ropes) {
  let n = 0; const e = G.ropeEnds(r);
  while (!r.cut && n < 20) { n++; G.ropeHurt(r, WPN.bolt.dmg * 1 * S.team[0].dmg * S.rage, WPN.bolt.kind, 0); }
  console.log(`A 第六關 繩子 hp ${r.hm.toFixed(0)}（我方 dmg ${S.team[0].dmg.toFixed(2)}）：連弩箭直接射中 ${n} 箭才斷；火箭直接炸在繩上要 ${Math.ceil(r.hm / (WPN.rocket.dmg * S.team[0].dmg * 0.9))} 發左右`);
}

// B：望樓的兩根竹竿（x 79.7 前、89.9 後，y 11.7 中段）
for (const [w, x, y] of [['rocket', 79.7, 9], ['rocket', 79.7, 13], ['rocket', 89.9, 11], ['bomb', 79.7, 11.7], ['bomb', 89.9, 11.7], ['fire', 79.7, 11], ['bolt', 79.7, 11]]) {
  start(5, 3); hook();
  if (w === 'bolt') { for (let k = 0; k < 6; k++) { boom(w, x, y + k * 0.3); run(0.07); } } else if (w === 'rocket') { boom(w, x, y); run(0.16); boom(w, x, y); } else boom(w, x, y);
  run(10);
  const u = unit(2), poles = S.st[1].blocks.filter((b) => Math.abs(b.y0 - 11.7) < 0.2 && (Math.abs(b.x0 - 79.7) < 0.2 || Math.abs(b.x0 - 89.9) < 0.2));
  console.log(`B 第六關 ${w}@${x},${y}：竹竿 ${poles.map((b) => b.dead ? '斷' : b.inPlace ? '在' : '歪').join('/')}  望樓的兵 #2 ${desc(u)}  ${deaths.join(' ')}`);
}

// C：前面那間吊腳樓（竹樁 66.1、72.9）
for (const [w, x, y, seed] of [['bomb', 69.5, 1.5, 1], ['bomb', 66.1, 2, 2], ['bomb', 72.9, 2, 3], ['rocket', 72.9, 1, 4], ['rocket', 66.1, 1, 5]]) {
  start(5, seed); hook();
  if (w === 'rocket') { boom(w, x, y); run(0.16); boom(w, x, y); } else boom(w, x, y);
  run(15);
  console.log(`C 第六關 ${w}@${x},${y}：前面那間的兵 #1 ${desc(unit(1))}  ${deaths.join(' ')}`);
}

// D：第七關中間那棟（石頸 86.5 前、89.9 後，y 20.4）
const slabInfo = () => { const b = S.st[1].blocks.find((o) => Math.abs(o.x0 - 88.2) < 0.2 && Math.abs(o.y0 - 25.5) < 0.2); if (!b || b.dead) return 'slab gone'; const p = b.body.getPosition(); return `slab dx ${(p.x - 88.2).toFixed(1)} dy ${(p.y - 25.5).toFixed(1)} → ${p.x < 87 ? '往前（朝玩家）' : p.x > 89.4 ? '往後' : '原地'}`; };
const neck = (x) => S.st[1].blocks.find((b) => Math.abs(b.y0 - 20.4) < 0.2 && Math.abs(b.x0 - x) < 0.2);
for (const [lab, fn] of [['只拿掉前面那根（86.5）', () => blockKill(neck(86.5), 0, 2)], ['只拿掉後面那根（89.9）', () => blockKill(neck(89.9), 0, 2)],
  ['轟天砲打前面那根', () => boom('bomb', 86.5, 20.4)], ['轟天砲打前面那根的左側', () => boom('bomb', 85.4, 20.4)], ['轟天砲打後面那根', () => boom('bomb', 89.9, 20.4)]]) {
  start(6, 1); hook(); fn(); run(6);
  console.log(`D 第七關 ${lab}：${slabInfo()}  兵 ${[1, 2, 3, 4].map((k) => k + ':' + (unit(k).alive ? 'ok' : 'x')).join(' ')}  ${deaths.join(' ')}`);
}
// 投石兵的大石頭從我方飛過去砸前面那根（真的發射）
for (const vy of [0, 1, 2, 3]) {
  start(6, 1); hook();
  const u = S.team[0].units.find((o) => o.type === 'stone');
  // 找一個會打中 (86.5, 20.4) 附近的初速：掃一遍
  let best = null;
  for (let a = 0.2; a < 1.2; a += 0.01) for (let v = 30; v < 70; v += 0.5) { const R = G.simTrace ? null : null; }
  console.log('D 投石：略（需要瞄準器）'); break;
}
