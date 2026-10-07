// node test/review4-sim/first_hit.js [每關幾場=60] [難度=1] [只跑第幾關=0]
// 「第一輪只要打得到敵城」：隨機挑一個角度和力道，條件只有帶頭那個兵的彈道會落在敵城上（打到敵城的磚或兵；不管有沒有穿過倍增符），
// 我方就用它打第一輪。統計這一輪打倒幾個敵兵、有幾場直接贏了（敵軍一發都還沒打）
const L = require('./lib4'); const G = L.load('', { hooks: {}, tag: false });
const { S, simInit, simStep, simAim, simFire, simTrace, LEVELS, VMIN } = G;
const N = +(process.argv[2] || 60), diff = +(process.argv[3] === undefined ? 1 : process.argv[3]), only = +(process.argv[4] || 0);
let rs = 99; const R = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
for (let li = 0; li < LEVELS.length; li++) {
  if (only && li !== only - 1) continue;
  const kills = [0, 0, 0, 0, 0]; let wins = 0, gated = 0, games = 0, lob = [0, 0], flat = [0, 0];
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 6660000 + sd * 7919 + li * 131, diff, {});
    while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
    for (let i = 0; i < 12; i++) simStep(1 / 60);
    const T = S.team[0], lead = T.units[0]; let a = 0, v = 0, ok = false, mult = 1;
    for (let tries = 0; tries < 400 && !ok; tries++) {
      a = 0.25 + R() * 1.1; v = 36 + R() * 50;
      const tr = simTrace(0, lead.x + 1.3, lead.y + 2.3, Math.cos(a) * v, Math.sin(a) * v, S.wind, S.time + 0.3);
      ok = (tr.hit === 2 && tr.o && tr.o.side === 1 && !tr.port) || (tr.hit === 3); mult = tr.mult;
    }
    if (!ok) continue;
    games++; if (mult > 1) gated++;
    const n0 = S.team[1].alive; simAim(0, Math.cos(a) * v, Math.sin(a) * v); simFire(0);
    while (S.state === 'play' && !(S.turn === 1 && S.phase === 'aim')) simStep(1 / 60);
    const k = n0 - S.team[1].alive; kills[Math.min(4, k)]++; const w = S.state === 'won'; if (w) wins++;
    const g = a > 0.75 ? lob : flat; g[0]++; if (w) g[1]++;
  }
  console.log(`L${li + 1} diff${diff}: ${games} first volleys that land on the enemy castle (${gated} through a multiplier): enemy units down 0/1/2/3/4 = ${kills.join('/')}; won outright before the enemy fired: ${wins} (${(100 * wins / Math.max(1, games)).toFixed(0)}%)  [lobs > 43°: ${lob[1]}/${lob[0]}, flatter: ${flat[1]}/${flat[0]}]`);
}
