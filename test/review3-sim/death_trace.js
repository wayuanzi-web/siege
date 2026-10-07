// node test/review3-sim/death_trace.js <關卡> <seed> [bot=expert] [第幾個敵兵位=1]：我方第一輪齊射期間，追那個敵兵的位置、速度（每 0.1 秒），直到他倒下或這一輪結束
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, BOTS, WL } = G;
const li = +process.argv[2] - 1, seed = +process.argv[3], bot = process.argv[4] || 'expert', slot = +(process.argv[5] || 1);
simInit(li, {}, seed, 1, { botA: BOTS[bot] });
const u = S.team[1].units.find((q) => q.slot === slot); let booms = 0, near = 0, vmax = 0, vxmax = 0, started = false, t0 = 0;
S.on = (t, a, b, c, d, e, f) => { if (t === 'boom' && e === 0) { booms++; if (u.alive && Math.hypot(a - u.x, b - u.y - 1.5) < c + 2) near++; } if (t === 'udie' && c === 1) console.log(`   t=${(S.time - t0).toFixed(2)} DIED ${d}#${f} how=${e} at (${a.toFixed(1)},${(b - 1.8).toFixed(1)})`); if (t === 'volley' && a === 0 && !started) { started = true; t0 = S.time; } };
console.log(`L${li + 1} seed${seed} ${bot}: enemy ${u.type}#${slot} starts at (${u.x.toFixed(1)},${u.y.toFixed(1)}), castle x ${S.st[1].x0}..${S.st[1].x1}`);
while (S.state === 'play' && !(S.turn === 1 && S.phase === 'aim')) {
  simStep(1 / 60);
  if (!started) continue;
  if (u.alive) { const v = u.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > vmax) vmax = sp; if (Math.abs(v.x) > vxmax) vxmax = Math.abs(v.x); }
  if (S.frame % 6 === 0 && u.alive && (u.body.isAwake())) { const v = u.body.getLinearVelocity(); let on = []; for (let ce = u.body.getContactList(); ce; ce = ce.next) if (ce.contact.isTouching()) { const o = ce.other.getUserData(); on.push(o ? (o.isBlock ? `m${o.mat}${o.frag ? 'frag' : o.seg ? 'seg' + o.cw : ''}` : 'unit') : 'ground'); } console.log(`   t=${(S.time - t0).toFixed(2)} pos (${u.x.toFixed(1)},${u.y.toFixed(1)}) v (${v.x.toFixed(1)},${v.y.toFixed(1)}) hp ${u.hp.toFixed(0)} booms so far ${booms} (near him ${near}) touching [${on.join(',')}]`); }
}
console.log(`fastest he ever moved ${vmax.toFixed(1)} (sideways ${vxmax.toFixed(1)}); my blasts in this volley ${booms}`);
