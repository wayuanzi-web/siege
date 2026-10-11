/* ===== 36-scene-storm: 第十四關「颶風風車」— 颱風天的海邊平原：天上一層層壓得很低的烏雲照風向飛快地跑，
   遠處一排小風車、海平線上一道白浪，偶爾一道閃電照亮雲底；地上的草、遠處的樹被風壓得往一邊倒，雨絲照風向斜斜地打下來。
   中間的小山是地形（擋平射） ===== */
THEMES[13] = (function () {
  const HZ = 9;                        // 遠處的地平線（海）
  let layers = [], rain = [], leaves = [], flash = 0, nextFlash = 4, mills = [];
  // 一團扁扁的烏雲（頂上亮一點、底下暗）
  function stormCloud(w, h, R, top, bot) {
    const cv = mkCanvas(w, h), c = cv.getContext('2d'), n = 6 + ((R() * 4) | 0);
    c.fillStyle = '#000';
    for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, r = h * (0.25 + 0.2 * Math.sin(u * Math.PI) + R() * 0.08); c.beginPath(); c.arc(w * (0.08 + 0.84 * u), h * 0.55 - r * 0.2, r, 0, TAU); c.fill(); }
    c.fillRect(w * 0.08, h * 0.5, w * 0.84, h * 0.3);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = lg(c, 0, 0, 0, h, [0, top, 0.55, mix(top, bot, 0.5), 1, bot]); c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = lg(c, 0, 0, 0, h, [0, '#000', 0.75, '#000', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
    return cv;
  }
  // 遠處的小風車（剪影，葉輪會轉）
  function millSil(c, x, y, h, col, ang) {
    const s = V.s, w = h * 0.32;
    c.fillStyle = col; c.beginPath(); c.moveTo(X(x - w * 0.6), Y(y)); c.lineTo(X(x - w * 0.35), Y(y + h)); c.lineTo(X(x + w * 0.35), Y(y + h)); c.lineTo(X(x + w * 0.6), Y(y)); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(X(x - w * 0.5), Y(y + h)); c.lineTo(X(x), Y(y + h + w * 0.6)); c.lineTo(X(x + w * 0.5), Y(y + h)); c.closePath(); c.fill();
    c.strokeStyle = col; c.lineWidth = Math.max(1, s * h * 0.04);
    for (let k = 0; k < 4; k++) { const a = ang + k * Math.PI / 2, L = h * 0.75; c.beginPath(); c.moveTo(X(x), Y(y + h * 0.85)); c.lineTo(X(x + Math.cos(a) * L), Y(y + h * 0.85 + Math.sin(a) * L)); c.stroke(); }
  }
  return {
    key: 'storm',
    build(c, W, H) {
      const R = mkRand(1414), s = V.s;
      // 天：壓得很低的灰藍色雲天，地平線那邊透一點暗黃的光
      c.fillStyle = lg(c, 0, 0, 0, Y(HZ), [0, '#2a3340', 0.4, '#3d4a58', 0.75, '#5d6a72', 0.92, '#8a8c7e', 1, '#a8a088']); c.fillRect(0, 0, W, Y(HZ) + 1);
      // 雲底一大片一大片的暗影
      for (let k = 0; k < 9; k++) { const x = X(V.x0 + R() * (V.x1 - V.x0)), y = Y(26 + R() * 30), r = s * (16 + R() * 20); c.fillStyle = rg(c, x, y, 0, r, [0, 'rgba(20,26,34,.35)', 1, 'rgba(20,26,34,0)']); c.fillRect(x - r, y - r, r * 2, r * 2); }
      // 遠處的海：一道暗綠灰的海、一條碎白浪
      c.fillStyle = lg(c, 0, Y(HZ + 1.2), 0, Y(HZ - 2), [0, '#56676c', 1, '#3e4f55']); c.fillRect(0, Y(HZ + 1.2), W, s * 3.4);
      c.fillStyle = 'rgba(230,236,232,.55)'; for (let k = 0; k < 40; k++) { const x = X(V.x0 + R() * (V.x1 - V.x0)), w = s * (1 + R() * 3); c.fillRect(x, Y(HZ + 1.1 - R() * 0.4), w, Math.max(1, s * 0.14)); }
      // 遠處的丘陵：兩層，越遠越淡
      ridge(c, ridgeFn(R, 0.05), HZ + 3.5, 2.2, '#4e6352', 1.2);
      ridge(c, ridgeFn(R, 0.07), HZ + 1.2, 1.6, '#3f5743', 1.2);
      // 遠處一排小風車的位置（剪影在 back 裡畫：葉輪會轉）
      mills = [];
      for (const [x, h] of [[V.x0 + 7, 3.4], [V.x0 + 15, 2.6], [30, 2.2], [82, 2.4], [V.x1 - 14, 2.8], [V.x1 - 6, 3.6]]) mills.push({ x, y: groundYRaw(Math.max(V.x0, Math.min(V.x1, x))) > 2 ? HZ + 3 : HZ + 2.6, h, a: R() * TAU });
    },
    terrain(c) {
      // 地面：暗綠的草地（被雨打濕），上緣一排被風壓倒的草
      const R = mkRand(1515), s = V.s;
      solidGround(c, { fill: lg(c, 0, Y(8), 0, V.H, [0, '#4f7d3f', 0.3, '#3d6430', 1, '#26401f']), band: '#5d8c48', bandH: 0.5, edge: '#2a4420', edgeW: 0.2 });
      c.strokeStyle = '#6f9c55'; c.lineWidth = Math.max(1, s * 0.12); c.lineCap = 'round';
      for (let x = V.x0; x < V.x1; x += 0.35 + R() * 0.3) { const y = groundYRaw(x), h = 0.4 + R() * 0.6; c.beginPath(); c.moveTo(X(x), Y(y)); c.quadraticCurveTo(X(x + 0.2), Y(y + h * 0.6), X(x + 0.5 + R() * 0.3), Y(y + h)); c.stroke(); }
      // 小山頂上一塊界碑似的石頭
      for (let k = 0; k < 18; k++) { const x = V.x0 + R() * (V.x1 - V.x0), y = groundYRaw(x); c.fillStyle = R() < 0.5 ? '#5f6a5a' : '#737d6c'; ell(c, X(x), Y(y + 0.15), s * (0.3 + R() * 0.5), s * (0.15 + R() * 0.2)); c.fill(); }
    },
    init() {
      const R = mkRand(1616); layers = [];
      for (let L = 0; L < 3; L++) for (let k = 0; k < 4; k++) {
        const w = V.s * (18 + R() * 18) * (1 + L * 0.3), h = w * (0.28 + R() * 0.08);
        layers.push({ cv: stormCloud(Math.ceil(w), Math.ceil(h), R, L === 2 ? '#6c7682' : '#56606c', L === 2 ? '#2c3440' : '#222a34'), x: V.x0 + R() * (V.x1 - V.x0 + 60) - 30, y: 36 + L * 7 + R() * 8, v: 2 + L * 2.2 + R() * 1.5, a: 0.55 + L * 0.12 });
      }
      rain = []; for (let k = 0; k < 120; k++) rain.push({ x: V.x0 + R() * (V.x1 - V.x0), y: R() * 64 - 9, v: 34 + R() * 16, l: 1 + R() * 1.4 });
      leaves = []; for (let k = 0; k < 14; k++) leaves.push({ x: V.x0 + R() * (V.x1 - V.x0), y: 2 + R() * 30, p: R() * TAU, v: 6 + R() * 6 });
      flash = 0; nextFlash = 3 + R() * 5;
    },
    back(c, t, dt) {
      const s = V.s, wd = S.wind || 0, dir = wd < 0 ? -1 : 1;
      // 閃電：偶爾一下，雲底整片亮起來
      nextFlash -= dt; if (nextFlash <= 0) { flash = 1; nextFlash = 5 + Math.random() * 8; }
      if (flash > 0) { c.fillStyle = 'rgba(220,230,255,' + (flash * 0.28).toFixed(3) + ')'; c.fillRect(0, 0, V.W, Y(HZ)); flash = Math.max(0, flash - dt * 3.2); }
      // 遠處的小風車（照風轉）
      for (const m of mills) { m.a -= dir * (0.8 + Math.abs(wd) * 0.25) * dt; millSil(c, m.x, m.y, m.h, 'rgba(40,52,48,.75)', m.a); }
      // 烏雲：照風向跑（風越大跑越快）
      for (const k of layers) {
        k.x += (k.v * (0.4 + Math.abs(wd) * 0.12) * dir) * dt;
        const wpx = k.cv.width / V.s;
        if (dir > 0 && X(k.x) > V.W + 10) k.x = V.x0 - wpx - 4; if (dir < 0 && X(k.x + wpx) < -10) k.x = V.x1 + 4;
        c.globalAlpha = k.a; c.drawImage(k.cv, X(k.x), Y(k.y));
      }
      c.globalAlpha = 1;
    },
    front(c, t, dt) {
      const s = V.s, wd = S.wind || 0, slant = clamp(wd * 0.08, -0.7, 0.7);
      // 雨：照風向斜斜地打下來
      c.strokeStyle = 'rgba(200,214,230,.45)'; c.lineWidth = Math.max(1, s * 0.07); c.beginPath();
      for (const r of rain) {
        r.y -= r.v * dt; r.x += r.v * slant * dt;
        if (r.y < -9) { r.y = 58 + Math.random() * 6; r.x = V.x0 + Math.random() * (V.x1 - V.x0); }
        if (r.x > V.x1 + 2) r.x = V.x0 - 2; else if (r.x < V.x0 - 2) r.x = V.x1 + 2;
        c.moveTo(X(r.x), Y(r.y)); c.lineTo(X(r.x - r.l * slant), Y(r.y + r.l));
      }
      c.stroke();
      // 被風捲著跑的葉子
      c.fillStyle = 'rgba(120,150,70,.8)';
      for (const l of leaves) {
        l.x += (l.v * (wd < 0 ? -1 : 1) * (0.5 + Math.abs(wd) * 0.12)) * dt; l.y += Math.sin(t * 2 + l.p) * 2 * dt;
        if (l.x > V.x1 + 3) l.x = V.x0 - 3; else if (l.x < V.x0 - 3) l.x = V.x1 + 3;
        c.save(); c.translate(X(l.x), Y(l.y)); c.rotate(t * 4 + l.p); c.fillRect(-s * 0.25, -s * 0.1, s * 0.5, s * 0.2); c.restore();
      }
    }
  };
})();
