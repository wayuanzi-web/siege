/* ===== 52-ai: 敵軍怎麼瞄準。測試用的自動玩家也用同一套，只是參數不同 ===== */
function aiInit(T, p, D) {
  T.ai = {
    err: (p.err === undefined ? 6 : p.err) * D.aiErr,       // 落點誤差（戰場單位）
    think: (p.think || 3) * D.aiThink,                       // 幾秒重新盤算一次
    gate: p.gate === undefined ? 0.5 : p.gate,               // 會去穿倍增符的機率
    hate: p.hate || 0,                                       // 會去打對方倍增符的機率
    turn: p.turn || 2.2,                                     // 砲口轉向的速度
    skill: p.skill || 0,                                     // 用技能的本事（自動玩家才有）
    guard: p.guard === undefined ? 1 : p.guard,              // 會不會優先打氣球、光球
    lob: p.lob || 0,                                         // 偏好吊高砲的程度
    t: p.delay === undefined ? 0.4 : p.delay, plan: null, px: T.aim[0], py: T.aim[1], w0: 0, lead: null
  };
}
const _av = [0, 0];
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
  const mv = g.move, age = t - g.born; out[0] = g.bx; out[1] = g.by;
  if (!mv) { out[0] = g.x; out[1] = g.y; return out; }
  if (mv.t === 'bob') out[1] = g.by + mv.a * tri(age / mv.per + g.ph);
  else if (mv.t === 'slide') out[0] = g.bx + mv.a * tri(age / mv.per + g.ph);
  else if (mv.t === 'orbit') { const a = age / mv.per * TAU + g.ph * TAU; out[0] = g.bx + Math.cos(a) * mv.rx; out[1] = g.by + Math.sin(a) * mv.ry; }
  return out;
}
/* 試射一發（不影響戰局）：回傳會發生什麼事。
   res.hit: 0 沒中、1 打到對方城樓、2 被擋（中立建築、對方的符、鏡子、結界）、3 打到氣球或光球 */
const _tr = { hit: 0, x: 0, y: 0, t: 0, mult: 1, obj: null, gate: null, unit: null, port: false };
function simTrace(side, mx, my, vx, vy, wind) {
  const R = _tr; R.hit = 0; R.mult = 1; R.obj = null; R.gate = null; R.unit = null; R.port = false;
  const dt = 1 / 40, own = S.st[side], foe = S.st[1 - side];
  let x = mx, y = my, mask = 0, t = 0, gmax = S.gmax + 0.5;
  for (let k = 0; k < 176; k++) {
    vy -= GRAV * dt; vx += wind * dt;
    const nx = x + vx * dt, ny = y + vy * dt; t += dt;
    for (const g of S.gates) {
      if (g.dead || (mask & g.bit)) continue;
      if ((x < g.x - 9 && nx < g.x - 9) || (x > g.x + 9 && nx > g.x + 9)) continue;
      if (segHit(x, y, nx, ny, g.x - g.dx, g.y - g.dy, g.x + g.dx, g.y + g.dy) < 0) continue;
      mask |= g.bit;
      if (g.owner === 3) R.mult *= 0.5;
      else if (g.owner === 2 || g.owner === side) R.mult *= g.mult;
      else { R.hit = 2; R.gate = g; R.x = nx; R.y = ny; R.t = t; return R; }
    }
    for (const o of S.objs) {
      if (o.t === 'mirror') { if (segHit(x, y, nx, ny, o.x - o.dx, o.y - o.dy, o.x + o.dx, o.y + o.dy) >= 0) { R.hit = 2; R.x = nx; R.y = ny; R.t = t; return R; } }
      else if (o.t === 'portal') { if (o.owner === side) { const dx = nx - o.x, dy = ny - o.y; if (dx * dx + dy * dy < o.r * o.r) { R.hit = 1; R.port = true; R.x = o.ex; R.y = foe.y1; R.t = t; return R; } } }
      else if (o.t === 'balloon' || o.t === 'orb') {
        if (o.side === side || o.hp <= 0) continue;
        // 目標自己也在動：用它到時候的位置
        const ox = o.x + (o.t === 'orb' ? o.vx : o.dir * o.spd) * t, oy = o.t === 'orb' ? o.y + o.vy * t - 0.5 * o.g * t * t : Math.min(o.alt, o.y + 9 * t);
        const dx = nx - ox, dy = ny - oy; if (dx * dx + dy * dy < o.r * o.r) { R.hit = 3; R.obj = o; R.x = nx; R.y = ny; R.t = t; return R; }
      } else if (o.t === 'barrier' && side === 0) {
        const d0 = Math.hypot(x - o.x, y - o.y), d1 = Math.hypot(nx - o.x, ny - o.y);
        if (d0 > o.R && d1 <= o.R) {
          let a = Math.atan2(ny - o.y, nx - o.x) - (o.rot + o.spin * t); a -= Math.floor(a / TAU) * TAU;
          for (const sg of o.segs) { if (sg.dead > 0) continue; let da = a - sg.a; da -= Math.round(da / TAU) * TAU; if (Math.abs(da) <= sg.w) { R.hit = 2; R.x = nx; R.y = ny; R.t = t; return R; } }
        }
      }
    }
    for (const st of S.structs) {
      if (st.dead || st === own) continue;
      if (nx < st.x0 || nx >= st.x1 || ny < st.y0 || ny >= st.y1) continue;
      const ci = (((ny - st.y0) / CS) | 0) * st.cols + (((nx - st.x0) / CS) | 0);
      if (isSolid(st.m[ci])) { R.hit = st === foe ? 1 : 2; R.x = nx; R.y = ny; R.t = t; return R; }
      if (st === foe) for (const u of st.units) if (u.alive && Math.abs(nx - u.x) < 1.45 && ny > u.y - 0.2 && ny < u.y + 3.9) { R.hit = 1; R.unit = u; R.x = nx; R.y = ny; R.t = t; return R; }
    }
    if (ny < gmax && ny <= groundY(nx)) { R.x = nx; R.y = ny; R.t = t; return R; }
    if (nx < -40 || nx > VIEW_W + 40 || ny < -30) { R.x = nx; R.y = ny; R.t = t; return R; }
    x = nx; y = ny;
  }
  R.x = x; R.y = y; R.t = t; return R;
}
const _gp = [0, 0];
function aiPlan(T) {
  const A = T.ai, side = T.side, dir = T.dir, foeT = S.team[1 - side], fst = S.st[1 - side];
  const wind = side === 1 ? S.windAI : S.wind;
  let lead = null, bv = -1;
  for (const u of T.units) { if (!u.alive || !u.w || u.fall || u.grp) continue; const v = u.w.dmg * (u.w.burst || 1) * (u.w.fan || 1) / u.w.reload + rnd() * 3; if (v > bv) { bv = v; lead = u; } }
  if (!lead) for (const u of T.units) if (u.alive) { lead = u; break; }
  if (!lead) return;
  A.lead = lead; A.w0 = wind;
  const mx = lead.x + dir * 1.3, my = lead.y + 2.3;
  // 目標
  const tg = [];
  if (A.guard > 0) for (const o of S.objs) {
    if ((o.t !== 'balloon' && o.t !== 'orb') || o.side === side || o.hp <= 0) continue;
    tg.push({ x: o.x, y: o.y, w: o.t === 'orb' ? 4 : 2.6, obj: o, mv: 1 });
  }
  for (const u of foeT.units) if (u.alive) tg.push({ x: u.x, y: u.y + 1.9, w: 1.05 + (u.w ? Math.min(0.5, u.w.dmg * (u.w.burst || 1) / u.w.reload / 24) : 0.4) + (u.type === 'boss' ? 0.4 : 0), unit: u });
  {
    // 城身：挑幾塊還在的磚
    const cand = []; for (let i = 0; i < fst.n; i++) if (isSolid(fst.m[i])) cand.push(i);
    for (let k = 0; k < 3 && cand.length; k++) { const i = cand[ri(cand.length)]; tg.push({ x: cellX(fst, i), y: cellY(fst, i), w: fst.m[i] === M_KEG ? 1.7 : 0.75 }); }
    for (let i = 0; i < fst.n; i++) if (fst.m[i] === M_KEG && rnd() < 0.6) tg.push({ x: cellX(fst, i), y: cellY(fst, i), w: 1.5 });
  }
  if (A.hate > 0 && rnd() < A.hate) for (const g of S.gates) if (!g.dead && g.owner === 1 - side) tg.push({ x: g.x, y: g.y, w: 0.5 + 0.3 * g.mult, hg: g });
  const useGate = rnd() < A.gate;
  const routes = [null];
  if (useGate) for (const g of S.gates) if (!g.dead && (g.owner === side || g.owner === 2)) routes.push(g);
  let best = null, bs = 0.004;
  const tryAim = (vx, vy, tau, t, viaGate) => {
    if (!aimOk(vx, vy, dir)) return;
    const R = simTrace(side, mx, my, vx, vy, wind);
    let sc;
    if (t.obj) sc = R.hit === 3 && R.obj === t.obj ? 1 : 0;
    else if (t.hg) sc = R.hit === 2 && R.gate === t.hg ? 1 : 0;
    else { sc = R.hit === 1 ? 1 / (1 + Math.hypot(R.x - t.x, R.y - t.y) / 9) : 0; if (R.port) sc = 0.9; }
    if (sc <= 0) return;
    sc *= t.w * Math.pow(Math.min(R.mult, 12), 0.9) * (1 - 0.04 * Math.abs(tau - 1.9)) * (1 + A.lob * (tau - 1.6) * 0.25) * (0.92 + rnd() * 0.16);
    if (sc > bs) { bs = sc; best = { vx, vy, tau, t, gate: viaGate, mult: R.mult }; }
  };
  for (const t of tg) {
    for (const g of routes) {
      if (!g) {
        // 直接打：平、中、高三種彈道各試一次
        let lo = -1, hi = -1;
        for (let tau = 0.7; tau <= 3.61; tau += 0.1) { const tx = t.x, ty = t.y; aimFor(mx, my, tx, ty, tau, wind, _av); if (aimOk(_av[0], _av[1], dir)) { if (lo < 0) lo = tau; hi = tau; } }
        if (lo < 0) continue;
        for (const f of [0.15, 0.5, 0.85]) {
          const tau = lo + (hi - lo) * f; let tx = t.x, ty = t.y;
          if (t.mv) { const o = t.obj; if (o.t === 'orb') { tx = o.x + o.vx * tau; ty = o.y + o.vy * tau - 0.5 * o.g * tau * tau; } else { tx = o.x + o.dir * o.spd * tau; ty = Math.min(o.alt, o.y + 9 * tau); } }
          aimFor(mx, my, tx, ty, tau, wind, _av); tryAim(_av[0], _av[1], tau, t, null);
        }
      } else {
        if (t.mv || t.hg) continue;
        // 穿過倍增符再落到目標：掃 tau，找彈道剛好過符心的那一個
        let pe = 0, pt = 0, have = false, bt = -1, be = 1e9;
        for (let tau = 0.8; tau <= 3.61; tau += 0.1) {
          aimFor(mx, my, t.x, t.y, tau, wind, _av);
          const vx = _av[0], vy = _av[1]; if (vx * dir <= 2) { have = false; continue; }
          gatePosAt(g, S.time + 0.5, _gp);
          const dx = _gp[0] - mx; let t1;
          if (Math.abs(wind) < 0.01) t1 = dx / vx; else { const disc = vx * vx + 2 * wind * dx; if (disc < 0) { have = false; continue; } t1 = (-vx + dir * Math.sqrt(disc)) / wind; }
          if (t1 <= 0 || t1 >= tau) { have = false; continue; }
          gatePosAt(g, S.time + 0.35 + t1, _gp);
          const e = my + vy * t1 - 0.5 * GRAV * t1 * t1 - _gp[1];
          if (Math.abs(e) < be && aimOk(vx, vy, dir)) { be = Math.abs(e); bt = tau; }
          if (have && (e > 0) !== (pe > 0)) { const z = pt + (tau - pt) * (pe / (pe - e)); aimFor(mx, my, t.x, t.y, z, wind, _av); if (aimOk(_av[0], _av[1], dir)) { bt = z; be = 0; } }
          pe = e; pt = tau; have = true;
        }
        if (bt < 0 || be > g.h * 0.8) continue;
        aimFor(mx, my, t.x, t.y, bt, wind, _av); tryAim(_av[0], _av[1], bt, t, g);
      }
    }
  }
  if (!best) {
    // 什麼都瞄不到：往對面城樓中段吊一發
    aimFor(mx, my, fst.cx, fst.y0 + fst.h * 0.5, 2.0, wind, _av); const a = clampAim(_av[0], _av[1], dir);
    best = { vx: a[0], vy: a[1], tau: 2.0, t: { x: fst.cx, y: fst.y0 + fst.h * 0.5 }, gate: null, mult: 1 };
  }
  // 加上手抖：落點偏掉一些
  const ex = gauss() * A.err, ey = gauss() * A.err * 0.7;
  aimFor(mx, my, best.t.x + ex + (best.vx - 0) * 0, best.t.y + ey, best.tau, wind, _av);
  // 以「原本算好的初速」為準，加上落點偏移造成的差
  aimFor(mx, my, best.t.x, best.t.y, best.tau, wind, _gp);
  const a = clampAim(best.vx + (_av[0] - _gp[0]), best.vy + (_av[1] - _gp[1]), dir);
  A.px = a[0]; A.py = a[1];
  A.plan = { unit: best.t.unit || null, gate: best.gate, obj: best.t.obj || null, hg: best.t.hg || null, mult: best.mult };
}
function aiStep(T, dt) {
  const A = T.ai; A.t -= dt;
  const P = A.plan;
  if (P) {
    if (P.unit && !P.unit.alive) A.t = Math.min(A.t, 0.35);
    if (P.gate && P.gate.dead) A.t = Math.min(A.t, 0.5);
    if (P.hg && P.hg.dead) A.t = Math.min(A.t, 0.3);
    if (P.obj && P.obj.hp <= 0) A.t = Math.min(A.t, 0.25);
    if (Math.abs((T.side === 1 ? S.windAI : S.wind) - A.w0) > 3.5) A.t = Math.min(A.t, 0.5);
    if (A.lead && !A.lead.alive) A.t = Math.min(A.t, 0.3);
  }
  if (A.guard > 0 && A.t > 0.6 && !(P && P.obj)) for (const o of S.objs) if ((o.t === 'orb' || o.t === 'balloon') && o.side !== T.side && o.hp > 0 && o.age > 0.5) { A.t = Math.min(A.t, 0.6); break; }
  if (A.t <= 0) { aiPlan(T); A.t = A.think * (0.75 + rnd() * 0.5); if (A.plan && A.plan.obj) A.t = Math.min(A.t, 0.7); }
  const k = Math.min(1, dt * A.turn);
  simAim(T.side, T.aim[0] + (A.px - T.aim[0]) * k, T.aim[1] + (A.py - T.aim[1]) * k);
  if (A.skill > 0) botSkills(T, dt);
}
// 自動玩家用技能：看到一大波砲彈要砸下來就開護城罩；連珠砲集滿就放
function botSkills(T, dt) {
  const A = T.ai, side = T.side, st = S.st[side];
  if (T.shield.cd <= 0 && T.shield.T <= 0) {
    let danger = 0; const la = 0.42;
    for (let i = 0; i < SH.n; i++) {
      if (SH.side[i] === side) continue;
      const px = SH.x[i] + SH.vx[i] * la, py = SH.y[i] + SH.vy[i] * la - 0.5 * GRAV * la * la;
      if (inBubble(st, px, py)) danger += WL[SH.w[i]].dmg * SH.mass[i];
    }
    for (const o of S.objs) if (o.t === 'orb' && Math.hypot(o.x - st.cx, o.y - (st.y0 + st.h * 0.45)) < st.h * 0.75) danger += 200;
    if (danger > 80 && rnd() < A.skill * dt * 9) simSkill(side, 'shield');
  }
  if (T.ult.c >= T.ult.need && T.ult.T <= 0 && rnd() < A.skill * dt * 1.6) simSkill(side, 'ult');
}
