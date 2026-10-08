// node test/review7/aimdeath.js <關卡範圍> [自動玩家=casual] [場數=10] [seed0=5150]
// 回合收尾被 9 秒上限切掉、東西還在動的時候：數有幾次換手時還有兵在快速移動（滑、掉），以及有幾個兵在「瞄準階段」倒下
const G = require('../load')('PH');
const { S, simInit, simStep, LEVELS, BOTS } = G;
const rg = (process.argv[2] || '6-12').split('-').map(Number), bot = process.argv[3] || 'casual', N = +(process.argv[4] || 10), seed0 = +(process.argv[5] || 5150);
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1; let aimDeaths = [], movingAtHandoff = 0, handoffs = 0;
  for (let g = 0; g < N; g++) {
    const seed = seed0 + g * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    S.on = (t, a, b, c, d, e, f) => {
      if (t === 'udie' && S.state === 'play' && (S.phase === 'aim' || S.phase === 'intro')) aimDeaths.push(`seed ${seed} R${S.round} turn${S.turn} side${c} #${f} ${d} how ${e} at (${a.toFixed(1)},${b.toFixed(1)})`);
      if (t === 'turn') { handoffs++; if (S.units.some((u) => u.alive && u.body && Math.hypot(u.vx, u.vy) > 3)) movingAtHandoff++; }
    };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  }
  console.log(`L${L} ${LEVELS[li].name} [${bot}] ${N} games: deaths during aim phase ${aimDeaths.length}; turn hand-offs with a soldier still moving > 3 u/s: ${movingAtHandoff}/${handoffs}`);
  for (const s of aimDeaths.slice(0, 5)) console.log('   ' + s);
}
