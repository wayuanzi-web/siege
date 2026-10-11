/* ===== 53-env: 第三篇的環境（每回合在變的戰場） =====
   第十三關：潮汐（水面每回合換高度）、暴潮（大潮那一回合結束時海水猛漲又退下去，把沒有牆擋著的兵拖下海）、水塔（打破了水從頂樓灌下來）。
   第十四關：風車（城前一具會轉的大葉輪，四支葉臂各吊一個吊艙；回合結束照風向轉 45 度）、陣風（砲彈飛到一半風向突然變）、龍捲風（每三回合在中場把飛進去的砲彈往上捲）。
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
  if (S.rotors.length) return rotorsTurn();
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
  if (S.rotors.length) rotorStep(dt);
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
function envBusy() { const E = S.env; return !!(E && (E.surge || E.tideA)) || S.rotors.some((R) => R.rot); }
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

/* ---------- 第十四關：陣風 ----------
   每回合（gust.at 起）預告一陣風：砲彈飛到第 t 秒，風向突然反過來、變成 w（瞄準線、敵軍都照這個算）。
   windAt(age)：飛了 age 秒的砲彈現在吃多大的風；windDisp、windVel：從開火到 tau 秒，風總共把它往旁邊推了多遠、推出多少橫向速度 */
function windAt(age) { const G = S.gust; return G && age >= G.t ? G.w : S.wind; }
function windDisp(w, tau) { const G = S.gust; if (!G || tau <= G.t) return 0.5 * w * tau * tau; const d = tau - G.t; return 0.5 * w * G.t * G.t + w * G.t * d + 0.5 * G.w * d * d; }
function windVel(w, tau) { const G = S.gust; return !G || tau <= G.t ? w * tau : w * G.t + G.w * (tau - G.t); }
// 回合開始：這一回合有沒有陣風（有風才有陣風；反著吹、比原本的風強一點）
function gustRound() {
  const g = S.lv.gust; S.gust = null;
  if (!g || S.round < (g.at || 1) || !S.wind || rnd() > (g.p === undefined ? 1 : g.p)) return;
  const w = -Math.sign(S.wind) * Math.round(g.max * (0.6 + rnd() * 0.4)), t = Math.round((g.t0 + rnd() * (g.t1 - g.t0)) * 10) / 10;
  S.gust = { t, w }; ev('gust', t, w, S.wind);
}
/* ---------- 第十四關：龍捲風 ----------
   每 every 回合一道龍捲風在中場（這一回合裡位置不動，畫面上左右擺）：飛進風柱裡的砲彈被往上捲（橫向速度被吃掉一大半），
   從頂上甩出去再掉下來。戰局和試射用同一個 vortexForce（49-amp 的 ampForces） */
function tornadoRound() {
  const T = S.lv.tornado; if (!T) return;
  for (let i = S.objs.length - 1; i >= 0; i--) if (S.objs[i].t === 'vortex') { ev('vortexoff', S.objs[i].x, S.objs[i].base); S.objs.splice(i, 1); }
  AMP.vorts.length = 0;
  if (S.round < T.at || (S.round - T.at) % T.every) return;
  const x = T.x0 + rnd() * (T.x1 - T.x0), base = groundYRaw(x), o = { t: 'vortex', x, base, top: base + T.h, R: T.R, up: T.up, damp: T.damp, age: 0, flash: 0 };
  S.objs.push(o); AMP.vorts.push(o); AMP.any = true;
  ev('vortex', x, base, T.h);
}
function vortexForce(o, dt) {
  const dx = SA.x - o.x; if (dx * dx > o.R * o.R || SA.y < o.base - 1 || SA.y > o.top) return 0;
  const k = 1 - Math.abs(dx) / o.R * 0.5;
  SA.vy += o.up * k * dt; SA.vx *= Math.exp(-o.damp * k * dt);
  return 0;
}

/* ---------- 第十四關：風車的葉輪、吊艙 ----------
   葉輪是一整個會轉的東西：轉軸裝在城樓正中的軸座（藍圖的 U）前面，四支葉臂是它身上的四段，各自有耐久（木頭的帆架）；
   每支葉臂的尖端用鉸鏈吊一個吊艙（跟吊籠一樣的鐵籠，兵站在裡面），轉的時候吊艙一直朝下。
   葉輪平常卡死不動（瞄準、砲擊、別人推它都不動）；回合結束時照這一回合的風向轉 45 度（兩座城鏡射：順風往同一邊倒）。
   打斷一支葉臂：那個吊艙連人掉下去；軸座被打掉（或連著城樓垮了），整具葉輪掉下來。
   葉輪、吊艙、站在吊艙裡的兵都跟自己的城不碰撞：葉輪在城樓前面轉 */
const ROTOR_SPD = 0.75;          // 轉的時候一秒轉多少（弧度）：45 度大概一秒多
const ROTOR_STEP = Math.PI / 4;
function mkRotor(st, d) {
  const ub = st.blocks.find((b) => b.axle); if (!ub) return null;
  const hx = ub.x0, hy = ub.y0, L = d.len * CS, hm = d.hp * (st.hpMul || 1);
  const body = PH.world.createBody({ type: 'dynamic', position: { x: hx, y: hy }, awake: false, angularDamping: 0.8, linearDamping: 0.05 });
  const R = { st, side: st.side, body, x: hx, y: hy, ub, arms: [], gond: [], j: null, fallen: false, rot: null, ang: 0, n: d.n, len: L, by: 2 };
  R.hubTag = { isRock: true, isRotor: true, rotor: R, st, side: st.side };
  body.createFixture({ shape: new PL.Circle(1.0), density: 3, friction: 0.6, restitution: 0, filterCategoryBits: CAT_TERR, userData: R.hubTag });
  for (let k = 0; k < d.n; k++) {
    let a = d.a0 + k * TAU / d.n; if (st.mirror) a = Math.PI - a;
    const ca = Math.cos(a), sa = Math.sin(a);
    const A = { isRock: true, isArm: true, rotor: R, st, side: st.side, k, a, hp: hm, hm, flash: 0, burn: 0, fix: null, gond: null, broken: false, wt: d.aw, by: 2 };
    A.fix = body.createFixture({ shape: new PL.Box(L / 2, 0.3, { x: ca * L / 2, y: sa * L / 2 }, a), density: 0.7, friction: 0.6, restitution: 0, filterCategoryBits: CAT_TERR, userData: A });
    A.lx = ca * L; A.ly = sa * L;
    R.arms.push(A);
    const G = mkGondola(st, R, hx + ca * L, hy + sa * L, d); G.arm = A; A.gond = G; R.gond.push(G);
  }
  R.j = PH.world.createJoint(new PL.RevoluteJoint({ enableMotor: true, motorSpeed: 0, maxMotorTorque: 1e9, collideConnected: false }, PH.ground, body, { x: hx, y: hy }));
  st.rotor = R; S.rotors.push(R);
  const w = d.aw * d.n + d.gw * d.n; st.hp0 += w; st.hpNow = st.hp0;
  return R;
}
// 吊艙：(px, py) 是吊點（葉臂尖端）；艙底在吊點底下一格半（藍圖上兵位那一格的底）
function mkGondola(st, R, px, py, d) {
  const w = 2.9, ch = 3.3, fy = py - 1.5 * CS, ox = px, oy = fy + ch / 2;
  const body = PH.world.createBody({ type: 'dynamic', position: { x: ox, y: oy }, awake: false, angularDamping: 3.2, linearDamping: 0.3 });
  const P = { st, kind: 'gondola', body, x0: ox, y0: oy, a0: 0, cells: [], xa: ox - w / 2, xb: ox + w / 2, ya: fy - 0.5, yb: fy + ch, dead: false, swing: 0.7, teth: [], calm: true, j: null, arm: null, dropped: false, wt: d.gw, px, py, fy, w, ch };
  P.tag = { isRock: true, isPart: true, st, side: st.side, part: P };
  const fx = (hw, hh, cx, cy, den) => body.createFixture({ shape: new PL.Box(hw, hh, { x: cx, y: cy - oy }, 0), density: den, friction: 0.9, restitution: 0, filterCategoryBits: CAT_TERR, userData: P.tag });
  fx(w / 2, 0.25, 0, fy - 0.25, 1.4);                                   // 艙底（上緣就是兵站的地方）
  for (const sx of [-1, 1]) fx(0.16, ch / 2, sx * (w / 2 - 0.16), fy + ch / 2, 0.8);          // 兩邊的鐵條
  fx(w / 2, 0.18, 0, fy + ch - 0.18, 0.6);                              // 頂
  fx(0.12, (py - fy - ch) / 2, 0, (py + fy + ch) / 2, 0.4);             // 吊桿
  P.j = PH.world.createJoint(new PL.RevoluteJoint({ collideConnected: false }, R.body, body, { x: px, y: py }));
  (st.parts || (st.parts = [])).push(P); S.plats.push(P);
  return P;
}
// 葉臂被打到（自己的砲不傷自己的葉輪）。木頭的帆架：火燒得動，磁暴、酸不太動
function armHurt(A, d, kind, side) {
  if (A.broken || A.hp <= 0 || side === A.side || A.rotor.fallen) return;
  d *= DM[kind][M_WOOD]; if (d <= 0) return;
  const before = A.hp; A.hp -= d; A.flash = 1;
  if (PH.dk > 0) PH.dacc += Math.min(d, before);
  if (side < 2) { const T = S.team[side]; T.dealt += Math.min(d, before); T.ult.c = Math.min(T.ult.need, T.ult.c + Math.min(d, before) * T.ult.gain * ULT_BLK * ultK(side)); }
  if ((kind === K_FIRE) && A.hp > 0) { if (!(A.burn > 0)) ev('ignite', A.rotor.x + A.lx * 0.5, A.rotor.y + A.ly * 0.5); A.burn = Math.max(A.burn, 3.5); A.burnBy = side; }
  if (A.hp <= 0) { A.hp = 0; A.by = side < 2 ? side : 2; }
}
// 爆炸碰到葉臂：照離葉臂最近的那一點算（跟船身一樣）
function armBlast(A, x, y, r, dmg, kind, side, hit) {
  if (A.broken) return;
  const R = A.rotor, b = R.body, p0 = b.getPosition(), q = b.getWorldPoint({ x: A.lx, y: A.ly }), d = segDist(x, y, p0.x, p0.y, q.x, q.y) - 0.3;
  const f = A === hit ? 1 : 1 - Math.max(0, d) / r; if (f <= 0) return;
  armHurt(A, A === hit ? dmg : dmg * 0.7 * Math.min(1, f), kind, side);
}
function breakArm(A) {
  const R = A.rotor; A.broken = true; A.hp = 0;
  const q = R.body.getWorldPoint({ x: A.lx, y: A.ly }), m = R.body.getWorldPoint({ x: A.lx * 0.5, y: A.ly * 0.5 });
  if (A.fix) { R.body.destroyFixture(A.fix); A.fix = null; R.body.resetMassData(); }
  const G = A.gond; if (G && G.j) { PH.world.destroyJoint(G.j); G.j = null; G.dropped = true; G.body.setAwake(true); G.body.setLinearDamping(0.05); G.body.setAngularDamping(0.6); }
  ev('armbreak', m.x, m.y, R.side, q.x, q.y);
  S.chainT = S.time; if (A.by < 2 && A.by !== R.side && S.state === 'play') S.chain += 3;
}
function rotorFall(R, by) {
  if (R.fallen) return; R.fallen = true; R.rot = null;
  if (R.j) { PH.world.destroyJoint(R.j); R.j = null; }
  R.body.setAwake(true); R.body.setAngularDamping(0.15);
  for (const G of R.gond) if (G.body) G.body.setAwake(true);
  ev('rotorfall', R.x, R.y, R.side);
  S.chainT = S.time; if (by < 2 && by !== R.side && S.state === 'play') S.chain += 6;
}
// 回合結束：兩座城的葉輪照風向各轉 45 度（鏡射：順風的那一邊往外倒）。回傳 true：要等它轉完
function rotorsTurn() {
  if (!S.wind) return false;
  let any = false;
  for (const R of S.rotors) {
    if (R.fallen || !R.j) continue;
    const dir = (S.wind > 0 ? -1 : 1) * (R.side === 0 ? 1 : -1), a = R.j.getJointAngle();
    R.rot = { to: a + dir * ROTOR_STEP, dir, t: 0 }; R.body.setAwake(true); any = true;
    for (const G of R.gond) if (G.body && !G.dropped) G.body.setAwake(true);
  }
  if (any) ev('rotorturn', MID, 0, S.wind);
  return any;
}
function rotorStep(dt) {
  const act = S.state !== 'play' || S.phase === 'volley' || S.phase === 'resolve' || S.phase === 'hazard';
  for (const R of S.rotors) {
    for (const A of R.arms) {
      if (A.flash > 0) A.flash = Math.max(0, A.flash - dt * 5);
      if (A.broken) continue;
      if (A.burn > 0 && act) { A.burn -= dt; const by = A.burnBy; A.hp -= 7 * dt * (by === undefined || by === R.side ? 1 : 1); if (A.hp <= 0) { A.hp = 0; A.by = by === undefined ? 2 : by; } }
      if (A.hp <= 0 && !R.fallen) breakArm(A);
    }
    if (R.fallen) continue;
    // 軸座被打掉、垮了：整具葉輪掉下來
    const ub = R.ub; if (ub.dead || !ub.inPlace) { rotorFall(R, S.phase === 'hazard' ? 2 : S.turn); continue; }
    if (R.rot) {
      const a = R.j.getJointAngle(), rem = (R.rot.to - a) * R.rot.dir; R.rot.t += dt;
      if (rem <= 0.004 || R.rot.t > 4) { R.j.setMotorSpeed(0); R.rot = null; ev('rotorstop', R.x, R.y, R.side); }
      else { R.j.setMotorSpeed(R.rot.dir * Math.min(ROTOR_SPD, rem * 3 + 0.06)); S.chainT = S.time; }
    }
  }
}
// 城樓完整度裡葉輪那一份：還裝著的葉臂（照耐久）、還吊著的吊艙
function rotorHp(st) {
  const R = st.rotor; if (!R || R.fallen) return 0;
  let hp = 0;
  for (const A of R.arms) if (!A.broken) hp += A.wt * (STAND_K + (1 - STAND_K) * clamp(A.hp / A.hm, 0, 1));
  for (const G of R.gond) if (!G.dropped && G.j) hp += G.wt;
  return hp;
}
// 兵站在吊艙裡（還吊著、人也還在艙裡）
function unitRiding(u) {
  const P = u.fr; if (!P || P.kind !== 'gondola' || !P.body) return false;
  const q = frLocal(P, u.x, u.y); return q.x > P.xa - 0.4 && q.x < P.xb + 0.4 && q.y > P.ya - 0.6 && q.y < P.yb + 0.4;
}
// 碰撞：葉輪、吊艙、吊艙裡的兵跟自己的城不碰撞（葉輪在城樓前面轉）；吊艙裡的兵也不碰自己的葉臂
function rotorKind(f, o) {
  if (f && (f.isArm || f.isRotor || (f.isPart && f.part && f.part.kind === 'gondola'))) return 1;
  if (o && o.isUnit && o.alive && o.fr && o.fr.kind === 'gondola' && unitRiding(o)) return 2;
  return 0;
}
function rotorSkip(fa, fb, oa, ob) {
  const ka = rotorKind(fa, oa), kb = rotorKind(fb, ob); if (!ka && !kb) return false;
  if (ka && kb) return (ka === 2 && kb === 1 && !fb.isPart && fb.side === oa.side) || (kb === 2 && ka === 1 && !fa.isPart && fa.side === ob.side);
  const side = ka ? (ka === 2 ? oa.side : fa.side) : (kb === 2 ? ob.side : fb.side), other = ka ? ob : oa;
  return !!(other && other.isBlock && other.st === S.st[side]);
}
// 敵軍、自動玩家想打的要害（第十四關）：吊著自己人的葉臂（臂上的吊艙裡還有兵的，越多越值得）、軸座
function millWeak(side) {
  const o = 1 - side, R = S.st[o].rotor, out = []; if (!R || R.fallen) return out;
  for (const A of R.arms) {
    if (A.broken) continue;
    const G = A.gond, n = G ? S.team[o].units.filter((u) => u.alive && u.fr === G && unitRiding(u)).length : 0;
    const m = R.body.getWorldPoint({ x: A.lx * 0.62, y: A.ly * 0.62 }); out.push({ x: m.x, y: m.y, w: 0.9 + 0.3 * n, arm: A });
  }
  const ub = R.ub; if (!ub.dead && ub.inPlace) out.push({ x: ub.x0, y: ub.y0, w: 1.1, blk: ub });
  return out;
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
