// node test/review2-sim/d_boss_stun.js [場數=32] [bot=casual]
// D：魔王被我方雷法師電暈（下一輪不能開火、也放不出光球）的頻率。連續幾輪？
const { load, H } = require('./lib');
const G = load(); const { S, simInit, simStep, BOTS } = G;
const N = +(process.argv[2] || 32), bot = process.argv[3] || 'casual';
let vols = 0, held = 0, games = 0, g2 = 0, maxRun = 0, zapAlive = 0, heldWhenZap = 0, wins = 0; const runs = [];
for (let sd = 0; sd < N; sd++) {
  simInit(5, {}, H.seed(9000, sd, 5), 1, { botA: BOTS[bot] }); games++;
  const bu = G.bossUnit(); let run = 0, best = 0;
  S.on = (t, a, b) => { if (t !== 'volley' || a !== 1 || !bu.alive) return; vols++; const zap = S.team[0].units.some((u) => u.alive && u.type === 'zap'); if (zap) zapAlive++; if (bu.held) { held++; if (zap) heldWhenZap++; run++; if (run > best) best = run; } else run = 0; };
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  if (best >= 2) g2++; if (best > maxRun) maxRun = best; runs.push(best); if (S.state === 'won') wins++;
}
runs.sort((a, b) => a - b);
console.log(`L6 ${games} ${bot} games (won ${wins}): boss volleys ${vols}; boss was stunned and skipped his volley ${held} times (${(100 * held / vols).toFixed(0)}%); while my 雷法師 was alive: ${heldWhenZap} of ${zapAlive} (${(100 * heldWhenZap / zapAlive).toFixed(0)}%); games with the boss skipped ≥2 turns in a row: ${g2}; longest run ${maxRun}; per-game longest run median ${runs[runs.length >> 1]}`);
