// node test/review7/wetreplay.js <關卡> <自動玩家> <seed> <回合>：那一回合裡，每 0.25 秒印出泡水的兵（wet、wetT、位置）和階段，看換手時是不是有人正泡在水裡
const G = require('../load')('PH');
const { S, simInit, simStep, BOTS } = G;
const li = +process.argv[2] - 1, bot = process.argv[3], seed = +process.argv[4], RR = +process.argv[5];
simInit(li, {}, seed, 1, { botA: BOTS[bot] });
S.on = (t, a, b, c, d, e, f) => { if (S.round === RR && ['turn', 'udie', 'volley'].includes(t)) console.log(`${S.time.toFixed(2)} [${S.phase}/turn${S.turn} phaseT ${S.phaseT.toFixed(2)} quietT ${S.quietT.toFixed(2)}] ${t} ${a} ${b} ${c} ${d} ${e}`); };
while (S.state === 'play' && S.round <= RR) { simStep(1 / 60); if (S.round === RR && (S.frame % 15) === 0) { const w = S.units.filter((u) => u.alive && u.wet > 0); if (w.length) console.log(`   ${S.time.toFixed(2)} [${S.phase}/turn${S.turn} quietT ${S.quietT.toFixed(2)}] wet: ` + w.map((u) => `side${u.side}#${u.slot} (${u.x.toFixed(1)},${u.y.toFixed(1)}) wet ${u.wet.toFixed(2)} wetT ${(u.wetT || 0).toFixed(2)} v(${u.vx.toFixed(1)},${u.vy.toFixed(1)})`).join(' ')); } }
