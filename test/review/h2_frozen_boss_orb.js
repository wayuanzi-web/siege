// H2：魔王被凍住（或被電暈）的那一輪照樣放得出毀滅光球。
// simFire 先在兵的迴圈裡把 frozen/stun 減掉，bossVolley 之後才檢查 frozen > 0，所以那個檢查永遠不會成立。
// 另外：全員凍住時，上膛的連珠（T.ult.armed）和天燈給的雙倍（T.rage）照樣被用掉。
const G = require('./h')();
const { S, simInit, simStep, simFire, simSkill, physExplode, WPN } = G;
function run(freeze) {
  simInit(5, {}, 99, 1, { mute: 0 });
  const bu = G.bossUnit(); bu.hp = bu.hpMax * 0.6;               // 一開場就低於七成：第一回合進第二階段
  const seen = { skipBoss: 0, orb: 0, fireBoss: 0, phase: 0 };
  S.on = (t, a, b, c, d, e) => {
    if (t === 'skip' && c === 1 && Math.abs(a - bu.x) < 0.01) seen.skipBoss++;
    if (t === 'orb') seen.orb++;
    if (t === 'fire' && c === 1 && e === bu.slot) seen.fireBoss++;
    if (t === 'phase') seen.phase = a;
  };
  let done = false, froze = false;
  while (!done && S.time < 60) {
    if (S.phase === 'aim' && S.turn === 0 && S.round === 1) {
      if (freeze && !froze) { physExplode(bu.x, bu.y + 1.5, WPN.ice, 0, 0.05, 0, null, 1, -1); froze = true; }      // 我方一發冰彈炸在魔王旁邊（威力調到很小，只看凍結）
      simFire(0);
    }
    if (S.round === 2) done = true;
    simStep(1 / 60);
  }
  return { freeze, bossPhase: seen.phase, bossFrozenWhenEnemyFired: froze, bossSkipEvents: seen.skipBoss, bossShotsFired: seen.fireBoss, orbsLaunched: seen.orb };
}
const a = run(false), b = run(true);
console.log(JSON.stringify(a)); console.log(JSON.stringify(b));
console.log(b.bossSkipEvents > 0 && b.bossShotsFired === 0 && b.orbsLaunched > 0 ? 'CONFIRMED: frozen boss skipped its shots but still launched the doom orb' : 'not reproduced');

// 全員凍住時連珠照樣被消耗
simInit(2, {}, 7, 1, null);
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
const T = S.team[0]; T.ult.c = T.ult.need; T.rage = 1; simSkill(0, 'ult');
for (const u of T.units) u.frozen = 1;
let shots = 0; S.on = (t, a, b, c) => { if (t === 'fire' && c === 0) shots++; };
simFire(0); for (let i = 0; i < 120; i++) simStep(1 / 60);
console.log(`all units frozen + ult armed + lantern rage: shots fired = ${shots}, ult.c ${T.ult.need} -> ${T.ult.c.toFixed(0)}, ult.uses = ${T.ult.uses}, rage -> ${T.rage}`);
