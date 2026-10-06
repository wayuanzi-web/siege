// 魔王掉出戰場：每次扣 15% 血、飛回城頂。連掉幾次會不會出事（卡住、NaN、血量變負、沒有身體）？
const G = require('./h')();
const { S, simInit, simStep, teamBar } = G;
simInit(5, {}, 3, 1, { mute: 0 }); S.team[1].mute = true; S.team[0].ai = null;
while (S.phase !== 'aim') simStep(1 / 60);
const bu = G.bossUnit(); let backs = 0; const log = [];
S.on = (t, a, b) => { if (t === 'bossback') { backs++; log.push(`back#${backs} to (${a.toFixed(1)},${b.toFixed(1)}) hp ${bu.hp.toFixed(0)}/${bu.hpMax.toFixed(0)} ult0=${S.team[0].ult.c.toFixed(1)}`); } if (t === 'udie') log.push(`udie type=${arguments[4]}`); if (t === 'end') log.push('END loser=' + b); };
for (let k = 0; k < 9 && S.state === 'play'; k++) {
  bu.body.setTransform({ x: 60, y: -20 }, 0); bu.body.setLinearVelocity({ x: 0, y: -30 }); bu.body.setAwake(true);     // 丟進虛空
  for (let i = 0; i < 240 && S.state === 'play'; i++) simStep(1 / 60);
}
console.log(log.join('\n')); console.log('state', S.state, 'boss alive', bu.alive, 'hp', bu.hp, 'body', !!bu.body, 'bar1', teamBar(1), 'kills', S.stat.kills);
// 城樓整個沒了之後再掉一次：回來的位置在哪
simInit(5, {}, 3, 1, { mute: 0 }); S.team[1].mute = true; S.team[0].ai = null;
while (S.phase !== 'aim') simStep(1 / 60);
const b2 = G.bossUnit(); for (const b of S.st[1].blocks.slice()) if (!b.dead) G.blockKill(b, 2, G.K_CRUSH, true);
for (let i = 0; i < 300; i++) simStep(1 / 60);
console.log('castle wiped: boss at', b2.x.toFixed(1), b2.y.toFixed(1), 'alive', b2.alive, 'hp', b2.hp.toFixed(0), 'state', S.state);
