/* ===== 36-scene-desert: 第二關「黃沙風口」— 黃昏的峽谷：半沉的落日、三層平頂山、紅砂岩石柱，飛沙跟著風向橫掃 ===== */
THEMES[1] = (function () {
  const SX = 44, SY = 14, SR = 6.8;      // 落日（戰場座標）：夾在我方城樓和中間的石柱之間，不在任何一座城的正後方
  const XA = 49, XB = 63;                // 石柱從沙裡冒出來的範圍（配合這一關的地形）
  let haze = [], grit = [], wisps = [], birds = [], weed = null, wispCv = null, weedCv = null, skyPts = null;
  // 石柱腳下的沙線：兩邊堆得高、中間低
  const drift = (x) => { const u = clamp((x - XA) / (XB - XA), 0, 1); return 2 - 1.3 * Math.pow(Math.sin(Math.PI * u), 0.75) + 0.24 * Math.sin(TAU * u + 0.5) - 0.12; };
  const sandY = (x) => (x > XA && x < XB ? Math.min(groundYRaw(x), drift(x)) : groundYRaw(x));

  // 把 [x, y, x, y, …]（戰場座標）接成一個封閉的子路徑
  function trace(c, p) { c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.closePath(); }
  // 把折線的尖角削掉一點，岩石才不會像積木
  function chamfer(p, cc) {
    const n = p.length / 2, o = [p[0], p[1]];
    for (let i = 1; i < n - 1; i++) {
      const ax = p[i * 2 - 2], ay = p[i * 2 - 1], bx = p[i * 2], by = p[i * 2 + 1], cx = p[i * 2 + 2], cy = p[i * 2 + 3];
      const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), d = Math.min(cc, l1 * 0.4, l2 * 0.4);
      if (d < 0.01) { o.push(bx, by); continue; }
      o.push(bx + (ax - bx) / l1 * d, by + (ay - by) / l1 * d, bx + (cx - bx) / l2 * d, by + (cy - by) / l2 * d);
    }
    o.push(p[n * 2 - 2], p[n * 2 - 1]); return o;
  }
  // 一座平頂山的岩壁：兩側各有一兩階岩棚，頂上幾段高低不同的平台。k 是細節的尺度
  function butte(m, base, k, rims) {
    const R = m.R, x0 = m.x0, x1 = m.x1, H = m.top - base, th = m.th, vis = H - th, w = x1 - x0, kk = Math.min(k, w * 0.14), bt = Math.min(1, w / (k * 9));   // bt：越窄的山，岩壁越直
    const side = () => {
      const o = [0, th * 0.55], n = vis > kk * 4 && w > kk * 7 ? (R() * 2.5) | 0 : 0; let x = 0, y = th;
      for (let i = 0; i < n; i++) { const yy = th + vis * (i ? 0.6 + R() * 0.2 : 0.18 + R() * 0.26); x += (yy - y) * (0.05 + R() * 0.09) * bt; o.push(x, yy); x += kk * (0.45 + R() * 0.9); o.push(x, yy); y = yy; }
      x += (H - y) * (0.04 + R() * 0.08) * bt; o.push(x, H); return o;
    };
    const L = side(), Rt = side(), xb = x1 - Rt[Rt.length - 2], p = [x0, base - 12];
    for (let i = 0; i < L.length; i += 2) p.push(x0 + L[i], base + L[i + 1]);
    let x = x0 + L[L.length - 2], y = H, xs = x;
    while (!m.flat && xb - x > kk * 7) {
      const seg = kk * (3.5 + R() * 6); if (xb - (x + seg) < kk * 3) break;
      x += seg; p.push(x, base + y);
      const ny = H - (R() < 0.4 ? 0 : kk * (0.25 + R() * 0.7)); if (ny !== y) { rims.push(xs, x, base + y); x += kk * (0.12 + R() * 0.3); y = ny; xs = x; p.push(x, base + y); }
    }
    p.push(xb, base + y); rims.push(xs, xb, base + y);
    for (let i = Rt.length - 4; i >= 0; i -= 2) p.push(x1 - Rt[i], base + Math.min(Rt[i + 1], y));
    p.push(x1, base - 12);
    return chamfer(p, kk * 0.14);
  }
  // 山腳的碎石坡：兩邊凹下去的斜坡，蓋住岩壁的下半截
  function talus(c, m, base, k) {
    const R = m.R, x0 = m.x0, x1 = m.x1, th = m.th, tl = th * (1.35 + R() * 0.5), tr = th * (1.35 + R() * 0.5);
    c.moveTo(X(x0 - tl), Y(base - 0.2));
    c.quadraticCurveTo(X(x0 - tl * 0.4), Y(base + th * 0.3), X(x0 + k * 0.1), Y(base + th));
    for (let x = x0 + k * (0.6 + R()); x < x1 - k * 0.6; x += k * (0.9 + R() * 1.6)) c.lineTo(X(x), Y(base + th * (0.88 + R() * 0.24)));
    c.lineTo(X(x1 - k * 0.1), Y(base + th));
    c.quadraticCurveTo(X(x1 + tr * 0.4), Y(base + th * 0.3), X(x1 + tr), Y(base - 0.2));
    c.lineTo(X(x1 + tr), Y(base - 12)); c.lineTo(X(x0 - tl), Y(base - 12)); c.closePath();
    return [x0 - tl, x1 + tr];
  }
  /* 一層平頂山。ms = [[x0, x1, 頂的高度, 這座山自己的亂數種子, 碎石坡佔全高的比例（可省略，0 = 隨機）, 1 = 頂面完全平（可省略）], …]
     col = { hi, lo 岩壁上下的顏色, tal 碎石坡, fl 地平面, lit 受光, sh 背光, rim 平台邊的亮線 }，la 是受光面的濃度 */
  function mesas(c, seed, ms, base, k, col, la) {
    const s = V.s, R = mkRand(seed), rims = []; let top = base;
    const M = ms.map((m) => { const r = mkRand(seed * 131 + m[3]); top = Math.max(top, m[2]); return { x0: m[0], x1: m[1], top: m[2], R: r, th: (m[2] - base) * (m[4] || 0.34 + r() * 0.14), flat: m[5], dir: (m[0] + m[1]) / 2 < SX ? 1 : -1 }; });
    for (const m of M) m.p = butte(m, base, k, rims);
    c.fillStyle = col.fl; c.fillRect(0, Y(base), V.W, V.H);
    c.beginPath(); for (const m of M) trace(c, m.p);
    c.fillStyle = lg(c, 0, Y(top), 0, Y(base), [0, col.hi, 1, col.lo]); c.fill();
    c.save(); c.clip();
    // 水平的岩層：同一層的每座山，岩層都在同樣的高度
    for (let y = base + k * (1 + R()); y < top; y += k * (1.3 + R() * 2.8)) {
      if (R() < 0.4) { c.fillStyle = rgba(col.lit, 0.12); c.fillRect(0, Y(y + k * 0.7), V.W, k * 0.7 * s); }
      c.fillStyle = rgba(col.sh, 0.12 + R() * 0.14); c.fillRect(0, Y(y), V.W, Math.max(1, s * k * 0.11));
      if (R() < 0.4) c.fillRect(0, Y(y - k * 0.32), V.W, Math.max(1, s * k * 0.07));
    }
    // 頂上那一層比較硬的蓋岩：顏色深一點
    c.fillStyle = rgba(col.sh, 0.2); for (let i = 0; i < rims.length; i += 3) c.fillRect(X(rims[i]) - 1, Y(rims[i + 2]), (rims[i + 1] - rims[i]) * s + 2, k * 0.55 * s);
    for (const m of M) {
      const r = m.R, dir = m.dir, w = m.x1 - m.x0, lw = Math.min(w * 0.36, k * (1.2 + r() * 2.2)), xe = dir > 0 ? m.x1 : m.x0, xo = dir > 0 ? m.x0 : m.x1;
      // 朝太陽的那一面：一塊鋸齒邊的亮面
      c.beginPath(); c.moveTo(X(xe + dir), Y(m.top + 1));
      for (let y = m.top + 1; y > base; y -= k * (1 + r() * 1.8)) { const u = lw * (0.65 + r() * 0.55); c.lineTo(X(xe - dir * u), Y(y)); c.lineTo(X(xe - dir * u * (0.8 + r() * 0.3)), Y(y - k * 0.3)); }
      c.lineTo(X(xe - dir * lw), Y(base)); c.lineTo(X(xe + dir), Y(base)); c.closePath(); c.fillStyle = rgba(col.lit, la); c.fill();
      // 背著太陽的那一面暗一點
      c.fillStyle = lg(c, X(xo), 0, X(xo + dir * w * 0.45), 0, [0, rgba(col.sh, 0.36), 1, rgba(col.sh, 0)]); c.fillRect(Math.min(X(xo), X(xo + dir * w * 0.45)), Y(m.top) - 2, w * 0.45 * s, (m.top - base) * s + 4);
      // 從崖頂裂下來的幾道直縫
      c.strokeStyle = rgba(col.sh, 0.2); c.lineWidth = Math.max(1, s * k * 0.12); c.beginPath();
      for (let x = m.x0 + k * (1 + r() * 3); x < m.x1 - k; x += k * (2.5 + r() * 6)) { const len = (m.top - base - m.th) * (0.15 + r() * r() * 0.8); c.moveTo(X(x), Y(m.top)); c.lineTo(X(x + (r() - 0.5) * k * 0.5), Y(m.top - len * 0.55)); c.lineTo(X(x + (r() - 0.5) * k * 0.8), Y(m.top - len)); }
      c.stroke();
    }
    c.restore();
    // 平台邊緣受光的亮線
    c.strokeStyle = col.rim; c.lineWidth = Math.max(1, s * k * 0.18); c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i < rims.length; i += 3) { const y = Y(rims[i + 2]) + c.lineWidth * 0.5; c.moveTo(X(rims[i] + k * 0.15), y); c.lineTo(X(rims[i + 1] - k * 0.15), y); }
    c.stroke();
    // 碎石坡：底色，再疊一層朝太陽那邊亮、另一邊暗
    for (const m of M) {
      c.beginPath(); const e = talus(c, m, base, k), dir = m.dir;
      c.fillStyle = lg(c, 0, Y(base + m.th * 1.1), 0, Y(base), [0, col.tal, 1, col.fl]); c.fill();
      c.fillStyle = lg(c, X(dir > 0 ? e[0] : e[1]), 0, X(dir > 0 ? e[1] : e[0]), 0, [0, rgba(col.sh, 0.26), 0.5, rgba(col.sh, 0), 0.62, rgba(col.lit, 0), 1, rgba(col.lit, la * 0.7)]); c.fill();
    }
  }
  // 橫向拉長的薄雲：幾片細長的葉形疊起來，兩頭淡出去，下緣被夕陽照亮。body、glow 是 '#rrggbb'，ab、ag 是濃度
  function cloud(c, R, x, y, w, h, body, glow, ab, ag) {
    const ls = [], n = 3 + ((R() * 3) | 0);
    for (let k = 0; k < n; k++) ls.push([x + (R() - 0.5) * w * 0.55, y + (k - (n - 1) / 2) * h * 0.62, w * (0.4 + R() * 0.6), h * (0.55 + R() * 0.5)]);
    for (let pass = 0; pass < 2; pass++) for (const l of ls) {
      const cx = l[0], cy = l[1] + (pass ? 0 : l[3] * 0.34), ww = l[2], up = l[3] * (pass ? 0.75 : 0.5), dn = l[3] * (pass ? 0.4 : 0.75), col = pass ? body : glow, al = pass ? ab : ag;
      c.fillStyle = lg(c, cx - ww / 2, 0, cx + ww / 2, 0, [0, rgba(col, 0), 0.24, rgba(col, al), 0.76, rgba(col, al), 1, rgba(col, 0)]);
      c.beginPath(); c.moveTo(cx - ww / 2, cy); c.bezierCurveTo(cx - ww * 0.22, cy - up, cx + ww * 0.12, cy - up, cx + ww / 2, cy); c.bezierCurveTo(cx + ww * 0.2, cy + dn, cx - ww * 0.14, cy + dn, cx - ww / 2, cy); c.fill();
    }
  }
  // 沙丘：稜線尖、兩邊凹；向陽的那一面亮
  function dune(c, x, y0, w, h, dir, lo, hi) {
    const px = X(x), py = Y(y0 + h), fy = Y(y0), by = Y(y0 - 8), wl = w * (dir > 0 ? 1.35 : 1), wr = w * (dir > 0 ? 1 : 1.35);
    c.beginPath(); c.moveTo(X(x - wl), fy); c.quadraticCurveTo(X(x - wl * 0.36), Y(y0 + h * 0.34), px, py); c.quadraticCurveTo(X(x + wr * 0.36), Y(y0 + h * 0.34), X(x + wr), fy); c.lineTo(X(x + wr), by); c.lineTo(X(x - wl), by); c.closePath(); c.fillStyle = lo; c.fill();
    const we = dir > 0 ? wr : -wl;
    c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(X(x + we * 0.36), Y(y0 + h * 0.34), X(x + we), fy); c.lineTo(X(x + we), by); c.lineTo(X(x - dir * w * 0.1), by);
    c.bezierCurveTo(X(x + dir * w * 0.42), Y(y0 - h * 0.1), X(x - dir * w * 0.3), Y(y0 + h * 0.5), px, py); c.closePath(); c.fillStyle = hi; c.fill();
  }
  // 仙人掌：粗線畫出主幹和手臂（v 決定手臂怎麼長），再在向陽的那一側描一道亮邊
  function cactus(c, x, y, h, lo, hi, dir, v) {
    const w = h * 0.2, A = v === 3 ? [[1, 0.42, 0.28]] : v === 2 ? [[-1, 0.4, 0.3]] : v === 1 ? [[-1, 0.5, 0.24], [1, 0.3, 0.32]] : [[-1, 0.34, 0.32], [1, 0.5, 0.24]];   // 每支手臂：[往哪邊, 從多高長出來, 往上多長]
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = lo;
    c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h + w * 0.5); c.stroke();
    c.lineWidth = w * 0.78; c.beginPath(); for (const a of A) { const ax = x + a[0] * h * 0.27; c.moveTo(x, y - h * a[1]); c.lineTo(ax, y - h * a[1]); c.lineTo(ax, y - h * (a[1] + a[2])); } c.stroke();
    c.strokeStyle = hi; c.lineWidth = Math.max(1, w * 0.22); c.beginPath();
    c.moveTo(x + dir * w * 0.3, y - w * 0.3); c.lineTo(x + dir * w * 0.3, y - h + w * 0.6);
    for (const a of A) { const ax = x + a[0] * h * 0.27 + dir * w * 0.22; c.moveTo(ax, y - h * a[1] - w * 0.1); c.lineTo(ax, y - h * (a[1] + a[2])); }
    c.stroke();
  }
  // 崖頂上廢棄的烽火台：塌了一邊的方塔，旁邊半堵矮牆。u 是一個單位幾像素
  function ruin(c, x, y, u, col, lit, sky) {
    c.fillStyle = col;
    poly(c, [x - u * 1.2, y, x - u * 1.0, y - u * 3.6, x - u * 1.15, y - u * 3.6, x - u * 1.15, y - u * 4.3, x - u * 0.7, y - u * 4.3, x - u * 0.7, y - u * 3.9, x - u * 0.3, y - u * 3.9, x - u * 0.3, y - u * 4.3, x + u * 0.1, y - u * 4.3, x + u * 0.15, y - u * 3.5, x + u * 0.55, y - u * 3.1, x + u * 0.6, y - u * 2.3, x + u * 0.95, y - u * 2.0, x + u * 1.15, y]); c.fill();
    poly(c, [x + u * 1.1, y, x + u * 1.1, y - u * 1.2, x + u * 1.7, y - u * 1.2, x + u * 1.8, y - u * 0.75, x + u * 2.6, y - u * 0.7, x + u * 2.7, y - u * 0.3, x + u * 3.3, y]); c.fill();
    c.fillStyle = sky; c.fillRect(x - u * 0.62, y - u * 2.95, u * 0.4, u * 0.7);
    c.fillStyle = lit; poly(c, [x + u * 0.1, y - u * 4.3, x + u * 0.15, y - u * 3.5, x + u * 0.55, y - u * 3.1, x + u * 0.6, y - u * 2.3, x + u * 0.95, y - u * 2.0, x + u * 1.15, y, x + u * 0.85, y, x + u * 0.7, y - u * 1.9, x + u * 0.36, y - u * 2.2, x + u * 0.32, y - u * 3.0, x - u * 0.08, y - u * 3.4, x - u * 0.12, y - u * 4.3]); c.fill();
  }
  // 遠方的駱駝：一個小剪影（身體、駝峰、往前伸的脖子和頭、四條腿），h 是身高（像素），臉朝右
  function camel(c, x, y, h, col) {
    const u = h / 10; c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
    ell(c, x, y - u * 5.6, u * 3.9, u * 1.6); c.fill(); ell(c, x - u * 0.4, y - u * 7.2, u * 1.9, u * 1.5); c.fill(); ell(c, x + u * 6.2, y - u * 9.1, u * 1.2, u * 0.65, -0.25); c.fill();
    c.lineWidth = u * 1.0; c.beginPath(); c.moveTo(x + u * 3.2, y - u * 5.6); c.quadraticCurveTo(x + u * 4.9, y - u * 5.6, x + u * 5.5, y - u * 8.8); c.stroke();
    c.lineWidth = Math.max(1, u * 0.6); c.beginPath();
    c.moveTo(x - u * 3.1, y - u * 5); c.lineTo(x - u * 3.5, y); c.moveTo(x - u * 2.2, y - u * 5); c.lineTo(x - u * 1.8, y);
    c.moveTo(x + u * 2.4, y - u * 5); c.lineTo(x + u * 2.1, y); c.moveTo(x + u * 3.1, y - u * 5); c.lineTo(x + u * 3.6, y);
    c.moveTo(x - u * 3.7, y - u * 6); c.lineTo(x - u * 4.3, y - u * 4.2); c.stroke();
  }
  // 一顆石頭：暗的底、上面一塊亮面。d = ±1 左右翻面，讓每顆長得不一樣
  function boulder(c, x, r, d) {
    const px = X(x), py = Y(sandY(x)) + V.s * 0.12, u = r * V.s;
    poly(c, [px - u * d, py, px - u * 0.82 * d, py - u * 0.5, px - u * 0.25 * d, py - u * 0.86, px + u * 0.5 * d, py - u * 0.72, px + u * 0.95 * d, py - u * 0.25, px + u * d, py]); c.fillStyle = '#8e3f30'; c.fill();
    poly(c, [px - u * 0.82 * d, py - u * 0.5, px - u * 0.25 * d, py - u * 0.86, px + u * 0.5 * d, py - u * 0.72, px + u * 0.08 * d, py - u * 0.42, px - u * 0.5 * d, py - u * 0.26]); c.fillStyle = '#e08a54'; c.fill();
  }

  return {
    key: 'desert',
    build(c, W, H) {
      const R = mkRand(1201), s = V.s, sx = X(SX), sy = Y(SY), sr = SR * s;
      // 天空：上面深青藍，往下轉成暖桃色，地平線是橘紅
      c.fillStyle = lg(c, 0, 0, 0, Y(0), [0, '#18486a', 0.2, '#28718b', 0.37, '#4a94a0', 0.49, '#8fb1b0', 0.59, '#dcc0a4', 0.71, '#f5b27c', 0.86, '#f6914b', 1, '#ec6f32']); c.fillRect(0, 0, W, H);
      // 落日的光暈（橫向拉寬）
      c.save(); c.translate(sx, sy); c.scale(1.9, 1);
      c.fillStyle = rg(c, 0, 0, sr * 0.4, sr * 4.4, [0, 'rgba(255,200,112,.55)', 0.32, 'rgba(255,176,96,.28)', 1, 'rgba(255,160,90,0)']); c.fillRect(-W, -H, W * 2, H * 2);
      c.restore();
      // 高處的薄雲
      const CL = [[-6, 37, 22, 1.0], [19, 30.5, 20, 0.9], [31, 45, 24, 1.1], [60, 40, 26, 1.1], [71, 26.5, 17, 0.8], [93, 35.5, 26, 1.1], [112, 27.5, 18, 0.9], [85, 47, 22, 1.0], [8, 52, 26, 1.2], [100, 56, 30, 1.3], [50, 62, 30, 1.3], [20, 68, 30, 1.3]];
      for (const k of CL) { const f = clamp((k[1] - 24) / 24, 0, 1); cloud(c, R, X(k[0]), Y(k[1]), k[2] * s, k[3] * s, mix('#e9967a', '#a9879e', f), mix('#ffdca4', '#ffb9a0', f), 0.64, 0.74); }
      // 太陽
      c.fillStyle = rg(c, sx, sy, sr * 0.96, sr * 1.8, [0, 'rgba(255,232,170,.6)', 1, 'rgba(255,220,150,0)']); c.fillRect(sx - sr * 2, sy - sr * 2, sr * 4, sr * 4);
      c.fillStyle = lg(c, 0, sy - sr, 0, sy + sr, [0, '#fffbe2', 0.5, '#ffeaa8', 1, '#ffc970']); c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
      cloud(c, R, X(SX + 4), Y(SY + 2.4), 14 * s, 0.7 * s, '#f08c5c', '#ffdca0', 0.88, 0.92);
      cloud(c, R, X(SX - 5), Y(SY + 5), 12 * s, 0.6 * s, '#ee8e62', '#ffdca0', 0.84, 0.88);
      // 遠、中、近三層平頂山，一層比一層深；層與層之間隔一道沙塵
      const hz = (y0, y1, a) => { c.fillStyle = lg(c, 0, Y(y0), 0, Y(y1), [0, 'rgba(246,160,104,0)', 1, 'rgba(246,160,104,' + a + ')']); c.fillRect(0, Y(y0), W, (y0 - y1) * s + 1); };
      const SHELF = 10.4;
      mesas(c, 11, [[-22, 1.5, 13.6, 1], [6, 16.5, 17.4, 2], [14.5, 23, 12.8, 6], [24, 40.4, 14.4, 3], [37.5, 54, SHELF, 4, 0, 1], [75.2, 77.8, 12.4, 5], [80, 96, 20.5, 7], [99, 115, 25.5, 8], [126, 150, 20, 9]], 7.4, 0.7,
        { hi: '#cf8a86', lo: '#eda47a', tal: '#e29a80', fl: '#f0a676', lit: '#ffd9a8', sh: '#9a5a7c', rim: 'rgba(255,226,184,.75)' }, 0.42);
      // 商隊：走在遠方那座頂面全平的平台上，襯著落日
      for (let k = 0; k < 5; k++) camel(c, X(42 + k * 1.75), Y(SHELF) + 1, s * (1.35 - (k % 2) * 0.12), '#6b3344');
      c.strokeStyle = '#6b3344'; c.lineWidth = Math.max(1, s * 0.16); c.beginPath(); c.moveTo(X(50.7), Y(SHELF)); c.lineTo(X(50.7), Y(SHELF + 0.9)); c.stroke(); c.beginPath(); c.arc(X(50.7), Y(SHELF + 1.15), s * 0.2, 0, TAU); c.fillStyle = '#6b3344'; c.fill();
      hz(12.5, 7.4, 0.28);
      mesas(c, 12, [[-40, -9.5, 28, 51, 0.26], [-11.5, -3.6, 20, 52, 0.3], [66.3, 67.5, 15, 170, 0.4], [68.6, 74.2, 17.6, 58, 0.36], [90, 108, 17, 5], [111.5, 120.5, 22, 46, 0.3], [118.5, 150, 31, 47, 0.26]], 5.2, 1.0,
        { hi: '#a85d72', lo: '#cf7c66', tal: '#c2726a', fl: '#d58468', lit: '#ffbc88', sh: '#63305e', rim: 'rgba(255,204,154,.65)' }, 0.5);
      ruin(c, X(-7.4), Y(20) + 1, s * 0.85, '#8c4a66', 'rgba(255,196,146,.75)', '#f1ae80');
      hz(9.5, 5.2, 0.24);
      mesas(c, 13, [[-34, -10.5, 10.5, 1], [74.5, 86, 7.8, 3], [104, 150, 9.6, 4]], 3.3, 1.2,
        { hi: '#7a3f5e', lo: '#a85a52', tal: '#9c5354', fl: '#b4624f', lit: '#ff9f6c', sh: '#3f1e48', rim: 'rgba(255,180,128,.55)' }, 0.55);
      hz(6.5, 3.3, 0.18);
      // 背光的沙丘和仙人掌的剪影
      c.fillStyle = '#b06250'; c.fillRect(0, Y(1.6), W, H);
      for (const k of [[-10, 4.2, 12], [12, 3.6, 13], [33, 4.0, 11], [69, 3.7, 10], [88, 4.2, 13], [108, 3.7, 12], [127, 4.2, 12]]) dune(c, k[0], 1.2, k[2], k[1] - 1.2, k[0] < SX ? 1 : -1, '#b06250', '#dc956a');
      for (const k of [[-12.6, 3.1, 0], [37.6, 2.5, 2], [45.6, 3.2, 1], [65.6, 3.1, 0], [75.4, 2.3, 3], [115.6, 3.0, 1], [122.5, 2.4, 2]]) cactus(c, X(k[0]), Y(1.5), s * k[1], '#6a3744', 'rgba(255,186,128,.7)', k[0] < SX ? 1 : -1, k[2]);
      for (const k of [[-2, 2.6, 10], [22, 2.3, 12], [40.5, 1.7, 9], [74.5, 1.9, 9], [95, 2.4, 12], [117, 2.5, 11]]) dune(c, k[0], 0, k[2], k[1], k[0] < SX ? 1 : -1, '#96504a', '#c98060');
      // 背著太陽的那一邊天色暗、偏紫（敵城在這一邊，淺色的城牆才跳得出來）
      c.fillStyle = lg(c, X(46), 0, X(128), 0, [0, 'rgba(70,40,104,0)', 0.3, 'rgba(70,40,104,.21)', 1, 'rgba(60,34,98,.46)']); c.fillRect(X(46), 0, W, H);
    },
    terrain(c) {
      const R = mkRand(1202), s = V.s, bot = V.H + 4;
      // 沿著 f(x) 走：從 a 到 b，中間每逢半格取一點——地形的轉折都在整數格上，所以畫出來的地面跟碰撞一致
      const fwd = (f, a, b, dy, mv) => { for (let x = a; ; x = Math.min(b, Math.floor(x * 2 + 1 + 1e-9) / 2)) { const px = X(x), py = Y(f(x) + dy); if (mv && x === a) c.moveTo(px, py); else c.lineTo(px, py); if (x >= b) break; } };
      const rev = (f, a, b, dy) => { for (let x = b; ; x = Math.max(a, Math.ceil(x * 2 - 1 - 1e-9) / 2)) { c.lineTo(X(x), Y(f(x) + dy)); if (x <= a) break; } };
      const runs = groundRuns();
      for (const [a, b] of runs) {
        // 沙：上亮下暗，裡面兩道更深的沙層
        c.beginPath(); fwd(groundYRaw, a, b, 0, true); c.lineTo(X(b), bot); c.lineTo(X(a), bot); c.closePath();
        c.fillStyle = lg(c, 0, Y(2), 0, V.H, [0, '#eda255', 0.3, '#d98744', 0.7, '#b6652f', 1, '#8a4826']); c.fill();
        for (let k = 0; k < 2; k++) {
          const wv = (x) => -4.4 - k * 2.5 + 0.6 * Math.sin(x * 0.105 + 1 + k * 2) + 0.25 * Math.sin(x * 0.31 + k);
          c.beginPath(); fwd(wv, a, b, 0, true); c.lineTo(X(b), bot); c.lineTo(X(a), bot); c.closePath(); c.fillStyle = k ? 'rgba(104,44,22,.3)' : 'rgba(150,70,30,.26)'; c.fill();
          c.beginPath(); fwd(wv, a, b, 0, true); c.strokeStyle = 'rgba(255,206,140,.3)'; c.lineWidth = Math.max(1, s * 0.12); c.stroke();
        }
      }
      // 中間那根紅砂岩石柱：沿著地面的輪廓剪下來，裡面一層一層的岩層
      c.save(); c.beginPath(); fwd(groundYRaw, XA, XB, 0, true); rev(drift, XA, XB, 0); c.closePath(); c.clip();
      const x0 = X(XA) - 2, x1 = X(XB) + 2, top = Y(14), ys = [], ar = [];
      const BD = [0.3, '#b24a2e', 1.9, '#c85e35', 3.0, '#a5402b', 3.5, '#d67440', 5.2, '#eaa870', 5.9, '#c5582f', 7.4, '#ae472d', 8.2, '#dc7c44', 9.6, '#bd5230', 10.6, '#e39258', 11.1, '#a9432d', 11.9, '#873427'];
      c.fillStyle = BD[1]; c.fillRect(x0, top, x1 - x0, 16 * s);
      for (let i = 0; i < BD.length; i += 2) { const y = BD[i], ph = R() * TAU, f = (x) => y + 0.03 * (x - 56) + 0.07 * Math.sin(x * 1.2 + ph); ys.push(f); c.beginPath(); fwd(f, XA, XB, 0, true); c.lineTo(x1, top); c.lineTo(x0, top); c.closePath(); c.fillStyle = BD[i + 1]; c.fill(); }
      // 厚的岩層上幾道直的溝
      c.strokeStyle = 'rgba(80,24,30,.16)'; c.lineWidth = Math.max(1, s * 0.09); c.beginPath();
      for (let i = 0; i < ys.length - 1; i++) { const h = BD[i * 2 + 2] - BD[i * 2]; if (h < 1.1) continue; for (let x = XA + R() * 3; x < XB; x += 1.8 + R() * 3) { c.moveTo(X(x), Y(ys[i + 1](x) - 0.14)); c.lineTo(X(x + (R() - 0.5) * 0.2), Y(ys[i](x) + 0.1 + R() * h * 0.45)); } }
      c.stroke();
      // 背光面：從柱頂往下一條鋸齒狀的稜線，右邊暗；最左邊那一面再亮一點
      let ex = 56.3;
      c.beginPath(); c.moveTo(X(56), Y(13.3));
      for (let i = ys.length - 1; i >= 0; i--) { const y = ys[i](ex); c.lineTo(X(ex), Y(y)); ex += (R() - 0.3) * 0.7; c.lineTo(X(ex), Y(y - 0.06)); ar[i] = ex; }
      c.lineTo(X(ex + 0.3), Y(-1)); c.lineTo(x1, Y(-1)); c.lineTo(x1, top); c.closePath(); c.fillStyle = 'rgba(70,20,58,.5)'; c.fill();
      ex = 55.6; c.beginPath(); c.moveTo(X(56), Y(13.3));
      for (let i = ys.length - 1; i >= 0; i--) { const y = ys[i](ex); c.lineTo(X(ex), Y(y)); ex -= 0.15 + R() * 0.55; c.lineTo(X(ex), Y(y - 0.06)); }
      c.lineTo(X(ex - 0.3), Y(-1)); c.lineTo(x0, Y(-1)); c.lineTo(x0, top); c.closePath(); c.fillStyle = 'rgba(255,200,124,.22)'; c.fill();
      // 岩層之間的陰影線，受光面的岩棚上緣一條亮線
      for (let i = 0; i < ys.length; i++) {
        c.beginPath(); fwd(ys[i], XA, XB, 0, true); rev(ys[i], XA, XB, -0.14); c.closePath(); c.fillStyle = 'rgba(64,16,26,.32)'; c.fill();
        if (i % 2 === 1) { c.beginPath(); fwd(ys[i], XA, ar[i], 0.1, true); rev(ys[i], XA, ar[i], 0); c.closePath(); c.fillStyle = 'rgba(255,220,168,.4)'; c.fill(); }
      }
      // 沙地反射上來的暖光、向陽那一側的亮邊、幾道裂縫
      c.fillStyle = lg(c, 0, Y(4), 0, Y(0.5), [0, 'rgba(255,170,96,0)', 1, 'rgba(255,170,96,.34)']); c.fillRect(x0, Y(4), x1 - x0, 4 * s);
      c.beginPath(); fwd(groundYRaw, XA, 56, 0, true); c.strokeStyle = 'rgba(255,226,170,.8)'; c.lineWidth = s * 0.5; c.lineJoin = 'round'; c.stroke();
      c.strokeStyle = 'rgba(70,18,28,.42)'; c.lineWidth = Math.max(1, s * 0.11); c.beginPath();
      for (const k of [[52.7, 8.6, 4.2], [54.9, 11, 6.6], [59.3, 8.6, 4.4], [57.4, 6, 2.2]]) { c.moveTo(X(k[0]), Y(k[1])); c.lineTo(X(k[0] + 0.25), Y((k[1] + k[2]) / 2 + 0.3)); c.lineTo(X(k[0] - 0.15), Y((k[1] + k[2]) / 2)); c.lineTo(X(k[0] + 0.2), Y(k[2])); }
      c.stroke();
      c.restore();
      for (const [a, b] of runs) {
        // 沙面的亮邊
        c.beginPath(); fwd(sandY, a, b, 0, true); rev(sandY, a, b, -0.8); c.closePath(); c.fillStyle = '#ffd28a'; c.fill();
        // 落日映在沙面上的一片暖光；石柱往右拖的長影
        c.save(); c.beginPath(); fwd(sandY, a, b, 0, true); c.lineTo(X(b), bot); c.lineTo(X(a), bot); c.closePath(); c.clip();
        c.fillStyle = rg(c, X(SX), Y(0), 0, s * 24, [0, 'rgba(255,240,180,.36)', 1, 'rgba(255,240,180,0)']); c.fillRect(X(SX - 24), Y(4), s * 48, s * 14);
        c.beginPath(); fwd(sandY, 56, 88, 0, true); rev(sandY, 56, 88, -0.8); c.closePath(); c.fillStyle = lg(c, X(56), 0, X(88), 0, [0, 'rgba(120,44,60,0)', 0.07, 'rgba(120,44,60,.5)', 0.45, 'rgba(120,44,60,.26)', 1, 'rgba(120,44,60,0)']); c.fill();
        c.restore();
        // 風紋：順著沙面的細線，一段一段
        c.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const dy = -1.5 - k * 0.85; c.strokeStyle = k < 1 ? 'rgba(255,230,176,.5)' : 'rgba(140,66,28,.26)'; c.lineWidth = Math.max(1, s * 0.11); c.beginPath();
          for (let x = a + R() * 8; x < b;) { const len = 5 + R() * 13; for (let u = 0; u <= len; u += 0.5) { const xx = x + u, yy = sandY(xx) * (1 - k * 0.16) + dy + Math.sin(xx * 0.42 + k * 1.9) * 0.14; if (u === 0) c.moveTo(X(xx), Y(yy)); else c.lineTo(X(xx), Y(yy)); } x += len + 1 + R() * 4; }
          c.stroke();
        }
        // 地面的邊線
        c.beginPath(); fwd(groundYRaw, a, b, 0, true); c.strokeStyle = '#96501f'; c.lineWidth = Math.max(1.5, s * 0.2); c.lineJoin = 'round'; c.stroke();
      }
      c.beginPath(); fwd(groundYRaw, XA, XB, 0, true); c.strokeStyle = '#5c2318'; c.lineWidth = Math.max(1.5, s * 0.24); c.stroke();
      // 石柱腳下的落石，和散在沙地上的幾顆小石頭
      for (const k of [[47.4, 0.85, 1], [45.9, 0.5, 1], [64.7, 0.9, -1], [66.4, 0.55, 1], [41, 0.45, 1], [-5.6, 0.5, 1], [37.2, 0.4, 1], [75.2, 0.42, -1], [110.6, 0.5, -1], [116.3, 0.36, 1]]) boulder(c, k[0], k[1], k[2]);
      // 乾草叢
      for (const [a, b] of runs) for (let x = a + R() * 3; x < b; x += 2.4 + R() * 5) {
        if (x > XA - 2.5 && x < XB + 2.5) continue;
        const px = X(x), py = Y(groundYRaw(x)) + 1, h = s * (0.6 + R() * 0.75); c.lineWidth = Math.max(1, s * 0.1);
        for (let pass = 0; pass < 2; pass++) { c.strokeStyle = pass ? '#d9ae58' : '#8f6426'; c.beginPath(); for (let j = -3 + pass; j <= 3; j += 2) { const an = j * 0.27 + (R() - 0.5) * 0.2, hh = h * (0.7 + R() * 0.4); c.moveTo(px, py); c.quadraticCurveTo(px + Math.sin(an) * hh * 0.35, py - hh * 0.6, px + Math.sin(an) * hh, py - Math.cos(an) * hh); } c.stroke(); }
      }
      // 近處的仙人掌
      for (const k of [[-8.4, 3.3, 0], [39.4, 1.8, 3], [73.6, 2.2, 2], [112.4, 3.0, 1]]) cactus(c, X(k[0]), Y(groundYRaw(k[0])) + 1, s * k[1], '#58774a', '#b9cc7c', k[0] < SX ? 1 : -1, k[2]);
    },
    init() {
      const R = mkRand(1203), s = V.s;
      // 地平線上的沙塵：柔邊的長條，先畫成小圖
      haze = [];
      for (let k = 0; k < 4; k++) {
        const w = 44 + R() * 26, h = 5 + R() * 3, cv = mkCanvas(w * s * 0.5, h * s * 0.5), hc = cv.getContext('2d');
        hc.scale(cv.width / 2, cv.height / 2); hc.translate(1, 1);
        for (let j = 0; j < 5; j++) { const ox = (R() - 0.5) * 1.1, rr = 0.35 + R() * 0.3; hc.fillStyle = rg(hc, ox, 0, 0, rr, [0, 'rgba(247,186,138,.42)', 1, 'rgba(247,186,138,0)']); hc.fillRect(-1, -1, 2, 2); }
        haze.push({ cv, w, h, x: V.x0 + R() * (V.x1 - V.x0), y: 3 + R() * 5, v: 0.5 + R() * 0.6, a: 0.45 + R() * 0.35 });
      }
      // 天空的範圍（沙塵只畫在地面以上）
      skyPts = []; const a0 = Math.floor(V.x0 - 3), a1 = Math.ceil(V.x1 + 3);
      for (let x = a0; x <= a1; x += 0.5) { const y = groundYRaw(x); if (x === a0 || x === a1 || Math.abs(groundYRaw(x - 0.5) + groundYRaw(x + 0.5) - 2 * y) > 1e-6) skyPts.push(X(x), Y(y)); }
      // 飛沙：四分之三貼著地面，其餘散在半空；thr 是風要多大這一粒才出現
      grit = [];
      for (let k = 0; k < 78; k++) grit.push({ x: V.x0 - 10 + R() * (V.x1 - V.x0 + 20), h: k % 4 ? 0.4 + R() * R() * 8 : 7 + R() * 38, v: 0.7 + R() * 0.7, thr: 0.04 + 0.9 * (k / 78), len: 2 + R() * 4.5, b: k % 4 ? (R() < 0.5 ? 0 : 1) : 2, p: R() * TAU });
      // 貼著地面的沙流：柔邊的長條
      wispCv = mkCanvas(96, 12); let g = wispCv.getContext('2d'); g.scale(48, 6); g.translate(1, 1); g.fillStyle = rg(g, 0, 0, 0, 1, [0, 'rgba(255,236,196,.9)', 0.5, 'rgba(255,230,186,.4)', 1, 'rgba(255,230,186,0)']); g.fillRect(-1, -1, 2, 2);
      wisps = []; for (let k = 0; k < 10; k++) wisps.push({ x: V.x0 - 10 + R() * (V.x1 - V.x0 + 20), h: 0.8 + R() * 4.2, v: 1.3 + R() * 0.8, len: 11 + R() * 13, th: 0.4 + R() * 0.45, thr: 0.12 + 0.7 * (k / 10), a: 0.28 + R() * 0.2 });
      // 風滾草
      const wr = Math.max(9, Math.round(s * 1.25)); weedCv = mkCanvas(wr * 2 + 6, wr * 2 + 6); g = weedCv.getContext('2d'); g.translate(wr + 3, wr + 3); g.lineCap = 'round';
      g.fillStyle = rg(g, -wr * 0.3, -wr * 0.35, wr * 0.1, wr * 1.05, [0, 'rgba(230,190,124,.7)', 0.7, 'rgba(170,120,66,.55)', 1, 'rgba(120,78,40,.45)']); g.beginPath(); g.arc(0, 0, wr * 0.92, 0, TAU); g.fill();
      for (let j = 0; j < 36; j++) { const a = R() * TAU, d = R() * wr * 0.5, rr = Math.min(wr * (0.35 + R() * 0.5), wr - d), st = R() * TAU; g.strokeStyle = j % 3 === 0 ? '#f2d39a' : j % 3 === 1 ? '#7a4f28' : '#a9793f'; g.lineWidth = Math.max(1, wr * (0.06 + R() * 0.05)); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, rr, st, st + 1.2 + R() * 2.6); g.stroke(); }
      weed = { x: 70.5, v: 0, rot: 0, hop: 0, wait: 0, r: wr / s };
      birds = [{ cx: -2.6, cy: 31.5, rx: 4.8, ry: 1.3, w: 0.3, p: 0, z: 1 }, { cx: -1.4, cy: 34.6, rx: 3.4, ry: 1, w: 0.24, p: 2.4, z: 0.8 }];
    },
    back(c, t, dt) {
      const s = V.s;
      // 在烽火台上空盤旋的禿鷹：翅膀平平張開、翼尖微微上翹的剪影，轉彎時身體跟著傾斜
      c.fillStyle = 'rgba(54,28,54,.8)';
      for (const b of birds) {
        const a = t * b.w + b.p, sp = s * b.z * (0.85 + 0.45 * Math.abs(Math.cos(a))), th = sp * 0.1, up = sp * (0.26 + 0.05 * Math.sin(t * 1.3 + b.p));
        c.save(); c.translate(X(b.cx + Math.cos(a) * b.rx), Y(b.cy + Math.sin(a) * b.ry)); c.rotate(Math.sin(a) * 0.3);
        c.beginPath(); c.moveTo(-sp, -up); c.quadraticCurveTo(-sp * 0.5, -up * 0.3 - th, 0, -th); c.quadraticCurveTo(sp * 0.5, -up * 0.3 - th, sp, -up);
        c.quadraticCurveTo(sp * 0.5, th * 0.6, sp * 0.14, th * 1.3); c.lineTo(0, th * 3.2); c.lineTo(-sp * 0.14, th * 1.3); c.quadraticCurveTo(-sp * 0.5, th * 0.6, -sp, -up); c.fill();
        c.restore();
      }
      // 沙塵
      const p = skyPts; c.beginPath(); c.moveTo(-8, -8); c.lineTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.lineTo(V.W + 8, -8); c.closePath(); c.clip();
      for (const h of haze) {
        h.x += (h.v + S.wind * 0.12) * dt; if (h.x > V.x1 + 2) h.x = V.x0 - h.w - 2; else if (h.x + h.w < V.x0 - 2) h.x = V.x1 + 2;
        c.globalAlpha = h.a; c.drawImage(h.cv, X(h.x), Y(h.y + h.h * 0.5), h.w * s, h.h * s);
      }
      c.globalAlpha = 1;
    },
    front(c, t, dt) {
      const s = V.s, w = S.wind, u = Math.min(1, Math.abs(w) / 13), dir = w < 0 ? -1 : 1, x0 = V.x0 - 10, x1 = V.x1 + 10;
      // 貼著地面的沙流
      for (const g of wisps) {
        g.x += w * 3.6 * g.v * dt; if (g.x > x1) g.x = x0; else if (g.x < x0) g.x = x1;
        const k = clamp((u - g.thr) * 4, 0, 1); if (k <= 0) continue;
        c.globalAlpha = g.a * k; c.drawImage(wispCv, X(g.x - g.len / 2), Y(g.h + g.th / 2), g.len * s, g.th * s);
      }
      // 石柱頂上被風颳起來的一縷沙
      if (u > 0.15) { const L = 5 + 7 * u; c.globalAlpha = 0.6 * (u - 0.15); c.drawImage(wispCv, X(dir > 0 ? 55.6 : 56.4 - L), Y(13.7), L * s, s * 0.9); }
      c.globalAlpha = 1;
      // 飛沙：順著風向的細長尖梭，頭粗尾細；風越大越多、越長
      for (let b = 0; b < 3; b++) {
        const hw = Math.max(0.8, s * (b === 0 ? 0.11 : b === 1 ? 0.18 : 0.085)); c.beginPath();
        for (const g of grit) {
          if (g.b !== b) continue;
          g.x += w * 3.6 * g.v * dt; if (g.x > x1) { g.x = x0; g.p = Math.random() * TAU; } else if (g.x < x0) { g.x = x1; g.p = Math.random() * TAU; }
          const k = clamp((u - g.thr) * 5, 0, 1); if (k <= 0) continue;
          const len = g.len * k * (0.35 + 0.65 * u) * dir, ph = t * 1.7 + g.p + g.x * 0.2, hx = X(g.x), hy = Y(g.h + Math.sin(ph) * 0.35);
          c.moveTo(hx + dir * hw * 2, hy); c.lineTo(hx, hy - hw); c.lineTo(X(g.x - len), Y(g.h + Math.sin(ph - len * 0.2) * 0.35)); c.lineTo(hx, hy + hw);
        }
        c.globalAlpha = 0.55 + 0.45 * u; c.fillStyle = b === 0 ? 'rgba(255,242,210,.8)' : b === 1 ? 'rgba(255,228,176,.58)' : 'rgba(255,242,216,.42)'; c.fill();
      }
      c.globalAlpha = 1;
      // 風滾草：順風滾，滾到石柱腳下會卡住，等風轉向
      const wd = weed;
      if (wd.wait > 0) { wd.wait -= dt; if (wd.wait <= 0) { if (Math.abs(w) < 2) wd.wait = 1; else { wd.x = w > 0 ? V.x0 - 3 : V.x1 + 3; wd.v = w * 0.8; } } }
      else {
        wd.v += (w * 0.85 - wd.v) * Math.min(1, dt * 1.3); let nx = wd.x + wd.v * dt;
        if (wd.x <= 47.8 && nx > 47.8) { nx = 47.8; wd.v = 0; wd.rot += Math.sin(t * 9) * 0.24 * w * dt; } else if (wd.x >= 64.2 && nx < 64.2) { nx = 64.2; wd.v = 0; wd.rot += Math.sin(t * 9) * 0.24 * w * dt; }
        wd.rot += (nx - wd.x) / wd.r; wd.hop += Math.abs(nx - wd.x) * 0.5; wd.x = nx;
        if (nx > V.x1 + 4 || nx < V.x0 - 4) wd.wait = 3 + Math.random() * 5;
        const px = X(wd.x), gy = groundYRaw(wd.x), py = Y(gy + wd.r * 0.85 + Math.abs(Math.sin(wd.hop)) * Math.min(1.5, Math.abs(wd.v) * 0.16));
        c.fillStyle = 'rgba(70,30,20,.22)'; ell(c, px, Y(gy) - 1, wd.r * s * 0.9, wd.r * s * 0.22); c.fill();
        const cs = Math.cos(wd.rot), sn = Math.sin(wd.rot), hw = weedCv.width / 2;
        c.save(); c.transform(cs, sn, -sn, cs, px, py); c.drawImage(weedCv, -hw, -hw); c.restore();
      }
    }
  };
})();
