/* ===== 36-scene-stack: 第二十五關「疊城對決」— 晴朗的高原競技場。遠處一根根「疊石柱」（風化成一塊一塊疊起來的岩柱，頂上還頂著一顆大石頭），
   更遠是一層層藍灰的台地；競技場兩邊立著一排彩色的長旗，草地上散著幾堆石頭疊成的石堆。天上的雲慢慢飄，偶爾一群鳥飛過 ===== */
THEMES[24] = (function () {
  let clouds = [], birds = null;
  // 一根疊石柱：幾塊大小不一、微微錯開的岩塊疊上去，頂上一顆圓石
  function hoodoo(c, R, x, base, n, w, col, dk) {
    const s = V.s; let y = base, cx = x;
    for (let k = 0; k < n; k++) {
      const ww = w * (0.85 + R() * 0.3) * (1 - k * 0.06), hh = w * (0.55 + R() * 0.35);
      cx += (R() - 0.5) * w * 0.25;
      rrect(c, X(cx - ww / 2), Y(y + hh), ww * s, hh * s, Math.max(1, s * ww * 0.18)); c.fillStyle = k & 1 ? col : dk; c.fill();
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(X(cx - ww / 2) + s * 0.2, Y(y + hh) + s * 0.15, ww * s * 0.5, Math.max(1, s * 0.25));
      y += hh * 0.96;
    }
    c.fillStyle = dk; c.beginPath(); c.arc(X(cx), Y(y + w * 0.4), w * 0.55 * s, 0, TAU); c.fill();
  }
  return {
    key: 'stack',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, Y(80), 0, Y(0), [0, '#4f8fe0', 0.45, '#8cc0f0', 0.85, '#d8ecf6', 1, '#eef6f0']); c.fillRect(0, 0, W, H);
      const R = mkRand(2525), s = V.s;
      const sx = X(30), sy = Y(64); c.fillStyle = rg(c, sx, sy, 0, s * 20, [0, 'rgba(255,255,236,1)', 0.1, 'rgba(255,250,220,.7)', 0.45, 'rgba(255,248,220,.15)', 1, 'rgba(255,248,220,0)']); c.fillRect(0, 0, W, H);
      // 遠處的台地（兩層，越遠越淡）
      ridge(c, ridgeFn(R, 0.03), 13, 4, '#a8b8cc', 1.6);
      ridge(c, ridgeFn(R, 0.05), 8, 3.5, '#8fa6b8', 1.4);
      // 疊石柱：左右各幾根，中間留給戰場
      for (const [x, n, w] of [[V.x0 + 6, 6, 3.2], [V.x0 + 16, 4, 2.4], [MID - 14, 3, 1.8], [MID + 12, 4, 2.0], [V.x1 - 18, 5, 2.6], [V.x1 - 6, 7, 3.0]]) hoodoo(c, R, x, 3, n, w, '#b8907a', '#9a735c');
      // 近一點的草坡
      ridge(c, ridgeFn(R, 0.08), 2.4, 2.2, '#86b860', 1.2);
    },
    terrain(c) {
      const s = V.s, R = mkRand(77);
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#6aa848', 0.25, '#52883a', 0.6, '#7a6448', 1, '#4a3a28']), band: '#96d070', bandH: 0.55, edge: '#3a5a24', edgeW: 0.25 });
      // 草叢、小石堆
      c.strokeStyle = '#4a7a30'; c.lineWidth = Math.max(1, s * 0.12);
      for (let k = 0; k < 50; k++) { const x = V.x0 + R() * (V.x1 - V.x0); for (let j = -1; j <= 1; j++) { c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x + j * 0.35), Y(0.5 + R() * 0.6)); c.stroke(); } }
      for (const x of [MID - 9, MID + 7, MID - 1]) { let y = 0; for (let k = 0; k < 3; k++) { const w = 1.4 - k * 0.3; ell(c, X(x + (R() - 0.5) * 0.3), Y(y + w * 0.35), w * s, w * 0.42 * s); c.fillStyle = k & 1 ? '#a8a090' : '#8a8274'; c.fill(); y += w * 0.6; } }
      // 競技場的長旗：兩城之間立一排旗桿（旗面在 back 裡畫，會飄）
      c.strokeStyle = '#5a4630'; c.lineWidth = Math.max(1, s * 0.18);
      for (let k = 0; k < 5; k++) { const x = MID - 12 + k * 6; c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x), Y(9)); c.stroke(); }
    },
    init() { const R = mkRand(9); clouds = []; for (let k = 0; k < 5; k++) clouds.push({ x: V.x0 + R() * (V.x1 - V.x0), y: 40 + R() * 22, w: 8 + R() * 10, v: 0.4 + R() * 0.6 }); birds = null; },
    back(c, t, dt) {
      const s = V.s;
      for (const o of clouds) {
        o.x += o.v * dt; if (o.x - o.w > V.x1 + 4) o.x = V.x0 - o.w - 4;
        c.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(X(o.x + (k - 1.5) * o.w * 0.28), Y(o.y + (k === 1 || k === 2 ? 1 : 0)), o.w * s * (k === 1 || k === 2 ? 0.28 : 0.2), 0, TAU); c.fill(); }
      }
      // 長旗：一面一面隨風飄（顏色輪流）
      const cols = ['#e84a3a', '#f0b82a', '#3a86e0', '#4ab860', '#c05ad0'];
      for (let k = 0; k < 5; k++) {
        const x = MID - 12 + k * 6, wv = (S.wind || 0) * 0.15 + 1;
        c.fillStyle = cols[k]; c.beginPath(); c.moveTo(X(x), Y(9)); for (let j = 0; j <= 6; j++) { const u = j / 6; c.lineTo(X(x + u * 3.2 * wv), Y(9 - u * 0.6 + Math.sin(t * 4 + k + u * 5) * 0.35 * u)); } for (let j = 6; j >= 0; j--) { const u = j / 6; c.lineTo(X(x + u * 3.2 * wv), Y(7.6 + u * 0.4 + Math.sin(t * 4 + k + u * 5) * 0.35 * u)); } c.closePath(); c.fill();
      }
      // 偶爾一群鳥飛過
      if (!birds && Math.random() < dt * 0.05) birds = { x: V.x0 - 4, y: 50 + Math.random() * 12, n: 3 + (Math.random() * 3 | 0) };
      if (birds) {
        birds.x += dt * 7; if (birds.x > V.x1 + 6) birds = null;
        else { c.strokeStyle = 'rgba(40,50,70,.7)'; c.lineWidth = Math.max(1, s * 0.12); for (let k = 0; k < birds.n; k++) { const x = X(birds.x - k * 1.6), y = Y(birds.y + (k % 2) * 0.8), f = Math.sin(t * 10 + k) * s * 0.35; c.beginPath(); c.moveTo(x - s * 0.6, y - f); c.lineTo(x, y); c.lineTo(x + s * 0.6, y - f); c.stroke(); } }
      }
    },
    front() {}
  };
})();
