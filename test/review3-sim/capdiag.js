// node test/review3-sim/capdiag.js <soak 的場次編號 g> [只看第幾回合] ：重播 soak.js 的某一場，
// 把撐到 9 秒上限的那一段「等塵埃落定」攤開來看：每 0.5 秒是什麼讓它不算靜止（砲彈、延遲爆炸、飛行物、著火、還在動的東西）
const L = require('./lib'); const G = L.load();
const { S, SH, PH, simInit, simStep, BOTS } = G;
const g = +process.argv[2], onlyR = process.argv[3] ? +process.argv[3] : 0;
const BN = ['newbie', 'casual', 'expert'];
const li = g % 6, bot = BN[(g / 6 | 0) % 3], diff = (g / 18 | 0) % 3, upOn = (g / 54 | 0) % 2, seed = 9176 + g * 100003;
simInit(li, upOn ? L.UPMAX : {}, seed, diff, { botA: BOTS[bot] });
console.log(`g${g} L${li + 1} ${bot} d${diff} up${upOn ? 5 : 0} seed${seed}`);
function desc(u, b) { const p = b.getPosition(), v = b.getLinearVelocity(); return (u.isBlock ? (u.frag ? 'frag' : u.kind === 'ball' ? 'ball' : u.prop ? 'prop' : u.seg ? 'seg' + u.cw : 'blk' + u.cw + 'x' + u.ch) + '.m' + u.mat + '.s' + u.side + '#' + u.id + (u.inPlace ? '*' : '') : 'unit.' + u.type) + `@(${p.x.toFixed(1)},${p.y.toFixed(1)}) v=(${v.x.toFixed(1)},${v.y.toFixed(1)}) w=${b.getAngularVelocity().toFixed(2)}`; }
function snap() {
  const mv = []; let awake = 0;
  for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic() || !b.isAwake()) continue; awake++; const p = b.getPosition(); if (p.x < -11 || p.x > 123 || p.y < -10) continue;
    const v = b.getLinearVelocity(); if (v.x * v.x + v.y * v.y > 3.2 || Math.abs(b.getAngularVelocity()) > 0.7) mv.push(desc(b.getUserData(), b));
  }
  let fly = 0; for (const o of S.objs) if ((o.t === 'balloon' || o.t === 'orb') && (o.st === 'out' || o.st === 'run' || o.st === 'back')) fly++;
  return { awake, mv, sh: SH.n, pend: S.pend.length, fly, nburn: S.nburn };
}
let log = [], pre = '', preT = 0, preQ = 0;
S.on = (t, a, b, c, d, e, f) => { if (t === 'udie') log.push(`   [t=${S.phaseT.toFixed(2)}] udie side${c} ${d}#${f} how${e}`); };
while (S.state === 'play' && S.round < 45) {
  pre = S.phase; preT = S.phaseT; preQ = S.quietT; const r = S.round, turn = S.turn;
  if ((pre === 'resolve' || pre === 'hazard') && (S.frame % 30) === 0) { const s = snap(); log.push(`   [t=${S.phaseT.toFixed(2)} q=${S.quietT.toFixed(2)}] awake ${s.awake} shots ${s.sh} pend ${s.pend} fly ${s.fly} nburn ${s.nburn} movers ${s.mv.length}: ${s.mv.slice(0, 6).join(' ; ')}`); }
  simStep(1 / 60);
  if ((pre === 'resolve' || pre === 'hazard') && S.phase !== pre) {
    if (preT + 1 / 60 > 9 && preQ + 1 / 60 < 0.45 && (!onlyR || onlyR === r)) { console.log(`== r${r} ${pre} (turn ${turn}) hit the 9s cap`); console.log(log.join('\n')); const s = snap(); console.log('   at the cap: movers ' + s.mv.join(' ; ')); }
    log = [];
  } else if (pre !== 'resolve' && pre !== 'hazard') log = log.filter((x) => x.includes('udie') && false);
}
console.log('result', S.state, 'round', S.round);
