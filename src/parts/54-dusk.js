/* ===== 54-dusk: 第四篇第三批（第 23、24 關）：照明弓手、滑翔奇兵、反重力師、時砂術士；無月的黑夜、天空要塞 =====
   兵器（數字在 40-defs 的 WL、UNIT）：
     照明弓手：照明箭插在打到的東西上（S.objs 的 flare），照亮方圓 R 到下一回合結束；插在兵身上的跟著兵走；被炸到會滅
     滑翔奇兵：滑翔翼（重力只剩三成多）過了最高點，轉向前方最亮的地方俯衝（gliderSteer：敵城的燈籠、自己射的照明箭、著火的木頭）
     反重力師：反重力彈落地撐開一團反重力（grav）：裡面的磚（不含自己這一邊的）慢慢浮起來；自己下一輪開火時一收，全部重重砸下去
     時砂術士：他還活著，這一輪全隊打出去的砲彈全記下來（S.echo），自己下一輪開火時原樣再打一次（威力 echo.mass × 時砂術士人數，最多兩個）
   戰場：
     第二十三關「無月」（lv.night）：整片戰場一片黑，只有燈籠（torch）、照明箭、著火的東西四周看得到。
           看不見的地方：你的瞄準虛線畫不出來；敵軍（和自動玩家）只瞄看得到的兵和磚，瞄看不見的地方手抖加倍
     第二十四關「天空要塞」（lv.aerie）：敵城是一座四顆浮空晶石托著的浮空要塞（48-mech 的浮島，沒有氣球，晶石全碎就整座掉下去）；
           每回合升降一段（晶石的高度跟著改），要塞艦長還在的話每三回合主砲轟一次（先預告，開護罩擋得住）
   跟戰局用同一套 S、SH；不碰畫面，Node 裡也能跑 */

/* ---------- 開局 ---------- */
function duskSetup() {
  S.echo = [[], []]; S.echoOn = [false, false]; S.aerie = null;
  for (const s of [0, 1]) S.echoOn[s] = S.team[s].units.some((u) => u.type === 'time');
  const lv = S.lv;
  if (lv.night) for (const s of [0, 1]) { const st = S.st[s], def = st && st.def; if (def && def.torches) for (const at of def.torches) torchMake(st, at); }
  if (lv.aerie) S.aerie = { C: lv.aerie, charge: false, alt: 0, shift: 0 };
}

/* ---------- 光：燈籠、照明箭、著火的磚 ---------- */
const TORCH_R = 7.5, FIRE_R = 5;
function torchMake(st, at) {
  const p = cellPt(st, at); let host = null, bd = 0.6;
  for (const b of st.blocks) { if (b.dead || !b.body) continue; const d = blockDist(b, p.x, p.y); if (d < bd) { bd = d; host = b; } }
  const o = { t: 'torch', side: st.side, host, lp: null, x: p.x, y: p.y, R: TORCH_R, hp: 16 * st.hpMul, hm: 16 * st.hpMul, r: 1.0, flash: 0, ph: p.x };
  if (host) { const q = host.body.getLocalPoint({ x: p.x, y: p.y }); o.lp = { x: q.x, y: q.y }; }
  S.objs.push(o);
}
function torchStep(o, dt) {
  if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4);
  if (o.hp <= 0) { ev('torchout', o.x, o.y, o.side); return true; }
  if (o.host) { if (o.host.dead || !o.host.body) { ev('torchout', o.x, o.y, o.side, 1); return true; } const q = o.host.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y; }
  return false;
}
function flareSet(side, o, x, y) {
  const W = WPN.flare.flare, f = { t: 'flare', side, host: null, hostU: null, lp: null, x, y, R: W.R, hp: W.hp, hm: W.hp, r: 0.9, until: S.round + 1, flash: 1, age: 0 };
  if (o && o.isBlock && !o.dead && o.body) { const q = o.body.getLocalPoint({ x, y }); f.host = o; f.lp = { x: q.x, y: q.y }; }
  else if (o && o.isUnit && o.alive) f.hostU = o;
  S.objs.push(f); ev('flarein', x, y, side, f.hostU ? 1 : 0);
}
function flareStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 2);
  if (o.hp <= 0 || S.round > o.until) { ev('flareout', o.x, o.y, o.side); return true; }
  if (o.host) { if (o.host.dead || !o.host.body) { o.host = null; const gy = groundY(o.x); if (gy > -100) o.y = gy + 0.3; else return true; } else { const q = o.host.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y; } }
  else if (o.hostU) { if (!o.hostU.alive) o.hostU = null; else { o.x = o.hostU.x; o.y = o.hostU.y + 2.2; } }
  return false;
}
// 這一點看得到嗎（有光照到）
function litAt(x, y) {
  for (const o of S.objs) {
    if ((o.t === 'torch' || o.t === 'flare') && o.hp > 0) { const dx = x - o.x, dy = y - o.y; if (dx * dx + dy * dy < o.R * o.R * 0.72) return true; }
  }
  if (S.nburn > 0) for (const b of S.blocks) { if (b.dead || !(b.burn > 0) || !b.body) continue; const p = b.body.getPosition(), dx = x - p.x, dy = y - p.y; if (dx * dx + dy * dy < FIRE_R * FIRE_R) return true; }
  return false;
}
// 這一邊看得到這一點嗎：有光照到，或是在自己的城附近（自己的城摸黑也知道長什麼樣）
function nightSeen(side, x, y) {
  if (!S.lv.night) return true;
  const st = S.st[side]; if (st && x > st.x0 - 6 && x < st.x1 + 6) return true;
  return litAt(x, y);
}
// 爆炸（還有不會爆的直接打中）：炸到燈籠、照明箭
function duskBlast(x, y, r, dmg, side) {
  for (const o of S.objs) {
    if ((o.t !== 'torch' && o.t !== 'flare') || o.hp <= 0 || o.side === side || side > 1) continue;
    const d = Math.hypot(o.x - x, o.y - y); if (d > r + o.r + 0.4) continue;
    o.hp -= dmg * (1.2 - 0.6 * d / (r + o.r + 0.4)); o.flash = 1;
  }
}

/* ---------- 打到東西（51-arms 的 armsHit 轉過來） ---------- */
function duskHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i]; if (side > 1) return 0;
  if (w.flare) {
    physExplode(hx, hy, w, side, SH.mass[i], SH.flag[i], o, vx, vy);
    if (hit === 2 || hit === 3 || hit === 1) flareSet(side, hit === 1 ? null : o, hx, hy + (hit === 1 ? 0.3 : 0));
    return 1;
  }
  if (w.grav) {
    physExplode(hx, hy, w, side, SH.mass[i], SH.flag[i], o, vx, vy);
    const u = S.shotU.get(SH.id[i]) || S.team[side].units.find((q) => q.alive && q.type === 'antigrav'); S.shotU.delete(SH.id[i]);          // 是哪一個反重力師打的（兩個反重力師各撐一團）
    if (u) gravSet(side, u, hx, hy);
    return 1;
  }
  return 0;
}

/* ---------- 滑翔奇兵：過了最高點轉向前方最亮的地方 ---------- */
const _gs = { vx: 0, vy: 0 };
function gliderSteer(side, x, y, vx, vy, dt) {
  _gs.vx = vx; _gs.vy = vy;
  if (vy > 0) return _gs;
  const W = WPN.glider.glide, dir = side === 0 ? 1 : -1; let best = null, bs = -1e9;
  const look = (tx, ty, w) => { const dx = tx - x, dy = ty - y; if (dx * dir < 2) return; const d = Math.hypot(dx, dy); if (d > W.see) return; const sc = w - d * 0.05 - Math.abs(Math.atan2(dy, dx * dir)) * 0.6; if (sc > bs) { bs = sc; best = [tx, ty]; } };
  for (const o of S.objs) {
    if (o.t === 'torch' && o.hp > 0 && o.side !== side) look(o.x, o.y, 1.0);
    else if (o.t === 'flare' && o.hp > 0 && o.side === side) look(o.x, o.y, 1.4);
  }
  if (S.nburn > 0) for (const b of S.blocks) if (!b.dead && b.burn > 0 && b.side === 1 - side && b.body) { const p = b.body.getPosition(); look(p.x, p.y, 0.6); }
  if (!best) return _gs;
  const a = Math.atan2(vy, vx), want = Math.atan2(best[1] - y, best[0] - x); let d = want - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
  const k = clamp(d, -W.turn * dt, W.turn * dt), sp = Math.hypot(vx, vy), na = a + k;
  _gs.vx = Math.cos(na) * sp; _gs.vy = Math.sin(na) * sp;
  return _gs;
}

/* ---------- 反重力師：一團反重力 ---------- */
function gravSet(side, u, x, y) {
  for (const o of S.objs) if (o.t === 'grav' && o.u === u && o.st === 'float') gravRelease(o);          // 一個反重力師一次只撐一團
  const W = WPN.grav.grav;
  S.objs.push({ t: 'grav', side, u, x, y, R: W.R, st: 'float', set: new Set(), age: 0, go: 0, flash: 1 });
  ev('gravon', x, y, side);
}
function gravRelease(o) { for (const b of o.set) if (!b.dead && b.body) b.body.setGravityScale(1); o.set.clear(); o.st = 'done'; }
function gravStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 2);
  if (o.st === 'done') return true;
  if (!o.u.alive) { gravRelease(o); ev('gravoff', o.x, o.y, o.side); return true; }          // 反重力師倒了：反重力散掉（東西自己掉下去，不會重重砸下去）
  const W = WPN.grav.grav;
  if (o.st === 'float') {
    for (const b of physQuery(o.x, o.y, o.R + 1)) {
      if (!b.isBlock || b.dead || !b.body || !b.body.isDynamic() || b.side === o.side || b.weight || o.set.has(b)) continue;
      if (blockDist(b, o.x, o.y) > o.R) continue;
      o.set.add(b); b.body.setGravityScale(W.lift); b.body.setAwake(true);
    }
    for (const b of o.set) {
      if (b.dead || !b.body) { o.set.delete(b); continue; }
      const p = b.body.getPosition(), v = b.body.getLinearVelocity();
      if (p.y > o.y + W.top) { b.body.setGravityScale(0); b.body.setLinearVelocity({ x: v.x * 0.94, y: v.y > 0 ? v.y * 0.9 : v.y * 0.96 }); b.body.setAngularVelocity(b.body.getAngularVelocity() * 0.94); }          // 浮到頂：停在半空（被炸到也慢慢停下來）
      else if (v.y > 3.5) b.body.setLinearVelocity({ x: v.x, y: 3.5 });
      b.body.setAwake(true);
    }
    return false;
  }
  if (o.st === 'slam' && S.time >= o.go) {
    for (const b of o.set) if (!b.dead && b.body) { b.body.setGravityScale(1); const v = b.body.getLinearVelocity(); b.body.setLinearVelocity({ x: v.x * 0.3, y: -W.slam }); b.body.setAwake(true); b.hitBy = o.side; }
    ev('gravslam', o.x, o.y, o.side, o.set.size); S.chainT = S.time;
    o.set.clear(); o.st = 'done';
  }
  return false;
}
// 自己這一邊開火：撐著的反重力一團一團收掉（東西砸下去）
function gravsGo(side) { let k = 0; for (const o of S.objs) if (o.t === 'grav' && o.side === side && o.st === 'float') { o.st = 'slam'; o.go = S.time + 0.3 + 0.25 * k++; } }

/* ---------- 時砂術士：回聲 ---------- */
// 50-sim 的 unitFire 每打出一發（不是 phys 的）就記一筆
function echoRec(u, w, x, y, vx, vy) { if (!S.echoOn || !S.echoOn[u.side] || w.phys) return; const L = S.echo[u.side]; if (L.length < 40) L.push({ wi: w.i, x, y, vx, vy, t: S.phaseT }); }
// 自己這一邊開火：上一輪記下來的整輪砲擊，時砂術士還活著就原樣再打一次；然後清掉，這一輪重新記
function echoGo(side) {
  if (!S.echoOn || !S.echoOn[side]) return;
  const L = S.echo[side]; S.echo[side] = [];
  const n = Math.min(2, S.team[side].units.filter((u) => u.alive && u.type === 'time' && !u.sunk).length);
  if (!n || !L.length) return;
  const t0 = L[0].t;
  S.objs.push({ t: 'echo', side, list: L, mass: WPN.hourglass.echo.mass * n, go: S.time + 0.9, t0, i: 0 });
  ev('echoarm', S.st[side].cx, S.st[side].y1 + 3, side, L.length);
}
function echoStep(o, dt) {
  while (o.i < o.list.length && S.time >= o.go + (o.list[o.i].t - o.t0)) {
    const e = o.list[o.i++];
    const j = spawnShot(o.side, e.wi, e.x, e.y, e.vx, e.vy, o.mass, F_IN, 0, 1);
    if (j >= 0) { SH.flag[j] |= F_PORT; ev('echo', e.x, e.y, o.side); }
  }
  return o.i >= o.list.length;
}

/* ---------- 第二十四關：天空要塞 ----------
   lv.aerie：{ alt: 每回合升降多少（照順序輪）, cannon: { first 第幾回合開始, every 每幾回合轟一次 } } */
function aerieCaptain() { for (const u of S.team[1].units) if (u.alive && u.def.cmd) return u; return null; }
function aerieRound() {
  const A = S.aerie; if (!A) return;
  const C = A.C, st = S.st[1], P = st && st.plat;
  if (P && !P.dead && P.lifts && S.round > 1) {
    const dy = C.alt[(S.round - 2) % C.alt.length];
    if (dy) { A.shift += dy; A.alt += dy; P.body.setAwake(true); ev('aeriealt', st.cx, st.y1 + 2, 1, dy); }          // 慢慢升降（duskStep 一點一點挪晶石的高度）
  }
  A.charge = !!aerieCaptain() && S.round >= C.cannon.first && (S.round - C.cannon.first) % C.cannon.every === 0;
  if (A.charge) ev('cannoncharge', st.cx, st.y1, 1);
}
// 敵軍這一輪：主砲（照我方城的正中間吊一發）
function aerieFire(u) {
  const A = S.aerie; if (!A || !A.charge || !u.alive) return;
  A.charge = false;
  const st = S.st[1], mx = u.x - 2.2, my = u.y + 3.6, tg = S.st[0];
  aimFor(mx, my, tg.cx + (rnd() - 0.5) * tg.w * 0.4, tg.y0 + tg.h * 0.55, 2.4, S.wind, _av);
  spawnShot(1, WPN.mainshell.i, mx, my, _av[0], _av[1], 1, F_IN, 0, 1);          // F_IN：穿過要塞自己的城
  u.recoil = 1; ev('cannonfire', mx, my, 1); S.chainT = S.time;
}
// 要塞還浮著的浮空晶石有幾顆
function aerieLifts() { const P = S.st[1] && S.st[1].plat; return P && P.lifts ? P.lifts.filter((L) => L.hp > 0).length : 0; }

/* ---------- 每一步、每回合（54-craft 轉過來） ---------- */
function duskRound() {
  if (S.aerie) aerieRound();
}
function duskStep(dt) {
  const A = S.aerie; if (!A) return;
  if (A.charge && !aerieCaptain()) A.charge = false;          // 艦長倒了：主砲停了
  if (!A.shift) return;
  const P = S.st[1] && S.st[1].plat; if (!P || P.dead || !P.lifts) { A.shift = 0; return; }
  const d = clamp(A.shift, -0.9 * dt, 0.9 * dt); A.shift -= d; if (Math.abs(A.shift) < 1e-4) A.shift = 0;
  for (const L of P.lifts) L.y0 += d;
  P.body.setAwake(true); S.chainT = S.time;
}
function duskBusy() {
  if (S.aerie && S.aerie.shift) return true;
  for (const o of S.objs) if ((o.t === 'grav' && o.st === 'slam') || o.t === 'echo') return true;
  return false;
}
