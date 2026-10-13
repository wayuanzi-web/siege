/* ===== 36-scene-dune: 第二十二關「流沙古城」— 正午的沙海。天空白熱，遠處一層層沙丘、地平線上一座座半埋在沙裡的古城廢墟，
   近處的沙地上有風吹出的沙紋；熱浪讓遠景微微晃動，地面不時捲起一陣細沙（兩座城的流沙坑、中間的巨石像由遊戲畫） ===== */
THEMES[21] = (function () {
  let dust = [];
  // 一層沙丘：圓滑的起伏，迎光面亮、背光面暗
  function dunes(c, R, yBase, amp, light, dark, f0) {
    const fn = ridgeFn(R, f0), x0 = V.x0 - 4, x1 = V.x1 + 4, pts = [];
    for (let x = x0; x <= x1 + 1; x += 0.8) pts.push(x, yBase + amp * (0.5 + 0.5 * fn(x)));
    c.beginPath(); c.moveTo(X(x0), V.H + 2); for (let i = 0; i < pts.length; i += 2) c.lineTo(X(pts[i]), Y(pts[i + 1])); c.lineTo(X(x1 + 1), V.H + 2); c.closePath();
    c.fillStyle = lg(c, 0, Y(yBase + amp), 0, Y(yBase - 4), [0, light, 1, dark]); c.fill();
    // 稜線上一道亮邊
    c.strokeStyle = 'rgba(255,248,220,.5)'; c.lineWidth = Math.max(1, V.s * 0.14); c.beginPath(); for (let i = 0; i < pts.length; i += 2) { if (i) c.lineTo(X(pts[i]), Y(pts[i + 1])); else c.moveTo(X(pts[i]), Y(pts[i + 1])); } c.stroke();
  }
  return {
    key: 'dune',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, Y(80), 0, Y(0), [0, '#5aa0d8', 0.4, '#9cc8e4', 0.8, '#f0e8cc', 1, '#fff2d0']); c.fillRect(0, 0, W, H);
      const R = mkRand(2222), s = V.s;
      // 白熱的太陽
      const sx = X(78), sy = Y(62); c.fillStyle = rg(c, sx, sy, 0, s * 26, [0, 'rgba(255,255,240,1)', 0.08, 'rgba(255,250,220,.8)', 0.4, 'rgba(255,240,200,.2)', 1, 'rgba(255,240,200,0)']); c.fillRect(0, 0, W, H);
      dunes(c, R, 6, 9, '#f2d8a8', '#d8b480', 0.05);
      // 地平線上的古城廢墟（剪影）
      c.fillStyle = 'rgba(176,136,90,.75)';
      for (let k = 0; k < 6; k++) {
        const x = V.x0 + (V.x1 - V.x0) * (k + 0.2 + R() * 0.6) / 6, w = 3 + R() * 5, h = 3 + R() * 6, by = 8 + R() * 3;
        c.beginPath(); c.moveTo(X(x - w), Y(by)); c.lineTo(X(x - w), Y(by + h * 0.6)); c.lineTo(X(x - w * 0.6), Y(by + h * 0.6)); c.lineTo(X(x - w * 0.6), Y(by + h)); c.lineTo(X(x + w * 0.2), Y(by + h)); c.lineTo(X(x + w * 0.3), Y(by + h * 0.7)); c.lineTo(X(x + w), Y(by + h * 0.5)); c.lineTo(X(x + w), Y(by)); c.closePath(); c.fill();
      }
      dunes(c, R, 1, 7, '#ecc88e', '#c8a066', 0.08);
    },
    terrain(c) {
      const s = V.s, R = mkRand(55);
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#e8c486', 0.3, '#c99c5c', 1, '#8a6232']), band: '#f4dca8', bandH: 0.5, edge: '#7a5428', edgeW: 0.25 });
      // 風吹出來的沙紋
      c.strokeStyle = 'rgba(140,96,48,.35)'; c.lineWidth = Math.max(1, s * 0.1);
      for (let k = 0; k < 22; k++) { const x = V.x0 + R() * (V.x1 - V.x0), y = -0.6 - R() * 5, L = 2 + R() * 4; c.beginPath(); c.moveTo(X(x), Y(y)); c.quadraticCurveTo(X(x + L / 2), Y(y + 0.25), X(x + L), Y(y)); c.stroke(); }
    },
    init() { dust = []; },
    back(c, t, dt) {
      // 熱浪：地平線附近一條條晃動的亮帶
      const s = V.s; c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) { const y = 6 + k * 2.2 + Math.sin(t * 2 + k) * 0.3; c.fillStyle = 'rgba(255,250,230,' + (0.04 + 0.02 * Math.sin(t * 3 + k)) + ')'; c.fillRect(0, Y(y + 0.5), V.W, s * 0.6); }
      c.globalCompositeOperation = 'source-over';
    },
    front(c, t, dt) {
      // 地面捲起的細沙：一陣一陣往同一個方向吹
      const s = V.s, gust = Math.max(0, Math.sin(t * 0.35));
      if (dust.length < 40 && Math.random() < dt * 30 * gust) dust.push({ x: V.x0 - 2 + Math.random() * 10, y: Math.random() * 4, v: 10 + Math.random() * 8, a: 0, life: 3 + Math.random() * 2 });
      for (let i = dust.length - 1; i >= 0; i--) { const d = dust[i]; d.a += dt; d.x += d.v * dt; d.y += Math.sin(t * 3 + i) * dt * 0.8; if (d.a > d.life || d.x > V.x1 + 4) { dust.splice(i, 1); continue; } c.fillStyle = 'rgba(240,214,160,' + (0.5 * Math.sin(Math.PI * d.a / d.life)) + ')'; c.fillRect(X(d.x), Y(d.y), Math.max(1, s * 0.5), Math.max(1, s * 0.12)); }
    }
  };
})();
