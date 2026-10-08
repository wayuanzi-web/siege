// node test/review5-sim/replay5.js <關卡> <bot> <seed> <t0> <t1> <side> <slot> [每幾格印一次=6] [難度=1]
// 重播普查裡的某一場（同樣的種子），在 t0..t1 之間把某一個兵的狀態印出來：位置、速度、血、load/loadT、edge/edgeT、sepT、醒著沒、頭上和碰到的磚
const L = require('./lib5'); const H = {}; const G = L.load('', H);
const { S, PH, simInit, simStep, BOTS } = G;
const li = +process.argv[2] - 1, bot = process.argv[3], seed = +process.argv[4], t0 = +process.argv[5], t1 = +process.argv[6], side = +process.argv[7], slot = +process.argv[8], every = +(process.argv[9] || 6), diff = +(process.argv[10] === undefined ? 1 : process.argv[10]);
simInit(li, {}, seed, diff, { botA: BOTS[bot] });
let u = null; for (const k of S.team[side].units) if (k.slot === slot) u = k;
const evs = [];
S.on = (t, a, b, c, d, e) => { if (S.time >= t0 - 0.02 && S.time <= t1 && /^(turn|volley|revive|udie|end|round|rumble|bossback|phase)$/.test(t)) evs.push(`   [${S.time.toFixed(2)}] ev ${t} ${[a, b, c, d, e].filter((x) => x !== undefined).map((x) => (typeof x === 'number' ? +x.toFixed(1) : x)).join(',')}`); };
H.hurt = (k, d, sd, kind, ctx) => { if (k === u && S.time >= t0 && S.time <= t1) evs.push(`   [${S.time.toFixed(2)}] hurt ${d.toFixed(1)} by ${ctx}`); };
H.kill = (k, sd, how, ctx) => { if (k === u) evs.push(`   [${S.time.toFixed(2)}] KILLED by ${ctx} (how ${how})`); };
H.edgeSet = (k, e) => { if (k === u && S.time >= t0 && S.time <= t1) evs.push(`   [${S.time.toFixed(2)}] edge -> ${e}`); };
H.turnEnd = (q, pt) => { if (S.time >= t0 && S.time <= t1) evs.push(`   [${S.time.toFixed(2)}] turn ends: ${q ? 'settled' : 'CAP'} after ${pt.toFixed(2)}s`); };
const touching = () => { const out = []; if (!u.body) return ''; for (let ce = u.body.getContactList(); ce; ce = ce.next) { const c = ce.contact; if (!c.isTouching()) continue; const o = ce.other.getUserData(), wm = c.getWorldManifold(null); const ny = wm ? (c.getFixtureA().getBody() === u.body ? wm.normal.y : -wm.normal.y) : 0; let J = 0; const m = c.getManifold(); for (let k = 0; k < m.pointCount; k++) J += m.points[k].normalImpulse; out.push((o ? (o.isUnit ? 'unit' : L.bdesc(o) + (o.inPlace ? '*' : '') + (ce.other.isAwake() ? '' : 'z')) : 'ground') + `[ny=${ny.toFixed(2)},${(J / (G.GRAV / 60 * u.mass)).toFixed(2)}x]`); } return out.join(' '); };
let n = 0;
while (S.time < t1 && (S.state === 'play' || S.endT < 6)) {
  simStep(1 / 60); n++;
  if (S.time < t0) continue;
  for (const e of evs) console.log(e); evs.length = 0;
  if (n % every === 0 && u.alive) { const v = u.body.getLinearVelocity(); console.log(`t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn} pT=${S.phaseT.toFixed(2)} qT=${S.quietT.toFixed(2)} | (${u.x.toFixed(2)},${u.y.toFixed(2)}) v=(${v.x.toFixed(2)},${v.y.toFixed(2)}) hp=${u.hp.toFixed(0)} load=${(u.load || 0).toFixed(2)} loadT=${(u.loadT || 0).toFixed(2)} edge=${u.edge}/${(u.edgeT || 0).toFixed(2)} sepT=${(u.sepT || 0).toFixed(2)} ${u.body.isAwake() ? 'awake' : 'asleep'} air=${u.air} | ${touching()}`); }
}
for (const e of evs) console.log(e);
console.log(`end: state=${S.state} round=${S.round} t=${S.time.toFixed(2)} unit alive=${u.alive}`);
