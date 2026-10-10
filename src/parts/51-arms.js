/* ===== 51-arms: 第三篇的新兵器和新規則 =====
   兵器：鏈彈、鑽頭、子母彈、黏性炸藥、磁暴、龍捲風、酸液、狙擊、工兵（數字在 40-defs 的 WL、UNIT）。
   規則（關卡的 rules）：ff 誤傷（自己的砲炸到自己人一樣會傷）、crit 弱點暴擊（打中接點、核心、兵的頭 ×2）、elem 冰能滅火。
   傷害數字、屬性剋制的字每一關都會跳（只是看得見，不改數字）。
   跟戰局用同一套 S、SH；不碰畫面，Node 裡也能跑 */
const FF_K = 0.8;          // 誤傷：自己的砲炸到自己人，傷害打幾折
const CRIT_K = 2;          // 暴擊倍率
const NO_RULES = {};
function rules() { return (S.lv && S.lv.rules) || NO_RULES; }

/* ---------- 弱點：接點（榫頭、繩子和鐵鍊綁住的地方、插銷）、核心（魔晶、共鳴晶柱、心柱、關卡標的弱點）、兵的頭 ---------- */
function weakSpot(b, x, y) {
  if (!b || b.dead) return false;
  if (b.core || b.reso || b.heart || b.weak) return true;
  const near = (px, py) => (px - x) * (px - x) + (py - y) * (py - y) < 1.0;
  if (b.ropes) for (const r of b.ropes) { if (r.cut) continue; const e = ropeEnds(r); if ((r.a === b && near(e[0], e[1])) || (r.b === b && near(e[2], e[3]))) return true; }
  // 榫頭：接點記在 a 那一塊的座標裡（a、b 兩塊都算）
  if (b.welds && b.body) for (const w of b.welds) { if (!w.j || !w.la || !w.a || !w.a.body) continue; const q = w.a.body.getWorldPoint(w.la); if (near(q.x, q.y)) return true; }
  return false;
}
function headShot(u, y) { return !!u && u.alive && !u.def.big && y > u.y + u.bh * 0.68; }

/* ---------- 傷害數字、屬性剋制的字 ---------- */
// 一炸打完：這一炸打掉城樓多少，跳一個數字（爆炸裡面又引爆別的東西時，數字分開算）
function armsDone(x, y, side, dacc0) {
  const d = PH.dacc; PH.dk = Math.max(0, PH.dk - 1); PH.dacc = dacc0 + d;
  if (d >= 2) ev('bdmg', x, y + 1.2, d, side);
}
// 打中的東西剛好被剋（火燒木頭、雷劈鐵甲、酸蝕石頭……）：跳一句
function armsElem(x, y, kind, flag, b) {
  const k = (flag & F_FIRE) && ELEM[K_FIRE][b.mat] ? K_FIRE : kind, t = ELEM[k] && ELEM[k][b.mat];
  if (t) ev('elem', x, y + 2.2, t);
}

/* ---------- 子母彈：過了最高點、飛出自己的城之後分成小炸彈 ----------
   小炸彈順著彈道往前散（快的落得遠、慢的落得近），不會往回飛砸到自己的城 */
function clusterOverOwn(side, x) { const st = side < 2 ? S.st[side] : null; return !!st && x > st.x0 - 2 && x < st.x1 + 2; }
function clusterSplit(i, x, y, vx, vy) {
  const w = WL[SH.w[i]], sp = w.split, side = SH.side[i], bi = WPN.bomblet.i, n = sp.n, m = SH.mass[i], fl = SH.flag[i] & ~F_IN;
  const dir = vx > 0.01 ? 1 : vx < -0.01 ? -1 : side === 1 ? -1 : 1, ax = Math.abs(vx);
  for (let k = 0; k < n; k++) {
    if (SH.cnt[side] >= SHOT_CAP) break;
    const f = n > 1 ? k / (n - 1) - 0.5 : 0;
    const bvx = dir * Math.max(ax * 0.35, ax * (1 + f * sp.k) + f * 2 * sp.sp + (rnd() - 0.5) * 0.6);
    const j = spawnShot(side, bi, x, y, bvx, vy - 1 - rnd() * 2, m, fl, SH.mask[i], SH.lin[i]);
    if (j >= 0) SH.age[j] = SH.age[i];
  }
  if (side === 0 && SH.lin[i] * n > S.stat.swarm) S.stat.swarm = SH.lin[i] * n;
  ev('split', x, y, side);
}

/* ---------- 黏性炸藥：黏在打到的東西上，等自己下一輪開火才爆 ---------- */
function stickCharge(side, x, y, o, mass) {
  const W = WPN.sticky, c = { t: 'charge', side, x, y, hp: W.stick.hp, hm: W.stick.hp, mass, host: null, lp: null, r: 1.0, age: 0, go: 0, flash: 0 };
  const P = o && (o.isHull || o.isPlat || o.isPart) ? o.plat || o.part : null;
  if (o && o.isBlock && !o.dead && o.body) { const q = o.body.getLocalPoint({ x, y }); c.host = o; c.lp = { x: q.x, y: q.y }; }
  else if (P && P.body && !P.dead) { const q = P.body.getLocalPoint({ x, y }); c.hostP = P; c.lp = { x: q.x, y: q.y }; c.hullSide = o.st ? o.st.side : 2; }          // 船身、浮島、吊籠：跟著它一起動
  S.objs.push(c); ev('stuck', x, y, side);
}
// 這一邊開火：自己黏在別人城上的炸藥一顆一顆引爆
function chargesGo(side) {
  let k = 0;
  for (const o of S.objs) if (o.t === 'charge' && o.side === side && o.hp > 0 && !o.go) { o.go = S.time + 0.35 + 0.22 * k++; ev('chargego', o.x, o.y, side); }
}
// 炸藥黏在哪一邊的城上（工兵拆得到自己城上的）
function chargeOn(o) { return o.host ? o.host.side : o.hostP ? o.hullSide : 2; }
// 黏著的那塊磚（船身、浮島）沒了：已經在引爆（自己開火了）就照樣炸；還沒輪到就跟著掉下去，不會爆
function chargeLost(o) {
  if (o.go) return;
  o.hp = 0; ev('defuse', o.x, o.y, 2, 1);
}
function chargeStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4);
  if (o.host) {
    if (o.host.dead || !o.host.body) { o.host = null; chargeLost(o); }
    else { const q = o.host.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y; }
  } else if (o.hostP) {
    if (o.hostP.dead || !o.hostP.body) { o.hostP = null; chargeLost(o); } else { const q = o.hostP.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y; }
  }
  if (o.hp <= 0) return true;
  if (o.go && S.time >= o.go) {
    const v = 1 - o.side, on = chargeOn(o);
    if (o.side < 2 && S.team[v].shield.on && (on === v || inBubble(S.st[v], o.x, o.y))) { o.hp = 0; ev('defuse', o.x, o.y, v, 2); return true; }          // 對方開著護罩：罩住的炸藥（黏在城上的、掉在城腳的）悶熄，不會爆
    physExplode(o.x, o.y, WPN.sticky, o.side, o.mass, 0, o.host || null, 0, -1); return true;
  }
  return false;
}
// 炸藥被打到（對方的砲彈、爆炸）：打掉了就不會爆
function chargeHurt(o, d, side) {
  if (o.hp <= 0 || side === o.side || side > 1) return;
  o.hp -= d; o.flash = 1;
  if (o.hp <= 0) ev('defuse', o.x, o.y, side);
}

/* ---------- 龍捲風：落點捲起一道風柱，把輕的磚、兵捲起來往外甩 ---------- */
function spawnTwister(x, y, side, mass) {
  const T = WPN.wind.tw, k = Math.min(1.35, Math.sqrt(Math.max(0.5, mass)));
  S.objs.push({ t: 'twister', side, x, y: y - 0.8, R: T.R * k, H: T.H * k, life: T.life, age: 0, lift: T.lift, mass, spin: 0 });
  ev('twister', x, y, side);
}
function twisterStep(o, dt) {
  o.age += dt; o.spin += dt * 9;
  if (o.age >= o.life) return true;
  const k = o.age < 0.3 ? o.age / 0.3 : o.age > o.life - 0.5 ? (o.life - o.age) / 0.5 : 1;
  const R = o.R, H = o.H, ff = !!rules().ff, T = o.side < 2 ? S.team[o.side] : null, mul = (T ? T.dmg : 1) * S.rage * o.mass;
  const list = physQuery(o.x, o.y + H * 0.5, Math.max(R, H * 0.5) + 1);
  for (const b of list) {
    if (b.isBlock) {
      if (b.dead || !b.body || b.isRock || b.bigBell || b.boulder || !b.body.isDynamic()) continue;
      const p = b.body.getPosition(), dx = p.x - o.x, dy = p.y - o.y; if (Math.abs(dx) > R || dy < -1.5 || dy > H) continue;
      const m = b.mass, light = Math.min(1, 5 / Math.max(0.5, m)); if (light < 0.12) continue;          // 太重的吹不動（石牆、鐵甲、大樑）
      const f = k * (1 - Math.abs(dx) / R * 0.7) * (1 - Math.max(0, dy) / H * 0.5), s = dx >= 0 ? 1 : -1;
      b.body.setAwake(true);
      b.body.applyLinearImpulse({ x: s * m * 9 * f * light * dt, y: m * GRAV * o.lift * f * light * dt }, b.body.getWorldCenter(), true);
      b.body.applyAngularImpulse(-s * m * 2.4 * f * light * dt, true);
      if (b.side < 2 && (b.side !== o.side || ff)) blockHurt(b, WPN.wind.dmg * 3 * f * mul * dt, K_WIND, o.side);
    } else if (b.isUnit && b.alive && b.body) {
      if (b.def.big || (b.side === o.side && !ff)) continue;
      const dx = b.x - o.x, dy = b.y - o.y; if (Math.abs(dx) > R + 0.8 || dy < -2 || dy > H) continue;
      const f = k * (1 - Math.abs(dx) / (R + 0.8) * 0.6), st = S.st[b.side], away = st ? (b.x >= st.cx ? 1 : -1) : (dx >= 0 ? 1 : -1);
      // 只有站在城外的兵會被捲起來甩出去；城裡的兵有牆擋著，只被風刮一下
      if (b.out) { b.body.setAwake(true); b.body.applyLinearImpulse({ x: away * b.mass * 11 * f * dt, y: b.mass * GRAV * 1.55 * f * dt }, b.body.getWorldCenter(), true); }
      hurtUnit(b, 4 * f * mul * dt * (b.side === o.side ? FF_K : 1), o.side, K_WIND);
    }
  }
  return false;
}

/* ---------- 酸液：濺到的磚和兵一直被蝕（只在砲擊、落石的時候算，瞄準的時候停） ---------- */
function acidSplash(x, y, r, side, mass, hit) {
  const A = WPN.acid.acid, t = A.t * Math.min(1.5, Math.max(0.6, mass)), ff = !!rules().ff;
  for (const o of physQuery(x, y, r + 0.5)) {
    if (o.isBlock) {
      if (o.dead || o.isRock || o.frag) continue;
      const d = blockDist(o, x, y); if (d > r && o !== hit) continue;
      if (!(o.acid > 0)) S.nacid++;
      o.acid = Math.max(o.acid || 0, t * (o === hit ? 1 : 0.7)); o.acidBy = side; o.acidM = mass;
    } else if (o.isUnit && o.alive && (o.side !== side || ff)) {
      if (Math.hypot(o.x - x, o.y + 1.5 - y) > r + 1) continue;
      if (!(o.acid > 0)) S.nacid++;
      o.acid = Math.max(o.acid || 0, t * 0.55); o.acidBy = side;
    }
  }
}
function acidStep(dt) {
  if (S.nacid <= 0) return;
  if (S.state === 'play' && (S.phase === 'aim' || S.phase === 'intro')) return;
  const A = WPN.acid.acid; let n = 0;
  for (const b of S.blocks) {
    if (b.dead || !(b.acid > 0)) continue;
    b.acid -= dt; if (b.acid <= 0) { b.acid = 0; continue; }
    n++; const T = b.acidBy < 2 ? S.team[b.acidBy] : null;
    blockHurt(b, A.dps * dt * (T ? T.dmg : 1) * (b.acidM || 1), K_ACID, b.acidBy === b.side ? 2 : b.acidBy);
  }
  for (const u of S.units) {
    if (!u.alive || !(u.acid > 0)) continue;
    u.acid -= dt; if (u.acid <= 0) { u.acid = 0; continue; }
    n++; hurtUnit(u, A.ud * dt * (u.acidBy === u.side ? FF_K : 1), u.acidBy === u.side ? 2 : u.acidBy, K_ACID);
  }
  S.nacid = n;
}

/* ---------- 磁暴：落點方圓 R 裡的鐵磚被一把吸過去，鐵鍊被扯 ---------- */
function magPulse(x, y, w, side, mass, mul) {
  const M = w.mag, R = M.R * Math.min(1.3, Math.sqrt(Math.max(0.6, mass))), ff = !!rules().ff;
  for (const o of physQuery(x, y, R + 1)) {
    if (!o.isBlock || o.dead || !o.body || o.mat !== M_IRON || o.rod) continue;
    if (o.side === side && !ff) continue;
    const p = o.body.getPosition(), dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy); if (d > R) continue;
    const f = 1 - d / R, j = Math.min(M.J * f * Math.pow(mass, 0.6), o.mass * 18), nl = d || 1;
    o.body.setAwake(true); o.body.applyLinearImpulse({ x: dx / nl * j, y: dy / nl * j + j * 0.15 }, o.body.getWorldCenter(), true);
    blockHurt(o, M.d * f * mul, K_MAG, side);
  }
  // 鐵做的會動的東西（吊籠、鐵吊燈）也被吸一下
  for (const P of S.plats) {
    if (P.dead || !P.body || P.kind !== 'cage') continue;
    const p = P.body.getPosition(), dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy); if (d > R + 2) continue;
    const f = 1 - Math.min(1, d / (R + 2)), j = M.J * 0.8 * f, nl = d || 1;
    P.body.setAwake(true); P.body.applyLinearImpulse({ x: dx / nl * j, y: dy / nl * j }, p, true);
  }
  // 鐵鍊：只扯得動落點附近的（rr 以內；吸鐵磚的範圍大得多）。同一輪只扯得動一次：全隊的磁暴打在同一條鐵鍊上，也只算最重的那一下
  const Rr = Math.min(R, M.rr * Math.min(1.3, Math.sqrt(Math.max(0.6, mass))));
  for (const r of S.ropes) {
    if (r.cut || r.kind !== 'chain' || (r.side === side && !ff)) continue;
    const e = r.e, d = segDist(x, y, e[0], e[1], e[2], e[3]); if (d > Rr) continue;
    const dm = M.d * M.rope * (1 - d / Rr) * mul, had = r.magV === S.vol ? r.magD : 0;
    if (dm <= had) continue;
    r.magV = S.vol; r.magD = dm;
    ropeHurt(r, dm - had, K_MAG, side === r.side ? 2 : side);
  }
  ev('magpulse', x, y, R, side);
}

/* ---------- 鏈彈打到兵：被鐵鍊纏住，下一輪不能開火 ---------- */
function tangle(u, side) {
  if (!u || !u.alive || u.immune || u.def.big || r1v(u.side)) return;
  u.stun = Math.max(u.stun, 1); u.dazed = 1; u.tangled = 1; ev('tangle', u.x, u.y + 2, u.side);
}

/* ---------- 新兵器打到東西：各自的打法 ----------
   回傳 0 照原本的炸開；1 處理完了（砲彈沒了）；2 處理完了、砲彈接著飛（位置、速度已經寫回 SH） */
function armsHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i], mass = SH.mass[i], T = side < 2 ? S.team[side] : null, mul = (T ? T.dmg : 1) * S.rage * mass, sp = Math.hypot(vx, vy) || 1;
  if (w.stick) {
    if (hit === 3 && o && o.alive) { physExplode(hx, hy, w, side, mass * 0.5, SH.flag[i], o, vx, vy); return 1; }          // 黏到人身上：當場炸開（威力一半）
    stickCharge(side, hx, hy, o, mass); return 1;
  }
  if (w.drill) {
    const D = w.drill, blk = hit === 2 && o && o.isBlock && !o.dead, hull = hit === 1 && o && o.isHull && o.hp > 0;
    if ((blk || hull) && SH.p[i] < D.n) {
      if (hull) hullHurt(o, D.d * mul, K_HEAVY, side); else blockHurt(o, D.d * mul, K_HEAVY, side, hx, hy);
      SH.p[i]++; ev('drill', hx, hy, side);
      const k = D.slow, nx = hx + vx / sp * 0.4, ny = hy + vy / sp * 0.4;
      SH.x[i] = nx; SH.y[i] = ny; SH.vx[i] = vx * k; SH.vy[i] = vy * k; SH.flag[i] &= ~F_IN;
      if (SH.p[i] >= D.n || sp * k < 9) { physExplode(nx, ny, w, side, mass, SH.flag[i] & ~F_FIRE, null, vx, vy); return 1; }          // 鑽夠深了（或鑽不動了）：在裡面炸開（悶在裡面，火燒不起來：點不著地窖的火藥庫）
      return 2;
    }
    if (hit === 1 && (!o || o.isPlat)) { ev('drill', hx, hy, side); physExplode(hx + vx / sp * 0.6, hy - 1.1, w, side, mass, SH.flag[i] & ~F_FIRE, null, vx, vy); return 1; }          // 鑽進地裡（浮島的岩石裡）炸：打得到地窖的牆（地底下火燒不起來，火藥庫還是要引信燒進去）
    return 0;
  }
  if (w.chain) {
    const C = w.chain;
    if (hit === 2 && o && o.isBlock && !o.dead && o.body && o.w <= CS * 0.82 && o.h >= CS * 0.9) {          // 細柱子：整根掃過去，打斷了砲彈繼續往前
      blockHurt(o, w.dmg * C.pillar * mul, K_HEAVY, side, hx, hy); ev('chainhit', hx, hy, side);
      if (o.body) { const j = Math.min(w.J * 0.6, o.mass * 8); o.body.applyLinearImpulse({ x: vx / sp * j, y: vy / sp * j }, { x: hx, y: hy }, true); }
      if (o.dead && SH.p[i] < C.pass) { SH.p[i]++; SH.x[i] = hx; SH.y[i] = hy; SH.vx[i] = vx * 0.78; SH.vy[i] = vy * 0.78; SH.flag[i] &= ~F_IN; return 2; }
      return 1;
    }
    if (hit === 3 && o && o.alive) { physExplode(hx, hy, w, side, mass, SH.flag[i], o, vx, vy); tangle(o, side); return 1; }
    return 0;
  }
  if (w.pierce) {
    // 狙擊彈：穿過一層木牆（木頭、竹子、屋瓦、琉璃、陶甕），打到後面的兵
    if (hit === 2 && o && o.isBlock && !o.dead && SH.p[i] < w.pierce && (o.mat === M_WOOD || o.mat === M_BAMBOO || o.mat === M_ROOF || o.mat === M_GLASS || o.mat === M_CLAY)) {
      blockHurt(o, w.dmg * 2 * mul, K_PIERCE, side, hx, hy); SH.p[i]++; ev('splinter', hx, hy);
      SH.x[i] = hx + vx / sp * 0.25; SH.y[i] = hy + vy / sp * 0.25; SH.vx[i] = vx * 0.85; SH.vy[i] = vy * 0.85; SH.flag[i] &= ~F_IN;
      return 2;
    }
    return 0;
  }
  return 0;
}
// 鏈彈掃過的寬度：除了正中那一條，兩邊各平移 w 再找一次繩子（sid：這一發已經掃過的那條不算，不會一條繩子挨兩下）
function chainRope(x, y, nx, ny, side, w, sid) {
  let rc = ropeCrossSkip(x, y, nx, ny, side, sid); if (rc) return rc;
  const dx = nx - x, dy = ny - y, l = Math.hypot(dx, dy) || 1, px = -dy / l * w, py = dx / l * w;
  rc = ropeCrossSkip(x + px, y + py, nx + px, ny + py, side, sid); if (rc) return rc;
  return ropeCrossSkip(x - px, y - py, nx - px, ny - py, side, sid);
}
function ropeCrossSkip(x, y, nx, ny, side, sid) {
  for (const r of S.ropes) {
    if (r.cut || r.side === side || (sid && r.chId === sid)) continue;
    const e = r.e;
    if ((x < e[0] - 0.5 && nx < e[0] - 0.5 && x < e[2] - 0.5 && nx < e[2] - 0.5) || (x > e[0] + 0.5 && nx > e[0] + 0.5 && x > e[2] + 0.5 && nx > e[2] + 0.5)) continue;
    const t = segHit(x, y, nx, ny, e[0], e[1], e[2], e[3]);
    if (t >= 0) { _rc.r = r; _rc.t = t; return _rc; }
  }
  return null;
}

/* ---------- 工兵：不打人。拆掉黏在自己城上的炸藥、修好打裂的磚；都好好的就在城前架一道木牆 ---------- */
const WALL_MAX = 2;
function engFix(u) {
  if (!u.alive || u.held) return;
  const side = u.side, st = S.st[side]; let n = u.def.fix || 2;
  for (const o of S.objs) { if (n <= 0) break; if (o.t === 'charge' && o.hp > 0 && o.side !== side && chargeOn(o) === side) { o.hp = 0; n--; ev('defuse', o.x, o.y, side); } }
  // 拖太久、兩邊的城開始自己塌（sudden）：修不動了，只拆得掉炸藥（不然兩邊都是工兵的話永遠打不完）
  if (S.round >= (S.lv.sudden || 10)) { u.recoil = 1; return; }
  const L = st.blocks.filter((b) => !b.dead && b.body && b.inPlace && !b.lost && b.wt > 0 && !b.frag && b.hp < b.hm * 0.8);
  const need = (b) => ((b.sup || 0) + b.wt) * (1 - b.hp / b.hm);
  L.sort((a, b) => need(b) - need(a));
  for (const b of L) {
    if (n <= 0) break;
    if (b.seg) { let hp = 0, low = 1; for (let k = 0; k < b.seg.length; k++) { if (b.seg[k] > 0) b.seg[k] = Math.min(b.segM, b.seg[k] + b.segM * 0.6); hp += Math.max(0, b.seg[k]); low = Math.min(low, b.seg[k] / b.segM); } b.hp = hp; b.low = low; }
    else b.hp = Math.min(b.hm, b.hp + b.hm * 0.55);
    b.brit = 0; b.acid = 0; if (b.burn > 0) b.burn = 0;
    const p = b.body.getPosition(); ev('fix', p.x, p.y, side); n--;
  }
  if (n === (u.def.fix || 2)) buildWall(u);
  u.recoil = 1;
}
// 木牆還站著（倒了、被推走的不算數：會再架一道）
function wallUp(b) {
  if (b.dead || !b.body) return false;
  const p = b.body.getPosition();
  return Math.abs(b.body.getAngle()) < 0.35 && Math.hypot(p.x - b.x0, p.y - b.y0) < 1.2;
}
function buildWall(u) {
  const side = u.side, st = S.st[side], dir = side === 0 ? 1 : -1;
  const walls = st.blocks.filter((b) => b.wall && wallUp(b)).length; if (walls >= WALL_MAX) return;
  for (const b of st.blocks) if (b.wall && !b.dead && !wallUp(b)) blockKill(b, 2, K_CRUSH, true);          // 倒了的木牆收掉，再架一道新的
  const w = CS * 0.55, h = CS * 1.55, foot = groundY(side === 0 ? st.x1 - 0.6 : st.x0 + 0.6);
  for (let k = 0; k < 4; k++) {
    const x = (side === 0 ? st.x1 : st.x0) + dir * (1.8 + k * 1.7), gy = groundY(x);
    if ((dir > 0 ? x > MID - 3 : x < MID + 3) || gy < -100) continue;                         // 不過中線、不架在深淵上
    if (S.water && gy < S.water.y + 0.3) continue;                                               // 不架在水裡
    if (foot > -100 && Math.abs(gy - foot) > 4) continue;                                         // 跟城腳差不多高的平地才架
    let flat = true; for (const q of [-0.5, -0.25, 0.25, 0.5]) if (Math.abs(groundY(x + q * w) - gy) > 0.14) flat = false;
    if (!flat) continue;                                                                          // 斜坡上架不穩（會倒）
    if (physQuery(x, gy + h / 2, h / 2 + 0.2).some((o) => (o.isBlock && !o.dead) || (o.isUnit && o.alive))) continue;
    const b = mkBlock(st, { mat: M_WOOD, kind: 'box', x, y: gy + h / 2 + 0.02, w, h, awake: true });
    b.wall = 1; b.wt = 0; b.inPlace = true; b.x0 = x; b.y0 = gy + h / 2 + 0.02;
    ev('wall', x, gy + h / 2, side);
    return;
  }
}
