/* ===== 36-scene-forge: 第十五關「熔岩鑄城」— 火山口的夜：天上壓著一層被底下岩漿映紅的煙雲；
   遠處一座正在噴發的大火山（火口冒著煙），山坡上幾道岩漿流；地平線上幾根玄武岩柱的剪影，再前面一大片岩漿海，一閃一閃；
   兩座城後面是長滿柱狀節理的玄武岩台地。近處的岩漿湖（會漲）是引擎畫的（drawLava），這裡只畫遠景和台地 ===== */
THEMES[14] = (function () {
  const HZ = 7.5;                        // 遠處岩漿海的海平線
  const VX = 56, VH = 31, VW = 46;       // 遠處大火山：中心、山頂高、山腳半寬
  let clouds = [], ash = [], embers = [], plumes = [], chims = [];
  const sm = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  // 大火山的輪廓（凹的山坡，頂上一個缺口）
  const volcY = (x) => { const d = Math.abs(x - VX); if (d < 2.6) return VH - 1.3 * (1 - (d / 2.6) * (d / 2.6)); const u = (d - 2.6) / (VW - 2.6); return HZ + (VH - HZ) * Math.pow(Math.max(0, 1 - u), 1.7); };
  // 一團煙雲：幾個扁圓疊起來，頂上暗、肚子被底下的火光映紅
  function smokeCloud(w, h, R) {
    const cv = mkCanvas(w, h), c = cv.getContext('2d'), n = 5 + ((R() * 4) | 0);
    c.fillStyle = '#000';
    for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, r = h * (0.22 + 0.2 * Math.sin(u * Math.PI) + R() * 0.07); c.beginPath(); c.arc(w * (0.12 + 0.76 * u), h * 0.6 - r * 0.25, r, 0, TAU); c.fill(); }
    c.fillRect(w * 0.12, h * 0.55, w * 0.76, h * 0.25);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = lg(c, 0, 0, 0, h, [0, '#2a181c', 0.45, '#4a2220', 0.8, '#8a3a1e', 1, '#b8541e']); c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = lg(c, 0, 0, 0, h, [0, '#000', 0.7, '#000', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
    return cv;
  }
  // 遠處的山脈（暗紅色的剪影，稜線被火光描一道邊）
  function range(c, R, yb, amp, f0, col, rim) {
    const fn = ridgeFn(R, f0), x0 = V.x0 - 4, x1 = V.x1 + 4;
    c.beginPath(); c.moveTo(X(x0), Y(HZ - 1));
    for (let x = x0; x <= x1 + 1; x += 1) c.lineTo(X(x), Y(yb + amp * (0.55 + 0.45 * fn(x))));
    c.lineTo(X(x1 + 1), Y(HZ - 1)); c.closePath(); c.fillStyle = col; c.fill();
    if (rim) { c.beginPath(); for (let x = x0; x <= x1 + 1; x += 1) c.lineTo(X(x), Y(yb + amp * (0.55 + 0.45 * fn(x)))); c.strokeStyle = rim; c.lineWidth = Math.max(1, V.s * 0.18); c.stroke(); }
  }
  return {
    key: 'forge',
    build(c, W, H) {
      const R = mkRand(1515), s = V.s;
      // 天：頂上幾乎是黑的煙，往地平線轉成被岩漿映紅的橘
      c.fillStyle = lg(c, 0, 0, 0, Y(HZ), [0, '#0f080c', 0.35, '#21100f', 0.62, '#45160f', 0.84, '#8a2a10', 0.95, '#cc4a14', 1, '#f07a26']); c.fillRect(0, 0, W, Y(HZ) + 1);
      // 大火山後面一大團暖光
      c.fillStyle = rg(c, X(VX), Y(VH + 2), 0, s * 60, [0, 'rgba(255,140,60,.38)', 0.35, 'rgba(230,80,30,.16)', 1, 'rgba(200,60,20,0)']); c.fillRect(0, 0, W, Y(HZ) + 1);
      // 兩邊遠山
      range(c, R, HZ + 4, 9, 0.05, '#3a1612', 'rgba(255,120,60,.25)');
      // 大火山：凹的山坡，山坡上被熔岩流映紅
      c.beginPath(); c.moveTo(X(VX - VW - 2), Y(HZ - 1));
      for (let x = VX - VW; x <= VX + VW; x += 0.5) c.lineTo(X(x), Y(volcY(x) + Math.sin(x * 1.3) * 0.25));
      c.lineTo(X(VX + VW + 2), Y(HZ - 1)); c.closePath();
      c.fillStyle = lg(c, 0, Y(VH), 0, Y(HZ), [0, '#2a1312', 0.6, '#3a1814', 1, '#5a2014']); c.fill();
      // 山坡上幾道岩漿流（從火口往兩邊淌下來，越往下越暗）
      for (let k = 0; k < 7; k++) {
        const dir = k & 1 ? 1 : -1, a0 = 2 + R() * 2, len = 0.35 + R() * 0.5, ph = R() * TAU;
        c.beginPath();
        for (let u = 0; u <= 1.001; u += 0.04) { const d = a0 + u * len * (VW - a0), x = VX + dir * d + Math.sin(u * 7 + ph) * 0.9; c.lineTo(X(x), Y(volcY(VX + dir * d) - 0.1)); }
        c.strokeStyle = lg(c, 0, Y(VH), 0, Y(HZ + 2), [0, 'rgba(255,220,120,.95)', 0.4, 'rgba(255,120,40,.75)', 1, 'rgba(200,50,20,.15)']); c.lineWidth = Math.max(1.5, s * (0.32 + R() * 0.25)); c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
      }
      // 火口：一口白熱的光
      c.fillStyle = rg(c, X(VX), Y(VH - 0.5), 0, s * 6, [0, 'rgba(255,245,190,.95)', 0.3, 'rgba(255,170,70,.6)', 1, 'rgba(255,100,40,0)']); c.fillRect(X(VX) - s * 6, Y(VH - 0.5) - s * 6, s * 12, s * 12);
      // 岩漿海上幾根遠遠的玄武岩柱（剪影，頂上被火光描一道邊）
      chims = [];
      for (const [x, h, w] of [[V.x0 + 6, 5.5, 2.4], [V.x0 + 11, 3.2, 1.6], [24, 4.4, 2], [88, 3.8, 1.8], [V.x1 - 9, 6, 2.6], [V.x1 - 4, 3.4, 1.5]]) {
        c.fillStyle = '#24100e'; c.beginPath(); c.moveTo(X(x - w * 0.6), Y(HZ - 0.4)); c.lineTo(X(x - w * 0.45), Y(HZ + h)); c.lineTo(X(x + w * 0.4), Y(HZ + h + 0.3)); c.lineTo(X(x + w * 0.6), Y(HZ - 0.4)); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,140,60,.45)'; c.lineWidth = Math.max(1, s * 0.15); c.beginPath(); c.moveTo(X(x - w * 0.45), Y(HZ + h)); c.lineTo(X(x + w * 0.4), Y(HZ + h + 0.3)); c.stroke();
      }
      chims.push({ x: VX - 1, y: VH + 0.5 }, { x: VX + 1.5, y: VH });          // 火口冒的煙
      // 遠處的岩漿海：海平線一路鋪到畫面底，越近越暗紅；一道道亮紋
      c.fillStyle = lg(c, 0, Y(HZ), 0, H, [0, '#ffb04a', 0.05, '#f06a1e', 0.3, '#a8260e', 0.7, '#5a0e08', 1, '#2a0604']); c.fillRect(0, Y(HZ), W, H - Y(HZ));
      for (let k = 0; k < 70; k++) {
        const y = HZ - 0.4 - R() * R() * 18, w = s * (0.8 + R() * 4) * (1 - (HZ - y) / 24), x = X(V.x0 + R() * (V.x1 - V.x0));
        c.fillStyle = 'rgba(255,' + ((170 + R() * 70) | 0) + ',90,' + (0.25 + R() * 0.45).toFixed(2) + ')'; c.fillRect(x, Y(y), w, Math.max(1, s * 0.12));
      }
      for (let k = 0; k < 18; k++) { const x = V.x0 + R() * (V.x1 - V.x0), y = HZ - 1 - R() * 14, w = 1 + R() * 3; c.fillStyle = 'rgba(30,10,8,.6)'; ell(c, X(x), Y(y), w * s, w * s * 0.18); c.fill(); }
      c.fillStyle = 'rgba(255,230,160,.8)'; c.fillRect(0, Y(HZ) - 1, W, Math.max(1, s * 0.15));
    },
    terrain(c) {
      // 兩座城後面的玄武岩台地：柱狀節理一根根直立，頂上一層碎石，貼近岩漿的那一截被映紅
      const R = mkRand(1616), s = V.s;
      solidGround(c, { fill: lg(c, 0, Y(38), 0, V.H, [0, '#4a3e3a', 0.25, '#2e2523', 1, '#140e0d']), band: '#5c4e49', bandH: 0.5, edge: '#120c0b', edgeW: 0.25 });
      for (const [xa, xb] of groundRuns()) {
        c.save(); c.beginPath(); traceGround(c, xa, xb, 0, true); c.lineTo(X(xb), V.H + 4); c.lineTo(X(xa), V.H + 4); c.closePath(); c.clip();
        for (let x = xa + 0.5; x < xb; x += 1.1 + R() * 1.2) { const top = groundYRaw(x); c.strokeStyle = 'rgba(10,6,6,.55)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(X(x), Y(top - 0.6)); c.lineTo(X(x + (R() - 0.5) * 0.3), V.H); c.stroke(); c.strokeStyle = 'rgba(140,110,100,.18)'; c.beginPath(); c.moveTo(X(x - 0.15), Y(top - 0.6)); c.lineTo(X(x - 0.15), V.H); c.stroke(); }
        c.fillStyle = lg(c, 0, Y(-4), 0, Y(10), [0, 'rgba(255,90,30,.35)', 1, 'rgba(255,90,30,0)']); c.fillRect(X(xa), Y(10), (xb - xa) * s, 14 * s);
        c.restore();
        for (let k = 0; k < (xb - xa) / 2; k++) { const x = xa + R() * (xb - xa), y = groundYRaw(x); if (y < 20) continue; c.fillStyle = R() < 0.5 ? '#3c322f' : '#55463f'; ell(c, X(x), Y(y + 0.15), s * (0.3 + R() * 0.5), s * (0.15 + R() * 0.2)); c.fill(); }
      }
    },
    init() {
      const R = mkRand(1717); clouds = [];
      for (let k = 0; k < 6; k++) { const w = V.s * (14 + R() * 16), h = w * (0.3 + R() * 0.1); clouds.push({ cv: smokeCloud(Math.ceil(w), Math.ceil(h), R), x: V.x0 + R() * (V.x1 - V.x0 + 40) - 20, y: 38 + R() * 20, v: 0.3 + R() * 0.5, a: 0.55 + R() * 0.3 }); }
      ash = []; for (let k = 0; k < 40; k++) ash.push({ x: V.x0 + R() * (V.x1 - V.x0), y: R() * 60, v: 1 + R() * 2, p: R() * TAU, r: 0.08 + R() * 0.12 });
      embers = []; for (let k = 0; k < 26; k++) embers.push({ x: V.x0 + R() * (V.x1 - V.x0), y: -6 + R() * 50, v: 2 + R() * 4, p: R() * TAU });
      plumes = []; for (const ch of chims) plumes.push({ x: ch.x, y: ch.y, t: R() * 10 });
    },
    back(c, t, dt) {
      const s = V.s;
      // 火口冒的煙：一團團往上、往風吹的方向飄，越高越大、越淡
      for (const p of plumes) for (let k = 0; k < 6; k++) {
        const u = ((t * 0.08 + k / 6 + p.t) % 1), x = X(p.x + u * 5 + S.wind * u * 1.2), y = Y(p.y + u * 16), r = s * (1 + u * 4.5);
        c.globalAlpha = (1 - u) * 0.5; c.fillStyle = '#2a1818'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      // 大火山的火口一脹一縮
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 1.7) + 0.1 * Math.sin(t * 4.3);
      const g = glowSprite(C_ORANGE), r = s * 9; c.drawImage(g, X(VX) - r, Y(VH) - r, r * 2, r * 2);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      // 煙雲
      for (const k of clouds) {
        k.x += (k.v + S.wind * 0.2) * dt; if (X(k.x) > V.W + 10) k.x = V.x0 - k.cv.width / V.s - 4; if (X(k.x) + k.cv.width < -10 && S.wind < 0) k.x = V.x1 + 4;
        c.globalAlpha = k.a; c.drawImage(k.cv, X(k.x), Y(k.y));
      }
      c.globalAlpha = 1;
    },
    front(c, t, dt) {
      const s = V.s;
      // 飄下來的灰
      c.fillStyle = 'rgba(70,58,56,.75)';
      for (const a of ash) {
        a.y -= a.v * dt; a.x += (Math.sin(t * 0.8 + a.p) * 0.6 + S.wind * 0.3) * dt;
        if (a.y < -9) { a.y = 60; a.x = V.x0 + Math.random() * (V.x1 - V.x0); }
        c.fillRect(X(a.x), Y(a.y), Math.max(1, s * a.r * 2), Math.max(1, s * a.r));
      }
      // 從岩漿往上飄的火星
      c.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        e.y += e.v * dt; e.x += (Math.sin(t * 1.3 + e.p) * 0.8 + S.wind * 0.4) * dt;
        if (e.y > 55) { e.y = (S.water ? S.water.y : -6) + Math.random() * 2; e.x = V.x0 + Math.random() * (V.x1 - V.x0); }
        const a = 0.5 + 0.5 * Math.sin(t * 6 + e.p); c.fillStyle = 'rgba(255,' + (140 + (a * 80 | 0)) + ',60,' + (0.4 + a * 0.5).toFixed(2) + ')';
        c.fillRect(X(e.x), Y(e.y), Math.max(1, s * 0.16), Math.max(1, s * 0.16));
      }
      c.globalCompositeOperation = 'source-over';
    }
  };
})();
