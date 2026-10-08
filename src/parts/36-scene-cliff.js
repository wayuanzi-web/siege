/* ===== 36-scene-cliff: 第八關「懸空寺」— 高山晴空。兩座寺各掛在自己那一邊的花崗岩懸崖上（岩柱、岩簷、殿由遊戲畫），
   兩道崖面直直落進中間一道看不到底的深谷：谷裡的霧一層層往下沉、越深越暗，遠處的山脊掛著細瀑布，谷底一線細河。
   崖頂後面是長著黃山松的山頭，更外面幾根花崗岩峰沒在霧裡；天邊一排很淡的遠峰、雲海，峰頂有小小的寺塔 ===== */
THEMES[8] = (function () {
  const WX0 = -46, WX1 = 162;                        // 佈景一律在這段戰場座標上生成（畫面寬窄不同，看到同一幅）
  const FL = 13.7, FR = 98.3;                        // 左右兩道崖面（跟 voids 13.8–98.2、岩柱的內緣 13.6 / 98.4 對齊）
  const VX = 56, VPY = 8;                            // 深谷往遠處退的消失點
  const SUNX = -1.5, SUNY = 51.5;                    // 太陽在左上角，我方寺頂的左邊
  const SKY = [82, '#2357b6', 68, '#2c6ac6', 56, '#3c82d5', 44, '#589ee2', 33, '#7db8ec', 24, '#a8d1f3', 16, '#cfe7f7', 10, '#e8f4fb', -10, '#f0f8fc'];
  // 深谷：高度 → 霧的顏色。天邊白、往下越來越藍、越暗
  const GORGE = [9, '#e6f0f8', 5, '#cfdeeb', 1, '#a9bfd6', -3, '#7e98b8', -6, '#5c7598', -9, '#3d5276', -20, '#2a3a5c'];
  // 山頭（崖頂後面那座山）的輪廓：由岩柱後面往外（左邊的；右邊的左右鏡射）。最後一段是朝外的那道崖
  const MASS = [13.2, 39.6, 8, 40.3, 3.4, 41.2, 1.8, 42.4, 0.2, 43, -1.4, 42.6, -2.3, 41.4, -3.2, 42, -4.4, 42.6, -5.4, 41.6, -5.9, 39.6, -5.7, 36.4, -6.3, 34.8, -7.6, 34.6, -8.8, 35.4, -9.6, 34.2, -9.9, 31, -9.6, 26.4, -10.4, 21, -10.1, 15.4, -10.9, 9.6, -10.6, 4, -11.2, -2];
  const CLEFT = [[-2.3, 41.4, 30], [-6.1, 35, 22], [4.2, 41, 26]];   // 山頭上幾道深的岩縫：x、從多高、到多低
  const lw = (k, m) => Math.max(m || 1, V.s * k);   // 線寬：k 個戰場單位，至少 m 像素
  const vg = (c, a, b, st) => lg(c, 0, Y(a), 0, Y(b), st);   // 由高度 a 到 b 的直向漸層
  const ss = (t) => smooth(clamp(t, 0, 1));
  const mir = (p) => { const q = p.slice(); for (let i = 0; i < q.length; i += 2) q[i] = 112 - q[i]; return q; };   // 左右鏡射（戰場中線 56）
  let fog = [], wisps = [], needles = [], birds = [], falls = [], fogCv = [], veil = null;

  function grad(T, y) { for (let i = 2; i < T.length; i += 2) if (y >= T[i]) return mix(T[i - 1], T[i + 1], clamp((T[i - 2] - y) / (T[i - 2] - T[i]), 0, 1)); return T[T.length - 1]; }
  const skyAt = (y) => grad(SKY, y), gorgeAt = (y) => grad(GORGE, y);
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
  // 一座峰：hz 越大越融進天色。左半邊受光，pine = 峰頂幾棵小松；回傳峰頂（給寺塔用）
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
    return [tx, top];
  }
  // 遠峰頂上的小寺塔（剪影）：kind 0 = 三層塔，1 = 一座小亭；u = 一層多高（戰場單位）
  function shrine(c, x, y, u, col, kind) {
    const s = V.s; c.fillStyle = col;
    const roof = (cx, yb, w) => { c.beginPath(); c.moveTo(X(cx - w), Y(yb + u * 0.12)); c.quadraticCurveTo(X(cx - w * 0.55), Y(yb + u * 0.2), X(cx - w * 0.42), Y(yb + u * 0.5)); c.lineTo(X(cx + w * 0.42), Y(yb + u * 0.5)); c.quadraticCurveTo(X(cx + w * 0.55), Y(yb + u * 0.2), X(cx + w), Y(yb + u * 0.12)); c.closePath(); c.fill(); };
    if (kind === 0) {
      for (let k = 0; k < 3; k++) { const w = u * (1.2 - k * 0.22), yb = y + k * u; c.fillRect(X(x - w * 0.45), Y(yb + u * 0.62), w * 0.9 * s, u * 0.62 * s); roof(x, yb + u * 0.5, w); }
      c.fillRect(X(x - u * 0.05), Y(y + u * 4.1), Math.max(1, u * 0.1 * s), u * 0.6 * s);
    } else {
      c.fillRect(X(x - u * 0.7), Y(y + u * 0.7), u * 1.4 * s, u * 0.7 * s); roof(x, y + u * 0.6, u * 1.3);
    }
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
  // 花崗岩的直紋：一道暗縫，受光的那一側（左）貼一道亮線
  function joint(c, R, x, y0, y1, k, dark, lit) {
    const p = []; for (let y = y0; y > y1; y -= 0.8 + R() * 1.1) p.push(x + (R() - 0.5) * 0.3 * k, y);
    p.push(x + (R() - 0.5) * 0.3 * k, y1);
    c.lineWidth = lw(0.32 * k); c.strokeStyle = lit; c.beginPath(); for (let i = 0; i < p.length; i += 2) c.lineTo(X(p[i] - 0.3 * k), Y(p[i + 1])); c.stroke();
    c.lineWidth = lw(0.15 * k); c.strokeStyle = dark; c.beginPath(); for (let i = 0; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.stroke();
  }
  // 崖頂後面那座山頭（side 0 左、1 右）：花崗岩，一根根直立的岩柱、幾道深縫和岩棚，棚上長草、頂上長松；
  // 朝外那一面（左邊那座朝著太陽）亮、朝岩柱那邊暗一點；山腳沒進谷裡升上來的霧
  function massif(c, side, R) {
    const s = V.s, P = side ? mir(MASS) : MASS.slice(), dir = side ? -1 : 1, ex = (x) => side ? 112 - x : x;
    P.push(P[P.length - 2], -12, P[0], -12);
    wpath(c, P); c.fillStyle = vg(c, 44, 0, [0, '#b9b0a1', 0.3, '#a59d8f', 0.7, '#8f897f', 1, '#7d8494']); c.fill();
    c.save(); c.clip();
    // 整座山的明暗：左邊那座朝外（朝太陽）那一面亮；右邊那座朝外那一面背光
    c.fillStyle = lg(c, X(ex(-11)), 0, X(ex(13)), 0, side ? [0, 'rgba(52,54,74,.34)', 0.5, 'rgba(52,54,74,.08)', 1, 'rgba(52,54,74,0)'] : [0, 'rgba(255,244,222,.34)', 0.45, 'rgba(255,244,222,.06)', 1, 'rgba(40,40,56,.16)']);
    c.fillRect(0, 0, V.W, V.H);
    // 深的岩縫：一道柔邊的暗帶，左緣（受光）貼一道亮線
    for (const [x0, yt, len] of CLEFT) {
      const x = ex(x0), w = 1.3;
      c.fillStyle = lg(c, X(x - w), 0, X(x + w), 0, [0, 'rgba(58,50,46,0)', 0.45, 'rgba(58,50,46,.34)', 0.6, 'rgba(58,50,46,.22)', 1, 'rgba(58,50,46,0)']);
      c.fillRect(Math.min(X(x - w), X(x + w)), Y(yt), Math.abs(X(x + w) - X(x - w)), len * s);
      joint(c, R, x, yt, yt - len * 0.9, 1.2, 'rgba(56,48,44,.5)', 'rgba(250,242,226,.42)');
    }
    // 直立的岩柱紋：長短、間距都不一樣
    for (let x = -11.5 + R() * 1.5; x < 13; x += 1.4 + R() * 2.6) {
      const yt = 42 - R() * 9, yb = Math.max(2, yt - 6 - R() * 22);
      joint(c, R, ex(x), yt, yb, 0.6 + R() * 0.5, 'rgba(70,60,52,' + (0.2 + R() * 0.22).toFixed(2) + ')', 'rgba(246,238,220,' + (0.18 + R() * 0.26).toFixed(2) + ')');
    }
    // 岩棚：上緣一道亮邊、底下影子、棚上長草
    for (const [a, b, y] of [[-9.4, -6.6, 27.4], [-5.4, -0.6, 31.6], [-3.6, 3.2, 22.8], [-10, -5.2, 14.6], [-2, 4, 8.6]]) {
      const xa = Math.min(ex(a), ex(b)), xb = Math.max(ex(a), ex(b));
      const lip = () => { c.beginPath(); c.moveTo(X(xa), Y(y)); c.quadraticCurveTo(X((xa + xb) / 2), Y(y + 0.22), X(xb), Y(y - 0.15)); };
      c.fillStyle = vg(c, y, y - 1.6, [0, 'rgba(64,54,46,.36)', 1, 'rgba(64,54,46,0)']);
      lip(); c.lineTo(X(xb - 0.8), Y(y - 1.6)); c.lineTo(X(xa + 0.8), Y(y - 1.6)); c.closePath(); c.fill();
      lip(); c.strokeStyle = '#ece2cb'; c.lineWidth = lw(0.22); c.stroke();
      c.fillStyle = '#7fae5a'; c.beginPath();
      for (let x = xa + R() * 0.6; x < xb - 0.4; x += 0.5 + R() * 1.1) { const r = s * (0.22 + R() * 0.26); c.moveTo(X(x) + r, Y(y + 0.08)); c.ellipse(X(x), Y(y + 0.08), r, r * 0.6, 0, Math.PI, TAU); }
      c.fill();
    }
    // 谷裡升上來的霧把山腳染淡
    c.fillStyle = vg(c, 18, -1, [0, 'rgba(214,230,244,0)', 1, 'rgba(214,230,244,.62)']); c.fillRect(0, Y(18), V.W, 19 * s);
    c.restore();
    // 頂上受光的邊：山頭、外面那一階
    c.strokeStyle = 'rgba(255,250,232,.8)'; c.lineWidth = lw(0.3); c.lineJoin = 'round';
    for (const [i0, i1] of [[4, 20], [24, 32]]) { c.beginPath(); for (let i = i0; i <= i1; i += 2) c.lineTo(X(P[i]), Y(P[i + 1])); c.stroke(); }
    // 頂上、岩棚上的松
    for (const [x, y, h, d] of [[1.8, 42.4, 3.2, -1], [-4.4, 42.6, 2.4, -1], [-8.8, 35.4, 2.6, -1], [-3.4, 31.6, 2, 1], [2.6, 22.8, 2.6, 1], [-8.6, 14.6, 2, -1]]) pine(c, R, X(ex(x)), Y(y) + 1, h * s, d * dir, '#5a4636', '#3e6a4c', '#7aa564');
  }

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
      // 高空的卷雲（兩寺之間更淡）
      R = mkRand(802);
      for (let k = 0; k < 9; k++) {
        const x0 = WX0 + R() * (WX1 - WX0), y0 = 40 + R() * Math.max(18, V.top - 36), mid = Math.abs(x0 - 50) < 18 ? 0.45 : 1;
        for (let j = 0, m = 2 + ((R() * 2) | 0); j < m; j++) {
          const x = X(x0 + j * 2 + R() * 5), y = Y(y0 - j * (0.7 + R() * 0.5)), w = s * (12 + R() * 15), b = s * (0.5 + R()), th = s * (0.35 + R() * 0.45);
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.45, y - b - th, x + w, y - b * 0.4); c.quadraticCurveTo(x + w * 0.5, y - b + th * 0.4, x, y); c.fillStyle = 'rgba(255,255,255,' + ((0.1 + R() * 0.12) * mid).toFixed(3) + ')'; c.fill();
        }
      }
      // 遠山：兩排很淡的峰（兩寺之間矮一點），峰腳沒進雲海；兩座峰頂上有小小的寺塔
      R = mkRand(803);
      const tops = [];
      for (let row = 0; row < 2; row++) for (let x = WX0 + R() * 4; x < WX1; x += (row ? 7 : 9) + R() * 6) {
        const mid = 1 - 0.6 * (1 - ss((Math.abs(x - VX) - 10) / 10)), w = (row ? 6 : 9) + R() * 7, h = ((row ? 9 : 13) + R() * 12) * mid;
        const tp = peak(c, R, x, 6, w, h, row ? 0.62 : 0.74, 0); if (row) tops.push(tp);
      }
      for (const [want, kind] of [[41, 0], [72, 1]]) { let b = tops[0]; for (const q of tops) if (Math.abs(q[0] - want) < Math.abs(b[0] - want)) b = q; shrine(c, b[0], b[1] - 0.15, kind ? 0.75 : 0.62, mix('#4a6a90', skyAt(b[1]), 0.5), kind); }
      bank(c, mkRand(804), 8.4, 10.6, 0.9, 2.2, '#ffffff', '#f6fafd', '#dbe8f3');
      // 兩側更外面的花崗岩峰：藍一點、峰頂長松，峰腳沒在霧裡（畫面寬的時候才看得到）
      R = mkRand(805);
      for (const [x, w, t] of [[-44, 7, 22], [-37, 5.2, 17], [-30, 4.6, 26], [-23, 6.2, 19], [-16.6, 4.8, 29], [-12.4, 3.4, 20]]) { peak(c, R, x, 2, w, t - 2, 0.34, 3); peak(c, R, 112 - x, 2, w * (0.9 + R() * 0.2), t - 2 + (R() - 0.5) * 4, 0.34, 3); }
      bank(c, mkRand(806), 3.6, 5.8, 1.1, 2.6, '#ffffff', '#eef5fa', '#c9dbea');
      // ===== 深谷：兩道崖面之間，霧一層層往下沉，越深越藍、越暗 =====
      const ga = FL - 1, gb = FR + 1, gw = X(gb) - X(ga);
      const gs = []; for (let i = 0; i < 12; i += 2) gs.push((9 - GORGE[i]) / 18, i ? GORGE[i + 1] : rgba(GORGE[1], 0));
      c.fillStyle = vg(c, 9, -9, gs); c.fillRect(X(ga), Y(9), gw, V.H);
      R = mkRand(808); falls = [];
      // 谷的盡頭：兩邊的山脊從霧裡冒出來、往中間低下去，一層比一層近、一層比一層低；遠的很淡，近的藍一點，脊上一排小樹
      const spur = (xa, xb, top, bot, col, lit, fu) => {
        const d = Math.sign(xb - xa), L = Math.abs(xb - xa), env = (u) => Math.sin(Math.PI * Math.pow(clamp(u, 0, 1), 0.55)), p = [xa - d * 1.5, bot - 4], H = top - bot;
        // 稜線：大致是一座往中間低下去的山脊，沿路幾個小岩峰、幾處斷崖
        for (let u = 0; u <= 1;) {
          const e = env(u); let y = bot + H * e;
          if (u > 0.04 && u < 0.96) y += (R() - 0.5) * 0.18 * H + (R() < 0.18 ? H * (0.1 + R() * 0.16) * e : 0);
          p.push(xa + d * u * L, y); u += (0.5 + R() * 0.9) / L;
        }
        p.push(xb, bot, xb + d * 1.2, bot - 2, xb + d * 1.6, bot - 4);
        const hAt = (u) => { const x = xa + d * u * L; for (let i = 4; i < p.length - 6; i += 2) if ((p[i] - x) * d >= 0) return lerp(p[i - 1], p[i + 1], clamp((x - p[i - 2]) / ((p[i] - p[i - 2]) || 1), 0, 1)); return bot; };
        wpath(c, p); c.fillStyle = vg(c, top + H * 0.2, bot - 4, [0, col, 0.5, mix(col, gorgeAt(bot - 1), 0.5), 0.75, rgba(gorgeAt(bot - 1.5), 0.75), 1, rgba(gorgeAt(bot - 4), 0)]); c.fill();   // 山腳化進霧裡（透明），沒有硬邊
        if (lit) { c.strokeStyle = lit; c.lineWidth = lw(0.2); c.lineJoin = 'round'; c.beginPath(); for (let i = 2; i < p.length - 6; i += 2) { const u = Math.abs(p[i] - xa) / L; if (u > 0.06 && u < 0.62) c.lineTo(X(p[i]), Y(p[i + 1])); } c.stroke(); }
        // 稜線上的松林：一排高高低低的小三角
        c.fillStyle = mix(col, '#35565e', 0.3); c.beginPath();
        for (let u = 0.08; u < 0.7; u += (0.35 + R() * 0.6) / L) { if (R() < 0.3) continue; const x = X(xa + d * u * L), y = Y(hAt(u)) + 1, h = s * (0.35 + R() * 0.55) * H / 6, w = h * 0.36; c.moveTo(x - w, y); c.lineTo(x, y - h); c.lineTo(x + w, y); c.closePath(); }
        c.fill();
        if (fu) { const x = xa + d * fu * L, y0 = hAt(fu) - 0.3, y1 = bot - 1.6; c.fillStyle = vg(c, y0, y1, [0, 'rgba(250,253,255,.9)', 0.7, 'rgba(240,248,255,.5)', 1, 'rgba(240,248,255,0)']); c.fillRect(X(x) - lw(0.13), Y(y0), lw(0.26), (y0 - y1) * s); falls.push([x, y0, y1]); }
      };
      spur(32, 56.5, 7.6, 2.4, '#c4d4e3', null, 0); spur(80, 55.5, 8.4, 2.8, '#bccddd', 'rgba(246,251,255,.85)', 0.5);
      band(c, ga, gb, 2.8, 2.2, '236,244,250', 0.8);
      spur(17, 52, 3.8, -3, '#a2b6cc', null, 0.44); spur(95, 60, 4.6, -2.6, '#9cb1c8', 'rgba(222,236,248,.75)', 0);
      band(c, ga, gb, -1.8, 2.4, '206,221,235', 0.66);
      // 谷底的河：一線亮光，從霧裡彎彎曲曲往遠處退，越遠越細
      c.lineCap = 'round';
      for (let y = -10; y < 2.2; y += 0.25) {
        const u = (y + 10) / 12.2, f = (yy) => VX + 0.6 + (Math.sin(yy * 0.8 + 0.6) * 1.5 + Math.sin(yy * 2.1) * 0.35) * (1 - u * 0.8);
        c.strokeStyle = 'rgba(228,244,255,' + (0.8 * (1 - u * 0.7) * ss((y + 10) / 3)).toFixed(3) + ')'; c.lineWidth = lw(0.56 - u * 0.44); c.beginPath(); c.moveTo(X(f(y)), Y(y)); c.lineTo(X(f(y + 0.25)), Y(y + 0.25)); c.stroke();
      }
      // 兩道崖面往深處退的那一小段：貼著崖腳往消失點收，越遠越沒進霧裡（左崖背光、右崖受光）
      for (let side = 0; side < 2; side++) {
        const F = side ? FR : FL, k = 0.085, fx = F + (VX - F) * k, q = (y) => y + (VPY - y) * k, ty = 0.3, by = -12;
        c.beginPath(); c.moveTo(X(F), Y(ty)); c.lineTo(X(fx), Y(q(ty))); c.lineTo(X(fx), Y(q(by))); c.lineTo(X(F), Y(by)); c.closePath();
        c.fillStyle = lg(c, X(F), 0, X(fx), 0, side ? [0, 'rgba(150,140,124,.95)', 0.55, 'rgba(126,140,162,.5)', 1, 'rgba(126,152,184,0)'] : [0, 'rgba(66,66,80,.95)', 0.55, 'rgba(84,98,128,.5)', 1, 'rgba(110,134,170,0)']); c.fill();
        c.save(); c.clip(); c.strokeStyle = side ? 'rgba(250,240,220,.22)' : 'rgba(30,34,52,.3)'; c.lineWidth = lw(0.14);
        for (let y = -0.8; y > -11; y -= 1.6 + R() * 1.4) { c.beginPath(); c.moveTo(X(F), Y(y)); c.lineTo(X(fx), Y(q(y))); c.stroke(); }
        c.restore();
      }
      // 再往下就只剩越來越濃的霧和暗處
      band(c, ga, gb, -4.8, 2.2, '150,172,202', 0.45);
      c.fillStyle = vg(c, -3, -10, [0, 'rgba(40,56,92,0)', 1, 'rgba(34,48,84,.55)']); c.fillRect(X(ga), Y(-3), gw, 8 * s);
      // ===== 崖頂後面的山頭（左右各一座，岩柱就是它朝深谷的那一面） =====
      massif(c, 0, mkRand(809)); massif(c, 1, mkRand(810));
    },
    terrain(c) {
      const s = V.s, bot = V.H + 4;
      // ===== 兩道懸崖：地面以下的崖身一路落到畫面底，朝深谷的崖面跟岩柱的內緣對齊 =====
      for (let side = 0; side < 2; side++) {
        const R = mkRand(811 + side), d = side ? -1 : 1, F = side ? FR : FL;
        // 崖面：由地面往下，參差地往岩石裡縮（不伸進深谷）
        const face = [];
        for (let y = 0, k = 0; y > -12; y -= 0.9 + R() * 1.1, k++) face.push(F - d * (k % 3 === 1 ? 0.35 + R() * 0.35 : R() * 0.2), y);
        const shape = () => {
          c.beginPath();
          if (side) { c.moveTo(X(F + 0.1), Y(0)); traceGround(c, F + 0.1, V.x1 + 8, 0, false); c.lineTo(X(V.x1 + 8), bot); }
          else { c.moveTo(X(V.x0 - 8), bot); traceGround(c, V.x0 - 8, F - 0.1, 0, false); c.lineTo(X(F - 0.1), Y(0)); }
          if (side) { c.lineTo(X(face[face.length - 2]), bot); for (let i = face.length - 2; i >= 0; i -= 2) c.lineTo(X(face[i]), Y(face[i + 1])); }
          else { for (let i = 0; i < face.length; i += 2) c.lineTo(X(face[i]), Y(face[i + 1])); c.lineTo(X(face[face.length - 2]), bot); }
          c.closePath();
        };
        shape(); c.fillStyle = vg(c, 1, -9, [0, '#8a8174', 0.45, '#6d665c', 1, '#4c5062']); c.fill();
        c.save(); shape(); c.clip();
        // 花崗岩的直紋、幾道橫的岩層
        for (let x = F - d * (1.4 + R()); side ? x < WX1 : x > WX0; x -= d * (1.2 + R() * 3.4)) { const y0 = -0.5 - R() * 2.5; joint(c, R, x, y0, y0 - 2.5 - R() * 7, 0.5 + R() * 0.6, 'rgba(46,40,36,' + (0.22 + R() * 0.22).toFixed(2) + ')', 'rgba(214,204,186,' + (0.08 + R() * 0.16).toFixed(2) + ')'); }
        c.strokeStyle = 'rgba(46,40,36,.25)'; c.lineWidth = lw(0.16);
        for (let k = 0; k < 7; k++) { const x = side ? F + 1 + R() * 26 : F - 1 - R() * 26, y = -1.6 - R() * 6.6, w = (3 + R() * 6) * d; c.beginPath(); c.moveTo(X(x), Y(y)); c.quadraticCurveTo(X(x - w * 0.5), Y(y - 0.35), X(x - w), Y(y + 0.1)); c.stroke(); }
        // 崖面那一側：左崖朝右、背著太陽，暗；右崖朝左、迎著太陽，亮一道
        c.fillStyle = lg(c, X(F), 0, X(F - d * 2.6), 0, side ? [0, 'rgba(244,236,214,.5)', 1, 'rgba(244,236,214,0)'] : [0, 'rgba(30,34,52,.42)', 1, 'rgba(30,34,52,0)']); c.fillRect(Math.min(X(F), X(F - d * 2.6)), Y(0.5), 2.6 * s, V.H);
        // 越往下越沒進谷裡的霧
        c.fillStyle = vg(c, -2.5, -9.5, [0, 'rgba(150,172,204,0)', 1, 'rgba(120,144,182,.55)']); c.fillRect(0, Y(-2.5), V.W, 8 * s);
        c.restore();
        // 崖面的描邊（跟岩柱的描邊同色，岩柱的內緣一路接下來）；右崖迎著太陽，描邊裡面再貼一道亮線
        const edge = (dx) => { c.beginPath(); for (let i = 0; i < face.length; i += 2) c.lineTo(X(face[i] + dx), Y(face[i + 1] - (i ? 0 : 0.05))); };
        if (side) { edge(0.32); c.strokeStyle = 'rgba(255,244,218,.6)'; c.lineWidth = lw(0.16); c.lineJoin = 'round'; c.stroke(); }
        edge(0); c.strokeStyle = '#3e3932'; c.lineWidth = lw(0.26, 1.5); c.lineJoin = 'round'; c.stroke();
        // 崖頂：一道深色的描線；岩柱外面那一段再鋪一層草皮（岩柱底下是岩石，不長草，岩柱和崖面才接得起來）
        const xa = side ? FR + 0.1 : WX0, xb = side ? WX1 : FL - 0.1;
        c.beginPath(); traceGround(c, xa, xb, 0, true); c.strokeStyle = '#3e3932'; c.lineWidth = lw(0.26, 1.5); c.stroke();
        const ga = side ? 108.4 : WX0, gb = side ? WX1 : 3.6;
        c.beginPath(); traceGround(c, ga, gb, 0, true); traceGroundBack(c, ga, gb, -0.7); c.closePath(); c.fillStyle = '#7fae5a'; c.fill();
        c.beginPath(); traceGround(c, ga, gb, -0.08, true); c.strokeStyle = 'rgba(214,240,170,.6)'; c.lineWidth = lw(0.14); c.stroke();
        for (let x = ga + R(); x < gb - 0.4; x += 0.6 + R()) {
          const px = X(x), py = Y(groundYRaw(x)), h = s * (0.4 + R() * 0.8);
          c.fillStyle = R() < 0.5 ? '#a2e070' : '#6cbc4e';
          c.beginPath(); c.moveTo(px - s * 0.24, py + 1); c.lineTo(px - s * 0.08, py - h); c.lineTo(px + s * 0.05, py + 1); c.lineTo(px + s * 0.2, py - h * 0.7); c.lineTo(px + s * 0.32, py + 1); c.closePath(); c.fill();
          if (R() < 0.1) { c.fillStyle = R() < 0.6 ? '#ffffff' : '#ffd0e4'; c.beginPath(); c.arc(px + s * 0.45, py + s * 0.35, lw(0.18), 0, TAU); c.fill(); }
        }
        // 崖面的岩縫裡長出一棵松，斜斜地伸向深谷
        pine(c, R, X(F - d * 0.2), Y(-2.4), s * 3.4, d, '#4e3a2c', '#2d6046', '#6aa45a', 1);
        // 崖頂外面那片台地上的松
        for (const [x, h] of [[-13.4, 4.2], [-19.5, 3.4]]) { const px = side ? 112 - x : x; pine(c, R, X(px), Y(groundYRaw(px)) + 2, s * h, side ? 1 : -1, '#4e3a2c', '#2d6046', '#6aa45a', 1); }
      }
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
      for (let k = 0; k < 6; k++) { const y = [-7.4, -4.6, -1.8, -6.2, 0.8, 3.4][k]; fog.push({ cv: fogCv[y < -4 ? 2 : k & 1], y, w: 30 + k * 4, h: 3.2 + (k % 3) * 0.6, v: (0.5 + k * 0.12) * (k & 1 ? -1 : 1), o: k * 17, a: [0.5, 0.42, 0.5, 0.42, 0.45, 0.38][k] }); }
      wisps = [{ cv: 2, y: -5.6, w: 34, h: 3.4, v: 1.1, o: 0, a: 0.36 }, { cv: 0, y: -1.2, w: 24, h: 2.6, v: -0.8, o: 30, a: 0.22 }];
      // 深谷最底下蓋在所有東西前面的一層暗霧：掉下去的殿、兵慢慢沒進去
      veil = mkCanvas(1, 64); const vc = veil.getContext('2d'); vc.fillStyle = lg(vc, 0, 0, 0, 64, [0, 'rgba(44,60,96,0)', 0.5, 'rgba(44,60,96,.2)', 1, 'rgba(36,50,86,.55)']); vc.fillRect(0, 0, 1, 64);
      const R = mkRand(822);
      needles = []; for (let k = 0; k < 12; k++) needles.push({ x: V.x0 + R() * (V.x1 - V.x0), y: R() * 40, v: 0.8 + R() * 0.9, p: R() * TAU, w: 1.5 + R() * 2.5 });
      birds = [{ cx: 44, cy: -2.6, rx: 8, ry: 1.8, w: 0.34, p: 0 }, { cx: 69, cy: -0.6, rx: 6.5, ry: 1.4, w: -0.29, p: 2 }];
    },
    back(c, t, dt) {
      const s = V.s;
      c.save(); c.beginPath(); c.rect(X(FL), Y(8), X(FR) - X(FL), V.H); c.clip();
      // 霧在深谷裡慢慢地飄
      for (const f of fog) {
        const span = FR - FL + f.w, x = FL - f.w + (((f.o + t * f.v) % span) + span) % span;
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
      // 遠處瀑布上往下流的白紋
      c.fillStyle = 'rgba(255,255,255,.7)';
      for (const [x, y0, y1] of falls) for (let k = 0; k < 2; k++) { const L = y0 - y1, y = y0 - ((t * 1.6 + k * L / 2) % L); c.fillRect(X(x - 0.08), Y(y), lw(0.16), s * 0.7); }
    },
    front(c, t, dt) {
      const s = V.s;
      // 深谷最底下的暗霧（只在兩道崖面之間），再貼著鏡頭飄過幾片薄霧
      const vy = Math.floor(Y(-2.4)); if (vy < V.H) c.drawImage(veil, X(FL), vy, X(FR) - X(FL), V.H - vy);
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
