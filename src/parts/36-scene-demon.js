/* ===== 36-scene-demon: 第十二關「魔王城」— 風暴眼底下的深淵：血月、黑曜石尖塔、兩座斷崖夾著無底的裂谷 ===== */
THEMES[5] = (function () {
  const VX = 90.5, VY = 50.6, VK = 0.38, VTILT = 0.07, VR = 22, VO = 60;   // 風暴眼：中心、壓扁的比例、傾角、會轉的那一圈雲的半徑、外圍不動的雲臂的半徑
  // 天色（戰場高度 → 顏色）：頂上近黑的紫，往下是悶悶的紫，城腳以下沉進深淵
  const SKY = [84, '#040208', 66, '#090515', 52, '#130b27', 38, '#1e1440', 22, '#281b49', 9, '#32204c', 2, '#372048', -1.5, '#24123a', -5, '#130a20', -9, '#0a0510'];
  let banks = [], sVortex = null, sEye = null, sRim = null, rimH = 1, sMist = [], sEmber = null, sFlash = null;
  let rocks = [], wisps = [], mists = [], ash = [], embers = [], gaps = [], strikes = [], bolt = null, boltAt = -1;

  // 一串色標之間取色：st = [t0, 色0, t1, 色1, …]
  function ramp(st, t) { if (t <= st[0]) return st[1]; for (let i = 2; i < st.length; i += 2) if (t <= st[i]) return mix(st[i - 1], st[i + 1], (t - st[i - 2]) / (st[i] - st[i - 2])); return st[st.length - 1]; }
  function skyAt(y) { for (let i = 2; i < SKY.length; i += 2) if (y >= SKY[i]) return mix(SKY[i - 1], SKY[i + 1], clamp((SKY[i - 2] - y) / (SKY[i - 2] - SKY[i]), 0, 1)); return SKY[SKY.length - 1]; }
  // 橢圓形的柔光
  function glow(c, x, y, rx, ry, st) { c.save(); c.translate(x, y); c.scale(1, ry / rx); c.fillStyle = rg(c, 0, 0, 0, rx, st); c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore(); }
  // 一顆柔邊的光點小圖
  function dot(px, st) { const cv = mkCanvas(px, px), c = cv.getContext('2d'); c.fillStyle = rg(c, px / 2, px / 2, 0, px / 2, st); c.fillRect(0, 0, px, px); return cv; }
  function wpoly(c, p) { c.beginPath(); c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.closePath(); }
  // 參差的稜線：一串忽高忽低的折點 [x, y, …]；f0 > 0 時再疊一層大起伏（山頭和鞍部），齒才不會一樣高
  function jag(R, x0, x1, lo, hi, d0, d1, f0) {
    const p = [], fn = f0 ? ridgeFn(R, f0) : null;
    for (let x = x0, k = 0; x < x1; x += d0 + R() * R() * (d1 - d0) * 1.6, k++) { const m = fn ? 0.3 + 0.7 * clamp(0.5 + 0.8 * fn(x), 0, 1) : 1; p.push(x, lo + (hi - lo) * m * (k & 1 ? R() * 0.5 : 0.5 + R() * 0.5)); }
    return p;
  }
  function fillDown(c, p, fill) { c.beginPath(); c.moveTo(X(p[0]), V.H + 4); for (let i = 0; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.lineTo(X(p[p.length - 2]), V.H + 4); c.closePath(); c.fillStyle = fill; c.fill(); }

  /* ---------- 雲 ---------- */
  // 壓在天頂的雲，一層只記底緣那一排雲團 [x, y, r, …]（位置固定，不隨畫面寬度變）；靠近風暴眼的地方往上讓開
  function mkBanks() {
    const R = mkRand(661), out = [];
    for (const [base, amp, f0, r0, r1, open, dip, top, edge, hot, ra] of [[51.6, 1.5, 0.11, 1.5, 2.9, 15, 4.2, '#150d29', '#34214f', '#8e2e56', 1], [57.5, 2.2, 0.085, 2.2, 3.9, 12, 3.2, '#100a21', '#2a1a43', '#70254f', 0.8], [64.5, 2.6, 0.07, 3, 5, 8.5, 2, '#0b0719', '#201436', '#541d45', 0.6], [72.5, 3, 0.06, 3.6, 6, 5.5, 1, '#070510', '#170e28', '#3c1639', 0.42]]) {
      const fn = ridgeFn(R, f0), p = [];
      for (let x = -46; x < 160;) {
        const r = r0 + R() * (r1 - r0), e = base + amp * fn(x) + open * Math.exp(-Math.pow((x - VX) / 22, 2)) - dip * clamp((40 - x) / 44, 0, 1);
        p.push(x, e + r * (0.8 + R() * 0.45), r); x += r * (0.85 + R() * 0.55);
      }
      out.push({ p, top, edge, hot, ra });
    }
    return out;
  }
  // 雲的外形：從畫面頂鋪到底緣，底緣是一排圓（同一個繞行方向，才會聯集成一整片）
  function traceBank(c, p, dx, dy, puffs) {
    const n = p.length, s = V.s;
    c.moveTo(X(p[0]) + dx, -20); c.lineTo(X(p[n - 3]) + dx, -20);
    for (let i = n - 3; i >= 0; i -= 3) c.lineTo(X(p[i]) + dx, Y(p[i + 1]) + dy);
    c.closePath();
    if (puffs) for (let i = 0; i < n; i += 3) { const x = X(p[i]) + dx, y = Y(p[i + 1]) + dy, r = p[i + 2] * s; c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
  }

  /* ---------- 尖塔、斷塔、斷橋、鐵鍊 ---------- */
  // 黑曜石尖塔（戰場座標）：kind 0 細針、1 帶肩的岩峰、2 像爪子一樣彎的角。底在 y=-5，尖在 ty；
  // la 是受光面的濃度：朝風暴眼的那一側補一道稜，離風暴眼越近越紅越亮
  function spire(c, x, ty, w, kind, lean, R, fill, la) {
    const y = -5, h = ty - y, tx = x + lean * h, d = x < VX ? 1 : -1, g = Math.exp(-Math.pow((x - VX) / 34, 2)), lit = la ? rgba(mix('#a8588a', '#f4667a', g), la * (0.55 + 0.85 * g)) : null;
    if (kind === 2) {      // 外緣鼓出去、內緣凹進來，尖端勾向 lean 的方向；中間一道稜分出明暗兩個面
      const m = lean > 0 ? 1 : -1, a = Math.abs(lean) * h;
      const o = [x - m * w / 2, y, x - m * w * 0.5, y + h * 0.3, x - m * w * 0.36, y + h * 0.56, x - m * w * 0.1 + m * a * 0.2, y + h * 0.8, tx, ty];
      const n = [tx, ty, x + m * w * 0.12 + m * a * 0.35, y + h * 0.72, x + m * w * 0.3 + m * a * 0.1, y + h * 0.45, x + m * w * 0.42, y + h * 0.2, x + m * w / 2, y];
      wpoly(c, o.concat(n)); c.fillStyle = fill; c.fill();
      const mid = [tx, ty, x + m * a * 0.36, y + h * 0.76, x - m * w * 0.02 + m * a * 0.1, y + h * 0.5, x - m * w * 0.02, y + h * 0.25, x, y];
      wpoly(c, o.concat(mid)); c.fillStyle = 'rgba(6,3,14,.3)'; c.fill();
      if (lit) { const q = n.slice(); for (let i = 8; i >= 2; i -= 2) q.push(n[i] - m * w * 0.13, n[i + 1]); wpoly(c, q); c.fillStyle = lit; c.fill(); }
      return [tx, ty];
    }
    const m = R() < 0.5 ? 1 : -1, j = () => 0.85 + R() * 0.3;
    const p = kind === 1
      ? [x - m * w / 2, y, x - m * w * 0.36 * j(), y + h * 0.4, x - m * w * 0.3, y + h * (0.6 + R() * 0.12), x - m * w * 0.17, y + h * (0.7 + R() * 0.1), x - m * w * 0.08, y + h * 0.6, tx, ty, x + m * w * 0.16 * j() + lean * h * 0.6, y + h * 0.64, x + m * w * 0.3 * j(), y + h * 0.32, x + m * w / 2, y]
      : [x - w / 2, y, x - w * 0.27 * j() + lean * h * 0.4, y + h * (0.42 + R() * 0.14), tx, ty, x + w * 0.23 * j() + lean * h * 0.5, y + h * (0.5 + R() * 0.16), x + w / 2, y];
    wpoly(c, p); c.fillStyle = fill; c.fill();
    if (lit) {      // 受光的那一道稜：從尖端沿著朝光的那一側往下，越往下越寬
      const n = p.length, ti = kind === 1 ? 10 : 4, right = (kind === 1 ? m : 1) * d > 0, q = [p[ti], p[ti + 1]];
      if (right) for (let i = ti + 2; i < n; i += 2) q.push(p[i], p[i + 1]); else for (let i = ti - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]);
      const e = q.length; for (let i = e - 2; i >= 2; i -= 2) q.push(q[i] - d * w * (0.04 + 0.1 * (i / e)) * (0.8 + 0.6 * g), q[i + 1]);
      wpoly(c, q); c.fillStyle = lit; c.fill();
    }
    return [tx, ty];
  }
  // 塔：塔身、挑出的塔簷、尖頂（broken：尖頂斷了半截）；兩扇還透著火光的小窗；lit 是朝風暴眼那一側的受光色
  function tower(c, x, ty, w, broken, fill, win, lit) {
    const y = -5, rh = w * 1.7, by = ty - rh, p = [x - w * 0.5, y, x - w * 0.42, by - w * 0.3, x - w * 0.6, by - w * 0.3, x - w * 0.6, by];
    if (broken) p.push(x - w * 0.34, by + rh * 0.42, x - w * 0.2, by + rh * 0.3, x - w * 0.06, by + rh * 0.52, x + w * 0.1, by + rh * 0.24, x + w * 0.26, by + rh * 0.34, x + w * 0.4, by + rh * 0.1);
    else p.push(x - w * 0.52, by, x + w * 0.03, ty, x + w * 0.52, by);
    p.push(x + w * 0.6, by, x + w * 0.6, by - w * 0.3, x + w * 0.42, by - w * 0.3, x + w * 0.5, y);
    wpoly(c, p); c.fillStyle = fill; c.fill();
    if (lit) { const d = x < VX ? 1 : -1, q = [x + d * w * 0.6, by, x + d * w * 0.6, by - w * 0.3, x + d * w * 0.42, by - w * 0.3, x + d * w * 0.5, y, x + d * w * 0.33, y, x + d * w * 0.27, by - w * 0.3, x + d * w * 0.42, by]; if (!broken) q.push(x + w * 0.03, ty, x + d * w * 0.52, by); wpoly(c, q); c.fillStyle = lit; c.fill(); }
    if (win) { c.fillStyle = win; for (const v of [0.9, 2.3]) { const wy = by - w * v, a = w * 0.11; wpoly(c, [x - a, wy - a * 2.6, x - a, wy, x, wy + a * 1.1, x + a, wy, x + a, wy - a * 2.6]); c.fill(); } }
  }
  // 斷橋：橋面、一排橋拱和橋墩；g0–g1 之間塌掉了
  function bridge(c, xa, xb, y, g0, g1, fill) {
    c.fillStyle = fill;
    for (const [a, b, br] of [[xa, g0, 1], [g1, xb, -1]]) {
      const n = Math.max(1, Math.round((b - a) / 3.1)), w = (b - a) / n;
      c.beginPath(); c.moveTo(X(a), Y(y)); c.lineTo(X(b), Y(y));
      if (br > 0) { c.lineTo(X(b + 0.5), Y(y - 0.2)); c.lineTo(X(b + 0.15), Y(y - 0.55)); c.lineTo(X(b + 0.4), Y(y - 0.9)); }
      c.lineTo(X(b), Y(y - 1.6));
      for (let k = n - 1; k >= 0; k--) { const x1 = a + (k + 1) * w, x0 = a + k * w; c.lineTo(X(x1 - 0.3), Y(y - 1.9)); c.quadraticCurveTo(X((x0 + x1) / 2), Y(y + 0.55), X(x0 + 0.3), Y(y - 1.9)); c.lineTo(X(x0 + 0.3), Y(y - 9)); c.lineTo(X(x0 - 0.3), Y(y - 9)); c.lineTo(X(x0 - 0.3), Y(y - 1.9)); }
      if (br < 0) { c.lineTo(X(a - 0.45), Y(y - 0.75)); c.lineTo(X(a - 0.1), Y(y - 0.4)); c.lineTo(X(a - 0.5), Y(y - 0.1)); }
      c.closePath(); c.fill();
    }
  }
  function chain(c, x0, y0, x1, y1, sag, col, lw) {
    c.strokeStyle = col; c.beginPath(); c.moveTo(X(x0), Y(y0)); c.quadraticCurveTo(X((x0 + x1) / 2), Y(Math.min(y0, y1) - sag), X(x1), Y(y1));
    c.lineWidth = Math.max(1, V.s * lw * 0.5); c.stroke();
    c.lineCap = 'round'; c.lineWidth = Math.max(1.5, V.s * lw * 1.3); c.setLineDash([0.01, Math.max(3, V.s * lw * 3)]); c.stroke(); c.setLineDash([]); c.lineCap = 'butt';
  }

  /* ---------- 浮空的碎岩 ---------- */
  // 上緣是略有起伏的平台（其中一處隆起）、下緣收成一根主錐，兩旁偶爾帶一根短的。畫在以 (0,0) 為腰線中心、寬 w（像素）的範圍裡，
  // 往上約 0.3h、往下約 0.62h。lit：+1 右邊受光、-1 左邊受光；rim：底緣被深淵的光勾出來的顏色（不要就給 null）
  function shard(c, w, h, R, top, bot, lit, rim) {
    const p = [-w / 2, 0], nt = 2 + ((R() * 3) | 0), hi = 1 + ((R() * nt) | 0), tx = (R() - 0.5) * w * 0.2;
    for (let k = 1; k <= nt; k++) p.push(-w / 2 + w * (k + (R() - 0.5) * 0.5) / (nt + 1), -h * (k === hi ? 0.24 + R() * 0.08 : 0.11 + R() * 0.08));
    p.push(w / 2, -h * 0.03);
    const m = p.length; p.push(w * 0.37, h * (0.1 + R() * 0.06));
    if (R() < 0.7) p.push(w * 0.25, h * (0.3 + R() * 0.1), w * 0.13 + tx * 0.5, h * 0.24);
    const ti = p.length; p.push(tx, h * 0.62);
    if (R() < 0.7) p.push(-w * 0.12 + tx * 0.5, h * 0.26, -w * 0.25, h * (0.32 + R() * 0.12));
    p.push(-w * 0.39, h * (0.09 + R() * 0.06));
    poly(c, p); c.fillStyle = lg(c, 0, -h * 0.3, 0, h * 0.62, [0, top, 0.4, mix(top, bot, 0.5), 1, bot]); c.fill();
    // 頂上受光的面、背光那一側的暗面
    poly(c, p.slice(0, m).concat([w * 0.43, h * 0.05, tx * 0.3, h * 0.1, -w * 0.43, h * 0.05])); c.fillStyle = 'rgba(180,154,224,.3)'; c.fill();
    const q = [tx * 0.4, h * 0.1]; if (lit > 0) { for (let i = ti; i < p.length; i += 2) q.push(p[i], p[i + 1]); q.push(p[0], p[1]); } else for (let i = m - 2; i <= ti; i += 2) q.push(p[i], p[i + 1]);
    poly(c, q); c.fillStyle = 'rgba(6,3,12,.36)'; c.fill();
    if (rim) {
      c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = Math.max(1, w * 0.028); c.strokeStyle = lg(c, 0, 0, 0, h * 0.62, [0, rgba(rim, 0), 0.4, rgba(rim, 0.4), 1, rgba(rim, 0.95)]);
      c.beginPath(); c.moveTo(p[m - 2], p[m - 1]); for (let i = m; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.lineTo(p[0], p[1]); c.stroke();
    }
  }
  // 一小片碎屑
  function chip(c, x, y, r, R, col) { const a = R() * TAU; poly(c, [x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, x + Math.cos(a + 1.9) * r, y + Math.sin(a + 1.9) * r, x + Math.cos(a + 3.3) * r * 1.2, y + Math.sin(a + 3.3) * r * 1.2, x + Math.cos(a + 4.6) * r * 0.8, y + Math.sin(a + 4.6) * r * 0.8]); c.fillStyle = col; c.fill(); }
  function shardSprite(w, h, seed, lit, haze, hazeCol) {
    const pw = w * V.s, ph = h * V.s, cv = mkCanvas(pw * 1.5, ph * 1.7), c = cv.getContext('2d'), R = mkRand(seed);
    c.translate(cv.width / 2, cv.height * 0.42);
    if (haze < 0.3) glow(c, 0, ph * 0.56, pw * 0.7, ph * 0.5, [0, 'rgba(240,60,120,.3)', 1, 'rgba(240,60,120,0)']);
    if (haze < 0.3) { c.strokeStyle = '#1c1230'; c.lineCap = 'round'; c.beginPath(); c.moveTo(-pw * 0.02, ph * 0.5); c.quadraticCurveTo(pw * 0.05, ph * 0.76, -pw * 0.03, ph * 0.94); c.lineWidth = Math.max(1, pw * 0.014); c.stroke(); c.lineWidth = Math.max(1.5, pw * 0.034); c.setLineDash([0.01, Math.max(3, pw * 0.07)]); c.stroke(); c.setLineDash([]); }      // 底下垂著半截斷掉的鐵鍊
    shard(c, pw, ph, R, '#4b3a6c', '#130b20', lit, haze < 0.3 ? '#ff5c94' : null);
    for (let k = 0; k < 3; k++) chip(c, (R() - 0.5) * pw * 1.3, ph * (k & 1 ? 0.3 + R() * 0.5 : -0.3 - R() * 0.3), pw * (0.04 + R() * 0.04), R, '#3a2b58');
    if (haze > 0) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = rgba(hazeCol, haze); c.fillRect(-cv.width, -cv.height, cv.width * 2, cv.height * 2); }
    return cv;
  }

  /* ---------- 風暴眼的雲臂：三條對數螺線，朝眼心的那一緣受光，外緣壓一層暗 ---------- */
  const ARM_BODY = [0, '#6a1a32', 0.22, '#4a1434', 0.55, '#2a1233', 1, '#1a0e2b'], ARM_RIM = [0, '#ffc890', 0.1, '#ff8a5c', 0.28, '#dc4450', 0.55, '#96305a', 1, '#4e2452'];      // 雲身／受光邊，由眼心往外
  // 從半徑 r1 往內繞到 r0，每一團雲回呼 f(x, y, r, rho)（圓盤座標：還沒壓扁，眼心在原點）
  function arms(R, r1, r0, f) {
    for (let a = 0; a < 3; a++) {
      const th0 = a * TAU / 3 + R() * 0.25;
      for (let rho = r1; rho > r0;) { const r = (0.13 * rho + 0.42) * (0.8 + R() * 0.4), q = rho + (R() - 0.5) * r * 0.5, th = th0 - Math.log(rho) / 0.24; f(q * Math.cos(th), q * Math.sin(th), r, rho); rho -= r * 0.115; }
    }
  }
  // 會轉的那一圈：畫成一張正方形的小圖，中間留一個洞給眼心，外圈淡出（接到外圍不動的雲臂）
  function vortexSprite() {
    const q = V.s * 0.75, n = Math.ceil(VR * 2 * q), R = mkRand(663), h = n / 2, body = mkCanvas(n, n), shade = mkCanvas(n, n), cv = mkCanvas(n, n), bc = body.getContext('2d'), sc = shade.getContext('2d'), rc = cv.getContext('2d');
    for (const g of [bc, sc, rc]) { g.translate(h, h); g.scale(q, q); g.beginPath(); }
    const puff = (x, y, r, rho) => { const k = 1 - 0.3 * r / rho, o = 1 + 0.34 * r / rho; bc.moveTo(x + r, y); bc.arc(x, y, r, 0, TAU); rc.moveTo(x * k + r, y * k); rc.arc(x * k, y * k, r, 0, TAU); sc.moveTo(x * o + r * 0.8, y * o); sc.arc(x * o, y * o, r * 0.8, 0, TAU); };
    arms(R, VR + 2, 6.4, puff);
    for (let th = 0; th < TAU; th += 0.16 + R() * 0.1) { const rho = 6.9 + R() * 0.7; puff(rho * Math.cos(th), rho * Math.sin(th), 1.1 + R() * 0.5, rho); }      // 眼牆
    bc.fill(); rc.fill(); sc.fillStyle = '#0a0412'; sc.fill();
    bc.globalCompositeOperation = 'source-in'; bc.fillStyle = rg(bc, 0, 0, 5, 36, ARM_BODY); bc.fillRect(-VR - 3, -VR - 3, VR * 2 + 6, VR * 2 + 6);
    bc.setTransform(1, 0, 0, 1, 0, 0); bc.globalCompositeOperation = 'source-atop'; bc.globalAlpha = 0.5; bc.drawImage(shade, 0, 0);
    rc.globalCompositeOperation = 'source-in'; rc.fillStyle = rg(rc, 0, 0, 5, 44, ARM_RIM); rc.fillRect(-VR - 3, -VR - 3, VR * 2 + 6, VR * 2 + 6);
    rc.setTransform(1, 0, 0, 1, 0, 0); rc.globalCompositeOperation = 'source-over'; rc.drawImage(body, 0, 0);
    rc.globalCompositeOperation = 'destination-in'; rc.fillStyle = rg(rc, h, h, 0, h, [0, 'rgba(0,0,0,0)', 5.2 / VR, 'rgba(0,0,0,0)', 6.3 / VR, '#000', 0.62, '#000', 0.97, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0)']); rc.fillRect(0, 0, n, n);
    return cv;
  }
  // 一條扁長的薄雲（從血月前面慢慢飄過去的）：一串壓扁的雲團，底緣一點暗紅的邊，兩頭淡出
  function wispSprite(w, h, seed) {
    const cv = mkCanvas(w * V.s, h * V.s), c = cv.getContext('2d'), W = cv.width, H = cv.height;
    for (let pass = 0; pass < 2; pass++) {
      const R = mkRand(seed); c.beginPath();
      for (let u = 0.1; u < 0.9; u += 0.03 + R() * 0.03) { const e = Math.sin(Math.PI * (u - 0.1) / 0.8), ry = H * (0.08 + 0.2 * e) * (0.7 + R() * 0.5), rx = ry * (2.4 + R() * 1.4), x = u * W, y = H * (0.44 + (R() - 0.5) * 0.1) + (pass ? 0 : H * 0.07); c.moveTo(x + rx, y); c.ellipse(x, y, rx, ry, 0, 0, TAU); }
      c.fillStyle = pass ? lg(c, 0, H * 0.15, 0, H * 0.75, [0, '#120a22', 1, '#24143a']) : '#6a2c5c'; c.fill();
    }
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = lg(c, 0, 0, W, 0, [0, 'rgba(0,0,0,0)', 0.22, '#000', 0.78, '#000', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, W, H);
    return cv;
  }
  // 一顆火星：多半從深淵裡升上來
  function spawn(e, R) {
    const g = gaps.length && R() < 0.62 ? gaps[(R() * gaps.length) | 0] : [V.x0, V.x1];
    e.x = g[0] + R() * (g[1] - g[0]); e.y = -9.5 + R() * 2; e.vy = 2.6 + R() * 3.4; e.max = 5 + R() * 5; e.t = 0; e.s = 0.42 + R() * 0.4; e.p = R() * TAU;
  }

  return {
    key: 'demon',
    build(c, W, H) {
      const R = mkRand(666), s = V.s;
      const st = []; for (let i = 0; i < SKY.length; i += 2) st.push((84 - SKY[i]) / 93, SKY[i + 1]);
      c.fillStyle = lg(c, 0, Y(84), 0, Y(-9), st); c.fillRect(0, 0, W, H);
      // 眼心：雲帶之間露出來的光（跟會轉的那一層同一個橢圓）
      c.save(); c.translate(X(VX), Y(VY)); c.rotate(VTILT); c.scale(1, VK);
      c.fillStyle = rg(c, 0, 0, 0, s * 34, [0, 'rgba(255,206,150,.96)', 0.07, 'rgba(255,140,98,.92)', 0.2, 'rgba(232,74,84,.74)', 0.48, 'rgba(184,42,84,.46)', 0.8, 'rgba(130,30,80,.18)', 1, 'rgba(110,26,76,0)']); c.fillRect(-s * 34, -s * 34, s * 68, s * 68);
      c.restore();
      // 血月
      const mx = X(38), my = Y(46), mr = s * 4.4;
      glow(c, mx, my, mr * 4.4, mr * 4.4, [0, 'rgba(196,40,50,.34)', 0.3, 'rgba(160,28,54,.17)', 1, 'rgba(120,20,60,0)']);
      c.save(); c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.clip();
      c.fillStyle = rg(c, mx - mr * 0.3, my - mr * 0.35, mr * 0.1, mr * 1.6, [0, '#dc5840', 0.4, '#b02a34', 0.8, '#741428', 1, '#4e0c22']); c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
      for (const [u, v, r] of [[-0.3, -0.22, 0.46], [0.36, 0.22, 0.56], [0.06, -0.6, 0.26], [-0.46, 0.44, 0.3], [0.62, -0.34, 0.2], [-0.04, 0.66, 0.22]]) glow(c, mx + u * mr, my + v * mr, r * mr, r * mr * 0.8, [0, 'rgba(92,12,34,.5)', 0.55, 'rgba(92,12,34,.34)', 1, 'rgba(92,12,34,0)']);
      c.restore();
      c.strokeStyle = 'rgba(255,160,124,.55)'; c.lineWidth = Math.max(1, s * 0.13); c.beginPath(); c.arc(mx, my, mr - c.lineWidth / 2, Math.PI * 0.9, Math.PI * 1.72); c.stroke();
      // 壓在天頂的雲：每一團底下受光、往上暗下去，一層比一層黑；底緣再勾一道被風暴眼照亮的邊
      banks = mkBanks();
      const rimCol = lg(c, X(-30), 0, X(140), 0, [0, '#452a60', 0.4, '#682a5c', 0.53, '#8a2c5e', 0.635, '#d04860', 0.71, '#ff7a64', 0.79, '#d04860', 1, '#5e2656']);
      for (const b of banks) {
        const p = b.p;
        c.globalAlpha = b.ra; c.fillStyle = rimCol; c.beginPath(); traceBank(c, p, s * 0.08, s * 0.26, 1); c.fill(); c.globalAlpha = 1;
        c.fillStyle = b.top; c.beginPath(); traceBank(c, p, 0, 0, 0); c.fill();
        for (let h = 0; h < 2; h++) for (let i = h * 3; i < p.length; i += 6) {
          const x = X(p[i]), y = Y(p[i + 1]), r = p[i + 2] * s, g = Math.exp(-Math.pow((p[i] - VX) / 32, 2));
          c.fillStyle = lg(c, 0, y - r, 0, y + r, [0, b.top, 0.42, b.top, 1, mix(b.edge, b.hot, g)]); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        }
      }
      // 雲層裡幾處悶著的光，像遠處的雷在雲肚子裡亮著
      for (const [x, y, rx, ry, al] of [[-6, 58.5, 15, 4.6, 0.16], [21, 66, 17, 5, 0.13], [47, 60.5, 13, 4, 0.14], [30, 75, 20, 5, 0.1], [128, 62, 14, 4.6, 0.14]]) glow(c, X(x), Y(y), s * rx, s * ry, [0, 'rgba(170,70,160,' + al + ')', 0.5, 'rgba(140,56,150,' + al * 0.5 + ')', 1, 'rgba(120,50,140,0)']);
      // 風暴眼外圍不動的雲臂：近的這一側（畫面上方）黑壓壓地接進雲層，遠的那一側（下方）一路淡進夜色裡。
      // 直接一團一團畫（先畫受光的邊、再畫雲身、最後外緣壓暗），顏色照位置先調好，不必另外開大圖
      {
        const cs = Math.cos(VTILT), sn = Math.sin(VTILT), L = [];
        arms(mkRand(664), VO, 13, (x, y, r, rho) => {
          // 上方的雲臂越往外越細；兩側和下方的越往外、越往下越淡
          const far = y < -6 ? 1 : y < 10.6 ? lerp(1, 0.5, (y + 6) / 16.6) : y < 25.3 ? lerp(0.5, 0.16, (y - 10.6) / 14.7) : lerp(0.16, 0, (y - 25.3) / 14.7), w = clamp((y + 14) / 10, 0, 1);
          const al = clamp((rho - 14) / 7, 0, 1) * far * lerp(1, clamp((46 - rho) / 14, 0, 1), w), tp = lerp(clamp((VO - rho) / 16, 0, 1), 1, w);
          if (al > 0.02 && tp > 0.05) L.push(x, y, r * (0.4 + 0.6 * tp), rho, al, skyAt(VY - (x * sn + y * cs) * VK));
        });
        c.save(); c.translate(X(VX), Y(VY)); c.rotate(VTILT); c.scale(s, s * VK);
        for (let pass = 0; pass < 3; pass++) for (let i = 0; i < L.length; i += 6) {
          const r = L[i + 2], rho = L[i + 3], k = pass === 0 ? 1 - 0.3 * r / rho : pass === 1 ? 1 : 1 + 0.2 * r / rho, bc = ramp(ARM_BODY, (rho - 5) / 31);
          c.fillStyle = mix(L[i + 5], pass === 0 ? ramp(ARM_RIM, (rho - 5) / 39) : pass === 1 ? bc : mix(bc, '#0a0412', 0.5), L[i + 4]);
          c.beginPath(); c.arc(L[i] * k, L[i + 1] * k, pass === 2 ? r * 0.8 : r, 0, TAU); c.fill();
        }
        c.restore();
      }
      // 敵城背後的紅霧：越靠近塔頂越亮越暖，讓整座城被背光托出來
      for (const [x, y, rx, ry] of [[90.2, 15, 26, 20], [90.3, 25, 20, 14], [90.3, 33, 15, 14]]) glow(c, X(x), Y(y), s * rx * 1.25, s * ry * 1.25, [0, 'rgba(236,100,86,.84)', 0.44, 'rgba(228,88,80,.82)', 0.62, 'rgba(206,64,74,.56)', 0.74, 'rgba(170,44,66,.24)', 0.86, 'rgba(120,30,62,.07)', 1, 'rgba(100,26,60,0)']);
      for (const [x, y, rx, ry] of [[70.5, 9, 9, 5], [110.5, 12, 8, 6], [75.5, 28, 7, 5], [105, 27.5, 7.5, 4.6], [81, 42, 6, 3.4], [100.5, 41, 6.5, 3.6], [67, 2.5, 12, 4], [113.5, 2, 12, 4]]) glow(c, X(x), Y(y), s * rx, s * ry, [0, 'rgba(214,70,76,.3)', 0.6, 'rgba(180,48,68,.14)', 1, 'rgba(150,36,64,0)']);
      for (const [x, y, rx, ry, al] of [[88.6, 31, 12, 1.5, 0.2], [92.4, 21.5, 17, 1.9, 0.18], [89.4, 11.5, 21, 2.2, 0.16]]) glow(c, X(x), Y(y), s * rx, s * ry, [0, 'rgba(126,26,56,' + al + ')', 0.6, 'rgba(126,26,56,' + al * 0.6 + ')', 1, 'rgba(126,26,56,0)']);      // 光裡幾層薄煙
      // 從風暴眼漏下來的幾道光，長短寬窄都不一樣
      for (const [a, w, y1, al] of [[-0.34, 3, 14, 0.07], [-0.17, 2.2, 5, 0.09], [-0.03, 4.4, 0, 0.08], [0.14, 2.6, 7, 0.09], [0.31, 3.4, 15, 0.07]]) {
        const x1 = VX + Math.tan(a) * (46 - y1); wpoly(c, [VX + a * 9 - 0.8, 46, VX + a * 9 + 0.8, 46, x1 + w, y1, x1 - w, y1]); c.fillStyle = lg(c, 0, Y(46), 0, Y(y1), [0, 'rgba(255,178,120,' + al * 1.6 + ')', 0.6, 'rgba(250,130,100,' + al + ')', 1, 'rgba(240,100,90,0)']); c.fill();
      }
      // 地平線上一帶洋紅的霧光，把遠處尖塔的剪影托出來
      c.fillStyle = lg(c, 0, Y(22), 0, Y(0), [0, 'rgba(126,48,110,0)', 1, 'rgba(136,52,112,.42)']); c.fillRect(0, Y(22), W, Y(-1) - Y(22));
      // 遠處的尖塔（最淡的一層）
      const fa = lg(c, 0, Y(36), 0, Y(0), [0, '#1d1238', 1, '#2c1c48']), la = 0.3, tips = {};
      fillDown(c, jag(R, -50, 164, 2.2, 8.4, 1.4, 4, 0.09), fa);
      for (const [x, ty, w, k, l] of [[-33, 24, 5, 1, 0.05], [-27, 31, 5.6, 1, 0.04], [-21, 27, 5.4, 1, 0.05], [-16, 20, 3.2, 0, 0.04], [-11.4, 29, 7.6, 2, 0.13], [-5.2, 18, 3, 0, -0.03], [-1.2, 25, 5, 1, 0.04], [2.6, 15, 2.8, 0, 0.06], [9, 13, 4, 1, 0], [18, 10, 3, 0, 0], [26, 12, 4, 1, 0],
        [35.6, 15, 4, 1, 0.05], [38.6, 10, 2.6, 0, 0.08], [43, 9, 3.6, 1, -0.04], [47.4, 13.5, 2.8, 0, 0.05], [52.4, 8, 3.8, 1, 0.03], [56.6, 11.5, 2.8, 0, -0.05], [60.6, 9, 3.2, 1, 0.04], [64.2, 16.5, 4.2, 1, 0.07], [68, 12, 2.8, 0, 0.1],
        [76, 12, 4, 1, 0], [84, 10, 3, 0, 0], [93, 11, 4, 1, 0], [101, 10, 3, 0, 0], [107, 13, 4, 1, 0], [111.6, 22, 3, 0, -0.05], [115.2, 29, 5.4, 1, -0.05], [119.8, 23, 3, 0, -0.06], [125, 32, 8, 2, -0.13], [130.5, 25, 5, 1, -0.04], [136, 31, 5.4, 1, -0.05], [143, 24, 5, 1, 0]]) tips[x] = spire(c, x, ty, w, k, l, R, fa, la);
      strikes = [[39.47, 9.6], [114.3, 19.5]]; for (const k in tips) { const [x, y] = tips[k]; if (y > 11.4 && (x < 2 || (x > 36.5 && x < 69) || x > 110.5)) strikes.push([x, y]); }      // 閃電會劈到的塔尖
      chain(c, tips[-11.4][0] - 0.5, tips[-11.4][1] - 3.5, tips[-1.2][0], tips[-1.2][1] - 1.5, 4.5, 'rgba(34,22,66,.95)', 0.2);
      chain(c, tips[115.2][0], tips[115.2][1] - 2, tips[125][0] + 0.7, tips[125][1] - 4.5, 5, 'rgba(34,22,66,.95)', 0.22);
      // 霧隔開前後兩層：裂谷上方一片洋紅的霧氣
      glow(c, X(53), Y(-3), s * 38, s * 15, [0, 'rgba(160,46,112,.44)', 0.5, 'rgba(130,40,104,.2)', 1, 'rgba(110,36,96,0)']);
      c.fillStyle = lg(c, 0, Y(10), 0, Y(0), [0, 'rgba(112,44,104,0)', 1, 'rgba(120,46,106,.3)']); c.fillRect(0, Y(10), W, Y(-1) - Y(10));
      // 中景：更暗的尖塔、塔和斷橋
      const fb = lg(c, 0, Y(26), 0, Y(-1), [0, '#180e30', 1, '#28163d']), lb = 0.36, win = 'rgba(255,150,110,.62)';
      fillDown(c, jag(R, -50, 164, 1.2, 5.4, 1.1, 3.2, 0.13), fb);
      for (const [x, ty, w, k, l] of [[-30, 17, 4.6, 1, 0.05], [-24.5, 12, 2.8, 0, 0.05], [-18.5, 15, 4.6, 1, 0.05], [-13.6, 11, 2.8, 0, 0.06], [-2.6, 11.5, 3.8, 1, 0.04], [1.5, 8, 2.4, 0, 0.08], [12, 6, 4, 1, 0], [24, 7, 4, 1, 0], [31.5, 5.5, 3, 0, 0],
        [51.6, 7.6, 2.8, 1, 0.04], [54.4, 5.2, 2, 0, 0.06], [58.6, 6.2, 3, 1, -0.04], [62.4, 4.8, 2, 0, 0.08], [69.4, 6.5, 2.6, 0, 0.1], [78, 6, 4, 1, 0], [90, 5, 4, 1, 0], [102, 6, 4, 1, 0],
        [110.4, 12, 2.8, 0, -0.08], [118.6, 16, 4.8, 1, -0.05], [122.6, 12, 2.8, 0, -0.06], [127.5, 20, 5.2, 1, -0.05], [133.5, 13, 4, 1, 0], [140, 18, 5, 1, 0]]) spire(c, x, ty, w, k, l, R, fb, lb);
      tower(c, -7.4, 17.5, 3.2, 1, fb, win, 'rgba(168,88,138,.2)'); tower(c, 39.4, 9.6, 2.3, 0, fb, win, 'rgba(190,92,130,.24)'); tower(c, 66.2, 10.8, 2.5, 1, fb, win, 'rgba(236,100,122,.4)'); tower(c, 114.2, 19.5, 3.4, 0, fb, win, 'rgba(240,102,122,.46)');
      bridge(c, 41, 50.6, 5.4, 44.6, 47.4, fb);
      // 塔頂後面最亮的一團
      glow(c, X(90.3), Y(36), s * 15, s * 10, [0, 'rgba(255,182,126,.72)', 0.5, 'rgba(248,122,98,.36)', 1, 'rgba(230,84,90,0)']);
      // 幾塊不會動的小碎岩：右邊一串被風暴眼吸上去
      for (const [x, y, w, h, lt] of [[111.4, 28.5, 1.9, 1.6, -1], [122.4, 40.5, 1.8, 1.5, -1], [0.8, 30.5, 1.7, 1.4, 1]]) { c.save(); c.translate(X(x), Y(y)); shard(c, w * s, h * s, R, mix('#4b3a6c', skyAt(y), 0.4), mix('#130b20', skyAt(y), 0.4), lt, null); c.restore(); }
      for (const [x, y, r] of [[112.8, 33.6, 0.34], [110.4, 37.8, 0.26], [112, 41.6, 0.3], [108.6, 44.4, 0.2], [113.6, 30.6, 0.2], [120.6, 43.2, 0.24], [-0.8, 33.4, 0.26], [2.2, 28.6, 0.2], [-12.4, 38.6, 0.3], [-10.6, 41, 0.2]]) chip(c, X(x), Y(y), r * s, R, mix('#3a2b58', skyAt(y), 0.35));
      // 裂谷對岸的岩壁，往下沉進黑裡
      fillDown(c, jag(R, -50, 164, 0.5, 3.8, 0.6, 2.4, 0.17), lg(c, 0, Y(4), 0, Y(-9), [0, '#1a102e', 0.3, '#130a22', 0.7, '#0a0512', 1, '#07030c']));
      // 谷底的紅光先墊在後面，深處幾根石柱擋在光前面，最後再蓋一層貼著底的霧
      c.fillStyle = lg(c, 0, Y(-2.2), 0, Y(-9.2), [0, 'rgba(176,26,74,0)', 0.6, 'rgba(190,32,82,.34)', 1, 'rgba(226,50,92,.6)']); c.fillRect(0, Y(-2.2), W, H - Y(-2.2));
      for (const [x, ty, w] of [[41.6, -3.4, 3.4], [47.8, -5.6, 2.6], [53.4, -6.6, 2.2], [59.4, -4.4, 3.6], [65.2, -2.9, 2.8]]) {
        wpoly(c, [x - w / 2, -10, x - w * 0.3, ty - 2.2, x - w * 0.12, ty - 0.9, x + w * 0.04, ty, x + w * 0.2, ty - 1.5, x + w * 0.34, ty - 2.1, x + w / 2, -10]);
        c.fillStyle = lg(c, 0, Y(ty), 0, Y(-9.4), [0, '#10081c', 0.6, '#1a0a22', 1, '#3a1030']); c.fill();
      }
      c.fillStyle = lg(c, 0, Y(-6.4), 0, Y(-9.3), [0, 'rgba(226,50,92,0)', 0.6, 'rgba(236,60,96,.3)', 1, 'rgba(255,110,116,.7)']); c.fillRect(0, Y(-6.4), W, H - Y(-6.4));
      for (let k = 0; k < 7; k++) { const x = 36 + R() * 34, r = 4 + R() * 5; glow(c, X(x), Y(-8.5 - R() * 1.2), s * r, s * r * 0.36, [0, 'rgba(255,100,120,.24)', 1, 'rgba(255,70,110,0)']); }

      // 閃電亮起來時要貼的那一層：只留雲底被照亮的邊（半解析度）
      rimH = Math.max(2, Math.ceil(Y(40))); sRim = mkCanvas(W * 0.5, rimH * 0.5); const rc = sRim.getContext('2d'); rc.scale(0.5, 0.5);
      for (const b of banks) {
        rc.globalCompositeOperation = 'source-over'; rc.fillStyle = '#f0a8e8'; rc.beginPath(); traceBank(rc, b.p, s * 0.12, s * 0.5, 1); rc.fill();
        rc.globalCompositeOperation = 'destination-out'; rc.fillStyle = '#000'; rc.beginPath(); traceBank(rc, b.p, 0, 0, 1); rc.fill();
      }
    },
    terrain(c) {
      const R = mkRand(667), s = V.s, bot = V.H + 4;
      for (const run of groundRuns()) {
        const cl = run[0] > V.x0 - 7.5, cr = run[1] < V.x1 + 7.5, xa = cl ? run[0] : -52, xb = cr ? run[1] : 166, warm = xa > 50;      // 左端／右端是不是斷崖；右邊那座離風暴眼近，受光偏暖
        // 崖面：筆直往下，只有幾處往實心那一側凹的小缺口（崖頂的轉角對齊碰撞）
        const face = (x, d) => { const p = [x, groundYRaw(x)]; for (let y = -0.8 - R(); y > -11; y -= 0.6 + R() * 1.5) { const dx = R() < 0.4 ? 0.15 + R() * 0.3 : R() * 0.08; p.push(x - d * dx, y, x - d * dx, y - 0.2 - R() * 0.4); } return p; };
        const fr = cr ? face(xb, 1) : null, fl = cl ? face(xa, -1) : null;
        const outline = () => {
          c.beginPath(); traceGround(c, xa, xb, 0, true);
          if (fr) for (let i = 0; i < fr.length; i += 2) c.lineTo(X(fr[i]), Y(fr[i + 1]));
          c.lineTo(X(xb), bot); c.lineTo(X(xa), bot);
          if (fl) for (let i = fl.length - 2; i >= 0; i -= 2) c.lineTo(X(fl[i]), Y(fl[i + 1]));
          c.closePath();
        };
        outline(); c.fillStyle = lg(c, 0, Y(0), 0, V.H, [0, '#3c2b59', 0.3, '#2a1c44', 0.7, '#1c1132', 1, '#150c27']); c.fill();
        c.save(); outline(); c.clip();
        // 岩體切成一塊一塊稜角分明的面（像黑曜石的斷口）：兩排四邊形，各沿一條對角線再分成兩個三角形
        const n = Math.max(2, Math.round((xb - xa) / 4.6)), col = [], dg = [];
        for (let i = 0; i <= n; i++) { const x = xa + (xb - xa) * i / n, e = i > 0 && i < n ? 1 : 0; col.push([x + e * (R() - 0.5) * 2, -1.1, x + e * (R() - 0.5) * 3.2, -4.3 + (R() - 0.5) * 1.6, x + e * (R() - 0.5) * 3.2, -10.5]); dg.push([R() < 0.5, R() < 0.5]); }
        for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
          const a = col[i], b = col[i + 1], k = j * 2, q = [a[k], a[k + 1], b[k], b[k + 1], b[k + 2], b[k + 3], a[k + 2], a[k + 3]];      // 左上、右上、右下、左下
          for (let t = 0; t < 2; t++) {
            wpoly(c, dg[i][j] ? (t ? [q[0], q[1], q[2], q[3], q[4], q[5]] : [q[0], q[1], q[4], q[5], q[6], q[7]]) : (t ? [q[0], q[1], q[2], q[3], q[6], q[7]] : [q[2], q[3], q[4], q[5], q[6], q[7]]));
            const v = R(); c.fillStyle = v < 0.5 ? 'rgba(128,100,180,' + (0.03 + v * 0.3).toFixed(3) + ')' : 'rgba(6,3,14,' + ((v - 0.5) * 0.56).toFixed(3) + ')'; c.fill();
          }
        }
        // 崖面：朝裂谷的那一條比較亮，底下被紅霧照著；幾道直的裂理
        for (const [f, d] of [[fr, 1], [fl, -1]]) {
          if (!f) continue; const fx = f[0], x0 = X(fx), x1 = X(fx - d * 4.5);
          c.fillStyle = lg(c, x0, 0, x1, 0, [0, warm ? 'rgba(168,74,128,.5)' : 'rgba(120,78,160,.48)', 0.28, 'rgba(90,58,128,.22)', 1, 'rgba(84,54,120,0)']); c.fillRect(Math.min(x0, x1), Y(0.5), Math.abs(x1 - x0), bot - Y(0.5));
          glow(c, X(fx + d), Y(-10.5), s * 8, s * 7.5, [0, 'rgba(240,56,104,.5)', 0.5, 'rgba(204,38,92,.22)', 1, 'rgba(180,30,90,0)']);
          // 一層一層的岩理：從崖邊往裡斜斜地淡掉
          for (let y = -2 - R(); y > -9.6; y -= 1.5 + R() * 1.8) {
            const l = 1.6 + R() * 3.4, dy = (R() - 0.5) * 0.9, gx = lg(c, x0, 0, X(fx - d * l), 0, [0, 'rgba(6,3,12,.5)', 1, 'rgba(6,3,12,0)']);
            c.beginPath(); c.moveTo(x0, Y(y)); c.lineTo(X(fx - d * l * 0.5), Y(y + dy * 0.6)); c.lineTo(X(fx - d * l), Y(y + dy)); c.strokeStyle = gx; c.lineWidth = Math.max(1, s * 0.14); c.stroke();
            c.beginPath(); c.moveTo(x0, Y(y - 0.17)); c.lineTo(X(fx - d * l * 0.5), Y(y + dy * 0.6 - 0.17)); c.strokeStyle = 'rgba(190,150,220,.16)'; c.stroke();
          }
          for (let k = 0; k < 2; k++) {
            let x = fx - d * (0.7 + k * 1.5 + R() * 0.5), y = -R() * 1.2; c.beginPath(); c.moveTo(X(x), Y(y));
            while (y > -10) { y -= 0.9 + R() * 1.8; x += (R() - 0.5) * 0.4; c.lineTo(X(x), Y(y)); if (R() < 0.35) { x -= d * R() * 0.4; c.lineTo(X(x), Y(y)); } }
            c.strokeStyle = 'rgba(6,3,12,' + (0.42 - k * 0.12) + ')'; c.lineWidth = Math.max(1, s * (0.18 - k * 0.04)); c.stroke();
          }
        }
        // 發光的礦脈：沿著岩塊之間的裂縫往下走
        const segs = [], walk = (i) => { for (let j = 0; j < 2; j++) { let i2 = i; const r = R(); if (r < 0.4 && i < n && dg[i][j]) i2 = i + 1; else if (r > 0.6 && i > 0 && !dg[i - 1][j]) i2 = i - 1; segs.push(col[i][j * 2], col[i][j * 2 + 1], col[i2][j * 2 + 2], col[i2][j * 2 + 3]); i = i2; if (j === 0 && R() < 0.5 && i > 0 && i < n) { const o = R() < 0.5 ? 1 : -1, a = col[i], b = col[i + o]; segs.push(a[2], a[3], lerp(a[2], b[2], 0.55), lerp(a[3], b[3], 0.55)); } } };
        for (let i = 1 + ((R() * 2) | 0); i < n; i += 2 + ((R() * 2) | 0)) walk(i);
        for (const [f, d] of [[fr, 1], [fl, -1]]) { if (!f) continue; let x = f[0] - d * (0.9 + R() * 0.5), y = -2.2 - R(); while (y > -10) { const nx = f[0] - d * (0.7 + R() * 1.5), ny = y - 0.9 - R() * 1.3; segs.push(x, y, nx, ny); x = nx; y = ny; } }      // 崖面上也裂一道
        c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); for (let i = 0; i < segs.length; i += 4) { c.moveTo(X(segs[i]), Y(segs[i + 1])); c.lineTo(X(segs[i + 2]), Y(segs[i + 3])); }
        c.strokeStyle = 'rgba(255,50,130,.13)'; c.lineWidth = s; c.stroke(); c.strokeStyle = 'rgba(255,70,140,.4)'; c.lineWidth = Math.max(1.5, s * 0.32); c.stroke(); c.strokeStyle = 'rgba(255,196,224,.88)'; c.lineWidth = Math.max(1, s * 0.09); c.stroke();
        for (let i = 2; i < segs.length; i += 4) if (R() < 0.34) glow(c, X(segs[i]), Y(segs[i + 1]), s * 1.5, s * 1.5, [0, 'rgba(255,120,180,.5)', 0.4, 'rgba(255,60,140,.18)', 1, 'rgba(255,60,140,0)']);      // 轉折的地方光聚成一小團
        // 崖頂：一層比較亮、底緣崩得參差的岩皮
        const cp = jag(R, xa, xb + 3, -1.25, -0.5, 0.8, 2.4);
        c.beginPath(); traceGround(c, xa, xb, 0, true); for (let i = cp.length - 2; i >= 0; i -= 2) c.lineTo(X(cp[i]), Y(cp[i + 1])); c.closePath(); c.fillStyle = lg(c, 0, Y(0), 0, Y(-1.25), [0, warm ? '#90609a' : '#7c64aa', 1, warm ? '#573262' : '#4a3970']); c.fill();
        // 城基底下的陰影
        c.fillStyle = lg(c, 0, Y(-1.85), 0, Y(-3.2), [0, 'rgba(4,2,8,.5)', 1, 'rgba(4,2,8,0)']);
        for (const [a, b] of [[1.9, 35.5], [69.7, 110.1]]) c.fillRect(X(a), Y(-1.85), X(b) - X(a), s * 1.35);
        c.restore();
        c.beginPath(); traceGround(c, xa, xb, 0, true); c.strokeStyle = warm ? 'rgba(236,176,216,.85)' : 'rgba(200,176,232,.85)'; c.lineWidth = Math.max(1.5, s * 0.16); c.stroke();
        // 崖面的輪廓光：越往下越紅
        for (const f of [fr, fl]) { if (!f) continue; c.beginPath(); for (let i = 0; i < f.length; i += 2) c.lineTo(X(f[i]), Y(f[i + 1])); c.strokeStyle = lg(c, 0, Y(0), 0, V.H, [0, 'rgba(190,150,220,.6)', 0.5, 'rgba(236,96,150,.75)', 1, 'rgba(255,110,130,.9)']); c.lineWidth = Math.max(1.5, s * 0.18); c.stroke(); }
      }
    },
    init() {
      const R = mkRand(669);
      sVortex = vortexSprite();
      sEye = dot(96, [0, 'rgba(255,190,130,1)', 0.4, 'rgba(255,110,90,.5)', 1, 'rgba(255,70,90,0)']);
      sMist = [dot(128, [0, 'rgba(236,60,112,.6)', 0.45, 'rgba(196,34,92,.24)', 1, 'rgba(180,30,90,0)']), dot(128, [0, 'rgba(244,84,96,.55)', 0.45, 'rgba(208,40,72,.22)', 1, 'rgba(190,30,60,0)'])];
      sEmber = dot(32, [0, 'rgba(255,236,246,1)', 0.22, 'rgba(255,120,190,.9)', 0.55, 'rgba(240,50,140,.3)', 1, 'rgba(230,40,130,0)']);
      sFlash = dot(96, [0, 'rgba(255,214,250,.9)', 0.3, 'rgba(236,120,230,.4)', 1, 'rgba(200,80,220,0)']);
      // 慢慢上下浮動的碎岩：兩邊近的清楚、中間遠的蒙著霧
      rocks = [];
      for (const [x, y, w, h, lt, hz] of [[-4.6, 34.4, 5.8, 5, 1, 0.08], [45.6, 17.6, 3.4, 2.9, 1, 0.58], [58.8, 21.8, 2.5, 2.2, 1, 0.66], [62.6, 12.4, 3.3, 2.9, 1, 0.54], [116.6, 36, 5.2, 4.6, -1, 0.1]]) rocks.push({ cv: shardSprite(w, h, 700 + rocks.length * 13, lt, hz, skyAt(y)), x, y, a: 0.35 + R() * 0.35, w: 0.35 + R() * 0.3, p: R() * TAU });
      // 沒有地面的區間（深淵），霧只在裡面飄
      gaps = []; { const runs = groundRuns(); for (let i = 1; i < runs.length; i++) gaps.push([runs[i - 1][1], runs[i][0]]); }
      // 霧：三團貼著谷底橫著飄，三股從底下慢慢冒上來再散掉
      mists = []; for (const [a, b] of gaps) for (let k = 0; k < 6; k++) mists.push({ a, b, up: k > 2, x: R(), y: -7.8 - R() * 1.6, w: k > 2 ? 6 + R() * 4 : 11 + R() * 8, h: k > 2 ? 7 + R() * 3 : 3.4 + R() * 2.4, v: k > 2 ? 0.12 + R() * 0.08 : (0.02 + R() * 0.03) * (k & 1 ? 1 : -1), p: R() * TAU, cv: sMist[k & 1] });
      wisps = []; for (const [y, w, h, v, ph] of [[49.4, 26, 3.2, 0.7, 0.3], [46.6, 20, 2.4, 0.5, 0.74], [44.6, 16, 1.9, 0.9, 0.05]]) wisps.push({ cv: wispSprite(w, h, 900 + wisps.length * 7), y, w, v, p: ph });
      ash = []; for (let k = 0; k < 40; k++) ash.push({ x: V.x0 + R() * (V.x1 - V.x0), y: -8 + R() * (V.top + 8), vx: 0.5 + R() * 1.6, vy: -0.5 - R() * 1.1, s: 0.2 + R() * 0.2, p: R() * TAU, f: 1.5 + R() * 2.5 });
      embers = []; for (let k = 0; k < 20; k++) { const e = {}; spawn(e, R); e.t = R() * e.max; e.y += e.vy * e.t; embers.push(e); }
      bolt = null; boltAt = -1;
    },
    back(c, t, dt) {
      const s = V.s;
      // 風暴眼的雲帶慢慢轉，眼心的光一明一暗
      c.save(); c.translate(X(VX), Y(VY)); c.rotate(VTILT); c.scale(1, VK); c.rotate(t * 0.07); c.drawImage(sVortex, -VR * s, -VR * s, VR * 2 * s, VR * 2 * s); c.restore();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.2 + 0.1 * Math.sin(t * 1.1); c.drawImage(sEye, X(VX) - s * 9, Y(VY) - s * 3.6, s * 18, s * 7.2);
      c.globalAlpha = 0.09 + 0.06 * Math.sin(t * 1.1 - 0.7); c.drawImage(sEye, X(VX) - s * 12, Y(45), s * 24, s * 20);      // 塔頂後面的光跟著脈動
      // 閃電：隔幾秒在遠處劈一道，附近的雲底跟著亮一下（只有零點幾秒，而且只在遠景裡）
      if (boltAt < 0) boltAt = t + 2 + Math.random() * 3;
      if (!bolt && t >= boltAt) {
        const tg = strikes.filter((q) => q[0] > V.x0 + 1.5 && q[0] < V.x1 - 1.5), q = tg[(Math.random() * tg.length) | 0];
        if (!q) boltAt = t + 60;
        else {
          // 從塔尖往上長：一節一節左右折，回到雲底；中途岔出一小枝
          const y0 = Math.min(V.top + 1, 60), n = 12, p = new Array(n * 2 + 2), f = [], drift = (Math.random() - 0.5) * 0.5; let x = q[0], d = Math.random() < 0.5 ? 1 : -1;
          for (let k = n; k >= 0; k--) { p[k * 2] = x; p[k * 2 + 1] = lerp(y0, q[1], k / n); d = -d; x += d * (0.5 + Math.random() * 1.5) + drift; }
          const k0 = 3 + ((Math.random() * 5) | 0); let fx = p[k0 * 2], fy = p[k0 * 2 + 1]; f.push(fx, fy); d = Math.random() < 0.5 ? 1 : -1;
          for (let k = 0; k < 4; k++) { fx += d * (0.6 + Math.random() * 1.8); fy -= 1.4 + Math.random() * 2.2; f.push(fx, fy); }
          bolt = { t0: t, max: 0.14 + Math.random() * 0.06, p, f, x: (p[0] + q[0]) / 2, y0, y1: q[1], k: q[0] > 34 && q[0] < 72 ? 0.72 : 1 };      // 劈在兩城之間的淡一點，不搶彈道
        }
      }
      if (bolt) {
        const u = (t - bolt.t0) / bolt.max;
        if (u >= 1.6 || u < 0) { bolt = null; boltAt = t + 3.2 + Math.random() * 5.5; }
        else {
          const I = (u < 0.22 ? 1 : u < 0.36 ? 0.25 : u < 0.62 ? 0.85 : u < 1 ? (1 - u) / 0.38 * 0.85 : 0) * bolt.k, A = Math.max(I, u < 1 ? 0.3 : (1.6 - u) / 0.6 * 0.3), k = sRim.width / V.W, p = bolt.p, n = p.length / 2 - 1;
          // 雲底的亮邊：離閃電越近越亮（幾段疊起來）
          c.globalAlpha = A * 0.22;
          for (const hw of [46, 34, 22, 11]) { const xa = Math.max(0, X(bolt.x - hw)), xb = Math.min(V.W, X(bolt.x + hw)); if (xb > xa + 2) c.drawImage(sRim, xa * k, 0, (xb - xa) * k, sRim.height, xa, 0, xb - xa, rimH); }
          c.globalAlpha = A * 0.5; c.drawImage(sFlash, X(bolt.x) - s * 20, Y(bolt.y0 + 7), s * 40, s * 18);
          if (I > 0) {
            const gh = (bolt.y0 - bolt.y1) * s;
            c.globalAlpha = I * 0.24; c.drawImage(sFlash, X(bolt.x) - s * 10, Y(bolt.y0) - gh * 0.1, s * 20, gh * 1.2);
            c.globalAlpha = I * 0.9; c.drawImage(sFlash, X(p[n * 2]) - s * 2.4, Y(bolt.y1) - s * 2.4, s * 4.8, s * 4.8);
            c.globalAlpha = I; c.lineJoin = 'round'; c.lineCap = 'round';
            c.beginPath(); c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.strokeStyle = 'rgba(255,110,220,.3)'; c.lineWidth = s * 0.7; c.stroke();
            // 主幹：上粗下細的一條折線
            c.beginPath(); for (let i = 0; i <= n; i++) c.lineTo(X(p[i * 2]) - s * 0.17 * (1 - 0.8 * i / n), Y(p[i * 2 + 1])); for (let i = n; i >= 0; i--) c.lineTo(X(p[i * 2]) + s * 0.17 * (1 - 0.8 * i / n), Y(p[i * 2 + 1])); c.fillStyle = 'rgba(255,238,255,.95)'; c.fill();
            c.beginPath(); c.moveTo(X(bolt.f[0]), Y(bolt.f[1])); for (let i = 2; i < bolt.f.length; i += 2) c.lineTo(X(bolt.f[i]), Y(bolt.f[i + 1])); c.strokeStyle = 'rgba(255,220,255,.8)'; c.lineWidth = Math.max(1, s * 0.1); c.stroke();
          }
        }
      }
      c.globalCompositeOperation = 'source-over';
      // 幾條薄雲從左邊飄過血月，飄到戰場中間前淡掉
      for (const w of wisps) { const sp = 88, u = (w.p + t * w.v / sp) % 1; c.globalAlpha = 0.9 * Math.min(1, u * 8, (1 - u) * 5); c.drawImage(w.cv, X(-44 + u * sp), Y(w.y)); }
      c.globalAlpha = 1;
      for (const k of rocks) c.drawImage(k.cv, X(k.x) - k.cv.width / 2, Y(k.y + Math.sin(t * k.w + k.p) * k.a) - k.cv.height * 0.42);
      // 深淵底的霧：幾團光慢慢飄
      if (gaps.length) {
        c.beginPath(); for (const [a, b] of gaps) c.rect(X(a), Y(-0.4), X(b) - X(a), V.H - Y(-0.4) + 8); c.clip();
        c.globalCompositeOperation = 'lighter';
        for (const m of mists) {
          const u = m.x + m.v * t, f = u - Math.floor(u);
          if (m.up) { const x = m.a + m.w / 2 + (((Math.floor(u) * 0.618 + m.p) % 1 + 1) % 1) * (m.b - m.a - m.w); c.globalAlpha = 0.42 * Math.sin(f * Math.PI); c.drawImage(m.cv, X(x - m.w / 2), Y(-9.5 + f * 4.5 + m.h / 2), m.w * s, m.h * s); }
          else { const x = m.a - m.w / 2 + f * (m.b - m.a + m.w); c.globalAlpha = 0.3 + 0.14 * Math.sin(t * 0.7 + m.p); c.drawImage(m.cv, X(x - m.w / 2), Y(m.y + m.h / 2 + Math.sin(t * 0.5 + m.p) * 0.4), m.w * s, m.h * s); }
        }
      }
    },
    front(c, t, dt) {
      const s = V.s;
      // 飄落的灰燼
      c.fillStyle = 'rgba(196,178,212,.4)'; c.beginPath();
      for (const a of ash) {
        a.x += (a.vx + Math.sin(t * 0.7 + a.p) * 0.9) * dt; a.y += a.vy * dt;
        if (a.y < -9.5) { a.y = V.top + 1; a.x = V.x0 + Math.random() * (V.x1 - V.x0); } if (a.x > V.x1 + 1) a.x = V.x0 - 1;
        const w = a.s * s * (0.35 + 0.65 * Math.abs(Math.sin(t * a.f + a.p))), h = a.s * s * 0.6; c.rect(X(a.x) - w / 2, Y(a.y) - h / 2, w, h);
      }
      c.fill();
      // 從深淵升上來的洋紅火星
      c.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        e.t += dt; if (e.t >= e.max) spawn(e, Math.random);
        e.y += e.vy * dt; e.x += Math.sin(t * 1.3 + e.p) * 1.1 * dt;
        const r = e.s * s; c.globalAlpha = Math.sin(e.t / e.max * Math.PI) * (0.62 + 0.3 * Math.sin(t * 9 + e.p)); c.drawImage(sEmber, X(e.x) - r, Y(e.y) - r, r * 2, r * 2);
      }
    }
  };
})();
