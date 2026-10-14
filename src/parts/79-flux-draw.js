/* ===== 79-flux-draw: 第二十六關「煉金沸城」怎麼畫 —— 水、油、岩漿、冰、燒著的油、帶電的水；水槽、油桶、熔爐；煉金師手上的藥水（模擬在 54-flux） ===== */
const LQ_COL = [null, ['rgba(120,190,255,.62)', 'rgba(40,110,220,.72)', '#d8f0ff'], ['rgba(70,52,30,.82)', 'rgba(36,24,12,.9)', '#c8a060'], ['rgba(255,200,80,.95)', 'rgba(220,70,20,.95)', '#fff2b0']];
const POT_COL = { potfire: '#ff6a3a', potfrost: '#8ad8ff', potzap: '#ffe14a' };

// 液體：一欄一欄畫；最上面那一格照裝了多少畫一部分（看得出水面），表面一條亮線
function drawFlux(c, t) {
  const F = S.flux; if (!F) return;
  const s = V.s, nx = FL.nx, ny = FL.ny, A = F.amt, K = F.typ, cw = FL.c * s;
  for (let cx = 0; cx < nx; cx++) {
    const x = X(FL.x0 + cx * FL.c);
    if (x + cw < 0 || x > V.W) continue;
    for (let cy = 0; cy < ny; cy++) {
      const i = cy * nx + cx;
      if (F.ice[i] > 0) {          // 結冰：淡藍的冰塊，邊上一圈白
        const y = Y(FL.y0 + (cy + 1) * FL.c);
        c.fillStyle = 'rgba(200,240,255,.78)'; c.fillRect(x, y, cw + 0.5, cw + 0.5); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = Math.max(1, s * 0.08); c.strokeRect(x + 0.5, y + 0.5, cw - 1, cw - 1);
        continue;
      }
      const k = K[i], a = A[i]; if (!k || a < 0.03) continue;
      const above = cy + 1 < ny ? i + nx : -1, top = above < 0 || K[above] !== k || A[above] < 0.03;
      const h = top ? Math.min(1, a) : 1, y0 = Y(FL.y0 + cy * FL.c + h * FL.c), col = LQ_COL[k];
      c.fillStyle = col[top ? 0 : 1]; c.fillRect(x, y0, cw + 0.6, h * cw + 0.6);
      if (top) {
        const wob = k === LQ_LAVA ? 0 : Math.sin(t * 3 + cx * 0.9) * s * 0.06;
        c.fillStyle = col[2]; c.globalAlpha = k === LQ_OIL ? 0.5 : 0.75; c.fillRect(x, y0 + wob, cw + 0.6, Math.max(1, s * 0.12)); c.globalAlpha = 1;
      }
      if (k === LQ_LAVA && !FX.low && top && ((RD.frame + cx * 7) & 31) === 0) part(P_EMBER, FL.x0 + (cx + Math.random()) * FL.c, FL.y0 + (cy + h) * FL.c, rndS(), 3 + Math.random() * 3, 0.8, 0.4, C_ORANGE);
    }
  }
  // 燒著的油：表面一排火苗；帶電的水：一閃一閃的電弧
  const fl = flameSprite(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < nx * ny; i++) {
    if (F.fire[i] > 0 && K[i] === LQ_OIL) {
      const above = i + nx; if (above < nx * ny && K[above] === LQ_OIL && A[above] > 0.03) continue;
      const cx = i % nx, cy = i / nx | 0, ph = t * 10 + cx * 1.3, sc = 0.8 + 0.25 * Math.sin(ph), fw = cw * 1.1 * sc, fh = fw * 1.5, x = X(FL.x0 + (cx + 0.5) * FL.c), y = Y(FL.y0 + (cy + Math.min(1, A[i])) * FL.c);
      c.globalAlpha = 0.85; c.drawImage(fl, x - fw / 2, y - fh * 0.92, fw, fh);
      if (!FX.low && ((RD.frame + cx * 5) & 15) === 0) part(P_SMOKE, FL.x0 + (cx + 0.5) * FL.c, FL.y0 + (cy + 1.5) * FL.c, rndS() * 2, 5, 1.0, 1.0, C_DARK);
    } else if (F.elec[i] > 0 && K[i] === LQ_WATER && ((i * 7 + RD.frame) & 3) === 0) {
      const cx = i % nx, cy = i / nx | 0, x = X(FL.x0 + cx * FL.c), y = Y(FL.y0 + (cy + 0.5) * FL.c);
      c.globalAlpha = Math.min(1, F.elec[i] * 2); c.strokeStyle = '#e8f6ff'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(x, y + rndS() * cw * 0.6); c.lineTo(x + cw * 0.5, y + rndS() * cw * 0.6); c.lineTo(x + cw, y + rndS() * cw * 0.6); c.stroke();
    }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
// 水槽、油桶、熔爐：在磚上加一層看得出裝什麼的樣子；煉金師手上那瓶藥水的顏色
function drawFluxMarks(c, t) {
  const F = S.flux; if (!F) return;
  const s = V.s, sx = FX.shx, sy = FX.shy;
  for (const tk of F.tanks) {
    const b = tk.b; if (b.dead || !b.body) continue;
    const p = b.body.getPosition(), a = b.body.getAngle(), cs = Math.cos(a), sn = Math.sin(a), w = b.w * s, h = b.h * s;
    c.setTransform(cs, -sn, sn, cs, X(p.x) + sx, Y(p.y) + sy);
    if (tk.k === LQ_WATER) { c.fillStyle = 'rgba(70,150,255,.55)'; c.fillRect(-w * 0.36, -h * 0.05, w * 0.72, h * 0.38); c.fillStyle = '#d8f0ff'; c.fillRect(-w * 0.36, -h * 0.05, w * 0.72, Math.max(1, s * 0.1)); }
    else if (tk.k === LQ_OIL) { c.fillStyle = '#2a1a0c'; c.fillRect(-w * 0.4, -h * 0.12, w * 0.8, h * 0.24); c.fillStyle = '#ffcf6a'; c.font = '900 ' + Math.max(6, h * 0.22) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('油', 0, 0); }
    else { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 + 0.2 * Math.sin(t * 4 + p.x); const g = glowSprite(C_ORANGE), r = w * 0.7; c.drawImage(g, -r, -r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#ffb040'; rrect(c, -w * 0.22, -h * 0.1, w * 0.44, h * 0.3, Math.max(1, s * 0.2)); c.fill(); }
  }
  c.setTransform(1, 0, 0, 1, sx, sy);
  for (const u of S.units) {
    if (!u.alive || !u.def.alch || !u.w) continue;
    const col = POT_COL[u.w.id] || '#ffffff', dir = S.team[u.side].dir, x = X(u.x + dir * 1.1), y = Y(u.y + 3.6) + Math.sin(t * 3 + u.slot) * s * 0.1;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; const g = glowSprite(u.w.id === 'potfire' ? C_ORANGE : u.w.id === 'potfrost' ? C_ICE : C_YELLOW), r = s * 1.3; c.drawImage(g, x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = col; c.strokeStyle = '#1a1020'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.arc(x, y + s * 0.15, s * 0.42, 0, TAU); c.fill(); c.stroke(); c.fillRect(x - s * 0.12, y - s * 0.55, s * 0.24, s * 0.4);
  }
}
