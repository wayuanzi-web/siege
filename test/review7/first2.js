// node test/review7/first2.js <關卡> [場數=100] —— 跟 test/first.js 同一套 seed（52000 + sd*7919 + li*131），
// 但把我方倒兵的那幾場列出來：seed、誰倒、怎麼倒、敵軍瞄的是誰、這一輪有沒有穿過倍增符、我方兵受到的每一筆傷
const G = require('../load')('PH');
const { S, simInit, simStep, simFire, LEVELS } = G;
const li = +(process.argv[2] || 1) - 1, N = +(process.argv[3] || 100);
const HOW = ['擊倒', '砸扁', '?', '燒', '摔出場', '出城', '飛出', '水'];
for (let sd = 0; sd < N; sd++) {
  const seed = 52000 + sd * 7919 + li * 131;
  simInit(li, {}, seed, 1, { mute: 0 }); S.team[0].ai = null;
  const log = []; let tgt = '';
  S.on = (t, x, y, c, d, e, f) => {
    if (t === 'udie' && c === 0) log.push(`${S.time.toFixed(2)} #${f} ${d} ${HOW[e]} at (${x.toFixed(1)},${y.toFixed(1)})`);
    if (t === 'volley' && x === 1) { const A = S.team[1].ai, b = A.best; tgt = b ? `target (${b.t.x.toFixed(1)},${b.t.y.toFixed(1)}) w${b.t.w.toFixed(2)} tau ${b.tau.toFixed(1)} mult ${A.mult}` : 'fallback'; }
    if (t === 'gate' && e === 1) log.push(`${S.time.toFixed(2)} enemy shot passed gate x${c}`);
    if (t === 'yelp' && d === 0) log.push(`${S.time.toFixed(2)} our unit yelp at (${x.toFixed(1)},${y.toFixed(1)})`);
  };
  let guard = 0;
  while (S.state === 'play' && S.round <= 1 && guard++ < 3600) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
  const dead = S.team[0].units.filter((u) => !u.alive);
  if (dead.length) console.log(`seed ${seed}: ${tgt}\n   ` + log.join('\n   '));
}
