// node test/review2-sim/b_first_volley_mc.js <關卡> [種子數=200] [回合數=1]
// B：敵軍前 K 輪（我方完全不開火、不開護罩，城是全新的）打掉我方幾個兵？用關卡原本的敵軍 AI（含手抖）。看「一開場就被打垮」的機率。
const { load, H } = require('./lib');
const li = +process.argv[2] - 1, N = +(process.argv[3] || 200), K = +(process.argv[4] || 1);
const G = load(); const { S, simInit, simStep } = G;
const hist = [0, 0, 0, 0, 0]; let lostGame = 0; const who = {}; const ex = [];
for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, H.seed(52000, sd, li), 1, { mute: 0 }); S.team[0].ai = null;
  let d = 0; const names = [];
  S.on = (t, x, y, c, dd, e, f) => { if (t === 'udie' && c === 0 && S.state === 'play' || (t === 'udie' && c === 0)) { d++; names.push(dd + '#' + f + ':' + ['hit', 'crush', '?', 'burn', 'fell', 'out'][e]); who[dd + '#' + f] = (who[dd + '#' + f] || 0) + 1; } };
  let guard = 0; while (S.state === 'play' && S.round <= K && guard++ < 9000) { if (S.phase === 'aim' && S.turn === 0) { if (S.round > K) break; G.simFire(0); } simStep(1 / 60); }
  const n = S.team[0].units.length - S.team[0].alive; hist[Math.min(4, n)]++; if (S.state === 'lost') lostGame++;
  if (n >= 2 && ex.length < 6) ex.push(`seed#${sd}: ${names.join(', ')}${S.state === 'lost' ? '  → LEVEL LOST' : ''}`);
}
console.log(`L${li + 1}: enemy's first ${K} volley(s) against an untouched castle (I never fire), ${N} seeds: my units dead 0/1/2/3/4 → ${hist.join('/')} games; level lost outright in ${lostGame}; victims ${JSON.stringify(who)}`);
for (const e of ex) console.log('    ' + e);
