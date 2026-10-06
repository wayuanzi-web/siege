// node test/review-play/pace.js [bot=casual] [場數=20]
// 每一輪砲擊之後「等塵埃落定」等了多久，其中有多少時間畫面上（844x390：x -15.4…127.4）其實已經沒有東西在動，
// 只是在等畫面外的碎塊、滾遠的石頭、飛出去的流彈。
const G = require('./lib')();
const { S, SH, PH, simInit, simStep, LEVELS, BOTS, flyersBusy } = G;
const botName = process.argv[2] || 'casual', N = +(process.argv[3] || 20);
const X0 = -15.4, X1 = 127.4, YTOP = 57;
for (let li = 0; li < LEVELS.length; li++) {
  let n = 0, tot = 0, dead = 0, deadMax = 0, cap = 0, why = { 'off-screen debris': 0, 'off-screen shots': 0, 'fire burning': 0, 'slow on-screen creep': 0 }, rounds = 0, time = 0, aimT = 0, volT = 0, long5 = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 99 + sd * 7919 + li * 131, 1, { botA: BOTS[botName] });
    let ph = '', t0 = 0, lastVis = 0, lastWhy = '';
    while (S.state === 'play' && S.round < 40) {
      const p0 = S.phase, pT = S.phaseT;
      simStep(1 / 60);
      if (S.phase === 'aim') aimT += 1 / 60; else if (S.phase === 'volley') volT += 1 / 60;
      if (S.phase === 'resolve' || S.phase === 'hazard') {
        if (p0 !== S.phase) { lastVis = 0; }
        // 畫面上還有東西在動嗎
        let vis = false, offDebris = false, creep = false;
        for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
          if (!b.isDynamic() || !b.isAwake()) continue;
          const v = b.getLinearVelocity(), sp2 = v.x * v.x + v.y * v.y, w = Math.abs(b.getAngularVelocity()), p = b.getPosition();
          if (sp2 <= 3.2 && w <= 0.7) continue;                      // 這個不擋回合
          const on = p.x > X0 && p.x < X1 && p.y > -9 && p.y < YTOP;
          if (on) { if (sp2 > 16 || w > 1.5) vis = true; else creep = true; } else offDebris = true;
        }
        let shotsOn = false, shotsOff = false;
        for (let i = 0; i < SH.n; i++) { const on = SH.x[i] > X0 && SH.x[i] < X1 && SH.y[i] < YTOP; if (on) shotsOn = true; else shotsOff = true; }
        if (vis || shotsOn || flyersBusy() || S.pend.length) lastVis = S.phaseT;
        lastWhy = shotsOff && !shotsOn ? 'off-screen shots' : offDebris ? 'off-screen debris' : S.nburn > 0 ? 'fire burning' : creep ? 'slow on-screen creep' : lastWhy;
        S._why = lastWhy; S._lastVis = lastVis;
      }
      if ((p0 === 'resolve' || p0 === 'hazard') && S.phase !== p0) {
        n++; tot += pT; const d = Math.max(0, pT - (S._lastVis || 0) - 0.45); dead += d; if (d > deadMax) deadMax = d; if (pT > 8.9) cap++; if (d > 1.5) { why[S._why || 'slow on-screen creep'] = (why[S._why || 'slow on-screen creep'] || 0) + 1; long5++; }
      }
    }
    rounds += S.round; time += S.time;
  }
  console.log(`L${li + 1} ${LEVELS[li].name}: ${(time / rounds).toFixed(1)}s per round (aiming ${(aimT / rounds).toFixed(1)}s, firing ${(volT / rounds).toFixed(1)}s, settling ${(tot / rounds).toFixed(1)}s) | per settle: ${(tot / n).toFixed(1)}s of which nothing visibly moving ${(dead / n).toFixed(1)}s (worst ${deadMax.toFixed(1)}s); dead wait >1.5s in ${(long5 / n * 100).toFixed(0)}% of settles, because: ${JSON.stringify(why)}; 9s cap ${cap}/${n}`);
}
