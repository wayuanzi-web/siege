// node test/review3-sim/debris_reach.js [關卡=3] [場數=30] [回合=8]
// 我方完全不開火。敵軍打我方的城，炸出來的碎塊會不會飛過整個戰場、砸回敵軍自己的城？
// 記錄：我方城樓的碎塊／磚飛到敵城範圍裡的次數、當時多快、敵城有幾塊磚因此離開原位，每一場最後敵城完整度
const L = require('./lib'); const G = L.load();
const { S, PH, simInit, simStep, simFire, structBar, LEVELS } = G;
const li = +(process.argv[2] || 3) - 1, N = +(process.argv[3] || 30), R = +(process.argv[4] || 8);
let hits = 0, games = 0, gamesHit = 0, vmax = 0, low = 1, lowSeed = 0, sum = 0; const ex = [];
for (let sd = 0; sd < N; sd++) {
  const seed = 91000 + sd * 7919 + li * 131;
  simInit(li, {}, seed, 1, { mute: 0 }); S.team[0].ai = null; games++;
  const st = S.st[1], seen = new Set(); let h = 0, guard = 0;
  while (S.state === 'play' && S.round <= R && guard++ < 60 * 80 * R) {
    if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60);
    // 我方（或中立冰牆）的東西進了敵城的範圍
    for (const b of S.blocks) { if (b.dead || b.side === 1 || seen.has(b) || b.st === S.rubble) continue; const p = b.body.getPosition(); if (p.x > st.x0 - 1 && p.x < st.x1 + 1 && p.y > 1.5) { seen.add(b); h++; const v = b.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > vmax) vmax = sp; if (ex.length < 6) ex.push(`seed${seed} r${S.round} ${S.phase}/turn${S.turn}: ${b.frag ? 'fragment' : 'block'} of side ${b.side} (mat ${b.mat}, mass ${b.mass.toFixed(1)}) arrived inside the enemy castle at (${p.x.toFixed(1)},${p.y.toFixed(1)}) moving ${sp.toFixed(0)}`); } }
  }
  const sb = structBar(1); sum += sb; if (sb < low) { low = sb; lowSeed = seed; } hits += h; if (h) gamesHit++;
}
console.log(`src=${G.__dir}  L${li + 1}, ${games} games x ${R} rounds, I never fire: pieces of MY castle (or of the neutral wall) that flew into the enemy castle: ${hits} in ${gamesHit} games, fastest ${vmax.toFixed(0)}; enemy structure bar at the end: mean ${(100 * sum / games).toFixed(1)}%, lowest ${(100 * low).toFixed(1)}% (seed ${lowSeed})`);
for (const e of ex) console.log('   ' + e);
