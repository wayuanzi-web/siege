// node test/review4-sim/load_case.js <關卡 1-6> <bot> <seed> [難度=1] [只看哪一邊=-1 都看] [強化=0]
// 重播一場，每次有兵因為「被壓住」（load）扣血，就列出當時碰著他的所有東西：是什麼、碰在身上哪裡、往哪個方向推、推多大（幾倍體重）
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, BOTS, GRAV, CRUSH_LOAD } = G;
const li = +(process.argv[2] || 1) - 1, bot = process.argv[3] || 'casual', seed = +(process.argv[4] || 1), diff = +(process.argv[5] === undefined ? 1 : process.argv[5]), only = +(process.argv[6] === undefined ? -1 : process.argv[6]), upl = +(process.argv[7] || 0);
const up = upl ? { dmg: upl, aim: upl, hp: upl, shield: upl, ult: upl } : {};
function contacts(u) {
  const out = [], p = u.body.getPosition();
  for (let ce = u.body.getContactList(); ce; ce = ce.next) {
    const c = ce.contact; if (!c.isTouching()) continue;
    const o = ce.other.getUserData(), m = c.getManifold(), wm = c.getWorldManifold(null); if (!wm) continue;
    let J = 0; for (let k = 0; k < m.pointCount; k++) J += m.points[k].normalImpulse;
    // 法線由 A 指向 B：換成「推在這個兵身上的方向」
    const isA = c.getFixtureA().getBody() === u.body, nx = isA ? -wm.normal.x : wm.normal.x, ny = isA ? -wm.normal.y : wm.normal.y;
    out.push({ who: !o ? 'ground' : o.isUnit ? 'unit:' + o.type + '.M' + o.mass.toFixed(0) : L.bdesc(o), dx: wm.points[0].x - p.x, dy: wm.points[0].y - p.y, nx, ny, w: J / (GRAV / 60 * u.mass), counted: !!o && wm.points[0].y > p.y + u.bh * 0.2 });
  }
  return out;
}
simInit(li, up, seed, diff, { botA: BOTS[bot] });
const seen = new Map(); let n = 0; const dmg = new Map();
H.hurt = (u, d, side, kind, ctx) => {
  if (ctx !== 'load' || (only >= 0 && u.side !== only)) return;
  dmg.set(u, (dmg.get(u) || 0) + d);
  const last = seen.get(u) || -9; seen.set(u, S.time);
  if (S.time - last < 0.5) return;
  n++;
  const cs = contacts(u);
  console.log(`t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn} side${u.side} ${u.type} slot${u.slot} @(${u.x.toFixed(1)},${u.y.toFixed(1)}) hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)} awake=${u.body.isAwake()}`);
  for (const c of cs) console.log(`      ${c.counted ? '*' : ' '} ${c.who.padEnd(22)} at (${c.dx.toFixed(2)},${c.dy.toFixed(2)}) from centre, pushes (${c.nx.toFixed(2)},${c.ny.toFixed(2)}) with ${c.w.toFixed(2)}x weight`);
};
H.kill = (u, side, how, ctx) => { if (only >= 0 && u.side !== only) return; console.log(`   -> t=${S.time.toFixed(2)} side${u.side} ${u.type} slot${u.slot} died: how=${how} ctx=${ctx}${dmg.get(u) ? ' (took ' + dmg.get(u).toFixed(0) + ' load damage in all)' : ''}`); };
while (S.state === 'play' && S.round < 40) simStep(1 / 60);
console.log(`result ${S.state} at t=${S.time.toFixed(1)} round ${S.round}; ${n} load episodes printed ('*' = contact counted as load: above 0.2 body-heights over the centre)`);
