/* ===== 36-scene-frost: 第三關「霜河冰壁」— 極夜的冰河谷：極光、彎月、雪峰、杉林，中間一條結凍的河，天上飄雪 ===== */
THEMES[2] = (function () {
  let aur = null, aurKey = '', fog = [], twk = [], fl = [[], [], []], spStar = null, spFog = null, spFlake = [];
  const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const XA = -46, XB = 158;   // 山、樹、雪堆一律照這個範圍生成（比最寬的畫面還寬），畫面大小改變時佈景不會跟著變
  // 月亮在左上：左邊受光最亮；冰牆與敵城後面（x 45–110）壓暗，淡色的冰才跳得出來；最右緣再亮回來一點
  const lum = (x) => 1 - 0.93 * sm((x - 24) / 32) + 0.36 * sm((x - 104) / 16);
  // 平滑的一維雜訊（0…1）
  function noise(R, n) { const v = []; for (let i = 0; i < n; i++) v.push(R()); return (x) => { const i = Math.floor(x), f = x - i, a = v[((i % n) + n) % n], b = v[(((i + 1) % n) + n) % n]; return a + (b - a) * f * f * (3 - 2 * f); }; }
  // 一團柔邊的橢圓光（像素座標）
  function glow(c, x, y, rx, ry, col, a) { c.save(); c.translate(x, y); c.scale(rx, ry); c.fillStyle = rg(c, 0, 0, 0, 1, [0, rgba(col, a), 0.5, rgba(col, a * 0.42), 1, rgba(col, 0)]); c.fillRect(-1, -1, 2, 2); c.restore(); }
  // 河面：地面最低、比城腳（y = 0）還低的那一段平地。回傳 [左緣, 右緣, 高度]；沒有這樣的一段就回傳 null
  function river() {
    const gp = S.gpts || []; let y = 0, a = 1e9, b = -1e9;
    for (const p of gp) if (p[1] < y) y = p[1];
    for (const p of gp) if (p[1] === y) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); }
    return y < 0 && b - a > 4 ? [a, b, y] : null;
  }
  // 沿著地面的折線走一段（只走轉折點，跟碰撞用的地面完全一樣）
  function gline(c, xa, xb, first) {
    if (first) c.moveTo(X(xa), Y(groundYRaw(xa))); else c.lineTo(X(xa), Y(groundYRaw(xa)));
    for (const p of S.gpts || []) if (p[0] > xa && p[0] < xb) c.lineTo(X(p[0]), Y(p[1]));
    c.lineTo(X(xb), Y(groundYRaw(xb)));
  }

  // 一座稜角分明的雪山：整座先填背光面，再疊上山脊線以左的受光面，最後補幾道小稜。b 亮度、hz 霧氣（遠的那排比較灰）
  function peak(c, R, px, py, wl, wr, yb, b, hz) {
    const H = py - yb, n = 5, haze = '#22507f';
    const col = (dark, lite) => mix(mix(dark, lite, b), haze, hz);
    const lt = col('#3a5492', '#f2f8ff'), lb = col('#255079', '#86afd4'), st = col('#1d2f66', '#4868a8'), sb = col('#1f4670', '#3f759c');
    const g = (a, b2) => lg(c, 0, Y(py), 0, Y(yb), [0, a, 1, b2]);
    // 山坡：由山頂往下走，忽陡忽緩，其中一段特別緩（山肩）
    const slope = (w, sg) => {
      const a = [], d = [], p = [], tr = 1 + ((R() * (n - 1)) | 0); let sa = 0, sd = 0, ca = 0, cd = 0;
      for (let k = 0; k < n; k++) { a.push((k ? 0.4 + R() * 1.3 : 0.6 + R() * 0.35) * (k === tr ? 1.5 : 1)); d.push((k ? 0.4 + R() * 1.3 : 0.85 + R() * 0.5) * (k === tr ? 0.4 : 1)); sa += a[k]; sd += d[k]; }
      for (let k = 0; k < n; k++) { ca += a[k]; cd += d[k]; p.push([sg * w * ca / sa, -H * cd / sd]); }
      return p;
    };
    const L = slope(wl, -1), Rt = slope(wr, 1);
    c.beginPath(); c.moveTo(X(px), Y(py));
    for (const p of Rt) c.lineTo(X(px + p[0]), Y(py + p[1]));
    for (let k = n - 1; k >= 0; k--) c.lineTo(X(px + L[k][0]), Y(py + L[k][1]));
    c.closePath(); c.fillStyle = g(st, sb); c.fill();
    c.save(); c.clip();
    // 受光面：山脊線由山頂彎彎折折走到山腳
    const lean = (R() - 0.3) * 0.34, m = 4, sp = [[0, 0]];
    c.beginPath(); c.moveTo(X(px), Y(py));
    for (let j = 1; j <= m; j++) { const u = j / m, dx = lean * H * u + (j < m ? (j & 1 ? 1 : -1) * H * (0.04 + R() * 0.07) : 0); sp.push([dx, -H * u]); c.lineTo(X(px + dx), Y(py - H * u)); }
    c.lineTo(X(px - wl - 2), Y(yb)); c.lineTo(X(px - wl - 2), Y(py)); c.closePath(); c.fillStyle = g(lt, lb); c.fill();
    // 小稜：從 (ax, ay) 往下的一道細長稜面，越往下越淡
    const sliver = (ax, ay, pts, k, colr) => {
      c.beginPath(); c.moveTo(X(px + ax), Y(py + ay));
      for (const q of pts) c.lineTo(X(px + ax + q[0] * H * k + (R() - 0.5) * H * 0.03), Y(py + ay + q[1] * H * k));
      c.closePath(); c.fillStyle = lg(c, 0, Y(py + ay), 0, Y(py + ay - 0.6 * H * k), [0, rgba(colr, 0.95), 1, rgba(colr, 0.15)]); c.fill();
    };
    if (hz < 0.3) {
      const dk = mix(lt, st, 0.62), li = mix(st, lt, 0.6);
      // 受光面上的陰影稜（稜線右邊背光）
      for (let k = 1; k <= 2; k++) sliver(L[k][0] + H * 0.02, L[k][1] - H * 0.01, [[0.09, -0.17], [0.03, -0.33], [0.13, -0.55], [0.25, -0.36], [0.17, -0.13]], 0.8 + R() * 0.5, dk);
      // 背光面上的亮稜（稜線左邊受光）
      sliver(sp[1][0], sp[1][1], [[0.12, -0.13], [0.15, -0.3], [0.29, -0.52], [0.11, -0.4], [0.03, -0.2]], 0.9 + R() * 0.4, li);
      sliver(Rt[1][0] - H * 0.02, Rt[1][1] - H * 0.02, [[0.06, -0.2], [0.02, -0.36], [0.12, -0.6], [-0.07, -0.42], [-0.08, -0.18]], 0.8 + R() * 0.4, li);
    }
    c.restore();
  }
  // 把一棵杉樹（一層一層的三角形加樹幹）加進目前的路徑；(x, y) 是樹腳的像素座標，h 是樹高（像素）
  const TIER = [[1, 0.6, 0.55], [0.76, 0.34, 0.8], [0.5, 0.05, 1.1]];
  function firPath(c, x, y, h) {
    const w = h * 0.2;
    for (const [a, b, k] of TIER) { c.moveTo(x, y - h * a); c.lineTo(x + w * k, y - h * b); c.lineTo(x - w * k, y - h * b); c.closePath(); }
    c.rect(x - h * 0.03, y - h * 0.07, h * 0.06, h * 0.09);
  }
  // 一棵積雪的杉樹：由下往上一層一層畫，每層頂上先蓋一片雪，上一層再壓上去，露出兩肩的雪（左邊受光，雪多一點）
  function firSnowy(c, x, y, h, col, snow) {
    const w = h * 0.2;
    c.fillStyle = col; c.fillRect(x - h * 0.03, y - h * 0.07, h * 0.06, h * 0.09);
    for (let i = 2; i >= 0; i--) {
      const [a, b, k] = TIER[i], yt = y - h * a, yb = y - h * b, hw = w * k, at = (t) => lerp(yt, yb, t);
      c.beginPath(); c.moveTo(x, yt); c.lineTo(x + hw, yb); c.lineTo(x - hw, yb); c.closePath(); c.fillStyle = col; c.fill();
      c.beginPath(); c.moveTo(x, yt); c.lineTo(x + hw * 0.56, at(0.56)); c.lineTo(x + hw * 0.2, at(0.5)); c.lineTo(x - hw * 0.14, at(0.74)); c.lineTo(x - hw * 0.46, at(0.66)); c.lineTo(x - hw * 0.86, at(0.86)); c.closePath(); c.fillStyle = snow; c.fill();
    }
  }
  // 極光的一道簾幕：沿著 o.base(x) 這條底線，一根一根往上的光柱，加亮疊進 buf（w×h 個像素、預乘的 RGBA；每個戰場單位橫向 qx、直向 qy 個像素，左緣 x0、上緣 yT）
  function curtain(buf, w, h, qx, qy, x0, yT, o, R) {
    // 光柱的直向剖面（由上到下 N 格；o.cols 是 [位置, r, g, b, a]…）：底緣亮而清楚，往上拉長變淡
    const N = 64, lut = new Float32Array(N * 4), st = o.cols;
    for (let k = 0, j = 0; k < N; k++) {
      const u = k / (N - 1); while (j < st.length - 10 && u > st[j + 5]) j += 5;
      const f = clamp((u - st[j]) / (st[j + 5] - st[j]), 0, 1), al = lerp(st[j + 4], st[j + 9], f);
      for (let m = 1; m < 4; m++) lut[k * 4 + m - 1] = lerp(st[j + m], st[j + 5 + m], f) / 255 * al;
      lut[k * 4 + 3] = al;
    }
    const nL = noise(R, 37), nH = noise(R, 41), nF = noise(R, 67), nG = noise(R, 59), o1 = R() * 30, o2 = R() * 30;
    for (let pass = 0; pass < o.n; pass++) for (let i = 0; i < w; i++) {   // 第二遍是後面淡淡的另一摺
      const x = x0 + i / qx, xs = x + pass * 17, yb = o.base(x) + pass * (0.8 + 1.4 * nL(xs * 0.07 + 5));
      const fine = nF(xs * 1.25 + o1) * 0.6 + nG(xs * 0.45 + o2) * 0.4;                                  // 細的光柱：主要是高高低低，亮度只差一點
      const hh = o.h * (0.4 + 1.05 * nH(xs * 0.09 + o1)) * (0.7 + 0.6 * fine) * (pass ? 0.75 : 1);
      const A = clamp(o.env(x) * (0.5 + 0.5 * nL(xs * 0.085 + o2)) * (0.86 + 0.26 * fine) * (pass ? 0.4 : 1), 0, 1);
      const top = (yT - (yb + hh)) * qy, len = (hh + 0.8) * qy, j1 = Math.min(h - 1, Math.floor(top + len - 0.5));
      for (let j = Math.max(0, Math.ceil(top - 0.5)); j <= j1; j++) {
        const v = (j + 0.5 - top) / len * (N - 1), k = Math.min(N - 2, v | 0), f = v - k, d = (j * w + i) * 4, l = k * 4;
        for (let m = 0; m < 4; m++) buf[d + m] += A * (lut[l + m] + (lut[l + 4 + m] - lut[l + m]) * f);
      }
    }
  }
  // 一片雪花往下飄，左右輕輕晃，跟著風偏；掉出畫面就從上面（或另一側）再進來
  function drift(f, t, dt, wind) {
    f.x += (Math.sin(t * f.w + f.p) * f.a + wind) * dt; f.y -= f.v * dt;
    if (f.y < -10) { f.y = V.top + 2 + Math.random() * 3; f.x = lerp(V.x0 - 2, V.x1 + 2, Math.random()); }
    if (f.x > V.x1 + 2) f.x = V.x0 - 2; else if (f.x < V.x0 - 2) f.x = V.x1 + 2;
  }
  // 柔邊的小光點（雪花用）
  function dotSprite(r, core) { const cv = mkCanvas(r * 2, r * 2), g = cv.getContext('2d'); g.fillStyle = rg(g, r, r, 0, r, [0, 'rgba(255,255,255,1)', core, 'rgba(255,255,255,.9)', 1, 'rgba(255,255,255,0)']); g.fillRect(0, 0, r * 2, r * 2); return cv; }
  // 蓋著雪的石頭、矮樹叢（像素座標，(x, y) 是底部中央）
  function rock(c, x, y, w, h) {
    poly(c, [x - w, y, x - w * 0.72, y - h * 0.6, x - w * 0.15, y - h, x + w * 0.5, y - h * 0.8, x + w, y - h * 0.22, x + w * 0.92, y]); c.fillStyle = '#3a4f78'; c.fill();
    poly(c, [x - w * 0.15, y - h, x + w * 0.5, y - h * 0.8, x + w, y - h * 0.22, x + w * 0.92, y, x + w * 0.15, y]); c.fillStyle = '#26395e'; c.fill();
    poly(c, [x - w * 0.8, y - h * 0.5, x - w * 0.17, y - h * 1.08, x + w * 0.56, y - h * 0.86, x + w * 0.88, y - h * 0.42, x + w * 0.42, y - h * 0.56, x + w * 0.06, y - h * 0.72, x - w * 0.36, y - h * 0.48]); c.fillStyle = '#f6fbff'; c.fill();
  }
  function bush(c, x, y, r) {
    c.strokeStyle = '#1b3a55'; c.lineWidth = Math.max(1, r * 0.11); c.lineCap = 'round'; c.beginPath();
    for (const [dx, dy] of [[-1.25, -0.75], [-0.7, -1.5], [0.1, -1.75], [0.85, -1.4], [1.3, -0.6]]) { c.moveTo(x + dx * r * 0.35, y - r * 0.2); c.lineTo(x + dx * r, y + dy * r); }
    c.stroke();
    c.fillStyle = '#173650'; c.beginPath(); c.ellipse(x, y - r * 0.3, r * 1.15, r * 0.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#c3d6f2'; c.beginPath(); c.arc(x - r * 0.55, y - r * 0.62, r * 0.55, 0, TAU); c.arc(x + r * 0.55, y - r * 0.56, r * 0.5, 0, TAU); c.arc(x + r * 0.05, y - r * 0.95, r * 0.62, 0, TAU); c.fill();
    c.fillStyle = '#f6fbff'; c.beginPath(); c.arc(x - r * 0.62, y - r * 0.72, r * 0.47, 0, TAU); c.arc(x + r * 0.45, y - r * 0.68, r * 0.4, 0, TAU); c.arc(x - r * 0.04, y - r * 1.06, r * 0.52, 0, TAU); c.fill();
  }
  // 遠處稜線上的一座塔（跟第一關的是同一座）：屋簷積雪，窗裡一點燈火
  function pagoda(c, x, y, s, col, snow) {
    for (let k = 0; k < 5; k++) {
      const w = s * (2.6 - k * 0.4), yy = y - k * s * 1.25;
      c.fillStyle = col; c.fillRect(x - w * 0.36, yy - s * 1.25, w * 0.72, s * 1.25);
      c.beginPath(); c.moveTo(x - w * 0.78, yy - s * 0.86); c.quadraticCurveTo(x - w * 0.5, yy - s * 1.02, x - w * 0.36, yy - s * 1.3); c.lineTo(x + w * 0.36, yy - s * 1.3); c.quadraticCurveTo(x + w * 0.5, yy - s * 1.02, x + w * 0.78, yy - s * 0.86); c.closePath(); c.fill();
      c.strokeStyle = snow; c.lineWidth = Math.max(1, s * 0.17); c.lineJoin = 'round'; c.beginPath(); c.moveTo(x - w * 0.74, yy - s * 0.9); c.quadraticCurveTo(x - w * 0.5, yy - s * 1.04, x - w * 0.36, yy - s * 1.3); c.lineTo(x + w * 0.36, yy - s * 1.3); c.stroke();
    }
    c.fillStyle = col; c.fillRect(x - s * 0.07, y - s * 8.2, s * 0.14, s * 1.6);
    for (const k of [0, 2]) { const yy = y - k * s * 1.25 - s * 0.42; glow(c, x, yy, s * 1.5, s * 1.5, '#ffb648', 0.5); c.fillStyle = '#ffdc8a'; c.fillRect(x - s * 0.13, yy - s * 0.2, s * 0.26, s * 0.4); }
  }

  return {
    key: 'frost',
    build(c, W, H) {
      const R = mkRand(307), RS = mkRand(41), s = V.s, yH = Y(0), top = V.top, f = (wy) => clamp(Y(wy) / yH, 0, 1);
      // 天空：頂上深海軍藍 → 靛 → 地平線一抹冷冷的青綠
      c.fillStyle = lg(c, 0, 0, 0, yH, [0, '#050819', f(51), '#0c133c', f(39), '#151c5c', f(27), '#1b2b74', f(16), '#1c4d80', f(7), '#237b8c', 1, '#3fa49d']); c.fillRect(0, 0, W, H);
      // 地平線的光暈偏左，右半邊留暗
      glow(c, X(38), Y(5), s * 62, s * 24, '#6ee0cc', 0.4);
      // 星星：越靠近地平線越稀、越淡
      const SC = ['#ffffff', '#dfe9ff', '#c4d8ff', '#ffeed2', '#d9ccff'], nS = Math.round((V.x1 - V.x0) * (top - 16) * 0.036);
      for (let k = 0; k < nS; k++) {
        const x = lerp(V.x0, V.x1, RS()), y = 17 + Math.pow(RS(), 0.8) * (top - 16), a = sm((y - 16) / 22) * (0.3 + RS() * 0.7), r = Math.max(0.55, s * (0.04 + RS() * RS() * 0.085));
        c.globalAlpha = a; c.fillStyle = SC[(RS() * 5) | 0]; c.beginPath(); c.arc(X(x), Y(y), r, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      // 幾顆亮星帶一圈光（避開兩城之間砲彈飛的那一塊，免得跟瞄準點混在一起）
      for (let k = 0; k < 16; k++) {
        const x = lerp(V.x0, V.x1, RS()), y = 30 + RS() * (top - 30), px = X(x), py = Y(y), r = s * (0.11 + RS() * 0.07), a = 0.3 + RS() * 0.25;
        if (x > 33 && x < 79 && y < 51) continue;
        glow(c, px, py, r * 5, r * 5, '#c8deff', a);
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(px, py, Math.max(0.8, r), 0, TAU); c.fill();
      }
      // 彎月：整個月面隱約可見（地照），右下一彎受光
      const mx = X(-2.8), my = Y(40), mr = s * 3.7;
      glow(c, mx, my, s * 40, s * 40, '#8fb0ff', 0.3); glow(c, mx + mr * 0.3, my + mr * 0.25, s * 9, s * 9, '#fff6dc', 0.5);
      const mc = mkCanvas(mr * 2 + 4, mr * 2 + 4), mg = mc.getContext('2d'), mo = mr + 2;
      mg.fillStyle = rg(mg, mo + mr * 0.3, mo + mr * 0.3, mr * 0.2, mr * 1.3, [0, '#fffdf2', 1, '#f0e2bc']); mg.beginPath(); mg.arc(mo, mo, mr, 0, TAU); mg.fill();
      mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(mo - mr * 0.44, mo - mr * 0.36, mr * 1.02, 0, TAU); mg.fill();
      c.fillStyle = rg(c, mx + mr * 0.4, my + mr * 0.35, 0, mr * 1.8, [0, '#5c66a0', 1, '#434d85']); c.beginPath(); c.arc(mx, my, mr * 0.97, 0, TAU); c.fill();
      c.drawImage(mc, mx - mo, my - mo);

      // 遠山兩排：後排矮、灰，只比天空亮一點；前排高、稜角分明（高的先畫，矮的疊在前面）
      for (let x = XA - 6; x < XB + 8; x += 8 + R() * 7) { const h = 14 + R() * 8, w = (h - 6) * (0.85 + R() * 0.6); peak(c, R, x, h, w, w * (0.85 + R() * 0.3), 6, lum(x) * 0.5, 0.5); }
      c.fillStyle = lg(c, 0, Y(22), 0, Y(7), [0, 'rgba(40,110,150,0)', 1, 'rgba(44,120,152,.4)']); c.fillRect(0, Y(22), W, Y(7) - Y(22));
      // 前排每座山：[山頂 x, 山頂 y, 左半寬, 右半寬, 山形的亂數種子]
      const PK = [[-33, 28, 16, 16, 1001], [-19, 25, 15, 16, 1002], [-6, 33.5, 21, 21, 1003], [6, 25, 13, 14, 1004], [17, 29.5, 17, 18, 1005], [29.5, 23.5, 13, 14, 1006], [41, 27.5, 16, 15, 5007], [51.5, 18, 10, 10, 1008], [61, 16.5, 10, 10, 1009],
        [71, 22.5, 14, 14, 10], [83, 19, 11, 11, 1011], [92, 24.5, 15, 15, 1012], [104, 21.5, 13, 13, 1013], [116.5, 29, 18, 18, 10014], [129, 24, 14, 14, 1015], [140, 27, 15, 15, 1016], [153, 25, 14, 14, 1017]];
      PK.sort((p, q) => q[1] - p[1]);
      for (const p of PK) peak(c, mkRand(p[4]), p[0], p[1], p[2], p[3], 6, lum(p[0]), 0);
      c.fillStyle = lg(c, 0, Y(18), 0, Y(8), [0, 'rgba(40,110,150,0)', 1, 'rgba(40,112,146,.5)']); c.fillRect(0, Y(18), W, Y(8) - Y(18));

      // 遠的杉林：一整條鋸齒狀的深色稜線，河谷的地方低下去；稜線上站一座塔
      const rv = river(), [ra, rb, ry] = rv || [56, 56, 0], rm = (ra + rb) / 2, rw = (rb - ra) / 2;
      const f1 = ridgeFn(R, 0.05), f2 = ridgeFn(R, 0.08);
      const v1 = (x) => (10.4 + 2.3 * f1(x)) * (1 - 0.3 * Math.exp(-Math.pow((x - rm) / 15, 2)));
      c.beginPath(); c.moveTo(X(XA), H + 2);
      for (let x = XA; x < XB; ) { const w = 0.45 + R() * 0.4, h = 1.1 + R() * 1.7, y = v1(x); c.lineTo(X(x - w), Y(y)); c.lineTo(X(x), Y(y + h)); c.lineTo(X(x + w), Y(y)); x += w * (1.2 + R() * 1.2); }
      c.lineTo(X(XB), H + 2); c.closePath(); c.fillStyle = lg(c, 0, Y(14), 0, Y(0), [0, '#133c57', 1, '#0f3049']); c.fill();
      pagoda(c, X(rm + 10.5), Y(v1(rm + 10.5) - 0.3), s * 0.95, '#103651', mix('#4f7ea6', '#bcd6f2', lum(rm + 10.5)));
      // 遠處的河面：往深處收窄，再往右彎進對岸的林子後面；河谷裡一層霧
      if (rv) {
        c.beginPath(); c.moveTo(X(ra), Y(ry)); c.quadraticCurveTo(X(ra + rw * 0.36), Y(ry + 0.5), X(rm - rw * 0.36), Y(ry + 1.5)); c.quadraticCurveTo(X(rm - rw * 0.05), Y(ry + 2.6), X(rm + rw * 0.55), Y(ry + 2.7)); c.lineTo(X(rb + 7), Y(ry + 3.5)); c.lineTo(X(rb + 7), Y(ry + 2.7));
        c.quadraticCurveTo(X(rm + rw * 0.62), Y(ry + 2.3), X(rm + rw * 0.42), Y(ry + 1.6)); c.quadraticCurveTo(X(rm + rw * 0.55), Y(ry + 0.6), X(rb), Y(ry)); c.closePath();
        c.fillStyle = lg(c, 0, Y(ry + 3), 0, Y(ry), [0, '#2b6a8c', 1, '#5aa4c2']); c.fill();
      }
      glow(c, X(rm), Y(ry + 1.8), s * 34, s * 7, '#86c8d8', 0.4);
      // 兩岸的杉林：靠河谷的地方降到河面
      const bank = (x) => sm((Math.abs(x - rm) - rw * 0.85) / 12), v2 = (x) => ry - 1 + bank(x) * (9.6 + 2.4 * f2(x) + 3 * sm((Math.abs(x - rm) - 48) / 24));
      c.beginPath(); c.moveTo(X(XA), H + 2); for (let x = XA; x <= XB; x += 0.8) c.lineTo(X(x), Y(v2(x))); c.lineTo(X(XB), H + 2); c.closePath();
      c.fillStyle = lg(c, 0, Y(13), 0, Y(-2), [0, '#0c2b40', 1, '#082133']); c.fill();
      // 一排一排的樹：稜線上一排，山坡上再往下幾排（越下面越大、顏色略有深淺），有些樹積了雪
      const TC = ['#0a2639', '#0e3148', '#092435', '#0d2d42'];
      for (let row = 0; row < 4; row++) {
        const snowy = [];
        c.beginPath();
        for (let x = XA + R(); x < XB; x += 1 + R() * 1.5 + row * 0.25) {
          const bk = bank(x), y = v2(x) - 0.3 - row * 2.1 - R() * 0.7, h = (2.6 + R() * 2.6 + row * 0.35) * (0.5 + 0.5 * bk);
          if (bk < 0.08 || y < groundYRaw(x) - 0.5) continue;
          if (R() < 0.3) snowy.push([x, y, h]); else firPath(c, X(x), Y(y), h * s);
        }
        c.fillStyle = TC[row]; c.fill();
        for (const t of snowy) firSnowy(c, X(t[0]), Y(t[1]), t[2] * s, TC[row], mix('#3a628c', '#c4daf6', lum(t[0])));
      }
      // 河岸邊站幾棵大一點的
      for (const [x, h] of [[-30, 9.5], [-21.5, 8], [-13, 10], [-8.6, 7.4], [-1.6, 9], [36.4, 6.6], [38.7, 4.8], [73.4, 5.2], [75.7, 7.2], [110.6, 8.2], [114.5, 6.2], [119.5, 10.5], [125, 8], [133.5, 9.5], [141, 8]]) firSnowy(c, X(x), Y(groundYRaw(x) - 0.4), h * s, '#061b2a', mix('#4a74a2', '#dcebff', lum(x)));
    },
    terrain(c) {
      const R = mkRand(911), s = V.s, runs = groundRuns(), rv = river(), [ra, rb, ry] = rv || [56, 56, 0], rm = (ra + rb) / 2, y0 = Y(ry);
      // 雪地：像剪紙一樣一層一層往下，越下面越藍
      const wave = (x, k) => 0.5 * Math.sin(x * 0.21 + k * 2.1) + 0.28 * Math.sin(x * 0.53 + k * 1.3);
      for (const [xa, xb] of runs) {
        c.beginPath(); gline(c, xa, xb, true); c.lineTo(X(xb), V.H + 4); c.lineTo(X(xa), V.H + 4); c.closePath();
        c.fillStyle = lg(c, 0, Y(0), 0, V.H, [0, '#dde9fa', 1, '#c9daf3']); c.fill();
        for (let k = 1; k <= 3; k++) {
          c.beginPath(); c.moveTo(X(xa), V.H + 4);
          for (let x = xa; x <= xb + 1; x += 1) c.lineTo(X(x), Y(Math.min(groundYRaw(x) - 0.9, -0.4 - k * 2.25 + wave(x, k))));
          c.lineTo(X(xb + 1), V.H + 4); c.closePath(); c.fillStyle = ['#bcd1f0', '#a6bfe8', '#8eaadc'][k - 1]; c.fill();
        }
      }
      // 城樓底下的影子
      for (const [xa, xb] of [[2, 35.4], [76.6, 110]]) glow(c, X((xa + xb) / 2), Y(-1.9), (xb - xa) * 0.56 * s, s * 2.6, '#3c5ea8', 0.55);
      // 結凍的河面：近的地方比較寬
      if (rv) {
        const eL = (d) => ra - 0.55 * d - 0.35 * Math.sin(d * 1.4), eR = (d) => rb + 0.5 * d + 0.4 * Math.sin(d * 1.2 + 1);
        c.beginPath(); c.moveTo(X(ra), y0); c.lineTo(X(rb), y0); for (let d = 0; d <= 8; d += 0.5) c.lineTo(X(eR(d)), Y(ry - d)); for (let d = 8; d >= 0; d -= 0.5) c.lineTo(X(eL(d)), Y(ry - d)); c.closePath();
        c.fillStyle = lg(c, 0, y0, 0, V.H, [0, '#d2f3fb', 0.1, '#a2dcee', 0.42, '#62b0d9', 1, '#3676b2']); c.fill();
        c.save(); c.clip();
        // 冰底下深淺不一
        for (let k = 0; k < 6; k++) glow(c, X(ra + R() * (rb - ra)), Y(ry - 2.5 - R() * 4.5), s * (3 + R() * 5), s * (0.8 + R() * 1.2), '#215fa2', 0.3);
        // 倒影：天光和極光拉成一條一條直的柔光
        for (let k = 0; k < 8; k++) glow(c, X(ra + 1 + R() * (rb - ra - 2)), y0, s * (0.9 + R() * 1.8), s * (3 + R() * 4.5), ['#ffffff', '#eafcff', '#9dffcf', '#b9a8ff'][k & 3], 0.42);
        // 冰牆（立在河中央）的倒影
        glow(c, X(rm), y0, s * 6.8, s * 4.2, '#e6fbff', 0.5);
        for (let k = -1; k <= 1; k++) glow(c, X(rm + k * 3.4), y0, s * 1.8, s * (6.6 - Math.abs(k) * 0.8), '#f4feff', 0.5);
        // 裂痕：折線的主幹加幾根分岔，照透視壓扁。冰牆腳下往外裂出幾道，其它地方再散幾道
        c.lineCap = 'round'; c.lineJoin = 'round';
        const crack = (x, y, a, n, len, lw, al) => {
          const pts = [[x, y]], br = [];
          for (let j = 0; j < n; j++) { a += (j & 1 ? 1 : -1) * (0.15 + R() * 0.45); const l = len * (0.6 + R() * 0.8); x += Math.cos(a) * l; y += Math.sin(a) * l * 0.3; pts.push([x, y]); if (j < n - 1 && R() < 0.5) br.push([x, y, a + (R() < 0.5 ? 1 : -1) * (0.5 + R() * 0.45)]); }
          // 先在下面墊一道淡淡的藍（冰的厚度），再畫白的裂紋
          for (const [dy, col, w] of [[-0.1, 'rgba(24,84,150,.3)', lw * 1.3], [0, 'rgba(255,255,255,' + al + ')', lw]]) { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(X(q[0]), Y(q[1] + dy)) : c.moveTo(X(q[0]), Y(q[1] + dy)))); c.strokeStyle = col; c.lineWidth = Math.max(1, s * w); c.stroke(); }
          return br;
        };
        const CR = [[rm - 4.8, ry - 0.5, Math.PI + 0.3, 4, 2.1], [rm - 1.6, ry - 0.6, Math.PI + 1.05, 3, 1.9], [rm + 1.4, ry - 0.6, -0.95, 4, 1.8], [rm + 4.9, ry - 0.5, -0.25, 4, 2.2],
          [ra + 2.2, ry - 2.6, -0.5, 3, 1.7], [rb - 2.4, ry - 4.2, Math.PI + 0.4, 3, 1.8], [rm - 7, ry - 5.6, 0.2, 3, 2]];
        for (const k of CR) for (const b of crack(k[0], k[1], k[2], k[3], k[4], 0.14, 0.85)) crack(b[0], b[1], b[2], 2, 1.4, 0.09, 0.6);
        // 靠近遠端的水平亮紋
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1, s * 0.15);
        for (let k = 0; k < 7; k++) { const x = X(ra + 1 + R() * (rb - ra - 6)), y = Y(ry - 0.45 - R() * 1.6); c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * (1.2 + R() * 2.4), y); c.stroke(); }
        // 近岸：雪簷在冰上落一道藍影
        c.strokeStyle = 'rgba(40,96,160,.35)'; c.lineWidth = s * 0.5;
        for (const e of [eL, eR]) { const sg = e === eL ? -1 : 1; c.beginPath(); for (let d = 0; d <= 8; d += 0.5) c.lineTo(X(e(d) - sg * 0.3), Y(ry - d)); c.stroke(); }
        c.restore();
        // 冰面的上緣一道亮邊；冰牆腳下一圈積雪
        c.fillStyle = '#f2fdff'; c.fillRect(X(ra), y0, X(rb) - X(ra), Math.max(1.5, s * 0.24));
        ell(c, X(rm), Y(ry - 0.22), s * 6.5, s * 0.42); c.fillStyle = 'rgba(244,252,255,.9)'; c.fill();
        // 近岸的雪簷：沿著冰緣一條白邊
        for (const e of [eL, eR]) {
          const sg = e === eL ? -1 : 1;
          c.beginPath(); for (let d = 0; d <= 8; d += 0.5) c.lineTo(X(e(d)), Y(ry - d)); for (let d = 8; d >= 0; d -= 0.5) c.lineTo(X(e(d) + sg * (0.5 + 0.12 * d + 0.25 * Math.sin(d * 2.1))), Y(ry - d)); c.closePath(); c.fillStyle = '#f7fbff'; c.fill();
        }
      }
      // 雪地的亮緣（河面那段不畫）
      for (const [xa, xb] of runs) for (const [pa, pb] of [[xa, Math.min(xb, ra)], [Math.max(xa, rb), xb]]) {
        if (pb <= pa) continue;
        c.beginPath(); gline(c, pa, pb, true);
        for (let x = pb; x >= pa; x -= 0.5) c.lineTo(X(x), Y(groundYRaw(x) - 0.75 - 0.25 * Math.sin(x * 1.3) - 0.12 * Math.sin(x * 3.1)));
        c.closePath(); c.fillStyle = '#f7fbff'; c.fill();
      }
      // 小雪堆、石頭、矮樹叢
      const onSnow = (x) => (x < ra - 1 || x > rb + 1) && runs.some((r) => x > r[0] && x < r[1]);
      for (let x = XA; x < XB; x += 2.5 + R() * 4) {
        const w = 0.9 + R() * 1.3, h = 0.3 + R() * 0.35, px = X(x), py = Y(groundYRaw(x)) + 1;
        if (!onSnow(x)) continue;
        c.beginPath(); c.moveTo(px - w * s, py); c.quadraticCurveTo(px - w * s * 0.2, py - h * s * 2, px + w * s, py); c.closePath(); c.fillStyle = '#ffffff'; c.fill();
      }
      for (const [x, k, sz] of [[-25, 1, 1.4], [-18, 0, 1.3], [-10, 0, 1.5], [-4.4, 1, 1.3], [37.4, 1, 0.8], [74.3, 0, 0.9], [112, 1, 1.2], [122.5, 0, 1.4], [130, 1, 1.3], [137, 0, 1.5]]) { const px = X(x), py = Y(groundYRaw(x)) + s * 0.15; if (k) bush(c, px, py, sz * s); else rock(c, px, py, sz * s * 1.2, sz * s); }
      // 雪面的藍影與閃光
      c.fillStyle = 'rgba(86,124,196,.2)';
      for (let k = 0; k < 14; k++) { const x = X(lerp(XA, XB, R())), y = Y(-3.2 - R() * 5), w = s * (5 + R() * 10), h = s * (0.4 + R() * 0.6); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.5, y - h, x + w, y); c.quadraticCurveTo(x + w * 0.5, y + h * 0.8, x, y); c.fill(); }
      c.fillStyle = '#ffffff';
      for (let k = 0; k < 64; k++) { const x = lerp(XA, XB, R()), y = groundYRaw(x) - 0.9 - R() * 6, r = Math.max(0.7, s * (0.05 + R() * 0.06)); c.globalAlpha = 0.5 + R() * 0.5; if (x < ra - 4 || x > rb + 4) c.fillRect(X(x) - r, Y(y) - r, r * 2, r * 2); }
      c.globalAlpha = 1;
      // 畫面最底下壓暗一點，前景比較穩
      c.fillStyle = lg(c, 0, Y(-5.5), 0, V.H, [0, 'rgba(52,84,160,0)', 1, 'rgba(52,84,160,.35)']); c.fillRect(0, Y(-5.5), V.W, V.H - Y(-5.5));
    },
    init() {
      const s = V.s, R = mkRand(515), rv = river();
      // 極光：一道綠的主簾幕垂在兩城之間的高空，上面一層紫的。同樣的兩道畫成兩張圖（光柱的粗細高低不一樣），之後兩張交替明暗，看起來像光柱在流動
      const GREEN = [0, 190, 80, 255, 0, 0.18, 170, 80, 250, 0.14, 0.42, 90, 100, 235, 0.26, 0.62, 20, 180, 120, 0.46, 0.8, 40, 235, 70, 0.78, 0.93, 90, 255, 80, 0.94, 0.975, 140, 255, 110, 0.78, 1, 90, 255, 100, 0];
      const VIOLET = [0, 210, 90, 255, 0, 0.35, 190, 84, 255, 0.4, 0.72, 120, 90, 255, 0.62, 0.93, 150, 130, 255, 0.95, 1, 120, 120, 255, 0];
      const main = (x) => 38.6 + 0.004 * (x - 48) * (x - 48) + 1.1 * Math.sin(x * 0.11 + 1), envM = (x) => 0.35 + 0.65 * Math.exp(-Math.pow((x - 44) / 46, 2));
      const veil = (x) => 47.5 + 2.6 * Math.sin(x * 0.04 + 2.2) + 1.2 * Math.sin(x * 0.11), envV = (x) => 0.18 + 0.34 * sm((x + 4) / 40);   // 月亮那一側淡一點
      // 先用低解析度算（光柱是直的，橫向細一點、直向粗一點），再放大成跟畫面一樣的解析度存起來：之後每幀 1:1 貼兩張圖最省。左右多留 m 個像素給漂移
      const qx = s * 0.45, qy = s * 0.4, ax = V.x0 - 5, aw = Math.ceil((V.x1 - V.x0 + 10) * qx), yT = V.top + 1, ah = Math.ceil((yT - 35) * qy), key = [V.W, V.H, V.s, V.x0, V.top].join();
      if (key !== aurKey) {   // 畫面大小沒變就沿用上次畫好的（重來一局不必重畫）
        const buf = new Float32Array(aw * ah * 4), m = Math.ceil(1.6 * s) + 2, fy = Math.max(0, Math.floor(Y(yT)));
        aurKey = key; aur = { cv: [], x: -m, y: fy, d: 1.6 * s };
        for (let k = 0; k < 2; k++) {
          const cv = mkCanvas(aw, ah), ag = cv.getContext('2d'), img = ag.createImageData(aw, ah), d = img.data, Rk = mkRand(61 + k * 7);
          buf.fill(0);
          curtain(buf, aw, ah, qx, qy, ax, yT, { base: veil, env: envV, h: 12, n: 1, cols: VIOLET }, Rk);
          curtain(buf, aw, ah, qx, qy, ax, yT, { base: main, env: envM, h: 11 - k, n: 2, cols: GREEN }, Rk);
          for (let i = 0; i < d.length; i += 4) { const al = Math.min(1, buf[i + 3]); if (al > 0.003) { d[i] = buf[i] / al * 255; d[i + 1] = buf[i + 1] / al * 255; d[i + 2] = buf[i + 2] / al * 255; d[i + 3] = al * 255; } }
          ag.putImageData(img, 0, 0);
          const bl = mkCanvas(aw / 4, ah / 4); bl.getContext('2d').drawImage(cv, 0, 0, bl.width, bl.height); ag.globalCompositeOperation = 'lighter'; ag.globalAlpha = 0.55; ag.drawImage(bl, 0, 0, aw, ah);   // 柔光：縮小再放大疊回去
          const big = mkCanvas(V.W + 2 * m, Y(35) - fy); big.getContext('2d').drawImage(cv, X(ax) + m, Y(yT) - fy, aw / qx * s, ah / qy * s);
          aur.cv.push(big);
        }
      }
      // 貼著林腳慢慢飄的幾團霧
      const fw = Math.ceil(s * 44), fh = Math.ceil(s * 7); spFog = mkCanvas(fw, fh); const fg = spFog.getContext('2d');
      for (let k = 0; k < 8; k++) glow(fg, fw * (0.24 + 0.52 * R()), fh * (0.42 + 0.18 * R()), fw * (0.1 + 0.12 * R()), fh * (0.22 + 0.16 * R()), '#a8d8e4', 0.5);
      fog = [{ x: 8, y: 8.6, v: 0.8, a: 0.55 }, { x: 62, y: 7.4, v: 1.15, a: 0.45 }, { x: 104, y: 9, v: 0.65, a: 0.5 }];
      // 一顆十字星芒：天上會眨的星、冰面和雪地偶爾一閃的反光都用它
      const sz = Math.max(8, Math.round(s * 2.6)), h = sz / 2, lw = Math.max(1, sz * 0.04); spStar = mkCanvas(sz, sz); const g = spStar.getContext('2d');
      g.fillStyle = rg(g, h, h, 0, h * 0.55, [0, 'rgba(255,255,255,1)', 0.25, 'rgba(214,230,255,.55)', 1, 'rgba(200,224,255,0)']); g.fillRect(0, 0, sz, sz);
      g.fillStyle = lg(g, 0, 0, sz, 0, [0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,.95)', 1, 'rgba(255,255,255,0)']); g.fillRect(0, h - lw / 2, sz, lw);
      g.fillStyle = lg(g, 0, 0, 0, sz, [0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,.95)', 1, 'rgba(255,255,255,0)']); g.fillRect(h - lw / 2, 0, lw, sz);
      twk = [];
      for (let k = 0; k < 9; k++) { const x = lerp(V.x0 + 2, V.x1 - 2, (k + R()) / 9), y = (x < 5 ? 46 : 34) + R() * (V.top - (x < 5 ? 48 : 36)); twk.push({ x: X(x), y: Y(y), r: h * (0.55 + R() * 0.45) * (x > 33 && x < 79 ? 0.6 : 1), w: 0.9 + R() * 1.6, p: R() * TAU, e: 2 }); }
      const GL = [[-5.5, 0.1], [37.6, -1.6], [75.4, -1.1], [111.5, -0.9]];
      if (rv) GL.push([rv[0] + 4.5, rv[2] - 1.3], [rv[0] + 10.5, rv[2] - 4.4], [rv[1] - 8.5, rv[2] - 2.5], [rv[1] - 3.5, rv[2] - 5.2]);
      for (const [x, y] of GL) twk.push({ x: X(x), y: Y(y), r: h * (0.42 + R() * 0.2), w: 1 + R() * 1.1, p: R() * TAU, e: 8 });
      // 雪花：小的畫成點，大的用柔邊的小圖
      spFlake = [dotSprite(Math.max(2, s * 0.3), 0.34), dotSprite(Math.max(3, s * 0.55), 0.1)];
      const N = [34, 26, 14], VF = [3.2, 5.4, 8];   // 遠（小、慢）→ 近（大、快）
      fl = N.map((n, k) => { const a = []; for (let i = 0; i < n; i++) a.push({ x: lerp(V.x0 - 2, V.x1 + 2, Math.random()), y: lerp(-10, V.top + 2, Math.random()), v: VF[k] * (0.8 + Math.random() * 0.5), a: 0.5 + Math.random() * 1.1, w: 0.6 + Math.random() * 1.2, p: Math.random() * TAU }); return a; });
    },
    back(c, t, dt) {
      if (!aur) return;
      // 極光：兩張圖交替明暗（光柱像在流動）、整體慢慢呼吸、各自左右漂一點
      const br = 0.86 + 0.14 * Math.sin(t * 0.21), sh = 0.13 * Math.sin(t * 0.45);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = br * (0.37 + sh); c.drawImage(aur.cv[0], Math.round(aur.x + Math.sin(t * 0.043) * aur.d), aur.y);
      c.globalAlpha = br * (0.37 - sh); c.drawImage(aur.cv[1], Math.round(aur.x - Math.sin(t * 0.057 + 2) * aur.d), aur.y);
      c.globalCompositeOperation = 'source-over';
      const fx = V.x0 - spFog.width / V.s - 2;   // 霧飄出一邊就從另一邊再進來
      for (const f of fog) { f.x += (f.v + S.wind * 0.12) * dt; if (f.x > V.x1 + 2) f.x = fx; else if (f.x < fx) f.x = V.x1 + 2; c.globalAlpha = f.a; c.drawImage(spFog, Math.round(X(f.x)), Math.round(Y(f.y))); }
      c.globalCompositeOperation = 'lighter';
      for (const k of twk) { const u = 0.5 + 0.5 * Math.sin(t * k.w + k.p), r = k.r * (0.6 + 0.4 * u); c.globalAlpha = k.e > 2 ? Math.pow(u, k.e) : 0.12 + 0.88 * u * u; c.drawImage(spStar, k.x - r, k.y - r, r * 2, r * 2); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    },
    front(c, t, dt) {
      const wind = S.wind * 0.55, r = Math.max(1, V.s * 0.14);
      c.fillStyle = 'rgba(236,246,255,.75)'; c.beginPath();
      for (const f of fl[0]) { drift(f, t, dt, wind); const px = X(f.x), py = Y(f.y); c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); }
      c.fill();
      for (let k = 1; k < 3; k++) { const sp = spFlake[k - 1], h = sp.width / 2; c.globalAlpha = k === 1 ? 0.7 : 0.4; for (const f of fl[k]) { drift(f, t, dt, wind); c.drawImage(sp, X(f.x) - h, Y(f.y) - h); } }
      c.globalAlpha = 1;
    }
  };
})();
