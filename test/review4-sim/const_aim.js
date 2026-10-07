// node test/review4-sim/const_aim.js <關卡 1-6> [每種幾場=3] [難度=1] [mode=grid | verify <角度> <力道> <場數>]
// 「完全不動腦」的打法：每一回合都用同一個仰角和力道開火，不用技能、不開護罩。
// grid：掃一遍（仰角 0.2…1.4、力道 36…86），列出勝率最高的幾組；verify：某一組多打幾場看勝率
const L = require('./lib4');
const G = L.load('', { hooks: {}, tag: false });
const { S, simInit, simStep, simAim, simFire, LEVELS } = G;
const li = +(process.argv[2] || 1) - 1, N = +(process.argv[3] || 3), diff = +(process.argv[4] === undefined ? 1 : process.argv[4]), mode = process.argv[5] || 'grid';
function game(a, v, seed, shield) {
  simInit(li, {}, seed, diff, {});
  while (S.state === 'play' && S.round < 30) {
    if (S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.2) { simAim(0, Math.cos(a) * v, Math.sin(a) * v); simFire(0); }
    if (shield && S.phase === 'aim' && S.turn === 1) G.simSkill(0, 'shield');
    simStep(1 / 60);
  }
  return S.state === 'won' ? S.round : 0;
}
if (mode === 'verify') {
  const a = +process.argv[6], v = +process.argv[7], n = +(process.argv[8] || 30), sh = process.argv[9] === 'shield'; let w = 0, r = 0;
  for (let sd = 0; sd < n; sd++) { const k = game(a, v, 5550000 + sd * 7919 + li * 131, sh); if (k) { w++; r += k; } }
  console.log(`L${li + 1} diff${diff}: constant aim angle ${a} rad (${(a * 180 / Math.PI).toFixed(0)}°) power ${v}${sh ? ' + shield whenever ready' : ''}: ${w}/${n} won (${(100 * w / n).toFixed(0)}%), mean ${(r / Math.max(1, w)).toFixed(1)} rounds when won`);
} else {
  const res = [], t0 = Date.now();
  for (let a = 0.2; a <= 1.41; a += 0.1) for (let v = 36; v <= 86; v += 10) {
    let w = 0, r = 0; for (let sd = 0; sd < N; sd++) { const k = game(a, v, 3330000 + sd * 7919 + li * 131, false); if (k) { w++; r += k; } }
    res.push({ a: +a.toFixed(1), v, w, r: w ? r / w : 0 });
  }
  res.sort((x, y) => y.w - x.w || x.r - y.r);
  console.log(`L${li + 1} diff${diff}, ${N} games per aim, ${((Date.now() - t0) / 1000).toFixed(0)}s. Best constant aims (angle rad, power -> wins, mean rounds):`);
  console.log('   ' + res.slice(0, 10).map((x) => `(${x.a}, ${x.v}) ${x.w}/${N} ${x.r.toFixed(1)}r`).join('  |  '));
  console.log(`   aims that won every game: ${res.filter((x) => x.w === N).length} of ${res.length}; won none: ${res.filter((x) => x.w === 0).length}`);
}
