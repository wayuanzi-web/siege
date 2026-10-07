// node test/review2-sim/f_shield_burial.js
// F：護城罩擋下敵軍一整輪，被壓住的兵照樣在那一輪結束時扣血。
// 做法（第五關，我方城 P3）：開局先把中層房間背面那一塊牆 S(2,8) 拿掉（上面的石板沉下來，壓在雷法師頭上）。
// 之後每一回合我方不開火，敵軍一開火就開護罩（為了示範，每回合把護罩灌滿）。看雷法師每回合掉多少血、敵軍的砲彈有沒有打進來。
const { load } = require('./lib');
const G = load({ extra: ['simSkill', 'K_HEAVY'] });
const { S, simInit, simStep, simSkill, blockKill, K_HEAVY } = G;
simInit(4, {}, 77, 1, { mute: 0 }); S.team[0].ai = null;
while (S.phase !== 'aim') simStep(1 / 60);
const st = S.st[0], wall = st.blocks.find((b) => !b.prop && b.cx === 2 && b.cy === 8), zap = S.team[0].units.find((u) => u.type === 'zap');
blockKill(wall, 2, K_HEAVY, true);
for (let i = 0; i < 240; i++) simStep(1 / 60);
console.log(`start: removed the back wall of the middle room. 雷法師 hp ${zap.hp.toFixed(0)}/${zap.hpMax} at (${(zap.x - st.x0).toFixed(1)}, ${zap.y.toFixed(1)}), home (${(zap.hx - st.x0).toFixed(1)}, ${zap.hy.toFixed(1)})`);
let blocked = 0, landed = 0, pin = [];
S.on = (t, x, y, c, d, e) => { if (t === 'shieldhit') blocked++; if (t === 'boom' && e === 1 && x < 40) landed++; };
S.onPin = (u, load, moved) => pin.push(`${u.type}#${u.slot} load ${load.toFixed(0)} (${moved ? 'displaced' : 'at its post'}) → -${(14 + Math.min(load, 80) * 0.7).toFixed(0)}`);
S.onHurt = (u, d, by, kind) => { if (u === zap) hurt.push(`${d.toFixed(0)} ${['blast', 'pierce', 'heavy', 'fire', 'ice', 'zap', 'crush/burial', 'dark'][kind]}`); };
let hurt = [];
for (let rd = S.round; rd <= 4 && S.state === 'play' && zap.alive; rd++) {
  blocked = 0; landed = 0; pin = []; hurt = []; const hp0 = zap.hp;
  // 我方這一輪：不開火（mute），直接放手
  while (!(S.phase === 'aim' && S.turn === 0) && S.state === 'play') simStep(1 / 60);
  G.simFire(0);
  while (!(S.turn === 1 && S.phase === 'volley') && S.state === 'play') { simStep(1 / 60); }
  S.team[0].shield.c = S.team[0].shield.need; const ok = simSkill(0, 'shield');
  while (!(S.phase === 'aim' && S.turn === 0) && S.state === 'play') simStep(1 / 60);
  console.log(`round ${rd}: shield raised=${ok}; enemy shots stopped by the shield ${blocked}, explosions on my castle ${landed}; 雷法師 hp ${hp0.toFixed(0)} → ${zap.alive ? zap.hp.toFixed(0) : 'DEAD'}  [damage: ${hurt.join(', ') || 'none'}]  burial: ${pin.join('; ') || 'none'}`);
}
