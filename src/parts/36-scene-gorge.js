/* ===== 36-scene-gorge: 第二十關「鏡門天塹」— 黃昏的峽谷。兩座城蓋在谷底的砂岩上，正中間一道刻滿古紋的巨大石壁一路通到天上
   （砲彈過不去）；石壁兩側各伸出一根石臂、托著一圈古門的石框（石框和門裡的光由遊戲畫）。遠處是層層的紅岩台地，天上幾道光柱斜照下來 ===== */
THEMES[19] = (function () {
  const SKY = [80, '#2a2a5a', 60, '#4a3a70', 44, '#7a4a78', 30, '#c06a6a', 18, '#ec9a6a', 8, '#f8c890', 0, '#ffe0a8'];
  let motes = [];
  function grad(T, y) { for (let i = 2; i < T.length; i += 2) if (y >= T[i]) return mix(T[i - 1], T[i + 1], clamp((T[i - 2] - y) / (T[i - 2] - T[i]), 0, 1)); return T[T.length - 1]; }
  // 台地：平頂、直壁，一層層的岩紋
  function mesa(c, R, yTop, yBase, col, dark, n) {
    const s = V.s;
    for (let k = 0; k < n; k++) {
      const x = V.x0 - 6 + (V.x1 - V.x0 + 12) * (k + R() * 0.6) / n, w = 8 + R() * 14, h = yTop + (R() - 0.5) * 6;
      c.beginPath(); c.moveTo(X(x - w * 0.62), Y(yBase)); c.lineTo(X(x - w * 0.5), Y(h - 1.2)); c.lineTo(X(x - w * 0.42), Y(h)); c.lineTo(X(x + w * 0.44), Y(h)); c.lineTo(X(x + w * 0.52), Y(h - 1.4)); c.lineTo(X(x + w * 0.64), Y(yBase)); c.closePath();
      c.fillStyle = lg(c, X(x - w * 0.6), 0, X(x + w * 0.6), 0, [0, col, 0.7, col, 1, dark]); c.fill();
      c.strokeStyle = rgba(dark, 0.5); c.lineWidth = Math.max(1, s * 0.12); for (let j = 1; j < 4; j++) { const y = h - (h - yBase) * j / 4; c.beginPath(); c.moveTo(X(x - w * 0.5), Y(y)); c.lineTo(X(x + w * 0.5), Y(y + 0.3)); c.stroke(); }
    }
  }
  return {
    key: 'gorge',
    build(c, W, H) {
      const st = []; for (let i = 0; i < SKY.length; i += 2) st.push(clamp((80 - SKY[i]) / 80, 0, 1), SKY[i + 1]);
      c.fillStyle = lg(c, 0, Y(80), 0, Y(0), st); c.fillRect(0, 0, W, H);
      const R = mkRand(2020), s = V.s;
      // 夕陽（右下，被石壁擋掉一半的光）
      const sx = X(92), sy = Y(10); c.fillStyle = rg(c, sx, sy, 0, s * 30, [0, 'rgba(255,240,190,.95)', 0.1, 'rgba(255,214,150,.6)', 0.45, 'rgba(255,170,120,.18)', 1, 'rgba(255,170,120,0)']); c.fillRect(0, 0, W, H);
      c.fillStyle = '#fff2c8'; c.beginPath(); c.arc(sx, sy, s * 3.2, 0, TAU); c.fill();
      // 星星（天頂已經暗了）
      c.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 30; k++) { const x = R() * W, y = Y(48 + R() * 30); c.fillRect(x, y, Math.max(1, s * 0.12), Math.max(1, s * 0.12)); }
      mesa(c, R, 12, -2, '#b0586a', '#6a2e44', 7);
      mesa(c, R, 6, -2, '#c86a52', '#7a3426', 6);
    },
    terrain(c) {
      const s = V.s, R = mkRand(55);
      // 谷底的砂岩
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#c4905a', 0.3, '#9a6a3e', 1, '#5a3a20']), band: '#dcae74', bandH: 0.6, edge: '#4a2c14', edgeW: 0.3 });
      c.strokeStyle = 'rgba(70,40,18,.35)'; c.lineWidth = Math.max(1, s * 0.12); for (let k = 0; k < 14; k++) { const x = V.x0 + R() * (V.x1 - V.x0), y = -1.2 - R() * 6; c.beginPath(); c.moveTo(X(x), Y(y)); c.lineTo(X(x + 2 + R() * 4), Y(y - 0.2)); c.stroke(); }
      // 通天的石壁：從谷底一路到畫面頂上，正面刻著一格一格的古紋，兩側的邊緣風化得參差不齊
      const W = S.lv.wall, x0 = W.x0, x1 = W.x1, top = WY(0) + 10, bot = -2;
      c.beginPath(); c.moveTo(X(x0 - 0.3), Y(bot));
      for (let y = bot; y < top; y += 2.4) c.lineTo(X(x0 + (R() - 0.5) * 0.5), Y(y));
      c.lineTo(X(x0), Y(top)); c.lineTo(X(x1), Y(top));
      for (let y = top; y > bot; y -= 2.4) c.lineTo(X(x1 + (R() - 0.5) * 0.5), Y(y));
      c.lineTo(X(x1 + 0.3), Y(bot)); c.closePath();
      c.fillStyle = lg(c, X(x0), 0, X(x1), 0, [0, '#7a5a3a', 0.18, '#c49a66', 0.5, '#e0b884', 0.8, '#b08654', 1, '#5e4228']); c.fill();
      c.strokeStyle = '#2a1a0c'; c.lineWidth = Math.max(1.5, s * 0.26); c.stroke();
      // 古紋：一格一格的方框，框裡一隻眼睛（每一格不太一樣），中間一道接一道的裂縫
      const cw = x1 - x0;
      for (let y = 4, k = 0; y < top - 4; y += 7, k++) {
        const yy = y, px = X(x0 + cw * 0.14), py = Y(yy + 5.2), pw = cw * 0.72 * s, ph = 5 * s;
        c.strokeStyle = 'rgba(60,36,14,.55)'; c.lineWidth = Math.max(1, s * 0.16); c.strokeRect(px, py, pw, ph);
        c.fillStyle = 'rgba(255,230,180,.18)'; c.fillRect(px + s * 0.3, py + s * 0.3, pw - s * 0.6, s * 0.4);
        const ex = px + pw / 2, ey = py + ph / 2; c.strokeStyle = 'rgba(60,36,14,.6)'; c.beginPath(); c.ellipse(ex, ey, pw * 0.3, ph * 0.22, 0, 0, TAU); c.stroke();
        c.fillStyle = k % 3 === 1 ? 'rgba(255,200,120,.55)' : 'rgba(60,36,14,.5)'; c.beginPath(); c.arc(ex, ey, ph * 0.13, 0, TAU); c.fill();
      }
      c.strokeStyle = 'rgba(40,24,10,.5)'; c.lineWidth = Math.max(1, s * 0.12);
      for (let k = 0; k < 5; k++) { let x = x0 + cw * (0.2 + R() * 0.6), y = R() * top; c.beginPath(); c.moveTo(X(x), Y(y)); for (let j = 0; j < 5; j++) { x += (R() - 0.5) * 1.2; y -= 1.2 + R() * 1.6; c.lineTo(X(x), Y(y)); } c.stroke(); }
      // 石壁腳下的碎石堆
      c.fillStyle = '#8a6440'; for (let k = 0; k < 9; k++) { const x = x0 - 2 + R() * (cw + 4), r = 0.4 + R() * 0.9; c.beginPath(); c.arc(X(x), Y(0.1), r * s, Math.PI, 0); c.fill(); }
    },
    init() { motes = []; },
    back(c, t, dt) {
      // 斜照下來的光柱（石壁兩側）
      const s = V.s;
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const x = 20 + k * 32 + Math.sin(t * 0.2 + k) * 2, a = 0.05 + 0.03 * Math.sin(t * 0.5 + k * 2); c.fillStyle = 'rgba(255,220,160,' + a + ')'; poly(c, [X(x - 3), Y(70), X(x + 3), Y(70), X(x + 14), Y(-2), X(x + 4), Y(-2)]); c.fill(); }
      c.globalCompositeOperation = 'source-over';
    },
    front(c, t, dt) {
      // 飄著的細砂、光點
      const s = V.s;
      if (motes.length < 26 && Math.random() < dt * 8) motes.push({ x: V.x0 + Math.random() * (V.x1 - V.x0), y: Math.random() * 40, vx: 1 + Math.random() * 2, vy: (Math.random() - 0.5) * 0.6, a: 0, life: 4 + Math.random() * 4 });
      for (let i = motes.length - 1; i >= 0; i--) { const m = motes[i]; m.a += dt; m.x += m.vx * dt; m.y += m.vy * dt; if (m.a > m.life) { motes.splice(i, 1); continue; } c.fillStyle = 'rgba(255,230,180,' + (0.5 * Math.sin(Math.PI * m.a / m.life)) + ')'; c.fillRect(X(m.x), Y(m.y), Math.max(1, s * 0.18), Math.max(1, s * 0.18)); }
    }
  };
})();
