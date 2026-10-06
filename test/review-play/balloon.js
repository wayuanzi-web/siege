// node test/review-play/balloon.js [seed=0] [bot=casual]：第五關的轟炸氣球到底有沒有丟到炸彈
const G = require('./lib')();
const { S, SH, HOOK, simInit, simStep, LEVELS, BOTS, WPN } = G;
const sd = +(process.argv[2] || 0), bot = process.argv[3] || 'casual';
const botCfg = Object.assign({}, BOTS[bot], process.argv[4] ? JSON.parse(process.argv[4]) : {});
simInit(4, {}, 777 + sd * 7919 + 4 * 131, 1, { botA: botCfg });
let last = '';
S.on = (t, a, b, c, d, e) => { if (['launch', 'drop', 'pop'].includes(t)) console.log(`  r${S.round} t=${S.time.toFixed(2)} ${S.phase}/${S.turn} EVENT ${t} @(${(+a).toFixed(1)},${(+b).toFixed(1)})`); if (t === 'udie') console.log(`  r${S.round} udie side${c} ${d} how${e}`); };
HOOK.explode = (x, y, w, side) => { if (w.id === 'drop') console.log(`  r${S.round} t=${S.time.toFixed(2)} DROP EXPLODES @(${x.toFixed(1)},${y.toFixed(1)})`); };
while (S.state === 'play' && S.round < 14) {
  simStep(1 / 60);
  for (const o of S.objs) if (o.t === 'balloon') { const k = `${o.st}`; if (k !== last) { last = k; console.log(`  r${S.round} t=${S.time.toFixed(2)} ${S.phase}/${S.turn} balloon -> ${o.st} @(${o.x.toFixed(1)},${o.y.toFixed(1)}) hp=${o.hp.toFixed(0)} n=${o.n} tg=${o.tgx0}..${o.tgx1}`); } }
  if (!S.objs.some((o) => o.t === 'balloon') && last) { console.log(`  r${S.round} t=${S.time.toFixed(2)} ${S.phase}/${S.turn} balloon gone (last state ${last})`); last = ''; }
  let nd = 0; for (let i = 0; i < SH.n; i++) if (SH.w[i] === WPN.drop.i) nd++;
  if (nd && S.frame % 6 === 0) { const i = [...Array(SH.n).keys()].find((i) => SH.w[i] === WPN.drop.i); console.log(`     drop shot in flight: n=${nd} first @(${SH.x[i].toFixed(1)},${SH.y[i].toFixed(1)}) v=(${SH.vx[i].toFixed(1)},${SH.vy[i].toFixed(1)}) side=${SH.side[i]} shield0=${S.team[0].shield.on}`); }
}
console.log(S.state, 'round', S.round);
