/* ===== 36-scene-siege: 第二十九關「三重城」— 清晨的攻城大道。淡金色的天，遠山前面一座層層疊疊的大城（外圍木柵、中間石牆、最裡面高高的主樓），
   城頭插滿紅旗；近處是一條壓滿車轍的土路，路邊幾棵樹、幾根拴馬樁，地上散著斷掉的箭。推進的時候整張背景往後捲（71-siege-draw） ===== */
THEMES[28] = (function () {
  let clouds = [];
  return {
    key: 'siege',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, Y(80), 0, Y(0), [0, '#5a7ab8', 0.45, '#a8b8d8', 0.8, '#f0d8b0', 1, '#f8e8c8']); c.fillRect(0, 0, W, H);
      const R = mkRand(2929), s = V.s;
      const sx = X(MID - 20), sy = Y(16); c.fillStyle = rg(c, sx, sy, 0, s * 24, [0, 'rgba(255,248,220,1)', 0.1, 'rgba(255,236,190,.7)', 0.5, 'rgba(255,220,170,.2)', 1, 'rgba(255,220,170,0)']); c.fillRect(0, 0, W, H);
      ridge(c, ridgeFn(R, 0.03), 16, 6, '#8a98b8', 1.4);
      ridge(c, ridgeFn(R, 0.05), 10, 4, '#7a8aa4', 1.3);
      // 遠方的大城：外圍木柵、石牆、主樓（右邊遠處），城頭一排小紅旗
      const cx = MID + 26, base = 6;
      c.fillStyle = '#6a6a7e'; c.fillRect(X(cx - 22), Y(base + 3), 44 * s, 3 * s);          // 外圍
      for (let x = cx - 22; x < cx + 22; x += 1.2) c.fillRect(X(x), Y(base + 3.7), 0.6 * s, 0.7 * s);
      c.fillStyle = '#5e5e74'; c.fillRect(X(cx - 15), Y(base + 7), 30 * s, 4 * s);          // 石牆
      for (let x = cx - 15; x < cx + 15; x += 1.6) c.fillRect(X(x), Y(base + 7.8), 0.8 * s, 0.8 * s);
      for (const tx of [cx - 15, cx - 5, cx + 5, cx + 15]) { c.fillRect(X(tx - 1.4), Y(base + 10), 2.8 * s, 10 * s); c.beginPath(); c.moveTo(X(tx - 1.8), Y(base + 10)); c.lineTo(X(tx), Y(base + 13)); c.lineTo(X(tx + 1.8), Y(base + 10)); c.closePath(); c.fill(); }
      c.fillStyle = '#525268'; c.fillRect(X(cx - 4), Y(base + 18), 8 * s, 12 * s); c.beginPath(); c.moveTo(X(cx - 5), Y(base + 18)); c.lineTo(X(cx), Y(base + 24)); c.lineTo(X(cx + 5), Y(base + 18)); c.closePath(); c.fill();          // 主樓
      c.fillStyle = 'rgba(255,220,150,.6)'; for (let k = 0; k < 6; k++) c.fillRect(X(cx - 3 + (k % 3) * 2.4), Y(base + 16 - ((k / 3) | 0) * 3.5), 0.6 * s, 0.9 * s);
      this.flags = [[cx - 15, base + 13], [cx - 5, base + 13], [cx + 5, base + 13], [cx + 15, base + 13], [cx, base + 24]];
      ridge(c, ridgeFn(R, 0.08), 3, 2, '#8aa070', 1.2);
      // 路邊的樹
      for (const x of [V.x0 + 4, V.x0 + 13, MID - 4, MID + 6, V.x1 - 9]) { const h = 5 + R() * 3; c.fillStyle = '#5a4430'; c.fillRect(X(x - 0.25), Y(h * 0.55), 0.5 * s, h * 0.55 * s); c.fillStyle = '#5a7a44'; c.beginPath(); c.arc(X(x), Y(h * 0.7), h * 0.32 * s, 0, TAU); c.arc(X(x - h * 0.2), Y(h * 0.55), h * 0.24 * s, 0, TAU); c.arc(X(x + h * 0.22), Y(h * 0.58), h * 0.26 * s, 0, TAU); c.fill(); }
    },
    terrain(c) {
      const s = V.s, R = mkRand(292);
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#a08460', 0.3, '#7e6446', 1, '#3e2e1e']), band: '#86a858', bandH: 0.4, edge: '#3a2a18', edgeW: 0.25 });
      // 車轍、斷箭、小石子
      c.strokeStyle = 'rgba(60,40,24,.35)'; c.lineWidth = Math.max(1, s * 0.14);
      for (const y of [-1.1, -2.2]) { c.beginPath(); c.moveTo(X(V.x0), Y(y)); for (let x = V.x0; x <= V.x1; x += 3) c.lineTo(X(x), Y(y + Math.sin(x * 0.3) * 0.12)); c.stroke(); }
      c.strokeStyle = '#5a4026'; c.lineWidth = Math.max(1, s * 0.1);
      for (let k = 0; k < 14; k++) { const x = MID - 14 + R() * 28, a = -0.6 - R() * 1.2; c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x + Math.cos(a) * 1.2), Y(-Math.sin(a) * 1.2)); c.stroke(); }
      c.fillStyle = '#8a7a64'; for (let k = 0; k < 30; k++) { const x = V.x0 + R() * (V.x1 - V.x0); c.beginPath(); c.arc(X(x), Y(-0.6 - R() * 3), s * (0.12 + R() * 0.15), 0, TAU); c.fill(); }
    },
    init() { const R = mkRand(29); clouds = []; for (let k = 0; k < 5; k++) clouds.push({ x: V.x0 + R() * (V.x1 - V.x0), y: 44 + R() * 18, w: 8 + R() * 10, v: 0.3 + R() * 0.5 }); },
    back(c, t, dt) {
      const s = V.s;
      for (const o of clouds) {
        o.x += o.v * dt; if (o.x - o.w > V.x1 + 4) o.x = V.x0 - o.w - 4;
        c.fillStyle = 'rgba(255,250,240,.8)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(X(o.x + (k - 1.5) * o.w * 0.28) - (RD.scroll || 0) * 0.3, Y(o.y + (k === 1 || k === 2 ? 1 : 0)), o.w * s * (k === 1 || k === 2 ? 0.28 : 0.2), 0, TAU); c.fill(); }
      }
      // 遠方城頭的小紅旗（推進的時候跟著背景捲走）
      const off = RD.scroll || 0;
      for (const [x, y] of this.flags || []) { const px = X(x) - off; c.strokeStyle = '#3a2a20'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.moveTo(px, Y(y)); c.lineTo(px, Y(y + 2.2)); c.stroke(); c.fillStyle = '#d43c2a'; c.beginPath(); c.moveTo(px, Y(y + 2.2)); c.lineTo(px + s * (1.4 + Math.sin(t * 4 + x) * 0.2), Y(y + 1.85)); c.lineTo(px, Y(y + 1.5)); c.closePath(); c.fill(); }
    },
    front() {}
  };
})();
