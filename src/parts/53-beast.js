/* ===== 53-beast: 第十八關「機關巨獸」（魔王）=====
   敵方沒有城：一頭巨大的機械獸，每回合結束往我方城走一段；走到城前面就不走了，每回合結束抬腳踩城。
   身體是一塊一塊的鐵（運動學剛體，照骨架的姿勢擺；只有背上的砲台是實心的，兵站在上面，其他部位砲彈打得到、但東西穿得過去）：
   軀幹、頭（噴火、咬人丟出去）、背上的砲台（站著三個敵兵）、兩條腿（大腿、膝關節、小腿、腳掌，膝蓋前面一片護膝甲）、
   胸口一片胸甲（後面是核心）。
   打到哪一塊：那一塊扣耐久，巨獸扣血（照部位打折：甲片很硬，膝關節、頭、核心最痛；破綻的回合加倍）。
   護膝甲打掉，膝關節才露出來；膝關節打斷了，那條腿斷了：巨獸踉蹌，那一回合結束不走，下一回合是破綻；兩條腿都斷了就倒地爬。
   頭打爛了不能噴火、咬人；砲台打塌了，上面的兵摔下去；胸甲打掉（或第三階段倒地時震掉），核心外露。
   階段：血剩六成跪下來、肚子放出兩隻小機械兵；剩兩成八倒地爬行、核心外露，蓄力一回合之後光束橫掃整座城（開護罩擋）。
   每回合一開始預告這一回合敵軍砲擊時要放的招：噴火、咬人、震地、砲台齊射、蓄力、光束 */
const BEAST = {
  hullHW: 9.2, hullHH: 3.7, standY: 15.6, kneelY: 12.2, fallY: 4.5,
  hip: [[-5.6, -2.9], [5.8, -2.9]], L1: 6.6, L2: 7.0, footHW: 1.95, footHH: 0.55,
  head: { x: -12.0, y: 1.6, hw: 3.1, hh: 2.3 }, turret: { x: 2.0, y: 4.25, hw: 4.8, hh: 0.5 },
  chest: { x: -9.6, y: -0.9, hw: 0.8, hh: 2.5 }, core: { x: -8.2, y: -0.9, r: 1.6 },
  slots: [-1.25, 2.1, 5.45], walk: [4.6, 3.8, 2.6], stepT: 2.6, mouth: [-3.0, -0.8]
};
const BEAST_MOVES = { flame: '噴火', grab: '咬人', quake: '震地', volley: '砲台齊射', charge: '蓄力', beam: '光束橫掃' };
const BEAST_LINES = {
  intro: '嘎——轟隆！（機關巨獸朝你的城走過來了）', p2: '嘎吱——巨獸跪下來，肚子打開了！', p3: '巨獸倒下了，還在往前爬！胸口的核心露出來了', tired: '巨獸踉蹌了一下……',
  next: { flame: '巨獸張開嘴：這一回合噴火！', grab: '巨獸盯著你的兵：這一回合要咬人！', quake: '巨獸抬起前腳：這一回合震地！', volley: '背上的砲台轉過來了：這一回合齊射兩輪！', charge: '核心開始蓄力……下一回合光束橫掃！', beam: '光束要來了！開護罩！' },
  wall: '巨獸走到城下了：每回合結束都會踩城！', die: '巨獸轟然倒下……'
};
// 部位：耐久（hm 0 是打不壞的）、扣血打幾折（bk）、打壞的時候巨獸另外扣幾成血（brk）
const BEAST_PART = {
  hull: { hm: 0, bk: 0.7 }, head: { hm: 320, bk: 0.85, brk: 0.05 }, turret: { hm: 260, bk: 0.5, brk: 0.04 }, chest: { hm: 280, bk: 0.45, brk: 0.04 }, core: { hm: 0, bk: 2.2 },
  thigh: { hm: 0, bk: 0.65 }, knee: { hm: 120, bk: 1.1, brk: 0.07 }, cap: { hm: 90, bk: 0.45, brk: 0.02 }, shin: { hm: 0, bk: 0.65 }, foot: { hm: 0, bk: 0.4 }
};
const BEAST_REACH = 14;          // 咬人：脖子最多伸多長（公尺）
const BEAST_SOFT = 0.35;          // 跨過換階段門檻的那一輪，超過的傷害打幾折（跟魔王一樣：不會一輪就跳過一個階段）
const smooth01 = (u) => { u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * (3 - 2 * u); };

/* ---------- 建立 ---------- */
function mkBeast(def, hpMul) {
  const hm = def.hp * hpMul, x = def.x;
  const B = S.beast = { def, hm, hp: hm, phase: 1, x, y: BEAST.standY, a: 0, hdx: 0, hdy: 0, ha: 0, jaw: 0, glow: 0, parts: [], P: {}, pose: {},
    legs: BEAST.hip.map((h, k) => ({ k, hip: h, fx: x + h[0] + 0.4, fy: 0, fa: 0, broken: false })), anim: null, queue: [], next: null, mv: 0,
    tired: false, tiredR: -1, staggerR: -1, tangleR: -1, beamR: -1, stat: {}, down: false, coreOut: false, released: false, dead: false, atWall: false, wallSaid: false, softVol: -1, softLo: 0, hp0: hm, by: 0 };
  const st = { side: 1, skin: 'beast@1', skinB: 'beast', x0: x - 16, y0: 0, cols: 0, rows: 0, n: 0, w: 27, h: 23, x1: x + 11, y1: 23, cx: x, hpMul, blocks: [], units: [], slots: BEAST.slots.map((_, k) => ({ slot: k + 1, cx: 0, cy: 0 })),
    cellB: [], cellK: new Uint8Array(0), back: new Float32Array(0), backTo: new Uint8Array(0), hp0: 1, hpNow: 1, ver: 0, dead: false, fin: null, hitT: 0, loose: true, mirror: true, def: { map: [] }, base: 0, fx0: x - 10, fx1: x + 10, nofound: true, beast: B };
  B.st = st;
  const mk = (id, type, shape, leg) => {
    const D = BEAST_PART[type], p = { isRock: true, isBeast: true, side: 1, st, id, type, leg, hp: D.hm * hpMul, hm: D.hm * hpMul, bk: D.bk, brk: D.brk || 0, dead: false, flash: 0, acid: 0, acidBy: 0, body: null, hw: shape.hw || 0, hh: shape.hh || 0, r: shape.r || 0 };
    const body = PH.world.createBody({ type: 'kinematic', position: { x, y: B.y } });
    body.createFixture({ shape: shape.r ? new PL.Circle(shape.r) : new PL.Box(shape.hw, shape.hh), friction: 0.9, restitution: 0, isSensor: type !== 'turret', filterCategoryBits: CAT_TERR, userData: p });
    if (type === 'turret') for (const sx of [-1, 1]) body.createFixture({ shape: new PL.Box(0.14, 0.9, { x: sx * (shape.hw - 0.14), y: shape.hh + 0.9 }, 0), friction: 0.9, restitution: 0, filterCategoryBits: CAT_TERR, userData: p });          // 砲台兩頭的欄杆：兵不會走出去
    p.body = body; B.parts.push(p); B.P[id] = p; return p;
  };
  mk('hull', 'hull', { hw: BEAST.hullHW, hh: BEAST.hullHH });
  mk('chest', 'chest', BEAST.chest); mk('core', 'core', { r: BEAST.core.r }); mk('head', 'head', BEAST.head); mk('turret', 'turret', BEAST.turret);
  for (const L of B.legs) { const s = L.k ? 'R' : 'F'; mk('thigh' + s, 'thigh', { hw: BEAST.L1 / 2, hh: 1.0 }, L.k); mk('shin' + s, 'shin', { hw: BEAST.L2 / 2, hh: 0.85 }, L.k); mk('foot' + s, 'foot', { hw: BEAST.footHW, hh: BEAST.footHH }, L.k); mk('knee' + s, 'knee', { r: 1.25 }, L.k); mk('cap' + s, 'cap', { hw: 0.95, hh: 1.35 }, L.k); }
  B.P.core.body.setActive(false);          // 核心藏在胸甲後面：胸甲還在就打不到
  // 砲台：兵站在上面（原位跟著砲台走，見 frWorld）
  const T = B.P.turret; T.kind = 'howdah'; T.x0 = x + BEAST.turret.x; T.y0 = B.y + BEAST.turret.y; T.a0 = 0;
  beastPose(B); beastPlace(B);
  return st;
}
// 砲台上的兵：站在砲台上（兵位在砲台上面，原位跟著砲台走）
function beastUnits() {
  const B = S.beast, T = B.P.turret;
  S.team[1].units.forEach((u, k) => {
    const x = B.x + BEAST.slots[k % 3], y = B.y + BEAST.turret.y + BEAST.turret.hh;
    u.x = u.hx = u.hx0 = x; u.y = u.hy = u.hy0 = y; u.fr = T; u.homeB = null;
  });
}
// 直接把每一塊擺到這一步算好的姿勢（開局、出了錯的時候）
function beastPlace(B) { for (const p of B.parts) if (!p.dead && p.body) { const q = B.pose[p.id]; if (q) { p.body.setTransform({ x: q.x, y: q.y }, q.a); p.body.setLinearVelocity({ x: 0, y: 0 }); p.body.setAngularVelocity(0); } } }

/* ---------- 姿勢：軀幹的位置角度 → 每一塊的位置角度 ---------- */
function beastPose(B) {
  const c = Math.cos(B.a), s = Math.sin(B.a), P = B.pose;
  const set = (id, x, y, a) => { const q = P[id] || (P[id] = { x: 0, y: 0, a: 0 }); q.x = x; q.y = y; q.a = a; };
  const W = (lx, ly) => { _bw.x = B.x + lx * c - ly * s; _bw.y = B.y + lx * s + ly * c; return _bw; };
  set('hull', B.x, B.y, B.a);
  let q = W(BEAST.head.x + B.hdx, BEAST.head.y + B.hdy); set('head', q.x, q.y, B.a + B.ha);
  q = W(BEAST.turret.x, BEAST.turret.y); set('turret', q.x, q.y, B.a);
  q = W(BEAST.chest.x, BEAST.chest.y); set('chest', q.x, q.y, B.a);
  q = W(BEAST.core.x, BEAST.core.y); set('core', q.x, q.y, B.a);
  for (const L of B.legs) {
    const sfx = L.k ? 'R' : 'F', h = W(L.hip[0], L.hip[1]), hx = h.x, hy = h.y, L1 = BEAST.L1, L2 = BEAST.L2;
    if (L.broken) { const a = B.a - Math.PI / 2 - (L.k ? -0.35 : 0.35); set('thigh' + sfx, hx + Math.cos(a) * L1 / 2, hy + Math.sin(a) * L1 / 2, a); continue; }          // 斷掉的腿：只剩大腿，垂著
    let ax = L.fx + 0.5, ay = L.fy + BEAST.footHH * 2;          // 腳踝（腳掌上緣、偏後一點）
    let dx = ax - hx, dy = ay - hy, d = Math.hypot(dx, dy) || 1e-6;
    const dmax = L1 + L2 - 0.08, dmin = Math.abs(L1 - L2) + 0.3;
    if (d > dmax) { ax = hx + dx / d * dmax; ay = hy + dy / d * dmax; dx = ax - hx; dy = ay - hy; d = dmax; }
    else if (d < dmin) d = dmin;
    const th = Math.atan2(dy, dx), al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const k1x = hx + Math.cos(th + al) * L1, k1y = hy + Math.sin(th + al) * L1, k2x = hx + Math.cos(th - al) * L1, k2y = hy + Math.sin(th - al) * L1;
    const kx = k1x < k2x ? k1x : k2x, ky = k1x < k2x ? k1y : k2y;          // 膝蓋朝前（朝我方的城）
    set('thigh' + sfx, (hx + kx) / 2, (hy + ky) / 2, Math.atan2(ky - hy, kx - hx));
    const sa = Math.atan2(ay - ky, ax - kx); set('shin' + sfx, (kx + ax) / 2, (ky + ay) / 2, sa);
    set('knee' + sfx, kx, ky, 0);
    const ux = Math.cos(sa), uy = Math.sin(sa), nx = uy < 0 ? uy : -uy, ny = uy < 0 ? -ux : ux;          // 小腿往前的那一側
    set('cap' + sfx, kx + nx * 1.15 + ux * 0.35, ky + ny * 1.15 + uy * 0.35, sa);
    set('foot' + sfx, ax - 0.5, ay - BEAST.footHH, L.fa);
  }
}
const _bw = { x: 0, y: 0 };
// 每一步：把運動學的剛體推到這一步結束時該在的位置（速度 = 差距 / dt）；物理引擎算完剛好到位
function beastDrive(B, dt) {
  beastPose(B);
  for (const p of B.parts) {
    if (p.dead || !p.body) continue;
    const q = B.pose[p.id]; if (!q) continue;
    if (!p.body.isActive()) { p.body.setTransform({ x: q.x, y: q.y }, q.a); continue; }
    const o = p.body.getPosition(); let da = q.a - p.body.getAngle(); da = ((da + Math.PI) % TAU + TAU) % TAU - Math.PI;
    p.body.setLinearVelocity({ x: (q.x - o.x) / dt, y: (q.y - o.y) / dt }); p.body.setAngularVelocity(da / dt);
  }
}

/* ---------- 姿勢的基準：站著、跪著、斷腿、倒地 ---------- */
function beastBase(B) {
  const bF = B.legs[0].broken, bR = B.legs[1].broken;
  if (B.dead) return { y: 3.4, a: 0.05 };
  if (B.down || (bF && bR)) return { y: BEAST.fallY, a: 0.04 };
  let y = B.phase >= 2 ? BEAST.kneelY : BEAST.standY, a = 0;
  if (bF) { y -= 3.0; a += 0.17; }
  if (bR) { y -= 3.0; a -= 0.15; }
  return { y, a };
}
// 倒地的時候腳往兩邊撐開
function beastFeetHome(B) {
  for (const L of B.legs) if (!L.broken) { const hx = B.x + L.hip[0]; L.fx = B.down ? hx + (L.k ? 5.5 : -6.5) : hx + 0.4; L.fy = 0; }
}
function beastQueue(kind, o) { const B = S.beast; if (!B.anim) beastStart(kind, o); else B.queue.push([kind, o]); }
function beastStart(kind, o) {
  const B = S.beast, b = beastBase(B);
  B.anim = Object.assign({ kind, t: 0, dur: 1, x0: B.x, y0: B.y, a0: B.a, by: b.y, ba: b.a, f0: B.legs.map((L) => L.fx), fy0: B.legs.map((L) => L.fy), hit: false, landed: [0, 0] }, o || {});
  const A = B.anim;
  if (kind === 'walk') A.dur = BEAST.stepT;
  else if (kind === 'settle') A.dur = 1.3;
  else if (kind === 'stagger') A.dur = 1.4;
  else if (kind === 'stomp') { A.dur = 2.6; beastStompAim(B, A); }
  else if (kind === 'quake') A.dur = 2.2;
  else if (kind === 'flame') A.dur = 2.6;
  else if (kind === 'grab') { A.dur = 3.0; A.u = beastGrabTarget(B); }
  else if (kind === 'roar') A.dur = 1.2;
  else if (kind === 'beam') A.dur = 3.4;
  else if (kind === 'release') A.dur = 2.0;
  else if (kind === 'die') A.dur = 3.6;
}
function beastBusy() { const B = S.beast; return !!(B && (B.anim || B.queue.length)); }

/* ---------- 每一步 ---------- */
function beastStep(dt) {
  const B = S.beast; if (!B) return;
  const t = S.time, b = beastBase(B);
  if (B.anim) {
    const A = B.anim; A.t += dt; const u = Math.min(1, A.t / A.dur);
    beastAnim(B, A, u, dt);
    if (A.t >= A.dur) { B.anim = null; if (B.queue.length) { const [k, o] = B.queue.shift(); beastStart(k, o); } }
  } else {
    // 閒著：慢慢呼吸、頭左右晃（跟著基準姿勢）
    B.y += (b.y + 0.16 * Math.sin(t * 1.7) - B.y) * Math.min(1, dt * 3); B.a += (b.a + 0.008 * Math.sin(t * 1.1) - B.a) * Math.min(1, dt * 3);
    B.hdx += (0 - B.hdx) * Math.min(1, dt * 4); B.hdy += (0.15 * Math.sin(t * 0.8) - B.hdy) * Math.min(1, dt * 4); B.ha += (0.04 * Math.sin(t * 0.9) - B.ha) * Math.min(1, dt * 4); B.jaw += (0 - B.jaw) * Math.min(1, dt * 5);
  }
  B.glow = 0.5 + 0.5 * Math.sin(t * (B.next === 'beam' || B.next === 'charge' ? 7 : 2.2));
  beastDrive(B, dt);
  beastRide(B, dt);
  for (const p of B.parts) {
    if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 4);
    if (p.acid > 0 && !p.dead) { const k = Math.min(dt, p.acid); p.acid -= dt; if (S.state === 'play' && (S.phase === 'volley' || S.phase === 'resolve')) beastHurt(p, WPN.acid.acid.dps * k * (p.acidM || 1), K_ACID, p.acidBy, null, null, true); }
  }
  if (S.state === 'play' && (B.anim || (S.frame & 15) === 0)) beastBounds(B);
}
// 砲台上的兵跟著砲台動（站在砲台上、沒被炸飛的）：速度跟砲台那一點一樣，不會被甩下去
function beastRide(B, dt) {
  const T = B.P.turret; if (!T || T.dead || !T.body || !B.anim) return;
  const v = T.body.getLinearVelocity(), w = T.body.getAngularVelocity(), o = T.body.getPosition();
  for (const u of S.team[1].units) {
    if (!u.alive || !u.body || u.fr !== T || u.grabbed) continue;
    const q = frLocal(T, u.x, u.y); if (Math.abs(q.x - T.x0) > BEAST.turret.hw + 0.6 || Math.abs(q.y - (T.y0 + BEAST.turret.hh)) > 1.2) continue;
    const p = u.body.getPosition(), rx = p.x - o.x, ry = p.y - o.y;
    u.body.setLinearVelocity({ x: v.x - w * ry, y: v.y + w * rx }); u.body.setAwake(true);
  }
}
// 巨獸佔的範圍（敵軍的砲彈要飛出這個範圍才會撞到自己的身體；AI、鏡頭也用）
function beastBounds(B) {
  const st = B.st; let x0 = 1e9, x1 = -1e9, y1 = 0;
  for (const p of B.parts) { if (p.dead || !p.body || p.type === 'core') continue; const q = p.body.getPosition(), e = Math.max(p.hw, p.hh, p.r) + 0.3; x0 = Math.min(x0, q.x - e); x1 = Math.max(x1, q.x + e); y1 = Math.max(y1, q.y + e); }
  if (x0 > x1) return;
  st.x0 = x0; st.x1 = x1; st.w = x1 - x0; st.cx = (x0 + x1) / 2; st.y1 = y1 + 1; st.h = st.y1; st.fx0 = x0 + 2; st.fx1 = x1 - 2;
}

/* ---------- 動作 ---------- */
function beastAnim(B, A, u, dt) {
  const k = A.kind, b = beastBase(B);
  if (k === 'walk') {
    const e = smooth01(u); B.x = A.x0 - A.dx * e;
    B.y = A.y0 + (b.y - A.y0) * e + (B.down ? 0.25 : 0.55) * Math.abs(Math.sin(TAU * u)); B.a = A.a0 + (b.a - A.a0) * e + 0.025 * Math.sin(TAU * u);
    for (const L of B.legs) {
      if (L.broken) continue;
      const w0 = L.k ? 0.5 : 0.04, s = smooth01((u - w0) / 0.44), raw = clamp((u - w0) / 0.44, 0, 1);
      L.fx = A.f0[L.k] - A.dx * s; L.fy = (B.down ? 0.8 : 2.6) * Math.sin(Math.PI * raw);
      if (raw >= 1 && !A.landed[L.k]) { A.landed[L.k] = 1; L.fy = 0; ev('beaststep', L.fx, 0, B.down ? 0 : 1); }
    }
    return;
  }
  if (k === 'settle' || k === 'stagger') {
    const e = smooth01(u); B.y = A.y0 + (b.y - A.y0) * e; B.a = A.a0 + (b.a - A.a0) * e + (k === 'stagger' ? 0.06 * Math.sin(u * 18) * (1 - u) : 0);
    if (A.feet) for (const L of B.legs) if (!L.broken) { L.fx = A.f0[L.k] + (A.feet[L.k] - A.f0[L.k]) * e; L.fy = Math.sin(Math.PI * e) * 1.4; }
    return;
  }
  if (k === 'roar') { B.jaw = Math.sin(Math.PI * u); B.ha = -0.12 * Math.sin(Math.PI * u); B.hdy = 0.6 * Math.sin(Math.PI * u); return; }
  if (k === 'stomp') {
    // 抬起前腳、身子往後仰 → 往城頭踩下去 → 收回來
    const L = B.legs[0], up = u < 0.35 ? smooth01(u / 0.35) : u < 0.47 ? 1 : 1 - smooth01((u - 0.47) / 0.53);
    B.a = A.a0 + (b.a - 0.2 - A.a0) * up; B.y = A.y0 + 1.6 * up;
    if (!L.broken) {
      if (u < 0.35) { L.fx = A.f0[0] + (A.tx - A.f0[0]) * up; L.fy = (A.ty + 4.5) * up; }
      else if (u < 0.47) { const s = smooth01((u - 0.35) / 0.12); L.fx = A.tx; L.fy = A.ty + 4.5 * (1 - s); }
      else { const s = smooth01((u - 0.55) / 0.45); L.fx = A.tx + (A.f0[0] - A.tx) * s; L.fy = A.ty * (1 - s) + Math.sin(Math.PI * s) * 1.5; }
    }
    if (u >= 0.47 && !A.hit) { A.hit = true; beastStompHit(B, A); }
    return;
  }
  if (k === 'quake') {
    // 身子往後仰、前腳抬高 → 重重踩在地上：一圈震波沿著地面往城那邊跑
    const L = B.legs[0], up = u < 0.42 ? smooth01(u / 0.42) : u < 0.54 ? 1 - smooth01((u - 0.42) / 0.12) : 0;
    B.a = A.a0 - 0.16 * up + (u > 0.54 ? (b.a - A.a0) * smooth01((u - 0.54) / 0.46) : 0); B.y = A.y0 + 1.4 * up;
    if (!L.broken) L.fy = 3.2 * up;
    if (u >= 0.54 && !A.hit) { A.hit = true; beastQuakeHit(B); }
    return;
  }
  if (k === 'flame') {
    // 頭往後一仰、張嘴 → 對著城噴火（掃上掃下）→ 閉嘴
    B.jaw = u < 0.16 ? smooth01(u / 0.16) : u > 0.82 ? 1 - smooth01((u - 0.82) / 0.18) : 1;
    const aim = beastAimAt(B, 0.55 + 0.25 * Math.sin((u - 0.16) * 9));
    B.ha = u < 0.16 ? -0.2 * smooth01(u / 0.16) : u > 0.82 ? aim * (1 - smooth01((u - 0.82) / 0.18)) : aim;
    if (u > 0.16 && u < 0.82) { A.acc = (A.acc || 0) + dt; while (A.acc >= 0.12) { A.acc -= 0.12; beastFlameTick(B); } }
    return;
  }
  if (k === 'grab') { beastGrabAnim(B, A, u, dt); return; }
  if (k === 'beam') {
    B.glow = 1;
    if (u > 0.2 && u < 0.78) { A.acc = (A.acc || 0) + dt; while (A.acc >= 0.06) { A.acc -= 0.06; beastBeamTick(B, (u - 0.2) / 0.58); } }
    if (u >= 0.78 && !A.done) { A.done = true; B.tiredR = S.round + 1; }
    return;
  }
  if (k === 'release') {
    B.y = A.y0 + (b.y - A.y0) * smooth01(u); B.a = A.a0 + (b.a - A.a0) * smooth01(u);
    if (u >= 0.6 && !A.hit) { A.hit = true; beastRelease(B); }
    return;
  }
  if (k === 'die') {
    const e = smooth01(u); B.y = A.y0 + (3.4 - A.y0) * e; B.a = A.a0 + (0.07 - A.a0) * e; B.jaw = e; B.ha = 0.3 * e; B.hdy = -1.8 * e;
    for (const L of B.legs) if (!L.broken) { L.fx = A.f0[L.k] + (L.k ? 5 : -6) * e; L.fy = 0; }
    A.acc = (A.acc || 0) + dt; while (A.acc >= 0.32) { A.acc -= 0.32; const p = B.parts[ri(B.parts.length)]; if (p && p.body && !p.dead) { const q = p.body.getPosition(); ev('beastboom', q.x + (rnd() - 0.5) * 3, q.y + (rnd() - 0.5) * 2, 1); } }
  }
}
// 頭要轉多少才對著城（城高的第 f 成那一點）
function beastAimAt(B, f) {
  const st = S.st[0], q = B.pose.head, mx = st.x1 - 2.5, my = st.y0 + st.h * f;
  const want = Math.atan2(my - q.y, mx - q.x) - Math.PI;          // 頭朝左（-x）：嘴的方向 = 頭的角度 + π
  let d = want - B.a; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return clamp(d, -0.75, 0.6);
}
function beastMouth(B) { const q = B.pose.head, c = Math.cos(q.a), s = Math.sin(q.a), m = BEAST.mouth; return { x: q.x + m[0] * c - m[1] * s, y: q.y + m[0] * s + m[1] * c, a: q.a + Math.PI }; }
// 噴火：從嘴往城噴一道火（扇形五條射線），燒得著的點著、兵燒傷；開著護罩擋在護罩外面
function beastFlameTick(B) {
  const m = beastMouth(B), st = S.st[0], sh = S.team[0].shield.on;
  ev('flame', m.x, m.y, m.a, 30);
  for (let k = -2; k <= 2; k++) {
    const a = m.a + k * 0.07, ex = m.x + Math.cos(a) * 32, ey = m.y + Math.sin(a) * 32;
    let hit = null, hf = 1, hx = ex, hy = ey;
    PH.world.rayCast({ x: m.x, y: m.y }, { x: ex, y: ey }, (f, p, n, fr) => { const o = f.getUserData(); if (o && (o.isBeast || (o.isUnit && o.side === 1) || f.isSensor())) return -1; hit = o; hf = fr; hx = p.x; hy = p.y; return fr; });
    if (sh && inBubble(st, hx, hy)) { if (k === 0) ev('shieldhit', hx, hy, 0); continue; }
    if (!hit) continue;
    if (hit.isBlock && !hit.dead && hit.side === 0) { blockHurt(hit, 2.5, K_FIRE, 1, hx, hy); if (MAT[hit.mat].burn && rnd() < 0.16) ignite(hit, 3, 1); }
    else if (hit.isUnit && hit.alive && hit.side === 0) hurtUnit(hit, 4.2, 1, K_FIRE);
  }
}
// 光束：核心對著城從上往下掃（f 0 → 1），一路燒穿最外面兩三塊磚、燒到兵；開著護罩整道擋住
function beastBeamTick(B, f) {
  const c = B.pose.core, st = S.st[0], ty = st.y0 + st.h * (0.95 - f * 1.0), tx = st.x1 - 1.5;
  const a = Math.atan2(ty - c.y, tx - c.x), ex = c.x + Math.cos(a) * 90, ey = c.y + Math.sin(a) * 90;
  B.beam = { x: c.x, y: c.y, a, t: S.time };
  if (S.team[0].shield.on) { const hit = bubbleEdge(st, c.x, c.y, ex, ey); if (hit) { B.beam.ex = hit.x; B.beam.ey = hit.y; if ((S.frame & 7) === 0) ev('shieldhit', hit.x, hit.y, 0); } return; }
  const list = [];
  PH.world.rayCast({ x: c.x, y: c.y }, { x: ex, y: ey }, (fx, p, n, fr) => { const o = fx.getUserData(); if (!o || o.isBeast || fx.isSensor()) return -1; list.push({ o, x: p.x, y: p.y, fr }); return 1; });
  list.sort((p, q) => p.fr - q.fr);
  let n = 0, endX = ex, endY = ey;
  for (const h of list) {
    if (h.o.isRock) { endX = h.x; endY = h.y; break; }
    if (h.o.isBlock && !h.o.dead && h.o.side === 0) { blockHurt(h.o, 13, K_FIRE, 1, h.x, h.y); if (MAT[h.o.mat].burn && rnd() < 0.2) ignite(h.o, 3, 1); if (++n >= 3) { endX = h.x; endY = h.y; break; } }
    else if (h.o.isUnit && h.o.alive && h.o.side === 0) hurtUnit(h.o, 9, 1, K_FIRE);
  }
  B.beam.ex = endX; B.beam.ey = endY;
}
// 線段 (x0,y0)→(x1,y1) 碰到護罩（城外面那一圈橢圓）的地方
function bubbleEdge(st, x0, y0, x1, y1) {
  const c = stCenter(st), rx = st.w * 0.5 + 6, ry = st.h * 0.6 + 6;
  const ax = (x0 - c.x) / rx, ay = (y0 - c.y) / ry, dx = (x1 - x0) / rx, dy = (y1 - y0) / ry;
  const A = dx * dx + dy * dy, Bq = 2 * (ax * dx + ay * dy), C = ax * ax + ay * ay - 1, D = Bq * Bq - 4 * A * C;
  if (D < 0 || A < 1e-9) return null; const t = (-Bq - Math.sqrt(D)) / (2 * A); if (t < 0 || t > 1) return null;
  return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
}

/* ---------- 踩城、震地、咬人 ---------- */
// 我方城最前面那一排（朝巨獸那一面）
// 城前面那一排塌了，巨獸就走到下一排還站著的地方（只會踩過倒在地上的瓦礫）
function beastWallX() { const st = S.st[0]; let x = st.x0; for (const b of st.blocks) if (!b.dead && b.inPlace && !b.frag && !b.base && !b.wall && b.body) {          // 工兵架在城前面的木牆不算（巨獸直接踩過去）
 const q = b.body.getPosition(); x = Math.max(x, q.x + b.w / 2); } return Math.max(x, st.x0 + CS * 2); }
// 頭尖到城前面還有多遠
function beastGap(B) { const q = B.pose.head || { x: B.x + BEAST.head.x }; return q.x - BEAST.head.hw - beastWallX(); }
// 踩城的落點：前腳伸得到的最前面，城在那裡的頂（從上往下找第一塊還在原位的磚）
function beastStompAim(B, A) {
  const wx = beastWallX(), hipX = B.x + B.legs[0].hip[0], tx = Math.max(wx - CS * 1.2, hipX - 11.5);
  let ty = 0; PH.world.rayCast({ x: tx, y: 60 }, { x: tx, y: -1 }, (f, p, n, fr) => { const o = f.getUserData(); if (!o || !o.isBlock || o.dead || o.side !== 0 || o.frag) return -1; ty = p.y; return fr; });
  A.tx = tx; A.ty = Math.min(ty, 22);
}
function beastStompHit(B, A) {
  const st = S.st[0], sh = S.team[0].shield.on, k = sh ? 0.35 : 1, x = A.tx, y = A.ty;
  ev('beaststomp', x, y, sh ? 1 : 0); if (sh) ev('shieldhit', x, y + 2, 0);
  for (const b of st.blocks) {
    if (b.dead || !b.body || b.frag) continue;
    const q = b.body.getPosition(), dx = Math.abs(q.x - x) - b.w / 2, dy = y - (q.y + b.h / 2);
    if (dx > 2.4 || dy > 8.5 || dy < -1.5) continue;
    const f = clamp(1 - Math.max(0, dx) / 3.2, 0.3, 1) * clamp(1 - Math.max(0, dy) / 9.5, 0.25, 1);
    blockHurt(b, (b.seg ? b.segM : b.hm) * 1.15 * f * k, K_CRUSH, 1, q.x, q.y + b.h / 2);
    if (!b.dead && b.body && !b.base) { b.body.setAwake(true); b.body.applyLinearImpulse({ x: -b.mass * 2.2 * f * k, y: -b.mass * 3 * f * k }, b.body.getWorldCenter(), true); }
  }
  if (!sh) for (const u of S.team[0].units) { if (!u.alive) continue; const d = Math.hypot(u.x - x, u.y - y); if (d < 8) { hurtUnit(u, 34 * (1 - d / 9), 1, K_CRUSH); if (u.alive && u.body) u.body.applyLinearImpulse({ x: -u.mass * 5, y: u.mass * 6 }, u.body.getWorldCenter(), true); } }
}
// 震地：一圈震波沿著地面往城那邊跑：城最底下兩層的磚受傷，站在低處的兵被震傷、震飛（開著護罩：兵沒事，磚少一半）
function beastQuakeHit(B) {
  const L = B.legs[0], x0 = L.broken ? B.x - 6 : L.fx, st = S.st[0], sh = S.team[0].shield.on, dist = Math.max(0, x0 - beastWallX());
  const k = clamp(1.15 - dist / 60, 0.45, 1) * (sh ? 0.5 : 1);
  ev('quake', x0, 0, dist);
  for (const b of st.blocks) {
    if (b.dead || !b.body || b.frag || b.base) continue;
    const q = b.body.getPosition(); if (q.y - b.h / 2 > st.y0 + st.base * CS + CS * 1.6) continue;
    blockHurt(b, (b.seg ? b.segM : b.hm) * 0.18 * k, K_CRUSH, 1, q.x, q.y); if (!b.dead && b.body) b.body.setAwake(true);
  }
  if (!sh) for (const u of S.team[0].units) if (u.alive && u.y < st.y0 + st.base * CS + CS * 2.2) { hurtUnit(u, 16 * k, 1, K_CRUSH); if (u.alive && u.body) u.body.applyLinearImpulse({ x: 0, y: u.mass * 7 }, u.body.getWorldCenter(), true); }
}
// 咬人：挑一個頭伸得到、中間沒有東西擋的兵（最上面、最前面的優先）
function beastGrabTarget(B) {
  const m = beastMouth(B); let best = null, bs = -1e9;
  for (const u of S.team[0].units) {
    if (!u.alive || !u.body) continue;
    const d = Math.hypot(u.x - m.x, u.y + 1.5 - m.y); if (d > BEAST_REACH + 2.5) continue;          // 脖子伸得到的地方
    let clear = true; PH.world.rayCast({ x: m.x, y: m.y }, { x: u.x, y: u.y + 1.5 }, (f, p, n, fr) => { const o = f.getUserData(); if (!o || o === u || o.isBeast || f.isSensor() || o.isUnit) return -1; if (o.isBlock && (o.dead || o.frag)) return -1; clear = false; return 0; });
    if (!clear) continue;
    const sc = u.y * 0.6 + u.x * 0.4 - d * 0.5; if (sc > bs) { bs = sc; best = u; }
  }
  return best;
}
function beastGrabAnim(B, A, u, dt) {
  const T = A.u, rest = { x: 0, y: 0 };
  // 0–0.3：頭伸過去；0.3：咬住；0.3–0.62：甩到背後上方；0.62：放開（丟出去）；之後收回來
  if (u < 0.3) {
    const e = smooth01(u / 0.3); B.jaw = e;
    if (T && T.alive) { const lp = beastLocal(B, T.x + 1.2, T.y + 1.6); A.lx = lp.x - BEAST.head.x - BEAST.mouth[0] - 0.5; A.ly = lp.y - BEAST.head.y - BEAST.mouth[1]; }
    const L = Math.hypot(A.lx || 0, A.ly || 0), mx = BEAST_REACH / Math.max(BEAST_REACH, L);
    B.hdx = (A.lx || -6) * mx * e; B.hdy = (A.ly || -2) * mx * e; B.ha = -0.25 * e;
    return;
  }
  if (!A.bit) {
    A.bit = true; B.jaw = 0.2;
    const m = beastMouth(B);
    if (S.team[0].shield.on && inBubble(S.st[0], m.x, m.y)) { ev('shieldhit', m.x, m.y, 0); ev('beastbonk', m.x, m.y); A.u = null; }
    else if (T && T.alive && T.body && Math.hypot(T.x - m.x, T.y + 1.5 - m.y) < 4.2) { T.grabbed = B; T.body.setType('kinematic'); unitGhost(T, true); ev('beastgrab', m.x, m.y, T.side, T.slot); hurtUnit(T, 22, 1, K_CRUSH); if (!T.alive) A.u = null; }
    else { ev('beastmiss', m.x, m.y); A.u = null; }
  }
  if (u < 0.62) { const e = smooth01((u - 0.3) / 0.32); B.hdx = (A.lx || 0) * (1 - e) * 0.9 + 3.5 * e; B.hdy = (A.ly || 0) * (1 - e) * 0.9 + 7.5 * e; B.ha = -0.25 + 0.95 * e; }
  else { const e = smooth01((u - 0.62) / 0.38); B.hdx = 3.5 * (1 - e); B.hdy = 7.5 * (1 - e); B.ha = 0.7 * (1 - e); B.jaw = 0.2 * (1 - e); }
  const G = A.u;
  if (G && G.grabbed === B && G.body) {
    const m = beastMouth(B), p = G.body.getPosition();
    if (u < 0.62) { G.body.setLinearVelocity({ x: (m.x - p.x) / dt, y: (m.y - 1.2 - G.bh / 2 - p.y) / dt }); G.body.setAngularVelocity(0); }
    else {
      // 往背後甩出去：落在巨獸後面的空地上（落地不死，站在那裡繼續打）
      const tx = clamp(B.x + 13 + rnd() * 4, 58, 102), vy = 9 + rnd() * 2, tf = (vy + Math.sqrt(vy * vy + 2 * GRAV * Math.max(1, p.y))) / GRAV;
      G.grabbed = null; G.body.setType('dynamic'); unitGhost(G, false); G.body.setLinearVelocity({ x: (tx - p.x) / tf, y: vy }); G.body.setAwake(true); G.thrown = 1; G.air = true; ev('beastthrow', m.x, m.y, G.side, G.slot); A.u = null;
    }
  }
}
// 被叼著的兵：穿過磚（不然被甩過城牆的時候會把整排磚撞飛）
function unitGhost(u, on) { if (!u.body) return; for (let f = u.body.getFixtureList(); f; f = f.getNext()) f.setFilterData({ categoryBits: CAT_UNIT, maskBits: on ? 0 : CAT_TERR | CAT_BLOCK, groupIndex: 0 }); }
// 世界座標 → 軀幹座標
function beastLocal(B, x, y) { const c = Math.cos(B.a), s = Math.sin(B.a), dx = x - B.x, dy = y - B.y; return { x: dx * c + dy * s, y: -dx * s + dy * c }; }
// 第二階段：肚子打開，放出兩隻小機械兵（跳到巨獸前面的地上）
function beastRelease(B) {
  if (B.released) return; B.released = true;
  const T = S.team[1], st = B.st, n = (S.lv.foe.mechs || 2);
  for (let k = 0; k < n; k++) {
    const u = mkUnit(1, 'mech', st, { slot: 4 + k, cx: 0, cy: 0 }, T.hpMul);
    const x = B.x - 3 - k * 3.6, y = 0.05;
    u.x = u.hx = u.hx0 = x; u.y = u.hy = u.hy0 = y; u.fr = null; u.homeB = null;
    u.body.setTransform({ x, y: y + u.bh / 2 }, 0); u.body.setLinearVelocity({ x: -2, y: 3 }); u.body.setAwake(true);
    T.alive++;
    if (T.ai && T.ai.U) T.ai.U = null;
  }
  ev('beastrelease', B.x, B.y - 4, n);
}

/* ---------- 回合 ---------- */
function beastRound() {
  const B = S.beast; if (!B || B.dead) return;
  if (S.round === 1) beastSay(BEAST_LINES.intro);
  B.tired = B.tiredR === S.round;
  if (B.tired) { ev('bosstired', B.pose.head.x, B.pose.head.y + 4); beastSay(BEAST_LINES.tired); }
  B.next = S.round >= 2 && !B.tired ? beastPick(B) : null;
  if (B.next) { ev('beastnext', B.pose.head.x, B.pose.head.y + 5, B.next); beastSay(BEAST_LINES.next[B.next]); if (B.next === 'charge') B.beamR = S.round + 1; }
}
function beastSay(txt) { const B = S.beast; if (B && !B.dead) ev('bosssay', B.pose.head.x, B.pose.head.y + 6, txt); }
// 這一回合放哪一招：照順序輪；這一招放不出來（頭沒了、太遠、砲台上沒人）就這一回合不放（在蓄力），順序照樣往下走
function beastPick(B) {
  if (B.beamR === S.round) return 'beam';
  const head = B.P.head && !B.P.head.dead, gap = beastGap(B), crew = S.team[1].units.some((u) => u.alive && u.fr === B.P.turret);
  const list = B.phase === 1 ? ['quake', 'flame', 'grab', 'flame', 'quake', 'grab'] : B.phase === 2 ? ['volley', 'flame', 'grab', 'quake', 'flame'] : ['charge', 'flame', 'volley', 'quake'];
  const m = list[B.mv++ % list.length];
  if ((m === 'flame' || m === 'grab') && !head) return 'quake';
  if (m === 'flame' && gap > 30) return 'quake';
  if (m === 'grab' && !beastGrabTarget(B)) return head && gap <= 30 ? 'flame' : 'quake';
  if (m === 'volley' && !crew) return null;
  if (m === 'charge' && !B.coreOut) return 'quake';
  return m;
}
// 敵軍開火的時候：照預告放招（排進這一輪的佇列，放完才算這一輪結束）
function beastVolley(q, t0) {
  const B = S.beast; if (!B || B.dead || !B.next) return;
  if (B.next === 'volley' || B.next === 'charge') { q.push({ t: 0.05, beast: 'roar' }); return; }
  q.push({ t: Math.max(0.1, t0 * 0.5), beast: B.next });
}
function beastAct(kind) { const B = S.beast; if (!B || B.dead) return; beastQueue(kind); if (kind === 'flame' || kind === 'grab' || kind === 'beam') ev('beastact', B.pose.head.x, B.pose.head.y, kind); }
// 回合結束：斷腿踉蹌（不走）；走到城下就踩城；不然往前走一段
function beastRoundEnd() {
  const B = S.beast; if (!B || B.dead) return false;
  if (B.staggerR === S.round) { beastQueue('stagger'); ev('beaststagger', B.x, B.y); return true; }
  const gap = beastGap(B);
  if (gap <= 1.2) {
    if (!B.wallSaid) { B.wallSaid = true; beastSay(BEAST_LINES.wall); }
    B.atWall = true; beastQueue(B.legs[0].broken || B.down ? 'quake' : 'stomp'); return true;
  }
  let dx = BEAST.walk[Math.min(2, (B.down ? 3 : B.phase) - 1)];
  if (B.tangleR === S.round) { dx *= 0.5; ev('beasttangle', B.x, B.y); }
  dx = Math.min(dx, gap - 0.6);
  if (dx < 0.3) return false;
  beastQueue('walk', { dx }); ev('beastwalk', B.x, B.y, dx); return true;
}

/* ---------- 挨打 ---------- */
// 爆炸炸到巨獸的一塊：照離爆炸多遠打折（直接打中的那一塊吃全額）
function beastBlast(p, x, y, r, dmg, kind, side, hit) {
  if (p.dead || !p.body || side === 1) return;
  const q = p.body.getPosition(), a = p.body.getAngle(); let d;
  if (p.r) d = Math.max(0, Math.hypot(x - q.x, y - q.y) - p.r);
  else { const c = Math.cos(a), s = Math.sin(a), lx = (x - q.x) * c + (y - q.y) * s, ly = -(x - q.x) * s + (y - q.y) * c; d = Math.hypot(Math.max(0, Math.abs(lx) - p.hw), Math.max(0, Math.abs(ly) - p.hh)); }
  const f = p === hit ? 1 : 1 - d / r; if (f <= 0) return;
  beastHurt(p, p === hit ? dmg : dmg * 0.6 * Math.min(1, f), kind, side, x, y);
}
function beastHurt(p, d0, kind, side, x, y, dot) {
  const B = S.beast; if (!B || B.dead || p.dead || side === 1 || d0 <= 0) return;
  if (S.state !== 'play') return;
  const d = d0 * DM[kind][M_IRON] * (kind === K_MAG ? 2.5 : 1); if (d <= 0) return;          // 磁暴：整頭鐵造的巨獸被吸得關節卡死，特別痛
  if (!dot) p.flash = 1;
  if (p.hm > 0) { p.hp -= d; if (p.hp <= 0) { beastBreak(p, side); } }
  B.stat[p.type] = (B.stat[p.type] || 0) + d * p.bk;          // 打在哪個部位（測試、調平衡用）
  beastDmg(d * p.bk, side, x, y, p);
}
function beastDmg(bd, side, x, y, p) {
  const B = S.beast; if (!B || B.dead || bd <= 0) return;
  if (B.tired && side === 0) bd *= 2;          // 破綻：這一回合打巨獸加倍
  // 換階段：跨過門檻的那一輪，超過的傷害只算三成五，最多打到下一個門檻上面一點
  const lv = B.def, th = B.hm * (B.phase === 1 ? lv.p2 : B.phase === 2 ? lv.p3 : -1);
  if (B.softVol === S.vol) bd *= BEAST_SOFT;
  else if (th > 0 && B.hp - bd < th) { const pre = Math.max(0, B.hp - th); bd = pre + (bd - pre) * BEAST_SOFT; B.softVol = S.vol; B.softLo = B.hm * (B.phase === 1 ? lv.p3 + 0.05 : 0.06); }
  if (B.softVol === S.vol && B.hp - bd < B.softLo) bd = Math.max(0, B.hp - B.softLo);
  const before = B.hp; B.hp -= bd; const dd = before - Math.max(0, B.hp);
  if (PH.dk > 0) PH.dacc += dd;          // 傷害數字
  if (side === 0) { const T = S.team[0]; T.dealt += dd; T.ult.c = Math.min(T.ult.need, T.ult.c + dd * T.ult.gain * 0.6 * ultK(0)); }
  if (B.hp <= 0) { beastDie(side); return; }
  beastPhase(B);
}
function beastPhase(B) {
  const f = B.hp / B.hm, lv = B.def;
  if (B.phase === 1 && f <= lv.p2 + 1e-6) {
    B.phase = 2; ev('phase', 2); beastSay(BEAST_LINES.p2);
    beastQueue('settle', { feet: null }); beastQueue('release');
  } else if (B.phase === 2 && f <= lv.p3 + 1e-6) {
    B.phase = 3; B.down = true; ev('phase', 3); beastSay(BEAST_LINES.p3);
    const C = B.P.chest; if (C && !C.dead) beastBreak(C, 2, true);
    const b = beastBase(B), f0 = B.legs.map((L) => L.fx);
    beastQueue('settle', { feet: B.legs.map((L) => B.x + L.hip[0] + (L.k ? 5.5 : -6.5)), f0 });
  }
}
// 一塊被打壞：變成幾塊鐵碎片掉下去；照部位有不同的效果
function beastBreak(p, side, quiet) {
  const B = S.beast; if (p.dead) return;
  p.dead = true; p.hp = 0;
  const q0 = p.body.getPosition(), q = { x: q0.x, y: q0.y }, a = p.body.getAngle();
  beastDebris(p, q.x, q.y, a);
  beastKillBody(p);
  if (!quiet && p.brk) { const bd = B.hm * p.brk; B.hp -= bd; if (side === 0) S.team[0].dealt += bd; }
  ev('beastpart', q.x, q.y, p.type, side);
  if (p.type === 'knee') {
    const L = B.legs[p.leg], sfx = L.k ? 'R' : 'F'; L.broken = true;
    for (const id of ['shin' + sfx, 'foot' + sfx, 'cap' + sfx]) { const o = B.P[id]; if (o && !o.dead) { o.dead = true; const oq = o.body.getPosition(); beastDebris(o, oq.x, oq.y, o.body.getAngle()); beastKillBody(o); } }
    B.staggerR = S.round; B.tiredR = S.round + 1;
    if (B.legs[0].broken && B.legs[1].broken) B.down = true;
    beastQueue('stagger');
  } else if (p.type === 'turret') {
    for (const u of S.team[1].units) if (u.fr === p) { u.fr = null; if (u.body) u.body.setAwake(true); }
  } else if (p.type === 'chest') {
    B.coreOut = true; const C = B.P.core; if (C && C.body) { C.body.setActive(true); }
    ev('coreout', q.x, q.y);
  }
  if (B.hp <= 0) beastDie(side); else beastPhase(B);
}
function beastKillBody(p) { if (!p.body) return; if (PH.inStep) PH.kill.push(p.body); else PH.world.destroyBody(p.body); p.body = null; }
// 鐵碎片：落石那一堆裡的幾塊鐵（會掉下去、會滾、會擋砲彈）
function beastDebris(p, x, y, a) {
  const n = p.type === 'knee' || p.type === 'cap' ? 2 : p.type === 'core' ? 0 : 3, s = Math.max(p.hw, p.hh, p.r);
  for (let k = 0; k < n; k++) {
    const w = clamp(s * (0.5 + rnd() * 0.4), 0.6, 2.6), h = clamp(w * (0.5 + rnd() * 0.5), 0.5, 1.8);
    const b = mkBlock(S.rubble, { mat: M_IRON, kind: 'box', x: x + (rnd() - 0.5) * s, y: y + (rnd() - 0.5) * s * 0.6, w, h, a: a + (rnd() - 0.5), awake: true });
    b.inPlace = false; b.lost = true; b.hp = b.hm = 120; b.scrap = 1;
    b.body.setLinearVelocity({ x: (rnd() - 0.3) * 8, y: 2 + rnd() * 6 }); b.body.setAngularVelocity((rnd() - 0.5) * 5);
  }
}
function beastDie(side) {
  const B = S.beast; if (B.dead) return;
  B.dead = true; B.hp = 0; B.next = null; B.queue.length = 0;
  ev('beastdie', B.x, B.y, side); beastSay(BEAST_LINES.die);
  for (const u of S.units) if (u.grabbed) { u.grabbed = null; if (u.body) { u.body.setType('dynamic'); unitGhost(u, false); u.body.setAwake(true); } }
  B.anim = null; beastStart('die');
}

/* ---------- 自動玩家想打的要害：護膝甲、露出來的膝關節、頭、胸甲、核心 ---------- */
function beastWeak(side) {
  const B = S.beast, out = []; if (side !== 0 || !B || B.dead) return out;
  for (const p of B.parts) {
    if (p.dead || !p.body || !p.body.isActive()) continue;
    const q = p.body.getPosition(), t = p.type;
    if (t === 'cap') out.push({ x: q.x, y: q.y, w: 1.0, near: 2.6 });
    else if (t === 'knee') out.push({ x: q.x, y: q.y, w: B.P['cap' + (p.leg ? 'R' : 'F')].dead ? 1.3 : 0.8, near: 2.3 });
    else if (t === 'head') out.push({ x: q.x, y: q.y, w: 0.95, near: 3.2 });
    else if (t === 'chest' && B.phase >= 2) out.push({ x: q.x, y: q.y, w: 1.0, near: 2.6 });
    else if (t === 'core') out.push({ x: q.x, y: q.y, w: 1.5, near: 2.6 });
  }
  return out;
}
