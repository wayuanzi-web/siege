/* ===== 36-scene-maple: 第十一關「古寺撞鐘」— 秋天的山寺：午後金色的陽光、層層紅葉山，谷裡有鳥居、寺院和一道細瀑布；
   戰場後面立著一座老木頭鐘架，大鐘就吊在它的大樑下；地上碎石步道、落葉、石燈籠 ===== */
THEMES[11] = (function () {
  const SX = 114, SY = 26, SR = 3.3, HAZE = '#f8dfba';         // 太陽偏西（右邊）、低低的，把五重塔照成剪影
  // 天色（戰場高度 → 顏色）：淡藍 → 紫灰 → 金黃
  const SKY = [76, '#7ca5d8', 60, '#a0bce0', 47, '#c9cde0', 36, '#edd5bd', 24, '#f9d9a8', 12, '#ffe2ae', 0, '#ffeac2', -9, '#ffeac2'];
  const PAL = ['#b8352a', '#d24a2d', '#e46a30', '#ee8c37', '#f3ad42', '#efca56'];      // 紅葉
  const TX = 50.6, FX = 58.8, HX = 43.6;      // 鳥居、瀑布、寺院（谷裡；夾在鐘架的兩根柱子中間）
  const BL = 18.3, BW = 3.1;                  // 鐘架：柱子的中線離大鐘的吊點多遠、柱子多粗
  let clouds = [], branches = [], flock = null, flockAt = 4, leaves = [], spLeaf = [], mists = [], spMist = null, sparks = [], fallY = 15;
  let bfTop = null, bfX = 0, bfY = 0, bfCut = 0;      // 鐘架的上半截：雲和雁要從它後面過，所以每一幀再貼一次（bfCut 是切開的那一列像素）
  const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  function noise(R, n) { const v = []; for (let i = 0; i < n; i++) v.push(R()); return (x) => { const i = Math.floor(x), f = x - i, a = v[((i % n) + n) % n], b = v[(((i + 1) % n) + n) % n]; return a + (b - a) * f * f * (3 - 2 * f); }; }
  function glow(c, x, y, rx, ry, col, a) { c.save(); c.translate(x, y); c.scale(rx, ry); c.fillStyle = rg(c, 0, 0, 0, 1, [0, rgba(col, a), 0.45, rgba(col, a * 0.42), 1, rgba(col, 0)]); c.fillRect(-1, -1, 2, 2); c.restore(); }
  const haze = (col, x, k) => mix(col, HAZE, clamp(k * (0.6 + 0.4 * sm((x - 40) / 70)), 0, 0.92));      // 越遠、越靠近太陽，霧越濃
  // 一片楓葉（加進路徑）：中心 (x, y)、半徑 r、轉角 a；fy 壓扁（地上的葉子）
  const LA = [0, 0.44, 0.88, 1.36, 1.84, 2.42, Math.PI, 3.86, 4.44, 4.92, 5.4, 5.84], LR = [1, 0.42, 0.9, 0.36, 0.62, 0.22, 0.2, 0.22, 0.62, 0.36, 0.9, 0.42];
  function leafPath(c, x, y, r, a, fy) { for (let i = 0; i < 12; i++) { const t = LA[i] + a, px = x + Math.sin(t) * LR[i] * r, py = y - Math.cos(t) * LR[i] * r * fy; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); }
  // 一團樹冠：影子、本色、向著太陽的亮面；k 明暗強弱
  function crown(c, x, y, r, col, k) {
    c.fillStyle = mix(col, '#5e2236', 0.32 * k); c.beginPath(); c.arc(x - r * 0.14, y + r * 0.12, r, 0, TAU); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.86, 0, TAU); c.fill();
    c.fillStyle = mix(col, '#fff1c0', 0.42 * k); c.beginPath(); c.arc(x + r * 0.3, y - r * 0.32, r * 0.42, 0, TAU); c.fill();
  }
  // 一棵樹：三團樹冠
  function tree(c, x, y, r, col, k) { crown(c, x - r * 0.55, y + r * 0.1, r * 0.66, mix(col, '#5e2236', 0.12), k); crown(c, x + r * 0.55, y + r * 0.14, r * 0.62, col, k); crown(c, x, y - r * 0.32, r * 0.82, col, k); }
  // 杉樹
  function pine(c, x, y, h, col) {
    const w = h * 0.34; c.fillStyle = col;
    for (let k = 0; k < 3; k++) { const yb = y - h * k * 0.27, ww = w * (1 - k * 0.24); c.beginPath(); c.moveTo(x - ww, yb); c.quadraticCurveTo(x, yb + h * 0.08, x + ww, yb); c.lineTo(x, yb - h * 0.46); c.closePath(); c.fill(); }
  }
  // 一層紅葉山：hf(x) 樹梢高度；先填上緣圓圓的剪影，再一排排點上樹冠（相鄰的顏色相近）。o：r0–r1 半徑、rows 排數、gap 排距、hz 霧、k 明暗、pine 杉樹比例、tree 整棵樹
  function forest(c, R, hf, o) {
    const s = V.s, XA = V.x0 - 8, XB = V.x1 + 8, nz = noise(R, 31), pick = (x, j) => PAL[clamp(Math.floor(nz(x * o.cf + j * 2.3) * 7 - 0.5 + (R() - 0.5) * 1.6), 0, 5)];
    c.beginPath(); c.moveTo(X(XA), V.H + 2); c.lineTo(X(XA), Y(hf(XA)));
    for (let x = XA; x < XB;) { const r = o.r0 + R() * (o.r1 - o.r0), y = hf(x + r) - r * 0.35; c.lineTo(X(x), Y(y)); c.arc(X(x + r), Y(y), r * s, Math.PI, 0); x += r * 2; }
    c.lineTo(X(XB + 4), V.H + 2); c.closePath();
    c.fillStyle = lg(c, 0, Y(o.top), 0, Y(o.top - 9), [0, haze(o.base, 60, o.hz), 1, haze(mix(o.base, '#5e2236', 0.25), 60, o.hz)]); c.fill();
    for (let row = 0; row < o.rows; row++) for (let x = XA + R() * 2; x < XB; x += (o.r0 + R() * (o.r1 - o.r0)) * (o.tree ? 2.1 : 1.35) * (1 + R() * 0.4)) {
      const r = (o.r0 + R() * (o.r1 - o.r0)) * (1 + row * 0.08), y = hf(x) - row * o.gap - R() * o.gap * 0.4;
      if (o.skip && o.skip(x, y)) continue;
      if (R() < o.pine) pine(c, X(x), Y(y - r * 0.9), r * 3 * s, haze('#3d6449', x, o.hz));
      else if (o.tree) tree(c, X(x), Y(y), r * s, haze(pick(x, row), x, o.hz), o.k);
      else crown(c, X(x), Y(y), r * s, haze(pick(x, row), x, o.hz), o.k);
    }
  }
  // 夕照的雲：奶油色、下緣玫瑰紫，朝太陽那邊亮
  function cloud(w, h, R) {
    const cv = mkCanvas(w, h), g = cv.getContext('2d'), n = 7 + ((R() * 4) | 0);
    g.beginPath(); for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, x = w * (0.1 + 0.8 * u), r = h * (0.2 + 0.3 * Math.sin(u * Math.PI) + R() * 0.08), y = h * 0.68 - r * 0.3; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
    g.rect(w * 0.1, h * 0.55, w * 0.8, h * 0.25); g.fillStyle = lg(g, 0, 0, 0, h, [0, '#fff7e6', 0.45, '#ffe4c6', 0.78, '#f2bcb2', 1, '#dea6b6']); g.fill();
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = lg(g, w * 0.35, h * 0.6, w * 0.85, 0, [0, 'rgba(255,248,226,0)', 1, 'rgba(255,250,232,.85)']); g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = lg(g, 0, 0, 0, h, [0, '#000', 0.66, '#000', 1, 'rgba(0,0,0,0)']); g.fillRect(0, 0, w, h);
    return cv;
  }
  // 從畫面上角伸進來的楓枝（像素座標）：(x0, y0) 起點，d 往右（+1）或往左（-1）
  function branch(c, R, x0, y0, d, k, pal) {
    const s = V.s * k, tw = [];
    c.strokeStyle = '#4e2c22'; c.lineCap = 'round';
    const limb = (x, y, a, len, w, n) => {
      c.lineWidth = w; c.beginPath(); c.moveTo(x, y); let px = x, py = y;
      for (let i = 1; i <= n; i++) { a += (R() - 0.5) * 0.35; px += Math.cos(a) * len / n; py += Math.sin(a) * len / n; c.lineTo(px, py); if (i > 1) tw.push([px, py]); }
      c.stroke(); return [px, py, a];
    };
    const m = limb(x0, y0, d > 0 ? 0.42 : Math.PI - 0.42, s * 15, s * 0.55, 5);
    for (let i = 0; i < 4; i++) { const p = tw[1 + i * 2] || tw[tw.length - 1]; limb(p[0], p[1], (d > 0 ? 0.42 : Math.PI - 0.42) + (i & 1 ? 0.75 : -0.35) * d, s * (3 + R() * 3), s * 0.22, 3); }
    tw.push([m[0], m[1]]);
    for (const [x, y] of tw) for (let j = 0; j < 11; j++) {
      const a = R() * TAU, r = s * (0.62 + R() * 0.42), lx = x + Math.cos(a) * s * 1.6 * R(), ly = y + Math.abs(Math.sin(a)) * s * 1.4 * R(), col = pal[(R() * pal.length) | 0], b = Math.PI + (R() - 0.5) * 1.8;
      c.fillStyle = col; c.beginPath(); leafPath(c, lx, ly, r, b, 1); c.fill();
      c.strokeStyle = mix(col, '#4a1410', 0.4); c.lineWidth = Math.max(1, r * 0.08); c.beginPath(); c.moveTo(lx - Math.sin(b) * r * 0.2, ly + Math.cos(b) * r * 0.2); c.lineTo(lx + Math.sin(b) * r * 0.8, ly - Math.cos(b) * r * 0.8); c.stroke();
    }
  }
  // 鳥居（像素座標）：(x, y) 地面中間，h 高
  function torii(c, x, y, h, col, top) {
    const w = h * 1.15, lw = h * 0.1;
    c.fillStyle = col;
    for (const d of [-1, 1]) { poly(c, [x + d * w * 0.34 - lw / 2, y, x + d * w * 0.31 - lw * 0.4, y - h * 0.86, x + d * w * 0.31 + lw * 0.4, y - h * 0.86, x + d * w * 0.34 + lw / 2, y]); c.fill(); }
    c.fillRect(x - w * 0.42, y - h * 0.72, w * 0.84, lw * 0.75);
    c.beginPath(); c.moveTo(x - w * 0.56, y - h * 0.97); c.quadraticCurveTo(x, y - h * 0.86, x + w * 0.56, y - h * 0.97); c.lineTo(x + w * 0.5, y - h * 0.86); c.quadraticCurveTo(x, y - h * 0.78, x - w * 0.5, y - h * 0.86); c.closePath(); c.fill();
    c.fillStyle = top; c.beginPath(); c.moveTo(x - w * 0.6, y - h * 1.02); c.quadraticCurveTo(x, y - h * 0.91, x + w * 0.6, y - h * 1.02); c.lineTo(x + w * 0.56, y - h * 0.95); c.quadraticCurveTo(x, y - h * 0.86, x - w * 0.56, y - h * 0.95); c.closePath(); c.fill();
    c.fillRect(x - lw * 0.3, y - h * 0.86, lw * 0.6, h * 0.14);
  }
  // 寺院：翹角的屋頂、朱紅柱子和白牆（像素座標，(x, y) 牆腳中間）
  function temple(c, x, y, w, roofC, ridge, wall, post) {
    const h = w * 0.62;
    c.fillStyle = wall; c.fillRect(x - w * 0.36, y - h * 0.42, w * 0.72, h * 0.42);
    c.fillStyle = post; for (let k = 0; k <= 4; k++) c.fillRect(x - w * 0.36 + k * w * 0.18 - w * 0.02, y - h * 0.42, w * 0.04, h * 0.42);
    c.fillStyle = mix(post, '#2a1a18', 0.3); c.fillRect(x - w * 0.38, y - h * 0.46, w * 0.76, h * 0.06);
    c.fillStyle = roofC; c.beginPath(); c.moveTo(x - w * 0.62, y - h * 0.5); c.quadraticCurveTo(x - w * 0.46, y - h * 0.5, x - w * 0.38, y - h * 0.66); c.lineTo(x - w * 0.26, y - h * 0.98); c.lineTo(x + w * 0.26, y - h * 0.98); c.lineTo(x + w * 0.38, y - h * 0.66); c.quadraticCurveTo(x + w * 0.46, y - h * 0.5, x + w * 0.62, y - h * 0.5);
    c.quadraticCurveTo(x + w * 0.5, y - h * 0.55, x + w * 0.44, y - h * 0.47); c.lineTo(x - w * 0.44, y - h * 0.47); c.quadraticCurveTo(x - w * 0.5, y - h * 0.55, x - w * 0.62, y - h * 0.5); c.closePath(); c.fill();
    c.fillStyle = ridge; c.fillRect(x - w * 0.29, y - h * 1.04, w * 0.58, h * 0.08);
    c.beginPath(); c.moveTo(x + w * 0.26, y - h * 0.98); c.lineTo(x + w * 0.38, y - h * 0.66); c.quadraticCurveTo(x + w * 0.46, y - h * 0.5, x + w * 0.62, y - h * 0.5); c.quadraticCurveTo(x + w * 0.46, y - h * 0.56, x + w * 0.34, y - h * 0.64); c.lineTo(x + w * 0.2, y - h * 0.98); c.closePath(); c.fill();
  }
  // 石燈籠（戰場座標）：底在 (x, y)，高約 4.6k
  function lantern(c, x, y, k) {
    const s = V.s * k, px = X(x), py = Y(y), lt = '#d6cfbf', md = '#a69e8d', dk = '#6c6557';
    const box = (x0, y0, w, h, r) => { rrect(c, px + x0 * s, py - y0 * s - h * s, w * s, h * s, r * s); c.fillStyle = lg(c, px + x0 * s, 0, px + (x0 + w) * s, 0, [0, dk, 0.35, md, 0.75, lt, 1, md]); c.fill(); };
    glow(c, px, py + s * 0.1, s * 1.6, s * 0.35, '#4a3020', 0.4);
    box(-1.05, 0, 2.1, 0.45, 0.1); box(-0.34, 0.4, 0.68, 1.55, 0.06); box(-0.82, 1.9, 1.64, 0.38, 0.08); box(-0.6, 2.24, 1.2, 0.95, 0.05);
    glow(c, px, py - 2.72 * s, s * 1.3, s * 1, '#ffc860', 0.4); c.fillStyle = '#ffd47e'; c.fillRect(px - 0.3 * s, py - 3.0 * s, 0.6 * s, 0.55 * s);
    c.fillStyle = '#6a6052'; c.fillRect(px - 0.04 * s, py - 3.0 * s, 0.08 * s, 0.55 * s);
    c.beginPath(); c.moveTo(px - 1.32 * s, py - 3.1 * s); c.quadraticCurveTo(px - 0.8 * s, py - 3.3 * s, px - 0.28 * s, py - 3.92 * s); c.lineTo(px + 0.28 * s, py - 3.92 * s); c.quadraticCurveTo(px + 0.8 * s, py - 3.3 * s, px + 1.32 * s, py - 3.1 * s); c.lineTo(px + 1.15 * s, py - 3.2 * s); c.lineTo(px - 1.15 * s, py - 3.2 * s); c.closePath();
    c.fillStyle = lg(c, px - 1.3 * s, 0, px + 1.3 * s, 0, [0, dk, 0.45, md, 0.8, lt, 1, md]); c.fill();
    c.fillStyle = md; c.beginPath(); c.arc(px, py - 4.1 * s, 0.25 * s, 0, TAU); c.fill(); c.beginPath(); c.moveTo(px - 0.13 * s, py - 4.24 * s); c.lineTo(px, py - 4.62 * s); c.lineTo(px + 0.13 * s, py - 4.24 * s); c.fill();
    c.fillStyle = 'rgba(118,148,70,.8)';      // 苔
    for (const [u, v, r] of [[-0.7, 3.27, 0.22], [-0.42, 3.45, 0.18], [0.88, 3.18, 0.14], [-0.85, 0.32, 0.2], [0.6, 0.38, 0.16], [-0.3, 2.24, 0.12]]) { c.beginPath(); c.ellipse(px + u * s, py - v * s, r * s * 1.6, r * s * 0.7, 0, 0, TAU); c.fill(); }
  }
  /* 鐘架（戰場座標）：兩根曬得灰白的老木柱、一根大樑，樑上一排斗栱托著一溜瓦頂；大鐘的鐵鍊吊在大樑底面的正中間 (ax, ay)。
     它沒有實體，所以整座蒙一層霧、柱腳藏在近景的樹後面，看起來站在戰場後面一點（鐘在柱子前面盪過去）。
     亂數自己開一個，畫兩次（遠景一次、上半截的小圖一次）才會一模一樣 */
  function belfry(c, ax, ay) {
    const s = V.s, R = mkRand(1177), hw = BW / 2, PX = [ax - BL, ax + BL], lw = (k) => Math.max(1, s * k);
    const hz = (col, x) => haze(col, x === undefined ? ax : x, 0.3);
    const wp = (p) => { c.beginPath(); c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.closePath(); };
    const yT = ay + 2.0, bx0 = PX[0] - 3.4, bx1 = PX[1] + 3.4, bt = (x) => yT + 0.12 * (1 - Math.pow((x - ax) / (bx1 - ax), 2));      // 大樑頂（中間微微拱起）
    const E0 = yT + 0.5, ES = bx1 + 2.1 - ax, ye = (x) => { const t = Math.min(1, Math.abs(x - ax) / ES); return E0 + 0.15 * t * t + 0.62 * Math.pow(t, 5); };      // 屋簷的下緣：整條微微彎、兩頭往上翹
    const RY = E0 + 1.72, RS = BL - 1.6;                                                                                               // 屋脊的高度、半長
    // --- 柱子：四方的老木頭，兩邊削角（背光那一邊暗、朝太陽那一邊一道亮邊）；曬白、雨水流下來的痕、零碎的木紋、乾裂、節 ---
    for (const px of PX) {
      const x0 = X(px - hw), x1 = X(px + hw), y0 = Y(yT), y1 = Y(-2), ch = s * 0.32;
      c.fillStyle = hz('#665140', px); c.fillRect(x0, y0, x1 - x0, y1 - y0);
      c.fillStyle = lg(c, x0 + ch, 0, x1 - ch, 0, [0, 'rgba(38,28,22,.26)', 0.45, 'rgba(38,28,22,0)', 0.8, 'rgba(255,232,196,0)', 1, 'rgba(255,232,196,.1)']); c.fillRect(x0 + ch, y0, x1 - x0 - ch * 2, y1 - y0);
      c.fillStyle = hz('#443529', px); c.fillRect(x0, y0, ch, y1 - y0);
      c.fillStyle = lg(c, x1 - ch, 0, x1, 0, [0, hz('#9b7e5c', px), 1, hz('#f2c88c', px)]); c.fillRect(x1 - ch, y0, ch, y1 - y0);
      c.save(); c.beginPath(); c.rect(x0 + ch, y0, x1 - x0 - ch * 2, y1 - y0); c.clip();
      for (let k = 0; k < 4; k++) { const u = px - hw + 0.4 + R() * (BW - 1.1), ya = 3 + R() * 34, yb = ya + 6 + R() * 12; c.fillStyle = lg(c, 0, Y(yb), 0, Y(ya), [0, 'rgba(228,214,194,0)', 0.3, 'rgba(228,214,194,.14)', 1, 'rgba(228,214,194,0)']); c.fillRect(X(u), Y(yb), s * (0.35 + R() * 0.5), (yb - ya) * s); }
      for (let k = 0; k < 3; k++) { const u = px - hw + 0.4 + R() * (BW - 1), len = 5 + R() * 14; c.fillStyle = lg(c, 0, Y(yT), 0, Y(yT - len), [0, 'rgba(36,26,22,.3)', 1, 'rgba(36,26,22,0)']); c.fillRect(X(u), Y(yT), s * (0.2 + R() * 0.35), len * s); }      // 雨水從樑上流下來的痕
      c.strokeStyle = 'rgba(46,34,27,.24)'; c.lineWidth = lw(0.06); c.beginPath();
      for (let k = 0; k < 12; k++) { let x = px - hw + 0.5 + R() * (BW - 1); const ya = -2 + R() * (yT + 2), len = 3 + R() * 10; c.moveTo(X(x), Y(ya)); for (let y = ya + 1; y < Math.min(yT, ya + len); y += 1) { x += (R() - 0.5) * 0.06; c.lineTo(X(x), Y(y)); } }
      c.stroke();
      for (let k = 0; k < 3; k++) {
        let x = px - hw + 0.55 + R() * (BW - 1.3); const ya = 5 + R() * 30, len = 4 + R() * 10; c.beginPath(); c.moveTo(X(x), Y(ya));
        for (let y = ya + 0.8; y < ya + len; y += 0.8) { x += (R() - 0.5) * 0.14; c.lineTo(X(x), Y(y)); }
        c.strokeStyle = 'rgba(32,22,18,.55)'; c.lineWidth = lw(0.13); c.stroke();
        c.save(); c.translate(lw(0.13), 0); c.strokeStyle = 'rgba(236,212,176,.22)'; c.lineWidth = lw(0.06); c.stroke(); c.restore();
      }
      for (let k = 0; k < 2; k++) { const kx = X(px - hw + 0.7 + R() * (BW - 1.4)), ky = Y(8 + R() * 30), r = s * (0.16 + R() * 0.1); c.fillStyle = 'rgba(40,28,22,.45)'; ell(c, kx, ky, r * 0.8, r * 1.5); c.fill(); c.strokeStyle = 'rgba(236,212,176,.18)'; c.lineWidth = lw(0.05); ell(c, kx, ky, r * 1.4, r * 2.4); c.stroke(); }
      c.restore();
      // 柱腳一帶：谷裡的霧把它蒙住
      c.fillStyle = lg(c, 0, Y(13), 0, Y(1), [0, 'rgba(250,232,204,0)', 1, 'rgba(250,232,204,.62)']); c.fillRect(x0, Y(13), x1 - x0, Y(-2) - Y(13));
      // 柱頭下面一道鐵箍
      c.fillStyle = hz('#3e3a42', px); c.fillRect(x0 - lw(0.05), Y(ay - 4.6), x1 - x0 + lw(0.1), s * 0.62);
      c.fillStyle = 'rgba(160,150,165,.35)'; c.fillRect(x0 - lw(0.05), Y(ay - 4.6), x1 - x0 + lw(0.1), lw(0.1));
      c.fillStyle = hz('#c79a4a', px); for (const u of [-0.75, 0, 0.75]) { c.beginPath(); c.arc(X(px + u), Y(ay - 4.91), s * 0.11, 0, TAU); c.fill(); }
    }
    // --- 柱子上的注連繩、紙垂，和幾張貼著的符紙 ---
    // 紙垂：一條折成閃電形的白紙（d 往哪邊折）
    const shide = (x, y, h, d) => {
      c.beginPath(); c.moveTo(X(x), Y(y)); c.lineTo(X(x + d * 0.38), Y(y - h * 0.3)); c.lineTo(X(x - d * 0.02), Y(y - h * 0.52)); c.lineTo(X(x + d * 0.4), Y(y - h * 0.78)); c.lineTo(X(x + d * 0.1), Y(y - h));
      c.lineJoin = 'miter'; c.lineCap = 'butt'; c.strokeStyle = 'rgba(96,82,70,.4)'; c.lineWidth = s * 0.46; c.stroke(); c.strokeStyle = hz('#f8f4ea', x); c.lineWidth = s * 0.34; c.stroke();
    };
    for (const px of PX) {
      const y = 33.6, xa = px - hw - 0.45, xb = px + hw + 0.45;
      for (const [x, d] of [[px - 0.75, -1], [px + 0.75, 1]]) shide(x, y - 0.3, 2.9, d);
      c.beginPath(); c.moveTo(X(xa), Y(y + 0.46)); c.quadraticCurveTo(X(px), Y(y + 0.06), X(xb), Y(y + 0.46)); c.lineTo(X(xb), Y(y - 0.4)); c.quadraticCurveTo(X(px), Y(y - 0.8), X(xa), Y(y - 0.4)); c.closePath();
      c.fillStyle = lg(c, 0, Y(y + 0.5), 0, Y(y - 0.7), [0, hz('#e8d08c', px), 0.5, hz('#c8a75e', px), 1, hz('#8a6e36', px)]); c.fill();
      c.strokeStyle = rgba(hz('#765a2a', px), 0.75); c.lineWidth = lw(0.1); c.beginPath();
      for (let x = xa + 0.25; x < xb - 0.1; x += 0.42) { const k = (x - px) / (xb - xa) * 2, dy = -0.38 * (1 - k * k); c.moveTo(X(x - 0.16), Y(y + 0.4 + dy)); c.lineTo(X(x + 0.2), Y(y - 0.36 + dy)); }
      c.stroke();
      c.fillStyle = hz('#6d5a2c', px); for (const x of [xa - 0.1, xb + 0.1]) { c.beginPath(); c.moveTo(X(x - 0.14), Y(y + 0.3)); c.lineTo(X(x + 0.14), Y(y + 0.3)); c.lineTo(X(x + 0.24), Y(y - 1.5)); c.lineTo(X(x - 0.24), Y(y - 1.5)); c.closePath(); c.fill(); }      // 繩頭垂下來的穗
    }
    const fuda = (x, y, a, h) => {
      c.save(); c.translate(X(x), Y(y)); c.rotate(a); const w = 0.78 * s, H = h * s;
      c.beginPath(); c.moveTo(-w / 2, -H); c.lineTo(w / 2, -H); c.lineTo(w / 2, -H * 0.06); c.lineTo(w * 0.22, 0); c.lineTo(0, -H * 0.08); c.lineTo(-w * 0.28, -H * 0.02); c.lineTo(-w / 2, -H * 0.1); c.closePath();
      c.fillStyle = hz('#efe3c4', x); c.fill();
      c.fillStyle = hz('#b8432e', x); c.fillRect(-w * 0.27, -H * 0.92, w * 0.54, w * 0.5);
      c.strokeStyle = hz('#4a3830', x); c.lineWidth = lw(0.085); c.lineCap = 'round'; c.beginPath();
      c.moveTo(0, -H * 0.7); c.lineTo(0, -H * 0.18); for (let k = 0; k < 4; k++) { const yy = -H * (0.66 - k * 0.12); c.moveTo(-w * 0.24, yy); c.lineTo(w * 0.24, yy + (k & 1 ? 1 : -1) * s * 0.05); }
      c.stroke(); c.restore();
    };
    fuda(PX[0] - 0.45, 24.2, -0.04, 2.9); fuda(PX[0] + 0.5, 22.8, 0.05, 2.5); fuda(PX[1] - 0.4, 23.6, 0.03, 2.7); fuda(PX[1] + 0.55, 25.6, -0.06, 2.2);
    // --- 雀替：大樑和柱子接頭底下雕成捲雲的托木 ---
    const brace = (xp, d, len) => {
      c.beginPath(); c.moveTo(X(xp), Y(ay + 0.3)); c.lineTo(X(xp + d * len), Y(ay + 0.3)); c.lineTo(X(xp + d * len), Y(ay - 0.34));
      c.quadraticCurveTo(X(xp + d * len * 0.8), Y(ay - 0.36), X(xp + d * len * 0.66), Y(ay - 0.78));
      c.quadraticCurveTo(X(xp + d * len * 0.56), Y(ay - 1.12), X(xp + d * len * 0.42), Y(ay - 1.0));
      c.quadraticCurveTo(X(xp + d * len * 0.2), Y(ay - 1.2), X(xp + d * len * 0.1), Y(ay - 2.2));
      c.lineTo(X(xp), Y(ay - 2.7)); c.closePath();
      c.fillStyle = lg(c, 0, Y(ay), 0, Y(ay - 2.7), [0, hz('#6d5747', xp), 1, hz('#54433a', xp)]); c.fill();
      c.strokeStyle = 'rgba(40,28,24,.35)'; c.lineWidth = lw(0.07); c.beginPath(); c.arc(X(xp + d * len * 0.56), Y(ay - 0.62), s * 0.3, 0, TAU); c.stroke();
      c.strokeStyle = rgba(hz('#f0cd98', xp), 0.45); c.lineWidth = lw(0.07); c.beginPath(); c.moveTo(X(xp + d * len * 0.66), Y(ay - 0.7)); c.quadraticCurveTo(X(xp + d * len * 0.56), Y(ay - 1.02), X(xp + d * len * 0.42), Y(ay - 0.92)); c.stroke();
    };
    for (const px of PX) { brace(px + hw, 1, px < ax ? 4.6 : 2.4); brace(px - hw, -1, px < ax ? 2.4 : 4.6); }
    // --- 簷下：暗暗的簷底，一排椽子的頭（大樑會蓋住它的下緣） ---
    const ex0 = ax - ES, ex1 = ax + ES;
    c.beginPath(); for (let x = ex0; x <= ex1; x += 0.5) c.lineTo(X(x), Y(ye(x) + 0.05)); for (let x = ex1; x >= ex0; x -= 0.5) c.lineTo(X(x), Y(ye(x) - 0.62)); c.closePath();
    c.fillStyle = hz('#3b3236'); c.fill();
    c.fillStyle = hz('#b89a72'); for (let x = ex0 + 0.4; x < ex1 - 0.2; x += 0.5) c.fillRect(X(x - 0.11), Y(ye(x) - 0.06), s * 0.22, s * 0.26);
    // --- 大樑：底面平平的，頂面中間微微拱起；兩頭雕成捲雲的樑頭 ---
    c.beginPath(); c.moveTo(X(bx0 + 1), Y(ay)); c.lineTo(X(bx1 - 1), Y(ay));
    c.quadraticCurveTo(X(bx1 - 0.1), Y(ay + 0.05), X(bx1), Y(ay + 1)); c.lineTo(X(bx1), Y(bt(bx1)));
    for (let x = bx1 - 1; x > bx0; x -= 1) c.lineTo(X(x), Y(bt(x)));
    c.lineTo(X(bx0), Y(bt(bx0))); c.lineTo(X(bx0), Y(ay + 1)); c.quadraticCurveTo(X(bx0 + 0.1), Y(ay + 0.05), X(bx0 + 1), Y(ay)); c.closePath();
    c.fillStyle = lg(c, 0, Y(yT + 0.15), 0, Y(ay), [0, hz('#8a7360'), 0.22, hz('#715b49'), 0.75, hz('#5d4a3c'), 1, hz('#45362d')]); c.fill();
    c.save(); c.clip();
    c.strokeStyle = 'rgba(44,32,26,.26)'; c.lineWidth = lw(0.07); c.beginPath();
    for (let k = 0; k < 4; k++) { const y0 = ay + 0.35 + k * 0.42 + R() * 0.1, ph = R() * TAU; for (let x = bx0; x <= bx1 + 1; x += 1.5) { const yy = Y(y0 + Math.sin(x * 0.17 + ph) * 0.05); if (x === bx0) c.moveTo(X(x), yy); else c.lineTo(X(x), yy); } }
    c.stroke();
    for (let k = 0; k < 4; k++) { let x = bx0 + 3 + R() * (bx1 - bx0 - 6), y = ay + 0.6 + R() * 1; c.beginPath(); c.moveTo(X(x), Y(y)); for (let j = 0; j < 6; j++) { x += 0.7 + R() * 0.5; y += (R() - 0.5) * 0.12; c.lineTo(X(x), Y(y)); } c.strokeStyle = 'rgba(34,24,20,.45)'; c.lineWidth = lw(0.1); c.stroke(); }
    c.fillStyle = 'rgba(40,30,26,.35)'; c.fillRect(X(bx0), Y(ay + 0.28), (bx1 - bx0) * s, s * 0.28);
    c.restore();
    c.strokeStyle = rgba(hz('#f2cf9a'), 0.55); c.lineWidth = lw(0.12); c.beginPath(); c.moveTo(X(bx0), Y(bt(bx0) - 0.06)); for (let x = bx0 + 1; x < bx1; x += 1) c.lineTo(X(x), Y(bt(x) - 0.06)); c.lineTo(X(bx1), Y(bt(bx1) - 0.06)); c.stroke();
    for (const [x, d] of [[bx0, 1], [bx1, -1]]) {      // 樑頭的捲雲紋、包著的銅皮
      c.strokeStyle = 'rgba(40,28,24,.4)'; c.lineWidth = lw(0.08); c.beginPath(); c.arc(X(x + d * 0.62), Y(ay + 0.86), s * 0.34, 0, TAU); c.moveTo(X(x + d * 0.62) + s * 0.15, Y(ay + 0.86)); c.arc(X(x + d * 0.62), Y(ay + 0.86), s * 0.15, 0, TAU); c.stroke();
      c.fillStyle = hz('#6f8a76', x); c.fillRect(Math.min(X(x), X(x + d * 0.34)), Y(bt(x) + 0.02), s * 0.34, s * (bt(x) - ay - 0.9));
    }
    // 吊鐘的鐵箍：鐵鍊就從它底下的吊環掛下來
    c.fillStyle = lg(c, X(ax - 1.45), 0, X(ax + 1.45), 0, [0, hz('#2f2c34'), 0.6, hz('#46414c'), 0.85, hz('#6b6572'), 1, hz('#3a3640')]); c.fillRect(X(ax - 1.45), Y(bt(ax) + 0.08), s * 2.9, (bt(ax) + 0.08 - ay) * s);
    c.fillStyle = hz('#c79a4a'); for (const u of [-1.05, 1.05]) for (const v of [0.45, 1.5]) { c.beginPath(); c.arc(X(ax + u), Y(ay + v), s * 0.13, 0, TAU); c.fill(); }
    // --- 斗栱：大樑頂上一排托木，撐著屋簷（簷下的影子裡） ---
    for (const x of [PX[0], ax - 9.2, ax, ax + 9.2, PX[1]]) {
      const y0 = bt(x) - 0.03, big = x === PX[0] || x === PX[1];
      if (big) { wp([x - 2.1, y0 + 0.32, x + 2.1, y0 + 0.32, x + 2.1, y0 + 0.6, x - 2.1, y0 + 0.6]); c.fillStyle = hz('#5f4c3e', x); c.fill(); }      // 肘木
      wp([x - 0.5, y0, x + 0.5, y0, x + 0.68, y0 + 0.3, x + 0.68, y0 + 0.36, x - 0.68, y0 + 0.36, x - 0.68, y0 + 0.3]); c.fillStyle = hz('#6a5444', x); c.fill();
      if (big) for (const u of [-1.6, 1.6]) { wp([x + u - 0.32, y0 + 0.6, x + u + 0.32, y0 + 0.6, x + u + 0.4, y0 + 0.75, x + u - 0.4, y0 + 0.75]); c.fillStyle = hz('#6a5444', x); c.fill(); }
    }
    // --- 瓦頂：屋簷兩頭往上翹，一排瓦當、一條條筒瓦，頂上一道屋脊、兩頭的鬼瓦 ---
    c.beginPath(); c.moveTo(X(ex0), Y(ye(ex0) + 0.42));
    c.quadraticCurveTo(X(ax - RS - 1.6), Y(RY - 0.2), X(ax - RS), Y(RY)); c.lineTo(X(ax + RS), Y(RY)); c.quadraticCurveTo(X(ax + RS + 1.6), Y(RY - 0.2), X(ex1), Y(ye(ex1) + 0.42));
    for (let x = ex1; x >= ex0; x -= 0.5) c.lineTo(X(x), Y(ye(x)));
    c.closePath();
    c.fillStyle = lg(c, 0, Y(RY), 0, Y(E0), [0, hz('#8a91a0'), 0.6, hz('#6c7381'), 1, hz('#5a606d')]); c.fill();
    c.save(); c.clip();
    c.fillStyle = 'rgba(30,26,34,.35)'; c.beginPath(); c.moveTo(X(ex0), Y(ye(ex0) + 0.42)); for (let x = ex0; x <= ex1; x += 0.5) c.lineTo(X(x), Y(ye(x) + 0.42)); for (let x = ex1; x >= ex0; x -= 0.5) c.lineTo(X(x), Y(ye(x) + 0.6)); c.closePath(); c.fill();
    c.lineCap = 'butt';
    for (let x = ex0 + 0.3; x < ex1; x += 0.56) { c.fillStyle = 'rgba(28,24,32,.3)'; c.fillRect(X(x - 0.2), Y(RY), s * 0.12, (RY - ye(x)) * s); c.fillStyle = rgba(hz('#b9c0cc', x), 0.6); c.fillRect(X(x - 0.06), Y(RY), s * 0.16, (RY - ye(x) - 0.45) * s); }
    c.restore();
    c.fillStyle = hz('#4c525e'); for (let x = ex0 + 0.25; x < ex1; x += 0.56) { c.beginPath(); c.arc(X(x), Y(ye(x) + 0.2), s * 0.2, 0, TAU); c.fill(); }      // 瓦當
    c.fillStyle = rgba(hz('#c4cad4'), 0.6); for (let x = ex0 + 0.25; x < ex1; x += 0.56) { c.beginPath(); c.arc(X(x + 0.05), Y(ye(x) + 0.26), s * 0.08, 0, TAU); c.fill(); }
    wp([ax - RS - 0.5, RY - 0.05, ax + RS + 0.5, RY - 0.05, ax + RS + 0.5, RY + 0.42, ax - RS - 0.5, RY + 0.42]); c.fillStyle = hz('#3c414c'); c.fill();
    c.fillStyle = rgba(hz('#a9b0bd'), 0.5); c.fillRect(X(ax - RS - 0.5), Y(RY + 0.42), (RS * 2 + 1) * s, lw(0.08));
    for (const d of [-1, 1]) {
      const x = ax + d * (RS + 0.5);
      c.beginPath(); c.moveTo(X(x - d * 0.3), Y(RY - 0.1)); c.lineTo(X(x + d * 0.4), Y(RY - 0.1)); c.quadraticCurveTo(X(x + d * 0.78), Y(RY + 0.5), X(x + d * 0.56), Y(RY + 1.12)); c.quadraticCurveTo(X(x + d * 0.36), Y(RY + 0.86), X(x + d * 0.1), Y(RY + 0.82)); c.quadraticCurveTo(X(x - d * 0.2), Y(RY + 0.8), X(x - d * 0.3), Y(RY + 0.5)); c.closePath(); c.fillStyle = hz('#3c414c'); c.fill();      // 鴟尾
      // 簷角掛的風鐸
      const tx = ax + d * (ES - 0.25), ty = ye(tx);
      c.strokeStyle = hz('#3a3640', tx); c.lineWidth = lw(0.06); c.beginPath(); c.moveTo(X(tx), Y(ty)); c.lineTo(X(tx), Y(ty - 0.5)); c.stroke();
      wp([tx - 0.18, ty - 0.5, tx + 0.18, ty - 0.5, tx + 0.28, ty - 1.15, tx - 0.28, ty - 1.15]); c.fillStyle = hz('#7a8a6e', tx); c.fill();
    }
  }

  return {
    key: 'maple',
    build(c, W, H) {
      const R = mkRand(1101), s = V.s, XA = V.x0 - 8, XB = V.x1 + 8;
      const st = []; for (let i = 0; i < SKY.length; i += 2) st.push((SKY[0] - SKY[i]) / (SKY[0] - SKY[SKY.length - 2]), SKY[i + 1]);
      c.fillStyle = lg(c, 0, Y(SKY[0]), 0, Y(SKY[SKY.length - 2]), st); c.fillRect(0, 0, W, H);
      glow(c, X(-14), Y(72), s * 80, s * 40, '#6d8ed4', 0.22);
      // 太陽的暖光
      const sx = X(SX), sy = Y(SY);
      c.fillStyle = rg(c, sx, sy, 0, s * 84, [0, 'rgba(255,244,206,.95)', 0.07, 'rgba(255,228,164,.7)', 0.22, 'rgba(255,204,136,.36)', 0.5, 'rgba(255,190,140,.13)', 1, 'rgba(255,186,150,0)']); c.fillRect(0, 0, W, H);
      // 金邊的薄雲
      for (const [x, y, w, h, a] of [[100, 31.5, 20, 0.8, 0.55], [124, 33.5, 16, 0.7, 0.5], [106, 20.5, 15, 0.6, 0.45], [-6, 47, 26, 1, 0.3], [132, 21.5, 13, 0.55, 0.45], [20, 41, 16, 0.6, 0.18]]) {
        glow(c, X(x), Y(y), s * w, s * h * 1.7, '#fff3dc', a * 0.65); glow(c, X(x + w * 0.1), Y(y - h * 0.35), s * w * 0.8, s * h, '#ffd59a', a);
      }
      // 太陽
      glow(c, sx, sy, s * SR * 3.6, s * SR * 3.6, '#fff4cf', 0.8);
      c.fillStyle = rg(c, sx - s * SR * 0.25, sy - s * SR * 0.25, 0, s * SR, [0, '#fffef4', 0.7, '#fff7d8', 1, '#ffe8a6']); c.beginPath(); c.arc(sx, sy, s * SR, 0, TAU); c.fill();
      // 最遠的山：淡藍紫
      const f0 = ridgeFn(R, 0.035), f1 = ridgeFn(R, 0.055), f2 = ridgeFn(R, 0.07), f3 = ridgeFn(R, 0.1), f4 = ridgeFn(R, 0.13);
      const h0 = (x) => 24.5 + 5.5 * f0(x) - 4.5 * Math.exp(-Math.pow((x - 55) / 20, 2)) - 6.5 * sm((x - 88) / 34);
      ridge(c, h0, 0, 1, lg(c, X(-20), 0, X(130), 0, [0, '#a3abd6', 0.45, '#bdb7d6', 0.78, '#e6cfc8', 1, '#f6dfc6']), 0.8);
      c.fillStyle = lg(c, 0, Y(24), 0, Y(10), [0, 'rgba(248,223,190,0)', 1, 'rgba(248,223,190,.55)']); c.fillRect(0, Y(24), W, Y(8) - Y(24));
      // 第二層：紫紅的山坡上淡淡的紅葉、杉林；山腳一層霧
      const h1 = (x) => 16.5 + 4.5 * f1(x) - 4.5 * Math.exp(-Math.pow((x - 52) / 14, 2)) - 3 * sm((x - 95) / 25);
      c.beginPath(); c.moveTo(X(XA), H + 2); for (let x = XA; x <= XB; x += 0.8) c.lineTo(X(x), Y(h1(x))); c.lineTo(X(XB), H + 2); c.closePath();
      c.fillStyle = lg(c, X(-20), 0, X(130), 0, [0, '#a98aa8', 0.5, '#c497a6', 0.82, '#e8bfae', 1, '#f2d2b6']); c.fill();
      c.save(); c.clip();
      for (let k = 0; k < 70; k++) { const x = lerp(XA, XB, R()), y = h1(x) - 0.6 - R() * 7, col = ['#d9787a', '#e89a68', '#efbd74', '#c9686e', '#8d9a84'][(R() * 5) | 0]; glow(c, X(x), Y(y), s * (1.6 + R() * 2.6), s * (0.8 + R() * 1.2), haze(col, x, 0.35), 0.5); }
      c.restore();
      c.fillStyle = lg(c, 0, Y(18), 0, Y(6), [0, 'rgba(248,223,186,0)', 1, 'rgba(248,223,186,.6)']); c.fillRect(0, Y(18), W, Y(4) - Y(18));
      // 第三層：稜線上一排小樹；谷口右邊的山崖掛著瀑布
      const h2 = (x) => 12.6 + 3.4 * f2(x) - 4 * Math.exp(-Math.pow((x - 50) / 9, 2)) + 3 * Math.exp(-Math.pow((x - FX - 0.4) / 3, 2));
      forest(c, R, h2, { r0: 0.36, r1: 0.52, rows: 2, gap: 0.6, hz: 0.7, k: 0.15, pine: 0.05, cf: 0.07, top: 16, base: '#c99a9e' });
      const fy0 = fallY = h2(FX) - 0.9, fb = fy0 - 8.4, cl = [FX - 2.5, fb, FX - 2.2, fy0 - 2.2, FX - 1.5, fy0 - 0.5, FX - 0.5, fy0 + 0.25, FX + 0.5, fy0 + 0.2, FX + 1.3, fy0 - 0.6, FX + 2.1, fy0 - 2.5, FX + 2.6, fb];
      poly(c, cl.map((v, i) => (i & 1 ? Y(v) : X(v)))); c.fillStyle = lg(c, 0, Y(fy0), 0, Y(fb), [0, '#ab8794', 1, '#c79f9c']); c.fill();
      poly(c, [X(FX + 0.5), Y(fy0 + 0.2), X(FX + 1.3), Y(fy0 - 0.6), X(FX + 2.1), Y(fy0 - 2.5), X(FX + 2.6), Y(fb), X(FX + 1.1), Y(fb), X(FX + 0.7), Y(fy0 - 3)]); c.fillStyle = 'rgba(255,224,190,.45)'; c.fill();
      c.strokeStyle = 'rgba(110,76,100,.45)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath();
      for (const [a, b] of [[-1.7, -1.9], [-1.1, -1.4], [1.5, 1.8], [2.1, 2.3]]) { c.moveTo(X(FX + a), Y(fy0 - 1.2)); c.lineTo(X(FX + a * 0.9), Y(fy0 - 3.5)); c.lineTo(X(FX + b), Y(fy0 - 6)); }
      c.stroke();
      c.fillStyle = lg(c, X(FX - 0.5), 0, X(FX + 0.5), 0, [0, 'rgba(255,255,255,.4)', 0.3, 'rgba(255,255,255,.95)', 0.7, 'rgba(240,246,255,.95)', 1, 'rgba(230,240,255,.4)']);
      poly(c, [X(FX - 0.38), Y(fy0 + 0.15), X(FX + 0.38), Y(fy0 + 0.15), X(FX + 0.55), Y(fb), X(FX - 0.55), Y(fb)]); c.fill();
      c.fillStyle = 'rgba(200,214,236,.6)'; c.fillRect(X(FX + 0.08), Y(fy0), Math.max(1, s * 0.1), s * 8);
      for (const [dx, dy, r] of [[-2.4, 0.5, 0.55], [-1.7, 0.9, 0.45], [1.8, 0.7, 0.5], [2.5, 0.3, 0.55]]) { c.fillStyle = haze(PAL[(R() * 6) | 0], FX, 0.5); c.beginPath(); c.arc(X(FX + dx), Y(fy0 - dy), r * s, 0, TAU); c.fill(); }
      c.fillStyle = lg(c, 0, Y(13), 0, Y(4), [0, 'rgba(250,228,196,0)', 1, 'rgba(250,228,196,.72)']); c.fillRect(0, Y(13), W, Y(3) - Y(13));
      glow(c, X(FX), Y(fb + 0.6), s * 4.2, s * 1.9, '#ffffff', 0.75);
      // 中景：紅葉林，寺院從樹梢露出屋頂，鳥居站在谷底
      const h3 = (x) => 8.6 + 2.6 * f3(x) - 4.4 * Math.exp(-Math.pow((x - 51) / 10, 2)) - 1.5 * sm((x - 98) / 20);
      forest(c, R, h3, { r0: 0.55, r1: 0.95, rows: 5, gap: 1, hz: 0.38, k: 0.55, pine: 0.08, cf: 0.09, top: 11, base: '#cf7550', skip: (x, y) => Math.abs(x - TX) < 3.4 && y > h3(TX) - 3 });
      temple(c, X(HX), Y(h3(HX) - 1.5), s * 6.6, haze('#5c626e', HX, 0.4), haze('#8e96a2', HX, 0.4), haze('#efe6d6', HX, 0.4), haze('#c9452e', HX, 0.4));
      for (const [dx, dy, r] of [[-4.6, 1.6, 1], [-3, 2, 0.85], [3.1, 2, 0.9], [4.6, 1.5, 1.05], [-1.2, 2.5, 0.8], [1.3, 2.6, 0.75]]) crown(c, X(HX + dx), Y(h3(HX) - 1.5 - dy + 0.9), r * s, haze(PAL[1 + ((R() * 4) | 0)], HX, 0.34), 0.55);
      const ty = h3(TX) - 2.3;
      glow(c, X(TX), Y(ty + 1.6), s * 5.5, s * 3, '#fff3d6', 0.55);
      for (let k = 0; k < 5; k++) { c.fillStyle = haze(k & 1 ? '#c8b9a2' : '#b5a68f', TX, 0.3); c.fillRect(X(TX - 1.6 + k * 0.12), Y(ty - k * 0.34), (3.2 - k * 0.24) * s, s * 0.34); }
      torii(c, X(TX), Y(ty), s * 4.8, haze('#d63f29', TX, 0.12), haze('#3d2a2c', TX, 0.12));
      // 谷裡的霧
      c.fillStyle = lg(c, 0, Y(8.5), 0, Y(1), [0, 'rgba(250,232,204,0)', 0.6, 'rgba(250,232,204,.55)', 1, 'rgba(250,232,204,.38)']); c.fillRect(0, Y(8.5), W, Y(0) - Y(8.5));
      // 鐘架：先畫它、再畫近景那排樹，柱腳才會被樹擋住。上半截（雲和雁會從後面飛過的那一段）留到每一幀再貼
      const BD = S.lv && S.lv.bell; bfCut = 0;
      if (BD) { bfCut = Math.round(Y(BD.y - 6.5)); c.save(); c.beginPath(); c.rect(0, bfCut, W, H); c.clip(); belfry(c, BD.x, BD.y); c.restore(); }
      // 近景：一棵一棵的紅葉樹
      const h4 = (x) => 3.4 + 1.4 * f4(x) - 2.2 * Math.exp(-Math.pow((x - 50) / 9, 2));
      forest(c, R, h4, { r0: 1.15, r1: 1.7, rows: 2, gap: 1.4, hz: 0.1, k: 1, pine: 0.06, cf: 0.12, top: 6, base: '#a8492f', tree: 1 });
      // 兩邊各一棵大楓樹
      for (const [x, y, r, n] of [[-10, 14, 7.5, 26], [127, 13, 7, 24]]) {
        c.strokeStyle = '#5a3426'; c.lineCap = 'round'; c.lineWidth = s * 0.95; c.beginPath(); c.moveTo(X(x - 0.6), Y(0)); c.quadraticCurveTo(X(x + 0.8), Y(y * 0.4), X(x - 0.3), Y(y - 1)); c.stroke();
        c.lineWidth = s * 0.45; c.beginPath(); c.moveTo(X(x + 0.1), Y(y * 0.45)); c.quadraticCurveTo(X(x + 2.5), Y(y * 0.6), X(x + 3.6), Y(y - 0.6)); c.moveTo(X(x - 0.2), Y(y * 0.55)); c.quadraticCurveTo(X(x - 2.4), Y(y * 0.7), X(x - 3.8), Y(y - 0.2)); c.stroke();
        const base = x < 50 ? 1 : 3;
        for (let k = 0; k < n; k++) { const a = R() * TAU, d = Math.sqrt(R()) * r, cx = x + Math.cos(a) * d * 1.1, cy = y + 1 + Math.sin(a) * d * 0.62; tree(c, X(cx), Y(cy), s * (1.6 + R() * 1.2) * (1 - d / r * 0.3), PAL[clamp(base + ((R() * 3) | 0) - 1, 0, 5)], 1); }
      }
    },
    terrain(c) {
      const R = mkRand(2211), s = V.s, XA = V.x0 - 8, XB = V.x1 + 8, g = (x) => groundYRaw(x);
      const edge = (dy, amp, k, back) => { if (back) for (let x = XB; x >= XA; x -= 1) c.lineTo(X(x), Y(g(x) + dy + amp * Math.sin(x * 0.19 + k) + amp * 0.5 * Math.sin(x * 0.47 + k * 2))); else for (let x = XA; x <= XB; x += 1) c.lineTo(X(x), Y(g(x) + dy + amp * Math.sin(x * 0.19 + k) + amp * 0.5 * Math.sin(x * 0.47 + k * 2))); };
      // 草皮和土
      c.beginPath(); edge(0, 0, 0); c.lineTo(X(XB), V.H + 4); c.lineTo(X(XA), V.H + 4); c.closePath();
      c.fillStyle = lg(c, 0, Y(0), 0, V.H, [0, '#8e9a4a', 0.35, '#7f7a40', 1, '#6a5a36']); c.fill();
      // 耙過的碎石步道
      const top = -2.2, bot = -6.3;
      c.beginPath(); edge(top, 0.12, 0); edge(bot, 0.22, 1, 1); c.closePath();
      c.fillStyle = lg(c, 0, Y(top), 0, Y(bot), [0, '#e4d8c0', 1, '#d2c2a4']); c.fill();
      c.save(); c.clip();
      c.strokeStyle = 'rgba(166,146,114,.32)'; c.lineWidth = Math.max(1, s * 0.09);
      for (let k = 1; k < 9; k++) { c.beginPath(); edge(top - (top - bot) * k / 9, 0.14, k * 0.4); c.stroke(); }
      for (let k = 0; k < 150; k++) { const x = lerp(XA, XB, R()), y = g(x) + lerp(bot, top, R()), r = s * (0.07 + R() * 0.1); c.fillStyle = R() < 0.5 ? 'rgba(150,130,104,.45)' : 'rgba(255,252,240,.75)'; c.beginPath(); c.ellipse(X(x), Y(y), r * 1.4, r, 0, 0, TAU); c.fill(); }
      c.restore();
      // 踏石
      for (let x = XA + R() * 5; x < XB; x += 6 + R() * 4) { const px = X(x), py = Y(g(x) + (top + bot) / 2 + (R() - 0.5) * 0.8), rx = s * (1.2 + R() * 0.5), ry = s * (0.45 + R() * 0.12); c.fillStyle = 'rgba(110,92,70,.3)'; c.beginPath(); c.ellipse(px + s * 0.12, py + s * 0.16, rx, ry, 0, 0, TAU); c.fill(); c.fillStyle = '#a79f8d'; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, TAU); c.fill(); c.fillStyle = '#c9c1ad'; c.beginPath(); c.ellipse(px - rx * 0.08, py - ry * 0.18, rx * 0.86, ry * 0.7, 0, 0, TAU); c.fill(); }
      // 步道兩邊的石頭
      for (const [dy, k] of [[top + 0.05, 0.75], [bot + 0.05, 0.95]]) for (let x = XA; x < XB; x += 1.1 + R() * 0.7) { const r = (0.36 + R() * 0.22) * k, px = X(x), py = Y(g(x) + dy); c.fillStyle = '#968e7e'; c.beginPath(); c.ellipse(px, py, r * s * 1.25, r * s * 0.75, 0, 0, TAU); c.fill(); c.fillStyle = '#cfc7b4'; c.beginPath(); c.ellipse(px - r * s * 0.15, py - r * s * 0.22, r * s * 0.9, r * s * 0.45, 0, 0, TAU); c.fill(); }
      // 草、苔
      c.beginPath(); edge(0, 0, 0); edge(-0.85, 0.16, 3, 1); c.closePath(); c.fillStyle = '#a6ad58'; c.fill();
      c.beginPath(); edge(bot - 0.45, 0.25, 1); c.lineTo(X(XB), V.H + 4); c.lineTo(X(XA), V.H + 4); c.closePath(); c.fillStyle = lg(c, 0, Y(bot), 0, V.H, [0, '#869143', 1, '#626634']); c.fill();
      for (let x = XA; x < XB; x += 0.6 + R() * 0.9) { const px = X(x), py = Y(g(x)) + 1, h = s * (0.4 + R() * 0.6); c.fillStyle = R() < 0.5 ? '#b9bb62' : '#959f4a'; c.beginPath(); c.moveTo(px - s * 0.24, py); c.lineTo(px - s * 0.1, py - h); c.lineTo(px + s * 0.04, py); c.lineTo(px + s * 0.2, py - h * 0.75); c.lineTo(px + s * 0.32, py); c.closePath(); c.fill(); }
      for (const st of S.structs) if (st.side < 2 && st.x1 > st.x0) glow(c, X((st.x0 + st.x1) / 2), Y(-1.4), (st.x1 - st.x0) * 0.56 * s, s * 1.6, '#4a3424', 0.4);
      // 落葉（草皮上、步道邊最多）
      const nz = noise(R, 23);
      for (let k = 0; k < 520; k++) {
        const x = lerp(XA, XB, R()), u = R(), y = g(x) + (u < 0.42 ? -R() * 1.7 : u < 0.56 ? lerp(bot, top, R()) : u < 0.7 ? top - R() * 0.5 : bot - 0.3 - R() * 3);
        c.fillStyle = PAL[clamp(Math.floor(nz(x * 0.15) * 7 - 0.5 + (R() - 0.5) * 2.2), 0, 5)]; c.beginPath(); leafPath(c, X(x), Y(y), s * (0.24 + R() * 0.22), R() * TAU, 0.55); c.fill();
      }
      // 石燈籠只放在兩邊
      for (const [x, k] of [[-17, 1.05], [-4.6, 1.1], [111.8, 1.05], [119.5, 0.9], [131, 1.1]]) lantern(c, x, g(x), k);
      c.fillStyle = lg(c, 0, Y(-6), 0, V.H, [0, 'rgba(90,50,30,0)', 1, 'rgba(90,50,30,.25)']); c.fillRect(0, Y(-6), V.W, V.H - Y(-6));
    },
    init() {
      const s = V.s, R = mkRand(3311);
      clouds = [];
      for (const [x, y, w, a] of [[-6, 52, 16, 0.9], [30, 56.5, 12, 0.7], [72, 54.5, 14, 0.8], [104, 50.5, 11, 0.85]]) clouds.push({ cv: cloud(s * w, s * w * 0.34, R), x, y, v: 0.3 + R() * 0.3, a });
      // 兩個上角的楓枝（碰不到兩座城），先畫成小圖，每幀輕輕晃
      branches = [];
      for (const [d, pal] of [[1, ['#c8352a', '#d94a2c', '#e5602f', '#b52f2a']], [-1, ['#ee842e', '#f4a83a', '#f6c445', '#e8692c']]]) {
        const w = Math.ceil(s * 22), h = Math.ceil(s * 17), cv = mkCanvas(w, h), ax = d > 0 ? s * 1.5 : w - s * 1.5, ay = s * 1.5;
        branch(cv.getContext('2d'), mkRand(d > 0 ? 71 : 73), ax, ay, d, 1, pal);
        branches.push({ cv, ax, ay, x: d > 0 ? V.x0 - 1 : V.x1 + 1, y: V.top - 5, p: d > 0 ? 0 : 2 });
      }
      const fw = Math.ceil(s * 30), fh = Math.ceil(s * 5); spMist = mkCanvas(fw, fh); const fg = spMist.getContext('2d');
      for (let k = 0; k < 7; k++) glow(fg, fw * (0.22 + 0.56 * R()), fh * (0.45 + 0.15 * R()), fw * (0.1 + 0.12 * R()), fh * (0.25 + 0.15 * R()), '#fff4e2', 0.55);
      mists = [{ x: 30, y: 7.5, v: 0.5, a: 0.55 }, { x: 70, y: 6.2, v: 0.35, a: 0.45 }, { x: 108, y: 8, v: 0.6, a: 0.4 }];
      // 飄落的楓葉
      spLeaf = PAL.map((col) => { const z = Math.max(10, Math.round(s * 1.5)), cv = mkCanvas(z, z), g = cv.getContext('2d'), h = z / 2; g.fillStyle = col; g.beginPath(); leafPath(g, h, h * 1.04, h * 0.92, 0, 1); g.fill(); g.strokeStyle = mix(col, '#5a1a10', 0.45); g.lineWidth = Math.max(1, z * 0.04); g.beginPath(); g.moveTo(h, h * 1.85); g.lineTo(h, h * 0.3); g.moveTo(h, h * 1.1); g.lineTo(h * 0.35, h * 0.7); g.moveTo(h, h * 1.1); g.lineTo(h * 1.65, h * 0.7); g.stroke(); return cv; });
      leaves = []; for (let k = 0; k < 34; k++) leaves.push({ x: lerp(V.x0 - 4, V.x1 + 4, Math.random()), y: lerp(-9, V.top, Math.random()), v: 1.6 + Math.random() * 1.8, sw: 0.8 + Math.random() * 1.6, w: 0.6 + Math.random() * 1.1, p: Math.random() * TAU, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 3, fl: 1.5 + Math.random() * 2.5, k: (Math.random() * PAL.length) | 0, r: 0.55 + Math.random() * 0.5 });
      sparks = []; for (let k = 0; k < 5; k++) sparks.push({ u: R(), v: 0.5 + R() * 0.3, dx: (R() - 0.5) * 0.5 });
      flock = null; flockAt = 3 + R() * 4;
      // 鐘架的上半截：同一個位置、同一套亂數再畫一次成小圖（只畫到 bfCut 那一列為止，下面那段已經在遠景裡）
      bfTop = null; const BD = S.lv && S.lv.bell;
      if (BD && bfCut > 0) {
        const x0 = Math.floor(X(BD.x - BL - 8)), x1 = Math.ceil(X(BD.x + BL + 8)), y0 = Math.max(0, Math.floor(Y(BD.y + 8)));
        if (bfCut > y0) { bfTop = mkCanvas(x1 - x0, bfCut - y0); const g = bfTop.getContext('2d'); g.translate(-x0, -y0); belfry(g, BD.x, BD.y); bfX = x0; bfY = y0; }
      }
    },
    back(c, t, dt) {
      const s = V.s;
      // 雲
      for (const k of clouds) {
        k.x += (k.v + S.wind * 0.04) * dt; const w = k.cv.width / s;
        if (k.x > V.x1 + 4) k.x = V.x0 - w - 4; else if (k.x < V.x0 - w - 4) k.x = V.x1 + 4;
        c.globalAlpha = k.a; c.drawImage(k.cv, Math.round(X(k.x)), Math.round(Y(k.y)));
      }
      // 霧
      const mw = spMist.width / s;
      for (const m of mists) { m.x += m.v * dt; if (m.x > V.x1 + 2) m.x = V.x0 - mw - 2; c.globalAlpha = m.a * (0.8 + 0.2 * Math.sin(t * 0.3 + m.y)); c.drawImage(spMist, Math.round(X(m.x)), Math.round(Y(m.y + 2.5))); }
      // 瀑布的亮紋
      c.fillStyle = '#ffffff';
      for (const k of sparks) { const u = (k.u + t * k.v * 0.25) % 1; c.globalAlpha = 0.7 * Math.sin(u * Math.PI); c.fillRect(X(FX + k.dx * 0.6 - 0.12), Y(fallY - 0.3 - u * 7.6), Math.max(1, s * 0.22), s * 0.9); }
      // 一行雁往太陽那邊飛
      if (!flock && t > flockAt) flock = { x: V.x0 - 8, y: 49 + Math.random() * 6, v: 2.4 + Math.random() * 0.8 };
      if (flock) {
        flock.x += flock.v * dt; if (X(flock.x - 6) > V.W + 10) { flock = null; flockAt = t + 14 + Math.random() * 16; }
        else {
          c.globalAlpha = 0.6; c.strokeStyle = '#4a3434'; c.lineWidth = Math.max(1, s * 0.12); c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath();
          for (let k = 0; k < 7; k++) { const j = (k + 1) >> 1, sg = k & 1 ? 1 : -1, x = X(flock.x - j * 1.5), y = Y(flock.y - sg * j * 0.8 + Math.sin(t * 0.7 + k) * 0.1), w = s * 0.6, f = Math.sin(t * 6 + k * 0.9) * 0.45; c.moveTo(x - w, y - w * f); c.quadraticCurveTo(x - w * 0.4, y - w * (0.25 + f * 0.5), x, y); c.quadraticCurveTo(x + w * 0.4, y - w * (0.25 + f * 0.5), x + w, y - w * f); }
          c.stroke();
        }
      }
      c.globalAlpha = 1;
      if (bfTop) c.drawImage(bfTop, bfX, bfY);      // 鐘架的上半截蓋在雲和雁前面
      for (const b of branches) { c.save(); c.translate(X(b.x), Y(b.y)); c.rotate((0.022 * Math.sin(t * 0.7 + b.p) + 0.008 * Math.sin(t * 1.9 + b.p) + S.wind * 0.003) * (b.p ? -1 : 1)); c.drawImage(b.cv, -b.ax, -b.ay); c.restore(); }
    },
    front(c, t, dt) {
      const M = c.getTransform(), e0 = M.e, f0 = M.f, wind = S.wind ? S.wind * 0.9 : 0.9;      // 沒風也慢慢往右飄
      for (const l of leaves) {
        l.x += (wind + Math.sin(t * l.w + l.p) * l.sw) * dt; l.y -= l.v * dt; l.rot += l.vr * dt;
        if (l.y < -10) { l.y = V.top + 2; l.x = lerp(V.x0 - 4, V.x1 + 4, Math.random()); }
        if (l.x > V.x1 + 4) l.x = V.x0 - 4; else if (l.x < V.x0 - 4) l.x = V.x1 + 4;
        const sp = spLeaf[l.k], z = sp.width * l.r, fl = Math.cos(t * l.fl + l.p), cs = Math.cos(l.rot), sn = Math.sin(l.rot);
        c.setTransform(cs * fl, sn * fl, -sn, cs, X(l.x) + e0, Y(l.y) + f0);
        c.drawImage(sp, -z / 2, -z / 2, z, z);
      }
      c.setTransform(1, 0, 0, 1, e0, f0);
    }
  };
})();
