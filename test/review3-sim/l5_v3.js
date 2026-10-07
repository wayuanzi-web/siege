// node test/review3-sim/l5_v3.js [場數=150] [關卡=5]：我方不開火，看每一輪敵軍齊射前後我方每個兵的血量（平均），和造成傷害的來源（哪一種砲彈、摔、砸）
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, simFire, LEVELS, WL } = G;
const N = +(process.argv[2] || 150), li = +(process.argv[3] || 5) - 1, K = 3;
globalThis.__hu = null; globalThis.__ex = null;
G.__eval(`(function(){ const o = hurtUnit; hurtUnit = function(u, d, side, kind){ const hp0 = u.hp; o(u, d, side, kind); if (globalThis.__hu) globalThis.__hu(u, hp0 - Math.max(0, u.hp), side, kind); }; const p = physExplode; physExplode = function(x, y, w, side, mass, flag, hit, vx, vy){ const prev = globalThis.__cur; globalThis.__cur = w.id; try { return p(x, y, w, side, mass, flag, hit, vx, vy); } finally { globalThis.__cur = prev; } }; })()`);
console.log(`src=${G.__dir} L${li + 1}`);
const hpAt = [], dmg = [], two = [0, 0, 0], nUnits = LEVELS[li].me.crew.length;
for (let k = 0; k <= K; k++) { hpAt.push(new Array(nUnits).fill(0)); dmg.push({}); }
for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, 52000 + sd * 7919 + li * 131, 1, { mute: 0 }); S.team[0].ai = null;
  let vol = 0, kills = 0;
  globalThis.__cur = null;
  globalThis.__hu = (u, lost, side, kind) => { if (u.side !== 0 || lost <= 0 || vol < 1 || vol > K) return; const src = globalThis.__cur ? globalThis.__cur : kind === 6 ? 'crush/fall' : kind === 3 ? 'burn' : kind === 5 ? 'zap-bolt' : 'other'; const key = `u${u.slot}:${src}`; dmg[vol][key] = (dmg[vol][key] || 0) + lost / u.hpMax; };
  S.on = (t, a, b, c) => { if (t === 'volley' && a === 1) { if (vol >= 1 && vol <= K && kills >= 2) two[vol - 1]++; vol++; kills = 0; if (vol <= K) S.team[0].units.forEach((u, i) => { hpAt[vol - 1][i] += u.alive ? u.hp / u.hpMax : 0; }); } if (t === 'udie' && c === 0) kills++; };
  let guard = 0;
  while (S.state === 'play' && S.round <= K && guard++ < 60 * 80 * K) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
  if (kills >= 2 && vol === K) two[K - 1]++;
  S.team[0].units.forEach((u, i) => { hpAt[K][i] += u.alive ? u.hp / u.hpMax : 0; });
}
for (let k = 0; k <= K; k++) console.log(`${k < K ? 'before enemy volley ' + (k + 1) : 'after volley ' + K + '        '}: mean HP of my units 1..${nUnits} = ${hpAt[k].map((v) => (100 * v / N).toFixed(0) + '%').join(' ')}`);
for (let k = 1; k <= K; k++) console.log(`volley ${k}: damage per game (in units of that unit's max HP): ${Object.keys(dmg[k]).sort((a, b) => dmg[k][b] - dmg[k][a]).slice(0, 12).map((x) => x + ' ' + (dmg[k][x] / N).toFixed(2)).join(', ')}`);
