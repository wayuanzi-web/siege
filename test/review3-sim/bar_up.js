// node test/review3-sim/bar_up.js <blast.js rand 的編號 g>：重播那一組連續引爆，印出城樓完整度（structBar）每一次「變高」的時候，是哪幾塊磚從「不在原位」變回「在原位」（或是耐久變多）
const L = require('./lib'); const G = L.load('physQuery, blockDist, F_FIRE');
const { S, PH, simInit, simStep, physExplode, WPN, CS, physQuery, blockDist, structBar } = G;
const g = +process.argv[2], WS = ['bomb', 'doom', 'keg', 'fire', 'ice', 'zap', 'rocket', 'drop'];
let seed = (g * 2654435761 + 12345) >>> 0; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; rnd();
const li = g % 6; simInit(li, {}, 3, 1, null);
const sts = S.structs.filter((s) => !s.loose), st = sts[(rnd() * Math.min(sts.length, 2)) | 0], n = 2 + ((rnd() * 5) | 0), plan = [];
const cx0 = st.x0 + rnd() * st.w, cy0 = st.y0 + rnd() * st.h; let t = 0;
for (let k = 0; k < n; k++) { const w = WS[(rnd() * WS.length) | 0]; plan.push({ t, x: cx0 + (rnd() - 0.5) * 12, y: Math.max(0.5, cy0 + (rnd() - 0.5) * 12), w, side: rnd() < 0.85 ? (st.side === 0 ? 1 : 0) : 2, mass: [0.4, 1, 1, 2.2][(rnd() * 4) | 0], flag: w === 'fire' || rnd() < 0.15 ? G.F_FIRE : 0, direct: rnd() < 0.5 }); t += [0.05, 0.3, 0.8, 1.6, 2.5][(rnd() * 5) | 0]; }
simInit(li, {}, 3, 1, null); S.team[1].ai = null; S.phase = 'resolve'; S.turn = plan[0].side < 2 ? plan[0].side : 0; S.round = 1;
const hitAt = (x, y) => { for (const o of physQuery(x, y, 0.2)) if (o.isBlock && !o.dead && blockDist(o, x, y) <= 1e-6) return o; return null; };
const side = st.side, T = S.st[side]; console.log(`g${g} L${li + 1} castle${side}: ${plan.map((p) => `${p.w}@${p.t.toFixed(2)}(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' ')}   hp0=${T.hp0.toFixed(0)}`);
let pi = 0, prev = structBar(side), was = new Map(); for (const b of T.blocks) was.set(b, { in: b.inPlace, hp: b.hp });
const nm = (b) => `#${b.id} m${b.mat} ${b.seg ? 'seg ' : ''}${b.cw}x${b.ch} c(${b.cx},${b.cy})`;
for (let i = 0; i < (t + 10) * 60; i++) {
  S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0;
  while (pi < plan.length && plan[pi].t <= i / 60 + 1e-9) { const p = plan[pi++]; S.turn = p.side < 2 ? p.side : S.turn; physExplode(p.x, p.y, WPN[p.w], p.side, p.mass || 1, p.flag || 0, p.direct ? hitAt(p.x, p.y) : null, 0, -1); }
  simStep(1 / 60);
  if ((S.frame & 3) !== 0) continue;
  const sb = structBar(side), back = [], born = [];
  for (const b of T.blocks) { if (b.dead || b.frag) continue; const w = was.get(b); if (!w) { if (b.inPlace) born.push(nm(b) + ` new, in place, hp*wt=${(b.hp * b.wt).toFixed(0)}`); } else if (!w.in && b.inPlace) { const p = b.body.getPosition(); back.push(nm(b) + ` back in place (dx=${(p.x - b.x0).toFixed(2)} dy=${(p.y - b.y0).toFixed(2)} a=${b.body.getAngle().toFixed(2)}) hp*wt=${(b.hp * b.wt).toFixed(0)}`); } }
  if (sb > prev + 0.004) console.log(`t=${(i / 60).toFixed(2)} structBar ${prev.toFixed(3)} -> ${sb.toFixed(3)} (hpNow ${T.hpNow.toFixed(0)}): ${back.concat(born).join(' ; ')}`);
  prev = sb; was = new Map(); for (const b of T.blocks) if (!b.dead && !b.frag) was.set(b, { in: b.inPlace, hp: b.hp });
}
