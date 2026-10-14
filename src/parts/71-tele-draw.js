/* ===== 71-tele-draw: 第二十七關「預告戰場」怎麼畫 —— 敵軍預告的彈道與落點、齒輪砲台和它的彈道、草人、被轉向的砲口（模擬在 54-tele） ===== */
const TL_RD = { f: -9, list: [], gears: [] };
// 每三幀重算一次預告的彈道（兵被推開、轉向、齒輪轉了，線馬上跟著變）
function teleCalc() {
  const TL = S.tele; TL_RD.f = RD.frame; TL_RD.list.length = 0; TL_RD.gears.length = 0;
  if (TL && TL.plan && TL.r === S.round && !(S.turn === TL.side && S.phase !== 'aim')) {
    const T = S.team[TL.side];
    for (const u of T.units) {
      if (!u.alive || u.tpr !== S.round || !u.tpv) continue;
      const v = [u.tpv[0], u.tpv[1]]; if (u.turn) turnVec(u, v, T.dir);
      const m = muzzle(u, T.dir), P = [], R = simTrace(TL.side, m[0], m[1], v[0], v[1], S.wind, S.time, 150, u.w.i, P);
      const mine = R.hit && ((R.o && R.o.side === 0) || (R.x > S.st[0].x0 - 2 && R.x < S.st[0].x1 + 2));
      TL_RD.list.push({ u, mx: m[0], my: m[1], P, hit: R.hit, x: R.x, y: R.y, mine, held: u.frozen > 0 || u.stun > 0 || u.sunk });
    }
  }
  if (S.gears) for (const o of S.gears) {
    const P = [], L = gearTrace(o, o.ang, P), a = o.ang;
    TL_RD.gears.push({ o, mx: o.x + Math.cos(a) * GEAR_MZ, my: o.y + Math.sin(a) * GEAR_MZ, P, hit: L.hit, x: L.x, y: L.y });
  }
}
// 一條虛線（照試射錄下來的路線，每 1/30 秒一個點）
function telePath(c, mx, my, P, dash) {
  const s = V.s; c.beginPath(); c.moveTo(X(mx), Y(my));
  for (let i = 0; i < P.length; i += 2) c.lineTo(X(P[i]), Y(P[i + 1]));
  c.setLineDash([s * dash, s * dash * 0.8]); c.stroke(); c.setLineDash([]);
}
function teleMark(c, x, y, col, t, big) {
  const s = V.s, px = X(x), py = Y(y), r = s * (big ? 1.5 : 1.15) * (1 + 0.12 * Math.sin(t * 7));
  c.strokeStyle = 'rgba(30,6,10,.7)'; c.lineWidth = Math.max(2, s * 0.42); c.beginPath(); c.arc(px, py, r, 0, TAU); c.stroke();
  c.strokeStyle = col; c.lineWidth = Math.max(1.2, s * 0.22); c.beginPath(); c.arc(px, py, r, 0, TAU);
  c.moveTo(px - r * 1.5, py); c.lineTo(px - r * 0.45, py); c.moveTo(px + r * 0.45, py); c.lineTo(px + r * 1.5, py); c.moveTo(px, py - r * 1.5); c.lineTo(px, py - r * 0.45); c.moveTo(px, py + r * 0.45); c.lineTo(px, py + r * 1.5); c.stroke();
}
// 齒輪砲台（在磚的後面畫：岩柱上的齒輪、砲管）
function drawGears(c, t) {
  if (!S.gears) return;
  const s = V.s;
  for (const o of S.gears) {
    const x = X(o.x), y = Y(o.y), r = GEAR_R * s, a = o.vis, team = o.side === 0 ? ['#7ab8ff', '#2f6fe0', '#163a8a'] : ['#ff9a7a', '#d43c2a', '#7a1810'];
    // 砲管
    c.save(); c.translate(x, y); c.rotate(-a);
    rrect(c, 0, -r * 0.32, GEAR_MZ * s + r * 0.15, r * 0.64, r * 0.18); fs(c, lg(c, 0, -r * 0.32, 0, r * 0.32, [0, '#c8ccd6', 0.5, '#7a808c', 1, '#3a3f48']), '#14161c', Math.max(1, s * 0.12));
    c.fillStyle = team[1]; c.fillRect(GEAR_MZ * s - r * 0.15, -r * 0.36, r * 0.3, r * 0.72);
    if (o.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = o.flash; const g = glowSprite(C_GOLD), q = r * 1.4; c.drawImage(g, GEAR_MZ * s - q, -q, q * 2, q * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    c.restore();
    // 齒輪：十個齒，跟著砲管轉
    c.save(); c.translate(x, y); c.rotate(-a);
    c.beginPath(); for (let k = 0; k < 20; k++) { const q = k / 20 * TAU, rr = k & 1 ? r * 0.82 : r; c.lineTo(Math.cos(q - 0.12) * rr, Math.sin(q - 0.12) * rr); c.lineTo(Math.cos(q + 0.12) * rr, Math.sin(q + 0.12) * rr); } c.closePath();
    fs(c, rg(c, -r * 0.3, -r * 0.3, r * 0.1, r, [0, '#e8d4a8', 0.6, '#b08c50', 1, '#6a4e22']), '#2a1a08', Math.max(1, s * 0.14));
    c.beginPath(); c.arc(0, 0, r * 0.5, 0, TAU); fs(c, team[0], team[2], Math.max(1, s * 0.12));
    c.fillStyle = '#2a1a08'; for (let k = 0; k < 4; k++) { const q = k / 4 * TAU; c.beginPath(); c.arc(Math.cos(q) * r * 0.68, Math.sin(q) * r * 0.68, r * 0.1, 0, TAU); c.fill(); }
    c.restore();
  }
}
// 草人（磚的前面）
function drawDummies(c, t) {
  const s = V.s;
  for (const o of S.objs) {
    if (o.t !== 'dummy') continue;
    const x = X(o.x), y = Y(o.y), h = 3.2 * s, sw = Math.sin(t * 2.2 + o.x) * 0.06;
    c.save(); c.translate(x, y); c.rotate(sw);
    c.strokeStyle = '#6a4a22'; c.lineWidth = Math.max(1.4, s * 0.22); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h); c.moveTo(-h * 0.36, -h * 0.68); c.lineTo(h * 0.36, -h * 0.68); c.stroke();
    rrect(c, -h * 0.2, -h * 0.74, h * 0.4, h * 0.36, s * 0.2); fs(c, o.side === 0 ? '#4a7ac8' : '#c85a4a', '#2a1a10', Math.max(1, s * 0.1));
    c.fillStyle = '#e8c070'; c.fillRect(-h * 0.12, -h * 0.62, h * 0.12, h * 0.1);
    c.strokeStyle = '#d8b860'; c.lineWidth = Math.max(1, s * 0.1); for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * h * 0.36, -h * 0.68); c.lineTo(d * h * 0.44, -h * 0.58); c.moveTo(d * h * 0.36, -h * 0.68); c.lineTo(d * h * 0.42, -h * 0.76); c.stroke(); }
    ell(c, 0, -h * 0.88, h * 0.14, h * 0.14); fs(c, '#e8d090', '#6a4a1a', Math.max(1, s * 0.1));
    ell(c, 0, -h * 0.98, h * 0.26, h * 0.06); fs(c, '#d8b050', '#6a4a1a', Math.max(1, s * 0.08));
    c.fillStyle = '#2a1a10'; c.fillRect(-h * 0.06, -h * 0.9, h * 0.035, h * 0.035); c.fillRect(h * 0.03, -h * 0.9, h * 0.035, h * 0.035);
    c.restore();
    // 會引來敵軍的那一個（敵軍下一次預告有人瞄它）：一圈淡紅
    if (o.side === 0) { c.strokeStyle = 'rgba(255,120,100,' + (0.3 + 0.2 * Math.sin(t * 4)) + ')'; c.lineWidth = Math.max(1, s * 0.14); c.beginPath(); c.arc(x, Y(o.y + 1.6), s * 2.2, 0, TAU); c.stroke(); }
  }
}
// 預告的彈道、落點；鎖定的兵頭上一個準星；被轉向的兵頭上一個轉圈的箭頭
function drawTele(c, t) {
  if (S.state !== 'play') return;
  if (!S.tele && !S.gears) return;
  if (RD.frame - TL_RD.f >= 3 || RD.frame < TL_RD.f) teleCalc();
  const s = V.s;
  c.lineCap = 'round';
  // 齒輪砲台的彈道：自己的藍、敵軍的紅（細一點）
  for (const g of TL_RD.gears) {
    c.strokeStyle = g.o.side === 0 ? 'rgba(150,200,255,.55)' : 'rgba(255,150,130,.6)'; c.lineWidth = Math.max(1, s * 0.16);
    telePath(c, g.mx, g.my, g.P, 0.5);
    if (g.hit) teleMark(c, g.x, g.y, g.o.side === 0 ? '#9ad0ff' : '#ff9a8a', t, false);
  }
  for (const e of TL_RD.list) {
    if (e.held) continue;
    c.strokeStyle = e.mine ? 'rgba(255,80,60,.82)' : 'rgba(255,170,150,.5)'; c.lineWidth = Math.max(1.2, s * (e.mine ? 0.24 : 0.18));
    telePath(c, e.mx, e.my, e.P, 0.9);
    if (e.hit) teleMark(c, e.x, e.y, e.mine ? '#ff5a4a' : '#ffb0a0', t, e.mine);
    // 鎖定：兵頭上一個小準星
    const u = e.u, hx = X(u.x), hy = Y(u.y + u.bh + 1.4), q = s * 0.55;
    c.strokeStyle = '#ff5a4a'; c.lineWidth = Math.max(1, s * 0.16); c.beginPath(); c.arc(hx, hy, q, 0, TAU); c.moveTo(hx - q * 1.6, hy); c.lineTo(hx + q * 1.6, hy); c.moveTo(hx, hy - q * 1.6); c.lineTo(hx, hy + q * 1.6); c.stroke();
  }
  // 被轉向的砲口（雙方都有）
  for (const u of S.units) {
    if (!u.alive || !u.turn) continue;
    const hx = X(u.x + (u.side === 0 ? -1.1 : 1.1)), hy = Y(u.y + u.bh + 2.6), r = s * 0.6, col = u.side === 0 ? '#ffb070' : '#7af0ff';
    c.strokeStyle = 'rgba(10,10,20,.7)'; c.lineWidth = Math.max(2, s * 0.32); c.beginPath(); c.arc(hx, hy, r, 0.4, TAU - 0.5); c.stroke();
    c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.18); c.beginPath(); c.arc(hx, hy, r, 0.4, TAU - 0.5); c.stroke();
    c.fillStyle = col; c.beginPath(); c.moveTo(hx + Math.cos(-0.5) * r + s * 0.3, hy + Math.sin(-0.5) * r); c.lineTo(hx + Math.cos(-0.5) * r - s * 0.25, hy + Math.sin(-0.5) * r - s * 0.35); c.lineTo(hx + Math.cos(-0.5) * r - s * 0.1, hy + Math.sin(-0.5) * r + s * 0.4); c.closePath(); c.fill();
    if (u.turn > 1) { c.font = '700 ' + Math.max(8, s * 0.9) + 'px ' + F_NUM; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = Math.max(2, s * 0.2); c.strokeStyle = 'rgba(10,10,20,.8)'; c.strokeText('×2', hx + r * 2.2, hy); c.fillStyle = col; c.fillText('×2', hx + r * 2.2, hy); }
  }
}
