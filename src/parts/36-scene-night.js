/* ===== 36-scene-night: 第二十三關「無月夜襲」— 沒有月亮的晚上。滿天星斗、銀河斜過天頂，遠處山脊上一點一點的營火，
   近處是黑黝黝的荒原和枯樹；偶爾一顆流星，草叢裡有螢火（整片戰場的黑由 76-dusk-draw 的 drawNight 蓋上去） ===== */
THEMES[22] = (function () {
  let shoot = null, flies = [];
  return {
    key: 'night',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, Y(80), 0, Y(0), [0, '#05060f', 0.5, '#0c1028', 0.85, '#1a1e3c', 1, '#242a4a']); c.fillRect(0, 0, W, H);
      const R = mkRand(2323), s = V.s;
      // 銀河：一條斜斜的淡光帶，上面一堆小星星
      c.save(); c.translate(X(56), Y(52)); c.rotate(-0.42);
      c.fillStyle = lg(c, 0, -s * 9, 0, s * 9, [0, 'rgba(160,170,230,0)', 0.5, 'rgba(170,180,240,.16)', 1, 'rgba(160,170,230,0)']); c.fillRect(-W, -s * 9, W * 2, s * 18);
      c.fillStyle = 'rgba(230,236,255,.6)'; for (let k = 0; k < 260; k++) { const x = (R() - 0.5) * W * 1.6, y = (R() + R() - 1) * s * 7; c.fillRect(x, y, 1, 1); }
      c.restore();
      // 星星
      for (let k = 0; k < 140; k++) { const x = R() * W, y = Y(14 + R() * 70), r = R() < 0.1 ? 1.6 : 1; c.fillStyle = 'rgba(255,255,255,' + (0.4 + R() * 0.6) + ')'; c.fillRect(x, y, r, r); }
      // 遠處的山脊（剪影）和山脊上的營火
      const fn = ridgeFn(R, 0.06); c.fillStyle = '#0a0c18';
      c.beginPath(); c.moveTo(X(V.x0 - 4), V.H); for (let x = V.x0 - 4; x <= V.x1 + 4; x += 1) c.lineTo(X(x), Y(6 + 6 * (0.5 + 0.5 * fn(x)))); c.lineTo(X(V.x1 + 4), V.H); c.closePath(); c.fill();
      for (let k = 0; k < 9; k++) { const x = V.x0 + R() * (V.x1 - V.x0), y = 6 + 6 * (0.5 + 0.5 * fn(x)) - 0.4; c.fillStyle = rg(c, X(x), Y(y), 0, s * 1.6, [0, 'rgba(255,190,90,.9)', 0.4, 'rgba(255,140,60,.3)', 1, 'rgba(255,120,40,0)']); c.beginPath(); c.arc(X(x), Y(y), s * 1.6, 0, TAU); c.fill(); }
    },
    terrain(c) {
      const s = V.s, R = mkRand(66);
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#1e2420', 0.4, '#141814', 1, '#0a0c0a']), band: '#2a3428', bandH: 0.4, edge: '#060806', edgeW: 0.3 });
      // 枯樹
      c.strokeStyle = '#080a0c'; c.lineCap = 'round';
      for (const x of [V.x0 + 3, V.x1 - 4]) { c.lineWidth = s * 0.6; c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x + 0.5), Y(9)); c.stroke(); c.lineWidth = s * 0.25; for (let k = 0; k < 5; k++) { const y = 4 + k * 1.2, d = (k % 2 ? 1 : -1) * (1.5 + R() * 2); c.beginPath(); c.moveTo(X(x + 0.3), Y(y)); c.quadraticCurveTo(X(x + d * 0.5), Y(y + 1), X(x + d), Y(y + 1.8)); c.stroke(); } }
      // 草叢
      c.strokeStyle = '#1a221a'; c.lineWidth = Math.max(1, s * 0.12);
      for (let k = 0; k < 40; k++) { const x = V.x0 + R() * (V.x1 - V.x0); for (let j = -1; j <= 1; j++) { c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x + j * 0.3), Y(0.6 + R() * 0.6)); c.stroke(); } }
    },
    init() { shoot = null; flies = []; },
    back(c, t, dt) {
      // 流星
      const s = V.s;
      if (!shoot && Math.random() < dt * 0.08) shoot = { x: V.x0 + Math.random() * (V.x1 - V.x0), y: 60 + Math.random() * 14, a: 0 };
      if (shoot) { shoot.a += dt; const k = shoot.a / 0.8; if (k >= 1) shoot = null; else { const x0 = X(shoot.x + k * 14), y0 = Y(shoot.y - k * 6); c.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)) + ')'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 - s * 4, y0 - s * 1.7); c.stroke(); } }
    },
    front(c, t, dt) {
      // 螢火蟲
      const s = V.s;
      if (flies.length < 14 && Math.random() < dt * 3) flies.push({ x: V.x0 + Math.random() * (V.x1 - V.x0), y: 1 + Math.random() * 8, a: 0, life: 3 + Math.random() * 3, ph: Math.random() * TAU });
      c.globalCompositeOperation = 'lighter';
      for (let i = flies.length - 1; i >= 0; i--) { const f = flies[i]; f.a += dt; f.x += Math.sin(t * 1.3 + f.ph) * dt * 0.8; f.y += Math.cos(t * 1.1 + f.ph) * dt * 0.5; if (f.a > f.life) { flies.splice(i, 1); continue; } const a = 0.7 * Math.sin(Math.PI * f.a / f.life) * (0.6 + 0.4 * Math.sin(t * 7 + f.ph)); c.fillStyle = 'rgba(200,255,140,' + a + ')'; c.beginPath(); c.arc(X(f.x), Y(f.y), Math.max(1, s * 0.18), 0, TAU); c.fill(); }
      c.globalCompositeOperation = 'source-over';
    }
  };
})();
