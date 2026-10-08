// node test/review7/quiet.js [秒數=30] [levels=6-12] [wake=1]
// 「沒被打就不該自己垮」：機關全開（resolve 階段，超載、繩子、插銷、天秤都在算），不開任何一砲，跑 N 秒，
// 看有沒有磚離開原位、嘎吱作響、繩子斷、插銷斷、天秤轉、兵受傷。wake=1 把所有東西叫醒（被旁邊的爆炸震醒的情況），wake=0 不叫醒
const G = require('../load')('PH, ropeEnds');
const { S, simInit, simStep, LEVELS, MAT } = G;
const T = +(process.argv[2] || 30), rg = (process.argv[3] || '6-12').split('-').map(Number), wake = +(process.argv[4] === undefined ? 1 : process.argv[4]);
const turnArg = process.env.TURN === undefined ? 0 : +process.env.TURN;
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1;
  simInit(li, {}, 1, 1, {});
  S.team[0].ai = null; S.team[1].ai = null;
  const evs = {}; const first = {};
  S.on = (t, a, b, c, d, e) => { evs[t] = (evs[t] || 0) + 1; if (!(t in first)) first[t] = `${S.time.toFixed(2)}s @(${typeof a === 'number' ? a.toFixed(1) : a},${typeof b === 'number' ? b.toFixed(1) : b}) ${c === undefined ? '' : c} ${d === undefined ? '' : d} ${e === undefined ? '' : e}`; };
  S.phase = 'resolve'; S.turn = turnArg; S.round = 1;
  if (wake) { for (const b of S.blocks) b.body.setAwake(true); for (const u of S.units) u.body.setAwake(true); }
  const t0 = S.time; const hp0 = S.units.map((u) => u.hp);
  let maxPivot = 0, maxPin = 0, maxSL = [];
  for (let i = 0; i < T * 60 && S.state === 'play'; i++) {
    S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0;
    simStep(1 / 60);
    for (const o of S.pivots) maxPivot = Math.max(maxPivot, Math.abs(o.ang));
    for (const o of S.pins) if (o.b && o.b.body) maxPin = Math.max(maxPin, Math.abs(o.b.body.getAngle() - o.a0));
  }
  let moved = [], dead = 0, hurt = [];
  for (const b of S.blocks) { if (b.frag || b.st === S.rubble) continue; if (b.dead) dead++; else if (!b.inPlace) { const p = b.body.getPosition(); moved.push(`${MAT[b.mat].k}(${b.x0.toFixed(1)},${b.y0.toFixed(1)})→(${p.x.toFixed(1)},${p.y.toFixed(1)})`); } }
  let dmgd = []; for (const b of S.blocks) if (!b.dead && !b.frag && b.hp < b.hm - 0.01 && b.st !== S.rubble) dmgd.push(`${MAT[b.mat].k}(${b.x0.toFixed(1)},${b.y0.toFixed(1)}) ${(100 * b.hp / b.hm).toFixed(0)}%`);
  S.units.forEach((u, k) => { if (!u.alive) hurt.push(`${u.side ? '敵' : '我'}#${u.slot} 倒了`); else if (u.hp < hp0[k] - 0.01) hurt.push(`${u.side ? '敵' : '我'}#${u.slot} ${hp0[k].toFixed(0)}→${u.hp.toFixed(0)}`); });
  const cut = S.ropes.filter((r) => r.cut).length, pinsBroke = S.pins.filter((o) => o.broke).length;
  const ok = !moved.length && !dead && !hurt.length && !cut && !pinsBroke && maxPivot < 0.02 && !dmgd.length;
  console.log(`L${L} ${LEVELS[li].name} wake=${wake} turn=${turnArg} ${T}s: ${ok ? 'OK' : 'NOT QUIET'}  離位 ${moved.length} 碎 ${dead} 受損磚 ${dmgd.length} 兵 ${hurt.join(' ') || '—'} 繩斷 ${cut}/${S.ropes.length} 插銷斷 ${pinsBroke}/${S.pins.length} 天秤最大 ${(maxPivot * 57.3).toFixed(1)}° 插銷最大轉 ${(maxPin * 57.3).toFixed(1)}°`);
  const keys = Object.keys(evs).filter((k) => !['round', 'turn'].includes(k));
  if (keys.length) console.log('   events: ' + keys.map((k) => `${k}×${evs[k]} [first ${first[k]}]`).join('  '));
  if (moved.length) console.log('   moved: ' + moved.slice(0, 8).join('  '));
  if (dmgd.length) console.log('   damaged: ' + dmgd.slice(0, 8).join('  '));
}
