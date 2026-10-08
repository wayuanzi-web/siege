/* ===== 36-scene-bamboo: 第六關「竹海吊樓」— 灕江的清晨：霧裡的石灰岩峰和月亮山、兩岸竹林、往右流的碧綠大河，竹筏漁翁、白鷺、蜻蜓、飄落的竹葉 ===== */
THEMES[6] = (function () {
  const XA = -52, XB = 180, SUNX = 1.2, SUNY = 45;
  // 天色（高度 → 顏色）：淡藍 → 帶綠的霧白 → 地平線偏暖
  const SKY = [92, '#62a9e4', 66, '#80bdea', 50, '#a3d0ee', 36, '#c5e3ec', 24, '#dbeee6', 14, '#ecf2dd', 6, '#f6eed6', -4, '#f9e7cf'];
  const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }, lw = (k) => Math.max(1, V.s * k);
  // 對岸的岸線；左邊低下去，河從我方那岸的竹林後面彎出來
  const shore = (x) => 2 + 0.22 * Math.sin(x * 0.13) + 0.14 * Math.sin(x * 0.31 + 2) - 3 * (1 - sm((x - 37) / 9));
  const MOON = { x: 50.5, h: 15, wl: 6.8, wr: 7.4, a: 2.3, b: 0.5, ph: 1.3, hole: [0.7, 10.3, 2.3, 2.6], keep: 8 };   // 月亮山（山上穿一個洞）
  let clouds = [], mists = [], wisps = [], leaves = [], flies = [], fish = [], birds = [], edges = [], raft = null, spLeaf = [], spMist = null, spFish = null, spRaft = null;

  // 柔邊的橢圓光（像素座標）
  const lx = (h, r) => (h ? (h > 1 ? lerp(V.x0, V.x1, r) : lerp(100, V.x1 + 2, r)) : lerp(V.x0 - 4, 6, r));   // 竹葉從左、右的竹子或隨處落下
  const drift = (c, L, dt) => { for (const m of L) { m.x += m.v * dt; if (m.x > V.x1 + 2) m.x = V.x0 - m.w - 2; c.globalAlpha = m.a; c.drawImage(spMist, X(m.x), Y(m.y + m.h / 2), m.w * V.s, m.h * V.s); } };
  function glow(c, x, y, rx, ry, col, a) { c.save(); c.translate(x, y); c.scale(rx, ry); c.fillStyle = rg(c, 0, 0, 0, 1, [0, rgba(col, a), 0.5, rgba(col, a * 0.45), 1, rgba(col, 0)]); c.fillRect(-1, -1, 2, 2); c.restore(); }
  // 竹葉（像素座標）：葉柄 (x, y)、方向 a、長 L、寬 w；一簇 n 片
  function leaf(c, x, y, a, L, w) {
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa * w, ny = ca * w;
    c.moveTo(x, y); c.quadraticCurveTo(x + ca * L * 0.38 + nx, y + sa * L * 0.38 + ny, x + ca * L, y + sa * L); c.quadraticCurveTo(x + ca * L * 0.42 - nx * 0.6, y + sa * L * 0.42 - ny * 0.6, x, y);
  }
  function spray(c, R, x, y, a, L, n) { for (let k = 0; k < n; k++) { const l = L * (0.7 + R() * 0.45); leaf(c, x, y, a + (k - (n - 1) / 2) * 0.32 + (R() - 0.5) * 0.25, l, l * 0.22); } }
  // 圓石（像素座標，底部中央），頂上青苔
  function stone(c, px, py, w, h, a, b, d, edge) {
    c.beginPath(); c.moveTo(px - w, py); c.bezierCurveTo(px - w, py - h * 1.3, px + w, py - h * 1.3, px + w, py); c.closePath();
    c.fillStyle = lg(c, px - w, py - h, px + w, py, [0, a, 0.55, b, 1, d]); c.fill(); if (edge) { c.strokeStyle = edge; c.lineWidth = lw(0.1); c.stroke(); }
    c.fillStyle = 'rgba(104,166,76,.8)'; c.beginPath(); c.ellipse(px - w * 0.15, py - h * 0.9, w * 0.5, h * 0.22, -0.1, 0, TAU); c.fill();
  }

  // 石灰岩峰：圓頂、陡壁、山腳外擴（u：離中線幾個半寬）
  const kY = (p, u) => { const au = Math.abs(u), core = au < 1 ? Math.pow(1 - Math.pow(au, p.a), p.b) : 0; return p.h * (Math.max(core, 0.2 * Math.max(0, 1 - Math.pow(au / 1.7, 2))) + 0.03 * Math.sin(u * 8 + p.ph) * core); };
  const kX = (p, u) => p.x + u * (u < 0 ? p.wl : p.wr);
  function kPath(c, p, yb) {
    c.beginPath(); c.moveTo(X(kX(p, -1.7)), Y(yb - 6));
    for (let u = -1.7; u <= 1.7001; u += 0.05) c.lineTo(X(kX(p, u)), Y(yb + kY(p, u)));
    c.lineTo(X(kX(p, 1.7)), Y(yb - 6)); c.closePath();
    if (p.hole) { const o = p.hole, hx = X(p.x + o[0]), hy = Y(yb + o[1]); c.moveTo(hx + o[2] * V.s, hy); c.ellipse(hx, hy, o[2] * V.s, o[3] * V.s, 0, 0, TAU); }
  }
  // 一排山：高的先畫，左亮右暗；det 加岩紋、樹叢；山腳一層霧
  function kLayer(c, R, o) {
    const s = V.s, P = o.add ? o.add.slice() : [];
    for (let x = XA + R() * o.gap; x < XB; x += o.gap * (0.55 + R() * 0.9)) {
      const h = lerp(o.h0, o.h1, R()) * o.env(x), w = h * lerp(o.w0, o.w1, R()), wl = w * (0.8 + R() * 0.4), wr = w * (0.8 + R() * 0.4), a = 1.8 + R() * 1.4, b = 0.42 + R() * 0.3, ph = R() * TAU;
      if (!P.some((q) => q.keep && Math.abs(q.x - x) < q.keep)) P.push({ x, h, wl, wr, a, b, ph });
    }
    P.sort((p, q) => q.h - p.h);
    for (const p of P) {
      const top = Y(o.yb + p.h), x0 = X(kX(p, -1.7)), x1 = X(kX(p, 1.7));
      kPath(c, p, o.yb); c.fillStyle = lg(c, 0, top, 0, Y(o.yb), [0, o.top, 1, o.bot]); c.fill('evenodd');
      c.save(); c.clip('evenodd');
      c.fillStyle = lg(c, X(p.x - p.wl), 0, X(p.x + p.wr), 0, [0, rgba(o.lit, o.la), 0.4, rgba(o.lit, 0), 0.6, rgba(o.dk, 0), 1, rgba(o.dk, o.da)]); c.fillRect(x0, top - 2, x1 - x0, Y(o.yb - 6) - top + 2);
      if (o.det) {
        c.strokeStyle = rgba(o.dk, 0.3); c.lineWidth = lw(0.13); c.beginPath();
        for (let k = 0; k < 4; k++) { const u = -0.75 + R() * 1.5, y0 = o.yb + kY(p, u) * (0.85 - R() * 0.2), x = kX(p, u); c.moveTo(X(x), Y(y0)); c.quadraticCurveTo(X(x + u * 0.5), Y((y0 + o.yb) / 2), X(x + u * 1.1), Y(o.yb + p.h * 0.1)); }
        c.stroke();
        for (let k = 0, n = 5 + ((p.h * 1.1) | 0); k < n; k++) {
          const u = (R() - 0.5) * 1.8, py = Y(o.yb + kY(p, u) * (0.2 + R() * 0.72)), r = s * (0.3 + R() * 0.35), x = X(kX(p, u * 0.92));
          c.fillStyle = o.veg; c.beginPath(); c.arc(x - r * 0.6, py + r * 0.1, r * 0.75, 0, TAU); c.arc(x + r * 0.55, py + r * 0.15, r * 0.7, 0, TAU); c.arc(x, py - r * 0.35, r, 0, TAU); c.fill();
          c.fillStyle = o.vegHi; c.beginPath(); c.arc(x - r * 0.3, py - r * 0.55, r * 0.5, 0, TAU); c.fill();
        }
      }
      c.restore();
    }
    c.fillStyle = lg(c, 0, Y(o.yb + o.mh), 0, Y(o.yb - 0.6), [0, rgba(o.mist, 0), 1, rgba(o.mist, o.ma)]); c.fillRect(0, Y(o.yb + o.mh), V.W, (o.mh + 0.6) * s);
    c.fillStyle = rgba(o.mist, o.ma); c.fillRect(0, Y(o.yb - 0.6), V.W, V.H);
  }

  // 遠岸的一叢竹：竹竿散開、梢頭彎垂，墊一團暗綠再掛三層竹葉
  const GO = { sp: 2.6, cw: 0.15, L: 0.8, cul: '#86b38a', ring: '#cfe6bf', mass: 'rgba(94,142,104,.5)', lv: ['#6a9c78', '#8dbd89', '#c3e1a5'], k: [5, 4, 3] };
  const GB = { sp: 2.4, cw: 0.12, L: 0.66, cul: '#a4c4ad', ring: '#d6e8d4', mass: 'rgba(132,170,146,.45)', lv: ['#93b9a0', '#aacbae', '#cfe4c4'], k: [4, 3, 2] };
  function grove(c, R, x, yb, h, n, o) {
    const s = V.s, cs = [];
    if (x + h * 0.6 + o.sp < V.x0 - 2 || x - h * 0.6 - o.sp > V.x1 + 2) return;
    for (let k = 0; k < n; k++) { const dx = (R() - 0.5) * o.sp, hh = h * (0.62 + R() * 0.38); cs.push([x + dx, hh, dx / o.sp * 1.3 + (R() - 0.5) * 0.35]); }
    const pt = (q, t) => { const u = 1 - t, x1 = q[0] + q[2] * q[1] * 0.04, y1 = yb + q[1] * 0.62, x2 = q[0] + q[2] * q[1] * 0.5, y2 = yb + q[1]; return [X(u * u * q[0] + 2 * u * t * x1 + t * t * x2), Y(u * u * yb + 2 * u * t * y1 + t * t * y2)]; };
    c.fillStyle = o.mass; c.beginPath();
    for (const q of cs) for (let t = 0.55; t < 1; t += 0.11) { const p = pt(q, t), r = s * o.L * (0.75 + R() * 0.4); c.moveTo(p[0] + r, p[1] + r * 0.5); c.arc(p[0], p[1] + r * 0.5, r, 0, TAU); }
    c.fill();
    c.strokeStyle = o.cul; c.lineWidth = lw(o.cw); c.lineCap = 'round'; c.beginPath();
    for (const q of cs) { c.moveTo(X(q[0]), Y(yb)); for (let t = 0.1; t <= 1.001; t += 0.1) { const p = pt(q, t); c.lineTo(p[0], p[1]); } }
    c.stroke();
    c.strokeStyle = o.ring; c.lineWidth = lw(0.07); c.beginPath();
    for (const q of cs) for (let t = 0.06 + R() * 0.05; t < 0.6; t += 1.3 / q[1]) { const p = pt(q, t), hw = s * o.cw * 0.75; c.moveTo(p[0] - hw, p[1]); c.lineTo(p[0] + hw, p[1]); }
    c.stroke();
    for (let pass = 0; pass < 3; pass++) {
      c.beginPath();
      for (const q of cs) for (let t = 0.36 + R() * 0.08; t < 1.01; t += 0.065 + pass * 0.035) {
        const p = pt(q, Math.min(1, t)), sd = R() < 0.5 + q[2] * 0.4 ? 1 : -1;
        if (pass === 2 && sd > 0 && R() < 0.75) continue;
        spray(c, R, p[0], p[1], Math.PI / 2 - sd * (0.3 + R() * 0.8), o.L * s * (t > 0.9 ? 1.25 : 1), o.k[pass]);
      }
      c.fillStyle = o.lv[pass]; c.fill();
    }
  }

  // 近處的大竹竿：越上越細，竹節一亮一暗，上半截掛竹葉
  const PN = { body: '#5f9b4d', hi: '#a6d77c', dk: '#3f7a3b', ring: '#e2f0bc', node: '#2f5e2e', twig: '#4c7f3c', lv: ['#2f7440', '#4c9848', '#8ccb68'], L: 1.4 };
  function bigCulm(c, R, x, yb, h, w0, ln, P) {
    const s = V.s, N = 70, x1 = x + ln * h * 0.08, y1 = yb + h * 0.55, x2 = x + ln * h * 0.55, y2 = yb + h;
    if (Math.max(x, x2) + 7 < V.x0 || Math.min(x, x2) - 7 > V.x1) return;
    const at = (t) => { const u = 1 - t, dx = u * (x1 - x) + t * (x2 - x1), dy = u * (y1 - yb) + t * (y2 - y1), l = Math.hypot(dx, dy); return [u * u * x + 2 * u * t * x1 + t * t * x2, u * u * yb + 2 * u * t * y1 + t * t * y2, dy / l, -dx / l, w0 * (1 - 0.55 * t), dx / l, dy / l]; };
    const Q = []; for (let i = 0; i <= N; i++) Q.push(at(i / N));
    const strip = (a, b, col) => { c.beginPath(); for (const q of Q) c.lineTo(X(q[0] + q[2] * q[4] * a), Y(q[1] + q[3] * q[4] * a)); for (let i = N; i >= 0; i--) { const q = Q[i]; c.lineTo(X(q[0] + q[2] * q[4] * b), Y(q[1] + q[3] * q[4] * b)); } c.closePath(); c.fillStyle = col; c.fill(); };
    strip(-0.5, 0.5, P.body); strip(-0.36, -0.1, P.hi); strip(0.2, 0.5, P.dk);
    const twigs = [], anchors = []; c.lineCap = 'butt';
    for (let d = 1 + R() * 2; d < h; d += w0 * (4.2 + R() * 1.4)) {
      const t = d / h, q = at(t), ex = q[2] * q[4] * 0.62, ey = q[3] * q[4] * 0.62;
      for (const [col, o, k] of [[P.ring, 0.13, 0.22], [P.node, 0, 0.13]]) { c.strokeStyle = col; c.lineWidth = lw(q[4] * k); c.beginPath(); c.moveTo(X(q[0] - ex - q[5] * o), Y(q[1] - ey - q[6] * o)); c.lineTo(X(q[0] + ex - q[5] * o), Y(q[1] + ey - q[6] * o)); c.stroke(); }
      if (t > 0.36) twigs.push(q);
    }
    let side = R() < 0.5 ? 1 : -1;
    c.strokeStyle = P.twig; c.lineWidth = lw(0.09); c.lineCap = 'round'; c.beginPath();
    for (const q of twigs) {
      side = -side; const len = 1.8 + R() * 2.6, sn = Math.sin(side * (0.55 + R() * 0.45)), mx = q[0] + sn * len * 0.45, my = q[1] + len * 0.55, ex = q[0] + sn * len, ey = q[1] + len * 0.45;
      c.moveTo(X(q[0]), Y(q[1])); c.quadraticCurveTo(X(mx), Y(my), X(ex), Y(ey));
      for (const f of [0.4, 0.72, 1]) { const u = 1 - f; anchors.push([u * u * q[0] + 2 * u * f * mx + f * f * ex, u * u * q[1] + 2 * u * f * my + f * f * ey, side]); }
    }
    c.stroke();
    for (let pass = 0; pass < 3; pass++) {
      c.beginPath();
      for (const [ax, ay, sd] of anchors) { if (pass === 2 && sd > 0 && R() < 0.6) continue; spray(c, R, X(ax), Y(ay), Math.PI / 2 - sd * (0.35 + R() * 0.7), P.L * s, [6, 4, 3][pass]); }
      c.fillStyle = P.lv[pass]; c.fill();
    }
  }

  // 遠岸的吊腳樓
  function house(c, x, yb, w) {
    const s = V.s, hb = yb + w * 0.34, ht = hb + w * 0.4, px = (u) => X(x + u * w);
    c.fillStyle = '#a99d84'; for (let k = 0; k < 4; k++) c.fillRect(px(-0.4 + k * 0.26) - s * 0.07, Y(hb), s * 0.14, (hb - yb) * s);
    c.fillRect(px(-0.45), Y(ht), w * 0.9 * s, (ht - hb) * s);
    c.fillStyle = '#7f7666'; c.beginPath(); c.moveTo(px(-0.62), Y(ht - w * 0.03)); c.quadraticCurveTo(px(-0.46), Y(ht + w * 0.02), px(-0.3), Y(ht + w * 0.3)); c.lineTo(px(0.3), Y(ht + w * 0.3)); c.quadraticCurveTo(px(0.46), Y(ht + w * 0.02), px(0.62), Y(ht - w * 0.03)); c.fill();
    c.fillStyle = 'rgba(70,52,30,.55)'; c.fillRect(px(-0.1), Y(ht - w * 0.1), w * 0.22 * s, w * 0.16 * s);
  }
  // 竹筏：漁翁撐篙、兩隻鸕鶿（小圖，原點在吃水線中間）
  function raftSprite(s) {
    const ox = 2.8 * s, oy = 3.6 * s, cv = mkCanvas(6.4 * s, 4.6 * s), g = cv.getContext('2d');
    const F = (col, p) => { g.fillStyle = col; poly(g, p); g.fill(); };
    g.translate(ox, oy); g.scale(s, s); g.lineCap = 'round';
    g.strokeStyle = '#6f5a3a'; g.lineWidth = 0.13; g.beginPath(); g.moveTo(-0.55, -1.15); g.lineTo(-2.3, 0.75); g.stroke();
    g.fillStyle = '#c4a466'; g.beginPath(); g.moveTo(-1.8, 0.06); g.lineTo(1.35, 0.06); g.quadraticCurveTo(1.85, 0.02, 2.05, -0.5); g.lineTo(1.82, -0.56); g.quadraticCurveTo(1.6, -0.3, 1.3, -0.28); g.lineTo(-1.8, -0.28); g.fill();
    F('#9c7a42', [-0.05, -0.28, 0.45, -0.28, 0.5, -0.62, -0.1, -0.62]);
    F('#3f5c7a', [-1.15, -0.28, -0.7, -0.28, -0.72, -1.25, -0.92, -1.34, -1.12, -1.25]);
    g.strokeStyle = '#3f5c7a'; g.lineWidth = 0.16; g.beginPath(); g.moveTo(-0.8, -1.12); g.lineTo(-0.55, -0.98); g.stroke();
    g.fillStyle = '#e2b88e'; g.beginPath(); g.arc(-0.92, -1.42, 0.15, 0, TAU); g.fill();
    F('#e8cc84', [-1.5, -1.42, -0.92, -1.86, -0.34, -1.42, -0.92, -1.48]);
    for (const [x, k] of [[0.95, 1], [1.5, 0.85]]) {
      g.fillStyle = g.strokeStyle = '#24282e'; g.lineWidth = 0.09 * k;
      g.beginPath(); g.ellipse(x, -0.48 * k, 0.24 * k, 0.17 * k, -0.5, 0, TAU); g.moveTo(x + 0.2 * k, -1.04 * k); g.arc(x + 0.12 * k, -1.04 * k, 0.08 * k, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(x + 0.1 * k, -0.6 * k); g.quadraticCurveTo(x + 0.22 * k, -0.85 * k, x + 0.1 * k, -1.02 * k); g.stroke();
      g.strokeStyle = '#e0b040'; g.lineWidth = 0.04; g.beginPath(); g.moveTo(x + 0.18 * k, -1.04 * k); g.lineTo(x + 0.34 * k, -1.0 * k); g.stroke();
    }
    return { cv, ox, oy };
  }

  return {
    key: 'bamboo',
    build(c, W, H) {
      const s = V.s; let R = mkRand(601);
      c.fillStyle = lg(c, 0, Y(92), 0, Y(-4), SKY.map((v, i) => (i & 1 ? v : (92 - v) / 96))); c.fillRect(0, 0, W, H);
      // 太陽在左上；晨光從左邊來，左半邊的天暖一點
      const sx = X(SUNX), sy = Y(SUNY);
      c.fillStyle = rg(c, sx, sy, 0, s * 70, [0, 'rgba(255,244,212,.8)', 0.07, 'rgba(255,236,192,.45)', 0.25, 'rgba(255,228,180,.17)', 0.55, 'rgba(255,226,186,.05)', 1, 'rgba(255,226,186,0)']); c.fillRect(0, 0, W, H);
      c.fillStyle = lg(c, X(-20), 0, X(60), 0, [0, 'rgba(255,226,170,.22)', 1, 'rgba(255,226,170,0)']); c.fillRect(0, 0, W, H);
      c.fillStyle = rg(c, sx, sy, s * 2.6, s * 4.6, [0, 'rgba(255,252,236,.9)', 1, 'rgba(255,246,220,0)']); c.beginPath(); c.arc(sx, sy, s * 4.6, 0, TAU); c.fill();
      c.fillStyle = '#fffdf3'; c.beginPath(); c.arc(sx, sy, s * 3, 0, TAU); c.fill();
      c.lineCap = 'round';
      // 遠山三層：越遠越淡越藍，兩城之間矮一點
      const env = (lo) => (x) => 1 - lo * Math.exp(-Math.pow((x - 52) / 18, 2));
      kLayer(c, mkRand(611), { yb: 6, h0: 15, h1: 27, w0: 0.3, w1: 0.42, gap: 9, env: env(0.25), top: '#b4c9de', bot: '#dde9ec', lit: '#eef5fa', la: 0.4, dk: '#9cb0c8', da: 0.3, mist: '#e8f0ee', mh: 9, ma: 0.75 });
      kLayer(c, mkRand(612), { yb: 4, h0: 9, h1: 18, w0: 0.32, w1: 0.45, gap: 8, env: env(0.3), add: [MOON], top: '#90b2c3', bot: '#d3e4e2', lit: '#dcecee', la: 0.45, dk: '#7591aa', da: 0.3, mist: '#e6efea', mh: 7, ma: 0.7 });
      kLayer(c, mkRand(613), { yb: 2.5, h0: 6, h1: 12, w0: 0.36, w1: 0.5, gap: 7.5, env: env(0.45), det: 1, top: '#6c9c8b', bot: '#c2dacb', lit: '#b9ddba', la: 0.5, dk: '#4f7c78', da: 0.35, veg: '#4f8a6a', vegHi: '#89bf8f', mist: '#e4eee6', mh: 6, ma: 0.65 });
      // 遠處的河面（引擎畫的河水從 y = -1.6 開始）
      c.beginPath(); c.moveTo(X(34), Y(-2.1)); for (let x = 34; x <= XB; x += 0.5) c.lineTo(X(x), Y(Math.max(-2.1, shore(x)))); c.lineTo(X(XB), Y(-2.1));
      c.fillStyle = lg(c, 0, Y(2.3), 0, Y(-2.1), [0, '#d6ede4', 0.5, '#b2dccd', 1, '#93cbbb']); c.fill();
      // 竹林：後排淡、前排濃，兩城之間矮一點；河面上先畫倒影
      const HS = [[57.5, 2.6], [121.5, 3.2], [137, 3]], GV = [], GW = []; R = mkRand(621);
      for (let row = 0; row < 2; row++) for (let x = XA + row * 1.6; x < XB; x += (row ? 2.6 : 2.3) + R() * 2.4) {
        const mid = Math.exp(-Math.pow((x - 52) / 11, 2)), h = (6.5 + R() * 5) * (1 - 0.55 * mid) + (x > 108 ? 2.5 : 0) + (row ? 0 : 1.2), seed = (R() * 1e9) | 0, n = (row ? 6 : 4) + ((R() * (row ? 4 : 3)) | 0);
        if (row && HS.some((q) => Math.abs(q[0] - x) < q[1] * 0.9)) continue;
        (row ? GV : GW).push([x, (x < 37 ? groundYRaw(x) + 0.7 : shore(x) + 0.1) + (row ? 0 : 0.5), h, n, seed]);
      }
      for (const g of GV) if (g[0] > 39) glow(c, X(g[0]), Y(shore(g[0])), 2.6 * s, Math.min(3.6, g[2] * 0.42) * s, '#4f8462', 0.42);
      c.lineWidth = lw(0.1);
      for (let k = 0; k < 80; k++) { const x = lerp(39, XB, R()), y = Y(lerp(-1.9, shore(x) - 0.3, R())), w = s * (0.5 + R() * 2.2); c.strokeStyle = 'rgba(255,255,255,' + (0.22 + R() * 0.4).toFixed(2) + ')'; c.beginPath(); c.moveTo(X(x), y); c.lineTo(X(x) + w, y); c.stroke(); }
      // 對岸的草岸、水邊亮線
      c.beginPath(); for (let x = 36; x <= XB; x += 0.5) c.lineTo(X(x), Y(shore(x) + 0.35)); for (let x = XB; x >= 36; x -= 0.5) c.lineTo(X(x), Y(shore(x) - 0.3));
      c.fillStyle = '#9dbf8a'; c.fill();
      c.beginPath(); for (let x = 38; x <= XB; x += 0.5) c.lineTo(X(x), Y(shore(x) - 0.3)); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = lw(0.12); c.stroke();
      for (const g of GW) grove(c, mkRand(g[4]), g[0], g[1], g[2], g[3], GB);
      for (const [x, w] of HS) house(c, x, shore(x) + 0.05, w);
      for (const g of GV) grove(c, mkRand(g[4]), g[0], g[1], g[2], g[3], GO);
      // 兩邊的大竹子畫在兩張長條圖上：貼進背景，back() 每幀再蓋回雲霧前面
      for (const e of edges) e.cv.width = e.cv.height = 0;
      edges = []; R = mkRand(631);
      for (const side of [0, 1]) {
        const xa = side ? Math.floor(X(98)) : 0, xb = side ? W : Math.ceil(X(10)), cv = mkCanvas(xb - xa, H), g = cv.getContext('2d');
        g.translate(-xa, 0);
        for (let k = 8; k >= 0; k--) {   // 由外往內畫，靠近城樓的疊在前面
          const x = side ? 111.8 + k * (2.9 + k * 0.28) : -3.6 - k * (3 + k * 0.25), h = 84 + R() * 10, w = k ? 0.6 + R() * 0.14 : 0.52, ln = (side ? -1 : 1) * (k ? 0.06 + R() * 0.08 : 0.17);
          bigCulm(g, mkRand((R() * 1e9) | 0), x, (side ? shore(x) : groundYRaw(x)) + 0.4, h, w, ln, PN);
        }
        c.drawImage(cv, xa, 0); edges.push({ cv, x: xa });
      }
    },
    terrain(c) {
      const R = mkRand(641), s = V.s, gb = groundYRaw, XL = 41, XG = 41.6;
      // 水底（引擎會再蓋一層半透明的河水）
      c.beginPath(); c.moveTo(X(40.4), Y(-1.95)); c.lineTo(X(XB), Y(-1.95)); for (let x = XB; x >= 40.4; x -= 0.5) c.lineTo(X(x), Y(gb(x)));
      c.fillStyle = lg(c, 0, Y(-1.95), 0, Y(-9), [0, '#9bd3c2', 0.35, '#77b9a8', 0.8, '#55998b', 1, '#4a8a80']); c.fill();
      c.save(); c.clip();
      // 遠處的河床、水草影子、斜照進水裡的光
      c.beginPath(); c.moveTo(X(40), V.H); for (let x = 40; x <= XB; x += 1) c.lineTo(X(x), Y(-5.4 + 0.6 * Math.sin(x * 0.17) + 0.35 * Math.sin(x * 0.43 + 1))); c.lineTo(X(XB), V.H);
      c.fillStyle = lg(c, 0, Y(-4.4), 0, Y(-7), [0, 'rgba(176,196,150,0)', 0.4, 'rgba(170,186,140,.45)', 1, 'rgba(150,160,120,.7)']); c.fill();
      c.strokeStyle = 'rgba(60,120,96,.35)'; c.lineWidth = lw(0.18); c.lineCap = 'round'; c.beginPath();
      for (let k = 0; k < 40; k++) { const x = lerp(42, XB, R()), y0 = -5.6 + R() * 0.8, h = 1 + R() * 2.2, b = (R() - 0.3) * 0.8; c.moveTo(X(x), Y(y0)); c.quadraticCurveTo(X(x + b), Y(y0 + h * 0.5), X(x + b * 0.4), Y(y0 + h)); }
      c.stroke();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = lg(c, 0, Y(-1.9), 0, Y(-7.2), [0, 'rgba(220,255,230,.18)', 1, 'rgba(220,255,230,0)']);
      for (let k = 0; k < 10; k++) { const x0 = 41 + k * 14 + R() * 8, w = 1.2 + R() * 2.2; poly(c, [X(x0), Y(-1.9), X(x0 + w), Y(-1.9), X(x0 + w + 3.6), Y(-7.2), X(x0 + 2.4), Y(-7.2)]); c.fill(); }
      c.restore();
      // 地面：左岸泥土，河床是沙和卵石
      for (const [xa, xb] of groundRuns()) {
        c.beginPath(); traceGround(c, xa, xb, 0, true); c.lineTo(X(xb), V.H + 4); c.lineTo(X(xa), V.H + 4); c.closePath();
        c.fillStyle = lg(c, 0, Y(0), 0, V.H, [0, '#a47d50', 0.5, '#8a6640', 1, '#6c4e32']); c.fill();
        c.save(); c.clip();
        c.fillStyle = lg(c, X(XL - 1.5), 0, X(XL + 3.5), 0, [0, 'rgba(214,192,142,0)', 1, 'rgba(214,192,142,1)']); c.fillRect(X(XL - 1.5), 0, V.W, V.H);
        const PC = ['#d8c49a', '#b9a37b', '#a2a69c', '#c99c70', '#8f9e96', '#e4dbc0', '#aa8a66'];
        for (let k = 0; k < 340; k++) {
          const onBed = k < 260, x = onBed ? lerp(XL, XB, R()) : lerp(XA, XL, R()), y = gb(x) - (onBed ? R() * R() * 2.2 : 0.8 + R() * 7), rx = s * (onBed ? 0.2 + R() * 0.36 : 0.12 + R() * 0.2), ry = rx * (0.55 + R() * 0.25), px = X(x), py = Y(y);
          ell(c, px, py, rx, ry); c.fillStyle = onBed ? PC[(R() * PC.length) | 0] : 'rgba(196,160,112,.55)'; c.fill();
          if (onBed) { ell(c, px - rx * 0.25, py - ry * 0.3, rx * 0.45, ry * 0.35); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill(); }
        }
        c.restore();
      }
      for (const [x, w, h] of [[43.6, 1.4, 1.1], [52, 1.8, 1.1], [61.5, 1.2, 0.8], [73, 2, 1.2], [99, 1.6, 0.9], [113, 2.2, 1.3], [124, 1.5, 0.9], [138, 2, 1.1]]) stone(c, X(x), Y(gb(x)) + s * 0.3, w * s, h * s, '#b9b9a6', '#8e9184', '#646b62');
      c.lineWidth = lw(0.22);
      for (let k = 0; k < 26; k++) {
        const x = lerp(42.5, XB, R()), y0 = gb(x), n = 3 + ((R() * 3) | 0);
        for (let j = 0; j < n; j++) { const h = 1.2 + R() * 2.4, b = (R() - 0.3) * 1.4, x0 = x + (j - n / 2) * 0.25; c.strokeStyle = j & 1 ? '#5fae55' : '#3f8c48'; c.beginPath(); c.moveTo(X(x0), Y(y0)); c.bezierCurveTo(X(x0 + b), Y(y0 + h * 0.35), X(x0 - b * 0.6), Y(y0 + h * 0.7), X(x0 + b * 0.5), Y(y0 + h)); c.stroke(); }
      }
      // 我方這岸：草皮、城樓的影子、石頭、草叢、蘆葦
      c.beginPath(); traceGround(c, XA, XG, 0, true); traceGroundBack(c, XA, XG, -1.0); c.closePath();
      c.fillStyle = lg(c, 0, Y(0.5), 0, Y(-1.2), [0, '#8fd365', 0.45, '#6abb50', 1, '#4f9a45']); c.fill();
      c.beginPath(); traceGround(c, XA, XG, 0, true); c.strokeStyle = '#2f6b2e'; c.lineWidth = Math.max(1.5, s * 0.2); c.lineJoin = 'round'; c.stroke();
      c.beginPath(); traceGround(c, XA, XG - 0.3, -0.28, true); c.strokeStyle = 'rgba(214,255,170,.5)'; c.lineWidth = lw(0.15); c.stroke();
      glow(c, X(18.7), Y(-1.2), 17.5 * s, 1.9 * s, '#2d5a22', 0.32);
      for (const [x, w, h] of [[38.6, 1.1, 0.9], [40.3, 0.8, 0.6], [36.6, 0.6, 0.45]]) stone(c, X(x), Y(gb(x)) + s * 0.25, w * s, h * s, '#d4d2c0', '#a3a594', '#717868', '#4f5648');
      for (let x = XA + R(); x < XG; x += 0.6 + R() * 1.0) {
        const px = X(x), py = Y(gb(x)), h = s * (0.5 + R() * 0.9);
        c.fillStyle = R() < 0.5 ? '#9be36c' : '#6cc852';
        poly(c, [px - s * 0.26, py + 1, px - s * 0.1, py - h, px + s * 0.04, py + 1, px + s * 0.2, py - h * 0.75, px + s * 0.34, py + 1]); c.fill();
        if (R() < 0.12) { c.fillStyle = ['#ffffff', '#ffe066', '#ffb3cf'][(R() * 3) | 0]; c.beginPath(); c.arc(px + s * 0.5, py + s * (0.3 + R() * 0.4), lw(0.18), 0, TAU); c.fill(); }
      }
      c.strokeStyle = '#6f9a4a'; c.lineWidth = lw(0.12); c.fillStyle = '#a8865a';
      for (let k = 0; k < 14; k++) { const x = 37.2 + R() * 4.6, y0 = Math.max(gb(x), -1.7), h = 1.4 + R() * 2.2, b = 0.2 + R() * 0.6; c.beginPath(); c.moveTo(X(x), Y(y0)); c.quadraticCurveTo(X(x + b * 0.3), Y(y0 + h * 0.6), X(x + b), Y(y0 + h)); c.stroke(); if (k % 3 === 0) { ell(c, X(x + b), Y(y0 + h + 0.3), s * 0.12, s * 0.42, b * 0.3); c.fill(); } }
    },
    init() {
      const s = V.s, R = mkRand(651);
      clouds = [];
      for (let k = 0; k < 3; k++) { const w = s * (11 + k * 5 + R() * 6), h = w * (0.26 + R() * 0.06); clouds.push({ cv: cloudSprite(w, h, R, '#fffdf6', '#e6e8e0'), w: w / s, x: lerp(V.x0, V.x1, (k + R() * 0.6) / 3), y: [46, 58, 52][k] + R() * 3, v: 0.22 + R() * 0.25, a: 0.5 + R() * 0.12 }); }
      // 霧：河谷裡四團、貼著水面兩縷
      spMist = mkCanvas(256, 48); let g = spMist.getContext('2d');
      for (let j = 0; j < 9; j++) { const rx = 40 + R() * 50, ry = 7 + R() * 8, x = rx + 6 + R() * (244 - rx * 2), y = 24 + (R() - 0.5) * 14; g.save(); g.translate(x, y); g.scale(rx / ry, 1); g.fillStyle = rg(g, 0, 0, 0, ry, [0, 'rgba(246,250,246,.55)', 1, 'rgba(246,250,246,0)']); g.fillRect(-ry, -ry, ry * 2, ry * 2); g.restore(); }
      mists = [{ x: -20, y: 7.5, w: 50, h: 7, v: 0.35, a: 0.5 }, { x: 40, y: 5, w: 44, h: 5.5, v: 0.5, a: 0.45 }, { x: 95, y: 8.5, w: 56, h: 7, v: 0.3, a: 0.5 }, { x: 60, y: 2.6, w: 40, h: 3.5, v: 0.6, a: 0.4 }];
      wisps = [{ x: 30, y: 0.9, w: 36, h: 2.6, v: 0.7, a: 0.28 }, { x: 100, y: 0.2, w: 30, h: 2.2, v: 0.9, a: 0.22 }];
      spRaft = raftSprite(s); raft = { x: 58, p: R() * TAU };
      spFish = mkCanvas(s * 1.9, s * 0.8); g = spFish.getContext('2d'); g.scale(s * 1.6, s * 1.6); g.fillStyle = 'rgba(30,62,64,.85)';
      g.beginPath(); g.ellipse(0.5, 0.25, 0.36, 0.13, 0, 0, TAU); g.moveTo(0.84, 0.25); g.lineTo(1.12, 0.08); g.lineTo(1.1, 0.42); g.fill();
      fish = []; for (let k = 0; k < 6; k++) fish.push({ x: 48 + R() * 60, y: -3 - R() * 3, v: (R() < 0.5 ? -1 : 1) * (0.6 + R() * 0.6), p: R() * TAU });
      birds = [{ dy: 0, dx: 0, p: 0 }, { dy: 1.1, dx: 2.4, p: 1.7 }];
      spLeaf = [];
      for (const col of ['#79bb55', '#a2d064', '#cdbf5a']) { const w = Math.max(10, Math.round(s * 1.3)), h = Math.max(4, Math.round(s * 0.36)), cv = mkCanvas(w, h), lc = cv.getContext('2d'); lc.beginPath(); leaf(lc, 0.5, h / 2, 0, w - 1, h * 0.95); lc.fillStyle = col; lc.fill(); spLeaf.push(cv); }
      leaves = []; for (let k = 0; k < 11; k++) { const home = k < 5 ? 0 : k < 9 ? 1 : 2; leaves.push({ x: lx(home, R()), y: lerp(-6, V.top, R()), v: 0.9 + R() * 0.8, sp: 0.8 + R() * 1.2, p: R() * TAU, k: k % 3, home }); }
      flies = [{ x: 40, y: 3, tx: 40, ty: 3, w: 0, dir: 1, ph: 0, col: '#e0482c', eye: '#7a1c10' }, { x: 52, y: 1.5, tx: 52, ty: 1.5, w: 1.6, dir: -1, ph: 2, col: '#2b93b8', eye: '#1c4a66' }];
    },
    back(c, t, dt) {
      const s = V.s;
      for (const k of clouds) { k.x += k.v * dt; if (k.x > V.x1 + 2) k.x = V.x0 - k.w - 2; c.globalAlpha = k.a; c.drawImage(k.cv, X(k.x), Y(k.y)); }
      // 白鷺每 70 秒從敵城後面飛進我方城樓後面
      const bp = (t + 25) % 70;
      if (bp < 34) {
        const u = bp / 34; c.lineCap = c.lineJoin = 'round'; c.globalAlpha = Math.min(1, Math.min(u, 1 - u) * 12);
        for (const b of birds) {
          const f = Math.sin(t * 4.2 + b.p), ty = -1.3 * (0.1 + 0.55 * f), my = -1.3 * (0.45 + 0.25 * f);
          c.save(); c.translate(X(lerp(106, 6, u) + b.dx), Y(15.5 + b.dy + Math.sin(u * 5 + b.p) * 0.6)); c.scale(s, s);
          c.beginPath(); c.moveTo(-1.3, ty); c.quadraticCurveTo(-0.585, my, 0, 0); c.quadraticCurveTo(0.585, my, 1.3, ty);
          c.strokeStyle = 'rgba(90,110,110,.55)'; c.lineWidth = 0.32; c.stroke(); c.strokeStyle = c.fillStyle = '#fbfdf8'; c.lineWidth = 0.2; c.stroke();
          ell(c, -0.13, 0.05, 0.45, 0.13); c.fill();
          c.strokeStyle = '#3a3a30'; c.lineWidth = 0.07; c.beginPath(); c.moveTo(0.3, 0.08); c.lineTo(0.95, 0.18); c.moveTo(-0.5, 0); c.lineTo(-0.75, -0.12); c.stroke();
          c.restore();
        }
      }
      // 竹筏順水漂到敵城後面散進霧裡，再從上游出來
      raft.x += 0.32 * dt; if (raft.x > 104) raft.x = 47;
      const ra = clamp((raft.x - 47) / 5, 0, 1) * clamp((104 - raft.x) / 6, 0, 1), rx = X(raft.x), ry = Y(-0.35 + Math.sin(t * 1.3 + raft.p) * 0.05), sp = spRaft;
      if (ra > 0) { c.globalAlpha = ra * 0.3; c.save(); c.translate(rx, ry); c.scale(1, -0.55); c.drawImage(sp.cv, -sp.ox, -sp.oy); c.restore(); c.globalAlpha = ra * 0.92; c.drawImage(sp.cv, rx - sp.ox, ry - sp.oy); }
      drift(c, mists, dt);
      c.globalAlpha = 1;
      for (const e of edges) c.drawImage(e.cv, e.x, 0);
      // 水裡的小魚
      c.globalAlpha = 0.8;
      for (const f of fish) {
        f.x += f.v * dt; if (f.x < 46 || f.x > 108) { f.v = -f.v; f.x = clamp(f.x, 46, 108); }
        c.save(); c.translate(X(f.x), Y(f.y + Math.sin(t * 0.9 + f.p) * 0.25)); c.scale(f.v < 0 ? 1 : -1, 1); c.drawImage(spFish, -spFish.width / 2, 0); c.restore();
      }
      c.globalAlpha = 1;
    },
    front(c, t, dt) {
      const s = V.s, wind = 0.35 + S.wind * 0.3;
      drift(c, wisps, dt);
      // 竹葉一邊翻一邊晃
      c.globalAlpha = 0.9;
      for (const f of leaves) {
        f.y -= f.v * dt; f.x += (wind + Math.sin(t * f.sp + f.p) * 0.9) * dt;
        if (f.y < -9.5 || f.x > V.x1 + 3) { f.y = V.top + 1; f.x = lx(f.home, Math.random()); }
        const sp = spLeaf[f.k], sc = Math.cos(t * f.sp * 1.3 + f.p * 2);
        c.save(); c.translate(X(f.x), Y(f.y)); c.rotate(Math.sin(t * f.sp * 0.7 + f.p) * 1.1 + 0.4); c.scale(1, Math.abs(sc) < 0.2 ? (sc < 0 ? -0.2 : 0.2) : sc); c.drawImage(sp, -sp.width / 2, -sp.height / 2); c.restore();
      }
      c.globalAlpha = 1;
      // 蜻蜓：停在半空，忽然竄到別處
      for (const d of flies) {
        d.w -= dt; if (d.w <= 0) { d.tx = 37.5 + Math.random() * 21; d.ty = Math.random() * 5.5 - 0.3; d.w = 1.2 + Math.random() * 2.6; }
        const k = Math.min(1, dt * 3.2), L = s * 1.9, fl = 0.82 + 0.18 * Math.sin(t * 47 + d.ph);
        d.x += (d.tx - d.x) * k; d.y += (d.ty - d.y) * k; if (Math.abs(d.tx - d.x) > 0.4) d.dir = d.tx < d.x ? -1 : 1;
        c.save(); c.translate(X(d.x + Math.sin(t * 2.3 + d.ph) * 0.06), Y(d.y + Math.sin(t * 3.1 + d.ph) * 0.08)); c.scale(d.dir * L, L); c.rotate(-0.1);
        c.beginPath(); for (const [wx, sg, r] of [[0.22, -1, 0.3], [0.22, 1, -0.3], [0.1, -1, 0.42], [0.1, 1, -0.42]]) { const cy = sg * 0.26 * fl; c.moveTo(wx + 0.08, cy); c.ellipse(wx, cy, 0.075, 0.27 * fl, r, 0, TAU); }
        c.fillStyle = 'rgba(228,242,255,.72)'; c.fill(); c.strokeStyle = 'rgba(70,100,130,.55)'; c.lineWidth = 1 / L; c.stroke();
        c.strokeStyle = c.fillStyle = d.col; c.lineCap = 'round'; c.lineWidth = Math.max(1.5 / L, 0.07); c.beginPath(); c.moveTo(0.18, 0); c.lineTo(-0.6, 0.02); c.stroke();
        ell(c, 0.28, 0, 0.12, 0.065); c.fill();
        c.fillStyle = d.eye; c.beginPath(); c.arc(0.42, -0.035, 0.055, 0, TAU); c.arc(0.42, 0.035, 0.055, 0, TAU); c.fill();
        c.restore();
      }
    }
  };
})();
