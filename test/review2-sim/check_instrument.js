// node test/review2-sim/check_instrument.js：確認 lib.js 加了觀察點的模擬，跟原版（test/load.js）同一個種子跑出來一模一樣。
// 這樣後面所有用 lib.js 量到的東西，講的就是真正出貨的那份模擬。
const plain = require('../load')('bossUnit'), { load } = require('./lib'), inst = load();
function sig(G, li, seed, bot, diff, up) {
  const { S, simInit, simStep, BOTS } = G; simInit(li, { dmg: up, aim: up, hp: up, shield: up, ult: up }, seed, diff, { botA: BOTS[bot] });
  let h = 0, n = 0; const mix = (v) => { h = (Math.imul(h ^ ((v * 1000) | 0), 16777619) + 0x9e3779b9) | 0; };
  while (S.state === 'play' && S.round < 40) { simStep(1 / 60); if ((++n & 31) === 0) { for (const u of S.units) { mix(u.x); mix(u.y); mix(u.hp); } mix(S.blocks.length); mix(S.team[0].ult.c); mix(S.team[1].ult.c); } }
  return S.state + ':' + S.round + ':' + n + ':' + (h >>> 0);
}
let bad = 0, n = 0;
for (let li = 0; li < 6; li++) for (const bot of ['newbie', 'casual', 'expert']) for (let sd = 0; sd < 2; sd++) {
  const seed = 4100 + sd * 7919 + li * 131, d = (li + sd) % 3, up = sd ? 5 : 0, a = sig(plain, li, seed, bot, d, up), b = sig(inst, li, seed, bot, d, up); n++;
  if (a !== b) { bad++; console.log(`MISMATCH L${li + 1} ${bot} seed ${seed}: plain ${a} vs instrumented ${b}`); }
}
console.log(bad ? `${bad}/${n} games differ` : `${n} games: instrumented sim is step-for-step identical to the shipped sim`);
process.exit(bad ? 1 : 0);
