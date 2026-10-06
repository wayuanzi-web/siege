// H23：防空弩被凍住／電暈之後，下一輪照樣把砲彈射下來。
// 凍結是在「自己那一邊開火」時消耗掉的（simFire 的兵迴圈），可是防空弩是在「對方的那一輪」做事：
// 我方第 N 輪凍住它 → 敵方第 N 輪開火時 frozen 歸零（畫面上還跳「跳過」）→ 我方第 N+1 輪它已經解凍，照攔三發。
const G = require('./h')();
const { S, simInit, simStep, simFire, simAim, physExplode, WPN } = G;
function run(freeze) {
  simInit(4, { hp: 5 }, 31, 0, null);                              // 第五關：敵方有一個防空弩（敵軍照常開火；用 mute 的話凍結永遠不會被消耗，測不準）
  const fl = S.team[1].units.find((u) => u.def.flak); const flakPerVolley = []; let cur = 0, skips = 0;
  S.on = (t, a, b, c, d, e) => { if (t === 'flak') cur++; if (t === 'skip' && c === 1 && Math.abs(a - fl.x) < 0.01) skips++; if (t === 'volley' && a === 0) { cur = 0; } if (t === 'turn' && a === 1) flakPerVolley.push(cur); };
  let frozenDuringNext = null;
  for (let i = 0; i < 60 * 120 && S.round <= 3 && S.state === 'play'; i++) {
    if (S.phase === 'aim' && S.turn === 0) {
      if (S.round === 2 && frozenDuringNext === null) frozenDuringNext = fl.frozen > 0;
      simAim(0, 50, 42); simFire(0);
    }
    // 第一回合我方這一輪快結束時，一發冰彈炸在防空弩旁邊（威力很小，只看凍結）
    if (freeze && S.round === 1 && S.turn === 0 && S.phase === 'resolve' && fl.frozen === 0 && S.phaseT > 0.2 && S.phaseT < 0.25) physExplode(fl.x, fl.y + 1.5, WPN.ice, 0, 0.05, 0, null, 1, -1);
    simStep(1 / 60);
  }
  return { freeze, flakShotsInMyVolleys: flakPerVolley.slice(0, 3), enemySkipEvents: skips, flakStillFrozenWhenINextFire: frozenDuringNext };
}
const a = run(false), b = run(true);
console.log(JSON.stringify(a)); console.log(JSON.stringify(b));
console.log(b.enemySkipEvents > 0 && b.flakShotsInMyVolleys[1] === 3 ? 'CONFIRMED: the frozen 防空弩 "skipped" on its own side\'s turn and then intercepted 3 shots of my next volley as usual' : 'not reproduced');
