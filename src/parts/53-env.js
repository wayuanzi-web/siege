/* ===== 53-env: 第三篇的環境（每回合在變的戰場） =====
   第十三關：潮汐（水面每回合換高度）、暴潮（大潮那一回合結束時海水猛漲又退下去，把沒有牆擋著的兵拖下海）、水塔（打破了水從頂樓灌下來）。
   第十五關：岩漿湖（每回合漲一截；泡到岩漿的鐵發紅變軟、木頭燒起來、碎塊熔掉、兵掉進去就沒了）、鐵水鍋（打斷吊它的鐵鍊，砸下來、鐵水一路澆下去）、火山彈。
   跟戰局用同一套 S；不碰畫面，Node 裡也能跑 */

/* ---------- 潮汐 ---------- */
// 這一回合是第幾段潮（關卡 tide.lv 的第幾個）：0 退潮、1 漲到一半、2 大潮、3 退到一半
function tideIdx(round) { const T = S.lv && S.lv.tide; return T ? (Math.max(1, round) - 1) % T.lv.length : -1; }
function tideNow() { return tideIdx(S.round); }
// 水塔還在（第十三關）
function tankUp(side) { return S.st[side].blocks.some((b) => b.tank && !b.dead); }

function envInit() {
  S.env = { tideA: null, surge: null };
  const T = S.lv.tide, L = S.lv.lava;
  if (T && S.water) { S.water.y = T.lv[0]; S.water.curF = null; }
  if (L && S.water) { S.water.y = L.y0; S.water.lava = 1; }
}
// 回合結束：換下一段潮（大潮那一回合先來一次暴潮）；岩漿漲一截。回傳 true：要等它演完（hazard）
function envRoundEnd() {
  const L = S.lv.lava;
  if (L && S.water) {
    const W = S.water, next = Math.min(L.max, W.y + L.dy);
    if (next - W.y < 0.05) return false;
    S.env.tideA = { from: W.y, to: next, t0: S.time, dur: 1.8 }; ev('lavarise', MID, next, next >= L.max - 0.05 ? 1 : 0);
    return true;
  }
  const T = S.lv.tide; if (!T || !S.water) return false;
  const k = tideIdx(S.round), next = T.lv[tideIdx(S.round + 1)], E = S.env;
  if (k === 2 && T.surge) { E.surge = { t0: S.time, base: S.water.y, H: T.surge, next }; ev('surge', MID, S.water.y, T.surge); return true; }
  if (Math.abs(next - S.water.y) < 0.05) return false;
  E.tideA = { from: S.water.y, to: next, t0: S.time, dur: 1.6 }; ev('tide', MID, next, tideIdx(S.round + 1));
  return true;
}
// 暴潮的時間軸（秒）：漲、停、退（退的時候把甲板上的兵往外拖）
const SURGE_UP = 1.1, SURGE_HOLD = 0.7, SURGE_DOWN = 2.0, SURGE_CUR = 3.4, SURGE_BACK = 6.5;
function envStep(dt) {
  const E = S.env; if (!E) return;
  const W = S.water;
  if (W && E.surge) {
    const G = E.surge, t = S.time - G.t0;
    if (t < SURGE_UP) { W.y = G.base + G.H * smooth(t / SURGE_UP); W.curF = (x) => (x < MID ? -SURGE_CUR : SURGE_CUR); }
    else if (t < SURGE_UP + SURGE_HOLD) { W.y = G.base + G.H; W.curF = null; }
    else if (t < SURGE_UP + SURGE_HOLD + SURGE_DOWN) { const u = (t - SURGE_UP - SURGE_HOLD) / SURGE_DOWN; W.y = G.base + G.H * (1 - smooth(u)); W.curF = (x) => (x < MID ? SURGE_BACK : -SURGE_BACK); backwash(dt, 1 - u); }
    else { W.y = G.base; W.curF = null; E.surge = null; if (Math.abs(G.next - W.y) > 0.05) { E.tideA = { from: W.y, to: G.next, t0: S.time, dur: 1.2 }; ev('tide', MID, G.next, tideIdx(S.round + 1)); } }
  } else if (W && E.tideA) {
    const A = E.tideA, u = (S.time - A.t0) / A.dur;
    if (u >= 1) { W.y = A.to; E.tideA = null; } else W.y = A.from + (A.to - A.from) * smooth(u);
  }
  if (W && W.lava) lavaStep(dt);
  potStep(dt);
  // 泡進水裡的火被撲滅（第三篇的規則；第一、二篇照舊）
  if (W && !W.lava && S.nburn > 0 && S.lv.rules) for (const b of S.blocks) {
    if (b.dead || !(b.burn > 0) || !b.body) continue;
    const p = b.body.getPosition(); if (p.y < W.y && p.x > W.x0 && p.x < W.x1) { b.burn = 0; S.nburn--; ev('douse', p.x, W.y + 0.5, 2); }
  }
}
/* 退潮：泡在水裡、朝戰場那一邊沒有牆擋著的兵，被退下去的海水一把拖向外海（光靠水流的阻力拖不動站著的兵：腳底的摩擦太大）。
   牆、門、還站著的磚擋在前面的不會被拖走 */
function backwash(dt, k) {
  for (const u of S.units) {
    if (!u.alive || !u.body || u.def.big || !(u.wet > 0.2)) continue;
    const dir = u.x < MID ? 1 : -1, y = u.y + Math.min(1.2, u.bh * 0.5); let cover = false;
    PH.world.rayCast({ x: u.x, y }, { x: u.x + dir * 3.2, y }, (f) => { const o = f.getUserData(); if (o && (o.isRock || (o.isBlock && !o.dead && !o.frag && !o.prop))) { cover = true; return 0; } return -1; });
    if (cover) continue;
    u.body.setAwake(true);
    u.body.applyLinearImpulse({ x: dir * u.mass * 16 * k * dt, y: u.mass * GRAV * 0.55 * k * dt }, u.body.getWorldCenter(), true);
  }
}
// 潮水還在動（回合結束等它演完）
function envBusy() { const E = S.env; return !!(E && (E.surge || E.tideA)); }
/* 泡在水裡的兵會不會被沖走：第十三關，站在自己的水寨裡（甲板以上）不會（暴潮淹上來只是被推），
   掉到甲板底下、被拖出自己的水寨外面才會 */
function envDrown(u) {
  const T = S.lv && S.lv.tide; if (!T) return true;
  const st = S.st[u.side]; if (!st || u.def.big) return true;
  return !(u.x > st.x0 - 0.6 && u.x < st.x1 + 0.6 && u.y > T.deck);
}
// 水底下的炸藥：泡了水就啞了（回傳 3）；掉進岩漿的燒掉了（回傳 4）。不在水裡回傳 0
function envDud(o) { const W = S.water; return W && o.y < W.y - 0.2 && o.x > W.x0 && o.x < W.x1 ? (W.lava ? 4 : 3) : 0; }

/* ---------- 水塔：打破了，水從那裡一路往下灌，把底下的兵往前（戰場那一邊）沖；前牆、門還在就擋得住 ---------- */
function spawnDeluge(b, by) {
  const p = b.body ? b.body.getPosition() : { x: b.x, y: b.y };
  S.objs.push({ t: 'deluge', side: b.side, by: by === undefined ? 2 : by, x: p.x, y: p.y + b.h * 0.3, w: Math.max(3.2, b.w * 0.6), age: 0, life: 2.6, dir: b.side === 0 ? 1 : -1 });
  ev('deluge', p.x, p.y, b.side);
}
function delugeStep(o, dt) {
  o.age += dt; if (o.age >= o.life) return true;
  const k = o.age < 0.35 ? o.age / 0.35 : o.age > o.life - 0.6 ? (o.life - o.age) / 0.6 : 1, st = S.st[o.side];
  for (const u of S.units) {
    if (!u.alive || !u.body || u.side !== o.side || u.def.big) continue;
    const dx = u.x - o.x; if (Math.abs(dx) > o.w + 2.6 || u.y > o.y + 0.5 || u.y < o.y - 26) continue;
    u.body.setAwake(true);
    u.body.applyLinearImpulse({ x: o.dir * u.mass * 10 * k * dt, y: -u.mass * 3 * k * dt }, u.body.getWorldCenter(), true);
    hurtUnit(u, 4 * k * dt, o.by === u.side ? 2 : o.by, K_CRUSH);
  }
  // 灌下來的水把底下燒著的火撲滅
  if (S.nburn > 0) for (const b of st.blocks) { if (b.dead || !(b.burn > 0) || !b.body) continue; const q = b.body.getPosition(); if (Math.abs(q.x - o.x) < o.w + 2 && q.y < o.y) { b.burn = 0; S.nburn--; } }
  return false;
}

/* ---------- 第十五關：岩漿湖 ----------
   岩漿就是一片「水」（S.water.lava）：浮力照 rho 算（木頭、石頭浮著，鐵沉下去），砲彈打在岩漿面上就炸開。
   泡到岩漿的：還在原位的城樓（下層鑄造台的鐵樑）發紅、一直軟掉；掉下去的碎塊、落石熔掉；木頭、屋瓦燒起來；鐵鍊泡到也會熔斷。
   兵掉進去就沒了（unitsStep）。只在砲擊、等塵埃落定的時候燒（瞄準的時候停，跟火一樣） */
const LAVA_SOFT = 0.045;       // 還在原位、泡到岩漿的磚：每秒軟掉耐久的幾成（泡得越深越快）
const LAVA_MELT = 0.5;         // 掉進岩漿的碎塊、落石：每秒熔掉耐久的幾成
const LAVA_ROPE = 0.09;        // 泡到岩漿的鐵鍊：每秒熔掉幾成
function lavaStep(dt) {
  const W = S.water, act = S.state !== 'play' || S.phase === 'volley' || S.phase === 'resolve' || S.phase === 'hazard';
  for (const b of S.blocks) {
    if (b.dead || !b.body) continue;
    const p = b.body.getPosition(); let lo = 1e9, hi = 0;
    if (p.x > W.x0 - 3 && p.x < W.x1 + 3 && p.y - Math.max(b.w, b.h) < W.y) { const A = b.body.getFixtureList().getAABB(0); lo = A.lowerBound.y; hi = A.upperBound.y; }
    if (lo >= W.y + 0.05 || p.x < W.x0 || p.x > W.x1) { if (b.heat > 0) b.heat = Math.max(0, b.heat - dt * 0.25); continue; }
    const sub = clamp((W.y - lo) / Math.max(0.05, hi - lo), 0, 1);
    b.heat = Math.min(1, (b.heat || 0) + dt * 1.5);
    if (!act) continue;
    if (MAT[b.mat].burn && !(b.burn > 0)) ignite(b, 4, 2);
    if (b.dead) continue;
    const fl = b.flash;          // 慢慢軟掉、熔掉：不閃白光（畫面上是發紅）
    if (b.inPlace && !b.lost && !b.frag && !b.prop) blockHurt(b, (b.seg ? b.segM : b.hm) * LAVA_SOFT * (0.35 + sub) * dt, K_CRUSH, 2, p.x, lo + 0.1);
    else if (!b.hang || b.spilt) { blockHurt(b, (b.seg ? b.segM : b.hm) * LAVA_MELT * dt + 6 * dt, K_CRUSH, 2); if (b.dead) ev('melt', p.x, W.y, b.w); }
    if (!b.dead) b.flash = fl;
  }
  if (act) for (const r of S.ropes) {
    if (r.cut) continue;
    const e = r.e, y = Math.min(e[1], e[3]), x = e[1] < e[3] ? e[0] : e[2];
    if (y > W.y - 0.1 || x < W.x0 || x > W.x1) continue;
    r.hp -= r.hm * LAVA_ROPE * dt; r.flash = Math.max(r.flash, 0.3);
    if (r.hp <= 0) ropeCut(r, 2, K_FIRE, false);
  }
}
// 現在岩漿漲到哪一段（給提示用）：0 還在底下、1 碰到下層鑄造台
function lavaReach(side) {
  const W = S.water; if (!W || !W.lava) return 0;
  for (const b of S.st[side === undefined ? 1 : side].blocks) if (!b.dead && b.inPlace && b.heat > 0.5) return 1;
  return 0;
}

/* ---------- 第十五關：鐵水鍋 ----------
   吊它的鐵鍊斷了就往下掉（砸穿屋頂、砸到人：48-mech、45-phys 吊著的東西掉下來那一套），一撞到東西（或掉了一陣子）就翻倒、鐵水澆出來：
   鐵水落在正下方第一個擋住它的東西上（屋頂、樓板、岩漿），在那裡攤開、一直燒：底下的兵燙傷，磚發紅、一直軟掉；燒穿了那一層就再往下流 */
const POUR_W = 2.6, POUR_T = 2.8, POUR_U = 26, POUR_B = 0.11;
function potStep(dt) {
  for (const r of S.ropes) {
    const b = r.hang; if (!b || b.hang !== 'pot' || b.dead || b.spilt || !b.hangFree || !b.body) continue;
    const v = b.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y);
    b.potT = (b.potT || 0) + dt; if (sp > (b.potV || 0)) b.potV = sp;
    if ((b.potV > 8 && sp < b.potV * 0.5) || b.potT > 2.4) spillPot(b);
  }
}
function spillPot(b) {
  b.spilt = 1;
  const p = b.body.getPosition(), by = b.hitBy !== undefined ? b.hitBy : 2;
  b.body.setAwake(true); b.body.applyAngularImpulse((b.side === 0 ? -1 : 1) * b.mass * 4, true);          // 往戰場那一邊翻倒
  S.objs.push({ t: 'pour', side: b.side, by, pot: b, x: p.x, y: p.y, w: POUR_W, age: 0, life: POUR_T, gy: p.y, dir: b.side === 0 ? 1 : -1 });
  ev('pour', p.x, p.y, b.side);
}
// 鐵水往下流，第一個擋住它的東西（兵不算，鐵水鍋自己不算）
let _pg = 0, _pgPot = null;
function _pgcb(f, pt, n, fr) { const o = f.getUserData(); if (o && (o.isUnit || o === _pgPot)) return -1; _pg = pt.y; return fr; }
function pourGround(o) {
  const W = S.water, bot = W && o.x > W.x0 && o.x < W.x1 ? W.y : -30;
  _pg = bot; _pgPot = o.pot;
  PH.world.rayCast({ x: o.x, y: o.y + 0.2 }, { x: o.x, y: bot }, _pgcb);
  return Math.max(_pg, bot);
}
function pourStep(o, dt) {
  o.age += dt; if (o.age >= o.life) return true;
  if (o.pot && !o.pot.dead && o.pot.body) { const q = o.pot.body.getPosition(); o.x = q.x + o.dir * 0.6; o.y = q.y; }
  o.gy = pourGround(o);
  const k = o.age < 0.25 ? o.age / 0.25 : o.age > o.life - 0.5 ? (o.life - o.age) / 0.5 : 1;
  for (const u of S.units) {
    if (!u.alive || !u.body || Math.abs(u.x - o.x) > o.w + 0.7) continue;
    if (u.y > o.y + 0.5 || u.y < o.gy - 1.2) continue;          // 站在鐵水攤開的那一層上（或還在流下來的路上）
    hurtUnit(u, POUR_U * k * dt, o.by === u.side ? 2 : o.by, K_FIRE);
  }
  for (const b of S.blocks) {
    if (b.dead || !b.body || b.hang) continue;
    const p = b.body.getPosition(); if (Math.abs(p.x - o.x) > o.w + b.w * 0.5 || p.y - b.h * 0.5 > o.gy + 0.4 || p.y + b.h * 0.5 < o.gy - 1.6) continue;
    b.heat = 1;
    if (MAT[b.mat].burn && !(b.burn > 0)) ignite(b, 4, o.by === b.side ? 2 : o.by);
    if (!b.dead) { const fl = b.flash; blockHurt(b, (b.seg ? b.segM : b.hm) * POUR_B * k * dt, K_CRUSH, o.by === b.side ? 2 : o.by, o.x, o.gy); if (!b.dead) b.flash = fl; }
  }
  return false;
}

/* ---------- 敵軍、自動玩家想打的要害 ---------- */
// 第十三關：水塔（底下還有兵）、露在水面上的木樁（退潮的時候）
function tideWeak(side) {
  const o = 1 - side, st = S.st[o], out = [], W = S.water;
  for (const b of st.blocks) {
    if (b.dead || !b.body || !b.inPlace) continue;
    const p = b.body.getPosition();
    if (b.tank) out.push({ x: p.x, y: p.y, w: 1.05, blk: b });
    // 木樁：露出水面的那一截（打在水面上方一點）
    else if (b.mat === M_WOOD && b.ch >= 3 && b.h > b.w * 2 && b.cy <= 2 && W) { const top = p.y + b.h / 2, y = Math.max(W.y + 1.4, p.y - b.h / 2 + 1.2); if (y < top - 0.8) out.push({ x: p.x, y, w: W.y < -4 ? 1.15 : 0.7, blk: b }); }
  }
  return out;
}
