/* ===== 36-scene-lord: 第三十關「乾坤魔君」— 天地之間。天空一半金白、一半深紫（斜斜地分開，中間一道光），背後一個很大很淡的太極；
   雲一圈一圈繞著轉。魔君的倒懸殿蓋在一座倒過來的山頂上，山用兩條大鐵鍊吊在天上；我方站在懸崖邊 ===== */
THEMES[29] = (function () {
  let swirl = [];
  return {
    key: 'lord',
    build(c, W, H) {
      const s = V.s, R = mkRand(3030);
      c.fillStyle = lg(c, 0, 0, W, H, [0, '#fff4d8', 0.42, '#e8c8a0', 0.5, '#8a6ab8', 0.58, '#3a2a68', 1, '#120c28']); c.fillRect(0, 0, W, H);
      // 中間那道光
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = lg(c, W * 0.35, 0, W * 0.65, H, [0, 'rgba(255,240,200,0)', 0.48, 'rgba(255,240,220,.25)', 0.5, 'rgba(255,255,255,.4)', 0.52, 'rgba(255,240,220,.25)', 1, 'rgba(255,240,200,0)']); c.fillRect(0, 0, W, H); c.restore();
      // 很淡的太極
      const cx = X(MID + 4), cy = Y(36), r = s * 22;
      c.globalAlpha = 0.12; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); c.fill(); c.fillStyle = '#000018'; c.beginPath(); c.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx, cy + r / 2, r / 2, 0, TAU); c.fill(); c.fillStyle = '#000018'; c.beginPath(); c.arc(cx, cy - r / 2, r / 2, 0, TAU); c.fill(); c.globalAlpha = 1;
      // 星星（暗的那一半）
      for (let k = 0; k < 90; k++) { const x = R() * W, y = R() * H; if (x / W + y / H < 1.05) continue; c.fillStyle = 'rgba(255,255,255,' + (0.3 + R() * 0.5).toFixed(2) + ')'; c.fillRect(x, y, 1, 1); }
      // 遠處浮著的幾塊倒懸的小山
      for (const [x, y, w] of [[V.x0 + 10, 38, 5], [MID - 10, 46, 3.5], [V.x1 - 14, 44, 4.5]]) { c.fillStyle = 'rgba(70,50,110,.55)'; c.beginPath(); c.moveTo(X(x - w), Y(y)); c.lineTo(X(x + w), Y(y)); c.lineTo(X(x + w * 0.2), Y(y - w * 1.6)); c.closePath(); c.fill(); c.fillStyle = 'rgba(120,150,90,.45)'; c.fillRect(X(x - w), Y(y + 0.4), w * 2 * s, 0.4 * s); }
    },
    terrain(c) {
      const s = V.s, R = mkRand(303);
      // 我方站的懸崖（左邊那一段照平常畫到畫面底）
      const runs = groundRuns(), mine = runs.filter((r) => r[0] < MID), his = runs.find((r) => r[0] > MID);
      for (const [xa, xb] of mine) { c.beginPath(); c.moveTo(X(xa), Y(0)); c.lineTo(X(xb), Y(0)); c.lineTo(X(xb - 1.5), V.H + 4); c.lineTo(X(xa), V.H + 4); c.closePath(); c.fillStyle = lg(c, 0, Y(0), 0, V.H, [0, '#6a5a7a', 0.35, '#4a3a5e', 1, '#1e1430']); c.fill(); c.fillStyle = '#8a9a6a'; c.fillRect(X(xa), Y(0), (xb - xa) * s, 0.4 * s); }
      // 倒懸山：頂面平平的，往下收成一個尖（底下是天）
      if (his) {
        const [xa, xb] = his, mx = (xa + xb) / 2, tip = -26;
        c.beginPath(); c.moveTo(X(xa), Y(0)); c.lineTo(X(xb), Y(0));
        for (let k = 1; k <= 8; k++) { const f = k / 8; c.lineTo(X(xb - (xb - mx) * f + (R() - 0.5) * 2), Y(tip * f)); }
        for (let k = 7; k >= 1; k--) { const f = k / 8; c.lineTo(X(xa + (mx - xa) * f + (R() - 0.5) * 2), Y(tip * f)); }
        c.closePath(); c.fillStyle = lg(c, 0, Y(0), 0, Y(tip), [0, '#5a4a6e', 0.5, '#3a2c50', 1, '#1e1430']); c.fill();
        c.strokeStyle = 'rgba(200,180,240,.25)'; c.lineWidth = Math.max(1, s * 0.12); for (let k = 0; k < 6; k++) { const y = -2 - k * 3.5, f = -y / -tip; c.beginPath(); c.moveTo(X(xa + (mx - xa) * f + 2), Y(y)); c.lineTo(X(xb - (xb - mx) * f - 2), Y(y - 0.6)); c.stroke(); }
        c.fillStyle = '#8a9a6a'; c.fillRect(X(xa), Y(0), (xb - xa) * s, 0.4 * s);
        // 兩條大鐵鍊：從山頂兩邊的鐵環往上通到天上
        for (const x of [xa + 0.9, xb - 0.9]) {
          c.strokeStyle = '#2e2838'; c.lineWidth = Math.max(2, s * 0.55); for (let y = 1.2; y < 70; y += 1.4) { c.beginPath(); c.ellipse(X(x), Y(y), s * 0.35, s * 0.6, 0, 0, TAU); c.stroke(); }
          c.fillStyle = '#4a4458'; c.beginPath(); c.arc(X(x), Y(0.6), s * 0.8, 0, TAU); c.fill(); c.strokeStyle = '#1a1424'; c.lineWidth = Math.max(1, s * 0.16); c.stroke();
        }
      }
    },
    init() { const R = mkRand(31); swirl = []; for (let k = 0; k < 7; k++) swirl.push({ a: R() * TAU, r: 14 + R() * 18, y: 30 + R() * 14, w: 6 + R() * 8, v: 0.04 + R() * 0.05 }); },
    back(c, t, dt) {
      const s = V.s;
      // 雲一圈一圈繞著太極轉
      for (const o of swirl) { o.a += o.v * dt; const x = MID + 4 + Math.cos(o.a) * o.r * 1.6, y = 36 + Math.sin(o.a) * o.r * 0.55, light = Math.sin(o.a) > 0; c.fillStyle = light ? 'rgba(255,248,230,.5)' : 'rgba(60,40,110,.45)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(X(x + (k - 1) * o.w * 0.3), Y(y + (k === 1 ? 0.6 : 0)), o.w * s * (k === 1 ? 0.3 : 0.22), 0, TAU); c.fill(); } }
    },
    front() {}
  };
})();
