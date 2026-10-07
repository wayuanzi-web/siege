// node test/bossline.js [場數=24] [bot=casual] [hp] [dmg] [err]：魔王關每一回合開始時魔王剩多少血、各階段待幾回合
const G = require('./load')(); const { S, simInit, simStep, LEVELS, BOTS } = G;
const N = +(process.argv[2] || 24), bot = process.argv[3] || 'casual', lv = LEVELS[5];
if (process.argv[4]) lv.foe.hp = +process.argv[4]; if (process.argv[5]) lv.foe.dmg = +process.argv[5]; if (process.argv[6]) lv.foe.ai.err = +process.argv[6];
const sum = [], cnt = [], ph = [0, 0, 0, 0], dmgR = [0, 0, 0, 0], nR = [0, 0, 0, 0]; let wins = 0, rounds = 0, zero = 0, tot = 0;
for (let sd = 0; sd < N; sd++) {
  simInit(5, {}, 700 + sd * 7919 + 5 * 131, 1, { botA: BOTS[bot] });
  const bu = S.team[1].units.find((u) => u.type === 'boss'); let last = -1, hp0 = bu.hp;
  S.on = (t, a, b) => { if (t === 'turn' && a === 1) { const d = hp0 - Math.max(0, bu.hp); dmgR[S.boss.phase] += d; nR[S.boss.phase]++; tot++; if (d < 1) zero++; hp0 = Math.max(0, bu.hp); } };
  while (S.state === 'play' && S.round < 40) { simStep(1 / 60); if (S.round !== last) { last = S.round; sum[last] = (sum[last] || 0) + Math.max(0, bu.hp) / bu.hpMax; cnt[last] = (cnt[last] || 0) + 1; ph[S.boss.phase]++; } }
  if (S.state === 'won') wins++; rounds += S.round;
}
let s = ''; for (let r = 1; r <= 16; r++) if (cnt[r]) s += ` r${r}:${Math.round(100 * sum[r] / cnt[r])}%(${cnt[r]})`;
console.log(`L6 [${bot}] hp=${lv.foe.hp} dmg=${lv.foe.dmg}: 勝 ${wins}/${N}，平均 ${(rounds / N).toFixed(1)} 回合`);
console.log('  各回合開始時魔王血量（還在打的場數）：' + s);
console.log(`  平均每場待在各階段的回合數：一 ${(ph[1] / N).toFixed(1)}、二 ${(ph[2] / N).toFixed(1)}、三 ${(ph[3] / N).toFixed(1)}；我方每一輪打掉魔王的血：一 ${(dmgR[1] / nR[1]).toFixed(0)}、二 ${(dmgR[2] / (nR[2] || 1)).toFixed(0)}、三 ${(dmgR[3] / (nR[3] || 1)).toFixed(0)}；完全沒打到魔王的輪數 ${zero}/${tot}`);
