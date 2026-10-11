/* ===== 36-scene-tide: 第十三關「潮汐水寨」— 清早的海灣：太陽剛從右邊的海平線升起，天邊一抹金；
   海平線上有遠島、燈塔、遠處另一座高腳漁村的剪影；遠海一路鋪到畫面底，太陽底下一條碎金的光帶；海鷗在頭上盤旋。
   近處的海水（會漲退）是引擎畫的（drawWater），這裡只畫遠景和海床 ===== */
THEMES[12] = (function () {
  const HZ = 6.5;                         // 海平線（遠景；近處的水面在潮水那裡）
  const SUNX = 91, SUNY = 15.5;
  let clouds = [], gulls = [], glints = [];
  const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  // 一座遠島：圓弧的山頭疊幾個，顏色越遠越淡
  function isle(c, x0, x1, h, col, R) {
    const n = 5 + ((R() * 4) | 0); c.fillStyle = col; c.beginPath(); c.moveTo(X(x0), Y(HZ));
    for (let k = 0; k <= n; k++) { const u = k / n, x = lerp(x0, x1, u), y = HZ + h * Math.sin(u * Math.PI) * (0.65 + R() * 0.45); c.lineTo(X(x), Y(y)); }
    c.lineTo(X(x1), Y(HZ)); c.closePath(); c.fill();
  }
  // 遠處的高腳屋剪影（一排）
  function stilts(c, x, n, col) {
    const s = V.s; c.fillStyle = col; c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.12);
    for (let k = 0; k < n; k++) {
      const hx = x + k * 3.1, w = 2.2, top = HZ + 3.2 + (k % 2) * 0.5;
      c.fillRect(X(hx - w / 2), Y(top), w * s, (top - HZ - 1.4) * s);
      c.beginPath(); c.moveTo(X(hx - w * 0.7), Y(top)); c.lineTo(X(hx), Y(top + 1.3)); c.lineTo(X(hx + w * 0.7), Y(top)); c.closePath(); c.fill();
      for (const dx of [-0.8, 0.8]) { c.beginPath(); c.moveTo(X(hx + dx), Y(HZ + 1.4)); c.lineTo(X(hx + dx), Y(HZ - 0.2)); c.stroke(); }
    }
  }
  return {
    key: 'tide',
    build(c, W, H) {
      const R = mkRand(1313), s = V.s;
      // 天色：頂上清澈的藍，往海平線轉成淡金
      c.fillStyle = lg(c, 0, 0, 0, Y(HZ), [0, '#3f8fc0', 0.35, '#7dbbd8', 0.7, '#cfe3dc', 0.9, '#f3dfb4', 1, '#f8d79b']); c.fillRect(0, 0, W, Y(HZ) + 1);
      // 太陽：剛升起，貼著海平線，一大圈暖光
      const sx = X(SUNX), sy = Y(SUNY);
      c.fillStyle = rg(c, sx, sy, 0, s * 52, [0, 'rgba(255,246,214,.95)', 0.08, 'rgba(255,232,170,.6)', 0.3, 'rgba(255,214,140,.2)', 1, 'rgba(255,210,140,0)']); c.fillRect(0, 0, W, Y(HZ) + 1);
      c.fillStyle = '#fff8e2'; c.beginPath(); c.arc(sx, sy, s * 3.4, 0, TAU); c.fill();
      // 高空淡淡的卷雲
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineCap = 'round';
      for (let k = 0; k < 8; k++) { const x = X(V.x0 + R() * (V.x1 - V.x0)), y = Y(38 + R() * 18), w = s * (8 + R() * 14); c.lineWidth = s * (0.4 + R() * 0.6); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.5, y - s * 1.4, x + w, y - s * 0.2); c.stroke(); }
      // 海平線上的遠島：左邊一座高的（山頂有座燈塔），右邊兩座低的
      isle(c, -30, 4, 6.5, '#9fb7bf', R); isle(c, -12, 20, 4.2, '#88a5ae', R);
      isle(c, 112, 150, 4.8, '#a9bcc0', R); isle(c, 128, 160, 7.2, '#b6c6c6', R);
      { const lx = -5, ly = HZ + 6.1; c.fillStyle = '#e9ecea'; c.fillRect(X(lx - 0.5), Y(ly + 3.2), s, s * 3.2); c.fillStyle = '#c9524a'; c.fillRect(X(lx - 0.5), Y(ly + 2.2), s, s * 0.6); c.fillStyle = '#556b72'; c.fillRect(X(lx - 0.7), Y(ly + 3.8), s * 1.4, s * 0.6); }
      stilts(c, 120, 4, 'rgba(96,120,128,.85)'); stilts(c, -26, 3, 'rgba(110,132,138,.8)');
      // 遠海：海平線一路鋪到畫面底（近處的水面另外畫在前面）
      c.fillStyle = lg(c, 0, Y(HZ), 0, H, [0, '#9fd0d2', 0.06, '#5fb0bd', 0.3, '#2f8aa1', 1, '#13506b']); c.fillRect(0, Y(HZ), W, H - Y(HZ));
      c.fillStyle = 'rgba(255,240,200,.65)'; c.fillRect(0, Y(HZ) - 1, W, Math.max(1, s * 0.15));
      // 太陽底下的碎金光帶
      for (let k = 0; k < 60; k++) { const y = HZ - R() * R() * 22, w = s * (0.6 + R() * 2.4) * (1 - (HZ - y) / 26), x = sx + (R() - 0.5) * s * (6 + (HZ - y) * 1.6); c.fillStyle = 'rgba(255,236,180,' + (0.3 + R() * 0.45).toFixed(2) + ')'; c.fillRect(x - w / 2, Y(y), w, Math.max(1, s * 0.12)); }
      // 遠海一道道的浪紋
      c.strokeStyle = 'rgba(220,245,240,.18)'; c.lineWidth = Math.max(1, s * 0.12);
      for (let k = 0; k < 40; k++) { const y = HZ - 0.6 - R() * 18, x = X(V.x0 + R() * (V.x1 - V.x0)), w = s * (1.5 + R() * 4); c.beginPath(); c.moveTo(x, Y(y)); c.lineTo(x + w, Y(y)); c.stroke(); }
    },
    terrain(c) {
      // 海床：沙地上幾顆石頭、幾叢海草（大半泡在近處的海水底下）
      const R = mkRand(1414), s = V.s;
      solidGround(c, { fill: lg(c, 0, Y(-8), 0, V.H, [0, '#c9b78c', 0.4, '#a08c62', 1, '#6d5f42']), band: '#ddcb9c', bandH: 0.6, edge: '#7e6c48', edgeW: 0.18 });
      for (let k = 0; k < 26; k++) {
        const x = V.x0 + R() * (V.x1 - V.x0), y = groundYRaw(x);
        if (R() < 0.5) { c.fillStyle = R() < 0.5 ? '#6f7a72' : '#56625c'; ell(c, X(x), Y(y + 0.2), s * (0.5 + R() * 0.8), s * (0.3 + R() * 0.4)); c.fill(); }
        else { c.strokeStyle = R() < 0.5 ? '#4f8a52' : '#6aa25a'; c.lineWidth = Math.max(1, s * 0.22); const h = 1 + R() * 2.2; c.beginPath(); c.moveTo(X(x), Y(y)); c.quadraticCurveTo(X(x + 0.6), Y(y + h * 0.5), X(x - 0.2), Y(y + h)); c.stroke(); }
      }
    },
    init() {
      const R = mkRand(1515); clouds = [];
      for (let k = 0; k < 5; k++) {
        const w = V.s * (12 + R() * 12), h = w * (0.32 + R() * 0.08);
        clouds.push({ cv: cloudSprite(w, h, R, '#fffaf0', '#f2d7b8'), x: V.x0 + R() * (V.x1 - V.x0 + 40) - 20, y: 30 + R() * 20, v: 0.4 + R() * 0.6, a: 0.7 + R() * 0.25 });
      }
      gulls = []; for (let k = 0; k < 5; k++) gulls.push({ x: V.x0 + R() * (V.x1 - V.x0), y: 26 + R() * 18, p: R() * TAU, v: 2 + R() * 2.5, r: 0.8 + R() * 0.5 });
      glints = []; for (let k = 0; k < 18; k++) glints.push({ x: SUNX + (R() - 0.5) * 18, y: HZ - 0.5 - R() * 10, p: R() * TAU });
    },
    back(c, t, dt) {
      for (const k of clouds) {
        k.x += k.v * dt; if (X(k.x) > V.W + 10) k.x = V.x0 - k.cv.width / V.s - 4;
        c.globalAlpha = k.a; c.drawImage(k.cv, X(k.x), Y(k.y));
      }
      c.globalAlpha = 1;
      // 太陽光帶上一閃一閃的亮點
      c.fillStyle = '#fff6d8';
      for (const g of glints) { const a = Math.max(0, Math.sin(t * 2.4 + g.p)); if (a < 0.2) continue; c.globalAlpha = a * 0.8; const w = Math.max(1, V.s * 0.7 * a); c.fillRect(X(g.x) - w / 2, Y(g.y), w, Math.max(1, V.s * 0.14)); }
      c.globalAlpha = 1;
    },
    front(c, t, dt) {
      // 海鷗：兩道弧的翅膀，一拍一拍
      const s = V.s; c.strokeStyle = 'rgba(40,52,60,.8)'; c.lineCap = 'round'; c.lineWidth = Math.max(1, s * 0.16);
      for (const g of gulls) {
        g.x += (g.v + S.wind * 0.25) * dt; g.y += Math.sin(t * 0.7 + g.p) * 0.6 * dt;
        if (g.x > V.x1 + 4) { g.x = V.x0 - 4; g.y = 26 + Math.random() * 18; }
        const x = X(g.x), y = Y(g.y), w = s * g.r * 1.6, f = Math.sin(t * 6 + g.p) * 0.5;
        c.beginPath(); c.moveTo(x - w, y - w * (0.2 + f)); c.quadraticCurveTo(x - w * 0.45, y - w * 0.55, x, y); c.quadraticCurveTo(x + w * 0.45, y - w * 0.55, x + w, y - w * (0.2 + f)); c.stroke();
      }
    }
  };
})();
