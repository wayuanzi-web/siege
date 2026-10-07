// node test/review4-sim/bar_mono.js <每關幾場=20> [bot=casual]
// 城防條（teamBar）和城樓完整度（structBar）會不會自己往上跳：扣掉補血、援軍（天燈）之後，每一步比前一步高出多少。
// 列出最大的幾次，以及「結算用的城防（S.endBar）」跟分出勝負前一步的城防差多少
const L = require('./lib4'); const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, LEVELS, BOTS, teamBar, structBar } = G;
const N = +(process.argv[2] || 20), bot = process.argv[3] || 'casual';
const ups = []; let games = 0, steps = 0, upN = [0, 0], sUpN = [0, 0], maxS = [0, 0];
for (let li = 0; li < LEVELS.length; li++) for (let sd = 0; sd < N; sd++) {
  const seed = 808000 + sd * 7919 + li * 131; simInit(li, {}, seed, 1, { botA: BOTS[bot] }); games++;
  let prev = [teamBar(0), teamBar(1)], prevS = [structBar(0), structBar(1)], bonusT = -9;
  H.bonus = () => { bonusT = S.time; };
  while (S.state === 'play' && S.round < 40) {
    simStep(1 / 60); steps++;
    if (S.state !== 'play') break;
    for (let s = 0; s < 2; s++) {
      const b = teamBar(s), sb = structBar(s);
      if (sb > prevS[s] + 0.004) { sUpN[s]++; if (sb - prevS[s] > maxS[s]) maxS[s] = sb - prevS[s]; ups.push({ d: sb - prevS[s], txt: `L${li + 1} seed${seed} t=${S.time.toFixed(1)} r${S.round} ${S.phase}/${S.turn} side${s} STRUCT bar ${(prevS[s] * 100).toFixed(1)}% -> ${(sb * 100).toFixed(1)}%` }); }
      if (b > prev[s] + 0.004 && S.time - bonusT > 0.1) upN[s]++;
      prev[s] = b; prevS[s] = sb;
    }
  }
}
ups.sort((a, b) => b.d - a.d);
console.log(`${games} games, ${steps} steps. Structure bar went UP by more than 0.4 points in one step: mine ${sUpN[0]} times (max +${(maxS[0] * 100).toFixed(1)}), foe ${sUpN[1]} times (max +${(maxS[1] * 100).toFixed(1)}). Team bar up (no lantern bonus within 0.1 s): mine ${upN[0]}, foe ${upN[1]}`);
for (const u of ups.slice(0, 8)) console.log('   ' + u.txt);
