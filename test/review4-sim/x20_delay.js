// node test/review4-sim/x20_delay.js [場數=40] [bot=expert]
// 第六關：魔王進第三階段（畫面 1.9 秒後說「×20 的倍增符出現了！」）到 ×20 符真的出現，中間隔多久；出現的時候輪到誰
const L = require('./lib4'); const G = L.load('', { hooks: {}, tag: false });
const { S, simInit, simStep, BOTS } = G; const N = +(process.argv[2] || 40), bot = process.argv[3] || 'expert';
const d = [], ph = {}; let never = 0, p3 = 0;
for (let sd = 0; sd < N; sd++) {
  simInit(5, {}, 440000 + sd * 7919, 1, { botA: BOTS[bot] }); let t3 = -1, got = false, turnAt = '';
  S.on = (t, a, b, c, dd) => { if (t === 'phase' && a === 3) { t3 = S.time; p3++; turnAt = S.phase + '/' + S.turn; ph[turnAt] = (ph[turnAt] || 0) + 1; } if (t === 'gspawn' && dd === 20 && t3 >= 0 && !got) { got = true; d.push(S.time - t3); } };
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  if (t3 >= 0 && !got) never++;
}
d.sort((a, b) => a - b);
console.log(`L6 ${bot}: phase 3 reached in ${p3}/${N} games (during ${JSON.stringify(ph)}); the x20 gate then appeared after min ${d[0].toFixed(1)}s / median ${d[d.length >> 1].toFixed(1)}s / max ${d[d.length - 1].toFixed(1)}s of game time; game ended before it ever appeared: ${never}`);
