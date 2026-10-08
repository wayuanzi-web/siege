// node test/review5-sim/burn_census.js [每關幾場=30] [bot=casual]   （SIEGE_SRC=<舊版> 可比）
// 火：瞄準的時候暫停之後，一塊磚從著火到熄掉（或燒掉）隔了多久（戰局時間，含瞄準的暫停）、跨了幾次瞄準；有沒有哪一塊一直燒不完；
// 瞄準階段開始時場上還有火的比例；因為「還有東西在燒」而多等的回合
const L = require('./lib5'); const H = {}; const G = L.load('', H);
const { S, simInit, simStep, BOTS, LEVELS } = G; const N = +(process.argv[2] || 30), bot = process.argv[3] || 'casual';
for (const li of [2, 3, 5]) {
  let games = 0, lit = 0, maxSpan = 0, maxAims = 0, sumSpan = 0, aimStarts = 0, aimBurning = 0, stillAtEnd = 0, maxBurnVal = 0, spans = [], waits = 0, turns = 0, exLong = '';
  for (let sd = 0; sd < N; sd++) {
    const seed = 430000 + sd * 7919 + li * 131; simInit(li, {}, seed, 1, { botA: BOTS[bot] }); games++;
    const st = new Map();
    S.on = (t) => { if (t === 'turn') { aimStarts++; if (S.nburn > 0) aimBurning++; for (const [b, r] of st) if (!r.end) r.aims++; } };
    H.turnEnd = (q, pt) => { turns++; if (S.nburn > 0 && pt >= 5.9) waits++; };
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      if ((S.frame & 3) === 0) for (const b of S.blocks) {
        const r = st.get(b);
        if (!b.dead && b.burn > 0) { if (!r) { st.set(b, { t0: S.time, aims: 0, end: 0 }); lit++; } if (b.burn > maxBurnVal) maxBurnVal = b.burn; }
        else if (r && !r.end) { r.end = S.time; const span = r.end - r.t0; spans.push(span); sumSpan += span; if (span > maxSpan) { maxSpan = span; exLong = `seed${seed} block mat${b.mat} burned from t=${r.t0.toFixed(1)} to ${r.end.toFixed(1)} across ${r.aims} aim phases`; } if (r.aims > maxAims) maxAims = r.aims; }
      }
    }
    for (const [b, r] of st) if (!r.end) stillAtEnd++;
  }
  spans.sort((a, b) => a - b);
  console.log(`L${li + 1} ${bot}: ${games} games, ${lit} blocks caught fire; fire lasted (game time, incl. aim pauses) median ${(spans[spans.length >> 1] || 0).toFixed(1)}s, p95 ${(spans[Math.floor(spans.length * 0.95)] || 0).toFixed(1)}s, max ${maxSpan.toFixed(1)}s; most aim phases one fire spanned: ${maxAims}; largest burn timer ${maxBurnVal.toFixed(1)}s; turn starts with something still burning: ${aimBurning}/${aimStarts}; turn ends that waited ~6 s for fire: ${waits}/${turns}; still burning when the game was decided: ${stillAtEnd}`);
  console.log('   longest: ' + exLong);
}
