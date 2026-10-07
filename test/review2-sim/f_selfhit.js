// node test/review2-sim/f_selfhit.js
// F：我方的砲彈會不會炸到自己的城？（自己的砲不傷自己的兵，但磚照炸。）
// (1) 第二關逆風（風 -12，往我方吹）：所有瞄準（角度 × 力道）裡，帶頭那個兵的砲彈落在自己城樓範圍內的比例；虛線（0.95 秒）結束時砲彈還在往上飛嗎？
// (2) 實際打一輪：仰角拉到最高、力道中等，逆風 -12；看自己的城防掉多少。
const { load } = require('./lib');
const G = load({ extra: ['simAim', 'simFire', 'structBar', 'teamBar', 'ANG_MAX', 'VMIN', 'VMAX'] });
const { S, simInit, simStep, simTrace, simAim, simFire, structBar, teamBar } = G;
function setup(li, wind) { simInit(li, {}, 5, 1, { mute: 1 }); S.team[0].ai = null; while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60); S.wind = wind; }
for (const [li, wind] of [[1, -12], [1, -8], [1, 0], [0, 0]]) {
  setup(li, wind); const st = S.st[0]; const u = S.team[0].units[0], mx = u.x + 1.3, my = u.y + 2.3;
  let n = 0, self = 0, selfRising = 0; let ex = null;
  for (let a = 0.10; a <= 1.5; a += 0.02) for (let v = 32; v <= 86; v += 2) {
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v; n++;
    const R = simTrace(0, mx, my, vx, vy, wind, S.time, 300);
    if (R.hit && R.x > st.x0 - 1.5 && R.x < st.x1 + 1.5 && (R.hit === 1 || (R.o && R.o.isBlock && R.o.side === 0))) { self++; const vyAt = vy - 48 * 0.95; if (vyAt > 0) selfRising++; if (!ex && a < 1.35) ex = `e.g. ${Math.round(a * 57.3)}° power ${v}: lands at x=${R.x.toFixed(0)} after ${R.t.toFixed(1)}s`; }
  }
  console.log(`L${li + 1} wind ${wind}: ${self} of ${n} aims (${(100 * self / n).toFixed(0)}%) end on my own castle or the ground under it; in ${selfRising} of those the 0.95s dotted preview ends while the shot is still climbing. ${ex || ''}`);
}
for (const [li, wind, ang, pw] of [[1, -12, 1.35, 60], [1, -12, 1.2, 50], [0, 0, 1.5, 40]]) {
  setup(li, wind); const s0 = structBar(0), t0 = teamBar(0), hp0 = S.team[0].units.reduce((s, u) => s + u.hp, 0);
  simAim(0, Math.cos(ang) * pw, Math.sin(ang) * pw); let own = 0, all = 0; S.on = (t, x, y, c, d, e) => { if (t === 'boom' && e === 0) { all++; if (x < S.st[0].x1 + 2) own++; } };
  simFire(0); let k = 0; while (!(S.phase === 'aim' && S.turn === 0) && S.state === 'play' && k++ < 3000) { if (S.phase === 'aim' && S.turn === 1) S.wind = wind; simStep(1 / 60); }
  console.log(`L${li + 1} wind ${wind}, I fire at ${Math.round(ang * 57.3)}° power ${pw}: ${own} of my ${all} explosions were on my own castle; my structure ${Math.round(s0 * 100)}% → ${Math.round(structBar(0) * 100)}%, my units' hp ${hp0.toFixed(0)} → ${S.team[0].units.reduce((s, u) => s + Math.max(0, u.hp), 0).toFixed(0)}, units alive ${S.team[0].alive}/${S.team[0].units.length}`);
}
