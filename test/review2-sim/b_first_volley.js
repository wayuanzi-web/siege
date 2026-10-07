// node test/review2-sim/b_first_volley.js [種子數=24]
// B1：第三、四關，敵軍「第一輪」（我方滿血、護罩還沒集滿、我方這一輪不開火免得干擾）就打掉我方一個兵的機率：
// 用關卡原本的手抖（err）和完全不抖（err = 0）各跑一輪。只看第一回合敵軍那一輪。
const { load, H } = require('./lib');
const N = +(process.argv[2] || 24);
for (const li of [2, 3, 4, 5]) for (const err of [null, 0]) {
  const G = load(); const { S, simInit, simStep, LEVELS } = G; if (err !== null) LEVELS[li].foe.ai.err = err;
  let dead1 = 0, dead2 = 0, hp = 0; const who = {}; const tg = {};
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, H.seed(31000, sd, li), 1, { mute: 0 }); S.team[0].ai = null;
    const hp0 = S.team[0].units.reduce((s, u) => s + u.hp, 0); let d = 0;
    S.on = (t, x, y, c, dd, e, f) => { if (t === 'udie' && c === 0) { d++; who[dd + '#' + f] = (who[dd + '#' + f] || 0) + 1; } };
    let guard = 0; while (S.state === 'play' && S.round < 2 && guard++ < 6000) { if (S.phase === 'aim' && S.turn === 0) G.simFire(0); simStep(1 / 60); }
    if (d >= 1) dead1++; if (d >= 2) dead2++; hp += hp0 - S.team[0].units.reduce((s, u) => s + Math.max(0, u.hp), 0);
  }
  console.log(`L${li + 1} enemy aim error ${err === null ? LEVELS[li].foe.ai.err + ' (shipped)' : '0 (perfect)'}: first enemy volley kills ≥1 of my full-HP units in ${dead1}/${N} games (≥2 in ${dead2}); avg hp lost ${(hp / N).toFixed(0)}; who: ${JSON.stringify(who)}`);
}
