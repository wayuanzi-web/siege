/* ===== 54-tele: 第二十七關「預告戰場」（第三十關的魔王也用）=====
   預告：每回合一開始（你瞄準之前），敵軍就把這一輪要打哪裡定好——每個兵的角度和力道鎖死，畫面上一條紅色虛線、落點一個紅圈。
   你打完，他照預告打：打倒、凍住、電暈開火的兵，那一發就不來；把他推開，他從新的位置照原本的角度打（落點跟著挪）；
   轉向術士炸到的兵，砲口往上轉一截（轉兩次就打回自己頭上）。
   齒輪砲台：兩邊城前的岩柱上各一座，每一輪跟著主人開火（彈道一直畫著）。對方的砲彈打中齒輪，齒輪照打到的位置、方向轉一格；
   轉到對著自己的城，就砸自己。
   誘餌兵：在落點插一個草人；敵軍下一次預告，有一半的兵改瞄草人（草人插在敵城上，他們就砸自己的城） */
const TURN_A = 0.5;          // 被轉向一次，砲口往上轉幾弧度（最多算兩次；魔王只轉一半）
const GEAR_STEP = Math.PI / 12, GEAR_R = 1.8, GEAR_PW = 50, GEAR_MZ = 2.7;          // 齒輪一格轉 15 度；砲口初速；砲管長
const DECOY_P = 0.55;          // 有草人的時候，每個敵兵改瞄草人的機率
const DUMMY_MAX = 3;

function teleSetup() {
  const lv = S.lv;
  S.tele = lv.tele || (lv.boss && lv.boss.tele) ? { side: 1, plan: false, r: 0 } : null;
  S.gears = null;
  if (!lv.gears) return;
  S.gears = [];
  for (const g of lv.gears) { const o = { t: 'gear', side: g.side, x: g.x, y: g.y, ang: 0, vis: 0, flash: 0, n: 0 }; o.ang = o.vis = o.a0 = gearAim(o); S.objs.push(o); S.gears.push(o); }
}
// 齒輪砲台開場的方向：轉到哪一格，砲彈最接近對面城樓的中間
function gearAim(o) {
  const st = S.st[1 - o.side], c = stCenter(st); let best = 0, bd = 1e9;
  for (let k = 0; k < 24; k++) {
    const a = k * GEAR_STEP, L = gearTrace(o, a); if (!L.hit) continue;
    const d = Math.abs(L.x - c.x) + Math.abs(L.y - c.y) * 0.5; if (d < bd) { bd = d; best = a; }
  }
  return best;
}
const _gl = { hit: 0, x: 0, y: 0, o: null };
let TRACE_OUT = false;          // simTrace：砲彈一開始就不在自己城裡（齒輪砲台的砲彈打得到自己的城）
function gearTrace(o, a, path) {
  const mx = o.x + Math.cos(a) * GEAR_MZ, my = o.y + Math.sin(a) * GEAR_MZ;
  TRACE_OUT = true; const R = simTrace(o.side, mx, my, Math.cos(a) * GEAR_PW, Math.sin(a) * GEAR_PW, S.wind, S.time, undefined, WPN.gearball.i, path); TRACE_OUT = false;
  _gl.hit = R.hit; _gl.x = R.x; _gl.y = R.y; _gl.o = R.o; return _gl;
}
function gearFire(o) {
  const a = o.ang, mx = o.x + Math.cos(a) * GEAR_MZ, my = o.y + Math.sin(a) * GEAR_MZ;
  spawnShot(o.side, WPN.gearball.i, mx, my, Math.cos(a) * GEAR_PW, Math.sin(a) * GEAR_PW, 1, 0, 0, 1);
  o.flash = 1; ev('gearfire', mx, my, o.side, a);
}
// 對方的砲彈打中齒輪：照打到的位置和砲彈的方向轉一格（往哪邊轉看力矩的方向）
function gearSpin(px, py, nx, ny, vx, vy, o) { const rx = (px + nx) / 2 - o.x, ry = (py + ny) / 2 - o.y; return rx * vy - ry * vx >= 0 ? 1 : -1; }
function gearKick(o, d, side) {
  o.ang += d * GEAR_STEP; o.flash = 1; o.n++;
  ev('gearturn', o.x, o.y, o.side, d, side);
}

/* ---------- 預告 ---------- */
// 被轉向：仰角往上加（超過 90 度就往後打）
function turnVec(u, v, dir) {
  const n = Math.min(2, u.turn || 0); if (!n) return v;
  const sp = Math.hypot(v[0], v[1]), a = Math.atan2(v[1], v[0] * dir) + TURN_A * n * (u.def.big ? 0.5 : 1);
  v[0] = Math.cos(a) * sp * dir; v[1] = Math.sin(a) * sp; return v;
}
// 兵 u 要打到 (tx, ty) 的初速（試幾種飛行時間，挑試射落點最近的）
const _ta = [0, 0];
function aimAt(side, u, tx, ty) {
  const T = S.team[side], m = muzzle(u, T.dir), mx = m[0], my = m[1], W = u.w, gk = (W.gk || 1) * (S.gk || 1), sp = W.spd || 1;
  let bd = 1e9, ok = false;
  for (let tau = 0.6; tau <= 3.4; tau += 0.2) {
    aimFor(mx, my, tx, ty, tau, S.wind, _av, gk, sp); if (!aimOk(_av[0], _av[1], T.dir)) continue;
    const R = simTrace(side, mx, my, _av[0], _av[1], S.wind, S.time, undefined, W.i), d = R.hit ? Math.hypot(R.x - tx, R.y - ty) : 99;
    if (d < bd) { bd = d; _ta[0] = _av[0]; _ta[1] = _av[1]; ok = true; }
  }
  return ok ? _ta : null;
}
/* 回合一開始：敵軍把這一輪定好（跟平常一樣挑目標、手抖），每個開得了火的兵記下自己的初速（u.tpv）。
   有草人的話，每個兵有一半的機會改瞄草人（不管會不會砸到自己的城） */
function telePlan() {
  const TL = S.tele; if (!TL) return;
  const T = S.team[TL.side]; TL.plan = true; TL.r = S.round;
  for (const u of T.units) u.tpr = -1;
  if (!T.ai || T.mute) return;
  const A = T.ai; aiBegin(T);
  if (!A.lead) { A.st = 9; return; }
  aiEval(T, 1e9); aiChoose(T); A.st = 9;
  const ax = A.px, ay = A.py, lead = volleyLead(T), E0 = lead ? volleyEvent(TL.side, lead, ax, ay) : null, E = E0 ? { ok: E0.ok, x: E0.x, y: E0.y, vx: E0.vx, vy: E0.vy } : null, cv = [0, 0];
  const dums = S.objs.filter((o) => o.t === 'dummy' && o.side !== TL.side);
  let n = 0, lured = 0;
  for (const u of T.units) {
    if (!ableUnit(u)) continue;
    if (u === lead) { cv[0] = ax; cv[1] = ay; } else volleyAim(TL.side, u, ax, ay, E, cv);
    if (dums.length && !u.def.big && rnd() < DECOY_P) { const d = dums[ri(dums.length)], a = aimAt(TL.side, u, d.x, d.y + 1.2); if (a) { cv[0] = a[0]; cv[1] = a[1]; lured++; } }
    u.tpv = u.tpv || [0, 0]; u.tpv[0] = cv[0]; u.tpv[1] = cv[1]; u.tpr = S.round; n++;
  }
  T.aim[0] = ax; T.aim[1] = ay;
  ev('teleplan', TL.side, n, lured);
}
// 輪到預告的那一邊：不用再想，停一下就照預告開火（aiStep 的 st 9）
function teleArm(T) { const A = T.ai; A.st = 9; A.t = 0.9; }
function telePlanned(side) { const TL = S.tele; return !!(TL && TL.side === side && TL.plan && TL.r === S.round); }

/* ---------- 推擊手、轉向術士、誘餌兵 ---------- */
function teleHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i], mass = SH.mass[i];
  physExplode(hx, hy, w, side, mass, SH.flag[i], hit === 1 ? null : o, vx, vy);
  if (w.shove) shoveAt(side, hx, hy, w.shove, mass);
  else if (w.swivel) swivelAt(side, hx, hy, w.swivel.R * Math.min(1.3, Math.sqrt(mass)));
  else if (w.decoy) dummyPlant(side, hit, o, hx, hy);
  return 1;
}
// 推開：附近的敵兵往外飛一大段（離炸點越近飛越遠）；魔王推不太動
function shoveAt(side, x, y, P, mass) {
  let n = 0;
  for (const u of S.units) {
    if (!u.alive || !u.body || u.side === side || u.immune) continue;
    const dx = u.x - x, dy = u.y + u.bh * 0.5 - y, d = Math.hypot(dx, dy); if (d > P.R) continue;
    const dir = Math.abs(dx) > 0.3 ? Math.sign(dx) : (side === 0 ? 1 : -1), v = P.v * (1 - 0.45 * d / P.R) * Math.min(1.25, Math.sqrt(mass)) * (u.def.big ? 0.25 : 1);
    u.body.setAwake(true); u.body.setLinearVelocity({ x: dir * v, y: 4 + v * 0.25 }); n++;
    ev('shoved', u.x, u.y + 2, u.side, dir);
  }
  return n;
}
function swivelAt(side, x, y, R) {
  for (const u of S.units) {
    if (!u.alive || u.side === side) continue;
    const d = Math.hypot(u.x - x, u.y + u.bh * 0.5 - y); if (d > R) continue;
    u.turn = Math.min(2, (u.turn || 0) + 1); ev('swivel', u.x, u.y + u.bh + 1, u.side, u.turn);
  }
  // 齒輪砲台：敵軍的往上轉兩格（照砲台主人面向的那一邊）；自己的轉回開場的方向（被敵軍轉歪了可以修回來）
  if (S.gears) for (const o of S.gears) {
    if (Math.hypot(o.x - x, o.y - y) > R + GEAR_R) continue;
    if (o.side !== side) gearKick(o, (o.side === 0 ? 1 : -1) * 2, side);
    else if (Math.abs(o.ang - o.a0) > 1e-6) { o.ang = o.a0; o.flash = 1; ev('gearturn', o.x, o.y, o.side, 0, side); }
  }
}
// 草人：插在打到的地方（磚上的跟著那塊磚走）；掉進深谷就沒了
function dummyPlant(side, hit, o, hx, hy) {
  let x = hx, y = hy, b = null;
  if (hit === 3 && o && o.alive) { x = o.x; y = o.y; }
  else {
    _dpB = null; _dpY = -999; PH.world.rayCast({ x: hx, y: hy + 0.8 }, { x: hx, y: hy - 8 }, _dpCb);
    if (_dpY < -100) return; y = _dpY; b = _dpB;
  }
  const mine = S.objs.filter((q) => q.t === 'dummy' && q.side === side);
  if (mine.length >= DUMMY_MAX) S.objs.splice(S.objs.indexOf(mine[0]), 1);
  const d = { t: 'dummy', side, x, y, b, lp: b ? b.body.getLocalPoint({ x, y }) : null, until: S.round + 1, hp: 1, age: 0, flash: 0 };
  if (d.lp) d.lp = { x: d.lp.x, y: d.lp.y };
  S.objs.push(d); ev('dummy', x, y, side);
}
let _dpB = null, _dpY = -999;
function _dpCb(f, p, n, fr) { const o = f.getUserData(); if (f.isSensor() || (o && o.isUnit)) return -1; _dpY = p.y; _dpB = o && o.isBlock && !o.dead ? o : null; return fr; }
function dummyStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4);
  if (o.hp <= 0) return true;
  if (o.b) { if (o.b.dead || !o.b.body) { o.b = null; o.vy = 0; } else { const q = o.b.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y; return false; } }
  // 腳下的磚沒了：往下掉到下一個東西上
  _dpB = null; _dpY = -999; PH.world.rayCast({ x: o.x, y: o.y + 0.3 }, { x: o.x, y: o.y - 40 }, _dpCb);
  if (_dpY < -100) { ev('dummypop', o.x, o.y, o.side); return true; }
  if (o.y - _dpY > 0.15) { o.vy = (o.vy || 0) + GRAV * dt; o.y = Math.max(_dpY, o.y - o.vy * dt); if (o.y <= _dpY + 0.01 && _dpB) { o.b = _dpB; o.lp = o.b.body.getLocalPoint({ x: o.x, y: o.y }); o.lp = { x: o.lp.x, y: o.lp.y }; } }
  return false;
}
// 爆炸：草人被炸到就沒了
function teleBlast(x, y, r, side) {
  for (const o of S.objs) if (o.t === 'dummy' && o.hp > 0 && Math.hypot(o.x - x, o.y + 1.2 - y) < r + 1.2) { o.hp = 0; ev('dummypop', o.x, o.y + 1, o.side); }
}
function teleRoundEnd() {
  for (let i = S.objs.length - 1; i >= 0; i--) { const o = S.objs[i]; if (o.t === 'dummy' && S.round >= o.until) { S.objs.splice(i, 1); ev('dummyoff', o.x, o.y, o.side); } }
}

/* ---------- 自動玩家：齒輪砲台值不值得打 ----------
   打中對方的齒輪讓它轉一格：轉完之後它的砲彈落在哪裡、對 side 這一邊是好是壞（打到對方的城、兵加分，打到自己的扣分）。
   在 aiBegin 先算好兩個方向各值多少（試射裡不能再試射） */
function gearVal(side, o, a) {
  const L = gearTrace(o, a); if (!L.hit) return 0;
  const w = WPN.gearball, x = L.x, y = L.y;
  return aiPtScore(side, x, y, w, 1, null) - aiPtScore(1 - side, x, y, w, 1, null);
}
function gearAiPrep(side) {
  if (!S.gears) return;
  for (const o of S.gears) {
    if (o.side === side) continue;
    const v0 = gearVal(side, o, o.ang);
    o.gain = o.gain || [[0, 0], [0, 0]];
    o.gain[side][0] = gearVal(side, o, o.ang + GEAR_STEP) - v0; o.gain[side][1] = gearVal(side, o, o.ang - GEAR_STEP) - v0;
  }
}
function gearGain(side, o, d) { return o.gain ? Math.max(0, o.gain[side][d > 0 ? 0 : 1]) : 0; }
