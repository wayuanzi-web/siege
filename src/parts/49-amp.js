/* ===== 49-amp: 每一關戰場中間的「放大／變化」 =====
   倍增符只留給第一關和魔王關；其他關各有自己的一套：
   滾地砲（第 2 關）、冰鏡（3）、地火（4，見 50-sim 的 geyser）、噴流（5）、打水漂（6）、雷雲與避雷針（8）、彈簧板（9）、稜鏡（10）、黑洞（12）。
   砲彈變強就是 SH.mass 乘上去：爆炸的傷害、範圍、推力都照 mass 算，畫出來也比較大顆。
   同一套函式給戰局（shotsStep）和試射（simTrace：敵軍瞄準、我方的瞄準線）用 —— 都是改 SA 這一份砲彈狀態，所以試射跟真的打出去一樣 */
const SA = { x: 0, y: 0, vx: 0, vy: 0, nx: 0, ny: 0, mass: 1, flag: 0, k: 0, a0: 0, a1: 0, side: 0, wi: 0, hx: 0, hy: 0, o: null };
function saLoad(i) { SA.x = SH.x[i]; SA.y = SH.y[i]; SA.vx = SH.vx[i]; SA.vy = SH.vy[i]; SA.mass = SH.mass[i]; SA.flag = SH.flag[i]; SA.k = SH.k[i]; SA.a0 = SH.a0[i]; SA.a1 = SH.a1[i]; SA.side = SH.side[i]; SA.wi = SH.w[i]; SA.o = null; }
function saStore(i) { SH.x[i] = SA.x; SH.y[i] = SA.y; SH.vx[i] = SA.vx; SH.vy[i] = SA.vy; SH.mass[i] = SA.mass; SH.flag[i] = SA.flag; SH.k[i] = SA.k; SH.a0[i] = SA.a0; SH.a1[i] = SA.a1; }
// 這一關有哪些放大（simInit 裡算一次，每一步不用再找）
const AMP = { roll: null, skip: null, jets: [], holes: [], any: false };
function ampInit() {
  AMP.roll = S.lv.roll || null; AMP.skip = S.lv.skip || null; AMP.jets.length = 0; AMP.holes.length = 0;
  for (const o of S.objs) { if (o.t === 'jet') AMP.jets.push(o); else if (o.t === 'hole') AMP.holes.push(o); }
  AMP.any = !!(AMP.roll || AMP.skip || AMP.jets.length || AMP.holes.length);
}

/* ---------- 滾地砲（第 2 關）：落在山坡「往對方那一面」的砲彈不炸，一路滾下去 ----------
   往下滾掉的高度越多越重（每掉一格高度多 R.k 倍，最多 R.max 倍）；滾到平地慢慢停，撞到東西才炸。
   撞到擋滾石的木樁：撞得斷就撞斷、繼續滾；撞到還架在坡上的大滾石：從它上面彈起來跳過去 */
const ROLL_R = 0.55, ROLL_MU = 0.1;
function slopeAt(x) { return (groundYRaw(x + 0.3) - groundYRaw(x - 0.3)) / 0.6; }
function rollOk(x, side, wi, vx, vy) {
  const R = AMP.roll; if (!R || side > 1) return false;
  const w = WL[wi]; if (w.r <= 0 || w.phys || w.id === 'drop') return false;
  if (x < R.x0 || x > R.x1 || groundY(x) < -100) return false;
  const dir = side === 0 ? 1 : -1, s = slopeAt(x) * dir;
  if (s < -0.08) return true;          // 這裡的坡往對方那邊下去：滾
  /* 落在自己這一面的上半坡、往前衝得夠快：往上滾過山頂，再從對面那一面滾下去（衝不過山頂就在半坡停下來炸）。
     山頂附近平平的地方也一樣 */
  if (vx === undefined || !R.top) return false;
  const y = groundYRaw(x); if (y < R.top * 0.5) return false;
  const c = 1 / Math.sqrt(1 + s * s), vt = (vx * dir + vy * s * dir * dir) * c * 0.6;
  return vt > 7 && vt * vt > 2 * GRAV * (R.top - y) * (1 + ROLL_MU * 2) + 49;
}
function rollStart(x) {
  const dir = SA.side === 0 ? 1 : -1, s = slopeAt(x), c = 1 / Math.sqrt(1 + s * s), vt = (SA.vx + SA.vy * s) * c;          // vt：沿著坡面的速度
  SA.flag |= F_ROLL; SA.a0 = SA.mass; SA.a1 = groundYRaw(x);
  SA.x = x; SA.y = groundYRaw(x) + ROLL_R; SA.vx = dir * Math.max(7, vt * dir * 0.6); SA.vy = 0;
}
// 走一步。回傳 0 繼續滾、1 在 SA.hx/hy 炸開（SA.o 是撞到的東西）、2 離開地面（變回在天上飛）
function rollMove(dt, trace) {
  const R = AMP.roll, dir = SA.side === 0 ? 1 : -1;
  const s = slopeAt(SA.x), c = 1 / Math.sqrt(1 + s * s), sn = s * c;
  let v = SA.vx;
  v += (-GRAV * sn - ROLL_MU * GRAV * c * (v > 0 ? 1 : -1)) * dt;
  if (v * dir < 1.5) { SA.hx = SA.x; SA.hy = SA.y; SA.vx = v * c; SA.vy = v * sn; return 1; }          // 停了：原地炸開
  const nx = SA.x + v * c * dt;
  if (groundY(nx) < -100) { SA.flag &= ~F_ROLL; SA.vx = v * c; SA.vy = v * sn; return 2; }          // 滾出地面（掉進深谷）
  const ny = groundYRaw(nx) + ROLL_R;
  const hit = rayShot(SA.x, SA.y, nx, ny, SA.side, false);
  if (hit) {
    const o = RAY.o;
    if (o && o.isBlock && o.roll && !o.roll.go) {          // 還架在坡上的大滾石：彈起來跳過去
      const bp = o.body.getPosition(); SA.flag &= ~F_ROLL; SA.x = bp.x - dir * o.r * 0.2; SA.y = bp.y + o.r + 0.7; SA.vx = v * 0.8; SA.vy = Math.abs(v) * 0.3 + 3; SA.hx = RAY.x; SA.hy = RAY.y; return 2;          // 從滾石頂上彈過去
    }
    if (o && o.isBlock && o.stake && o.stake.to === 1 - SA.side && !o.dead) {
      // 擋滾石的木樁：撞得斷就撞斷，繼續滾（試射的時候用算的）
      const d = WL[SA.wi].dmg * SA.mass * 1.6 * S.team[SA.side].dmg * S.rage;
      if (trace) { if (d * DM[K_HEAVY][o.mat] >= o.hp) v *= 0.75; else { SA.hx = RAY.x; SA.hy = RAY.y; SA.o = o; SA.vx = v * c; SA.vy = v * sn; return 1; } }
      else { blockHurt(o, d, K_HEAVY, SA.side, RAY.x, RAY.y); if (o.dead) { v *= 0.75; ev('rollsmash', RAY.x, RAY.y); } else { SA.hx = RAY.x; SA.hy = RAY.y; SA.o = o; SA.vx = v * c; SA.vy = v * sn; return 1; } }
    } else { SA.hx = RAY.x; SA.hy = RAY.y; SA.o = o; SA.vx = v * c; SA.vy = v * sn; return 1; }
  }
  SA.x = nx; SA.y = ny; SA.vx = v;
  SA.mass = SA.a0 * Math.min(R.max, 1 + R.k * Math.max(0, SA.a1 - groundYRaw(nx)));
  return 0;
}

/* ---------- 噴流（第 5 關）：一條水平的氣流帶 ----------
   順著氣流飛進去的砲彈被捲住：橫向速度拉到氣流的速度、上下的速度被吸平、重力被托住，沿著氣流衝出去；
   一發砲彈只加速一次（威力 ×gain）。逆著氣流的只會被減速 */
function jetForce(o, dt) {
  if (SA.x < o.x0 || SA.x > o.x1 || Math.abs(SA.y - o.y) > o.hh) return 0;
  const U = o.U;
  if (SA.vx * U > 0) {
    SA.vx += (U - SA.vx) * Math.min(1, o.kx * dt);
    SA.vy = SA.vy * Math.exp(-o.ky * dt) + (GRAV * 0.92 + (o.y - SA.y) * o.kc) * dt;
    if (!SA.k && Math.abs(SA.vx) > Math.abs(U) * 0.8) { SA.k = 1; SA.mass *= o.gain; return 1; }
  } else SA.vx += (U - SA.vx) * Math.min(1, o.kx * 0.3 * dt);
  return 0;
}
/* ---------- 黑洞（魔王關第二階段）：附近的砲彈被吸過去、繞著它甩；太靠近就被吞掉 ---------- */
function holeForce(o, dt) {
  if (!o.on) return 0;
  const dx = o.x - SA.x, dy = o.y - SA.y, d2 = dx * dx + dy * dy;
  if (d2 > o.R * o.R) return 0;
  if (d2 < o.rs * o.rs) return 2;
  const d = Math.sqrt(d2), a = o.G / Math.max(d2, 6);
  SA.vx += dx / d * a * dt; SA.vy += dy / d * a * dt;
  return 0;
}
// 每一步積分之前：氣流、黑洞。回傳 1 被加速（噴流）、2 被吞掉
function ampForces(dt) {
  let r = 0;
  for (const o of AMP.jets) if (jetForce(o, dt)) r = 1;
  for (const o of AMP.holes) if (holeForce(o, dt) === 2) return 2;
  return r;
}

/* ---------- 一段鏡面、彈簧板：SA 這一步（x,y → nx,ny）有沒有打到 ----------
   回傳 0 沒碰到、1 打到亮面彈回來（位置已經挪到鏡面外）、2 打到背面（擋下）。打到的點在 SA.hx/hy */
function segBounce(o, boost) {
  const t = segHit(SA.x, SA.y, SA.nx, SA.ny, o.x - o.dx, o.y - o.dy, o.x + o.dx, o.y + o.dy);
  if (t < 0) return 0;
  const hx = SA.x + (SA.nx - SA.x) * t, hy = SA.y + (SA.ny - SA.y) * t, nx = -o.dy / o.len, ny = o.dx / o.len, dot = SA.vx * nx + SA.vy * ny;
  SA.hx = hx; SA.hy = hy;
  if (dot > 0 && o.one) return 2;
  SA.vx -= 2 * dot * nx; SA.vy -= 2 * dot * ny;
  if (boost) { SA.vx *= boost; SA.vy *= boost; }
  const sp = Math.hypot(SA.vx, SA.vy) || 1;
  SA.nx = hx + SA.vx / sp * 0.6; SA.ny = hy + SA.vy / sp * 0.6; SA.x = SA.nx; SA.y = SA.ny;
  return 1;
}
// 圓形的東西（稜鏡）：這一步有沒有穿進去
function circIn(o) {
  const dx = SA.nx - o.x, dy = SA.ny - o.y; if (dx * dx + dy * dy > o.r * o.r) return false;
  const ex = SA.x - o.x, ey = SA.y - o.y; return ex * ex + ey * ey > o.r * o.r;
}
// 雷雲（橢圓）裡面
function cloudIn(o) { const dx = (SA.nx - o.x) / o.rx, dy = (SA.ny - o.y) / o.ry; return dx * dx + dy * dy < 1; }
/* 機關對砲彈：回傳 0 沒事、1 改了方向（繼續飛）、2 被擋下（在 SA.hx/hy 炸開）、3 稜鏡（呼叫的人負責分成三發）、4 帶電、5 結霜反彈
   trace：試射（不改機關的狀態） */
function ampObj(o) {
  switch (o.t) {
    case 'mirror': {
      if (o.side !== undefined && o.side !== SA.side && SA.side < 2) return 0;          // 對方的冰鏡：穿過去（只有自己那一面幫自己，不會變成擋住對方的牆）
      if (Math.abs(SA.nx - o.x) > o.len + 4 && Math.abs(SA.x - o.x) > o.len + 4) return 0;
      const r = segBounce(o, 0); if (!r) return 0;
      if (r === 2) return 2;
      SA.flag = (SA.flag | F_WILD | (o.frost ? F_FROST : 0)) & ~F_IN;
      return o.frost ? 5 : 1;
    }
    case 'spring': {
      if (Math.abs(SA.nx - o.x) > o.len + 4 && Math.abs(SA.x - o.x) > o.len + 4) return 0;
      if (SA.k >= (o.max || 3)) return 0;
      const r = segBounce(o, o.boost || 1.12); if (!r) return 0;
      if (r === 2) return 2;
      SA.k++; SA.mass *= o.gain || 1.25; SA.flag = (SA.flag | F_WILD) & ~F_IN;
      return 1;
    }
    case 'prism': return (SA.flag & F_SPLIT) || SA.side > 1 || !circIn(o) ? 0 : 3;
    case 'cloud': {
      if ((SA.flag & F_ZAPC) || SA.side > 1 || !cloudIn(o)) return 0;
      SA.flag |= F_ZAPC; return 4;
    }
  }
  return 0;
}
/* ---------- 打水漂（第 6 關）：平平打到水面、夠快，彈起來（最多 K.max 次），每跳一次威力 ×K.gain ----------
   t：這一步在哪裡碰到水面（0..1）。回傳 true 表示彈起來了（位置、速度都改好了） */
function waterSkip(t) {
  const K = AMP.skip; if (!K || SA.side > 1 || SA.k >= K.max || WL[SA.wi].phys) return false;
  const ax = Math.abs(SA.vx), sp = Math.hypot(SA.vx, SA.vy);
  if (-SA.vy > K.slope * ax || sp < K.vmin) return false;
  const W = S.water, hx = SA.x + (SA.nx - SA.x) * t;
  SA.hx = hx; SA.hy = W.y;
  SA.vy = -SA.vy * K.keep + K.up; SA.vx *= K.fric; SA.k++; SA.mass *= K.gain;
  SA.x = SA.nx = hx; SA.y = SA.ny = W.y + 0.06;
  return true;
}
// 稜鏡：一發分成三發（紅＝火、黃＝雷、藍＝霜），往上、正中、往下散開。原本那一發變成正中那一發
function prismSplit(i, o) {
  const side = SH.side[i], vx = SH.vx[i], vy = SH.vy[i], m = SH.mass[i] * Math.pow(3, -SPLIT_P), base = SH.flag[i] | F_SPLIT;
  SH.mass[i] = m; SH.flag[i] = (base | F_ZAPC) & ~F_IN;
  const sg = side === 1 ? -1 : 1;          // 敵軍往左打：同樣讓火在上、霜在下
  for (const [a, f] of [[sg * o.spread, F_FIRE], [-sg * o.spread, F_FROST]]) {
    if (SH.cnt[side] >= SHOT_CAP) { SH.mass[i] += m; continue; }
    const c = Math.cos(a), s = Math.sin(a);
    const j = spawnShot(side, SH.w[i], SH.x[i], SH.y[i], vx * c - vy * s, vy * c + vx * s, m, (base | f) & ~F_IN, SH.mask[i], SH.lin[i] * 3);
    if (j >= 0) SH.age[j] = SH.age[i];
  }
  SH.lin[i] *= 3; if (side === 0 && SH.lin[i] > S.stat.swarm) S.stat.swarm = SH.lin[i];
  o.flash = 1; ev('prism', o.x, o.y, side);
}

/* ---------- 每回合：機關換位置、換角度、換方向 ---------- */
function ampRound() {
  const r = S.round;
  for (const o of S.objs) {
    if (o.t === 'mirror' && o.angs) { const k = (r - 1) % o.angs.length; o.tgt = o.angs[k]; }
    else if (o.t === 'jet') {
      // 每回合換方向；每兩回合換一個高度（低、中、高輪流）。兩回合裡雙方各順風一次
      const lv = o.lv, k = Math.floor((r - 1) / 2) % lv.length;
      o.U = Math.abs(o.U) * (((r - 1) & 1) ? -1 : 1) * (o.flip || 1); o.y = lv[k]; o.age = 0;
      ev('jet', o.x0, o.x1, o.y, o.U);
    } else if (o.t === 'cloud' && o.spots) { const k = (r - 1) % o.spots.length; o.tx = o.x = o.spots[k][0]; o.ty = o.y = o.spots[k][1]; }          // 雷雲一換回合就在新的位置（瞄準線、敵軍都照這裡算），畫面上才慢慢飄過去
  }
}
function ampStep(dt) {
  for (const o of S.objs) {
    if (o.t === 'mirror' && o.tgt !== undefined && o.ang !== o.tgt) { const d = o.tgt - o.ang, st = 1.4 * dt; o.ang = Math.abs(d) <= st ? o.tgt : o.ang + Math.sign(d) * st; o.dx = Math.cos(o.ang) * o.len; o.dy = Math.sin(o.ang) * o.len; }
    else if (o.t === 'cloud') { if (o.px === undefined) { o.px = o.x; o.py = o.y; } const k = Math.min(1, dt * 3); o.px += (o.x - o.px) * k; o.py += (o.y - o.py) * k; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4); }          // px、py：畫在哪裡（慢慢飄到 x、y）
    else if (o.t === 'jet') o.age = (o.age || 0) + dt;
    else if (o.t === 'spring' || o.t === 'prism') { if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4); }
  }
}
// 敵軍、自動玩家瞄這一關的放大：關卡可以給 ampAim(side) 一串入口點；沒給的話照機關的位置猜
function ampAims(side) {
  const lv = S.lv; if (lv.ampAim) return lv.ampAim(side);
  const out = [], dir = side === 0 ? 1 : -1;
  for (const o of S.objs) {
    if (o.t === 'mirror' && (o.side === undefined || o.side === side)) out.push({ x: o.x, y: o.y, amp: 1 });
    else if (o.t === 'spring' && (o.side === undefined || o.side === side)) out.push({ x: o.x, y: o.y, amp: 1 });
    else if (o.t === 'prism') { out.push({ x: o.x, y: o.y, amp: 1 }); out.push({ x: o.x - dir * o.r * 0.5, y: o.y + o.r * 0.5, amp: 1 }); }
    else if (o.t === 'cloud') out.push({ x: o.x, y: o.y, amp: 1 });
    else if (o.t === 'jet' && o.U * dir > 0) { const xe = dir > 0 ? o.x0 + 3 : o.x1 - 3; out.push({ x: xe, y: o.y, amp: 1 }); out.push({ x: xe + dir * 6, y: o.y, amp: 1 }); }
  }
  return out;
}
