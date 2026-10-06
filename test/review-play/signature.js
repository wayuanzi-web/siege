// node test/review-play/signature.js [bot=casual] [場數=30] [關卡,…]
// 兩件事，各關放在一起比：
// (一) 城是怎麼垮的：敵城每一塊磚（不算小道具、不算城基以外另計）離開原位的那一刻是「原地被炸掉」還是「被推走／失去支撐掉下去」；
//      被推走的後來怎麼了（撞碎、又被炸掉、掉出戰場、留在場上當瓦礫）；活著的時候橫向滑了多遠（滑動）；一輪裡連鎖垮了幾塊。
// (二) 玩家這一輪到底在做什麼決定：自動玩家每一輪的仰角、力道、穿過幾道符（倍數）、落點在敵城的上中下哪一段、瞄的是什麼。
const G = require('./lib')();
const { S, SH, HOOK, simInit, simStep, LEVELS, BOTS, CS, MAT } = G;
const botName = process.argv[2] || 'casual', N = +(process.argv[3] || 30);
const only = process.argv[4] ? process.argv[4].split(',').map((x) => +x - 1) : LEVELS.map((_, i) => i);
const pc = (a, b) => (b ? (a / b * 100).toFixed(0) : '0') + '%';
for (const li of only) {
  const C = { blocks: 0, inPlaceKill: 0, displaced: 0, never: 0, dispFate: { crushed: 0, blasted: 0, burned: 0, offworld: 0, rubble: 0, finale: 0 }, slide: [], fallH: [], chainTurns: 0, turns: 0, chainSum: 0, chainMax: 0, firstTurnLoss: [], byMat: {}, upperLeftAtEnd: [], roundsToHalf: [], baseKilled: 0, base: 0 };
  const A = { n: 0, ang: [], pow: [], mult: {}, zone: { top: 0, mid: 0, low: 0, miss: 0, blocked: 0, flyer: 0 }, target: {}, angByRound: [] };
  let rounds = 0, games = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 2024 + sd * 7919 + li * 131, 1, { botA: BOTS[botName] }); games++;
    const st = S.st[1], info = new Map();
    for (const b of st.blocks) if (!b.prop && b.mat !== G.M_KEG) info.set(b, { left: 0, how: '', x0: b.x0, y0: b.y0, maxDx: 0, minY: b.y0, base: b.cy < st.base, mat: MAT[b.mat].k });
    let over = false, half = 0, hp1 = -1;
    HOOK.blockKill = (b, side, kind, clean, wasInPlace) => {
      const r = info.get(b); if (!r) return;
      if (over || kind === 99) { if (!r.left) r.how = 'finale'; else if (!r.fate) r.fate = 'finale'; return; }
      if (!r.left) { r.left = S.round; r.how = wasInPlace ? (kind === G.K_CRUSH ? 'crushed-in-place' : kind === G.K_FIRE ? 'burned-in-place' : 'blasted-in-place') : 'displaced'; if (r.how !== 'displaced') return; }
      if (!r.fate) r.fate = kind === G.K_CRUSH ? (clean ? 'offworld' : 'crushed') : kind === G.K_FIRE ? 'burned' : 'blasted';
    };
    S.on = (t, a, b) => { if (t === 'chain') { C.chainTurns++; C.chainSum += a; if (a > C.chainMax) C.chainMax = a; } if (t === 'volley') C.turns++; if (t === 'end') over = true; };
    let prevPhase = '';
    while (S.state === 'play' && S.round < 40) {
      const ph0 = S.phase, t0 = S.turn;
      simStep(1 / 60);
      if ((S.frame & 3) === 0) for (const [b, r] of info) {
        if (b.dead) continue; const p = b.body.getPosition();
        if (!r.left && !b.inPlace) { r.left = S.round; r.how = 'displaced'; }
        const dx = Math.abs(p.x - r.x0); if (dx > r.maxDx) r.maxDx = dx; if (p.y < r.minY) r.minY = p.y;
      }
      // 我方開火的那一刻：記下這一輪的打法
      if (ph0 === 'aim' && t0 === 0 && S.phase !== 'aim') {
        const T = S.team[0], ai = T.ai, vx = T.aim[0], vy = T.aim[1];
        A.n++; A.ang.push(Math.atan2(vy, vx) * 180 / Math.PI); A.pow.push((Math.hypot(vx, vy) - G.VMIN) / (G.VMAX - G.VMIN) * 100);
        const R = G.simTrace(0, ai.mx, ai.my, vx, vy, S.wind, S.time);
        const m = R.mult; A.mult[m] = (A.mult[m] || 0) + 1;
        if (R.hit === 5) A.zone.blocked++; else if (R.hit === 4) A.zone.flyer++; else if ((R.hit === 2 || R.hit === 3) && R.x > st.x0 - 2 && R.x < st.x1 + 2) { const f = (R.y - st.y0) / st.h; A.zone[R.port ? 'top' : f > 0.62 ? 'top' : f > 0.33 ? 'mid' : 'low']++; } else A.zone.miss++;
        const b = ai.best; let tg = 'fallback';
        if (b && b.t) { const t = b.t; tg = t.obj ? t.obj.t : t.hg ? 'red-gate' : S.team[1].units.some((u) => u.alive && Math.abs(t.x - u.x) < 0.7 && Math.abs(t.y - (u.y + 1.6)) < 0.7) ? 'soldier' : t.w > 1.3 ? 'keg' : 'block'; }
        A.target[tg] = (A.target[tg] || 0) + 1;
        (A.angByRound[S.round - 1] = A.angByRound[S.round - 1] || []).push(Math.atan2(vy, vx) * 180 / Math.PI);
      }
      if (S.round === 2 && hp1 < 0 && S.phase === 'aim' && S.turn === 0) hp1 = st.hpNow / st.hp0;
      if (!half && st.hpNow / st.hp0 < 0.5) half = S.round;
    }
    rounds += S.round; if (hp1 >= 0) C.firstTurnLoss.push(1 - hp1); C.roundsToHalf.push(half || 99);
    // 結算每一塊
    let upper = 0, upperLeft = 0;
    for (const [b, r] of info) {
      if (r.base) { C.base++; if (r.left && r.how !== 'finale') C.baseKilled++; continue; }
      C.blocks++; upper++;
      (C.byMat[r.mat] = C.byMat[r.mat] || { n: 0, inplace: 0, disp: 0 }).n++;
      if (!r.left || r.how === 'finale') { C.never++; upperLeft++; continue; }
      if (r.how !== 'displaced') { C.inPlaceKill++; C.byMat[r.mat].inplace++; continue; }
      C.displaced++; C.byMat[r.mat].disp++; C.slide.push(r.maxDx); C.fallH.push(r.y0 - r.minY);
      const fate = r.fate || (b.dead ? 'offworld' : 'rubble'); C.dispFate[fate] = (C.dispFate[fate] || 0) + 1;
    }
    C.upperLeftAtEnd.push(upperLeft / upper);
  }
  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * f))] : 0; };
  console.log(`\n== L${li + 1} ${LEVELS[li].name} [${botName}, ${games} games, ${(rounds / games).toFixed(1)} rounds]`);
  console.log(`  HOW IT BREAKS (enemy castle above the base, ${(C.blocks / games).toFixed(0)} blocks): destroyed where it stood ${pc(C.inPlaceKill, C.blocks)}; pushed/fell out of place first ${pc(C.displaced, C.blocks)}; still standing at the end ${pc(C.never, C.blocks)}`);
  console.log(`     of the ones that moved: smashed on landing/impact ${pc(C.dispFate.crushed, C.displaced)}, blasted later ${pc(C.dispFate.blasted, C.displaced)}, left the field ${pc(C.dispFate.offworld, C.displaced)}, burned ${pc(C.dispFate.burned, C.displaced)}, stayed as rubble ${pc(C.dispFate.rubble + C.dispFate.finale, C.displaced)}`);
  console.log(`     sideways travel of moved blocks: median ${med(C.slide).toFixed(1)}, 75th pct ${q(C.slide, 0.75).toFixed(1)}; slid > 2 cells ${pc(C.slide.filter((d) => d > 2 * CS).length, C.slide.length)}; dropped: median ${med(C.fallH).toFixed(1)}`);
  console.log(`     chains ≥6 in ${pc(C.chainTurns, C.turns)} of volleys (avg ${(C.chainSum / (C.chainTurns || 1)).toFixed(1)}, max ${C.chainMax}); structure lost in MY FIRST volley: avg ${(avg(C.firstTurnLoss) * 100).toFixed(0)}%; round when structure drops below half: median ${med(C.roundsToHalf)}; base blocks destroyed before the end ${pc(C.baseKilled, C.base)}; upper blocks still in place when it ends ${(avg(C.upperLeftAtEnd) * 100).toFixed(0)}%`);
  console.log(`     by material: ${Object.entries(C.byMat).map(([k, v]) => `${k} ${v.n / games | 0}: in-place ${pc(v.inplace, v.n)} moved ${pc(v.disp, v.n)}`).join(' | ')}`);
  const hist = (a, lo, hi, step) => { const o = []; for (let x = lo; x < hi; x += step) o.push(`${x}-${x + step}: ${pc(a.filter((v) => v >= x && v < x + step).length, a.length)}`); return o.join(' '); };
  console.log(`  WHAT I DO (${A.n} volleys): angle avg ${avg(A.ang).toFixed(0)}° [${hist(A.ang, 0, 90, 15)}]; power avg ${avg(A.pow).toFixed(0)}`);
  console.log(`     multiplier of the lead shot: ${Object.entries(A.mult).sort((a, b) => b[1] - a[1]).map(([k, v]) => `×${k} ${pc(v, A.n)}`).join(', ')}`);
  console.log(`     lead shot lands: top ${pc(A.zone.top, A.n)}, middle ${pc(A.zone.mid, A.n)}, low ${pc(A.zone.low, A.n)}, misses the castle ${pc(A.zone.miss, A.n)}, blocked (gate/mirror/barrier/shield) ${pc(A.zone.blocked, A.n)}, at balloon/orb/lantern ${pc(A.zone.flyer, A.n)}; aimed at: ${Object.entries(A.target).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pc(v, A.n)}`).join(', ')}`);
}
