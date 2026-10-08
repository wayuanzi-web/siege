/* ===== 36-scene-canyon: 第九關「天秤寨」— 紅岩峽谷的黃昏：天頂深紫，往下轉玫瑰紅、橘、金；又大又低的夕陽半沉在遠方的平頂山後，
   逆光的石柱鑲著金邊，一塊平衡石剪影立在夕陽前，長長的影子拖過台地；敵寨前一道又窄又深的裂谷，越往下越暗。
   鳥群掠過天邊；起風時紅沙和風滾草順風跑，跑到裂谷就掉下去 ===== */
THEMES[9] = (function () {
  const WX0 = -46, WX1 = 162;                       // 佈景一律在這段戰場座標上生成（畫面寬窄不同，看到同一幅）
  const CL = 58.5, CR = 81.5, CX = 70, VPY = 3.2;   // 裂谷的左右緣（跟這一關的 voids 一致）、往遠處退的消失點
  const SX = 48, SY = 7.4, SR = 9.6;                // 夕陽：在兩城之間、倍增符的下面
  const SKY = [86, '#22174a', 72, '#2f1d5c', 61, '#47286f', 51, '#69337e', 42, '#924282', 34, '#bb557f', 27, '#dc6d72', 20, '#f28c60', 14, '#fcad5c', 9, '#ffcd72', 4, '#ffe29a', -10, '#ffe7a8'];
  const ss = (t) => smooth(clamp(t, 0, 1));
  const lw = (k, m) => Math.max(m || 1, V.s * k);
  const vg = (c, a, b, st) => lg(c, 0, Y(a), 0, Y(b), st);
  const sun = (x) => 1 - ss((Math.abs(x - SX) - 6) / 46);       // 離夕陽多近（1 = 就在旁邊）
  let birds = [], dust = [], haze = [], weed = null, weedCv = null, hazeCv = null;

  function skyAt(y) { for (let i = 2; i < SKY.length; i += 2) if (y >= SKY[i]) return mix(SKY[i - 1], SKY[i + 1], clamp((SKY[i - 2] - y) / (SKY[i - 2] - SKY[i]), 0, 1)); return SKY[SKY.length - 1]; }
  // [x, y, …]（戰場座標）接成封閉路徑；round = 圓滑的曲線
  function wpath(c, p, round) {
    c.beginPath(); const n = p.length / 2, P = (i) => [X(p[(i % n) * 2]), Y(p[(i % n) * 2 + 1])];
    if (!round) { c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.closePath(); return; }
    for (let i = 0; i <= n; i++) { const a = P(i), b = P(i + 1), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (i) c.quadraticCurveTo(a[0], a[1], m[0], m[1]); else c.moveTo(m[0], m[1]); }
    c.closePath();
  }
  function glow(c, x, y, rx, ry, st) { c.save(); c.translate(X(x), Y(y)); c.scale(rx * V.s, ry * V.s); c.fillStyle = rg(c, 0, 0, 0, 1, st); c.fillRect(-1, -1, 2, 2); c.restore(); }
  // 平頂山、石柱的輪廓：底下一圈內凹的碎石坡，上面直直的岩壁；spire = 細高、頂上圓
  function buttePts(R, x0, x1, top, base, spire) {
    const w = x1 - x0, H = top - base, th = H * (0.2 + R() * 0.12), tl = Math.min(w * 0.45, H * 0.4) + 1.2, p = [x0 - tl, base - 3];
    for (let k = 0; k <= 5; k++) { const u = k / 5; p.push(x0 - tl * (1 - u), base + th * u * u); }
    const cap = spire ? w * 0.45 : 0;
    p.push(x0 + w * 0.02 + (R() - 0.5) * 0.3, base + th + (H - th) * 0.5, x0 + w * 0.06, top - cap);
    if (spire) for (let k = 1; k < 7; k++) { const a = Math.PI * (1 - k / 7); p.push(x0 + w / 2 + Math.cos(a) * w * 0.44, top - cap + Math.sin(a) * cap * (0.9 + R() * 0.2)); }
    else for (let x = x0 + w * 0.06, y = top; x < x1 - w * 0.2;) { x += w * (0.12 + R() * 0.2); if (x > x1 - w * 0.1) break; p.push(x, y); if (R() < 0.35) { y = top - 0.2 - R() * 0.35; p.push(x + 0.15, y); } else if (y < top) { y = top; p.push(x + 0.15, y); } }
    p.push(x1 - w * 0.06, top - cap - (spire ? 0 : 0.1), x1 - w * 0.02 + (R() - 0.5) * 0.3, base + th + (H - th) * 0.5);
    for (let k = 5; k >= 0; k--) { const u = k / 5; p.push(x1 + tl * (1 - u), base + th * u * u); }
    p.push(x1 + tl, base - 3);
    return p;
  }
  // 逆光的一座山：body 底色，rim 朝夕陽那一側和頂上的金邊，la = 岩層紋路的濃度
  function butte(c, R, x0, x1, top, base, spire, body, rim, la) {
    const p = buttePts(R, x0, x1, top, base, spire), d = (x0 + x1) / 2 < SX ? -1 : 1, s = V.s;
    wpath(c, p); c.fillStyle = vg(c, top, base, [0, body, 1, mix(body, '#f0a070', 0.25)]); c.fill();
    c.save(); c.clip();
    if (la) { c.fillStyle = rgba('#3a1430', la); for (let y = base + 1 + R(); y < top - 0.6; y += 1.1 + R() * 1.6) c.fillRect(X(x0 - 8), Y(y), (x1 - x0 + 16) * s, lw(0.14 + R() * 0.12)); }
    c.strokeStyle = lg(c, X(d < 0 ? x1 : x0), 0, X(d < 0 ? x0 : x1), 0, [0, rgba(rim, 0.95), 0.45, rgba(rim, 0.45), 1, rgba(rim, 0.1)]); c.lineWidth = lw(0.55); c.lineJoin = 'round'; c.stroke();
    c.restore();
  }
  // 細長的雲：幾片葉形疊起來，下緣被夕陽照亮
  function streak(c, R, x, y, w, h, body, rim, a) {
    for (let k = 0, n = 2 + ((R() * 3) | 0); k < n; k++) {
      const cx = X(x + (R() - 0.5) * w * 0.4), cy = Y(y + (k - n / 2) * h * 0.5), ww = w * V.s * (0.45 + R() * 0.55), hh = h * V.s * (0.6 + R() * 0.5);
      for (const [col, dy, k2] of [[rim, hh * 0.28, 0.9], [body, 0, 1]]) {
        c.fillStyle = lg(c, cx - ww / 2, 0, cx + ww / 2, 0, [0, rgba(col, 0), 0.25, rgba(col, a), 0.75, rgba(col, a), 1, rgba(col, 0)]);
        c.beginPath(); c.moveTo(cx - ww / 2, cy + dy); c.bezierCurveTo(cx - ww * 0.2, cy + dy - hh * 0.7 * k2, cx + ww * 0.15, cy + dy - hh * 0.7 * k2, cx + ww / 2, cy + dy); c.bezierCurveTo(cx + ww * 0.2, cy + dy + hh * 0.5, cx - ww * 0.15, cy + dy + hh * 0.5, cx - ww / 2, cy + dy); c.fill();
      }
    }
  }
  // 一叢鼠尾草（灰綠的圓叢）、一棵杜松（歪樹幹、幾團深綠）、一棵枯樹；(x, y) 是腳下（像素），u 是尺寸（像素）
  function sage(c, x, y, u) { c.fillStyle = '#7d8a5e'; c.beginPath(); c.ellipse(x, y - u * 0.35, u, u * 0.55, 0, Math.PI, TAU); c.fill(); c.fillStyle = '#a9b37e'; c.beginPath(); c.ellipse(x - u * 0.25, y - u * 0.55, u * 0.55, u * 0.25, 0, Math.PI, TAU); c.fill(); }
  function juniper(c, R, x, y, u, d) {
    c.strokeStyle = '#4a2c22'; c.lineWidth = Math.max(1.5, u * 0.16); c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + d * u * 0.5, y - u * 0.9, x - d * u * 0.1, y - u * 1.8); c.moveTo(x + d * u * 0.25, y - u * 0.8); c.lineTo(x + d * u * 0.9, y - u * 1.3); c.stroke();
    for (const [dx, dy, r] of [[-0.1, 2.0, 0.7], [0.9, 1.45, 0.55], [0.35, 2.3, 0.5], [-0.55, 1.6, 0.45]]) { c.fillStyle = '#3e5a3a'; c.beginPath(); c.arc(x + d * dx * u, y - dy * u, r * u, 0, TAU); c.fill(); c.fillStyle = '#6f8a52'; c.beginPath(); c.arc(x + d * dx * u - r * u * 0.3, y - dy * u - r * u * 0.3, r * u * 0.5, 0, TAU); c.fill(); }
  }
  function snag(c, x, y, u, d) {
    c.strokeStyle = '#3a2024'; c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = Math.max(1.5, u * 0.14); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + d * u * 0.2, y - u, x + d * u * 0.8, y - u * 1.9); c.stroke();
    c.lineWidth = Math.max(1, u * 0.07); c.beginPath(); c.moveTo(x + d * u * 0.3, y - u * 1.1); c.lineTo(x - d * u * 0.35, y - u * 1.6); c.lineTo(x - d * u * 0.5, y - u * 2.0); c.moveTo(x + d * u * 0.62, y - u * 1.6); c.lineTo(x + d * u * 1.3, y - u * 1.75); c.lineTo(x + d * u * 1.5, y - u * 2.1); c.stroke();
  }

  return {
    key: 'canyon',
    build(c, W, H) {
      const s = V.s, st = [];
      for (let i = 0; i < SKY.length; i += 2) st.push((86 - SKY[i]) / 96, SKY[i + 1]);
      c.fillStyle = vg(c, 86, -10, st); c.fillRect(0, 0, W, H);
      // 背著夕陽的右半邊天色暗、偏紫（敵寨的紅屋頂才跳得出來）
      c.fillStyle = lg(c, X(60), 0, X(132), 0, [0, 'rgba(46,26,92,0)', 1, 'rgba(46,26,92,.34)']); c.fillRect(X(60), 0, W, Y(6));
      // 夕陽的光暈、貼著地平線的一大片金光、往上散的幾道光
      const sx = X(SX), sy = Y(SY);
      c.fillStyle = rg(c, sx, sy, 0, s * 50, [0, 'rgba(255,240,180,.95)', 0.07, 'rgba(255,214,140,.6)', 0.18, 'rgba(255,170,100,.28)', 0.42, 'rgba(240,120,110,.1)', 1, 'rgba(240,120,110,0)']); c.fillRect(0, 0, W, H);
      glow(c, SX, 5, 64, 9, [0, 'rgba(255,226,150,.55)', 0.5, 'rgba(255,190,120,.2)', 1, 'rgba(255,170,110,0)']);
      c.globalCompositeOperation = 'lighter'; let R = mkRand(901);
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI * (0.06 + (k + 0.2 + R() * 0.6) / 9 * 0.88), w = 0.03 + R() * 0.04, L = s * (40 + R() * 30);
        c.fillStyle = lg(c, sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L, [0, 'rgba(255,220,160,.07)', 1, 'rgba(255,220,160,0)']);
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a - w) * L, sy + Math.sin(a - w) * L); c.lineTo(sx + Math.cos(a + w) * L, sy + Math.sin(a + w) * L); c.closePath(); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
      // 天頂暗下來的地方冒出幾顆星（兩城之間不放，免得跟瞄準的虛線混在一起）
      R = mkRand(905);
      for (let k = 0; k < 26; k++) { const x = WX0 + R() * (WX1 - WX0), y = 47 + R() * 30, r = s * (0.07 + R() * 0.09); if (Math.abs(x - 50) < 22) continue; c.fillStyle = 'rgba(255,240,230,' + (0.25 + R() * 0.45 * clamp((y - 47) / 12, 0, 1)).toFixed(2) + ')'; c.beginPath(); c.arc(X(x), Y(y), Math.max(0.8, r), 0, TAU); c.fill(); }
      // 高處被夕陽照紅肚子的雲（只在兩側，兩城之間留空）
      R = mkRand(902);
      for (const [x, y, w] of [[-30, 50, 24], [-12, 56, 22], [4, 47.5, 16], [104, 49, 20], [122, 55, 26], [140, 47, 22], [-36, 36, 18], [132, 35, 20]]) { const f = clamp((y - 30) / 26, 0, 1); streak(c, R, x, y, w, 1.3, mix('#a8507e', '#5a3274', f), mix('#ffb07a', '#f08aa0', f), 0.75); }
      // 夕陽
      c.fillStyle = rg(c, sx, sy, SR * s * 0.9, SR * s * 1.7, [0, 'rgba(255,236,170,.6)', 1, 'rgba(255,220,150,0)']); c.fillRect(sx - SR * s * 2, sy - SR * s * 2, SR * s * 4, SR * s * 4);
      c.fillStyle = vg(c, SY + SR, SY - SR * 0.6, [0, '#fff8de', 0.55, '#ffe192', 1, '#ffb456']); c.beginPath(); c.arc(sx, sy, SR * s, 0, TAU); c.fill();
      // 橫過夕陽的幾條細雲
      for (const [x, y, w, h] of [[41, 13.2, 22, 0.55], [56, 10.6, 18, 0.45], [33, 17.5, 16, 0.5], [64, 15.5, 14, 0.4]]) streak(c, R, x, y, w, h, '#a8466a', '#ffd290', 0.9);
      // 最遠的一層平頂山：很淡，越靠近夕陽越被光吃掉
      const far = (x) => mix('#b46a86', '#f7c08a', sun(x));
      R = mkRand(903);
      c.fillStyle = vg(c, 6, -2, [0, '#f2b585', 1, '#e79070']); c.fillRect(0, Y(4.6), W, H);
      for (const [x0, x1, t] of [[-46, -33, 9.4], [-28, -15, 7.6], [-9, 2, 10.2], [8, 21, 8], [25, 34, 6.6], [57, 61.5, 6.4], [84, 97, 9.2], [102, 112, 7.2], [119, 140, 10.4], [146, 160, 8.4]]) {
        const col = far((x0 + x1) / 2); butte(c, R, x0, x1, t, 4.4, 0, col, '#fff0c0', 0);
      }
      c.fillStyle = vg(c, 7, 3.5, [0, 'rgba(255,200,140,0)', 1, 'rgba(255,200,140,.5)']); c.fillRect(0, Y(7), W, 3.5 * s);
      // 中景：逆光的石柱、平頂山，朝夕陽的邊和頂上一道金光；靠近夕陽的被光照得淡一點
      R = mkRand(904);
      const MB = [[-46, -24, 24.5, 0], [-21.5, -18.8, 21, 1], [-13.5, -4.6, 17.5, 0], [-2.8, -1.2, 13.4, 1], [52.4, 56, 7.6, 0], [61, 62.6, 10.4, 1], [86, 106, 22.5, 0], [110.5, 121.5, 27, 0], [123.2, 125.4, 23.4, 1], [130, 149, 20.5, 0], [152.5, 155, 25.5, 1], [157.5, 166, 18, 0]];
      for (const [x0, x1, t, sp] of MB) butte(c, R, x0, x1, t, 3.4, sp, mix('#a1404e', '#da825e', sun((x0 + x1) / 2) * 0.85), '#ffd08a', 0.2);
      // 平衡石：下寬上窄的石座，細細的頸上頂著一塊歪歪的大石頭，剪影壓在夕陽的左緣上（朝夕陽那一側一道金邊）
      const rock = '#7a2e44', BR = [[37.2, 3, 38, 5.4, 38.7, 7.8, 39.25, 9.5, 39.7, 9.75, 40.5, 9.5, 40.95, 7.7, 41.6, 5.2, 42.6, 3], [36.8, 10.6, 37.5, 9.7, 39.4, 9.35, 41.9, 9.6, 43.1, 10.5, 43.3, 11.9, 42.6, 13.2, 40.9, 13.95, 39, 13.75, 37.6, 12.9, 36.9, 11.8]];
      for (const p of BR) {
        wpath(c, p); c.fillStyle = vg(c, 14, 3, [0, rock, 1, '#9a3e4c']); c.fill(); c.save(); c.clip();
        c.strokeStyle = lg(c, X(43.4), 0, X(38.6), 0, [0, 'rgba(255,216,140,.95)', 0.45, 'rgba(255,190,120,.35)', 1, 'rgba(255,190,120,0)']); c.lineWidth = lw(0.6); c.lineJoin = 'round'; c.stroke();
        c.fillStyle = 'rgba(40,8,30,.3)'; for (const y of [5.2, 7.3, 11, 12.4]) c.fillRect(X(36), Y(y), s * 8, lw(0.16));
        c.restore();
      }
      poly(c, [X(41.9), Y(9.6), X(43.1), Y(10.5), X(43.3), Y(11.9), X(42.2), Y(11.4)]); c.fillStyle = 'rgba(255,170,110,.4)'; c.fill();
      // 遠方地面上的沙塵
      c.fillStyle = vg(c, 5.5, 2.5, [0, 'rgba(255,190,130,0)', 1, 'rgba(255,190,130,.45)']); c.fillRect(0, Y(5.5), W, 3 * s);
      // 台地往遠處退的那一片（夕陽斜照，暖橘色），上面拖著石柱長長的影子（背著夕陽往前拖）
      const top = (x) => 3.1 + 0.18 * Math.sin(x * 0.21) + 0.1 * Math.sin(x * 0.57);
      c.beginPath(); c.moveTo(X(V.x0 - 4), V.H + 2); for (let x = V.x0 - 4; x <= V.x1 + 4; x += 1) c.lineTo(X(x), Y(top(x))); c.lineTo(X(V.x1 + 4), V.H + 2); c.closePath();
      c.fillStyle = vg(c, 3.4, -1, [0, '#e48a58', 0.5, '#d7764b', 1, '#c46040']); c.fill();
      c.save(); c.clip();
      c.fillStyle = vg(c, 3.4, -1, [0, 'rgba(110,36,60,.4)', 1, 'rgba(110,36,60,.14)']); c.beginPath();
      for (const [x0, x1] of MB.concat([[38.2, 41.8]])) {
        const m = (x0 + x1) / 2, d = m < SX ? -1 : 1, k = Math.abs(m - SX) * 0.5 + 5, w = Math.min(x1 - x0, 6);
        c.moveTo(X(m - w / 2), Y(3.5)); c.lineTo(X(m + w / 2), Y(3.5)); c.lineTo(X(m + w / 2 + d * k), Y(-1)); c.lineTo(X(m - w / 2 + d * k * 0.92), Y(-1)); c.closePath();
      }
      c.fill();
      c.strokeStyle = 'rgba(150,60,50,.22)'; c.lineWidth = lw(0.12);
      for (let y = 2.4; y > -1; y -= 0.9) { c.beginPath(); c.moveTo(X(V.x0 - 4), Y(y)); c.lineTo(X(V.x1 + 4), Y(y + 0.1)); c.stroke(); }
      c.restore();
      c.strokeStyle = 'rgba(255,214,150,.7)'; c.lineWidth = lw(0.16); c.beginPath(); for (let x = V.x0 - 4; x <= V.x1 + 4; x += 1) c.lineTo(X(x), Y(top(x))); c.stroke();
      // ===== 裂谷：裡面是背光的岩壁，上緣被夕陽鑲一道金邊；兩邊的岩壁一層層往外凸，朝夕陽的（右邊）暖、背光的（左邊）暗，越往下越黑 =====
      const ca = CL - 1, cb = CR + 1, bt = (x) => 1 + 0.22 * Math.sin(x * 0.9) + 0.12 * Math.sin(x * 2.3);
      c.beginPath(); c.moveTo(X(ca), V.H + 2); for (let x = ca; x <= cb; x += 0.5) c.lineTo(X(x), Y(bt(x))); c.lineTo(X(cb), V.H + 2); c.closePath();
      c.fillStyle = vg(c, 1.3, -10, [0, '#b85a3e', 0.1, '#8e3e3a', 0.32, '#5e2434', 0.62, '#2e1020', 1, '#12060c']); c.fill();
      c.save(); c.clip(); c.fillStyle = 'rgba(30,8,20,.2)';
      for (let y = 0.2; y > -9; y -= 0.9 + R() * 1.2) c.fillRect(X(ca), Y(y), X(cb) - X(ca), lw(0.12 + R() * 0.16));
      c.restore();
      c.beginPath(); for (let x = ca; x <= cb; x += 0.5) c.lineTo(X(x), Y(bt(x))); c.strokeStyle = 'rgba(255,190,120,.8)'; c.lineWidth = lw(0.2); c.stroke();
      // 一片往裡凸的岩壁：side 在哪一邊、凸出多少、頂多高；lit = 朝夕陽
      const fin = (sd, dep, ty, lit) => {
        const x0 = sd < 0 ? ca - 0.5 : cb + 0.5, p = [x0, -14, x0, ty], e = [];
        p.push(x0 - sd * dep * 0.55, ty + 0.12);
        for (let y = ty - 0.2, k = 0; y > -14; y -= 0.8 + R() * 1.3, k++) e.push(x0 - sd * (dep * (1 - 0.06 * k) + (R() - 0.5) * 0.7 + (k % 3 === 1 ? 0.5 : 0)), y);
        const P = p.concat(e); wpath(c, P);
        c.fillStyle = vg(c, ty, -10, lit ? [0, '#d77a4c', 0.2, '#a24a3a', 0.55, '#4a1a2a', 1, '#14060e'] : [0, '#9a4642', 0.2, '#6c2a36', 0.55, '#2e1020', 1, '#100509']); c.fill();
        c.save(); c.clip(); c.fillStyle = 'rgba(30,8,20,.22)';
        for (let y = ty - 0.6; y > -9; y -= 0.8 + R() * 1.1) c.fillRect(X(x0 - 8), Y(y), 16 * s, lw(0.1 + R() * 0.14));
        c.restore();
        c.beginPath(); c.moveTo(X(x0), Y(ty)); c.lineTo(X(p[4]), Y(p[5])); for (let i = 0; i < e.length && e[i + 1] > ty - (lit ? 4 : 0.6); i += 2) c.lineTo(X(e[i]), Y(e[i + 1]));
        c.strokeStyle = lit ? 'rgba(255,190,120,.85)' : 'rgba(255,170,120,.4)'; c.lineWidth = lw(0.22); c.lineJoin = 'round'; c.stroke();
      };
      fin(-1, 7, 0.5, 0); fin(1, 6.4, 0.9, 1);
      c.fillStyle = vg(c, 1, -3.5, [0, 'rgba(240,140,90,0)', 0.5, 'rgba(240,140,90,.2)', 1, 'rgba(240,140,90,0)']); c.fillRect(X(ca), Y(1), X(cb) - X(ca), 4.5 * s);
      fin(-1, 3.8, -1.2, 0); fin(1, 3.4, -0.2, 1);
      // 縫裡飄著一層被照亮的沙塵，最底下全黑
      c.fillStyle = vg(c, -1, -5, [0, 'rgba(230,120,80,0)', 0.5, 'rgba(230,120,80,.16)', 1, 'rgba(230,120,80,0)']); c.fillRect(X(ca), Y(-1), X(cb) - X(ca), 4 * s);
      c.fillStyle = vg(c, -3, -10, [0, 'rgba(16,6,12,0)', 1, 'rgba(16,6,12,.72)']); c.fillRect(X(ca), Y(-3), X(cb) - X(ca), 8 * s);
    },
    terrain(c) {
      const s = V.s, R = mkRand(911), runs = groundRuns(), bot = V.H + 4;
      // 紅砂岩：一層一層的色帶，靠地面的幾層順著地形起伏，越深越平、越暗
      const BAND = [[0.9, '#c5603a'], [1.9, '#dd8250'], [3.1, '#b24c33'], [4.4, '#cf7346'], [6, '#9a3d2e'], [7.4, '#b9583a'], [9.2, '#7c2f2a']];
      const by = (x, k) => groundYRaw(x) * (1 - 0.14 * k) - BAND[k][0] + 0.25 * Math.sin(x * 0.11 + k * 1.7) + 0.12 * Math.sin(x * 0.37 + k);
      for (const [xa, xb] of runs) {
        // 外形：沿著地面走，到了裂谷那一邊沿著參差的崖口往下（只往岩石裡縮，不伸進裂谷）
        const jag = (x, sd, rev) => { const q = []; for (let y = groundYRaw(x) - 0.7, k = 0; y > -11; y -= 1 + (k % 3) * 0.4, k++) q.push([X(x - sd * (0.1 + ((k * 0.37) % 1) * 0.5)), Y(y)]); if (rev) q.reverse(); for (const [a, b] of q) c.lineTo(a, b); };
        const shape = () => { c.beginPath(); traceGround(c, xa, xb, 0, true); if (xb < CR) jag(xb, 1, 0); c.lineTo(X(xb), bot); c.lineTo(X(xa), bot); if (xa > CL) jag(xa, -1, 1); c.closePath(); };
        shape(); c.fillStyle = '#d97b47'; c.fill();
        c.save(); shape(); c.clip();
        for (let k = 0; k < BAND.length; k++) { c.beginPath(); c.moveTo(X(xa - 1), bot); for (let x = xa - 1; x <= xb + 1; x += 0.8) c.lineTo(X(x), Y(by(x, k))); c.lineTo(X(xb + 1), bot); c.closePath(); c.fillStyle = BAND[k][1]; c.fill(); }
        // 交錯層理：幾道斜斜的弧線
        c.strokeStyle = 'rgba(120,40,30,.28)'; c.lineWidth = lw(0.12);
        for (let x = WX0 + R() * 6; x < WX1; x += 5 + R() * 9) { const k = (R() * 4) | 0; if (x < xa || x > xb - 3) continue; const y0 = by(x, k) - 0.15, y1 = by(x, k + 1) + 0.15; for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(X(x + j * 0.7), Y(y0)); c.quadraticCurveTo(X(x + j * 0.7 + 1.2), Y(y1 + 0.2), X(x + j * 0.7 + 3), Y(y1)); c.stroke(); } }
        // 裂谷那一邊的崖面：一道暗邊
        c.fillStyle = 'rgba(40,12,20,.35)'; if (xb < CR) c.fillRect(X(CL - 0.9), Y(groundYRaw(CL)), 0.9 * s, V.H); else if (xa > CL) c.fillRect(X(CR), Y(groundYRaw(CR)), 0.6 * s, V.H);
        // 越往下越暗
        c.fillStyle = vg(c, -4, -10, [0, 'rgba(40,10,20,0)', 1, 'rgba(40,10,20,.45)']); c.fillRect(X(xa), Y(-4), X(xb) - X(xa), 7 * s);
        c.restore();
        // 地面：一道被夕陽照亮的邊，外面一圈深色描線
        c.beginPath(); traceGround(c, xa, xb, 0, true); traceGroundBack(c, xa, xb, -0.38); c.closePath(); c.fillStyle = '#ffb27a'; c.fill();
        shape(); c.strokeStyle = '#5a2418'; c.lineWidth = lw(0.22, 1.5); c.lineJoin = 'round'; c.stroke();
      }
      // 地面上的東西：每樣都往背著夕陽的那一邊拖一道長影子
      const things = [[-30, 2], [-21, 0], [-13.5, 3], [-5.5, 1], [-1.5, 0], [36.6, 0], [41.5, 2], [44.8, 0], [50.6, 4], [53.6, 0], [55.6, 5], [84.5, 0], [96, 2], [99, 0], [112.5, 1], [117, 0], [124, 3], [130, 0], [136, 2], [142, 1], [149, 0], [156, 3]];
      for (const [x, kind] of things) {
        if (x < V.x0 - 4 || x > V.x1 + 4) continue;
        const gy = groundYRaw(x), d = x < SX ? -1 : 1, len = 2.5 + Math.abs(x - SX) * 0.06 + (kind === 1 || kind === 5 ? 3 : 0);
        c.fillStyle = lg(c, X(x), 0, X(x + d * len), 0, [0, 'rgba(90,24,30,.45)', 1, 'rgba(90,24,30,0)']);
        c.beginPath(); c.moveTo(X(x - d * 0.6), Y(gy - 0.05)); c.lineTo(X(x + d * len), Y(gy - 0.3)); c.lineTo(X(x + d * len * 0.9), Y(gy - 0.5)); c.lineTo(X(x - d * 0.4), Y(gy - 0.42)); c.closePath(); c.fill();
      }
      for (const [x, kind] of things) {
        const u = s * (0.75 + R() * 0.4); if (x < V.x0 - 4 || x > V.x1 + 4) continue;
        const px = X(x), py = Y(groundYRaw(x)) + 1;
        if (kind === 0) sage(c, px, py, u);
        else if (kind === 1) juniper(c, R, px, py, u * 1.6, x < SX ? 1 : -1);
        else if (kind === 2) { const w = u * 1.1, h = u * 0.75; poly(c, [px - w, py, px - w * 0.8, py - h * 0.7, px - w * 0.2, py - h, px + w * 0.6, py - h * 0.8, px + w, py]); c.fillStyle = '#9a4030'; c.fill(); poly(c, [px - w * 0.8, py - h * 0.7, px - w * 0.2, py - h, px + w * 0.6, py - h * 0.8, px + w * 0.1, py - h * 0.5]); c.fillStyle = '#e88a58'; c.fill(); }
        else if (kind === 3) { for (const [dy, r] of [[0.32, 0.48], [0.9, 0.38], [1.38, 0.3], [1.76, 0.2]]) { c.fillStyle = '#8c3a2c'; ell(c, px, py - dy * u * 1.2, r * u * 1.6, r * u); c.fill(); c.fillStyle = 'rgba(255,190,130,.6)'; ell(c, px - r * u * 0.5, py - dy * u * 1.2 - r * u * 0.4, r * u * 0.7, r * u * 0.3); c.fill(); } }
        else if (kind === 4) {   // 火焰草：幾根細莖，頂上一小撮紅花
          c.strokeStyle = '#6f7e4c'; c.lineWidth = lw(0.1); c.beginPath(); for (const [dx, h] of [[-0.45, 1.1], [0, 1.5], [0.4, 0.9]]) { c.moveTo(px + dx * u * 0.4, py); c.quadraticCurveTo(px + dx * u * 0.5, py - h * u * 0.5, px + dx * u, py - h * u); } c.stroke();
          for (const [dx, h] of [[-0.45, 1.1], [0, 1.5], [0.4, 0.9]]) { c.fillStyle = '#e8483a'; ell(c, px + dx * u, py - h * u - u * 0.12, u * 0.17, u * 0.3); c.fill(); c.fillStyle = '#ffb05a'; ell(c, px + dx * u, py - h * u - u * 0.3, u * 0.09, u * 0.12); c.fill(); }
        } else {   // 崖邊一棵枯樹，枝上停著一隻烏鴉
          const k = u * 2.4; snag(c, px, py, k, 1);
          const bx = px - k * 0.38, by = py - k * 1.58; c.fillStyle = '#2a1424'; ell(c, bx, by, k * 0.12, k * 0.075, -0.2); c.fill(); c.beginPath(); c.arc(bx + k * 0.09, by - k * 0.08, k * 0.05, 0, TAU); c.fill();
          poly(c, [bx + k * 0.13, by - k * 0.09, bx + k * 0.2, by - k * 0.07, bx + k * 0.13, by - k * 0.05]); c.fill(); poly(c, [bx - k * 0.1, by, bx - k * 0.22, by + k * 0.05, bx - k * 0.1, by + k * 0.04]); c.fill();
        }
      }
      // 敵寨石柱拖在地上的長影子
      c.fillStyle = lg(c, X(90), 0, X(112), 0, [0, 'rgba(90,24,30,.4)', 1, 'rgba(90,24,30,0)']);
      c.beginPath(); c.moveTo(X(91.6), Y(groundYRaw(91.6))); c.lineTo(X(112), Y(groundYRaw(112) - 0.25)); c.lineTo(X(110), Y(groundYRaw(110) - 0.5)); c.lineTo(X(91.6), Y(groundYRaw(91.6) - 0.45)); c.closePath(); c.fill();
    },
    init() {
      const s = V.s, R = mkRand(921);
      // 遠方地面上慢慢飄的一層暖色沙塵
      hazeCv = mkCanvas(256, 32); let g = hazeCv.getContext('2d');
      for (let j = 0; j < 8; j++) { const rx = 30 + R() * 50, ry = 5 + R() * 4, x = rx + R() * (256 - rx * 2), y = 16 + (R() - 0.5) * 8; g.save(); g.translate(x, y); g.scale(rx / ry, 1); g.fillStyle = rg(g, 0, 0, 0, ry, [0, 'rgba(255,196,140,.55)', 1, 'rgba(255,196,140,0)']); g.fillRect(-ry, -ry, ry * 2, ry * 2); g.restore(); }
      haze = [{ x: 0, y: 4.4, w: 60, h: 3.2, v: 0.35 }, { x: 70, y: 6.2, w: 46, h: 2.6, v: 0.22 }];
      // 風滾草
      const wr = Math.max(9, Math.round(s * 1.05)); weedCv = mkCanvas(wr * 2 + 6, wr * 2 + 6); g = weedCv.getContext('2d'); g.translate(wr + 3, wr + 3); g.lineCap = 'round';
      g.fillStyle = rg(g, -wr * 0.3, -wr * 0.35, wr * 0.1, wr, [0, 'rgba(222,170,110,.7)', 0.7, 'rgba(160,100,60,.5)', 1, 'rgba(110,64,36,.45)']); g.beginPath(); g.arc(0, 0, wr * 0.92, 0, TAU); g.fill();
      for (let j = 0; j < 34; j++) { const a = R() * TAU, d = R() * wr * 0.5, rr = Math.min(wr * (0.35 + R() * 0.5), wr - d), st = R() * TAU; g.strokeStyle = ['#f0c88a', '#6e4026', '#a8703c'][j % 3]; g.lineWidth = Math.max(1, wr * (0.06 + R() * 0.05)); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, rr, st, st + 1.2 + R() * 2.6); g.stroke(); }
      weed = { x: 0, y: 0, v: 0, vy: 0, rot: 0, hop: 0, wait: 2, fall: false, r: wr / s };
      dust = []; for (let k = 0; k < 40; k++) dust.push({ x: V.x0 + R() * (V.x1 - V.x0), h: k % 3 ? 0.3 + R() * R() * 6 : 4 + R() * 22, v: 0.6 + R() * 0.8, p: R() * TAU, r: 0.1 + R() * 0.14 });
      birds = []; for (let k = 0; k < 6; k++) birds.push({ dx: (k % 3) * 2.3 + R() * 1.2 + (k > 2 ? 1.6 : 0), dy: (k > 2 ? -1.3 : 0) + (R() - 0.5) * 0.9, p: R() * TAU, z: 0.8 + R() * 0.35 });
    },
    back(c, t, dt) {
      const s = V.s;
      for (const h of haze) {
        h.x += h.v * dt; const span = V.x1 - V.x0 + h.w + 10; if (h.x > span) h.x -= span;
        c.globalAlpha = 0.6; c.drawImage(hazeCv, X(V.x0 - h.w - 5 + h.x), Y(h.y + h.h / 2), h.w * s, h.h * s);
      }
      c.globalAlpha = 1;
      // 鳥群：一陣一陣由左往右掠過夕陽上面；右邊高處一隻老鷹在繞圈
      c.strokeStyle = 'rgba(52,20,40,.85)'; c.lineWidth = lw(0.17, 1.2); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      const ph = (t + 6) % 52;
      if (ph < 30) {
        const u = ph / 30, bx = lerp(V.x0 - 10, V.x1 + 4, u), byy = 19.5 + Math.sin(u * Math.PI) * 2.5;
        for (const b of birds) {
          const x = X(bx + b.dx), y = Y(byy + b.dy + Math.sin(t * 1.3 + b.p) * 0.2), w = s * 0.8 * b.z, f = Math.sin(t * 6 + b.p), ty = y - w * (0.1 + 0.5 * f), my = y - w * (0.42 + 0.2 * f);
          c.moveTo(x - w, ty); c.quadraticCurveTo(x - w * 0.45, my, x, y); c.quadraticCurveTo(x + w * 0.45, my, x + w, ty);
        }
      }
      const a = t * 0.32, hx = X(112 + Math.cos(a) * 5), hy = Y(41 + Math.sin(a) * 1.4), hw = s * 1.15, hu = hw * (0.16 + 0.04 * Math.sin(t * 1.4));
      c.moveTo(hx - hw, hy - hu); c.quadraticCurveTo(hx - hw * 0.45, hy - hu * 0.2, hx, hy); c.quadraticCurveTo(hx + hw * 0.45, hy - hu * 0.2, hx + hw, hy - hu);
      c.stroke();
    },
    front(c, t, dt) {
      const s = V.s, w = S.wind, u = Math.min(1, Math.abs(w) / 6), x0 = V.x0 - 6, x1 = V.x1 + 6;
      // 紅沙：風越大越多、跑得越快；沒有風的時候只有幾粒慢慢飄
      for (const d of dust) { d.x += (w * 2.8 * d.v + 0.3 * Math.sin(t * 0.7 + d.p)) * dt; if (d.x > x1) d.x = x0; else if (d.x < x0) d.x = x1; }
      for (let pass = 0; pass < (u > 0.3 ? 2 : 1); pass++) {   // 被夕陽照亮的淺色沙粒；起風時夾幾粒深色的（在亮的地方也看得到）
        c.fillStyle = pass ? 'rgba(120,40,30,.55)' : 'rgba(255,216,168,.8)'; c.beginPath();
        for (let k = 0; k < dust.length; k++) {
          if ((k % 3 === 0) !== (pass === 1) || k / dust.length > 0.25 + u * 0.75) continue;
          const d = dust[k], gy = groundYRaw(d.x), y = (d.x > CL && d.x < CR ? Math.max(gy, -1) : gy) + d.h + Math.sin(t * 2 + d.p + d.x * 0.3) * 0.3, r = d.r * s, l = r * (1 + u * 3);
          c.moveTo(X(d.x) + l, Y(y)); c.ellipse(X(d.x), Y(y), l, r * 0.7, 0, 0, TAU);
        }
        c.fill();
      }
      // 風滾草：順風滾，滾到裂谷就掉下去，過一陣子從上風處再滾進來
      const wd = weed;
      if (wd.wait > 0) { wd.wait -= dt; if (wd.wait <= 0) { if (Math.abs(w) < 1.5) wd.wait = 1; else { wd.x = w > 0 ? V.x0 - 3 : V.x1 + 3; wd.v = w * 0.5; wd.fall = false; } } return; }
      if (wd.fall) { wd.vy -= 34 * dt; wd.y += wd.vy * dt; wd.x += wd.v * 0.4 * dt; wd.rot += wd.v * dt / wd.r; if (wd.y < -12) wd.wait = 3 + Math.random() * 5; }
      else {
        wd.v += (w * 0.85 - wd.v) * Math.min(1, dt * 1.3); const nx = wd.x + wd.v * dt;
        wd.rot += (nx - wd.x) / wd.r; wd.hop += Math.abs(nx - wd.x) * 0.5; wd.x = nx;
        wd.y = groundYRaw(nx) + wd.r * 0.85 + Math.abs(Math.sin(wd.hop)) * Math.min(1.3, Math.abs(wd.v) * 0.15);
        if (nx > CL + 0.3 && nx < CR - 0.3) { wd.fall = true; wd.vy = 2; }
        if (nx > V.x1 + 4 || nx < V.x0 - 4) wd.wait = 3 + Math.random() * 5;
        c.fillStyle = 'rgba(70,20,24,.25)'; ell(c, X(nx), Y(groundYRaw(nx)) - 1, wd.r * s * 0.9, wd.r * s * 0.22); c.fill();
      }
      const cs = Math.cos(wd.rot), sn = Math.sin(wd.rot), hw = weedCv.width / 2;
      c.save(); c.transform(cs, sn, -sn, cs, X(wd.x), Y(wd.y)); if (wd.fall) c.globalAlpha = clamp((wd.y + 12) / 8, 0, 1); c.drawImage(weedCv, -hw, -hw); c.restore();
    }
  };
})();
