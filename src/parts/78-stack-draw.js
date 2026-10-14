/* ===== 78-stack-draw: 第二十五關「疊城對決」怎麼畫 —— 狼煙線、待命的兵、天上的磚組和它會落在哪、鉚釘（模擬在 54-stack） ===== */
const PIECE_COL = { [M_WOOD]: ['#e8b070', '#b87a40', '#6a4018'], [M_STONE]: ['#efe6d4', '#c4b89c', '#7a6e58'], [M_IRON]: ['#c8d0dc', '#8892a4', '#4a5262'] };

/* ---------- 磚的後面：狼煙線、城下待命的兵 ---------- */
function drawStackBack(c, t) {
  const SK = S.stack; if (!SK) return;
  const s = V.s;
  for (const side of [0, 1]) {
    const st = S.st[side]; if (!st) continue;
    // 狼煙線：一條虛線，城背那一頭立著一座小烽火台（點著了冒火、冒煙）
    const y = Y(st.y0 + SK.C.line * CS), xa = X(st.x0 - CS * 0.8), xb = X(st.x1 + CS * 0.8), lit = SK.beacon[side];
    c.strokeStyle = lit ? 'rgba(255,190,90,.55)' : 'rgba(255,240,210,.5)'; c.lineWidth = Math.max(1, s * 0.16); c.setLineDash([s * 0.9, s * 0.7]); c.lineDashOffset = -t * s * (lit ? 2 : 0.6);
    c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke(); c.setLineDash([]);
    const bx = side === 0 ? xa - s * 0.6 : xb + s * 0.6;
    c.fillStyle = '#5a4630'; c.fillRect(bx - s * 0.35, y - s * 0.2, s * 0.7, s * 1.6); c.fillStyle = '#3a2c1c'; c.fillRect(bx - s * 0.7, y - s * 0.5, s * 1.4, s * 0.4);
    if (lit) {
      c.globalCompositeOperation = 'lighter'; const g = glowSprite(C_ORANGE), r = s * (1.6 + 0.2 * Math.sin(t * 11 + side)); c.drawImage(g, bx - r, y - s * 0.9 - r, r * 2, r * 2); c.globalCompositeOperation = 'source-over';
      if (!FX.low && (RD.frame & 7) === 0) part(P_SMOKE, WX(bx), WY(y) + 1.4, rndS(), 4, 1.6, 0.9, C_GRAY);
    }
    // 城下待命的兵：站在城基背後那一頭（磚組疊過來就被蓋住）
    let k = 0;
    for (const u of S.team[side].units) {
      if (!u.reserve) continue;
      const sp = unitSprite(side, u.type), x = X(side === 0 ? st.x0 + CS * (0.45 + k * 0.62) : st.x1 - CS * (0.45 + k * 0.62)), yy = Y(st.y0 + st.base * CS) + Math.sin(t * 2.4 + k * 1.7) * s * 0.06;
      c.globalAlpha = 0.85; c.drawImage(sp.cv, x - sp.ax * 0.72, yy - sp.ay * 0.72, sp.w * 0.72, sp.h * 0.72); c.globalAlpha = 1;
      k++;
    }
  }
}

/* ---------- 最上面：天上的磚組、它會落在哪；鉚釘 ---------- */
function drawStackFront(c, t) {
  const SK = S.stack; if (!SK) return;
  const s = V.s;
  // 鉚釘：固樑匠鉚上去的榫頭畫一顆釘頭
  for (const w of S.welds) {
    if (!w.rv || !w.j || w.a.dead || !w.a.body) continue;
    const p = w.a.body.getWorldPoint(w.la), x = X(p.x), y = Y(p.y), r = Math.max(1.2, s * 0.24);
    c.fillStyle = '#3a3f48'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillStyle = '#c8ccd6'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, TAU); c.fill();
  }
  const B = S.build; if (!B || B.st !== 'move') return;
  const st = S.st[B.side], P = pieceShape(B.k, B.rot), L = stackLand(B.side, P, B.x), land = L.by, hy = Math.max(stackTop(st) + CS * 2.4, land + P.h * CS + CS * 1.4) + Math.sin(t * 3) * 0.25;
  const col = PIECE_COL[B.mat] || PIECE_COL[M_STONE], cell = CS * s;
  // 會落在哪：一圈虛線框（擱不平、伸出城外的話是紅的），中間一條細細的垂直線
  const bad = L.off > 0 || L.gaps > 1.2;
  c.strokeStyle = bad ? 'rgba(255,110,90,.85)' : 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1, s * 0.14); c.setLineDash([s * 0.5, s * 0.4]);
  for (const q of P.c) c.strokeRect(X(B.x + q[0] * CS) + 1, Y(land + (q[1] + 1) * CS) + 1, cell - 2, cell - 2);
  c.setLineDash([]);
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.beginPath(); for (let cx = 0; cx < P.w; cx++) { const x = X(B.x + (cx + 0.5) * CS); c.moveTo(x, Y(hy + P.bot[cx] * CS)); c.lineTo(x, Y(land + (P.bot[cx] + 1) * CS)); } c.stroke();
  // 磚組本身
  for (const q of P.c) {
    const x = X(B.x + q[0] * CS), y = Y(hy + (q[1] + 1) * CS);
    rrect(c, x + 1, y + 1, cell - 2, cell - 2, Math.max(1, s * 0.3)); fs(c, lg(c, x, y, x, y + cell, [0, col[0], 1, col[1]]), col[2], Math.max(1, s * 0.16));
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(x + cell * 0.14, y + cell * 0.12, cell * 0.72, Math.max(1, cell * 0.08));
    if (B.mat === M_IRON) { c.fillStyle = col[2]; for (const [a, b] of [[0.2, 0.25], [0.8, 0.25], [0.2, 0.78], [0.8, 0.78]]) { c.beginPath(); c.arc(x + cell * a, y + cell * b, Math.max(1, s * 0.16), 0, TAU); c.fill(); } }
    else if (B.mat === M_WOOD) { c.strokeStyle = col[2]; c.lineWidth = Math.max(1, s * 0.08); c.beginPath(); c.moveTo(x + cell * 0.15, y + cell * 0.5); c.lineTo(x + cell * 0.85, y + cell * 0.5); c.stroke(); }
  }
  if (B.side === 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5); const g = glowSprite(C_GOLD), r = cell * 2.4, cx = X(B.x + P.w * CS / 2), cy = Y(hy + P.h * CS / 2); c.drawImage(g, cx - r, cy - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
}
