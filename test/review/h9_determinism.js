// 第 6 項：同一個 seed 跑兩次，結束時的狀態要一模一樣；前面先跑過別的關卡（同一個 process）也不能影響結果。
//   node test/review/h9_determinism.js            各關各跑：全新 → 再跑一次 → 先跑別的關再跑
const G = require('./h')();
const { S, SH, PH, simInit, simStep, BOTS, LEVELS, rnd } = G;
function fp() {
  // 結束時的指紋：時間、回合、勝負、每個兵、每塊磚的位置和血量、下一個亂數
  let h = 2166136261 >>> 0; const mix = (v) => { const s = typeof v === 'number' ? v.toPrecision(12) : String(v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  mix(S.time); mix(S.round); mix(S.state); mix(S.frame); mix(S.stat.fired); mix(S.stat.cells); mix(S.team[0].ult.c); mix(S.team[1].ult.c);
  for (const u of S.units) { mix(u.alive); mix(u.hp); mix(u.x); mix(u.y); }
  let n = 0; for (const b of S.blocks) { if (b.dead) continue; n++; const p = b.body.getPosition(); mix(p.x); mix(p.y); mix(b.body.getAngle()); mix(b.hp); }
  mix(n); mix(S.bid); mix(rnd());
  return h.toString(16);
}
function play(li, bot, seed, maxR) { simInit(li, { dmg: 2, hp: 1, shield: 1, ult: 3 }, seed, 1, { botA: BOTS[bot] }); while (S.state === 'play' && S.round < (maxR || 40)) simStep(1 / 60); for (let i = 0; i < 300 && S.state !== 'play'; i++) simStep(1 / 60); return fp(); }
if (process.argv[2] === 'one') { console.log(play(+process.argv[3], process.argv[4], +process.argv[5])); process.exit(0); }
const { execFileSync } = require('child_process');
let bad = 0;
for (let li = 0; li < LEVELS.length; li++) {
  const seed = 4000 + li * 37, bot = ['casual', 'expert', 'newbie'][li % 3];
  const fresh = execFileSync(process.execPath, [__filename, 'one', String(li), bot, String(seed)]).toString().trim();     // 全新的 process
  const a = play(li, bot, seed);                 // 這個 process 裡前面已經跑過別的關
  play((li + 3) % 6, 'expert', 999 + li, 6);     // 中間插一場別的
  const b = play(li, bot, seed);
  const ok = fresh === a && a === b; if (!ok) bad++;
  console.log(`L${li + 1} ${bot} seed ${seed}: fresh-process ${fresh}  in-process ${a}  after-another-game ${b}  ${ok ? 'same' : 'DIFFERENT'}`);
}
console.log(bad ? `${bad} 關的結果會被前面跑過的東西影響（不可重現）` : '六關都可重現');
