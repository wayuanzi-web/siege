// node test/review4-sim/pinned_fires.js [關卡=4] [bot=newbie] [seed=658009] [哪一邊=1] [兵位=3] [從幾秒開始印=20]
// 一個被樓板壓住的兵：整堆東西睡著之後就不再扣血，他還照樣開火。印出他每次開火時的血量、是不是睡著、最後一次醒著時頭上壓了幾倍體重，
// 以及那幾發砲彈打掉對方多少血
const L = require('./lib4'); const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, BOTS, CRUSH_LOAD } = G;
const li = +(process.argv[2] || 4) - 1, bot = process.argv[3] || 'newbie', seed = +(process.argv[4] || 658009), side = +(process.argv[5] === undefined ? 1 : process.argv[5]), slot = +(process.argv[6] || 3), T0 = +(process.argv[7] || 20);
simInit(li, {}, seed, 1, { botA: BOTS[bot] });
const who = S.team[side].units.find((u) => u.slot === slot), tag = `side${side} ${who.type}#${slot}`;
let lastLoad = 0, dmg = 0;
H.load = (u, l) => { if (u === who && u.body.isAwake()) lastLoad = l; };
S.on = (t, a, b, c, d, e) => { if (t === 'fire' && c === side && e === slot && S.time > T0) console.log(`t=${S.time.toFixed(2)} r${S.round}  ${tag} FIRES: hp ${who.hp.toFixed(0)}/${who.hpMax.toFixed(0)}, body ${who.body.isAwake() ? 'awake' : 'ASLEEP'}, last load measured while awake ${lastLoad.toFixed(1)}x his weight (threshold ${CRUSH_LOAD}); overhead: ${L.over(G, who).map(L.bdesc).join(' ')}`); };
H.hurt = (u, d, s, k, ctx) => { if (u === who && S.time > T0 && d > 1) console.log(`t=${S.time.toFixed(2)}  ${tag} loses ${d.toFixed(0)} (${ctx}) -> ${(who.hp - d).toFixed(0)}`); if (u.side !== side && ctx === 'blast:' + (who.w ? who.w.id : '') && S.time > T0) { dmg += d; console.log(`t=${S.time.toFixed(2)}     his shell takes ${d.toFixed(0)} off ${u.type}#${u.slot}`); } };
H.kill = (u, s, how, ctx) => { if (u === who) console.log(`t=${S.time.toFixed(2)}  ${tag} dies (${ctx})`); };
while (S.state === 'play' && S.round < 40) simStep(1 / 60);
console.log(`result ${S.state} at t=${S.time.toFixed(1)}; damage done by ${tag}'s shells after t=${T0}: ${dmg.toFixed(0)}`);
