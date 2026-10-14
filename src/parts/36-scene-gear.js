/* ===== 36-scene-gear: 第二十七關「預告戰場」— 黃昏的齒輪工坊谷。銅色的天，遠處一座大鐘塔（鐘面的指針會走），
   山壁上嵌著幾個巨大的齒輪慢慢轉，工坊的煙囪冒著煙；地上是石板路、鐵軌和散落的齒輪零件 ===== */
THEMES[26] = (function () {
  let puffs = [];
  // 一個齒輪的剪影（n 個齒）
  function cog(c, x, y, r, n, a, fill) {
    const s = V.s; c.save(); c.translate(X(x), Y(y)); c.rotate(a);
    c.beginPath(); for (let k = 0; k < n * 2; k++) { const q = k / (n * 2) * TAU, rr = (k & 1 ? r * 0.84 : r) * s, h = 0.5 / n * TAU * 0.45; c.lineTo(Math.cos(q - h) * rr, Math.sin(q - h) * rr); c.lineTo(Math.cos(q + h) * rr, Math.sin(q + h) * rr); } c.closePath();
    c.arc(0, 0, r * 0.32 * s, 0, TAU, true); c.fillStyle = fill; c.fill('evenodd');
    c.restore();
  }
  const COGS = [[0, 9, 30, 7, 14, 0.12], [0, 19, 22, 4.5, 10, -0.19], [1, -2, 36, 5.5, 12, 0.08], [1, 21, 27, 6.5, 13, -0.1], [2, -10, 33, 8, 16, 0.07], [2, -21, 24, 4, 9, -0.22]];          // [靠左／中／右, 偏移, 高度, 半徑, 齒數, 轉速]
  return {
    key: 'gear',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, Y(80), 0, Y(0), [0, '#3a2a3a', 0.4, '#8a4a3a', 0.75, '#e08a4a', 1, '#f4c27a']); c.fillRect(0, 0, W, H);
      const R = mkRand(2727), s = V.s;
      // 夕陽
      const sx = X(MID + 6), sy = Y(12); c.fillStyle = rg(c, sx, sy, 0, s * 26, [0, 'rgba(255,240,200,1)', 0.08, 'rgba(255,210,140,.85)', 0.4, 'rgba(255,160,90,.25)', 1, 'rgba(255,140,80,0)']); c.fillRect(0, 0, W, H);
      ridge(c, ridgeFn(R, 0.035), 14, 5, '#6a3a34', 1.4);
      // 大鐘塔（鐘面在 back 裡畫）
      const tx = MID + 30, tw = 6;
      c.fillStyle = '#4a2a28'; c.fillRect(X(tx - tw / 2), Y(40), tw * s, 40 * s);
      c.beginPath(); c.moveTo(X(tx - tw * 0.7), Y(40)); c.lineTo(X(tx), Y(48)); c.lineTo(X(tx + tw * 0.7), Y(40)); c.closePath(); c.fill();
      ridge(c, ridgeFn(R, 0.06), 8, 3, '#5a3028', 1.2);
      // 工坊：一排低矮的屋子和煙囪
      const chims = [];
      for (let k = 0; k < 9; k++) {
        const x = V.x0 + 4 + k * ((V.x1 - V.x0 - 8) / 8) + (R() - 0.5) * 3, w = 5 + R() * 4, h = 4 + R() * 3;
        c.fillStyle = '#3e2420'; c.fillRect(X(x - w / 2), Y(h), w * s, h * s);
        c.beginPath(); c.moveTo(X(x - w / 2 - 0.4), Y(h)); c.lineTo(X(x), Y(h + 2.2)); c.lineTo(X(x + w / 2 + 0.4), Y(h)); c.closePath(); c.fill();
        if (R() < 0.7) { const cx = x + (R() - 0.5) * w * 0.5, ch = h + 3 + R() * 4; c.fillRect(X(cx - 0.45), Y(ch), s * 0.9, (ch - h) * s); chims.push([cx, ch]); }
        c.fillStyle = 'rgba(255,200,120,.75)'; for (let j = 0; j < 2; j++) if (R() < 0.6) c.fillRect(X(x - w * 0.3 + j * w * 0.4), Y(h * 0.55), s * 0.9, s * 1.1);
      }
      this.chims = chims;
    },
    terrain(c) {
      const s = V.s, R = mkRand(271);
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#7a6050', 0.3, '#5a4436', 1, '#2e2018']), band: '#a8886a', bandH: 0.5, edge: '#2a1a12', edgeW: 0.25 });
      // 石板路的縫、散落的小齒輪、一條鐵軌
      c.strokeStyle = 'rgba(40,24,16,.45)'; c.lineWidth = Math.max(1, s * 0.08);
      for (let x = V.x0; x < V.x1; x += 2.2) { c.beginPath(); c.moveTo(X(x), Y(0)); c.lineTo(X(x + 0.3), Y(-0.5)); c.stroke(); }
      c.strokeStyle = '#3a3438'; c.lineWidth = Math.max(1, s * 0.22); c.beginPath(); c.moveTo(X(V.x0), Y(-1.2)); c.lineTo(X(V.x1), Y(-1.2)); c.stroke();
      c.fillStyle = '#4a3a2a'; for (let x = V.x0; x < V.x1; x += 1.6) c.fillRect(X(x), Y(-1.0), s * 0.5, s * 0.5);
      for (let k = 0; k < 7; k++) cog(c, MID - 8 + R() * 16, -0.2, 0.5 + R() * 0.6, 8, R() * TAU, k & 1 ? '#6a5a4a' : '#8a7458');
    },
    init() { puffs = []; },
    back(c, t, dt) {
      const s = V.s;
      // 山壁上的大齒輪（一大一小咬著轉）
      for (const [k, dx, y, r, n, w] of COGS) cog(c, (k === 0 ? V.x0 : k === 1 ? MID : V.x1) + dx, y, r, n, t * w, 'rgba(70,36,32,.75)');
      // 鐘面：指針慢慢走
      const tx = MID + 30, cy = Y(35), cx = X(tx), r = s * 2.2;
      c.fillStyle = '#f4e6c0'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); c.strokeStyle = '#3a2420'; c.lineWidth = Math.max(1, s * 0.2); c.stroke();
      c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(t * 0.5 - Math.PI / 2) * r * 0.8, cy + Math.sin(t * 0.5 - Math.PI / 2) * r * 0.8); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(t * 0.04 - Math.PI / 2) * r * 0.5, cy + Math.sin(t * 0.04 - Math.PI / 2) * r * 0.5); c.stroke();
      // 煙囪的煙
      const ch = this.chims || [];
      if (puffs.length < 26 && ch.length && Math.random() < dt * 5) { const q = ch[(Math.random() * ch.length) | 0]; puffs.push({ x: q[0], y: q[1] + 0.5, a: 0, life: 4 + Math.random() * 3, r: 0.6 + Math.random() * 0.6 }); }
      for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.a += dt; p.y += dt * 1.4; p.x += dt * (0.5 + (S.wind || 0) * 0.2); p.r += dt * 0.45; if (p.a > p.life) { puffs.splice(i, 1); continue; } c.fillStyle = 'rgba(60,40,40,' + (0.35 * (1 - p.a / p.life)).toFixed(3) + ')'; c.beginPath(); c.arc(X(p.x), Y(p.y), p.r * s, 0, TAU); c.fill(); }
    },
    front() {}
  };
})();
