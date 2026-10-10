/* ===== 70-render: 每一幀把戰場畫出來 ===== */
const F_NUM = '"Lilita One", "NumFB", "Arial Black", system-ui, sans-serif';
const F_ZH = '900 1px "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif';
const RD = {
  cv: null, c: null, t: 0, frame: 0, glow: {}, flame: null, flameKey: 0,
  showAim: true, aimOn: false, aimT: 1.0, aimMask: 0, aimFar: 0, trail: null, sh: [0, 0], burn: [],
  avoid: []          // 畫面角落那幾顆按鈕佔的位置（畫布像素 [x0, y0, x1, y1]）：跳出來的字要避開，不然被按鈕蓋住看不到
};
const SOOT_MAX = 0.5;          // 被炸過的磚燻黑到什麼程度為止（疊太黑的話，深色的鐵甲和石磚整塊變成一團黑，看不出是什麼）
const GATE_COL = [
  { e: 'rgba(60,140,255,.36)', m: 'rgba(160,214,255,.62)', line: '#cfe6ff', glow: 'rgba(60,140,255,.30)', ink: '#0f2a78' },
  { e: 'rgba(240,60,50,.36)', m: 'rgba(255,176,156,.62)', line: '#ffcabb', glow: 'rgba(255,70,40,.28)', ink: '#6a0b10' },
  { e: 'rgba(255,196,50,.42)', m: 'rgba(255,246,196,.72)', line: '#fff3c0', glow: 'rgba(255,200,60,.36)', ink: '#7a4a08' },
  { e: 'rgba(120,50,170,.42)', m: 'rgba(206,160,244,.56)', line: '#dcb8ff', glow: 'rgba(150,60,220,.28)', ink: '#2a0a40' }
];
function renderInit(cv) { RD.cv = cv; RD.c = cv.getContext('2d', { alpha: false }); }
// 一顆柔邊的光點（加亮混色用），每種顏色只畫一次
function glowSprite(ci) {
  let g = RD.glow[ci]; if (g) return g;
  g = mkCanvas(64, 64); const c = g.getContext('2d'), hex = PCOL[ci];
  c.fillStyle = rg(c, 32, 32, 0, 32, [0, rgba(hex, 1), 0.25, rgba(hex, 0.75), 0.6, rgba(hex, 0.22), 1, rgba(hex, 0)]); c.fillRect(0, 0, 64, 64);
  RD.glow[ci] = g; return g;
}
function flameSprite() {
  const px = Math.max(8, Math.round(V.T));
  if (RD.flame && RD.flameKey === px) return RD.flame;
  const cv = mkCanvas(px, px * 1.5), c = cv.getContext('2d'), w = px, h = px * 1.5;
  c.beginPath(); c.moveTo(w * 0.5, 0); c.quadraticCurveTo(w * 0.98, h * 0.5, w * 0.82, h * 0.82); c.quadraticCurveTo(w * 0.5, h * 1.08, w * 0.18, h * 0.82); c.quadraticCurveTo(w * 0.02, h * 0.55, w * 0.34, h * 0.36); c.quadraticCurveTo(w * 0.42, h * 0.52, w * 0.5, 0);
  c.fillStyle = lg(c, 0, 0, 0, h, [0, 'rgba(255,240,170,.95)', 0.45, 'rgba(255,160,40,.9)', 1, 'rgba(230,60,20,.55)']); c.fill();
  RD.flame = cv; RD.flameKey = px; return cv;
}

/* ---------- 城樓 ---------- */
// 城基：畫進靜態的佈景裡（不會動、打不壞）
function drawFoundations(c) {
  for (const st of S.structs) {
    if (st.side > 1 || st.nofound) continue;
    const P = SKINS[st.skin], x0 = X(st.fx0 - CS * 0.45), x1 = X(st.fx1 + CS * 0.45), y0 = Y(st.y0), h = V.s * 2.1, s = V.s;
    c.fillStyle = lg(c, 0, y0, 0, y0 + h, [0, P.stone[1], 1, P.stone[2]]); rrect(c, x0, y0 - s * 0.05, x1 - x0, h, s * 0.5); c.fill();
    c.fillStyle = P.stone[0]; c.fillRect(x0 + s * 0.3, y0 - s * 0.05, x1 - x0 - s * 0.6, Math.max(1, s * 0.3));
    c.strokeStyle = P.ink; c.lineWidth = Math.max(1.5, s * 0.28); rrect(c, x0, y0 - s * 0.05, x1 - x0, h, s * 0.5); c.stroke();
    c.fillStyle = rgba(P.stone[3], 0.6); for (let x = x0 + s * 2.4; x < x1 - s; x += s * 3.4) c.fillRect(x, y0 + s * 0.5, Math.max(1, s * 0.2), h - s * 1.0);
  }
}
// 岩壁：每一幀貼在佈景上、城樓後面（佈景裡會動的雲、霧畫在它後面，不會飄到岩壁前面）。只畫一次，存成一張圖
// （圖的四邊多留一點：岩石的邊有起伏、頂上長草、積雪，會稍微超出格子）
function drawRocks(c) {
  for (const st of S.structs) {
    if (!st.rock || !st.rock.length) continue;
    const key = V.T + '|' + V.s;
    if (!st._rk || st._rkKey !== key) {
      const pad = Math.ceil(V.s * 1.4) + 2, x0 = Math.round(X(st.x0)) - pad, y0 = Math.round(Y(st.y1)) - pad, cv = mkCanvas(st.cols * V.T + pad * 2, st.rows * V.T + pad * 2), k = cv.getContext('2d');
      k.translate(-x0, -y0); drawRock(k, st); st._rk = cv; st._rkKey = key; st._rkX = st.x0; st._rkY = st.y1; st._rkP = pad;
    }
    c.drawImage(st._rk, Math.round(X(st._rkX)) - st._rkP, Math.round(Y(st._rkY)) - st._rkP);
  }
}
// 岩石的顏色和長相：c = [受光、本色、背光、描邊]；veg 頂上長什麼（'grass' 草、'snow' 積雪、0 什麼都不長）、g 草的亮、中、暗三個綠；
// jnt 直的岩縫多不多；ldg 橫的岩棚多不多；band 一層一層的岩層顏色（砂岩、浮島）；groove 石灰岩頂上往下的溶溝和雨水痕；
// soil 浮島草皮底下那層土；glow 浮島底下被日出的雲海映亮的暖色；foot 岩腳貼著地面的那一截暗多少（懸空寺的岩柱底下接著崖壁，不能暗）
const ROCK_PAL = {
  canyon: { c: ['#d98c62', '#b4643e', '#83432a', '#5a2a18'], veg: 0, jnt: 0.45, ldg: 0.5, band: ['#e3a06c', '#c27449', '#a4552f', '#d8925f', '#b9643c', '#edb47e'], foot: 0.3 },
  karst: { c: ['#c9cbc2', '#a2a49b', '#76786f', '#52544c'], veg: 'grass', g: ['#a3cf72', '#64994b', '#3d6a37'], jnt: 0.35, ldg: 0.7, groove: 1, foot: 0.25 },
  frost: { c: ['#c8d6e6', '#9cb0c8', '#6f84a0', '#4c5d78'], veg: 'snow', jnt: 0.75, ldg: 0.5, foot: 0.2 },
  jade: { c: ['#b8b0a0', '#968c7a', '#6e6555', '#4a4336'], veg: 'grass', g: ['#b2e27a', '#71b950', '#3e7d39'], jnt: 0.3, ldg: 0.5, band: ['#a99f8b', '#8c826e', '#9b8f78', '#7f7562', '#b3a891'], soil: ['#8d6844', '#5c3f28'], glow: '#ffb38e' },
  ember: { c: ['#6e5a55', '#4a3a37', '#2e2322', '#140d0c'], veg: 0, jnt: 0.7, ldg: 0.45 },
  crystal: { c: ['#efeaff', '#c3bbee', '#9289cc', '#4f4688'], veg: 'snow', jnt: 0.45, ldg: 0.35 },
  maple: { c: ['#bdb6a6', '#979080', '#6d675b', '#46423a'], veg: 'grass', g: ['#d8c060', '#a8913f', '#6e5c28'], jnt: 0.5, ldg: 0.7 },
  demon: { c: ['#7a5a88', '#553a64', '#352442', '#170d20'], veg: 0, jnt: 0.65, ldg: 0.5 },
  def: { c: ['#a39a8c', '#81786b', '#5c554b', '#3e3932'], veg: 'grass', g: ['#a2e070', '#7fae5a', '#4a7a3a'], jnt: 0.85, ldg: 1 }
};
// 岩石（藍圖裡的 A；浮島的 R 由 drawPlats 傳 cells 進來）：整片連成一塊畫，不是一格一格的磚。
// 沿著格子的邊界描出外框，邊緣稍微起伏、轉角磨圓或缺一角（離格子的邊最多 0.3 左右，砲彈打到的地方看起來還是岩石的邊）；
// 裡面的明暗、岩縫、岩棚、嵌著的石頭跨格子連成一片；光從左上來：頂上、朝左的面亮，底下、朝右的面暗；頂上露天的地方長草（冰崖是積雪，峽谷不長）。
// 浮島：底下那幾階補成往下收的岩錐，垂幾根鐘乳石、樹根，草皮底下一層土，島邊垂著藤
function drawRock(c, st, cells) {
  const isle = !!cells, s = V.s, pr = ROCK_PAL[st.skinB] || ROCK_PAL.def, pal = pr.c, G = pr.g, R = mkRand(st.x0 * 13 + 7);
  cells = cells || st.rock;
  const has = new Set(); let gx0 = 1e9, gx1 = -1e9, gy0 = 1e9, gy1 = -1e9;
  for (let i = 0; i < cells.length; i += 2) { const x = cells[i], y = cells[i + 1]; has.add(x + ',' + y); gx0 = Math.min(gx0, x); gx1 = Math.max(gx1, x + 1); gy0 = Math.min(gy0, y); gy1 = Math.max(gy1, y + 1); }
  const at = (x, y) => has.has(x + ',' + y), lw = (k, m) => Math.max(m || 1, s * k), onGnd = (gy) => !isle && Math.abs(st.y0 + gy * CS) < 0.01;
  const inRock = (x, y, m) => { m = m || 0; for (const [dx, dy] of [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]]) if (!at(Math.floor((x + dx - st.x0) / CS), Math.floor((y + dy - st.y0) / CS))) return false; return true; };
  // 從 (x, y) 往 (dx, dy)（上下左右其中一個）還有多厚的岩石
  const span = (x, y, dx, dy) => {
    let cx = Math.floor((x - st.x0) / CS), cy = Math.floor((y - st.y0) / CS), n = 0;
    if (!at(cx, cy)) { cx += dx; cy += dy; if (!at(cx, cy)) return 0; }
    while (n < 60 && at(cx + dx, cy + dy)) { cx += dx; cy += dy; n++; }
    return dx > 0 ? st.x0 + (cx + 1) * CS - x : dx < 0 ? x - st.x0 - cx * CS : dy > 0 ? st.y0 + (cy + 1) * CS - y : y - st.y0 - cy * CS;
  };
  const bx0 = st.x0 + gx0 * CS, bx1 = st.x0 + gx1 * CS, by0 = st.y0 + gy0 * CS, by1 = st.y0 + gy1 * CS, area = cells.length / 2 * CS * CS;
  // 沿著一條線（戰場座標 [x, y, …]）每隔 d 取一點
  const resample = (q, d) => {
    const o = [q[0], q[1]]; let need = d;
    for (let i = 2; i < q.length; i += 2) { const ax = q[i - 2], ay = q[i - 1], L = Math.hypot(q[i] - ax, q[i + 1] - ay); let t = need; for (; t < L; t += d) o.push(lerp(ax, q[i], t / L), lerp(ay, q[i + 1], t / L)); need = t - L; }
    if (d - need > d * 0.35) o.push(q[q.length - 2], q[q.length - 1]);
    return o;
  };
  // 一顆不太圓的石頭（圓滑的多邊形）
  const blob = (x, y, r, e, n) => { const p = [], b = new Path2D(), a0 = R() * TAU; for (let j = 0; j < n; j++) { const a = a0 + j / n * TAU, rr = r * (0.8 + R() * 0.35); p.push(X(x + Math.cos(a) * rr), Y(y + Math.sin(a) * rr * e)); } for (let j = 0; j <= n; j++) { const i = j % n, k = (j + 1) % n, mx = (p[i * 2] + p[k * 2]) / 2, my = (p[i * 2 + 1] + p[k * 2 + 1]) / 2; if (j) b.quadraticCurveTo(p[i * 2], p[i * 2 + 1], mx, my); else b.moveTo(mx, my); } b.closePath(); return b; };

  // ---- 外框：沿著格子的邊界走（岩石在左手邊），接成幾個封閉的圈（分開的幾塊、中間的洞各一圈），只留轉角 ----
  const from = new Map(), loops = [];
  const edge = (x0, y0, x1, y1) => { const k = x0 + ',' + y0; let a = from.get(k); if (!a) from.set(k, a = []); a.push([x0, y0, x1, y1, 0]); };
  for (let i = 0; i < cells.length; i += 2) {
    const x = cells[i], y = cells[i + 1];
    if (!at(x, y - 1)) edge(x, y, x + 1, y);
    if (!at(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) edge(x, y + 1, x, y);
  }
  for (const list of from.values()) for (const e0 of list) {
    if (e0[4]) continue;
    const L = []; let e = e0;
    for (let n = 0; n < 9999; n++) {
      e[4] = 1; L.push(e[0], e[1]);
      // 兩塊只有角碰角的地方有兩條路：往左轉（兩塊各圈各的）
      let q = null;
      for (const o of from.get(e[2] + ',' + e[3]) || []) if ((!o[4] || o === e0) && (!q || (e[2] - e[0]) * (o[3] - o[1]) - (e[3] - e[1]) * (o[2] - o[0]) > 0)) q = o;
      if (!q || q === e0) break;
      e = q;
    }
    const n = L.length / 2, C = [];
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n * 2, b = i * 2, d = (i + 1) % n * 2, cr = (L[b] - L[a]) * (L[d + 1] - L[b + 1]) - (L[b + 1] - L[a + 1]) * (L[d] - L[b]);
      if (cr) C.push([L[b], L[b + 1], cr > 0]);          // 往左轉的是凸出去的角
    }
    if (C.length >= 4) loops.push(C);
  }
  // ---- 外框上的點（戰場座標）：凹進去的角往外補一點、凸出去的角削一點再磨圓；邊上每隔一小段往外（內）推一點。
  //      貼著地面的那一段不動、往地裡多埋一點，也不描邊。浮島底下那幾階補多一點，收成往下鼓的岩錐，再垂幾根鐘乳石 ----
  const outs = [];
  for (const C of loops) {
    const m = C.length, Q = [], RA = [], GO = [], EL = [], p = [], g = [], put = (x, y, f) => { p.push(x, y); g.push(f); };
    for (let k = 0; k < m; k++) {
      const a = C[(k + m - 1) % m], q = C[k], b = C[(k + 1) % m], ax = st.x0 + q[0] * CS, ay = st.y0 + q[1] * CS;
      const ix = Math.sign(q[0] - a[0]), iy = Math.sign(q[1] - a[1]), ox = Math.sign(b[0] - q[0]), oy = Math.sign(b[1] - q[1]);
      const gIn = onGnd(q[1]) && ix > 0, gOut = onGnd(q[1]) && ox > 0;
      GO.push(gOut);
      if (gIn || gOut) { Q.push(ax, ay - 0.25); RA.push(0); continue; }
      const under = isle && q[1] < gy1, nx = iy + oy, ny = -ix - ox, nl = Math.hypot(nx, ny) || 1;      // 兩條邊的外法線相加：指向角的外側
      const push = q[2] ? -R() * (under ? 0.3 : 0.12) : under ? 1.45 + R() * 0.45 : 0.1 + R() * 0.16;
      Q.push(ax + nx / nl * push, ay + ny / nl * push);
      RA.push(q[2] ? (under ? 1.1 + R() * 0.6 : 0.3 + R() * 0.45) : (under ? 1.3 + R() * 0.5 : 0.35 + R() * 0.35));
    }
    for (let k = 0; k < m; k++) { const j = (k + 1) % m; EL.push(Math.hypot(Q[j * 2] - Q[k * 2], Q[j * 2 + 1] - Q[k * 2 + 1])); }
    for (let k = 0; k < m; k++) RA[k] = Math.min(RA[k], EL[k] * 0.45, EL[(k + m - 1) % m] * 0.45);
    for (let k = 0; k < m; k++) {
      const k0 = (k + m - 1) % m, k1 = (k + 1) % m, qx = Q[k * 2], qy = Q[k * 2 + 1], r = RA[k];
      const ux = (Q[k1 * 2] - qx) / EL[k], uy = (Q[k1 * 2 + 1] - qy) / EL[k], vx = (qx - Q[k0 * 2]) / EL[k0], vy = (qy - Q[k0 * 2 + 1]) / EL[k0];
      // 轉角：一段二次曲線，控制點就是角
      if (r > 0.04) { const ax = qx - vx * r, ay = qy - vy * r, bx = qx + ux * r, by = qy + uy * r, n = Math.max(2, Math.ceil(r / 0.3)); for (let j = 0; j <= n; j++) { const t = j / n, w = 1 - t; put(w * w * ax + 2 * w * t * qx + t * t * bx, w * w * ay + 2 * w * t * qy + t * t * by, 0); } }
      else put(qx, qy, GO[k] ? 1 : 0);
      if (GO[k]) continue;
      // 邊：從這個角的弧尾走到下一個角的弧頭，外法線 (nx, ny)；浮島底下朝下的邊中間往下鼓一點
      const len = EL[k] - r - RA[k1], sx = qx + ux * r, sy = qy + uy * r, nx = uy, ny = -ux;
      const cone = isle && Math.min(qy, Q[k1 * 2 + 1]) < by1 - CS - 0.01, lo = ny > 0.5 ? -0.02 : -0.07, hi = ny > 0.5 ? 0.1 : cone ? 0.4 : 0.25, mid = (lo + hi) / 2;
      const belly = cone && ny < -0.5 ? Math.min(0.6, len * 0.04) : 0;
      let off = mid, spike = cone && ny < -0.5 && len > 3 ? 0.8 + R() * 1.6 : 1e9;
      for (let t = 0.3 + R() * 0.4; t < len - 0.25;) {
        const tp = Math.min(1, t / 0.6, (len - t) / 0.6), bl = belly * Math.sin(Math.PI * t / len), pt = (u, o) => put(sx + ux * (t + u) + nx * o, sy + uy * (t + u) + ny * o, 0);
        if (t > spike && t < len - 1.4) {
          // 鐘乳石：根寬寬的，往下收成尖（連根最多垂到格子底下 1.5）
          const o = off * tp + bl, w = 0.32 + R() * 0.3, L = Math.min(1.5 - o, 0.6 + R() * 0.8), j = (R() - 0.5) * 0.25;
          pt(0, o); pt(w * 0.55, o + L * 0.45); pt(w + j, o + L); pt(w * 1.4, o + L * 0.4); pt(w * 2, o);
          t += w * 2 + 0.35; spike = t + 2.2 + R() * 2.8; continue;
        }
        off = clamp(lerp(off, mid, 0.3) + (R() - 0.5) * (hi - lo) * 0.85, lo, hi);
        pt(0, off * tp + bl);
        t += 0.45 + R() * 0.6;
      }
    }
    outs.push({ p, g });
  }
  const shape = new Path2D();
  for (const o of outs) { const p = o.p; shape.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) shape.lineTo(X(p[i]), Y(p[i + 1])); shape.closePath(); }
  // 外框上連續、朝某個方向（want(外法線)）的幾段接成一條線（貼地的那幾段不算）：受光面、背光面、頂上長草、底下掛冰柱用
  const runs = (want) => {
    const out = [];
    for (const o of outs) {
      const p = o.p, n = p.length / 2, ok = (i) => { if (o.g[i]) return false; const j = (i + 1) % n, dx = p[j * 2] - p[i * 2], dy = p[j * 2 + 1] - p[i * 2 + 1], l = Math.hypot(dx, dy) || 1; return want(dy / l, -dx / l); };
      let i0 = -1; for (let i = 0; i < n; i++) if (!ok(i)) { i0 = i; break; }
      if (i0 < 0) continue;
      let cur = null;
      for (let k = 1; k <= n; k++) { const i = (i0 + k) % n; if (ok(i)) { const j = (i + 1) % n; if (!cur) cur = [p[i * 2], p[i * 2 + 1]]; cur.push(p[j * 2], p[j * 2 + 1]); } else if (cur) { out.push(cur); cur = null; } }
      if (cur) out.push(cur);
    }
    return out;
  };
  const tops = runs((nx, ny) => ny > 0.4), lows = runs((nx, ny) => ny < -0.55);
  c.lineCap = 'round'; c.lineJoin = 'round';

  // ---- 浮島底下垂著的樹根：畫在岩石後面，只露出外框底下那一截；粗的根上再分出細的鬚 ----
  if (isle) {
    const rt = new Path2D(), rf = new Path2D();
    for (const q of lows) {
      const g = resample(q, 0.5);
      for (let i = 1; i < g.length / 2 - 1; i++) {
        if (R() < 0.7) continue;
        const x = g[i * 2], y = g[i * 2 + 1], L = 0.5 + R() * 1.1, sw = (R() - 0.5) * 1.1, P2 = R() < 0.55 ? rt : rf;
        P2.moveTo(X(x), Y(y + 0.6)); P2.bezierCurveTo(X(x + sw * 0.15), Y(y - L * 0.35), X(x - sw * 0.5), Y(y - L * 0.65), X(x + sw), Y(y - L));
        for (let j = 0; j < 2; j++) if (R() < 0.55) { const t = 0.3 + R() * 0.4, bx = x + sw * (0.1 + t * 0.3), by = y - L * t, d = R() < 0.5 ? -1 : 1; rf.moveTo(X(bx), Y(by)); rf.quadraticCurveTo(X(bx + d * 0.35), Y(by - 0.1), X(bx + d * (0.3 + R() * 0.4)), Y(by - 0.35 - R() * 0.4)); }
      }
    }
    c.strokeStyle = '#4b3824'; c.lineWidth = lw(0.18); c.stroke(rt); c.lineWidth = lw(0.09); c.stroke(rf);
  }

  // ---- 岩石本體：整片一個上亮下暗的漸層，再疊上跨格子連成一片的紋理 ----
  c.fillStyle = lg(c, 0, Y(by1), 0, Y(by0), isle ? [0, mix(pal[1], pal[0], 0.25), 0.3, pal[1], 1, mix(pal[2], pal[3], 0.3)] : [0, mix(pal[1], pal[0], 0.3), 0.45, pal[1], 1, mix(pal[1], pal[2], 0.4)]);
  c.fill(shape);
  c.save(); c.clip(shape);
  // 一層一層的岩層顏色（砂岩、浮島）：照岩層的起伏，稍微斜
  const tilt = (R() - 0.5) * 0.07, ph = R() * TAU, sy = (x, y) => y + tilt * (x - bx0) + Math.sin(x * 0.55 + y * 1.3 + ph) * 0.16 + Math.sin(x * 1.9 + y) * 0.05;
  if (pr.band) {
    const lv = []; for (let y = by0 - 0.5 + R(); y < by1 + 0.5; y += 0.7 + R() * 1.6) lv.push(y);
    for (let i = 0; i + 1 < lv.length; i++) {
      c.beginPath(); for (let x = bx0 - 1; x < bx1 + 1.6; x += 0.6) c.lineTo(X(x), Y(sy(x, lv[i]))); for (let x = bx1 + 1; x > bx0 - 1.6; x -= 0.6) c.lineTo(X(x), Y(sy(x, lv[i + 1])));
      c.closePath(); c.fillStyle = rgba(pr.band[(R() * pr.band.length) | 0], 0.3 + R() * 0.35); c.fill();
      if (R() < 0.45) { c.beginPath(); for (let x = bx0 - 1; x < bx1 + 1.6; x += 0.6) c.lineTo(X(x), Y(sy(x, lv[i]))); c.lineWidth = lw(0.08); c.strokeStyle = rgba(pal[3], 0.3); c.stroke(); }
    }
  }
  // 大片的明暗斑駁
  for (let k = 0, n = Math.ceil(area / 7); k < n; k++) {
    const x = lerp(bx0, bx1, R()), y = lerp(by0, by1, R()), r = (1.2 + R() * 2.6) * s, col = R() < 0.5 ? pal[0] : pal[2], a = 0.1 + R() * 0.14;
    if (!inRock(x, y)) continue;
    c.fillStyle = rg(c, X(x), Y(y), 0, r, [0, rgba(col, a), 1, rgba(col, 0)]); c.fillRect(X(x) - r, Y(y) - r, r * 2, r * 2);
  }
  // 受光面、背光面：從朝左（上）的邊往裡鋪一片亮的，朝右（下）的邊鋪一片暗的；寬度看那裡的岩石多厚，內緣彎彎曲曲的
  const plane = (want, dx, dy, k, w0, w1, col, a) => {
    for (const q of runs(want)) {
      const g = resample(q, 0.35), n = g.length / 2; if (n < 3) continue;
      const h = n >> 1, W = clamp(span(g[h * 2], g[h * 2 + 1], dx, dy) * k, w0, w1), ph2 = R() * TAU, Lr = (n - 1) * 0.35, NX = [], NY = [], WD = [];
      for (let i = 0; i < n; i++) {
        const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1), tx = g[i1 * 2] - g[i0 * 2], ty = g[i1 * 2 + 1] - g[i0 * 2 + 1], tl = Math.hypot(tx, ty) || 1, u = i * 0.35;
        NX.push(ty / tl); NY.push(-tx / tl);
        WD.push(W * smooth(clamp(Math.min(u, Lr - u) / Math.min(0.7, Lr * 0.3), 0, 1)) * (0.74 + 0.18 * Math.sin(u * 0.8 + ph2) + 0.1 * Math.sin(u * 2.3 + ph2 * 2)));
      }
      for (const [f, fa] of [[1, 0.5], [0.5, 0.6]]) {
        c.beginPath();
        for (let i = 0; i < n; i++) c.lineTo(X(g[i * 2] + NX[i] * 0.5), Y(g[i * 2 + 1] + NY[i] * 0.5));
        for (let i = n - 1; i >= 0; i--) c.lineTo(X(g[i * 2] - NX[i] * WD[i] * f), Y(g[i * 2 + 1] - NY[i] * WD[i] * f));
        c.closePath(); c.fillStyle = rgba(col, a * fa); c.fill();
      }
    }
  };
  plane((nx) => nx > 0.55, -1, 0, 0.34, 0.8, 3.2, pal[3], 0.36);
  plane((nx, ny) => ny < -0.55, 0, 1, isle ? 0.5 : 0.36, 0.6, isle ? 3.4 : 2.4, pal[3], 0.4);
  plane((nx) => nx < -0.55, 1, 0, 0.2, 0.5, 1.6, pal[0], 0.32);
  plane((nx, ny) => ny > 0.55, 0, -1, 0.16, 0.4, 1.1, pal[0], 0.3);
  // 石灰岩：頂上往下的一道道溶溝，雨水沖出來的黑色條紋
  if (pr.groove) {
    const gd = new Path2D(), gl = new Path2D();
    for (let i = 0; i < cells.length; i += 2) {
      const cx = cells[i], cy = cells[i + 1]; if (at(cx, cy + 1)) continue;
      const yT = st.y0 + (cy + 1) * CS, xa = st.x0 + cx * CS;
      for (let x = xa + 0.25 + R() * 0.5; x < xa + CS - 0.15; x += 0.5 + R() * 0.6) {
        const L = 0.8 + R() * 3.4, ex = x + (R() - 0.5) * 0.3;
        gd.moveTo(X(x), Y(yT - 0.1)); gd.quadraticCurveTo(X(x + (R() - 0.5) * 0.25), Y(yT - L * 0.5), X(ex), Y(yT - L));
        gl.moveTo(X(x - 0.17), Y(yT - 0.2)); gl.lineTo(X(ex - 0.17), Y(yT - L * 0.8));
      }
      if (R() < 0.7) { const x = xa + R() * CS, w = 0.35 + R() * 0.6, L = 2 + R() * 4.5; c.fillStyle = lg(c, 0, Y(yT), 0, Y(yT - L), [0, rgba(pal[3], 0.3), 1, rgba(pal[3], 0)]); c.fillRect(X(x - w), Y(yT), w * 2 * s, L * s); }
    }
    c.lineWidth = lw(0.09); c.strokeStyle = rgba(pal[0], 0.45); c.stroke(gl);
    c.lineWidth = lw(0.12); c.strokeStyle = rgba(pal[3], 0.42); c.stroke(gd);
  }
  // 直的岩縫：一道柔柔的暗帶，中間一道深縫，受光的左邊貼一道亮線；還有幾道短短的裂縫
  const cd = new Path2D(), cl = new Path2D(), cb = new Path2D();
  for (let x = bx0 + 0.6 + R() * 2; x < bx1 - 0.4; x += (1.8 + R() * 3.2) / pr.jnt) {
    for (let y = by1 - R() * 3; y > by0 + 0.6;) {
      const L = 2 + R() * 7, lean = (R() - 0.5) * 0.06; let xx = x + (R() - 0.5) * 0.8, yy = y;
      if (R() < 0.8 && inRock(xx, y - L / 2, 0.5)) {
        cd.moveTo(X(xx), Y(yy)); cl.moveTo(X(xx - 0.17), Y(yy)); cb.moveTo(X(xx), Y(yy));
        for (let k = 0; k < L; k += 0.5) { xx += lean + (R() - 0.5) * 0.14; yy -= 0.5; cd.lineTo(X(xx), Y(yy)); cl.lineTo(X(xx - 0.17), Y(yy)); cb.lineTo(X(xx), Y(yy)); }
      }
      y -= L + 0.8 + R() * 4;
    }
  }
  for (let k = 0, n = Math.ceil(area / 40); k < n; k++) {
    let x = lerp(bx0, bx1, R()), y = lerp(by0, by1, R()), a = -Math.PI / 2 + (R() - 0.5) * 1.6;
    if (!inRock(x, y, 0.5)) continue;
    cd.moveTo(X(x), Y(y)); cl.moveTo(X(x - 0.13), Y(y));
    for (let j = 0, m = 2 + ((R() * 3) | 0); j < m; j++) { a += (R() - 0.5) * 1.2; const d = 0.35 + R() * 0.4; x += Math.cos(a) * d; y += Math.sin(a) * d; cd.lineTo(X(x), Y(y)); cl.lineTo(X(x - 0.13), Y(y)); }
  }
  c.lineWidth = lw(0.9); c.strokeStyle = rgba(pal[3], 0.1); c.stroke(cb);
  c.lineWidth = lw(0.12); c.strokeStyle = rgba(pal[0], 0.42); c.stroke(cl);
  c.lineWidth = lw(0.11); c.strokeStyle = rgba(pal[3], 0.55); c.stroke(cd);
  // 岩棚：一道道短短的橫棚，上緣一道亮邊，底下一片影子；草、雪長在上面
  const ledges = [];
  for (let k = 0, n = Math.ceil(area / 12 * pr.ldg); k < n; k++) {
    let x = lerp(bx0, bx1, R()); const y = lerp(by0 + 1.2, by1 - 1.4, R()), a = (R() - 0.5) * 0.12, d = 0.45 + R() * 0.45;
    if (!inRock(x, y, 0.7)) continue;
    // 長度看這裡的岩石多寬（窄的岩柱上，岩棚橫過大半個柱身）
    const wl = span(x, y, -1, 0), wr = span(x, y, 1, 0), L = Math.min(5, (wl + wr) * (0.4 + R() * 0.45));
    x = clamp(x, x - wl + L / 2 - 0.2, x + wr - L / 2 + 0.2);
    const q = []; for (let u = -L / 2; u <= L / 2 + 0.01; u += L / Math.ceil(L / 0.35)) q.push(x + u, sy(x + u, y) - sy(x, y) + y + a * u);
    const n2 = q.length / 2, tp = (i) => smooth(clamp(Math.min(i, n2 - 1 - i) / (n2 * 0.3), 0, 1));
    c.beginPath(); for (let i = 0; i < n2; i++) c.lineTo(X(q[i * 2]), Y(q[i * 2 + 1])); for (let i = n2 - 1; i >= 0; i--) c.lineTo(X(q[i * 2]), Y(q[i * 2 + 1] - d * tp(i)));
    c.closePath(); c.fillStyle = lg(c, 0, Y(y), 0, Y(y - d), [0, rgba(pal[3], 0.42), 1, rgba(pal[3], 0)]); c.fill();
    c.beginPath(); for (let i = 1; i < n2 - 1; i++) c.lineTo(X(q[i * 2]), Y(q[i * 2 + 1] + 0.07)); c.lineWidth = lw(0.14); c.strokeStyle = rgba(pal[0], 0.6); c.stroke();
    c.beginPath(); for (let i = 0; i < n2; i++) c.lineTo(X(q[i * 2]), Y(q[i * 2 + 1] - 0.04)); c.lineWidth = lw(0.08); c.strokeStyle = rgba(pal[3], 0.5); c.stroke();
    ledges.push(q);
  }
  // 嵌在岩壁裡的大石頭：自己亮一點，左上一道亮邊、右下一道影子
  for (let k = 0, n = Math.ceil(area / 38); k < n; k++) {
    const x = lerp(bx0, bx1, R()), y = lerp(by0, by1, R()), r = 0.35 + R() * 0.55, e = 0.6 + R() * 0.3;
    if (!inRock(x, y, r + 0.4)) continue;
    const b = blob(x, y, r, e, 7);
    c.save(); c.translate(s * 0.12, s * 0.14); c.fillStyle = rgba(pal[3], 0.32); c.fill(b); c.restore();
    c.fillStyle = lg(c, 0, Y(y + r * e), 0, Y(y - r * e), [0, mix(pal[1], pal[0], 0.6), 1, mix(pal[1], pal[2], 0.25)]); c.fill(b);
    c.save(); c.clip(b); c.translate(s * 0.1, s * 0.12); c.lineWidth = lw(0.16); c.strokeStyle = rgba(pal[0], 0.6); c.stroke(b); c.restore();
  }
  // 細碎的斑點
  const sp1 = new Path2D(), sp2 = new Path2D();
  for (let k = 0, n = Math.ceil(area * 0.45); k < n; k++) { const x = X(lerp(bx0, bx1, R())), y = Y(lerp(by0, by1, R())), r = lw(0.04 + R() * 0.07, 0.6), P2 = R() < 0.5 ? sp1 : sp2; P2.moveTo(x + r, y); P2.arc(x, y, r, 0, TAU); }
  c.fillStyle = rgba(pal[3], 0.32); c.fill(sp1); c.fillStyle = rgba(pal[0], 0.42); c.fill(sp2);
  // 浮島：草皮底下一層土（跟著頂上的起伏，下緣波浪狀），土裡夾幾顆小石子
  if (isle && pr.soil) for (const q of tops) {
    const g = resample(q, 0.3), n = g.length / 2, ph2 = R() * TAU;
    c.beginPath(); for (let i = 0; i < n; i++) c.lineTo(X(g[i * 2]), Y(g[i * 2 + 1] + 0.3));
    for (let i = n - 1; i >= 0; i--) c.lineTo(X(g[i * 2]), Y(g[i * 2 + 1] - 0.8 - 0.22 * Math.sin(g[i * 2] * 0.9 + ph2) - 0.08 * Math.sin(g[i * 2] * 3.1)));
    c.closePath(); c.fillStyle = lg(c, 0, Y(by1), 0, Y(by1 - 1.3), [0, pr.soil[0], 1, pr.soil[1]]); c.fill();
    c.lineWidth = lw(0.1); c.strokeStyle = rgba(pr.soil[1], 0.9); c.stroke();
    c.fillStyle = rgba(pal[0], 0.6); for (let i = 1; i < n - 1; i++) if (R() < 0.3) { c.beginPath(); c.ellipse(X(g[i * 2] + (R() - 0.5) * 0.3), Y(g[i * 2 + 1] - 0.3 - R() * 0.35), lw(0.07 + R() * 0.08), lw(0.05 + R() * 0.05), 0, 0, TAU); c.fill(); }
  }
  // 岩腳貼著地面的那一截暗一點
  if (pr.foot && onGnd(gy0)) { c.fillStyle = lg(c, 0, Y(2.6), 0, Y(-0.3), [0, rgba(pal[3], 0), 1, rgba(pal[3], pr.foot)]); c.fillRect(X(bx0 - 1), Y(2.6), (bx1 - bx0 + 2) * s, 2.9 * s); }
  // 外框內側一道細細的亮邊（朝左上）、暗邊（朝右下），邊才立得起來
  const LX = -0.55, LY = 0.835, B = [new Path2D(), new Path2D()];
  for (const o of outs) { const p = o.p, n = p.length / 2; for (let i = 0; i < n; i++) { if (o.g[i]) continue; const j = (i + 1) % n, dx = p[j * 2] - p[i * 2], dy = p[j * 2 + 1] - p[i * 2 + 1], d = (dy * LX - dx * LY) / (Math.hypot(dx, dy) || 1); if (Math.abs(d) < 0.2) continue; const P2 = B[d > 0 ? 0 : 1]; P2.moveTo(X(p[i * 2]), Y(p[i * 2 + 1])); P2.lineTo(X(p[j * 2]), Y(p[j * 2 + 1])); } }
  c.lineWidth = lw(0.55); c.strokeStyle = rgba(pal[0], 0.4); c.stroke(B[0]);
  c.lineWidth = lw(0.9); c.strokeStyle = rgba(pal[3], 0.2); c.stroke(B[1]);
  // 浮島的底被底下日出的雲海映亮一道暖邊
  if (isle && pr.glow) { const gp = new Path2D(); for (const q of lows) { gp.moveTo(X(q[0]), Y(q[1])); for (let i = 2; i < q.length; i += 2) gp.lineTo(X(q[i]), Y(q[i + 1])); } c.lineWidth = lw(2.2); c.strokeStyle = rgba(pr.glow, 0.14); c.stroke(gp); c.lineWidth = lw(0.95); c.strokeStyle = rgba(pr.glow, 0.42); c.stroke(gp); }
  c.restore();

  // ---- 描邊（貼著地面的那一段不描） ----
  c.strokeStyle = pal[3]; c.lineWidth = lw(0.3, 1.5); c.beginPath();
  for (const o of outs) { const p = o.p, n = p.length / 2; let pen = false; for (let i = 0; i <= n; i++) { const k = i % n, x = X(p[k * 2]), y = Y(p[k * 2 + 1]); if (pen) c.lineTo(x, y); else c.moveTo(x, y); pen = !o.g[k]; } }
  c.stroke();

  // ---- 頂上：草（往下垂幾撮、草葉、幾朵小花）或積雪（蓬蓬的，邊上掛冰柱）；岩棚上也長一點 ----
  const blades = (x, y, h, n, P3) => { for (let k = 0; k < n; k++) { const bx = X(x + (R() - 0.5) * 0.5), by = Y(y) + 1, bh = s * h * (0.5 + R() * 0.6), w = s * (0.07 + R() * 0.05), ln = (R() - 0.5) * bh * 0.9, P2 = P3[(R() * 3) | 0]; P2.moveTo(bx - w, by); P2.lineTo(bx + ln, by - bh); P2.lineTo(bx + w, by); P2.closePath(); } };
  if (pr.veg === 'grass') {
    const bl = [new Path2D(), new Path2D(), new Path2D()], fl = [];
    for (const q of tops) {
      const g = resample(q, 0.25), n = g.length / 2; if (n < 3) continue;
      const up = [], dn = [];
      for (let i = 0; i < n; i++) { const tp = smooth(clamp(Math.min(i, n - 1 - i) * 0.25 / 0.45, 0, 1)); up.push(tp * (0.08 + R() * 0.07)); dn.push(tp * (0.3 + R() * 0.14)); }
      for (let k = 0; k < n * 0.06; k++) { const i = 2 + ((R() * (n - 4)) | 0), d = 0.25 + R() * 0.5; for (let j = -2; j <= 2; j++) if (i + j > 0 && i + j < n - 1) dn[i + j] += d * (1 - Math.abs(j) / 2.5); }      // 往下垂的幾撮
      const path = (dy) => { c.beginPath(); for (let i = 0; i < n; i++) c.lineTo(X(g[i * 2]), Y(g[i * 2 + 1] + up[i] - dy)); for (let i = n - 1; i >= 0; i--) c.lineTo(X(g[i * 2]), Y(g[i * 2 + 1] - dn[i] - dy)); c.closePath(); };
      let ya = 1e9, yb = -1e9; for (let i = 0; i < n; i++) { ya = Math.min(ya, g[i * 2 + 1] + up[i]); yb = Math.max(yb, g[i * 2 + 1] + up[i]); }
      path(0.16); c.fillStyle = rgba(pal[3], 0.32); c.fill();
      path(0); c.fillStyle = lg(c, 0, Y(yb), 0, Y(ya - 0.75), [0, G[0], 0.35, G[1], 1, G[2]]); c.fill();
      c.lineWidth = lw(0.1); c.strokeStyle = rgba(G[2], 0.8); c.stroke();
      for (let i = 1; i < n - 1; i++) {
        const tp = smooth(clamp(Math.min(i, n - 1 - i) * 0.25 / 0.6, 0, 1)); if (R() < 0.3 || tp < 0.2) continue;
        blades(g[i * 2], g[i * 2 + 1] + up[i] - 0.05, (0.24 + R() * 0.32) * tp, 1 + ((R() * 2) | 0), bl);
        if (R() < 0.05) fl.push(g[i * 2], g[i * 2 + 1] + up[i] + 0.15 + R() * 0.2);
      }
    }
    for (const q of ledges) if (R() < 0.3) { const n2 = q.length / 2, i = 1 + ((R() * (n2 - 2)) | 0); blades(q[i * 2], q[i * 2 + 1] + 0.04, 0.32, 3 + ((R() * 3) | 0), bl); }
    c.fillStyle = G[2]; c.fill(bl[0]); c.fillStyle = G[1]; c.fill(bl[1]); c.fillStyle = G[0]; c.fill(bl[2]);
    for (let i = 0; i < fl.length; i += 2) { c.fillStyle = R() < 0.6 ? '#ffffff' : R() < 0.5 ? '#ffd0e4' : '#ffe27a'; c.beginPath(); c.arc(X(fl[i]), Y(fl[i + 1]), lw(0.13), 0, TAU); c.fill(); c.fillStyle = '#e8a83a'; c.beginPath(); c.arc(X(fl[i]), Y(fl[i + 1]), lw(0.05), 0, TAU); c.fill(); }
  } else if (pr.veg === 'snow') {
    const icicle = (x, y, L, w) => { c.beginPath(); c.moveTo(X(x - w), Y(y)); c.quadraticCurveTo(X(x - w * 0.3), Y(y - L * 0.45), X(x), Y(y - L)); c.quadraticCurveTo(X(x + w * 0.3), Y(y - L * 0.45), X(x + w), Y(y)); c.closePath(); c.fillStyle = lg(c, X(x - w), 0, X(x + w), 0, [0, '#ffffff', 0.55, '#d6eafa', 1, '#9cc0e4']); c.fill(); c.lineWidth = lw(0.08); c.strokeStyle = '#7f9cc4'; c.stroke(); };
    // 一條蓬蓬的積雪：沿著 g（由右往左的點），上緣鼓 up(i)、下緣垂 dn(i)，邊緣用圓滑的曲線
    const cap = (g, up, dn) => {
      const n = g.length / 2, P2 = [];
      for (let i = 0; i < n; i++) P2.push(g[i * 2], g[i * 2 + 1] + up(i));
      for (let i = n - 1; i >= 0; i--) P2.push(g[i * 2], g[i * 2 + 1] - dn(i));
      const path = (dy) => { const m = P2.length / 2, mx = (i) => (X(P2[(i % m) * 2]) + X(P2[((i + 1) % m) * 2])) / 2, my = (i) => (Y(P2[(i % m) * 2 + 1]) + Y(P2[((i + 1) % m) * 2 + 1])) / 2 + dy; c.beginPath(); c.moveTo(mx(0), my(0)); for (let i = 1; i <= m; i++) c.quadraticCurveTo(X(P2[(i % m) * 2]), Y(P2[(i % m) * 2 + 1]) + dy, mx(i), my(i)); c.closePath(); };
      let ya = 1e9; for (let i = 1; i < P2.length; i += 2) ya = Math.min(ya, P2[i]);
      path(s * 0.2); c.fillStyle = 'rgba(30,50,90,.25)'; c.fill();
      path(0); c.fillStyle = lg(c, 0, Y(ya + 0.6), 0, Y(ya - 0.4), [0, '#ffffff', 0.55, '#eef5fd', 1, '#c4d7ee']); c.fill();
      c.lineWidth = lw(0.2, 1.2); c.strokeStyle = '#7f9cc4'; c.stroke();
    };
    for (const q of tops) {
      const g = resample(q, 0.25), n = g.length / 2; if (n < 3) continue;
      const ph2 = R() * TAU, tp = (i) => smooth(clamp(Math.min(i, n - 1 - i) * 0.25 / 0.8, 0, 1)), dn = []; for (let i = 0; i < n; i++) dn.push(0.22 + tp(i) * 0.14 + (1 - tp(i)) * 0.3 + R() * 0.06);
      cap(g, (i) => tp(i) * (0.48 + 0.14 * Math.sin(g[i * 2] * 1.7 + ph2) + 0.07 * Math.sin(g[i * 2] * 4.1)) + 0.05, (i) => dn[i]);
      c.fillStyle = '#ffffff'; for (let i = 2; i < n - 2; i++) if (R() < 0.12) { c.beginPath(); c.arc(X(g[i * 2]), Y(g[i * 2 + 1] + 0.15), lw(0.06), 0, TAU); c.fill(); }
      // 積雪的兩頭垂下一兩根冰柱
      for (const i of [0, n - 1]) if (R() < 0.85) icicle(g[i * 2] + (i ? 0.14 : -0.14), g[i * 2 + 1] - dn[i] + 0.08, 0.4 + R() * 0.5, 0.12 + R() * 0.06);
    }
    // 岩棚上積一點雪
    for (const q of ledges) if (R() < 0.8) {
      const n2 = q.length / 2, up = (i) => smooth(clamp(Math.min(i, n2 - 1 - i) / (n2 * 0.35), 0, 1)) * 0.2 + 0.02;
      c.beginPath(); for (let i = 0; i < n2; i++) c.lineTo(X(q[i * 2]), Y(q[i * 2 + 1] + up(i))); for (let i = n2 - 1; i >= 0; i--) c.lineTo(X(q[i * 2]), Y(q[i * 2 + 1] - 0.05));
      c.closePath(); c.fillStyle = 'rgba(250,253,255,.95)'; c.fill();
    }
    // 岩簷底下掛冰柱（靠外緣多一點）
    for (const q of lows) {
      const g = resample(q, 0.3), n = g.length / 2;
      for (let i = 1; i < n - 1; i++) { const e = Math.min(i, n - 1 - i) * 0.3; if (R() < (e < 1.2 ? 0.45 : 0.08)) icicle(g[i * 2], g[i * 2 + 1] + 0.08, 0.35 + R() * 0.75, 0.1 + R() * 0.08); }
    }
    // 岩腳積著一堆雪，跟地上的雪接起來
    for (const o of outs) {
      const p = o.p, n = p.length / 2;
      for (let i = 0; i < n; i++) {
        if (!o.g[i]) continue;
        const j = (i + 1) % n, xa = Math.min(p[i * 2], p[j * 2]) - 0.5, xb = Math.max(p[i * 2], p[j * 2]) + 0.5, ph2 = R() * TAU, m = Math.max(4, Math.ceil((xb - xa) / 0.5)), q = [];
        for (let k = 0; k <= m; k++) { const u = k / m, x = lerp(xa, xb, u); q.push(x, -0.1 + Math.pow(Math.sin(Math.PI * u), 0.6) * (0.55 + 0.18 * Math.sin(x * 2.3 + ph2))); }
        const top = () => { c.beginPath(); c.moveTo(X(xa), Y(-0.35)); for (let k = 0; k < q.length; k += 2) c.lineTo(X(q[k]), Y(q[k + 1])); c.lineTo(X(xb), Y(-0.35)); c.closePath(); };
        top(); c.fillStyle = lg(c, 0, Y(0.8), 0, Y(-0.3), [0, '#ffffff', 0.6, '#e8f1fb', 1, '#cddcee']); c.fill();
        c.beginPath(); for (let k = 0; k < q.length; k += 2) c.lineTo(X(q[k]), Y(q[k + 1])); c.lineWidth = lw(0.16); c.strokeStyle = 'rgba(127,156,196,.75)'; c.stroke();
      }
    }
  }
  // ---- 浮島邊上、岩簷邊上垂下來的藤（從草皮底下長出來） ----
  if (pr.veg === 'grass') {
    const vn = new Path2D(), lf = [new Path2D(), new Path2D()];
    for (const q of tops) for (const end of [0, 1]) {
      if (R() < (isle ? 0.05 : 0.5)) continue;
      const g = resample(q, 0.25), n = g.length / 2; if (n < 6) continue;
      for (let v = 0, nv = isle ? 2 + ((R() * 2) | 0) : 1; v < nv; v++) {
        // 外框上的點是由右往左排的：開頭那一端在右邊，藤往右垂；尾巴那一端往左
        const i = end ? n - 2 - ((R() * Math.min(6, n / 3)) | 0) : 1 + ((R() * Math.min(6, n / 3)) | 0), x = g[i * 2], y = g[i * 2 + 1] - 0.2, L = (isle ? 1.2 : 0.8) + R() * (isle ? 1.8 : 1.2), d = end ? -1 : 1;
        const b1 = d * 0.35, b2 = d * (0.1 + R() * 0.3), b3 = d * (0.2 + R() * 0.3), bz = (t, a0, a1, a2) => 3 * t * (1 - t) * (1 - t) * a0 + 3 * t * t * (1 - t) * a1 + t * t * t * a2;
        vn.moveTo(X(x), Y(y)); vn.bezierCurveTo(X(x + b1), Y(y - L * 0.3), X(x + b2), Y(y - L * 0.7), X(x + b3), Y(y - L));
        for (let t = 0.25; t < 1; t += 0.22 + R() * 0.12) { const lx = x + bz(t, b1, b2, b3), ly = y - L * bz(t, 0.3, 0.7, 1), sd = R() < 0.5 ? -1 : 1, P2 = lf[(R() * 2) | 0]; const ex = X(lx + sd * 0.16), ey = Y(ly - 0.04), rx = lw(0.17); P2.moveTo(ex + rx * Math.cos(sd * 0.5), ey + rx * Math.sin(sd * 0.5)); P2.ellipse(ex, ey, rx, lw(0.08), sd * 0.5, 0, TAU); }
      }
    }
    c.lineWidth = lw(0.07); c.strokeStyle = G[2]; c.stroke(vn); c.fillStyle = G[1]; c.fill(lf[0]); c.fillStyle = G[0]; c.fill(lf[1]);
  }
}
// 屋內的暗色背景：整座城畫成一張圖，之後每一幀只貼還看得到的那幾格
function backSprite(st) {
  const T = V.T; if (st._bk && st._bkT === T) return st._bk;
  const { cols, rows, cellK } = st, cv = mkCanvas(cols * T, rows * T), c = cv.getContext('2d'), P = SKINS[st.skin] || SKINS.blue, lw = Math.max(1, T * 0.04);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const k = cellK[cy * cols + cx]; if (!k || k === 3) continue;
    const x = cx * T, y = (rows - 1 - cy) * T;
    c.fillStyle = lg(c, 0, y, 0, y + T, [0, P.panel[0], 1, P.panel[1]]); c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    // 內牆的磚縫
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x, y + T * 0.5, T, lw);
    c.fillRect(x + ((cx + cy) & 1 ? T * 0.5 : T * 0.02), y, lw, T * 0.5); c.fillRect(x + ((cx + cy) & 1 ? T * 0.02 : T * 0.5), y + T * 0.5, lw, T * 0.5);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x, y, T, lw);
  }
  // 站著兵的房間：牆上一盞燈
  for (const sl of st.slots) {
    const x = (sl.cx + 0.5) * T, y = (rows - 1 - sl.cy + 0.34) * T;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, x, y, 0, T * 1.5, [0, 'rgba(255,214,140,.30)', 0.5, 'rgba(255,190,110,.10)', 1, 'rgba(255,180,90,0)']); c.fillRect(x - T * 1.5, y - T * 1.5, T * 3, T * 3);
    c.globalCompositeOperation = 'source-over';
  }
  st._bk = cv; st._bkT = T; return cv;
}
function drawBackdrop(c, st, rdt) {
  const { cols, rows, back, backTo, n } = st; if (!n || st.side > 1 || (st.def && st.def.swingy)) return;          // 吊著會盪的殿：屋裡不畫暗色（殿在晃，畫在原位的暗色會對不上）
  let any = false; const k = Math.min(1, rdt * 7);
  for (let i = 0; i < n; i++) { let v = back[i]; const to = backTo[i]; if (v !== to) { v += (to - v) * k; if (Math.abs(v - to) < 0.03) v = to; back[i] = v; } if (v > 0) any = true; }
  if (!any) return;
  if (st.plat && !platXform(c, st.plat)) return;
  // 吊籠裡面那幾格不畫（籠子會沉、會掉，畫在原位的暗色會留在半空中；籠子自己畫了暗色的底）
  if (st.parts && !st.partMask) { st.partMask = new Uint8Array(n); for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) { const x = st.x0 + (cx + 0.5) * CS, y = st.y0 + (cy + 0.5) * CS; for (const P of st.parts) if (x > P.xa && x < P.xb && y > P.ya && y < P.yb) st.partMask[cy * cols + cx] = 1; } }
  const pm = st.partMask, bv = (i) => (pm && pm[i] ? 0 : back[i]);
  const sp = backSprite(st), T = V.T, bx = X(st.x0), by = Y(st.y1);
  for (let cy = 0; cy < rows; cy++) {
    const sy = (rows - 1 - cy) * T; let cx = 0;
    while (cx < cols) {
      const v = bv(cy * cols + cx); if (v <= 0) { cx++; continue; }
      let e = cx + 1; while (e < cols && Math.abs(bv(cy * cols + e) - v) < 0.01) e++;
      c.globalAlpha = v; c.drawImage(sp, cx * T, sy, (e - cx) * T, T, bx + cx * T, by + sy, (e - cx) * T, T);
      cx = e;
    }
  }
  c.globalAlpha = 1;
  if (st.plat) c.restore();
}
/* ---------- 浮島、戰船 ---------- */
// 畫布換到浮島（船）自己的座標：之後照開場時的位置畫，畫出來就跟著它現在的位置、角度。回傳 false 表示已經不在了
function platXform(c, P) {
  if (P.dead || !P.body) return false;
  const p = P.body.getPosition(), a = P.body.getAngle() - P.a0;
  c.save(); c.translate(X(p.x), Y(p.y)); c.rotate(-a); c.translate(-X(P.x0), -Y(P.y0));
  return true;
}
function drawPlats(c, t) {
  const s = V.s;
  for (const P of S.plats) {
    if (P.dead) continue;
    const st = P.st;
    if (P.kind === 'cage' || P.kind === 'pan') { drawPart(c, P, t, false); continue; }
    if (P.kind === 'island') {
      // 吊著浮島的繩子（畫在島的後面）
      for (const o of P.teth) {
        if (o.hp <= 0) continue;
        const wp = P.body.getWorldPoint(o.lp), by = o.y + Math.sin(t * 1.3 + o.ph) * 0.35 - o.r * 0.92;
        c.strokeStyle = '#3a2a16'; c.lineWidth = Math.max(1.5, s * 0.36); c.beginPath(); c.moveTo(X(wp.x), Y(wp.y)); c.lineTo(X(o.x), Y(by)); c.stroke();
        c.strokeStyle = o.flash > 0 ? '#fff6d0' : '#c9a05e'; c.lineWidth = Math.max(1, s * 0.18); c.stroke();
      }
      // 浮島本身（岩錐、草皮、鐘乳石、樹根、藤都在 drawRock 裡）只畫一次：四邊多留一點給草和藤，底下再多留一點給鐘乳石和樹根。
      // 貼的位置每一幀照島的左上角（戰場座標）重算：畫面只是平移、比例尺沒變的時候不用重畫，也不會貼歪
      const key = V.T + '|' + V.s;
      if (!P._rk || P._rkKey !== key) {
        const pad = Math.ceil(s * 1.6) + 2, x0 = Math.floor(X(P.xa)) - pad, y0 = Math.floor(Y(P.yb)) - pad, cv = mkCanvas((P.xb - P.xa) * s + pad * 2, (P.yb - P.ya + 2.4) * s + pad * 2), k = cv.getContext('2d');
        k.translate(-x0, -y0); drawRock(k, st, P.cells);
        P._rk = cv; P._rkKey = key; P._rkP = pad;
      }
      if (platXform(c, P)) { c.drawImage(P._rk, Math.floor(X(P.xa)) - P._rkP, Math.floor(Y(P.yb)) - P._rkP); c.restore(); }
      continue;
    }
    // 戰船：船身一個艙一個艙畫，進水的艙顏色變深、裡面的水越來越高
    const body = P.body, p = body.getPosition(), a = body.getAngle(), Pk = SKINS[st.skin] || SKINS.blue, wd = Pk.wood;
    c.save(); c.translate(X(p.x), Y(p.y)); c.rotate(-a);
    const path = (q) => { c.beginPath(); c.moveTo(q[0] * s, -q[1] * s); for (let i = 2; i < q.length; i += 2) c.lineTo(q[i] * s, -q[i + 1] * s); c.closePath(); };
    let ylo = 1e9, yhi = -1e9; for (let i = 1; i < P.hull.length; i += 2) { ylo = Math.min(ylo, P.hull[i]); yhi = Math.max(yhi, P.hull[i]); }
    for (const cp of P.comps) {
      path(cp.pts); c.fillStyle = lg(c, 0, -yhi * s, 0, -ylo * s, [0, wd[0], 0.18, wd[1], 0.75, wd[2], 1, '#2a160a']); c.fill();
      c.save(); path(cp.pts); c.clip();
      // 船板
      c.strokeStyle = 'rgba(30,14,6,.45)'; c.lineWidth = Math.max(1, s * 0.16);
      for (let y = ylo + 1.1; y < yhi; y += 1.1) { c.beginPath(); c.moveTo(-60 * s, -y * s); c.lineTo(60 * s, -y * s); c.stroke(); }
      // 進水：艙裡的水（在船身上畫一片深藍）
      if (cp.flood > 0.02) { const fy = lerp(ylo, yhi, cp.flood * 0.9); c.fillStyle = 'rgba(20,60,110,.55)'; c.fillRect(-60 * s, -fy * s, 120 * s, (fy - ylo + 1) * s); }
      // 被打穿的洞
      const dmg = 1 - cp.hp / cp.hm;
      if (dmg > 0.3) { const q = polyCentroid(cp.pts), R = mkRand(cp.k * 31 + 5), n = dmg > 0.75 ? 3 : dmg > 0.5 ? 2 : 1; c.fillStyle = '#120804'; for (let k = 0; k < n; k++) { const hx = q[0] + (R() - 0.5) * 6, hy = lerp(ylo, yhi, 0.45 + R() * 0.4); ell(c, hx * s, -hy * s, s * (0.7 + R() * 0.5), s * (0.5 + R() * 0.3)); c.fill(); } }
      if (cp.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + (cp.flash * 0.45) + ')'; c.fillRect(-60 * s, -yhi * s, 120 * s, (yhi - ylo) * s); }
      c.restore();
    }
    // 船舷的飾帶、外框
    path(P.hull); c.strokeStyle = Pk.ink; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke();
    c.fillStyle = Pk.trim; c.fillRect(P.hull.reduce((m, v, i) => (i & 1 ? m : Math.min(m, v)), 1e9) * s, -yhi * s, (P.xb - P.xa) * s, Math.max(2, s * 0.42));
    c.fillStyle = '#e04a2c'; c.fillRect(P.hull.reduce((m, v, i) => (i & 1 ? m : Math.min(m, v)), 1e9) * s, -(yhi - 0.9) * s, (P.xb - P.xa) * s, Math.max(1.5, s * 0.3));
    c.restore();
  }
}
/* ---------- 吊籠寨：鐵籠、配重桶、滑輪 ---------- */
// front：畫在兵前面的那幾根鐵條（兵站在籠子裡）
function drawPart(c, P, t, front) {
  const s = V.s, st = P.st;
  if (!front && P.kind === 'cage') {
    // 滑輪和兩個輪子之間那一段鋼纜（吊籠上面那一段是 S.ropes 裡的 cable，另外畫）
    const PU = st.pulley;
    if (PU) {
      const pa = PU.pan.body.getWorldPoint(PU.lp);
      if (!PU.cut) { ropeLine(c, X(PU.ax), Y(PU.ay), X(PU.bx), Y(PU.by), 0, 'chain', 0, 0); ropeLine(c, X(PU.bx), Y(PU.by), X(pa.x), Y(pa.y), 0, 'chain', 0, 0); }
      for (const [wx, wy] of [[PU.ax, PU.ay], [PU.bx, PU.by]]) {
        const x = X(wx), y = Y(wy) + s * 0.7, r = s * 1.05, a = PU.mode === 'free' ? -PU.cage.body.getPosition().y * 0.8 : 0;
        c.fillStyle = '#2c2833'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = '#8a8496'; c.lineWidth = Math.max(1, s * 0.22); c.stroke();
        c.strokeStyle = '#5a5464'; c.lineWidth = Math.max(1, s * 0.16); c.beginPath(); for (let k = 0; k < 3; k++) { const q = a + k * TAU / 3; c.moveTo(x, y); c.lineTo(x + Math.cos(q) * r * 0.9, y + Math.sin(q) * r * 0.9); } c.stroke();
        c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(x, y, r * 0.25, 0, TAU); c.fill();
      }
    }
  }
  if (!platXform(c, P)) return;
  if (P.kind === 'cage') {
    const x0 = X(P.xa), x1 = X(P.xb), y0 = Y(P.yb), y1 = Y(P.ya), th = s * 0.75, n = Math.round((P.xb - P.xa) / 1.15);
    if (!front) {
      // 籠子的底板、頂板（厚鐵板）、兩邊的粗鐵條、後面一排細鐵條（暗一點）
      c.fillStyle = 'rgba(20,16,26,.35)'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
      c.strokeStyle = '#3a3440'; c.lineWidth = Math.max(1, s * 0.16); c.beginPath(); for (let k = 1; k < n; k++) { const x = lerp(x0, x1, k / n) + s * 0.25; c.moveTo(x, y0 + th); c.lineTo(x, y1 - th); } c.stroke();
      for (const [ya, yb] of [[y0, y0 + th], [y1 - th * 1.3, y1]]) { c.fillStyle = lg(c, 0, ya, 0, yb, [0, '#6a6474', 0.5, '#3a3442', 1, '#1c1822']); c.fillRect(x0, ya, x1 - x0, yb - ya); c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.16); c.strokeRect(x0, ya, x1 - x0, yb - ya); for (let k = 0; k < n + 1; k++) { c.fillStyle = '#c9c0d4'; c.beginPath(); c.arc(lerp(x0 + s * 0.4, x1 - s * 0.4, k / n), (ya + yb) / 2, s * 0.13, 0, TAU); c.fill(); } }
      for (const x of [x0 + s * 0.3, x1 - s * 0.3]) { c.strokeStyle = '#1c1822'; c.lineWidth = s * 0.62; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); c.strokeStyle = '#6a6474'; c.lineWidth = s * 0.3; c.stroke(); }
      // 頂上的吊環
      c.strokeStyle = '#3a3440'; c.lineWidth = Math.max(1.2, s * 0.3); c.beginPath(); c.arc((x0 + x1) / 2, y0 - s * 0.4, s * 0.55, Math.PI, TAU); c.stroke();
    } else {
      // 前面一排細鐵條（畫在兵前面）
      c.strokeStyle = 'rgba(40,34,48,.85)'; c.lineWidth = Math.max(1, s * 0.2); c.beginPath(); for (let k = 1; k < n; k++) { const x = lerp(x0, x1, k / n); c.moveTo(x, y0 + th); c.lineTo(x, y1 - th * 1.3); } c.stroke();
      c.strokeStyle = 'rgba(200,190,215,.35)'; c.lineWidth = Math.max(1, s * 0.07); c.stroke();
    }
  } else if (P.kind === 'pan' && !front) {
    // 配重桶：木桶、兩道鐵箍
    const x0 = X(P.xa), x1 = X(P.xb), y0 = Y(P.yb), y1 = Y(P.ya), w = x1 - x0;
    c.fillStyle = lg(c, x0, 0, x1, 0, [0, '#5a3a1e', 0.35, '#8a5c30', 0.7, '#6e4624', 1, '#3e2612']); c.fillRect(x0, y0 + s * 0.2, w, y1 - y0 - s * 0.2);
    c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.2); c.strokeRect(x0, y0 + s * 0.2, w, y1 - y0 - s * 0.2);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x0 + s * 0.3, y0 + s * 0.2, w - s * 0.6, (y1 - y0) * 0.55);
    for (const f of [0.18, 0.82]) { const y = lerp(y0, y1, f); c.fillStyle = '#3a3440'; c.fillRect(x0 - s * 0.1, y - s * 0.22, w + s * 0.2, s * 0.44); c.fillStyle = '#8a8496'; c.fillRect(x0 - s * 0.1, y - s * 0.22, w + s * 0.2, s * 0.1); }
    // 桶蓋：一塊厚木板，中間一個鐵環掛在鋼纜上
    c.fillStyle = lg(c, 0, y0, 0, y0 + s * 0.62, [0, '#a0703c', 0.5, '#7a5028', 1, '#4a2e14']); c.fillRect(x0 - s * 0.18, y0, w + s * 0.36, s * 0.62);
    c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.18); c.strokeRect(x0 - s * 0.18, y0, w + s * 0.36, s * 0.62);
    c.strokeStyle = '#3a3440'; c.lineWidth = Math.max(1.2, s * 0.26); c.beginPath(); c.arc((x0 + x1) / 2, y0 - s * 0.05, s * 0.4, Math.PI, TAU); c.stroke();
  }
  c.restore();
}
/* ---------- 引信 ---------- */
function drawFuses(c, t) {
  const s = V.s;
  for (let k = 0; k < 2; k++) {
    const F = S.st[k] && S.st[k].fuse; if (!F) continue;
    c.lineCap = 'round'; c.lineJoin = 'round';
    // 還沒燒的引信：深色的繩子；燒過的：一條灰白的灰，幾秒後散掉。貼著的那塊磚垮了、移位了，那一段就不畫
    const seg = (i0, i1, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (let i = i0; i <= i1; i++) { const p = fusePt(F, i * 0.25); if (i === i0) c.moveTo(X(p.x), Y(p.y)); else c.lineTo(X(p.x), Y(p.y)); } c.stroke(); };
    // 每一小段的樣子：0 不畫、1 還沒燒、2 燒過的灰（灰再分幾檔透明度，同一檔的連成一筆畫）
    const look = (i) => !fuseOn(F, i) || !fuseOn(F, i + 1) ? 0 : !F.bin[i] ? 1 : Math.min(9, 2 + Math.floor((S.time - F.bT[i]) / 0.5));
    let i = 0; const n = F.bin.length;
    while (i < n - 1) {
      const b = look(i); let e = i + 1; while (e < n - 1 && look(e) === b) e++;
      if (b === 1) { seg(i, e, '#2a1a10', Math.max(1.5, s * 0.42)); seg(i, e, '#b98a4a', Math.max(1, s * 0.18)); }
      else if (b >= 2 && b < 9) seg(i, e, `rgba(70,64,60,${(0.8 * (1 - (b - 2) / 7)).toFixed(2)})`, Math.max(1, s * 0.22));
      i = e;
    }
    // 引信頭：露在城外的那一截，閃一點火光提示（還沒點著才閃）
    if (!F.fronts.length && !F.done && !F.bin[0] && fuseOn(F, 0)) { const g = glowSprite(C_GOLD), r = s * (1.3 + 0.3 * Math.sin(t * 5 + k)); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.drawImage(g, X(F.x[0]) - r, Y(F.y[0]) - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    // 燒著的火頭
    for (const f of F.fronts) {
      const p = fusePt(F, f.s), x = X(p.x), y = Y(p.y), r = s * (1.5 + 0.4 * Math.sin(t * 30 + f.s));
      c.globalCompositeOperation = 'lighter'; c.drawImage(glowSprite(C_ORANGE), x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2); c.drawImage(glowSprite(C_WHITEHOT), x - r * 0.6, y - r * 0.6, r * 1.2, r * 1.2); c.globalCompositeOperation = 'source-over';
      if ((RD.frame & 1) === 0) part(P_SPARK, p.x, p.y, rndS() * 16, 6 + Math.random() * 12, 0.3, 0.4, Math.random() < 0.5 ? C_GOLD : C_WHITEHOT);
      if ((RD.frame & 7) === 0) part(P_SMOKE, p.x, p.y, rndS() * 2, 4, 0.7, 0.9, C_GRAY);
    }
  }
}
const _noBlock = { h: 0 };
/* 帥旗：插在城樓最高、還站在原位的那一塊上（屋瓦優先）。那一塊被打掉了，旗子飛出去，城樓剩下的最高處再升起一面；
   城破的那一刻旗子飛出去，就不再升起來 */
function flagPick(st) {
  let best = null, top = -1e9;
  for (const b of st.blocks) { if (b.dead || b.frag || b.prop || !b.inPlace || b.lost || !(b.wt > 0)) continue; const y = b.y0 + b.h / 2 + (b.kind === 'roof' ? 0.6 : 0); if (y > top + 0.1 || (Math.abs(y - top) <= 0.1 && best && Math.abs(b.x0 - st.cx) < Math.abs(best.x0 - st.cx))) { best = b; top = y; } }
  return best;
}
function flagFling(st, b) { const p = b && b.body ? b.body.getPosition() : b ? { x: b.x, y: b.y } : { x: st.cx, y: st.y1 }; FX.flung.push({ flag: st, x: p.x, y: p.y + (b ? b.h / 2 : 0), vx: rndS() * 9, vy: 15 + Math.random() * 9, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3), t: 0 }); }
function flagBlock(st) {
  if (st._flagGone) return null;
  const fell = S.state !== 'play' && S.loser === st.side;
  let b = st._flagB;
  if (b === undefined) { b = st._flagB = flagPick(st); st._flagT = -9; }
  else if (fell || !b || b.dead || !b.inPlace || b.lost) {
    if (b && !st._flagOff) flagFling(st, b);
    if (fell) { st._flagGone = 1; return null; }
    const nb = flagPick(st); if (nb !== b) { st._flagB = nb; st._flagT = RD.t; st._flagOff = 0; } else st._flagOff = 1;
    b = nb;
  }
  return b;
}
function drawFlag(c, st, b, t) {
  // 在這塊屋瓦自己的座標裡畫（原點是屋瓦中心，y 往下）
  const s = V.s, P = SKINS[st.skin] || SKINS.blue, py = -b.h * s / 2, up = b === _noBlock ? 1 : smooth(clamp((RD.t - (st._flagT || -9)) / 0.6, 0, 1)), ph = s * 5.6 * up, wind = S.wind;          // up：新升起來的旗子，旗桿從底下慢慢升上來
  if (up <= 0.02) return;
  const dir = wind > 1 ? 1 : wind < -1 ? -1 : (st.side === 0 ? 1 : -1), amp = 0.18 + Math.min(0.5, Math.abs(wind) * 0.03), sp = 5 + Math.abs(wind) * 0.3;
  c.strokeStyle = '#3a2a1c'; c.lineWidth = Math.max(1.5, s * 0.36); c.lineCap = 'round'; c.beginPath(); c.moveTo(0, py); c.lineTo(0, py - ph); c.stroke();
  c.fillStyle = P.trim; c.beginPath(); c.arc(0, py - ph, s * 0.45, 0, TAU); c.fill();
  const fw = s * 4.4, fh = s * 2.5, y0 = py - ph + s * 0.3; c.beginPath(); c.moveTo(0, y0);
  for (let k = 1; k <= 6; k++) { const u = k / 6; c.lineTo(dir * fw * u, y0 + Math.sin(t * sp - u * 5) * fh * amp * u); }
  for (let k = 6; k >= 0; k--) { const u = k / 6; c.lineTo(dir * fw * u * (k === 6 ? 0.82 : 1), y0 + fh * (1 - u * 0.25) + Math.sin(t * sp - u * 5) * fh * amp * u); }
  c.closePath(); c.fillStyle = lg(c, 0, 0, dir * fw, 0, [0, P.flag, 1, P.flagDk]); c.fill(); c.strokeStyle = P.ink; c.lineWidth = Math.max(1, s * 0.2); c.stroke();
}
// 一塊磚的冰藍剪影（變脆的磚罩在上面用），跟著那張貼圖一起留著
function frostSprite(sp) {
  if (sp.frost) return sp.frost;
  const cv = mkCanvas(sp.cv.width, sp.cv.height), c = cv.getContext('2d');
  c.drawImage(sp.cv, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#9fdcff'; c.fillRect(0, 0, cv.width, cv.height);
  sp.frost = cv; return cv;
}
// 每一塊磚：照它現在的位置和角度貼上去
// hp：只畫吊著的鐘、燈、石籃（畫在兵的前面：魔王頭頂的吊燈才不會被他的身體蓋住）
function drawBlocks(c, t, rdt, hp) {
  const s = V.s, sx = FX.shx, sy = FX.shy, burn = RD.burn; burn.length = 0;
  const f0 = hp ? null : flagBlock(S.st[0]), f1 = hp ? null : flagBlock(S.st[1]);
  for (const b of S.blocks) {
    if (b.dead || !b.hang !== !hp) continue;
    const p = b.body.getPosition(), a = b.body.getAngle(), seg = b.seg, f = seg ? 1 : b.hp / b.hm;
    if (b.hot > 0) { b.hot -= rdt * 0.22; if (b.hot < 0) b.hot = 0; }
    const ds = b.mat === M_KEG || b.mat === M_ROCK ? 0 : f > 0.66 ? 0 : f > 0.33 ? 1 : 2, sp = b.frag ? fragSprite(b) : blockSprite(b, ds);
    if (a === 0) c.setTransform(1, 0, 0, 1, X(p.x) + sx, Y(p.y) + sy);
    else { const cs = Math.cos(a), sn = Math.sin(a); c.setTransform(cs, -sn, sn, cs, X(p.x) + sx, Y(p.y) + sy); }
    if (b === f0 || b === f1) drawFlag(c, b.st, b, t);
    c.drawImage(sp.cv, -sp.ax, -sp.ay);
    if (seg) {
      /* 長樑、樓板一段一段畫：哪一段受傷，裂痕、燻黑、挨打的那一下閃光就只畫在那一段
         （裂痕另外有一張只有裂紋的透明貼圖；燻黑和閃光是把原圖那一段再疊一次） */
      const n = b.cw, wpx = b.w * s, pad = sp.ax - wpx / 2, cell = wpx / n, H = sp.cv.height, soot = b.sootS, fl = b.flash > 0 ? b.flashM : 0;
      let cr = null;
      for (let k = 0; k < n; k++) {
        const r = seg[k] / b.segM, so = soot && !FX.low ? soot[k] : 0, f1 = (fl >> k) & 1;
        if (r > 0.66 && so <= 0.05 && !f1) continue;
        const x0 = k === 0 ? 0 : Math.round(pad + k * cell), x1 = k === n - 1 ? sp.cv.width : Math.round(pad + (k + 1) * cell), w0 = x1 - x0;
        if (so > 0.05) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = Math.min(SOOT_MAX, so * SOOT_MAX); c.drawImage(sp.cv, x0, 0, w0, H, x0 - sp.ax, -sp.ay, w0, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
        if (r <= 0.66) { if (!cr) cr = blockSprite(b, 3); c.drawImage(cr.cv, x0, 0, w0, H, x0 - sp.ax, -sp.ay, w0, H); if (r <= 0.33) c.drawImage(cr.cv, sp.cv.width - x1, 0, w0, H, x0 - sp.ax, -sp.ay, w0, H); }
        if (f1) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, b.flash) * 0.55; c.drawImage(sp.cv, x0, 0, w0, H, x0 - sp.ax, -sp.ay, w0, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
      }
      if (b.flash > 0) { b.flash = Math.max(0, b.flash - rdt * 5); if (b.flash <= 0) b.flashM = 0; }
    } else {
      if (b.soot > 0.05 && !FX.low) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = Math.min(SOOT_MAX, b.soot * SOOT_MAX); c.drawImage(sp.cv, -sp.ax, -sp.ay); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
      if (b.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, b.flash) * 0.55; c.drawImage(sp.cv, -sp.ax, -sp.ay); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; b.flash = Math.max(0, b.flash - rdt * 5); }
    }
    // 被冰術士打到、變脆的磚：罩一層淡淡的冰藍（不是整塊變白）
    if (b.brit > 0 && !b.frag) { const fr = frostSprite(sp); c.globalAlpha = 0.34; c.drawImage(fr, -sp.ax, -sp.ay); c.globalAlpha = 1; }
    // 避雷針：頂上一顆亮點（雷就是劈在這裡）
    if (b.rod) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 + 0.3 * Math.sin(t * 6 + b.id) + (b.flash > 0 ? 0.5 : 0); const g = glowSprite(C_YELLOW), r = V.T * 0.45; c.drawImage(g, -r, -sp.ay + sp.ax * 0 - r * 0.2 - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    // 魔晶：紫紅色的光一脹一縮
    if (b.core) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.4 + 0.25 * Math.sin(t * 3 + b.id); const g = glowSprite(C_PINK), r = V.T * 1.15; c.drawImage(g, -r, -r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    // 共鳴晶柱：一閃一閃的紫光；吊燈：一團暖光
    if ((b.reso && !b.resoDone) || b.kind === 'lamp') { c.globalCompositeOperation = 'lighter'; c.globalAlpha = b.reso ? 0.35 + 0.25 * Math.sin(t * 3.4) : 0.45; const g = glowSprite(b.reso || b.mat === M_IRON ? C_PURPLE : C_GOLD), r = V.T * (b.reso ? 1.1 : 1.3); c.drawImage(g, -r, -r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    if (b.burn > 0) burn.push(b);
  }
  c.setTransform(1, 0, 0, 1, sx, sy);
  if (!burn.length) return;
  // 著火的磚：火苗永遠往上
  const fl = flameSprite(); c.globalCompositeOperation = 'lighter';
  for (const b of burn) {
    const p = b.body.getPosition(), a = b.body.getAngle(), ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a)), hw = (b.w * ca + b.h * sa) / 2, hh = (b.w * sa + b.h * ca) / 2;
    const n = Math.max(1, Math.round(hw * 2 / CS)), al = Math.min(1, b.burn);
    for (let k = 0; k < n; k++) {
      const ph = t * 9 + b.id * 1.7 + k * 2.1, sc = 0.8 + 0.3 * Math.sin(ph), fw = V.T * sc * 0.85, fh = fw * 1.5;
      const x = X(p.x + (n > 1 ? (k / (n - 1) - 0.5) * hw * 1.5 : 0) + Math.sin(ph * 0.7) * 0.3), y = Y(p.y + hh * 0.6);
      c.globalAlpha = al * 0.8; c.drawImage(fl, x - fw / 2, y - fh * 0.95, fw, fh);
    }
    if (!FX.low && ((RD.frame + b.id) & 15) === 0) part(P_SMOKE, p.x + rndS() * hw, p.y + hh, rndS() * 2, 6, 0.9, 1.3, C_DARK);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
/* ---------- 繩索、鐵鍊 ---------- */
function ropeLine(c, x0, y0, x1, y1, sag, kind, hurt, flash) {
  const s = V.s, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag * 2;
  if (kind === 'chain') {
    const L = Math.hypot(x1 - x0, y1 - y0) + Math.abs(sag), n = Math.max(2, Math.round(L / (s * 0.9)));
    for (let k = 0; k <= n; k++) {
      const u = k / n, a = 1 - u, px = a * a * x0 + 2 * a * u * mx + u * u * x1, py = a * a * y0 + 2 * a * u * my + u * u * y1;
      const tx = 2 * a * (mx - x0) + 2 * u * (x1 - mx), ty = 2 * a * (my - y0) + 2 * u * (y1 - my), ang = Math.atan2(ty, tx);
      ell(c, px, py, s * 0.5, k & 1 ? s * 0.16 : s * 0.3, ang); c.strokeStyle = hurt > 0.5 ? '#8a4a3a' : '#3a3f48'; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke();
      c.strokeStyle = flash > 0 ? '#ffffff' : '#9aa3b0'; c.lineWidth = Math.max(1, s * 0.12); c.stroke();
    }
    return;
  }
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1);
  c.strokeStyle = '#3a2a16'; c.lineWidth = Math.max(2, s * 0.46); c.stroke();
  c.strokeStyle = flash > 0 ? '#fff6d0' : hurt > 0.5 ? '#d8b98a' : '#c9a05e'; c.lineWidth = Math.max(1.2, s * 0.26); c.stroke();
  c.setLineDash([s * 0.35, s * 0.45]); c.strokeStyle = 'rgba(90,60,25,.6)'; c.lineWidth = Math.max(1, s * 0.12); c.stroke(); c.setLineDash([]);
  if (hurt > 0.5) { c.strokeStyle = '#e8d2a6'; c.lineWidth = Math.max(1, s * 0.1); for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(mx, (y0 + y1) / 2 + sag); c.lineTo(mx + k * s * 0.6, (y0 + y1) / 2 + sag + s * 0.5); c.stroke(); } }
}
// 天秤的轉軸、懸臂樑釘在岩壁上的插銷：一顆大鐵釘
function drawPins(c) {
  const s = V.s;
  const bolt = (x, y, r, plate) => {
    if (plate) { c.fillStyle = '#2c2833'; rrect(c, x - r * 1.5, y - r * 1.5, r * 3, r * 3, r * 0.4); c.fill(); c.fillStyle = '#4c4656'; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, Math.max(1, r * 0.3)); }
    c.fillStyle = '#3a3340'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = '#a49aae'; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, TAU); c.fill();
    c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(x, y, r * 0.28, 0, TAU); c.fill();
  };
  for (const o of S.pivots) if (o.b && !o.b.dead) bolt(X(o.x), Y(o.y), s * 1.15, false);
  for (const o of S.pins) if (!o.broke && o.b && !o.b.dead && o.b.body) { const p = o.b.body.getWorldPoint(o.lp); bolt(X(p.x), Y(p.y - 0.8), s * 0.7, true); }
}
function drawRopes(c, t) {
  if (S.pivots.length || S.pins.length) drawPins(c);
  // 大鐘的鐵鍊（打不斷）
  if (S.bell && S.bell.b.body) { const B = S.bell, q = B.b.body.getWorldPoint(B.lb), s = V.s; ropeLine(c, X(B.ax), Y(B.ay), X(q.x), Y(q.y), 0, 'chain', 0, 0); c.fillStyle = '#2c2833'; rrect(c, X(B.ax) - s * 1.2, Y(B.ay) - s * 0.9, s * 2.4, s * 1.5, s * 0.4); c.fill(); c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(X(B.ax), Y(B.ay) - s * 0.15, s * 0.32, 0, TAU); c.fill(); }
  if (!S.ropes.length) return;
  const s = V.s;
  for (const r of S.ropes) {
    if (r.cut) {
      // 斷掉的繩子：兩頭各剩一截，先甩一下再垂下來；吊點還在的話，留一小截掛著
      const dt = S.time - r.cutT, L = Math.min(r.len * 0.5, 9);
      for (let k = 0; k < 2; k++) {
        const o = k ? r.b : r.a; if (o && o.dead) continue;
        let ax, ay; if (!o) { ax = k ? r.lb.x : r.la.x; ay = k ? r.lb.y : r.la.y; } else if (o.body) { const p = o.body.getWorldPoint(k ? r.lb : r.la); ax = p.x; ay = p.y; } else continue;
        const ox = k ? r.cx[0] - r.cx[2] : r.cx[2] - r.cx[0], oy = k ? r.cx[1] - r.cx[3] : r.cx[3] - r.cx[1], a0 = Math.atan2(ox, -oy);
        const len = dt < 1.6 ? L : Math.min(L, 1.8), th = a0 * Math.exp(-dt * 2.4) * Math.cos(dt * 7);
        const ex = ax + Math.sin(th) * len, ey = ay - Math.cos(th) * len;
        if (o && o.hang && !o.dead) continue;          // 吊著的東西已經掉了：它身上那一截不畫
        ropeLine(c, X(ax), Y(ay), X(ex), Y(ey), 0, r.kind, 0, 0);
      }
      continue;
    }
    const e = r.e, d = Math.hypot(e[2] - e[0], e[3] - e[1]), slack = r.len - d;
    const sag = slack > 0.05 ? Math.min(r.len * 0.5, Math.sqrt(Math.max(0, r.len * r.len - d * d)) * 0.5) * s * 0.5 : 0;
    ropeLine(c, X(e[0]), Y(e[1]), X(e[2]), Y(e[3]), sag, r.kind, 1 - r.hp / r.hm, r.flash);
    if (r.burn > 0) {
      const fl = flameSprite(); c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const u = (k + 0.5) / 3, ph = t * 9 + k * 2.1, fw = V.T * (0.55 + 0.15 * Math.sin(ph)), x = X(lerp(e[0], e[2], u)), y = Y(lerp(e[1], e[3], u)); c.globalAlpha = 0.8; c.drawImage(fl, x - fw / 2, y - fw * 1.4, fw, fw * 1.5); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  }
}
/* ---------- 河水、海水：畫在東西前面（半透明），泡在水裡的看起來在水面下 ---------- */
function drawWater(c, t) {
  const W = S.water; if (!W) return;
  const s = V.s, x0 = X(Math.max(W.x0, V.x0 - 2)), x1 = X(Math.min(W.x1, V.x1 + 2)), y = Y(W.y), yb = V.H + 2;
  let surf = null;          // 外海：戰場 x 那裡畫出來的水面高度（河面是平的，不用）
  if (W.sea) {
    /* 外海：一道道湧浪往右推，浪頭碎成白沫。只是畫出來的 —— 物理的水面一直平平地在 W.y，
       所以船身附近的起伏壓在 ±0.4 以內（船才不會看起來浮在半空或沉下去），兩船之間、畫面兩頭的開闊海面才湧得高 */
    const D = drawWater.sea || (drawWater.sea = { key: '', g: null, cap: null, wash: null, p: new Float32Array(0), sp: [0, 0, 0, 0] });
    const key = V.W + '|' + V.H + '|' + s + '|' + W.y;
    if (D.key !== key) {
      D.key = key;
      D.g = lg(c, 0, Y(W.y + 1), 0, yb, [0, 'rgba(78,168,170,.3)', 0.07, 'rgba(44,134,148,.42)', 0.32, 'rgba(16,84,112,.62)', 1, 'rgba(6,30,58,.86)']);
      // 浪頭的白沫：沿著浪峰一串大小不一的泡沫，往前坡（右邊）淌下去一點，底下帶幾顆氣泡。(D.cx, D.cy) 是浪峰
      const R = mkRand(29), cw = Math.ceil(s * 4.2), ch = Math.ceil(s * 1.9), cap = mkCanvas(cw, ch), g = cap.getContext('2d');
      D.cx = cw * 0.42; D.cy = ch * 0.34;
      for (let k = 0; k < 16; k++) {
        const u = k / 15, dx = (u - 0.42) * 3.6, x = D.cx + dx * s, yy = D.cy + (0.16 * dx * dx + (dx > 0 ? dx * 0.1 : 0)) * s, r = s * (0.1 + 0.2 * Math.sin(Math.min(1, u * 1.15) * Math.PI)) * (0.7 + R() * 0.6);
        g.fillStyle = 'rgba(255,255,255,' + (0.75 + R() * 0.25).toFixed(2) + ')'; g.beginPath(); g.arc(x, yy - r * 0.3, r, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(236,252,250,.55)';
      for (let k = 0; k < 9; k++) { const dx = (R() - 0.25) * 2.4, r = Math.max(0.7, s * (0.04 + R() * 0.06)); g.beginPath(); g.arc(D.cx + dx * s, D.cy + (0.16 * dx * dx + 0.25 + R() * 0.5) * s, r, 0, TAU); g.fill(); }
      D.cap = cap;
      // 船身兩頭被浪拍出來的一團白沫（往外散開；原點在船身跟水面相交的地方，往右是船外）
      const ww = Math.ceil(s * 3.8), wh = Math.ceil(s * 2), wash = mkCanvas(ww, wh), q = wash.getContext('2d');
      D.wx = s * 0.5; D.wy = wh * 0.55;
      for (let k = 0; k < 18; k++) { const u = R(), x = D.wx + u * u * s * 3, r = s * (0.38 - 0.26 * u) * (0.6 + R() * 0.6); q.fillStyle = 'rgba(250,255,255,' + (0.95 - u * 0.5).toFixed(2) + ')'; q.beginPath(); q.arc(x, D.wy + (R() - 0.65) * s * 0.7 * (1 - u), r, 0, TAU); q.fill(); }
      D.wash = wash;
    }
    // 兩艘船現在的位置：浪在船邊收小
    const sp = D.sp; let ns = 0;
    for (const pl of S.plats) if (pl.kind === 'ship' && !pl.dead && pl.body && ns < sp.length) { const dx = pl.body.getPosition().x - pl.x0; sp[ns++] = pl.xa + dx; sp[ns++] = pl.xb + dx; }
    const amp = (wx) => { let d = 99; for (let i = 0; i < ns; i += 2) d = Math.min(d, Math.max(sp[i] - wx, wx - sp[i + 1], 0)); return 0.34 + 0.2 * smooth(clamp((d - 1.5) / 8, 0, 1)) + 0.3 * smooth(clamp((d - 14) / 14, 0, 1)); };
    // 主浪（浪峰尖、浪谷平）疊上第二道浪，兩道湊在一起的地方湧得特別高；再加一點碎浪。最高約 1.06、最低約 −0.66
    const hgt = (wx) => { const a = Math.cos(0.48 * wx - 1.05 * t), b = Math.cos(0.83 * wx - 1.32 * t + 1.7); return (0.62 * a + 0.17 * (2 * a * a - 1) + 0.3 * b + 0.06 * (2 * b * b - 1) + 0.07 * Math.sin(2.1 * wx + 2.4 * t)) * 0.87; };
    surf = (wx) => W.y + amp(wx) * hgt(wx);
    const n = Math.ceil((x1 - x0) / 6) + 3; if (D.p.length < n * 2) D.p = new Float32Array(n * 2 + 64);
    const P = D.p; let m = 0;
    for (let px = x0; ; px += 6) { const q = Math.min(px, x1); P[m++] = q; P[m++] = Y(surf(WX(q))); if (q >= x1) break; }
    const trace = (dy) => { c.moveTo(P[0], P[1] + dy); for (let i = 2; i < m; i += 2) c.lineTo(P[i], P[i + 1] + dy); };
    c.save();
    c.beginPath(); c.moveTo(x0, yb); for (let i = 0; i < m; i += 2) c.lineTo(P[i], P[i + 1]); c.lineTo(x1, yb); c.closePath(); c.fillStyle = D.g; c.fill();
    c.lineJoin = 'round'; c.lineCap = 'round';
    // 浪頭底下透光的那一層、水面的亮線、貼著水面一串跟著海流漂的泡沫
    c.beginPath(); trace(s * 0.55); c.strokeStyle = 'rgba(120,206,200,.16)'; c.lineWidth = s; c.stroke();
    c.beginPath(); trace(0); c.strokeStyle = 'rgba(228,248,244,.8)'; c.lineWidth = Math.max(1.2, s * 0.2); c.stroke();
    c.setLineDash([s * 0.6, s * 1.5, s * 0.25, s * 0.9]); c.lineDashOffset = -t * s * 1.6;
    c.beginPath(); trace(s * 0.36); c.strokeStyle = 'rgba(236,252,248,.42)'; c.lineWidth = Math.max(1, s * 0.15); c.stroke(); c.setLineDash([]); c.lineDashOffset = 0;
    // 浪頭碎成白沫：主浪的每一個浪峰，疊上第二道浪而湧得特別高的時候才碎（貼著船身的浪小，不碎）
    const n0 = Math.floor((0.48 * (V.x0 - 3) - 1.05 * t) / TAU), n1 = Math.ceil((0.48 * (V.x1 + 3) - 1.05 * t) / TAU);
    for (let k = n0; k <= n1; k++) {
      const wx = (k * TAU + 1.05 * t) / 0.48, h = hgt(wx), a = smooth(clamp((h - 0.62) / 0.36, 0, 1)) * smooth(clamp((amp(wx) - 0.35) / 0.1, 0, 1));
      if (a < 0.03) continue;
      c.globalAlpha = a; c.drawImage(D.cap, X(wx) - D.cx, Y(W.y + amp(wx) * h) - D.cy);
    }
    c.globalAlpha = 1;
    // 船身跟水面相交的兩頭：浪拍上來的白沫
    for (const Pl of S.plats) {
      if (Pl.kind !== 'ship' || Pl.dead || !Pl.body) continue;
      const p = Pl.body.getPosition(), a = Pl.body.getAngle(), ca = Math.cos(a), sa = Math.sin(a), H = Pl.hull, nh = H.length; let lo = 1e9, hi = -1e9;
      for (let i = 0; i < nh; i += 2) {
        const j = (i + 2) % nh, ay = p.y + H[i] * sa + H[i + 1] * ca, by = p.y + H[j] * sa + H[j + 1] * ca;
        if ((ay - W.y) * (by - W.y) > 0 || ay === by) continue;
        const ax = p.x + H[i] * ca - H[i + 1] * sa, bx = p.x + H[j] * ca - H[j + 1] * sa, x = ax + (bx - ax) * (W.y - ay) / (by - ay); lo = Math.min(lo, x); hi = Math.max(hi, x);
      }
      if (lo > hi) continue;
      for (let e = 0; e < 2; e++) {
        const ex = e ? hi : lo, sg = e ? 1 : -1, k = 0.85 + 0.2 * Math.sin(t * 2.3 + ex);
        c.save(); c.translate(X(ex), Y(surf(ex))); c.scale(sg * k, k); c.globalAlpha = 0.9; c.drawImage(D.wash, -D.wx, -D.wy); c.restore();
      }
    }
    c.restore();
  } else {
    c.fillStyle = lg(c, 0, y, 0, yb, [0, 'rgba(70,160,170,.42)', 0.35, 'rgba(30,100,120,.62)', 1, 'rgba(10,40,60,.85)']);
    c.beginPath(); c.moveTo(x0, yb);
    for (let x = x0; x <= x1 + 1; x += 6) c.lineTo(x, y + Math.sin(x * 0.045 + t * 2.2) * s * 0.18 + Math.sin(x * 0.11 - t * 1.4) * s * 0.1);
    c.lineTo(x1, yb); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(220,250,255,.75)'; c.lineWidth = Math.max(1, s * 0.22); c.beginPath();
    for (let x = x0; x <= x1 + 1; x += 6) { const yy = y + Math.sin(x * 0.045 + t * 2.2) * s * 0.18 + Math.sin(x * 0.11 - t * 1.4) * s * 0.1; if (x === x0) c.moveTo(x, yy); else c.lineTo(x, yy); }
    c.stroke();
    // 水流的白紋
    c.strokeStyle = 'rgba(220,250,255,.28)'; c.lineWidth = Math.max(1, s * 0.16);
    for (let k = 0; k < 9; k++) { const u = ((k * 0.137 + t * W.cur * 0.012) % 1), xx = lerp(x0, x1, u), yy = y + s * (1 + (k % 3) * 1.4); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + s * (2 + (k % 2)), yy); c.stroke(); }
  }
  // 浮在水面上的東西旁邊一圈白沫
  c.fillStyle = 'rgba(240,255,255,.55)';
  for (const b of S.blocks) if (!b.dead && b.wet > 0.05 && b.wet < 0.95) { const p = b.body.getPosition(); ell(c, X(p.x), surf ? Y(surf(p.x)) : y, Math.max(2, b.w * s * 0.45), Math.max(1, s * 0.3)); c.fill(); }
}
function drawUnits(c, t) {
  const s = V.s, sx = FX.shx, sy = FX.shy, us = S.units;
  /* 兩個兵擠在同一個地方分不開（被瓦礫夾住、一格寬的小隔間）：畫的時候往兩邊錯開一點，看得出是兩個人擠在一起，
     不會一個整個被另一個蓋住（只是畫的位置，不影響戰局） */
  for (const u of us) u._tx = 0;
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (!a.alive) continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (!b.alive) continue;
      const dx = b.x - a.x, want = (a.bw + b.bw) * 0.32; if (Math.abs(dx) >= want || Math.abs(b.y - a.y) > 2) continue;
      const d = dx > 0.02 ? 1 : dx < -0.02 ? -1 : (a.slot + a.side * 9 < b.slot + b.side * 9 ? 1 : -1), k = (want - Math.abs(dx)) * 0.5;
      if (a.def.big) b._tx += d * k * 2; else if (b.def.big) a._tx -= d * k * 2; else { a._tx -= d * k; b._tx += d * k; }
    }
  }
  for (const u of us) { if (!u.alive) { u.rox = 0; continue; } u.rox += (clamp(u._tx, -1.6, 1.6) - u.rox) * 0.15; }
  for (const u of S.units) {
    if (!u.alive) continue;
    const T = S.team[u.side], sp = unitSprite(u.side, u.type), dir = T.dir, big = u.def.big ? 1.9 : 1, held = u.frozen > 0 || u.stun > 0;
    const x = X(u.x + u.rox) - dir * u.recoil * s * 0.7, y = Y(u.y) + (u.air || held ? 0 : Math.sin(t * 3.2 + u.slot * 1.9) * s * 0.07);
    if (T.ult.armed || T.rage > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 14 + u.slot); const g = glowSprite(T.ult.armed ? C_GOLD : C_ORANGE), r = sp.px * 0.75; c.drawImage(g, x - r, y - sp.px * 0.5 - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    const tilt = u.tilt;
    if (Math.abs(tilt) > 0.02) { const cs = Math.cos(tilt), sn = Math.sin(tilt), oy = u.bh * s * 0.5; c.setTransform(cs, sn, -sn, cs, x + sx, y - oy + sy); c.drawImage(sp.cv, -sp.ax, -sp.ay + oy); if (u.hurtT > 0) { c.globalAlpha = Math.min(0.85, u.hurtT * 5); c.drawImage(sp.wh, -sp.ax, -sp.ay + oy); c.globalAlpha = 1; } c.setTransform(1, 0, 0, 1, sx, sy); }
    else { c.drawImage(sp.cv, x - sp.ax, y - sp.ay); if (u.hurtT > 0) { c.globalAlpha = Math.min(0.85, u.hurtT * 5); c.drawImage(sp.wh, x - sp.ax, y - sp.ay); c.globalAlpha = 1; } }
    const hw = s * 1.5 * big, top = y - s * 3.5 * big;
    if (u.frozen > 0) {
      c.fillStyle = 'rgba(170,228,255,.5)'; c.strokeStyle = 'rgba(235,250,255,.9)'; c.lineWidth = Math.max(1, s * 0.22);
      poly(c, [x - hw * 1.05, y, x - hw * 1.2, top + s, x - hw * 0.4, top - s * 0.4, x + hw * 0.7, top - s * 0.1, x + hw * 1.2, top + s * 1.4, x + hw * 1.05, y]); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(x - hw * 0.6, top + s * 1.2); c.lineTo(x - hw * 0.1, top + s * 0.2); c.stroke();
    }
    if (u.stun > 0) { c.fillStyle = '#ffe14a'; for (let k = 0; k < 3; k++) { const a = t * 7 + k * 2.1; c.beginPath(); c.arc(x + Math.cos(a) * hw * 0.8, top - s * 0.3 + Math.sin(a) * s * 0.35, Math.max(1.2, s * 0.26), 0, TAU); c.fill(); } }
    if (u.hp < u.hpMax * 0.995) {
      const f = clamp(u.hp / u.hpMax, 0.06, 1), bw = s * 3.1 * big, bh = Math.max(2.5, s * 0.52), bx = x - bw / 2, by = top - s * 0.95;
      c.fillStyle = 'rgba(10,8,20,.75)'; c.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      c.fillStyle = f > 0.5 ? '#6fe05a' : f > 0.25 ? '#ffc93c' : '#ff5a3c'; c.fillRect(bx, by, bw * f, bh);
    }
  }
}

/* ---------- 倍增符 ---------- */
function drawGates(c, t) {
  const s = V.s;
  for (const g of S.gates) {
    const col = GATE_COL[g.owner], x = X(g.x), y = Y(g.y), hh = g.h * s, w = s * 1.3, age = S.time - g.born;
    const aimed = (RD.aimMask & g.bit) !== 0, ap = Math.min(1, age / 0.22), pulse = 1 + g.flash * 0.14 + (aimed ? 0.05 + 0.04 * Math.sin(t * 10) : 0);
    c.save(); c.translate(x, y); c.rotate(Math.PI / 2 - g.ang); c.scale(ap * pulse, pulse);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, 0, 0, 0, hh * 1.25, [0, col.glow, 1, 'rgba(0,0,0,0)']); c.fillRect(-hh * 1.25, -hh * 1.25, hh * 2.5, hh * 2.5);
    if (aimed) c.fillRect(-hh * 1.25, -hh * 1.25, hh * 2.5, hh * 2.5);
    c.globalCompositeOperation = 'source-over';
    // 符身：兩側隨風抖動
    const n = 8; c.beginPath();
    for (let k = 0; k <= n; k++) { const yy = -hh + 2 * hh * k / n, xx = -w + Math.sin(t * 4.2 + k * 0.9 + g.b) * w * 0.16; if (k === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
    for (let k = n; k >= 0; k--) { const yy = -hh + 2 * hh * k / n, xx = w + Math.sin(t * 4.2 + k * 0.9 + g.b + 1.4) * w * 0.16; c.lineTo(xx, yy); }
    c.closePath(); c.fillStyle = lg(c, -w, 0, w, 0, [0, col.e, 0.5, col.m, 1, col.e]); c.fill();
    if (g.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + (g.flash * 0.6) + ')'; c.fill(); }
    c.strokeStyle = aimed ? '#ffffff' : col.line; c.lineWidth = Math.max(1, s * (aimed ? 0.32 : 0.2)); c.stroke();
    // 上下兩根卷軸桿
    for (let k = -1; k <= 1; k += 2) {
      const ry = k * hh;
      rrect(c, -w * 1.5, ry - s * 0.42, w * 3, s * 0.84, s * 0.4); c.fillStyle = lg(c, 0, ry - s * 0.42, 0, ry + s * 0.42, [0, '#fff0b0', 0.5, '#ffc93c', 1, '#b9790f']); c.fill(); c.strokeStyle = '#5a3a08'; c.lineWidth = Math.max(1, s * 0.16); c.stroke();
    }
    // 倍數
    c.rotate(-(Math.PI / 2 - g.ang));
    const txt = g.owner === 3 ? '÷2' : '×' + g.mult, fz = s * (g.mult >= 5 ? 4.9 : 4.3);
    c.font = '400 ' + fz + 'px ' + F_NUM; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = fz * 0.24; c.strokeStyle = col.ink; c.strokeText(txt, 0, 0); c.fillStyle = '#ffffff'; c.fillText(txt, 0, 0);
    // 耐久（被打過才顯示）；限時的符：還剩幾回合
    const bw = w * 3, by = hh + s * 1.0;
    if (g.hp < g.hpMax && g.owner < 2) { c.fillStyle = 'rgba(10,8,20,.7)'; c.fillRect(-bw / 2, by, bw, s * 0.5); c.fillStyle = g.owner === 0 ? '#7fc0ff' : '#ff8a6a'; c.fillRect(-bw / 2, by, bw * clamp(g.hp / g.hpMax, 0, 1), s * 0.5); }
    else if (g.life > 0) { const left = g.life - (S.round - g.bornR); for (let k = 0; k < g.life; k++) { c.fillStyle = k < left ? '#ffffff' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc((k - (g.life - 1) / 2) * s * 1.1, by + s * 0.3, s * 0.34, 0, TAU); c.fill(); } }
    c.restore();
  }
}

/* ---------- 機關 ---------- */
function drawObjs(c, t) {
  const s = V.s;
  for (const o of S.objs) {
    switch (o.t) {
      case 'geyser': {
        const x = X(o.x), yb = Y(o.base);
        // 下一回合輪到它噴：地面先冒火星
        if (o.next && !o.on) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6 + o.x); const g = glowSprite(C_ORANGE), r = s * 4.2; c.drawImage(g, x - r, yb - r * 0.7, r * 2, r * 1.4); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; if ((RD.frame & 7) === 0) part(P_EMBER, o.x + rndS() * 3, o.base, rndS() * 5, 8 + Math.random() * 8, 0.5, 0.5, C_ORANGE); }
        if (o.top > o.base + 0.5) {
          const yt = Y(o.top), w = o.w * s;
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = lg(c, x - w * 1.6, 0, x + w * 1.6, 0, [0, 'rgba(255,90,20,0)', 0.25, 'rgba(255,110,30,.5)', 0.5, 'rgba(255,230,140,.9)', 0.75, 'rgba(255,110,30,.5)', 1, 'rgba(255,90,20,0)']);
          c.beginPath(); c.moveTo(x - w * 1.6, yb + s * 2);
          for (let k = 0; k <= 10; k++) { const u = k / 10; c.lineTo(x - w * (1.5 - 0.5 * u) + Math.sin(t * 13 + k * 1.3) * w * 0.18, lerp(yb, yt, u)); }
          for (let k = 10; k >= 0; k--) { const u = k / 10; c.lineTo(x + w * (1.5 - 0.5 * u) + Math.sin(t * 13 + k * 1.3 + 2) * w * 0.18, lerp(yb, yt, u)); }
          c.closePath(); c.fill();
          const g = glowSprite(C_WHITEHOT), r = w * 2.4; c.drawImage(g, x - r, yt - r, r * 2, r * 2);
          c.globalCompositeOperation = 'source-over';
          if ((RD.frame & 1) === 0) part(P_EMBER, o.x + rndS() * o.w * 2, o.base + Math.random() * (o.top - o.base), rndS() * 10, 8 + Math.random() * 14, 0.6, 0.7, Math.random() < 0.5 ? C_ORANGE : C_GOLD);
        }
        break;
      }
      case 'portal': {
        const col = o.owner === 0 ? ['#7fc0ff', '#2f6fe0', C_SKY] : ['#ff9a80', '#d83a2e', C_SALMON];
        for (let e = 0; e < 2; e++) {
          const x = X(e ? o.ex : o.x), y = Y(e ? o.ey : o.y), rx = e ? o.ew * 0.5 * s : o.r * s * 0.62, ry = e ? s * 1.5 : o.r * s;
          c.globalCompositeOperation = 'lighter'; const g = glowSprite(col[2]), gr = Math.max(rx, ry) * 1.7; c.globalAlpha = 0.55 + o.flash * 0.4; c.drawImage(g, x - gr, y - gr, gr * 2, gr * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
          ell(c, x, y, rx, ry); c.fillStyle = e ? 'rgba(10,6,30,.5)' : 'rgba(10,6,30,.78)'; c.fill(); c.strokeStyle = col[0]; c.lineWidth = Math.max(1.5, s * 0.5); c.stroke();
          c.strokeStyle = col[1]; c.lineWidth = Math.max(1, s * 0.28);
          for (let k = 0; k < 3; k++) { const a = t * (e ? -2.4 : 3) + k * TAU / 3; c.beginPath(); c.ellipse(x, y, rx * 0.66, ry * 0.66, 0, a, a + 1.5); c.stroke(); }
          if (e) { c.fillStyle = col[0]; for (let k = -1; k <= 1; k++) { poly(c, [x + k * rx * 0.5 - s * 0.6, y + s * 2.2, x + k * rx * 0.5 + s * 0.6, y + s * 2.2, x + k * rx * 0.5, y + s * 3.4 + Math.sin(t * 6 + k) * s * 0.4]); c.fill(); } }
        }
        break;
      }
      case 'mirror': {
        const x0 = X(o.x - o.dx), y0 = Y(o.y - o.dy), x1 = X(o.x + o.dx), y1 = Y(o.y + o.dy);
        c.lineCap = 'round';
        if (o.one) {
          // 單面的冰鏡：背面是一層粗糙的厚冰（打到會擋下），亮面朝著要反彈的方向
          const nx = -o.dy / o.len, ny = o.dx / o.len, bx = nx * s * 0.9, by = -ny * s * 0.9;
          c.strokeStyle = '#3a6f9a'; c.lineWidth = s * 1.5; c.beginPath(); c.moveTo(x0 - bx, y0 - by); c.lineTo(x1 - bx, y1 - by); c.stroke();
          c.strokeStyle = 'rgba(200,235,255,.5)'; c.lineWidth = s * 0.5; c.setLineDash([s * 0.5, s * 0.7]); c.stroke(); c.setLineDash([]);
        }
        c.strokeStyle = 'rgba(120,200,255,.35)'; c.lineWidth = s * 1.9; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        c.strokeStyle = '#5fb6e4'; c.lineWidth = s * 0.95; c.stroke();
        c.strokeStyle = o.flash > 0 ? '#ffffff' : '#e6f8ff'; c.lineWidth = s * 0.42; c.stroke();
        const u = (Math.sin(t * 1.7 + o.ph) + 1) / 2; c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(lerp(x0, x1, u), lerp(y0, y1, u), s * 0.5, 0, TAU); c.fill();
        break;
      }
      case 'barrier': {
        if (S.state !== 'play') break;                       // 分出勝負了：結界跟著消失
        const x = X(o.x), y = Y(o.y), R = o.R * s;
        c.lineCap = 'butt';
        for (const sg of o.segs) {
          // 畫面的角度跟戰場的角度上下相反；兩段光牆之間留一點縫
          const a0 = -sg.a1 + 0.02, a1 = -sg.a0 - 0.02, lv = sg.lvl;
          if (lv < 0.05) { c.strokeStyle = 'rgba(255,120,190,.2)'; c.lineWidth = Math.max(1, s * 0.4); c.setLineDash([s, s * 1.6]); c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke(); c.setLineDash([]); continue; }
          c.globalAlpha = lv;
          c.strokeStyle = 'rgba(255,60,150,' + (0.24 + sg.flash * 0.4 + 0.06 * Math.sin(t * 5 + sg.a0 * 3)) + ')'; c.lineWidth = s * 3; c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke();
          c.strokeStyle = sg.flash > 0 ? '#ffffff' : '#ff8ac6'; c.lineWidth = s * 0.8; c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke();
          const f = sg.hp / sg.hm; if (f < 0.99) { c.strokeStyle = '#ffe14a'; c.lineWidth = s * 0.34; c.beginPath(); c.arc(x, y, R - s * 1.6, a0, a0 + (a1 - a0) * f); c.stroke(); }
          c.globalAlpha = 1;
        }
        break;
      }
    }
  }
}
// 從天上往下看，x 這個位置最上面的東西有多高（落石的預告用）
let _sy = 0;
const _syA = { x: 0, y: 92 }, _syB = { x: 0, y: -14 };
function _syCb(f, p, n, fr) { _sy = p.y; return fr; }
function surfaceY(x) { _sy = -999; _syA.x = x; _syB.x = x; PH.world.rayCast(_syA, _syB, _syCb); return _sy; }
function drawFlyers(c, t) {
  const s = V.s;
  for (const o of S.objs) {
    if (o.t === 'tether') {
      // 吊著浮島的大氣球：破了就往上飄走、越來越淡
      const age = o.hp <= 0 ? S.time - o.cutT : -1; if (age > 1.6) continue;
      const x = X(o.x + (age > 0 ? age * 2 : 0)), y = Y(o.y + Math.sin(t * 1.3 + o.ph) * 0.35 + (age > 0 ? age * age * 9 : 0)), r = o.r * s * (age > 0 ? 1 - age * 0.35 : 1);
      if (age > 0) c.globalAlpha = Math.max(0, 1 - age / 1.6);
      ell(c, x, y, r, r * 1.1); c.fillStyle = rg(c, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.2, o.side === 1 ? [0, '#ffc2a8', 0.5, '#e8503a', 1, '#8f1a14'] : [0, '#d4e8ff', 0.5, '#3f86f0', 1, '#163f9c']); c.fill();
      c.strokeStyle = 'rgba(255,240,200,.75)'; c.lineWidth = Math.max(1, s * 0.16); for (let k = -1; k <= 1; k++) { c.beginPath(); c.ellipse(x, y, r * (0.35 + 0.3 * Math.abs(k)) * (k ? 1 : 0.15), r * 1.08, 0, 0, TAU); c.stroke(); }
      c.strokeStyle = INK; c.lineWidth = Math.max(1.2, s * 0.24); ell(c, x, y, r, r * 1.1); c.stroke();
      c.fillStyle = '#5a3a1a'; rrect(c, x - r * 0.22, y + r * 1.02, r * 0.44, r * 0.26, r * 0.06); c.fill();
      if (o.flash > 0) { c.globalAlpha = o.flash * 0.6; ell(c, x, y, r, r * 1.1); c.fillStyle = '#fff'; c.fill(); }
      c.globalAlpha = 1;
      if (o.hp > 0 && o.hp < o.hm) { const bw = r * 1.8, bh = Math.max(2.5, s * 0.5), bx = x - bw / 2, by = y - r * 1.1 - s * 1.2; c.fillStyle = 'rgba(10,8,20,.75)'; c.fillRect(bx - 1, by - 1, bw + 2, bh + 2); c.fillStyle = o.side === 1 ? '#ffc93c' : '#7fc0ff'; c.fillRect(bx, by, bw * clamp(o.hp / o.hm, 0, 1), bh); }
      continue;
    }
    if (o.t === 'balloon') {
      const x = X(o.x), y = Y(o.y) + Math.sin(t * 2 + o.x) * s * 0.3, r = o.r * s;
      // 停在半路：下一輪才飛過來，畫一圈提醒
      if (o.st === 'hover') { c.strokeStyle = 'rgba(255,225,74,' + (0.45 + 0.35 * Math.sin(t * 6)) + ')'; c.lineWidth = Math.max(1.2, s * 0.3); c.setLineDash([s * 1.2, s * 1.2]); c.lineDashOffset = -t * s * 6; ell(c, x, y + r * 0.5, r * 1.9, r * 2.2); c.stroke(); c.setLineDash([]); }
      c.strokeStyle = '#3a2a1c'; c.lineWidth = Math.max(1, s * 0.18); c.beginPath(); c.moveTo(x - r * 0.55, y + r * 0.6); c.lineTo(x - r * 0.32, y + r * 1.45); c.moveTo(x + r * 0.55, y + r * 0.6); c.lineTo(x + r * 0.32, y + r * 1.45); c.stroke();
      ell(c, x, y, r, r * 0.92); c.fillStyle = rg(c, x - r * 0.3, y - r * 0.35, r * 0.1, r * 1.1, o.side === 1 ? [0, '#ff9a80', 0.6, '#e03a2c', 1, '#8f1418'] : [0, '#a8d0ff', 0.6, '#2f6fe0', 1, '#1b46b8']); c.fill(); c.strokeStyle = INK; c.lineWidth = Math.max(1.2, s * 0.26); c.stroke();
      c.strokeStyle = 'rgba(255,225,74,.9)'; c.lineWidth = Math.max(1, s * 0.3); c.beginPath(); c.ellipse(x, y, r * 0.45, r * 0.9, 0, 0, TAU); c.stroke();
      rrect(c, x - r * 0.4, y + r * 1.4, r * 0.8, r * 0.52, r * 0.1); fs(c, '#8a5a30', INK, Math.max(1, s * 0.2));
      for (let k = 0; k < o.n; k++) { c.fillStyle = '#1c1e25'; c.beginPath(); c.arc(x + (k - (o.n - 1) / 2) * r * 0.34, y + r * 2.1, r * 0.15, 0, TAU); c.fill(); }
      if (o.flash > 0) { c.globalAlpha = o.flash * 0.7; ell(c, x, y, r, r * 0.92); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1; }
    } else if (o.t === 'lantern') {
      const x = X(o.x), y = Y(o.y), r = s * 2.3, K = { heal: ['#7af0a0', '#1f9a56', C_GREEN], rage: ['#ffb07a', '#e04a1c', C_ORANGE], charge: ['#fff0a0', '#e0a81c', C_GOLD], troop: ['#a8d8ff', '#2f6fe0', C_SKY] }[o.kind];
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6 + 0.2 * Math.sin(t * 5 + o.x); const g = glowSprite(K[2]); c.drawImage(g, x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.beginPath(); c.moveTo(x - r * 0.62, y + r); c.quadraticCurveTo(x - r * 1.15, y - r * 0.2, x - r * 0.7, y - r); c.lineTo(x + r * 0.7, y - r); c.quadraticCurveTo(x + r * 1.15, y - r * 0.2, x + r * 0.62, y + r); c.closePath();
      c.fillStyle = lg(c, 0, y - r, 0, y + r, [0, K[0], 1, K[1]]); c.fill(); c.strokeStyle = INK; c.lineWidth = Math.max(1.2, s * 0.24); c.stroke();
      c.fillStyle = '#3a2a1c'; c.fillRect(x - r * 0.62, y + r * 0.92, r * 1.24, r * 0.22);
      c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, s * 0.42); c.lineCap = 'round';
      if (o.kind === 'heal') { c.beginPath(); c.moveTo(x - r * 0.38, y); c.lineTo(x + r * 0.38, y); c.moveTo(x, y - r * 0.38); c.lineTo(x, y + r * 0.38); c.stroke(); }
      else if (o.kind === 'rage') { poly(c, [x, y - r * 0.55, x + r * 0.36, y + r * 0.1, x + r * 0.1, y + r * 0.45, x - r * 0.3, y + r * 0.3, x - r * 0.38, y - r * 0.1]); c.fill(); }
      else if (o.kind === 'charge') { poly(c, [x + r * 0.12, y - r * 0.6, x - r * 0.36, y + r * 0.08, x - r * 0.04, y + r * 0.08, x - r * 0.14, y + r * 0.6, x + r * 0.36, y - r * 0.1, x + r * 0.05, y - r * 0.1]); c.fill(); }
      else { c.beginPath(); c.arc(x, y - r * 0.22, r * 0.24, 0, TAU); c.fill(); rrect(c, x - r * 0.3, y + r * 0.08, r * 0.6, r * 0.46, r * 0.14); c.fill(); }
      // 快飄走了：最後一回合閃爍
      if (S.round - o.bornR >= 1) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 9); c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, s * 0.22); ell(c, x, y, r * 1.5, r * 1.6); c.stroke(); c.globalAlpha = 1; }
    } else if (o.t === 'orb') {
      const x = X(o.x), y = Y(o.y), r = o.r * s * (1 + 0.06 * Math.sin(t * 12));
      if (o.st === 'hover') { c.strokeStyle = 'rgba(255,225,74,' + (0.45 + 0.35 * Math.sin(t * 6)) + ')'; c.lineWidth = Math.max(1.2, s * 0.3); c.setLineDash([s * 1.2, s * 1.2]); c.lineDashOffset = -t * s * 6; ell(c, x, y, r * 1.9, r * 1.9); c.stroke(); c.setLineDash([]); }
      // 被打爆、掉頭飛回去的光球換成藍白色（變成我方的了）
      const mine = o.st === 'back';
      c.globalCompositeOperation = 'lighter'; const g = glowSprite(mine ? C_SKY : C_PINK); c.drawImage(g, x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2); c.globalCompositeOperation = 'source-over';
      ell(c, x, y, r, r); c.fillStyle = rg(c, x - r * 0.3, y - r * 0.3, r * 0.1, r, mine ? [0, '#ffffff', 0.35, '#58b8ff', 1, '#0a2a6a'] : [0, '#ffb0e6', 0.35, '#a024cc', 1, '#16042a']); c.fill(); c.strokeStyle = mine ? '#06183a' : '#0c0410'; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke();
      if (!mine) { c.strokeStyle = '#ffe14a'; c.lineWidth = Math.max(1.5, s * 0.45); c.beginPath(); c.arc(x, y, r * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(o.hp / o.hm, 0, 1)); c.stroke(); }
      if (o.flash > 0) { c.globalAlpha = o.flash * 0.7; ell(c, x, y, r, r); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1; }
      if (mine) { part(P_SPARK, o.x + rndS() * 2, o.y + rndS() * 2, rndS() * 8, rndS() * 8, 0.35, 0.7, C_SKY); part(P_EMBER, o.x + rndS() * 2.5, o.y + rndS() * 2.5, rndS() * 5, rndS() * 5, 0.5, 1.0, C_WHITE); }
      else if ((RD.frame & 1) === 0) part(P_EMBER, o.x + rndS() * 3, o.y + rndS() * 3, rndS() * 6, rndS() * 6, 0.5, 0.9, C_PURPLE);
    }
  }
  // 落石的預告：這一回合結束時會砸在這裡。落點一圈紅、往上一條虛線
  for (const mk of S.marks) {
    if (mk.sy === undefined || (RD.frame & 7) === 0) { const y = surfaceY(mk.x); mk.sy = y > -100 ? y : 0; }
    const x = X(mk.x), y = Y(mk.sy), r = s * (mk.big ? 4.2 : 3.2) * (0.9 + 0.1 * Math.sin(t * 8));
    c.strokeStyle = 'rgba(255,80,40,' + (0.55 + 0.35 * Math.sin(t * 12)) + ')'; c.lineWidth = Math.max(1.5, s * 0.4);
    c.beginPath(); c.ellipse(x, y, r, r * 0.4, 0, 0, TAU); c.stroke();
    c.setLineDash([s * 1.2, s * 1.2]); c.lineDashOffset = -t * s * 10; c.beginPath(); c.moveTo(x, V.hud); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,90,50,.9)'; poly(c, [x - s * 1.1, y - s * 3.6, x + s * 1.1, y - s * 3.6, x, y - s * 1.7]); c.fill();
  }
}

/* ---------- 砲彈 ---------- */
function drawShots(c) {
  const n = SH.n, s = V.s; if (!n) return;
  const k = 0.034 * s;
  c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
  for (let sd = 0; sd < 3; sd++) {
    if (!SH.cnt[sd]) continue;
    c.beginPath();
    for (let i = 0; i < n; i++) { if (SH.side[i] !== sd) continue; const x = X(SH.x[i]), y = Y(SH.y[i]); c.moveTo(x, y); c.lineTo(x - SH.vx[i] * k, y + SH.vy[i] * k); }
    c.strokeStyle = sd === 0 ? 'rgba(110,184,255,.62)' : sd === 1 ? 'rgba(255,120,88,.62)' : 'rgba(255,170,60,.7)'; c.lineWidth = Math.max(1.5, s * 0.5); c.stroke();
  }
  // 著火的砲彈多一團火光
  const gf = glowSprite(C_ORANGE);
  for (let i = 0; i < n; i++) if (SH.flag[i] & F_FIRE) { const r = s * 1.9; c.drawImage(gf, X(SH.x[i]) - r, Y(SH.y[i]) - r, r * 2, r * 2); }
  c.globalCompositeOperation = 'source-over';
  const sx = FX.shx, sy = FX.shy;
  for (let i = 0; i < n; i++) {
    // 分裂過的砲彈比較小顆（威力也比較小），合併的比較大顆
    const sp = shotSprite(SH.w[i], SH.side[i]), a = SH.flag[i] & F_ROLL ? -SH.x[i] * 1.7 : Math.atan2(-SH.vy[i], SH.vx[i]), ms = SH.mass[i], m = ms > 1 ? Math.min(2, Math.sqrt(ms)) : Math.max(0.6, Math.pow(ms, 0.2)), cs = Math.cos(a) * m, sn = Math.sin(a) * m;
    c.setTransform(cs, sn, -sn, cs, X(SH.x[i]) + sx, Y(SH.y[i]) + sy);
    c.drawImage(sp.cv, -sp.w / 2, -sp.h / 2);
  }
  c.setTransform(1, 0, 0, 1, sx, sy);
  // 火箭和砲彈拖一點煙
  if (!FX.low) for (let i = RD.frame % 5; i < n; i += 5) { const id = WL[SH.w[i]].id; if (id === 'rocket' || id === 'bomb' || id === 'drop') part(P_SMOKE, SH.x[i], SH.y[i], rndS() * 2, rndS() * 2, 0.45, id === 'rocket' ? 0.8 : 1.3, C_GRAY); else if (id === 'fire') part(P_EMBER, SH.x[i], SH.y[i], rndS() * 3, rndS() * 3, 0.35, 0.6, C_ORANGE); else if (id === 'ice') part(P_SPARK, SH.x[i], SH.y[i], rndS() * 4, rndS() * 4, 0.25, 0.3, C_ICE); else if (id === 'dark') part(P_EMBER, SH.x[i], SH.y[i], rndS() * 3, rndS() * 3, 0.3, 0.6, C_PURPLE); }
}

/* ---------- 特效 ---------- */
function fxDraw(c) {
  const s = V.s, n = FX.n, sx = FX.shx, sy = FX.shy;
  // 煙和塵先畫（用戰場的座標）；碎屑每一顆自己轉自己的角度，另外一趟畫。
  // 兩種混在同一趟的話，碎屑設的旋轉會留給後面的煙塵用，煙就會畫到不相干的地方去
  for (let i = 0; i < n; i++) {
    const tp = FX.type[i];
    if (tp === P_SMOKE || tp === P_DUST) {
      const f = FX.life[i] / FX.max[i], r = FX.size[i] * s * (1.7 - f * 0.9);
      c.globalAlpha = f * (tp === P_DUST ? 0.42 : 0.5); c.fillStyle = PCOL[FX.col[i]]; c.beginPath(); c.arc(X(FX.x[i]), Y(FX.y[i]), r, 0, TAU); c.fill();
    }
  }
  for (let i = 0; i < n; i++) {
    const tp = FX.type[i];
    if (tp === P_DEBRIS || tp === P_CONF || tp === P_SHARD) {
      const r = FX.size[i] * s * 0.5, a = FX.rot[i], cs = Math.cos(a), sn = Math.sin(a);
      c.globalAlpha = Math.min(1, FX.life[i] * 3); c.setTransform(cs, sn, -sn, cs, X(FX.x[i]) + sx, Y(FX.y[i]) + sy);
      c.fillStyle = PCOL[FX.col[i]];
      if (tp === P_SHARD) { c.beginPath(); c.moveTo(0, -r * 1.5); c.lineTo(r * 0.7, 0); c.lineTo(0, r * 1.5); c.lineTo(-r * 0.7, 0); c.closePath(); c.fill(); }
      else { c.fillRect(-r, -r * 0.8, r * 2, r * 1.6); if (tp === P_DEBRIS) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(-r, r * 0.2, r * 2, r * 0.6); } }
    }
  }
  c.setTransform(1, 0, 0, 1, sx, sy); c.globalAlpha = 1;
  c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const tp = FX.type[i];
    if (tp === P_SPARK) {
      const f = FX.life[i] / FX.max[i], x = X(FX.x[i]), y = Y(FX.y[i]), k = 0.03 * s;
      c.globalAlpha = Math.min(1, f * 1.6); c.strokeStyle = PCOL[FX.col[i]]; c.lineWidth = Math.max(1, FX.size[i] * s * 0.5);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - FX.vx[i] * k, y + FX.vy[i] * k); c.stroke();
    } else if (tp === P_FLASH) {
      const f = FX.life[i] / FX.max[i], r = FX.size[i] * s * (1.6 - f * 0.6); c.globalAlpha = f; c.drawImage(glowSprite(FX.col[i]), X(FX.x[i]) - r, Y(FX.y[i]) - r, r * 2, r * 2);
    } else if (tp === P_EMBER) {
      const f = FX.life[i] / FX.max[i], r = FX.size[i] * s * (0.5 + f); c.globalAlpha = f * 0.9; c.drawImage(glowSprite(FX.col[i]), X(FX.x[i]) - r, Y(FX.y[i]) - r, r * 2, r * 2);
    }
  }
  for (const r of FX.rings) { const f = r.t / r.max, rad = lerp(r.r0, r.r1, 1 - (1 - f) * (1 - f)) * s; c.globalAlpha = (1 - f) * 0.9; c.strokeStyle = r.col; c.lineWidth = Math.max(1, r.lw * s * (1 - f * 0.6)); c.beginPath(); c.arc(X(r.x), Y(r.y), Math.max(0.5, rad), 0, TAU); c.stroke(); }
  for (const b of FX.bolts) {
    const f = 1 - b.t / b.max; c.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) { c.globalAlpha = f * (pass ? 1 : 0.4); c.strokeStyle = pass ? '#ffffff' : b.col; c.lineWidth = s * (pass ? 0.5 : 1.9); c.beginPath(); for (let k = 0; k < b.pts.length; k += 2) { const x = X(b.pts[k]), y = Y(b.pts[k + 1]); if (k === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
  }
  for (const p of FX.tracers) { c.globalAlpha = 1 - p.t / 0.14; c.strokeStyle = p.side === 0 ? '#bfe0ff' : '#ffd0a0'; c.lineWidth = Math.max(1, s * 0.3); c.beginPath(); c.moveTo(X(p.x0), Y(p.y0)); c.lineTo(X(p.x1), Y(p.y1)); c.stroke(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // 被炸飛的兵
  for (const f of FX.flung) {
    const cs = Math.cos(f.rot), sn = Math.sin(f.rot);
    c.globalAlpha = Math.min(1, (2.2 - f.t) * 2); c.setTransform(cs, sn, -sn, cs, X(f.x) + sx, Y(f.y) + sy);
    if (f.flag) { drawFlag(c, f.flag, _noBlock, RD.t); continue; }
    const sp = unitSprite(f.side, f.type); c.drawImage(sp.cv, -sp.ax, -sp.cy);
  }
  c.setTransform(1, 0, 0, 1, sx, sy); c.globalAlpha = 1;
  // 跳出來的字
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const placed = RD.popRects || (RD.popRects = []); placed.length = 0;
  for (const p of FX.pops) {
    const f = p.t / p.max, sc = f < 0.12 ? 0.6 + f / 0.12 * 0.5 : 1.1 - Math.min(0.1, (f - 0.12) * 0.5), fz = p.size * s * sc;
    c.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
    c.font = /[^\x00-\xff]/.test(p.txt) && !/^×/.test(p.txt) ? F_ZH.replace('1px', fz + 'px') : '400 ' + fz * 1.15 + 'px ' + F_NUM;
    // 整句都要看得到：不超出左右、不躲到上方資訊列後面、不掉到畫面底下（摔進深淵的兵在畫面外），也不要被角落的按鈕蓋住
    const hw = c.measureText(p.txt).width / 2 + fz * 0.15, x = clamp(X(p.x), hw + 2, Math.max(hw + 2, V.W - hw - 2));
    let y = clamp(Y(p.y) - f * s * 3.5, V.hud + fz * 0.9, V.H - fz * 0.8);
    for (const r of RD.avoid) if (x + hw > r[0] && x - hw < r[2] && y + fz * 0.6 > r[1] && y - fz * 0.6 < r[3]) y = Math.max(V.hud + fz * 0.9, r[1] - fz * 0.7);
    // 跟這一幀已經畫好的字疊在一起（貼著畫面邊緣被擠到同一處的那幾句）：往上挪開，最多挪幾次
    for (let k = 0; k < 6; k++) { let hit = null; for (const q of placed) if (Math.abs(q[0] - x) < q[2] + hw && Math.abs(q[1] - y) < (q[3] + fz) * 0.55) { hit = q; break; } if (!hit) break; y = hit[1] - (hit[3] + fz) * 0.6; if (y < V.hud + fz * 0.9) { y = V.hud + fz * 0.9; break; } }
    placed.push([x, y, hw, fz]);
    c.lineWidth = fz * 0.22; c.strokeStyle = 'rgba(16,10,26,.9)'; c.strokeText(p.txt, x, y); c.fillStyle = p.col; c.fillText(p.txt, x, y);
  }
  c.globalAlpha = 1;
}
function drawShields(c, t, rdt) {
  const s = V.s;
  for (let sd = 0; sd < 2; sd++) {
    const T = S.team[sd], st = S.st[sd]; if (!T) continue;
    RD.sh[sd] += ((T.shield.on && !st.dead ? 1 : 0) - RD.sh[sd]) * Math.min(1, rdt * 9);
    const a = RD.sh[sd]; if (a < 0.02) continue;
    const cc = stCenter(st), x = X(cc.x), y = Y(cc.y), rx = (st.w * 0.5 + 6) * s * (0.9 + 0.1 * a), ry = (st.h * 0.6 + 6) * s * (0.9 + 0.1 * a);
    c.save(); c.beginPath(); c.rect(0, 0, V.W, Y(st.y0) + s * 0.5); c.clip();
    ell(c, x, y, rx, ry); c.fillStyle = rg(c, x, y, ry * 0.5, Math.max(rx, ry), sd === 0 ? [0, 'rgba(90,170,255,0)', 0.75, 'rgba(90,170,255,' + 0.12 * a + ')', 1, 'rgba(170,220,255,' + 0.4 * a + ')'] : [0, 'rgba(255,90,70,0)', 0.75, 'rgba(255,90,70,' + 0.12 * a + ')', 1, 'rgba(255,170,150,' + 0.4 * a + ')']); c.fill();
    c.strokeStyle = sd === 0 ? 'rgba(210,236,255,' + 0.9 * a + ')' : 'rgba(255,200,190,' + 0.9 * a + ')'; c.lineWidth = Math.max(1.5, s * 0.5); c.stroke();
    c.setLineDash([s * 2.4, s * 3.2]); c.lineDashOffset = -t * s * 14; c.lineWidth = Math.max(1, s * 0.3); ell(c, x, y, rx * 0.93, ry * 0.93); c.stroke(); c.setLineDash([]);
    c.restore();
  }
}

/* ---------- 瞄準 ---------- */
// 一串圓點：照現在的角度、力道和風算出來的彈道（跟模擬用同一種算法，所以對得上）。
// box：還在這座城樓的範圍裡的那一段不畫（自己的砲彈會穿過自己的城，畫出來反而亂）；inside = true 則是只畫那一段（帶頭的那一發用，畫淡一點）
function aimDots(c, mx, my, vx, vy, t0, t1, tMax, r0, r1, box, inside) {
  const w = S.wind, s = V.s; let n = 0;
  for (let tt = t0; tt <= t1; tt += 0.065) {
    const x = mx + vx * tt + 0.5 * w * tt * (tt + STEP), y = my + vy * tt - 0.5 * GRAV * tt * (tt + STEP);
    if (box && (x > box.x0 - 1 && x < box.x1 + 1.2 && y < box.y1 + 2.5) !== !!inside) continue;
    const px = X(x), py = Y(y), r = Math.max(1.3, s * lerp(r0, r1, tt / tMax));
    c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); n++;
  }
  return n;
}
// 照 simTrace 錄下來的路線畫圓點（會跟著冰鏡、噴流、黑洞轉彎）：路線每 1/30 秒一個點，tt 秒的位置用前後兩點內插
const _pa = [0, 0];
function pathAt(P, mx, my, tt) {
  const n = P.length >> 1, f = tt * 30 - 1;
  if (f < 0 || n < 1) { const u = clamp(tt * 30, 0, 1); _pa[0] = lerp(mx, n ? P[0] : mx, u); _pa[1] = lerp(my, n ? P[1] : my, u); return _pa; }
  const i = Math.min(n - 1, Math.floor(f)), j = Math.min(n - 1, i + 1), u = clamp(f - i, 0, 1);
  _pa[0] = lerp(P[i * 2], P[j * 2], u); _pa[1] = lerp(P[i * 2 + 1], P[j * 2 + 1], u); return _pa;
}
function pathDots(c, P, mx, my, t0, t1, tMax, r0, r1, box, inside) {
  const s = V.s; let n = 0;
  for (let tt = t0; tt <= t1; tt += 0.065) {
    const q = pathAt(P, mx, my, tt), x = q[0], y = q[1];
    if (box && (x > box.x0 - 1 && x < box.x1 + 1.2 && y < box.y1 + 2.5) !== !!inside) continue;
    const px = X(x), py = Y(y), r = Math.max(1.3, s * lerp(r0, r1, tt / tMax));
    c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); n++;
  }
  return n;
}
function drawAim(c, t) {
  RD.aimMask = 0;
  if (!RD.showAim || S.state !== 'play') return;
  const s = V.s, T = S.team[0], E = S.team[1], mine = S.phase === 'aim' && S.turn === 0;
  // 上一輪實際飛過的路線：一串淡淡的小點，盡頭打一個叉，方便照著微調
  const tr = RD.trail;
  if (mine && tr && tr.n > 1) {
    c.beginPath(); const r = Math.max(1, s * 0.2);
    for (let k = 0; k < tr.n; k++) { const px = X(tr.x[k]), py = Y(tr.y[k]); c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); }
    c.fillStyle = 'rgba(255,255,255,.34)'; c.fill();
    const ex = X(tr.x[tr.n - 1]), ey = Y(tr.y[tr.n - 1]), q = s * 0.8;
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(1.5, s * 0.26); c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - q, ey - q); c.lineTo(ex + q, ey + q); c.moveTo(ex + q, ey - q); c.lineTo(ex - q, ey + q); c.stroke();
  }
  if (mine || RD.aimOn) {
    const ax = T.aim[0], ay = T.aim[1], maxT = RD.aimT, flow = mine ? (t * 0.9) % 1 * 0.065 : 0, kmax = Math.ceil(maxT * 30) + 1;
    let first = true; const box = S.st[0];
    // 全隊打同一個點：帶頭的照瞄準的角度打，其他兵瞄帶頭那一發的落點（跟 simFire 一樣算）
    const lead = volleyLead(T), E0 = lead ? volleyEvent(0, lead, ax, ay) : null, E = RD.aimE || (RD.aimE = { ok: false, x: 0, y: 0, vx: 0, vy: 0 }), cv = RD.aimV || (RD.aimV = [0, 0]);
    if (E0) { E.ok = E0.ok; E.x = E0.x; E.y = E0.y; E.vx = E0.vx; E.vy = E0.vy; } else E.ok = false;
    const order = lead ? [lead].concat(T.units.filter((u) => u !== lead)) : T.units;
    for (const u of order) {
      if (!ableUnit(u)) continue;
      const m = muzzle(u, 1), mx = m[0], my = m[1], inBox = u.x > box.x0 - 1 && u.x < box.x1 + 1 ? box : null;
      if (u === lead) { cv[0] = ax; cv[1] = ay; } else volleyAim(0, u, ax, ay, E, cv);
      const vx = cv[0], vy = cv[1];
      let end = maxT; const P = RD.path || (RD.path = []);
      // 照試射的路線畫（碰到冰鏡、噴流、水面、山坡會轉彎）；不是自己瞄準的時候（看示範戰局）照拋物線
      const R = simTrace(0, mx, my, vx, vy, S.wind, S.time, kmax, u.w.i, P);
      if (mine) {
        RD.aimMask |= R.gm; if (R.hit && R.t < end) end = R.t;
        // 帶頭那一發的整條彈道會穿過哪些符（虛線畫不到那麼遠的也算）：符會亮起來。每四幀算一次就夠
        if (first) { if ((RD.frame & 3) === 0) RD.aimFar = R.hit ? R.gm : simTrace(0, mx, my, vx, vy, S.wind, S.time, undefined, u.w.i).gm; RD.aimMask |= RD.aimFar; }
      }
      // 帶頭那一發在自己城裡的那一段：畫淡淡的小點（吊高打的時候，起頭那一段幾乎都在城裡，不畫就看不出自己瞄哪）
      if (first && inBox && mine) { c.beginPath(); if (pathDots(c, P, mx, my, 0.05 + flow, end, maxT, 0.4, 0.3, inBox, true)) { c.fillStyle = 'rgba(255,255,255,.42)'; c.fill(); } }
      c.beginPath();
      if (!pathDots(c, P, mx, my, 0.05 + flow, end, maxT, first ? 0.6 : 0.36, first ? 0.26 : 0.18, inBox)) { first = false; continue; }
      c.fillStyle = mine ? (first ? 'rgba(255,255,255,.97)' : 'rgba(255,255,255,.55)') : 'rgba(255,255,255,.4)'; c.fill();
      if (mine && first) { c.strokeStyle = 'rgba(15,42,120,.85)'; c.lineWidth = Math.max(1, s * 0.16); c.stroke(); }
      first = false;
    }
  }
  // 敵軍瞄準的時候：一小段紅色虛線，看得出他們在瞄哪
  if (S.phase === 'aim' && S.turn === 1) {
    let lead = E.ai && E.ai.lead; if (!lead || !lead.alive) { lead = null; for (const u of E.units) if (u.alive && u.w) { lead = u; break; } }
    if (lead) {
      const big = lead.def.big ? MUZ_BIG : 1; c.beginPath();
      aimDots(c, lead.x - 1.3 * big, lead.y + 2.3 * big, E.aim[0], E.aim[1], 0.06 + (t * 0.9) % 1 * 0.065, 0.62, 0.62, 0.46, 0.2);
      c.fillStyle = 'rgba(255,150,130,.85)'; c.fill(); c.strokeStyle = 'rgba(106,11,16,.7)'; c.lineWidth = Math.max(1, s * 0.14); c.stroke();
    }
  }
}
function renderFrame(dt, rdt) {
  const c = RD.c; if (!c || !S.lv || !SCENE.cv) return;
  RD.t += rdt; RD.frame++;
  const t = RD.t;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // 震動時邊緣會露出來，先鋪一層底色
  if (FX.shx || FX.shy) { c.fillStyle = '#0d1019'; c.fillRect(0, 0, V.W, V.H); }
  c.setTransform(1, 0, 0, 1, FX.shx, FX.shy);
  sceneBack(c, t, dt);
  drawRocks(c);
  if (S.plats.length) drawPlats(c, t);
  drawObjs(c, t);
  drawAmp(c, t);
  for (const st of S.structs) drawBackdrop(c, st, rdt);
  drawBlocks(c, t, rdt);
  drawFuses(c, t);
  drawRopes(c, t);
  drawGates(c, t);
  drawUnits(c, t);
  for (const P of S.plats) if (P.kind === 'cage' && !P.dead) drawPart(c, P, t, true);
  if (S.ropes.length) { drawBlocks(c, t, rdt, 1); c.setTransform(1, 0, 0, 1, FX.shx, FX.shy); }
  drawWater(c, t);
  if (S.plats.length) drawShipMag(c);
  drawFlyers(c, t);
  drawBellGauge(c, t);
  drawShots(c);
  drawShotFx(c);
  fxDraw(c);
  drawShields(c, t, rdt);
  drawBossUI(c, t);
  drawAim(c, t);
  RD.dt = rdt; drawBubbles(c);
  sceneFront(c, t, dt);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (S.sudden && S.state === 'play') { c.fillStyle = 'rgba(255,60,20,' + (0.05 + 0.03 * Math.sin(t * 5)) + ')'; c.fillRect(0, 0, V.W, V.H); }
  if (FX.flash > 0) { c.globalAlpha = Math.min(0.8, FX.flash); c.fillStyle = FX.flashCol; c.fillRect(0, 0, V.W, V.H); c.globalAlpha = 1; }
}
