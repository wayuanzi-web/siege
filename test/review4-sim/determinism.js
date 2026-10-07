// node test/review4-sim/determinism.js
// 同一個種子打兩次結果一不一樣：(1) 全新載入後直接打；(2) 同一份載入先打別的幾場再打；(3) 用加了探針的載入器打。
const L = require('./lib4'); const L3 = require('../review3-sim/lib');
function sig(G, li, seed, bot, diff) { const { S, simInit, simStep, BOTS } = G; simInit(li, {}, seed, diff, { botA: BOTS[bot] }); while (S.state === 'play' && S.round < 40) simStep(1 / 60); let h = 0; for (const u of S.units) h += u.hp; return `${S.state} r${S.round} t=${S.time.toFixed(2)} hp=${h.toFixed(3)} blocks=${S.blocks.filter((b) => !b.dead).length}`; }
const cases = [[2, 626071, 'newbie', 1], [4, 591041, 'casual', 1], [5, 610757, 'casual', 1], [3, 642171, 'newbie', 1]];
let bad = 0;
for (const [li, seed, bot, diff] of cases) {
  const a = sig(L.load('', { hooks: {} }), li, seed, bot, diff);
  const G2 = L.load('', { hooks: {} }); sig(G2, 0, 11, 'expert', 1); sig(G2, 5, 12, 'casual', 2); const b = sig(G2, li, seed, bot, diff);
  const c = sig(L3.load(), li, seed, bot, diff);
  const d = sig(require('../load.js')(), li, seed, bot, diff);
  const ok = a === b && a === c && a === d; if (!ok) bad++;
  console.log(`${ok ? 'same' : 'DIFFERENT'}  L${li + 1} ${bot} seed${seed}: fresh+hooks [${a}] | after other games [${b}] | plain review3 loader [${c}] | test/load.js [${d}]`);
}
console.log(bad ? `${bad} seeds did not reproduce` : 'all reproduce exactly');
