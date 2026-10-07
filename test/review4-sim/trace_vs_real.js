// 第 5 項：simTrace 預測的落點 vs 真的砲彈（同一個瞬間、同樣的初速、沒有散布）。兩邊都試、有風。
// 也順便驗證閉合公式 x = mx + vx t + 0.5 w t (t + STEP)。
const G = require('../review/h')();
const { S, SH, simInit, simStep, simTrace, spawnShot, WPN, F_IN, STEP, GRAV } = G;
const mis = {}, misEx = []; let worst = 0, n = 0, typeMis = 0, cfWorst = 0; const bad = [];
for (const li of [0, 1, 3]) for (const wind of [0, 9, -12]) for (const side of [0, 1]) {
  simInit(li, {}, 77, 1, { mute: 1 }); S.team[0].mute = true;
  while (S.phase !== 'aim') simStep(1 / 60);
  S.wind = wind;
  for (const sp of S.gsp) if (sp.g) G.gateRemove(sp.g, 3);            // 把倍增符收掉：這裡只比彈道和碰撞
  const T = S.team[side], dir = T.dir;
  for (const u of T.units) {
    const big = u.def.big ? 1.5 : 1, mx = u.x + dir * 1.3 * big, my = u.y + 2.3 * big;
    for (let a = 0.15; a <= 1.45; a += 0.1) for (let v = 36; v <= 86; v += 10) {
      const vx = Math.cos(a) * v * dir, vy = Math.sin(a) * v;
      const R = simTrace(side, mx, my, vx, vy, wind, S.time, 300), tr = { hit: R.hit, x: R.x, y: R.y, t: R.t };
      let boom = null, t = 0, cf = 0; S.on = (e, x, y) => { if (e === 'boom' && !boom) boom = { x, y }; };
      const n0 = SH.n; spawnShot(side, WPN.bolt.i, mx, my, vx, vy, 1, F_IN, 0, 1);
      while (SH.n > n0 && t < 9.5) {
        G.shotsStep(STEP); t += STEP;
        if (SH.n > n0) { const ex = mx + vx * t + 0.5 * wind * t * (t + STEP), ey = my + vy * t - 0.5 * GRAV * t * (t + STEP); const d = Math.hypot(SH.x[n0] - ex, SH.y[n0] - ey); if (d > cf) cf = d; }
      }
      S.on = null; if (cf > cfWorst) cfWorst = cf;
      if ((tr.hit === 1 || tr.hit === 2 || tr.hit === 3) && boom) { const d = Math.hypot(tr.x - boom.x, tr.y - boom.y); n++; if (d > worst) worst = d; if (d > 1.0 && bad.length < 5) bad.push(`L${li + 1} side${side} wind${wind} a=${a.toFixed(2)} v=${v}: trace (${tr.x.toFixed(1)},${tr.y.toFixed(1)}) real (${boom.x.toFixed(1)},${boom.y.toFixed(1)})`); }
      else if (!!boom !== (tr.hit >= 1 && tr.hit <= 3)) { typeMis++; const k = (boom ? 'real boom at x in ' + (boom.x < -40 ? '<-40' : boom.x > 152 ? '>152' : 'field(' + boom.x.toFixed(0) + ',' + boom.y.toFixed(0) + ')') : 'real: no boom') + ' / trace hit=' + tr.hit + (tr.hit ? ' at (' + tr.x.toFixed(0) + ',' + tr.y.toFixed(0) + ')' : ''); mis[k.replace(/(-?[0-9]+,-?[0-9]+)/g, '(..)')] = (mis[k.replace(/(-?[0-9]+,-?[0-9]+)/g, '(..)')] || 0) + 1; if (misEx.length < 6 && boom && boom.x > -40 && boom.x < 152) misEx.push('L' + (li + 1) + ' side' + side + ' wind' + wind + ' a=' + a.toFixed(2) + ' v=' + v + ' ' + u.type + ': ' + k); }
    }
  }
}
console.log(`${n} shots compared: worst distance between predicted and real impact = ${worst.toFixed(3)}; hit/no-hit disagreements = ${typeMis}; closed-form vs real path worst error = ${cfWorst.toFixed(4)}`);
for (const b of bad) console.log('   ' + b);
console.log(JSON.stringify(mis, null, 1)); for (const m of misEx) console.log('  ' + m);
