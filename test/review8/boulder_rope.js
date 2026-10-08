// node test/review8/boulder_rope.js：投石兵的大石頭正面穿過第九關後面那籃的鐵鍊（和前面那籃的麻繩、第八關的鐵鍊），繩子會不會受傷
const G = require('../load')('PH, ropeEnds, spawnBoulder');
const { S, simInit, simStep, WPN } = G;
for (const [li, tag] of [[8, 'back'], [8, 'front'], [7, 'stay'], [5, '']]) {
  simInit(li, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'volley'; S.turn = 0; S.round = 1;
  const r = S.ropes.find((o) => o.side === 1 && (o.tag === tag || (!tag && o.kind === 'rope'))); if (!r) { console.log('no rope', li, tag); continue; }
  const e = G.ropeEnds(r), mx = (e[0] + e[2]) / 2, my = (e[1] + e[3]) / 2, T = S.team[0], u = T.units[0];
  const hp0 = r.hp; let minD = 99;
  // 讓石頭從繩子左邊 3 格的地方水平飛過繩子中點
  const ox = u.x, oy = u.y; u.x = mx - 3 - 1.5 * T.dir; u.y = my - 2.7;
  G.spawnBoulder(u, T, WPN.stone, 40, 0); u.x = ox; u.y = oy;
  const bd = S.rubble.blocks[S.rubble.blocks.length - 1];
  for (let i = 0; i < 40; i++) { simStep(1 / 60); if (!bd.dead) { const p = bd.body.getPosition(); minD = Math.min(minD, Math.hypot(p.x - mx, p.y - my)); } }
  console.log(`L${li + 1} ${r.kind} ${tag || 'bridge'}：石頭最接近繩子中點 ${minD.toFixed(2)} 格；繩子 hp ${hp0.toFixed(0)} → ${r.hp.toFixed(0)}${r.cut ? '（斷了）' : ''}`);
}
