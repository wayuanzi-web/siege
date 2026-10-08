/* ===== 36-scene-sky: 第五關「雲海浮島」— 日出的雲海。兩座城各蓋在一塊用氣球吊著的浮島上（浮島、氣球由遊戲畫），
   底下沒有地面：雲海一層疊一層往下沉，越深越暗，最底下是看不到底的紫色深淵，掉下去的東西都沒進去。
   天邊只有幾座很遠、很淡的小浮島和積雲塔；鶴群、風絲不時掠過 ===== */
THEMES[4] = (function () {
  const SUNX = 56, SUNY = 8.6;
  // 天色：戰場高度 → 顏色。上面蔚藍、中段青綠，貼近雲海的地方轉成桃色、粉色
  const SKY = [80, '#1c5bc0', 64, '#2876d4', 50, '#3391de', 38, '#3faadd', 27, '#4cc2d6', 19, '#62ccc6', 13, '#9cd4b6', 8.5, '#ecd092', 4.5, '#fbc692', 0.5, '#fdae94', -4, '#f598a4', -9, '#e486b4'];
  // 雲海底下的深淵：高度 → 顏色。貼著天邊還是桃粉色，越往下越紫、越暗，畫面最底下是深靛色
  const ABYSS = [8, '#f8bc9c', 4, '#eea4a8', 0.5, '#d08ab8', -3, '#9e78c0', -6, '#6250a8', -9, '#2e2a78', -20, '#1c1a58'];
  const ABY = '#2e2a78';
  let seas = [], highs = [], wisps = [], winds = [], glow = null, veil = null, windCv = null;

  function grad(T, y) {
    for (let i = 2; i < T.length; i += 2) if (y >= T[i]) return mix(T[i - 1], T[i + 1], clamp((T[i - 2] - y) / (T[i - 2] - T[i]), 0, 1));
    return T[T.length - 1];
  }
  const skyAt = (y) => grad(SKY, y), abyssAt = (y) => grad(ABYSS, y);

  // 一層雲海：雲頂在高度 lo…hi 之間起伏（戰場座標），一顆顆圓疊成雲頭，上緣留一道亮邊；雲身在 lo - fade 以下化進深淵的顏色，
  // 所以一層一層的雲頭之間看得到底下越來越暗的深處。畫在 c 的 x = 0…w；oy 是 c 的原點對應的畫面 y。左右可以無縫相接
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
    const hb = V.H - oy + 4, g1 = Y(o.lo - o.fade) - oy;
    const shape = (dy, sh) => {
      c.beginPath(); c.moveTo(-4, hb); for (let x = -4; x <= w + 4; x += 5) c.lineTo(x, line(x) + rad(x) * 0.7 + dy); c.lineTo(w + 4, hb); c.closePath();
      for (let i = 0; i < cs.length; i += 3) for (let m = -1; m <= 1; m++) { const x = cs[i] + m * w, r = cs[i + 2] - sh; if (r > 0.5 && x + r > 0 && x - r < w + 2) { c.moveTo(x + r, cs[i + 1] + dy); c.arc(x, cs[i + 1] + dy, r, 0, TAU); } }
    };
    shape(0, 0); c.fillStyle = o.rim; c.fill();
    // 亮邊往下分三階化進雲身，邊緣才不會像描了一圈線；雲身再往下照著深淵的漸層一路變暗
    const st = [0, o.top, clamp((g1 - hi) / (hb - hi), 0.02, 0.98), abyssAt(o.lo - o.fade)];
    for (let i = 0; i < ABYSS.length; i += 2) { const u = (Y(ABYSS[i]) - oy - hi) / (hb - hi); if (u > st[st.length - 2] + 0.01 && u < 1) st.push(u, ABYSS[i + 1]); }
    st.push(1, abyssAt(WY(hb + oy)));
    c.fillStyle = lg(c, 0, hi, 0, hb, st);
    for (let j = 1; j <= 3; j++) { shape(s * o.rw * j / 3, s * o.rw * 0.1 * j); c.globalAlpha = j === 3 ? 1 : 0.3 + j * 0.14; c.fill(); }
    c.globalAlpha = 1;
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

  // 天邊很遠的小浮島：平頂、倒掛的岩底，幾乎融進天色（只是點綴，比城底下那兩座真的浮島小得多、淡得多）。fl = 瀑布掛在哪一側（0 沒有）
  function islet(c, x, y, w, hz, R, fl) {
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
    for (let k = 0, n = 2 + ((R() * 2) | 0); k < n; k++) { const tx = px + (R() - 0.5) * hw * 1.5, r = hw * (0.1 + R() * 0.1), ty = py - hw * 0.16 * (1 - Math.pow((tx - px) / hw, 2)) - r * 0.6; c.fillStyle = dk; c.beginPath(); c.arc(tx - r * 0.5, ty, r * 0.75, 0, TAU); c.arc(tx + r * 0.55, ty + r * 0.1, r * 0.7, 0, TAU); c.arc(tx, ty - r * 0.4, r, 0, TAU); c.fill(); }
    // 細細一條瀑布，落到半空化成霧
    if (fl) {
      const fx = px + fl * hw * 0.72, fy = py + hw * 0.08, L = s * w * 1.25;
      c.strokeStyle = lg(c, 0, fy, 0, fy + L, [0, 'rgba(255,255,255,.7)', 0.6, 'rgba(255,255,255,.4)', 1, 'rgba(255,255,255,0)']); c.lineWidth = Math.max(1, s * 0.12); c.lineCap = 'butt'; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy + L); c.stroke();
    }
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

  // 一張柔邊的長條霧（橫向的橢圓光暈疊起來）
  function mistSprite(seed, col, a) {
    const cv = mkCanvas(256, 64), c = cv.getContext('2d'), R = mkRand(seed);
    for (let j = 0; j < 9; j++) { const rx = 44 + R() * 60, ry = 5 + R() * 7, x = rx + 4 + R() * (248 - rx * 2), y = 32 + (R() - 0.5) * 26; c.save(); c.translate(x, y); c.scale(rx / ry, 1); c.fillStyle = rg(c, 0, 0, 0, ry, [0, 'rgba(' + col + ',' + a + ')', 1, 'rgba(' + col + ',0)']); c.fillRect(-ry, -ry, ry * 2, ry * 2); c.restore(); }
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
      // 遠方的積雲塔（只在畫面兩側，浮島的外面）
      tower(c, -11, 5, 24, 31, mkRand(6), 0.12); tower(c, 123.5, 5, 22, 37, mkRand(14), 0.12);
      // 天邊很遠很淡的小浮島：雲海最遠那一層後面露出一點頭
      islet(c, -12.5, 10.4, 2.6, 0.7, mkRand(83), 0); islet(c, 47.6, 10.2, 1.5, 0.74, mkRand(2), -1);
      islet(c, 64.8, 9.7, 1.1, 0.78, mkRand(82), 0); islet(c, 125.5, 11.2, 2.2, 0.72, mkRand(84), 1);
      // 天邊的雲海，由遠到近三層：越近越往下、越偏紫，雲身往下化進深淵的顏色
      bank(c, W, 0, mkRand(71), { hi: 8.6, lo: 6.4, r0: 0.6, r1: 1.5, wl: 22, rw: 0.22, fade: 1.2, rim: '#fff4d6', top: '#ffca92', side: '#c078a8' });
      bank(c, W, 0, mkRand(72), { hi: 5.7, lo: 3.4, r0: 0.8, r1: 2, wl: 26, rw: 0.28, fade: 1.2, rim: '#fff0d8', top: '#fbb999', side: '#b070b0' });
      bank(c, W, 0, mkRand(73), { hi: 2.7, lo: 0.3, r0: 1, r1: 2.6, wl: 30, rw: 0.34, fade: 1.2, rim: '#ffeede', top: '#f3a2a6', side: '#a068b8' });
      // 太陽附近的雲被照得發亮
      c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, sx, sy, 0, s * 20, [0, 'rgba(255,200,110,.13)', 0.45, 'rgba(255,186,120,.05)', 1, 'rgba(255,180,130,0)']); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    },
    // 這一關整片都是 voids，沒有地面可畫（兩座浮島是會動的實體，由遊戲另外畫）
    terrain() {},
    init() {
      const s = V.s, w = Math.ceil(V.W * 1.25);
      for (const L of seas) L.cv.width = L.cv.height = 0;
      const sea = (seed, o, v) => { const oy = Math.floor(Y(o.hi)) - 2, cv = mkCanvas(w + 1, V.H - oy), top = bank(cv.getContext('2d'), w, oy, mkRand(seed), o); return { cv, y: oy, v, top }; };   // 圖比一個週期多一行像素，兩張相接時重疊那一行，才不會露縫
      // 往下沉的三層雲海：雲頂一層比一層低、雲頭一層比一層大，雲身往下化進深淵的暗紫
      seas = [
        sea(91, { hi: -2.3, lo: -3.8, r0: 1.1, r1: 2.6, wl: 19, rw: 0.4, fade: 1.2, rim: '#ffe2ea', top: '#e690b0' }, 0.45),
        sea(92, { hi: -4.2, lo: -5.7, r0: 1.4, r1: 3.2, wl: 23, rw: 0.46, fade: 1.2, rim: '#f0d4f2', top: '#b888cc' }, 0.8),
        sea(93, { hi: -6.5, lo: -8.1, r0: 1.8, r1: 4, wl: 28, rw: 0.52, fade: 1.2, rim: '#d4c8f6', top: '#8878c6' }, 1.4)
      ];
      highs = [];
      for (let k = 0; k < 3; k++) { const R = mkRand(4 + k), cw = s * (16 + R() * 10), ch = cw * (0.24 + R() * 0.05); highs.push({ cv: hiCloud(cw, ch, R), w: cw / s, x: R() * 200, y: [48, 53.5, Math.max(50.5, V.top - 11)][k] + R() * 1.5, v: 0.55 + R() * 0.5, a: 0.88 }); }
      glow = mkCanvas(128, 64); const gc = glow.getContext('2d'); gc.translate(64, 32); gc.scale(2, 1); gc.fillStyle = rg(gc, 0, 0, 0, 32, [0, 'rgba(255,214,150,.3)', 0.45, 'rgba(255,196,140,.12)', 1, 'rgba(255,190,140,0)']); gc.fillRect(-32, -32, 64, 64);
      // 深淵：畫面最底下一層往下越來越濃的暗紫（蓋在所有東西前面，掉下去的東西慢慢沒進去）
      veil = mkCanvas(1, 64); const vc = veil.getContext('2d'); vc.fillStyle = lg(vc, 0, 0, 0, 64, [0, rgba(ABY, 0), 0.45, rgba(ABY, 0.22), 1, rgba(ABY, 0.62)]); vc.fillRect(0, 0, 1, 64);
      // 貼著鏡頭飄過的薄雲：一朵淡紫的貼著深淵飄，一朵掠過城腳
      wisps = [{ cv: mistSprite(121, '214,204,255', 0.42), w: 72, h: 7, y: -2.6, v: 2.6, a: 0.5, o: 0, gap: 70 }, { cv: mistSprite(122, '255,248,240', 0.5), w: 36, h: 7, y: 11.5, v: 3.4, a: 0.46, o: 30, gap: 150, mid: 1 }];
      // 風絲：兩頭尖的細白線，貼著雲海上面很快地吹過去
      windCv = mkCanvas(256, 8); const wc = windCv.getContext('2d'); wc.fillStyle = lg(wc, 0, 0, 256, 0, [0, 'rgba(255,255,255,0)', 0.3, 'rgba(255,255,255,.9)', 0.7, 'rgba(255,255,255,.9)', 1, 'rgba(255,255,255,0)']);
      wc.beginPath(); wc.moveTo(0, 4); wc.quadraticCurveTo(128, 0.5, 256, 4); wc.quadraticCurveTo(128, 7.5, 0, 4); wc.fill();
      const R = mkRand(131); winds = [];
      for (let k = 0; k < 6; k++) winds.push({ x: V.x0 + R() * (V.x1 - V.x0), y: -4.6 + R() * 8.4, w: 8 + R() * 10, v: 9 + R() * 7, a: 0.3 + R() * 0.25, p: R() * TAU });
    },
    back(c, t, dt) {
      const s = V.s;
      const sea = (L) => { const P = L.cv.width - 1, o = (t * L.v * s) % P; if (o > 0) c.drawImage(L.cv, o - P, L.y); if (o < V.W) c.drawImage(L.cv, o, L.y); return o; };
      // 三層雲海往右流，越近越快；最遠那層在太陽正下方的雲頂染上一片暖光，微微呼吸
      sea(seas[0]);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.72 + 0.14 * Math.sin(t * 0.7); c.drawImage(glow, X(SUNX - 16), Y(0.5), s * 32, s * 10.5); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      sea(seas[1]); sea(seas[2]);
      // 風絲：一陣一陣貼著雲海吹過去，淡進淡出
      for (const k of winds) {
        k.x += k.v * dt; if (k.x > V.x1 + 2) { k.x = V.x0 - k.w - Math.random() * 30; k.y = -4.6 + Math.random() * 8.4; }
        const u = (k.x - V.x0 + k.w) / (V.x1 - V.x0 + k.w); c.globalAlpha = k.a * Math.sin(clamp(u, 0, 1) * Math.PI);
        c.drawImage(windCv, X(k.x), Y(k.y + Math.sin(t * 0.9 + k.p) * 0.3), k.w * s, Math.max(2, s * 0.4));
      }
      c.globalAlpha = 1;
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
      // 深淵：畫面最底下往下越來越暗，掉下去的城磚、兵、浮島都沒進去
      const vy = Math.floor(Y(-2.2)); if (vy < V.H) c.drawImage(veil, 0, vy, V.W, V.H - vy);
      // 偶爾貼著鏡頭飄過的薄雲，很淡：一朵貼著深淵，一朵掠過城腳。掠過城腳的那朵飄進兩城之間就散掉，不擋砲彈和瞄準點
      for (const k of wisps) {
        const span = V.x1 - V.x0 + k.w + k.gap, x = V.x0 - k.w + (k.o + t * k.v) % span, a = k.mid ? k.a * clamp((Math.abs(x + k.w / 2 - 56) - 30) / 12, 0, 1) : k.a;   // 56 = 戰場中線
        if (x > V.x1 || a <= 0) continue;
        c.globalAlpha = a; c.drawImage(k.cv, X(x), Y(k.y), k.w * V.s, k.h * V.s);
      }
      c.globalAlpha = 1;
    }
  };
})();
