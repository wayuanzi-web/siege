// node test/deaths.js [場數=12] [bot=casual]：每一關兩邊的兵是怎麼死的、死在第幾回合；每回合兩邊城防掉多少
const G = require('./load')(); const { S, simInit, simStep, LEVELS, BOTS, teamBar, structBar } = G;
const N = +(process.argv[2] || 12), bot = process.argv[3] || 'casual';
const HOW = ['擊倒', '砸扁', '?', '燒', '摔出場', '出城', '轟飛', '被水沖走'];
for (let li = 0; li < LEVELS.length; li++) {
  const how = [{}, {}], byRound = [[], []], bars = []; let rounds = 0, wins = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 9000 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] });
    let lastR = 0;
    S.on = (t, a, b, c, d, e) => { if (t === 'udie') { const k = HOW[e] || e; how[c][k] = (how[c][k] || 0) + 1; byRound[c][S.round] = (byRound[c][S.round] || 0) + 1; } };
    while (S.state === 'play' && S.round < 40) { simStep(1 / 60); if (S.round !== lastR) { lastR = S.round; (bars[lastR] = bars[lastR] || [0, 0, 0, 0, 0])[0]++; bars[lastR][1] += teamBar(0); bars[lastR][2] += teamBar(1); bars[lastR][3] += structBar(0); bars[lastR][4] += structBar(1); } }
    rounds += S.round; if (S.state === 'won') wins++;
  }
  const fmt = (o) => Object.keys(o).map((k) => k + ' ' + (o[k] / N).toFixed(1)).join('、') || '—';
  const br = (a) => { let s = ''; for (let r = 1; r <= 12; r++) s += (a[r] ? (a[r] / N).toFixed(1) : ' . ') + ' '; return s; };
  console.log(`L${li + 1} ${LEVELS[li].name}  勝 ${wins}/${N}  平均 ${(rounds / N).toFixed(1)} 回合`);
  console.log(`   我方陣亡（每場）：${fmt(how[0])}    敵方陣亡：${fmt(how[1])}`);
  console.log(`   各回合敵方陣亡  ${br(byRound[1])}`);
  console.log(`   各回合我方陣亡  ${br(byRound[0])}`);
  let s = '   回合開始時 我/敵 城防%（結構%）'; for (let r = 1; r <= 9; r++) if (bars[r]) s += `  r${r}:${(100 * bars[r][1] / bars[r][0]).toFixed(0)}/${(100 * bars[r][2] / bars[r][0]).toFixed(0)}(${(100 * bars[r][3] / bars[r][0]).toFixed(0)}/${(100 * bars[r][4] / bars[r][0]).toFixed(0)})`; console.log(s);
}
