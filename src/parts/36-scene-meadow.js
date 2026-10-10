/* ===== 36-scene-meadow: 第一關「青丘」— 晴朗的草原、遠山、寶塔、池塘 ===== */
THEMES[0] = (function () {
  let clouds = [], motes = [];
  // 一叢樹：幾個圓疊起來，上亮下暗
  function tree(c, x, y, r, hi, lo) {
    c.fillStyle = lo; c.beginPath(); c.arc(x - r * 0.55, y, r * 0.72, 0, TAU); c.arc(x + r * 0.6, y + r * 0.08, r * 0.66, 0, TAU); c.arc(x, y - r * 0.38, r, 0, TAU); c.fill();
    c.fillStyle = hi; c.beginPath(); c.arc(x - r * 0.2, y - r * 0.62, r * 0.6, 0, TAU); c.arc(x - r * 0.62, y - r * 0.12, r * 0.42, 0, TAU); c.fill();
  }
  function pagoda(c, x, y, s, col) {
    c.fillStyle = col;
    for (let k = 0; k < 5; k++) {
      const w = s * (2.6 - k * 0.4), yy = y - k * s * 1.25;
      c.fillRect(x - w * 0.36, yy - s * 1.25, w * 0.72, s * 1.25);
      c.beginPath(); c.moveTo(x - w * 0.78, yy - s * 0.86); c.quadraticCurveTo(x - w * 0.5, yy - s * 1.02, x - w * 0.36, yy - s * 1.3); c.lineTo(x + w * 0.36, yy - s * 1.3); c.quadraticCurveTo(x + w * 0.5, yy - s * 1.02, x + w * 0.78, yy - s * 0.86); c.closePath(); c.fill();
    }
    c.fillRect(x - s * 0.07, y - s * 8.2, s * 0.14, s * 1.6);
  }
  return {
    key: 'meadow',
    build(c, W, H) {
      const R = mkRand(101), s = V.s;
      c.fillStyle = lg(c, 0, 0, 0, Y(0), [0, '#3893e6', 0.42, '#84c9ff', 0.8, '#d2efe9', 1, '#f6f4c8']); c.fillRect(0, 0, W, H);
      // 太陽
      const sx = X(20), sy = Y(46);
      c.fillStyle = rg(c, sx, sy, 0, s * 44, [0, 'rgba(255,250,214,.95)', 0.1, 'rgba(255,245,196,.5)', 0.38, 'rgba(255,240,180,.15)', 1, 'rgba(255,240,180,0)']); c.fillRect(0, 0, W, H);
      c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(sx, sy, s * 3.6, 0, TAU); c.fill();
      // 高空的卷雲（靜態、很淡）
      c.strokeStyle = 'rgba(255,255,255,.34)'; c.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const x = X(V.x0 + R() * (V.x1 - V.x0)), y = Y(40 + R() * 15), w = s * (9 + R() * 12); c.lineWidth = s * (0.5 + R() * 0.6); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.5, y - s * 1.6, x + w, y - s * 0.3); c.stroke(); }
      // 遠山三層
      const f1 = ridgeFn(R, 0.034), f2 = ridgeFn(R, 0.052), f3 = ridgeFn(R, 0.075), f4 = ridgeFn(R, 0.1);
      ridge(c, f1, 21, 8, lg(c, 0, Y(31), 0, Y(5), [0, '#a3cfe6', 1, '#cfe8e2']));
      ridge(c, f2, 14.5, 6, lg(c, 0, Y(23), 0, Y(2), [0, '#82c0c2', 1, '#b6dec6']));
      pagoda(c, X(63), Y(14.5 + 6 * f2(63) - 0.4), s * 1.1, '#6fb0b6');
      // 中景的丘陵與樹
      ridge(c, f3, 8.5, 4, lg(c, 0, Y(14), 0, Y(0), [0, '#63b877', 1, '#8fd286']));
      for (let k = 0; k < 26; k++) { const x = V.x0 + R() * (V.x1 - V.x0); tree(c, X(x), Y(8.5 + 4 * f3(x) + 0.3), s * (1.1 + R() * 1.1), '#5cb46a', '#3f9458'); }
      // 梯田的弧線
      c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = Math.max(1, s * 0.22);
      for (let k = 0; k < 5; k++) { c.beginPath(); for (let x = V.x0 - 4; x <= V.x1 + 4; x += 2) { const y = 8.5 + 4 * f3(x) - 1.4 - k * 1.3 + Math.sin(x * 0.2 + k) * 0.4; if (x === V.x0 - 4) c.moveTo(X(x), Y(y)); else c.lineTo(X(x), Y(y)); } c.stroke(); }
      ridge(c, f4, 3.6, 2.6, lg(c, 0, Y(7), 0, Y(-2), [0, '#4fae58', 1, '#74c862']));
      for (let k = 0; k < 16; k++) { const x = V.x0 + R() * (V.x1 - V.x0); tree(c, X(x), Y(3.6 + 2.6 * f4(x) + 0.5), s * (1.5 + R() * 1.4), '#4aa857', '#2f8347'); }
    },
    terrain(c) {
      const R = mkRand(202), s = V.s;
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#55ad49', 0.3, '#3d8c3f', 1, '#2a6a3a']), band: '#7ada58', bandH: 1.0, edge: '#2c6f2e', edgeW: 0.2 });
      // 中間的小山丘：頂上一塊界石、一條小路（擋住平射，要吊高越過去）
      const hx = X(56), hy = Y(groundYRaw(56));
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(X(47), Y(groundYRaw(47)) + 1); c.quadraticCurveTo(X(53), Y(groundYRaw(53) + 0.4), hx, hy + s * 0.15); c.quadraticCurveTo(X(59), Y(groundYRaw(59) + 0.4), X(65), Y(groundYRaw(65)) + 1); c.lineWidth = Math.max(1, s * 0.5); c.strokeStyle = 'rgba(232,222,170,.45)'; c.stroke();
      c.fillStyle = '#9a9283'; rrect(c, hx - s * 0.7, hy - s * 2.3, s * 1.4, s * 2.6, s * 0.5); c.fill(); c.fillStyle = '#b9b2a2'; rrect(c, hx - s * 0.7, hy - s * 2.3, s * 0.6, s * 2.5, s * 0.4); c.fill();
      c.strokeStyle = '#4c473e'; c.lineWidth = Math.max(1, s * 0.16); rrect(c, hx - s * 0.7, hy - s * 2.3, s * 1.4, s * 2.6, s * 0.5); c.stroke();
      // 土層的暗紋
      c.strokeStyle = 'rgba(20,60,30,.22)'; c.lineWidth = Math.max(1, s * 0.3);
      for (let k = 0; k < 9; k++) { const x = X(V.x0 + R() * (V.x1 - V.x0)), y = Y(-3 - R() * 5), w = s * (4 + R() * 9); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.5, y + s * 0.8, x + w, y + s * 0.1); c.stroke(); }
      // 草叢和小花
      for (const [xa, xb] of groundRuns()) {
        for (let x = xa; x < xb; x += 0.7 + R() * 1.1) {
          const gy = groundYRaw(x), px2 = X(x), py2 = Y(gy), h = s * (0.5 + R() * 0.9);
          c.fillStyle = R() < 0.5 ? '#8fe467' : '#64c84c';
          c.beginPath(); c.moveTo(px2 - s * 0.26, py2 + 1); c.lineTo(px2 - s * 0.1, py2 - h); c.lineTo(px2 + s * 0.04, py2 + 1); c.lineTo(px2 + s * 0.2, py2 - h * 0.75); c.lineTo(px2 + s * 0.34, py2 + 1); c.closePath(); c.fill();
          if (R() < 0.16) { c.fillStyle = ['#ffffff', '#ffe066', '#ff9ec4'][(R() * 3) | 0]; c.beginPath(); c.arc(px2 + s * 0.5, py2 + s * (0.3 + R() * 0.4), Math.max(1, s * 0.2), 0, TAU); c.fill(); }
        }
      }
    },
    init() {
      const R = mkRand(303); clouds = [];
      for (let k = 0; k < 6; k++) {
        const w = V.s * (14 + R() * 13), h = w * (0.34 + R() * 0.08);
        clouds.push({ cv: cloudSprite(w, h, R, '#ffffff', '#cfe6f7'), x: V.x0 + R() * (V.x1 - V.x0 + 40) - 20, y: 35 + R() * 17, v: 0.5 + R() * 0.7, a: 0.78 + R() * 0.2 });
      }
      motes = []; for (let k = 0; k < 14; k++) motes.push({ x: V.x0 + R() * (V.x1 - V.x0), y: R() * 42, p: R() * TAU, v: 1.5 + R() * 2 });
    },
    back(c, t, dt) {
      for (const k of clouds) {
        k.x += k.v * dt; if (X(k.x) > V.W + 10) k.x = V.x0 - k.cv.width / V.s - 4;
        c.globalAlpha = k.a; c.drawImage(k.cv, X(k.x), Y(k.y));
      }
      c.globalAlpha = 1;
    },
    front(c, t, dt) {
      // 隨風飄的蒲公英
      c.fillStyle = 'rgba(255,255,255,.75)';
      for (const m of motes) {
        m.x += (m.v + S.wind * 0.2) * dt; m.y += Math.sin(t * 0.8 + m.p) * 1.6 * dt + 0.5 * dt;
        if (m.x > V.x1 + 2) { m.x = V.x0 - 2; m.y = Math.random() * 40; } if (m.y > 48) m.y = 2;
        const r = Math.max(1, V.s * 0.2); c.beginPath(); c.arc(X(m.x), Y(m.y), r, 0, TAU); c.fill();
      }
    }
  };
})();
