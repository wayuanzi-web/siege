// node test/review7/revstat.js <關卡範圍> [自動玩家=casual] [場數=30] [seed0=600]
// 真的對局裡天燈「援兵」復活的兵：復活在哪裡、幾秒內又倒下、怎麼倒的
const G = require('../load')('PH');
const { S, simInit, simStep, LEVELS, BOTS } = G;
const rg = (process.argv[2] || '6-12').split('-').map(Number), bot = process.argv[3] || 'casual', N = +(process.argv[4] || 30), seed0 = +(process.argv[5] || 600);
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1; let rev = 0, quick = 0; const ex = [];
  for (let g = 0; g < N; g++) {
    const seed = seed0 + g * 7919 + li * 131; simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    const recent = [];
    S.on = (t, a, b, c, d, e, f) => {
      if (t === 'revive') { rev++; recent.push({ side: c, slot: d, t: S.time, x: a, y: b }); }
      if (t === 'udie') for (const r of recent) if (r.side === c && r.slot === f && S.time - r.t < 3) { quick++; if (ex.length < 5) ex.push(`seed ${seed} R${S.round}: side${c} #${f} revived at (${r.x.toFixed(1)},${r.y.toFixed(1)}) died ${(S.time - r.t).toFixed(2)}s later, how ${e}`); r.t = -99; }
    };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  }
  console.log(`L${L} ${LEVELS[li].name} [${bot}] ${N} games: ${rev} revives, ${quick} died again within 3 s`);
  for (const s of ex) console.log('   ' + s);
}
