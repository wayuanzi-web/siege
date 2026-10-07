// node test/review2-sim/a_tmo_what.js <關卡> <場數> [bot=casual]
// A6：等塵埃落定等到 9 秒上限（S.phaseT > 9）被強制結束的那一刻，到底是什麼東西還在動？
const { load, H } = require('./lib');
const G = load(); const { S, SH, PH, simInit, simStep, BOTS, MAT, VIEW_W, GUT } = G;
const li = +process.argv[2] - 1, N = +(process.argv[3] || 16), bot = process.argv[4] || 'casual';
const what = {}; let n = 0, vols = 0; const ex = [];
for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, H.seed(9000, sd, li), 1, { botA: BOTS[bot] });
  S.on = (t) => { if (t === 'volley') vols++; };
  while (S.state === 'play' && S.round < 40) {
    const ph = S.phase, pT = S.phaseT, q = S.quietT;
    if ((ph === 'resolve' || ph === 'hazard') && pT + 1 / 60 > 9 && q + 1 / 60 < 0.45) {
      // 下一步就會被強制結束：列出還在動的東西
      n++; const movers = [];
      for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
        if (!b.isDynamic() || !b.isAwake()) continue; const p = b.getPosition(); if (p.x < -GUT - 2 || p.x > VIEW_W + GUT + 2 || p.y < -10) continue;
        const v = b.getLinearVelocity(), sp = Math.hypot(v.x, v.y), om = Math.abs(b.getAngularVelocity()); if (sp * sp <= 3.2 && om <= 0.7) continue;
        const o = b.getUserData(); const kind = !o ? 'ground?' : o.isBlock ? (o.kind === 'ball' ? (o.st.loose ? 'fallen rock (ball)' : MAT[o.mat].k + ' ball prop') : o.frag ? MAT[o.mat].k + ' fragment' : MAT[o.mat].k + (o.prop ? ' prop' : ' block') + (o.side === 2 ? ' (neutral wall)' : '')) : 'unit';
        movers.push({ kind, sp, om, x: p.x, y: p.y });
      }
      const key = movers.length ? [...new Set(movers.map((m) => m.kind))].sort().join(' + ') : (SH.n ? 'shots in the air' : 'nothing over the threshold (just short of 0.45s quiet)');
      what[key] = (what[key] || 0) + 1;
      if (ex.length < 6) ex.push(`sd ${sd} r${S.round} ${ph} after side ${S.turn}: ` + (movers.slice(0, 3).map((m) => `${m.kind} at (${m.x.toFixed(0)},${m.y.toFixed(0)}) speed ${m.sp.toFixed(1)} spin ${m.om.toFixed(1)}`).join('; ') || key));
    }
    simStep(1 / 60);
  }
}
console.log(`L${li + 1} ${N} ${bot} games, ${vols} volleys: ${n} phases cut off at the 9-second limit`);
for (const k of Object.keys(what).sort((a, b) => what[b] - what[a])) console.log(`   ${what[k]}×  still moving: ${k}`);
for (const e of ex) console.log('     ' + e);
