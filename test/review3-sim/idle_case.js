// node test/review3-sim/idle_case.js <關卡 1-6> <seed> <第幾回合> [bot=casual] [等幾秒=30]
// 重播 idle.js 的某一場，到指定回合輪到我方瞄準時停下來等，印出還醒著的東西：位置、角度、速度、跟誰接觸、互相陷進去多深
const L = require('./lib'); const G = L.load();
const { S, SH, PH, PL, simInit, simStep, LEVELS, BOTS } = G;
const li = +process.argv[2] - 1, seed = +process.argv[3], R = +process.argv[4], bot = process.argv[5] || 'casual', TMAX = +(process.argv[6] || 30);
simInit(li, {}, seed, 1, { botA: BOTS[bot] });
const nm = (u) => !u ? 'ground' : u.isBlock ? `#${u.id}${u.frag ? ' frag' : u.kind === 'ball' ? ' ball' : u.prop ? ' prop' : u.seg ? ' seg' : ''} m${u.mat} s${u.side}${u.frag ? '' : ' ' + u.cw + 'x' + u.ch + ' c(' + u.cx + ',' + u.cy + ')'}` : `unit ${u.type}#${u.slot} s${u.side}`;
function awakeList() { const out = []; for (let b = PH.world.getBodyList(); b; b = b.getNext()) { if (!b.isDynamic() || !b.isAwake()) continue; const p = b.getPosition(); if (p.x < -11 || p.x > 123 || p.y < -10) continue; out.push(b); } return out; }
function dump(t) {
  const aw = awakeList(); console.log(`--- +${t.toFixed(2)}s: ${aw.length} awake`);
  for (const b of aw) {
    const u = b.getUserData(), p = b.getPosition(), v = b.getLinearVelocity(), cs = [];
    for (let ce = b.getContactList(); ce; ce = ce.next) { const c = ce.contact; if (!c.isTouching()) continue; const wm = c.getWorldManifold(null); let sep = ''; if (wm && wm.separations) sep = ' sep=' + wm.separations.slice(0, c.getManifold().pointCount).map((x) => x.toFixed(3)).join('/'); cs.push(nm(ce.other.getUserData()) + sep); }
    console.log(`   ${nm(u)} @(${p.x.toFixed(2)},${p.y.toFixed(2)}) a=${b.getAngle().toFixed(3)} v=(${v.x.toFixed(2)},${v.y.toFixed(2)}) w=${b.getAngularVelocity().toFixed(2)} mass=${b.getMass().toFixed(1)}  touching: ${cs.join(' ; ') || '-'}`);
  }
}
let prev = '';
while (S.state === 'play' && S.round < 40) {
  simStep(1 / 60);
  const key = S.phase + S.turn + S.round;
  if (key !== prev) {
    prev = key;
    if (S.phase === 'aim' && S.turn === 0) {
      const T = S.team[0], ai = T.ai; T.ai = null; let t = 0, slept = -1;
      const show = S.round === R;
      // FIX=damp：從這裡開始試一個修法 —— 動得很慢的磚（不管還在不在原位）加阻尼，看它停不停得下來
      if (show && process.env.FIX === 'damp') G.__eval('physStep = (function (o) { return function (dt) { o(dt); for (const b of S.blocks) { if (b.dead || b.kind === "ball" || !b.body.isAwake()) continue; const v = b.body.getLinearVelocity(), om = b.body.getAngularVelocity(); const slow = v.x * v.x + v.y * v.y < 1.4 && Math.abs(om) < 0.35; if (slow !== !!b.slowD) { b.slowD = slow; b.body.setLinearDamping(slow ? 2.5 : 0); b.body.setAngularDamping(slow ? 5 : b.frag ? 0.3 : 0.08); } } }; })(physStep)');
      while (t < TMAX && S.state === 'play') {
        const aw = awakeList(); if (!aw.length) { slept = t; break; }
        if (show && (Math.abs(t - 10) < 1e-6 || Math.abs(t - 10.5) < 1e-6 || Math.abs(t - 20) < 1e-6)) dump(t);
        simStep(1 / 60); t = Math.round((t + 1 / 60) * 60) / 60;
      }
      if (show) { console.log(slept < 0 ? `still awake after ${TMAX}s` : `asleep after ${slept.toFixed(2)}s`); process.exit(0); }
      T.ai = ai; if (ai) ai.st = 0; prev = S.phase + S.turn + S.round;
    }
  }
}
console.log('game ended before that round:', S.state, S.round);
