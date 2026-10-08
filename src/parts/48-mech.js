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
const ROPE_HP = { rope: 26, chain: 60 };
function ropeEnds(r) {
  const e = r.e;
  if (r.a && r.a.body) { const p = r.a.body.getWorldPoint(r.la); e[0] = p.x; e[1] = p.y; } else if (!r.a) { e[0] = r.la.x; e[1] = r.la.y; }
  if (r.b && r.b.body) { const p = r.b.body.getWorldPoint(r.lb); e[2] = p.x; e[3] = p.y; } else if (!r.b) { e[2] = r.lb.x; e[3] = r.lb.y; }
  return e;
}
// 繩子現在被拉得多緊（兩頭都在睡、還沒被解算過的繩子算 0）
function ropeTension(j, inv) { return j.m_u ? Math.abs(j.m_impulse || 0) * inv : 0; }
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
  b.hang = h.t; b.cx = P.cx; b.cy = P.cy; b.cw = 1; b.ch = 1; if (h.bal) b.bal = 1;
  b.wt = 0;                                               // 吊著的東西不算城防
  b.body.setAngularDamping(1.2);
  if (h.hp) { b.hp = b.hm = h.hp * (st.hpMul || 1); }
  return mkRope(st, { b: top, x: P.x, y: P.y }, { b, x: P.x, y: y + hh / 2 }, { kind: h.chain ? 'chain' : 'rope', hp: h.rhp, aw: h.aw, tag: h.tag || h.t, hang: b });
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
  if (r.hang && !r.hang.dead) { r.hang.hangFree = 1; if (!quiet && side < 2 && side !== r.side) r.hang.hitBy = side; }
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
// 點到線段的距離（最近的那一點放在 _sq）
const _sq = { x: 0, y: 0 };
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t; const qx = ax + dx * t - px, qy = ay + dy * t - py; _sq.x = ax + dx * t; _sq.y = ay + dy * t;
  return Math.sqrt(qx * qx + qy * qy);
}
// 兩點之間有沒有隔著岩壁（藍圖裡的 A）
let _rb = false;
function _rbcb(f, pt, n, fr) { const o = f.getUserData(); if (o && o.isRock) { _rb = true; return 0; } return -1; }
function rockBetween(x0, y0, x1, y1) {
  if (!S.st[0].rock && !S.st[1].rock) return false;
  if (Math.abs(x1 - x0) + Math.abs(y1 - y0) < 0.05) return false;
  _rb = false; PH.world.rayCast({ x: x0, y: y0 }, { x: x1, y: y1 }, _rbcb); return _rb;
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
    if (r.cut || r.side === side) continue;                 // 自己的砲不傷自己的繩子（跟雷一樣）
    const e = r.e, d = segDist(x, y, e[0], e[1], e[2], e[3]); if (d > rad + 0.4) continue;
    if (rockBetween(x, y, _sq.x, _sq.y)) continue;           // 中間隔著岩壁（懸空寺的岩簷）：炸不到
    const f = Math.min(1, 1 - (d - 0.4) / rad);
    ropeHurt(r, dmg * 0.9 * f, kind, side);
    if (fire && !r.cut && r.kind === 'rope' && f > 0.4) { if (r.burn <= 0) ev('ignite', (e[0] + e[2]) / 2, (e[1] + e[3]) / 2); r.burn = Math.max(r.burn, 3.5); }
  }
}

/* ---------- 天秤的支點：一塊磚被釘在世界上的一點，只能繞著它轉（有角度上限，轉軸有摩擦） ---------- */
// 支點釘在這座城自己的岩柱上（大樑跟岩柱之間不碰撞：轉起來不會卡在柱頂的角上）。
// 開場先秤一下：大樑上所有東西（磚、兵、兩籃配重）對支點的力矩加起來，差多少就加在標了 bal 的那一籃上，讓它剛好平衡。
// 轉軸的摩擦（hold）是「前面那籃配重的力矩」的幾成：少一籃配重一定會翻；死一兩個兵、掉幾塊磚還撐得住，掉多了就翻
function mkPivot(st, pv) {
  const P = cellPt(st, pv.at), b = anchorAt(st, P); if (!b) return null;
  const lo = st.mirror ? -pv.hi : pv.lo, hi = st.mirror ? -pv.lo : pv.hi;
  const j = PH.world.createJoint(new PL.RevoluteJoint({ enableLimit: true, lowerAngle: lo, upperAngle: hi, enableMotor: true, motorSpeed: 0, maxMotorTorque: 1e9, collideConnected: false }, st.rockBody || PH.ground, b.body, { x: P.x, y: P.y }));
  const o = { st, b, j, x: P.x, y: P.y, ang: 0, hold: pv.hold || 0.8, tq: 0, tip: 0 };
  b.pivot = o; S.pivots.push(o);
  return o;
}
// 等兵都放上去之後才秤（simInit 裡呼叫）
function pivotBalance(o) {
  const st = o.st; let T = 0, bal = null, ref = 0;
  for (const b of st.blocks) {
    if (b.dead || b === o.b) continue;
    const c = b.body.getWorldCenter(); T += b.mass * (c.x - o.x);
    if (b.hang === 'basket') { if (b.bal) bal = b; else ref = Math.max(ref, b.mass * Math.abs(c.x - o.x)); }
  }
  for (const u of st.units) if (u.alive && u.body) T += u.mass * (u.body.getWorldCenter().x - o.x);
  if (bal) {
    const c = bal.body.getWorldCenter(), arm = c.x - o.x, m = bal.mass - T / arm;
    const f = bal.body.getFixtureList(); f.setDensity(f.getDensity() * Math.max(0.2, m / bal.mass)); bal.body.resetMassData(); bal.mass = bal.body.getMass();
  }
  o.tq = Math.max(ref, 1) * GRAV * o.hold;
  o.j.setMaxMotorTorque(o.tq);
}

/* ---------- 懸臂樑的榫頭：樑的內端用一根插銷釘在岩壁上（只能往下轉），外端靠鐵鍊吊著 ----------
   插銷有摩擦：鐵鍊還在的時候，整間殿的重量大半由鐵鍊吊著，插銷只出一點力。鐵鍊斷了，整間殿的力矩全壓在插銷上，
   超過它撐得住的（hold：全部重量的幾成），樑就嘎吱嘎吱、一點一點往下垂；垂到 brk（弧度）插銷就斷，整間殿掉下去。
   插銷釘在樑內端的「上緣」：往下垂的時候樑的內端是往外離開岩壁，不會卡進岩石裡。
   樑跟這座城的岩壁之間不碰撞（插銷斷了之後也不會，免得一歪就卡在岩壁上） */
function mkPin(st, pd) {
  const P = cellPt(st, pd.at), Q = cellPt(st, pd.on), b = anchorAt(st, Q); if (!b || !st.rockBody) return null;
  const droop = st.mirror ? 1 : -1;
  const o = { st, b, j: null, x: P.x, y: P.y, droop, hold: pd.hold || 0.5, brk: pd.brk || 0.2, tq: 1e9, lp: null, broke: false, creak: 0, tag: pd.tag || '' };
  o.lp = b.body.getLocalPoint({ x: P.x, y: P.y }); o.lp = { x: o.lp.x, y: o.lp.y };
  pinJoint(o);
  (b.pins || (b.pins = [])).push(o); S.pins.push(o);
  noRock(b, st);
  return o;
}
function pinJoint(o) {
  const lo = o.droop > 0 ? 0 : -0.8, hi = o.droop > 0 ? 0.8 : 0, a0 = o.b.body.getAngle();
  o.j = PH.world.createJoint(new PL.RevoluteJoint({ enableLimit: true, lowerAngle: lo, upperAngle: hi, enableMotor: true, motorSpeed: 0, maxMotorTorque: o.tq, collideConnected: false, referenceAngle: o.a0 === undefined ? a0 : o.a0 }, o.st.rockBody, o.b.body, o.b.body.getWorldPoint(o.lp)));
  if (o.a0 === undefined) o.a0 = a0;
}
// 這塊磚不再跟這座城的岩壁碰撞
function noRock(b, st) { b.noRock = st; }
// 開場：先把吊著這根樑的鐵鍊拿掉，量插銷要出多少力才撐得住整間殿，再把鐵鍊裝回去（simInit 裡、量超載之前呼叫）
function pinBalance() {
  if (!S.pins.length) return;
  const off = [];
  for (const r of S.ropes) for (const o of S.pins) if (r.j && (r.a === o.b || r.b === o.b)) { PH.world.destroyJoint(r.j); r.j = null; off.push(r); }
  for (const b of S.blocks) b.body.setAwake(true);
  for (const u of S.units) if (u.body) u.body.setAwake(true);
  const T = S.pins.map(() => 0);
  for (let i = 0; i < 10; i++) { PH.world.step(STEP, 8, 3); S.pins.forEach((o, k) => { if (o.j) T[k] = Math.max(T[k], Math.abs(o.j.getMotorTorque(1 / STEP))); }); }
  S.pins.forEach((o, k) => { o.full = T[k]; o.tq = Math.max(500, T[k] * o.hold); if (o.j) o.j.setMaxMotorTorque(o.tq); });
  for (const r of off) ropeJoint(r);
  for (const b of S.blocks) { b.body.setTransform({ x: b.x0, y: b.y0 }, 0); b.body.setLinearVelocity({ x: 0, y: 0 }); b.body.setAngularVelocity(0); }
  for (const u of S.units) if (u.body) { u.body.setTransform({ x: u.hx, y: u.hy + u.bh / 2 }, 0); u.body.setLinearVelocity({ x: 0, y: 0 }); }
}
// 樑斷成幾截：插銷跟著插銷那一頭的那一截走；整根碎掉就沒了
function pinsOff(b, pieces) {
  if (!b.pins) return;
  for (const o of b.pins) {
    if (o.broke) continue;
    if (o.j) { if (PH.inStep) PH.killJ.push(o.j); else PH.world.destroyJoint(o.j); o.j = null; }
    const wp = b.body.getWorldPoint(o.lp); let nb = null;
    if (pieces) for (const c of pieces) { if (!c.body) continue; const q = c.body.getLocalPoint(wp); if (Math.abs(q.x) <= c.w / 2 + 0.3 && Math.abs(q.y) <= c.h / 2 + 0.3) { nb = c; break; } }
    if (!nb) { o.broke = true; continue; }
    o.b = nb; const q = nb.body.getLocalPoint(wp); o.lp = { x: q.x, y: q.y }; nb.noRock = b.noRock;
    (nb.pins || (nb.pins = [])).push(o);
    if (!PH.inStep) pinJoint(o); else PH.rePin.push(o);
  }
  b.pins = null;
}
function pinStep(dt, act) {
  for (const o of S.pins) {
    if (o.broke || !o.j || !o.b || o.b.dead) continue;
    // 瞄準的時候插銷完全卡死（不會在別人瞄準時慢慢垂下去）
    o.j.setMaxMotorTorque(act ? o.tq : 1e9);
    const a = (o.b.body.getAngle() - o.a0) * o.droop, w = o.b.body.getAngularVelocity() * o.droop;
    if (act && Math.abs(w) > 0.01) S.chainT = S.time;
    if (act && w > 0.02) {
      o.creak -= dt; if (o.creak <= 0) { o.creak = 0.38; ev('creak', o.x, o.y, M_WOOD, 1.5 + a * 6); }
    }
    if (a > o.brk) {
      // 插銷斷了：整根樑連上面的殿掉下去
      PH.world.destroyJoint(o.j); o.j = null; o.broke = true;
      ev('snap', o.x, o.y, 1, o.st.side, 'pin'); S.chainT = S.time;
      if (o.st.side < 2 && o.st.side !== S.turn && S.phase !== 'hazard' && S.state === 'play') S.chain += 2;
    }
  }
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
    for (const r of S.ropes) if (r.j) r.t0 = Math.max(r.t0, ropeTension(r.j, 1 / STEP));
  }
  for (const b of S.blocks) {
    b.sL = 0; b.sT = 0; b.sJ = 0; b.sX = 0; b.sY = 0; b.sW = 0;
    const m = MAT[b.mat]; b.cap = 0;
    if (S.lv.stress && m.stress && !b.prop && !b.frag && !b.base && !b.beam && !b.deco) b.cap = Math.max(b.sAcc / k * (b.sk || m.stress), b.mass * GRAV * 1.2 + 60);
    b.sAcc = 0;
  }
  // 吊殿的鐵鍊（stay）餘裕少：上面那間殿砸下來壓在這間上，它就繃斷
  // 麻繩（索橋）一被扯緊就斷：一棟倒了，不會把另一棟整個拖下去（只會晃一下）
  for (const r of S.ropes) r.tmax = Math.max(r.t0 * (r.tag === 'stay' ? 2.6 : r.kind === 'chain' ? 4.2 : 2.5), r.kind === 'chain' ? 1800 : r.hang ? 700 : 420);
}
function stressStep(dt, act) {
  const credit = S.phase === 'hazard' ? 2 : S.turn;
  for (const b of S.blocks) {
    if (b.dead) continue;
    if (b.cap && !b.inPlace) { b.cap = 0; b.sT = 0; }          // 已經掉下來的不再算超載（地上的碎構件不會一直嘎吱、一直給人集氣）
    if (!b.cap) { b.sJ = 0; b.sW = 0; continue; }
    if (b.body.isAwake()) {
      b.sL += (b.sJ / dt - b.sL) * 0.25;
      if (b.seg && b.sW > 0) { const k = b.sPx ? 0.25 : 1; b.sPx += (b.sX / b.sW - b.sPx) * k; b.sPy += (b.sY / b.sW - b.sPy) * k; }
    }
    b.sJ = 0; b.sX = 0; b.sY = 0; b.sW = 0;
    if (!act) continue;
    // 已經裂了的撐得比較少（長樑、樓板看最弱的那一段）
    const cap = b.cap * (0.35 + 0.65 * Math.max(0, b.seg ? (b.low === undefined ? 1 : b.low) : b.hp / b.hm));
    if (b.sL > cap) {
      b.sT += dt; S.chainT = S.time;          // 還在嘎吱：回合先別結束
      if (b.sT > 0.22) {
        const k = Math.min(2.5, b.sL / cap - 0.8) * dt, by = b.side === credit ? 2 : credit;
        // 長樑、樓板：從受力最集中的那一段斷（懸臂樑插進岩壁的那一截、只剩一根柱子撐著的那一頭），不是整根一起碎
        if (b.seg) blockHurt(b, b.segM * 1.3 * k, K_CRUSH, by, b.sPx, b.sPy); else blockHurt(b, b.hm * 0.55 * k, K_CRUSH, by);
        b.creak = (b.creak || 0) - dt; if (b.creak <= 0 && !b.dead) { b.creak = 0.45; const p = b.seg ? { x: b.sPx, y: b.sPy } : b.body.getPosition(); ev('creak', p.x, p.y + (b.seg ? 0 : b.h * 0.3), b.mat, b.sL / cap); }
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
      if (r.j) { r.tens = ropeTension(r.j, 1 / dt); if (act && r.tens > r.tmax) { r.over += dt; if (r.over > (r.tag === 'stay' ? 0.35 : r.kind === 'rope' && !r.hang ? 0.04 : 0.12)) { ropeCut(r, S.phase === 'hazard' ? 2 : S.turn, K_CRUSH, false); continue; } } else r.over = Math.max(0, r.over - dt); }
      if (r.burn > 0 && act) { r.burn -= dt; r.hp -= 7 * dt; if (r.hp <= 0) ropeCut(r, S.turn === r.side ? 2 : S.turn, K_FIRE, false); }
    }
  }
  if (S.lv.stress) stressStep(dt, act);
  boulderStep(dt);
  // 琉璃碎片：一會兒就化成亮晶晶的粉，不會滿地都是
  for (const b of S.blocks) if (!b.dead && b.frag && b.mat === M_GLASS) { b.age = (b.age || 0) + dt; if (b.age > 2.2) { const p = b.body.getPosition(); ev('glint', p.x, p.y); blockKill(b, 2, K_CRUSH, true); } }
  if (S.pins.length) pinStep(dt, act);
  for (const o of S.pivots) if (o.b && !o.b.dead) {
    const a = o.b.body.getAngle(), w = o.b.body.getAngularVelocity();
    // 瞄準的時候天秤卡死。轉軸是「靜摩擦大、動摩擦小」：一旦開始翻（歪了快兩度），摩擦只剩三成，一路翻到底
    if (o.tq) o.j.setMaxMotorTorque(!act ? 1e9 : Math.abs(a) > 0.012 && Math.abs(w) > 0.004 ? o.tq * 0.3 : o.tq);
    // 大樑開始翻：嘎——的一聲（一次翻動只響一次）
    if (Math.abs(w) > 0.01 && act) S.chainT = S.time;          // 還在翻：回合先別結束
    if (Math.abs(w) > 0.25 && !o.tip && act) { o.tip = 1; ev('tilt', o.x, o.y, w); }
    else if (Math.abs(w) < 0.05) o.tip = 0;
    o.ang = a;
  }
  // 吊著的東西：吊它的那塊垮了（屋頂、樓板掉下來），它也是砸下去的
  for (const r of S.ropes) if (!r.cut && r.hang && !r.hang.dead && !r.hang.hangFree) { const top = r.a; if (top && (top.dead || !top.inPlace)) r.hang.hangFree = 1; }
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
