// node test/review4-sim/revive_rand.js <關卡 1-6> [次數=200] [哪一邊=1]
// 援軍的落點：先把那座城隨機炸爛（5～45 發重砲彈），等它靜下來，隨機弄死一個兵，再放一個援軍（grantBonus troop），之後 5 秒不做任何事。
// 統計：落點離原位多遠、是不是在深淵上方、一出現就跟磚或別的兵疊在一起、5 秒內死了沒有（怎麼死的）、摔了多高
const L = require('./lib4'); const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, physExplode, killUnit, grantBonus, groundY, WPN } = G;
const li = +(process.argv[2] || 5) - 1, N = +(process.argv[3] || 200), side = +(process.argv[4] === undefined ? 1 : process.argv[4]);
let rs = 12345; const R = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
const out = { n: 0, home: 0, onUnit: 0, overVoid: 0, died: 0, fell: 0, deepBlock: 0, noDead: 0 }, causes = {}, ex = [];
const step = (n) => { for (let i = 0; i < n; i++) { S.phaseT = 0; simStep(1 / 60); } };
for (let k = 0; k < N; k++) {
  simInit(li, {}, 1000 + k, 1, {}); const st = S.st[side], T = S.team[side];
  const shots = 5 + (R() * 40 | 0);
  for (let i = 0; i < shots; i++) { physExplode(st.x0 + R() * st.w, st.y0 + R() * (st.h + 2), R() < 0.3 ? WPN.bomb : R() < 0.5 ? WPN.rocket : WPN.keg, 2, 0.6 + R() * 1.5, 0, null, R() - 0.5, -1); if (R() < 0.3) step(20); }
  step(360);
  if (S.state !== 'play') { out.noDead++; continue; }
  let alive = T.units.filter((u) => u.alive && !u.def.big);
  if (alive.length === T.units.filter((u) => !u.def.big).length) { if (!alive.length) continue; killUnit(alive[(R() * alive.length) | 0], 2, 0); }
  if (S.state !== 'play') { out.noDead++; continue; }
  step(60);
  if (S.state !== 'play') { out.noDead++; continue; }
  const u = T.units.find((q) => !q.alive); if (!u) continue;
  let dcause = '';
  H.kill = (q, sd, how, ctx) => { if (q === u && !dcause) dcause = ctx + '/how' + how; };
  grantBonus(side, 'troop', 0, 0);
  if (!u.alive) continue;
  out.n++;
  const x0 = u.x, y0 = u.y, moved = Math.hypot(x0 - u.hx, y0 - u.hy); if (moved < 1) out.home++;
  const voidUnder = groundY(x0) < -100; if (voidUnder) out.overVoid++;
  let partner = null; for (const o of S.units) if (o !== u && o.alive && Math.abs(o.x - x0) < (o.bw + u.bw) / 2 - 0.4 && Math.abs(o.y - y0) < (o.bh + u.bh) / 2 - 0.4) partner = o;
  if (partner) out.onUnit++;
  step(1);
  let deep = 0, who = ''; if (u.alive) for (let ce = u.body.getContactList(); ce; ce = ce.next) { const c = ce.contact; if (!c.isTouching()) continue; const o = ce.other.getUserData(); if (!o || !o.isBlock) continue; const wm = c.getWorldManifold(null); if (!wm) continue; for (let j = 0; j < wm.pointCount; j++) if (-wm.separations[j] > deep) { deep = -wm.separations[j]; who = L.bdesc(o); } }
  if (deep > 0.5) out.deepBlock++;
  let minY = y0; for (let i = 0; i < 300 && u.alive; i++) { S.phaseT = 0; simStep(1 / 60); if (u.y < minY) minY = u.y; }
  const fell = y0 - minY; if (fell > 3) out.fell++;
  if (!u.alive) { out.died++; causes[dcause] = (causes[dcause] || 0) + 1; }
  if ((!u.alive || partner || deep > 0.5 || voidUnder) && ex.length < 14) ex.push(`#${k} ${u.type}#${u.slot} home (${u.hx.toFixed(1)},${u.hy.toFixed(1)}) placed (${x0.toFixed(1)},${y0.toFixed(1)})${voidUnder ? ' OVER THE VOID' : ''}${partner ? ' inside ' + partner.type + '#' + partner.slot : ''}${deep > 0.5 ? ' ' + deep.toFixed(2) + ' deep in ' + who : ''}; fell ${fell.toFixed(1)}; ${u.alive ? 'alive after 5 s' : 'DIED ' + dcause}`);
}
console.log(`L${li + 1} side${side}: ${out.n} revivals (${out.noDead} trials skipped: game already decided). At the home slot: ${out.home}; over the void: ${out.overVoid}; on/inside another unit: ${out.onUnit}; >0.5 deep in a block: ${out.deepBlock}; dropped >3 m: ${out.fell}; DIED within 5 s with nobody firing: ${out.died} ${JSON.stringify(causes)}`);
for (const e of ex) console.log('   ' + e);
