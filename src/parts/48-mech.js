/* ===== 48-mech: 第二篇的機關 — 繩索與鐵鍊、吊著的東西、天秤的支點、河水、超載、投石兵的大石頭、琉璃 =====
   都是照物理算的：繩子只會拉不會推、太重會繃斷；吊鐘、石籃是真的重物；天秤靠支點的摩擦撐著，重量偏太多才會翻；
   河水把木頭浮起來沖走；柱子撐的重量超過開場時的好幾倍，就會嘎吱作響、裂開、斷掉。 */

/* ---------- 藍圖座標 → 戰場座標 ---------- */
// at：[欄, 由上往下第幾列, 格子裡的位置 fx（0 左、1 右）, fy（0 下、1 上）]，照藍圖寫的方向（敵城會左右鏡射）
function cellPt(st, at) {
  const col = at[0], row = at[1], fx = at[2] === undefined ? 0.5 : at[2], fy = at[3] === undefined ? 0.5 : at[3];
  const cy = st.rows - 1 - row, mx = st.mirror ? st.cols - 1 - col : col, ux = st.mirror ? 1 - fx : fx;
  return { x: st.x0 + (mx + ux) * CS, y: st.y0 + (cy + fy) * CS, cx: mx, cy };
}
// 某一點掛在什麼上：岩壁（null = 固定點）或一塊磚。找不到就回傳 undefined
function anchorAt(st, P) {
  const i = P.cy * st.cols + P.cx, k = st.cellK[i];
  if (k === 3) return null;
  const b = st.cellB[i]; if (b && !b.dead) return b;
  for (const o of st.blocks) if (!o.dead && o.body && Math.abs(o.x0 - P.x) < o.w / 2 + 0.05 && Math.abs(o.y0 - P.y) < o.h / 2 + 0.05) return o;
  return undefined;
}

/* ---------- 繩索與鐵鍊 ---------- */
// 傷害種類對繩子的倍率：   爆   穿刺  重   火   冰   雷   壓   暗
const ROPE_DM = [1.0, 2.6, 1.2, 1.6, 0.4, 0.8, 0, 1.1];        // 麻繩：一箭射得斷、火燒得斷
const CHAIN_DM = [0.8, 0.45, 1.25, 0.25, 0.4, 2.2, 0, 1.0];    // 鐵鍊：箭射不太動，重砲、雷才打得斷
const ROPE_HP = { rope: 26, chain: 72 };
function ropeEnds(r) {
  const e = r.e;
  if (r.a && r.a.body) { const p = r.a.body.getWorldPoint(r.la); e[0] = p.x; e[1] = p.y; } else if (!r.a) { e[0] = r.la.x; e[1] = r.la.y; }
  if (r.b && r.b.body) { const p = r.b.body.getWorldPoint(r.lb); e[2] = p.x; e[3] = p.y; } else if (!r.b) { e[2] = r.lb.x; e[3] = r.lb.y; }
  return e;
}
function ropeJoint(r) {
  const ga = r.a ? r.a.body : PH.ground, gb = r.b ? r.b.body : PH.ground;
  r.j = PH.world.createJoint(new PL.RopeJoint({ maxLength: r.len, localAnchorA: r.la, localAnchorB: r.lb, collideConnected: true }, ga, gb));
}
// A、B：{ b: 磚 或 null（固定在岩壁上）, x, y（建立時的世界座標） }
function mkRope(st, A, B, o) {
  const ga = A.b ? A.b.body : PH.ground, gb = B.b ? B.b.body : PH.ground;
  const kind = o.kind || 'rope', hm = (o.hp || ROPE_HP[kind]) * (st.hpMul || 1);
  const r = {
    st, side: st.side, kind, a: A.b, b: B.b, la: ga.getLocalPoint({ x: A.x, y: A.y }), lb: gb.getLocalPoint({ x: B.x, y: B.y }),
    len: Math.hypot(B.x - A.x, B.y - A.y) * (o.slack || 1), hp: hm, hm, j: null, cut: false, burn: 0, flash: 0, t0: 0, tmax: 1e9, over: 0, tens: 0,
    aw: o.aw || 0, tag: o.tag || '', e: [A.x, A.y, B.x, B.y], cutT: -99, cx: [0, 0, 0, 0], hang: o.hang || null
  };
  r.la = { x: r.la.x, y: r.la.y }; r.lb = { x: r.lb.x, y: r.lb.y };
  ropeJoint(r);
  if (A.b) (A.b.ropes || (A.b.ropes = [])).push(r);
  if (B.b) (B.b.ropes || (B.b.ropes = [])).push(r);
  S.ropes.push(r);
  return r;
}
function mkRopeDef(st, d) {
  const PA = cellPt(st, d.a), PB = cellPt(st, d.b), ta = anchorAt(st, PA), tb = anchorAt(st, PB);
  if (ta === undefined || tb === undefined) return null;
  return mkRope(st, { b: ta, x: PA.x, y: PA.y }, { b: tb, x: PB.x, y: PB.y }, d);
}
// 吊著的東西：銅鐘（bell）、水晶吊燈（lamp）、配重石籃（basket）。at 是吊點，len 是繩子多長（戰場單位），w、h 大小
function mkHang(st, h) {
  const P = cellPt(st, h.at), top = anchorAt(st, P); if (top === undefined) return null;
  const w = h.w || 3.4, hh = h.h || 3.4, y = P.y - h.len - hh / 2;
  const kind = h.t === 'bell' ? 'bell' : h.t === 'lamp' ? 'lamp' : h.t === 'basket' ? 'basket' : 'box';
  const mat = h.mat !== undefined ? h.mat : h.t === 'bell' ? M_IRON : h.t === 'lamp' ? M_GLASS : M_STONE;
  const b = mkBlock(st, { mat, kind, x: P.x, y, w, h: hh, prop: 1, den: h.den, il: kind === 'bell' ? w * 0.24 : 0, ir: kind === 'bell' ? w * 0.24 : 0 });
  b.hang = h.t; b.cx = P.cx; b.cy = P.cy; b.cw = 1; b.ch = 1;
  if (h.hp) { b.hp = b.hm = h.hp * (st.hpMul || 1); }
  return mkRope(st, { b: top, x: P.x, y: P.y }, { b, x: P.x, y: y + hh / 2 }, { kind: h.chain ? 'chain' : 'rope', hp: h.rhp, aw: h.aw, tag: h.t, hang: b });
}
function ropeHurt(r, d, kind, side) {
  if (r.cut || d <= 0) return;
  d *= (r.kind === 'chain' ? CHAIN_DM : ROPE_DM)[kind] || 0; if (d <= 0) return;
  const before = r.hp; r.hp -= d; r.flash = 1;
  if (side < 2 && r.side < 2 && side !== r.side) { const T = S.team[side]; T.ult.c = Math.min(T.ult.need, T.ult.c + Math.min(d, before) * T.ult.gain * 0.8 * ultK(side)); }
  if (r.hp <= 0) ropeCut(r, side, kind, false);
  else { const e = ropeEnds(r); ev('rhit', (e[0] + e[2]) / 2, (e[1] + e[3]) / 2, r.kind === 'chain' ? 1 : 0); }
}
// quiet：掛著它的那塊磚自己沒了（繩子跟著掉，不算一次「打斷」）
function ropeCut(r, side, kind, quiet) {
  if (r.cut) return;
  const e = ropeEnds(r); r.cx[0] = e[0]; r.cx[1] = e[1]; r.cx[2] = e[2]; r.cx[3] = e[3];
  r.cut = true; r.hp = 0; r.cutT = S.time; r.burn = 0;
  if (r.j) { if (PH.inStep) PH.killJ.push(r.j); else PH.world.destroyJoint(r.j); r.j = null; }
  if (quiet) return;
  ev('snap', (e[0] + e[2]) / 2, (e[1] + e[3]) / 2, r.kind === 'chain' ? 1 : 0, r.side, r.tag);
  S.chainT = S.time;
  if (r.side < 2 && r.side !== S.turn && S.phase !== 'hazard' && S.state === 'play') S.chain += 2;
}
// 掛著繩子的那塊磚要消失了：長樑斷成幾截的話，繩子跟著吊點那一截走；整塊碎掉的話，繩子跟著掉
function ropesOff(b, pieces) {
  if (!b.ropes) return;
  for (const r of b.ropes) {
    if (r.cut) continue;
    const isA = r.a === b, lp = isA ? r.la : r.lb, wp = b.body.getWorldPoint(lp);
    let nb = null;
    if (pieces) for (const c of pieces) { if (!c.body) continue; const q = c.body.getLocalPoint(wp); if (Math.abs(q.x) <= c.w / 2 + 0.05 && Math.abs(q.y) <= c.h / 2 + 0.3) { nb = c; break; } }
    if (!nb) { ropeCut(r, 2, K_CRUSH, true); continue; }
    if (r.j) { if (PH.inStep) PH.killJ.push(r.j); else PH.world.destroyJoint(r.j); r.j = null; }
    const q = nb.body.getLocalPoint(wp);
    if (isA) { r.a = nb; r.la = { x: q.x, y: q.y }; } else { r.b = nb; r.lb = { x: q.x, y: q.y }; }
    (nb.ropes || (nb.ropes = [])).push(r);
    if (!PH.inStep) ropeJoint(r); else PH.reJ.push(r);
  }
  b.ropes = null;
}
// 點到線段的距離
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t; const qx = ax + dx * t - px, qy = ay + dy * t - py;
  return Math.sqrt(qx * qx + qy * qy);
}
// 砲彈這一步有沒有碰到對方的繩子（自己的繩子不擋自己的砲）
function ropeCross(x, y, nx, ny, side) {
  for (const r of S.ropes) {
    if (r.cut || r.side === side) continue;
    const e = r.e;
    if ((x < e[0] - 0.5 && nx < e[0] - 0.5 && x < e[2] - 0.5 && nx < e[2] - 0.5) || (x > e[0] + 0.5 && nx > e[0] + 0.5 && x > e[2] + 0.5 && nx > e[2] + 0.5)) continue;
    const t = segHit(x, y, nx, ny, e[0], e[1], e[2], e[3]);
    if (t >= 0) { _rc.r = r; _rc.t = t; return _rc; }
  }
  return null;
}
const _rc = { r: null, t: 0 };
// 爆炸炸到繩子
function ropesBlast(x, y, rad, dmg, kind, side, fire) {
  for (const r of S.ropes) {
    if (r.cut) continue;
    const e = r.e, d = segDist(x, y, e[0], e[1], e[2], e[3]); if (d > rad + 0.4) continue;
    const f = Math.min(1, 1 - (d - 0.4) / rad);
    ropeHurt(r, dmg * 0.9 * f, kind, side);
    if (fire && !r.cut && r.kind === 'rope' && f > 0.4) { if (r.burn <= 0) ev('ignite', (e[0] + e[2]) / 2, (e[1] + e[3]) / 2); r.burn = Math.max(r.burn, 3.5); }
  }
}

/* ---------- 天秤的支點：一塊磚被釘在世界上的一點，只能繞著它轉（有角度上限，轉軸有摩擦） ---------- */
function mkPivot(st, pv) {
  const P = cellPt(st, pv.at), b = anchorAt(st, P); if (!b) return null;
  const lo = st.mirror ? -pv.hi : pv.lo, hi = st.mirror ? -pv.lo : pv.hi;
  const j = PH.world.createJoint(new PL.RevoluteJoint({ enableLimit: true, lowerAngle: lo, upperAngle: hi, enableMotor: true, motorSpeed: 0, maxMotorTorque: pv.fric }, PH.ground, b.body, { x: P.x, y: P.y }));
  const o = { st, b, j, x: P.x, y: P.y, ang: 0 };
  b.pivot = o; S.pivots.push(o);
  return o;
}

/* ---------- 河水：浮起來、被沖走 ---------- */
// 已經離開原位的磚（碎塊、掉下去的樓板）和兵：照泡在水裡的比例受浮力、阻力、水流。還在原位的（插在河底的竹樁）不算
function waterForces() {
  const W = S.water; if (!W) return;
  for (const b of S.blocks) {
    if (b.dead || b.inPlace) { if (b.wet) b.wet = 0; continue; }
    const body = b.body, p = body.getPosition(); if (p.x < W.x0 - 6 || p.x > W.x1 + 6) { b.wet = 0; continue; }
    const A = body.getFixtureList().getAABB(0), lo = A.lowerBound.y, hi = A.upperBound.y;
    if (lo >= W.y || p.x < W.x0 || p.x > W.x1) { b.wet = 0; continue; }
    const sub = clamp((W.y - lo) / Math.max(0.05, hi - lo), 0, 1), first = !b.wet;
    b.wet = sub;
    if (first) { const v = body.getLinearVelocity(); if (v.y < -4) ev('splash', p.x, W.y, Math.min(3, b.mass / 8), 0); }
    const m = body.getMass(), den = body.getFixtureList().getDensity() || 1, area = m / den, v = body.getLinearVelocity(), c = body.getWorldCenter();
    const fb = W.rho * area * sub * GRAV;
    body.applyForce({ x: (W.cur - v.x) * m * 1.4 * sub, y: fb - v.y * m * 1.8 * sub }, { x: c.x, y: lo + (Math.min(W.y, hi) - lo) * 0.5 }, first);
    if (sub > 0.2) body.setAngularVelocity(body.getAngularVelocity() * 0.97);
  }
  for (const u of S.units) {
    if (!u.alive || !u.body) continue;
    const p = u.body.getPosition(); if (p.x < W.x0 || p.x > W.x1 || p.y - u.bh / 2 >= W.y) { u.wet = 0; continue; }
    const sub = clamp((W.y - (p.y - u.bh / 2)) / u.bh, 0, 1), first = !u.wet; u.wet = sub;
    if (first) ev('splash', p.x, W.y, 1.2, 1);
    const m = u.body.getMass(), v = u.body.getLinearVelocity();
    u.body.applyForce({ x: (W.cur - v.x) * m * 1.4 * sub, y: m * GRAV * 0.8 * sub - v.y * m * 1.6 * sub }, u.body.getWorldCenter(), true);
  }
}
// 砲彈這一步有沒有打進水面（水面跟地面一樣：砲彈在那裡炸開）
function waterCross(x, y, nx, ny) {
  const W = S.water; if (!W || ny >= W.y || y < W.y) return -1;
  const t = (y - W.y) / (y - ny), hx = x + (nx - x) * t;
  return hx >= W.x0 && hx <= W.x1 ? t : -1;
}

/* ---------- 超載：撐不住就嘎吱作響、裂開、斷掉 ----------
   開場時先讓整座城「站」一下，量每一塊撐著多重（含站在上面的兵），那就是它蓋好時的負荷。
   之後只要撐的重量超過這個的 MAT.stress 倍（竹子、琉璃不到兩倍，木頭兩倍多），就開始一點一點受傷：
   旁邊的柱子斷了一根，重量全壓到剩下的那根上，它先嘎吱作響、冒灰、出現裂痕，撐不了多久也斷，重量再往下一根移 —— 一根接一根的連鎖坍塌 */
function stressCalib(k) {
  for (const b of S.blocks) { b.sJ = 0; b.sAcc = 0; }
  for (const r of S.ropes) r.t0 = 0;
  for (let i = 0; i < k; i++) {
    PH.world.step(STEP, 8, 3);
    for (const b of S.blocks) { if (b.dead) continue; b.sAcc += b.sJ / STEP; b.sJ = 0; }
    for (const r of S.ropes) if (r.j) { const f = r.j.getReactionForce(1 / STEP); r.t0 = Math.max(r.t0, Math.hypot(f.x, f.y)); }
  }
  for (const b of S.blocks) {
    b.sL = 0; b.sT = 0; b.sJ = 0;
    const m = MAT[b.mat]; b.cap = 0;
    if (S.lv.stress && m.stress && !b.prop && !b.frag && !b.base && !b.beam) b.cap = Math.max(b.sAcc / k * m.stress, b.mass * GRAV * 1.2 + 60);
    b.sAcc = 0;
  }
  for (const r of S.ropes) r.tmax = Math.max(r.t0 * (r.kind === 'chain' ? 4.2 : 3.0), r.kind === 'chain' ? 1800 : 700);
}
function stressStep(dt, act) {
  const credit = S.phase === 'hazard' ? 2 : S.turn;
  for (const b of S.blocks) {
    if (b.dead) continue;
    if (!b.cap) { b.sJ = 0; continue; }
    if (b.body.isAwake()) b.sL += (b.sJ / dt - b.sL) * 0.25;
    b.sJ = 0;
    if (!act) continue;
    const cap = b.cap * (0.35 + 0.65 * Math.max(0, b.hp / b.hm));
    if (b.sL > cap) {
      b.sT += dt;
      if (b.sT > 0.22) {
        blockHurt(b, b.hm * 0.55 * Math.min(2.5, b.sL / cap - 0.8) * dt, K_CRUSH, b.side === credit ? 2 : credit);
        b.creak = (b.creak || 0) - dt; if (b.creak <= 0 && !b.dead) { b.creak = 0.45; const p = b.body.getPosition(); ev('creak', p.x, p.y + b.h * 0.3, b.mat, b.sL / cap); }
      }
    } else if (b.sT > 0) b.sT = Math.max(0, b.sT - dt * 2);
  }
}

/* ---------- 投石兵的大石頭 ---------- */
function spawnBoulder(u, T, w, ax, ay) {
  const dir = T.dir, mx = u.x + dir * 1.5, my = u.y + 2.7;
  let live = 0, old = null; for (const b of S.rubble.blocks) if (!b.dead && b.boulder) { live++; if (!old) old = b; }
  if (live >= 6 && old) blockKill(old, 2, K_CRUSH, true);
  const b = mkBlock(S.rubble, { mat: M_ROCK, kind: 'ball', x: mx, y: my, r: w.rad, awake: true, den: w.den });
  b.inPlace = false; b.boulder = 1; b.bSide = u.side; b.bFly = 1; b.bIn = 1; b.bHit = 0; b.bMul = T.dmg * S.rage; b.bW = w; b.hp = b.hm = 400;
  b.body.setLinearVelocity({ x: ax, y: ay }); b.body.setAngularVelocity(-dir * 5); b.body.setBullet(true);
}
function boulderStep(dt) {
  const st = S.rubble;
  for (const b of st.blocks) {
    if (b.dead || !b.boulder) continue;
    const body = b.body, p = body.getPosition(), v = body.getLinearVelocity();
    if (b.bIn) { const own = S.st[b.bSide]; if (p.x < own.x0 - 1.5 || p.x > own.x1 + 1.5 || p.y > own.y1 + 3) b.bIn = 0; }
    if (!b.bFly) continue;
    body.applyForce({ x: S.wind * body.getMass(), y: 0 }, body.getWorldCenter(), true);         // 跟砲彈一樣吃風
    const o = 1 - b.bSide;
    if (S.team[o].shield.on && inBubble(S.st[o], p.x, p.y)) { ev('shieldhit', p.x, p.y, o); ev('rockstop', p.x, p.y, o); blockKill(b, 2, K_CRUSH, true); continue; }
    if (b.bHit || (v.x * v.x + v.y * v.y < 30 && !b.bIn)) { b.bFly = 0; body.setBullet(false); body.setAngularDamping(1.2); }
  }
}

/* ---------- 每一步 ---------- */
function mechStep(dt) {
  const act = S.state !== 'play' || S.phase === 'volley' || S.phase === 'resolve' || S.phase === 'hazard';
  if (S.ropes.length) {
    for (const r of S.ropes) {
      if (r.cut) continue;
      ropeEnds(r);
      if (r.flash > 0) r.flash = Math.max(0, r.flash - dt * 5);
      if (r.j) { const f = r.j.getReactionForce(1 / dt); r.tens = Math.hypot(f.x, f.y); if (act && r.tens > r.tmax) { r.over += dt; if (r.over > 0.12) { ropeCut(r, S.phase === 'hazard' ? 2 : S.turn, K_CRUSH, false); continue; } } else r.over = Math.max(0, r.over - dt); }
      if (r.burn > 0 && act) { r.burn -= dt; r.hp -= 7 * dt; if (r.hp <= 0) ropeCut(r, S.turn === r.side ? 2 : S.turn, K_FIRE, false); }
    }
  }
  if (S.lv.stress) stressStep(dt, act);
  boulderStep(dt);
  // 琉璃碎片：一會兒就化成亮晶晶的粉，不會滿地都是
  for (const b of S.blocks) if (!b.dead && b.frag && b.mat === M_GLASS) { b.age = (b.age || 0) + dt; if (b.age > 2.2) { const p = b.body.getPosition(); ev('glint', p.x, p.y); blockKill(b, 2, K_CRUSH, true); } }
  for (const o of S.pivots) if (o.b && !o.b.dead) o.ang = o.b.body.getAngle();
}
// 共鳴晶柱被打到：整座宮殿的琉璃一起震出裂痕（一個圈一個圈傳出去）
function resonate(b, side) {
  if (b.resoDone) return; b.resoDone = 1;
  const p = b.body.getPosition();
  ev('reso', p.x, p.y, side);
  for (const o of b.st.blocks) {
    if (o.dead || o === b || o.mat !== M_GLASS || o.reso) continue;
    const d = Math.hypot(o.x0 - p.x, o.y0 - p.y); if (d > 30) continue;
    S.pend.push({ t: S.time + 0.08 + d * 0.018, reso: o, side });
  }
}
// 第二篇才有的回合結束清場：場中間停住的大石頭清掉（不然整片空地擺滿石頭，平射都被擋）
function mechRoundEnd() {
  for (const b of S.rubble.blocks) {
    if (b.dead || !b.boulder) continue;
    const p = b.body.getPosition(); let inC = false;
    for (let s = 0; s < 2; s++) { const st = S.st[s]; if (p.x > st.x0 - 1 && p.x < st.x1 + 1) inC = true; }
    if (!inC) blockKill(b, 2, K_CRUSH, true);
  }
}
// 兵比對面少的時候：打出傷害、打出坍塌，連珠集得快一點（給落後的一方翻盤的機會）
function ultK(side) { const T = S.team[side], F = S.team[1 - side]; return T && F && T.alive < F.alive ? 1.5 : 1; }
function ropesBurning() { for (const r of S.ropes) if (!r.cut && r.burn > 0) return true; return false; }
