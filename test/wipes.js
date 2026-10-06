// node test/wipes.js [場數=16] [bot=casual]：一輪砲擊最多帶走幾個兵（看有沒有「一輪就全滅」這種不公平的狀況）
const G = require('./load')(); const { S, simInit, simStep, LEVELS, BOTS } = G;
const N = +(process.argv[2] || 16), bot = process.argv[3] || 'casual', only = process.argv[4] ? +process.argv[4] - 1 : -1;
for (let li = 0; li < LEVELS.length; li++) {
  if (only >= 0 && li !== only) continue;
  const hist = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], early = [0, 0]; let wins = 0, rounds = 0; const notes = [];
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 9000 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] });
    const per = {}; const mx = [0, 0];
    S.on = (t, a, b, c) => { if (t !== 'udie') return; const k = S.round + ':' + S.turn + ':' + S.vol; per[c + k] = (per[c + k] || 0) + 1; if (per[c + k] > mx[c]) mx[c] = per[c + k]; if (per[c + k] >= 2 && S.round <= 2) { early[c]++; notes.push(`#${sd} r${S.round} ${c ? '敵' : '我'}方一輪倒 ${per[c + k]}`); } };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
    hist[0][mx[0]]++; hist[1][mx[1]]++; rounds += S.round; if (S.state === 'won') wins++;
  }
  console.log(`L${li + 1} ${LEVELS[li].name} 勝 ${wins}/${N} ${(rounds / N).toFixed(1)}r  我方一輪最多倒幾個（0/1/2/3/4 個的場數）：${hist[0].join(' ')}   敵方：${hist[1].join(' ')}   前兩回合就一輪倒兩個以上：我 ${early[0]} 敵 ${early[1]}`);
}
