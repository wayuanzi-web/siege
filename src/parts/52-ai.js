/* ===== 52-ai: 敵軍怎麼瞄準。測試用的自動玩家也用同一套，只是手多穩、會不會用倍增符不同 ===== */
function aiInit(T, p, D) {
  T.ai = {
    err: (p.err === undefined ? 5 : p.err) * D.aiErr,       // 落點誤差（戰場單位）
    think: p.think || 1.1,                                   // 輪到自己之後想多久才開火
    gate: p.gate === undefined ? 0.6 : p.gate,               // 這一輪會去找倍增符的機率
    hate: p.hate || 0,                                       // 會去打對方倍增符的機率
    skill: p.skill || 0,                                     // 連珠砲集滿之後拿來用的機率
    sh: p.sh || 0,                                           // 對方開火時會開護罩的機率（只有自動玩家有；敵軍不會開罩）
    guard: p.guard === undefined ? 1 : p.guard,              // 會不會打氣球、光球、天燈
    lob: p.lob || 0,                                         // 偏好吊高砲的程度
    warm: p.warm || 1,                                       // 第一回合還在試射：落點誤差是平常的幾倍（第二篇敵軍火力大，開場不能一輪就打倒你的兵）
    sap: p.sap === undefined ? 1 : p.sap,                    // 這一輪會考慮「打牆腳、打柱子」的機率（不然就只瞄兵和火藥桶）
    st: 0, t: 0, fireAt: 0, cand: [], top: [], ci: 0, best: null, bs: 0, px: T.aim[0], py: T.aim[1], lead: null, useGate: true, mult: 1, warn: 1
  };
}
const _av = [0, 0], _gp = [0, 0];
const BOSS_W = 0.9;      // 魔王關：自動玩家特別想打魔王（打倒他才算贏，其他的兵只是順便）
// 從砲口 (mx,my) 出發，tau 秒後要到 (tx,ty)，需要的初速（把風算進去）
function aimFor(mx, my, tx, ty, tau, wind, out) {
  out[0] = (tx - mx - 0.5 * wind * tau * tau) / tau; out[1] = (ty - my + 0.5 * GRAV * tau * tau) / tau; return out;
}
function aimOk(vx, vy, dir) {
  const fx = vx * dir; if (fx <= 0) return false;
  const v = Math.hypot(fx, vy), a = Math.atan2(vy, fx);
  return v >= VMIN && v <= VMAX && a >= ANG_MIN && a <= ANG_MAX;
}
function gatePosAt(g, t, out) {
  const mv = g.move, age = t - g.born; out[0] = g.x; out[1] = g.y;
  if (!mv) return out;
  if (mv.t === 'bob') { out[0] = g.bx; out[1] = g.by + mv.a * tri(age / mv.per + g.ph); }
  else if (mv.t === 'slide') { out[0] = g.bx + mv.a * tri(age / mv.per + g.ph); out[1] = g.by; }
  else if (mv.t === 'orbit') { const a = age / mv.per * TAU + g.ph * TAU; out[0] = g.bx + Math.cos(a) * mv.rx; out[1] = g.by + Math.sin(a) * mv.ry; }
  return out;
}
/* 試射一發（不影響戰局）：t0 是預計開火的時間（會動的符和結界要用那時候的位置）；wi 用哪一種砲彈（滾地、打水漂要看）。
   R.hit: 0 沒中、1 地面（含水面）、2 磚、3 兵、4 氣球／光球／天燈／浮空晶石、5 被擋（對方的符、冰鏡背面、結界、護城罩、黑洞）、6 繩索／鐵鍊（R.rope）；R.port 進了傳送門。
   R.mult：穿過幾倍的符（分成幾發）；R.amp：威力變成幾倍（滾地、打水漂、噴流、彈簧板）；R.fire、R.zap、R.frost：著火、帶電、結霜。
   path：給一個陣列就把每一步的位置記下來（瞄準線照著真的彈道畫：碰到冰鏡、噴流、黑洞會轉彎） */
const _tr = { hit: 0, x: 0, y: 0, t: 0, mult: 1, gm: 0, o: null, obj: null, lan: null, gate: null, port: false, rope: null, amp: 1, fire: false, zap: false, frost: false, roll: false };
function simTrace(side, mx, my, vx, vy, wind, t0, kmax, wi, path) {
  const R = _tr; R.hit = 0; R.mult = 1; R.gm = 0; R.o = null; R.obj = null; R.lan = null; R.gate = null; R.port = false; R.rope = null; R.amp = 1; R.fire = false; R.zap = false; R.frost = false; R.roll = false;
  const dt = 1 / 30, own = S.st[side], foeT = S.team[1 - side], fst = S.st[1 - side], forces = AMP.jets.length || AMP.holes.length;
  // 這裡一步走 1/30 秒，戰局是 1/60 秒；補上兩者每一步差的那一點，落點才會跟真的打出去一樣
  const cy = GRAV * STEP * STEP, cx = -wind * STEP * STEP;
  let x = mx, y = my, mask = 0, t = 0, inOwn = true, mass = 1, flag = F_IN, kk = 0, a0 = 0, a1 = 0, rolling = false;
  if (wi === undefined) wi = 0;
  if (path) path.length = 0;
  const end = (h) => { R.hit = h; R.t = t; R.amp = mass; R.fire = (flag & F_FIRE) !== 0; R.zap = (flag & F_ZAPC) !== 0; R.frost = (flag & F_FROST) !== 0; if (path) path.push(R.x, R.y); return R; };
  const load = () => { SA.x = x; SA.y = y; SA.vx = vx; SA.vy = vy; SA.mass = mass; SA.flag = flag; SA.k = kk; SA.a0 = a0; SA.a1 = a1; SA.side = side; SA.wi = wi; SA.o = null; };
  kmax = kmax || 150;
  for (let k = 0; k < kmax; k++) {
    t += dt;
    if (rolling) {
      // 滾地砲：沿著地面滾（一步拆成兩小步，跟戰局的步長一樣）
      if (foeT.shield.on && inBubble(fst, x, y)) { R.x = x; R.y = y; return end(5); }
      load(); let r = rollMove(dt / 2, true); if (!r) r = rollMove(dt / 2, true);
      x = SA.x; y = SA.y; vx = SA.vx; vy = SA.vy; mass = SA.mass; flag = SA.flag;
      if (r === 1) { R.o = SA.o; R.x = SA.hx; R.y = SA.hy; return end(SA.o ? (SA.o.isBlock ? 2 : SA.o.isUnit ? 3 : 1) : 1); }
      if (r === 2) rolling = false;
      if (path) path.push(x, y);
      continue;
    }
    vy -= GRAV * dt; vx += wind * dt;
    if (forces) { load(); const f = ampForces(dt); if (f === 2) { R.x = x; R.y = y; return end(5); } vx = SA.vx; vy = SA.vy; mass = SA.mass; kk = SA.k; }
    let nx = x + vx * dt + cx, ny = y + vy * dt + cy;
    for (const g of S.gates) {
      if (g.dead || (mask & g.bit)) continue;
      gatePosAt(g, t0 + t, _gp);
      if ((x < _gp[0] - 9 && nx < _gp[0] - 9) || (x > _gp[0] + 9 && nx > _gp[0] + 9)) continue;
      if (segHit(x, y, nx, ny, _gp[0] - g.dx, _gp[1] - g.dy, _gp[0] + g.dx, _gp[1] + g.dy) < 0) continue;
      mask |= g.bit;
      if (g.owner === 3) R.mult *= 0.5;
      else if (g.owner === 2 || g.owner === side) { R.mult *= g.mult; R.gm |= g.bit; }
      else { R.gate = g; R.x = nx; R.y = ny; return end(5); }
    }
    for (const o of S.objs) {
      if (o.t === 'mirror' || o.t === 'spring' || o.t === 'prism' || o.t === 'cloud') {
        load(); SA.nx = nx; SA.ny = ny;
        const r = ampObj(o);
        if (!r) continue;
        if (r === 2) { R.x = SA.hx; R.y = SA.hy; return end(5); }
        if (r === 3) { R.mult *= 3; mass *= Math.pow(3, -SPLIT_P); flag |= F_SPLIT | F_ZAPC; continue; }
        if (r === 4) { flag = SA.flag; continue; }
        x = SA.x; y = SA.y; vx = SA.vx; vy = SA.vy; nx = SA.nx; ny = SA.ny; flag = SA.flag; mass = SA.mass; kk = SA.k;
      } else if (o.t === 'portal') {
        if (o.owner !== side) continue;
        // 傳送門會上下飄：用砲彈飛到那裡時門的位置
        const py = o.mv ? o.by + o.mv.a * tri((t0 + t) / o.mv.per + (o.mv.ph || 0)) : o.y, dx = nx - o.x, dy = ny - py;
        if (dx * dx + dy * dy < o.r * o.r) { R.port = true; R.x = o.ex; R.y = fst.y1; return end(2); }
      } else if (o.t === 'geyser') {
        if (o.on && !(flag & F_FIRE) && Math.abs(nx - o.x) < o.w && ny < o.base + o.hgt && ny > o.base - 2) flag |= F_FIRE;
      } else if (o.t === 'lantern') {
        // 天燈不擋砲彈：打中了照樣往前飛
        if (o.hp > 0 && !R.lan) { const dx = nx - o.x, dy = ny - o.y; if (dx * dx + dy * dy < o.r * o.r) R.lan = o; }
      } else if (o.t === 'balloon' || o.t === 'orb' || o.t === 'tether' || o.t === 'lift') {
        if (o.side === side || o.hp <= 0) continue;
        const dx = nx - o.x, dy = ny - o.y; if (dx * dx + dy * dy < o.r * o.r) { R.obj = o; R.x = nx; R.y = ny; return end(4); }
      } else if (o.t === 'barrier' && side === 0) {
        const d0 = Math.hypot(x - o.x, y - o.y), d1 = Math.hypot(nx - o.x, ny - o.y);
        if (d0 > o.R && d1 <= o.R && barrierSeg(o, nx, ny)) { R.x = nx; R.y = ny; return end(5); }
      }
    }
    if (S.ropes.length) { const rc = ropeCross(x, y, nx, ny, side); if (rc) { R.rope = rc.r; R.x = x + (nx - x) * rc.t; R.y = y + (ny - y) * rc.t; return end(6); } }
    if (foeT.shield.on && inBubble(fst, nx, ny)) { R.x = nx; R.y = ny; return end(5); }
    const h = rayShot(x, y, nx, ny, side, inOwn);
    const wt = S.water ? waterCross(x, y, nx, ny) : -1;
    if (wt >= 0 && (!h || wt < RAY.f)) {
      if (AMP.skip) { load(); SA.nx = nx; SA.ny = ny; if (waterSkip(wt)) { x = SA.x; y = SA.y; vx = SA.vx; vy = SA.vy; mass = SA.mass; kk = SA.k; if (path) path.push(x, y); continue; } }
      R.x = x + (nx - x) * wt; R.y = S.water.y; return end(1);
    }
    if (h) {
      if (h === 1 && !RAY.o && AMP.roll && rollOk(RAY.x, side, wi)) { load(); rollStart(RAY.x); x = SA.x; y = SA.y; vx = SA.vx; vy = 0; flag = SA.flag; a0 = SA.a0; a1 = SA.a1; rolling = true; R.roll = true; if (path) path.push(x, y); continue; }
      R.o = RAY.o; R.x = RAY.x; R.y = RAY.y; return end(h);
    }
    if (inOwn && t > 0.3 && (nx < own.x0 - 1 || nx > own.x1 + 1 || ny > own.y1 + 4)) inOwn = false;
    if (nx < -40 || nx > VIEW_W + 40 || ny < -30) { R.x = nx; R.y = ny; return end(0); }
    x = nx; y = ny;
    if (path) path.push(x, y);
  }
  R.x = x; R.y = y; return end(0);
}
// 輪到自己：列出這一輪想試的打法
function aiBegin(T) {
  const A = T.ai, side = T.side, dir = T.dir, foeT = S.team[1 - side], fst = S.st[1 - side], wind = S.wind;
  A.warn = 1; A.st = 1; A.t = A.think * (0.8 + rnd() * 0.4); A.fireAt = S.time + A.t + 0.25; A.cand.length = 0; A.ci = 0; A.best = null; A.bs = 0.004; A.top = []; A.useGate = rnd() < A.gate;
  // 連珠集滿了：一輪到自己就先上膛（對方看得到，來得及開護罩），多想一下再打
  if (A.skill > 0 && T.ult.c >= T.ult.need && !T.ult.armed && rnd() < A.skill) { simSkill(side, 'ult'); A.t += 0.7; A.fireAt += 0.7; A.useGate = true; }
  let lead = null, bv = -1;
  for (const u of T.units) { if (!u.alive || !u.w || u.frozen > 0 || u.stun > 0) continue; const v = u.w.dmg * (u.w.n || 1) * (u.w.fan || 1) + rnd() * 6; if (v > bv) { bv = v; lead = u; } }
  if (!lead) for (const u of T.units) if (u.alive) { lead = u; break; }
  // 對面垂著引信頭：有時候這一輪改由火油兵帶頭，專瞄引信頭（其他兵照同一個角度跟著打）。敵軍第一回合不會
  const F = fst.fuse; let fuseMode = false;
  if (F && !F.done && !F.fronts.length && fuseOn(F, 0) && !(side === 1 && S.round <= 1 && S.lv.foe.open) && rnd() < 0.45 + (A.sap || 0) * 0.3) {
    const fu = T.units.find((u) => u.alive && u.w && u.w.kind === K_FIRE && u.frozen <= 0 && u.stun <= 0);
    if (fu) { lead = fu; fuseMode = true; }
  }
  A.lead = lead; if (!lead) return;
  const big = lead.def.big ? MUZ_BIG : 1, mx = lead.x + dir * 1.3 * big, my = lead.y + 2.3 * big;
  const tg = [];
  for (const u of foeT.units) if (u.alive) tg.push({ x: u.x, y: u.y + 1.6 * (u.def.big ? MUZ_BIG : 1), w: 1.15 + (u.type === 'boss' ? BOSS_W : 0) + (u.hp < u.hpMax * 0.4 ? 0.25 : 0) });
  const r1 = side === 1 && S.round <= 1 && !!S.lv.foe.open;          // 敵軍的第一輪：只瞄兵（試射），機關、牆、天燈、倍增符都不管
  if (!r1 && A.guard > 0 && rnd() < A.guard) for (const o of S.objs) {
    if (o.t === 'lantern') tg.push({ x: o.x, y: o.y, w: 1.0, obj: o });
    else if ((o.t === 'balloon' || o.t === 'orb') && o.side !== side && o.hp > 0 && o.st === 'hover') tg.push({ x: o.x, y: o.y, w: o.t === 'orb' ? 3 : 1.9, obj: o });
  }
  {
    // 城身：火藥桶，再隨便挑幾塊還在原位的磚。兵腳下、身邊那一層的牆和柱子最值得打（打掉了人會跟著掉下去）；城基太厚，不打
    const cand = [];
    for (const b of fst.blocks) { if (b.dead) continue; if (b.mat === M_KEG) { if (!r1 && !b.fuseKeg) tg.push({ x: b.body.getPosition().x, y: b.body.getPosition().y, w: 1.35 }); } else if (b.inPlace && !b.prop && !b.base && !b.beam) cand.push(b); }          // 接著引信的火藥桶打不爆，不瞄
    if (!r1 && rnd() < A.sap) for (let k = 0; k < 5 && cand.length; k++) {
      const b = cand[ri(cand.length)]; let w = 0.5;
      for (const u of foeT.units) if (u.alive && Math.abs(u.x - b.x0) < CS * 2.2 && u.y - b.y0 > -CS * 0.5 && u.y - b.y0 < CS * 2.6) { w = 0.8; break; }
      tg.push({ x: b.x0, y: b.y0, w });
    }
  }
  if (!r1 && A.hate > 0 && rnd() < A.hate) for (const g of S.gates) if (!g.dead && g.owner === 1 - side) tg.push({ x: g.x, y: g.y, w: 0.45 + 0.12 * g.mult, hg: g });
  // 第一回合敵軍還在試射：只瞄兵（我方的機關第一回合有護符，打了也沒用）
  if (r1) { A.mx = mx; A.my = my; for (const t of tg) for (let tau = 0.7; tau <= 3.41; tau += 0.1) { aimFor(mx, my, t.x, t.y, tau, wind, _av); if (aimOk(_av[0], _av[1], dir)) A.cand.push({ vx: _av[0], vy: _av[1], tau, t }); } return; }
  // 第二篇的要害：吊著重物的繩子、鐵鍊（打斷了會砸下去），關卡自己指定的弱點（石碑、天秤的配重、塔腳……）
  for (const r of S.ropes) if (!r.cut && r.aw > 0 && r.side !== side && rnd() < A.sap + 0.25) { const e = ropeEnds(r); tg.push({ x: (e[0] + e[2]) / 2, y: (e[1] + e[3]) / 2, w: r.aw, rope: r }); }
  if (S.lv.weak && rnd() < A.sap + 0.25) for (const t of S.lv.weak(side)) tg.push(t);
  // 對面的機關：浮島的氣球（同一頭已經破了一顆的，另一顆特別值得打）、擋滾石的木樁、中間的大鐘、引信頭、船艙
  for (const o of S.objs) if (o.t === 'tether' && o.side !== side && o.hp > 0) {
    const mate = o.plat.teth.find((q) => q !== o && Math.abs(q.ax - o.ax) < CS * 3);
    tg.push({ x: o.x, y: o.y, w: mate && mate.hp <= 0 ? 1.9 : 1.05, obj: o });
  }
  // 擋滾石的木樁：對面城前半邊、低樓層還有幾個兵（滾石撞得到的），越多越值得打
  for (const R of S.rollers) if (R.to === 1 - side && !R.go && R.stake && !R.stake.dead && (side === 0 || rnd() < A.sap + 0.25)) {          // 敵軍不是每一輪都想得到
    const p = R.stake.body.getPosition(), ts = S.st[R.to]; let n = 0;
    for (const u of foeT.units) if (u.alive && u.y - ts.y0 < 13 && (ts.mirror ? u.x < ts.cx : u.x > ts.cx)) n++;
    tg.push({ x: p.x, y: p.y + R.stake.h * 0.2, w: 1.15 + 0.3 * Math.min(n, 2), blk: R.stake });
  }
  if (S.bell && S.bell.b.body) { const B = S.bell, p = B.b.body.getPosition(), v = B.b.body.getLinearVelocity(); if (v.x * v.x + v.y * v.y < 2) tg.push({ x: p.x - dir * B.b.w * 0.3, y: p.y, w: 1.0, blk: B.b }); }
  { const F = fst.fuse; if (F && !F.done && !F.fronts.length && fuseOn(F, 0) && T.units.some((u) => u.alive && u.w && u.w.kind === K_FIRE && u.frozen <= 0 && u.stun <= 0)) tg.push({ x: F.x[0], y: F.y[0] + 0.6, w: 1.5, fuse: F }); }
  if (fst.plat && fst.plat.comps && rnd() < A.sap + 0.35) for (const c of fst.plat.comps) {
    if (c.hp <= 0) continue;
    const q = polyCentroid(c.pts), wp = fst.plat.body.getWorldPoint({ x: q[0], y: q[1] }), wy = S.water ? S.water.y : 0;
    tg.push({ x: wp.x, y: Math.max(wy + 1.2, wp.y + 1), w: c.bow ? 0.95 : 0.7, hull: c });
  }
  if (fuseMode) { tg.length = 0; tg.push({ x: F.x[0], y: F.y[0] + 0.6, w: 1.5, fuse: F }); }
  // 這一關中間的放大（冰鏡、噴流、水面、雷雲、稜鏡、彈簧板、滾石坡）：瞄它的入口，打出去之後照最後打到什麼來評分
  if (!fuseMode && A.useGate) for (const p of ampAims(side)) tg.push({ x: p.x, y: p.y, w: p.w || 1, amp: 1, lo: p.lo, hi: p.hi });
  for (const t of tg) for (let tau = t.lo || 0.7; tau <= (t.hi || 3.41); tau += 0.1) {
    aimFor(mx, my, t.x, t.y, tau, wind, _av);
    if (aimOk(_av[0], _av[1], dir)) A.cand.push({ vx: _av[0], vy: _av[1], tau, t });
  }
  A.mx = mx; A.my = my;
}
// 每一步試幾種（分散在好幾幀，不會卡）
function aiEval(T, budget) {
  const A = T.ai, side = T.side, wind = S.wind;
  while (budget-- > 0 && A.ci < A.cand.length) {
    const c = A.cand[A.ci++], t = c.t, R = simTrace(side, A.mx, A.my, c.vx, c.vy, wind, A.fireAt, undefined, A.lead && A.lead.w ? A.lead.w.i : 0);
    let sc = 0;
    if (t.amp) sc = aiHitScore(R, side);
    else if (t.obj) sc = (R.hit === 4 && R.obj === t.obj) || R.lan === t.obj ? 1 : 0;
    else if (t.hg) sc = R.hit === 5 && R.gate === t.hg ? 1 : 0;
    else if (t.rope) sc = R.hit === 6 && R.rope === t.rope ? 1 : t.rope.cut ? 0 : Math.max(0, 0.7 - segDist(R.x, R.y, t.rope.e[0], t.rope.e[1], t.rope.e[2], t.rope.e[3]) / 4);
    else if (t.blk) sc = (R.hit === 2 && R.o === t.blk) ? 1 : Math.max(0, 0.6 - Math.hypot(R.x - t.x, R.y - t.y) / 5);
    else if (t.hull) sc = R.o === t.hull ? 1 : Math.max(0, 0.55 - Math.hypot(R.x - t.x, R.y - t.y) / 6);
    else if (t.fuse) sc = Math.max(0, 1 - Math.hypot(R.x - t.x, R.y - t.y) / 3);
    else if (R.hit === 6) sc = 0.1;
    else if (R.port) sc = 0.85;
    else if (R.hit === 3) sc = 1.3;
    else if (R.hit === 2 && R.o && R.o.side === 1 - side) sc = (R.o.mat === M_KEG ? 1.0 : 0.72) / (1 + Math.hypot(R.x - t.x, R.y - t.y) / 7);
    if (sc <= 0) continue;
    const m = (R.mult < 1 ? R.mult : A.useGate ? Math.pow(Math.min(R.mult, 200), 1 - SPLIT_P) : 1) * (A.useGate ? Math.pow(R.amp, 0.85) * (R.fire || R.zap || R.frost ? 1.15 : 1) : 1);
    sc *= t.w * m * (1 - 0.03 * Math.abs(c.tau - 1.8)) * (1 + A.lob * (c.tau - 1.6) * 0.25) * (0.9 + rnd() * 0.2);
    if (sc > A.bs) { A.bs = sc; A.best = c; A.mult = R.mult; }
    // 前幾名都留著：第一名要是會打到自己的城，就換下一個
    if (sc > 0.004) { c.sc = sc; c.mult = R.mult; const top = A.top; let i = top.length; while (i > 0 && top[i - 1].sc < sc) i--; if (i < 6) { top.splice(i, 0, c); if (top.length > 6) top.length = 6; } }
  }
}
// 試射的結果值多少（打到放大入口的那幾發：看最後打到什麼）
function aiHitScore(R, side) {
  const o = R.o;
  if (R.hit === 3 && o && o.side === 1 - side) return 1.3 * (o.def && o.def.big ? 1 + BOSS_W : 1);
  if (R.hit === 2 && o && o.side === 1 - side && !o.frag) return o.mat === M_KEG ? 1.0 : o.weak ? 1.1 : 0.72;
  if (R.hit === 4 && R.obj && R.obj.side === 1 - side) return 1.0;
  if (R.hit === 6 && R.rope && R.rope.side === 1 - side) return 0.5 + (R.rope.aw || 0) * 0.3;
  if (R.port) return 0.85;
  if (R.hit === 2 && o && o.stake && o.stake.to === 1 - side) return 1.1;
  return 0;
}
// 用這個角度，自己人每一個開得了火的兵各試射一發：有沒有哪一發會落回自己的城上（後排的兵吊太高、水平速度太小就會）。順便回傳最多穿過幾倍的符
function aiVolley(T, vx, vy) {
  const A = T.ai, dir = T.dir; let wm = 1, own = false;
  for (const u of T.units) {
    if (!u.alive || !u.w || u.frozen > 0 || u.stun > 0) continue;
    const big = u.def.big ? MUZ_BIG : 1, R = simTrace(T.side, u.x + dir * 1.3 * big, u.y + 2.3 * big, vx, vy, S.wind, A.fireAt, undefined, u.w.i);
    if (R.mult > wm) wm = R.mult;
    if (R.hit === 2 && R.o && R.o.side === T.side && !R.o.frag) own = true;
  }
  _vol.mult = wm; _vol.own = own; return _vol;
}
const _vol = { mult: 1, own: false };
function aiChoose(T) {
  const A = T.ai, dir = T.dir, fst = S.st[1 - T.side], wind = S.wind;
  let b = A.best;
  // 第一名會打到自己的城：往下找一個不會的（都會的話還是用第一名）
  if (b && A.top && A.top.length > 1 && aiVolley(T, b.vx, b.vy).own) { for (let i = 1; i < A.top.length; i++) { const c = A.top[i]; if (!aiVolley(T, c.vx, c.vy).own) { b = c; A.best = c; A.mult = c.mult; break; } } }
  if (!b) {
    // 什麼都瞄不到：往對面城樓中段吊一發
    aimFor(A.mx, A.my, fst.cx, fst.y0 + fst.h * 0.5, 2.0, wind, _av); const a = clampAim(_av[0], _av[1], dir);
    b = { vx: a[0], vy: a[1], tau: 2.0, t: { x: fst.cx, y: fst.y0 + fst.h * 0.5 } }; A.mult = 1;
  }
  // 手抖：落點偏掉一些
  const k = S.round <= 1 ? A.warm : 1, ex = gauss() * A.err * k, ey = gauss() * A.err * 0.7 * k;
  let a = clampAim(b.vx + ex / b.tau, b.vy + ey / b.tau, dir);
  // 真的要打出去的這個角度（手抖之後），每個開得了火的兵各試射一發：最多會穿過幾倍的符。畫面上拿來預警「敵軍瞄準了倍增符」
  let v = aiVolley(T, a[0], a[1]);
  if (v.own) { const a2 = clampAim(b.vx, b.vy, dir), v2 = aiVolley(T, a2[0], a2[1]); if (!v2.own) { a = a2; v = v2; } }        // 手一抖就會砸到自己的城：這一發不抖
  A.px = a[0]; A.py = a[1]; A.warn = v.mult;
}
function aiStep(T, dt) {
  const A = T.ai; A.t -= dt;
  if (A.st === 0) aiBegin(T);
  if (A.st === 1) { if (!A.lead) { A.st = 2; A.px = T.aim[0]; A.py = T.aim[1]; } else { aiEval(T, 26); if (A.ci >= A.cand.length) { aiChoose(T); A.st = 2; } } }
  if (A.st === 2) {
    // 砲口轉過去（看得出來在瞄哪），時間到就開火
    const k = Math.min(1, dt * 6); simAim(T.side, T.aim[0] + (A.px - T.aim[0]) * k, T.aim[1] + (A.py - T.aim[1]) * k);
    if (A.t <= 0 && Math.hypot(A.px - T.aim[0], A.py - T.aim[1]) < 1.5) {
      simAim(T.side, A.px, A.py);
      A.st = 0; simFire(T.side);
    }
  }
}
// 自動玩家：對方開火時，有護城罩就看本事決定開不開
function aiReact(T) {
  const A = T.ai; if (!A || A.sh <= 0 || T.shield.c < T.shield.need || T.shield.on) return;
  // 魔王城：看得到魔王預告的招式，連射、隕石雨的那一輪才開護罩（其他回合省著）
  let p = A.sh * 0.8;
  if (S.boss && T.side === 0) p = S.boss.next === 'barrage' || S.boss.next === 'meteor' ? Math.min(1, A.sh * 1.6) : A.sh * 0.25;
  if (rnd() < p) simSkill(T.side, 'shield');
}
