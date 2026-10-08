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
/* 試射一發（不影響戰局）：t0 是預計開火的時間（會動的符和結界要用那時候的位置）。
   R.hit: 0 沒中、1 地面（含水面）、2 磚、3 兵、4 氣球／光球／天燈、5 被擋（對方的符、鏡子、結界、護城罩）、6 繩索／鐵鍊（R.rope）；R.port 進了傳送門 */
const _tr = { hit: 0, x: 0, y: 0, t: 0, mult: 1, gm: 0, o: null, obj: null, lan: null, gate: null, port: false, rope: null };
function simTrace(side, mx, my, vx, vy, wind, t0, kmax) {
  const R = _tr; R.hit = 0; R.mult = 1; R.gm = 0; R.o = null; R.obj = null; R.lan = null; R.gate = null; R.port = false; R.rope = null;
  const dt = 1 / 30, own = S.st[side], foeT = S.team[1 - side], fst = S.st[1 - side], lag = t0 - S.time;
  // 這裡一步走 1/30 秒，戰局是 1/60 秒；補上兩者每一步差的那一點，落點才會跟真的打出去一樣
  const cy = GRAV * STEP * STEP, cx = -wind * STEP * STEP;
  let x = mx, y = my, mask = 0, t = 0, inOwn = true;
  kmax = kmax || 150;
  for (let k = 0; k < kmax; k++) {
    vy -= GRAV * dt; vx += wind * dt;
    const nx = x + vx * dt + cx, ny = y + vy * dt + cy; t += dt;
    for (const g of S.gates) {
      if (g.dead || (mask & g.bit)) continue;
      gatePosAt(g, t0 + t, _gp);
      if ((x < _gp[0] - 9 && nx < _gp[0] - 9) || (x > _gp[0] + 9 && nx > _gp[0] + 9)) continue;
      if (segHit(x, y, nx, ny, _gp[0] - g.dx, _gp[1] - g.dy, _gp[0] + g.dx, _gp[1] + g.dy) < 0) continue;
      mask |= g.bit;
      if (g.owner === 3) R.mult *= 0.5;
      else if (g.owner === 2 || g.owner === side) { R.mult *= g.mult; R.gm |= g.bit; }
      else { R.hit = 5; R.gate = g; R.x = nx; R.y = ny; R.t = t; return R; }
    }
    for (const o of S.objs) {
      if (o.t === 'mirror') { if (segHit(x, y, nx, ny, o.x - o.dx, o.y - o.dy, o.x + o.dx, o.y + o.dy) >= 0) { R.hit = 5; R.x = nx; R.y = ny; R.t = t; return R; } }
      else if (o.t === 'portal') {
        if (o.owner !== side) continue;
        // 傳送門會上下飄：用砲彈飛到那裡時門的位置
        const py = o.mv ? o.by + o.mv.a * tri((t0 + t) / o.mv.per + (o.mv.ph || 0)) : o.y, dx = nx - o.x, dy = ny - py;
        if (dx * dx + dy * dy < o.r * o.r) { R.hit = 2; R.port = true; R.x = o.ex; R.y = fst.y1; R.t = t; return R; }
      } else if (o.t === 'lantern') {
        // 天燈不擋砲彈：打中了照樣往前飛
        if (o.hp > 0 && !R.lan) { const dx = nx - o.x, dy = ny - o.y; if (dx * dx + dy * dy < o.r * o.r) R.lan = o; }
      } else if (o.t === 'balloon' || o.t === 'orb') {
        if (o.side === side || o.hp <= 0) continue;
        const dx = nx - o.x, dy = ny - o.y; if (dx * dx + dy * dy < o.r * o.r) { R.hit = 4; R.obj = o; R.x = nx; R.y = ny; R.t = t; return R; }
      } else if (o.t === 'barrier' && side === 0) {
        const d0 = Math.hypot(x - o.x, y - o.y), d1 = Math.hypot(nx - o.x, ny - o.y);
        if (d0 > o.R && d1 <= o.R && barrierSeg(o, nx, ny)) { R.hit = 5; R.x = nx; R.y = ny; R.t = t; return R; }
      }
    }
    if (S.ropes.length) { const rc = ropeCross(x, y, nx, ny, side); if (rc) { R.hit = 6; R.rope = rc.r; R.x = x + (nx - x) * rc.t; R.y = y + (ny - y) * rc.t; R.t = t; return R; } }
    if (foeT.shield.on && inBubble(fst, nx, ny)) { R.hit = 5; R.x = nx; R.y = ny; R.t = t; return R; }
    const h = rayShot(x, y, nx, ny, side, inOwn);
    const wt = S.water ? waterCross(x, y, nx, ny) : -1;
    if (wt >= 0 && (!h || wt < RAY.f)) { R.hit = 1; R.x = x + (nx - x) * wt; R.y = S.water.y; R.t = t; return R; }
    if (h) { R.hit = h; R.o = RAY.o; R.x = RAY.x; R.y = RAY.y; R.t = t; return R; }
    if (inOwn && t > 0.3 && (nx < own.x0 - 1 || nx > own.x1 + 1 || ny > own.y1 + 4)) inOwn = false;
    if (nx < -40 || nx > VIEW_W + 40 || ny < -30) { R.x = nx; R.y = ny; R.t = t; return R; }
    x = nx; y = ny;
  }
  R.x = x; R.y = y; R.t = t; return R;
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
  A.lead = lead; if (!lead) return;
  const big = lead.def.big ? MUZ_BIG : 1, mx = lead.x + dir * 1.3 * big, my = lead.y + 2.3 * big;
  const tg = [];
  for (const u of foeT.units) if (u.alive) tg.push({ x: u.x, y: u.y + 1.6 * (u.def.big ? MUZ_BIG : 1), w: 1.15 + (u.type === 'boss' ? BOSS_W : 0) + (u.hp < u.hpMax * 0.4 ? 0.25 : 0) });
  if (A.guard > 0 && rnd() < A.guard) for (const o of S.objs) {
    if (o.t === 'lantern') tg.push({ x: o.x, y: o.y, w: 1.0, obj: o });
    else if ((o.t === 'balloon' || o.t === 'orb') && o.side !== side && o.hp > 0 && o.st === 'hover') tg.push({ x: o.x, y: o.y, w: o.t === 'orb' ? 3 : 1.9, obj: o });
  }
  {
    // 城身：火藥桶，再隨便挑幾塊還在原位的磚。兵腳下、身邊那一層的牆和柱子最值得打（打掉了人會跟著掉下去）；城基太厚，不打
    const cand = [];
    for (const b of fst.blocks) { if (b.dead) continue; if (b.mat === M_KEG) tg.push({ x: b.body.getPosition().x, y: b.body.getPosition().y, w: 1.35 }); else if (b.inPlace && !b.prop && !b.base && !b.beam) cand.push(b); }
    if (rnd() < A.sap) for (let k = 0; k < 5 && cand.length; k++) {
      const b = cand[ri(cand.length)]; let w = 0.5;
      for (const u of foeT.units) if (u.alive && Math.abs(u.x - b.x0) < CS * 2.2 && u.y - b.y0 > -CS * 0.5 && u.y - b.y0 < CS * 2.6) { w = 0.8; break; }
      tg.push({ x: b.x0, y: b.y0, w });
    }
  }
  if (A.hate > 0 && rnd() < A.hate) for (const g of S.gates) if (!g.dead && g.owner === 1 - side) tg.push({ x: g.x, y: g.y, w: 0.45 + 0.12 * g.mult, hg: g });
  // 第二篇的要害：吊著重物的繩子、鐵鍊（打斷了會砸下去），關卡自己指定的弱點（石碑、天秤的配重、塔腳……）
  for (const r of S.ropes) if (!r.cut && r.aw > 0 && r.side !== side && rnd() < A.sap + 0.25) { const e = ropeEnds(r); tg.push({ x: (e[0] + e[2]) / 2, y: (e[1] + e[3]) / 2, w: r.aw, rope: r }); }
  if (S.lv.weak && rnd() < A.sap + 0.25) for (const t of S.lv.weak(side)) tg.push(t);
  for (const t of tg) for (let tau = 0.7; tau <= 3.41; tau += 0.1) {
    aimFor(mx, my, t.x, t.y, tau, wind, _av);
    if (aimOk(_av[0], _av[1], dir)) A.cand.push({ vx: _av[0], vy: _av[1], tau, t });
  }
  A.mx = mx; A.my = my;
}
// 每一步試幾種（分散在好幾幀，不會卡）
function aiEval(T, budget) {
  const A = T.ai, side = T.side, wind = S.wind;
  while (budget-- > 0 && A.ci < A.cand.length) {
    const c = A.cand[A.ci++], t = c.t, R = simTrace(side, A.mx, A.my, c.vx, c.vy, wind, A.fireAt);
    let sc = 0;
    if (t.obj) sc = (R.hit === 4 && R.obj === t.obj) || R.lan === t.obj ? 1 : 0;
    else if (t.hg) sc = R.hit === 5 && R.gate === t.hg ? 1 : 0;
    else if (t.rope) sc = R.hit === 6 && R.rope === t.rope ? 1 : t.rope.cut ? 0 : Math.max(0, 0.7 - segDist(R.x, R.y, t.rope.e[0], t.rope.e[1], t.rope.e[2], t.rope.e[3]) / 4);
    else if (t.blk) sc = (R.hit === 2 && R.o === t.blk) ? 1 : Math.max(0, 0.6 - Math.hypot(R.x - t.x, R.y - t.y) / 5);
    else if (R.hit === 6) sc = 0.1;
    else if (R.port) sc = 0.85;
    else if (R.hit === 3) sc = 1.3;
    else if (R.hit === 2 && R.o && R.o.side === 1 - side) sc = (R.o.mat === M_KEG ? 1.0 : 0.72) / (1 + Math.hypot(R.x - t.x, R.y - t.y) / 7);
    if (sc <= 0) continue;
    const m = R.mult < 1 ? R.mult : A.useGate ? Math.pow(Math.min(R.mult, 200), 1 - SPLIT_P) : 1;
    sc *= t.w * m * (1 - 0.03 * Math.abs(c.tau - 1.8)) * (1 + A.lob * (c.tau - 1.6) * 0.25) * (0.9 + rnd() * 0.2);
    if (sc > A.bs) { A.bs = sc; A.best = c; A.mult = R.mult; }
    // 前幾名都留著：第一名要是會打到自己的城，就換下一個
    if (sc > 0.004) { c.sc = sc; c.mult = R.mult; const top = A.top; let i = top.length; while (i > 0 && top[i - 1].sc < sc) i--; if (i < 6) { top.splice(i, 0, c); if (top.length > 6) top.length = 6; } }
  }
}
// 用這個角度，自己人每一個開得了火的兵各試射一發：有沒有哪一發會落回自己的城上（後排的兵吊太高、水平速度太小就會）。順便回傳最多穿過幾倍的符
function aiVolley(T, vx, vy) {
  const A = T.ai, dir = T.dir; let wm = 1, own = false;
  for (const u of T.units) {
    if (!u.alive || !u.w || u.frozen > 0 || u.stun > 0) continue;
    const big = u.def.big ? MUZ_BIG : 1, R = simTrace(T.side, u.x + dir * 1.3 * big, u.y + 2.3 * big, vx, vy, S.wind, A.fireAt);
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
  const ex = gauss() * A.err, ey = gauss() * A.err * 0.7;
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
function aiReact(T) { const A = T.ai; if (A && A.sh > 0 && T.shield.c >= T.shield.need && !T.shield.on && rnd() < A.sh * 0.8) simSkill(T.side, 'shield'); }
