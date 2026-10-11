/* ===== 53-env: 第三篇的環境（每回合在變的戰場） =====
   第十三關：潮汐（水面每回合換高度）、暴潮（大潮那一回合結束時海水猛漲又退下去，把沒有牆擋著的兵拖下海）、水塔（打破了水從頂樓灌下來）。
   第十四關：風車（城前一具會轉的大葉輪，四支葉臂各吊一個吊艙；回合結束照風向轉 45 度）、陣風（砲彈飛到一半風向突然變）、龍捲風（每三回合在中場把飛進去的砲彈往上捲）。
   第十五關：岩漿湖（每回合漲一截；泡到岩漿的鐵發紅變軟、木頭燒起來、碎塊熔掉、兵掉進去就沒了）、鐵水鍋（打斷吊它的鐵鍊，砸下來、鐵水一路澆下去）、火山彈。
   跟戰局用同一套 S；不碰畫面，Node 裡也能跑 */

/* ---------- 潮汐 ---------- */
// 這一回合是第幾段潮（關卡 tide.lv 的第幾個）：0 退潮、1 漲到一半、2 大潮、3 退到一半
// k0：第一回合從第幾段開始（第十三關從「退到一半」開始：開場的木樁半截泡在水裡，第一輪砲火打不垮整座望樓）
function tideIdx(round) { const T = S.lv && S.lv.tide; return T ? (Math.max(1, round) - 1 + (T.k0 || 0)) % T.lv.length : -1; }
function tideNow() { return tideIdx(S.round); }
// 水塔還在（第十三關）
function tankUp(side) { return S.st[side].blocks.some((b) => b.tank && !b.dead); }

function envInit() {
  S.env = { tideA: null, surge: null };
  const T = S.lv.tide, L = S.lv.lava;
  if (T && S.water) { S.water.y = T.lv[tideIdx(1)]; S.water.curF = null; }
  if (L && S.water) { S.water.y = L.y0; S.water.lava = 1; }
}
// 回合結束：換下一段潮（大潮那一回合先來一次暴潮）；岩漿漲一截。回傳 true：要等它演完（hazard）
function envRoundEnd() {
  if (S.beast) return beastRoundEnd();          // 第十八關：巨獸往前走一段（走到城下就踩城）
  if (S.rotors.length) return rotorsTurn();
  if (S.pass) return passSwap();          // 第十六關：路邊換一樣東西（或進出隧道）
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
  if (S.beast) beastStep(dt);          // 第十八關：機關巨獸的骨架、動作
  const E = S.env; if (!E) return;
  const W = S.water;
  if (W && E.surge) {
    const G = E.surge, t = S.time - G.t0;
    if (t < SURGE_UP) { W.y = G.base + G.H * smooth(t / SURGE_UP); W.curF = (x) => (x < MID ? -SURGE_CUR : SURGE_CUR); surgeMark(); }
    else if (t < SURGE_UP + SURGE_HOLD) { W.y = G.base + G.H; W.curF = null; surgeMark(); }
    else if (t < SURGE_UP + SURGE_HOLD + SURGE_DOWN) { const u = (t - SURGE_UP - SURGE_HOLD) / SURGE_DOWN; W.y = G.base + G.H * (1 - smooth(u)); W.curF = (x) => (x < MID ? SURGE_BACK : -SURGE_BACK); backwash(dt, 1 - u); }
    else { W.y = G.base; W.curF = null; E.surge = null; for (const u of S.units) u.surged = 0; if (Math.abs(G.next - W.y) > 0.05) { E.tideA = { from: W.y, to: G.next, t0: S.time, dur: 1.2 }; ev('tide', MID, G.next, tideIdx(S.round + 1)); } }
  } else if (W && E.tideA) {
    const A = E.tideA, u = (S.time - A.t0) / A.dur;
    if (u >= 1) { W.y = A.to; E.tideA = null; } else W.y = A.from + (A.to - A.from) * smooth(u);
  }
  if (W && W.lava) lavaStep(dt);
  potStep(dt);
  if (S.rotors.length) rotorStep(dt);
  if (S.pass) { passStep(dt); trainStep(dt); }
  // 泡進水裡的火被撲滅（第三篇的規則；第一、二篇照舊）
  if (W && !W.lava && S.nburn > 0 && S.lv.rules) for (const b of S.blocks) {
    if (b.dead || !(b.burn > 0) || !b.body) continue;
    const p = b.body.getPosition(); if (p.y < W.y && p.x > W.x0 && p.x < W.x1) { b.burn = 0; S.nburn--; ev('douse', p.x, W.y + 0.5, 2, 1); }
  }
}
/* 退潮：泡在水裡、朝戰場那一邊沒有牆擋著的兵，被退下去的海水一把拖向外海（光靠水流的阻力拖不動站著的兵：腳底的摩擦太大）。
   牆、門、還站著的磚擋在前面的不會被拖走 */
// 暴潮漲上來的時候泡到水的兵（記下來：海水退得比人快，光看當下有沒有泡在水裡，退到一半就拖不動了）
function surgeMark() { for (const u of S.units) if (u.alive && u.wet > 0.2) u.surged = 1; }
function backwash(dt, k) {
  for (const u of S.units) {
    if (!u.alive || !u.body || u.def.big || !u.surged) continue;
    const dir = u.x < MID ? 1 : -1, y = u.y + Math.min(1.2, u.bh * 0.5); let cover = false;
    PH.world.rayCast({ x: u.x, y }, { x: u.x + dir * 3.2, y }, (f) => { const o = f.getUserData(); if (o && (o.isRock || (o.isBlock && !o.dead && !o.frag && !o.prop))) { cover = true; return 0; } return -1; });
    if (cover) continue;
    u.body.setAwake(true);
    u.body.applyLinearImpulse({ x: dir * u.mass * 16 * k * dt, y: u.mass * GRAV * 0.55 * k * dt }, u.body.getWorldCenter(), true);
  }
}
// 潮水還在動（回合結束等它演完）
function envBusy() { const E = S.env; return !!(E && (E.surge || E.tideA)) || S.rotors.some((R) => R.rot) || !!(S.pass && (S.pass.anim || rollBusy())) || beastBusy(); }
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
  // 水塔已經被打離屋頂（掉到海裡、甲板上）才破的：只是一桶水灑出來，不會灌進屋裡
  if (Math.abs(p.x - b.x0) > CS * 1.2 || b.y0 - p.y > CS * 1.2) { ev('splash', p.x, p.y, 1.6, 0); return; }
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
function windAt(age) { const G = S.gust; return G && age >= G.t - 1e-4 ? G.w : S.wind; }          // 砲彈的 age 是 Float32 一步一步加的（60 步加起來是 0.9999997）：差一點點也算到了
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
  // 正中最強、往邊上、往頂上慢慢變弱（邊緣不是一刀切：擦過邊的砲彈，瞄準線跟真的打出去才對得上）
  const u = dx / o.R, k = 1.2 * (1 - u * u) * Math.min(1, (o.top - SA.y) / 5);
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
  R.ubN = st.blocks.filter((b) => b !== ub && Math.abs(b.y0 - ub.y0) < 0.5 && Math.abs(Math.abs(b.x0 - ub.x0) - CS) < 0.5);          // 軸座左右兩塊牆
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
  // 連珠：只算進正在開砲、打對方葉臂的那一邊（被燒斷在自己的回合裡、回合結束時才斷的，不算誰的：跟繩子一樣）
  S.chainT = S.time; if (A.by < 2 && A.by !== R.side && R.side !== S.turn && S.phase !== 'hazard' && S.state === 'play') S.chain += 3;
}
function rotorFall(R, by) {
  if (R.fallen) return; R.fallen = true; R.rot = null; R.fallT = S.time; R.vmax = 0;
  if (R.j) { PH.world.destroyJoint(R.j); R.j = null; }
  R.body.setAwake(true); R.body.setAngularDamping(0.15);
  for (const G of R.gond) if (G.body) G.body.setAwake(true);
  ev('rotorfall', R.x, R.y, R.side);
  S.chainT = S.time; if (by < 2 && by !== R.side && R.side !== S.turn && S.phase !== 'hazard' && S.state === 'play') S.chain += 6;
}
// 掉下來的葉輪砸到地上就散了：帆架全斷、吊艙各自掉下去，只剩一個大轂（不然整具 X 字立在城前，變成擋砲彈的牆）
function rotorShatter(R) {
  R.shat = true;
  for (const A of R.arms) {
    if (A.broken) continue;
    A.broken = true; A.hp = 0; A.burn = 0;
    if (A.fix) { R.body.destroyFixture(A.fix); A.fix = null; }
    const G = A.gond; if (G && G.j) { PH.world.destroyJoint(G.j); G.j = null; G.dropped = true; G.body.setAwake(true); G.body.setLinearDamping(0.05); G.body.setAngularDamping(0.6); }
  }
  R.body.resetMassData();
  const p = R.body.getPosition(); ev('rotorcrash', p.x, p.y, R.side, R.len);
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
    if (R.fallen) {
      // 掉下來的葉輪：撞到地（速度一下子掉一半以上）、或掉了 2.5 秒，就散掉
      if (!R.shat) { const v = R.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y), tt = S.time - R.fallT; R.vmax = Math.max(R.vmax, sp); if ((tt > 0.3 && R.vmax > 4 && sp < R.vmax * 0.5) || tt > 2.5) rotorShatter(R); }
      continue;
    }
    // 軸座被打掉、垮了：整具葉輪掉下來
    const ub = R.ub; if (ub.dead || !ub.inPlace) { rotorFall(R, S.phase === 'hazard' ? 2 : S.turn); continue; }
    if (R.rot) {
      const a = R.j.getJointAngle(), rem = (R.rot.to - a) * R.rot.dir; R.rot.t += dt;
      if (rem <= 0.004 || R.rot.t > 4) { R.j.setMotorSpeed(0); R.rot = null; ev('rotorstop', R.x, R.y, R.side); }
      else { R.j.setMotorSpeed(R.rot.dir * Math.min(ROTOR_SPD, rem * 3 + 0.06)); S.chainT = S.time; }
    }
  }
}
// 還在燒的帆架（砲擊之後等它燒完再換人，跟城樓上的火一樣）
function rotorBurning() { for (const R of S.rotors) if (!R.fallen) for (const A of R.arms) if (!A.broken && A.burn > 0) return true; return false; }
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
  // 軸座：兩邊夾著它的石牆打開了一邊才值得瞄（藏在牆裡的時候砲彈只會炸在牆上）
  const ub = R.ub; if (!ub.dead && ub.inPlace && (!R.ubN || R.ubN.some((b) => b.dead || !b.inPlace))) out.push({ x: ub.x0, y: ub.y0, w: 1.1, blk: ub });
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
  const p = b.body.getPosition(), by = b.hitBy !== undefined ? b.hitBy : 2, W = S.water;
  if (W && W.lava && p.x > W.x0 && p.x < W.x1 && p.y < W.y + 1.2) { ev('melt', p.x, W.y, 6); return; }          // 整鍋掉進岩漿裡了：冒一陣煙就沒了（不跳「鐵水澆下來」）
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

/* ---------- 第十六關：裝甲列車 ----------
   兩列火車並排狂奔：背景一直往後捲（只是畫面），城樓本身不動。
   連結器（S.objs 的 'coupler'）：掛在外側那節車廂和火車頭之間，打斷了，外側那節車廂（連車上的兵）一路往後退出戰場（trainRoll）。
   鍋爐（藍圖的 v）：打爆了蒸汽炸開（WPN.boiler，blockKill 那裡排進 S.pend）。
   中場：每回合換一樣路邊的東西（水塔、號誌橋、路塹的小山），每 4 回合鑽一次隧道（頂上一整片岩頂，只能平著打；中間沒東西擋、沒有風） */
const ROLL_ACC = 5, ROLL_MAX = 16;          // 甩下車的車廂往後退：每秒加速多少、最快多快
function mkCars(st, d) {
  const cols = st.cols, m = st.mirror, c0 = m ? cols - d.a1 : d.a0, c1 = m ? cols - d.a0 : d.a1, gc = m ? cols - 1 - d.gap : d.gap;
  const blocks = st.blocks.filter((b) => b.cx >= c0 && b.cx + b.cw <= c1);
  const x = st.x0 + (gc + 0.5) * CS, y = st.y0 + (d.row + 0.5) * CS, hm = d.hp * (st.hpMul || 1);
  const o = { t: 'coupler', side: st.side, st, x, y, x0: x, y0: y, r: 1.9, hp: hm, hm, flash: 0, by: 2, cut: false, blocks, dir: st.side === 0 ? -1 : 1, c0, c1 };
  st.car = o; S.objs.push(o);
  return o;
}
// 連結器被打到（鐵的：火、冰打不太動，雷、重砲、鏈彈打得動）
function couplerHurt(o, d, kind, side) {
  if (o.cut || side === o.side || side > 1) return;
  d *= DM[kind][M_IRON]; if (d <= 0) return;
  o.hp -= d; o.flash = 1;
  if (PH.dk > 0) PH.dacc += Math.min(d, o.hp + d);
  if (o.hp <= 0) couplerBreak(o, side);
}
// 連結器斷了：外側那節車廂（還在原位的磚、站在車上的兵）一路往外退出戰場
function couplerBreak(o, by) {
  if (o.cut) return; o.cut = true; o.hp = 0; o.by = by;
  const blocks = o.blocks.filter((b) => !b.dead && b.body && b.inPlace);
  let xa = 1e9, xb = -1e9, ya = 1e9, yb = -1e9;
  for (const b of blocks) { const p = b.body.getPosition(); xa = Math.min(xa, p.x - b.w / 2); xb = Math.max(xb, p.x + b.w / 2); ya = Math.min(ya, p.y - b.h / 2); yb = Math.max(yb, p.y + b.h / 2); }
  const units = blocks.length ? S.units.filter((u) => u.alive && u.body && u.x > xa - 0.3 && u.x < xb + 0.3 && u.y > ya - 0.5 && u.y < yb + 1) : [];
  for (const b of blocks) { b.roll = 1; b.body.setAwake(true); }
  for (const u of units) { u.carried = 1; u.body.setAwake(true); }
  (S.rolls || (S.rolls = [])).push({ o, dir: o.dir, t0: S.time, blocks, units });
  ev('decouple', o.x, o.y, o.side, by);
  S.chainT = S.time; if (by < 2 && by !== o.side && o.side !== S.turn && S.phase !== 'hazard' && S.state === 'play') S.chain += 4;
}
function trainStep(dt) {
  // 連結器跟著底盤（被炸得晃一下也跟著）
  for (const st of S.st) { const o = st && st.car; if (!o || o.cut) continue; const b = o.blocks.find((q) => !q.dead && q.body && q.cy === st.def.cars.row); if (b) { const p = b.body.getPosition(); o.x = o.x0 + (p.x - b.x0); o.y = o.y0 + (p.y - b.y0); } }
  if (!S.rolls) return;
  for (const R of S.rolls) {
    const v = R.dir * Math.min(ROLL_MAX, ROLL_ACC * (S.time - R.t0));
    let xa = 1e9, xb = -1e9;
    for (const b of R.blocks) { if (b.dead || !b.body) continue; const lv = b.body.getLinearVelocity(); b.body.setLinearVelocity({ x: v, y: lv.y }); b.body.setAngularVelocity(0); const p = b.body.getPosition(); xa = Math.min(xa, p.x - b.w / 2); xb = Math.max(xb, p.x + b.w / 2); }
    for (const u of R.units) {
      if (!u.alive || !u.body || !u.carried) continue;
      if (u.x < xa - 2 || u.x > xb + 2) { u.carried = 0; continue; }          // 被送回城上（開場護符）、自己摔下車了：不再跟著車廂走
      const lv = u.body.getLinearVelocity(); u.body.setLinearVelocity({ x: v, y: lv.y });
    }
  }
}
function rollBusy() { if (!S.rolls) return false; for (const R of S.rolls) for (const b of R.blocks) if (!b.dead) return true; return false; }

/* 中場路邊的東西：一個不會動、打不壞的實體（跟岩壁一樣），每回合結束時換下一樣（舊的往後退出去、新的從前面滑進來）。
   座標：x 從中線算、y 從地面算；hill 是多邊形，其他是長方形 [x, y, w, h] */
const PASS_SHAPES = {
  tower: { boxes: [[-2.2, 0, 4.4, 9.6], [-3.4, 9.6, 6.8, 6.2]], top: 16.9 },          // 水塔：磚砌的塔身、上面一個大木桶
  gantry: { boxes: [[-5.6, 0, 0.9, 15.4], [4.7, 0, 0.9, 15.4], [-6.4, 13.6, 12.8, 1.9]], top: 15.5 },          // 號誌橋：兩根鐵柱、上面一道橫樑（平射從底下穿不過：柱子擋著）
  hill: { poly: [[-10, 0], [-6.5, 3.6], [-2.6, 7.4], [2.6, 7.4], [6.5, 3.6], [10, 0]], top: 7.4 },          // 路塹：鐵路切開的小山
  tunnel: { boxes: [[-90, 22.6, 180, 12]], top: 22.6, roof: 22.6 }          // 隧道：頂上一整片岩頂（中間沒東西擋）
};
const PASS_SLIDE = 1.6, PASS_OFF = 74;          // 換景：舊的退出去、新的滑進來要多久、滑多遠
function passKind(round) { const P = S.lv.pass; return P ? P.seq[(Math.max(1, round) - 1) % P.seq.length] : null; }
function mkPassBody(kind) {
  const D = PASS_SHAPES[kind], body = PH.world.createBody({ type: 'static', position: { x: MID, y: 0 } }), tag = { isRock: true, side: 2, pass: kind };
  if (D.boxes) for (const [x, y, w, h] of D.boxes) body.createFixture({ shape: new PL.Box(w / 2, h / 2, { x: x + w / 2, y: y + h / 2 }, 0), friction: 0.8, restitution: 0, filterCategoryBits: CAT_TERR, userData: tag });
  if (D.poly) body.createFixture({ shape: new PL.Polygon(D.poly.map(([x, y]) => ({ x, y }))), friction: 0.8, restitution: 0, filterCategoryBits: CAT_TERR, userData: tag });
  return body;
}
function passInit() {
  const k = passKind(1);
  S.pass = { kind: k, body: mkPassBody(k), off: 0, outKind: null, outOff: 0, anim: null };
  passClear(k);
}
// 新的路邊東西出現的地方：擋在那裡的碎塊清掉、站在那裡的兵推到旁邊的地上
function passClear(kind) {
  const D = PASS_SHAPES[kind]; if (!D || kind === 'tunnel') return;
  const hw = D.boxes ? Math.max(...D.boxes.map(([x, y, w]) => Math.max(Math.abs(x), Math.abs(x + w)))) : Math.max(...D.poly.map(([x]) => Math.abs(x)));
  for (const b of S.blocks) { if (b.dead || !b.body || !b.frag) continue; const p = b.body.getPosition(); if (Math.abs(p.x - MID) < hw + 0.5 && p.y < D.top + 1) blockKill(b, 2, K_CRUSH, true); }
  for (const u of S.units) { if (!u.alive || !u.body || u.def.big) continue; if (Math.abs(u.x - MID) < hw + 0.6 && u.y < D.top + 0.5) { const nx = u.x < MID ? MID - hw - 1.2 : MID + hw + 1.2; u.body.setTransform({ x: nx, y: groundYRaw(nx) + u.bh / 2 + 0.05 }, 0); u.body.setLinearVelocity({ x: 0, y: 0 }); u.x = nx; } }
}
// 回合結束：下一回合是不是換一樣東西。回傳 true：要等它演完
// 滑進滑出只是畫面：舊的實體馬上拿掉、新的滑到定位才放上去（不然會從兩列火車中間穿過去，把車廂撞爛）
function passSwap() {
  const P = S.pass; if (!P) return false;
  const next = passKind(S.round + 1); if (next === P.kind) return false;
  if (P.body) { PH.world.destroyBody(P.body); P.body = null; }
  P.outKind = P.kind; P.outOff = 0; P.kind = next; P.off = PASS_OFF;
  P.anim = { t: 0 };
  ev('pass', MID, 0, next === 'tunnel' ? 1 : P.outKind === 'tunnel' ? 2 : 0, next);
  return true;
}
function passStep(dt) {
  const P = S.pass; if (!P || !P.anim) return;
  P.anim.t += dt; const u = Math.min(1, P.anim.t / PASS_SLIDE), e = u * u * (3 - 2 * u);
  P.off = PASS_OFF * (1 - e); P.outOff = -PASS_OFF * e;
  if (u >= 1) { P.anim = null; P.off = 0; P.outKind = null; passClear(P.kind); P.body = mkPassBody(P.kind); }
}
// 回合開始：隧道裡沒有風
function passRound() { const P = S.pass; if (P && P.kind === 'tunnel') S.wind = 0; }
function inTunnel() { return !!(S.pass && S.pass.kind === 'tunnel'); }
// 敵軍、自動玩家想打的要害（第十六關）：對面的連結器（炸在它附近就算）、鍋爐
function trainWeak(side) {
  const st = S.st[1 - side], out = [], o = st.car;
  if (o && !o.cut) out.push({ x: o.x, y: o.y + 0.6, w: 1.35, near: 3.4 });
  for (const b of st.blocks) if (b.boiler && !b.dead && b.body && b.inPlace) { const p = b.body.getPosition(); out.push({ x: p.x, y: p.y, w: 1.0, blk: b }); }
  return out;
}

/* ---------- 第十七關：地底礦坑 ----------
   整個戰場頂上一片岩頂（打不壞，跟岩壁一樣）：砲彈吊不高。城頂的懸石貼著它，靠木支柱頂著。
   岩壁裡的沼氣（藍圖的 z）：是一種火藥桶（M_KEG），被火、爆炸碰到就炸（WPN.gas，blockKill 排進 S.pend） */
function ceilInit(y) {
  const body = PH.world.createBody({ type: 'static', position: { x: 0, y: 0 } });
  body.createFixture({ shape: new PL.Box(120, 8, { x: MID, y: y + 8 }, 0), friction: 0.8, restitution: 0, filterCategoryBits: CAT_TERR, userData: { isRock: true, side: 2, ceil: 1 } });
  S.ceil = { y, body };
}
// 敵軍、自動玩家想打的要害（第十七關）：還頂著懸石的坑木、岩壁裡的沼氣
function mineWeak(side) {
  const st = S.st[1 - side], out = [], slabs = st.blocks.filter((b) => b.drop && !b.dead && b.inPlace);
  for (const b of st.blocks) {
    if (b.dead || !b.body || !b.inPlace) continue;
    const p = b.body.getPosition();
    if (b.gas) out.push({ x: p.x, y: p.y, w: 1.1, near: 3.6 });
    else if (b.mprop && slabs.some((o) => Math.abs(o.body.getPosition().x - p.x) < o.w / 2 + 0.5)) out.push({ x: p.x, y: p.y, w: 1.05, blk: b });
  }
  return out;
}
