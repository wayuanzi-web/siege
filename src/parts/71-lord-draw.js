/* ===== 71-lord-draw: 第三十關「乾坤魔君」怎麼畫 —— 鏡影兵的浮空鏡、星盤師的星位、乾坤倒轉（模擬在 54-lord） ===== */
// 浮空鏡：一面直立的菱形水晶鏡，鏡面朝敵軍那一邊發亮，四周飄著幾點光
function drawMirage(c, o, t) {
  const s = V.s, x = X(o.x), y = Y(o.y), L = o.len * s, k = clamp(o.hp / o.hm, 0, 1), face = o.side === 0 ? 1 : -1, bob = Math.sin(t * 2 + o.x) * s * 0.15;
  c.save(); c.translate(x, y + bob);
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.35 * o.flash; const g = glowSprite(o.side === 0 ? C_SKY : C_PINK), r = L * 1.3; c.drawImage(g, -r, -r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.beginPath(); c.moveTo(0, -L); c.lineTo(s * 0.9 * face, 0); c.lineTo(0, L); c.lineTo(-s * 0.35 * face, 0); c.closePath();
  c.fillStyle = lg(c, -s * 0.4 * face, 0, s * 0.9 * face, 0, [0, o.side === 0 ? '#3a5a9a' : '#9a3a5a', 0.5, '#e8f4ff', 1, '#ffffff']); c.fill();
  c.strokeStyle = o.side === 0 ? '#2a3a6a' : '#6a2a3a'; c.lineWidth = Math.max(1, s * 0.16); c.stroke();
  if (k < 0.6) { c.strokeStyle = 'rgba(30,30,50,.7)'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.moveTo(0, -L * 0.5); c.lineTo(s * 0.3 * face, -L * 0.1); c.lineTo(0, L * 0.3); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.8)'; for (let j = 0; j < 3; j++) { const a = t * 1.5 + j * 2.1; c.beginPath(); c.arc(Math.cos(a) * s * 1.6, Math.sin(a * 1.3) * L * 0.8, Math.max(1, s * 0.12), 0, TAU); c.fill(); }
  c.restore();
}
// 星位：星盤彈標下的地方，一顆慢慢轉的金色星星，底下一條往天上的虛線（回合結束流星沿著它砸下來）
function drawStars(c, t) {
  const L = S.stars; if (!L || !L.length || S.state !== 'play') return;
  const s = V.s;
  for (const m of L) {
    const x = X(m.x), y = Y(5) - s * 0.0, by = Y(Math.max(0, groundY(m.x))), pulse = 0.6 + 0.4 * Math.sin(t * 5 + m.x);
    c.strokeStyle = m.side === 0 ? 'rgba(255,230,140,.5)' : 'rgba(255,150,130,.5)'; c.lineWidth = Math.max(1, s * 0.14); c.setLineDash([s * 0.6, s * 0.7]); c.lineDashOffset = t * s * 6;
    c.beginPath(); c.moveTo(x, V.hud); c.lineTo(x, by); c.stroke(); c.setLineDash([]);
    c.save(); c.translate(x, Y(m.side === 0 ? 30 : 30)); c.rotate(t * 1.2);
    c.beginPath(); for (let k = 0; k < 10; k++) { const r = (k & 1 ? 0.45 : 1.1) * s * (1 + 0.15 * pulse), a = k * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
    c.fillStyle = m.side === 0 ? '#ffe08a' : '#ff9a8a'; c.fill(); c.strokeStyle = 'rgba(60,30,0,.7)'; c.lineWidth = Math.max(1, s * 0.12); c.stroke();
    c.restore();
  }
}
// 乾坤倒轉：整個畫面一陣紫光，上下各一道光帶往中間收
function drawFlip(c, t) {
  const F = S.flip; if (!F) return;
  const k = clamp(F.t / F.T, 0, 1), a = Math.sin(k * Math.PI);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = 'rgba(120,70,220,' + (0.18 * a).toFixed(3) + ')'; c.fillRect(0, 0, V.W, V.H);
  const h = V.H * 0.5 * k; c.fillStyle = lg(c, 0, 0, 0, h, [0, 'rgba(255,255,255,' + (0.35 * a).toFixed(3) + ')', 1, 'rgba(255,255,255,0)']); c.fillRect(0, 0, V.W, h);
  c.fillStyle = lg(c, 0, V.H, 0, V.H - h, [0, 'rgba(20,10,40,' + (0.45 * a).toFixed(3) + ')', 1, 'rgba(20,10,40,0)']); c.fillRect(0, V.H - h, V.W, h);
  c.setTransform(1, 0, 0, 1, FX.shx, FX.shy);
}
