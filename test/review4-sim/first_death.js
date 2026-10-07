// node test/review4-sim/first_death.js <關卡> [場數=100] [難度=1] [敵軍打幾輪=1]
// 我方完全不動（不開火、不開護罩），敵軍打 K 輪：我方倒下的兵是被什麼弄死的（依扣血來源），死前各種來源各扣了多少
const L = require('./lib4'); const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, simFire, LEVELS } = G;
const li = +(process.argv[2] || 1) - 1, N = +(process.argv[3] || 100), diff = +(process.argv[4] === undefined ? 1 : process.argv[4]), K = +(process.argv[5] || 1);
const by = {}; let dead = 0; const ex = [];
for (let sd = 0; sd < N; sd++) {
  const seed = 52000 + sd * 7919 + li * 131;
  simInit(li, {}, seed, diff, { mute: 0 }); S.team[0].ai = null;
  const dm = new Map();
  H.hurt = (u, d, side, kind, ctx) => { if (u.side !== 0) return; let m = dm.get(u); if (!m) dm.set(u, m = {}); m[ctx] = (m[ctx] || 0) + d; };
  H.kill = (u, side, how, ctx) => { if (u.side !== 0) return; dead++; by[ctx] = (by[ctx] || 0) + 1; const m = dm.get(u) || {}; if (ex.length < 12) ex.push(`seed${seed} r${S.round} t=${S.time.toFixed(1)} ${u.type}#${u.slot} killed by ${ctx}; damage taken: ${Object.keys(m).map((k) => k + ' ' + m[k].toFixed(0)).join(', ')}; overhead: ${u.body ? L.over(G, u).map(L.bdesc).join(' ') : ''}`); };
  let guard = 0;
  while (S.state === 'play' && S.round <= K && guard++ < 60 * 80 * K) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
}
console.log(`L${li + 1} diff${diff}: passive player, ${K} enemy volley(s), ${N} games: ${dead} of my units died; by final blow: ${JSON.stringify(by)}`);
for (const e of ex) console.log('   ' + e);
