/* ===== 54-flux: 第五篇第一批（第 26 關「煉金沸城」）：會流的液體、液體之間的反應；水甕兵、油壺兵、煉金師 =====
   液體放在一張格子上（每格 FL.c 公尺見方，比磚小一半）：水、油、岩漿三種，一格只裝一種、最多裝滿 1。
   每 1/20 秒流一次：先往下掉一格（下面是空的、或裝同一種還沒滿），再跟左右兩格分一分（油慢一點、岩漿更慢）；
   磚、地面擋得住（每一次都照磚現在的位置重新量；裂開一半以上的磚、碎塊擋不住，液體從縫裡滲過去）；流出戰場就沒了，放著也會慢慢蒸發、冷掉。
   反應：
     水碰到岩漿 → 岩漿凝成一塊黑石（真的一塊磚，擋得住、補得了洞），水變成蒸氣
     油碰到岩漿、火（火的爆炸、著火的磚）→ 油燒起來，一格一格延燒；燒著的油燙傷泡在裡面的兵、點著旁邊的木頭
     雷（雷的爆炸）打到水 → 連成一片的水整片帶電：泡在這片水裡的兵全部電暈一輪、受傷
     冰（冰的爆炸、結霜的砲彈）打到水 → 那一片水結冰（不再流），泡在裡面的兵凍住一輪；打到岩漿 → 岩漿冷成黑石
     火打到冰 → 化回水；水泡到著火的磚 → 火熄了
   城裡的水槽（%）、油桶（&）、熔爐（@）：被打碎就把裡面的東西倒出來，打裂了會一直漏。
   兵器：水甕兵的水甕、油壺兵的油壺落在哪就在那裡倒出一攤；煉金師每回合開始抽一瓶藥水（火、冰、雷），這一回合就丟這一種（瞄準前就看得到）
   跟戰局用同一套 S；不碰畫面，Node 裡也能跑 */

const FL = { x0: -8, y0: -6, c: 1.7, nx: 76, ny: 26, dt: 0.05 };
const LQ_WATER = 1, LQ_OIL = 2, LQ_LAVA = 3;
const LQ_FLOW = [0, 0.26, 0.18, 0.07];          // 往旁邊分的快慢
const LQ_DECAY = [0, 0.9975, 0.999, 0.9965];    // 每一次流完剩幾成（蒸發、冷掉）
const LQ_TANK = [0, 4.2, 3.2, 3.0];             // 一個水槽、油桶、熔爐裝多少格

/* ---------- 開局 ---------- */
function fluxSetup() {
  S.flux = null;
  const lv = S.lv; if (!lv.flux && !S.units.some((u) => (u.w && u.w.pour) || u.def.alch)) return;          // 演武場：有水甕兵、油壺兵、煉金師就開液體
  const n = FL.nx * FL.ny;
  const F = S.flux = { amt: new Float32Array(n), typ: new Uint8Array(n), fire: new Float32Array(n), elec: new Float32Array(n), ice: new Float32Array(n), tmp: new Float32Array(n), sol: new Uint8Array(n), solT: new Uint8Array(n), blk: new Array(n).fill(null), acc: 0, tick: 0, tanks: [], stones: 0, nfire: 0, nice: 0, steam: 0, dir: 1 };
  // 地面（不會變）：每一欄地面以下的格子
  for (let cx = 0; cx < FL.nx; cx++) { const gy = groundY(FL.x0 + (cx + 0.5) * FL.c); for (let cy = 0; cy < FL.ny; cy++) if (FL.y0 + (cy + 0.5) * FL.c < gy) F.solT[cy * FL.nx + cx] = 1; }
  for (const b of S.blocks) if (b.ltank && !b.dead) { const p = b.body.getPosition(); F.tanks.push({ b, k: b.ltank, vol: LQ_TANK[b.ltank], lx: p.x, ly: p.y, done: false }); }
  // 煉金師：每回合開始抽藥水（第一回合也是）
}
// i 的第 k 個鄰格（下、左、右、上）；左右越過戰場邊緣不算（不會從這一列的最右邊接到下一列的最左邊）：沒有就回傳 -1
function lqNb(i, k) { const nx = FL.nx; if (k === 0) return i >= nx ? i - nx : -1; if (k === 3) return i + nx < nx * FL.ny ? i + nx : -1; const cx = i % nx; if (k === 1) return cx > 0 ? i - 1 : -1; return cx < nx - 1 ? i + 1 : -1; }
const LQ_UY = [0.6, 1.9];          // 兵泡在液體裡：看腳下、腰間這兩格
function lqIdx(x, y) { const cx = Math.floor((x - FL.x0) / FL.c), cy = Math.floor((y - FL.y0) / FL.c); return cx < 0 || cy < 0 || cx >= FL.nx || cy >= FL.ny ? -1 : cy * FL.nx + cx; }
function lqX(i) { return FL.x0 + (i % FL.nx + 0.5) * FL.c; }
function lqY(i) { return FL.y0 + ((i / FL.nx | 0) + 0.5) * FL.c; }

/* ---------- 擋得住液體的地方：地面 + 每一塊磚（照現在的位置、角度） ---------- */
function fluxSolid() {
  const F = S.flux, nx = FL.nx, c = FL.c; F.sol.set(F.solT); F.blk.fill(null);
  for (const b of S.blocks) {
    if (b.dead || !b.body || b.kind === 'ball' || b.frag || b.hp < b.hm * 0.5) continue;          // 裂開一半以上的磚、碎塊擋不住液體（會從縫裡滲過去）
    const p = b.body.getPosition(), a = b.body.getAngle(), cs = Math.cos(a), sn = Math.sin(a), hw = b.w / 2, hh = b.h / 2;
    const ex = Math.abs(cs) * hw + Math.abs(sn) * hh, ey = Math.abs(sn) * hw + Math.abs(cs) * hh;
    const c0 = Math.max(0, Math.floor((p.x - ex - FL.x0) / c)), c1 = Math.min(nx - 1, Math.floor((p.x + ex - FL.x0) / c)), r0 = Math.max(0, Math.floor((p.y - ey - FL.y0) / c)), r1 = Math.min(FL.ny - 1, Math.floor((p.y + ey - FL.y0) / c));
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const dx = FL.x0 + (cx + 0.5) * c - p.x, dy = FL.y0 + (cy + 0.5) * c - p.y, lx = dx * cs + dy * sn, ly = -dx * sn + dy * cs;
      if (Math.abs(lx) > hw + 0.1 || Math.abs(ly) > hh + 0.1) continue;
      if (b.kind === 'roof') { const tt = clamp((ly + hh) / (2 * hh), 0, 1); if (lx < -hw + b.il * tt - 0.1 || lx > hw - b.ir * tt + 0.1) continue; }          // 斜屋頂：照梯形量（斜面上方不算）
      const i = cy * nx + cx; F.sol[i] = 1; F.blk[i] = b;
    }
  }
}

/* ---------- 倒一攤液體（k 種、v 格），從 (x, y) 那一格往四周、往上找空格 ---------- */
function fluxPour(x, y, k, v) {
  const F = S.flux; if (!F || !(v > 0)) return;
  let i = lqIdx(x, y); if (i < 0) return;
  // 起點在磚裡面：往上找第一個空格
  for (let n = 0; n < 6 && i >= 0 && F.sol[i]; n++) i = i + FL.nx < F.amt.length ? i + FL.nx : -1;
  if (i < 0) return;
  const q = [i], seen = new Set([i]);
  for (let h = 0; h < q.length && v > 0.01 && h < 60; h++) {
    const j = q[h];
    if (!F.sol[j] && (F.typ[j] === 0 || F.typ[j] === k || F.amt[j] < 0.02)) { const m = Math.min(v, 1 - (F.typ[j] === k ? F.amt[j] : 0)); if (m > 0) { if (F.typ[j] !== k) { F.amt[j] = 0; F.fire[j] = 0; } F.typ[j] = k; F.amt[j] += m; v -= m; } }
    const cx = j % FL.nx;
    for (const d of [-FL.nx, -1, 1, FL.nx]) { const t = j + d; if (t < 0 || t >= F.amt.length || ((d === -1 || d === 1) && Math.abs((t % FL.nx) - cx) !== 1) || seen.has(t) || F.sol[t]) continue; seen.add(t); q.push(t); }
  }
}

/* ---------- 每一步 ---------- */
function fluxStep(dt) {
  const F = S.flux; if (!F) return;
  F.acc += dt; while (F.acc >= FL.dt) { F.acc -= FL.dt; fluxTick(); }
}
function fluxTick() {
  const F = S.flux, nx = FL.nx, ny = FL.ny, n = nx * ny, A = F.amt, K = F.typ, sol = F.sol, ice = F.ice, fire = F.fire;
  F.tick++; F.steam = 0;
  const hurt = !(S.state === 'play' && (S.phase === 'aim' || S.phase === 'intro' || S.phase === 'build'));          // 瞄準的時候不燙人、不燒磚（跟著火的磚一樣）
  if ((F.tick & 1) === 0 || F.tick < 3) fluxSolid();
  // 水槽、油桶、熔爐：碎了倒出來，裂了一直漏
  for (const t of F.tanks) {
    if (t.done) continue;
    const b = t.b;
    if (b.dead || !b.body) { fluxPour(t.lx, t.ly, t.k, t.vol); t.done = true; ev('tankburst', t.lx, t.ly, t.k, b.side); continue; }
    const p = b.body.getPosition(); t.lx = p.x; t.ly = p.y;
    if (b.hp < b.hm * 0.6 && t.vol > 0) { const m = Math.min(t.vol, 0.05); t.vol -= m; fluxPour(p.x, p.y - b.h * 0.5 - 0.3, t.k, m); if (t.vol <= 0) t.done = true; }
  }
  // 被磚擠住的液體：往上推一格
  for (let i = 0; i < n; i++) if (sol[i] && A[i] > 0) { const u = i + nx; if (u < n && !sol[u] && (K[u] === 0 || K[u] === K[i] || A[u] < 0.02)) { if (K[u] !== K[i]) { A[u] = 0; fire[u] = 0; } K[u] = K[i]; A[u] = Math.min(1.5, A[u] + A[i]); fire[u] = Math.max(fire[u], fire[i]); } A[i] = 0; K[i] = 0; fire[i] = 0; }
  // 往下掉
  F.dir = -F.dir;
  for (let cy = 1; cy < ny; cy++) for (let k = 0; k < nx; k++) {
    const cx = F.dir > 0 ? k : nx - 1 - k, i = cy * nx + cx, a = A[i]; if (a < 0.005 || ice[i] > 0) continue;
    const j = i - nx; if (sol[j] || ice[j] > 0) continue;
    if (K[i] === LQ_WATER && K[j] === LQ_OIL) { const ta = A[j], tf = fire[j]; K[j] = LQ_WATER; A[j] = a; fire[j] = 0; K[i] = LQ_OIL; A[i] = ta; fire[i] = tf; continue; }          // 水比油重：沉到油底下
    if (K[j] && K[j] !== K[i] && A[j] > 0.02) { lqReact(i, j); continue; }
    const room = 1 - (K[j] === K[i] ? A[j] : 0); if (room <= 0.002) continue;
    const m = Math.min(a, room); if (K[j] !== K[i]) { A[j] = 0; fire[j] = 0; } K[j] = K[i]; A[j] += m; A[i] -= m; if (fire[i] > 0) fire[j] = Math.max(fire[j], fire[i]);
    if (A[i] < 0.005) { A[i] = 0; K[i] = 0; fire[i] = 0; }
  }
  // 往左右分
  F.tmp.set(A);
  for (let i = 0; i < n; i++) {
    const a = F.tmp[i]; if (a < 0.02 || ice[i] > 0 || !K[i]) continue;
    const cx = i % nx, k0 = K[i];
    for (let q = 0; q < 2; q++) { const d = (q === 0) === (F.dir > 0) ? -1 : 1;
      const tx = cx + d; if (tx < 0 || tx >= nx) { A[i] *= 0.6; continue; }          // 流出戰場
      const j = i + d; if (sol[j] || ice[j] > 0) continue;
      if (K[j] && K[j] !== k0 && F.tmp[j] > 0.02) { lqReact(i, j); continue; }
      const diff = a - (K[j] === k0 ? F.tmp[j] : 0); if (diff < 0.02) continue;
      const f = Math.min(A[i], diff * LQ_FLOW[k0]); if (f <= 0) continue;
      if (K[j] !== k0) { A[j] = 0; fire[j] = 0; } K[j] = k0; A[j] += f; A[i] -= f;
      if (fire[i] > 0 && fire[j] <= 0 && k0 === LQ_OIL) fire[j] = 0.01;
    }
  }
  // 燒著的油、岩漿、帶電的水、結冰；蒸發、冷掉
  let nf = 0, ni = 0;
  for (let i = 0; i < n; i++) {
    if (F.elec[i] > 0) F.elec[i] = Math.max(0, F.elec[i] - FL.dt);
    if (ice[i] > 0) { ni++; ice[i] -= FL.dt; if (ice[i] <= 0) { ice[i] = 0; ev('lqmelt', lqX(i), lqY(i)); } continue; }
    const k = K[i]; if (!k) continue;
    A[i] *= LQ_DECAY[k];
    if (k === LQ_OIL && fire[i] > 0) {
      nf++; fire[i] += FL.dt; A[i] -= 0.014;
      // 往四周的油延燒；旁邊的磚被點著、被燙
      for (let q = 0; q < 4; q++) { const j = lqNb(i, q); if (j < 0) continue; if (K[j] === LQ_OIL && A[j] > 0.03 && fire[j] <= 0 && fire[i] > 0.25) fire[j] = 0.01; if (K[j] === LQ_WATER && A[j] > 0.2) { fire[i] = 0; A[j] -= 0.2; if (F.steam++ < 3) ev('steam', lqX(i), lqY(i) + 0.5); break; } const b = F.blk[j]; if (hurt && b && !b.dead && (F.tick & 3) === 0) { if (MAT[b.mat].burn) ignite(b, 2.5, 2); blockHurt(b, 1.6, K_FIRE, 2); } }          // 碰到水：火熄了
    } else if (k === LQ_OIL) {
      for (let q = 0; q < 4; q++) { const j = lqNb(i, q); if (j < 0) continue; const b = F.blk[j]; if (b && !b.dead && b.burn > 0 && A[i] > 0.05) { fire[i] = 0.01; ev('oilfire', lqX(i), lqY(i)); break; } }          // 貼著著火的磚：油燒起來
    } else if (k === LQ_LAVA) {
      for (let q = 0; q < 4; q++) { const j = lqNb(i, q); if (j < 0) continue; if (K[j] === LQ_OIL && A[j] > 0.03 && fire[j] <= 0) fire[j] = 0.01; const b = F.blk[j]; if (hurt && b && !b.dead && (F.tick & 3) === 0) { if (MAT[b.mat].burn) ignite(b, 3, 2); blockHurt(b, 3.2, K_FIRE, 2); b.heat = Math.min(1, (b.heat || 0) + 0.25); } }
    } else if (k === LQ_WATER) {
      for (let q = 0; q < 4; q++) { const j = lqNb(i, q); if (j < 0) continue; const b = F.blk[j]; if (b && b.burn > 0 && !b.dead) { b.burn = 0; S.nburn = Math.max(0, S.nburn - 1); ev('douse', lqX(i), lqY(i), 2); } }
    }
    if (A[i] < 0.02) { A[i] = 0; K[i] = 0; fire[i] = 0; }
  }
  F.nfire = nf; F.nice = ni;
  // 泡在液體裡的兵
  if (hurt) for (const u of S.units) {
    if (!u.alive || !u.body) continue;
    for (const yy of LQ_UY) {
      const i = lqIdx(u.x, u.y + yy); if (i < 0 || !K[i] || A[i] < 0.15) continue;
      if (K[i] === LQ_LAVA) { hurtUnit(u, 30 * FL.dt, 2, K_FIRE); break; }
      if (K[i] === LQ_OIL && fire[i] > 0) { hurtUnit(u, 14 * FL.dt, 2, K_FIRE); break; }
    }
  }
}
// 兩種液體碰在一起（i 往 j 流）
function lqReact(i, j) {
  const F = S.flux, K = F.typ, A = F.amt, a = K[i], b = K[j];
  if ((a === LQ_WATER && b === LQ_LAVA) || (a === LQ_LAVA && b === LQ_WATER)) {
    const lv = a === LQ_LAVA ? i : j, wt = lv === i ? j : i;
    A[wt] -= 0.35; if (A[wt] < 0.02) { A[wt] = 0; K[wt] = 0; }
    if (A[lv] >= 0.3) lavaStone(lv); else { A[lv] = 0; K[lv] = 0; }
    if (F.steam++ < 3) ev('steam', lqX(lv), lqY(lv) + 0.6);
  } else if ((a === LQ_OIL && b === LQ_LAVA) || (a === LQ_LAVA && b === LQ_OIL)) {
    const o = a === LQ_OIL ? i : j; if (F.fire[o] <= 0) { F.fire[o] = 0.01; ev('oilfire', lqX(o), lqY(o)); }
  }
}
// 岩漿凝成一塊黑石（一格大小的真的石磚）
function lavaStone(i) {
  const F = S.flux; F.amt[i] = 0; F.typ[i] = 0; F.fire[i] = 0;
  if (F.stones >= 60) return;
  F.stones++;
  const b = mkBlock(S.rubble, { mat: M_ROCK, kind: 'box', x: lqX(i), y: lqY(i), w: FL.c * 0.96, h: FL.c * 0.96, awake: true, den: 1.6 });
  b.wt = 0; b.obsid = 1; b.hp = b.hm = 40; F.sol[i] = 1; F.blk[i] = b;
  ev('lqstone', lqX(i), lqY(i));
}

/* ---------- 爆炸打到液體（45-phys 的 physExplode 轉過來） ---------- */
function fluxBlast(x, y, r, w, side, fire, frost, zapc) {
  const F = S.flux; if (!F) return;
  const kind = w.kind, zap = kind === K_ZAP || zapc, ice = kind === K_ICE || frost, R = r + 1.2, nx = FL.nx;
  const c0 = Math.max(0, Math.floor((x - R - FL.x0) / FL.c)), c1 = Math.min(nx - 1, Math.floor((x + R - FL.x0) / FL.c)), r0 = Math.max(0, Math.floor((y - R - FL.y0) / FL.c)), r1 = Math.min(FL.ny - 1, Math.floor((y + R - FL.y0) / FL.c));
  const hitW = [], froze = ice ? new Set() : null;
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const i = cy * nx + cx, k = F.typ[i]; if (Math.hypot(lqX(i) - x, lqY(i) - y) > R) continue;
    if (F.ice[i] > 0) { if (fire) { F.ice[i] = 0; ev('lqmelt', lqX(i), lqY(i)); } continue; }
    if (!k || F.amt[i] < 0.05) continue;
    if (fire) { if (k === LQ_OIL && F.fire[i] <= 0) F.fire[i] = 0.3; else if (k === LQ_WATER) { F.amt[i] *= 0.7; if (F.steam++ < 3) ev('steam', lqX(i), lqY(i) + 0.5); } }
    if (ice) {
      const j = i - nx, held = j < 0 || F.sol[j] || F.ice[j] > 0 || (F.typ[j] === LQ_WATER && F.amt[j] > 0.85);          // 半空中往下掉的那一截不結冰（不然一條冰柱掛在半空）
      if (k === LQ_WATER && held) { F.ice[i] = 14; froze.add(i); } else if (k === LQ_LAVA && F.amt[i] > 0.3) lavaStone(i);
    }
    if (zap && k === LQ_WATER) hitW.push(i);
  }
  if (froze && froze.size) for (const u of S.units) { if (!u.alive || u.immune || open1(u, side) || (u.side === side && !rules().ff)) continue; for (const yy of LQ_UY) { const i = lqIdx(u.x, u.y + yy); if (i >= 0 && froze.has(i)) { if (!(u.frozen > 0)) { u.frozen = 1; u.dazed = 1; ev('freeze', u.x, u.y, u.side); } break; } } }          // 只凍這一炸凍住的那幾格裡的兵
  if (hitW.length) lqShock(hitW, side, w);
}
// 雷打到水：跟這幾格連在一起的整片水都帶電，泡在裡面的兵全部電暈
function lqShock(seed, side, w) {
  const F = S.flux, nx = FL.nx, n = nx * FL.ny, q = seed.slice(), on = new Set(seed);
  for (let h = 0; h < q.length && q.length < 500; h++) { const i = q[h], cx = i % nx; for (const d of [-nx, -1, 1, nx]) { const j = i + d; if (j < 0 || j >= n || on.has(j) || ((d === -1 || d === 1) && Math.abs((j % nx) - cx) !== 1)) continue; if (F.typ[j] === LQ_WATER && F.amt[j] > 0.12 && F.ice[j] <= 0) { on.add(j); q.push(j); } } }
  for (const i of q) F.elec[i] = 0.7;
  const T = side < 2 ? S.team[side] : null, d = 16 * (T ? T.dmg : 1) * S.rage;
  let hitN = 0;
  for (const u of S.units) {
    if (!u.alive) continue;
    let wet = false; for (const yy of LQ_UY) { const i = lqIdx(u.x, u.y + yy); if (i >= 0 && on.has(i)) wet = true; }
    if (!wet) continue;
    if (u.side === side && !rules().ff) continue;
    hurtUnit(u, d, side, K_ZAP); hitN++;
    if (u.alive && !u.immune && !open1(u, side)) { u.stun = Math.max(u.stun, 1); u.dazed = 1; u.tangled = 0; ev('skip', u.x, u.y + 4, u.side, 1); }
  }
  const p = q[0]; ev('lqshock', lqX(p), lqY(p), side, q.length, hitN);
}

/* ---------- 打到東西（51-arms 的 armsHit 轉過來）：水甕、油壺 ---------- */
function fluxHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i]; if (side > 1) return 0;
  physExplode(hx, hy, w, side, SH.mass[i], SH.flag[i], o, vx, vy);
  if (S.flux) { fluxPour(hx - vx * 0.01, hy + 0.4, w.pour.k, w.pour.v * Math.min(1.6, SH.mass[i])); ev('lqpour', hx, hy, w.pour.k, side); }
  return 1;
}

/* ---------- 每回合 ---------- */
// 煉金師抽藥水：火、冰、雷（這一回合就丟這一種）
const POTIONS = ['potfire', 'potfrost', 'potzap'];
function fluxRound() {
  for (const u of S.units) if (u.alive && u.def.alch) { u.pot = POTIONS[ri(POTIONS.length)]; u.w = WPN[u.pot]; }
}
function fluxBusy() { const F = S.flux; return !!F && F.nfire > 0 && S.phaseT < 6; }          // 油還在燒：等一下（最多六秒）
