/* ===== 54-craft: 第四篇（第 19–24 關）：工匠營的新兵器和新戰場 =====
   兵器（數字在 40-defs 的 WL、UNIT）：
     鉤索手：鉤爪打到磚（或兵）就鉤住，自己下一輪開火時收繩，把它往自己這邊扯（穿過傳送門的鉤爪往出口那邊扯：整塊往上拔）
     秤砣兵：千斤鐵砣是一塊真的鐵（phys），不會爆；砸穿木樓板以後一直留在原地壓著，每回合結束把底下那一塊壓壞一點（疊起來壓得更重）
     門術師：門珠落地，在落點上空開一道出口、自己城前開一道入口；之後自己這一邊打進入口的砲彈從出口出來，一律往下砸（角度照打進去的）
     鏡盾兵：不開火，在頭頂舉起一面銅鏡：對方下一輪打過來的砲彈照角度反彈回去（反彈的算鏡子主人的），挨夠了就碎
   戰場：
     第十九關「天秤」（lv.saw）：整片戰場是一根架在尖峰上的巨樑，兩座城蓋在兩頭；回合結束照兩邊的重量傾斜（重的那頭沉下去），
           巨樑上的大石球順著坡滾下去撞城
     第二十關「天塹」（lv.wall、lv.arches）：中間一道通天的石壁，砲彈怎麼吊都過不去；兩邊各一座古門，每回合換一次通到哪裡（有時通回自己頭上）
   跟戰局用同一套 S、SH；不碰畫面，Node 裡也能跑 */

/* ---------- 開局 ---------- */
// 物理世界剛建好、城還沒蓋（巨樑、石壁要先在，城蓋在巨樑上）
function craftWorld() {
  wildWorld();
  S.saw = null; S.shotU = new Map(); S.shotVia = new Map(); S.wallX = null;
  const lv = S.lv;
  if (lv.saw) sawWorld(lv.saw);
  if (lv.wall) {
    const W = lv.wall; S.wallX = [W.x0, W.x1];
    PH.ground.createFixture({ shape: new PL.Box((W.x1 - W.x0) / 2, (W.top - W.y0) / 2, { x: (W.x0 + W.x1) / 2, y: (W.y0 + W.top) / 2 }, 0), friction: 0.85, filterCategoryBits: CAT_TERR });
  }
}
// 城和兵都放好了（calib 之前）
function craftSetup() {
  const lv = S.lv;
  if (S.saw) sawAttach();
  wildSetup();
  duskSetup();
  if (lv.arches) {
    const A = lv.arches;
    for (const side of [0, 1]) S.objs.push({ t: 'warp', kind: 'gate', side, ix: side ? VIEW_W - A.x : A.x, iy: A.y, r: A.r, ox: 0, oy: 0, on: true, dest: '', flash: 0, age: 0 });
  }
}

/* ---------- 兵器打到東西（51-arms 的 armsHit 轉過來）：回傳 0 照原本的打法、1 處理完了 ---------- */
function craftHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i], mass = SH.mass[i], T = side < 2 ? S.team[side] : null, mul = (T ? T.dmg : 1) * S.rage * mass, id = SH.id[i];
  const u = S.shotU.get(id); S.shotU.delete(id);
  const via = S.shotVia.get(id); if (via) S.shotVia.delete(id);
  if (w.warp) {
    physExplode(hx, hy, w, side, mass, SH.flag[i], o, vx, vy);
    if (side < 2 && S.team[side].units.some((q) => q.alive && q.type === 'warp')) warpSet(side, hx, hy);          // 被銅鏡彈回去的門珠（現在算鏡子那一邊的）：那一邊沒有門術師就不開門
    return 1;
  }
  if (w.hook) {
    if (side > 1 || !u || !u.alive || u.side !== side) return 0;          // 被銅鏡彈回去的鉤爪：不算數
    if (hit === 2 && o && o.isBlock && !o.dead && o.body && o.body.isDynamic() && o.st && o.st.side === 1 - side) {          // 只鉤得住敵城上的磚（自己的城、地上的鐵砣、碎石不算）
      blockHurt(o, w.dmg * mul, K_PIERCE, side, hx, hy);
      if (o.dead || !o.body) return 1;
      const q = o.body.getLocalPoint({ x: hx, y: hy });
      hookSet(u, { host: o, lp: { x: q.x, y: q.y }, x: hx, y: hy, via });
      return 1;
    }
    if (hit === 3 && o && o.alive && !o.def.big) {
      hurtUnit(o, w.ud * mul, side, K_PIERCE, false);
      if (o.alive) hookSet(u, { hostU: o, x: hx, y: hy, via });
      return 1;
    }
    return 0;
  }
  return 0;
}

/* ---------- 鉤索 ---------- */
const HOOK_END = 2.2;          // 繩子兩頭這麼長的一段炸不斷（不然對方一打鉤索手、一打被鉤住的那塊，繩子就斷，等於鉤不成）
function hookSet(u, d) {
  for (const o of S.objs) if (o.t === 'hook' && o.u === u && o.hp > 0 && !o.go) { o.hp = 0; ev('hookcut', o.x, o.y, u.side, 1); }          // 一個鉤索手只牽一條繩：鉤到新的，舊的放掉
  const o = Object.assign({ t: 'hook', side: u.side, u, hp: 1, go: 0, age: 0, yank: 0, flash: 0, host: null, hostU: null, lp: null }, d);
  S.objs.push(o); ev('hookin', o.x, o.y, u.side);
  return o;
}
// 鉤索手的手（繩子的這一頭）
function hookHand(o) { const u = o.u, dir = u.side === 0 ? 1 : -1; _hh.x = u.x + dir * 0.9; _hh.y = u.y + 2.2; return _hh; }
const _hh = { x: 0, y: 0 };
// 繩子是哪幾段：手 → 鉤爪；穿過傳送門的：手 → 入口、出口 → 鉤爪
function hookSegs(o, out) {
  const h = hookHand(o); out.length = 0;
  if (o.via) out.push(h.x, h.y, o.via.ix, o.via.iy, o.via.ox, o.via.oy, o.x, o.y); else out.push(h.x, h.y, o.x, o.y);
  return out;
}
const _hs4 = [];
// 這一邊開火：上一輪鉤住的一條一條收繩
function hooksGo(side) {
  let k = 0;
  for (const o of S.objs) if (o.t === 'hook' && o.side === side && o.hp > 0 && !o.go) { o.go = S.time + 0.3 + 0.18 * k++; ev('hookreel', o.x, o.y, side); }
}
function hookCut(o, by, quiet) { if (o.hp <= 0) return; o.hp = 0; if (!quiet) ev('hookcut', o.x, o.y, o.side, 0, by); }
// 收繩：拉多久、往哪拉
function hookStep(o, dt) {
  if (o.hp <= 0) return true;
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4);
  const u = o.u; if (!u.alive) { hookCut(o, 2); return true; }
  if (o.host) { const b = o.host; if (b.dead || !b.body) { hookCut(o, 2, true); return true; } const q = b.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y; }
  else if (o.hostU) { const v = o.hostU; if (!v.alive || !v.body) { hookCut(o, 2, true); return true; } o.x = v.x; o.y = v.y + 1.6; }
  if (!o.go || S.time < o.go) return false;
  const H = WPN.hook.hook, tt = S.time - o.go;
  if (tt >= H.t) { ev('hookdone', o.x, o.y, o.side); return true; }
  // 往哪拉：直接鉤住的往鉤索手的手；穿過傳送門的往出口（從上面把它拔出來）
  const h = hookHand(o), tx = o.via ? o.via.ox : h.x, ty = o.via ? o.via.oy : h.y, dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1;
  if (o.host) {
    const b = o.host, body = b.body, v = body.getLinearVelocity(), T = S.team[o.side];
    if (v.x * dx / d + v.y * dy / d > 14) return false;          // 已經被扯得飛起來了：不再加速（不會把一塊磚甩過半個戰場）
    const F = Math.min(H.F, b.mass * GRAV * 2.5 + 1500) * (T ? Math.sqrt(T.dmg) : 1);
    body.setAwake(true); body.applyForce({ x: dx / d * F, y: dy / d * F + b.mass * GRAV * 0.25 }, { x: o.x, y: o.y }, true);
    if (!o.yank) { o.yank = 1; ev('hookyank', o.x, o.y, o.side); S.chainT = S.time; if (S.lv.vines) vinesChop(b, o.side); }          // 古藤（第二十一關）：扯的那一塊身上的藤一起扯斷
  } else if (o.hostU && !o.yank) {
    // 鉤到兵：一把扯出城（落地不死）
    o.yank = 1; const v = o.hostU;
    if (!r1v(v.side) && v.body) { v.body.setAwake(true); v.body.setLinearVelocity({ x: dx / d * H.uv, y: Math.max(8, dy / d * H.uv + 6) }); hurtUnit(v, 10 * (S.team[o.side] ? S.team[o.side].dmg : 1), o.side, K_CRUSH); ev('hookyank', o.x, o.y, o.side, 1); }
  }
  return false;
}
// 爆炸炸到繩子（兩頭各 HOOK_END 那一段不算）
function hooksBlast(x, y, r, side) {
  for (const o of S.objs) {
    if (o.t !== 'hook' || o.hp <= 0 || o.go || o.side === side || side > 1) continue;
    const L = hookSegs(o, _hs4);
    for (let k = 0; k + 3 < L.length; k += 4) {
      const ax = L[k], ay = L[k + 1], bx = L[k + 2], by = L[k + 3], len = Math.hypot(bx - ax, by - ay); if (len < HOOK_END * 2 + 0.5) continue;
      const d = segDist(x, y, ax, ay, bx, by), t = Math.hypot(_sq.x - ax, _sq.y - ay);
      if (d < r * 0.55 + 0.6 && t > HOOK_END && len - t > HOOK_END) { hookCut(o, side); break; }
    }
  }
}

/* ---------- 千斤鐵砣 ---------- */
const WEIGHT_MAX = 6;          // 每一邊場上最多幾顆（再丟就把最舊的那顆收掉）
function spawnWeight(u, T, w, ax, ay) {
  const dir = T.dir, mx = u.x + dir * 1.5, my = u.y + 2.7;
  let live = 0, old = null; for (const b of S.rubble.blocks) if (!b.dead && b.weight && b.bSide === u.side) { live++; if (!old) old = b; }
  if (live >= WEIGHT_MAX && old) blockKill(old, 2, K_CRUSH, true);
  const b = mkBlock(S.rubble, { mat: M_IRON, kind: 'box', x: mx, y: my, w: w.box.w, h: w.box.h, awake: true, den: w.den });
  b.inPlace = false; b.boulder = 1; b.weight = 1; b.bSide = u.side; b.bFly = 1; b.bIn = 1; b.bHit = 0; b.bMul = T.dmg * S.rage; b.bW = w; b.hp = b.hm = 900; b.wAge = 0;
  b.body.setLinearVelocity({ x: ax, y: ay }); b.body.setAngularVelocity(-dir * 1.2); b.body.setBullet(true);
}
// 回合結束：每一顆停下來的鐵砣把底下那一塊（隔著別的鐵砣也算：疊起來一起壓）壓壞一點
function weightsPress() {
  const acc = new Map();
  for (const b of S.rubble.blocks) {
    if (b.dead || !b.weight || !b.body) continue;
    const v = b.body.getLinearVelocity(); if (v.x * v.x + v.y * v.y > 4) continue;
    const p = b.body.getPosition(); let under = null, uy = -1e9;
    PH.world.rayCast({ x: p.x, y: p.y }, { x: p.x, y: p.y - b.h * 0.5 - CS * 2.2 }, (f, pt, n, fr) => { const o = f.getUserData(); if (!o || o.isRock) { under = null; return fr; } if (!o.isBlock || o.dead || o.weight || o.frag || o === b) return -1; under = o; uy = pt.y; return fr; });
    if (!under || under.side > 1 || !under.inPlace) continue;
    const a = acc.get(under) || { n: 0, by: b.bSide, x: p.x, y: uy }; a.n++; acc.set(under, a);
  }
  for (const [o, a] of acc) {
    const by = a.by === o.side ? 2 : a.by;
    blockHurt(o, WPN.weight.press * a.n * (a.n > 1 ? 1.25 : 1), K_CRUSH, by, a.x, a.y - 0.2);
    ev('weightpress', a.x, a.y, a.n);
  }
  // weightLife（第二十關）：壓過這麼多回合的鐵砣就碎掉（不然全落在古門出口那一點、一層一層疊成鐵頂，後面的砸不到城）
  const life = S.lv.weightLife;
  if (life) for (const b of S.rubble.blocks) if (!b.dead && b.weight && !b.bFly && ++b.wAge >= life) blockKill(b, 2, K_CRUSH, true);
  return acc.size > 0;
}

/* ---------- 傳送門（門術師開的、第二十關的古門） ---------- */
function warpSide(side) { for (const o of S.objs) if (o.t === 'warp' && o.kind === 'mage' && o.side === side) return o; return null; }
// 門珠落在 (x, y)：在那上空開出口（要落在對方那一半才開得成）
function warpSet(side, x, y) {
  const dir = side === 0 ? 1 : -1, W = WPN.warp.warp;
  if ((x - MID) * dir < 3) { ev('warpfail', x, y, side); return; }
  let o = warpSide(side);
  if (!o) {
    const st = S.st[side], wi = S.lv.warpIn, ix = wi ? (side ? VIEW_W - wi[0] : wi[0]) : (side ? st.x0 - 6.5 : st.x1 + 6.5), iy = wi ? wi[1] : st.y0 + st.h * 0.62;
    o = { t: 'warp', kind: 'mage', side, ix, iy, r: W.r, ox: 0, oy: 0, on: true, flash: 0, age: 0 };
    S.objs.push(o);
  }
  o.ox = x; o.oy = Math.min(52, y + W.up); o.on = true; o.flash = 1; o.age = 0;
  ev('warpopen', o.ox, o.oy, side, o.ix, o.iy);
}
// 砲彈這一步（x,y → nx,ny）有沒有穿進傳送門的入口
function warpEnter(o, x, y, nx, ny) { return segDist(o.ix, o.iy, x, y, nx, ny) < o.r; }
// 出口一律往下；古門再多推一把（從門裡衝出來，砸得重一點），橫向的速度收掉一半多（落點就在門寫的那一段城上）
const GATE_PUSH = 14;
function warpVy(o, vy) { return -Math.max(Math.abs(vy), o.kind === 'gate' ? GATE_PUSH : 0); }
function warpVx(o, vx) { return o.kind === 'gate' ? vx * 0.4 : vx; }
// 第二十關的古門：每回合換一次通到哪裡（兩邊一樣的順序）
const ARCH_NAME = { front: '敵城前樓', back: '敵城主樓', self: '自己頭上' };
function archRound() {
  const A = S.lv.arches; if (!A) return;
  const dest = A.seq[(Math.max(1, S.round) - 1) % A.seq.length];
  for (const o of S.objs) {
    if (o.t !== 'warp' || o.kind !== 'gate') continue;
    const me = S.st[o.side], foe = S.st[1 - o.side], dir = o.side === 0 ? 1 : -1;
    const fx = dir > 0 ? foe.x0 + CS * 1.6 : foe.x1 - CS * 1.6, bx = dir > 0 ? foe.x1 - CS * 2.2 : foe.x0 + CS * 2.2;
    o.dest = dest; o.ox = dest === 'front' ? fx : dest === 'back' ? bx : me.cx; o.oy = A.ey; o.flash = 1;
  }
  ev('archshift', MID, A.ey, dest);
}
function archNext(r) { const A = S.lv.arches; return A ? A.seq[(Math.max(1, r) - 1) % A.seq.length] : ''; }
// 傳送門每一步：門術師都倒了，他開的那一對門就關掉
function warpStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 3);
  if (o.kind === 'mage' && !S.team[o.side].units.some((u) => u.alive && u.type === 'warp')) { ev('warpclose', o.ox, o.oy, o.side, o.ix, o.iy); return true; }
  return false;
}
// 飛在天上的大石頭、鐵砣也穿得過傳送門
function warpBodies() {
  for (const b of S.rubble.blocks) {
    if (b.dead || !b.boulder || b.bHit || b.ported) continue;
    const p = b.body.getPosition(), v = b.body.getLinearVelocity();
    for (const o of S.objs) {
      if (o.t !== 'warp' || !o.on || o.side !== b.bSide || o.oy <= 0) continue;
      if (Math.hypot(p.x - o.ix, p.y - o.iy) > o.r) continue;
      ev('warpin', o.ix, o.iy, o.side, 0); b.ported = 1; b.bIn = 0;
      b.body.setTransform({ x: o.ox, y: o.oy }, b.body.getAngle()); b.body.setLinearVelocity({ x: warpVx(o, v.x), y: warpVy(o, v.y) });
      o.flash = 1; ev('warpout', o.ox, o.oy, o.side, 1);
      break;
    }
  }
}

/* ---------- 鏡盾兵的銅鏡 ---------- */
const MIRROR_HP = 70, MIRROR_LEN = 3.3, MIRROR_TILT = 0.62;
function mirrorRaise(u) {
  if (!u.alive || u.held) return;
  const dir = u.side === 0 ? 1 : -1, hp = MIRROR_HP * S.team[u.side].hpMul, ang = -dir * MIRROR_TILT;
  const o = { t: 'bmirror', side: u.side, u, x: u.x, y: u.y + 5.4, len: MIRROR_LEN, ang, dx: Math.cos(ang) * MIRROR_LEN, dy: Math.sin(ang) * MIRROR_LEN, hp, hm: hp, one: 1, flash: 0, age: 0, n: 0 };
  S.objs.push(o); u.recoil = 1; ev('mirrorup', o.x, o.y, u.side);
}
// 這一邊又輪到自己開火：上一輪舉的銅鏡放下（這一輪鏡盾兵會再舉一次）
function mirrorsDown(side) { for (let i = S.objs.length - 1; i >= 0; i--) { const o = S.objs[i]; if (o.t === 'bmirror' && o.side === side) S.objs.splice(i, 1); } }
function mirrorStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 5);
  const u = o.u; if (!u.alive || o.hp <= 0) { if (o.hp <= 0) ev('mirrorbreak', o.x, o.y, o.side); return true; }
  const dir = o.side === 0 ? 1 : -1; o.x = u.x + dir * 0.4; o.y = u.y + 5.4;
  return false;
}
// 砲彈被銅鏡彈回去：改算鏡子主人的（打到對方是對方挨打）；鏡子吃掉這一發的威力
function mirrorBounce(i, o) {
  const side = SH.side[i], W = WL[SH.w[i]], T = side < 2 ? S.team[side] : null;
  o.hp -= W.dmg * SH.mass[i] * (T ? T.dmg : 1); o.flash = 1; o.n++;
  if (side !== o.side) { SH.cnt[side]--; SH.cnt[o.side]++; SH.side[i] = o.side; }
  SH.flag[i] = (SH.flag[i] | F_WILD | F_PORT) & ~F_IN;
}

/* ---------- 第十九關：天秤 ----------
   lv.saw：{ x 支點, y 樑面高度, len 樑長, th 樑厚, spire 樑中間的尖峰 [[寬, 高], …]（由下往上疊）, peak 底下的岩峰,
            gain、arm：重量差換成角度的比例（力矩 ÷ 總重 ÷ arm × gain）, max 最多歪幾弧度, balls 樑上的大石球 [[x, 半徑], …] } */
function sawWorld(C) {
  const body = PH.world.createBody({ type: 'kinematic', position: { x: C.x, y: C.y - C.th / 2 }, awake: false });          // 不轉的時候讓它睡著（醒著的巨樑會把整片戰場的磚都叫醒）
  const P = { kind: 'saw', body, x0: C.x, y0: C.y - C.th / 2, a0: 0, teth: [], dead: false, C, ang: 0, rot: null, tag: null, last: 0 };
  P.tag = { isRock: true, isPlat: true, isSaw: true, side: 2, plat: P };
  body.createFixture({ shape: new PL.Box(C.len / 2, C.th / 2), friction: 0.85, restitution: 0, filterCategoryBits: CAT_TERR, userData: P.tag });
  let y = C.th / 2;
  for (const [w, h] of C.spire) { body.createFixture({ shape: new PL.Box(w / 2, h / 2, { x: 0, y: y + h / 2 }, 0), friction: 0.85, restitution: 0, filterCategoryBits: CAT_TERR, userData: P.tag }); y += h; }
  P.spireH = y - C.th / 2;
  // 底下撐著巨樑的岩峰（不動）
  const top = C.y - C.th - 0.35, pk = C.peak || [1.6, 15, -60];
  PH.ground.createFixture({ shape: new PL.Polygon([{ x: C.x - pk[0], y: top }, { x: C.x + pk[0], y: top }, { x: C.x + pk[1], y: pk[2] }, { x: C.x - pk[1], y: pk[2] }]), friction: 0.85, filterCategoryBits: CAT_TERR });
  S.saw = P;
}
function sawAttach() {
  const P = S.saw, C = P.C;
  for (const s of [0, 1]) if (S.st[s] && !S.st[s].beast) S.st[s].plat = P;
  P.balls = [];
  for (const [x, r] of (C.balls || [])) for (const side of [0, 1]) {
    const bx = side ? VIEW_W - x : x, b = mkBlock(S.mech, { mat: M_ROCK, kind: 'ball', x: bx, y: C.y + r + 0.02, r, den: C.ballDen || 4 });
    b.sawBall = 1; b.hp = b.hm = 1e6; b.half = side; P.balls.push(b);
  }
}
// 巨樑現在歪幾度（正的：左邊＝我方那頭沉下去）
function sawAngle() { return S.saw ? S.saw.body.getAngle() : 0; }
// 兩邊的重量算出來該歪到幾度
function sawTarget() {
  const P = S.saw, C = P.C; let tq = 0, m = 0;
  const add = (body, mass) => { const c = body.getWorldCenter(), q = platLocal({ plat: P }, c.x, c.y); if (q.y < C.y - C.th - 2.5 || Math.abs(q.x - C.x) > C.len / 2 + 1) return; tq += mass * (c.x - C.x); m += mass; };
  for (const b of S.blocks) if (!b.dead && b.body && b.body.isDynamic()) add(b.body, b.mass);
  for (const u of S.units) if (u.alive && u.body) add(u.body, u.mass);
  P.tq = tq; P.m = m;
  return clamp(-C.gain * tq / (Math.max(1, m) * C.arm), -C.max, C.max);
}
// 回合結束：照兩邊的重量轉到該歪的角度（要轉就回傳 true：等它轉完）
function sawRoundEnd() {
  const P = S.saw; if (!P) return false;
  const a = P.body.getAngle(), want = sawTarget(), st = P.C.step || 0.06, to = clamp(want, a - st, a + st), d = to - a;          // 一回合最多轉 step：一點一點歪（一下子歪太多，兩座城都整座翻掉）
  if (Math.abs(d) < 0.02) return false;
  P.rot = { from: a, to, t0: S.time, dur: 1.6 + Math.abs(d) / 0.04 };
  for (let b = PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic()) b.setAwake(true);
  ev('sawtilt', MID, P.C.y, Math.abs(to) < 0.006 ? 0 : to > 0 ? 1 : -1, Math.round(to * 180 / Math.PI));          // c：現在往哪一頭低（0：回正）
  return true;
}
function sawStep(dt) {
  const P = S.saw; if (!P) return;
  if (P.rot) {
    const R = P.rot, u = (S.time - R.t0) / R.dur;
    if (u >= 1) { P.body.setAngularVelocity(0); P.body.setTransform(P.body.getPosition(), R.to); P.body.setAwake(false); P.rot = null; S.chainT = S.time; }
    else { P.body.setAwake(true); P.body.setAngularVelocity((R.to - R.from) * 6 * u * (1 - u) / R.dur); S.chainT = S.time; }
  }
  P.ang = P.body.getAngle();
  // 樑上的大石球：滾得快就是整顆的重量砸上去（功勞算對面：是對方把這一頭變重的）
  for (const b of P.balls) {
    if (b.dead || !b.body) continue;
    const v = b.body.getLinearVelocity(), fast = v.x * v.x + v.y * v.y > 20;
    if (fast && !b.smash) { b.smashBy = b.half === 0 ? 1 : 0; if (S.state === 'play' && v.x * v.x + v.y * v.y > 30) ev('sawroll', b.body.getPosition().x, b.body.getPosition().y, b.half); }
    b.smash = fast ? 1 : 0;
  }
}
function sawBusy() { return !!(S.saw && S.saw.rot); }

/* ---------- 每一步、每回合 ---------- */
function craftStep(dt) {
  if (S.saw) sawStep(dt);
  if (S.rubble && S.objs.length) warpBodies();
  weightsSlide();
  wildStep(dt);
  duskStep(dt);
}
// 停在兵頭上的鐵砣：往旁邊滑下去（兵的頭頂是尖的、滑的；鐵砣比較寬，有時候會剛好卡住，推一把）
function weightsSlide() {
  if (!S.rubble) return;
  for (const b of S.rubble.blocks) {
    if (b.dead || !b.weight || !b.onUnit) continue;
    const u = b.onUnit; b.onUnit = null; if (!u.alive || !b.body) continue;
    const p = b.body.getPosition(), v = b.body.getLinearVelocity(), d = p.x >= u.x ? 1 : -1;
    if (v.x * d < 3) { b.body.setAwake(true); b.body.setLinearVelocity({ x: d * 3.2, y: Math.max(v.y, 1.2) }); b.slideN = (b.slideN || 0) + 1; if (b.slideN > 45) blockKill(b, 2, K_CRUSH, true); }          // 卡死在頭上推不開（卡在牆和兵中間）：鐵砣碎掉，不然一直在那裡抖
  }
}
function craftRoundEnd() {
  let wait = false;
  if (weightsPress()) wait = true;
  if (sawRoundEnd()) wait = true;
  if (wildRoundEnd()) wait = true;
  return wait;
}
function craftRound() { if (S.lv.arches) archRound(); duskRound(); }
function craftBusy() { return sawBusy() || wildBusy() || duskBusy(); }
