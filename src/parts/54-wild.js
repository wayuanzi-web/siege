/* ===== 54-wild: 第四篇第二批（第 21、22 關）：種藤師、飛斧手、地道兵、震地鼓手；古藤、流沙 =====
   兵器（數字在 40-defs 的 WL、UNIT）：
     種藤師：藤種打進敵城的磚（S.objs 的 sprout），每回合結束長一次、勒一次，第三次把那一塊勒碎（旁邊的磚也吃一半）；被炸、被砍、著火就斷；種藤師倒了藤就枯
     飛斧手：迴旋斧打中一樣東西砍一下，飛回飛斧手手上（回程再碰到敵方的東西再砍一下）；砍木頭最痛，順便砍斷綁著那塊磚的古藤、勒著那塊磚的藤
     地道兵：鑽地彈落地鑽進地底（mole），往敵城城腳挖；自己下一輪開火時在城腳底下炸開；半路被炸到就塌，地道兵倒了也塌
     震地鼓手：鼓樁打進磚裡或地上（stake）；之後自己每一輪開火擂一次鼓，每根鼓樁震一圈
   戰場：
     第二十一關「古藤」（lv.vines）：城上的磚用古藤綁成一整片（S.welds 裡 w.vine 的那幾條），被炸斷、砍斷的古藤下一回合結束長回來；燒斷的不會再長
     第二十二關「流沙」（lv.sand）：兩座城泡在流沙坑裡（坑底一塊會往下沉的運動學平台），每回合結束往下陷；陷進沙裡的磚不算城防，陷在沙裡的兵不能開火
   跟戰局用同一套 S、SH；不碰畫面，Node 裡也能跑 */

/* ---------- 開局 ---------- */
// 流沙的地形：兩座城底下各挖一個坑（坑壁直上直下），藍圖幾欄就挖多寬（60-levels 寫 ground: pitGround('DUNE', 14)）
function pitGround(key, depth) {
  const cols = castleCols(CASTLES[key]), a0 = CASTLE_L - SAND_GAP, a1 = CASTLE_L + cols * CS + SAND_GAP, b0 = VIEW_W - a1, b1 = VIEW_W - a0;
  return [[-80, 0], [a0, 0], [a0 + 0.02, -depth], [a1 - 0.02, -depth], [a1, 0], [b0, 0], [b0 + 0.02, -depth], [b1 - 0.02, -depth], [b1, 0], [VIEW_W + 80, 0]];
}
const SAND_GAP = 0.25;          // 城牆跟坑壁之間留一點縫（陷下去的時候不會被坑壁卡住）
function wildWorld() {
  S.sand = null;
  const L = S.lv.sand; if (!L) return;
  const cols = castleCols(CASTLES[S.lv.castle]), w = cols * CS + SAND_GAP * 2 - 0.12, x0 = CASTLE_L - SAND_GAP + 0.06;
  S.sand = { y: 0, C: L, pits: [] };
  for (const side of [0, 1]) {
    const cx = side ? VIEW_W - (x0 + w / 2) : x0 + w / 2, body = PH.world.createBody({ type: 'kinematic', position: { x: cx, y: -1 }, awake: false });
    const P = { kind: 'sink', body, x0: cx, y0: -1, a0: 0, teth: [], dead: false, side, depth: 0, loose: 0, mv: null, px0: cx - w / 2, px1: cx + w / 2, tag: null };
    P.tag = { isRock: true, isPlat: true, isSink: true, side: 2, plat: P };
    body.createFixture({ shape: new PL.Box(w / 2, 1), friction: 0.9, restitution: 0, filterCategoryBits: CAT_TERR, userData: P.tag });
    S.sand.pits.push(P);
  }
}
function wildSetup() {
  if (S.sand) for (const P of S.sand.pits) { const st = S.st[P.side]; if (st && !st.beast) st.plat = P; }
  if (S.lv.vines) for (const s of [0, 1]) if (S.st[s] && !S.st[s].beast) mkVines(S.st[s]);
}

/* ---------- 打到東西（51-arms 的 armsHit 轉過來）：回傳 0 照原本的打法、1 處理完了、2 砲彈繼續飛（位置速度已經寫回去） ---------- */
// 是誰射的（穿過倍增符分出來的那幾發查不到：找同一邊還活著、拿同一種兵器的）
function wildOwner(i, w) {
  const id = SH.id[i], u = S.shotU.get(id); if (u) return u;
  const T = SH.side[i] < 2 ? S.team[SH.side[i]] : null; if (!T) return null;
  for (const q of T.units) if (q.alive && q.w === w) return q;
  return null;
}
function wildHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i]; if (side > 1) return 0;
  const u = wildOwner(i, w), mass = SH.mass[i], mul = S.team[side].dmg * S.rage * mass;
  if (u && u.side !== side) { S.shotU.delete(SH.id[i]); return 0; }          // 被銅鏡彈回去的（現在算鏡子那一邊的）：當普通的一下
  if (w.boom) return axeHit(i, w, hit, o, hx, hy, vx, vy, u, mul);
  S.shotU.delete(SH.id[i]);
  if (w.seed) {
    if (hit === 2 && o && o.isBlock && !o.dead && o.body && o.st && o.st.side === 1 - side && u) { blockHurt(o, w.dmg * mul, K_PIERCE, side, hx, hy); if (!o.dead && o.body) sproutSet(u, o, hx, hy, mul); return 1; }
    if (hit === 3) return 0;          // 打到兵：當普通的一下
    ev('seedfail', hx, hy, side); return 1;          // 落在地上、自己城上、碎塊上：長不起來
  }
  if (w.mole) return moleHit(i, w, hit, o, hx, hy, vx, vy, u, mass);
  if (w.stake) {
    if (hit === 3 || !u) return 0;
    if (hit === 2 && o && o.isBlock && !o.dead) blockHurt(o, w.dmg * mul, K_HEAVY, side, hx, hy);
    stakeSet(u, hit === 2 && o && o.isBlock && !o.dead && o.body ? o : null, hx, hy, mul);
    return 1;
  }
  return 0;
}

/* ---------- 古藤（第二十一關） ----------
   每一座城：上下、左右貼著的兩塊磚綁一條古藤（WeldJoint），貼著岩壁（樹幹）的也綁在岩壁上。
   古藤有自己的耐久：炸到藤結那一點附近就掉（火 ×3、迴旋斧直接砍斷）；綁著的磚打到快碎了也一起斷（同榫接）；兩頭的磚有一塊著火，藤就燒斷。
   斷了的古藤，下一回合結束、兩頭的磚還好好的、還貼在原來的位置，就長回來（燒斷的不長） */
const VINE_HP = 26;
function mkVines(st) {
  const L = st.blocks.filter((b) => !b.dead && !b.prop && b.cx !== undefined && b.mat !== M_KEG), box = (b) => [b.x0 - b.w / 2, b.x0 + b.w / 2, b.y0 - b.h / 2, b.y0 + b.h / 2];
  const hp = VINE_HP * (st.bhp / Math.max(0.5, S.lv.blockHp || 1));
  const add = (a, b, px, py) => {
    const j = PH.world.createJoint(new PL.WeldJoint({ frequencyHz: 0, dampingRatio: 0, collideConnected: false }, a.body, b ? b.body : st.rockBody, { x: px, y: py }));
    const qa = a.body.getLocalPoint({ x: px, y: py }), qb = b ? b.body.getLocalPoint({ x: px, y: py }) : { x: px, y: py };
    const w = { a, b, j, la: { x: qa.x, y: qa.y }, lb: { x: qb.x, y: qb.y }, ra: b ? b.body.getAngle() - a.body.getAngle() : -a.body.getAngle(), vine: 1, hp, hm: hp, side: st.side, cutR: -1, burnt: 0, flash: 0, grow: 0 };
    S.welds.push(w); (a.welds || (a.welds = [])).push(w); if (b) (b.welds || (b.welds = [])).push(w);
  };
  for (let i = 0; i < L.length; i++) {
    const A = box(L[i]);
    for (let k = i + 1; k < L.length; k++) {
      const B = box(L[k]), ox = Math.min(A[1], B[1]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[2], B[2]);
      if (ox > 0.25 && (Math.abs(A[3] - B[2]) < 0.2 || Math.abs(B[3] - A[2]) < 0.2)) add(L[i], L[k], (Math.max(A[0], B[0]) + Math.min(A[1], B[1])) / 2, Math.abs(A[3] - B[2]) < 0.2 ? A[3] : B[3]);
      else if (oy > 0.6 && (Math.abs(A[1] - B[0]) < 0.2 || Math.abs(B[1] - A[0]) < 0.2)) add(L[i], L[k], Math.abs(A[1] - B[0]) < 0.2 ? A[1] : B[1], (Math.max(A[2], B[2]) + Math.min(A[3], B[3])) / 2);
    }
    // 貼著樹幹（岩壁 A）的：左右、下面
    if (st.rockBody) {
      const b = L[i];
      for (const [dx, dy] of [[-1, 0], [b.cw, 0], [0, -1]]) {
        const cx = b.cx + dx, cy = b.cy + dy; if (cx < 0 || cy < 0 || cx >= st.cols || cy >= st.rows) continue;
        if (st.cellK[cy * st.cols + cx] !== 3) continue;
        add(b, null, dy < 0 ? b.x0 : (dx < 0 ? A[0] : A[1]), dy < 0 ? A[2] : b.y0);
      }
    }
  }
}
// 古藤的藤結現在在哪裡
function vinePt(w) { if (w.a.body) return w.a.body.getWorldPoint(w.la); if (w.b && w.b.body) return w.b.body.getWorldPoint(w.lb); return { x: w.a.x0, y: w.a.y0 }; }
function vineCut(w, by, burnt) {
  if (!w.j) return;
  const gone = w.a.dead || !w.a.body || (w.b && (w.b.dead || !w.b.body));          // 磚碎了：榫頭已經跟著那塊磚一起被物理引擎拆掉
  if (!gone) { if (PH.inStep) PH.killJ.push(w.j); else PH.world.destroyJoint(w.j); }
  w.j = null; w.hp = 0; w.cutR = S.round; if (burnt) w.burnt = 1;
  const p = vinePt(w); ev(burnt ? 'vineburn' : 'vinecut', p.x, p.y, w.side, by);
  for (const o of [w.a, w.b]) if (o && o.body) o.body.setAwake(true);
  S.chainT = S.time;
}
// 每一步：兩頭的磚有一塊著火，藤就燒斷
function vinesStep() {
  for (const w of S.welds) {
    if (!w.vine || !w.j) continue;
    if (w.a.burn > 0 || (w.b && w.b.burn > 0)) { vineCut(w, w.a.burnBy !== undefined ? w.a.burnBy : 2, true); continue; }
    // 被扯開了（兩頭的藤結離開超過一點點）：藤繃斷（不然被扯歪的磚一直在原地抖，回合等不到停）
    if (w.a.dead || !w.a.body || (w.b && (w.b.dead || !w.b.body))) continue;
    const pa = w.a.body.getWorldPoint(w.la), pb = w.b ? w.b.body.getWorldPoint(w.lb) : w.lb;
    if (Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) > 0.3) vineCut(w, 2);
  }
}
// 爆炸炸到藤結
function vinesBlast(x, y, r, dmg, side, fire) {
  if (r <= 0) return;
  for (const w of S.welds) {
    if (!w.vine || !w.j || w.side === side) continue;
    const p = vinePt(w), d = Math.hypot(p.x - x, p.y - y), R = r * 0.75 + 0.6; if (d > R) continue;
    w.hp -= dmg * (fire ? 3 : 1) * (1 - 0.6 * d / R); w.flash = 1;
    if (w.hp <= 0) vineCut(w, side, fire);
  }
}
// 迴旋斧砍到一塊磚：綁在它身上的古藤全斷
function vinesChop(b, side) { if (b.welds) for (const w of b.welds) if (w.vine && w.j && w.side !== side) vineCut(w, side); }
// 一點附近 R 以內的藤結全斷（迴旋斧掃過、鐵砣砸下去）
function vinesNear(x, y, R, side) { for (const w of S.welds) { if (!w.vine || !w.j || w.side === side) continue; const p = vinePt(w); if (Math.hypot(p.x - x, p.y - y) < R) vineCut(w, side); } }
// 回合結束：斷了的古藤長回來（燒斷的、斷在這一回合的不長；兩頭的磚要還在、沒歪、沒挪開）
function vinesRegrow() {
  let any = false;
  for (const w of S.welds) {
    if (!w.vine || w.j || w.burnt || w.cutR >= S.round) continue;
    const a = w.a, b = w.b;
    if (a.dead || !a.body || (b && (b.dead || !b.body))) continue;
    if (a.hp < a.hm * WELD_HP || (b && b.hp < b.hm * WELD_HP) || !a.inPlace || (b && !b.inPlace) || a.burn > 0 || (b && b.burn > 0)) continue;
    const pa = a.body.getWorldPoint(w.la), pb = b ? b.body.getWorldPoint(w.lb) : w.lb, ang = (b ? b.body.getAngle() : 0) - a.body.getAngle();
    if (Math.hypot(pa.x - pb.x, pa.y - pb.y) > 0.32 || Math.abs(ang - w.ra) > 0.12) continue;
    w.j = PH.world.createJoint(new PL.WeldJoint({ frequencyHz: 0, dampingRatio: 0, collideConnected: false }, a.body, b ? b.body : S.st[w.side].rockBody, { x: pa.x, y: pa.y }));
    if (b) { const q = b.body.getLocalPoint(pa); w.lb = { x: q.x, y: q.y }; } else w.lb = { x: pa.x, y: pa.y };          // 新長的藤結就在 a 那一點
    w.hp = w.hm; w.grow = 1; any = true;
    ev('vinegrow', pa.x, pa.y, w.side);
  }
  return any;
}
// 這一座城還綁著幾成古藤（畫面上的提示用）
function vinesLeft(side) { let n = 0, k = 0; for (const w of S.welds) if (w.vine && w.side === side) { n++; if (w.j) k++; } return n ? k / n : 0; }

/* ---------- 種藤師：藤種 ---------- */
function sproutSet(u, b, x, y, mul) {
  const W = WPN.seed.seed, q = b.body.getLocalPoint({ x, y });
  const o = { t: 'sprout', side: u.side, u, host: b, lp: { x: q.x, y: q.y }, x, y, lv: 0, hp: W.hp, hm: W.hp, mul, flash: 0, age: 0, a: rnd() * TAU };
  S.objs.push(o); ev('seedin', x, y, u.side);
}
function sproutStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4);
  if (o.hp <= 0) return true;
  if (!o.u.alive) { ev('sproutdie', o.x, o.y, o.side); return true; }          // 種藤師倒了：藤枯了
  if (o.host.dead || !o.host.body) { if (!sproutMove(o)) return true; }          // 種下去的那一塊被打掉了：藤爬到旁邊那一塊（同一輪的砲彈全落在同一點，種子那一塊常常馬上就碎）
  const b = o.host, q = b.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y;
  if (b.burn > 0) { ev('vineburn', o.x, o.y, 1 - o.side, 1 - o.side); return true; }          // 那一塊著火了：藤燒掉
  return false;
}
function sproutMove(o) {
  const st = o.host.st; let best = null, bd = CS * 1.3;
  if (st) for (const nb of st.blocks) { if (nb.dead || nb.frag || !nb.body || !nb.body.isDynamic()) continue; const d = blockDist(nb, o.x, o.y); if (d < bd) { bd = d; best = nb; } }
  if (!best) return false;
  blockDist(best, o.x, o.y); const q = best.body.getLocalPoint({ x: _cp.x, y: _cp.y }); o.host = best; o.lp = { x: q.x, y: q.y };
  return true;
}
function sproutHurt(o, d, side, fire) { if (o.hp <= 0 || side === o.side || side > 1) return; o.hp -= d * (fire ? 3 : 1); o.flash = 1; if (o.hp <= 0) ev('sproutcut', o.x, o.y, o.side, side); }
// 回合結束：每一株長一次、勒一次（第三次把那一塊勒碎）
function sproutsGrow() {
  const W = WPN.seed.seed; let any = false;
  for (const o of S.objs) {
    if (o.t !== 'sprout' || o.hp <= 0 || !o.u.alive || o.host.dead || !o.host.body) continue;
    o.lv++; any = true; o.flash = 1;
    const b = o.host, d = W.g[Math.min(o.lv, W.g.length) - 1] * o.mul;
    for (const nb of b.st ? b.st.blocks : []) { if (nb === b || nb.dead || nb.frag || !nb.body) continue; if (blockDist(nb, o.x, o.y) < CS * 0.75) blockHurt(nb, d * W.spread, K_CRUSH, o.side); }
    if (o.lv >= W.g.length) { ev('strangle', o.x, o.y, o.side); blockHurt(b, d + b.hm * 2, K_CRUSH, o.side); o.hp = 0; }          // 第三次：整塊勒碎
    else { blockHurt(b, d, K_CRUSH, o.side, o.x, o.y); ev('sproutgrow', o.x, o.y, o.side, o.lv); }
  }
  return any;
}

/* ---------- 飛斧手：迴旋斧 ----------
   SH.p：0 去程、1 回程。去程打中東西砍一下，掉頭飛回飛斧手（照拋物線算好 tau 秒落在他手上）；
   回程碰到自己這一邊的東西（自己的城、自己的兵）就是被接住了，碰到敵方的再砍一下（back 倍）就掉下來 */
function axeHit(i, w, hit, o, hx, hy, vx, vy, u, mul) {
  const side = SH.side[i], B = w.boom, back = SH.p[i] === 1;
  const mine = (hit === 2 && o && o.isBlock && o.st && o.st.side === side) || (hit === 3 && o && o.side === side);
  if (back && mine) { ev('axecatch', hx, hy, side); S.shotU.delete(SH.id[i]); return 1; }
  if (hit === 1 && !(o && (o.isHull || o.isArm || o.isBeast))) { ev('axestick', hx, hy, side); S.shotU.delete(SH.id[i]); return 1; }          // 砍進地裡、岩壁裡
  const k = back ? B.back : 1;
  if (hit === 2 && o && o.isBlock && !o.dead) {
    const wood = o.mat === M_WOOD || o.mat === M_BAMBOO || o.mat === M_ROOF;
    physExplode(hx, hy, w, side, SH.mass[i] * k * (wood ? B.wood : 1), SH.flag[i], o, vx, vy);
    if (!mine) { vinesChop(o, side); if (S.lv.vines) vinesNear(hx, hy, 1.9, side); for (const s of S.objs) if (s.t === 'sprout' && s.host === o && s.side !== side) sproutHurt(s, 999, side); }
    ev('axechop', hx, hy, side, wood ? 1 : 0);
  } else physExplode(hx, hy, w, side, SH.mass[i] * k, SH.flag[i], o, vx, vy);
  if (back || !u || !u.alive) { S.shotU.delete(SH.id[i]); return 1; }
  // 掉頭：照拋物線算 tau 秒後落在飛斧手手上
  const tx = u.x + (u.side === 0 ? 0.9 : -0.9), ty = u.y + 2.3, tau = B.tau, sp = Math.hypot(vx, vy) || 1;
  SH.x[i] = hx - vx / sp * 0.35; SH.y[i] = hy - vy / sp * 0.35; SH.vx[i] = (tx - SH.x[i]) / tau; SH.vy[i] = (ty - SH.y[i]) / tau + 0.5 * GRAV * tau;
  SH.p[i] = 1; SH.flag[i] = (SH.flag[i] | F_PORT) & ~F_IN; SH.age[i] = Math.min(SH.age[i], 9 - tau - 1);
  ev('axeback', hx, hy, side);
  return 2;
}

/* ---------- 地道兵：鑽地彈 ---------- */
// 落點 → 要挖到哪裡：落在敵城上的，直直往下鑽到城腳；落在地上的，往敵城朝著戰場那一面的城腳挖
function moleHit(i, w, hit, o, hx, hy, vx, vy, u, mass) {
  const side = SH.side[i], M = w.mole, st = S.st[1 - side];
  if (hit === 3 || !u || !st || st.beast) return 0;
  const onCastle = (hit === 2 && o && o.isBlock && o.st === st && o.inPlace && !o.frag && hx > st.x0 - 0.5 && hx < st.x1 + 0.5) || (!o && hit === 1 && inPit(1 - side, hx)), gy = sandTop(hx);          // 被轟出城的磚、碎塊不算
  let tx;
  if (onCastle) tx = clamp(hx, st.x0 + 1.2, st.x1 - 1.2);
  else if (hit === 1 && gy > -100 && Math.abs(hy - gy) < 1.5 && !(o && (o.isPlat || o.isHull || o.isSaw))) tx = side === 0 ? st.x0 + 1.6 : st.x1 - 1.6;
  else return 0;          // 打在別的東西上：當普通的一下
  physExplode(hx, hy, w, side, mass, SH.flag[i] & ~F_FIRE, onCastle ? o : null, vx, vy);
  if (!onCastle) {
    if (Math.abs(tx - hx) > M.len) { ev('molefar', hx, hy, side); return 1; }
    for (let x = hx; Math.abs(x - tx) > 0.5; x += Math.sign(tx - hx) * 0.8) {          // 中間沒有地（深谷）、有石壁：挖不過去
      if (groundY(x) < -100 || (S.wallX && x > S.wallX[0] && x < S.wallX[1])) { ev('molefail', hx, hy, side); return 1; }
    }
  }
  const y0 = onCastle ? hy : gy - 1.4;
  S.objs.push({ t: 'mole', side, u, x: hx, y: y0, sx: hx, tx, st: onCastle ? 'down' : 'dig', mass, go: 0, age: 0, trail: 0 });
  ev('molein', hx, hy, side);
  return 1;
}
// 城腳在哪裡（跟著船、流沙的平台走）
function moleBase(st) { const p = platWorld(st, st.x0, st.y0); return p.y; }
function moleStep(o, dt) {
  o.age += dt;
  if (!o.u.alive) { ev('molecave', o.x, o.y, o.side); return true; }          // 地道兵倒了：地道塌了
  const st = S.st[1 - o.side], M = WPN.mole.mole;
  if (o.st === 'dig') {
    const d = o.tx - o.x, v = M.v * dt;
    if (Math.abs(d) <= v) { o.x = o.tx; o.st = 'wait'; ev('molearrive', o.x, o.y, o.side); } else o.x += Math.sign(d) * v;
    const gy = sandTop(o.x); if (gy > -100) o.y = gy - 1.4;
  } else if (o.st === 'down') {
    const by = moleBase(st) + 1.2; o.y = Math.max(by, o.y - 10 * dt); if (o.y <= by + 0.01) { o.st = 'wait'; ev('molearrive', o.x, o.y, o.side); }
  } else if (o.st === 'wait') o.y = Math.max(moleBase(st) + 1.2, S.sand ? S.sand.y + 0.5 : -1e9);
  if (o.go && S.time >= o.go) {
    const y = Math.max(moleBase(st) + 1.4, S.sand ? S.sand.y + 0.7 : -1e9);
    physExplode(o.x, y, WPN.moleboom, o.side, o.mass, 0, null, 0, 1);
    if (S.sand && inPit(1 - o.side, o.x)) sandLoosen(1 - o.side, M.sink);
    ev('moleboom', o.x, y, o.side);
    return true;
  }
  return false;
}
// 自己這一邊開火：挖到了的一個一個炸（還在挖的等下一輪）
function molesGo(side) { let k = 0; for (const o of S.objs) if (o.t === 'mole' && o.side === side && o.st === 'wait' && !o.go && !o.u.sunk) o.go = S.time + 0.45 + 0.3 * k++; }
// 爆炸炸到半路的地道（還沒挖到城底下的才炸得塌）
function molesBlast(x, y, r, side) {
  for (const o of S.objs) {
    if (o.t !== 'mole' || o.side === side || o.go || (o.st !== 'dig' && o.st !== 'wait')) continue;
    const st = S.st[1 - o.side]; if (o.x > st.x0 - 0.5 && o.x < st.x1 + 0.5) continue;          // 已經在城底下了：炸不到
    if (Math.hypot(o.x - x, o.y - y) < r * 0.6 + 1.6) { o.dead = 1; ev('molecave', o.x, o.y, o.side, side); }
  }
}

/* ---------- 震地鼓手：鼓樁 ---------- */
function stakeSet(u, b, x, y, mul) {
  const W = WPN.stake.stake; let mine = [];
  for (const o of S.objs) if (o.t === 'stake' && o.u === u && o.hp > 0) mine.push(o);
  while (mine.length >= W.max) { const old = mine.shift(); old.hp = 0; ev('stakegone', old.x, old.y, old.side); }          // 一個鼓手最多兩根：最舊的拔掉
  const o = { t: 'stake', side: u.side, u, host: b, lp: null, x, y, hp: W.hp, hm: W.hp, mul, beat: 0, n: 0, flash: 0, age: 0, r: 0.9 };
  if (b) { const q = b.body.getLocalPoint({ x, y }); o.lp = { x: q.x, y: q.y }; }
  S.objs.push(o); ev('stakein', x, y, u.side);
}
function stakeStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4);
  if (o.hp <= 0 || !o.u.alive) return true;
  if (o.host && (o.host.dead || !o.host.body)) {          // 打進去的那一塊碎了：插到旁邊那一塊，旁邊沒有就掉到地上（還插著）
    if (!sproutMove(o)) { const gy = sandTop(o.x); if (gy < -100) { ev('stakegone', o.x, o.y, o.side); return true; } o.host = null; o.y = gy; }
  }
  if (o.host) { const q = o.host.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y; }
  if (o.beat && S.time >= o.beat) { o.beat = 0; o.n++; quake(o); }
  return false;
}
function stakeHurt(o, d, side) { if (o.hp <= 0 || side === o.side || side > 1) return; o.hp -= d; o.flash = 1; if (o.hp <= 0) ev('stakegone', o.x, o.y, o.side, side); }
// 自己這一邊開火：鼓手擂鼓，每根鼓樁一根一根震
function drumsGo(side) {
  let k = 0;
  for (const o of S.objs) if (o.t === 'stake' && o.side === side && o.hp > 0 && o.u.alive && !o.beat && o.u.frozen <= 0 && o.u.stun <= 0 && !o.u.sunk) { o.beat = S.time + 0.3 + 0.38 * k++; o.u.recoil = 1; ev('drum', o.u.x, o.u.y + 2.4, side); }
}
function quake(o) {
  const W = WPN.stake.stake, side = o.side, R = W.R, list = physQuery(o.x, o.y, R + 1);
  for (const b of list) {
    if (b.isBlock) {
      if (b.dead || !b.body || b.side === side) continue;
      const d = blockDist(b, o.x, o.y); if (d > R) continue;
      const f = 1 - d / R;
      blockHurt(b, W.d * o.mul * (0.45 + 0.55 * f), K_CRUSH, side);
      if (!b.dead && b.body && b.body.isDynamic()) { const j = Math.min(b.mass * 0.9, 60) * f; b.body.applyLinearImpulse({ x: (rnd() - 0.5) * j, y: j * 0.6 }, b.body.getWorldCenter(), true); }          // 震一下（不能震得整座城跳起來）
    } else if (b.alive && b.side !== side) {
      const d = Math.hypot(b.x - o.x, b.y - o.y); if (d > R) continue;
      hurtUnit(b, W.ud * o.mul * (1 - 0.5 * d / R), side, K_CRUSH);
    }
  }
  if (S.sand) { const P = S.sand.pits[1 - side]; if (o.x > P.px0 - R * 0.6 && o.x < P.px1 + R * 0.6) sandLoosen(1 - side, W.sink); }
  ev('drumquake', o.x, o.y, R, side);
}

/* ---------- 第二十二關：流沙 ----------
   lv.sand：{ base 每回合本來就陷多少, step 一回合最多陷多少, max 最深陷到多深 }。地道炸、鼓樁震把那座城底下的沙「挖鬆」（loose），回合結束一起陷 */
function sandLoosen(side, a) { if (!S.sand) return; S.sand.pits[side].loose += a; }
function sandRoundEnd() {
  if (!S.sand) return false;
  const C = S.sand.C; let any = false;
  for (const P of S.sand.pits) {
    const st = S.st[P.side], amt = Math.min(C.step, C.base + P.loose, C.max - P.depth); P.loose = 0;
    if (!st || amt < 0.05) continue;
    const y = P.body.getPosition().y; P.depth += amt;
    P.mv = { from: y, to: y - amt, t0: S.time, dur: 1.0 + amt * 0.6 };
    P.body.setAwake(true); P.body.setLinearVelocity({ x: 0, y: -amt / P.mv.dur });
    for (const b of st.blocks) if (!b.dead && b.body) b.body.setAwake(true);
    for (const u of st.units) if (u.alive && u.body) u.body.setAwake(true);
    ev('sandsink', st.cx, S.sand.y, P.side, amt, P.depth);
    any = true;
  }
  return any;
}
function sandStep() {
  if (!S.sand) return;
  for (const P of S.sand.pits) {
    if (!P.mv) continue;
    if (S.time - P.mv.t0 >= P.mv.dur) { P.body.setLinearVelocity({ x: 0, y: 0 }); P.body.setTransform({ x: P.x0, y: P.mv.to }, 0); P.body.setAwake(false); P.mv = null; S.chainT = S.time; }
    else S.chainT = S.time;
  }
  // 陷在沙裡的兵（腳下比沙面低超過一公尺多）：不能開火，砲彈也打不到（沙面擋住）
  for (const u of S.units) if (u.alive) { const was = u.sunk; u.sunk = u.y + 1.3 < S.sand.y; if (u.sunk && !was) ev('unitsunk', u.x, S.sand.y, u.side); }
}
// 砲彈這一步有沒有落在流沙上（坑的範圍、沙面以下）：回傳 0–1 的比例，沒有就 -1
function sandCross(x, y, nx, ny) {
  const sy = S.sand.y; if (!(y >= sy && ny < sy)) return -1;
  const t = (y - sy) / (y - ny), hx = x + (nx - x) * t;
  for (const P of S.sand.pits) if (hx > P.px0 - SAND_GAP && hx < P.px1 + SAND_GAP) return t;
  return -1;
}
// 地面（流沙坑上是沙面）
function sandTop(x) { if (S.sand) for (const P of S.sand.pits) if (x > P.px0 - SAND_GAP && x < P.px1 + SAND_GAP) return S.sand.y; return groundY(x); }
function inPit(side, x) { if (!S.sand) return false; const P = S.sand.pits[side]; return x > P.px0 - SAND_GAP && x < P.px1 + SAND_GAP; }
function sandBusy() { if (!S.sand) return false; for (const P of S.sand.pits) if (P.mv) return true; return false; }
// 這一座城陷了多深
function sandDepth(side) { return S.sand ? S.sand.pits[side].depth : 0; }

/* ---------- 每一步、每回合（54-craft 的 craftStep、craftRoundEnd 轉過來） ---------- */
function wildStep(dt) {
  if (S.lv.vines) vinesStep();
  sandStep();
}
function wildRoundEnd() {
  let wait = false;
  if (sproutsGrow()) wait = true;
  if (S.lv.vines && vinesRegrow()) wait = true;
  if (sandRoundEnd()) wait = true;
  return wait;
}
function wildBusy() {
  if (sandBusy()) return true;
  for (const o of S.objs) if ((o.t === 'mole' && (o.go || o.st === 'down')) || (o.t === 'stake' && o.beat)) return true;
  return false;
}
// 爆炸（45-phys 的 physExplode 最後）：古藤、藤、地道、鼓樁
function wildBlast(x, y, r, dmg, side, fire) {
  if (S.lv.vines) vinesBlast(x, y, r, dmg, side, fire);
  for (const o of S.objs) {
    if (o.t === 'sprout') { if (o.side !== side && o.hp > 0) { const d = Math.hypot(o.x - x, o.y - y); if (d < r + 0.9) sproutHurt(o, dmg * 0.7 * Math.min(1, 1.2 - d / (r + 0.9)), side, fire); } }
    else if (o.t === 'stake') { if (o.side !== side && o.hp > 0) { const d = Math.hypot(o.x - x, o.y - y); if (d < r + o.r) stakeHurt(o, dmg * 0.7 * Math.min(1, 1.2 - d / (r + o.r)), side); } }
  }
  molesBlast(x, y, r, side);
}
