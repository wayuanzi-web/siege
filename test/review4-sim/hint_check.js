// node test/review4-sim/hint_check.js
// 關卡提示講的事是不是真的會發生（不開火，直接把提示說的那塊東西拿掉，看 8 秒內的結果）：
//   L1「打斷望樓最底下的細柱子，整座連人一起倒下來」；L2「把石球腳下的木板打穿，它就砸在底下的兵頭上」；
//   L3「把冰塔腳下的冰板打穿，整座塔連人一起溜下去」；L5「把露台打斷，防空弩就掉進雲海」；L6「打斷大殿的木柱，屋頂會砸在魔王頭上」「把魔王腳下的樓板打穿，他摔一層就痛一次」
const L = require('./lib4'); const H = {};
function run(name, li, pick, secs) {
  const G = L.load('', { hooks: H }); const { S, simInit, simStep, blockKill, blockHurt, CS } = G;
  simInit(li, {}, 77, 1, {});
  const st = S.st[1]; const tgt = pick(G, st);
  const log = []; H.kill = (u, side, how, ctx) => { if (S.state === 'play' || ctx !== 'fin') log.push(`${u.type}#${u.slot} died (${ctx}) +${(S.time - t0).toFixed(1)}s`); };
  const hp0 = S.team[1].units.map((u) => u.hp);
  let t0 = 0; S.phaseT = 0;
  for (let i = 0; i < 30; i++) { S.phaseT = 0; simStep(1 / 60); }
  t0 = S.time;
  for (const t of tgt) { if (t.seg !== undefined) { const b = t.b, p = b.body.getPosition(), lx = -b.w / 2 + (t.seg + 0.5) * (b.w / b.cw); blockHurt(b, 9999, 6, 0, p.x + lx, p.y); } else blockKill(t.b, 0, 6, false); }
  for (let i = 0; i < secs * 60; i++) { S.phaseT = 0; simStep(1 / 60); }
  const us = S.team[1].units.map((u, k) => `${u.type}#${u.slot} ${u.alive ? 'hp ' + u.hp.toFixed(0) + '/' + hp0[k].toFixed(0) + ' at (' + u.x.toFixed(1) + ',' + u.y.toFixed(1) + ')' : 'DEAD'}`);
  console.log(`${name}\n   removed: ${tgt.map((t) => L.bdesc(t.b) + ' c(' + t.b.cx + ',' + t.b.cy + ')' + (t.seg !== undefined ? ' cell ' + t.seg : '')).join(', ')}\n   events: ${log.join('; ') || '(nobody died)'}\n   after ${secs}s: ${us.join(' | ')}`);
}
const at = (st, cx, cy) => st.cellB[cy * st.cols + cx];
// L1 望樓：鏡射後塔在第 1..3 欄；最底下的柱子在第 3、4 列（cy=4,5 是一根 1x2）
run('L1: knock out the FRONT bottom post of the watchtower', 0, (G, st) => [{ b: at(st, 1, 4) }], 8);
run('L1: knock out the REAR bottom post of the watchtower', 0, (G, st) => [{ b: at(st, 3, 4) }], 8);
run('L1: knock out a MIDDLE post (the old hint just said "a post")', 0, (G, st) => [{ b: at(st, 1, 7) }], 8);
// L2 石球底下的木板：樑在 cy=8，鏡射後佔第 0..4 欄；石球在第 1、3 欄
run('L2: punch out the beam cell under the FRONT boulder', 1, (G, st) => { const b = at(st, 1, 8); return [{ b, seg: 1 - b.cx }]; }, 8);
run('L2: punch out the beam cell under the REAR boulder', 1, (G, st) => { const b = at(st, 3, 8); return [{ b, seg: 3 - b.cx }]; }, 8);
// L3 冰塔腳下的冰板：cy=6 的長冰板（9 格）；塔在鏡射後第 1..3、5..7 欄
run('L3: punch out the ice-slab cell under the FRONT tower (middle of the tower)', 2, (G, st) => { const b = at(st, 2, 6); return [{ b, seg: 2 - b.cx }]; }, 8);
run('L3: punch out the ice-slab cell under the REAR tower', 2, (G, st) => { const b = at(st, 6, 6); return [{ b, seg: 6 - b.cx }]; }, 8);
// L5 露台：cy=7 的木樑（鏡射後第 0..7 欄），防空弩站在第 0 欄（cy=8），第 1 欄上下是金甲
run('L5: break the balcony beam cell right at the wall (cell 1)', 4, (G, st) => { const b = at(st, 1, 7); return [{ b, seg: 1 - b.cx }]; }, 8);
run('L5: break the balcony cell the flak stands on (cell 0)', 4, (G, st) => { const b = at(st, 0, 7); return [{ b, seg: 0 - b.cx }]; }, 8);
run('L5: break the beam in the middle of the hall (cell 4): does the front half tip out with the wall?', 4, (G, st) => { const b = at(st, 4, 7); return [{ b, seg: 4 - b.cx }]; }, 8);
// L6 大殿木柱：最上面兩列的 |（cy=9..10），鏡射後第 3、7 欄
run('L6: break the FRONT hall post', 5, (G, st) => [{ b: at(st, 3, 9) }], 8);
run('L6: break BOTH hall posts', 5, (G, st) => [{ b: at(st, 3, 9) }, { b: at(st, 7, 9) }], 8);
run('L6: punch out the floor cell under the boss (top hall floor, cell 5)', 5, (G, st) => { const b = at(st, 5, 8); return [{ b, seg: 5 - b.cx }]; }, 8);
