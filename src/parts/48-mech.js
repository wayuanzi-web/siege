/* ===== 48-mech: 第二篇的機關 — 繩索與鐵鍊、吊著的東西、天秤的支點、河水、超載、投石兵的大石頭、琉璃 =====
   都是照物理算的：繩子只會拉不會推、太重會繃斷；吊鐘、石籃是真的重物；天秤靠支點的摩擦撐著，重量偏太多才會翻；
   河水把木頭浮起來沖走；柱子撐的重量超過開場時的好幾倍，就會嘎吱作響、裂開、斷掉。 */

/* ---------- 藍圖座標 → 戰場座標 ---------- */
// at：[欄, 由上往下第幾列, 格子裡的位置 fx（0 左、1 右）, fy（0 下、1 上）]，照藍圖寫的方向（敵城會左右鏡射）
// （蓋在浮島、船上的城：照那一塊現在的位置和角度換算）
function cellPt(st, at) {
  const col = at[0], row = at[1], fx = at[2] === undefined ? 0.5 : at[2], fy = at[3] === undefined ? 0.5 : at[3];
  const cy = st.rows - 1 - row, mx = st.mirror ? st.cols - 1 - col : col, ux = st.mirror ? 1 - fx : fx;
  const x = st.x0 + (mx + ux) * CS, y = st.y0 + (cy + fy) * CS;
  if (st.plat && st.plat.body) { const q = platWorld(st, x, y); return { x: q.x, y: q.y, cx: mx, cy }; }
  return { x, y, cx: mx, cy };
}
/* ---------- 浮島、船：整座城跟著底下那一塊一起動 ----------
   城樓的磚記的是蓋好時的位置（那時浮島、船在原位）。之後要比「還在不在原位」、兵「是不是被轟出城」，
   先把現在的位置換回浮島、船自己的座標（platLocal）；反過來，藍圖上某一格現在在哪裡用 platWorld */
const _pl = { x: 0, y: 0 };
function platLocal(st, x, y) {
  const P = st && st.plat; if (!P || !P.body) { _pl.x = x; _pl.y = y; return _pl; }
  const p = P.body.getPosition(), a = P.body.getAngle() - P.a0, c = Math.cos(a), s = Math.sin(a), dx = x - p.x, dy = y - p.y;
  _pl.x = P.x0 + dx * c + dy * s; _pl.y = P.y0 - dx * s + dy * c; return _pl;
}
function platWorld(st, x, y) {
  const P = st && st.plat; if (!P || !P.body) { _pl.x = x; _pl.y = y; return _pl; }
  const p = P.body.getPosition(), a = P.body.getAngle() - P.a0, c = Math.cos(a), s = Math.sin(a), dx = x - P.x0, dy = y - P.y0;
  _pl.x = p.x + dx * c - dy * s; _pl.y = p.y + dx * s + dy * c; return _pl;
}
// 一座城現在的中心（護城罩、光球瞄準用）
const _sc = { x: 0, y: 0 };
function stCenter(st) { const q = platWorld(st, st.cx, st.y0 + st.h * 0.42); _sc.x = q.x; _sc.y = q.y; return _sc; }
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
const CHAIN_DM = [0.8, 0.45, 1.25, 0.25, 0.4, 3.2, 0, 1.0];    // 鐵鍊：箭射不太動，重砲、雷、大石頭才打得斷
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
// 第一回合（敵軍的第一輪）：我方的機關（繩索、鐵鍊、氣球、船艙、引信、擋滾石的木樁）還有護符護著，敵軍打不壞。
// 第二回合起就沒有了（開場不會還沒打就先被敵軍一輪打斷要害）
function guard1(victim, side) { return S.round <= 1 && victim === 0 && side === 1 && !!S.lv.foe.open; }
function ropeHurt(r, d, kind, side) {
  if (r.cut || d <= 0 || guard1(r.side, side)) return;
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
// 轉軸的摩擦（hold）是「比較重的那籃配重的力矩」的幾倍：hold 比 1 大的話，少一籃配重還差一點點（嘎——一聲、晃一下），
// 那一頭再掉幾塊磚、死一個兵就翻；hold 比 1 小，少一籃就翻
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
    ref = Math.max(ref, bal.mass * Math.abs(arm));            // 兩籃配重哪一籃比較重，摩擦就照那一籃算：少了任何一籃都還差一點才會翻
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
    if (S.plats.length) platForces();
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
    if (!b.bFly) { b.bpx = undefined; continue; }
    // 飛過對方的繩子、鐵鍊：大石頭一路砸斷（每一條只算一次）
    if (b.bpx !== undefined && S.ropes.length) { const rc = ropeCross(b.bpx, b.bpy, p.x, p.y, b.bSide); if (rc && !(b.bRope && b.bRope.has(rc.r))) { (b.bRope || (b.bRope = new Set())).add(rc.r); ropeHurt(rc.r, b.bW.dmg * b.bMul * 1.25, K_HEAVY, b.bSide); } }
    b.bpx = p.x; b.bpy = p.y;
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
  if (S.plats.length) platStep(dt, act);
  // 崩下來的冰棚、積雪：掉得快的時候整塊的重量砸上去（跟滾石一樣），砸穿屋頂、把人埋掉
  if (S.lv.snow) for (let k = 0; k < 2; k++) for (const b of S.st[k].blocks) {
    if (b.dead || !(b.snow || b.noCalm)) continue;
    const v = b.body.getLinearVelocity(), sp = v.x * v.x + v.y * v.y, fast = act && sp > (b.snow ? 49 : 30) && !b.inPlace;
    if (fast && !b.smash) b.smashBy = b.side === S.turn || S.phase === 'hazard' ? 2 : S.turn;
    b.smash = fast ? 1 : 0;
  }
  if (S.rollers.length) rollersStep();
  if (S.bell) bellStep(dt, act);
  fuseStep(dt, act);
  // 琉璃碎片：一會兒就化成亮晶晶的粉，不會滿地都是
  for (const b of S.blocks) if (!b.dead && b.frag && (b.mat === M_GLASS || b.mat === M_SNOW)) { b.age = (b.age || 0) + dt; if (b.age > (b.mat === M_SNOW ? 6 : 2.2)) { const p = b.body.getPosition(); ev(b.mat === M_SNOW ? 'snowpuff' : 'glint', p.x, p.y); blockKill(b, 2, K_CRUSH, true); } }
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
  for (const b of S.mech.blocks) {
    if (b.dead || !b.roll || !b.roll.go || b.smash) continue;
    const p = b.body.getPosition(); let inC = false;
    for (let s = 0; s < 2; s++) { const st = S.st[s]; if (p.x > st.x0 - 1 && p.x < st.x1 + 1) inC = true; }
    if (!inC) blockKill(b, 2, K_CRUSH, true);
  }
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

/* ---------- 浮島與戰船（藍圖裡的 R、B）：整片連成一個會動的大塊，城樓蓋在上面 ----------
   浮島：一整塊岩石，用幾顆氣球的繩子吊著（繩子是有彈性的：少一顆氣球，那一頭就往下沉一點；同一頭的都破了，整座島歪下去）。
   戰船：船身分成幾個船艙，每一艙泡在水裡的部分有浮力（照泡進去的面積算）；船艙被打穿就進水，進了水的那一艙浮力變小，
   那一頭就往下沉。船用一條看不見的錨鍊拉著，不會漂走 */
const SHIP_DEN = 1.7;          // 船身的密度（底下壓了石頭當壓艙：重心低，船才不會一歪就翻）
const ISLE_DEN = 1.1;          // 浮島岩石的密度
const FLOOD_K = 0.6;           // 一個船艙進滿了水，那一艙的浮力少掉幾成
const TETHER_S0 = 2.4;         // 氣球繩子在開場時被拉長了多少（越大，少一顆氣球時那一頭沉得越多）
function mkPlat(st, cells, ch, def) {
  const mir = st.mirror, cols = st.cols; let xa = 1e9, xb = -1e9, ya = 1e9, yb = -1e9; const cw = [];
  for (let i = 0; i < cells.length; i += 2) {
    const cx = cells[i], cy = cells[i + 1], mx = mir ? cols - 1 - cx : cx;
    cw.push(mx, cy); st.cellK[cy * cols + mx] = 3;
    xa = Math.min(xa, st.x0 + mx * CS); xb = Math.max(xb, st.x0 + (mx + 1) * CS); ya = Math.min(ya, st.y0 + cy * CS); yb = Math.max(yb, st.y0 + (cy + 1) * CS);
  }
  const ox = (xa + xb) / 2, oy = (ya + yb) / 2, ship = ch === 'B';
  const body = PH.world.createBody({ type: 'dynamic', position: { x: ox, y: oy }, awake: false, angularDamping: ship ? 0.4 : 0.9, linearDamping: ship ? 0.05 : 0.35 });
  const P = { st, kind: ship ? 'ship' : 'island', body, x0: ox, y0: oy, a0: 0, cells: cw, comps: null, teth: [], kb: 0, M: 0, dead: false, xa, xb, ya, yb };
  const has = new Set(); for (let i = 0; i < cw.length; i += 2) has.add(cw[i] + ',' + cw[i + 1]);
  if (!ship) {
    P.tag = { isRock: true, isPlat: true, st, side: st.side, plat: P };
    for (let cy = 0; cy < st.rows; cy++) for (let cx = 0; cx < cols; cx++) {
      if (!has.has(cx + ',' + cy) || has.has((cx - 1) + ',' + cy)) continue;
      let k = 1; while (has.has((cx + k) + ',' + cy)) k++;
      body.createFixture({ shape: new PL.Box(k * CS / 2, CS / 2, { x: st.x0 + (cx + k / 2) * CS - ox, y: st.y0 + (cy + 0.5) * CS - oy }, 0), density: ISLE_DEN, friction: 0.85, restitution: 0, filterCategoryBits: CAT_TERR, userData: P.tag });
    }
  } else {
    // 船身：B 那幾格的外框（凸包）切成幾個船艙
    const pts = [];
    for (let i = 0; i < cw.length; i += 2) { const x = st.x0 + cw[i] * CS - ox, y = st.y0 + cw[i + 1] * CS - oy; pts.push([x, y], [x + CS, y], [x, y + CS], [x + CS, y + CS]); }
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
    for (const q of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    const hull = lo.slice(0, -1).concat(hi.slice(0, -1)), flat = []; for (const q of hull) flat.push(q[0], q[1]);
    P.hull = flat;
    const n = (def.ship && def.ship.comps) || 3, w = xb - xa; let rest = flat; P.comps = [];
    for (let k = 0; k < n; k++) {
      let piece = rest;
      if (k < n - 1) { const cut = xa - ox + w * (k + 1) / n, two = splitPoly(rest, cut, 0, 1, 0); piece = two[1]; rest = two[0]; }
      const v = []; for (let i = 0; i < piece.length; i += 2) v.push({ x: piece[i], y: piece[i + 1] });
      const hm = (def.ship && def.ship.hp || 150) * st.hpMul;
      const c = { isRock: true, isHull: true, st, side: st.side, plat: P, k, hp: hm, hm, flood: 0, flash: 0, pts: piece, fix: null, area: polyArea(piece), sub: 0, leak: 0 };
      c.fix = body.createFixture({ shape: new PL.Polygon(v), density: SHIP_DEN, friction: 0.7, restitution: 0, filterCategoryBits: CAT_TERR, userData: c });
      P.comps.push(c);
    }
    // 船頭在哪一邊（正面朝戰場中間）：排在最前面的那一艙
    if (mir) P.comps.reverse();
    P.comps.forEach((c, k) => { c.k = k; c.bow = k === P.comps.length - 1; c.stern = k === 0; });
  }
  st.plat = P; S.plats.push(P);
  return P;
}
// 氣球：綁在浮島上的一點，繩子往上拉到一顆氣球（氣球固定在天上）
function mkTether(st, d) {
  const P = st.plat; if (!P) return null;
  const A = cellPt(st, d.at), lp = P.body.getLocalPoint({ x: A.x, y: A.y });
  const o = { t: 'tether', side: st.side, st, plat: P, lp: { x: lp.x, y: lp.y }, ax: A.x, ay: A.y + d.h, x: A.x, y: A.y + d.h + 2.5, r: 3.1, hp: d.hp * st.hpMul, hm: d.hp * st.hpMul, k: 0, L0: 0, c: 0, flash: 0, cutT: -99, ph: (A.x * 0.37) % TAU, by: -1 };
  P.teth.push(o); S.objs.push(o);
  return o;
}
// 兵都放上去之後才算（simInit 裡呼叫）：整座島（船）連城連兵多重、重心在哪
function platCalib(P) {
  const body = P.body, st = P.st;
  const mass = () => { let M = body.getMass(), mx = M * body.getWorldCenter().x; for (const b of st.blocks) if (!b.dead) { M += b.mass; mx += b.mass * b.body.getWorldCenter().x; } for (const u of st.units) if (u.body) { M += u.mass; mx += u.mass * u.body.getWorldCenter().x; } return [M, mx / M]; };
  let [M, xc] = mass();
  if (P.kind === 'island') {
    // 每顆氣球分到多少重量：照位置分（重心偏哪一邊，那一邊的氣球多吊一點），再把繩子的原長調到剛好撐住
    const T = P.teth, n = T.length; if (!n) return;
    const xs = T.map((o) => body.getWorldPoint(o.lp).x), xbar = xs.reduce((a, b) => a + b, 0) / n, sxx = xs.reduce((a, x) => a + (x - xbar) * (x - xbar), 0) || 1;
    const W = M * GRAV, beta = W * (xc - xbar) / sxx, k = W / n / TETHER_S0;
    T.forEach((o, i) => { const F = W / n + (xs[i] - xbar) * beta, wp = body.getWorldPoint(o.lp); o.k = k; o.L0 = Math.hypot(o.ax - wp.x, o.ay - wp.y) - F / k; o.c = 2 * 0.9 * Math.sqrt(k * M / n); o.F0 = F; });
  } else {
    // 船：先把船頭、船尾壓艙，讓重心跟浮心對齊（船身是平的），再算每一格泡在水裡的面積要給多少浮力
    for (let it = 0; it < 3; it++) {
      let A = 0, ax = 0; for (const c of P.comps) { const q = hullSub(P, c); if (q) { A += q.a; ax += q.a * q.x; } }
      const xb = ax / A, end = xb > xc ? P.comps.reduce((a, c) => (polyCentroidW(P, c) > polyCentroidW(P, a) ? c : a)) : P.comps.reduce((a, c) => (polyCentroidW(P, c) < polyCentroidW(P, a) ? c : a));
      const xe = polyCentroidW(P, end), dm = M * (xb - xc) / (xe - xb);
      if (Math.abs(dm) > 0.5) { end.fix.setDensity(end.fix.getDensity() + dm / end.area); body.resetMassData(); }
      [M, xc] = mass();
    }
    let A = 0; for (const c of P.comps) { const q = hullSub(P, c); if (q) A += q.a; }
    P.kb = M * GRAV / Math.max(1, A);
  }
  P.M = M;
}
function polyCentroidW(P, c) { const q = polyCentroid(c.pts); return P.body.getWorldPoint({ x: q[0], y: q[1] }).x; }
// 一個船艙現在泡在水裡的部分：面積、形心（世界座標）
const _hs = { a: 0, x: 0, y: 0 };
function hullSub(P, c) {
  const W = S.water; if (!W) return null;
  const body = P.body, src = c.pts, n = src.length, w = c.wp || (c.wp = new Array(n));
  let lo = 1e9, hi = -1e9;
  for (let i = 0; i < n; i += 2) { const q = body.getWorldPoint({ x: src[i], y: src[i + 1] }); w[i] = q.x; w[i + 1] = q.y; if (q.y < lo) lo = q.y; if (q.y > hi) hi = q.y; }
  if (lo >= W.y) { c.sub = 0; return null; }
  const below = hi <= W.y ? w : splitPoly(w, 0, W.y, 0, 1)[1];
  if (below.length < 6) { c.sub = 0; return null; }
  const a = polyArea(below), cc = polyCentroid(below);
  c.sub = a; c.top = hi; _hs.a = a; _hs.x = cc[0]; _hs.y = cc[1];
  return _hs;
}
// 每一步（物理之前）：氣球的拉力、船的浮力和錨鍊
function platForces() {
  for (const P of S.plats) {
    if (P.dead || !P.body.isAwake()) continue;
    const body = P.body;
    if (P.kind === 'island') {
      for (const o of P.teth) {
        if (o.hp <= 0) continue;
        const wp = body.getWorldPoint(o.lp), dx = o.ax - wp.x, dy = o.ay - wp.y, d = Math.hypot(dx, dy) || 1;
        if (d <= o.L0) continue;
        const v = body.getLinearVelocityFromWorldPoint(wp), rate = -(v.x * dx + v.y * dy) / d;
        const T = Math.max(0, o.k * (d - o.L0) + o.c * rate);
        body.applyForce({ x: dx / d * T, y: dy / d * T }, wp, false);
      }
    } else {
      for (const c of P.comps) {
        const q = hullSub(P, c); if (!q) continue;
        const pt = { x: q.x, y: q.y }, v = body.getLinearVelocityFromWorldPoint(pt), F = P.kb * q.a * (1 - FLOOD_K * c.flood), cd = P.kb * 0.022 * q.a;
        body.applyForce({ x: -v.x * cd * 0.6, y: F - v.y * cd }, pt, false);
      }
      // 錨鍊：被炸得往旁邊漂，慢慢拉回原位
      const p = body.getPosition(), v = body.getLinearVelocity(), m = body.getMass();
      body.applyForce({ x: -(p.x - P.x0) * m * 0.9 - v.x * m * 1.2, y: 0 }, body.getWorldCenter(), false);
    }
  }
}
// 船艙被打到：船身很厚，可是打穿了就會一直進水
function hullHurt(c, d, kind, side) {
  if (side === c.side || c.hp <= 0 || guard1(c.side, side)) return;
  d *= DM[kind][M_WOOD] * 0.85; if (d <= 0) return;
  const before = c.hp; c.hp = Math.max(0, c.hp - d); c.flash = 1;
  if (side < 2) { const T = S.team[side]; T.dealt += before - c.hp; T.ult.c = Math.min(T.ult.need, T.ult.c + (before - c.hp) * T.ult.gain * ultK(side)); }
  if (before > c.hm * 0.45 && c.hp <= c.hm * 0.45) { const q = polyCentroid(c.pts), w = c.plat.body.getWorldPoint({ x: q[0], y: q[1] }); ev('leak', w.x, w.y, c.side); S.chainT = S.time; if (side < 2 && side !== c.side && S.state === 'play') S.chain += 2; }
}
// 浮島氣球被打破
function tetherPop(o, side) {
  if (o.hp > 0 && o.cutT > 0) return;
  if (guard1(o.side, side)) { o.hp = Math.max(o.hp, o.hm * 0.2); return; }
  o.hp = 0; o.cutT = S.time; o.by = side;
  const P = o.plat; if (P && !P.dead) P.body.setAwake(true);
  ev('tpop', o.x, o.y, o.side);
  S.chainT = S.time; if (side < 2 && side !== o.side && S.state === 'play') S.chain += 3;
}
function platStep(dt, act) {
  for (const P of S.plats) {
    if (P.dead) continue;
    const body = P.body, p = body.getPosition();
    // 掉出戰場（整座島、整艘船沉下去了）
    if (p.y < -48) { PH.world.destroyBody(body); P.dead = true; continue; }
    if (P.kind === 'island') { for (const o of P.teth) { o.flash = Math.max(0, o.flash - dt * 5); if (o.hp <= 0 && o.cutT < 0) tetherPop(o, o.by >= 0 ? o.by : 2); } if (act && body.isAwake() && Math.abs(body.getAngularVelocity()) > 0.02) S.chainT = S.time; continue; }
    // 船艙進水：船身被打得越破，水進得越多；整艙泡到水面下了，就灌滿
    for (const c of P.comps) {
      c.flash = Math.max(0, c.flash - dt * 4);
      if (!act) continue;
      const tgt = clamp((1 - c.hp / c.hm) * 1.35 - 0.2, 0, 1), under = c.sub > c.area * 0.97 ? 1 : 0, goal = Math.max(tgt, under);
      if (c.flood < goal - 0.001) { c.flood = Math.min(goal, c.flood + dt * (under ? 0.35 : 0.2)); body.setAwake(true); S.chainT = S.time; }
    }
    if (act && body.isAwake() && (Math.abs(body.getAngularVelocity()) > 0.015 || Math.abs(body.getLinearVelocity().y) > 0.25)) S.chainT = S.time;
  }
}

/* ---------- 引信（第四關）：一條從塔頂窗口垂到外面的繩子，一路串著每一層的火藥桶 ----------
   火燒到露在外面的那一截（火油兵的火、穿過地火的砲彈），或是火藥桶在旁邊炸開，引信就點著了：
   火從點著的地方往兩頭燒，燒到哪一桶火藥，那一桶就爆 */
const FUSE_R = 1.2;            // 火要燒到離引信頭這麼近才點得著（要瞄得準）
const FUSE_V = 8.5;            // 引信一秒燒多長
function mkFuse(st, d) {
  const xs = [], ys = [], s = [0];
  for (const a of d.pts) { const P = cellPt(st, a); xs.push(P.x); ys.push(P.y); }
  for (let i = 1; i < xs.length; i++) s.push(s[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  const len = s[s.length - 1], F = { st, side: st.side, x: xs, y: ys, s, len, open: d.open || 1, fronts: [], bin: new Uint8Array(Math.ceil(len / 0.25) + 1), kegs: [], by: 2, done: false, lit: 0 };
  for (const b of st.blocks) if (b.mat === M_KEG && !b.prop) { const q = fuseNear(F, b.x0, b.y0, 0); if (q.d < 1.8) { F.kegs.push({ b, s: q.s }); b.fuseKeg = 1; } }
  st.fuse = F;
  return F;
}
// 引信上離 (x, y) 最近的一點；segs 只看前幾段（0 = 整條）
const _fn = { d: 0, s: 0, x: 0, y: 0 };
function fuseNear(F, x, y, segs) {
  _fn.d = 1e9; const n = segs ? Math.min(segs, F.x.length - 1) : F.x.length - 1;
  for (let i = 0; i < n; i++) {
    const d = segDist(x, y, F.x[i], F.y[i], F.x[i + 1], F.y[i + 1]);
    if (d < _fn.d) { _fn.d = d; _fn.x = _sq.x; _fn.y = _sq.y; _fn.s = F.s[i] + Math.hypot(_sq.x - F.x[i], _sq.y - F.y[i]); }
  }
  return _fn;
}
function fusePt(F, s) {
  let i = 0; while (i < F.s.length - 2 && F.s[i + 1] < s) i++;
  const u = clamp((s - F.s[i]) / Math.max(1e-6, F.s[i + 1] - F.s[i]), 0, 1); _pl.x = lerp(F.x[i], F.x[i + 1], u); _pl.y = lerp(F.y[i], F.y[i + 1], u); return _pl;
}
function fuseIgnite(F, s, by) {
  if (F.done || guard1(F.side, by)) return;
  const k = clamp(Math.round(s / 0.25), 0, F.bin.length - 1); if (F.bin[k]) return;
  for (const f of F.fronts) if (Math.abs(f.s - s) < 0.6) return;
  F.fronts.push({ s, d: 1 }, { s, d: -1 }); F.by = by; F.lit++;
  const p = fusePt(F, s); ev('fuse', p.x, p.y, F.side, F.lit);
  S.chainT = S.time;
}
// 爆炸碰到引信：火的爆炸只點得著露在外面的那一截；火藥桶炸開，整條哪裡都點得著
function fuseBlast(x, y, r, fire, keg, side) {
  for (let k = 0; k < 2; k++) {
    const F = S.st[k] && S.st[k].fuse; if (!F || F.done) continue;
    if (keg) { const q = fuseNear(F, x, y, 0); if (q.d < Math.min(4.5, r * 0.7)) fuseIgnite(F, q.s, F.by !== 2 && F.fronts.length ? F.by : side); }
    else if (fire && side !== F.side) { const q = fuseNear(F, x, y, F.open); if (q.d < FUSE_R) fuseIgnite(F, q.s, side); }
  }
}
function fusesBurning() { for (let k = 0; k < 2; k++) { const F = S.st[k] && S.st[k].fuse; if (F && F.fronts.length) return true; } return false; }
function fuseStep(dt, act) {
  for (let k = 0; k < 2; k++) {
    const F = S.st[k] && S.st[k].fuse; if (!F || !F.fronts.length || !act) continue;
    S.chainT = S.time;
    for (const f of F.fronts) {
      const s0 = f.s; f.s = clamp(f.s + f.d * FUSE_V * dt, 0, F.len);
      // 這一段燒過了；前面已經燒過的（另一頭燒過來的火）就停
      const a = Math.round(s0 / 0.25), b = Math.round(f.s / 0.25);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) { if (i < 0 || i >= F.bin.length) continue; if (F.bin[i] && i !== a && Math.abs(i - a) > 1) f.dead = 1; F.bin[i] = 1; }
      for (const kg of F.kegs) if (!kg.boom && (kg.s - s0) * (kg.s - f.s) <= 0) { kg.boom = 1; if (!kg.b.dead) blockKill(kg.b, F.by, K_FIRE); }
      if (f.s <= 0 || f.s >= F.len) f.dead = 1;
    }
    F.fronts = F.fronts.filter((f) => !f.dead);
    if (!F.fronts.length) { let all = true; for (let i = 0; i < F.bin.length; i++) if (!F.bin[i]) { all = false; break; } if (all) F.done = true; }
  }
}

/* ---------- 滾石坡（第二關）：山坡上的大石頭，靠一根木樁擋著 ----------
   木樁是釘死在地上的（不會被推走，只會被打斷）；只有「石頭會往對方滾」的那一邊打得斷它（自己的砲不會去打斷會砸向自己的木樁）。
   木樁一斷，石頭就往下滾，越滾越快，撞上城門、柱子、兵（rolling：撞到什麼都是整顆石頭的重量砸上去）。
   滾下去之後隔幾回合，山坡上又會架好一顆新的 */
const STAKE_HP = 58;
function groundTop(x0, x1) { let y = -999; for (let x = x0; x <= x1 + 1e-6; x += 0.1) y = Math.max(y, groundYRaw(x)); return y; }
function rollerSpawn(R) {
  const d = R.d, st = S.mech;
  let cy = -999; for (let x = d.x - d.r; x <= d.x + d.r + 1e-6; x += 0.05) cy = Math.max(cy, groundYRaw(x) + Math.sqrt(Math.max(0, d.r * d.r - (x - d.x) * (x - d.x))));
  const ball = mkBlock(st, { mat: M_ROCK, kind: 'ball', x: d.x, y: cy + 0.03, r: d.r, den: 4, prop: 1 });
  ball.body.setType('static'); ball.roll = R; ball.hp = ball.hm = 1e6; ball.wt = 0;
  const gw = 1.3, gh = 4.4, gx = d.stake, gy = groundTop(gx - gw / 2, gx + gw / 2);
  const stake = mkBlock(st, { mat: M_WOOD, kind: 'box', x: gx, y: gy + gh / 2 - 0.6, w: gw, h: gh });
  stake.body.setType('static'); stake.stake = R; stake.hp = stake.hm = STAKE_HP * S.team[R.to].hpMul; stake.wt = 0;
  R.ball = ball; R.stake = stake; R.go = false; R.pend = -1; R.n++;
  if (R.n > 1) ev('reroll', d.x, cy, R.to);
}
function rollerRelease(R, by) {
  const b = R.ball; R.go = true; R.goR = S.round; R.by = by; R.pend = -1;
  if (!b || b.dead) return;
  const dir = R.to === 0 ? -1 : 1;
  b.body.setType('dynamic'); b.body.setAwake(true); b.body.setBullet(true); b.body.setAngularDamping(0.05);
  b.body.setLinearVelocity({ x: dir * 5, y: -1 }); b.body.setAngularVelocity(-dir * 5 / b.r);
  b.smash = 1; b.smashBy = by; b.inPlace = false;
  const p = b.body.getPosition(); ev('roll', p.x, p.y, R.to);
  S.chainT = S.time;
}
// 回合開始：滾下去的石頭過了幾回合，山坡上補一顆新的（那個位置要空著）
function rollersRound() {
  for (const R of S.rollers) {
    if (!R.go || S.round - R.goR < (R.d.every || 2)) continue;
    const d = R.d; let clear = true;
    for (const o of physQuery(d.x, groundYRaw(d.x) + d.r, d.r + 1.5)) if ((o.isBlock && !o.dead && o !== R.ball) || (o.isUnit && o.alive)) clear = false;
    if (!clear) continue;
    if (R.ball && !R.ball.dead) { const p = R.ball.body.getPosition(); if (Math.abs(p.x - d.x) < d.r * 2.5) blockKill(R.ball, 2, K_CRUSH, true); }
    rollerSpawn(R);
  }
}
function rollersStep() {
  for (const R of S.rollers) {
    if (!R.go && R.pend >= 0) rollerRelease(R, R.pend);
    const b = R.ball; if (!R.go || !b || b.dead || !b.smash) continue;
    const v = b.body.getLinearVelocity(); if (v.x * v.x + v.y * v.y < 4 && Math.abs(b.body.getAngularVelocity()) < 1) { b.smash = 0; b.body.setBullet(false); b.body.setAngularDamping(0.7); }
  }
}

/* ---------- 大鐘擺（第十一關）：戰場正中間吊著一口大鐘 ----------
   砲彈打在鐘上就把它往對面推；盪過去撞到城，整口鐘的重量砸上去（smash）。
   盪到最高點、開始往回盪的時候阻力變大：回來的那一下很弱，不會反過來撞自己的城，盪幾下就停 */
function bellInit(d) {
  const st = S.mech, y = d.y - d.len - d.h / 2;
  const b = mkBlock(st, { mat: M_IRON, kind: 'bell', x: d.x, y, w: d.w, h: d.h, prop: 1, den: d.den, il: d.w * 0.24, ir: d.w * 0.24 });
  b.hp = b.hm = 1e7; b.wt = 0; b.bigBell = 1; b.smashBy = 2;
  b.body.setAngularDamping(3); b.body.setLinearDamping(0.04);
  const top = { x: d.x, y: y + d.h / 2 - 0.3 };
  const j = PH.world.createJoint(new PL.DistanceJoint({ frequencyHz: 0, dampingRatio: 0 }, PH.ground, b.body, { x: d.x, y: d.y }, top));
  S.bell = { b, j, ax: d.x, ay: d.y, len: d.len, lb: b.body.getLocalPoint(top), damp: false, by: 2, peak: 0, ang: 0 };
}
function bellPush(side) { const B = S.bell; if (!B) return; B.round1 = S.round <= 1 && side === 1 && !!S.lv.foe.open; B.by = side; B.b.smashBy = side; if (B.damp) { B.damp = false; B.b.body.setLinearDamping(0.04); B.b.body.setAngularDamping(3); } }
function bellStep(dt, act) {
  const B = S.bell; if (!B || !B.b.body) return;
  const body = B.b.body, top = body.getWorldPoint(B.lb), v = body.getLinearVelocity(), dx = top.x - B.ax, dy = B.ay - top.y;
  const th = Math.atan2(dx, dy), om = (v.x * Math.cos(th) + v.y * Math.sin(th)) / B.len, sp2 = v.x * v.x + v.y * v.y;
  B.ang = th; B.b.smash = sp2 > 16 ? 1 : 0;
  if (act && sp2 > 2) S.chainT = S.time;
  if (!B.damp && Math.abs(th) > 0.1 && th * om < -0.02) { B.damp = true; body.setLinearDamping(1.7); body.setAngularDamping(5); ev('bellpeak', top.x, top.y); }
  else if (B.damp && sp2 < 0.6 && Math.abs(th) < 0.08) { B.damp = false; body.setLinearDamping(0.04); body.setAngularDamping(3); }
  if (!act && sp2 > 0.01) { body.setLinearVelocity({ x: v.x * 0.9, y: v.y * 0.9 }); }          // 瞄準的時候還沒停：很快停下來（不會在別人瞄準時撞過去）
}
