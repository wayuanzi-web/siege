// node test/review8/wetwait.js：第六關前面那間吊腳樓垮進河裡，兵站在漂著的殘骸上、半身泡水（wet 0.2–0.45）：之後每一輪砲擊結束要等多久才換人
const G = require('../load')('PH, blockDist, BOTS');
const { S, simInit, simStep, WPN, physExplode, BOTS } = G;
for (const [w, x, y, seed] of [['bomb', 69.5, 1.5, 1], ['bomb', 69.5, 1.5, 7], ['bomb', 70.5, 2.5, 3]]) {
  simInit(5, {}, seed, 1, { botA: BOTS.casual }); S.team[1].ai && (S.team[1].ai = S.team[1].ai);
  // 第一回合我方瞄準時，直接在前面那間的竹樁上引爆（像砲彈打中）
  while (!(S.phase === 'aim' && S.turn === 0) && S.time < 30) simStep(1 / 60);
  let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = G.blockDist(b, x, y); if (d < best) { best = d; hit = b; } }
  physExplode(x, y, WPN[w], 0, 1, 0, hit, 1, 0);
  const u1 = S.team[1].units.find((u) => u.slot === 1);
  let last = S.phase, t0 = S.time; const log = [];
  for (let i = 0; i < 60 * 150 && S.state === 'play' && S.round < 8; i++) {
    simStep(1 / 60);
    if (S.phase !== last) { if (last === 'resolve') log.push(`R${S.round} ${S.turn ? '我方' : '敵軍'}砲擊後等了 ${(S.time - t0).toFixed(1)}s（#1 ${u1.alive ? 'wet ' + (u1.wet || 0).toFixed(2) + ' y ' + u1.y.toFixed(1) : '已倒'}）`); last = S.phase; t0 = S.time; }
  }
  console.log(`${w}@${x},${y} seed ${seed}: ${S.state} R${S.round}\n  ` + log.join('\n  '));
}
