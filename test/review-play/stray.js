// node test/review-play/stray.js <關卡> [場數=40]：我方的兵跑到城外（x > 40）是怎麼發生的
const G = require('./lib')();
const { S, HOOK, simInit, simStep, LEVELS, BOTS } = G;
const li = +(process.argv[2] || 3) - 1, N = +(process.argv[3] || 40);
let cases = 0, turns = 0, how = {};
for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, 31 + sd * 7919 + li * 131, 1, { botA: BOTS.casual });
  const seen = new Set(); let lastHit = new Map();
  HOOK.hurt = (u, d, side, kind) => { if (u.side === 0) lastHit.set(u, { r: S.round, src: HOOK.cur || (kind === G.K_CRUSH ? 'crush' : 'other'), x: Math.round(u.x), y: Math.round(u.y), vx: Math.round(u.vx) }); };
  S.on = (t, a, b, c, d, e) => { if (t === 'revive' && c === 0) console.log(`  game ${sd} r${S.round}: my soldier revived by lantern at (${a.toFixed(0)},${b.toFixed(0)})`); };
  let prev = '';
  while (S.state === 'play' && S.round < 40) {
    simStep(1 / 60);
    const key = S.phase + S.turn + S.round;
    if (key !== prev) { prev = key; if (S.phase === 'aim' && S.turn === 0) for (const u of S.team[0].units) if (u.alive && u.x > 40) { turns++; if (!seen.has(u)) { seen.add(u); cases++; const h = lastHit.get(u); const k = h ? h.src : 'none'; how[k] = (how[k] || 0) + 1; if (cases <= 8) console.log(`  game ${sd} r${S.round}: my ${u.type}#${u.slot} now at (${u.x.toFixed(0)},${u.y.toFixed(0)}) home (${u.hx.toFixed(0)},${u.hy.toFixed(0)}); last hit ${JSON.stringify(h)}; ground there ${G.groundY(u.x).toFixed(1)}`); } } }
  }
}
console.log(`L${li + 1}: ${cases} soldiers ended up at x>40 in ${N} games (${turns} soldier-turns); last thing that hit them: ${JSON.stringify(how)}`);
