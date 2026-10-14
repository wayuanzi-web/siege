/* ===== 36-scene-alchemy: 第二十六關「煉金沸城」— 暮色裡的煉金谷。紫色的天，遠處一座座尖塔的窗子亮著詭異的綠光、藍光，
   塔頂的煙囪冒著彩色的煙；近處是銅管、坩堝和蒸餾瓶，坩堝一直冒泡。兩城之間一道淺溝（液體會流進去，遊戲畫） ===== */
THEMES[25] = (function () {
  let puffs = [];
  const SMOKE = ['rgba(150,255,180,', 'rgba(170,150,255,', 'rgba(255,170,230,'];
  return {
    key: 'alchemy',
    build(c, W, H) {
      c.fillStyle = lg(c, 0, Y(80), 0, Y(0), [0, '#1a1236', 0.45, '#3a2660', 0.8, '#7a4a7a', 1, '#c8789a']); c.fillRect(0, 0, W, H);
      const R = mkRand(2626), s = V.s;
      // 星星、一彎月
      for (let k = 0; k < 70; k++) { c.fillStyle = 'rgba(255,255,255,' + (0.3 + R() * 0.5) + ')'; c.fillRect(R() * W, Y(30 + R() * 50), 1, 1); }
      c.fillStyle = '#f0e6c8'; c.beginPath(); c.arc(X(80), Y(62), s * 3.2, 0, TAU); c.fill(); c.fillStyle = '#2a1c4a'; c.beginPath(); c.arc(X(81.4), Y(62.8), s * 2.9, 0, TAU); c.fill();
      ridge(c, ridgeFn(R, 0.04), 9, 4, '#2c2048', 1.4);
      // 遠處的尖塔：細高的塔身、尖頂，窗子亮著彩色的光
      const towers = [[V.x0 + 8, 22], [V.x0 + 18, 16], [MID - 6, 27], [MID + 9, 19], [V.x1 - 20, 24], [V.x1 - 8, 17]];
      for (const [x, h] of towers) {
        const w = 2.4 + R() * 1.6;
        c.fillStyle = '#1c1430'; c.fillRect(X(x - w / 2), Y(h), w * s, (h - 6) * s);
        c.beginPath(); c.moveTo(X(x - w * 0.7), Y(h)); c.lineTo(X(x), Y(h + 5 + R() * 3)); c.lineTo(X(x + w * 0.7), Y(h)); c.closePath(); c.fill();
        for (let k = 0; k < 3; k++) { const wy = h - 3 - k * 4; if (wy < 8) break; c.fillStyle = ['#9affb0', '#a8b0ff', '#ffb0e0'][(k + (x | 0)) % 3]; c.fillRect(X(x - 0.35), Y(wy), s * 0.7, s * 1.2); }
      }
      ridge(c, ridgeFn(R, 0.07), 4, 2.4, '#3a2a50', 1.2);
      this.towers = towers;
    },
    terrain(c) {
      const s = V.s, R = mkRand(88);
      solidGround(c, { fill: lg(c, 0, Y(0), 0, V.H, [0, '#4a3a4a', 0.3, '#3a2a3a', 1, '#1e1420']), band: '#6a5a6a', bandH: 0.45, edge: '#140c16', edgeW: 0.25 });
      // 銅管：沿著地面爬、在溝邊彎下去
      c.strokeStyle = '#b07a3a'; c.lineWidth = s * 0.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(X(41.6), Y(0.45)); c.lineTo(X(43.5), Y(0.45)); c.quadraticCurveTo(X(45), Y(0.45), X(45), Y(-1)); c.stroke();
      c.beginPath(); c.moveTo(X(70.4), Y(0.45)); c.lineTo(X(68.5), Y(0.45)); c.quadraticCurveTo(X(67), Y(0.45), X(67), Y(-1)); c.stroke();
      c.strokeStyle = 'rgba(255,220,160,.35)'; c.lineWidth = s * 0.12; c.beginPath(); c.moveTo(X(41.6), Y(0.6)); c.lineTo(X(43.5), Y(0.6)); c.moveTo(X(70.4), Y(0.6)); c.lineTo(X(68.5), Y(0.6)); c.stroke();
    },
    init() { puffs = []; },
    back(c, t, dt) {
      const s = V.s, T = this.towers || [];
      // 尖塔頂冒彩色的煙
      if (puffs.length < 30 && Math.random() < dt * 6 && T.length) { const tw = T[(Math.random() * T.length) | 0]; puffs.push({ x: tw[0], y: tw[1] + 6, a: 0, life: 4 + Math.random() * 3, k: (Math.random() * 3) | 0, r: 0.8 + Math.random() * 0.8 }); }
      for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.a += dt; p.y += dt * 1.6; p.x += dt * (0.6 + (S.wind || 0) * 0.15); p.r += dt * 0.5; if (p.a > p.life) { puffs.splice(i, 1); continue; } c.fillStyle = SMOKE[p.k] + (0.3 * (1 - p.a / p.life)).toFixed(3) + ')'; c.beginPath(); c.arc(X(p.x), Y(p.y), p.r * s, 0, TAU); c.fill(); }
    },
    front(c, t, dt) {
      // 溝底的兩口坩堝：一直冒泡
      const s = V.s;
      for (const x of [MID - 4.5, MID + 4.5]) {
        c.fillStyle = '#2a2230'; c.beginPath(); c.moveTo(X(x - 1.4), Y(-1.2)); c.quadraticCurveTo(X(x - 1.6), Y(-3.4), X(x), Y(-3.4)); c.quadraticCurveTo(X(x + 1.6), Y(-3.4), X(x + 1.4), Y(-1.2)); c.closePath(); c.fill();
        c.fillStyle = '#7aff9a'; ell(c, X(x), Y(-1.3), s * 1.3, s * 0.35); c.fill();
        const ph = (t * 1.3 + x) % 1; c.fillStyle = 'rgba(180,255,200,' + (0.8 * (1 - ph)).toFixed(2) + ')'; c.beginPath(); c.arc(X(x + Math.sin(x + Math.floor(t * 1.3)) * 0.6), Y(-1.2 + ph * 0.8), s * (0.2 + ph * 0.3), 0, TAU); c.fill();
      }
    }
  };
})();
