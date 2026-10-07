// node test/review4-sim/l3_sweet.js [每格幾場=6] [難度=1] [關卡=3]
// 第三關：第一輪（敵軍還沒開過火）就贏的機率，對「仰角 × 力道」畫一張表。每格 N 場；格子裡是第一輪就贏的場數，* 表示那個角度的彈道會穿過倍增符
const L = require('./lib4');
// WHATIF=2：第一回合完全沒有倍增符（×5 改成第二回合才出現）。WHATIF=1：假設第三關的 ×5 符跟別關一樣第二回合才出現、第一回合只有 ×3（只在記憶體裡改，不動 src）
const PATCH = process.env.WHATIF === '2' ? [["{ owner: 0, mult: 5, h: 5.5, spots: [[56, 43.5]] },", "{ owner: 0, mult: 5, h: 5.5, spots: [[56, 43.5]], at: 2 },"]] : process.env.WHATIF ? [["{ owner: 0, mult: 5, h: 5.5, spots: [[56, 43.5]] },\n      { owner: 0, mult: 3, h: 5.5, spots: [[43, 41], [44, 31]], at: 2, hop: true },", "{ owner: 0, mult: 5, h: 5.5, spots: [[56, 43.5]], at: 2 },\n      { owner: 0, mult: 3, h: 5.5, spots: [[43, 41], [44, 31]], hop: true },"]] : [];
const G = L.load('', { hooks: {}, tag: false, patch: PATCH });
const { S, simInit, simStep, simAim, simFire } = G;
const N = +(process.argv[2] || 6), diff = +(process.argv[3] === undefined ? 1 : process.argv[3]), li = +(process.argv[4] || 3) - 1;
const angs = [], pows = []; for (let a = 0.30; a <= 0.901; a += 0.05) angs.push(+a.toFixed(2)); for (let v = 44; v <= 68; v += 4) pows.push(v);
let cells = 0, hot = 0, tot = 0, win = 0;
console.log(`L${li + 1} diff${diff}: games (of ${N}) won by my FIRST volley; rows = angle (deg), columns = power on the HUD scale (0-100)`);
console.log('        ' + pows.map((v) => String(Math.round((v - 32) / 54 * 100)).padStart(5)).join(''));
for (const a of angs) {
  let row = `${(a * 180 / Math.PI).toFixed(0).padStart(4)}°   `;
  for (const v of pows) {
    let w = 0, gate = false;
    for (let sd = 0; sd < N; sd++) {
      simInit(li, {}, 7770000 + sd * 7919, diff, {});
      S.on = (t, x, y, c, d, e) => { if (t === 'gate' && e === 0) gate = true; };
      let fired = false;
      while (S.state === 'play' && !(S.turn === 1 && S.phase === 'aim')) { if (S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.2 && !fired) { simAim(0, Math.cos(a) * v, Math.sin(a) * v); simFire(0); fired = true; } simStep(1 / 60); }
      if (S.state === 'won') w++;
    }
    cells++; tot += N; win += w; if (w * 2 >= N) hot++;
    row += (String(w) + (gate ? '*' : ' ')).padStart(5);
  }
  console.log(row);
}
console.log(`${hot} of ${cells} aim cells win on the first volley at least half the time; overall ${win}/${tot}`);
