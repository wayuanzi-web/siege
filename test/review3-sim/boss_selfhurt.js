// node test/review3-sim/boss_selfhurt.js [場數=40] [回合=10]：第六關，我方完全不開火。魔王的血、敵兵的血會不會自己掉（被自己人的砲彈打壞腳下的樓板摔下來之類）
const L = require('./lib'); const G = L.load('bossUnit');
const { S, simInit, simStep, simFire, structBar, bossUnit, WL } = G;
const N = +(process.argv[2] || 40), R = +(process.argv[3] || 10);
globalThis.__pe = null; globalThis.__hu = null;
G.__eval(`(function(){ const p = physExplode; physExplode = function(x, y, w, side, mass, flag, hit, vx, vy){ if (globalThis.__pe) globalThis.__pe(x, y, w, side, mass, flag, hit, vx, vy); return p(x, y, w, side, mass, flag, hit, vx, vy); }; const o = hurtUnit; hurtUnit = function(u, d, side, kind){ const hp0 = u.hp; o(u, d, side, kind); if (globalThis.__hu) globalThis.__hu(u, hp0 - Math.max(0, u.hp), side, kind); }; })()`);
console.log('src=' + G.__dir);
let own = 0, gamesOwn = 0, bossHurt = 0, gamesBoss = 0, unitHurt = 0, phase2 = 0, sbMin = 1; const ex = [];
for (let sd = 0; sd < N; sd++) {
  const seed = 91000 + sd * 7919 + 5 * 131;
  simInit(5, {}, seed, 1, { mute: 0 }); S.team[0].ai = null;
  let o = 0, bh = 0;
  globalThis.__pe = (x, y, w, side, mass, flag, hit) => { if (side === 1 && hit && hit.isBlock && hit.side === 1 && !hit.frag) { o++; if (ex.length < 8) ex.push(`seed${seed} r${S.round}: ${w.id} landed on own ${hit.cw}x${hit.ch} m${hit.mat} block c(${hit.cx},${hit.cy}) at (${x.toFixed(1)},${y.toFixed(1)}); aim (${S.team[1].aim[0].toFixed(1)},${S.team[1].aim[1].toFixed(1)})`); } };
  globalThis.__hu = (u, lost, side, kind) => { if (u.side !== 1 || lost <= 0) return; if (u.def.big) { bh += lost / u.hpMax; if (ex.length < 8) ex.push(`seed${seed} r${S.round} ${S.phase}/turn${S.turn}: BOSS lost ${(100 * lost / u.hpMax).toFixed(1)}% (kind ${kind}, credited to side ${side})`); } else unitHurt += lost / u.hpMax; };
  let guard = 0;
  while (S.state === 'play' && S.round <= R && guard++ < 60 * 80 * R) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
  own += o; if (o) gamesOwn++; bossHurt += bh; if (bh > 0) gamesBoss++; if (S.boss.phase > 1) phase2++; const b = structBar(1); if (b < sbMin) sbMin = b;
}
console.log(`L6, ${N} games x ${R} rounds, I never fire: enemy shells landing on the enemy's own castle: ${own} (in ${gamesOwn} games); boss lost HP in ${gamesBoss} games (total ${(100 * bossHurt).toFixed(1)}% of a boss); boss left phase 1 in ${phase2} games; other enemy units lost ${(100 * unitHurt).toFixed(1)}% of a unit in total; lowest enemy structure bar ${(100 * sbMin).toFixed(1)}%`);
for (const e of ex) console.log('   ' + e);
