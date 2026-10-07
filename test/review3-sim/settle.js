// node test/review3-sim/settle.js [秒數=30]：每一關開局把所有磚和兵叫醒（不打任何東西），看多久全部睡著、最後還醒著的是誰、過程中最大的速度和位移
const L = require('./lib'); const G = L.load();
const { S, PH, LEVELS, simInit, physStep, CS } = G;
const T = +(process.argv[2] || 30);
console.log('src=' + G.__dir);
for (let li = 0; li < LEVELS.length; li++) {
  simInit(li, {}, 1, 1, null); S.phase = 'idle-test';
  for (const b of S.blocks) b.body.setAwake(true); for (const u of S.units) u.body.setAwake(true);
  let slept = -1, vmax = 0, vwho = '', lastAwake = [], dmax = 0, dwho = '';
  const nm = (b) => b.isBlock ? `s${b.side} m${b.mat} ${b.prop ? 'prop' : b.cw + 'x' + b.ch} c(${b.cx},${b.cy})` : `s${b.side} unit ${b.type}`;
  for (let i = 0; i < T * 60; i++) {
    physStep(1 / 60);
    let aw = []; for (const b of S.blocks) { if (b.dead) continue; if (b.body.isAwake()) aw.push(b); const v = b.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (i > 30 && sp > vmax) { vmax = sp; vwho = nm(b) + ' t=' + (i / 60).toFixed(1); } const p = b.body.getPosition(), d = Math.hypot(p.x - b.x0, p.y - b.y0); if (b.kind !== 'ball' && d > dmax) { dmax = d; dwho = nm(b); } }
    for (const u of S.units) if (u.alive && u.body.isAwake()) aw.push(u);
    if (aw.length) lastAwake = aw; else { slept = (i + 1) / 60; break; }
  }
  const dead = S.blocks.filter((b) => b.dead).length;
  console.log(`L${li + 1}: ${slept > 0 ? 'all asleep after ' + slept.toFixed(2) + 's' : 'STILL AWAKE after ' + T + 's (' + lastAwake.length + ' bodies)'}; max speed after 0.5s ${vmax.toFixed(2)} (${vwho}); max displacement ${dmax.toFixed(2)} (${dwho}); blocks destroyed ${dead}; last awake: ${lastAwake.slice(0, 5).map(nm).join(' | ')}`);
}
