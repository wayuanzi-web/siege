/* ===== 74-craft-draw: 第四篇的東西怎麼畫 —— 天秤的巨樑、古門和傳送門、鉤索的繩子、鏡盾兵的銅鏡（模擬在 54-craft） ===== */

/* ---------- 城樓後面：天秤的巨樑、古門的石框 ---------- */
function drawCraftBack(c, t) {
  if (S.saw) drawSaw(c, t);
  for (const o of S.objs) if (o.t === 'warp' && o.kind === 'gate') drawArchFrame(c, o, t);
}
// 天秤：一根很長的巨樑（一層層膠合的木料、每隔一段一道鐵箍、兩頭包鐵），中間長著一座尖峰（跟巨樑連成一體，一起歪），支點一顆大鐵軸
function drawSaw(c, t) {
  const P = S.saw, C = P.C, s = V.s, p = P.body.getPosition(), a = P.body.getAngle(), L = C.len / 2, th = C.th;
  c.save(); c.translate(X(p.x), Y(p.y)); c.rotate(-a);
  // 樑身
  const y0 = -th / 2 * s, y1 = th / 2 * s;
  c.fillStyle = lg(c, 0, -y1, 0, -y0, [0, '#d8a466', 0.22, '#b07a40', 0.7, '#7a4e24', 1, '#4a2c12']); c.fillRect(-L * s, -y1, L * 2 * s, th * s);
  c.strokeStyle = 'rgba(40,20,6,.45)'; c.lineWidth = Math.max(1, s * 0.1);
  for (const f of [0.33, 0.66]) { c.beginPath(); c.moveTo(-L * s, -y1 + th * s * f); c.lineTo(L * s, -y1 + th * s * f); c.stroke(); }
  for (let x = -L + 1.8; x < L; x += 3.1) { const yy = -y1 + th * s * (((x * 7) | 0) % 3) / 3; c.beginPath(); c.moveTo(x * s, yy); c.lineTo(x * s, yy + th * s / 3); c.stroke(); }
  // 鐵箍
  for (let x = -L + 4; x < L - 2; x += 8.6) { c.fillStyle = '#2a2e36'; c.fillRect(x * s - s * 0.45, -y1 - s * 0.15, s * 0.9, th * s + s * 0.3); c.fillStyle = '#7a828e'; c.fillRect(x * s - s * 0.45, -y1 - s * 0.15, s * 0.9, s * 0.22); c.fillStyle = '#c9a042'; for (const f of [0.28, 0.72]) { c.beginPath(); c.arc(x * s, -y1 + th * s * f, s * 0.16, 0, TAU); c.fill(); } }
  // 兩頭包鐵
  for (const sd of [-1, 1]) { c.fillStyle = '#2a2e36'; c.fillRect(sd > 0 ? (L - 1.1) * s : -L * s, -y1 - s * 0.2, 1.1 * s, th * s + s * 0.4); c.fillStyle = '#5a616c'; c.fillRect(sd > 0 ? (L - 1.1) * s : -L * s, -y1 - s * 0.2, 1.1 * s, s * 0.3); }
  c.strokeStyle = '#1c1206'; c.lineWidth = Math.max(1.5, s * 0.22); c.strokeRect(-L * s, -y1, L * 2 * s, th * s);
  // 尖峰（跟巨樑一起歪）：參差的岩石，頂上一面隨風飄的小旗
  const H = P.spireH, base = C.spire[0][0] / 2, top = C.spire[C.spire.length - 1][0] / 2;
  if (!P._sp) { const R = mkRand(19), pts = []; const n = 7; for (let k = 0; k <= n; k++) { const u = k / n; pts.push(-lerp(base, top, u) - (k && k < n ? (R() - 0.3) * 0.7 : 0), u * H); } for (let k = n; k >= 0; k--) { const u = k / n; pts.push(lerp(base, top, u) + (k && k < n ? (R() - 0.3) * 0.7 : 0), u * H); } P._sp = pts; }
  const sp = P._sp; c.beginPath(); for (let i = 0; i < sp.length; i += 2) { const x = sp[i] * s, y = -y1 - sp[i + 1] * s; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath();
  c.fillStyle = lg(c, -base * s, 0, base * s, 0, [0, '#4a4456', 0.4, '#7c7488', 0.62, '#96909e', 1, '#3a3442']); c.fill();
  c.strokeStyle = '#1e1a24'; c.lineWidth = Math.max(1.5, s * 0.22); c.stroke();
  c.strokeStyle = 'rgba(20,16,26,.55)'; c.lineWidth = Math.max(1, s * 0.1); for (let k = 1; k < 4; k++) { const yy = -y1 - H * s * k / 4; c.beginPath(); c.moveTo(-lerp(base, top, k / 4) * s * 0.7, yy); c.lineTo(lerp(base, top, k / 4) * s * 0.4, yy + s * 0.4); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(-top * s * 1.1, -y1 - H * s + s * 0.9); c.quadraticCurveTo(0, -y1 - H * s - s * 0.5, top * s * 1.1, -y1 - H * s + s * 0.9); c.quadraticCurveTo(0, -y1 - H * s + s * 0.3, -top * s * 1.1, -y1 - H * s + s * 0.9); c.fill();
  const fx = 0, fy = -y1 - H * s; c.strokeStyle = '#3a2410'; c.lineWidth = Math.max(1, s * 0.16); c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - s * 3.2); c.stroke();
  const wv = Math.sin(t * 5) * s * 0.3; c.fillStyle = '#e8b84a'; c.beginPath(); c.moveTo(fx, fy - s * 3.2); c.quadraticCurveTo(fx + s * 1.2, fy - s * 3.2 + wv, fx + s * 2.3, fy - s * 2.8); c.lineTo(fx, fy - s * 2.2); c.closePath(); c.fill();
  // 支點的大鐵軸
  c.fillStyle = '#2a2632'; c.beginPath(); c.arc(0, 0, s * 1.3, 0, TAU); c.fill(); c.fillStyle = '#9890a6'; c.beginPath(); c.arc(-s * 0.3, -s * 0.3, s * 0.7, 0, TAU); c.fill(); c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(0, 0, s * 0.35, 0, TAU); c.fill();
  c.restore();
  // 正在歪：轉軸嘎吱冒一點木屑
  if (P.rot && !FX.low && (RD.frame & 3) === 0) part(P_DEBRIS, p.x + rndS() * 2, p.y - 0.5, rndS() * 6, 2 + Math.random() * 4, 0.6, 0.3, C_TAN);
}
// 古門的石框（第二十關）：一圈刻著雲紋的石環，用一根石臂接在石壁上
function drawArchFrame(c, o, t) {
  const s = V.s, x = X(o.ix), y = Y(o.iy), r = o.r * s, wx = X(o.side === 0 ? S.lv.wall.x0 : S.lv.wall.x1);
  c.fillStyle = '#8a7656'; c.strokeStyle = '#2a1e10'; c.lineWidth = Math.max(1.5, s * 0.22);
  c.beginPath(); c.moveTo(x + (wx > x ? r * 0.5 : -r * 0.5), y - s * 0.6); c.lineTo(wx, y - s * 1.2); c.lineTo(wx, y + s * 1.4); c.lineTo(x + (wx > x ? r * 0.5 : -r * 0.5), y + s * 0.7); c.closePath(); c.fill(); c.stroke();
  ell(c, x, y, r * 0.82 + s * 0.9, r + s * 0.9); fs(c, lg(c, 0, y - r, 0, y + r, [0, '#d8c09a', 0.5, '#a88c62', 1, '#6e5634']), '#2a1e10', Math.max(1.5, s * 0.26));
  ell(c, x, y, r * 0.82, r); c.fillStyle = 'rgba(14,10,28,.92)'; c.fill();
  c.fillStyle = '#ffd36a'; for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.2; c.beginPath(); c.arc(x + Math.cos(a) * (r * 0.82 + s * 0.45), y + Math.sin(a) * (r + s * 0.45), s * 0.2, 0, TAU); c.fill(); }
}

/* ---------- 城樓前面：傳送門的光、鉤索的繩子、銅鏡 ---------- */
function drawCraftFront(c, t) {
  for (const o of S.objs) {
    if (o.t === 'warp') drawWarp(c, o, t);
    else if (o.t === 'hook' && o.hp > 0) drawHook(c, o, t);
    else if (o.t === 'bmirror') drawBronze(c, o, t);
  }
}
// 門的配色：門術師開的照隊色（我方藍紫、敵方紅），古門是金色
function warpCol(o) { return o.kind === 'gate' ? ['#ffe08a', '#d89a2a', C_GOLD, 'rgba(255,224,138,'] : o.side === 0 ? ['#c8b0ff', '#6a4aff', C_PURPLE, 'rgba(200,176,255,'] : ['#ffa0c8', '#e0306a', C_PINK, 'rgba(255,160,200,']; }
function drawWarp(c, o, t) {
  const s = V.s, col = warpCol(o), ok = o.on && o.oy > 0, self = o.kind === 'gate' && o.dest === 'self', bright = 0.6 + o.flash * 0.5;
  // 入口：直立的一圈漩渦
  { const x = X(o.ix), y = Y(o.iy), rx = o.r * s * 0.8, ry = o.r * s;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = (ok ? 0.5 : 0.2) * bright; const g = glowSprite(self ? C_RED : col[2]), gr = ry * 1.8; c.drawImage(g, x - gr, y - gr, gr * 2, gr * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (o.kind !== 'gate') { ell(c, x, y, rx, ry); c.fillStyle = 'rgba(12,8,30,.72)'; c.fill(); c.strokeStyle = col[0]; c.lineWidth = Math.max(1.5, s * 0.42); c.stroke(); }
    c.strokeStyle = self ? '#ff6a4a' : col[1]; c.lineWidth = Math.max(1, s * 0.26);
    for (let k = 0; k < 3; k++) { const a = t * 2.6 + k * TAU / 3; c.beginPath(); c.ellipse(x, y, rx * (0.7 - k * 0.15), ry * (0.7 - k * 0.15), 0, a, a + 2.2); c.stroke(); }
    // 古門：上面寫著這一回合通到哪裡
    if (o.kind === 'gate' && o.dest) {
      const txt = '通往' + ARCH_NAME[o.dest], fz = s * 2.1; c.font = F_ZH.replace('1px', fz.toFixed(1) + 'px'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = fz * 0.3; c.strokeStyle = 'rgba(20,12,4,.9)'; c.strokeText(txt, x, y - ry - s * 2.6); c.fillStyle = self ? '#ff8a6a' : '#ffe9a8'; c.fillText(txt, x, y - ry - s * 2.6);
    }
  }
  if (!ok) return;
  // 出口：橫躺的一圈，往下噴光（砲彈從這裡往下砸）
  const x = X(o.ox), y = Y(o.oy), rx = o.r * s * 1.05, ry = s * 1.1;
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.45 * bright; const g = glowSprite(self ? C_RED : col[2]), gr = rx * 1.4; c.drawImage(g, x - gr, y - gr * 0.6, gr * 2, gr * 1.2);
  c.fillStyle = lg(c, 0, y, 0, y + s * 6, [0, col[3] + '0.35)', 1, col[3] + '0)']); c.beginPath(); c.moveTo(x - rx * 0.8, y); c.lineTo(x + rx * 0.8, y); c.lineTo(x + rx * 0.5, y + s * 6); c.lineTo(x - rx * 0.5, y + s * 6); c.closePath(); c.fill();
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  ell(c, x, y, rx, ry); c.fillStyle = 'rgba(12,8,30,.6)'; c.fill(); c.strokeStyle = self ? '#ff6a4a' : col[0]; c.lineWidth = Math.max(1.5, s * 0.4); c.stroke();
  c.strokeStyle = col[1]; c.lineWidth = Math.max(1, s * 0.22); for (let k = 0; k < 2; k++) { const a = -t * 2.2 + k * Math.PI; c.beginPath(); c.ellipse(x, y, rx * 0.66, ry * 0.6, 0, a, a + 2.4); c.stroke(); }
  c.fillStyle = self ? '#ff8a6a' : col[0]; for (let k = -1; k <= 1; k++) { const yy = y + s * (1.6 + ((t * 1.8 + k * 0.3) % 1) * 1.6); poly(c, [x + k * rx * 0.45 - s * 0.45, yy, x + k * rx * 0.45 + s * 0.45, yy, x + k * rx * 0.45, yy + s * 0.9]); c.fill(); }
}
// 鉤索：從鉤索手的手拉到鉤爪（穿過門的分兩段）；收繩的時候繃直、抖
function drawHook(c, o, t) {
  const s = V.s, L = hookSegs(o, _hs4), pull = o.go && S.time >= o.go;
  for (let k = 0; k + 3 < L.length; k += 4) {
    const x0 = X(L[k]), y0 = Y(L[k + 1]), x1 = X(L[k + 2]), y1 = Y(L[k + 3]), d = Math.hypot(x1 - x0, y1 - y0), sag = pull ? Math.sin(t * 60) * s * 0.15 : Math.min(d * 0.08, s * 4);
    ropeLine(c, x0, y0, x1, y1, sag, 'rope', 0, o.flash);
  }
  // 鉤爪
  const n = L.length, ex = L[n - 2], ey = L[n - 1], px = L[n - 4], py = L[n - 3], a = Math.atan2(-(ey - py), ex - px);
  c.save(); c.translate(X(ex), Y(ey)); c.rotate(a);
  c.strokeStyle = '#1a1c22'; c.lineWidth = Math.max(1.5, s * 0.34); c.beginPath(); c.moveTo(-s * 0.6, 0); c.lineTo(s * 0.5, 0); c.moveTo(s * 0.2, 0); c.quadraticCurveTo(s * 1.0, -s * 0.8, s * 0.5, -s * 1.2); c.moveTo(s * 0.2, 0); c.quadraticCurveTo(s * 1.0, s * 0.8, s * 0.5, s * 1.2); c.stroke();
  c.restore();
  if (pull && !FX.low && (RD.frame & 1) === 0) part(P_DUST, o.x + rndS(), o.y + rndS(), rndS() * 6, rndS() * 6, 0.4, 0.9, C_SAND);
}
// 鏡盾兵的銅鏡：一面長圓的大銅鏡（亮面朝著敵方的天空），鏡背一道深色的框；挨過打的裂開
function drawBronze(c, o, t) {
  const s = V.s, x = X(o.x), y = Y(o.y), L = o.len * s, k = clamp(o.hp / o.hm, 0, 1), a = -o.ang;
  c.save(); c.translate(x, y); c.rotate(a);
  const nx = 0, ny = s * 0.35;          // 鏡背往下偏一點（亮面朝上）
  ell(c, nx, ny, L, s * 0.7); c.fillStyle = '#5a3a10'; c.fill();
  ell(c, 0, 0, L, s * 0.62); c.fillStyle = lg(c, -L, 0, L, 0, [0, '#a8762a', 0.25, '#f6dc94', 0.5, '#fffbe8', 0.75, '#e8c060', 1, '#8a5a18']); c.fill();
  c.strokeStyle = '#3a2408'; c.lineWidth = Math.max(1, s * 0.16); c.stroke();
  if (k < 0.66) { c.strokeStyle = 'rgba(40,24,6,.85)'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.moveTo(-L * 0.2, -s * 0.5); c.lineTo(L * 0.05, s * 0.1); c.lineTo(-L * 0.1, s * 0.5); if (k < 0.33) { c.moveTo(L * 0.35, -s * 0.5); c.lineTo(L * 0.5, s * 0.4); } c.stroke(); }
  const u = (Math.sin(t * 1.8 + o.x) + 1) / 2; c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(lerp(-L * 0.7, L * 0.7, u), -s * 0.15, s * 0.28, 0, TAU); c.fill();
  c.restore();
  if (o.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = o.flash; const g = glowSprite(C_GOLD), r = L * 1.1; c.drawImage(g, x - r, y - r * 0.5, r * 2, r); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  // 鏡盾兵兩手撐著的鏡柄
  const u0 = o.u; if (u0 && u0.alive) { c.strokeStyle = '#5a3a10'; c.lineWidth = Math.max(1, s * 0.22); c.beginPath(); c.moveTo(X(u0.x + (o.side ? -0.6 : 0.6)), Y(u0.y + 2.6)); c.lineTo(x, y + s * 0.4); c.stroke(); }
}
