// node test/review8/boulder_basket.js：投石兵的大石頭正中第九關後面那籃配重（或吊籃的鐵鍊上端那根樑），鐵鍊會不會斷、天秤會不會翻
const G = require('../load')('PH, ropeEnds, spawnBoulder');
const { S, simInit, simStep, WPN } = G;
for (const [what, dy] of [['basket', 0], ['basket top', 1.2], ['beam end', 4.8]]) for (const v of [30, 45]) {
  simInit(8, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'volley'; S.turn = 0; S.round = 1;
  const r = S.ropes.find((o) => o.side === 1 && o.tag === 'back'), bk = r.b || r.hang, p = bk.body.getPosition();
  const T = S.team[0], u = T.units[0], ox = u.x, oy = u.y; u.x = p.x - 4 - 1.5 * T.dir; u.y = p.y + dy - 2.7;
  G.spawnBoulder(u, T, WPN.stone, v, 2); u.x = ox; u.y = oy;
  let cut = false, maxT = 0;
  for (let i = 0; i < 180; i++) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); if (r.j) maxT = Math.max(maxT, r.tens || 0); if (r.cut) cut = true; }
  console.log(`石頭 ${v} 格/秒打 ${what}：鐵鍊 ${cut ? '斷了' : '沒斷'}（hp ${r.hp.toFixed(0)}，最大張力 ${maxT.toFixed(0)} / 上限 ${r.tmax.toFixed(0)}），天秤 ${(S.pivots[0].ang * 57.3).toFixed(1)}°`);
}
