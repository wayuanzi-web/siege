/* ===== 36-scene-grove: 第二十一關「古木藤城」— 清晨的古森林。遠處一層層巨樹的樹幹沒進霧裡，林冠縫裡斜斜照下來幾道光，
   地上是苔蘚、蕨類、盤根；空中飄著落葉和光點（兩座城的古樹、中間那棵老樹由遊戲畫） ===== */
THEMES[20] = (function () {
  let leaves = [], motes = [];
  return {
    key: 'grove',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, Y(80), 0, Y(0), [0, '#2e4a3a', 0.35, '#4f7a5a', 0.7, '#9cc49a', 1, '#d8e8c4']); c.fillRect(0, 0, W, H);
      const R = mkRand(2121), s = V.s;
      // 林冠縫裡的天光
      c.fillStyle = rg(c, X(40), Y(70), 0, s * 40, [0, 'rgba(255,250,220,.55)', 0.5, 'rgba(230,250,200,.15)', 1, 'rgba(230,250,200,0)']); c.fillRect(0, 0, W, H);
      // 遠近三層樹幹（越遠越淡、越細）
      for (const [n, wMin, wMax, col, a] of [[16, 1.2, 2.6, '#7fa088', 0.55], [11, 2.2, 4.2, '#5a7a62', 0.75], [7, 3.4, 6, '#3a5440', 0.9]]) {
        c.globalAlpha = a;
        for (let k = 0; k < n; k++) {
          const x = V.x0 - 4 + (V.x1 - V.x0 + 8) * (k + R() * 0.7) / n, w = wMin + R() * (wMax - wMin);
          c.fillStyle = lg(c, X(x - w / 2), 0, X(x + w / 2), 0, [0, col, 0.6, mix(col, '#ffffff', 0.12), 1, mix(col, '#000000', 0.25)]);
          c.beginPath(); c.moveTo(X(x - w * 0.5), Y(-2)); c.lineTo(X(x - w * 0.42), Y(90)); c.lineTo(X(x + w * 0.42), Y(90)); c.lineTo(X(x + w * 0.5), Y(-2)); c.closePath(); c.fill();
        }
        // 每一層底下一片霧
        c.globalAlpha = 1; c.fillStyle = lg(c, 0, Y(14), 0, Y(-2), [0, 'rgba(220,236,214,0)', 1, 'rgba(220,236,214,.55)']); c.fillRect(0, Y(14), W, Y(-2) - Y(14));
      }
      c.globalAlpha = 1;
      // 上面一整片林冠（暗綠，邊緣一團一團）
      c.fillStyle = '#1e3424';
      c.beginPath(); c.moveTo(0, 0); for (let x = V.x0 - 4; x <= V.x1 + 4; x += 3) c.lineTo(X(x), Y(62 + Math.sin(x * 0.3) * 3 + R() * 4)); c.lineTo(W, 0); c.closePath(); c.fill();
    },
    terrain(c) {
      const s = V.s, R = mkRand(77);
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#4a6a30', 0.25, '#3a4a24', 1, '#22281a']), band: '#6a9a40', bandH: 0.5, edge: '#1a2410', edgeW: 0.3 });
      // 蕨類、小草叢
      for (let k = 0; k < 30; k++) {
        const x = V.x0 + R() * (V.x1 - V.x0), h = 0.8 + R() * 1.4; c.strokeStyle = R() < 0.5 ? '#5a8a34' : '#7aaa44'; c.lineWidth = Math.max(1, s * 0.14);
        for (let j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(X(x), Y(0.1)); c.quadraticCurveTo(X(x + j * 0.3), Y(h * 0.7), X(x + j * 0.6), Y(h * (1 - Math.abs(j) * 0.15))); c.stroke(); }
      }
      // 地上的落葉
      for (let k = 0; k < 40; k++) { c.fillStyle = ['#c8a040', '#a87a2a', '#8a5a20', '#b8c050'][k & 3]; const x = V.x0 + R() * (V.x1 - V.x0); c.beginPath(); c.ellipse(X(x), Y(0.05 - R() * 0.4), s * 0.3, s * 0.12, R() * 3, 0, TAU); c.fill(); }
    },
    init() { leaves = []; motes = []; },
    back(c, t, dt) {
      // 斜照的光柱
      const s = V.s; c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) { const x = 18 + k * 26 + Math.sin(t * 0.15 + k) * 2, a = 0.05 + 0.03 * Math.sin(t * 0.4 + k * 2); c.fillStyle = 'rgba(255,250,200,' + a + ')'; poly(c, [X(x - 2), Y(66), X(x + 2.5), Y(66), X(x + 16), Y(-2), X(x + 8), Y(-2)]); c.fill(); }
      c.globalCompositeOperation = 'source-over';
    },
    front(c, t, dt) {
      const s = V.s;
      // 落葉：飄著轉著往下掉
      if (leaves.length < 16 && Math.random() < dt * 3) leaves.push({ x: V.x0 + Math.random() * (V.x1 - V.x0), y: 58, vx: 0.6 + Math.random() * 1.2, ph: Math.random() * TAU, col: ['#d8b040', '#b88a2a', '#9ab040'][(Math.random() * 3) | 0] });
      for (let i = leaves.length - 1; i >= 0; i--) { const l = leaves[i]; l.y -= dt * 2.2; l.x += (l.vx + Math.sin(t * 1.5 + l.ph) * 1.2) * dt; if (l.y < 0) { leaves.splice(i, 1); continue; } c.fillStyle = l.col; c.beginPath(); c.ellipse(X(l.x), Y(l.y), s * 0.32, s * 0.14 * Math.abs(Math.sin(t * 3 + l.ph)) + s * 0.03, Math.sin(t * 2 + l.ph), 0, TAU); c.fill(); }
      // 光點（螢火、孢子）
      if (motes.length < 20 && Math.random() < dt * 5) motes.push({ x: V.x0 + Math.random() * (V.x1 - V.x0), y: 2 + Math.random() * 30, a: 0, life: 3 + Math.random() * 3 });
      c.globalCompositeOperation = 'lighter';
      for (let i = motes.length - 1; i >= 0; i--) { const m = motes[i]; m.a += dt; m.y += dt * 0.5; m.x += Math.sin(t + i) * dt * 0.6; if (m.a > m.life) { motes.splice(i, 1); continue; } c.fillStyle = 'rgba(220,255,160,' + (0.6 * Math.sin(Math.PI * m.a / m.life)) + ')'; c.beginPath(); c.arc(X(m.x), Y(m.y), Math.max(1, s * 0.16), 0, TAU); c.fill(); }
      c.globalCompositeOperation = 'source-over';
    }
  };
})();
