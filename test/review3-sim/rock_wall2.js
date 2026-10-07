// node test/review3-sim/rock_wall2.js [kick=-5] [從第幾秒開始印=12] [印幾秒=3]：把第四關鐵甲那一排晃起來之後，攤開一個週期：四塊各自的位移、角度、速度，還有它們跟誰碰在一起、碰撞衝量多大
const L = require('./lib'); const G = L.load();
const { S, PH, simInit, simStep, CS } = G;
const kick = +(process.argv[2] || -5), T0 = +(process.argv[3] || 12), TN = +(process.argv[4] || 3);
simInit(3, {}, 1, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].ai = null;
const st = S.st[1];
const col = S.blocks.filter((b) => b.st === st && !b.prop && b.cx === 0).sort((a, b) => a.cy - b.cy), top = col[col.length - 1];
for (let i = 0; i < 80; i++) simStep(1 / 60);
top.body.setLinearVelocity({ x: kick, y: 0 }); top.body.setAwake(true);
const name = (o) => !o ? 'ground' : o.isBlock ? `#${o.id}(m${o.mat} ${o.cw}x${o.ch} c${o.cx},${o.cy})` : 'unit' + o.type;
function E() { let ke = 0, pe = 0; for (const b of S.blocks) { if (b.dead) continue; const v = b.body.getLinearVelocity(), w = b.body.getAngularVelocity(); ke += 0.5 * b.mass * (v.x * v.x + v.y * v.y) + 0.5 * b.body.getInertia() * w * w; pe += b.mass * 48 * b.body.getWorldCenter().y; } for (const u of S.units) if (u.alive) { const v = u.body.getLinearVelocity(); ke += 0.5 * u.mass * (v.x * v.x + v.y * v.y); pe += u.mass * 48 * u.body.getWorldCenter().y; } return [ke, pe]; }
const [k0, p0] = E();
for (let i = 1; i <= (T0 + TN) * 60; i++) {
  S.phase = 'aim'; S.turn = 0; simStep(1 / 60);
  if (i >= T0 * 60 && i % 6 === 0) {
    const [ke, pe] = E();
    const cs = new Set();
    for (const b of col) { if (b.dead) continue; for (let ce = b.body.getContactList(); ce; ce = ce.next) { if (!ce.contact.isTouching()) continue; const o = ce.other.getUserData(); if (col.includes(o)) continue; cs.add(`#${b.id}~${name(o)}`); } }
    console.log(`t=${(i / 60).toFixed(2)} ` + col.map((b) => b.dead ? 'dead' : `${(b.body.getPosition().x - b.x0).toFixed(2)},${(b.body.getPosition().y - b.y0).toFixed(2)},${b.body.getAngle().toFixed(3)}`).join(' | ') + `  E-E0=${(ke + pe - k0 - p0).toFixed(0)} KE=${ke.toFixed(0)}  touch: ${[...cs].join(' ')}`);
  }
}
