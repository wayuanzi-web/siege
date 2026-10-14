/* ===== 36-scene-space: 第二十八關「群星引力」— 深藍到紫的太空。滿天星星（有幾顆會閃），一條淡淡的星河、兩團星雲，
   遠方一顆帶環的大行星；兩座城站在兩顆小行星平平的岩頂上（岩頂邊上往下削，底下就是太空），偶爾一顆流星劃過 ===== */
THEMES[27] = (function () {
  let stars = [], shoot = null;
  return {
    key: 'space',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, 0, 0, H, [0, '#05060f', 0.5, '#101236', 0.85, '#241a48', 1, '#2e1e4a']); c.fillRect(0, 0, W, H);
      const R = mkRand(2828), s = V.s;
      // 星河：一條斜斜的淡光帶
      c.save(); c.translate(W * 0.5, H * 0.45); c.rotate(-0.35);
      c.fillStyle = lg(c, 0, -H * 0.18, 0, H * 0.18, [0, 'rgba(160,150,255,0)', 0.5, 'rgba(190,180,255,.12)', 1, 'rgba(160,150,255,0)']); c.fillRect(-W, -H * 0.18, W * 2, H * 0.36);
      c.restore();
      // 星雲
      for (const [x, y, r, col] of [[V.x0 + 16, 46, 16, '170,90,220'], [V.x1 - 22, 40, 13, '70,150,230']]) { c.fillStyle = rg(c, X(x), Y(y), 0, r * s, [0, 'rgba(' + col + ',.28)', 0.6, 'rgba(' + col + ',.08)', 1, 'rgba(' + col + ',0)']); c.fillRect(0, 0, W, H); }
      // 小星星（不會閃的）
      for (let k = 0; k < 220; k++) { const a = 0.25 + R() * 0.6; c.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; const sz = R() < 0.1 ? 2 : 1; c.fillRect(R() * W, R() * H, sz, sz); }
      // 帶環的大行星（右上方遠處）
      const px = X(MID + 40), py = Y(34), pr = s * 5;
      c.save(); c.translate(px, py); c.rotate(-0.3);
      c.strokeStyle = 'rgba(230,200,160,.35)'; c.lineWidth = s * 0.9; c.beginPath(); c.ellipse(0, 0, pr * 2.1, pr * 0.5, 0, Math.PI, TAU); c.stroke();
      c.fillStyle = rg(c, -pr * 0.4, -pr * 0.4, pr * 0.1, pr * 1.2, [0, '#f0d8b0', 0.6, '#c08a5a', 1, '#5a3424']); c.beginPath(); c.arc(0, 0, pr, 0, TAU); c.fill();
      c.globalAlpha = 0.25; c.fillStyle = '#8a5a3a'; for (const y of [-0.4, 0, 0.35]) c.fillRect(-pr, y * pr, pr * 2, pr * 0.12); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(230,200,160,.55)'; c.lineWidth = s * 0.9; c.beginPath(); c.ellipse(0, 0, pr * 2.1, pr * 0.5, 0, 0, Math.PI); c.stroke();
      c.restore();
    },
    terrain(c) {
      const s = V.s, R = mkRand(282);
      // 小行星：灰紫的岩石，頂面一層亮一點的表土，邊上削下去
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#6a6480', 0.3, '#4a4460', 1, '#221e34']), band: '#9890b0', bandH: 0.45, edge: '#16121e', edgeW: 0.25 });
      // 隕石坑、碎石
      for (const [xa, xb] of groundRuns()) {
        for (let k = 0; k < 9; k++) {
          const x = xa + 1 + R() * (xb - xa - 2), gy = groundYRaw(x), y = gy - 1.2 - R() * 6, r = 0.5 + R() * 1.2; if (y < -9) continue;
          c.fillStyle = 'rgba(20,16,34,.45)'; ell(c, X(x), Y(y), r * s, r * 0.55 * s); c.fill(); c.fillStyle = 'rgba(200,190,230,.18)'; ell(c, X(x - r * 0.2), Y(y + r * 0.15), r * 0.6 * s, r * 0.3 * s); c.fill();
        }
      }
    },
    init() { const R = mkRand(91); stars = []; for (let k = 0; k < 40; k++) stars.push({ x: V.x0 + R() * (V.x1 - V.x0), y: -8 + R() * 66, p: R() * TAU, f: 1 + R() * 2 }); shoot = null; },
    back(c, t, dt) {
      const s = V.s;
      for (const o of stars) { const a = 0.35 + 0.35 * Math.sin(t * o.f + o.p); if (a < 0.05) continue; const x = X(o.x), y = Y(o.y), r = Math.max(1, s * 0.18); c.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; c.fillRect(x - r * 2, y - 0.5, r * 4, 1); c.fillRect(x - 0.5, y - r * 2, 1, r * 4); }
      // 偶爾一顆流星
      if (!shoot && Math.random() < dt * 0.08) shoot = { x: V.x0 + Math.random() * (V.x1 - V.x0) * 0.7, y: 50 + Math.random() * 10, t: 0 };
      if (shoot) {
        shoot.t += dt; if (shoot.t > 0.8) shoot = null;
        else { const k = shoot.t / 0.8, x = shoot.x + k * 30, y = shoot.y - k * 14; c.strokeStyle = lg(c, X(x - 6), Y(y + 2.8), X(x), Y(y), [0, 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(2) + ')']); c.lineWidth = Math.max(1, s * 0.16); c.beginPath(); c.moveTo(X(x - 6), Y(y + 2.8)); c.lineTo(X(x), Y(y)); c.stroke(); }
      }
    },
    front() {}
  };
})();
