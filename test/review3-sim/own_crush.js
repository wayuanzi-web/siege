// node test/review3-sim/own_crush.js <關卡> <seed> <第幾回合> [bot=casual]：我方兵在「我方自己開火的那一輪」被砸死：是什麼砸的？印出他死前每一步碰到的東西（哪一邊的、多重、多快、從哪裡飛來）
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, BOTS } = G;
const li = +process.argv[2] - 1, seed = +process.argv[3], R = +process.argv[4], bot = process.argv[5] || 'casual';
simInit(li, {}, seed, 1, { botA: BOTS[bot] });
const nm = (o) => !o ? 'ground' : o.isBlock ? `${o.frag ? 'fragment' : o.kind === 'ball' ? 'ball' : o.prop ? 'prop' : 'block ' + o.cw + 'x' + o.ch} of side ${o.side} (mat ${o.mat}, mass ${o.mass.toFixed(1)}, born at x=${o.x0.toFixed(0)})` : `unit ${o.type}`;
let hist = [], on = false, volT = 0;
S.on = (t, a, b, c, d, e, f) => { if (t === 'volley' && S.round === R) { on = a === 0; volT = S.time; hist = []; } if (t === 'udie' && on && c === 0) { console.log(`side0 ${d}#${f} died (how ${e}) ${(S.time - volT).toFixed(2)}s after my volley started, at (${a.toFixed(1)},${(b - 1.8).toFixed(1)}). What touched him in his last frames:`); for (const h of hist.slice(-8)) console.log('   ' + h); } };
while (S.state === 'play' && S.round <= R) {
  simStep(1 / 60);
  if (!on) continue;
  for (const u of S.team[0].units) { if (!u.alive) continue; for (let ce = u.body.getContactList(); ce; ce = ce.next) { if (!ce.contact.isTouching()) continue; const o = ce.other.getUserData(), v = ce.other.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > 6) hist.push(`t=${(S.time - volT).toFixed(2)} ${u.type}#${u.slot} hp ${u.hp.toFixed(0)} touched by ${nm(o)} moving (${v.x.toFixed(0)},${v.y.toFixed(0)})`); } }
}
