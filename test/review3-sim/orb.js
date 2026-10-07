// node test/review3-sim/orb.js
// 第六關毀滅光球「打爆了會掉頭砸回魔王」的各種狀況，一個一個直接擺出來測
const L = require('./lib'); const G = L.load('spawnOrb, bossUnit, hurtUnit, killUnit, flyersBusy, bossReturn, objsStep, K_DARK, K_CRUSH, K_BLAST');
const { S, SH, PH, simInit, simStep, simFire, physExplode, WPN, spawnOrb, bossUnit, hurtUnit, killUnit, flyersBusy, bossReturn, K_DARK, K_CRUSH } = G;
let bad = 0; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) bad++; };
function init(seed) {
  simInit(5, {}, seed || 5, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].ai = null;
  const log = []; S.on = (t, a, b, c, d, e, f) => { if (t === 'orb' || t === 'orbgo' || t === 'orbback' || t === 'orbdie' || t === 'phase' || t === 'end' || t === 'bossback' || (t === 'udie' && d === 'boss')) log.push(t + (t === 'phase' ? a : '') + '@' + S.time.toFixed(2)); if (t === 'boom' && d === WPN.doom.i) log.push(`doomBoom(side${e})@${S.time.toFixed(2)} (${a.toFixed(1)},${b.toFixed(1)})`); };
  hold(80, 'aim', 0);
  return log;
}
function hold(n, phase, turn) { for (let i = 0; i < n; i++) { S.phase = phase || 'resolve'; if (turn !== undefined) S.turn = turn; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); } }
const orbs = () => S.objs.filter((o) => o.t === 'orb');
function toPhase(p) { const bu = bossUnit(), lb = S.lv.boss; S.vol++; if (p >= 2) hurtUnit(bu, bu.hp - bu.hpMax * (lb.p2 - 0.01), 0, K_DARK); if (p >= 3) { S.vol++; hurtUnit(bu, bu.hp - bu.hpMax * (lb.p3 - 0.01), 0, K_DARK); S.vol++; hurtUnit(bu, 1, 0, K_DARK); } S.vol++; }

console.log('A. orb shot down while flying out to its hover spot (st=out)');
{ const log = init(); toPhase(2); const bu = bossUnit(); spawnOrb(bu); hold(5); const o = orbs()[0]; ok(o && o.st === 'out', 'orb spawned, st=' + (o && o.st)); const hp0 = bu.hp; o.hp = 0; hold(1); ok(o.st === 'back' && o.side === 0, `turned back (st=${o.st} side=${o.side})`); ok(flyersBusy(), 'flyersBusy() while flying back'); let t = 0; while (orbs().length && t < 600) { hold(1); t++; } ok(!orbs().length, `orb gone after ${(t / 60).toFixed(2)}s`); ok(bu.hp < hp0, `boss hurt ${hp0.toFixed(0)} -> ${bu.hp.toFixed(0)} (${(100 * (hp0 - bu.hp) / bu.hpMax).toFixed(1)}% of max)`); ok(!flyersBusy(), 'flyersBusy() false afterwards'); console.log('     ' + log.join(' ')); }

console.log('B. hovering orb destroyed by my blast; then hit again while flying back (second reflect / extra damage?)');
{ const log = init(); toPhase(2); const bu = bossUnit(); spawnOrb(bu); let t = 0; while (orbs()[0].st !== 'hover' && t++ < 600) hold(1); const o = orbs()[0]; ok(o.st === 'hover', `hovering at (${o.x.toFixed(1)},${o.y.toFixed(1)}) after ${(t / 60).toFixed(2)}s, hp ${o.hp.toFixed(0)}`);
  const ult0 = S.team[0].ult.c; physExplode(o.x, o.y, WPN.bomb, 0, 1, 0, null, 0, -1); hold(1); ok(o.st === 'back', 'my bomb on it -> back'); ok(S.team[0].ult.c >= ult0 + 16 - 1e-9 || S.team[0].ult.c === S.team[0].ult.need, `ult +16 once (${ult0.toFixed(1)} -> ${S.team[0].ult.c.toFixed(1)})`);
  const ult1 = S.team[0].ult.c; hold(20); const before = log.filter((x) => x.startsWith('orbback')).length;
  for (const sd of [0, 1, 2]) physExplode(o.x, o.y, WPN.bomb, sd, 1, 0, null, 0, -1); hold(1);
  ok(o.st === 'back' && o.hp === 0 && log.filter((x) => x.startsWith('orbback')).length === before, 'blasts from side 0/1/2 on a returning orb change nothing (no second reflect)');
  ok(Math.abs(S.team[0].ult.c - ult1) < 12, `no second +16 ult (${ult1.toFixed(1)} -> ${S.team[0].ult.c.toFixed(1)})`);
  t = 0; while (orbs().length && t++ < 600) hold(1); ok(!orbs().length, 'orb gone'); ok(log.filter((x) => x.startsWith('doomBoom(side0)')).length === 1, 'exactly one doom blast credited to me'); console.log('     ' + log.join(' ')); }

console.log('C. orb destroyed while already attacking (st=run): must just die');
{ const log = init(); toPhase(2); const bu = bossUnit(); spawnOrb(bu); let t = 0; while (orbs()[0].st !== 'hover' && t++ < 600) hold(1); S.team[1].mute = false; S.phase = 'aim'; S.turn = 1; simFire(1); const o = orbs()[0]; ok(o.st === 'run', 'enemy volley sends it (st=' + o.st + ')'); hold(6, 'volley', 1); o.hp = 0; hold(2, 'resolve', 1); ok(!orbs().length && log.some((x) => x.startsWith('orbdie')), 'destroyed in flight -> orbdie, removed'); ok(!log.some((x) => x.startsWith('orbback')), 'no reflect while run'); console.log('     ' + log.join(' ')); }

console.log('D. boss dies while the orb is flying back');
{ const log = init(); toPhase(3); const bu = bossUnit(); spawnOrb(bu); hold(30); const o = orbs()[0]; o.hp = 0; hold(8); ok(o.st === 'back', 'back'); killUnit(bu, 0, 0); hold(1); ok(S.state === 'won', 'state=' + S.state); let t = 0; while (orbs().length && t++ < 600) simStep(1 / 60); ok(!orbs().length, `orb removed ${(t / 60).toFixed(2)}s after the boss died`); console.log('     ' + log.join(' ')); }

console.log('E. returning orb lands the killing blow: end check must fire in the same step');
{ const log = init(); toPhase(3); const bu = bossUnit(); bu.hp = 10; spawnOrb(bu); hold(30); const o = orbs()[0]; o.hp = 0; let t = 0; while (bu.alive && t++ < 600) hold(1); ok(!bu.alive, 'boss killed by its own orb'); ok(S.state === 'won' && S.loser === 1, `state=${S.state} loser=${S.loser} (checked right after the step in which he died)`); ok(!orbs().length, 'orb removed'); console.log('     ' + log.join(' ')); }

console.log('F. boss knocked out of the world while the orb flies back (bossReturn teleports him)');
{ const log = init(); toPhase(2); const bu = bossUnit(); spawnOrb(bu); hold(30); const o = orbs()[0]; o.hp = 0; hold(17); bu.body.setTransform({ x: 60, y: -27.5 - bu.bh / 2 }, 0); bu.body.setLinearVelocity({ x: 0, y: -5 }); hold(2); ok(log.some((x) => x.startsWith('bossback')), 'bossReturn happened'); let t = 0; while (orbs().length && t++ < 600) hold(1); ok(!orbs().length, `orb still found him and blew up after ${(t / 60).toFixed(2)}s`); ok(bu.alive, 'boss alive, hp ' + (100 * bu.hp / bu.hpMax).toFixed(0) + '%'); console.log('     ' + log.join(' ')); }

console.log('G. soft phase gate: a returning orb cannot skip a phase');
{ const log = init(); toPhase(2); const bu = bossUnit(), lb = S.lv.boss; S.vol++; bu.hp = bu.hpMax * (lb.p3 + 0.01); spawnOrb(bu); hold(30); const o = orbs()[0]; o.hp = 0; S.team[0].dmg = 30; let t = 0; while (orbs().length && t++ < 600) hold(1); ok(bu.alive && bu.hp >= bu.hpMax * 0.08 - 1e-6, `a x30 returning orb takes him from ${(100 * (lb.p3 + 0.01)).toFixed(0)}% to ${(100 * bu.hp / bu.hpMax).toFixed(1)}% (floor 8%)`); ok(S.boss.phase === 3, 'phase ' + S.boss.phase); console.log('     ' + log.join(' ')); }

console.log('H. full turn flow: reflect during my resolve; how long does the turn wait, does the next enemy volley launch a new orb');
{ const log = init(); toPhase(2); S.team[1].mute = false; const bu = bossUnit();
  S.phase = 'aim'; S.turn = 1; simFire(1); let t = 0; while (!(S.phase === 'aim' && S.turn === 0) && t++ < 1500 && S.state === 'play') simStep(1 / 60);
  const o = orbs()[0]; ok(o && o.st === 'hover', 'after the enemy volley an orb hovers: ' + (o ? o.st : 'none'));
  if (o) { S.team[0].mute = false; simFire(0); for (let i = 0; i < 30; i++) simStep(1 / 60); physExplode(o.x, o.y, WPN.bomb, 0, 1, 0, null, 0, -1); const t0 = S.time; t = 0; while (S.phase !== 'aim' && t++ < 1500 && S.state === 'play') simStep(1 / 60); ok(!orbs().length, 'orb resolved before the turn passed'); ok(S.turn === 1 && S.phase === 'aim', `turn passed to the enemy ${(S.time - t0).toFixed(2)}s after the reflect`); }
  console.log('     ' + log.join(' ')); }
console.log(bad ? `${bad} FAILED` : 'all passed');
process.exit(bad ? 1 : 0);
