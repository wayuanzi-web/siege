// node test/review3-sim/selfharm.js [場數=30] [回合=8]：我方完全不開火。敵軍自己會不會出事：
// 敵兵有沒有在沒人打的情況下死掉（被自己的石球砸、自己掉下去、被自己的火藥桶炸）、敵城完整度有沒有自己往下掉（第四關的落石除外另外列）
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, simFire, LEVELS, structBar } = G;
const N = +(process.argv[2] || 30), R = +(process.argv[3] || 8);
const HOW = ['hit', 'crushed', '?', 'burnt', 'fell out', 'out of castle'];
console.log('src=' + G.__dir);
for (let li = 0; li < LEVELS.length; li++) {
  const who = {}; let dead = 0, sb = 0, sbMin = 1, games = 0, firstDeathRound = [];
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 91000 + sd * 7919 + li * 131, 1, { mute: 0 }); S.team[0].ai = null; games++;
    S.on = (t, a, b, c, d, e, f) => { if (t === 'udie' && c === 1) { dead++; const k = `${d}#${f} ${HOW[e]} (r${S.round} ${S.phase}/turn${S.turn})`; who[k] = (who[k] || 0) + 1; } };
    let guard = 0;
    while (S.state === 'play' && S.round <= R && guard++ < 60 * 80 * R) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
    const b = structBar(1); sb += b; if (b < sbMin) sbMin = b;
  }
  console.log(`L${li + 1}: ${games} games x ${R} rounds, I never fire: enemy units that died anyway: ${dead}${dead ? '  -> ' + Object.keys(who).sort((a, b) => who[b] - who[a]).slice(0, 8).map((k) => k + ' x' + who[k]).join(', ') : ''};  enemy structure bar at the end: mean ${(100 * sb / games).toFixed(1)}%, lowest ${(100 * sbMin).toFixed(1)}%`);
}
