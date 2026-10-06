/* ===== 36-scene-sky: 第五關「雲海浮島」— 日出的雲海上，兩座浮空島隔空對峙；遠處有小浮島、積雲塔，鶴群不時飛過 ===== */
THEMES[4] = (function () {
  const SUNX = 56, SUNY = 8.6;
  // 天色：戰場高度 → 顏色。上面蔚藍、中段青綠，貼近雲海的地方轉成桃色、粉色
  const SKY = [80, '#1c5bc0', 64, '#2876d4', 50, '#3391de', 38, '#3faadd', 27, '#4cc2d6', 19, '#62ccc6', 13, '#9cd4b6', 8.5, '#ecd092', 4.5, '#fbc692', 0.5, '#fdae94', -4, '#f598a4', -9, '#e486b4'];
  let isl = null, islY = 0, cutY = 0, seas = [], highs = [], rocks = [], wisps = [], puff = null, glow = null, fall = null;

  function skyAt(y) {
    for (let i = 2; i < SKY.length; i += 2) if (y >= SKY[i]) return mix(SKY[i - 1], SKY[i + 1], clamp((SKY[i - 2] - y) / (SKY[i - 2] - SKY[i]), 0, 1));
    return SKY[SKY.length - 1];
  }

  // 一層雲海：雲頂在高度 lo…hi 之間起伏（戰場座標），一顆顆圓疊成雲頭，上緣留一道亮邊，往下漸層。
  // 畫在 c 的 x = 0…w；oy 是 c 的原點對應的畫面 y。左右可以無縫相接
  function bank(c, w, oy, R, o) {
    const s = V.s, n1 = Math.max(1, Math.round(w / s / o.wl)), n2 = Math.round(n1 * 2.3) + 1, n3 = n1 * 5 + 2;
    const p = [R() * TAU, R() * TAU, R() * TAU], cs = [], hi = Y(o.hi) - oy;
    const env = (x) => { const a = x / w * TAU; return 0.5 + 0.5 * (Math.sin(a * n1 + p[0]) * 0.5 + Math.sin(a * n2 + p[1]) * 0.32 + Math.sin(a * n3 + p[2]) * 0.18); };
    const line = (x) => Y(lerp(o.lo, o.hi, env(x))) - oy, rad = (x) => s * lerp(o.r0, o.r1, env(x));
    for (let x = 0; x < w;) {
      const r = rad(x) * (0.7 + R() * 0.6) * (R() < 0.13 ? 1.6 : 1), y = line(x) + r * (1 + R() * 0.2); cs.push(x, y, r);
      if (R() < 0.45) { const a = -Math.PI * (0.22 + R() * 0.56), r2 = r * (0.34 + R() * 0.18), x2 = x + Math.cos(a) * r * 0.8, y2 = y + Math.sin(a) * r * 0.8; if (y2 - r2 >= hi) cs.push(x2, y2, r2); }
      x += r * (0.6 + R() * 0.7);
    }
    const hb = V.H - oy + 4;
    const shape = (dy, sh) => {
      c.beginPath(); c.moveTo(-4, hb); for (let x = -4; x <= w + 4; x += 5) c.lineTo(x, line(x) + rad(x) * 0.7 + dy); c.lineTo(w + 4, hb); c.closePath();
      for (let i = 0; i < cs.length; i += 3) for (let m = -1; m <= 1; m++) { const x = cs[i] + m * w, r = cs[i + 2] - sh; if (r > 0.5 && x + r > 0 && x - r < w + 2) { c.moveTo(x + r, cs[i + 1] + dy); c.arc(x, cs[i + 1] + dy, r, 0, TAU); } }
    };
    shape(0, 0); c.fillStyle = o.rim; c.fill();
    // 亮邊往下分三階化進雲身，邊緣才不會像描了一圈線
    c.fillStyle = lg(c, 0, hi, 0, Y(o.lo - o.fade) - oy, [0, o.top, 1, o.bot]);
    for (let j = 1; j <= 3; j++) { shape(s * o.rw * j / 3, s * o.rw * 0.1 * j); c.globalAlpha = j === 3 ? 1 : 0.3 + j * 0.14; c.fill(); }
    // 離太陽越遠的雲身越偏冷、偏暗（只有不會動的遠層才這樣畫）
    if (o.side) { c.fillStyle = lg(c, X(SUNX - 66), 0, X(SUNX + 66), 0, [0, rgba(o.side, 0.34), 0.36, rgba(o.side, 0), 0.64, rgba(o.side, 0), 1, rgba(o.side, 0.34)]); c.fill(); }
    return line;
  }

  // 遠方的積雲塔：幾顆大雲團往上堆，外緣再長一圈小雲頭；前面再疊幾團，各有一道朝太陽的柔亮邊。far 越大越融進天色
  function tower(c, x, yb, w, h, R, far) {
    const s = V.s, dir = x < SUNX ? 1 : -1, cw = (w + 14) * s, ch = (h + 6) * s, ox = Math.floor(X(x) - cw / 2), oy = Math.floor(Y(yb + h) - 3 * s);
    const cv = mkCanvas(cw, ch), k = cv.getContext('2d'), big = [], sT = skyAt(yb + h), sB = skyAt(yb + 2), f = 1 - far, rw = s * w * 0.022;
    k.translate(-ox, -oy);
    for (let y = yb; y < yb + h - w * 0.1;) {
      const u = (y - yb) / h, hw = w * 0.5 * (1 - 0.7 * Math.pow(u, 1.25)), r = lerp(w * 0.25, w * 0.14, u) * (0.85 + R() * 0.3), m = Math.max(1, Math.round(hw * 2 / (r * 1.3)));
      for (let j = 0; j < m; j++) {
        const g = [x + (m === 1 ? (R() - 0.5) * hw * 0.5 : lerp(-hw + r * 0.5, hw - r * 0.5, j / (m - 1)) + (R() - 0.5) * r * 0.4), Math.min(y + (R() - 0.5) * r * 0.5, yb + h - r), r];
        for (let q = 0; q < 4; q++) { const a = Math.PI * (0.05 + R() * 0.9), r2 = r * (0.26 + R() * 0.2); g.push(g[0] + Math.cos(a) * r * 0.92, g[1] + Math.sin(a) * r * 0.92, r2); }
        big.push(g);
      }
      y += r * 0.95;
    }
    // 一團（或全部）雲的輪廓，可以整個平移
    const shape = (list, dx, dy) => { k.beginPath(); for (const g of list) for (let i = 0; i < g.length; i += 3) { const px = X(g[i]) + dx, py = Y(g[i + 1]) + dy; k.moveTo(px + g[i + 2] * s, py); k.arc(px, py, g[i + 2] * s, 0, TAU); } };
    const body = lg(k, 0, Y(yb + h), 0, Y(yb), [0, mix(sT, '#eef3ff', 0.66 * f), 0.5, mix(skyAt(yb + h * 0.5), '#fff4ea', 0.7 * f), 1, mix(sB, '#ffe2bc', 0.7)]), rim = mix(sT, '#fffaf0', 0.5 + 0.45 * f);
    const blob = (list) => { shape(list, 0, 0); k.fillStyle = rim; k.fill(); k.fillStyle = body; for (let j = 1; j <= 3; j++) { shape(list, -dir * rw * j / 3, rw * j / 3); k.globalAlpha = j === 3 ? 1 : 0.3 + j * 0.14; k.fill(); } };
    blob(big); k.globalCompositeOperation = 'source-atop';
    // 背光的那一側整片偏冷
    k.fillStyle = lg(k, X(x - dir * w * 0.5), 0, X(x + dir * w * 0.2), 0, [0, rgba(mix(sT, '#9fb2e6', 0.6), 0.5 * f), 1, rgba(mix(sT, '#9fb2e6', 0.6), 0)]); k.fillRect(ox, oy, cw, ch);
    for (let i = 0; i < big.length; i++) if (i % 3 !== 1) blob([big[i]]);
    k.fillStyle = lg(k, 0, Y(yb + h * 0.5), 0, Y(yb), [0, rgba(mix(sB, '#ffe2bc', 0.7), 0), 1, mix(sB, '#ffe2bc', 0.7)]); k.fillRect(ox, Y(yb + h * 0.5), cw, ch);
    c.drawImage(cv, ox, oy); cv.width = cv.height = 0;   // 用完就還掉，手機上畫布的記憶體有限
  }

  // 遠方的小浮島：平頂、倒掛的岩底，越遠越接近天色。fl = 瀑布掛在哪一側（0 沒有），deco 1 = 頂上有座小塔
  function islet(c, x, y, w, hz, R, fl, deco) {
    const s = V.s, hw = w * s * 0.5, px = X(x), py = Y(y), sky = skyAt(y - w * 0.3), sun = x < SUNX ? 1 : -1, tip = hw * (1.5 + R() * 0.5);
    const rk = mix('#5c4a78', sky, hz), lit = mix('#dba088', sky, hz * 0.85), gr = mix('#4aa560', sky, hz), grHi = mix('#aee67c', sky, hz), dk = mix('#2f7f52', sky, hz);
    const P = [-1, 0, -0.9, 0.2, -0.66, 0.3, -0.52, 0.6, -0.38, 0.4, -0.14, 0.68, 0.05, 1, 0.2, 0.64, 0.34, 0.48, 0.5, 0.72, 0.62, 0.34, 0.86, 0.2, 1, 0], q = [];
    for (let i = 0; i < P.length; i += 2) { const e = i > 0 && i < P.length - 2 ? 1 : 0; q.push(px + (P[i] + e * (R() - 0.5) * 0.08) * hw, py + (P[i + 1] + e * (R() - 0.5) * 0.1) * tip); }
    poly(c, q); c.fillStyle = lg(c, 0, py, 0, py + tip, [0, rk, 0.5, mix(rk, sky, 0.3), 1, mix(rk, sky, 0.75)]); c.fill();
    // 朝陽的那半邊
    const h = sun > 0 ? q.slice(12) : q.slice(0, 14); if (sun > 0) h.push(px + hw * 0.1, py); else h.unshift(px - hw * 0.05, py);
    poly(c, h); c.fillStyle = lg(c, 0, py, 0, py + tip, [0, rgba(lit, 0.75), 1, rgba(lit, 0.15)]); c.fill();
    // 頂上的草皮、樹
    c.beginPath(); c.moveTo(px - hw * 1.05, py + hw * 0.03); c.quadraticCurveTo(px, py - hw * 0.36, px + hw * 1.05, py + hw * 0.03); c.quadraticCurveTo(px, py + hw * 0.22, px - hw * 1.05, py + hw * 0.03); c.fillStyle = gr; c.fill();
    c.beginPath(); c.moveTo(px - hw * 0.92, py - hw * 0.04); c.quadraticCurveTo(px, py - hw * 0.36, px + hw * 0.92, py - hw * 0.04); c.quadraticCurveTo(px, py - hw * 0.2, px - hw * 0.92, py - hw * 0.04); c.fillStyle = grHi; c.fill();
    if (deco === 1) {
      const ps = hw * 0.16, bx = px - hw * 0.15, by = py - hw * 0.13; c.fillStyle = dk;
      for (let k = 0; k < 4; k++) { const ww = ps * (2.6 - k * 0.45), yy = by - k * ps * 1.25; c.fillRect(bx - ww * 0.36, yy - ps * 1.25, ww * 0.72, ps * 1.25); c.beginPath(); c.moveTo(bx - ww * 0.8, yy - ps * 0.84); c.quadraticCurveTo(bx - ww * 0.5, yy - ps * 1.02, bx - ww * 0.36, yy - ps * 1.3); c.lineTo(bx + ww * 0.36, yy - ps * 1.3); c.quadraticCurveTo(bx + ww * 0.5, yy - ps * 1.02, bx + ww * 0.8, yy - ps * 0.84); c.closePath(); c.fill(); }
      c.fillRect(bx - ps * 0.08, by - ps * 6.6, ps * 0.16, ps * 1.5);
    }
    for (let k = 0, n = 2 + ((R() * 3) | 0); k < n; k++) { const tx = px + (R() - 0.5) * hw * 1.5, r = hw * (0.1 + R() * 0.1), ty = py - hw * 0.16 * (1 - Math.pow((tx - px) / hw, 2)) - r * 0.6; if (deco === 1 && Math.abs(tx - (px - hw * 0.15)) < hw * 0.3) continue; c.fillStyle = dk; c.beginPath(); c.arc(tx - r * 0.5, ty, r * 0.75, 0, TAU); c.arc(tx + r * 0.55, ty + r * 0.1, r * 0.7, 0, TAU); c.arc(tx, ty - r * 0.4, r, 0, TAU); c.fill(); c.fillStyle = gr; c.beginPath(); c.arc(tx - r * 0.2, ty - r * 0.6, r * 0.55, 0, TAU); c.fill(); }
    // 細細一條瀑布，落到半空化成霧
    if (fl) {
      const fx = px + fl * hw * 0.72, fy = py + hw * 0.08, L = s * w * 1.25;
      c.strokeStyle = lg(c, 0, fy, 0, fy + L, [0, 'rgba(255,255,255,.9)', 0.6, 'rgba(255,255,255,.55)', 1, 'rgba(255,255,255,0)']); c.lineWidth = Math.max(1, s * 0.2); c.lineCap = 'butt'; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy + L); c.stroke();
      c.fillStyle = rg(c, fx, fy + L * 0.92, 0, s * 1.5, [0, 'rgba(255,255,255,.4)', 1, 'rgba(255,255,255,0)']); c.fillRect(fx - s * 1.5, fy + L * 0.92 - s * 1.5, s * 3, s * 3);
    }
  }

  // 一條垂下來的藤蔓（戰場座標），幾片葉子；bare = 光禿禿的細根
  function vine(c, x, y, L, R, bare) {
    const s = V.s, x0 = X(x), y0 = Y(y), x1 = x0 + (R() - 0.5) * s * 0.8, y1 = y0 + L * s * 0.55, x2 = x0 + (x1 - x0) * 0.4, y2 = y0 + L * s;
    c.strokeStyle = bare ? '#4a3348' : '#2c6a3c'; c.lineWidth = Math.max(1, s * (bare ? 0.1 : 0.13)); c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x1, y1, x2, y2);
    if (bare) { c.moveTo((x0 + x1) / 2, (y0 + y1) / 2); c.lineTo(x1 + (x1 - x0) * 1.2 + s * 0.25, y1 + L * s * 0.2); }
    c.stroke(); if (bare) return;
    for (let k = 1, n = Math.max(2, Math.round(L * 1.5)); k <= n; k++) {
      const t = k / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t, lx = a * x0 + b * x1 + d * x2, ly = a * y0 + b * y1 + d * y2, sd = k & 1 ? 1 : -1;
      ell(c, lx + sd * s * 0.2, ly, s * 0.24, s * 0.13, sd * 0.6); c.fillStyle = R() < 0.5 ? '#6cc45c' : '#3f9a50'; c.fill();
    }
  }

  // 一座浮島：頂面沿著地面，底下是一排倒掛的石筍，離島緣越遠越淺。lip = 島緣的 x，dir = 島往哪邊延伸。
  // 亂數一律從島緣往外用，畫面寬窄不同時，看得到的那一段長得一樣
  function island(c, xa, xb, lip, dir, seed, spring) {
    const s = V.s, len = Math.abs((dir < 0 ? xa : xb) - lip), Ra = mkRand(seed), Rv = mkRand(seed + 1), Rd = mkRand(seed + 2), Rg = mkRand(seed + 3);
    // 底面的節點（離島緣多遠, 往下多深）：島緣 → 石筍尖 → 凹口 → 石筍尖 → …
    const a = [0, 1.15, 0.9, 3.3, 5.8 + Ra() * 0.6, 8.9, 10.8 + Ra(), 4.4, 18.5 + Ra(), 13.5, 28.2 + Ra(), 4.1, 33.4 + Ra(), 7.6, 38.2 + Ra(), 3.5, 42.8 + Ra(), 6.3];
    for (let u = a[a.length - 2]; u < len + 6;) { u += 4.2 + Ra() * 2.5; a.push(u, 3 + Ra() * 0.7); u += 4.2 + Ra() * 2.5; a.push(u, 5 + Ra() * 1.6); }
    // 節點之間再折幾折，岩壁才有稜角。seg[k] = 第 k 個頂點屬於哪一段
    const v = [0, 1.15], seg = [0];
    for (let i = 2; i < a.length; i += 2) {
      const u0 = a[i - 2], d0 = a[i - 1], u1 = a[i], d1 = a[i + 1], n = i === 2 ? 1 : Math.max(2, Math.round((u1 - u0) / 1.7));
      for (let k = 1; k <= n; k++) { const f = k / n, e = k === n; v.push(lerp(u0, u1, f) + (e ? 0 : (Rv() - 0.5) * 0.6), lerp(d0, d1, f) + (e ? 0 : (Rv() - 0.5) * 0.7 + (k & 1 ? 0.45 : -0.45) * (d1 > d0 ? 1 : -1))); seg.push(i); }
    }
    const px = (u) => X(lip + dir * u), py = (u, d) => Y(groundYRaw(lip + dir * u) - d);
    const depth = (u) => { for (let i = 2; i < v.length; i += 2) if (u <= v[i]) return lerp(v[i - 1], v[i + 1], clamp((u - v[i - 2]) / Math.max(0.01, v[i] - v[i - 2]), 0, 1)); return 3; };
    const body = () => {
      c.beginPath(); traceGround(c, xa, xb, 0, true);
      if (dir < 0) for (let i = 0; i < v.length; i += 2) c.lineTo(px(v[i]), py(v[i], v[i + 1])); else for (let i = v.length - 2; i >= 0; i -= 2) c.lineTo(px(v[i]), py(v[i], v[i + 1]));
      c.closePath();
    };
    body(); c.fillStyle = lg(c, 0, Y(-0.8), 0, Y(-9), [0, '#6f5474', 0.5, '#57406a', 1, '#3f2d55']); c.fill();
    c.save(); body(); c.clip();
    // 每根石筍朝島緣（朝陽）的那半邊是亮面
    c.fillStyle = lg(c, 0, Y(-0.8), 0, Y(-9), [0, '#b98a7c', 0.5, '#96697a', 1, '#6f4d6c']);
    for (let i = 4; i < a.length; i += 4) {
      const ut = a[i], dt = a[i + 1], un = i === 4 ? -2 : a[i - 2], dn = i === 4 ? 0 : a[i - 1];
      c.beginPath(); c.moveTo(px(ut), py(ut, dt + 0.6)); c.lineTo(px(ut - 0.5), py(ut - 0.5, dt * 0.6)); c.lineTo(px(ut + 0.45), py(ut + 0.45, dt * 0.3)); c.lineTo(px(ut + 0.15), py(ut + 0.15, 0));
      c.lineTo(px(un + 0.7), py(un + 0.7, 0)); c.lineTo(px(un), py(un, dn - 0.2)); c.lineTo(px(un), py(un, dt + 0.6)); c.closePath(); c.fill();
    }
    // 貼著岩面再描一道：亮面更亮、暗面更暗
    c.lineJoin = 'round'; c.lineCap = 'butt';
    for (let pass = 0; pass < 2; pass++) {
      c.beginPath(); let on = false;
      for (let k = 1; k < seg.length; k++) {
        const i = seg[k];
        if ((a[i + 1] > a[i - 1]) === (pass === 0)) { if (!on) c.moveTo(px(v[2 * k - 2]), py(v[2 * k - 2], v[2 * k - 1])); c.lineTo(px(v[2 * k]), py(v[2 * k], v[2 * k + 1])); on = true; } else on = false;
      }
      c.strokeStyle = pass ? 'rgba(30,18,52,.3)' : 'rgba(255,214,170,.36)'; c.lineWidth = s * (pass ? 1.9 : 1.4); c.stroke();
    }
    // 岩層的橫紋
    c.lineWidth = Math.max(1, s * 0.15); c.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const d = 2.5 + k * 1.5 + Rd() * 0.4, ph = Rd() * TAU; c.beginPath();
      for (let u = -1; u <= len + 2; u += 1.5) { const y = py(u, d + Math.sin(u * 0.55 + ph) * 0.22 + Math.sin(u * 1.7 + ph * 2) * 0.1); if (u < 0) c.moveTo(px(u), y); else c.lineTo(px(u), y); }
      c.strokeStyle = 'rgba(34,20,54,.24)'; c.stroke();
    }
    // 草皮底下的陰影；越往下越融進雲海的霧色
    c.fillStyle = lg(c, 0, Y(-0.9), 0, Y(-2.6), [0, 'rgba(36,18,44,.55)', 1, 'rgba(36,18,44,0)']); c.fillRect(X(xa), Y(-0.9), X(xb) - X(xa), s * 1.7);
    c.fillStyle = lg(c, 0, Y(-5.5), 0, Y(-9.5), [0, 'rgba(214,164,214,0)', 1, 'rgba(214,164,214,.42)']); c.fillRect(X(xa), Y(-5.5), X(xb) - X(xa), s * 4.5);
    c.restore();
    c.beginPath(); for (let i = 0; i < v.length; i += 2) c.lineTo(px(v[i]), py(v[i], v[i + 1])); c.strokeStyle = '#2f2046'; c.lineWidth = Math.max(1.5, s * 0.22); c.lineJoin = 'round'; c.stroke();
    // 藤蔓和細根：掛在島緣底下和每個凹口
    const ph = Rd() * TAU;
    vine(c, lip + dir * 2.2, -depth(2.2) + 0.2, 1.3 + Rd(), Rd);
    for (let i = 6; i < a.length; i += 4) {
      for (let k = 0, n = 1 + ((Rd() * 2) | 0); k < n; k++) { const u = a[i] + (Rd() - 0.5) * 3.4; vine(c, lip + dir * u, -depth(u) + 0.2, 1 + Rd() * 1.8, Rd); }
      const u = a[i] + (Rd() - 0.5) * 2; vine(c, lip + dir * u, -depth(u) + 0.1, 0.7 + Rd() * 0.7, Rd, 1);
    }
    // 島緣的草皮底下湧出一道泉水，貼著崖邊直直落進雲海，越往下越散、越淡
    if (spring) {
      const o = -dir, wx = (d) => X(lip + o * d), g = (a0, a1, a2) => lg(c, 0, Y(-1.4), 0, Y(-9.3), [0, a0, 0.72, a1, 1, a2]);
      c.beginPath(); c.moveTo(wx(-0.7), Y(-1.2)); c.quadraticCurveTo(wx(0.78), Y(-1.3), wx(0.74), Y(-3.2)); c.lineTo(wx(0.92), Y(-9.6)); c.lineTo(wx(-0.12), Y(-9.6)); c.lineTo(wx(0.04), Y(-3.4)); c.quadraticCurveTo(wx(0.02), Y(-2.2), wx(-0.7), Y(-2)); c.closePath();
      c.fillStyle = g('rgba(140,208,240,.96)', 'rgba(190,230,250,.86)', 'rgba(226,242,255,0)'); c.fill();
      c.strokeStyle = g('rgba(255,255,255,.95)', 'rgba(255,255,255,.8)', 'rgba(255,255,255,0)'); c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = Math.max(1, s * 0.2); c.beginPath(); c.moveTo(wx(-0.4), Y(-1.5)); c.quadraticCurveTo(wx(0.52), Y(-1.6), wx(0.5), Y(-3.2)); c.lineTo(wx(0.62), Y(-9.4)); c.stroke();
      c.lineWidth = Math.max(1, s * 0.11); c.beginPath(); c.moveTo(wx(0.22), Y(-2.6)); c.lineTo(wx(0.2), Y(-9.4)); c.stroke();
    }
    // 草皮：上緣貼著地面，下緣一朵一朵垂下來，島緣那頭包過轉角
    const turf = (x) => 0.7 + 0.32 * Math.abs(Math.sin(x * 1.2 + ph)) + 0.14 * Math.sin(x * 3.1 + ph) + 0.85 * Math.pow(Math.max(0, 1 - Math.abs(x - lip) / 1.3), 2);
    c.beginPath(); traceGround(c, xa, xb, 0, true); for (let x = xb; x > xa; x -= 0.25) c.lineTo(X(x), Y(groundYRaw(x) - turf(x))); c.lineTo(X(xa), Y(groundYRaw(xa) - turf(xa))); c.closePath();
    c.fillStyle = lg(c, 0, Y(0), 0, Y(-1.7), [0, '#95ea64', 0.5, '#6fd351', 1, '#48ad47']); c.fill();
    c.strokeStyle = '#2c6f2e'; c.lineWidth = Math.max(1.5, s * 0.2); c.lineJoin = 'round'; c.stroke();
    c.beginPath(); traceGround(c, xa, xb, -0.3, true); c.strokeStyle = 'rgba(220,255,165,.5)'; c.lineWidth = Math.max(1, s * 0.16); c.stroke();
    // 草叢和小花
    for (let u = 0.25; u < len; u += 0.7 + Rg() * 1.1) {
      const x = lip + dir * u, gx = X(x), gy = Y(groundYRaw(x)), h = s * (0.5 + Rg() * 0.9);
      c.fillStyle = Rg() < 0.5 ? '#a4ee72' : '#6ccc50';
      c.beginPath(); c.moveTo(gx - s * 0.26, gy + 1); c.lineTo(gx - s * 0.1, gy - h); c.lineTo(gx + s * 0.04, gy + 1); c.lineTo(gx + s * 0.2, gy - h * 0.75); c.lineTo(gx + s * 0.34, gy + 1); c.closePath(); c.fill();
      if (Rg() < 0.18) { c.fillStyle = ['#ffffff', '#ffe066', '#ff9ec4'][(Rg() * 3) | 0]; c.beginPath(); c.arc(gx + s * 0.5, gy + s * (0.3 + Rg() * 0.4), Math.max(1, s * 0.2), 0, TAU); c.fill(); }
    }
  }

  // 漂在島邊的小碎岩：頂上一小片草，底下一個倒尖
  function rockSprite(w, R, sun) {
    const h = w * 1.2, p = 3, cv = mkCanvas(w + p * 2, h + p * 2), c = cv.getContext('2d'), tx = 0.4 + R() * 0.2, lw = Math.max(1, V.s * 0.16);
    const q = [0.03, 0.17, 0.97, 0.17, 0.9, 0.36, 0.76, 0.44, 0.7, 0.62, tx + 0.09, 0.72, tx, 1, tx - 0.12, 0.64, 0.24, 0.52, 0.1, 0.36];
    for (let i = 0; i < q.length; i += 2) { q[i] = p + q[i] * w; q[i + 1] = p + q[i + 1] * h; }
    poly(c, q); c.fillStyle = lg(c, 0, p, 0, p + h, [0, '#6f5474', 1, '#3f2d55']); c.fill();
    c.save(); c.clip(); c.fillStyle = lg(c, 0, p, 0, p + h, [0, '#b98a7c', 1, '#7a5670']); const rx = p + tx * w;
    if (sun > 0) poly(c, [rx, p + h, rx + w * 0.08, p + h * 0.5, rx - w * 0.04, p, p + w + 4, p, p + w + 4, p + h]); else poly(c, [rx, p + h, rx - w * 0.08, p + h * 0.5, rx + w * 0.04, p, 0, p, 0, p + h]);
    c.fill(); c.fillStyle = 'rgba(36,18,44,.4)'; c.fillRect(0, p + h * 0.24, w + p * 2, h * 0.1); c.restore();
    poly(c, q); c.strokeStyle = '#2f2046'; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke();
    // 草皮
    c.beginPath(); c.moveTo(p, p + h * 0.12); c.quadraticCurveTo(p + w * 0.5, p + h * 0.02, p + w, p + h * 0.12);
    for (let k = 5; k >= 0; k--) { const x = p + w * k / 5, x1 = p + w * (k + 0.5) / 5; if (k < 5) c.quadraticCurveTo(x1, p + h * (0.3 + (k & 1) * 0.05), x, p + h * 0.2); else c.lineTo(x, p + h * 0.2); }
    c.closePath(); c.fillStyle = lg(c, 0, p, 0, p + h * 0.3, [0, '#95ea64', 1, '#56b94a']); c.fill(); c.strokeStyle = '#2c6f2e'; c.stroke();
    return cv;
  }

  // 高空的雲：扁扁一朵。背著光所以偏暗偏冷，只有肚子被底下的朝陽照出一道桃紅（刻意不畫成亮白色，免得瞄準點和敵城看不清楚）
  function hiCloud(w, h, R) {
    const cv = mkCanvas(w, h), c = cv.getContext('2d'), n = 6 + ((R() * 4) | 0), cs = [], rim = h * 0.075;
    for (let k = 0; k < n; k++) { const u = k / (n - 1), r = h * (0.15 + 0.2 * Math.sin(u * Math.PI) + R() * 0.07); cs.push(w * (0.15 + 0.7 * u), h * 0.68 - r * 0.55, r); }
    for (let x = w * 0.1; x < w * 0.92;) { const r = h * (0.12 + R() * 0.07); cs.push(x, h * 0.72 + R() * h * 0.03, r); x += r * (1 + R() * 0.5); }
    const shape = (dy, sh) => { c.beginPath(); c.rect(w * 0.13, h * 0.5 + dy, w * 0.74, h * 0.24); for (let i = 0; i < cs.length; i += 3) { const r = cs[i + 2] - sh; c.moveTo(cs[i] + r, cs[i + 1] + dy); c.arc(cs[i], cs[i + 1] + dy, r, 0, TAU); } };
    shape(0, 0); c.fillStyle = '#ffc9ac'; c.fill(); c.globalCompositeOperation = 'source-atop';
    c.fillStyle = lg(c, 0, 0, 0, h * 0.9, [0, '#b3c4f1', 0.42, '#98a8e2', 0.72, '#b996cc', 1, '#f09aa8']);
    for (let j = 1; j <= 3; j++) { shape(-rim * j / 3, rim * 0.08 * j); c.globalAlpha = j === 3 ? 1 : 0.3 + j * 0.14; c.fill(); }
    return cv;
  }

  return {
    key: 'sky',
    build(c, W, H) {
      const s = V.s, st = [];
      for (let i = 0; i < SKY.length; i += 2) st.push((80 - SKY[i]) / 89, SKY[i + 1]);
      c.fillStyle = lg(c, 0, Y(80), 0, Y(-9), st); c.fillRect(0, 0, W, H);
      // 高空的卷雲（靜態、很淡）：兩頭尖的細絲，兩三條一組
      let R = mkRand(51);
      for (let k = 0, n = Math.round(4 + (V.top - 57) * 0.35); k < n; k++) {
        const gx = V.x0 + R() * (V.x1 - V.x0 - 20), gy = lerp(47, Math.max(55, V.top - 3), (k + R()) / n), tilt = (R() - 0.5) * 0.12;
        for (let j = 0, m = 2 + ((R() * 2) | 0); j < m; j++) {
          const x = X(gx + j * 2.5 + R() * 6), y = Y(gy - j * (0.8 + R() * 0.6)), w = s * (13 + R() * 17), b = s * (0.7 + R() * 1.2), th = s * (0.45 + R() * 0.6), e = y - w * tilt;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.45, (y + e) / 2 - b - th, x + w, e - b * 0.3); c.quadraticCurveTo(x + w * 0.5, (y + e) / 2 - b + th * 0.4, x, y); c.fillStyle = 'rgba(255,255,255,' + (0.09 + R() * 0.1) + ')'; c.fill();
        }
      }
      // 畫面夠高、看得到更高的天空時，掛一彎還沒落下的殘月
      if (V.top > 62) {
        const mx = X(110), my = Y(V.top - 13), mr = s * 2.3;
        c.save(); c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.clip(); c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
        c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.arc(mx + mr * 0.42, my - mr * 0.36, mr * 0.98, 0, TAU, true); c.fillStyle = 'rgba(255,252,240,.62)'; c.fill('evenodd'); c.restore();
      }
      // 朝陽：剛從雲海裡冒出來，往上散幾道很淡的光
      const sx = X(SUNX), sy = Y(SUNY);
      c.fillStyle = rg(c, sx, sy, 0, s * 40, [0, 'rgba(255,228,150,.8)', 0.11, 'rgba(255,208,130,.4)', 0.27, 'rgba(255,192,130,.13)', 0.55, 'rgba(255,186,150,.04)', 1, 'rgba(255,186,150,0)']); c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, sx, sy, s * 5, s * 50, [0, 'rgba(255,232,180,.013)', 0.5, 'rgba(255,220,170,.006)', 1, 'rgba(255,220,170,0)']);
      R = mkRand(52);
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI * (0.12 + 0.76 * (k + R() * 0.7) / 7), w = 0.05 + R() * 0.07;
        for (let j = 1; j <= 3; j++) { const d = w * j / 3; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a - d) * s * 60, sy + Math.sin(a - d) * s * 60); c.lineTo(sx + Math.cos(a + d) * s * 60, sy + Math.sin(a + d) * s * 60); c.closePath(); c.fill(); }   // 三層疊出柔邊
      }
      c.globalCompositeOperation = 'source-over';
      c.save(); c.beginPath(); c.arc(sx, sy, s * 5.3, 0, TAU); c.clip();
      c.fillStyle = lg(c, 0, sy - s * 5.3, 0, sy + s * 2, [0, '#fff4c4', 0.5, '#ffe7a0', 1, '#ffcf7c']); c.fillRect(sx - s * 6, sy - s * 6, s * 12, s * 12);
      c.fillStyle = rg(c, sx, sy, s * 4.2, s * 5.3, [0, 'rgba(255,196,110,0)', 1, 'rgba(255,186,100,.5)']); c.fillRect(sx - s * 6, sy - s * 6, s * 12, s * 12); c.restore();
      // 遠方的積雲塔
      tower(c, -9, 5, 24, 31, mkRand(6), 0.1); tower(c, 121.5, 5, 22, 37, mkRand(14), 0.1); tower(c, 71.5, 5, 10, 14, mkRand(3), 0.35);
      // 天邊的雲海，由遠到近三層；小浮島夾在中間
      bank(c, W, 0, mkRand(71), { hi: 8.6, lo: 6.4, r0: 0.6, r1: 1.5, wl: 22, rw: 0.22, fade: 1.2, rim: '#fff4d6', top: '#ffca92', bot: '#ffdcb4', side: '#c078a8' });
      islet(c, 44.5, 17, 6.5, 0.5, mkRand(2), -1, 1); islet(c, 68.5, 13, 4.4, 0.66, mkRand(82), 0, 0);
      islet(c, -5.4, 26, 7, 0.45, mkRand(83), 0, 0); islet(c, 117.4, 31, 6.4, 0.5, mkRand(84), -1, 0);
      if (V.top > 64) islet(c, 63, V.top - 14, 5, 0.6, mkRand(85), 0, 0);
      bank(c, W, 0, mkRand(72), { hi: 5.7, lo: 3.4, r0: 0.8, r1: 2, wl: 26, rw: 0.28, fade: 1.2, rim: '#fff0d8', top: '#fbb999', bot: '#fccfb6', side: '#b070b0' });
      bank(c, W, 0, mkRand(73), { hi: 2.7, lo: 0.3, r0: 1, r1: 2.6, wl: 30, rw: 0.34, fade: 1.2, rim: '#ffeede', top: '#f3a2a6', bot: '#f9c8c4', side: '#a068b8' });
      // 太陽附近的雲被照得發亮
      c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, sx, sy, 0, s * 20, [0, 'rgba(255,200,110,.13)', 0.45, 'rgba(255,186,120,.05)', 1, 'rgba(255,180,130,0)']); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    },
    terrain(c) {
      // 浮島另外畫在一張圖上：除了貼進背景，back() 每幀還要拿它的下半截蓋在會動的雲海前面
      let top = 0; for (let x = V.x0 - 8; x <= V.x1 + 8; x += 2) top = Math.max(top, groundYRaw(x));
      if (isl) isl.width = isl.height = 0;
      islY = Math.floor(Y(top + 2.6)); isl = mkCanvas(V.W, V.H - islY); const k = isl.getContext('2d'); k.translate(0, -islY);
      fall = null;
      for (const [xa, xb] of groundRuns()) {
        const lipR = xb < V.x1 + 7.9, lip = lipR ? xb : xa;
        island(k, xa, xb, lip, lipR ? -1 : 1, lipR ? 608 : 612, lipR && !fall);
        if (lipR && !fall) fall = { x: lip + 0.4, y: -3 };
      }
      c.drawImage(isl, 0, islY);
    },
    init() {
      const s = V.s, w = Math.ceil(V.W * 1.25);
      for (const L of seas) L.cv.width = L.cv.height = 0;
      const sea = (seed, o, v) => { const oy = Math.floor(Y(o.hi)) - 2, cv = mkCanvas(w + 1, V.H - oy), top = bank(cv.getContext('2d'), w, oy, mkRand(seed), o); return { cv, y: oy, v, top }; };   // 圖比一個週期多一行像素，兩張相接時重疊那一行，才不會露縫
      seas = [
        sea(91, { hi: -2.3, lo: -3.8, r0: 1.1, r1: 2.6, wl: 19, rw: 0.4, fade: 1.2, rim: '#fff0e6', top: '#e88fae', bot: '#f2bccb' }, 0.45),
        sea(92, { hi: -3.9, lo: -5.4, r0: 1.4, r1: 3.2, wl: 23, rw: 0.46, fade: 1.2, rim: '#fff4f0', top: '#cd88c2', bot: '#e3b6d8' }, 0.8),
        sea(93, { hi: -6.0, lo: -7.6, r0: 1.8, r1: 4, wl: 28, rw: 0.52, fade: 1.2, rim: '#fffaff', top: '#a985d2', bot: '#cbb1e6' }, 1.4)
      ];
      cutY = seas[0].y;   // 雲海最高只到這裡（在城樓台基的下緣以下），浮島從這一列以下要重蓋
      highs = [];
      for (let k = 0; k < 3; k++) { const R = mkRand(4 + k), cw = s * (16 + R() * 10), ch = cw * (0.24 + R() * 0.05); highs.push({ cv: hiCloud(cw, ch, R), w: cw / s, x: R() * 200, y: [48, 53.5, Math.max(50.5, V.top - 11)][k] + R() * 1.5, v: 0.55 + R() * 0.5, a: 0.88 }); }
      rocks = [];
      for (const [x, y, rw] of [[39.9, -3.7, 2.6], [42.9, -5.1, 1.5], [71.6, -4.3, 3], [68.8, -3.2, 1.4]]) { const R = mkRand(111 + rocks.length); rocks.push({ cv: rockSprite(rw * s, R, x < SUNX ? 1 : -1), x, y, p: R() * TAU }); }
      puff = mkCanvas(48, 48); const pc = puff.getContext('2d'); pc.fillStyle = rg(pc, 24, 24, 0, 24, [0, 'rgba(255,255,255,.9)', 0.5, 'rgba(255,255,255,.4)', 1, 'rgba(255,255,255,0)']); pc.fillRect(0, 0, 48, 48);
      glow = mkCanvas(128, 64); const gc = glow.getContext('2d'); gc.translate(64, 32); gc.scale(2, 1); gc.fillStyle = rg(gc, 0, 0, 0, 32, [0, 'rgba(255,214,150,.3)', 0.45, 'rgba(255,196,140,.12)', 1, 'rgba(255,190,140,0)']); gc.fillRect(-32, -32, 64, 64);
      wisps = [];
      for (let k = 0; k < 2; k++) {
        const cv = mkCanvas(256, 64), c = cv.getContext('2d'), R = mkRand(121 + k);
        for (let j = 0; j < 9; j++) { const rx = 44 + R() * 60, ry = 5 + R() * 7, x = rx + 4 + R() * (248 - rx * 2), y = 32 + (R() - 0.5) * 26; c.save(); c.translate(x, y); c.scale(rx / ry, 1); c.fillStyle = rg(c, 0, 0, 0, ry, [0, 'rgba(255,248,240,.5)', 1, 'rgba(255,248,240,0)']); c.fillRect(-ry, -ry, ry * 2, ry * 2); c.restore(); }
        wisps.push(k ? { cv, w: 36, h: 7, y: 11.5, v: 3.4, a: 0.46, o: 30, gap: 150, mid: 1 } : { cv, w: 72, h: 7, y: -3, v: 2.6, a: 0.5, o: 0, gap: 70 });
      }
    },
    back(c, t, dt) {
      const s = V.s;
      const sea = (L) => { const P = L.cv.width - 1, o = (t * L.v * s) % P; if (o > 0) c.drawImage(L.cv, o - P, L.y); if (o < V.W) c.drawImage(L.cv, o, L.y); return o; };
      // 雲海遠的兩層慢慢往右流；太陽正下方的雲頂染上一片暖光，微微呼吸
      sea(seas[0]); sea(seas[1]);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.72 + 0.14 * Math.sin(t * 0.7); c.drawImage(glow, X(SUNX - 16), Y(0.5), s * 32, s * 10.5); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      // 浮島的下半截蓋回去（雲在島的後面），再疊上最近的一層雲，石筍尖就沒進雲裡
      c.drawImage(isl, 0, cutY - islY, V.W, V.H - cutY, 0, cutY, V.W, V.H - cutY);
      if (fall) { c.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 3; k++) { const y = fall.y - ((t * 5.5 + k * 1.7) % 4.2); c.fillRect(X(fall.x) + (k - 1.4) * s * 0.2, Y(y), Math.max(1, s * 0.12), s * 0.7); } }   // 瀑布上往下流的白紋
      for (const k of rocks) c.drawImage(k.cv, X(k.x) - k.cv.width / 2, Y(k.y + Math.sin(t * 0.9 + k.p) * 0.22) - k.cv.height * 0.2);
      const L = seas[2], o = sea(L);
      if (fall) {
        // 瀑布落進雲裡的地方冒一團水霧，跟著雲頂起伏
        const P = L.cv.width - 1, fx = X(fall.x), my = L.y + L.top(((fx - o) % P + P) % P);
        for (let k = 0; k < 6; k++) { const p = (t * 0.2 + k / 6) % 1, r = s * (0.9 + p * 1.3); c.globalAlpha = Math.sin(p * Math.PI) * 0.7; c.drawImage(puff, fx + s * (Math.sin(k * 2.4) * 1.0 + p * 0.7) - r, my - s * (p * 1.4 - 0.35) - r, r * 2, r * 2); }
        c.globalAlpha = 1;
      }
      // 高空的雲
      for (const k of highs) { const span = V.x1 - V.x0 + k.w + 14; c.globalAlpha = k.a; c.drawImage(k.cv, X(V.x0 - k.w - 2 + (k.x + t * k.v) % span), Y(k.y)); }
      c.globalAlpha = 1;
      // 鶴群：排成人字，由右往左慢慢飛過太陽前面
      const p = (t + 40) % 84;
      if (p < 28) {
        const u = p / 28, bx = lerp(V.x1 + 4, V.x0 - 14, u), by = 17 + Math.sin(u * Math.PI) * 3;
        c.strokeStyle = 'rgba(44,50,98,.8)'; c.lineWidth = Math.max(1.2, s * 0.2); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
        for (let k = 0; k < 7; k++) {
          const row = (k + 1) >> 1, sd = k & 1 ? 1 : -1, x = X(bx + row * 1.8 + Math.sin(k * 1.9) * 0.3), y = Y(by + sd * row * 0.85 + Math.sin(t * 1.1 + k) * 0.18), w = s * 0.9, f = Math.sin(t * 5 + k * 1.3), ty = y - w * (0.12 + 0.5 * f), my = y - w * (0.42 + 0.2 * f);
          c.moveTo(x - w, ty); c.quadraticCurveTo(x - w * 0.45, my, x, y); c.quadraticCurveTo(x + w * 0.45, my, x + w, ty);
        }
        c.stroke();
      }
    },
    front(c, t, dt) {
      // 偶爾貼著鏡頭飄過的薄雲，很淡：一朵在島底下，一朵掠過城腳。掠過城腳的那朵飄進兩城之間就散掉，不擋砲彈和瞄準點
      for (const k of wisps) {
        const span = V.x1 - V.x0 + k.w + k.gap, x = V.x0 - k.w + (k.o + t * k.v) % span, a = k.mid ? k.a * clamp((Math.abs(x + k.w / 2 - 56) - 30) / 12, 0, 1) : k.a;   // 56 = 戰場中線
        if (x > V.x1 || a <= 0) continue;
        c.globalAlpha = a; c.drawImage(k.cv, X(x), Y(k.y), k.w * V.s, k.h * V.s);
      }
      c.globalAlpha = 1;
    }
  };
})();
