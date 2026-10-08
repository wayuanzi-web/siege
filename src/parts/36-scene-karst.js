/* ===== 36-scene-karst: 第七關「石林骨牌」— 雲南石林的晴朗午後：一叢叢灰色的石灰岩石柱（劍尖般的頂、一道道直溝、青苔和松樹），遠處小湖倒映著石林，左邊石柱頂上一座小亭；草地上的石頭和野花，飄著蒲公英和蝴蝶 ===== */
THEMES[7] = (function () {
  const XA = -52, XB = 180, SUNX = -2.5, SUNY = 53, LK = [33, 95];   // LK：湖的左右端
  // 天色：戰場高度 → 顏色。頂上湛藍，往下越來越淡，貼近地平線帶一點暖
  const SKY = [92, '#3d8ddb', 66, '#58a3e6', 50, '#7cbcee', 36, '#a5d1f2', 24, '#c8e3f2', 14, '#dfeef1', 6, '#edf3ea', -4, '#f3f1e2'];
  const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  // 湖：中線 1.65，往兩端收窄
  const lakeK = (x) => Math.sqrt(sm((x - LK[0]) / 6) * sm((LK[1] - x) / 6));
  const lakeT = (x) => 1.65 + (0.9 + 0.1 * Math.sin(x * 0.21)) * lakeK(x), lakeB = (x) => 1.65 - (0.9 + 0.08 * Math.sin(x * 0.17 + 1)) * lakeK(x);
  let clouds = [], seeds = [], flies = [], spSeed = null, spShade = null;

  // 一棵圓圓的樹（像素座標）：幾個圓疊起來，上亮下暗
  function tree(c, x, y, r, hi, lo) {
    c.fillStyle = lo; c.beginPath(); c.arc(x - r * 0.55, y, r * 0.72, 0, TAU); c.arc(x + r * 0.6, y + r * 0.08, r * 0.66, 0, TAU); c.arc(x, y - r * 0.38, r, 0, TAU); c.fill();
    c.fillStyle = hi; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.6, r * 0.55, 0, TAU); c.arc(x - r * 0.65, y - r * 0.1, r * 0.4, 0, TAU); c.fill();
  }
  // 一棵松（像素座標）：(x, y) 是樹腳，h 高；一層一層往上變窄的圓樹冠
  function pine(c, x, y, h, lo, hi) {
    c.fillStyle = '#5c4a34'; c.fillRect(x - h * 0.03, y - h * 0.3, h * 0.06, h * 0.31);
    c.fillStyle = lo; c.beginPath();
    for (let k = 0; k < 4; k++) { const yy = y - h * (0.32 + k * 0.17), r = h * (0.2 - k * 0.036); c.moveTo(x + r * 1.3, yy); c.ellipse(x, yy, r * 1.3, r * 0.72, 0, 0, TAU); }
    c.moveTo(x, y - h); c.lineTo(x + h * 0.07, y - h * 0.84); c.lineTo(x - h * 0.07, y - h * 0.84); c.fill();
    c.fillStyle = hi; c.beginPath();
    for (let k = 0; k < 4; k++) { const yy = y - h * (0.34 + k * 0.17), r = h * (0.2 - k * 0.036); c.moveTo(x, yy - r * 0.2); c.ellipse(x - r * 0.5, yy - r * 0.2, r * 0.65, r * 0.36, 0, 0, TAU); }
    c.fill();
  }
  // 一團青苔、小灌木（像素座標）
  function moss(c, x, y, r, o) {
    c.fillStyle = o.moss; c.beginPath(); c.arc(x - r * 0.6, y, r * 0.7, 0, TAU); c.arc(x + r * 0.55, y + r * 0.1, r * 0.65, 0, TAU); c.arc(x, y - r * 0.3, r * 0.85, 0, TAU); c.fill();
    c.fillStyle = o.mossHi; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.5, r * 0.45, 0, TAU); c.fill();
  }

  // 一根石柱（戰場座標）：腳在 (x, yb)，高 h，底部半寬 w；左邊受光、右邊背光。o：top/bot 由上到下的顏色、lit/dk 受光和背光、
  // det 直溝的間距（有才畫溝、黑色水痕、層理和青苔）；flat：平頂（給亭子站）。回傳外框（湖裡的倒影要用）
  function pinnacle(c, R, x, yb, h, w, o, flat) {
    const s = V.s, ts = h * (flat ? 0.985 : 0.8 + R() * 0.08), lean = (R() - 0.5) * 0.25 * w, ph = R() * TAU, Lp = [], Rp = [], cr = [];
    for (let k = 0; k <= 6; k++) { const f = k / 6, k1 = (1 - (flat ? 0.1 : 0.2) * f * f) * (1 + 0.07 * Math.sin(f * 5 + ph)); Lp.push([x - w * k1 * (0.94 + R() * 0.12) + lean * f, yb + ts * f]); Rp.push([x + w * k1 * (0.94 + R() * 0.12) + lean * f, yb + ts * f]); }
    const xl = Lp[6][0], xr = Rp[6][0]; let tipX = (xl + xr) / 2;
    // 頂：一到三個尖（最高的那個是主峰），尖和尖之間一道淺凹口；平頂的給亭子站
    if (flat) cr.push([lerp(xl, xr, 0.06), yb + h], [lerp(xl, xr, 0.94), yb + h]);
    else {
      const n = 1 + ((R() * 3) | 0), main = (R() * n) | 0;
      for (let k = 0; k < n; k++) {
        const a = k / n, b = (k + 1) / n, u = lerp(a, b, 0.3 + R() * 0.4), tip = yb + ts + (h - ts) * (k === main ? 1 : 0.4 + R() * 0.35);
        cr.push([lerp(xl, xr, lerp(a, u, 0.5)), lerp(yb + ts, tip, 0.4 + R() * 0.25)], [lerp(xl, xr, u), tip]);
        if (k === main) tipX = lerp(xl, xr, u);
        if (k < n - 1) cr.push([lerp(xl, xr, b), yb + ts + (h - ts) * R() * 0.18]);
      }
    }
    const P = Lp.concat(cr, Rp.slice().reverse()), crown = [Lp[6]].concat(cr, [Rp[6]]);
    const topAt = (gx) => { for (let i = 1; i < crown.length; i++) if (gx <= crown[i][0]) { const a = crown[i - 1], b = crown[i]; return lerp(a[1], b[1], clamp((gx - a[0]) / Math.max(1e-3, b[0] - a[0]), 0, 1)); } return crown[crown.length - 1][1]; };
    c.beginPath(); c.moveTo(X(P[0][0]), Y(yb - 4)); for (const p of P) c.lineTo(X(p[0]), Y(p[1])); c.lineTo(X(P[P.length - 1][0]), Y(yb - 4)); c.closePath();
    c.fillStyle = lg(c, 0, Y(yb + h), 0, Y(yb), [0, o.top, 1, o.bot]); c.fill();
    c.save(); c.clip();
    // 背光面：從主峰的尖往下，到中線偏右，再彎彎曲曲地直落到石腳
    const bx = (f) => lerp(tipX, x + w * 0.18 + lean * 0.5, Math.min(1, f * 3)) + Math.sin(f * 9 + x) * w * 0.07;
    c.beginPath(); c.moveTo(X(tipX), Y(yb + h + 0.5)); for (let k = 1; k <= 10; k++) { const f = k / 10; c.lineTo(X(bx(f)), Y(lerp(yb + h, yb - 4, f))); }
    c.lineTo(X(x + w * 3), Y(yb - 4)); c.lineTo(X(x + w * 3), Y(yb + h + 1)); c.closePath(); c.fillStyle = rgba(o.dk, o.da); c.fill();
    // 受光面的亮邊、石腳暗一點
    c.fillStyle = lg(c, X(x - w * 1.05), 0, X(x - w * 0.25), 0, [0, rgba(o.lit, o.la), 1, rgba(o.lit, 0)]); c.fillRect(X(x - w * 1.6), Y(yb + h + 1), w * 1.6 * s, (h + 5) * s);
    c.fillStyle = lg(c, 0, Y(yb + Math.min(h * 0.35, 6)), 0, Y(yb), [0, rgba(o.dk, 0), 1, rgba(o.dk, o.da * 0.8)]); c.fillRect(X(x - w * 1.6), Y(yb + h * 0.35), w * 3.2 * s, (h * 0.35 + 4) * s);
    if (o.det) {
      // 雨水沖出來的黑色條紋：寬寬淡淡，從頂上往下漸漸消失
      for (let k = 0, n = 1 + ((R() * 2.4) | 0); k < n; k++) {
        const gx = lerp(xl, xr, 0.1 + R() * 0.8), ww = w * (0.12 + R() * 0.16), y0 = topAt(gx), y1 = y0 - (y0 - yb) * (0.4 + R() * 0.5);
        c.fillStyle = lg(c, 0, Y(y0), 0, Y(y1), [0, rgba(o.gr, 0.3), 1, rgba(o.gr, 0)]); c.beginPath(); c.moveTo(X(gx - ww), Y(y0)); c.lineTo(X(gx + ww), Y(y0)); c.lineTo(X(gx + ww * 0.5 - lean * 0.3), Y(y1)); c.lineTo(X(gx - ww * 0.6 - lean * 0.3), Y(y1)); c.closePath(); c.fill();
      }
      // 一道道直溝：從頂上往下拉，長短不一；受光面的溝旁邊有一道亮稜
      const dl = new Path2D(), dd = new Path2D(), li = new Path2D(), sp = o.det;
      for (let gx = xl + sp * (0.4 + R() * 0.5); gx < xr - sp * 0.3; gx += sp * (0.75 + R() * 0.5)) {
        const y0 = topAt(gx) - 0.2, len = (y0 - yb) * (0.3 + R() * 0.6), ex = gx + (R() - 0.5) * 0.2 - lean * len / h, sh = gx > bx(0.5);
        (sh ? dd : dl).moveTo(X(gx), Y(y0)); (sh ? dd : dl).lineTo(X(ex), Y(y0 - len));
        if (!sh) { li.moveTo(X(gx - sp * 0.28), Y(y0 - 0.15)); li.lineTo(X(ex - sp * 0.28), Y(y0 - len * 0.75)); }
      }
      c.lineCap = 'round'; c.lineWidth = Math.max(1, s * sp * 0.2);
      c.strokeStyle = rgba(o.gr, o.ga * 0.65); c.stroke(dl); c.strokeStyle = rgba(o.gr, o.ga); c.stroke(dd);
      c.strokeStyle = rgba(o.lit, 0.5); c.lineWidth = Math.max(1, s * sp * 0.13); c.stroke(li);
      // 一兩道橫的層理
      c.strokeStyle = rgba(o.gr, o.ga * 0.7); c.lineWidth = Math.max(1, s * 0.12);
      for (let k = 0; k < 2; k++) { const y = yb + ts * (0.15 + R() * 0.5), a = lerp(xl, xr, R() * 0.5) - w * 0.2, b = a + w * (0.4 + R() * 0.6); c.beginPath(); c.moveTo(X(a), Y(y)); c.quadraticCurveTo(X((a + b) / 2), Y(y - 0.15), X(b), Y(y + 0.1)); c.stroke(); }
      // 青苔、小灌木、垂下來的藤：長在凹口、岩縫和石腳
      for (let i = 0; i < cr.length; i++) if ((cr[i][1] < yb + ts + (h - ts) * 0.3) && R() < 0.6) moss(c, X(cr[i][0]), Y(cr[i][1]) + s * 0.25, s * (0.3 + R() * 0.3) * Math.min(1.4, w * 0.6), o);
      for (let k = 0; k < 2; k++) if (R() < 0.5) moss(c, X(lerp(xl, xr, 0.15 + R() * 0.35)), Y(yb + ts * (0.25 + R() * 0.55)), s * (0.28 + R() * 0.25) * Math.min(1.4, w * 0.6), o);
      if (R() < 0.55) { const vx = lerp(xl, xr, 0.1 + R() * 0.4), vy = topAt(vx) - 0.3, L = 1.5 + R() * 3.5; c.strokeStyle = o.moss; c.lineWidth = Math.max(1, s * 0.13); c.beginPath(); c.moveTo(X(vx), Y(vy)); c.bezierCurveTo(X(vx + 0.4), Y(vy - L * 0.3), X(vx - 0.4), Y(vy - L * 0.6), X(vx + 0.1), Y(vy - L)); c.stroke(); }
    }
    c.restore();
    return P;
  }
  // 一叢石柱：中間高、兩邊矮，高的先畫、矮的疊在前面
  function cluster(c, R, cx, sp, n, hMax, yb, o) {
    const ps = [];
    for (let k = 0; k < n; k++) { const u = n > 1 ? k / (n - 1) - 0.5 : 0, x = cx + u * sp * 2 + (R() - 0.5) * sp * 0.4; ps.push([x, hMax * (0.5 + 0.5 * (1 - Math.abs(u) * 1.6)) * (0.75 + R() * 0.3), (0.55 + R() * 0.5) * o.w, yb + R() * o.dy, R() * 1e9]); }
    ps.sort((p, q) => q[1] - p[1]);
    for (const p of ps) if (p[0] + 6 > V.x0 && p[0] - 6 < V.x1) pinnacle(c, mkRand(p[4]), p[0], p[3], p[1], p[2], o);
  }
  // 石林頂上的小亭：紅柱、深色的瓦頂、翹起來的簷角
  function pavilion(c, x, y, k) {
    const s = V.s, px = (u) => X(x + u * k), py = (v) => Y(y + v * k);
    c.fillStyle = '#8c8f86'; c.fillRect(px(-1.1), py(0.22), 2.2 * k * s, 0.22 * k * s);
    c.fillStyle = '#c4473a'; for (const u of [-0.8, -0.27, 0.27, 0.8]) c.fillRect(px(u - 0.07), py(1.15), 0.14 * k * s, 0.95 * k * s);
    c.fillStyle = '#9b3329'; c.fillRect(px(-0.85), py(0.55), 1.7 * k * s, 0.09 * k * s);
    c.fillStyle = '#4c5a58'; c.beginPath(); c.moveTo(px(-1.45), py(1.32)); c.quadraticCurveTo(px(-1.0), py(1.1), px(-0.55), py(1.55)); c.lineTo(px(-0.05), py(2.05)); c.lineTo(px(0.05), py(2.05)); c.lineTo(px(0.55), py(1.55)); c.quadraticCurveTo(px(1.0), py(1.1), px(1.45), py(1.32)); c.quadraticCurveTo(px(0.9), py(1.18), px(0), py(1.15)); c.quadraticCurveTo(px(-0.9), py(1.18), px(-1.45), py(1.32)); c.fill();
    c.strokeStyle = '#8fa39a'; c.lineWidth = Math.max(1, s * 0.07 * k); c.beginPath(); c.moveTo(px(-1.3), py(1.29)); c.quadraticCurveTo(px(-0.95), py(1.2), px(-0.55), py(1.55)); c.lineTo(px(-0.04), py(2.03)); c.stroke();
    c.fillStyle = '#e0b04a'; c.beginPath(); c.arc(px(0), py(2.18), Math.max(1, s * 0.12 * k), 0, TAU); c.fill();
  }

  // 石柱的三層顏色：遠（不畫溝）、中、近
  const OF = { top: '#a7bacb', bot: '#cddce5', lit: '#e4ecf2', la: 0.55, dk: '#879bb0', da: 0.45 };
  const OM = { top: '#97a3ab', bot: '#b6c3c6', lit: '#ebe9df', la: 0.5, dk: '#62707e', da: 0.5, gr: '#4f5b66', ga: 0.5, moss: '#78a06c', mossHi: '#a2c78a', det: 0.8, w: 2.0, dy: 0.5 };
  const ON = { top: '#a6a9a1', bot: '#878d87', lit: '#f1e9d4', la: 0.6, dk: '#4c5560', da: 0.58, gr: '#343b39', ga: 0.62, moss: '#4f8c42', mossHi: '#82be5c', det: 0.62, w: 2.4, dy: 0.4 };

  return {
    key: 'karst',
    build(c, W, H) {
      const s = V.s; let R = mkRand(701);
      const st = []; for (let i = 0; i < SKY.length; i += 2) st.push((SKY[0] - SKY[i]) / (SKY[0] - SKY[SKY.length - 2]), SKY[i + 1]);
      c.fillStyle = lg(c, 0, Y(SKY[0]), 0, Y(SKY[SKY.length - 2]), st); c.fillRect(0, 0, W, H);
      // 太陽：左上方，午後的白光
      const sx = X(SUNX), sy = Y(SUNY);
      c.fillStyle = rg(c, sx, sy, 0, s * 80, [0, 'rgba(255,253,236,.9)', 0.06, 'rgba(255,249,220,.55)', 0.22, 'rgba(255,246,214,.2)', 0.5, 'rgba(255,246,224,.06)', 1, 'rgba(255,246,224,0)']); c.fillRect(0, 0, W, H);
      c.fillStyle = rg(c, sx, sy, s * 2.4, s * 4.2, [0, 'rgba(255,255,244,.95)', 1, 'rgba(255,252,236,0)']); c.beginPath(); c.arc(sx, sy, s * 4.2, 0, TAU); c.fill();
      c.fillStyle = '#fffff6'; c.beginPath(); c.arc(sx, sy, s * 2.6, 0, TAU); c.fill();
      // 高空的卷雲
      c.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const x = X(lerp(V.x0, V.x1, R())), y = Y(50 + R() * 18), w = s * (9 + R() * 14); c.strokeStyle = 'rgba(255,255,255,' + (0.2 + R() * 0.18).toFixed(2) + ')'; c.lineWidth = s * (0.35 + R() * 0.45); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.5, y - s * 1.3, x + w, y - s * 0.2); c.stroke(); }

      // 地平線上的遠山
      const f0 = ridgeFn(R, 0.045), f1 = ridgeFn(R, 0.03);
      ridge(c, f1, 8, 3.2, lg(c, 0, Y(12), 0, Y(3), [0, '#bcd2e8', 1, '#d9e7ef']));
      ridge(c, f0, 5.5, 2.4, lg(c, 0, Y(9), 0, Y(2), [0, '#adc6dc', 1, '#d2e2ea']));
      // 遠處的石林：一大片尖柱，兩城之間矮一點
      const far = []; R = mkRand(711);
      for (let x = XA; x < XB; x += 1.1 + R() * 1.8) {
        const env = (1 - 0.5 * Math.exp(-Math.pow((x - 50) / 15, 2))) * (0.75 + 0.35 * Math.sin(x * 0.11 + 1.3)), h = (3.5 + R() * 7.5) * env, w = 0.8 + R() * 0.9, yb = 2.9 + R() * 0.6, seed = R() * 1e9;
        if (x + 3 < V.x0 || x - 3 > V.x1) continue;
        const P = pinnacle(c, mkRand(seed), x, yb, h, w, OF); if (x > LK[0] - 3 && x < LK[1] + 3) far.push(P);
      }
      c.fillStyle = lg(c, 0, Y(7), 0, Y(2.6), [0, 'rgba(232,240,244,0)', 1, 'rgba(232,240,244,.8)']); c.fillRect(0, Y(7), W, 4.4 * s);
      // 遠處的草地，一路鋪到戰場後緣
      c.fillStyle = lg(c, 0, Y(3.3), 0, Y(-0.5), [0, '#c4dbb0', 0.5, '#b0d394', 1, '#9cc87e']); c.fillRect(0, Y(3.3), W, Y(-1) - Y(3.3));
      c.fillStyle = lg(c, 0, Y(3.9), 0, Y(2.9), [0, 'rgba(196,219,176,0)', 1, 'rgba(196,219,176,1)']); c.fillRect(0, Y(3.9), W, s);
      // 小湖：倒映著天光和遠處的石林
      const lake = () => { c.beginPath(); c.moveTo(X(LK[0]), Y(1.65)); for (let x = LK[0]; x <= LK[1]; x += 0.5) c.lineTo(X(x), Y(lakeT(x))); for (let x = LK[1]; x >= LK[0]; x -= 0.5) c.lineTo(X(x), Y(lakeB(x))); c.closePath(); };
      lake(); c.fillStyle = lg(c, 0, Y(2.6), 0, Y(0.7), [0, '#d6ecf3', 0.5, '#b0dbeb', 1, '#8cc7df']); c.fill();
      c.save(); lake(); c.clip();
      c.fillStyle = 'rgba(150,176,196,.5)';
      for (const P of far) { const yb = P[0][1], k = 0.45; c.beginPath(); c.moveTo(X(P[0][0]), Y(2.6)); for (const p of P) c.lineTo(X(p[0]), Y(2.6 - (p[1] - yb) * k)); c.lineTo(X(P[P.length - 1][0]), Y(2.6)); c.closePath(); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = Math.max(1, s * 0.1);
      for (let k = 0; k < 26; k++) { const x = lerp(LK[0] + 2, LK[1] - 4, R()), y = lerp(0.9, 2.4, R()), w = s * (0.6 + R() * 2.2); c.beginPath(); c.moveTo(X(x), Y(y)); c.lineTo(X(x) + w, Y(y)); c.stroke(); }
      c.restore();
      c.beginPath(); for (let x = LK[0]; x <= LK[1]; x += 0.5) c.lineTo(X(x), Y(lakeT(x))); c.strokeStyle = 'rgba(120,150,110,.5)'; c.lineWidth = Math.max(1, s * 0.12); c.stroke();
      // 湖的對岸一排小樹
      for (let x = LK[0] + 4; x < LK[1] - 3; x += 1.8 + R() * 2.6) { const y = Y(lakeT(x) - 0.05), k = R(); if (k < 0.25) continue; if (k < 0.55) pine(c, X(x), y, s * (1.3 + R() * 0.9), '#8fb293', '#adc9a9'); else tree(c, X(x), y - s * 0.25, s * (0.35 + R() * 0.25), '#b6d1aa', '#95b98f'); }
      // 湖心兩塊小石頭
      for (const [x, h, w] of [[47.5, 2.6, 0.5], [58.5, 1.8, 0.4]]) pinnacle(c, mkRand(x * 7), x, 1.7, h, w, OF);

      // 中景的石林：一叢一叢，樹長在石腳
      R = mkRand(721);
      const MID = [[-44, 6, 6, 19], [-31, 5, 5, 16], [-19, 5, 5, 21], [-7, 4, 4, 15], [8, 5, 5, 18], [21, 5, 4, 15], [29.5, 2.5, 3, 10], [70, 4, 4, 12], [81, 5, 5, 16], [93, 4, 4, 14], [101, 3, 3, 12], [112, 4, 4, 15], [125, 5, 5, 19], [140, 6, 6, 22], [155, 6, 5, 18], [170, 6, 6, 20]];
      for (const [cx, sp, n, hm] of MID) {
        const yb = 2.1 + R() * 0.6, seed = R() * 1e9;
        if (cx + sp + 8 < V.x0 || cx - sp - 8 > V.x1) continue;
        cluster(c, mkRand(seed), cx, sp, n, hm, yb, OM);
        const Rt = mkRand(seed + 1);
        for (let k = 0; k < 2; k++) pine(c, X(cx + (Rt() - 0.5) * sp * 2.4), Y(yb + 0.3), s * (2.4 + Rt() * 2), '#5f8d64', '#7fae78');
        for (let k = 0; k < 4; k++) tree(c, X(cx + (Rt() - 0.5) * sp * 2.6), Y(yb + 0.3), s * (0.7 + Rt() * 0.6), '#7fae6c', '#5f8f5a');
      }
      c.fillStyle = lg(c, 0, Y(4.5), 0, Y(1.2), [0, 'rgba(226,236,232,0)', 1, 'rgba(226,236,232,.45)']); c.fillRect(0, Y(4.5), W, 3.3 * s);
      // 近處（畫面兩邊）的大石林：高的先畫、矮的疊在前面；左邊有一根平頂的，頂上蓋著一座小亭（望峰亭）
      R = mkRand(731);
      const PV = -5, NEAR = [[-46, 27, 2.6], [-41, 35, 2.8], [-36, 30, 3], [-31, 38, 2.7], [-26, 28, 3], [-21, 36, 2.8], [-16, 31, 3], [-11.5, 37, 2.8], [-8.4, 29, 2.6], [PV, 21, 2.3, 1], [-1.4, 15, 2],
        [112.6, 17, 2.2], [116.8, 28, 2.8], [121.5, 23, 3], [126, 34, 2.8], [131, 27, 3], [136, 38, 2.7], [141, 30, 3], [146, 36, 2.8], [151.5, 28, 3], [157, 37, 2.7], [163, 30, 3], [169, 35, 2.8]].map((q) => [q[0], q[1], q[2], q[3] || 0, R() * 1e9]);
      NEAR.sort((p, q) => q[1] - p[1]);
      for (const [x, h, w, flat, seed] of NEAR) {
        const yb = groundYRaw(x) + 0.3;
        if (x + 7 < V.x0 || x - 7 > V.x1) continue;
        pinnacle(c, mkRand(seed), x, yb, h, w, ON, flat);
        if (flat) pavilion(c, x + 0.1, yb + h - 0.05, 1.6);
        const Rt = mkRand(seed + 1);
        if (Rt() < 0.6) pine(c, X(x + (Rt() < 0.5 ? -1 : 1) * w * (0.9 + Rt() * 0.4)), Y(yb + 0.3), s * (4 + Rt() * 3.5), '#3d7a45', '#5f9e5a');
        for (let k = 0; k < 3; k++) tree(c, X(x + (Rt() - 0.5) * w * 2.6), Y(yb + 0.2), s * (0.9 + Rt() * 0.7), '#69a85a', '#3f7f45');
      }
    },
    terrain(c) {
      const R = mkRand(741), s = V.s, runs = groundRuns();
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#62b14b', 0.3, '#4f9c43', 1, '#3a7d3a']), band: '#8fd468', bandH: 0.9, edge: '#2e6b2f', edgeW: 0.2 });
      for (const [xa, xb] of runs) { c.beginPath(); traceGround(c, xa, xb, -0.25, true); c.strokeStyle = 'rgba(220,255,170,.55)'; c.lineWidth = Math.max(1, s * 0.15); c.stroke(); }
      // 草地上一塊塊深淺不同的綠、草紋
      for (let k = 0; k < 18; k++) {
        const x = X(lerp(XA, XB, R())), y = Y(-1.8 - R() * 6.5), rx = s * (4 + R() * 7), ry = s * (0.7 + R() * 0.9), lite = R() < 0.5;
        c.save(); c.translate(x, y); c.scale(rx / ry, 1); c.fillStyle = rg(c, 0, 0, 0, ry, [0, lite ? 'rgba(170,230,120,.35)' : 'rgba(30,90,40,.18)', 1, lite ? 'rgba(170,230,120,0)' : 'rgba(30,90,40,0)']); c.fillRect(-ry, -ry, ry * 2, ry * 2); c.restore();
      }
      c.strokeStyle = 'rgba(30,80,30,.2)'; c.lineWidth = Math.max(1, s * 0.3); c.lineCap = 'round';
      for (let k = 0; k < 16; k++) { const x = X(lerp(XA, XB, R())), y = Y(-2.2 - R() * 6), w = s * (3 + R() * 8); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.5, y + s * 0.6, x + w, y + s * 0.1); c.stroke(); }
      // 一叢叢野花和小草
      for (let k = 0; k < 26; k++) {
        const x = lerp(XA, XB, R()), y = -1.8 - R() * 6.6, px = X(x), py = Y(y), fc = ['#ffe066', '#ffffff', '#d9a2ff', '#ff9ec4', '#ffd23f'][(R() * 5) | 0], r = Math.max(1, s * 0.13);
        c.fillStyle = R() < 0.5 ? 'rgba(120,200,90,.9)' : 'rgba(70,150,60,.9)';
        for (let j = -1; j <= 1; j++) { c.beginPath(); c.moveTo(px + j * s * 0.35 - s * 0.2, py); c.lineTo(px + j * s * 0.45, py - s * (0.6 + R() * 0.5)); c.lineTo(px + j * s * 0.35 + s * 0.2, py); c.closePath(); c.fill(); }
        if (k % 3) for (let j = 0, n = 3 + ((R() * 4) | 0); j < n; j++) { const fx = px + (R() - 0.5) * s * 2, fy = py - s * (0.2 + R() * 0.5); c.fillStyle = fc; for (let q = 0; q < 4; q++) { c.beginPath(); c.arc(fx + Math.cos(q * 1.57) * r, fy + Math.sin(q * 1.57) * r, r, 0, TAU); c.fill(); } c.fillStyle = '#f6b73c'; c.beginPath(); c.arc(fx, fy, r * 0.7, 0, TAU); c.fill(); }
      }
      // 散在草地上的小石頭（半埋在土裡）
      for (let k = 0; k < 40; k++) {
        const x = lerp(XA, XB, R()), y = groundYRaw(x) - 1.6 - R() * 6.5, rx = s * (0.25 + R() * 0.45), ry = rx * (0.5 + R() * 0.25), px = X(x), py = Y(y);
        ell(c, px, py, rx, ry); c.fillStyle = '#a9ada3'; c.fill();
        ell(c, px - rx * 0.2, py - ry * 0.3, rx * 0.6, ry * 0.45); c.fillStyle = '#d4d6cc'; c.fill();
      }
      // 從草裡冒出來的石灰岩小石筍
      const tooth = (x, h, w) => {
        const px = X(x), py = Y(groundYRaw(x)) + s * 0.4, Rk = mkRand(x * 97);
        for (let j = 0; j < 3; j++) {
          const ox = (j - 1) * w * 0.7 + (Rk() - 0.5) * w * 0.3, hh = h * (j === 1 ? 1 : 0.5 + Rk() * 0.3), ww = w * (j === 1 ? 0.6 : 0.42), x0 = px + ox * s;
          poly(c, [x0 - ww * s, py, x0 - ww * s * 0.6, py - hh * s * 0.55, x0 - ww * s * 0.1, py - hh * s, x0 + ww * s * 0.3, py - hh * s * 0.7, x0 + ww * s, py]);
          c.fillStyle = lg(c, x0 - ww * s, 0, x0 + ww * s, 0, [0, '#e2e3db', 0.45, '#b9bcb2', 0.55, '#8e938b', 1, '#747a73']); c.fill();
          c.strokeStyle = 'rgba(60,66,62,.6)'; c.lineWidth = Math.max(1, s * 0.08); c.beginPath(); c.moveTo(x0 + ww * s * 0.05, py - hh * s * 0.85); c.lineTo(x0 + ww * s * 0.1, py - hh * s * 0.2); c.stroke();
        }
        c.fillStyle = '#5fae4a'; for (let j = -2; j <= 2; j++) { const gx = px + j * w * s * 0.55; c.beginPath(); c.moveTo(gx - s * 0.25, py + 1); c.lineTo(gx - s * 0.05, py - s * 0.7); c.lineTo(gx + s * 0.25, py + 1); c.closePath(); c.fill(); }
      };
      for (const [x, h, w] of [[-15, 2.2, 1.4], [-9, 1.3, 0.9], [-3.6, 1.6, 1.1], [36.6, 1.1, 0.75], [38.6, 0.7, 0.5], [63, 0.8, 0.55], [110.6, 1.2, 0.8], [118, 1.6, 1.0], [125, 2.4, 1.4], [134, 1.4, 1.0], [141, 2, 1.3]]) tooth(x, h, w);
      // 地面上緣的草叢和野花（另用一組亂數、照固定範圍排，畫面寬窄不同時其它東西的位置不會跟著變）
      const Rg = mkRand(743);
      for (let x = XA; x < XB; x += 0.6 + Rg() * 1.0) {
        const px = X(x), py = Y(groundYRaw(x)), h = s * (0.5 + Rg() * 0.9), lite = Rg() < 0.5, fl = Rg() < 0.2, fc = ['#ffffff', '#ffe066', '#d9a2ff', '#ff9ec4', '#ffd23f'][(Rg() * 5) | 0], fy = py + s * (0.2 + Rg() * 0.5);
        if (x < V.x0 - 2 || x > V.x1 + 2 || !runs.some((q) => x > q[0] && x < q[1])) continue;
        c.fillStyle = lite ? '#a4ec74' : '#72cc54';
        c.beginPath(); c.moveTo(px - s * 0.26, py + 1); c.lineTo(px - s * 0.1, py - h); c.lineTo(px + s * 0.04, py + 1); c.lineTo(px + s * 0.2, py - h * 0.75); c.lineTo(px + s * 0.34, py + 1); c.closePath(); c.fill();
        if (fl) { const fx = px + s * 0.5, r = Math.max(1, s * 0.16); c.fillStyle = fc; for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(fx + Math.cos(j * 1.57) * r, fy + Math.sin(j * 1.57) * r, r, 0, TAU); c.fill(); } c.fillStyle = '#f6b73c'; c.beginPath(); c.arc(fx, fy, r * 0.7, 0, TAU); c.fill(); }
      }
      for (let k = 0; k < 70; k++) { const x = lerp(XA, XB, R()), y = groundYRaw(x) - 1.2 - R() * 7; c.fillStyle = ['#fff6a8', '#e6c4ff', '#ffffff', '#ffc4dc'][(R() * 4) | 0]; c.globalAlpha = 0.75; c.beginPath(); c.arc(X(x), Y(y), Math.max(1, s * (0.1 + R() * 0.08)), 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    },
    init() {
      const s = V.s, R = mkRand(751);
      clouds = [];
      for (let k = 0; k < 4; k++) { const w = s * (13 + R() * 13), h = w * (0.32 + R() * 0.08); clouds.push({ cv: cloudSprite(w, h, R, '#ffffff', '#d3e3f2'), w: w / s, x: lerp(V.x0, V.x1, (k + R() * 0.7) / 4), y: 51 + R() * 12, v: 0.3 + R() * 0.35, a: 0.82 + R() * 0.15 }); }
      // 雲影：一團柔邊的暗綠，跟著前兩朵雲慢慢滑過草地
      spShade = mkCanvas(128, 32); const sc = spShade.getContext('2d'); sc.translate(64, 16); sc.scale(4, 1); sc.fillStyle = rg(sc, 0, 0, 0, 16, [0, 'rgba(20,70,40,.5)', 0.6, 'rgba(20,70,40,.3)', 1, 'rgba(20,70,40,0)']); sc.fillRect(-16, -16, 32, 32);
      // 蒲公英的種子：一根細梗，頂上一把小傘
      const r = Math.max(5, Math.round(s * 0.55)); spSeed = mkCanvas(r * 2 + 2, r * 2 + 2); const g = spSeed.getContext('2d'); g.translate(r + 1, r + 1);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, r * 0.9); g.lineTo(0, -r * 0.1);
      for (let j = 0; j < 9; j++) { const a = -Math.PI * (0.08 + 0.84 * j / 8); g.moveTo(0, -r * 0.1); g.lineTo(Math.cos(a) * r * 0.9, -r * 0.1 + Math.sin(a) * r * 0.75); }
      g.stroke(); g.fillStyle = '#c9b48a'; g.beginPath(); g.arc(0, r * 0.9, Math.max(1, r * 0.14), 0, TAU); g.fill();
      seeds = []; for (let k = 0; k < 16; k++) seeds.push({ x: lerp(V.x0, V.x1, R()), y: R() * 40, v: 0.9 + R() * 1.1, p: R() * TAU, w: 0.6 + R() * 0.8 });
      // 蝴蝶：在草地上方飛來飛去
      flies = [{ x: 37, y: 3, tx: 37, ty: 3, w: 0, p: 0, a: '#ffd23f', b: '#f29b2e' }, { x: 60, y: 5, tx: 60, ty: 5, w: 1.5, p: 2, a: '#ffffff', b: '#8fb8ff' }];
    },
    back(c, t, dt) {
      const s = V.s;
      for (const k of clouds) { k.x += k.v * dt; if (k.x > V.x1 + 8) k.x = V.x0 - k.w * 1.3 - 8; c.globalAlpha = k.a; c.drawImage(k.cv, X(k.x), Y(k.y)); }
      c.globalAlpha = 0.5; for (let i = 0; i < 2; i++) { const k = clouds[i], w = k.w * 1.3; c.drawImage(spShade, X(k.x + k.w * 0.5 - w / 2 + 6), Y(-2.6 - i * 2.4), w * s, 5 * s); }
      c.globalAlpha = 1;
    },
    front(c, t, dt) {
      const s = V.s, wind = 0.6 + S.wind * 0.35;
      // 蒲公英：慢慢往右上飄
      for (const f of seeds) {
        f.x += (wind + Math.sin(t * f.w + f.p) * 0.5) * dt; f.y += (Math.sin(t * 0.7 + f.p) * 0.8 + 0.25) * dt;
        if (f.x > V.x1 + 2 || f.y > V.top + 2) { f.x = V.x0 - 2 + Math.random() * 20; f.y = Math.random() * 30; }
        c.globalAlpha = 0.85; c.save(); c.translate(X(f.x), Y(f.y)); c.rotate(Math.sin(t * f.w * 1.3 + f.p) * 0.35); c.drawImage(spSeed, -spSeed.width / 2, -spSeed.height / 2); c.restore();
      }
      c.globalAlpha = 1;
      // 蝴蝶：翅膀一開一合，飛飛停停
      for (const b of flies) {
        b.w -= dt; if (b.w <= 0) { b.tx = 35 + Math.random() * 30; b.ty = 0.8 + Math.random() * 7; b.w = 1.5 + Math.random() * 2.5; }
        const k = Math.min(1, dt * 1.6); b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k;
        const px = X(b.x + Math.sin(t * 1.7 + b.p) * 0.4), py = Y(b.y + Math.sin(t * 2.9 + b.p) * 0.35 + Math.abs(Math.sin(t * 9 + b.p)) * 0.15), f = 0.25 + 0.75 * Math.abs(Math.sin(t * 11 + b.p)), r = s * 0.85;
        c.save(); c.translate(px, py); c.rotate(Math.sin(t * 1.3 + b.p) * 0.25);
        for (const sg of [-1, 1]) {
          c.fillStyle = b.a; c.beginPath(); c.ellipse(sg * r * 0.5 * f, -r * 0.3, r * 0.55 * f, r * 0.5, sg * 0.4, 0, TAU); c.fill();
          c.fillStyle = b.b; c.beginPath(); c.ellipse(sg * r * 0.38 * f, r * 0.3, r * 0.38 * f, r * 0.34, -sg * 0.5, 0, TAU); c.fill();
        }
        c.fillStyle = '#3a2f2a'; c.beginPath(); c.ellipse(0, 0, r * 0.1, r * 0.48, 0, 0, TAU); c.fill();
        c.restore();
      }
    }
  };
})();
