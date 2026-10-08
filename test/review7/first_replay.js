// node test/review7/first_replay.js <關卡> <seed>：重播 first.js 的某一場（我方不還手、敵軍先打一輪），印出我方城的每一塊碎磚、兵的受傷、壓在頭上的重量
const G = require('../load')('PH');
const { S, simInit, simStep, simFire, LEVELS, MAT } = G;
const li = +process.argv[2] - 1, seed = +process.argv[3];
simInit(li, {}, seed, 1, { mute: 0 }); S.team[0].ai = null;
const f1 = (v) => typeof v === 'number' ? v.toFixed(1) : String(v);
const hp = new Map(S.team[0].units.map((u) => [u, u.hp]));
S.on = (t, a, b, c, d, e, f) => {
  if (S.turn !== 1) return;
  if (t === 'cell' && d === 0) console.log(`${S.time.toFixed(2)} [${S.phase}] our block ${MAT[c] ? MAT[c].k : c} (${f1(a)},${f1(b)}) destroyed kind ${e}`);
  else if (t === 'boom' && e === 1) console.log(`${S.time.toFixed(2)} [${S.phase}] enemy ${['rocket', 'bolt', 'bomb', 'fire', 'ice', 'zap', 'dark', 'stone', 'drop', 'keg', 'doom'][d]} boom (${f1(a)},${f1(b)}) r${f1(c)} mass ${f1(f)}`);
  else if (t === 'thunk') console.log(`${S.time.toFixed(2)} [${S.phase}] boulder thunk (${f1(a)},${f1(b)})`);
  else if (['udie', 'yelp', 'gate', 'volley'].includes(t)) console.log(`${S.time.toFixed(2)} [${S.phase}] ${t} ${f1(a)} ${f1(b)} ${c === undefined ? '' : f1(c)} ${d === undefined ? '' : f1(d)} ${e === undefined ? '' : f1(e)} ${f === undefined ? '' : f1(f)}`);
};
let guard = 0, lastPrint = 0;
while (S.state === 'play' && S.round <= 1 && guard++ < 3600) {
  if (S.phase === 'aim' && S.turn === 0) simFire(0);
  simStep(1 / 60);
  for (const u of S.team[0].units) { if (!u.alive) continue; const h0 = hp.get(u); if (u.hp < h0 - 0.5) { console.log(`${S.time.toFixed(2)} [${S.phase}] our #${u.slot} ${u.type} hp ${h0.toFixed(0)} → ${u.hp.toFixed(0)} @(${u.x.toFixed(1)},${u.y.toFixed(1)}) load ${u.load.toFixed(2)} loadT ${u.loadT.toFixed(2)}`); hp.set(u, u.hp); } }
}
console.log('end', S.state, S.team[0].units.map((u) => `#${u.slot}${u.alive ? '' : '✗'}`).join(' '));
