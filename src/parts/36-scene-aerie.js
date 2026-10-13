/* ===== 36-scene-aerie: 第二十四關「天空要塞」— 雲海之上的黃昏。我方的堡壘蓋在一座懸崖的邊上，崖外面整片是翻滾的雲海，
   天空要塞浮在雲海上方（要塞由遊戲畫）；遠處幾座浮空的小岩島、高空的雲帶，夕陽把雲海染成金紅色 ===== */
THEMES[23] = (function () {
  let clouds = [];
  function sea(c, R, y, amp, top, bot, step) {
    const s = V.s, x0 = V.x0 - 6, x1 = V.x1 + 6;
    c.beginPath(); c.moveTo(X(x0), V.H + 4);
    for (let x = x0; x <= x1;) { const r = step * (0.7 + R() * 0.6), yy = y + (R() - 0.5) * amp; c.lineTo(X(x), Y(yy)); c.arc(X(x + r), Y(yy), r * s, Math.PI, 0); x += r * 2; }
    c.lineTo(X(x1), V.H + 4); c.closePath(); c.fillStyle = lg(c, 0, Y(y + amp), 0, V.H, [0, top, 1, bot]); c.fill();
  }
  return {
    key: 'aerie',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, Y(80), 0, Y(-6), [0, '#2a3a7a', 0.35, '#6a5aa0', 0.65, '#e88a7a', 0.85, '#ffc890', 1, '#ffe8b8']); c.fillRect(0, 0, W, H);
      const R = mkRand(2424), s = V.s;
      const sx = X(30), sy = Y(8); c.fillStyle = rg(c, sx, sy, 0, s * 30, [0, 'rgba(255,240,200,.95)', 0.1, 'rgba(255,200,140,.6)', 0.45, 'rgba(255,150,120,.18)', 1, 'rgba(255,150,120,0)']); c.fillRect(0, 0, W, H);
      // 高空的雲帶
      c.strokeStyle = 'rgba(255,220,220,.35)'; c.lineCap = 'round';
      for (let k = 0; k < 8; k++) { const x = V.x0 + R() * (V.x1 - V.x0), y = 40 + R() * 24, L = 10 + R() * 18; c.lineWidth = s * (0.4 + R() * 0.6); c.beginPath(); c.moveTo(X(x), Y(y)); c.quadraticCurveTo(X(x + L / 2), Y(y + 1), X(x + L), Y(y)); c.stroke(); }
      // 遠處浮空的小岩島
      for (const [x, y, w] of [[V.x0 + 12, 30, 4], [V.x1 - 20, 44, 3], [V.x1 - 8, 24, 5]]) { c.fillStyle = '#4a4268'; poly(c, [X(x - w), Y(y), X(x + w), Y(y), X(x + w * 0.4), Y(y - w * 1.1), X(x - w * 0.3), Y(y - w * 0.8)]); c.fill(); c.fillStyle = '#6a7a58'; c.fillRect(X(x - w), Y(y + 0.3), w * 2 * s, s * 0.5); }
      sea(c, R, 2, 2.2, '#ffd8b8', '#c08aa0', 3.2);
    },
    terrain(c) {
      const s = V.s, R = mkRand(31);
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#7a6a5a', 0.3, '#5a4a3e', 1, '#2e241e']), band: '#8aa060', bandH: 0.6, edge: '#1e1610', edgeW: 0.3 });
      // 懸崖邊（我方那塊地的盡頭）往下是岩壁
      let edge = 0; for (const v of (S.voids || [])) if (v[0] > 20) { edge = v[0]; break; }
      if (edge) { c.fillStyle = lg(c, X(edge - 4), 0, X(edge), 0, [0, '#5a4a3e', 1, '#2e241e']); poly(c, [X(edge - 3), Y(0), X(edge), Y(0), X(edge - 1.5), Y(-10), X(edge - 4), Y(-30), X(edge - 8), V.H]); c.fill(); }
      // 前面一層雲海蓋住崖腳和深淵
      const R2 = mkRand(9); c.globalAlpha = 0.95; sea(c, R2, -7, 1.8, '#fff0e0', '#d0a0b8', 2.4); c.globalAlpha = 1;
    },
    init() { const R = mkRand(5); clouds = []; for (let k = 0; k < 6; k++) clouds.push({ x: V.x0 + R() * (V.x1 - V.x0), y: -2 - R() * 5, w: 10 + R() * 14, v: 0.5 + R() * 0.8, a: 0.45 + R() * 0.3 }); },
    back(c, t, dt) {
      const s = V.s;
      for (const o of clouds) {
        o.x += o.v * dt; if (o.x - o.w > V.x1 + 4) o.x = V.x0 - o.w - 4;
        const x = X(o.x), y = Y(o.y), w = o.w * s; c.globalAlpha = o.a; c.fillStyle = rg(c, x, y, 0, w * 0.5, [0, 'rgba(255,240,236,.95)', 1, 'rgba(255,240,236,0)']); c.save(); c.translate(x, y); c.scale(1, 0.3); c.beginPath(); c.arc(0, 0, w * 0.5, 0, TAU); c.restore(); c.fill(); c.globalAlpha = 1;
      }
    },
    front(c, t, dt) {}
  };
})();
