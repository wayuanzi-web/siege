/* ===== 36-scene-waste: 第十八關「機關巨獸」— 燒焦的荒原，黃昏：天邊一顆低低的紅太陽、一根根黑煙柱，
   右邊遠處是巨獸出來的那座鐵工廠（一排煙囪、一格格發紅的窗），左邊遠處是燒起來的村子；
   地上是焦黑龜裂的土（裂縫裡透著火光）、一條被踩出來的路，路上一個個巨大的腳印一路通到我方的城；空中飄著火星 ===== */
THEMES[17] = (function () {
  const HZ = 7.5;                         // 地平線（戰場座標）
  let plumes = [], embers = [], fires = [];
  return {
    key: 'waste',
    build(c, W, H) {
      const R = mkRand(1818), s = V.s; fires = [];
      // 天空：上面深紫、往下暗紅、地平線一帶橘紅
      c.fillStyle = lg(c, 0, 0, 0, Y(HZ), [0, '#1c1024', 0.35, '#4a1a26', 0.7, '#a03a24', 1, '#e8802e']); c.fillRect(0, 0, W, Y(HZ) + 2);
      // 低低的紅太陽（隔著煙，暈開一大圈）
      const sx = X(86), sy = Y(HZ + 9);
      c.fillStyle = rg(c, sx, sy, 0, s * 26, [0, 'rgba(255,190,110,.55)', 0.4, 'rgba(255,120,60,.25)', 1, 'rgba(255,90,40,0)']); c.fillRect(sx - s * 26, sy - s * 26, s * 52, s * 52);
      c.fillStyle = rg(c, sx, sy, 0, s * 6.5, [0, '#fff0c8', 0.6, '#ffb060', 1, '#ff7a3a']); c.beginPath(); c.arc(sx, sy, s * 6.5, 0, TAU); c.fill();
      // 一層層的雲，被底下的火光照紅
      for (let k = 0; k < 7; k++) { const x = V.x0 + R() * (V.x1 - V.x0), y = 30 + R() * 16, w = 14 + R() * 18; c.fillStyle = 'rgba(' + (60 + R() * 40 | 0) + ',20,30,.35)'; ell(c, X(x), Y(y), s * w, s * (1.6 + R() * 1.4)); c.fill(); c.fillStyle = 'rgba(255,130,70,.12)'; ell(c, X(x), Y(y - 1), s * w * 0.8, s * 0.7); c.fill(); }
      // 遠山：暗暗的兩層
      for (const [base, amp, col, f] of [[HZ + 7, 4, '#3a1c22', 0.05], [HZ + 3.5, 3, '#2a141a', 0.09]]) {
        c.beginPath(); c.moveTo(X(V.x0 - 2), Y(HZ - 1));
        for (let x = V.x0 - 2; x <= V.x1 + 4; x += 2) c.lineTo(X(x), Y(base + amp * (Math.sin(x * f + base) * 0.6 + Math.sin(x * f * 2.3 + 1.7) * 0.4)));
        c.lineTo(X(V.x1 + 4), Y(HZ - 1)); c.closePath(); c.fillStyle = col; c.fill();
      }
      // 右邊遠處：巨獸出來的鐵工廠（煙囪、廠房、鐵架，一格格發紅的窗）
      c.fillStyle = '#1a0e12';
      const fx = 74; c.fillRect(X(fx), Y(HZ + 7), s * 30, s * 7.5);
      for (const [x, w, h] of [[fx + 2, 1.4, 15], [fx + 6, 1.8, 19], [fx + 11, 1.4, 13], [fx + 19, 2.0, 21], [fx + 25, 1.5, 16]]) { c.fillRect(X(x), Y(HZ + h), s * w, s * h); c.fillRect(X(x - 0.3), Y(HZ + h + 0.6), s * (w + 0.6), s * 0.6); }
      c.strokeStyle = '#1a0e12'; c.lineWidth = Math.max(1, s * 0.25); c.beginPath(); for (let x = fx + 3; x < fx + 28; x += 2.2) { c.moveTo(X(x), Y(HZ + 14.5)); c.lineTo(X(x + 1.1), Y(HZ + 16.5)); c.lineTo(X(x + 2.2), Y(HZ + 14.5)); } c.stroke();
      for (let k = 0; k < 22; k++) { const x = fx + 1 + R() * 27, y = HZ + 8 + R() * 5; c.fillStyle = 'rgba(255,' + (90 + R() * 80 | 0) + ',40,' + (0.4 + R() * 0.5).toFixed(2) + ')'; c.fillRect(X(x), Y(y), s * 0.7, s * 0.5); }
      // 左邊遠處：燒起來的村子（屋頂的剪影、火光）
      c.fillStyle = '#20101a';
      for (let x = V.x0 + 2; x < 36; x += 4 + R() * 3) { const w = 2.5 + R() * 2, h = 2 + R() * 2; c.fillRect(X(x), Y(HZ + h), s * w, s * h); poly(c, [X(x - 0.4), Y(HZ + h), X(x + w + 0.4), Y(HZ + h), X(x + w / 2), Y(HZ + h + 1.6)]); c.fill(); if (R() < 0.6) fires.push({ x: x + w / 2, y: HZ + h + 1, ph: R() * TAU }); }
      // 黑煙柱（不動的大團，動的煙在 back 裡飄）
      plumes = []; for (const x of [16, 30, 79, 95, 104]) plumes.push({ x, ph: R() * TAU });
      for (const P of plumes) for (let k = 0; k < 6; k++) { const y = HZ + 8 + k * 5, w = 2 + k * 1.3; c.fillStyle = 'rgba(20,12,16,' + (0.42 - k * 0.05).toFixed(2) + ')'; ell(c, X(P.x + Math.sin(k * 0.8 + P.ph) * 2 + k * 0.8), Y(y), s * w, s * w * 0.7); c.fill(); }
      // 地平線附近的熱霧
      c.fillStyle = lg(c, 0, Y(HZ + 4), 0, Y(HZ - 1), [0, 'rgba(255,120,60,0)', 1, 'rgba(255,120,60,.25)']); c.fillRect(0, Y(HZ + 4), W, Y(HZ - 1) - Y(HZ + 4));
    },
    terrain(c) {
      // 焦黑龜裂的土：裂縫裡透著火光；一條被踩出來的路、路上巨大的腳印；斷掉的長槍、碎石
      const s = V.s, R = mkRand(2828), g0 = Y(0);
      c.fillStyle = lg(c, 0, Y(HZ - 1), 0, V.H, [0, '#3a2420', 0.25, '#2a1a16', 1, '#120a08']); c.fillRect(0, Y(HZ - 1), V.W, V.H - Y(HZ - 1) + 2);
      c.fillStyle = '#4a2c22'; c.fillRect(0, g0 - Math.max(1, s * 0.12), V.W, Math.max(2, s * 0.3));
      for (let k = 0; k < 26; k++) {
        let x = V.x0 + R() * (V.x1 - V.x0), y = -0.3 - R() * 6; const n = 3 + (R() * 4 | 0);
        c.strokeStyle = 'rgba(10,4,2,.8)'; c.lineWidth = Math.max(1, s * 0.18); c.beginPath(); c.moveTo(X(x), Y(y));
        const pts = [[x, y]]; for (let j = 0; j < n; j++) { x += (R() - 0.5) * 3; y -= R() * 0.8; c.lineTo(X(x), Y(y)); pts.push([x, y]); } c.stroke();
        if (R() < 0.55) { c.strokeStyle = 'rgba(255,110,40,.4)'; c.lineWidth = Math.max(1, s * 0.07); c.beginPath(); c.moveTo(X(pts[0][0]), Y(pts[0][1])); for (const q of pts) c.lineTo(X(q[0]), Y(q[1])); c.stroke(); }
      }
      // 路：從右邊一路通到我方的城，路上一個個大腳印
      c.fillStyle = 'rgba(80,52,40,.45)'; c.fillRect(X(40), g0 + s * 0.4, s * 72, s * 1.6);
      for (let x = 46; x < V.x1; x += 7.5) { c.fillStyle = 'rgba(12,6,4,.55)'; ell(c, X(x), g0 + s * 1.2, s * 1.9, s * 0.45); c.fill(); for (let j = 0; j < 3; j++) { c.fillRect(X(x - 2.4), g0 + s * (0.95 + j * 0.22), s * 0.7, s * 0.12); } }
      for (let k = 0; k < 120; k++) { c.fillStyle = R() < 0.6 ? 'rgba(10,6,4,.5)' : 'rgba(120,80,60,.25)'; ell(c, R() * V.W, Y(-R() * 7), s * (0.12 + R() * 0.4), s * (0.07 + R() * 0.2)); c.fill(); }
      for (let k = 0; k < 6; k++) { const x = 42 + R() * 60, a = -0.6 - R() * 0.9; c.strokeStyle = '#3a2416'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(X(x), g0); c.lineTo(X(x + Math.cos(a) * 3), Y(-Math.sin(a) * 3)); c.stroke(); }
    },
    init() {
      const R = mkRand(3838);
      embers = []; for (let k = 0; k < 46; k++) embers.push({ x: V.x0 + R() * (V.x1 - V.x0), y: R() * 40, v: 0.6 + R() * 1.4, p: R() * TAU, r: 0.08 + R() * 0.12 });
    },
    back(c, t, dt) {
      const s = V.s;
      // 遠處的火：一閃一閃
      for (const F of fires) { const fl = 0.6 + 0.4 * Math.sin(t * 6 + F.ph) * Math.sin(t * 2.3 + F.ph); c.fillStyle = 'rgba(255,' + (110 + 60 * fl | 0) + ',40,' + (0.45 * fl).toFixed(2) + ')'; ell(c, X(F.x), Y(F.y), s * (1.0 + fl * 0.5), s * (1.4 + fl * 0.8)); c.fill(); }
      // 煙柱頂上慢慢飄散的煙
      for (const P of plumes) for (let k = 0; k < 3; k++) { const u = ((t * 0.05 + k / 3 + P.ph) % 1), y = HZ + 36 + u * 14, w = 9 + u * 6; c.fillStyle = 'rgba(30,16,20,' + (0.3 * (1 - u)).toFixed(2) + ')'; ell(c, X(P.x + 4 + u * 9 + Math.sin(P.ph + u * 3)), Y(y), s * w, s * w * 0.45); c.fill(); }
    },
    front(c, t, dt) {
      const s = V.s;
      // 火星：往上飄、左右晃
      c.fillStyle = 'rgba(255,170,80,.8)';
      for (const e of embers) { e.y += e.v * dt; e.x += Math.sin(t * 1.3 + e.p) * dt * 0.8 + dt * 0.4; if (e.y > 44) { e.y = 0; e.x = V.x0 + Math.random() * (V.x1 - V.x0); } if (e.x > V.x1 + 2) e.x = V.x0; c.fillRect(X(e.x), Y(e.y), Math.max(1, s * e.r), Math.max(1, s * e.r)); }
      const g = rg(c, V.W / 2, V.H * 0.55, V.H * 0.55, V.W * 0.8, [0, 'rgba(0,0,0,0)', 1, 'rgba(20,0,0,.22)']); c.fillStyle = g; c.fillRect(0, 0, V.W, V.H);
    }
  };
})();
