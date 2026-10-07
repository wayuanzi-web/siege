// node test/review4-sim/const_trace.js <關卡> <角度> <力道> [場數=10] [難度=1]
// 每回合都用同一個角度和力道開火（不用技能）：敵兵各是第幾回合、怎麼死的；我方第一輪穿過了哪些倍增符、打出幾發
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, SH, simInit, simStep, simAim, simFire } = G;
const li = +(process.argv[2] || 1) - 1, a = +process.argv[3], v = +process.argv[4], N = +(process.argv[5] || 10), diff = +(process.argv[6] === undefined ? 1 : process.argv[6]);
const how = {}, byRound = {}; let wins = 0, rounds = 0;
for (let sd = 0; sd < N; sd++) {
  const seed = 5550000 + sd * 7919 + li * 131;
  simInit(li, {}, seed, diff, {});
  const log = [], gates = {}; let peak = 0;
  S.on = (t, x, y, c, d, e) => { if (t === 'gate' && e === 0 && S.round === 1) gates['x' + c] = (gates['x' + c] || 0) + 1; if (t === 'port' && c === 0 && d === 0 && S.round === 1) gates.portal = (gates.portal || 0) + 1; };
  H.kill = (u, side, hw, ctx) => { if (S.state !== 'play' && ctx === 'fin') return; if (u.side === 1) { log.push(`r${S.round}:${u.type}#${u.slot}:${ctx}`); how[ctx] = (how[ctx] || 0) + 1; byRound[S.round] = (byRound[S.round] || 0) + 1; } };
  while (S.state === 'play' && S.round < 30) {
    if (S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.2) { simAim(0, Math.cos(a) * v, Math.sin(a) * v); simFire(0); }
    if (S.round === 1 && SH.cnt[0] > peak) peak = SH.cnt[0];
    simStep(1 / 60);
  }
  if (S.state === 'won') { wins++; rounds += S.round; }
  if (sd < 8) console.log(`  seed${seed}: ${S.state} r${S.round}; first volley peak ${peak} shots in the air, gates ${JSON.stringify(gates)}; enemy deaths: ${log.join(' ')}`);
}
console.log(`L${li + 1} diff${diff} constant aim (${a} rad, ${v}): ${wins}/${N} won, mean ${(rounds / Math.max(1, wins)).toFixed(1)} rounds; enemy deaths by cause ${JSON.stringify(how)}; by round ${JSON.stringify(byRound)}`);
