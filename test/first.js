// node test/first.js <關卡 1-6> [場數=150] [敵軍打幾輪=1]
// 開場公平性：我方完全不開火、不開護罩，敵軍（照關卡原本的 AI，含手抖）先打 K 輪，看我方倒幾個兵
const G = require('./load')(); const { S, simInit, simStep, simFire, LEVELS } = G;
const li = +(process.argv[2] || 1) - 1, N = +(process.argv[3] || 150), K = +(process.argv[4] || 1);
const HOW = ['擊倒', '砸扁', '?', '燒', '摔出場', '出城'];
const hist = [0, 0, 0, 0, 0], who = {}; let lost = 0;
for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, 52000 + sd * 7919 + li * 131, 1, { mute: 0 }); S.team[0].ai = null;
  S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && c === 0) { const k = d + '#' + f + ' ' + HOW[e]; who[k] = (who[k] || 0) + 1; } };
  let guard = 0;
  while (S.state === 'play' && S.round <= K && guard++ < 60 * 60 * K) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
  const n = S.team[0].units.length - S.team[0].alive; hist[Math.min(4, n)]++; if (S.state === 'lost') lost++;
}
console.log(`L${li + 1} ${LEVELS[li].name}：敵軍先打 ${K} 輪、我方不還手，${N} 場裡我方倒 0/1/2/3/4 個的場數：${hist.join(' / ')}（整場輸掉 ${lost}）  倒的是：${Object.keys(who).sort((a, b) => who[b] - who[a]).map((k) => k + ' ×' + who[k]).join('、') || '—'}`);
