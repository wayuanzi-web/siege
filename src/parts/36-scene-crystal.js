/* ===== 36-scene-crystal: 第十關「琉璃宮」— 月夜的水晶谷：大圓月從谷口升起，極光在高空飄，雪峰間立著發光的巨大水晶，谷底結冰的湖映著月亮 ===== */
THEMES[10] = (function () {
  const MX = 55, MY = 15.6, MR = 5.3, HAZE = '#3f86ad';      // 月亮（谷口正中、低低的）；遠景的霧色
  // 天色（戰場高度 → 顏色）：深靛 → 藍 → 地平線的青綠
  const SKY = [76, '#0f1347', 62, '#192061', 48, '#232e7b', 36, '#2a438e', 26, '#2c5b9a', 17, '#2f74a4', 9, '#388fae', 2, '#4da8b7', -9, '#4097ab'];
  // 水晶：[受光面, 正面, 背光面, 亮邊, 光暈]
  const VIO = ['#f1eaff', '#c4adff', '#8466dc', '#e6dcff', '#b59bff'], CYA = ['#e8fdff', '#a2eef8', '#4aaed4', '#d4fbff', '#7fe6ff'], PNK = ['#ffeaf7', '#f5b2de', '#bd6fb4', '#ffd8f0', '#ff9ad8'];
  const AW = 20;                                          // 極光切片的寬（像素）
  let aur = null, aurDy = null, aurX = 0, aurY = 0, aurY1 = 70, ribKey = '', twk = [], pulses = [], motes = [], flakes = [], spStar = null, spMote = [], spFlake = null, shoot = null, shootAt = 9;
  const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  function noise(R, n) { const v = []; for (let i = 0; i < n; i++) v.push(R()); return (x) => { const i = Math.floor(x), f = x - i, a = v[((i % n) + n) % n], b = v[(((i + 1) % n) + n) % n]; return a + (b - a) * f * f * (3 - 2 * f); }; }
  // 柔邊的橢圓光（像素座標）
  function glow(c, x, y, rx, ry, col, a) { c.save(); c.translate(x, y); c.scale(rx, ry); c.fillStyle = rg(c, 0, 0, 0, 1, [0, rgba(col, a), 0.45, rgba(col, a * 0.42), 1, rgba(col, 0)]); c.fillRect(-1, -1, 2, 2); c.restore(); }
  function dotSprite(px, st) { const cv = mkCanvas(px, px), g = cv.getContext('2d'); g.fillStyle = rg(g, px / 2, px / 2, 0, px / 2, st); g.fillRect(0, 0, px, px); return cv; }
  // 四角星芒
  function starSprite(sz, col) {
    const cv = mkCanvas(sz, sz), g = cv.getContext('2d'), h = sz / 2, lw = Math.max(1, sz * 0.05);
    g.fillStyle = rg(g, h, h, 0, h * 0.5, [0, 'rgba(255,255,255,1)', 0.3, rgba(col, 0.55), 1, rgba(col, 0)]); g.fillRect(0, 0, sz, sz);
    for (const v of [0, 1]) { g.fillStyle = lg(g, 0, 0, v ? 0 : sz, v * sz, [0, rgba(col, 0), 0.5, 'rgba(255,255,255,.95)', 1, rgba(col, 0)]); g.fillRect(v ? h - lw / 2 : 0, v ? 0 : h - lw / 2, v ? lw : sz, v ? sz : lw); }
    return cv;
  }
  // 湖：地面最低的那段平地 [左緣, 右緣, 高度]
  function lake() {
    const gp = S.gpts || []; let y = 0, a = 1e9, b = -1e9;
    for (const p of gp) if (p[1] < y) y = p[1];
    for (const p of gp) if (p[1] === y) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); }
    return y < 0 && b - a > 4 ? [a, b, y] : null;
  }
  // 沿著地面的折線走（跟碰撞用的地面一樣）
  function gline(c, xa, xb) { c.moveTo(X(xa), Y(groundYRaw(xa))); for (const p of S.gpts || []) if (p[0] > xa && p[0] < xb) c.lineTo(X(p[0]), Y(p[1])); c.lineTo(X(xb), Y(groundYRaw(xb))); }
  // 上緣 f(x)、厚 d(x) 的一條帶子（積雪）
  function band(c, xa, xb, f, d, col) { c.beginPath(); for (let x = xa; x <= xb; x += 0.7) c.lineTo(X(x), Y(f(x) + 0.05)); for (let x = xb; x >= xa; x -= 0.7) c.lineTo(X(x), Y(f(x) - d(x))); c.fillStyle = col; c.fill(); }

  // 雪山：山頂 (x, h)、左右半寬、山腳 yb；P = [背光, 受光, 雪, 受光的雪]；雪頂下緣圓圓的
  function peak(c, R, x, h, wl, wr, yb, P) {
    const H = h - yb, lit = x < MX ? 1 : -1, U = [0.05, 0.16, 0.3, 0.46, 0.64, 0.82, 1];
    const side = (w, sg) => U.map((u, k) => [x + sg * w * u, yb + H * Math.pow(1 - u, 1.3) * (k && k < 6 ? 0.95 + R() * 0.1 : 1)]);
    const L = side(wl, -1), Rt = side(wr, 1), body = new Path2D();
    body.moveTo(X(x - wl), Y(yb - 1)); for (let k = 6; k >= 1; k--) body.lineTo(X(L[k][0]), Y(L[k][1]));
    body.lineTo(X(L[0][0]), Y(L[0][1])); body.quadraticCurveTo(X(x), Y(h + H * 0.035), X(Rt[0][0]), Y(Rt[0][1]));
    for (let k = 1; k <= 6; k++) body.lineTo(X(Rt[k][0]), Y(Rt[k][1])); body.lineTo(X(x + wr), Y(yb - 1)); body.closePath();
    c.fillStyle = lg(c, 0, Y(h), 0, Y(yb), [0, P[0], 1, mix(P[0], HAZE, 0.35)]); c.fill(body);
    c.save(); c.clip(body);
    const w2 = (lit > 0 ? wr : wl) * 1.3, sp = new Path2D(); sp.moveTo(X(x), Y(h + 1));
    for (let k = 1; k <= 5; k++) { const u = k / 5; sp.lineTo(X(x + lit * H * (0.05 * u + (k < 5 ? (k & 1 ? 1 : -1) * (0.02 + R() * 0.04) : 0))), Y(h - H * u)); }
    sp.lineTo(X(x + lit * w2), Y(yb - 1)); sp.lineTo(X(x + lit * w2), Y(h + 1)); sp.closePath();
    c.fillStyle = lg(c, X(x), 0, X(x + lit * w2 * 0.8), 0, [0, P[1], 1, mix(P[1], P[0], 0.55)]); c.fill(sp);
    const cap = H * (0.3 + R() * 0.12), ys = h - cap, xl = x - wl * 0.9, xr = x + wr * 0.9, n = 5 + ((R() * 3) | 0), cp = new Path2D();
    cp.moveTo(X(xl - 2), Y(h + 2)); cp.lineTo(X(xr + 2), Y(h + 2)); cp.lineTo(X(xr + 2), Y(ys));
    for (let k = n; k > 0; k--) { const a = lerp(xl, xr, k / n), b = lerp(xl, xr, (k - 1) / n), d = cap * (k & 1 ? 0.18 + R() * 0.16 : 0.06 + R() * 0.06); cp.lineTo(X(a), Y(ys + (R() - 0.5) * cap * 0.12)); cp.quadraticCurveTo(X((a + b) / 2), Y(ys - d * 2), X(b), Y(ys)); }
    cp.lineTo(X(xl - 2), Y(ys)); cp.closePath();
    const cg = (a, b) => lg(c, 0, Y(h), 0, Y(ys - cap * 0.3), [0, a, 1, b]);
    c.fillStyle = cg(P[2], mix(P[2], P[0], 0.3)); c.fill(cp); c.clip(sp); c.fillStyle = cg(P[3], mix(P[3], P[2], 0.4)); c.fill(cp);
    c.restore();
  }
  // 一根水晶（像素座標）：底 (x, y)、高 h、寬 w、傾角 a；hz 霧（0–1）；lit +1 右面受光
  function crystal(c, x, y, h, w, a, P, hz, lit) {
    const col = (k) => (hz ? mix(P[k], HAZE, hz) : P[k]), hw = w / 2, iw = w * 0.17, hb = h - w * 0.95, sh = w * 0.16;
    const L = [-hw, 2, -hw, -hb + sh, 0, -h, -iw, -hb, -iw, 2], M = [-iw, 2, -iw, -hb, 0, -h, iw, -hb, iw, 2], Rr = [iw, 2, iw, -hb, 0, -h, hw, -hb + sh, hw, 2];
    c.save(); c.translate(x, y); c.rotate(a);
    const face = (p, top, bot) => { poly(c, p); c.fillStyle = lg(c, 0, -h, 0, 0, [0, top, 0.55, mix(top, bot, 0.5), 1, bot]); c.fill(); };
    face(lit > 0 ? Rr : L, col(0), mix(col(0), col(1), 0.5));
    face(M, mix(col(1), col(0), 0.25), col(1));
    face(lit > 0 ? L : Rr, col(2), mix(col(2), col(1), 0.45));
    if (hz < 0.7) {      // 稜線亮邊、兩道反光
      const k = 1 - hz, sx = lit > 0 ? (iw + hw) * 0.5 : -(iw + hw) * 0.5;
      c.strokeStyle = rgba(col(3), 0.8 * k); c.lineWidth = Math.max(1, w * 0.045); c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-iw, 0); c.lineTo(-iw, -hb); c.lineTo(0, -h); c.lineTo(iw, -hb); c.lineTo(iw, 0); c.stroke();
      c.fillStyle = 'rgba(255,255,255,' + (0.6 * k).toFixed(3) + ')'; poly(c, [sx - w * 0.06, -hb * 0.12, sx + w * 0.03, -hb * 0.16, sx + w * 0.03, -hb * 0.9, sx - w * 0.06, -hb * 0.86]); c.fill();
      c.fillStyle = 'rgba(255,255,255,' + (0.35 * k).toFixed(3) + ')'; poly(c, [sx + w * 0.07, -hb * 0.5, sx + w * 0.1, -hb * 0.52, sx + w * 0.1, -hb * 0.8, sx + w * 0.07, -hb * 0.78]); c.fill();
    }
    c.restore();
  }
  // 一叢水晶：list = [x 偏移, 高, 寬, 傾角]…
  function cluster(c, x, y, list, P, hz, ga) {
    const s = V.s, hm = Math.max(...list.map((k) => k[1]));
    glow(c, X(x), Y(y + hm * 0.45), s * hm * 0.75, s * hm * 0.7, P[4], ga);
    for (const [dx, h, w, a] of list) crystal(c, X(x + dx), Y(y), h * s, w * s, a, P, hz, x < MX ? 1 : -1);
  }

  // 極光：低解析度算好、放大存起來，每幀切片 1:1 貼（最省）；記下每片有東西的列
  function aurora(xa, xb, y0, y1, specs, seed) {
    const q = V.s / 2, w = Math.ceil((xb - xa) * q), h = Math.ceil((y1 - y0) * q), R = mkRand(seed), buf = new Float32Array(w * h * 4);
    for (const o of specs) ribbon(buf, w, h, q, xa, y1, o, R);
    const cv = mkCanvas(w, h), g = cv.getContext('2d'), img = g.createImageData(w, h), D = img.data;
    for (let i = 0; i < D.length; i += 4) { const al = Math.min(1, buf[i + 3]); if (al > 0.003) { const k = 255 / buf[i + 3]; D[i] = buf[i] * k; D[i + 1] = buf[i + 1] * k; D[i + 2] = buf[i + 2] * k; D[i + 3] = al * 255; } }
    g.putImageData(img, 0, 0);
    const bl = mkCanvas(w / 4, h / 4); bl.getContext('2d').drawImage(cv, 0, 0, bl.width, bl.height); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(bl, 0, 0, w, h);
    const big = mkCanvas(w * 2, h * 2), n = Math.ceil(w * 2 / AW), ext = new Int16Array(n * 2);
    big.getContext('2d').drawImage(cv, 0, 0, w * 2, h * 2);
    for (let i = 0; i < n; i++) {
      let a = h, b = -1;
      for (let x = Math.max(0, i * AW / 2 - 6); x < Math.min(w, (i + 1) * AW / 2 + 6); x++) for (let y = 0; y < h; y++) if (buf[(y * w + x) * 4 + 3] > 0.004) { if (y < a) a = y; if (y > b) b = y; }
      ext[i * 2] = Math.max(0, a * 2 - 14); ext[i * 2 + 1] = Math.min(h * 2, b * 2 + 14);
    }
    return { cv: big, ext, n };
  }
  // 一條緞帶（光柱沿 o.base(x) 往上）加亮疊進 buf；o.cols = [位置, r, g, b]…；第二遍是淡淡的另一摺
  function ribbon(buf, w, h, q, xa, y1, o, R) {
    const nL = noise(R, 41), nF = noise(R, 67), nG = noise(R, 53), o1 = R() * 30, o2 = R() * 30, C = o.cols, lut = new Float32Array(192);
    for (let k = 0, j = 0; k < 64; k++) { const u = k / 63; while (j < C.length - 8 && u > C[j + 4]) j += 4; const f = clamp((u - C[j]) / (C[j + 4] - C[j]), 0, 1); for (let m = 0; m < 3; m++) lut[k * 3 + m] = lerp(C[j + 1 + m], C[j + 5 + m], f) / 255; }
    for (let i = 0; i < w; i++) for (let f = 0; f < 2; f++) {
      const x = xa + (i + 0.5) / q, xs = x + f * 19, b = o.base(x) + f * (1.2 + 1.8 * nL(xs * 0.05 + 7)), fine = nF(xs * 1.3 + o1) * 0.6 + nG(xs * 0.42 + o2) * 0.4;
      const hh = o.h * (0.5 + 0.75 * nL(xs * 0.07 + o1)) * (0.72 + 0.56 * fine) * (f ? 0.75 : 1), A = o.env(x) * (0.45 + 0.55 * nG(xs * 0.06 + o2)) * (0.62 + 0.5 * fine) * (f ? 0.45 : 1);
      if (A < 0.01) continue;
      for (let j = Math.max(0, Math.floor((y1 - b - hh) * q)), jb = Math.min(h - 1, Math.ceil((y1 - b + 1) * q)); j <= jb; j++) {
        const v = (y1 - (j + 0.5) / q - b) / hh, al = A * (v < 0 ? Math.exp(-Math.pow(v * hh / 0.32, 2)) * 1.4 : Math.pow(1 - Math.min(1, v), 1.15) * (0.55 + 0.85 * Math.exp(-v * 12)));
        const l = Math.min(63, Math.max(0, v * 63) | 0) * 3, d = (j * w + i) * 4;
        buf[d] += al * lut[l]; buf[d + 1] += al * lut[l + 1]; buf[d + 2] += al * lut[l + 2]; buf[d + 3] += al;
      }
    }
  }

  return {
    key: 'crystal',
    build(c, W, H) {
      const R = mkRand(1010), RS = mkRand(77), s = V.s, top = V.top, XA = V.x0 - 6, XB = V.x1 + 6;
      const st = []; for (let i = 0; i < SKY.length; i += 2) st.push((SKY[0] - SKY[i]) / (SKY[0] - SKY[SKY.length - 2]), SKY[i + 1]);
      c.fillStyle = lg(c, 0, Y(SKY[0]), 0, Y(SKY[SKY.length - 2]), st); c.fillRect(0, 0, W, H);
      // 星星（越低越淡、月亮旁邊沒有），幾顆亮星避開中間
      const SC = ['#ffffff', '#e2ecff', '#cfe0ff', '#fff2d8', '#e6d6ff'], nS = Math.round((V.x1 - V.x0) * (top - 12) * 0.04);
      for (let k = 0; k < nS; k++) {
        const x = lerp(V.x0, V.x1, RS()), y = 12 + Math.pow(RS(), 0.8) * (top - 10), a = sm((y - 12) / 20) * sm((Math.hypot(x - MX, y - MY) - 7) / 20) * (0.3 + RS() * 0.7), r = Math.max(0.55, s * (0.035 + RS() * RS() * 0.08)), col = SC[(RS() * 5) | 0];
        if (a > 0.03) { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(X(x), Y(y), r, 0, TAU); c.fill(); }
      }
      c.globalAlpha = 1;
      for (let k = 0; k < 18; k++) {
        const x = lerp(V.x0, V.x1, RS()), y = 26 + RS() * (top - 26), r = s * (0.1 + RS() * 0.07), a = 0.3 + RS() * 0.3;
        if ((x > 33 && x < 80 && y < 55) || Math.hypot(x - MX, y - MY) < 24) continue;
        glow(c, X(x), Y(y), r * 5, r * 5, '#cfe0ff', a); c.fillStyle = '#fff'; c.beginPath(); c.arc(X(x), Y(y), Math.max(0.8, r), 0, TAU); c.fill();
      }
      // 月光、月暈、月亮
      const mx = X(MX), my = Y(MY), mr = MR * s, R1 = s * 11.5, R2 = s * 14.5;
      glow(c, mx, Y(MY - 4), s * 70, s * 40, '#62d4dc', 0.3);
      c.fillStyle = rg(c, mx, my, 0, s * 32, [0, 'rgba(214,244,255,.55)', 0.2, 'rgba(170,224,255,.25)', 0.5, 'rgba(130,190,250,.08)', 1, 'rgba(120,180,250,0)']); c.fillRect(0, 0, W, H);
      c.fillStyle = rg(c, mx, my, R1, R2, [0, 'rgba(255,190,220,0)', 0.22, 'rgba(255,206,232,.07)', 0.5, 'rgba(220,240,255,.11)', 0.78, 'rgba(160,210,255,.05)', 1, 'rgba(160,210,255,0)']); c.fillRect(mx - R2, my - R2, R2 * 2, R2 * 2);
      c.fillStyle = rg(c, mx, my, mr * 0.9, mr * 2, [0, 'rgba(236,250,255,.6)', 1, 'rgba(200,236,255,0)']); c.fillRect(mx - mr * 2, my - mr * 2, mr * 4, mr * 4);
      c.save(); c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.clip();
      c.fillStyle = rg(c, mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mr * 1.35, [0, '#fffffa', 0.55, '#f5f4ff', 1, '#d6def9']); c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
      c.lineCap = 'round';
      for (const [u, v, r] of [[-0.36, -0.2, 0.28], [0.2, -0.42, 0.16], [0.3, 0.14, 0.25], [-0.1, 0.46, 0.17], [-0.55, 0.36, 0.12], [0.6, -0.1, 0.1]]) {
        const x = mx + u * mr, y = my + v * mr, rr = r * mr;
        c.fillStyle = 'rgba(178,188,230,.4)'; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(1, rr * 0.2); c.beginPath(); c.arc(x, y, rr * 0.82, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      }
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.arc(mx, my, mr - c.lineWidth / 2, 0, TAU); c.stroke();
      // 遠山（谷口低下去讓月亮露出來）
      const P1 = ['#4a69a8', '#6d8fc4', '#9fb9e0', '#cfe0f6'].map((k) => mix(k, HAZE, 0.42));
      for (const p of [[-52, 22, 15, 14], [-38, 27, 16, 15], [-24, 21, 13, 13], [-10, 25, 14, 13], [4, 19, 12, 12], [16, 24, 14, 13], [29, 18, 11, 11], [40, 13.5, 9, 9], [50.5, 11.4, 7.5, 6.5], [61, 10.8, 6.5, 8],
        [72, 14, 9, 10], [84, 18, 12, 12], [97, 16.5, 12, 11], [110, 22, 13, 13], [124, 26, 15, 15], [139, 21, 13, 13], [153, 26, 16, 16], [168, 22, 14, 14]].sort((a, b) => b[1] - a[1])) peak(c, mkRand(p[0] * 7 + 300), p[0], p[1], p[2], p[3], 3, P1);
      c.fillStyle = lg(c, 0, Y(16), 0, Y(3), [0, 'rgba(70,150,180,0)', 1, 'rgba(76,160,186,.45)']); c.fillRect(0, Y(16), W, Y(3) - Y(16));
      // 巨大的水晶
      cluster(c, -3, 6, [[0, 28, 4.6, -0.05], [-5, 20, 3.6, -0.3], [5.5, 18, 3.4, 0.24], [-9.5, 13, 3, -0.5], [9.5, 12, 2.8, 0.44], [-2.5, 11, 2.6, -0.14], [3, 9, 2.4, 0.1]], VIO, 0.32, 0.22);
      cluster(c, 119, 6, [[0, 25, 4.4, 0.05], [-5, 17, 3.4, -0.28], [5, 19, 3.6, 0.3], [9.5, 12, 3, 0.52], [-9, 10, 2.6, -0.45], [2, 10, 2.6, 0.12]], CYA, 0.32, 0.22);
      // 中景的雪丘和小水晶，谷口兩旁各一叢
      const f2 = ridgeFn(R, 0.07), f3 = ridgeFn(R, 0.11), v2 = (x) => 0.9 + (7.4 + 2.2 * f2(x)) * (1 - 0.86 * Math.exp(-Math.pow((x - 56) / 13, 2)));
      ridge(c, v2, 0, 1, lg(c, 0, Y(10), 0, Y(0), [0, mix('#3c4f9a', HAZE, 0.22), 1, mix('#2e4083', HAZE, 0.15)]), 0.8);
      band(c, XA, XB, v2, (x) => 0.5 + 0.35 * (1 + Math.sin(x * 1.7)) + 0.2 * Math.sin(x * 4.3), mix('#c4d2f4', HAZE, 0.2));
      for (let x = XA; x < XB; x += 0.9 + R() * 1.6) {
        const m = 1 - 0.75 * Math.exp(-Math.pow((x - 56) / 10, 2)); if (R() > 0.55 * m + 0.1) continue;
        const P = [VIO, CYA, PNK][(R() * 3) | 0], hh = (0.8 + R() * 1.8) * m; crystal(c, X(x), Y(v2(x) - 0.3), hh * s, hh * 0.38 * s, (R() - 0.5) * 0.6, P, 0.3, x < MX ? 1 : -1);
      }
      cluster(c, 40.5, 1.6, [[0, 11.5, 2.2, -0.05], [-2.6, 7.5, 1.8, -0.35], [2.3, 6.5, 1.6, 0.3], [-4.4, 4.5, 1.4, -0.55]], VIO, 0.12, 0.26);
      cluster(c, 68, 1.6, [[0, 9.8, 2, 0.06], [2.4, 6.5, 1.7, 0.36], [-2.2, 6, 1.6, -0.3], [4.2, 4.2, 1.3, 0.6]], CYA, 0.12, 0.26);
      // 遠處的湖面和倒影
      const lk = lake();
      if (lk) {
        const [la, lb, ly] = lk, shore = () => { for (let x = la - 6; x <= lb + 6; x += 0.5) c.lineTo(X(x), Y(0.85 + 0.15 * Math.sin(x * 0.9))); };
        c.beginPath(); c.moveTo(X(la - 6), Y(ly - 0.2)); shore(); c.lineTo(X(lb + 6), Y(ly - 0.2)); c.closePath();
        c.fillStyle = lg(c, 0, Y(1), 0, Y(ly), [0, '#b2ecef', 0.35, '#7cc6de', 1, '#5c9fd0']); c.fill();
        c.save(); c.clip();
        glow(c, X(MX), Y(0.2), s * 3.2, s * 4.2, '#ffffff', 0.55); glow(c, X(MX), Y(0.4), s * 1.2, s * 4, '#ffffff', 0.7);
        glow(c, X(40.5), Y(0.3), s * 2.4, s * 2.4, '#c4adff', 0.45); glow(c, X(68), Y(0.3), s * 2.2, s * 2.2, '#9eeef8', 0.45);
        c.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 9; k++) c.fillRect(X(la - 4 + R() * (lb - la + 8)), Y(0.6 - R() * 3.6), s * (1 + R() * 3), Math.max(1, s * 0.1));
        c.restore();
        c.strokeStyle = 'rgba(236,250,255,.85)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); shore(); c.stroke();
      }
      // 近處的岸
      const v3 = (x) => lerp(-5, 3.3 + 1.3 * f3(x), sm((Math.abs(x - 56) - 13) / 7.5));
      ridge(c, v3, 0, 1, lg(c, 0, Y(5), 0, Y(-2), [0, '#2a3a7c', 1, '#22306a']), 0.6);
      band(c, XA, XB, v3, (x) => 0.55 + 0.3 * (1 + Math.sin(x * 1.3)) + 0.15 * Math.sin(x * 3.7), '#d6e0fb');
    },
    terrain(c) {
      const R = mkRand(1111), s = V.s, runs = groundRuns(), lk = lake(), [la, lb, ly] = lk || [56, 56, 0], y0 = Y(ly), XA = V.x0 - 8, XB = V.x1 + 8;
      // 雪地：剪紙似的一層層往下
      const wave = (x, k) => 0.5 * Math.sin(x * 0.21 + k * 2.1) + 0.28 * Math.sin(x * 0.53 + k * 1.3);
      for (const [xa, xb] of runs) {
        c.beginPath(); gline(c, xa, xb); c.lineTo(X(xb), V.H + 4); c.lineTo(X(xa), V.H + 4); c.closePath();
        c.fillStyle = lg(c, 0, Y(0), 0, V.H, [0, '#e6eaff', 1, '#cdd3f4']); c.fill();
        for (let k = 1; k <= 3; k++) {
          c.beginPath(); c.moveTo(X(xa), V.H + 4);
          for (let x = xa; x <= xb + 1; x += 1) c.lineTo(X(x), Y(Math.min(groundYRaw(x) - 0.9, -0.4 - k * 2.25 + wave(x, k))));
          c.lineTo(X(xb + 1), V.H + 4); c.closePath(); c.fillStyle = ['#d3d8f7', '#bcc2ee', '#a3aae2'][k - 1]; c.fill();
        }
      }
      for (const st of S.structs) if (st.side < 2 && st.x1 > st.x0) glow(c, X((st.x0 + st.x1) / 2), Y(-1.9), (st.x1 - st.x0) * 0.56 * s, s * 2.6, '#5560b0', 0.5);
      // 冰面：映著天色、極光、月亮
      if (lk) {
        const eL = (d) => la - 0.62 * d - 0.3 * Math.sin(d * 1.4), eR = (d) => lb + 0.6 * d + 0.35 * Math.sin(d * 1.2 + 1);
        c.beginPath(); c.moveTo(X(la), y0); c.lineTo(X(lb), y0); for (let d = 0; d <= 7; d += 0.5) c.lineTo(X(eR(d)), Y(ly - d)); for (let d = 7; d >= 0; d -= 0.5) c.lineTo(X(eL(d)), Y(ly - d)); c.closePath();
        c.fillStyle = lg(c, 0, y0, 0, Y(ly - 6), [0, '#74b6de', 0.3, '#5b97d4', 0.65, '#4877c4', 1, '#3b58aa']); c.fill();
        c.save(); c.clip();
        for (let k = 0; k < 7; k++) glow(c, X(la + 1 + R() * (lb - la - 2)), y0, s * (0.9 + R() * 1.6), s * (3 + R() * 4), ['#9dffd6', '#c4adff', '#a2eef8', '#f5b2de'][k & 3], 0.3);
        glow(c, X(MX), y0, s * 3.4, s * 6.5, '#ffffff', 0.45); glow(c, X(MX), y0, s * 1.3, s * 7, '#ffffff', 0.55);
        for (let d = 0.35; d < 6.5; d += 0.3 + R() * 0.55) { const w = (0.7 + R() * 2.4) * (1 - d * 0.07); glow(c, X(MX + (R() - 0.5) * 1.6), Y(ly - d), w * s, Math.max(1, s * (0.09 + d * 0.012)), '#ffffff', 0.85 - d * 0.08); }
        // 裂紋
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (const [x0, yy, a0, n] of [[la + 3, ly - 1.4, 0.2, 5], [la + 9, ly - 4.6, -0.3, 4], [lb - 4, ly - 2.2, Math.PI - 0.25, 5], [lb - 9, ly - 5.4, Math.PI + 0.3, 4], [MX + 3.5, ly - 3.2, -0.15, 4]]) {
          let x = x0, y = yy, a = a0; const p = [x, y];
          for (let j = 0; j < n; j++) { a += (j & 1 ? 1 : -1) * (0.15 + R() * 0.45); const l = 1.9 * (0.6 + R() * 0.8); x += Math.cos(a) * l; y += Math.sin(a) * l * 0.3; p.push(x, y); }
          for (const [dy, col, w] of [[-0.1, 'rgba(30,70,150,.22)', 0.15], [0, 'rgba(240,252,255,.6)', 0.11]]) { c.beginPath(); for (let i = 0; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1] + dy)); c.moveTo(X(p[4]), Y(p[5] + dy)); c.lineTo(X(p[4] + 1.1), Y(p[5] + dy - 0.35)); c.strokeStyle = col; c.lineWidth = Math.max(1, s * w); c.stroke(); }
        }
        for (let k = 0; k < 6; k++) glow(c, X(la + R() * (lb - la)), Y(ly - 1 - R() * 5), s * (2 + R() * 4), s * (0.25 + R() * 0.2), '#f4f8ff', 0.5);
        c.strokeStyle = 'rgba(50,80,170,.32)'; c.lineWidth = s * 0.55;
        for (const [e, sg] of [[eL, -1], [eR, 1]]) { c.beginPath(); for (let d = 0; d <= 7; d += 0.5) c.lineTo(X(e(d) - sg * 0.32), Y(ly - d)); c.stroke(); }
        c.restore();
        // 冰的亮邊、岸邊的雪簷
        c.fillStyle = '#f4feff'; c.fillRect(X(la), y0, X(lb) - X(la), Math.max(1.5, s * 0.2));
        for (const [e, sg] of [[eL, -1], [eR, 1]]) {
          c.beginPath(); for (let d = 0; d <= 7; d += 0.5) c.lineTo(X(e(d)), Y(ly - d)); for (let d = 7; d >= 0; d -= 0.5) c.lineTo(X(e(d) + sg * (0.5 + 0.1 * d + 0.25 * Math.sin(d * 2.1))), Y(ly - d)); c.closePath(); c.fillStyle = '#f6f8ff'; c.fill();
          c.fillStyle = '#ffffff'; for (let d = 0.4; d < 7; d += 0.7 + R() * 0.5) { c.beginPath(); c.arc(X(e(d) - sg * 0.05), Y(ly - d), s * (0.14 + R() * 0.12), 0, TAU); c.fill(); }
        }
      }
      // 雪地亮邊
      for (const [xa, xb] of runs) for (const [pa, pb] of [[xa, Math.min(xb, la)], [Math.max(xa, lb), xb]]) {
        if (pb <= pa) continue;
        c.beginPath(); gline(c, pa, pb); for (let x = pb; x >= pa; x -= 0.5) c.lineTo(X(x), Y(groundYRaw(x) - 0.75 - 0.25 * Math.sin(x * 1.3) - 0.12 * Math.sin(x * 3.1))); c.closePath(); c.fillStyle = '#f8f9ff'; c.fill();
      }
      // 雪裡冒出來的小水晶
      for (const [x, dy, P, k] of [[-19, 0, VIO, 1], [-12.5, -0.1, CYA, 0.8], [-5.5, 0, PNK, 0.9], [36.3, 0, CYA, 0.75], [75.3, 0, VIO, 0.8], [111.5, 0, CYA, 0.9], [117, -0.1, PNK, 0.75], [125, 0, VIO, 1], [133, 0, CYA, 0.85],
        [-15, -6.4, CYA, 1.1], [9, -7.2, VIO, 0.9], [27.5, -6.5, PNK, 0.8], [84, -6.8, CYA, 0.9], [102, -7.3, VIO, 1], [128, -6, PNK, 1.1]]) {
        const y = groundYRaw(x) + dy - 0.15;
        glow(c, X(x), Y(y + 0.6 * k), s * 2.4 * k, s * 1.6 * k, P[4], 0.35);
        for (const [dx, h, w, a] of [[0, 1.9, 0.62, (R() - 0.5) * 0.2], [-0.55, 1.15, 0.48, -0.42], [0.6, 1.3, 0.5, 0.38], [0.15, 0.7, 0.4, 0.1]]) crystal(c, X(x + dx * k), Y(y), h * k * s, w * k * s, a, P, 0, x < MX ? 1 : -1);
        c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(X(x), Y(y) + s * 0.1, s * 1.1 * k, s * 0.28 * k, 0, 0, TAU); c.fill();
      }
      // 雪面的閃光
      c.fillStyle = '#ffffff';
      for (let k = 0; k < 70; k++) { const x = lerp(XA, XB, R()), y = groundYRaw(x) - 0.9 - R() * 6, r = Math.max(0.7, s * (0.05 + R() * 0.06)); c.globalAlpha = 0.5 + R() * 0.5; if (x < la - 5 || x > lb + 5) c.fillRect(X(x) - r, Y(y) - r, r * 2, r * 2); }
      c.globalAlpha = 1;
      c.fillStyle = lg(c, 0, Y(-5.5), 0, V.H, [0, 'rgba(60,70,170,0)', 1, 'rgba(60,70,170,.3)']); c.fillRect(0, Y(-5.5), V.W, V.H - Y(-5.5));
    },
    init() {
      const s = V.s, R = mkRand(1212), top = V.top, xa = V.x0 - 7, xb = V.x1 + 7, key = [V.W, V.H, s, V.x0, top].join();
      // 極光：青綠的從左、紫紅的從右掃上來，在中間高處交會、淡下去；畫兩張交替明暗
      const MINT = [0, 70, 255, 176, 0.14, 40, 226, 232, 0.38, 104, 136, 255, 0.68, 184, 92, 255, 1, 255, 92, 210], ROSE = [0, 196, 150, 255, 0.18, 172, 104, 255, 0.5, 255, 96, 220, 1, 255, 130, 200];
      const env1 = (x) => 0.22 + 0.78 * sm((44 - x) / 36), base1 = (x) => 46.6 + 8.4 * sm((x - 2) / 32) + 1.1 * Math.sin(x * 0.07 + 0.6) + 0.5 * Math.sin(x * 0.16 + 2.1);
      const env2 = (x) => 0.22 + 0.78 * sm((x - 72) / 34), base2 = (x) => 46 + 8.8 * sm((118 - x) / 32) + 1.1 * Math.sin(x * 0.065 + 2.4) + 0.5 * Math.sin(x * 0.15);
      if (key !== ribKey) {     // 畫面大小沒變就沿用
        ribKey = key; aurY1 = Math.max(top + 2, 70);
        aur = [31, 47].map((seed, k) => aurora(xa, xb, 40, aurY1, [{ base: base1, env: env1, h: 10 - k * 0.6, cols: MINT }, { base: base2, env: env2, h: 10.5 - k * 0.5, cols: ROSE }], seed));
        aurDy = new Int16Array(aur[0].n);
      }
      aurX = Math.round(X(xa)); aurY = Math.round(Y(aurY1));
      // 會眨的星星、冰面和水晶尖的反光
      spStar = starSprite(Math.max(8, Math.round(s * 2.6)), '#d8e8ff');
      const sr = spStar.width * 0.5, lk = lake(), tw = (x, y, r, w, e) => twk.push({ x: X(x), y: Y(y), r, w, p: R() * TAU, e });
      twk = [];
      for (let k = 0; k < 9; k++) { const x = lerp(V.x0 + 2, V.x1 - 2, (k + R()) / 9), y = 30 + R() * (top - 32); if (Math.hypot(x - MX, y - MY) > 20) tw(x, y, sr * (0.55 + R() * 0.45) * (x > 33 && x < 80 ? 0.6 : 1), 0.9 + R() * 1.6, 2); }
      const GL = [[-6, -0.6], [36.8, -1.2], [75.8, -1.1], [112.5, -0.9], [124, -0.6]];
      if (lk) GL.push([lk[0] + 4, lk[2] - 1.5], [MX - 1.2, lk[2] - 2.2], [MX + 1.4, lk[2] - 4.6], [lk[1] - 5, lk[2] - 3.4]);
      for (const [x, y] of GL) tw(x, y, sr * (0.45 + R() * 0.2), 1 + R() * 1.1, 8);
      for (const [x, y, k] of [[-4.4, 34, 1], [120.2, 31, 1], [39.9, 13.1, 0.6], [68.6, 11.4, 0.6]]) tw(x, y, sr * k, 0.7 + R() * 0.5, 6);
      // 水晶叢的光一明一暗（先畫成畫面上的大小）
      pulses = [];
      for (const [x, y, r, col] of [[-3, 18, 14, '#ae94ff'], [119, 16, 13, '#80e6ff'], [40.5, 6, 6, '#ae94ff'], [68, 5.5, 5.5, '#80e6ff']]) if (x + r > V.x0 && x - r < V.x1) pulses.push({ x: Math.round(X(x - r)), y: Math.round(Y(y + r)), sp: dotSprite(Math.round(r * 2 * s), [0, rgba(col, 0.9), 0.4, rgba(col, 0.35), 1, rgba(col, 0)]), w: 0.4 + R() * 0.3, p: R() * TAU });
      // 前景的光點和雪
      spMote = ['#ffffff', '#9ff4ff', '#d4b8ff'].map((col) => starSprite(Math.max(6, Math.round(s * 1.5)), col));
      spFlake = dotSprite(Math.max(4, Math.round(s * 0.5)), [0, 'rgba(255,255,255,1)', 0.35, 'rgba(255,255,255,.85)', 1, 'rgba(255,255,255,0)']);
      const rnd = Math.random;
      motes = []; for (let k = 0; k < 30; k++) motes.push({ x: lerp(V.x0, V.x1, rnd()), y: lerp(-8, top, rnd()), v: 0.25 + rnd() * 0.4, w: 0.5 + rnd() * 1.4, p: rnd() * TAU, k: (rnd() * 3) | 0, r: 0.5 + rnd() * 0.5 });
      flakes = []; for (let k = 0; k < 24; k++) flakes.push({ x: lerp(V.x0, V.x1, rnd()), y: lerp(-9, top, rnd()), v: 1.2 + rnd() * 1.3, a: 0.4 + rnd() * 0.9, w: 0.5 + rnd() * 1.2, p: rnd() * TAU, r: 0.6 + rnd() * 0.5 });
      shoot = null; shootAt = 6 + rnd() * 6;
    },
    back(c, t, dt) {
      const s = V.s;
      c.globalCompositeOperation = 'lighter';
      // 極光：每片切片照波形上下錯開，像緞帶在飄
      if (aur) {
        const n = aur[0].n, dy = aurDy, sway = Math.round(Math.sin(t * 0.05) * s * 0.8), br = 0.9 * (0.86 + 0.14 * Math.sin(t * 0.23));
        for (let i = 0; i < n; i++) { const x = V.x0 - 7 + (i + 0.5) * AW / s; dy[i] = Math.round(s * lerp(0.75 * Math.sin(x * 0.06 - t * 0.3) + 0.25 * Math.sin(x * 0.14 + t * 0.42), 0.8 * Math.sin(x * 0.055 + t * 0.26 + 2) + 0.25 * Math.sin(x * 0.13 - t * 0.38), sm((x - 36) / 44))); }
        for (let v = 0; v < (FX.low ? 1 : 2); v++) {     // 太慢的時候只貼一張
          const A = aur[v], a = FX.low ? br : br * (0.5 + (v ? -1 : 1) * 0.32 * Math.sin(t * 0.37)); if (a < 0.02) continue;
          c.globalAlpha = a;
          for (let i = 0; i < n; i++) { const y0 = A.ext[i * 2], h = A.ext[i * 2 + 1] - y0, sx = i * AW, sw = Math.min(AW, A.cv.width - sx); if (h > 0) c.drawImage(A.cv, sx, y0, sw, h, aurX + sx + sway, aurY + y0 + dy[i], sw, h); }
        }
      }
      for (const g of pulses) { c.globalAlpha = 0.2 + 0.13 * Math.sin(t * g.w + g.p); c.drawImage(g.sp, g.x, g.y); }
      for (const k of twk) { const u = 0.5 + 0.5 * Math.sin(t * k.w + k.p), r = k.r * (0.6 + 0.4 * u); c.globalAlpha = k.e > 2 ? Math.pow(u, k.e) : 0.12 + 0.88 * u * u; c.drawImage(spStar, k.x - r, k.y - r, r * 2, r * 2); }
      // 偶爾一顆流星（不經過中間）
      if (!shoot && t > shootAt) { const d = Math.random() < 0.5 ? -1 : 1; shoot = { x: d < 0 ? lerp(V.x0 + 4, 24, Math.random()) : lerp(94, V.x1 - 4, Math.random()), y: Math.min(V.top - 3, 58) - Math.random() * 4, d, t0: t }; }
      if (shoot) {
        const u = (t - shoot.t0) / 0.9, k = Math.min(1, u * 3), x = X(shoot.x + shoot.d * u * 9), y = Y(shoot.y - u * 5), hx = x - shoot.d * s * 5.6 * k, hy = y - s * 3.2 * k;
        if (u > 1) { shoot = null; shootAt = t + 10 + Math.random() * 14; }
        else { c.globalAlpha = Math.sin(u * Math.PI); c.strokeStyle = lg(c, hx, hy, x, y, [0, 'rgba(200,230,255,0)', 1, 'rgba(240,250,255,.9)']); c.lineWidth = Math.max(1, s * 0.14); c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, hy); c.lineTo(x, y); c.stroke(); c.drawImage(spStar, x - s * 0.9, y - s * 0.9, s * 1.8, s * 1.8); }
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    },
    front(c, t, dt) {
      const wind = S.wind, wrap = (o, y0) => { if (o.y < -10 || o.y > V.top + 2) { o.y = y0; o.x = lerp(V.x0, V.x1, Math.random()); } if (o.x > V.x1 + 2) o.x = V.x0 - 2; else if (o.x < V.x0 - 2) o.x = V.x1 + 2; };
      c.globalAlpha = 0.6;
      for (const f of flakes) {
        f.x += (Math.sin(t * f.w + f.p) * f.a + wind * 0.4) * dt; f.y -= f.v * dt; wrap(f, V.top + 1.5);
        const r = spFlake.width * 0.5 * f.r; c.drawImage(spFlake, X(f.x) - r, Y(f.y) - r, r * 2, r * 2);
      }
      // 光點在中間淡一點，不跟瞄準虛線搶
      c.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        m.x += (Math.sin(t * m.w * 0.5 + m.p) * 0.5 + wind * 0.15) * dt; m.y += m.v * dt; wrap(m, -9);
        const u = 0.5 + 0.5 * Math.sin(t * m.w * 2 + m.p), sp = spMote[m.k], r = sp.width * 0.5 * m.r * (0.6 + 0.4 * u);
        c.globalAlpha = (0.15 + 0.7 * u * u * u) * (m.x > 33 && m.x < 67 && m.y > 20 ? 0.4 : 1); c.drawImage(sp, X(m.x) - r, Y(m.y) - r, r * 2, r * 2);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  };
})();
