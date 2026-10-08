/* ===== 36-scene-sea: 第六關「怒海艦城」— 風暴逼近的外海：頭頂壓著烏雲，左上那片雲後面藏著太陽，光柱一道道斜照到海上；
   右邊的積雨雲挾著雨幕逼近、雲裡偶爾打閃；海平線上有遠島、海蝕柱上的塔燈和帆船剪影，海鷗乘風盤旋；海面底下是看不到底的深青 ===== */
THEMES[6] = (function () {
  const XA = -60, XB = 172;              // 佈景一律在這段戰場座標上生成（畫面寬窄不同，看到同一幅）
  const HZ = 2;                          // 海平線（物理的水面在 y = 0；引擎在水面以下另外蓋一層半透明的海水）
  const SUNX = 9, SUNY = 42;             // 太陽：躲在左上那片雲的後面
  const CBX = 124, CBY = 9;              // 右邊的積雨雲：中心、雲底的高度
  const LHX = 62.5;                      // 海蝕柱上的塔燈
  // 天色（高度 → 顏色）：頂上烏雲底下的暗藍灰，往下轉成風暴前泛黃的亮灰
  const SKY = [96, '#1c283d', 74, '#283851', 60, '#3a4f68', 48, '#55697d', 38, '#6f8391', 28, '#8b9ba1', 19, '#a7b3b0', 11, '#c1c8bd', 5, '#d3d5c5', 2, '#dad6c1'];
  const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }, lw = (k, m) => Math.max(m || 1, V.s * k);
  const vg = (c, a, b, st) => lg(c, 0, Y(a), 0, Y(b), st);        // 由高度 a 到 b 的直向漸層
  const dark = (x) => sm((x - 60) / 64);                             // 越往右（暴風雨那一側）越暗：0…1
  // 頭頂那片烏雲的下緣（兩城之間高一點，留出砲彈飛的空間；最左邊低一點）
  const ceilY = (x) => 51.5 + 2.4 * Math.sin(x * 0.05 + 1.1) + 1.4 * Math.sin(x * 0.14 + 2.3) + 3.4 * Math.exp(-Math.pow((x - 58) / 22, 2)) - 2.6 * Math.exp(-Math.pow((x + 32) / 20, 2));
  let lampY = 10, clouds = [], gulls = [], junks = [], glints = [], urays = [], snow = [], streaks = [], spray = [], zap = null, school = null;
  let spLamp = null, spBeam = null, spFlash = null, spURay = null, spStar = null, spFish = null, spJunk = null;

  function skyAt(y) { for (let i = 2; i < SKY.length; i += 2) if (y >= SKY[i]) return mix(SKY[i - 1], SKY[i + 1], clamp((SKY[i - 2] - y) / (SKY[i - 2] - SKY[i]), 0, 1)); return SKY[SKY.length - 1]; }
  // 一團柔邊的橢圓光（像素座標）
  function glow(c, x, y, rx, ry, col, a) { c.save(); c.translate(x, y); c.scale(rx, ry); c.fillStyle = rg(c, 0, 0, 0, 1, [0, rgba(col, a), 0.5, rgba(col, a * 0.42), 1, rgba(col, 0)]); c.fillRect(-1, -1, 2, 2); c.restore(); }
  // 一道從 (sx, sy) 射出去的柔邊光（像素座標）：方向 a、半張角 d、長 L，st 是沿著光的漸層；四層疊出柔邊
  function beam(c, sx, sy, a, d, L, st) {
    c.fillStyle = lg(c, sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L, st);
    for (let j = 1; j <= 4; j++) { const e = d * j / 4; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a - e) * L, sy + Math.sin(a - e) * L); c.lineTo(sx + Math.cos(a + e) * L, sy + Math.sin(a + e) * L); c.closePath(); c.fill(); }
  }
  // 一堆圓（L = [x, y, r, …]，戰場座標）接成一條路徑；grow 每個圓放大幾個像素
  function circles(c, L, ox, oy, grow) {
    const s = V.s; c.beginPath();
    for (let i = 0; i < L.length; i += 3) { const r = L[i + 2] * s + grow, px = X(L[i]) + ox, py = Y(L[i + 1]) + oy; if (r < 0.5 || px + r < -4 || px - r > V.W + 4) continue; c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); }
  }
  // 一團雲：先整片鋪一層亮邊，再把雲身往背光的那一邊（dx, dy 像素）錯開三階疊上去，亮邊才是柔的
  function lumps(c, L, dx, dy, rim, body) {
    const sh = Math.hypot(dx, dy) * 0.1;
    circles(c, L, 0, 0, 0); c.fillStyle = rim; c.fill();
    c.fillStyle = body;
    for (let j = 1; j <= 3; j++) { circles(c, L, dx * j / 3, dy * j / 3, -sh * j); c.globalAlpha = j === 3 ? 1 : 0.3 + j * 0.14; c.fill(); }
    c.globalAlpha = 1;
  }

  // 頭頂的烏雲：下緣一團團垂下來，往上一直蓋到畫面頂；靠近太陽的下緣被照亮，往右（暴風雨那邊）越來越暗
  function ceiling(c) {
    const s = V.s, R = mkRand(611), h = Math.max(1, Math.ceil(Y(43))), cv = mkCanvas(V.W, h), k = cv.getContext('2d'), rows = [];
    for (let row = 0; row < 4; row++) {          // 由上往下；雲團有大有小，偶爾一團垂得特別低
      const L = [];
      for (let x = XA + R() * 3; x < XB;) {
        const big = R() < 0.18, r = (1.4 + R() * R() * 4.2) * (row === 3 ? 1.1 : 0.9) * (big ? 1.35 : 1);
        L.push(x, ceilY(x) + (3 - row) * 5 + r * (0.7 + R() * 0.3) - (big && row === 3 ? 0.9 : 0), r);
        x += r * (0.62 + R() * 0.5);
      }
      rows.push(L);
    }
    k.beginPath(); k.moveTo(X(XA), 0); for (let x = XA; x <= XB; x += 1) k.lineTo(X(x), Y(ceilY(x) + 1.6)); k.lineTo(X(XB), 0); k.closePath();
    k.fillStyle = vg(k, 92, 46, [0, '#1a2537', 0.6, '#2c3b51', 1, '#3e4e63']); k.fill();
    const rim = rg(k, X(SUNX), Y(SUNY), 0, s * 74, [0, '#fff4d6', 0.13, '#efdcae', 0.3, '#a9aca6', 0.62, '#6d7987', 1, '#56637a']);
    lumps(k, rows[0], 0, -s * 0.4, '#3a4a60', '#273548');
    lumps(k, rows[1], 0, -s * 0.45, '#44556a', '#2e3d52');
    lumps(k, rows[2], 0, -s * 0.5, '#55667a', '#36465b');
    lumps(k, rows[3], 0, -s * 0.62, rim, vg(k, 60, 46, [0, '#3a4a5f', 1, '#536377']));
    // 雲底被太陽照到的那一片偏暖，暴風雨那一邊壓暗
    k.globalCompositeOperation = 'source-atop';
    k.fillStyle = rg(k, X(SUNX), Y(SUNY), 0, s * 34, [0, 'rgba(255,224,168,.42)', 0.5, 'rgba(255,214,160,.12)', 1, 'rgba(255,214,160,0)']); k.fillRect(0, 0, V.W, h);
    k.fillStyle = lg(k, X(64), 0, X(132), 0, [0, 'rgba(12,18,30,0)', 1, 'rgba(12,18,30,.45)']); k.fillRect(0, 0, V.W, h);
    c.drawImage(cv, 0, 0); cv.width = cv.height = 0;
  }

  // 一座雲塔：大雲團一層層往上堆、越上面越窄，每團上緣長幾個小雲頭（菜花狀）。
  // 一道斜的漸層同時管受光和背光：左上朝太陽那邊是暖白，右下背光是暗灰藍；tone 越大整座越暗（在後面）
  function tower(c, R, x, yb, w, h, tone) {
    const s = V.s, big = [], all = [];
    for (let y = yb; y < yb + h - w * 0.12;) {
      const u = (y - yb) / h, hw = w * 0.5 * (1 - 0.6 * Math.pow(u, 1.2)), r = lerp(w * 0.25, w * 0.16, u) * (0.85 + R() * 0.3), m = Math.max(1, Math.round(hw * 2 / (r * 1.3)));
      for (let j = 0; j < m; j++) {
        const g = [x + u * w * 0.1 + (m === 1 ? (R() - 0.5) * hw * 0.5 : lerp(-hw + r * 0.5, hw - r * 0.5, j / (m - 1)) + (R() - 0.5) * r * 0.4), Math.min(y + (R() - 0.5) * r * 0.5, yb + h - r), r];
        for (let q = 0; q < 3; q++) { const a = Math.PI * (0.1 + R() * 0.8), r2 = r * (0.28 + R() * 0.18); g.push(g[0] + Math.cos(a) * r * 0.9, g[1] + Math.sin(a) * r * 0.9, r2); }
        big.push(g); for (const v of g) all.push(v);
      }
      y += r * 0.92;
    }
    const gx0 = X(x - w * 0.55), gy0 = Y(yb + h), gx1 = X(x + w * 0.6), gy1 = Y(yb - 2);
    const T = (a, b) => mix(a, b, tone);
    const rim = lg(c, gx0, gy0, gx1, gy1, [0, T('#ffefcc', '#d6cfbd'), 0.4, T('#f3e3c2', '#a4a8a6'), 0.6, T('#959ca4', '#6c7783'), 1, T('#56606e', '#465060')]);
    const body = lg(c, gx0, gy0, gx1, gy1, [0, T('#e6dbc4', '#b6b3a8'), 0.32, T('#bab6aa', '#8c9397'), 0.58, T('#7f8892', '#636e7b'), 1, T('#454f5e', '#3a4453')]);
    lumps(c, all, s * 0.62, s * 0.26, rim, body);
    // 挑一半的雲團再各自描一次：雲塔才看得出一團一團
    for (let i = 0; i < big.length; i++) if (i % 2 === 0) lumps(c, big[i], s * 0.5, s * 0.2, rim, body);
  }
  // 右邊的積雨雲：後面兩座暗一點的雲塔，前面一座朝太陽亮的，頂端沒進頭頂的烏雲裡；下半截越往下越暗，雲底切平
  function thunderhead(c) {
    const s = V.s, R = mkRand(621), ox = Math.floor(Math.max(0, X(CBX - 40))), oy = Math.floor(Math.max(0, Y(62))), w = Math.ceil(Math.min(V.W, X(XB)) - ox), h = Math.ceil(Y(CBY) - oy);
    if (w < 2 || h < 2) return;
    const cv = mkCanvas(w, h), k = cv.getContext('2d'); k.translate(-ox, -oy);
    tower(k, R, CBX + 17, CBY, 26, 40, 0.55);
    tower(k, R, CBX + 1, CBY, 30, 44, 0.25);
    tower(k, R, CBX - 13, CBY, 17, 22, 0);
    k.globalCompositeOperation = 'source-atop';
    k.fillStyle = vg(k, 24, CBY, [0, 'rgba(44,52,66,0)', 0.6, 'rgba(44,52,66,.45)', 1, 'rgba(40,46,60,.85)']); k.fillRect(ox, Y(24), w, h);
    k.fillStyle = lg(k, X(CBX - 4), 0, X(CBX + 30), 0, [0, 'rgba(34,42,58,0)', 1, 'rgba(34,42,58,.42)']); k.fillRect(ox, oy, w, h);
    c.drawImage(cv, ox, oy); cv.width = cv.height = 0;
  }
  // 積雨雲底下的雨幕：從雲底垂下來的一整片灰紗，斜斜落到海平線，兩邊淡掉，裡面一道道深淺不一的雨柱
  function rainCurtain(c) {
    const s = V.s, R = mkRand(641), xa = CBX - 21, xb = CBX + 34, sl = -3.2;     // sl：雨落到海面時往左偏多少
    c.save();
    c.beginPath(); c.moveTo(X(xa), Y(CBY + 0.2)); c.lineTo(X(xb), Y(CBY + 0.2)); c.lineTo(X(xb + sl), Y(HZ - 0.4)); c.lineTo(X(xa + sl), Y(HZ - 0.4)); c.closePath(); c.clip();
    c.fillStyle = lg(c, X(xa + sl), 0, X(xb), 0, [0, 'rgba(66,78,94,0)', 0.14, 'rgba(66,78,94,.5)', 0.75, 'rgba(56,66,82,.62)', 1, 'rgba(56,66,82,.3)']); c.fillRect(X(xa + sl - 1), Y(CBY + 1), X(xb + 1) - X(xa + sl - 1), (CBY - HZ + 2) * s);
    for (let k = 0; k < 10; k++) {
      const x = lerp(xa + 1, xb - 2, (k + R()) / 10), w = 1.2 + R() * 3.4, a = (0.12 + R() * 0.18).toFixed(2), lite = k < 3;
      c.fillStyle = vg(c, CBY, HZ, [0, lite ? 'rgba(200,200,186,' + a + ')' : 'rgba(40,50,66,' + a + ')', 1, 'rgba(70,82,98,0)']);
      poly(c, [X(x), Y(CBY + 0.2), X(x + w), Y(CBY + 0.2), X(x + w + sl), Y(HZ - 0.4), X(x + sl - w * 0.3), Y(HZ - 0.4)]); c.fill();
    }
    c.strokeStyle = 'rgba(206,214,222,.22)'; c.lineWidth = lw(0.07); c.beginPath();
    for (let k = 0; k < 130; k++) { const x = lerp(xa, xb, R()), y = lerp(HZ, CBY, R()), len = 1.2 + R() * 2.6, d = sl / (CBY - HZ + 0.4); c.moveTo(X(x + (y - CBY) * d), Y(y)); c.lineTo(X(x + (y - len - CBY) * d), Y(y - len)); }
    c.stroke();
    c.restore();
  }

  // 天邊的遠島：起伏的山，左右兩頭低下去；hz 越大越融進天色
  function isle(c, xa, xb, h, seed, hz, lit) {
    const R = mkRand(seed), f = ridgeFn(R, 0.11), col = mix('#4e5d6c', skyAt(HZ + h * 0.5), hz), top = HZ + h;
    const yAt = (x) => { const u = (x - xa) / (xb - xa); return HZ - 0.3 + Math.pow(Math.sin(u * Math.PI), 0.55) * h * (0.72 + 0.28 * f(x)); };
    c.beginPath(); c.moveTo(X(xa), Y(HZ - 0.3)); for (let x = xa; x <= xb; x += 0.5) c.lineTo(X(x), Y(yAt(x))); c.lineTo(X(xb), Y(HZ - 0.3)); c.closePath();
    c.fillStyle = vg(c, top, HZ, [0, col, 1, mix(col, '#c7ccc2', 0.35)]); c.fill();
    if (lit) { c.save(); c.clip(); c.strokeStyle = rgba(mix(col, '#fff2d8', 0.55), 0.7); c.lineWidth = lw(0.22); c.beginPath(); for (let x = xa; x <= xb; x += 0.5) c.lineTo(X(x - 0.12), Y(yAt(x) - 0.12)); c.stroke(); c.restore(); }
  }
  // 海蝕柱：一段一段的岩柱，中段凸出一塊岩棚，頂上幾撮矮樹；朝太陽的左邊亮一條。回傳柱頂的高度
  const STK = [[-0.68, 0], [-0.6, 0.16], [-0.5, 0.33], [-0.58, 0.46], [-0.47, 0.6], [-0.44, 0.84], [-0.33, 0.97], [-0.04, 1], [0.24, 0.98], [0.4, 0.88], [0.43, 0.68], [0.5, 0.52], [0.44, 0.34], [0.55, 0.15], [0.7, 0]];
  function stack(c, R, x, w, h, hz) {
    const s = V.s, sky = skyAt(HZ + h * 0.6), col = mix('#44505c', sky, hz), lit = mix('#d2c6a8', sky, hz * 0.6), p = [];
    for (let i = 0; i < STK.length; i++) { const e = i > 0 && i < STK.length - 1 ? 1 : 0; p.push(x + (STK[i][0] + e * (R() - 0.5) * 0.1) * w, HZ - 0.3 + (STK[i][1] + e * (R() - 0.5) * 0.04) * (h + 0.3)); }
    const path = () => { c.beginPath(); c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.closePath(); };
    path(); c.fillStyle = vg(c, HZ + h, HZ, [0, col, 1, mix(col, '#93a0a2', 0.3)]); c.fill();
    c.save(); c.clip();
    c.fillStyle = vg(c, HZ + h, HZ, [0, rgba(lit, 0.8), 1, rgba(lit, 0.25)]); poly(c, [X(x - w), Y(HZ - 1), X(x - w), Y(HZ + h + 1), X(x - w * 0.2), Y(HZ + h + 1), X(x - w * 0.34), Y(HZ - 1)]); c.fill();
    c.strokeStyle = rgba(mix(col, '#141c26', 0.5), 0.5); c.lineWidth = lw(0.1); c.beginPath();
    for (let k = 0; k < 3; k++) { const y = HZ + h * (0.22 + k * 0.24 + R() * 0.06); c.moveTo(X(x - w), Y(y)); c.lineTo(X(x + w), Y(y - 0.15 - R() * 0.2)); }
    c.stroke(); c.restore();
    c.fillStyle = mix('#2f4238', sky, hz * 0.9); c.beginPath();
    for (let k = 0; k < 4; k++) { const tx = X(x + (R() - 0.6) * w * 0.7), r = s * w * (0.07 + R() * 0.05), ty = Y(HZ + h * 0.99); c.moveTo(tx - r * 1.6, ty + 1); c.quadraticCurveTo(tx - r * 0.6, ty - r * 1.6, tx, ty - r * 1.2); c.quadraticCurveTo(tx + r * 0.7, ty - r * 1.5, tx + r * 1.6, ty + 1); c.closePath(); }
    c.fill();
    return HZ + h;
  }
  // 海蝕柱上的塔燈：一座四層的石塔，屋簷翹起，頂層的窗透著燈（燈火、轉動的光束在 back() 畫）
  function lighthouse(c) {
    const s = V.s, R = mkRand(661), yb = stack(c, R, LHX, 5, 4.4, 0.25) - 0.1, col = mix('#38444f', skyAt(8), 0.25), roof = mix('#28323c', skyAt(8), 0.22), x = X(LHX);
    for (let k = 0; k < 4; k++) {
      const w = (1.9 - k * 0.26) * s, y0 = Y(yb + k * 1.2), y1 = Y(yb + (k + 1) * 1.2);
      c.fillStyle = col; c.fillRect(x - w * 0.36, y1, w * 0.72, y0 - y1 + 1);
      c.fillStyle = rgba(mix(col, '#f2e6c8', 0.5), 0.55); c.fillRect(x - w * 0.36, y1, w * 0.14, y0 - y1);
      c.fillStyle = roof; c.beginPath(); c.moveTo(x - w * 0.8, y1 + s * 0.42); c.quadraticCurveTo(x - w * 0.5, y1 + s * 0.26, x - w * 0.4, y1 - s * 0.05); c.lineTo(x + w * 0.4, y1 - s * 0.05); c.quadraticCurveTo(x + w * 0.5, y1 + s * 0.26, x + w * 0.8, y1 + s * 0.42); c.closePath(); c.fill();
    }
    c.fillStyle = roof; c.fillRect(x - s * 0.07, Y(yb + 5.6), s * 0.14, s * 0.9);
    lampY = yb + 4.2;
    c.fillStyle = '#ffe6a8'; c.fillRect(x - s * 0.2, Y(lampY + 0.32), s * 0.4, s * 0.62);
    c.fillStyle = 'rgba(255,236,190,.55)'; c.fillRect(x - s * 0.15, Y(yb + 1.75), s * 0.3, s * 0.42);
  }
  // 被風撕碎的碎雲（小圖，w、h 是像素）：一串柔邊的扁橢圓，上緣透一點亮
  function scud(w, h, R, col, lite) {
    const cv = mkCanvas(w, h), g = cv.getContext('2d');
    for (let k = 0; k < 9; k++) {
      const u = (k + R()) / 9, x = w * (0.12 + 0.76 * u), rx = w * (0.08 + 0.1 * Math.sin(u * Math.PI) + R() * 0.05), ry = h * (0.2 + 0.18 * Math.sin(u * Math.PI)) * (0.7 + R() * 0.5), y = h * (0.55 + (R() - 0.5) * 0.15);
      g.save(); g.translate(x, y); g.scale(rx / ry, 1); g.fillStyle = rg(g, 0, 0, 0, ry, [0, rgba(col, 0.85), 0.6, rgba(col, 0.5), 1, rgba(col, 0)]); g.fillRect(-ry, -ry, ry * 2, ry * 2); g.restore();
    }
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = lg(g, 0, 0, 0, h, [0, rgba(lite, 0.9), 0.45, rgba(lite, 0.25), 0.7, rgba(lite, 0)]); g.fillRect(0, 0, w, h);
    return cv;
  }
  // 遠方的中式帆船（剪影）：船尾高翹，三根桅各掛一面帶竹骨、後緣一折一折的帆。原點在吃水線中間，船頭朝右
  function junkSprite(k, hull, sail, line) {
    const s = V.s * k, cv = mkCanvas(7 * s, 6.6 * s), g = cv.getContext('2d'), ox = 3.5 * s, oy = 6 * s;
    g.translate(ox, oy); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = hull; g.beginPath(); g.moveTo(-3.2, -1.2); g.lineTo(-2.55, -1.12); g.lineTo(-2.3, -0.66); g.lineTo(2.25, -0.52); g.lineTo(3.05, -0.95); g.lineTo(2.85, -0.42);
    g.quadraticCurveTo(2.2, 0.28, 0.6, 0.3); g.lineTo(-1.6, 0.28); g.quadraticCurveTo(-2.7, 0.05, -3.2, -1.2); g.closePath(); g.fill();
    for (const [mx, b, tp, w] of [[-1.55, -0.7, -3.7, 1.5], [0.25, -0.6, -5.4, 2], [1.95, -0.55, -3.3, 1.25]]) {
      g.strokeStyle = line; g.lineWidth = 0.1; g.beginPath(); g.moveTo(mx, b); g.lineTo(mx, tp - 0.25); g.stroke();
      const sx = mx - 0.06, bot = b - 0.32, n = 5, ex = (f) => sx - w * (0.55 + 0.45 * f), ey = (f) => lerp(tp + 0.15, bot, f);
      g.fillStyle = sail; g.beginPath(); g.moveTo(sx, tp); g.lineTo(ex(0), ey(0));
      for (let j = 1; j <= n; j++) { const f = j / n, f0 = (j - 0.5) / n; g.quadraticCurveTo(ex(f0) - 0.22, ey(f0), ex(f), ey(f)); }
      g.lineTo(sx, bot); g.closePath(); g.fill();
      g.strokeStyle = line; g.lineWidth = 0.06; g.beginPath(); for (let j = 1; j < n; j++) { const f = j / n; g.moveTo(sx, ey(f) - 0.12 * f); g.lineTo(ex(f), ey(f)); } g.stroke();
    }
    return { cv, ox, oy };
  }

  return {
    key: 'sea',
    build(c, W, H) {
      const s = V.s, st = [];
      for (let i = 0; i < SKY.length; i += 2) st.push((96 - SKY[i]) / 94, SKY[i + 1]);
      c.fillStyle = vg(c, 96, 2, st); c.fillRect(0, 0, W, H);
      // 暴風雨那一側的天暗下去；太陽那一側一大片暖光
      c.fillStyle = lg(c, X(58), 0, X(128), 0, [0, 'rgba(26,36,52,0)', 1, 'rgba(26,36,52,.42)']); c.fillRect(0, 0, W, H);
      const sx = X(SUNX), sy = Y(SUNY);
      c.fillStyle = rg(c, sx, sy, 0, s * 62, [0, 'rgba(255,248,226,.95)', 0.08, 'rgba(255,238,200,.62)', 0.22, 'rgba(250,226,186,.26)', 0.5, 'rgba(240,222,190,.08)', 1, 'rgba(240,222,190,0)']); c.fillRect(0, 0, W, H);
      thunderhead(c);
      ceiling(c);
      // 天邊的遠島：左邊兩層，右邊一座躲在雨幕後面
      isle(c, XA, -24, 6.5, 671, 0.62, 1); isle(c, -44, -14, 3.6, 672, 0.42, 1); isle(c, 134, XB, 5.5, 673, 0.7, 0);
      c.fillStyle = 'rgba(70,84,100,.4)'; c.fillRect(X(132), Y(HZ + 7), X(XB) - X(132), 7 * s);
      // 天邊幾抹低低的層雲：左邊淡白，右邊灰暗
      let R = mkRand(721);
      for (let k = 0; k < 12; k++) { const x = lerp(XA, XB, (k + R()) / 12), y = HZ + 2.2 + R() * 3.4, w = 5 + R() * 8, dk = dark(x); glow(c, X(x), Y(y), w * s, (0.5 + R() * 0.45) * s, mix('#efe9d8', '#5c6776', dk), 0.5 + R() * 0.2); }
      // ===== 海 =====
      const top = Y(HZ);
      c.fillStyle = vg(c, HZ, -9.5, [0, '#b3bfb4', 0.05, '#8ea5a2', 0.13, '#62898f', 0.22, '#4b7b86', 0.5, '#2e6173', 1, '#173f55']); c.fillRect(0, top, W, H - top);
      c.fillStyle = lg(c, X(56), 0, X(124), 0, [0, 'rgba(20,30,44,0)', 1, 'rgba(20,30,44,.5)']); c.fillRect(X(56), top, W - X(56), H - top);
      // 浪頭：一排排小小的浪，越靠近海平線越細、越密；太陽那一側亮，暴風雨那一側暗
      R = mkRand(681); c.lineCap = 'round';
      for (let row = 0; row < 24; row++) {
        const u = (row + 0.5) / 24, y = HZ - 0.06 - Math.pow(u, 1.5) * (HZ + 0.35), len = lerp(0.32, 2.1, u), bump = lerp(0.04, 0.2, u);
        c.lineWidth = lw(lerp(0.04, 0.12, u));
        for (let x = XA + R() * 3; x < XB; x += lerp(1.3, 3.6, u) * (0.6 + R() * 0.8)) {
          const a = (0.16 + 0.3 * u) * (1 - 0.7 * dark(x)) * (0.6 + R() * 0.6), yy = y + (R() - 0.5) * lerp(0.03, 0.12, u), px = X(x);
          if (px < -20 || px > W + 20) continue;
          c.strokeStyle = 'rgba(238,242,232,' + a.toFixed(3) + ')'; c.beginPath(); c.moveTo(px, Y(yy)); c.quadraticCurveTo(X(x + len * 0.5), Y(yy + bump), X(x + len), Y(yy)); c.stroke();
        }
      }
      // 海平線上一道亮線（太陽那一側最亮）
      c.fillStyle = lg(c, X(-40), 0, X(112), 0, [0, 'rgba(255,248,226,.85)', 0.36, 'rgba(255,246,222,.65)', 0.7, 'rgba(214,222,224,.22)', 1, 'rgba(190,200,212,.08)']); c.fillRect(0, top - lw(0.08), W, lw(0.18, 1.2));
      // 海平線上的霧氣：太陽那一側暖白，暴風雨那一側灰
      c.fillStyle = vg(c, HZ + 7, HZ - 0.1, [0, 'rgba(226,226,212,0)', 1, 'rgba(226,226,212,.3)']); c.fillRect(0, Y(HZ + 7), X(62), 7.1 * s);
      c.fillStyle = vg(c, HZ + 7, HZ - 0.1, [0, 'rgba(150,160,170,0)', 1, 'rgba(150,160,170,.25)']); c.fillRect(X(62), Y(HZ + 7), W - X(62), 7.1 * s);
      // 海蝕柱：左邊天邊四根，右邊兩根（躲在雨裡），兩城之間一根頂著塔燈
      R = mkRand(691);
      for (const [x, w, h] of [[-14.5, 2.8, 7.4], [-10.4, 1.6, 4.4], [-5.6, 3, 9.6], [-1.4, 1.4, 3.4], [118.6, 2.4, 6.4], [114.4, 1.4, 3.6]]) stack(c, R, x, w, h, x > 100 ? 0.3 : 0.16);
      rainCurtain(c);
      lighthouse(c);
      c.strokeStyle = 'rgba(240,244,236,.6)'; c.lineWidth = lw(0.12); c.beginPath();
      for (const [x, w] of [[-14.5, 2.8], [-10.4, 1.6], [-5.6, 3], [-1.4, 1.4], [LHX, 5], [118.6, 2.4], [114.4, 1.4]]) { c.moveTo(X(x - w * 0.85), Y(HZ - 0.34)); c.quadraticCurveTo(X(x), Y(HZ - 0.1), X(x + w * 0.9), Y(HZ - 0.34)); }
      c.stroke();
      // 雲後的太陽往下撒的光柱：先一大片淡淡的光錐，再幾道寬寬的暖光（中間夾著雲影）。光從雲底下才慢慢亮起來，一路照到海上，照到的海面亮一片
      R = mkRand(701); c.save(); c.globalCompositeOperation = 'lighter';
      const Lof = (a) => (SUNY - HZ + 0.5) * s / Math.sin(a), f0 = 5 / (SUNY - HZ);
      beam(c, sx, sy, 1.6, 0.5, Lof(1.6), [0, 'rgba(255,240,206,0)', f0, 'rgba(255,240,206,0)', f0 + 0.2, 'rgba(255,240,206,.03)', 1, 'rgba(255,236,200,.012)']);
      for (let k = 0; k < 5; k++) {
        const a = lerp(1.0, 2.15, (k + 0.2 + R() * 0.6) / 5), d = 0.05 + R() * 0.045, al = 0.03 + R() * 0.02, L = Lof(a);
        beam(c, sx, sy, a, d, L, [0, 'rgba(255,242,210,0)', f0, 'rgba(255,242,210,0)', f0 + 0.25, 'rgba(255,242,210,' + al.toFixed(3) + ')', 0.75, 'rgba(255,238,204,' + (al * 0.75).toFixed(3) + ')', 1, 'rgba(255,236,200,' + (al * 0.4).toFixed(3) + ')']);
        glow(c, X(SUNX + (SUNY - HZ) / Math.tan(a)), Y(HZ - 0.5), L * Math.sin(d) * 1.1, s * 0.8, '#fff0cc', 0.32);
      }
      c.restore();
      // 遮住太陽的那片雲：背著光，先描一圈比雲大一點的金邊（離太陽越近越亮），再鋪偏暗的雲身。太陽後面那一段最厚、頂上堆得高，越往右越薄、越碎
      R = mkRand(711); const B = [];
      const base = (x) => 38.9 + 0.5 * Math.sin(x * 0.17 + 1) + 0.4 * Math.sin(x * 0.41);
      const thick = (x) => 2.6 + 6.4 * Math.exp(-Math.pow((x - 7) / 12, 2)) + 1.8 * Math.exp(-Math.pow((x + 26) / 10, 2));
      for (let x = XA + R() * 2; x < 23;) {
        const th = thick(x), r = 1.9 + R() * 1.2; B.push(x, base(x) + r * 0.85, r);
        if (th > 3) { const r2 = 1.7 + R() * th * 0.32; B.push(x + (R() - 0.5) * 1.5, base(x) + th - r2 * 0.7, r2); }
        if (th > 5.5 && R() < 0.75) { const r3 = 1.8 + R() * 2; B.push(x + (R() - 0.5) * 2.5, base(x) + th * 0.6, r3); }
        x += r * (0.85 + R() * 0.5);
      }
      for (const [x, y, r] of [[25.6, 40.4, 1.7], [27.8, 40, 1.2], [26.8, 41.6, 1.1], [31, 41.2, 1.25], [32.8, 40.9, 0.85]]) B.push(x, y, r);
      circles(c, B, 0, 0, s * 0.32); c.fillStyle = rg(c, sx, sy, 0, s * 40, [0, 'rgba(255,252,236,1)', 0.16, 'rgba(255,242,206,.9)', 0.42, 'rgba(250,232,196,.3)', 1, 'rgba(250,232,196,0)']); c.fill();
      lumps(c, B, 0, -s * 0.6, rg(c, sx, sy, 0, s * 46, [0, '#fff6dc', 0.14, '#f2dfb2', 0.36, '#aaa9a0', 1, '#7a8692']),
        rg(c, sx, sy, 0, s * 46, [0, '#b0ab9e', 0.22, '#8a8d91', 0.6, '#65717e', 1, '#5a6674']));
    },
    terrain(c) {
      const s = V.s, R = mkRand(731);
      // 海面底下：斜斜往右下照進去的幾道天光，越深越淡（引擎還會再蓋一層半透明的海水）
      c.save(); c.beginPath(); c.rect(0, Y(-0.4), V.W, V.H); c.clip(); c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 16; k++) {
        const x = lerp(XA, XB, (k + R()) / 16), w = 0.8 + R() * 2.4, sl = 2.4 + R() * 1.2, a = 0.11 * (1 - 0.7 * dark(x)) * (0.6 + R() * 0.6);
        c.fillStyle = vg(c, -0.4, -9.5, [0, 'rgba(180,236,222,' + a.toFixed(3) + ')', 1, 'rgba(180,236,222,0)']);
        poly(c, [X(x), Y(-0.4), X(x + w), Y(-0.4), X(x + w * 1.8 + sl), Y(-9.5), X(x + sl), Y(-9.5)]); c.fill();
      }
      c.restore();
      // 深處幾團更暗的影子，看不到底
      for (let k = 0; k < 7; k++) glow(c, X(lerp(XA, XB, (k + R()) / 7)), Y(-7 - R() * 2.5), s * (9 + R() * 9), s * (1.6 + R() * 1.4), '#0a2234', 0.4);
    },
    init() {
      const s = V.s, R = mkRand(741);
      // 飄過的雲：高的貼著烏雲底下，低的是暴風雨前面跑得快的碎雲
      clouds = [];
      for (let k = 0; k < 4; k++) {
        const hi = k < 2, w = hi ? 15 + R() * 6 : 9 + R() * 5, h = w * (hi ? 0.26 : 0.3);
        clouds.push({ cv: scud(w * s, h * s, R, hi ? '#5d6c7e' : '#434e5e', hi ? '#b9bdb6' : '#8e979d'), w, h, x: lerp(V.x0, V.x1, [0.12, 0.62, 0.86, 0.3][k] + R() * 0.08), y: hi ? 48.5 + R() * 2.5 : 13 + R() * 4, v: hi ? 0.5 + R() * 0.3 : 1.3 + R() * 0.6, a: hi ? 0.7 : 0.8 });
      }
      // 海鷗：三隻在左邊、一隻在右邊兜大圈，一隻小小的在塔燈附近（遠）
      gulls = [{ cx: 15, cy: 31, rx: 9, ry: 2.6, w: 0.22, p: 0, k: 1 }, { cx: 23, cy: 34.5, rx: 6.5, ry: 2, w: -0.27, p: 2.1, k: 0.9 }, { cx: 6, cy: 27, rx: 7, ry: 2.2, w: 0.18, p: 4, k: 0.85 },
        { cx: 99, cy: 31.5, rx: 8, ry: 2.4, w: -0.2, p: 1, k: 0.95 }, { cx: 57, cy: 13.5, rx: 5, ry: 1.2, w: 0.3, p: 3, k: 0.5 }];
      // 帆船：一艘在左邊天邊，一艘在塔燈左邊慢慢往右開
      spJunk = junkSprite(0.75, '#4c5864', '#8f8478', '#3c4652');
      junks = [{ x: -19, v: 0.12, lo: -40, hi: 0, p: 0, k: 1 }, { x: 45, v: 0.18, lo: 42.5, hi: 57.5, p: 2, k: 0.62 }];
      // 塔燈的燈火、轉動的光束
      spLamp = mkCanvas(64, 64); let g = spLamp.getContext('2d'); g.fillStyle = rg(g, 32, 32, 0, 32, [0, 'rgba(255,246,214,1)', 0.18, 'rgba(255,224,150,.7)', 0.5, 'rgba(255,196,110,.2)', 1, 'rgba(255,190,100,0)']); g.fillRect(0, 0, 64, 64);
      const bw = Math.ceil(s * 22), bh = Math.ceil(s * 3.4); spBeam = mkCanvas(bw, bh); g = spBeam.getContext('2d');
      g.fillStyle = lg(g, 0, 0, bw, 0, [0, 'rgba(255,240,200,.5)', 0.4, 'rgba(255,236,196,.22)', 1, 'rgba(255,236,196,0)']);
      for (let j = 1; j <= 3; j++) { const e = bh * 0.5 * j / 3; g.beginPath(); g.moveTo(0, bh / 2 - s * 0.12); g.lineTo(bw, bh / 2 - e); g.lineTo(bw, bh / 2 + e); g.lineTo(0, bh / 2 + s * 0.12); g.closePath(); g.globalAlpha = 0.45; g.fill(); }
      // 閃電照亮雲的那一團光
      spFlash = mkCanvas(96, 96); g = spFlash.getContext('2d'); g.fillStyle = rg(g, 48, 48, 0, 48, [0, 'rgba(226,232,255,.7)', 0.3, 'rgba(196,210,255,.34)', 0.65, 'rgba(186,202,255,.1)', 1, 'rgba(186,202,255,0)']); g.fillRect(0, 0, 96, 96);
      zap = { next: -1, t0: -9, x: 0, y: 0, pts: null, br: null };
      // 水裡會晃的光柱
      const uw = Math.ceil(s * 5), uh = Math.ceil(s * 9.5); spURay = mkCanvas(uw, uh); g = spURay.getContext('2d');
      g.fillStyle = lg(g, 0, 0, 0, uh, [0, 'rgba(200,246,232,.42)', 0.45, 'rgba(190,240,226,.14)', 1, 'rgba(190,240,226,0)']);
      for (let j = 1; j <= 3; j++) { const e = j / 3; g.beginPath(); g.moveTo(uw * (0.5 - 0.12 * e), 0); g.lineTo(uw * (0.5 + 0.12 * e), 0); g.lineTo(uw * (0.5 + 0.5 * e), uh); g.lineTo(uw * (0.5 - 0.5 * e), uh); g.closePath(); g.globalAlpha = 0.4; g.fill(); }
      urays = []; for (let k = 0; k < 5; k++) urays.push({ x: lerp(-14, 126, (k + R()) / 5), p: R() * TAU, w: 0.25 + R() * 0.3 });
      // 遠海上一閃一閃的亮點
      const sz = Math.max(8, Math.round(s * 1.8)), hs = sz / 2; spStar = mkCanvas(sz, sz); g = spStar.getContext('2d');
      g.fillStyle = rg(g, hs, hs, 0, hs * 0.5, [0, 'rgba(255,255,240,1)', 0.3, 'rgba(255,246,214,.5)', 1, 'rgba(255,240,210,0)']); g.fillRect(0, 0, sz, sz);
      g.fillStyle = lg(g, 0, 0, sz, 0, [0, 'rgba(255,255,240,0)', 0.5, 'rgba(255,255,240,.9)', 1, 'rgba(255,255,240,0)']); g.fillRect(0, hs - Math.max(0.5, sz * 0.03), sz, Math.max(1, sz * 0.06));
      glints = []; for (const [xa, xb, n] of [[-30, 2.6, 7], [41.5, 58, 4], [66.5, 70.5, 1]]) for (let k = 0; k < n; k++) glints.push({ x: lerp(xa, xb, R()), y: HZ - 0.3 - R() * 1.4, w: 1.2 + R() * 1.6, p: R() * TAU, r: 0.6 + R() * 0.5 });
      // 海裡的碎屑（看得出水在流）
      snow = []; for (let k = 0; k < 18; k++) snow.push({ x: lerp(V.x0, V.x1, R()), y: -1 - R() * 8, v: 0.25 + R() * 0.35 });
      // 一群小魚：偶爾從深處游過去
      const fw = Math.ceil(s * 9), fh = Math.ceil(s * 3.2); spFish = mkCanvas(fw, fh); g = spFish.getContext('2d'); g.fillStyle = 'rgba(8,34,46,.9)';
      for (let k = 0; k < 16; k++) { const a = R() * TAU, d = Math.sqrt(R()), x = fw * (0.5 + 0.42 * d * Math.cos(a)), y = fh * (0.5 + 0.36 * d * Math.sin(a)), L = s * (0.42 + R() * 0.2); g.beginPath(); g.ellipse(x, y, L, L * 0.34, 0, 0, TAU); g.moveTo(x - L * 0.8, y); g.lineTo(x - L * 1.45, y - L * 0.42); g.lineTo(x - L * 1.35, y + L * 0.42); g.fill(); }
      school = { t0: 18, per: 64 };
      streaks = []; for (let k = 0; k < 10; k++) streaks.push({ x: lerp(V.x0, V.x1, R()), y: 0.8 + R() * 11, l: 1.6 + R() * 2.6, v: 0.8 + R() * 0.5 });
      spray = []; for (let k = 0; k < 3; k++) spray.push({ wait: R() * 2, x: 0, d: [] });
    },
    back(c, t, dt) {
      const s = V.s;
      // 飄過的雲
      for (const k of clouds) { k.x += (k.v + S.wind * 0.06) * dt; if (k.x > V.x1 + 3) k.x = V.x0 - k.w - 3; else if (k.x < V.x0 - k.w - 4) k.x = V.x1 + 2; c.globalAlpha = k.a; c.drawImage(k.cv, X(k.x), Y(k.y + k.h / 2)); }
      c.globalAlpha = 1;
      // 閃電：每隔十來秒在積雨雲裡亮一下，多半還會劈一道到海上
      if (zap) {
        if (zap.next < 0) zap.next = t + 4 + Math.random() * 6;           // 進關卡之後第一幀才排第一道閃電
        if (t >= zap.next) {
          zap.t0 = t; zap.next = t + 9 + Math.random() * 12; zap.x = CBX - 14 + Math.random() * 30; zap.y = 15 + Math.random() * 14; zap.pts = null; zap.br = null;
          if (Math.random() < 0.85) {
            let x = zap.x + (Math.random() - 0.5) * 4, y = CBY + 0.3; const P = [x, y], n = 8;
            for (let k = 1; k <= n; k++) { y = lerp(CBY + 0.3, HZ + 0.2, k / n); x += (Math.random() - 0.5) * 1.8; P.push(x, y); }
            zap.pts = P; const j = 2 + ((Math.random() * 3) | 0), d = Math.random() < 0.5 ? -1 : 1; zap.br = [P[j * 2], P[j * 2 + 1], P[j * 2] + d * 1.6, P[j * 2 + 1] - 1.5, P[j * 2] + d * 2.4, P[j * 2 + 1] - 3.2];
          }
        }
        const e = t - zap.t0;
        if (e < 0.7) {
          const a = e < 0.07 ? 1 : e < 0.15 ? 0.2 : e < 0.24 ? 0.85 : Math.max(0, 1 - (e - 0.24) / 0.46) * 0.55;   // 閃兩下再暗下去
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * 0.55; const r = s * 21; c.drawImage(spFlash, X(zap.x) - r, Y(zap.y) - r * 0.85, r * 2, r * 1.7);
          c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
          if (zap.pts && e < 0.3 && (e < 0.07 || e > 0.15)) {
            const line = (P) => { c.moveTo(X(P[0]), Y(P[1])); for (let i = 2; i < P.length; i += 2) c.lineTo(X(P[i]), Y(P[i + 1])); };
            c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); line(zap.pts); line(zap.br);
            c.strokeStyle = 'rgba(170,190,255,.45)'; c.lineWidth = lw(0.45, 2); c.stroke(); c.strokeStyle = 'rgba(250,252,255,.95)'; c.lineWidth = lw(0.14); c.stroke();
          }
        }
      }
      // 帆船：慢慢往右開，跟著浪一起一伏
      for (const j of junks) {
        j.x += j.v * dt; if (j.x > j.hi) j.x = j.lo;
        const fade = clamp((j.x - j.lo) / 2.5, 0, 1) * clamp((j.hi - j.x) / 2.5, 0, 1), sp = spJunk; if (fade <= 0) continue;
        c.save(); c.globalAlpha = fade; c.translate(X(j.x), Y(HZ - 0.12 + Math.sin(t * 1.1 + j.p) * 0.06 * j.k)); c.rotate(Math.sin(t * 0.9 + j.p) * 0.04); c.scale(j.k, j.k); c.drawImage(sp.cv, -sp.ox, -sp.oy); c.restore();
      }
      // 塔燈：燈火一明一暗，兩道光束繞著塔轉；轉到正對著我們的那一下最亮
      const ph = t * 0.85, lx = X(LHX), ly = Y(lampY + 0.6);
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        const a = ph + k * Math.PI, cs = Math.cos(a), sn = Math.sin(a); if (Math.abs(cs) < 0.03) continue;
        c.globalAlpha = 0.35 + 0.45 * Math.max(0, sn); c.save(); c.translate(lx, ly); c.scale(cs, 1); c.drawImage(spBeam, 0, -spBeam.height / 2); c.restore();
      }
      const fl = Math.pow(Math.abs(Math.sin(ph)), 16), lr = s * (0.7 + 1.3 * fl);
      c.globalAlpha = 0.5 + 0.5 * fl; c.drawImage(spLamp, lx - lr, ly - lr, lr * 2, lr * 2);
      // 遠海上一閃一閃的亮點
      for (const g of glints) { const u = Math.max(0, Math.sin(t * g.w + g.p)); if (u < 0.05) continue; const r = s * g.r * (0.6 + 0.4 * u); c.globalAlpha = u * u * u; c.drawImage(spStar, X(g.x) - r, Y(g.y) - r, r * 2, r * 2); }
      // 水裡的光柱慢慢晃
      for (const k of urays) {
        const a = 0.55 + 0.45 * Math.sin(t * k.w + k.p); c.globalAlpha = a * 0.8;
        c.save(); c.translate(X(k.x + Math.sin(t * k.w * 0.7 + k.p) * 1.5), Y(-0.3)); c.rotate(-0.26); c.drawImage(spURay, -spURay.width / 2, 0); c.restore();
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      // 海裡的碎屑順著海流漂
      c.fillStyle = 'rgba(200,236,230,.35)'; c.beginPath(); const sr = Math.max(0.8, s * 0.07);
      for (const p of snow) { p.x += (0.6 + p.v) * dt; p.y += Math.sin(t * 0.7 + p.v * 9) * 0.1 * dt; if (p.x > V.x1 + 1) { p.x = V.x0 - 1; p.y = -1 - Math.random() * 8; } c.moveTo(X(p.x) + sr, Y(p.y)); c.arc(X(p.x), Y(p.y), sr, 0, TAU); }
      c.fill();
      // 一群小魚從深處游過去
      const fp = (t + school.t0) % school.per, span = V.x1 - V.x0 + 22;
      if (fp < span / 2.6) { const fx = V.x0 - 11 + fp * 2.6; c.globalAlpha = 0.45; c.drawImage(spFish, X(fx) - spFish.width / 2, Y(-6.6 + Math.sin(t * 0.8) * 0.5) - spFish.height / 2); c.globalAlpha = 1; }
      // 海鷗：繞著大圈子滑翔，偶爾拍幾下翅膀
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      for (const g of gulls) {
        const a = t * g.w + g.p, x = X(g.cx + Math.cos(a) * g.rx), y = Y(g.cy + Math.sin(a) * g.ry), w = s * 1.05 * g.k, burst = Math.pow(Math.max(0, Math.sin(t * 0.5 + g.p * 1.7)), 8), f = 0.3 + 0.7 * burst * Math.sin(t * 11 + g.p);
        const ty = y - w * (0.05 + 0.5 * f), my = y - w * (0.42 + 0.22 * f);
        c.moveTo(x - w, ty); c.quadraticCurveTo(x - w * 0.45, my, x, y); c.quadraticCurveTo(x + w * 0.45, my, x + w, ty);
      }
      c.strokeStyle = 'rgba(46,56,70,.6)'; c.lineWidth = lw(0.3, 1.8); c.stroke(); c.strokeStyle = '#f4f6f2'; c.lineWidth = lw(0.16); c.stroke();
    },
    front(c, t, dt) {
      const s = V.s, wv = 2.2 + S.wind * 1.1;          // 風：平常往右吹的海風，再加上這一回合的風向
      // 被風刮起的浪花：一陣一陣從浪頭上飛起來，順風落回海裡
      c.fillStyle = 'rgba(238,248,248,.78)'; c.beginPath();
      for (const b of spray) {
        if (!b.d.length) {
          b.wait -= dt; if (b.wait > 0) continue;
          b.wait = 0.5 + Math.random() * 1.6; b.x = lerp(V.x0 + 4, V.x1 - 4, Math.random());
          for (let k = 0, n = 5 + ((Math.random() * 5) | 0); k < n; k++) b.d.push({ x: b.x + (Math.random() - 0.5) * 1.6, y: 0.25 + Math.random() * 0.3, vx: wv * (0.4 + Math.random() * 0.5) + (Math.random() - 0.5) * 1.2, vy: 2.4 + Math.random() * 2.8, r: 0.06 + Math.random() * 0.08 });
        }
        for (let i = b.d.length - 1; i >= 0; i--) {
          const p = b.d[i]; p.vy -= 11 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y < -0.3) { b.d.splice(i, 1); continue; }
          const r = Math.max(0.8, s * p.r), px = X(p.x), py = Y(p.y); c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU);
        }
      }
      c.fill();
      // 貼著海面掠過的風痕
      const dir = wv < 0 ? -1 : 1, sp = Math.abs(wv) * 3.2 + 2;
      c.strokeStyle = 'rgba(236,244,244,.16)'; c.lineWidth = lw(0.07); c.lineCap = 'round'; c.beginPath();
      for (const k of streaks) {
        k.x += dir * sp * k.v * dt; const L = k.l * (0.5 + 0.5 * Math.min(1, Math.abs(wv) / 6));
        if (k.x > V.x1 + 6) { k.x = V.x0 - 6; k.y = 0.8 + Math.random() * 11; } else if (k.x < V.x0 - 6) { k.x = V.x1 + 6; k.y = 0.8 + Math.random() * 11; }
        const y = k.y + Math.sin(t * 1.3 + k.l * 3) * 0.2; c.moveTo(X(k.x), Y(y)); c.lineTo(X(k.x - dir * L), Y(y + 0.05));
      }
      c.stroke();
    }
  };
})();
