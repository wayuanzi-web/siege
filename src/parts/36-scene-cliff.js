/* ===== 36-scene-cliff: 第八關「懸空寺」— 高山晴空、雲海上的花崗岩峰；左邊松林台地斷在懸崖邊，底下是霧一層層往遠處退的深谷、
   谷底一線細河；右邊大山壁從谷底頂到天上，兩間殿嵌在壁上，壁上有小松、棧道、細瀑布 ===== */
THEMES[8] = (function () {
  const WX0 = -46, WX1 = 162;                        // 佈景一律在這段戰場座標上生成（畫面寬窄不同，看到同一幅）
  const GL = 53.5, GR = 95.2, GC = (GL + GR) / 2;    // 峽谷的左右崖（跟這一關的 voids 一致）
  const VPY = 10, FL = 63, FR = 83;                  // 峽谷的消失點高度；左右崖面退到畫面上哪裡
  const SUNX = -1.5, SUNY = 51.5;                    // 太陽在左上角，我方城樓的左邊
  const FALLX = 117.2;                               // 山壁上那道瀑布
  const SKY = [82, '#2357b6', 68, '#2c6ac6', 56, '#3c82d5', 44, '#589ee2', 33, '#7db8ec', 24, '#a8d1f3', 16, '#cfe7f7', 10, '#e8f4fb', -10, '#f0f8fc'];
  // 山壁左緣（岩簷以上，由下往上）往右上退，再接山脊
  const MT = [71.2, 39.3, 70.9, 41.5, 72.2, 43.5, 73.8, 44.2, 74.2, 46.8, 75.6, 48.9, 77.4, 49.5, 77.8, 52.3, 79.3, 54.9, 81.2, 55.7, 81.8, 58.7, 83.3, 61.5, 84.8, 62.3, 85.3, 65.9, 86.5, 69.4, 90, 71, 96, 72.6, 103, 73.4, 112, 74.6, 124, 75, 140, 76.2, WX1 + 4, 77];
  const lw = (k, m) => Math.max(m || 1, V.s * k);   // 線寬：k 個戰場單位，至少 m 像素
  const vg = (c, a, b, st) => lg(c, 0, Y(a), 0, Y(b), st);   // 由高度 a 到 b 的直向漸層
  const ss = (t) => smooth(clamp(t, 0, 1));
  const persp = (xf, x0, y) => VPY + (y - VPY) * (xf - GC) / (x0 - GC);   // 近崖 x0 上高 y 的一點退到 xf 時的高度
  let fog = [], wisps = [], needles = [], birds = [], fogCv = [];

  function skyAt(y) { for (let i = 2; i < SKY.length; i += 2) if (y >= SKY[i]) return mix(SKY[i - 1], SKY[i + 1], clamp((SKY[i - 2] - y) / (SKY[i - 2] - SKY[i]), 0, 1)); return SKY[SKY.length - 1]; }
  // [x, y, …]（戰場座標）接成封閉路徑；round = 圓滑的曲線
  function wpath(c, p, round) {
    c.beginPath(); const n = p.length / 2;
    if (!round) { c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.closePath(); return; }
    const m = (i) => [(X(p[(i % n) * 2]) + X(p[((i + 1) % n) * 2])) / 2, (Y(p[(i % n) * 2 + 1]) + Y(p[((i + 1) % n) * 2 + 1])) / 2];
    let q = m(0); c.moveTo(q[0], q[1]);
    for (let i = 1; i <= n; i++) { q = m(i); c.quadraticCurveTo(X(p[(i % n) * 2]), Y(p[(i % n) * 2 + 1]), q[0], q[1]); }
    c.closePath();
  }
  // 花崗岩峰的輪廓：兩側陡、頂上圓鈍、稍微歪一邊
  function peakPts(R, x, yb, w, h) {
    const sk = (R() - 0.5) * 0.28, p = [x - w * 0.62, yb - 3, x - w / 2, yb];
    for (const [dx, dy] of [[-0.36, 0.3], [-0.27, 0.6], [-0.18, 0.83], [-0.08, 0.97], [0.07, 0.98], [0.17, 0.82], [0.27, 0.56], [0.37, 0.27]]) p.push(x + (dx + sk * dy) * w + (R() - 0.5) * w * 0.06, yb + dy * h * (0.94 + R() * 0.1));
    p.push(x + w / 2, yb, x + w * 0.62, yb - 3);
    return p;
  }
  // 一座峰：hz 越大越融進天色。左半邊受光，pine = 峰頂幾棵小松
  function peak(c, R, x, yb, w, h, hz, pine) {
    const s = V.s, p = peakPts(R, x, yb, w, h), sky = skyAt(yb + h * 0.6), top = yb + h, tx = (p[10] + p[12]) / 2;
    const body = mix('#56789c', sky, hz), lit = mix('#e4edf4', sky, hz * 0.6), dk = mix('#3b5878', sky, hz);
    wpath(c, p, 1); c.fillStyle = vg(c, top, yb, [0, body, 0.75, mix(body, '#eef6fb', 0.3), 1, mix(body, '#f4f9fc', 0.7)]); c.fill();
    c.save(); c.clip();
    c.beginPath(); c.moveTo(X(x - w), Y(yb - 3)); c.lineTo(X(x - w), Y(top + 1));
    for (let u = 1; u >= -0.05; u -= 0.12) c.lineTo(X(lerp(x, tx, u) - w * (0.03 + R() * 0.08) * (1 - u)), Y(yb + h * u));
    c.closePath(); c.fillStyle = vg(c, top, yb, [0, rgba(lit, 0.7), 1, rgba(lit, 0.05)]); c.fill();
    if (hz < 0.5) {
      c.strokeStyle = rgba(dk, 0.35); c.lineWidth = lw(0.16); c.lineCap = 'round'; c.beginPath();
      for (let k = 0; k < 2; k++) { const cx = x + (0.05 + R() * 0.22) * w, y0 = top - h * (0.12 + R() * 0.15); c.moveTo(X(cx), Y(y0)); c.quadraticCurveTo(X(cx + w * 0.05), Y(y0 - h * 0.2), X(cx + w * (R() - 0.3) * 0.1), Y(y0 - h * (0.35 + R() * 0.2))); }
      c.stroke();
    }
    c.restore();
    if (pine) { c.fillStyle = mix('#2c5a52', sky, hz * 0.9); c.beginPath(); for (let k = 0; k < pine; k++) { const u = (R() - 0.5) * 0.5, r = w * (0.07 + R() * 0.05), px = X(tx + u * w * 0.8), py = Y(top - Math.abs(u) * h * 0.25) - r * 0.2; c.moveTo(px + r * 1.6, py); c.ellipse(px, py, r * 1.6, r * 0.6, 0, 0, TAU); c.moveTo(px + r * 1.1, py - r * 0.6); c.ellipse(px, py - r * 0.6, r * 1.1, r * 0.45, 0, 0, TAU); } c.fill(); }
  }
  // 一層雲海：雲頂在 lo…hi 間起伏，圓疊成雲頭，上緣一道亮邊
  function bank(c, R, lo, hi, r0, r1, rim, top, bot) {
    const s = V.s, cs = [], p = [R() * TAU, R() * TAU, R() * TAU];
    const env = (x) => 0.5 + 0.5 * (Math.sin(x * 0.06 + p[0]) * 0.55 + Math.sin(x * 0.15 + p[1]) * 0.3 + Math.sin(x * 0.37 + p[2]) * 0.15);
    for (let x = WX0; x < WX1;) { const e = env(x), r = lerp(r0, r1, e) * (0.7 + R() * 0.55); cs.push(x, lerp(lo, hi, e) - r, r); x += r * (0.65 + R() * 0.6); }
    const shape = (dy, sh) => {
      c.beginPath(); c.rect(X(WX0), Y(lo - r0 * 0.6) + dy, X(WX1) - X(WX0), V.H);
      for (let i = 0; i < cs.length; i += 3) { const r = cs[i + 2] * s - sh, px = X(cs[i]); if (r > 0.5 && px > -r - 4 && px < V.W + r + 4) { c.moveTo(px + r, Y(cs[i + 1]) + dy); c.arc(px, Y(cs[i + 1]) + dy, r, 0, TAU); } }
    };
    shape(0, 0); c.fillStyle = rim; c.fill();
    c.fillStyle = vg(c, hi, lo - 4, [0, top, 1, bot]);
    for (let j = 1; j <= 3; j++) { shape(s * 0.16 * j, s * 0.035 * j); c.globalAlpha = j === 3 ? 1 : 0.3 + j * 0.14; c.fill(); }
    c.globalAlpha = 1;
  }
  // 黃山松：歪樹幹、橫伸的枝，枝頭頂著扁扁一片松針。(x, y) 樹腳、h 樹高（像素），dir 往哪邊伸
  function pine(c, R, x, y, h, dir, trunk, dark, lite, big) {
    const tx = x + dir * h * (0.22 + R() * 0.16), ty = y - h * 0.8, pads = [[tx, ty, h * 0.3]];
    c.strokeStyle = trunk; c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = Math.max(1.2, h * (big ? 0.1 : 0.085)); c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - dir * h * 0.08, y - h * 0.38, tx - dir * h * 0.3, ty + h * 0.32, tx, ty); c.stroke();
    c.lineWidth = Math.max(1, h * 0.05); c.beginPath();
    for (let k = 0; k < (big ? 4 : 2); k++) {
      const f = 0.36 + k * (big ? 0.15 : 0.26) + R() * 0.06, bx = lerp(x, tx, f * f) - dir * h * 0.02, by = lerp(y, ty, f), sd = k & 1 ? -dir * 0.75 : dir, ex = bx + sd * h * (0.3 + R() * 0.22) * (big && k === 0 ? 1.4 : 1), ey = by - h * (0.04 + R() * 0.1);
      c.moveTo(bx, by); c.quadraticCurveTo((bx + ex) / 2, by - h * 0.12, ex, ey); pads.push([ex, ey, h * (0.19 + R() * 0.08)]);
    }
    c.stroke();
    for (const [px, py, r] of pads) {
      c.fillStyle = dark; c.beginPath(); c.ellipse(px, py, r, r * 0.38, 0, 0, TAU); c.moveTo(px - r * 0.2, py + r * 0.08); c.ellipse(px - r * 0.45, py + r * 0.08, r * 0.62, r * 0.32, 0, 0, TAU); c.moveTo(px + r * 0.9, py + r * 0.1); c.ellipse(px + r * 0.45, py + r * 0.1, r * 0.55, r * 0.3, 0, 0, TAU); c.fill();
      c.fillStyle = lite; c.beginPath(); c.ellipse(px - r * 0.15, py - r * 0.14, r * 0.66, r * 0.17, 0, 0, TAU); c.fill();
    }
  }
  // 柔邊的霧帶：在 y ± h 之間淡進淡出
  function band(c, xa, xb, y, h, col, a) { c.fillStyle = vg(c, y + h, y - h, [0, 'rgba(' + col + ',0)', 0.5, 'rgba(' + col + ',' + a + ')', 1, 'rgba(' + col + ',0)']); c.fillRect(X(xa), Y(y + h), X(xb) - X(xa), 2 * h * V.s); }

  return {
    key: 'cliff',
    build(c, W, H) {
      const s = V.s, st = [];
      for (let i = 0; i < SKY.length; i += 2) st.push((82 - SKY[i]) / 92, SKY[i + 1]);
      c.fillStyle = vg(c, 82, -10, st); c.fillRect(0, 0, W, H);
      // 太陽：一大圈光暈，往上散幾道淡光
      const sx = X(SUNX), sy = Y(SUNY);
      c.fillStyle = rg(c, sx, sy, 0, s * 50, [0, 'rgba(255,253,236,.85)', 0.05, 'rgba(255,250,226,.5)', 0.16, 'rgba(255,246,220,.18)', 0.45, 'rgba(236,246,255,.06)', 1, 'rgba(236,246,255,0)']); c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'lighter'; let R = mkRand(801);
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI * (0.98 - (k + R() * 0.7) * 0.11), w = 0.035 + R() * 0.035, L = s * (24 + R() * 22);
        c.fillStyle = lg(c, sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L, [0, 'rgba(255,250,232,.07)', 1, 'rgba(255,250,232,0)']);
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a - w) * L, sy + Math.sin(a - w) * L); c.lineTo(sx + Math.cos(a + w) * L, sy + Math.sin(a + w) * L); c.closePath(); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = rg(c, sx, sy, s * 1.9, s * 4, [0, 'rgba(255,252,236,.8)', 1, 'rgba(255,252,236,0)']); c.fillRect(sx - s * 5, sy - s * 5, s * 10, s * 10);
      c.fillStyle = '#fffef6'; c.beginPath(); c.arc(sx, sy, s * 2.1, 0, TAU); c.fill();
      // 高空的卷雲（兩城之間更淡）
      R = mkRand(802);
      for (let k = 0; k < 9; k++) {
        const x0 = WX0 + R() * (WX1 - WX0), y0 = 40 + R() * Math.max(18, V.top - 36), mid = Math.abs(x0 - 50) < 18 ? 0.45 : 1;
        for (let j = 0, m = 2 + ((R() * 2) | 0); j < m; j++) {
          const x = X(x0 + j * 2 + R() * 5), y = Y(y0 - j * (0.7 + R() * 0.5)), w = s * (12 + R() * 15), b = s * (0.5 + R()), th = s * (0.35 + R() * 0.45);
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.45, y - b - th, x + w, y - b * 0.4); c.quadraticCurveTo(x + w * 0.5, y - b + th * 0.4, x, y); c.fillStyle = 'rgba(255,255,255,' + ((0.1 + R() * 0.12) * mid).toFixed(3) + ')'; c.fill();
        }
      }
      // 遠山：兩排很淡的峰（兩城之間矮一點），峰腳沒進雲海
      R = mkRand(803);
      for (let row = 0; row < 2; row++) for (let x = WX0 + R() * 4; x < WX1; x += (row ? 7 : 9) + R() * 6) {
        const mid = 1 - 0.6 * (1 - ss((Math.abs(x - 50) - 10) / 10)), w = (row ? 6 : 9) + R() * 7, h = ((row ? 9 : 13) + R() * 12) * mid;
        peak(c, R, x, 6, w, h, row ? 0.62 : 0.74, 0);
      }
      bank(c, mkRand(804), 8.4, 10.6, 0.9, 2.2, '#ffffff', '#f6fafd', '#dbe8f3');
      // 近一點的峰：藍一點、峰頂長松（只在兩邊）
      R = mkRand(805);
      for (const [x, w, t] of [[-44, 7, 20], [-37, 5.2, 15.5], [-29.5, 4.4, 21], [-21, 6.4, 16], [-12.5, 4.6, 19.5], [-5.5, 5.6, 13.5], [124, 6, 19], [131, 4.6, 24], [139, 7, 17], [148, 5, 22], [156, 6, 16]]) peak(c, R, x, 2, w, t - 2, 0.34, 3);
      bank(c, mkRand(806), 3.6, 5.8, 1.1, 2.6, '#ffffff', '#eef5fa', '#c9dbea');
      // 台地遠處的松林；到懸崖那邊沿著崖頂往遠處收
      R = mkRand(807);
      const fr = ridgeFn(R, 0.11), lip = (x) => persp(Math.min(x, FL), GL, -3) + 0.4, fy = (x) => (x < GL ? 2.2 + 1.2 * fr(x) : lerp(2.2 + 1.2 * fr(x), lip(x) + 0.6, ss((x - GL + 2) / 9)));
      c.beginPath(); c.moveTo(X(V.x0 - 4), V.H + 2); for (let x = V.x0 - 4; x <= FL + 0.6; x += 0.6) c.lineTo(X(x), Y(fy(x))); c.lineTo(X(FL + 0.6), Y(lip(FL) - 1)); c.lineTo(X(FL + 0.6), V.H + 2); c.closePath();
      c.fillStyle = vg(c, 5, -1, [0, '#6f9fae', 1, '#94bcc8']); c.fill();
      c.fillStyle = '#5a8c9c'; c.beginPath();
      for (let x = WX0; x < FL - 0.5; x += 0.7 + R() * 1.1) {
        if (x < V.x0 - 3 || x > V.x1 + 3) { R(); continue; }
        const h = s * (0.8 + R() * 0.9) * (x > GL ? 0.75 : 1), px = X(x), py = Y(fy(x)) + 2;
        c.moveTo(px, py - h); for (let i = 1; i < 7; i++) c.lineTo(px + [0, 0.32, 0.12, 0.36, -0.36, -0.12, -0.32][i] * h, py - [1, 0.25, 0.3, 0, 0, 0.3, 0.25][i] * h);
        c.closePath();
      }
      c.fill();
      // ===== 峽谷 =====
      const ga = GL - 1.5, gb = GR + 1.5, gw = X(gb) - X(ga);
      c.fillStyle = vg(c, 5.5, -10, [0, 'rgba(226,238,247,0)', 0.14, '#d9e7f2', 0.38, '#b2c7db', 0.66, '#87a0bc', 1, '#5b7192']);
      c.fillRect(X(FL - 1.5), Y(5.5), X(gb) - X(FL - 1.5), V.H);
      R = mkRand(808);
      // 最遠處的崖：上面淡，往下沒進深藍的谷裡
      const farWall = (x0, x1, top, col, lit) => {
        const p = [x0, -14, x0, top]; let x = x0;
        while (Math.abs(x - x1) > 1.2) { x += Math.sign(x1 - x0) * (0.8 + R() * 1.2); p.push(x, top + (R() - 0.5) * 0.5 - (Math.abs(x - x0) > Math.abs(x1 - x0) * 0.7 ? R() * 1.4 : 0)); }
        for (let y = top - 1; y > -14; y -= 1 + R() * 1.6) p.push(x1 + (R() - 0.5) * 0.9, y);
        wpath(c, p); c.fillStyle = vg(c, top, -9, [0, col, 0.55, mix(col, '#7088a8', 0.5), 1, '#4c6186']); c.fill();
        if (lit) { c.strokeStyle = vg(c, top, -6, [0, lit, 1, rgba(lit, 0)]); c.lineWidth = s * 0.9; c.beginPath(); for (let i = p.length - 2; i > 4 && p[i + 1] < top - 0.5; i -= 2) c.lineTo(X(p[i] + 0.35), Y(p[i + 1])); c.stroke(); }
      };
      farWall(FL - 1, 68.5, 4.4, '#b4c6d8', null);
      farWall(FR + 1, 77.6, 15.5, '#a9bdd2', '#cddcea');
      band(c, FL - 1.5, FR + 1.5, 2.6, 2.4, '232,241,248', 0.85);
      farWall(FL - 1, 66.4, 1.8, '#98aec6', null);
      farWall(FR + 1, 79.8, 8, '#93a9c2', '#bccddd');
      band(c, FL - 1.5, FR + 1.5, -0.8, 2.6, '206,221,235', 0.7);
      // 谷底的河：一線亮光，往遠處越細越淡
      c.lineCap = 'round';
      for (let y = -10.4; y < -2.6; y += 0.3) {
        const u = (y + 10.4) / 7.8, f = (yy) => GC + 1.2 + Math.sin(yy * 1.1) * 1.4 * (1 - u * 0.6);
        c.strokeStyle = 'rgba(226,244,255,' + (0.9 * (1 - u)).toFixed(3) + ')'; c.lineWidth = lw(0.75 - u * 0.6); c.beginPath(); c.moveTo(X(f(y)), Y(y)); c.lineTo(X(f(y + 0.3)), Y(y + 0.3)); c.stroke();
      }
      // 岩縫：暗線左邊貼一道亮線（k 小 = 遠、細）
      const crack = (x, y0, len, k, dark, lit) => {
        const p = []; for (let y = y0; y > y0 - len; y -= 0.8 + R() * 0.8) p.push(x + (R() - 0.5) * 0.25 * k, y);
        c.lineWidth = lw(0.3 * k); c.strokeStyle = lit; c.beginPath(); for (let i = 0; i < p.length; i += 2) c.lineTo(X(p[i] - 0.3 * k), Y(p[i + 1])); c.stroke();
        c.lineWidth = lw(0.16 * k); c.strokeStyle = dark; c.beginPath(); for (let i = 0; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.stroke();
      };
      // 左崖面（背光）往遠處退：崖頂沿透視往上收，岩層往消失點聚
      const rimL = [GL, -3]; for (let x = GL + 0.6; x < FL; x += 0.5 + R() * 0.7) rimL.push(x, persp(x, GL, -3) + (R() < 0.3 ? 0.25 + R() * 0.3 : R() * 0.12));
      rimL.push(FL, persp(FL, GL, -3));
      const lp = [GL - 2, -14, GL - 2, -3].concat(rimL);
      for (let y = persp(FL, GL, -3) - 0.6; y > -14; y -= 0.9 + R() * 1.3) lp.push(FL + (R() - 0.6) * 0.9, y);
      wpath(c, lp); c.fillStyle = vg(c, 3, -10, [0, '#6f84a0', 0.5, '#566b8c', 1, '#3b4d70']); c.fill();
      c.save(); c.clip();
      c.lineWidth = lw(0.14);
      for (let y = -4.4; y > -40; y -= 2 + R() * 2) { c.strokeStyle = 'rgba(30,42,68,' + (0.18 + R() * 0.16).toFixed(2) + ')'; c.beginPath(); c.moveTo(X(GL), Y(y)); c.lineTo(X(FL + 1), Y(persp(FL + 1, GL, y))); c.stroke(); }
      for (let k = 0; k < 9; k++) { const u = R(), x = GC - (GC - GL) / (1 + u * 1.05), y0 = persp(x, GL, -3) - 0.4 - R() * 2; crack(x, y0, 2 + R() * 5, (GC - x) / (GC - GL), 'rgba(30,40,64,.4)', 'rgba(150,170,196,.3)'); }
      c.fillStyle = lg(c, X(GL), 0, X(FL), 0, [0, 'rgba(190,207,226,0)', 1, 'rgba(190,207,226,.5)']); c.fillRect(X(GL - 2), Y(4), X(FL + 1) - X(GL - 2), 18 * s);
      c.restore();
      c.beginPath(); for (let i = 0; i < rimL.length; i += 2) c.lineTo(X(rimL[i]), Y(rimL[i + 1])); c.strokeStyle = 'rgba(206,232,196,.75)'; c.lineWidth = lw(0.18); c.lineJoin = 'round'; c.stroke();
      // 崖頂一路往遠處的小樹叢
      c.fillStyle = '#5d8a86'; c.beginPath();
      for (let i = 2; i < rimL.length - 2; i += 2) { if (R() < 0.45) continue; const k = (GC - rimL[i]) / (GC - GL), r = s * (0.3 + R() * 0.3) * k, px = X(rimL[i]), py = Y(rimL[i + 1]) - r * 0.35; c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); }
      c.fill();
      // 右崖面（朝太陽）：岩層往消失點聚，岩縫越遠越密，幾叢小樹
      const rp = [GR + 2, -14, GR + 2, 39, FR, 39];
      for (let y = 37.6; y > -14; y -= 0.9 + R() * 1.5) rp.push(FR + (R() - 0.4) * 0.9 - (y > 30 ? (y - 30) * 0.05 : 0), y);
      wpath(c, rp); c.fillStyle = vg(c, 38, -10, [0, '#b9ad99', 0.35, '#a59b8c', 0.7, '#838593', 1, '#4f6088']); c.fill();
      c.save(); c.clip();
      for (let y = 35.5; y > -30; y -= 2.8 + R() * 3.2) {
        const y2 = persp(FR - 1, GR, y), a = (0.18 + R() * 0.16).toFixed(2);
        c.lineWidth = lw(0.16);
        c.strokeStyle = 'rgba(248,240,222,' + a + ')'; c.beginPath(); c.moveTo(X(GR + 1), Y(y + 0.16)); c.lineTo(X(FR - 1), Y(y2 + 0.08)); c.stroke();
        c.strokeStyle = 'rgba(66,58,54,' + a + ')'; c.beginPath(); c.moveTo(X(GR + 1), Y(y)); c.lineTo(X(FR - 1), Y(y2)); c.stroke();
      }
      for (let k = 0; k < 22; k++) { const u = R(), x = GC + (GR - GC) / (1 + u * 1.1), y0 = -4 + R() * 42; crack(x, y0, 2.5 + R() * 8, (x - GC) / (GR - GC), 'rgba(62,54,50,.42)', 'rgba(250,242,224,.32)'); }
      c.fillStyle = '#6f8f5a';
      for (const [x, y] of [[93.6, 31.4], [90.4, 18.6], [92.2, 3.6], [87.6, 26.2], [88.6, 12.4]]) { const k = (x - GC) / (GR - GC), r = s * 0.55 * k; c.beginPath(); for (let j = 0; j < 4; j++) { const px = X(x - j * 0.5 * k), py = Y(y + Math.sin(j * 2.3) * 0.15) - r * 0.3; c.moveTo(px + r, py); c.arc(px, py, r * (0.7 + 0.3 * Math.sin(j * 1.7)), 0, TAU); } c.fill(); }
      c.fillStyle = lg(c, X(GR), 0, X(FR), 0, [0, 'rgba(192,208,228,0)', 1, 'rgba(192,208,228,.5)']); c.fillRect(X(FR - 1), Y(40), X(GR + 2) - X(FR - 1), 55 * s);
      c.restore();
      // 一層層的霧，越上面越白；谷底最深處暗藍
      band(c, ga, gb, -3.4, 2.4, '170,192,216', 0.5);
      band(c, ga, gb, -7, 2.2, '112,136,172', 0.4);
      c.fillStyle = vg(c, -1.5, -10, [0, 'rgba(36,52,90,0)', 1, 'rgba(30,44,80,.62)']); c.fillRect(X(ga), Y(-1.5), gw, 9 * s);
    },
    terrain(c) {
      const s = V.s; let R = mkRand(811);
      // ===== 右邊的大山壁（在城的岩柱後面） =====
      const P = [WX1 + 4, -14, 97, -14, 97, 37.6, 72, 37.6].concat(MT);
      wpath(c, P); c.fillStyle = vg(c, 72, 0, [0, '#c1b5a0', 0.4, '#afa592', 0.75, '#9a907f', 1, '#888071']); c.fill();
      c.save(); c.clip();
      // 幾道大的暗溝，讓山壁有前後
      for (const [x, w] of [[88, 5], [101, 4], [112.5, 3.5], [127, 5], [141, 4], [154, 5]]) { c.fillStyle = lg(c, X(x - w), 0, X(x + w), 0, [0, 'rgba(70,62,60,0)', 0.6, 'rgba(70,62,60,.2)', 1, 'rgba(70,62,60,0)']); c.fillRect(X(x - w), 0, 2 * w * s, V.H); }
      // 直立的岩柱：左邊受光、右邊一道深縫
      for (let x = 70 + R() * 2; x < WX1; x += 2.6 + R() * 3.8) {
        const yt = 78 - R() * 20, yb = R() < 0.4 ? -2 : 8 + R() * 36, pts = [];
        for (let y = yt; y > yb; y -= 1.5 + R() * 2) pts.push(x + Math.sin(y * 0.21 + x) * 0.45 + (R() - 0.5) * 0.3, y);
        c.beginPath(); for (let i = 0; i < pts.length; i += 2) c.lineTo(X(pts[i] + 0.35), Y(pts[i + 1]));
        c.strokeStyle = 'rgba(240,232,212,' + (0.25 + R() * 0.25).toFixed(2) + ')'; c.lineWidth = s * (0.5 + R() * 0.7); c.stroke();
        c.beginPath(); for (let i = 0; i < pts.length; i += 2) c.lineTo(X(pts[i] - 0.2), Y(pts[i + 1]));
        c.strokeStyle = 'rgba(70,60,52,' + (0.3 + R() * 0.2).toFixed(2) + ')'; c.lineWidth = lw(0.2); c.stroke();
      }
      // 岩棚：上緣亮、底下影子、棚上長草
      const ledges = [[74, 82, 45.6], [79, 90, 51.4], [84, 97, 57.6], [88, 104, 63.4], [108.8, 116, 9.6], [111, 124, 19.5], [109, 115, 31], [118.5, 132, 36], [113, 128, 47], [124, 140, 55], [130, 146, 13], [138, 152, 27], [144, 160, 42]];
      for (const [xa, xb, y] of ledges) {
        const edge = () => { c.beginPath(); c.moveTo(X(xa), Y(y)); c.quadraticCurveTo(X((xa + xb) / 2), Y(y + 0.25), X(xb), Y(y - 0.2)); };
        c.fillStyle = vg(c, y, y - 1.8, [0, 'rgba(64,54,46,.42)', 1, 'rgba(64,54,46,0)']);
        edge(); c.lineTo(X(xb - 1), Y(y - 1.8)); c.lineTo(X(xa + 1), Y(y - 1.8)); c.closePath(); c.fill();
        edge(); c.strokeStyle = '#efe5ce'; c.lineWidth = lw(0.24); c.stroke();
        c.fillStyle = '#7fae5a'; c.beginPath();
        for (let x = xa + R(); x < xb - 0.5; x += 0.6 + R() * 1.4) { const r = s * (0.25 + R() * 0.3); c.moveTo(X(x) + r, Y(y + 0.1)); c.ellipse(X(x), Y(y + 0.1), r, r * 0.6, 0, Math.PI, TAU); }
        c.fill();
      }
      // 瀑布：從岩縫流出來，落到半山腰化成霧
      c.fillStyle = 'rgba(58,50,44,.6)'; wpath(c, [FALLX - 0.8, 53, FALLX + 1, 52.6, FALLX + 0.55, 49.6, FALLX - 0.45, 49.8], 1); c.fill();
      c.fillStyle = vg(c, 51, 6, [0, 'rgba(250,253,255,.95)', 0.75, 'rgba(236,246,255,.75)', 1, 'rgba(230,242,252,0)']);
      c.beginPath(); c.moveTo(X(FALLX - 0.3), Y(51)); c.lineTo(X(FALLX + 0.4), Y(51)); c.lineTo(X(FALLX + 0.8), Y(6)); c.lineTo(X(FALLX - 0.7), Y(6)); c.closePath(); c.fill();
      // 棧道：釘在山壁上的木板路（從瀑布前過），底下斜撐、外側欄杆
      const BY = 23.5;
      c.strokeStyle = '#5a4030'; c.lineWidth = lw(0.16); c.beginPath();
      for (let x = 110; x <= 140; x += 2.4) { c.moveTo(X(x), Y(BY)); c.lineTo(X(x + 1.1), Y(BY - 1.8)); c.moveTo(X(x), Y(BY)); c.lineTo(X(x), Y(BY + 1.3)); }
      c.moveTo(X(110), Y(BY + 1.25)); c.lineTo(X(140), Y(BY + 1.25)); c.stroke();
      c.fillStyle = '#8a6444'; c.fillRect(X(109.4), Y(BY + 0.2), (140.6 - 109.4) * s, lw(0.36, 2));
      c.fillStyle = 'rgba(255,236,200,.5)'; c.fillRect(X(109.4), Y(BY + 0.2), (140.6 - 109.4) * s, lw(0.09));
      // 谷底的霧把山腳染淡；離太陽越遠越暗
      c.fillStyle = vg(c, -2, 22, [0, 'rgba(214,230,244,.65)', 0.45, 'rgba(214,230,244,.22)', 1, 'rgba(214,230,244,0)']); c.fillRect(X(70), Y(22), X(WX1) - X(70), 24 * s);
      c.fillStyle = lg(c, X(80), 0, X(150), 0, [0, 'rgba(60,56,84,0)', 1, 'rgba(60,56,84,.22)']); c.fillRect(X(80), 0, X(WX1) - X(80), V.H);
      c.restore();
      // 山壁左緣朝太陽的那一道亮邊
      c.beginPath(); c.moveTo(X(MT[2]), Y(MT[3])); for (let i = 4; i < 30; i += 2) c.lineTo(X(MT[i]), Y(MT[i + 1]));
      c.strokeStyle = 'rgba(255,248,226,.85)'; c.lineWidth = s * 0.36; c.lineJoin = 'round'; c.stroke();
      // 長在岩縫裡的松
      for (const [x, y, h] of [[73.6, 44.2, 3.4], [77.2, 49.5, 2.6], [81, 55.7, 3.2], [84.6, 62.3, 2.8], [112, 19.6, 2.6], [121, 36.1, 3], [128, 55.1, 2.6], [133, 13.1, 3.2], [119.5, 47.1, 2.2], [146, 27.1, 2.8], [152, 42.1, 2.6]]) pine(c, R, X(x), Y(y), h * s, x === 119.5 ? 1 : -1, '#5a4636', '#3e6a4c', '#7aa564');

      // ===== 地面：左邊台地、右邊山腳 =====
      const runs = groundRuns(), bot = V.H + 4;
      for (const [xa, xb] of runs) {
        const left = xb < GR;
        c.beginPath(); traceGround(c, xa, xb, 0, true);
        if (left) { for (let y = -3.8; y > -11; y -= 1.1) c.lineTo(X(xb - 0.12 - ((y * 7.3) % 1 + 1) % 1 * 0.55), Y(y)); c.lineTo(X(xb - 0.3), bot); }
        else c.lineTo(X(xb), bot);
        c.lineTo(X(xa), bot); c.closePath();
        c.fillStyle = left ? lg(c, 0, Y(0), 0, V.H, [0, '#a09683', 0.5, '#7d7466', 1, '#5c5a62']) : lg(c, 0, Y(0), 0, V.H, [0, '#8a8173', 0.5, '#6d665b', 1, '#4f5164']); c.fill();
        if (left) { c.strokeStyle = '#3e3932'; c.lineWidth = lw(0.26, 1.5); c.lineJoin = 'round'; c.stroke(); }
      }
      // 岩層的橫紋（台地）、直的岩縫（山腳）
      c.strokeStyle = 'rgba(62,56,48,.28)'; c.lineWidth = lw(0.2); c.lineCap = 'round';
      for (let k = 0; k < 16; k++) { const x = WX0 + R() * (GL - 8 - WX0), y = -2.4 - R() * 6.4, w = 4 + R() * 8; c.beginPath(); c.moveTo(X(x), Y(y)); c.quadraticCurveTo(X(x + w * 0.5), Y(y - 0.4), X(x + w), Y(y + 0.1)); c.stroke(); }
      c.strokeStyle = 'rgba(50,44,40,.3)';
      for (let x = 97 + R() * 2; x < WX1; x += 2 + R() * 3) { c.beginPath(); c.moveTo(X(x), Y(-0.6)); c.lineTo(X(x + (R() - 0.5) * 0.6), Y(-3 - R() * 3)); c.lineTo(X(x + (R() - 0.5) * 0.8), Y(-6 - R() * 4)); c.stroke(); }
      // 左崖口的背光面
      c.fillStyle = 'rgba(50,46,58,.32)'; wpath(c, [GL - 1.6, -3.4, GL, -3, GL - 0.4, -11, GL - 1.8, -11]); c.fill();
      // 右崖：岩柱下的凹縫暗，崖面朝太陽亮一條
      c.fillStyle = '#3a342e'; wpath(c, [95, 0, 97, 0, 96, -3, 95.2, -3]); c.fill();
      c.fillStyle = lg(c, X(95.2), 0, X(97.5), 0, [0, 'rgba(236,226,206,.5)', 1, 'rgba(236,226,206,0)']); c.fillRect(X(95.2), Y(-3), s * 2.3, s * 9);
      c.beginPath(); c.moveTo(X(95.2), Y(-3)); c.lineTo(X(95.2), Y(-11)); c.strokeStyle = '#3e3932'; c.lineWidth = lw(0.26, 1.5); c.stroke();
      c.fillStyle = vg(c, -5, -10, [0, 'rgba(56,72,108,0)', 1, 'rgba(56,72,108,.4)']); c.fillRect(X(GR), Y(-5), X(WX1) - X(GR), 6 * s);
      // 草皮
      for (const [xa, xb] of runs) {
        if (xa > GR - 1) {
          c.beginPath(); traceGround(c, Math.max(xa, 97), xb, 0, true); c.strokeStyle = '#3e3932'; c.lineWidth = lw(0.26, 1.5); c.stroke();
          c.beginPath(); traceGround(c, Math.max(xa, 97), xb, -0.25, true); c.strokeStyle = '#7fae5a'; c.lineWidth = lw(0.3, 1.5); c.stroke();
          continue;
        }
        c.beginPath(); traceGround(c, xa, xb, 0, true); traceGroundBack(c, xa, xb, -0.9); c.closePath(); c.fillStyle = '#86c85c'; c.fill();
        c.beginPath(); traceGround(c, xa, xb, 0, true); c.strokeStyle = '#3c7a34'; c.lineWidth = lw(0.2, 1.5); c.lineJoin = 'round'; c.stroke();
        for (let x = xa + R(); x < xb - 0.4; x += 0.6 + R()) {
          const px = X(x), py = Y(groundYRaw(x)), h = s * (0.4 + R() * 0.8);
          c.fillStyle = R() < 0.5 ? '#a2e070' : '#6cbc4e';
          c.beginPath(); c.moveTo(px - s * 0.24, py + 1); c.lineTo(px - s * 0.08, py - h); c.lineTo(px + s * 0.05, py + 1); c.lineTo(px + s * 0.2, py - h * 0.7); c.lineTo(px + s * 0.32, py + 1); c.closePath(); c.fill();
          if (R() < 0.12) { c.fillStyle = R() < 0.6 ? '#ffffff' : '#ffd0e4'; c.beginPath(); c.arc(px + s * 0.45, py + s * 0.35, lw(0.18), 0, TAU); c.fill(); }
        }
      }
      // 懸崖邊的迎客松，往峽谷伸出去
      pine(c, mkRand(812), X(51.2), Y(groundYRaw(51.2)) + 2, s * 9, 1, '#4e3a2c', '#2d6046', '#6aa45a', 1);
    },
    init() {
      const s = V.s;
      // 霧：柔邊的長條小圖（白、深處的藍灰），每幀只貼圖
      fogCv = [];
      for (let k = 0; k < 3; k++) {
        const cv = mkCanvas(256, 48), g = cv.getContext('2d'), R = mkRand(821 + k), col = k < 2 ? '240,247,252' : '150,172,202';
        for (let j = 0; j < 9; j++) { const rx = 30 + R() * 50, ry = 6 + R() * 6, x = rx + R() * (256 - rx * 2), y = 24 + (R() - 0.5) * 14; g.save(); g.translate(x, y); g.scale(rx / ry, 1); g.fillStyle = rg(g, 0, 0, 0, ry, [0, 'rgba(' + col + ',.6)', 1, 'rgba(' + col + ',0)']); g.fillRect(-ry, -ry, ry * 2, ry * 2); g.restore(); }
        fogCv.push(cv);
      }
      fog = [];
      for (let k = 0; k < 5; k++) { const y = [-7.4, -4.4, -1.6, -6, 1][k]; fog.push({ cv: fogCv[y < -4 ? 2 : k & 1], y, w: 26 + k * 3, h: 3.2 + (k % 3) * 0.6, v: (0.45 + k * 0.12) * (k & 1 ? -1 : 1), o: k * 13, a: [0.5, 0.42, 0.5, 0.4, 0.5][k] }); }
      wisps = [{ cv: 2, y: -6, w: 30, h: 3.4, v: 1.1, o: 0, a: 0.34 }, { cv: 0, y: -1.2, w: 22, h: 2.6, v: -0.8, o: 20, a: 0.24 }];
      const R = mkRand(822);
      needles = []; for (let k = 0; k < 12; k++) needles.push({ x: V.x0 + R() * (V.x1 - V.x0), y: R() * 40, v: 0.8 + R() * 0.9, p: R() * TAU, w: 1.5 + R() * 2.5 });
      birds = [{ cx: 66, cy: -3.2, rx: 6.5, ry: 1.6, w: 0.36, p: 0 }, { cx: 79, cy: -1.2, rx: 5.5, ry: 1.3, w: -0.3, p: 2 }];
    },
    back(c, t, dt) {
      const s = V.s;
      c.save(); c.beginPath(); c.rect(X(GL), Y(6), X(GR) - X(GL), V.H); c.clip();
      // 霧在峽谷裡慢慢地飄
      for (const f of fog) {
        const span = GR - GL + f.w, x = GL - f.w + (((f.o + t * f.v) % span) + span) % span;
        c.globalAlpha = f.a; c.drawImage(f.cv, X(x), Y(f.y + f.h / 2), f.w * s, f.h * s);
      }
      c.globalAlpha = 1;
      // 兩隻雨燕在谷裡繞圈
      c.fillStyle = 'rgba(38,46,70,.75)';
      for (const b of birds) {
        const a = t * b.w + b.p, px = X(b.cx + Math.cos(a) * b.rx), py = Y(b.cy + Math.sin(a) * b.ry), w = s * 0.7, f = Math.sin(t * 9 + b.p) * 0.3;
        c.beginPath(); c.moveTo(px - w, py - w * (0.2 + f)); c.quadraticCurveTo(px - w * 0.4, py - w * 0.15, px, py); c.quadraticCurveTo(px + w * 0.4, py - w * 0.15, px + w, py - w * (0.2 + f)); c.quadraticCurveTo(px + w * 0.4, py + w * 0.12, px, py + w * 0.15); c.quadraticCurveTo(px - w * 0.4, py + w * 0.12, px - w, py - w * (0.2 + f)); c.fill();
      }
      c.restore();
      // 瀑布上往下流的白紋
      c.fillStyle = 'rgba(255,255,255,.8)';
      for (let k = 0; k < 4; k++) { const y = 50 - ((t * 7 + k * 11) % 44); c.fillRect(X(FALLX - 0.15 + (k & 1) * 0.3 + (50 - y) * 0.009), Y(y), lw(0.14), s * 1.4); }
    },
    front(c, t, dt) {
      const s = V.s;
      // 貼著鏡頭飄過峽谷的薄霧
      for (const k of wisps) { const span = V.x1 - V.x0 + k.w + 30, x = V.x0 - k.w + (((k.o + t * k.v) % span) + span) % span; c.globalAlpha = k.a; c.drawImage(fogCv[k.cv], X(x), Y(k.y + k.h / 2), k.w * s, k.h * s); }
      c.globalAlpha = 1;
      // 松針：一小截一小截轉著飄落
      c.strokeStyle = 'rgba(70,100,60,.7)'; c.lineWidth = lw(0.09); c.lineCap = 'round'; c.beginPath();
      for (const n of needles) {
        n.y -= n.v * dt; n.x += (Math.sin(t * 0.7 + n.p) * 1.2 + S.wind * 0.3 + 0.4) * dt;
        if (n.y < -9) { n.y = 30 + Math.random() * 20; n.x = V.x0 + Math.random() * (V.x1 - V.x0); }
        if (n.x > V.x1 + 2) n.x = V.x0 - 2; else if (n.x < V.x0 - 2) n.x = V.x1 + 2;
        const a = t * n.w + n.p, l = s * 0.45, px = X(n.x), py = Y(n.y);
        c.moveTo(px - Math.cos(a) * l, py - Math.sin(a) * l); c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      }
      c.stroke();
    }
  };
})();
