/* ===== 36-scene-peak: 第十九關「天秤孤峰」— 高山之巔的午後。一座孤峰從雲海裡拔起來，頂上架著一根巨樑（巨樑和兩座城由遊戲畫），
   兩頭底下什麼都沒有：雲海一層一層往下沉。天邊是一排積雪的遠山，偶爾一群雁飛過，風絲從樑下吹過 ===== */
THEMES[18] = (function () {
  const SKY = [80, '#3a6cc4', 60, '#4f86d2', 42, '#6aa2dc', 28, '#8cbde2', 16, '#b4d4e4', 8, '#dce4dc', 2, '#f2e2c4', -3, '#f4d6b4', -10, '#d8b8b0'];
  let clouds = [], geese = [], wisps = [];
  function grad(T, y) { for (let i = 2; i < T.length; i += 2) if (y >= T[i]) return mix(T[i - 1], T[i + 1], clamp((T[i - 2] - y) / (T[i - 2] - T[i]), 0, 1)); return T[T.length - 1]; }
  // 一排積雪的遠山：山脊、背陰面、雪線
  function range(c, R, yBase, amp, col, snow, f0, haze) {
    const fn = ridgeFn(R, f0), x0 = V.x0 - 4, x1 = V.x1 + 4, pts = [];
    for (let x = x0; x <= x1 + 1; x += 0.8) pts.push(x, yBase + amp * (0.55 + 0.45 * fn(x)) + amp * 0.35 * Math.pow(Math.max(0, fn(x * 1.7 + 3)), 3));
    c.beginPath(); c.moveTo(X(x0), V.H + 2); for (let i = 0; i < pts.length; i += 2) c.lineTo(X(pts[i]), Y(pts[i + 1])); c.lineTo(X(x1 + 1), V.H + 2); c.closePath();
    c.fillStyle = lg(c, 0, Y(yBase + amp), 0, Y(yBase - 6), [0, col, 1, mix(col, haze, 0.6)]); c.fill();
    // 雪：山脊往下一小段，往陽光那一邊（左上）亮一點
    c.save(); c.clip();
    c.beginPath(); for (let i = 0; i < pts.length; i += 2) { const y = pts[i + 1]; if (i) c.lineTo(X(pts[i]), Y(y)); else c.moveTo(X(pts[i]), Y(y)); }
    for (let i = pts.length - 2; i >= 0; i -= 2) { const y = pts[i + 1], d = 1.6 + 1.4 * Math.abs(Math.sin(pts[i] * 0.37)) + (y - yBase) * 0.12; c.lineTo(X(pts[i]), Y(y - d)); }
    c.closePath(); c.fillStyle = snow; c.fill();
    c.restore();
  }
  // 雲海：一排排圓圓的雲頭，越下面越暗越紫
  function sea(c, R, y, amp, top, bot, step) {
    const s = V.s, x0 = V.x0 - 6, x1 = V.x1 + 6;
    c.beginPath(); c.moveTo(X(x0), V.H + 4);
    for (let x = x0; x <= x1;) { const r = (step * (0.7 + R() * 0.6)), yy = y + (R() - 0.5) * amp; c.lineTo(X(x), Y(yy)); c.arc(X(x + r), Y(yy), r * s, Math.PI, 0); x += r * 2; }
    c.lineTo(X(x1), V.H + 4); c.closePath();
    c.fillStyle = lg(c, 0, Y(y + amp), 0, V.H, [0, top, 1, bot]); c.fill();
  }
  return {
    key: 'peak',
    build(c, W, H) {
      const st = []; for (let i = 0; i < SKY.length; i += 2) st.push(clamp((80 - SKY[i]) / 90, 0, 1), SKY[i + 1]);
      c.fillStyle = lg(c, 0, Y(80), 0, Y(-10), st); c.fillRect(0, 0, W, H);
      const R = mkRand(1919), s = V.s;
      // 太陽（左上）：一團柔光
      const sx = X(14), sy = Y(54); c.fillStyle = rg(c, sx, sy, 0, s * 26, [0, 'rgba(255,250,224,.95)', 0.12, 'rgba(255,240,200,.6)', 0.4, 'rgba(255,230,190,.18)', 1, 'rgba(255,230,190,0)']); c.fillRect(0, 0, W, H);
      // 很高的卷雲
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const x = V.x0 + R() * (V.x1 - V.x0), y = 44 + R() * 18, L = 8 + R() * 16; c.lineWidth = s * (0.3 + R() * 0.5); c.beginPath(); c.moveTo(X(x), Y(y)); c.quadraticCurveTo(X(x + L * 0.5), Y(y + 1.2), X(x + L), Y(y + 0.3)); c.stroke(); }
      range(c, R, 13, 15, '#8ca0c4', 'rgba(244,248,255,.92)', 0.07, SKY[11]);
      range(c, R, 6, 12, '#6e84aa', 'rgba(236,242,252,.9)', 0.11, SKY[13]);
      // 遠處另外兩座小孤峰（跟中間這座一樣，從雲海裡冒出來）
      for (const [x, w, h] of [[V.x0 + 6, 5, 12], [V.x1 - 9, 6, 9]]) { c.fillStyle = '#5a6488'; poly(c, [X(x - w), Y(-4), X(x - w * 0.3), Y(h), X(x + w * 0.15), Y(h + 1.5), X(x + w), Y(-4)]); c.fill(); c.fillStyle = 'rgba(240,244,255,.8)'; poly(c, [X(x - w * 0.42), Y(h * 0.72), X(x - w * 0.3), Y(h), X(x + w * 0.15), Y(h + 1.5), X(x + w * 0.4), Y(h * 0.78), X(x), Y(h * 0.82)]); c.fill(); }
      sea(c, R, -1.5, 1.4, '#fbeadc', '#c8a8c0', 2.6);
    },
    terrain(c) {
      // 中間的孤峰：撐著巨樑的岩柱，從雲海裡拔起來（頂端就在巨樑底下）
      const s = V.s, R = mkRand(77), cx = 56, top = -2.95;
      const pts = [cx - 1.9, top, cx - 2.6, top - 1.2, cx - 3.4, top - 2.6, cx - 5.2, top - 4.2, cx - 6.4, top - 6.8, cx - 9, -16, cx + 9, -16, cx + 6.6, top - 6.4, cx + 5, top - 4.6, cx + 3.6, top - 2.4, cx + 2.6, top - 1.1, cx + 1.9, top];
      const q = []; for (let i = 0; i < pts.length; i += 2) q.push(X(pts[i]), Y(pts[i + 1]));
      poly(c, q); c.fillStyle = lg(c, X(cx - 8), 0, X(cx + 8), 0, [0, '#5c5468', 0.42, '#8a8096', 0.6, '#6e6680', 1, '#3c3648']); c.fill();
      c.strokeStyle = '#231e2c'; c.lineWidth = Math.max(1.5, s * 0.22); c.stroke();
      c.strokeStyle = 'rgba(30,24,40,.5)'; c.lineWidth = Math.max(1, s * 0.12);
      for (let k = 0; k < 6; k++) { const y = top - 1 - k * 1.6, w = 2 + k * 1.1; c.beginPath(); c.moveTo(X(cx - w), Y(y)); c.lineTo(X(cx - w * 0.2 + R() * 0.6), Y(y - 0.6)); c.lineTo(X(cx + w * 0.7), Y(y + 0.2)); c.stroke(); }
      // 前面一層雲海蓋住孤峰的下半截
      const R2 = mkRand(31); c.globalAlpha = 0.9; sea(c, R2, -6.5, 1.6, '#fff2e6', '#b896b6', 2.2); c.globalAlpha = 1;
    },
    init() { const R = mkRand(4); clouds = []; for (let k = 0; k < 5; k++) clouds.push({ x: V.x0 + R() * (V.x1 - V.x0), y: -3 - R() * 4, w: 10 + R() * 12, v: 0.4 + R() * 0.6, a: 0.5 + R() * 0.3 }); geese = []; wisps = []; },
    back(c, t, dt) {
      const s = V.s;
      // 樑下飄過的雲團
      for (const o of clouds) {
        o.x += o.v * dt; if (o.x - o.w > V.x1 + 4) o.x = V.x0 - o.w - 4;
        const x = X(o.x), y = Y(o.y), w = o.w * s; c.globalAlpha = o.a; c.fillStyle = rg(c, x, y, 0, w * 0.5, [0, 'rgba(255,246,236,.95)', 1, 'rgba(255,246,236,0)']); c.save(); c.translate(x, y); c.scale(1, 0.32); c.beginPath(); c.arc(0, 0, w * 0.5, 0, TAU); c.restore(); c.fill(); c.globalAlpha = 1;
      }
      // 雁群：偶爾一排從右往左飛過
      if (!geese.length && Math.random() < dt * 0.05) { const y = 30 + Math.random() * 16, n = 5 + ((Math.random() * 4) | 0); for (let k = 0; k < n; k++) geese.push({ x: V.x1 + 4 + k * 1.6, y: y + Math.abs(k - n / 2) * 0.9, ph: Math.random() * TAU }); }
      c.strokeStyle = 'rgba(40,46,70,.55)'; c.lineWidth = Math.max(1, s * 0.16);
      for (let i = geese.length - 1; i >= 0; i--) { const g = geese[i]; g.x -= 5 * dt; if (g.x < V.x0 - 6) { geese.splice(i, 1); continue; } const x = X(g.x), y = Y(g.y), f = Math.sin(t * 7 + g.ph) * s * 0.5; c.beginPath(); c.moveTo(x - s * 0.9, y - f); c.lineTo(x, y); c.lineTo(x + s * 0.9, y - f); c.stroke(); }
    },
    front(c, t, dt) {
      // 風絲：從樑下橫掃過去
      const s = V.s;
      if (wisps.length < 4 && Math.random() < dt * 1.2) wisps.push({ x: V.x0 - 10, y: -2 + Math.random() * 30, L: 6 + Math.random() * 8, v: 22 + Math.random() * 14, a: 0 });
      c.lineCap = 'round';
      for (let i = wisps.length - 1; i >= 0; i--) { const w = wisps[i]; w.x += w.v * dt; w.a += dt; if (w.x > V.x1 + 10) { wisps.splice(i, 1); continue; } c.strokeStyle = 'rgba(255,255,255,' + (0.28 * Math.min(1, w.a * 2)) + ')'; c.lineWidth = Math.max(1, s * 0.14); c.beginPath(); c.moveTo(X(w.x), Y(w.y)); c.quadraticCurveTo(X(w.x + w.L * 0.5), Y(w.y + 0.5), X(w.x + w.L), Y(w.y)); c.stroke(); }
    }
  };
})();
