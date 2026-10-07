// node test/review3-sim/l4_wall.js <場數=40> [bot=casual]
// 第四關敵城正面那一排鐵甲：實戰裡它是怎麼倒的？記下最上面那塊鐵甲「離開原位」的那一刻，離附近（12 以內）最近一次爆炸隔了多久。
// 隔很久（> 3 秒）才倒 = 沒人打它、它自己晃著晃著倒下來。另外統計它晃了多久（鐵甲醒著、沒有爆炸的時間）
// SIEGE_SRC 可以換成舊版原始碼比較
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, BOTS } = G;
const N = +(process.argv[2] || 40), bot = process.argv[3] || 'casual';
let fell = 0, late = 0, never = 0, rockT = 0, simT = 0; const gaps = [], ex = [], phases = {};
for (let sd = 0; sd < N; sd++) {
  const seed = 771000 + sd * 7919;
  simInit(3, {}, seed, 1, { botA: BOTS[bot] });
  const st = S.st[1], col = S.blocks.filter((b) => b.st === st && !b.prop && b.cx === 0 && b.mat === 3).sort((a, b) => a.cy - b.cy), top = col[col.length - 1];
  let lastBoom = -99, done = false;
  S.on = (t, a, b, c, d, e) => { if (t === 'boom' && !top.dead && Math.hypot(a - top.x0, b - top.y0) < 12 + c) lastBoom = S.time; };
  while (S.state === 'play' && S.round < 40) {
    simStep(1 / 60); simT += 1 / 60;
    if (done) continue;
    if (top.dead) { done = true; continue; }                              // 被打碎的不算倒
    const p = top.body.getPosition(), a = top.body.getAngle();
    if (top.body.isAwake() && S.time - lastBoom > 2) rockT += 1 / 60;
    if (Math.abs(a) > 0.5 || Math.abs(p.x - top.x0) > 5) {
      done = true; fell++; const gap = S.time - lastBoom; gaps.push(gap); const ph = `${S.phase}/turn${S.turn}`; phases[ph] = (phases[ph] || 0) + 1;
      if (gap > 3) { late++; if (ex.length < 8) ex.push(`seed${seed} r${S.round} ${ph}: iron face went over ${gap.toFixed(1)}s after the last blast within reach`); }
    }
  }
  if (!done) never++;
}
gaps.sort((a, b) => a - b);
console.log(`src=${G.__dir}  L4 ${bot}, ${N} games: iron face toppled in ${fell} games (not toppled ${never}); of those, more than 3s after the last nearby blast: ${late}`);
console.log(`   gap between the last nearby blast and the topple, sorted: ${gaps.map((g) => g.toFixed(1)).join(' ')}`);
console.log(`   it toppled during: ${JSON.stringify(phases)};  time the top plate spent awake with no blast in the last 2s: ${(100 * rockT / simT).toFixed(1)}% of game time`);
for (const e of ex) console.log('   ' + e);
