// node test/review7/replay.js <關卡> <自動玩家> <seed> [從第幾回合=1] [到第幾回合=99]
// 重播一場自動玩家 vs 敵軍，印出這幾回合的事件（換手、開火、嘎吱、碎磚、兵倒、繩斷、天秤），看某件事是怎麼發生的
const G = require('../load')('PH');
const { S, simInit, simStep, LEVELS, BOTS, MAT } = G;
const li = +process.argv[2] - 1, bot = process.argv[3] || 'casual', seed = +process.argv[4], R0 = +(process.argv[5] || 1), R1 = +(process.argv[6] || 99);
simInit(li, {}, seed, 1, { botA: BOTS[bot] });
const f1 = (v) => typeof v === 'number' ? v.toFixed(1) : String(v);
const SHOW = new Set((process.env.SHOW || 'turn,volley,creak,udie,snap,tilt,reso,bonk,revive,bonus,cell').split(','));
const crk = new Set();
S.on = (t, a, b, c, d, e, f) => {
  if (S.round < R0 || S.round > R1 || !SHOW.has(t)) return;
  const pre = `${S.time.toFixed(2)} R${S.round} [${S.phase}/t${S.turn}]`;
  if (t === 'creak') { const k = `${a.toFixed(0)},${b.toFixed(0)}/${S.turn}`; if (crk.has(k)) return; crk.add(k); console.log(`${pre} creak (${f1(a)},${f1(b)}) ratio ${f1(d)} (first in this turn)`); return; }
  if (t === 'cell') { if (!(d === 0 || d === 1) || (f && f.frag)) return; console.log(`${pre} cell side${d} ${MAT[c] ? MAT[c].k : c} (${f1(a)},${f1(b)}) kind ${e}`); return; }
  if (t === 'volley') { const A = S.team[a].ai, tg = A && A.best && A.best.t; console.log(`${pre} VOLLEY side${a} aim (${S.team[a].aim[0].toFixed(1)},${S.team[a].aim[1].toFixed(1)}) target ${tg ? `(${tg.x.toFixed(1)},${tg.y.toFixed(1)}) w${tg.w.toFixed(2)}${tg.rope ? ' rope ' + tg.rope.tag : ''}${tg.blk ? ' weak' : ''}${tg.obj ? ' ' + tg.obj.t : ''}` : '-'} mult ${A ? A.mult : '-'}`); return; }
  if (t === 'turn') { console.log(`${pre} ---- TURN side${a} round ${b}; units ` + S.units.map((u) => `${u.side ? 'E' : 'P'}${u.slot}${u.alive ? ':' + u.hp.toFixed(0) + '@' + u.x.toFixed(0) + ',' + u.y.toFixed(0) : '✗'}`).join(' ')); return; }
  console.log(`${pre} ${t} ${f1(a)} ${f1(b)} ${c === undefined ? '' : f1(c)} ${d === undefined ? '' : f1(d)} ${e === undefined ? '' : f1(e)} ${f === undefined || typeof f === 'object' ? '' : f1(f)}`);
};
while (S.state === 'play' && S.round <= R1) simStep(1 / 60);
console.log(`end: ${S.state} round ${S.round}`);
