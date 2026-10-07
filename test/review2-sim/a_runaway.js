// node test/review2-sim/a_runaway.js [場數=8] [bot=expert]
// A6：有沒有東西越跑越快、飛出世界、變成 NaN？每一步看所有剛體的速度、角速度、位置。
const { load, H } = require('./lib');
const G = load(); const { S, PH, simInit, simStep, BOTS, MAT } = G;
const N = +(process.argv[2] || 8), bot = process.argv[3] || 'expert';
for (let li = 0; li < 6; li++) {
  let maxV = 0, maxW = 0, over60 = 0, over100 = 0, steps = 0, far = 0, maxUnitV = 0, bodiesMax = 0; let what = '', whatW = '';
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, H.seed(9000, sd, li), 1, { botA: BOTS[bot] });
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60); steps++; let nb = 0;
      for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
        if (!b.isDynamic()) continue; nb++; const v = b.getLinearVelocity(), sp = Math.hypot(v.x, v.y), w = Math.abs(b.getAngularVelocity()), p = b.getPosition(), o = b.getUserData();
        if (!(sp === sp) || !(p.x === p.x)) { console.log('NaN body!'); continue; }
        if (o && !o.isBlock) { if (sp > maxUnitV) maxUnitV = sp; }
        if (sp > maxV) { maxV = sp; what = o ? (o.isBlock ? MAT[o.mat].k + (o.frag ? ' fragment' : o.prop ? ' prop' : ' block') + ' mass ' + o.mass.toFixed(1) : 'unit ' + o.type) : '?'; }
        if (w > maxW) { maxW = w; whatW = o && o.isBlock ? MAT[o.mat].k + (o.frag ? ' fragment' : o.prop ? ' prop' : ' block') + ' ' + o.w.toFixed(1) + 'x' + o.h.toFixed(1) : 'unit'; }
        if (sp > 60) over60++; if (sp > 100) over100++;
        if (p.x < -40 || p.x > 152 || p.y > 140 || p.y < -60) far++;
      }
      if (nb > bodiesMax) bodiesMax = nb;
    }
  }
  console.log(`L${li + 1} ${N} ${bot} games, ${steps} steps: fastest body ${maxV.toFixed(0)} u/s (${what}); body-steps above 60 u/s: ${over60}, above 100: ${over100}; fastest unit ${maxUnitV.toFixed(0)} u/s; fastest spin ${maxW.toFixed(0)} rad/s (${whatW}); body-steps far outside the field: ${far}; most bodies at once ${bodiesMax}`);
}
