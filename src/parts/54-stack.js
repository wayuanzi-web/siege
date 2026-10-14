/* ===== 54-stack: 第五篇第一批（第 25 關「疊城對決」）：每回合先疊一塊磚組再開砲；壓頂術士、固樑匠 =====
   lv.stack：{ start 開場城上幾個兵, line 狼煙線（城基底往上幾格）, cap 最多疊到幾格高, time 玩家擺放的時間上限（秒）, mats [[磚材, 機率], …] }
   築城（S.phase 'build'）：輪到哪一邊，那一邊城頂上方先出現一塊磚組（七種四格的形狀，木、石、鐵三種），
     左右拖、點一下轉向，按「放下」：從快碰到城頂的高度輕輕放下（不會砸壞底下的城），四格之間用榫頭接著（被打到剩三成五耐久才斷）。
     停穩以後算進城樓完整度（原位就是停下來的位置和角度）；城上還不到六個兵，就有一個新兵站上這一塊（越高兵越多，也越容易被打歪）。
   狼煙線：城頂第一次疊過這條線（而且停穩了），那一邊的連珠立刻集滿。
   壓頂術士：壓頂石落在敵城的範圍裡，就在那一欄最高的地方變出一塊歪斜的大石板，重量壓在城頂上，逼它失衡。
   固樑匠：每一輪開火時，把自己城最上面幾塊磚用鉚釘接起來（跟磚組一樣：打到剩三成五耐久才斷）。
   跟戰局用同一套 S；不碰畫面，Node 裡也能跑 */

const PIECES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1]], J: [[0, 0], [1, 0], [2, 0], [0, 1]], S: [[0, 0], [1, 0], [1, 1], [2, 1]], Z: [[1, 0], [2, 0], [0, 1], [1, 1]]
};
const PIECE_KEYS = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];
const PIECE_NAME = { I: '長條', O: '方塊', T: '丁字', L: '拐角', J: '拐角', S: '斜階', Z: '斜階' };
const _pcs = {};
// 磚組轉 rot 次 90 度以後的格子（左下角對齊 0,0）：{ c: [[cx, cy]…], w 幾欄, h 幾列, bot: 每一欄最底下那一格是第幾列 }
function pieceShape(k, rot) {
  const key = k + rot; let P = _pcs[key]; if (P) return P;
  let c = PIECES[k].map((q) => q.slice());
  for (let r = 0; r < rot; r++) c = c.map((q) => [q[1], -q[0]]);
  let x0 = 1e9, y0 = 1e9; for (const q of c) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); }
  c = c.map((q) => [q[0] - x0, q[1] - y0]);
  let w = 0, h = 0; for (const q of c) { w = Math.max(w, q[0] + 1); h = Math.max(h, q[1] + 1); }
  const bot = new Array(w).fill(99); for (const q of c) bot[q[0]] = Math.min(bot[q[0]], q[1]);
  P = _pcs[key] = { c, w, h, bot }; return P;
}

/* ---------- 開局 ---------- */
function stackSetup() {
  S.stack = null; S.build = null;
  const C = S.lv.stack; if (!C) return;
  S.stack = { C, beacon: [false, false], built: [0, 0] };
  // 開場只有前幾個兵在城上，其他的在城下待命（疊上新的一塊才上來）
  for (const s of [0, 1]) {
    const T = S.team[s]; let k = 0;
    for (const u of T.units) {
      if (k++ < (C.start || 2)) continue;
      u.reserve = 1; u.alive = false; T.alive--;
      if (u.body) { PH.world.destroyBody(u.body); u.body = null; }
    }
  }
}
function stackRes(T) { for (const u of T.units) if (u.reserve) return u; return null; }

/* ---------- 量城頂：(x) 這一直線往下，最先碰到的東西有多高（磚、地面；看不到東西回傳 -999） ---------- */
let _sy0 = -999;
function _syF(f, p, n, fr) { if (f.isSensor() || (f.getFilterCategoryBits() & CAT_UNIT)) return -1; _sy0 = p.y; return fr; }          // 兵不算（擺在兵頭上的磚組，兵會爬上去）
function stackSurf(x, yTop) { _sy0 = -999; PH.world.rayCast({ x, y: yTop }, { x, y: -30 }, _syF); return _sy0; }
// 這座城現在疊到多高（還站著的磚的頂）
function stackTop(st) {
  let top = st.y0;
  for (const b of st.blocks) { if (b.dead || !b.body || !b.inPlace || b.lost || !(b.wt > 0)) continue; const p = b.body.getPosition(), t = p.y + b.h / 2; if (t > top) top = t; }
  return top;
}
/* 磚組放在左緣 bx（世界座標）會落在哪：每一欄量兩條線（格子左右兩邊靠內一點），磚組那一欄的底要擱在最高的那一點上。
   by：磚組的底（左下角那一格的底邊）；gaps：底下空出來幾格（擱不平）；off：有幾欄擱在城基外面（伸出去、或落到城外的地上） */
const _land = { by: 0, gaps: 0, off: 0, top: 0 };
function stackLand(side, P, bx) {
  const st = S.st[side], yTop = Math.max(stackTop(st), st.y1) + CS * 6, surf = [];
  let by = -1e9, off = 0;
  for (let cx = 0; cx < P.w; cx++) {
    const x = bx + (cx + 0.5) * CS, a = stackSurf(x - CS * 0.36, yTop), b = stackSurf(x + CS * 0.36, yTop), s = Math.max(a, b);
    surf.push(s);
    if (s < st.y0 + st.base * CS - 0.5) off++;          // 落到城基的頂面以下（城外的地上）：這一欄不算擱在城上
    by = Math.max(by, s - P.bot[cx] * CS);
  }
  let gaps = 0; for (let cx = 0; cx < P.w; cx++) gaps += Math.max(0, (by + P.bot[cx] * CS - surf[cx]) / CS);
  _land.by = by; _land.gaps = gaps; _land.off = off; _land.top = by + P.h * CS;
  return _land;
}
// 磚組可以擺的左右範圍（左緣）
function stackRange(st, P) { return [st.x0 - CS * 1.5, st.x1 + CS * 1.5 - P.w * CS]; }

/* ---------- 築城 ---------- */
// 輪到 side：疊得下就出一塊磚組（回傳 true＝這一回合先築城）
function stackBegin(side) {
  const SK = S.stack; if (!SK) return false;
  const st = S.st[side], C = SK.C, T = S.team[side];
  if (stackTop(st) >= st.y0 + C.cap * CS || T.alive <= 0 || S.flags[side]) return false;          // 疊到頂了、扛著帥旗死守：不再築城
  let p = rnd(), mat = C.mats[C.mats.length - 1][0]; for (const m of C.mats) { if (p < m[1]) { mat = m[0]; break; } p -= m[1]; }
  const k = PIECE_KEYS[ri(PIECE_KEYS.length)], P = pieceShape(k, 0), R = stackRange(st, P);
  S.build = { side, k, mat, rot: 0, x: clamp(st.cx - P.w * CS / 2, R[0], R[1]), st: 'move', t: 0, q: 0, blocks: null, plan: null };
  S.phase = 'build'; S.phaseT = 0;
  if (T.ai) S.build.plan = stackPlan(side);
  ev('buildgo', st.cx, stackTop(st) + CS * 3, side, k);
  return true;
}
// 玩家（或自動玩家）擺磚組：move 左右挪 v、set 擺到 v、rot 轉 90 度、drop 放下
function simBuild(side, op, v) {
  const B = S.build; if (!B || B.side !== side || B.st !== 'move' || S.state !== 'play') return false;
  const st = S.st[side];
  if (op === 'rot') {
    const P0 = pieceShape(B.k, B.rot), c = B.x + P0.w * CS / 2; B.rot = (B.rot + 1) % 4;
    const P = pieceShape(B.k, B.rot), R = stackRange(st, P); B.x = clamp(c - P.w * CS / 2, R[0], R[1]); ev('buildrot', c, 0, side);
    return true;
  }
  if (op === 'move' || op === 'set') { const P = pieceShape(B.k, B.rot), R = stackRange(st, P); B.x = clamp(op === 'move' ? B.x + v : v, R[0], R[1]); return true; }
  if (op === 'drop') { stackDrop(); return true; }
  return false;
}
function stackDrop() {
  const B = S.build, side = B.side, st = S.st[side], P = pieceShape(B.k, B.rot), L = stackLand(side, P, B.x), by = L.by + 0.22;
  // 擺在自己的兵頭上：兵先爬到磚組上面（這一欄磚組的頂），跟著一起輕輕落下
  for (const u of S.team[side].units) {
    if (!u.alive || !u.body || u.x < B.x - 0.6 || u.x > B.x + P.w * CS + 0.6) continue;
    const cx = clamp(Math.floor((u.x - B.x) / CS), 0, P.w - 1); let ct = -1; for (const q of P.c) if (q[0] === cx) ct = Math.max(ct, q[1]);
    const top = by + (ct + 1) * CS; if (u.y > top - 0.1 || u.y + u.bh < by) continue;
    u.body.setTransform({ x: u.x, y: top + 0.08 + u.bh / 2 }, 0); u.body.setLinearVelocity({ x: 0, y: 0 }); u.body.setAwake(true); u.y = top + 0.08; ev('climb', u.x, top, side);
  }
  const bs = [];
  for (const q of P.c) {
    const b = mkBlock(st, { mat: B.mat, kind: 'box', x: B.x + (q[0] + 0.5) * CS, y: by + (q[1] + 0.5) * CS, w: CS, h: CS, awake: true });
    b.wt = 0; b.inPlace = false; b.lost = true; b.piece = 1; b.pq = q; bs.push(b);
  }
  // 四格之間接上榫頭（一整塊）
  for (let i = 0; i < bs.length; i++) for (let k = i + 1; k < bs.length; k++) {
    const a = bs[i].pq, c = bs[k].pq; if (Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) !== 1) continue;
    weldPair(bs[i], bs[k], B.x + ((a[0] + c[0]) / 2 + 0.5) * CS, by + ((a[1] + c[1]) / 2 + 0.5) * CS);
  }
  B.blocks = bs; B.st = 'fall'; B.t = 0; B.q = 0;
  ev('builddrop', B.x + P.w * CS / 2, by, side, B.mat);
}
// 兩塊磚用榫頭接起來（跟 48-mech 的 mkWelds 一樣：哪一塊被打到剩不到三成五耐久，榫頭才斷）
function weldPair(a, b, px, py) {
  const j = PH.world.createJoint(new PL.WeldJoint({ frequencyHz: 0, dampingRatio: 0, collideConnected: false }, a.body, b.body, { x: px, y: py }));
  const q = a.body.getLocalPoint({ x: px, y: py }), w = { a, b, j, la: { x: q.x, y: q.y } };
  S.welds.push(w); (a.welds || (a.welds = [])).push(w); (b.welds || (b.welds = [])).push(w);
  return w;
}
function welded(a, b) { if (!a.welds) return false; for (const w of a.welds) if (w.j && (w.a === b || w.b === b)) return true; return false; }
// 每一步（S.phase 'build'）
function stackStep(dt) {
  const B = S.build; if (!B) { startAim(S.turn); return; }
  const T = S.team[B.side], C = S.stack.C; B.t += dt;
  if (B.st === 'move') {
    const pl = B.plan;
    if (pl) {          // 自動玩家：先轉好，再慢慢挪過去，到了就放
      if (B.t > 0.35 && B.rot !== pl.rot) simBuild(B.side, 'rot');
      else if (B.t > 0.5) { const d = pl.x - B.x; if (Math.abs(d) > 0.05) simBuild(B.side, 'move', clamp(d, -dt * 22, dt * 22)); else if (B.t > pl.at) stackDrop(); }
      if (B.t > pl.at + 3) stackDrop();
    } else if (B.t > (T.mute ? 0.2 : C.time)) stackDrop();          // 時間到：照現在的位置放下
    return;
  }
  // 落下去：四塊都停下來（或最多等三秒半）就算停穩
  let quiet = true;
  for (const b of B.blocks) { if (b.dead || !b.body) continue; const v = b.body.getLinearVelocity(); if (v.x * v.x + v.y * v.y > 0.12 || Math.abs(b.body.getAngularVelocity()) > 0.12) quiet = false; }
  B.q = quiet ? B.q + dt : 0;
  if (B.q > 0.3 || B.t > 3.5) stackSettle();
}
// 磚組停穩了：算進城樓、上一個新兵、看有沒有疊過狼煙線
function stackSettle() {
  const B = S.build, side = B.side, st = S.st[side], T = S.team[side], SK = S.stack;
  let topB = null, n = 0;
  for (const b of B.blocks) {
    if (b.dead || !b.body) continue;
    const p = b.body.getPosition();
    if (p.x < st.x0 - CS * 2 || p.x > st.x1 + CS * 2 || p.y < st.y0 + st.base * CS - CS * 0.2) continue;          // 掉到城外、城基底下：不算
    b.x0 = p.x; b.y0 = p.y; b.ra = b.body.getAngle(); b.inPlace = true; b.lost = false; b.snug = true; b.wt = 1; st.hp0 += 1; n++;
    if (p.x > st.x0 + 0.8 && p.x < st.x1 - 0.8 && (!topB || p.y > topB.body.getPosition().y)) topB = b;          // 新兵站的那一格要在城的範圍裡（伸出去的那一截站上去就算被轟出城了）
  }
  if (n) { SK.built[side]++; castleScan(st); supInit(st); }
  // 新兵：站上這一塊最高的那一格
  const u = topB ? stackRes(T) : null;
  if (u) {
    const p = topB.body.getPosition(), x = p.x, y = p.y + CS / 2 + 0.05;
    u.reserve = 0; u.alive = true; u.hp = u.hpMax; u.frozen = 0; u.stun = 0; u.dieT = 0; u.x = u.hx = u.hx0 = x; u.y = u.hy = u.hy0 = y; u.homeB = null; u.fr = null;
    mkUnitBody(u); T.alive++; ev('recruit', x, y, side, u.slot);
  }
  if (!SK.beacon[side] && stackTop(st) >= st.y0 + SK.C.line * CS) { SK.beacon[side] = true; T.ult.c = T.ult.need; ev('beacon', st.cx, stackTop(st), side); }
  ev('buildset', st.cx, stackTop(st), side, n);
  S.build = null; startAim(side);
}
// 築城完了（或不用築城）：開始瞄準
function startAim(side) {
  S.phase = 'aim'; S.phaseT = 0; S.quietT = 0;
  const T = S.team[side]; if (T.ai) aiBegin(T);
}

/* ---------- 自動玩家（敵軍、測試用的自動玩家）怎麼擺 ----------
   每一種轉法、每半格一個位置都量一次：擱不平（底下空著）、伸出城基外面、擱太高、離城中間太遠、壓到自己的兵都扣分；
   還沒疊過狼煙線、這一塊疊得上去的加分。手越不穩，挑得越隨便 */
function stackPlan(side) {
  const B = S.build, st = S.st[side], T = S.team[side], A = T.ai, SK = S.stack, top0 = stackTop(st), line = st.y0 + SK.C.line * CS;
  let best = null, bs = -1e9;
  const rots = B.k === 'O' ? 1 : B.k === 'I' || B.k === 'S' || B.k === 'Z' ? 2 : 4;
  for (let rot = 0; rot < rots; rot++) {
    const P = pieceShape(B.k, rot), R = stackRange(st, P);
    for (let bx = R[0]; bx <= R[1] + 1e-6; bx += CS / 2) {
      const L = stackLand(side, P, bx);
      let sc = -L.gaps * 3 - L.off * 9 - (L.by - st.y0) / CS * 0.35 - Math.abs(bx + P.w * CS / 2 - st.cx) / CS * 0.35;
      if (!SK.beacon[side] && L.top >= line) sc += 2.5;
      if (L.top > top0 + 0.1) sc += 0.6;
      for (const u of T.units) if (u.alive && u.x > bx - 0.4 && u.x < bx + P.w * CS + 0.4 && L.by < u.y + 4.2) sc -= 1.2;          // 擺在自己的兵頭上（兵會爬上去，但站得更高、更露在外面）
      sc += gauss() * (A ? A.err : 5) * 0.12;
      if (sc > bs) { bs = sc; best = { rot, x: bx, at: 0.9 + (A ? A.think : 1) * 0.6 }; }
    }
  }
  return best;
}

/* ---------- 壓頂術士：壓頂石（51-arms 的 armsHit 轉過來） ---------- */
function stackHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i]; if (side > 1) return 0;
  physExplode(hx, hy, w, side, SH.mass[i], SH.flag[i], o, vx, vy);
  const est = S.st[1 - side];
  if (est && !est.loose && hx > est.x0 - CS && hx < est.x1 + CS) pressDrop(side, est, hx);
  return 1;
}
function pressDrop(side, st, hx) {
  const W = WPN.press.press, top = stackSurf(hx, Math.max(stackTop(st), st.y1) + CS * 8);
  if (top < st.y0 - 1) return;
  const a = (rnd() < 0.5 ? -1 : 1) * (0.12 + rnd() * 0.16), b = mkBlock(S.rubble, { mat: M_ROCK, kind: 'box', x: hx, y: top + W.h * CS / 2 + 0.45, w: W.w * CS, h: W.h * CS, den: W.den, a, awake: true });
  b.wt = 0; b.press = 1; b.hp = b.hm = W.hp * (side === 1 ? S.team[1].hpMul : 1); b.hitBy = side;
  ev('pressin', hx, top + 1, side);
}

/* ---------- 固樑匠：鉚釘（50-sim 的 simFire 開火時叫） ---------- */
function rivetsGo(side) {
  const T = S.team[side]; let n = 0;
  for (const u of T.units) if (u.alive && u.type === 'rivet' && !(u.frozen > 0) && !(u.stun > 0)) n++;
  if (!n) return;
  const st = S.st[side], L = [];
  for (const b of st.blocks) if (!b.dead && b.body && b.inPlace && !b.lost && b.wt > 0 && !b.prop && b.mat !== M_KEG && b.kind === 'box') L.push(b);
  L.sort((a, b) => b.body.getPosition().y - a.body.getPosition().y);
  const top = L.slice(0, 8 + 4 * n), box = (b) => { const p = b.body.getPosition(), hw = b.w / 2, hh = b.h / 2; return [p.x - hw, p.x + hw, p.y - hh, p.y + hh]; };
  let made = 0;
  for (let i = 0; i < top.length && made < 3 * n; i++) {
    const A = box(top[i]);
    for (let k = i + 1; k < top.length && made < 3 * n; k++) {
      const a = top[i], b = top[k]; if (welded(a, b)) continue;
      const Bx = box(b), ox = Math.min(A[1], Bx[1]) - Math.max(A[0], Bx[0]), oy = Math.min(A[3], Bx[3]) - Math.max(A[2], Bx[2]);
      let px = 0, py = 0;
      if (ox > 0.5 && Math.abs(oy) < 0.3) { px = (Math.max(A[0], Bx[0]) + Math.min(A[1], Bx[1])) / 2; py = (Math.max(A[2], Bx[2]) + Math.min(A[3], Bx[3])) / 2; }          // 上下疊著
      else if (oy > 0.5 && Math.abs(ox) < 0.3) { px = (Math.max(A[0], Bx[0]) + Math.min(A[1], Bx[1])) / 2; py = (Math.max(A[2], Bx[2]) + Math.min(A[3], Bx[3])) / 2; }          // 左右並排
      else continue;
      weldPair(a, b, px, py).rv = 1; made++; ev('rivet', px, py, side);
    }
  }
}

/* ---------- 每回合、忙不忙 ---------- */
function stackBusy() { return false; }
