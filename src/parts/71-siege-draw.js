/* ===== 71-siege-draw: 第二十九關「三重城」怎麼畫 —— 攻城車的輪子、推進時背景往後捲、雲梯（模擬在 54-siege） ===== */
const SG_RD = { scroll: 0, spin: 0, last: 0 };
// 每一幀畫背景之前：推進的時候背景往後捲（整張背景往左挪，右邊接上同一張）
function siegeView(rdt) {
  RD.scroll = 0;
  if (!S.siege || S.phase !== 'advance') { SG_RD.last = 0; return; }
  const k = clamp(S.phaseT / ADV_T, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, off = e * V.W * 0.55;
  SG_RD.spin += (off - SG_RD.last) / Math.max(1, V.s * 1.6); SG_RD.last = off;
  RD.scroll = off;
  // 輪子底下揚起的塵土
  if (!FX.low && RD.frame % 2 === 0 && k > 0.05 && k < 0.9) { const st = S.st[0]; part(P_DUST, st.x0 + Math.random() * st.w, 0.4, -6 - Math.random() * 8, 1 + Math.random() * 2, 0.8, 1.6 + Math.random(), C_SAND); }
}
// 攻城車的輪子（畫在城的前面）：四個大木輪，推進的時候轉
function drawWagon(c, t) {
  if (!S.siege) return;
  const st = S.st[0]; if (!st || st.dead) return;
  const s = V.s, r = 1.55, n = 4, y = 0.9;
  for (let k = 0; k < n; k++) {
    const x = st.x0 + 1.9 + k * (st.w - 3.8) / (n - 1), px = X(x), py = Y(y), R = r * s;
    c.save(); c.translate(px, py); c.rotate(SG_RD.spin);
    c.beginPath(); c.arc(0, 0, R, 0, TAU); fs(c, '#6a4424', '#2a1608', Math.max(1, s * 0.16));
    c.strokeStyle = '#3a2410'; c.lineWidth = Math.max(1, s * 0.18); c.beginPath(); for (let j = 0; j < 6; j++) { const a = j / 6 * TAU; c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86); } c.stroke();
    c.strokeStyle = '#8a929e'; c.lineWidth = Math.max(1, s * 0.22); c.beginPath(); c.arc(0, 0, R * 0.94, 0, TAU); c.stroke();
    c.fillStyle = '#4a505c'; c.beginPath(); c.arc(0, 0, R * 0.22, 0, TAU); c.fill();
    c.restore();
  }
}
// 雲梯：從地上斜靠到鉤住的那一點（梯腳在城前一點的地上），上面兩支鉤爪
function drawLadders(c, t) {
  const s = V.s;
  for (const o of S.objs) {
    if (o.t !== 'ladder') continue;
    const dir = o.side === 0 ? -1 : 1, fx = o.x + dir * Math.max(2.5, o.y * 0.38), fy = groundY(fx) < -100 ? 0 : groundY(fx);
    const x0 = X(fx), y0 = Y(fy), x1 = X(o.x), y1 = Y(o.y + 0.6), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * s * 0.55, ny = dx / L * s * 0.55;
    c.strokeStyle = o.flash > 0 ? '#ffe0b0' : '#8e5c2c'; c.lineWidth = Math.max(1.4, s * 0.26); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0 - nx, y0 - ny); c.lineTo(x1 - nx, y1 - ny); c.moveTo(x0 + nx, y0 + ny); c.lineTo(x1 + nx, y1 + ny); c.stroke();
    c.lineWidth = Math.max(1, s * 0.16); c.beginPath(); const steps = Math.max(3, Math.round(L / (s * 1.1)));
    for (let k = 1; k < steps; k++) { const f = k / steps, x = x0 + dx * f, y = y0 + dy * f; c.moveTo(x - nx, y - ny); c.lineTo(x + nx, y + ny); } c.stroke();
    c.strokeStyle = '#5a5f6a'; c.lineWidth = Math.max(1, s * 0.2); c.beginPath(); c.arc(x1 - nx, y1 - ny - s * 0.3, s * 0.4, Math.PI, TAU); c.arc(x1 + nx, y1 + ny - s * 0.3, s * 0.4, Math.PI, TAU); c.stroke();
    // 我方的梯子：一個小兵已經爬到一半（下一輪開火時爬上去）
    if (o.side === 0) { const f = 0.55 + 0.04 * Math.sin(t * 4), sp = unitSprite(0, 'ladder'), k = 0.62, x = x0 + dx * f - nx * 1.6, y = y0 + dy * f - ny * 1.6; c.drawImage(sp.cv, x - sp.ax * k, y - sp.ay * k, sp.w * k, sp.h * k); }
  }
}
