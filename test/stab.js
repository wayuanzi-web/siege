// node test/stab.js：每一張城樓藍圖疊起來穩不穩。把所有磚叫醒跑（最多 20 秒），看有沒有東西移位、多久全部靜止。
const G = require('./load')();
const { S, PH, LEVELS, simInit, physStep, CS } = G;
let bad = 0;
for (let li = 0; li < LEVELS.length; li++) {
  simInit(li, {}, 1, 1, null);
  S.phase = 'idle-test';
  const rec = [];
  for (const b of S.blocks) { b.body.setAwake(true); rec.push({ o: b, x: b.x0, y: b.y0 }); }
  for (const u of S.units) { u.body.setAwake(true); rec.push({ o: u, x: u.body.getPosition().x, y: u.body.getPosition().y, unit: true }); }
  let slept = -1, tot = 0, worst = 0;
  let n = 0;
  for (let i = 0; i < 1200; i++) {
    n++;
    const t0 = process.hrtime.bigint(); physStep(1 / 60); const ms = Number(process.hrtime.bigint() - t0) / 1e6; tot += ms; if (ms > worst) worst = ms;
    let aw = 0; for (const r of rec) if (r.o.body && r.o.body.isDynamic() && r.o.body.isAwake()) aw++;
    if (!aw && slept < 0) { slept = (i + 1) / 60; break; }
  }
  const out = [];
  for (const r of rec) {
    if (!r.o.body) { out.push(`${r.unit ? 'UNIT ' + r.o.type : 'block mat' + r.o.mat} 不見了`); continue; }
    const p = r.o.body.getPosition(), d = Math.hypot(p.x - r.x, p.y - r.y), a = Math.abs(r.o.body.getAngle());
    if (r.o.kind === 'ball' ? d > 2.6 : (d > 0.35 || a > 0.03)) out.push(`${r.unit ? 'UNIT ' + r.o.type + '#' + r.o.slot : 'block mat' + r.o.mat + ' @cell(' + r.o.cx + ',' + r.o.cy + ') ' + r.o.cw + 'x' + r.o.ch} side${r.o.side} 移了 ${d.toFixed(2)}，轉了 ${a.toFixed(3)}`);
  }
  const ok = out.length === 0 && slept > 0; if (!ok) bad++;
  console.log(`L${li + 1} ${LEVELS[li].name}  磚 ${S.blocks.length} 兵 ${S.units.length}  ${slept > 0 ? slept.toFixed(2) + ' 秒後全部靜止' : '20 秒後還在動'}  每步 ${(tot / n).toFixed(2)}ms（最久 ${worst.toFixed(1)}）  ${ok ? '穩' : '不穩：'}`);
  for (const o of out.slice(0, 12)) console.log('    ' + o);
}
process.exit(bad ? 1 : 0);
