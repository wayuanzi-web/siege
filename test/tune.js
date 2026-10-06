// 量每一關的三件事（各跑 N 場）：我方單獨打要幾回合、敵軍單獨打要幾回合、真的對打的勝率
//   node test/tune.js <關卡> [場數=8] [bot=casual] [foe.hp] [foe.dmg] [ai.err] [強化等級=0]
const G = require('./load')();
const { S, simInit, simStep, LEVELS, BOTS, teamBar, structBar } = G;
const a = process.argv.slice(2), li = +a[0] - 1, N = +(a[1] || 8), bot = a[2] || 'casual', upL = +(a[6] || 0);
const lv = LEVELS[li];
if (a[3]) lv.foe.hp = +a[3]; if (a[4]) lv.foe.dmg = +a[4]; if (a[5]) lv.foe.ai.err = +a[5];
const up = { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL };
function run(mute, maxR) {
  let rs = 0, wins = 0, lost = 0, bar = 0, t = 0; const rl = [];
  for (let sd = 0; sd < N; sd++) {
    simInit(li, up, 500 + sd * 7919 + li * 131, 1, { botA: BOTS[bot], mute });
    while (S.state === 'play' && S.round < maxR && S.time < 2400) simStep(1 / 60);
    const won = S.state === 'won'; if (won) { wins++; bar += teamBar(0); }
    rs += S.round; rl.push((S.state === 'won' ? 'W' : S.state === 'lost' ? 'L' : '?') + S.round); lost += S.team[0].units.length - S.team[0].alive; t += S.time;
  }
  return { rounds: rs / N, wins, lost: lost / N, bar: wins ? bar / wins : 0, t: t / N, rl };
}
const A = run(1, 40), B = run(0, 60), C = run(undefined, 40);
console.log(`L${li + 1} ${lv.name} [${bot} up${upL}] hp=${lv.foe.hp} dmg=${lv.foe.dmg} err=${lv.foe.ai.err}`
  + `\n   我方單打 ${A.rounds.toFixed(1)} 回合 (${A.rl.join(' ')})`
  + `\n   敵軍單打 ${B.rounds.toFixed(1)} 回合 (${B.rl.join(' ')})`
  + `\n   對打 勝 ${C.wins}/${N}  ${C.rounds.toFixed(1)} 回合  損兵 ${C.lost.toFixed(1)}  勝時城防 ${(C.bar * 100).toFixed(0)}%  每場 ${C.t.toFixed(0)}s (${C.rl.join(' ')})`);
