/* ===== 45-phys: 物理世界。城樓的每一塊磚都是獨立的剛體，用 planck.js（Box2D 的 JavaScript 版）算碰撞、堆疊、倒塌 ===== */
const PL = planck;
// 世界單位直接當公尺用（一格磚 3.4）。東西比 Box2D 預設的大、重力也大，所以把「多慢算靜止」放寬一點
PL.Settings.linearSleepTolerance = 0.09; PL.Settings.angularSleepTolerance = 0.07; PL.Settings.timeToSleep = 0.4;
const CAT_TERR = 1, CAT_BLOCK = 2, CAT_UNIT = 4;
const UNIT_W = 2.2, UNIT_H = 3.0, UNIT_DEN = 1.6;          // 兵的身體有多寬、多高、多重（形狀見 mkUnitBody）
const BOSS_BW = 3.0;                                       // 魔王的肩寬：比一格（3.4）窄，腳下破一格就掉得下去
const UKB_K = 0.3, UKB_V = 9;                              // 爆炸推兵的力道：佔推磚力道的幾成、最多把兵推到多快（太大的話一炸就飛出城，沒得打）
const IMP_GATE = 3.5;        // 兩個東西靠近的速度超過這個才算「撞擊」
const IMP_V0 = 9, IMP_K = 0.9;          // 磚：撞擊造成的速度變化超過 V0 的部分 × K × 脆度 = 傷害
const UIMP_V0 = 11, UIMP_K = 2.3;       // 兵：摔下來、被砸到都很痛
const BOSS_V0 = 10, BOSS_V1 = 2.5;      // 魔王：摔下來的速度超過 V0 才算摔到；重的東西從頭上砸下來，超過 V1 就算
const KEG_V = 12;                       // 火藥桶：撞擊讓它的速度一下子變這麼多就會爆（摔一層樓差不多）
const DV_MAX = 24;           // 爆炸最多把一塊磚加速到多快
const BOX_GAP = 0.02;
const DV_ROCK = 5;           // 大石球、落石很沉：爆炸只推得動一點（腳下的木板被炸穿了，它是直直掉下去，不是被炸飛）
const DV_BIG = 7;            // 還在原位的樓板、長樑、鐵甲：爆炸只能把它整塊震一下（推在重心，不讓它像蹺蹺板一頭翹起、另一頭把自己的牆砸碎）
const FRAG_SHR = typeof process !== 'undefined' && process.env && process.env.FRAG_SHR ? +process.env.FRAG_SHR : 0.74;         // 碎塊比原本那一塊小一圈：磚碎了就撐不住上面的東西，上面的會掉下來、歪掉、滑走（不然碎塊卡在原位，等於沒碎）
const SEG_K = typeof process !== 'undefined' && process.env && process.env.SEG_K ? +process.env.SEG_K : 1.25;            // 長樑、樓板每一段的耐久，是同材質單塊磚的幾倍
const FRAG_MAX = 56;         // 場上最多留幾塊碎塊（超過就直接碎成粉）
const FRAG_KEEP = 34;        // 每回合結束時，最舊的碎塊清到剩這麼多
const PH = { world: null, ground: null, stamp: 0, stepId: 0, imp: [], impN: 0, inStep: false, kill: [], killJ: [], reJ: [], rePin: [], found: [], wm: null, ek: 0, ex: 0, ey: 0 };

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
  PH.world = world; PH.imp.length = 0; PH.impN = 0; PH.kill.length = 0; PH.killJ.length = 0; PH.reJ.length = 0; PH.stepId = 0; PH.inStep = false;
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
    // 懸臂樑（插銷釘在岩壁上的）跟那座城的岩壁不碰撞
    { const oa = A.getUserData(), ob = B.getUserData(); if ((oa && oa.noRock && oa.noRock.rockBody === B) || (ob && ob.noRock && ob.noRock.rockBody === A)) { c.setEnabled(false); return; } }
    // 投石兵的大石頭還在自己城裡：穿過自己的牆和自己的兵（跟砲彈一樣，飛出城才會撞東西）
    { const oa = A.getUserData(), ob = B.getUserData();
      if (oa && oa.bIn && ob && ob.side === oa.bSide && (ob.isUnit || ob.st === S.st[oa.bSide])) { c.setEnabled(false); return; }
      if (ob && ob.bIn && oa && oa.side === ob.bSide && (oa.isUnit || oa.st === S.st[ob.bSide])) { c.setEnabled(false); return; } }
    const dvx = va.x - vb.x, dvy = va.y - vb.y, wa = A.getAngularVelocity(), wb = B.getAngularVelocity();
    if (dvx * dvx + dvy * dvy < IMP_GATE * IMP_GATE && Math.abs(wa) + Math.abs(wb) < 0.6) return;
    const wm = c.getWorldManifold(PH.wm); if (!wm) return; PH.wm = wm;
    const n = wm.normal, p = wm.points[0], ca = A.getWorldCenter(), cb = B.getWorldCenter();
    const ax = va.x - wa * (p.y - ca.y), ay = va.y + wa * (p.x - ca.x), bx = vb.x - wb * (p.y - cb.y), by = vb.y + wb * (p.x - cb.x);
    const vn = (ax - bx) * n.x + (ay - by) * n.y;          // 法線由 A 指向 B，正的表示正在靠近
    if (vn > IMP_GATE) { c._vn = vn; c._vs = PH.stepId; c._px = p.x; c._py = p.y; c._ny = n.y; }
  });
  world.on('post-solve', (c, imp) => {
    /* 壓在兵身上的重量：每一步把磚「往下壓」的力道記在那個兵身上（撐太重、撐太久會被壓扁）。
       只算磚和石球，只算垂直往下的分量：從旁邊橫著擠過來的不算（頭上明明沒東西卻被判壓扁），地面往上頂的當然也不算 */
    const ua = c.getFixtureA().getUserData(), ub = c.getFixtureB().getUserData();
    // 超載（第二篇）：每一塊磚身上所有接觸點的受力加起來（上面壓下來的、下面頂上來的、插在岩壁裡被岩石夾住的）。
    // 跟開場時比：柱子旁邊少了一根，受力變一倍半；懸臂樑外端的鐵鍊斷了，插在岩壁裡的那一頭被夾得特別緊
    if (S.lv && S.lv.stress && ((ua && ua.isBlock) || (ub && ub.isBlock))) {
      const ni = imp.normalImpulses; let J = 0; for (let k = 0; k < ni.length; k++) J += ni[k] || 0;
      if (J > 0) {
        if (ua && ua.isBlock) ua.sJ += J; if (ub && ub.isBlock) ub.sJ += J;
        // 長樑、樓板：記下受力集中在哪裡（撐不住的時候從那一段斷，不是整根一起碎）
        if ((ua && ua.seg) || (ub && ub.seg)) { const wm = c.getWorldManifold(PH.wm); if (wm) { PH.wm = wm; for (let k = 0; k < ni.length; k++) { const q = wm.points[k], j = ni[k] || 0; if (!q || j <= 0) continue; if (ua && ua.seg) { ua.sX += j * q.x; ua.sY += j * q.y; ua.sW += j; } if (ub && ub.seg) { ub.sX += j * q.x; ub.sY += j * q.y; ub.sW += j; } } } }
      }
    }
    if ((ua && ua.isUnit) || (ub && ub.isUnit)) {
      const ni = imp.normalImpulses; let J = 0; for (let k = 0; k < ni.length; k++) J += ni[k] || 0;
      if (J > 0) { const wm = c.getWorldManifold(PH.wm); if (wm) { PH.wm = wm; const ny = wm.normal.y;        // 法線由 A 指向 B
        // 壓下來的是屋瓦：不算重量，記下是哪一片（unitsStep 看它是不是已經掉下來了，是的話讓它碎掉）
        if (ua && ua.isUnit && ua.alive && ub && ub.isBlock && ny > 0.35) { if (ub.mat === M_ROOF && !ub.frag) ua.roofOn = ub; else ua.loadJ += J * ny; }
        if (ub && ub.isUnit && ub.alive && ua && ua.isBlock && ny < -0.35) { if (ua.mat === M_ROOF && !ua.frag) ub.roofOn = ua; else ub.loadJ -= J * ny; } } }
    }
    if (c._vs !== PH.stepId || !c._vn) return;
    c._vs = -1;
    const ni = imp.normalImpulses; let J = 0; for (let k = 0; k < ni.length; k++) J += ni[k] || 0;
    if (J <= 0) return;
    let r = PH.imp[PH.impN]; if (!r) r = PH.imp[PH.impN] = { a: null, b: null, J: 0, vn: 0, x: 0, y: 0, ny: 0 };
    PH.impN++;
    r.a = c.getFixtureA().getUserData() || null; r.b = c.getFixtureB().getUserData() || null; r.J = J; r.vn = c._vn; r.x = c._px; r.y = c._py; r.ny = c._ny || 0;
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
    prop: o.prop ? 1 : 0, wt: 1, soot: 0, sJ: 0, sL: 0, cap: 0, wet: 0, sX: 0, sY: 0, sW: 0, sPx: 0, sPy: 0
  };
  const body = PH.world.createBody({ type: 'dynamic', position: { x: o.x, y: o.y }, angle: o.a || 0, awake: !!o.awake, angularDamping: o.frag ? 0.3 : o.kind === 'ball' ? 0.7 : 0.08, userData: b });
  let shape;
  if (o.kind === 'ball') shape = new PL.Circle(o.r);
  else if (o.kind === 'roof') { const hw = o.w / 2, hh = o.h / 2; shape = new PL.Polygon([{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw - b.ir, y: hh }, { x: -hw + b.il, y: hh }]); }
  else if (o.kind === 'bell') { const hw = o.w / 2, hh = o.h / 2; shape = new PL.Polygon([{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw * 0.62, y: hh * 0.55 }, { x: hw * 0.3, y: hh }, { x: -hw * 0.3, y: hh }, { x: -hw * 0.62, y: hh * 0.55 }]); }
  else if (poly) { const v = []; for (let i = 0; i < o.pts.length; i += 2) v.push({ x: o.pts[i], y: o.pts[i + 1] }); shape = new PL.Polygon(v); }
  else shape = new PL.Box(Math.max(0.2, o.w / 2 - BOX_GAP), o.h / 2);        // 比格子窄一點點：並排的磚才不會角頂著角卡住，該掉的就掉
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
// sec：只碎掉這一段（自己座標裡的外形），沒給就是整塊
function fracture(b, p, ang, vel, om, sec) {
  if (b.frag || b.kind === 'ball' || b.kind === 'poly' || b.mat === M_KEG) return 0;
  const room = FRAG_MAX + (S.state === 'play' ? 0 : 36) - S.nfrag; if (room < 2) return 0;          // 城破、整座垮下來的時候多留一些碎塊在場上
  const area = (sec ? polyArea(sec) : b.w * b.h) / (CS * CS);
  let want = area <= 1.25 ? 2 : area <= 2.6 ? 3 : 4; if (b.mat === M_ICE || b.mat === M_ROOF) want++;
  if (want > room) want = room;
  // 一刀一刀切：每次挑最大的那一塊，橫著它比較長的那一邊切下去（切口歪一點才自然）
  let pcs = [sec || blockOutline(b)];
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
  const cs = Math.cos(ang), sn = Math.sin(ang), par = { skin: b.skin, mat: b.mat, kind: b.kind, w: b.w, h: b.h, il: b.il, ir: b.ir, deco: b.deco, vr: b.vr, hot: 0, seg: b.seg ? 1 : 0 };
  let made = 0;
  for (const q of pcs) {
    if (polyArea(q) < 0.9) continue;
    const c = polyCentroid(q), cx = c[0], cy = c[1], pts = new Array(q.length); let mx = 0, my = 0;
    for (let i = 0; i < q.length; i += 2) { pts[i] = (q[i] - cx) * FRAG_SHR; pts[i + 1] = (q[i + 1] - cy) * FRAG_SHR; if (Math.abs(pts[i]) > mx) mx = Math.abs(pts[i]); if (Math.abs(pts[i + 1]) > my) my = Math.abs(pts[i + 1]); }
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
  if (b.ropes) ropesOff(b, null);
  if (b.pins) pinsOff(b, null);
  if (b.pivot) { b.pivot.b = null; b.pivot = null; }
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
  if (b.prop || b.frag) return;
  S.chainT = S.time;                 // 還在垮：回合先別結束
  if (b.chV === S.vol || b.side === S.turn || S.phase === 'hazard') return;
  b.chV = S.vol; S.chain++;
}
/* ---------- 長樑、樓板：一格一段，各有各的耐久。哪一段被打穿，就從那裡斷開：
   斷掉的那一段碎成幾塊掉下去，剩下的兩截各自變成新的一塊（還撐得住就留在原位，撐不住的自己會垮）。
   所以打掉樓板的一角，只有那一角上面的東西會掉下來；把樑從中間打斷，兩截會各自歪下去，上面堆的東西跟著滑落 ---------- */
function segInit(b) {
  const m = MAT[b.mat].hp * SEG_K * b.st.hpMul;
  b.seg = new Float32Array(b.cw).fill(m); b.segM = m; b.hp = b.hm = m * b.cw;
  b.sootS = new Float32Array(b.cw); b.flashM = 0;                      // 每一段各自被燻得多黑
}
// (x, y) 落在這塊磚的第幾段
function segAt(b, x, y) {
  const p = b.body.getPosition(), a = b.body.getAngle(), lx = (x - p.x) * Math.cos(a) + (y - p.y) * Math.sin(a);
  const k = Math.floor((lx + b.w / 2) / (b.w / b.cw));
  return k < 0 ? 0 : k >= b.cw ? b.cw - 1 : k;
}
function segDmg(b, k, d, side) {
  const before = b.seg[k]; if (before <= 0) return;
  b.seg[k] = before - d; b.flash = 1; b.flashM |= 1 << k;          // flashM：這一下打在哪幾段（畫面上只閃那幾段）
  if (side < 2 && b.side < 2 && b.side !== side) { const T = S.team[side]; T.dealt += Math.min(d, before); T.ult.c = Math.min(T.ult.need, T.ult.c + Math.min(d, before) * T.ult.gain * (b.base ? 0.25 : 1) * ultK(side)); }
}
// 爆炸：每一段照自己離爆炸中心多遠算傷害（direct：這一塊是被直接打中的，最近的那一段吃全額）
function segBlast(b, x, y, r, dmg, kind, side, direct, sootK) {
  let m = DM[kind][b.mat]; if (b.brit > 0) m *= 1.6;
  if (m <= 0) return;
  const p = b.body.getPosition(), a = b.body.getAngle(), cs = Math.cos(a), sn = Math.sin(a);
  const lx = (x - p.x) * cs + (y - p.y) * sn, ly = -(x - p.x) * sn + (y - p.y) * cs, cw = b.w / b.cw, hh = b.h / 2;
  const qy = ly < -hh ? -hh : ly > hh ? hh : ly, near = direct ? segAt(b, x, y) : -1;
  for (let k = 0; k < b.cw; k++) {
    const x0 = -b.w / 2 + k * cw, qx = lx < x0 ? x0 : lx > x0 + cw ? x0 + cw : lx, f = 1 - Math.hypot(lx - qx, ly - qy) / r;
    if (k === near) segDmg(b, k, dmg * m, side); else if (f > 0) segDmg(b, k, dmg * 0.6 * f * m, side);
    if (sootK > 0 && (f > 0 || k === near) && b.sootS[k] < 1) b.sootS[k] = Math.min(1, b.sootS[k] + (k === near ? 1 : f) * sootK);
  }
  segSettle(b, side, kind);
}
// 有哪幾段被打穿了：全穿就整塊碎掉，不然從那幾段斷開
function segSettle(b, side, kind) {
  if (b.dead) return;
  const n = b.cw; let dead = 0, hp = 0, low = 1;
  for (let k = 0; k < n; k++) { const v = b.seg[k]; if (v <= 0) dead++; else { hp += v; if (v / b.segM < low) low = v / b.segM; } }
  if (!dead) { const was = b.low === undefined ? 1 : b.low; b.hp = hp; b.low = low; if (((was * 3) | 0) !== ((low * 3) | 0)) { const p = b.body.getPosition(); ev('crack', p.x, p.y, b.mat); } return; }
  if (dead === n || PH.inStep) { b.hp = 0; blockKill(b, side, kind, false); return; }
  segSplit(b, side, kind);
}
function segSplit(b, side, kind) {
  const st = b.st, n = b.cw, seg = b.seg, cw = b.w / n, hh = b.h / 2, body = b.body, was = b.inPlace;
  const p0 = body.getPosition(), px = p0.x, py = p0.y, ang = body.getAngle(), cs = Math.cos(ang), sn = Math.sin(ang);
  const v0 = body.getLinearVelocity(), vx = v0.x, vy = v0.y, om = body.getAngularVelocity();
  if (was) chainCount(b);
  let j = 0; const pieces = b.ropes || b.pins ? [] : null;
  while (j < n) {
    let e = j; const alive = seg[j] > 0; while (e + 1 < n && (seg[e + 1] > 0) === alive) e++;
    const m = e - j + 1, lx = -b.w / 2 + (j + m / 2) * cw, wx = px + lx * cs, wy = py + lx * sn;
    if (alive) {
      // 還撐得住的一截：變成新的一塊，留在原本的位置、跟著原本的速度
      const c = mkBlock(st, { mat: b.mat, kind: 'box', x: wx, y: wy, w: m * cw, h: b.h, a: ang, awake: true, deco: b.deco });
      c.cx = b.cx + j; c.cy = b.cy; c.cw = m; c.ch = 1; c.x0 = b.x0 + lx; c.y0 = b.y0; c.inPlace = was; c.gone = !was || !!b.gone; c.lost = !was || !!b.lost;       // 已經歪掉的樓板再斷開：斷下來的不會再被算回原位
      c.seg = seg.slice(j, e + 1); c.sootS = b.sootS.slice(j, e + 1); c.flashM = (b.flashM >> j) & ((1 << m) - 1); c.segM = b.segM; c.hm = m * b.segM; let hp = 0, low = 1; for (let k = 0; k < m; k++) { hp += c.seg[k]; if (c.seg[k] / c.segM < low) low = c.seg[k] / c.segM; } c.hp = hp; c.low = low;
      c.base = b.base; c.wt = b.wt; c.brit = b.brit; c.soot = b.soot; c.vr = b.vr; c.flash = 1; c.chV = b.chV;
      if (b.burn > 0) { c.burn = b.burn; c.burnBy = b.burnBy; S.nburn++; }
      c.body.setLinearVelocity({ x: vx - om * lx * sn, y: vy + om * lx * cs }); c.body.setAngularVelocity(om);
      if (st.cellB) for (let k = 0; k < m; k++) { const i = c.cy * st.cols + c.cx + k; if (st.cellB[i] === b) st.cellB[i] = c; }
      if (pieces) pieces.push(c);
    } else {
      // 打穿的那一段：碎成幾塊
      const x0 = -b.w / 2 + j * cw, x1 = x0 + m * cw;
      const made = fracture(b, { x: px, y: py }, ang, { x: vx, y: vy }, om, [x0, -hh, x1, -hh, x1, hh, x0, hh]);
      ev('cell', wx, wy, b.mat, b.side, kind, { skin: b.skin, w: m * cw, h: b.h, a: ang, fragged: made });
      if (b.side === 1 && side === 0) S.stat.cells += m;
      if (st.cellB) for (let k = 0; k < m; k++) { const i = b.cy * st.cols + b.cx + j + k; if (st.cellB[i] === b) st.cellB[i] = null; }
    }
    j = e + 1;
  }
  if (pieces) { ropesOff(b, pieces); pinsOff(b, pieces); }
  if (b.pivot) { b.pivot.b = null; b.pivot = null; }
  b.dead = true; b.inPlace = false; b.hp = 0; b.x = px; b.y = py; b.a = ang;
  if (b.burn > 0) S.nburn--;
  st.ver++;
  PH.world.destroyBody(body); b.body = null;
}
// x, y：打在哪裡（長樑、樓板分段算耐久，要知道打到哪一段；沒給就是整塊一起，例如著火）
function blockHurt(b, dmg, kind, side, x, y) {
  if (b.dead || dmg <= 0) return;
  let d = dmg * DM[kind][b.mat]; if (b.brit > 0) d *= 1.6;
  if (d <= 0) return;
  if (b.seg) {
    if (x === undefined) { for (let k = 0; k < b.cw; k++) segDmg(b, k, d, side); }
    else segDmg(b, segAt(b, x, y), d, side);
    segSettle(b, side, kind);
    return;
  }
  if (b.reso && side < 2 && side !== b.side && b.hp - d < b.hm * 0.55) resonate(b, side);      // 共鳴晶柱：要重重打中（一下去掉快一半）才會共鳴，旁邊擦到不算
  const before = b.hp; b.hp -= d; b.flash = 1;
  if (side < 2 && b.side < 2 && b.side !== side && !b.frag) { const T = S.team[side]; T.dealt += Math.min(d, before); T.ult.c = Math.min(T.ult.need, T.ult.c + Math.min(d, before) * T.ult.gain * (b.base ? 0.25 : 1) * ultK(side)); }      // 打城基集得慢（城基很厚，不然光打牆腳就能一直放連珠）
  if (b.hp <= 0) blockKill(b, side, kind, -b.hp > b.hm * 0.9);          // 傷害遠遠超過它撐得住的：直接炸成粉
  else if (((before / b.hm) * 3 | 0) !== ((b.hp / b.hm) * 3 | 0)) ev('crack', b.body.getPosition().x, b.body.getPosition().y, b.mat);
}
// by：誰放的火（延燒出去、燒到火藥桶，功勞都算他的）
function ignite(b, dur, by) {
  if (b.dead || !MAT[b.mat].burn) return;
  if (by === undefined || by === b.side) by = 2;
  if (b.mat === M_KEG) { blockKill(b, by, K_FIRE); return; }
  if (b.burn <= 0) { S.nburn++; b.burnBy = by; const p = b.body.getPosition(); ev('ignite', p.x, p.y); }
  if (dur > b.burn) b.burn = dur;
}

/* ---------- 兵的身體 ---------- */
function mkUnitBody(u) {
  /* 兵的身體：不會倒的一間「小房子」——兩側是直的、頭頂是尖的、腳底兩角削掉一點。
     兩側直而且很滑：不會被兩塊磚的角架住肩膀、腳懸在半空（腳窄肩寬的形狀會），被夾住也撐不住自己，會滑下去。
     腳底削角：腳下那一格沒了就真的掉下去，不會半個身體懸在外面；魔王比一格窄，腳下的樓板破一格他就摔下去。
     頭頂是斜的、很滑，尖端還稍微偏一邊：砸下來的石球、屋頂、樓板會順著滑到旁邊，不會被他用頭頂著（卡住滑不掉的，就是真的被壓住了）。
     只有鞋底抓得住地（站在歪掉的樓板上，歪得不多不會滑；冰面例外）。
     兵跟兵不互相碰撞：不會踩在別人頭上，也不會互相擠死；疊在一起的時候 unitsStep 會慢慢把他們往兩邊推開 */
  const big = !!u.def.big, w = big ? BOSS_BW : UNIT_W, h = UNIT_H * (big ? MUZ_BIG : 1), hw = w / 2, hh = h / 2;
  u.bw = w; u.bh = h;
  const foot = hw * 0.6, ch = Math.min(0.55, hh * 0.3), sy = hh * 0.4, top = hw * 0.1, lift = 0.06;
  const sole = [{ x: -foot, y: -hh }, { x: foot, y: -hh }, { x: foot, y: -hh + ch }, { x: -foot, y: -hh + ch }];
  const trunk = [{ x: -foot, y: -hh + lift }, { x: foot, y: -hh + lift }, { x: hw, y: -hh + ch }, { x: hw, y: sy }, { x: top, y: hh }, { x: -hw, y: sy }, { x: -hw, y: -hh + ch }];
  const area = 2 * foot * ch + (foot + hw) * (ch - lift) + 2 * hw * (sy + hh - ch) + hw * (hh - sy);
  const den = UNIT_DEN * UNIT_W * UNIT_H * (big ? MUZ_BIG * MUZ_BIG : 1) / area;           // 形狀怎麼改，重量都照舊
  const body = PH.world.createBody({ type: 'dynamic', position: { x: u.x, y: u.y + hh }, fixedRotation: true, awake: false, userData: u });
  const mask = CAT_TERR | CAT_BLOCK;
  body.createFixture({ shape: new PL.Polygon(sole), density: den, friction: 0.9, restitution: 0, filterCategoryBits: CAT_UNIT, filterMaskBits: mask, userData: u });
  body.createFixture({ shape: new PL.Polygon(trunk), density: den, friction: 0.03, restitution: 0, filterCategoryBits: CAT_UNIT, filterMaskBits: mask, userData: u });
  u.body = body; u.mass = body.getMass(); u.loadJ = 0; u.loadT = 0; u.load = 0; u.sepT = 0; u.sepNow = false; u.sepVol = -1; u.edge = 0; u.edgeT = 0; u.edgeV = -1; u.edgeD = 0; u.roofOn = null;
}

/* ---------- 每一步 ---------- */
function physStep(dt) {
  const w = PH.world; PH.stepId++; PH.impN = 0;
  if (S.water) waterForces();
  PH.inStep = true;
  w.step(dt, 8, 3);
  PH.inStep = false;
  for (const j of PH.killJ) w.destroyJoint(j); PH.killJ.length = 0;
  for (const b of PH.kill) w.destroyBody(b); PH.kill.length = 0;
  for (const r of PH.reJ) if (!r.cut && !r.j && (!r.a || r.a.body) && (!r.b || r.b.body)) ropeJoint(r); PH.reJ.length = 0;
  for (const o of PH.rePin) if (!o.broke && !o.j && o.b && o.b.body) pinJoint(o); PH.rePin.length = 0;
  // 圓的東西（木桶、石球）：快要停的時候讓它真的停下來，不然會一直慢慢滾
  for (const b of S.balls) {
    if (b.dead || !b.body.isAwake()) continue;
    const v = b.body.getLinearVelocity(), om = b.body.getAngularVelocity();
    const slow = v.x * v.x + v.y * v.y < 1.4 && Math.abs(om) < 1.0;
    if (slow !== b.slow) { b.slow = slow; b.body.setAngularDamping(slow ? 9 : 0.7); b.body.setLinearDamping(slow ? 3 : 0); }
  }
  /* 快停下來的磚加阻尼，讓它真的停：細高的一疊（鐵甲、冰牆）被震一下會晃個不停、越晃越大，冰磚會一直慢慢滑，
     結果過了十幾秒、輪到別人的時候才倒。還在原位的只管「原地小幅搖晃」的（已經歪出去的不管，該倒就讓它倒）；
     掉下來的碎磚慢到快停就幫它停 */
  for (const b of S.blocks) {
    if (b.dead || b.kind === 'ball') continue;
    const body = b.body; if (!body.isAwake()) continue;
    const v = body.getLinearVelocity(), om = Math.abs(body.getAngularVelocity()), s2 = v.x * v.x + v.y * v.y;
    const calm = b.inPlace ? s2 < 9 && om < 0.35 && Math.abs(body.getAngle()) < 0.1 : s2 < 1.4 && om < 0.5;
    if (calm !== !!b.calm) { b.calm = calm; body.setLinearDamping(calm ? 2.5 : 0); body.setAngularDamping(calm ? 5 : b.frag ? 0.3 : 0.08); }
  }
  // 撞擊傷害（落石階段造成的不算任何一邊的功勞）
  const credit = S.phase === 'hazard' ? 2 : S.turn;
  for (let i = 0; i < PH.impN; i++) {
    const r = PH.imp[i];
    // 吊鐘、吊燈砸下來（吊它的繩子斷了、掛它的那塊垮了，或它自己正往下掉）砸在兵頭上：重的東西整個砸在頭上，特別痛。
    // 先算這一下（琉璃吊燈撞到東西就碎，碎了就來不及算了）
    { const a = r.a, b = r.b, hb = a && a.isBlock && a.hang && !a.dead ? a : b && b.isBlock && b.hang && !b.dead ? b : null, u = hb === a ? b : a;
      if (hb && u && u.isUnit && u.alive && r.vn > 5 && (hb === a ? -r.ny : r.ny) > 0.3 && (hb.hangFree || r.vn > 7) && !(S.time < (u.hangCd || 0))) {
        u.hangCd = S.time + 1; const by = hb.hitBy !== undefined ? hb.hitBy : u.side === credit ? 2 : credit;
        ev('bonk', r.x, r.y, hb.hang);
        hurtUnit(u, u.def.big ? u.hpMax * (hb.hang === 'lamp' ? 0.16 : 0.12) : Math.min(170, hb.mass * r.vn * 0.32), by, K_CRUSH);
      } }
    for (let k = 0; k < 2; k++) {
      const o = k ? r.b : r.a; if (!o) continue;
      const dv = r.J / o.mass;
      if (o.isBlock) {
        if (o.dead) continue;
        // 還在原位的磚，不會被同一座城裡「也還在原位」的磚撞壞：樓板被震得彈一下，不該把撐著它的牆和柱子壓碎
        const oth = k ? r.a : r.b; if (o.inPlace && oth && oth.isBlock && oth.inPlace && oth.st === o.st) continue;
        if (o.mat === M_KEG) { if (dv > KEG_V) blockKill(o, o.side === credit ? 2 : credit, K_CRUSH); continue; }      // 火藥桶摔得太重、被重的東西砸到：爆
        // 倒下來的石碑砸進城裡：整塊石碑的重量砸上去（石碑之間、石碑砸地面不算）
        { const oth = k ? r.a : r.b; if (oth && oth.isBlock && oth.dom && !oth.dead && !o.dom && o.side < 2 && r.vn > 3 && !(S.time < (o.domCd || 0))) { o.domCd = S.time + 0.5; blockHurt(o, oth.mass * r.vn * 0.5, K_CRUSH, credit === o.side ? 2 : credit, r.x, r.y); if (o.dead) continue; } }
        // 吊鐘、吊燈掉下來砸到東西：整個重量砸上去，屋頂、樓板一砸就穿
        // （只砸得穿屋頂、柱子這種一塊一塊的，樓板、長樑不算；一口鐘最多砸穿兩樣東西，不會一路鑽到底）
        { const oth = k ? r.a : r.b; if (oth && oth.isBlock && oth.hang && (oth.hangFree || oth.body.getLinearVelocity().y < -4) && !oth.dead && oth !== o && r.vn > 4 && o.st !== S.rubble && !o.hang && !o.seg && (oth.crashN || 0) < 2) { oth.crashN = (oth.crashN || 0) + 1; const by = oth.hitBy !== undefined ? oth.hitBy : o.side === credit ? 2 : credit; blockHurt(o, oth.mass * r.vn * 0.55, K_CRUSH, by, r.x, r.y); if (o.dead) continue; } }
        if (o.boulder) { if (!o.bHit && o.bFly && !o.bIn) { o.bHit = 1; const oth = k ? r.a : r.b; ev('thunk', r.x, r.y, r.J); if (oth && oth.isBlock && !oth.dead && oth !== o) blockHurt(oth, o.bW.dmg * o.bMul, K_HEAVY, o.bSide, r.x, r.y); else if (oth && oth.isUnit && oth.alive && oth.side !== o.bSide) hurtUnit(oth, o.bW.ud * o.bMul, o.bSide, K_CRUSH); } continue; }
        const d = (dv - (MAT[o.mat].imp || IMP_V0)) * IMP_K * MAT[o.mat].frag;
        if (d > 0) blockHurt(o, Math.min(d, (o.seg ? o.segM : o.hm) * 0.9 + 6), K_CRUSH, o.side === credit ? 2 : credit, r.x, r.y);
      } else if (o.alive) {
        // 屋瓦砸在兵（或魔王）頭上：瓦是脆的，當場碎掉、順著頭兩邊滑下去。該痛的照痛（下面照撞擊的力道算），
        // 但不會整片屋頂完好地蓋在頭上、一路把人壓到扁——頂樓的兵不該因為亭子的柱子斷了就必死
        // （屋頂還好好的在原位、是兵自己被震得跳起來撞到的不算：屋頂不會因為這樣就碎）
        { const oth = k ? r.a : r.b; if (oth && oth.isBlock && oth.mat === M_ROOF && !oth.dead && !oth.frag && (k ? -r.ny : r.ny) > 0.3 && roofDown(oth)) blockKill(oth, oth.side === credit ? 2 : credit, K_CRUSH); }
        if (!o.alive) continue;
        if (o.def.big) {
          // 魔王皮厚：摔不死。但是摔一層、被掉下來的屋頂或樓板砸到頭，每一下至少扣半成血（一下之後隔一會才會再算）。
          // 被爆炸震得跳一下再落地的不算；輕的碎塊砸到也不算
          // （法線由 a 指向 b：魔王是 a 的話，對方在上面 = 法線朝上；魔王是 b 就反過來。從正側面撞過來的不算「砸到頭」）
          const oth = k ? r.a : r.b, top = oth && oth.isBlock && oth.mass >= 12 && (k ? -r.ny : r.ny) > 0.5 && r.y > o.body.getPosition().y + o.bh * 0.2;
          const d = (dv - (top ? BOSS_V1 : BOSS_V0)) * UIMP_K;
          if (d > 0 && !(S.time < o.crushCd)) { o.crushCd = S.time + 0.7; hurtUnit(o, clamp(d * 0.9, o.hpMax * 0.05, o.hpMax * 0.12), o.side === credit ? 2 : credit, K_CRUSH); }
        } else {
          const d = (dv - UIMP_V0) * UIMP_K;
          if (d > 0) hurtUnit(o, Math.min(d, 220), o.side === credit ? 2 : credit, K_CRUSH);
        }
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
    if (o.isRock) { if (RAY.own && o.side === RAY.side) return -1; }                                // 還沒出城：自己城裡的岩壁也不擋（懸空寺上殿的兵往上打，不會打在頭頂的岩簷上）
    else if (o.isBlock) { if (RAY.own && (o.side === RAY.side || o.frag || o.st.loose)) return -1; }      // 還沒出城：自己的磚、掉進城裡的碎塊和落石都不擋
    else { if (!RAY.units || o.side === RAY.side || !o.alive) return -1; }
  }
  RAY.hit = o && !o.isRock ? (o.isBlock ? 2 : 3) : 1; RAY.o = o; RAY.x = point.x; RAY.y = point.y; RAY.f = fraction;
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
// 想推 (jx, jy) 這麼大的一下，但推完不能比 vmax 快（本來就比 vmax 快的，不能再更快）。回傳這一下要打幾折（0..1）。
// 一輪幾十發小砲彈接連炸在同一個東西旁邊，力道才不會一直疊上去
function pushScale(body, mass, jx, jy, vmax) {
  const v = body.getLinearVelocity(), dx = jx / mass, dy = jy / mass, a = dx * dx + dy * dy;
  if (a < 1e-9) return 0;
  const s0 = v.x * v.x + v.y * v.y, lim = Math.max(vmax * vmax, s0);
  const nx = v.x + dx, ny = v.y + dy; if (nx * nx + ny * ny <= lim) return 1;
  const b = 2 * (v.x * dx + v.y * dy), c = s0 - lim, t = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  return t > 1 ? 1 : t > 0 ? t : 0;
}
// 大石球被直接打中：這一下會傳給它正壓著的那塊磚（石球底下的木板就是這樣被打穿的）
function rockPass(ball, dmg, kind, side) {
  const p = ball.body.getPosition(), x = p.x, y0 = p.y - ball.r + 0.2, y1 = p.y - ball.r - 0.9; let under = null, uy = 0;
  PH.world.rayCast({ x, y: y0 }, { x, y: y1 }, (f, pt, n, fr) => { const o = f.getUserData(); if (!o || !o.isBlock || o === ball || o.dead || o.frag) return -1; under = o; uy = pt.y; return fr; });
  if (under) blockHurt(under, dmg, kind, side, x, uy - 0.1);
}
// 一塊磚算不算「大塊」：橫跨四格以上的樓板和樑、三格高的鐵甲和柱子
function bigBlock(o) { return o.inPlace && !o.frag && !o.prop && !o.dom && (o.cw >= 4 || o.ch >= 3); }
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
    if (hit && hit.isBlock && !hit.dead) {
      const b = hit;
      if (b.body) { const big = bigBlock(b), cap = b.mat === M_KEG ? 10 : b.mat === M_ROCK ? DV_ROCK : big ? DV_BIG : DV_MAX, j = Math.min(Jw, b.mass * Math.min(12, cap)), k = pushScale(b.body, b.mass, ux * j, uy * j, cap); if (k > 0) b.body.applyLinearImpulse({ x: ux * j * k, y: uy * j * k }, big ? b.body.getWorldCenter() : { x, y }, true); }
      if (b.mat === M_ROCK && b.kind === 'ball') rockPass(b, dmg * 0.6, kind, side);
      blockHurt(b, dmg, kind, side, x, y);
    } else if (hit && hit.alive) {
      hurtUnit(hit, ud, side, kind);
      if (hit.alive && hit.body) { const m = Math.pow(Math.min(1, mass), 0.8), jx = ux * 20 * m, jy = (uy * 20 + 8) * m, k = pushScale(hit.body, hit.mass, jx, jy, UKB_V); if (k > 0) hit.body.applyLinearImpulse({ x: jx * k, y: jy * k }, hit.body.getWorldCenter(), true); }
    }
    ev('boom', x, y, 0, w.i, side, mass + ((flag & F_FIRE) ? 100 : 0));
    return;
  }
  if (hit && hit.isBlock && !hit.dead && hit.mat === M_ROCK && hit.kind === 'ball') rockPass(hit, dmg * 0.6, kind, side);
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
      // 火藥桶很沉，不會被震得到處飛；還在原位的大塊只會整塊被震一下
      const big = bigBlock(o), cap = o.mat === M_KEG ? 10 : o.mat === M_ROCK ? DV_ROCK : big ? DV_BIG : DV_MAX, j = Math.min(Jw * f, o.mass * cap);
      const jx = nx / nl * j, jy = ny / nl * j + j * 0.22, k = pushScale(o.body, o.mass, jx, jy, cap);
      if (k > 0) o.body.applyLinearImpulse({ x: jx * k, y: jy * k }, big ? o.body.getWorldCenter() : { x: _cp.x, y: _cp.y }, true);
      if (o.mat === M_KEG && w.id === 'keg') { blockKill(o, side, kind); continue; }           // 火藥桶被另一桶炸到：一定跟著爆
      if (fire && MAT[o.mat].burn && (o === hit || f > 0.5) && (o.mat === M_KEG || rnd() < 0.3 + 0.6 * f)) ignite(o, 3 + rnd() * 2, side);       // 要直接打中或炸在旁邊才點得著（隔著一道牆、一片鐵甲點不到）
      const sootK = kind === K_ICE || kind === K_ZAP || o.mat === M_ICE ? 0 : (fire ? 0.6 : 0.4) * Math.min(1, mass + 0.3);        // 冰不會被燻黑
      if (kind === K_ICE) o.brit = 2; else if (sootK > 0 && !o.seg && o.soot < 1) o.soot = Math.min(1, o.soot + f * sootK);
      if (o.mat === M_KEG && o !== hit && f <= 0.5) continue;                                   // 火藥桶：隔著一層樓板震不爆，要直接打中或炸在旁邊
      if (o.seg) segBlast(o, x, y, r, dmg, kind, side, o === hit, sootK); else blockHurt(o, o === hit ? dmg : dmg * 0.6 * f, kind, side);
    } else if (o.alive) {
      if (o.side === side) continue;                          // 自己的砲不傷自己的兵
      const bp = o.body.getPosition(), dx = bp.x - x, dy = bp.y - y, d = Math.hypot(dx, dy);
      let f = o === hit ? 1 : 1 - Math.max(0, d - 1.3 * (o.def.big ? MUZ_BIG : 1)) / r; if (f <= 0) continue; if (f > 1) f = 1;       // 離身體表面多遠（魔王的身體比較大）
      // 推兵：一輪幾十發小砲彈接連炸在旁邊，力道不能一直疊上去（不然人會像砲彈一樣飛出城）。已經被推到多快，就少推多少
      const dl = d || 1, j = Math.min(Jw * UKB_K * f, o.mass * UKB_V), jx = dx / dl * j, jy = dy / dl * j + j * 0.3, k = pushScale(o.body, o.mass, jx, jy, UKB_V);
      if (k > 0) o.body.applyLinearImpulse({ x: jx * k, y: jy * k }, o.body.getWorldCenter(), true);
      if (kind === K_ICE && !o.immune) { o.frozen = Math.max(o.frozen, 1); o.dazed = 1; ev('freeze', bp.x, bp.y, o.side); }      // 剛被凍過（或電暈過）一輪的，這一輪凍不住
      hurtUnit(o, o === hit ? ud : ud * 0.7 * f, side, kind);
    }
  }
  PH.ek = 0;
  if (S.ropes.length) ropesBlast(x, y, r, dmg, kind, side, fire);
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
  _lz.length = 0; let roof = -99;
  // 雷從天上直直劈下來：劈到岩壁（懸空寺的岩簷）、地面就停，底下的東西劈不到
  PH.world.rayCast({ x, y: 78 }, { x, y: -12 }, (f, p) => { const o = f.getUserData(); if (!o || o.isRock) { if (p.y > roof) roof = p.y; } else if (o.isBlock && !o.dead && o.side !== side) _lz.push({ o, y: p.y }); return 1; });
  _lz.sort((a, b) => b.y - a.y);
  let low = y, n = 0;
  for (const h of _lz) { if (n >= 3) break; if (h.o.dead || h.y < roof) continue; n++; low = Math.min(low, h.y); blockHurt(h.o, 15 * mul, K_ZAP, side, x, h.y); if (h.o.mat === M_IRON) ev('spark', x, h.y); }
  if (roof > low) low = roof;
  for (const u of S.units) if (u.alive && u.side !== side && Math.abs(u.x - x) < 2.6 && u.y + 3 > low - 4 && u.y + 3 > roof) { hurtUnit(u, 9 * mul, side, K_ZAP); if (u.alive && !u.immune) { u.stun = Math.max(u.stun, 1); u.dazed = 1; } }
  // 雷劈過鐵鍊：鐵會導電
  for (const r of S.ropes) { if (r.cut || r.side === side) continue; const e = r.e, lo2 = Math.min(e[1], e[3]), hi2 = Math.max(e[1], e[3]); if (lo2 < low - 1 || hi2 < roof) continue; if ((e[0] - x) * (e[2] - x) <= 0 || Math.abs(e[0] - x) < 1.2 || Math.abs(e[2] - x) < 1.2) ropeHurt(r, 15 * mul, K_ZAP, side); }
  ev('zap', x, n ? low : roof > -90 ? roof : -9, 78, n ? 1 : 0);
}
