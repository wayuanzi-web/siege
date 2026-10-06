/* ===== 45-phys: 物理世界。城樓的每一塊磚都是獨立的剛體，用 planck.js（Box2D 的 JavaScript 版）算碰撞、堆疊、倒塌 ===== */
const PL = planck;
// 世界單位直接當公尺用（一格磚 3.4）。東西比 Box2D 預設的大、重力也大，所以把「多慢算靜止」放寬一點
PL.Settings.linearSleepTolerance = 0.09; PL.Settings.angularSleepTolerance = 0.07; PL.Settings.timeToSleep = 0.4;
const CAT_TERR = 1, CAT_BLOCK = 2, CAT_UNIT = 4;
const UNIT_W = 2.2, UNIT_H = 3.0, UNIT_DEN = 1.6;          // 兵的身體（一個不會倒的長方形）
const UKB_K = 0.3, UKB_V = 9;                              // 爆炸推兵的力道：佔推磚力道的幾成、最多把兵推到多快（太大的話一炸就飛出城，沒得打）
const IMP_GATE = 3.5;        // 兩個東西靠近的速度超過這個才算「撞擊」
const IMP_V0 = 9, IMP_K = 0.9;          // 磚：撞擊造成的速度變化超過 V0 的部分 × K × 脆度 = 傷害
const UIMP_V0 = 11, UIMP_K = 2.3;       // 兵：摔下來、被砸到都很痛
const DV_MAX = 24;           // 爆炸最多把一塊磚加速到多快
const FRAG_MAX = 56;         // 場上最多留幾塊碎塊（超過就直接碎成粉）
const FRAG_KEEP = 34;        // 每回合結束時，最舊的碎塊清到剩這麼多
const PH = { world: null, ground: null, stamp: 0, stepId: 0, imp: [], impN: 0, inStep: false, kill: [], found: [], wm: null, ek: 0, ex: 0, ey: 0 };

/* ---------- 地面 ---------- */
// 不管有沒有地面的高度（畫圖也用這個）
function groundYRaw(x) {
  const p = S.gpts; if (!p) return 0;
  if (x <= p[0][0]) return p[0][1];
  const n = p.length; if (x >= p[n - 1][0]) return p[n - 1][1];
  for (let i = 1; i < n; i++) if (x <= p[i][0]) { const a = p[i - 1], b = p[i]; return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); }
  return 0;
}
// 沒有地面的地方回傳 -999
function groundY(x) {
  const v = S.voids;
  if (v) for (let i = 0; i < v.length; i++) if (x > v[i][0] && x < v[i][1]) return -999;
  return groundYRaw(x);
}
function terrainRuns() {
  const x0 = -80, x1 = VIEW_W + 80, out = []; let a = x0;
  const v = (S.voids || []).slice().sort((p, q) => p[0] - q[0]);
  for (const [va, vb] of v) { if (va > a) out.push([a, va]); a = Math.max(a, vb); }
  if (a < x1) out.push([a, x1]);
  return out;
}

/* ---------- 建立世界 ---------- */
function physNew() {
  const world = new PL.World({ gravity: { x: 0, y: -GRAV }, allowSleep: true });
  PH.world = world; PH.imp.length = 0; PH.impN = 0; PH.kill.length = 0; PH.stepId = 0; PH.inStep = false;
  const g = world.createBody({ type: 'static' }); PH.ground = g;
  for (const [xa, xb] of terrainRuns()) {
    const pts = [{ x: xa, y: -120 }, { x: xa, y: groundYRaw(xa) }];
    for (const p of (S.gpts || [])) if (p[0] > xa + 0.05 && p[0] < xb - 0.05) pts.push({ x: p[0], y: p[1] });
    pts.push({ x: xb, y: groundYRaw(xb) }, { x: xb, y: -120 });
    g.createFixture({ shape: new PL.Chain(pts, false), friction: 0.85, restitution: 0, filterCategoryBits: CAT_TERR });
  }
  // 撞擊：先在求解之前看兩個東西是不是真的在「撞」，求解之後再拿衝量算傷害（疊著不動的不算）
  world.on('pre-solve', (c) => {
    const m = c.getManifold(); if (!m.pointCount) return;
    const A = c.getFixtureA().getBody(), B = c.getFixtureB().getBody(), va = A.getLinearVelocity(), vb = B.getLinearVelocity();
    const dvx = va.x - vb.x, dvy = va.y - vb.y, wa = A.getAngularVelocity(), wb = B.getAngularVelocity();
    if (dvx * dvx + dvy * dvy < IMP_GATE * IMP_GATE && Math.abs(wa) + Math.abs(wb) < 0.6) return;
    const wm = c.getWorldManifold(PH.wm); if (!wm) return; PH.wm = wm;
    const n = wm.normal, p = wm.points[0], ca = A.getWorldCenter(), cb = B.getWorldCenter();
    const ax = va.x - wa * (p.y - ca.y), ay = va.y + wa * (p.x - ca.x), bx = vb.x - wb * (p.y - cb.y), by = vb.y + wb * (p.x - cb.x);
    const vn = (ax - bx) * n.x + (ay - by) * n.y;          // 法線由 A 指向 B，正的表示正在靠近
    if (vn > IMP_GATE) { c._vn = vn; c._vs = PH.stepId; c._px = p.x; c._py = p.y; }
  });
  world.on('post-solve', (c, imp) => {
    if (c._vs !== PH.stepId || !c._vn) return;
    c._vs = -1;
    const ni = imp.normalImpulses; let J = 0; for (let k = 0; k < ni.length; k++) J += ni[k] || 0;
    if (J <= 0) return;
    let r = PH.imp[PH.impN]; if (!r) r = PH.imp[PH.impN] = { a: null, b: null, J: 0, vn: 0, x: 0, y: 0 };
    PH.impN++;
    r.a = c.getFixtureA().getUserData() || null; r.b = c.getFixtureB().getUserData() || null; r.J = J; r.vn = c._vn; r.x = c._px; r.y = c._py;
  });
  return world;
}

/* ---------- 磚 ---------- */
// o: { mat, kind: 'box' | 'roof' | 'ball' | 'poly', x, y（中心）, w, h, il, ir（屋瓦上緣兩邊各縮多少）, r, deco, a 角度,
//      pts 碎塊的頂點（以自己的重心為原點）, frag 是不是碎塊, par 碎塊原本是哪一種磚（畫圖用） }
function mkBlock(st, o) {
  const M = MAT[o.mat], poly = o.kind === 'poly';
  const area = (o.kind === 'ball' ? Math.PI * o.r * o.r : poly ? polyArea(o.pts) : o.w * o.h) / (CS * CS);
  const hm = o.frag ? Math.max(5, M.hp * 0.3 * Math.pow(area, 0.6) * st.hpMul) : M.hp * Math.pow(Math.max(o.prop ? 0.15 : 0.5, area), 0.6) * (o.mat === M_KEG || o.prop ? 1 : st.hpMul);
  const b = {
    isBlock: true, id: S.bid++, st, side: st.side, skin: st.skin, mat: o.mat, kind: o.kind, w: o.w || o.r * 2, h: o.h || o.r * 2, r: o.r || 0, il: o.il || 0, ir: o.ir || 0,
    x0: o.x, y0: o.y, x: o.x, y: o.y, a: o.a || 0, hp: hm, hm, burn: 0, brit: 0, flash: 0, dead: false, inPlace: !o.frag, deco: o.deco || 0,
    vr: ((o.x * 7.3 + o.y * 3.1) | 0) & 255, body: null, mass: 0, stamp: 0, hot: 0, frag: o.frag ? 1 : 0, pts: o.pts || null, par: o.par || null, pcx: o.pcx || 0, pcy: o.pcy || 0, fragged: 0,
    prop: o.prop ? 1 : 0, wt: 1, soot: 0
  };
  const body = PH.world.createBody({ type: 'dynamic', position: { x: o.x, y: o.y }, angle: o.a || 0, awake: !!o.awake, angularDamping: o.frag ? 0.3 : o.kind === 'ball' ? 0.7 : 0.08, userData: b });
  let shape;
  if (o.kind === 'ball') shape = new PL.Circle(o.r);
  else if (o.kind === 'roof') { const hw = o.w / 2, hh = o.h / 2; shape = new PL.Polygon([{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw - b.ir, y: hh }, { x: -hw + b.il, y: hh }]); }
  else if (poly) { const v = []; for (let i = 0; i < o.pts.length; i += 2) v.push({ x: o.pts[i], y: o.pts[i + 1] }); shape = new PL.Polygon(v); }
  else shape = new PL.Box(o.w / 2, o.h / 2);
  body.createFixture({ shape, density: o.den || M.den, friction: M.fr, restitution: 0.02, filterCategoryBits: CAT_BLOCK, userData: b });
  b.body = body; b.mass = body.getMass();
  S.blocks.push(b); st.blocks.push(b);
  if (b.frag) S.nfrag++;
  if (b.kind === 'ball') S.balls.push(b);
  return b;
}

/* ---------- 碎裂：磚被打壞時不是直接消失，而是裂成幾塊，各自繼續掉、繼續撞 ---------- */
// 把一個凸多邊形（[x0, y0, x1, y1, …]）沿著「通過 (px, py)、法線 (nx, ny)」的直線切成兩半
function splitPoly(p, px, py, nx, ny) {
  const a = [], b = [], n = p.length;
  for (let i = 0; i < n; i += 2) {
    const x0 = p[i], y0 = p[i + 1], j = (i + 2) % n, x1 = p[j], y1 = p[j + 1];
    const d0 = (x0 - px) * nx + (y0 - py) * ny, d1 = (x1 - px) * nx + (y1 - py) * ny;
    if (d0 >= 0) a.push(x0, y0);
    if (d0 <= 0) b.push(x0, y0);
    if ((d0 > 0 && d1 < 0) || (d0 < 0 && d1 > 0)) { const t = d0 / (d0 - d1), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; a.push(x, y); b.push(x, y); }
  }
  return [a, b];
}
function polyArea(p) { let s = 0; for (let i = 0, n = p.length; i < n; i += 2) { const j = (i + 2) % n; s += p[i] * p[j + 1] - p[j] * p[i + 1]; } return Math.abs(s) / 2; }
const _pc = [0, 0];
function polyCentroid(p) {
  let s = 0, cx = 0, cy = 0;
  for (let i = 0, n = p.length; i < n; i += 2) { const j = (i + 2) % n, k = p[i] * p[j + 1] - p[j] * p[i + 1]; s += k; cx += (p[i] + p[j]) * k; cy += (p[i + 1] + p[j + 1]) * k; }
  if (Math.abs(s) < 1e-9) { _pc[0] = p[0]; _pc[1] = p[1]; } else { _pc[0] = cx / (3 * s); _pc[1] = cy / (3 * s); }
  return _pc;
}
// 這塊磚的外形（自己的座標，中心是原點）
function blockOutline(b) {
  const hw = b.w / 2, hh = b.h / 2;
  if (b.kind === 'roof') return [-hw, -hh, hw, -hh, hw - b.ir, hh, -hw + b.il, hh];
  return [-hw, -hh, hw, -hh, hw, hh, -hw, hh];
}
function fracture(b, p, ang, vel, om) {
  if (b.frag || b.kind === 'ball' || b.kind === 'poly' || b.mat === M_KEG) return 0;
  const room = FRAG_MAX - S.nfrag; if (room < 2) return 0;
  const area = b.w * b.h / (CS * CS);
  let want = area <= 1.25 ? 2 : area <= 2.6 ? 3 : 4; if (b.mat === M_ICE || b.mat === M_ROOF) want++;
  if (want > room) want = room;
  // 一刀一刀切：每次挑最大的那一塊，橫著它比較長的那一邊切下去（切口歪一點才自然）
  let pcs = [blockOutline(b)];
  for (let k = 1; k < want; k++) {
    let bi = 0, ba = 0; for (let i = 0; i < pcs.length; i++) { const a = polyArea(pcs[i]); if (a > ba) { ba = a; bi = i; } }
    const q = pcs[bi]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < q.length; i += 2) { if (q[i] < x0) x0 = q[i]; if (q[i] > x1) x1 = q[i]; if (q[i + 1] < y0) y0 = q[i + 1]; if (q[i + 1] > y1) y1 = q[i + 1]; }
    const bw = x1 - x0, bh = y1 - y0, c = polyCentroid(q);
    const th = (bw > bh * 1.25 ? 0 : bh > bw * 1.25 ? Math.PI / 2 : rnd() * Math.PI) + (rnd() - 0.5) * 0.9;       // 法線的方向
    const off = Math.min(bw, bh) * 0.16, two = splitPoly(q, c[0] + (rnd() - 0.5) * off, c[1] + (rnd() - 0.5) * off, Math.cos(th), Math.sin(th));
    if (two[0].length < 6 || two[1].length < 6) continue;
    pcs.splice(bi, 1, two[0], two[1]);
  }
  if (pcs.length < 2) return 0;
  const cs = Math.cos(ang), sn = Math.sin(ang), par = { skin: b.skin, mat: b.mat, kind: b.kind, w: b.w, h: b.h, il: b.il, ir: b.ir, deco: b.deco, vr: b.vr, hot: 0 };
  let made = 0;
  for (const q of pcs) {
    if (polyArea(q) < 0.9) continue;
    const c = polyCentroid(q), cx = c[0], cy = c[1], pts = new Array(q.length); let mx = 0, my = 0;
    for (let i = 0; i < q.length; i += 2) { pts[i] = q[i] - cx; pts[i + 1] = q[i + 1] - cy; if (Math.abs(pts[i]) > mx) mx = Math.abs(pts[i]); if (Math.abs(pts[i + 1]) > my) my = Math.abs(pts[i + 1]); }
    const rx = cx * cs - cy * sn, ry = cx * sn + cy * cs;
    const f = mkBlock(b.st, { mat: b.mat, kind: 'poly', pts, x: p.x + rx, y: p.y + ry, a: ang, w: mx * 2, h: my * 2, awake: true, frag: 1, par, pcx: cx, pcy: cy });
    // 跟著原本那塊磚的速度走，再往外彈開一點；被炸碎的話往爆炸的反方向噴
    let vx = vel.x - om * ry, vy = vel.y + om * rx; const rl = Math.hypot(rx, ry) || 1, k = 1.5 + rnd() * 3.5;
    vx += rx / rl * k; vy += ry / rl * k + 1.5;
    if (PH.ek) { const dx = f.body.getPosition().x - PH.ex, dy = f.body.getPosition().y - PH.ey, dl = Math.hypot(dx, dy) || 1, kk = 5 + rnd() * 9; vx += dx / dl * kk; vy += dy / dl * kk + 3; }
    f.body.setLinearVelocity({ x: vx, y: vy }); f.body.setAngularVelocity(om + (rnd() - 0.5) * 7);
    f.burn = b.burn > 0 ? b.burn : 0; if (f.burn > 0) S.nburn++;
    f.brit = b.brit;
    made++;
  }
  return made;
}
// kind: 傷害種類（99 = 整座城垮掉時的連環爆）；clean: true 表示直接消失、不留碎塊（掉出戰場、清場、被炸得太徹底）
function blockKill(b, side, kind, clean) {
  if (b.dead) return;
  if (b.inPlace) chainCount(b);
  b.dead = true; b.inPlace = false; b.hp = 0;
  const p = b.body.getPosition(); b.x = p.x; b.y = p.y; b.a = b.body.getAngle();
  if (b.burn > 0) S.nburn--;
  if (b.frag) S.nfrag--;
  else if (!clean && !PH.inStep) b.fragged = fracture(b, p, b.a, b.body.getLinearVelocity(), b.body.getAngularVelocity());
  ev('cell', b.x, b.y, b.mat, b.side, kind, b);
  if (b.side === 1 && side === 0) S.stat.cells++;
  b.st.ver++;
  if (b.mat === M_KEG) S.pend.push({ t: S.time + 0.1 + rnd() * 0.1, x: b.x, y: b.y, w: WPN.keg, side: side === 0 || side === 1 ? side : 2 });
  if (PH.inStep) PH.kill.push(b.body); else PH.world.destroyBody(b.body);
  b.body = null;
}
// 這一輪又垮了一塊：同一塊磚一輪只算一次，小擺設不算，打的人自己的城也不算
function chainCount(b) {
  if (b.prop || b.frag || b.chV === S.vol || b.side === S.turn || S.phase === 'hazard') return;
  b.chV = S.vol; S.chain++;
}
function blockHurt(b, dmg, kind, side) {
  if (b.dead || dmg <= 0) return;
  let d = dmg * DM[kind][b.mat]; if (b.brit > 0) d *= 1.6;
  if (d <= 0) return;
  const before = b.hp; b.hp -= d; b.flash = 1;
  if (side < 2 && b.side < 2 && b.side !== side && !b.frag) { const T = S.team[side]; T.dealt += Math.min(d, before); T.ult.c = Math.min(T.ult.need, T.ult.c + Math.min(d, before) * T.ult.gain * (b.base ? 0.25 : 1)); }      // 打城基集得慢（城基很厚，不然光打牆腳就能一直放連珠）
  if (b.hp <= 0) blockKill(b, side, kind, -b.hp > b.hm * 0.9);          // 傷害遠遠超過它撐得住的：直接炸成粉
  else if (((before / b.hm) * 3 | 0) !== ((b.hp / b.hm) * 3 | 0)) ev('crack', b.body.getPosition().x, b.body.getPosition().y, b.mat);
}
function ignite(b, dur) {
  if (b.dead || !MAT[b.mat].burn) return;
  if (b.mat === M_KEG) { blockKill(b, 2, K_FIRE); return; }
  if (b.burn <= 0) { S.nburn++; const p = b.body.getPosition(); ev('ignite', p.x, p.y); }
  if (dur > b.burn) b.burn = dur;
}

/* ---------- 兵的身體 ---------- */
function mkUnitBody(u) {
  const big = u.def.big ? MUZ_BIG : 1, w = UNIT_W * big, h = UNIT_H * big;
  u.bw = w; u.bh = h;
  const body = PH.world.createBody({ type: 'dynamic', position: { x: u.x, y: u.y + h / 2 }, fixedRotation: true, awake: false, userData: u });
  body.createFixture({ shape: new PL.Box(w / 2, h / 2), density: UNIT_DEN, friction: 0.9, restitution: 0, filterCategoryBits: CAT_UNIT, userData: u });
  u.body = body; u.mass = body.getMass();
}

/* ---------- 每一步 ---------- */
function physStep(dt) {
  const w = PH.world; PH.stepId++; PH.impN = 0; PH.inStep = true;
  w.step(dt, 8, 3);
  PH.inStep = false;
  for (const b of PH.kill) w.destroyBody(b); PH.kill.length = 0;
  // 圓的東西（木桶、石球）：快要停的時候讓它真的停下來，不然會一直慢慢滾
  for (const b of S.balls) {
    if (b.dead || !b.body.isAwake()) continue;
    const v = b.body.getLinearVelocity(), om = b.body.getAngularVelocity();
    const slow = v.x * v.x + v.y * v.y < 1.4 && Math.abs(om) < 1.0;
    if (slow !== b.slow) { b.slow = slow; b.body.setAngularDamping(slow ? 9 : 0.7); b.body.setLinearDamping(slow ? 3 : 0); }
  }
  // 撞擊傷害（落石階段造成的不算任何一邊的功勞）
  const credit = S.phase === 'hazard' ? 2 : S.turn;
  for (let i = 0; i < PH.impN; i++) {
    const r = PH.imp[i];
    for (let k = 0; k < 2; k++) {
      const o = k ? r.b : r.a; if (!o) continue;
      const dv = r.J / o.mass;
      if (o.isBlock) {
        if (o.dead) continue;
        const d = (dv - IMP_V0) * IMP_K * MAT[o.mat].frag;
        if (d > 0) blockHurt(o, Math.min(d, o.hm * 0.9 + 6), K_CRUSH, o.side === credit ? 2 : credit);
      } else if (o.alive) {
        const d = (dv - UIMP_V0) * UIMP_K;
        if (d > 0) hurtUnit(o, o.def.big ? Math.min(d * 0.4, 40) : Math.min(d, 220), o.side === credit ? 2 : credit, K_CRUSH);       // 魔王皮厚：摔不死，只會痛
      }
    }
    if (r.J > 260 && r.vn > 7) ev('thud', r.x, r.y, r.J, r.vn);
    r.a = r.b = null;
  }
}
// 找出 (x, y) 周圍 R 以內的磚和兵（各只出現一次）
const _qa = { lowerBound: { x: 0, y: 0 }, upperBound: { x: 0, y: 0 } };
function _qcb(f) { const o = f.getUserData(); if (o && o.stamp !== PH.stamp) { o.stamp = PH.stamp; PH.found.push(o); } return true; }
function physQuery(x, y, R) {
  PH.found.length = 0; PH.stamp++;
  _qa.lowerBound.x = x - R; _qa.lowerBound.y = y - R; _qa.upperBound.x = x + R; _qa.upperBound.y = y + R;
  PH.world.queryAABB(_qa, _qcb);
  return PH.found;
}
// 磚上離 (x, y) 最近的點；回傳距離，最近點放在 _cp
const _cp = { x: 0, y: 0 };
function blockDist(b, x, y) {
  const body = b.body, p = body.getPosition(), a = body.getAngle(), c = Math.cos(a), s = Math.sin(a);
  const dx = x - p.x, dy = y - p.y;
  if (b.kind === 'ball') { const d = Math.hypot(dx, dy) || 1e-6; _cp.x = p.x + dx / d * b.r; _cp.y = p.y + dy / d * b.r; return Math.max(0, d - b.r); }
  const lx = dx * c + dy * s, ly = -dx * s + dy * c, hw = b.w / 2, hh = b.h / 2;      // 碎塊用外接的長方形估
  const qx = lx < -hw ? -hw : lx > hw ? hw : lx, qy = ly < -hh ? -hh : ly > hh ? hh : ly;
  _cp.x = p.x + qx * c - qy * s; _cp.y = p.y + qx * s + qy * c;
  return Math.hypot(lx - qx, ly - qy);
}
// 砲彈走一小段：碰到什麼？回傳 0 沒碰到、1 地面、2 磚、3 兵；碰到的東西在 RAY.o，位置在 RAY.x/y
const RAY = { hit: 0, o: null, x: 0, y: 0, f: 1, side: 0, own: false, units: true };
const _r1 = { x: 0, y: 0 }, _r2 = { x: 0, y: 0 };
function _rcb(fixture, point, normal, fraction) {
  const o = fixture.getUserData();
  if (o) {
    if (o.isBlock) { if (RAY.own && (o.side === RAY.side || o.frag || o.st.loose)) return -1; }      // 還沒出城：自己的磚、掉進城裡的碎塊和落石都不擋
    else { if (!RAY.units || o.side === RAY.side || !o.alive) return -1; }
  }
  RAY.hit = o ? (o.isBlock ? 2 : 3) : 1; RAY.o = o; RAY.x = point.x; RAY.y = point.y; RAY.f = fraction;
  return fraction;                                           // 把射線截短，最後留下來的就是最近的
}
function rayShot(x0, y0, x1, y1, side, own) {
  RAY.hit = 0; RAY.o = null; RAY.side = side; RAY.own = own; RAY.f = 1;
  _r1.x = x0; _r1.y = y0; _r2.x = x1; _r2.y = y1;
  if (x0 === x1 && y0 === y1) return 0;
  PH.world.rayCast(_r1, _r2, _rcb);
  return RAY.hit;
}

/* ---------- 爆炸 ---------- */
// hit: 直接打中的東西（磚或兵），vx/vy: 砲彈當時的方向
function physExplode(x, y, w, side, mass, flag, hit, vx, vy) {
  const T = side < 2 ? S.team[side] : null, kind = w.kind;
  const fire = kind === K_FIRE || (flag & F_FIRE) !== 0;
  const mul = (T ? T.dmg * S.rage : 1) * mass * ((flag & F_FIRE) && kind !== K_FIRE ? 1.5 : 1);        // S.rage：拖太久之後雙方的砲火加重
  const dmg = w.dmg * mul, ud = w.ud * mul, Jw = w.J * Math.pow(mass, 0.8) * (T ? Math.sqrt(T.dmg) : 1);
  const r = w.r * (mass > 1 ? Math.min(1.4, Math.sqrt(mass)) : 1);
  const sp = Math.hypot(vx || 0, vy || 0) || 1, ux = (vx || 0) / sp, uy = (vy || -1) / sp;
  if (r <= 0) {
    // 穿刺：只打中的那一個
    if (hit && hit.isBlock && !hit.dead) { const b = hit; if (b.body) b.body.applyLinearImpulse({ x: ux * Math.min(Jw, b.mass * 12), y: uy * Math.min(Jw, b.mass * 12) }, { x, y }, true); blockHurt(b, dmg, kind, side); }
    else if (hit && hit.alive) { hurtUnit(hit, ud, side, kind); if (hit.body) hit.body.applyLinearImpulse({ x: ux * 20, y: uy * 20 + 8 }, hit.body.getWorldCenter(), true); }
    ev('boom', x, y, 0, w.i, side, mass + ((flag & F_FIRE) ? 100 : 0));
    return;
  }
  const list = physQuery(x, y, r + 1), n = list.length;
  PH.ek = 1; PH.ex = x; PH.ey = y;
  for (let i = 0; i < n; i++) {
    const o = list[i];
    if (o.isBlock) {
      if (o.dead) continue;
      const d = blockDist(o, x, y); let f = o === hit ? 1 : 1 - d / r; if (f <= 0) continue; if (f > 1) f = 1;
      // 推：從爆炸中心往外，作用在最近的那一點（所以磚會轉）
      const p = o.body.getPosition(); let nx = _cp.x - x, ny = _cp.y - y, nl = Math.hypot(nx, ny);
      if (nl < 0.3) { nx = p.x - x; ny = p.y - y; nl = Math.hypot(nx, ny); if (nl < 0.05) { nx = ux; ny = uy; nl = 1; } }
      // 一輪很多發接連炸在同一塊磚上：已經被推到多快，就少推多少（不然幾十發小砲彈能把石磚加速到像子彈一樣）
      const bv = o.body.getLinearVelocity(), along = Math.max(0, (bv.x * nx + bv.y * ny) / nl);
      const j = Math.min(Jw * f, o.mass * Math.max(0, (o.mat === M_KEG ? 10 : DV_MAX) - along));          // 火藥桶很沉，不會被震得到處飛
      o.body.applyLinearImpulse({ x: nx / nl * j, y: ny / nl * j + j * 0.22 }, { x: _cp.x, y: _cp.y }, true);
      if (o.mat === M_KEG && w.id === 'keg') { blockKill(o, side, kind); continue; }           // 火藥桶被另一桶炸到：一定跟著爆
      if (fire && MAT[o.mat].burn && (o.mat === M_KEG ? f > 0.5 : rnd() < 0.3 + 0.6 * f)) ignite(o, 3 + rnd() * 2);       // 火藥桶要夠近才點得著（隔著一道牆點不到）
      if (kind === K_ICE) o.brit = 2; else if (kind !== K_ZAP && o.soot < 1) o.soot = Math.min(1, o.soot + f * (fire ? 0.6 : 0.4) * Math.min(1, mass + 0.3));
      if (o.mat === M_KEG && o !== hit && f <= 0.5) continue;                                   // 火藥桶：隔著一層樓板震不爆，要直接打中或炸在旁邊
      blockHurt(o, o === hit ? dmg : dmg * 0.6 * f, kind, side);
    } else if (o.alive) {
      if (o.side === side) continue;                          // 自己的砲不傷自己的兵
      const bp = o.body.getPosition(), dx = bp.x - x, dy = bp.y - y, d = Math.hypot(dx, dy);
      let f = o === hit ? 1 : 1 - Math.max(0, d - 1.3) / r; if (f <= 0) continue; if (f > 1) f = 1;
      // 推兵：一輪幾十發小砲彈接連炸在旁邊，力道不能一直疊上去（不然人會像砲彈一樣飛出城）。已經被推到多快，就少推多少
      const dl = d || 1, ov = o.body.getLinearVelocity(), along = (ov.x * dx + ov.y * dy) / dl;
      const j = Math.min(Jw * UKB_K * f, o.mass * Math.max(0, UKB_V - Math.max(0, along)));
      if (j > 0) o.body.applyLinearImpulse({ x: dx / dl * j, y: dy / dl * j + j * 0.3 }, o.body.getWorldCenter(), true);
      if (kind === K_ICE) { o.frozen = Math.max(o.frozen, 1); o.dazed = 1; ev('freeze', bp.x, bp.y, o.side); }
      hurtUnit(o, o === hit ? ud : ud * 0.7 * f, side, kind);
    }
  }
  PH.ek = 0;
  // 飛在天上的東西（氣球、光球）
  for (const o of S.objs) {
    if ((o.t !== 'balloon' && o.t !== 'orb') || o.side === side || o.hp <= 0) continue;
    const dx = o.x - x, dy = o.y - y; if (dx * dx + dy * dy < (r + o.r) * (r + o.r)) { o.hp -= dmg * 0.6; o.flash = 1; }
  }
  if (kind === K_ZAP) lightning(x, y, mul, side);
  ev('boom', x, y, r, w.i, side, mass + ((flag & F_FIRE) ? 100 : 0));
}
// 雷：從天上往下劈，最上面三塊磚各吃一次傷害，鐵甲加倍，附近的兵被電暈（下一輪不能開火）
const _lz = [];
function lightning(x, y, mul, side) {
  _lz.length = 0;
  PH.world.rayCast({ x, y: 78 }, { x, y: -12 }, (f, p) => { const o = f.getUserData(); if (o && o.isBlock && !o.dead && o.side !== side) _lz.push({ o, y: p.y }); return 1; });
  _lz.sort((a, b) => b.y - a.y);
  let low = y, n = 0;
  for (const h of _lz) { if (n >= 3) break; if (h.o.dead) continue; n++; low = Math.min(low, h.y); blockHurt(h.o, 15 * mul, K_ZAP, side); if (h.o.mat === M_IRON) ev('spark', x, h.y); }
  for (const u of S.units) if (u.alive && u.side !== side && Math.abs(u.x - x) < 2.6 && u.y + 3 > low - 4) { hurtUnit(u, 9 * mul, side, K_ZAP); if (u.alive) { u.stun = Math.max(u.stun, 1); u.dazed = 1; } }
  ev('zap', x, n ? low : groundY(x) > -100 ? groundY(x) : -9, 78, n ? 1 : 0);
}
