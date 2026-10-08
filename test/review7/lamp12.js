// node test/review7/lamp12.js：L12 打斷大殿兩根木柱，逐格看屋頂、吊燈、魔王：吊燈什麼時候被標成 hangFree、什麼時候碰到魔王的頭、有沒有 bonk
const G = require('../load')('PH, blockDist, blockKill, K_CRUSH');
const { S, simInit, simStep } = G;
simInit(11, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null;
S.phase = 'resolve'; S.turn = 0; S.round = 1;
const at = (x, y) => S.blocks.find((b) => !b.dead && G.blockDist(b, x, y) < 0.3);
const lamp = S.blocks.find((b) => b.hang === 'lamp'), roof = lamp.ropes[0].a, boss = S.team[1].units[0];
console.log('roof', roof.x0, roof.y0, 'lamp', lamp.x0, lamp.y0, 'boss head', (boss.y + boss.bh).toFixed(2));
S.on = (t, a, b, c, d, e) => { if (t === 'bonk' || t === 'udie' || t === 'phase') console.log(`  ${S.time.toFixed(3)} ${t} ${a} ${b} ${c}`); };
G.blockKill(at(83.1, 35.7), 0, G.K_CRUSH); G.blockKill(at(96.7, 35.7), 0, G.K_CRUSH);
let hp = boss.hp;
for (let i = 0; i < 90; i++) {
  S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60);
  const lp = lamp.dead ? null : lamp.body.getPosition(), rp = roof.dead ? null : roof.body.getPosition();
  let touch = false; if (!lamp.dead) for (let ce = lamp.body.getContactList(); ce; ce = ce.next) if (ce.contact.isTouching() && ce.other.getUserData() === boss) touch = true;
  if (i < 40 || boss.hp !== hp) console.log(`f${i + 1} roof y ${rp ? rp.y.toFixed(2) : 'dead'} inPlace ${roof.inPlace} | lamp y ${lp ? lp.y.toFixed(2) : 'dead'} bottom ${lp ? (lp.y - lamp.h / 2).toFixed(2) : '-'} hangFree ${lamp.hangFree || 0} touchBoss ${touch} | boss hp ${boss.hp.toFixed(0)}`);
  hp = boss.hp;
}
