/* ===== 73-beast-draw: 第十八關「機關巨獸」的畫面 =====
   每一塊照它的剛體（位置、角度）畫在自己的座標裡（公尺、y 朝上）：軀幹、頭（會張嘴）、脖子、背上的砲台、胸甲、核心、
   兩條腿（大腿、膝關節的齒輪、護膝甲、小腿、帶爪的腳掌）。打到的那一塊閃白；打壞的不畫（變成鐵碎片掉下去）。
   後面那條腿畫暗一點（在另一邊）。光束、預告的招式、破綻的準星也在這裡 */
const BZ = { ink: '#14161c', d: '#2e333d', m: '#4c5462', l: '#7d8798', h: '#b9c3d2', br: '#c58c3c', bd: '#7a5420', glow: '#ff8a2a' };
const BZF = { ink: '#0c0d11', d: '#1c2027', m: '#2c323c', l: '#454d5a', h: '#6a7382', br: '#7a5a2c', bd: '#4a3414', glow: '#ff8a2a' };          // 另一邊的兩條腿：暗一點
const BEAST_ICON = { flame: '🔥', grab: '✊', quake: '〰', volley: '⚔', charge: '⚡', beam: '☄' };
function bzFrame(c, body, s, ox, oy) { const p = body.getPosition(); c.translate(X(p.x + (ox || 0)), Y(p.y + (oy || 0))); c.rotate(-body.getAngle()); c.scale(s, -s); }
// 一片鐵甲：漸層、邊上一圈亮邊、鉚釘
function bzPlate(c, x0, y0, w, h, r, dark) {
  c.fillStyle = lg(c, 0, y0 + h, 0, y0, [0, dark ? BZ.m : BZ.l, 0.55, dark ? BZ.d : BZ.m, 1, BZ.ink]); rrect(c, x0, y0, w, h, r); c.fill();
  c.strokeStyle = BZ.ink; c.lineWidth = 0.16; c.stroke();
  c.strokeStyle = 'rgba(220,230,245,.25)'; c.lineWidth = 0.08; c.beginPath(); c.moveTo(x0 + r, y0 + h - 0.12); c.lineTo(x0 + w - r, y0 + h - 0.12); c.stroke();
}
function bzRivets(c, x0, x1, y, n) { c.fillStyle = BZ.br; for (let k = 0; k < n; k++) { c.beginPath(); c.arc(x0 + (x1 - x0) * (k + 0.5) / n, y, 0.13, 0, TAU); c.fill(); } }
function bzFlash(c, p, draw) { if (p.flash > 0.05) { c.globalAlpha = Math.min(0.7, p.flash); c.fillStyle = '#fff'; draw(); c.fill(); c.globalAlpha = 1; } }

function drawBeast(c, t) {
  const B = S.beast; if (!B) return;
  const s = V.s, P = B.P;
  // 地上的影子
  { const hx = P.hull && P.hull.body ? P.hull.body.getPosition().x : B.x; c.fillStyle = 'rgba(0,0,0,.28)'; ell(c, X(hx), Y(0.1), s * 13, s * 1.1); c.fill(); }
  // 另一邊的兩條腿（只是畫的：前面那條照後腿的姿勢、後面那條照前腿的姿勢，像四條腿交叉著走）→ 軀幹 → 砲台 → 脖子、頭 → 胸甲、核心 → 這一邊的兩條腿
  const hu = P.hull && P.hull.body; if (hu) { const hf = hu.getWorldPoint({ x: BEAST.hip[0][0], y: BEAST.hip[0][1] }), hr = hu.getWorldPoint({ x: BEAST.hip[1][0], y: BEAST.hip[1][1] }), fx = hf.x, fy = hf.y, rx = hr.x, ry = hr.y; drawBeastLeg(c, B, 1, t, s, fx - rx + 1.3, fy - ry + 0.3, BZF); drawBeastLeg(c, B, 0, t, s, rx - fx + 1.3, ry - fy + 0.3, BZF); }
  drawBeastHull(c, B, t, s);
  drawBeastTurret(c, B, t, s);
  drawBeastHead(c, B, t, s);
  drawBeastChest(c, B, t, s);
  drawBeastLeg(c, B, 1, t, s, 0, 0, BZ);
  drawBeastLeg(c, B, 0, t, s, 0, 0, BZ);
  // 光束
  const bm = B.beam; if (bm && S.time - bm.t < 0.12 && bm.ex !== undefined) {
    const x0 = X(bm.x), y0 = Y(bm.y), x1 = X(bm.ex), y1 = Y(bm.ey), fl = 0.75 + 0.25 * Math.sin(t * 60);
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (const [w, col] of [[s * 2.6, 'rgba(255,90,40,.25)'], [s * 1.5, 'rgba(255,160,60,.5)'], [s * 0.6, 'rgba(255,240,200,.95)']]) { c.strokeStyle = col; c.lineWidth = w * fl; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    c.restore();
  }
}
function drawBeastHull(c, B, t, s) {
  const p = B.P.hull; if (!p || !p.body) return;
  const hw = BEAST.hullHW, hh = BEAST.hullHH, dmg = 1 - B.hp / B.hm;
  c.save(); bzFrame(c, p.body, s);
  const shell = () => { c.beginPath(); c.moveTo(-hw + 0.6, -hh); c.lineTo(hw - 1.2, -hh); c.quadraticCurveTo(hw + 0.4, -hh + 0.4, hw, 0.2); c.quadraticCurveTo(hw - 1.2, hh + 1.4, 0, hh + 0.9); c.quadraticCurveTo(-hw + 0.8, hh + 1.0, -hw, 0.8); c.quadraticCurveTo(-hw - 0.4, -hh + 0.6, -hw + 0.6, -hh); c.closePath(); };
  // 背後的煙囪
  c.fillStyle = BZ.d; c.fillRect(hw - 4.4, hh - 0.2, 1.0, 3.1); c.fillRect(hw - 2.9, hh - 0.6, 0.8, 2.4);
  c.fillStyle = BZ.br; c.fillRect(hw - 4.55, hh + 2.75, 1.3, 0.35); c.fillRect(hw - 3.0, hh + 1.65, 1.0, 0.3);
  // 殼
  shell(); c.fillStyle = lg(c, 0, -hh, 0, hh + 1, [0, BZ.ink, 0.25, BZ.d, 0.7, BZ.m, 1, BZ.l]); c.fill();
  c.strokeStyle = BZ.ink; c.lineWidth = 0.22; c.stroke();
  // 背後夕陽的光：殼的上緣一道橘紅的亮邊（跟後面暗暗的工廠分開）
  c.strokeStyle = 'rgba(255,150,70,.55)'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(-hw + 0.2, 1.2); c.quadraticCurveTo(-hw + 0.8, hh + 0.9, 0, hh + 0.75); c.quadraticCurveTo(hw - 1.2, hh + 1.25, hw - 0.2, 0.6); c.stroke();
  c.save(); shell(); c.clip();
  // 一片片的甲：直的接縫、腰帶、鉚釘
  c.strokeStyle = 'rgba(10,12,16,.7)'; c.lineWidth = 0.12;
  for (const x of [-5.5, -1.6, 2.4, 6.2]) { c.beginPath(); c.moveTo(x, -hh); c.quadraticCurveTo(x + 0.4, 0.5, x - 0.3, hh + 1.2); c.stroke(); }
  c.fillStyle = BZ.bd; c.fillRect(-hw, -0.9, hw * 2, 0.55); c.fillStyle = BZ.br; c.fillRect(-hw, -0.45, hw * 2, 0.12);
  bzRivets(c, -hw + 0.5, hw - 0.5, -0.62, 16);
  // 側面的爐口：一排發光的縫
  const g = 0.55 + 0.45 * (B.glow || 0);
  for (let k = 0; k < 4; k++) { const y = -2.9 + k * 0.5; c.fillStyle = 'rgba(30,8,0,.9)'; c.fillRect(1.4, y, 4.2, 0.3); c.fillStyle = 'rgba(255,' + (120 + 60 * g | 0) + ',40,' + (0.55 + 0.4 * g).toFixed(2) + ')'; c.fillRect(1.55, y + 0.06, 3.9, 0.18); }
  // 肚子下面的艙門
  c.fillStyle = B.released ? 'rgba(20,6,0,.95)' : BZ.d; c.fillRect(-2.2, -hh, 4.4, 0.7); c.strokeStyle = BZ.br; c.lineWidth = 0.1; c.strokeRect(-2.2, -hh, 4.4, 0.7);
  // 打壞的地方：焦黑、裂縫
  if (dmg > 0.25) { const R = mkRand(911); c.strokeStyle = 'rgba(0,0,0,.75)'; c.lineWidth = 0.12; for (let k = 0; k < Math.round(dmg * 9); k++) { let x = (R() - 0.5) * hw * 1.8, y = (R() - 0.3) * hh; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (R() - 0.5) * 1.4; y += (R() - 0.5) * 1.1; c.lineTo(x, y); } c.stroke(); } c.fillStyle = 'rgba(0,0,0,' + (0.25 * dmg).toFixed(2) + ')'; c.fillRect(-hw, -hh, hw * 2, hh * 2 + 2); }
  c.restore();
  bzFlash(c, p, shell);
  c.restore();
  // 煙囪冒煙、打壞了冒火花
  if (!FX.low && ((RD.frame + 3) & 7) === 0 && !B.dead) { const q = p.body.getWorldPoint({ x: hw - 3.9, y: hh + 3.1 }); part(P_SMOKE, q.x, q.y, 1 + Math.random(), 3 + Math.random() * 2, 1.8, 1.4 + Math.random() * 0.8, C_DARK); }
  if (!FX.low && dmg > 0.5 && (RD.frame & 15) === 0) { const q = p.body.getWorldPoint({ x: (Math.random() - 0.5) * hw * 1.6, y: (Math.random() - 0.2) * hh }); part(P_SPARK, q.x, q.y, (Math.random() - 0.5) * 6, 3 + Math.random() * 4, 0.4, 0.2, C_GOLD); }
}
function drawBeastTurret(c, B, t, s) {
  const p = B.P.turret; if (!p || !p.body) return;
  const hw = BEAST.turret.hw, hh = BEAST.turret.hh;
  c.save(); bzFrame(c, p.body, s);
  // 底座、甲板
  c.fillStyle = BZ.d; poly(c, [-hw + 0.8, -hh - 0.6, hw - 0.8, -hh - 0.6, hw, -hh, -hw, -hh]); c.fill();
  bzPlate(c, -hw, -hh, hw * 2, hh * 2, 0.2);
  bzRivets(c, -hw + 0.3, hw - 0.3, 0, 12);
  // 兩頭的欄杆
  c.strokeStyle = BZ.br; c.lineWidth = 0.18;
  for (const sx of [-1, 1]) { const x = sx * (hw - 0.14); c.beginPath(); c.moveTo(x, hh); c.lineTo(x, hh + 1.8); c.stroke(); }
  c.lineWidth = 0.1; c.beginPath(); c.moveTo(-hw + 0.14, hh + 1.7); c.lineTo(-hw + 1.6, hh + 1.7); c.moveTo(hw - 0.14, hh + 1.7); c.lineTo(hw - 1.6, hh + 1.7); c.stroke();
  // 前面一門大砲、後面一面旗
  c.fillStyle = BZ.m; c.fillRect(-hw - 1.6, hh + 0.2, 2.6, 0.55); c.fillStyle = BZ.ink; c.fillRect(-hw - 1.7, hh + 0.15, 0.25, 0.65);
  c.strokeStyle = '#3a2a18'; c.lineWidth = 0.12; c.beginPath(); c.moveTo(hw - 0.6, hh); c.lineTo(hw - 0.6, hh + 4.2); c.stroke();
  const wv = Math.sin(t * 4) * 0.3; c.fillStyle = '#c0242a'; poly(c, [hw - 0.6, hh + 4.2, hw + 1.6, hh + 3.8 + wv, hw - 0.6, hh + 3.2]); c.fill();
  bzFlash(c, p, () => { c.beginPath(); c.rect(-hw, -hh, hw * 2, hh * 2); });
  c.restore();
}
function drawBeastHead(c, B, t, s) {
  const p = B.P.head, hull = B.P.hull; if (!hull || !hull.body) return;
  if (!p || !p.body) {
    // 頭被打爛了：只剩一截斷掉的脖子，冒火花、冒煙
    const a = hull.body.getWorldPoint({ x: -8.4, y: 1.4 }), b = hull.body.getWorldPoint({ x: -10.6, y: 1.0 });
    for (let k = 0; k <= 1; k++) { const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k; c.fillStyle = k ? BZ.ink : BZ.d; ell(c, X(x), Y(y), s * 1.5, s * 1.5); c.fill(); }
    if (!FX.low && (RD.frame & 7) === 0) { part(P_SPARK, b.x, b.y, -2 - Math.random() * 5, 2 + Math.random() * 4, 0.4, 0.2, C_GOLD); if ((RD.frame & 15) === 0) part(P_SMOKE, b.x, b.y + 0.5, -1, 2.5, 1.4, 1.2, C_DARK); }
    return;
  }
  // 脖子：從軀幹前上方一節一節接到頭後面
  const a = hull.body.getWorldPoint({ x: -8.4, y: 1.4 }), b = p.body.getWorldPoint({ x: 2.4, y: 0.2 });
  for (let k = 0; k <= 3; k++) { const u = k / 3, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * 0.6; c.fillStyle = k & 1 ? BZ.m : BZ.d; ell(c, X(x), Y(y), s * 1.55, s * 1.55); c.fill(); c.strokeStyle = BZ.ink; c.lineWidth = Math.max(1, s * 0.14); c.stroke(); }
  const hw = BEAST.head.hw, hh = BEAST.head.hh, jaw = B.jaw || 0;
  c.save(); bzFrame(c, p.body, s);
  // 下顎（張嘴的時候往下轉）
  c.save(); c.translate(1.6, -0.9); c.rotate(-jaw * 0.62);
  c.fillStyle = BZ.d; poly(c, [0.4, 0.2, -4.6, -0.1, -4.2, -1.1, 0.2, -0.8]); c.fill(); c.strokeStyle = BZ.ink; c.lineWidth = 0.16; c.stroke();
  c.fillStyle = '#e8e2d0'; for (let k = 0; k < 5; k++) { const x = -3.9 + k * 0.75; poly(c, [x, 0.0, x + 0.3, 0.0, x + 0.15, 0.5]); c.fill(); }
  c.restore();
  // 嘴裡的火光（張嘴的時候）
  if (jaw > 0.2) { c.fillStyle = 'rgba(255,' + (140 + 80 * Math.random() | 0) + ',40,' + (0.5 * jaw).toFixed(2) + ')'; ell(c, -2.4, -1.0, 1.6, 0.5 * jaw + 0.1); c.fill(); }
  // 上顎、頭殼：尖尖的鼻子、頭頂一根角
  const skull = () => { c.beginPath(); c.moveTo(hw - 0.2, -0.6); c.lineTo(hw, 1.5); c.quadraticCurveTo(0.6, hh + 0.6, -1.8, hh - 0.2); c.lineTo(-hw - 0.8, 0.0); c.lineTo(-hw - 0.4, -0.9); c.lineTo(1.0, -0.9); c.closePath(); };
  skull(); c.fillStyle = lg(c, 0, -1, 0, hh, [0, BZ.d, 0.6, BZ.m, 1, BZ.l]); c.fill(); c.strokeStyle = BZ.ink; c.lineWidth = 0.18; c.stroke();
  c.strokeStyle = 'rgba(255,150,70,.5)'; c.lineWidth = 0.22; c.beginPath(); c.moveTo(hw - 0.1, 1.4); c.quadraticCurveTo(0.6, hh + 0.45, -1.8, hh - 0.35); c.stroke();
  c.fillStyle = '#e8e2d0'; for (let k = 0; k < 5; k++) { const x = -3.7 + k * 0.75; poly(c, [x, -0.85, x + 0.3, -0.85, x + 0.15, -1.35]); c.fill(); }
  c.fillStyle = BZ.br; poly(c, [-0.6, hh - 0.1, 0.2, hh + 1.9, 0.8, hh - 0.1]); c.fill(); c.strokeStyle = BZ.bd; c.lineWidth = 0.1; c.stroke();
  c.strokeStyle = 'rgba(10,12,16,.6)'; c.lineWidth = 0.1; c.beginPath(); c.moveTo(-1.4, -0.9); c.quadraticCurveTo(-0.6, 0.6, 0.4, 1.9); c.stroke();
  bzRivets(c, -2.6, 1.8, 0.5, 5);
  // 眼睛：一團紅光
  const eg = 0.7 + 0.3 * Math.sin(t * 5); c.fillStyle = 'rgba(255,60,30,' + (0.35 * eg).toFixed(2) + ')'; ell(c, -1.4, 1.0, 1.2, 0.8); c.fill(); c.fillStyle = '#ffd0a0'; ell(c, -1.4, 1.0, 0.42, 0.28); c.fill();
  bzFlash(c, p, skull);
  c.restore();
}
function drawBeastChest(c, B, t, s) {
  const ch = B.P.chest, co = B.P.core;
  if (co && co.body && co.body.isActive() && !co.dead) {
    // 核心：一顆發光的球，外面兩圈轉的環（蓄力的時候更亮）
    const q = co.body.getPosition(), r = BEAST.core.r * s, g = 0.6 + 0.4 * (B.glow || 0), x = X(q.x), y = Y(q.y);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = rg(c, x, y, 0, r * 3.2, [0, 'rgba(255,220,140,' + (0.55 * g).toFixed(2) + ')', 1, 'rgba(255,90,30,0)']); c.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    c.restore();
    c.fillStyle = rg(c, x - r * 0.3, y - r * 0.3, 0, r, [0, '#fffbe0', 0.4, '#ffc860', 1, '#e0501e']); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,230,160,.8)'; c.lineWidth = Math.max(1, s * 0.12);
    for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(x, y, r * 1.35, r * 0.45, t * (k ? -1.7 : 1.3) + k, 0, TAU); c.stroke(); }
    if (co.flash > 0.05) { c.globalAlpha = co.flash; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1; }
  }
  if (ch && ch.body && !ch.dead) {
    c.save(); bzFrame(c, ch.body, s);
    const hw = BEAST.chest.hw, hh = BEAST.chest.hh, sh = () => { c.beginPath(); c.moveTo(hw, hh); c.quadraticCurveTo(-hw - 0.7, hh * 0.6, -hw - 0.5, 0); c.quadraticCurveTo(-hw - 0.7, -hh * 0.6, hw, -hh); c.closePath(); };
    sh(); c.fillStyle = lg(c, -hw, 0, hw, 0, [0, BZ.l, 0.5, BZ.m, 1, BZ.d]); c.fill(); c.strokeStyle = BZ.ink; c.lineWidth = 0.16; c.stroke();
    c.fillStyle = BZ.br; c.beginPath(); c.arc(-0.4, 0, 0.55, 0, TAU); c.fill(); c.fillStyle = BZ.bd; c.beginPath(); c.arc(-0.4, 0, 0.28, 0, TAU); c.fill();
    if (ch.hp < ch.hm * 0.5) { c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 0.1; c.beginPath(); c.moveTo(-0.6, 1.8); c.lineTo(-0.1, 0.6); c.lineTo(-0.7, -0.4); c.lineTo(-0.2, -1.6); c.stroke(); }
    bzFlash(c, ch, sh);
    c.restore();
  }
}
function drawBeastLeg(c, B, k, t, s, ox, oy, Z) {
  const sfx = k ? 'R' : 'F', P = B.P, th = P['thigh' + sfx], kn = P['knee' + sfx], cap = P['cap' + sfx], sh = P['shin' + sfx], ft = P['foot' + sfx], far = Z !== BZ;
  // 大腿：粗的鐵臂（畫得比碰撞的範圍粗一點），前面一片甲、一根油壓桿
  if (th && th.body) {
    c.save(); bzFrame(c, th.body, s, ox, oy);
    const L = BEAST.L1 / 2, limb = () => { c.beginPath(); c.moveTo(-L - 0.3, 1.55); c.quadraticCurveTo(0, 1.75, L + 0.2, 1.05); c.lineTo(L + 0.2, -1.05); c.quadraticCurveTo(0, -1.6, -L - 0.3, -1.45); c.closePath(); };
    limb(); c.fillStyle = lg(c, 0, -1.5, 0, 1.6, [0, Z.d, 0.45, Z.m, 0.8, Z.l, 1, Z.d]); c.fill(); c.strokeStyle = Z.ink; c.lineWidth = 0.18; c.stroke();
    c.fillStyle = Z.h; c.fillRect(-L + 0.4, -0.95, L * 2 - 1.2, 0.26); c.fillStyle = Z.br; c.fillRect(-L + 0.3, -1.2, 1.1, 0.75); c.fillRect(L - 1.4, -1.05, 1.0, 0.6);
    if (!far) bzRivets(c, -L + 0.6, L - 0.4, 0.9, 5);
    if (B.legs[k].broken) { c.fillStyle = Z.ink; poly(c, [L - 0.8, 1.2, L + 0.5, 0.4, L - 0.1, -0.1, L + 0.6, -0.7, L - 0.8, -1.1]); c.fill(); if (!far && !FX.low && (RD.frame & 7) === k * 3) { const q = th.body.getWorldPoint({ x: L, y: 0 }); part(P_SPARK, q.x, q.y, (Math.random() - 0.5) * 5, 2 + Math.random() * 3, 0.35, 0.18, C_GOLD); } }
    if (!far) bzFlash(c, th, limb);
    c.restore();
  }
  // 小腿：比大腿細，後面一根油壓管
  if (sh && sh.body) {
    c.save(); bzFrame(c, sh.body, s, ox, oy);
    const L = BEAST.L2 / 2, limb = () => { c.beginPath(); c.moveTo(-L, 1.2); c.lineTo(L + 0.2, 0.75); c.lineTo(L + 0.2, -0.75); c.lineTo(-L, -1.2); c.closePath(); };
    limb(); c.fillStyle = lg(c, 0, -1.2, 0, 1.2, [0, Z.d, 0.5, Z.l, 1, Z.d]); c.fill(); c.strokeStyle = Z.ink; c.lineWidth = 0.16; c.stroke();
    c.strokeStyle = Z.h; c.lineWidth = 0.22; c.beginPath(); c.moveTo(-L + 0.8, 0.55); c.lineTo(L - 0.6, 0.35); c.stroke();
    c.fillStyle = Z.br; c.fillRect(L - 1.5, -0.7, 1.0, 1.4); c.fillRect(-L + 0.2, -0.95, 0.8, 1.9);
    if (!far) bzFlash(c, sh, limb);
    c.restore();
  }
  // 腳掌：平的鐵掌，前面三根爪
  if (ft && ft.body) {
    c.save(); bzFrame(c, ft.body, s, ox, oy);
    const hw = BEAST.footHW, hh = BEAST.footHH;
    c.fillStyle = lg(c, 0, -hh, 0, hh + 0.4, [0, Z.d, 1, Z.l]); rrect(c, -hw, -hh, hw * 2, hh * 2 + 0.3, 0.3); c.fill(); c.strokeStyle = Z.ink; c.lineWidth = 0.14; c.stroke();
    c.fillStyle = far ? '#8a8676' : '#d8d2c0'; for (let j = 0; j < 3; j++) { const y = -hh + 0.1 + j * 0.34; poly(c, [-hw + 0.2, y + 0.32, -hw - 1.0, y + 0.04, -hw + 0.2, y]); c.fill(); }
    c.restore();
  }
  // 膝關節：一個大齒輪（走路的時候轉）
  if (kn && kn.body) {
    const q = kn.body.getPosition(), r = 1.3, rot = B.x * 0.4 + (k ? 0.4 : 0);
    c.save(); c.translate(X(q.x + ox), Y(q.y + oy)); c.scale(s, -s); c.rotate(rot);
    const gear = () => { c.beginPath(); for (let j = 0; j < 20; j++) { const a = j * TAU / 20, rr = j & 1 ? r : r * 0.82; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); };
    gear(); c.fillStyle = Z.br; c.fill(); c.strokeStyle = Z.bd; c.lineWidth = 0.12; c.stroke();
    c.fillStyle = Z.d; c.beginPath(); c.arc(0, 0, r * 0.45, 0, TAU); c.fill();
    if (!far && kn.hp < kn.hm * 0.5) { c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 0.12; c.beginPath(); c.moveTo(-0.9, 0.5); c.lineTo(0.1, -0.1); c.lineTo(0.7, 0.6); c.stroke(); }
    if (!far) bzFlash(c, kn, gear);
    c.restore();
  }
  // 護膝甲：一片彎的厚甲，中間一根尖刺
  if (cap && cap.body) {
    c.save(); bzFrame(c, cap.body, s, ox, oy);
    const pl = () => { c.beginPath(); c.moveTo(0.95, 1.4); c.quadraticCurveTo(-1.0, 1.05, -1.0, 0); c.quadraticCurveTo(-1.0, -1.05, 0.95, -1.4); c.closePath(); };
    pl(); c.fillStyle = lg(c, -1, 0, 1, 0, [0, Z.h, 0.5, Z.l, 1, Z.m]); c.fill(); c.strokeStyle = Z.ink; c.lineWidth = 0.14; c.stroke();
    c.fillStyle = far ? '#8a8676' : '#d8d2c0'; poly(c, [0, 0.4, -1.4, 0, 0, -0.4]); c.fill();
    if (!far && cap.hp < cap.hm * 0.5) { c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 0.1; c.beginPath(); c.moveTo(0.2, 1.0); c.lineTo(-0.3, 0.2); c.lineTo(0.3, -0.7); c.stroke(); }
    if (!far) bzFlash(c, cap, pl);
    c.restore();
  }
}
// 頭上預告的招、破綻的準星
function drawBeastUI(c, t) {
  const B = S.beast; if (!B || B.dead || S.state !== 'play') return;
  const hp = B.P.head && B.P.head.body ? B.P.head.body.getPosition() : { x: B.x - 12, y: B.y + 2 }, s = V.s;
  if (B.next && !(S.turn === 1 && (S.phase === 'resolve' || S.phase === 'hazard'))) {
    const txt = '預告：' + BEAST_MOVES[B.next], fz = Math.max(10, s * 2.1); c.font = F_ZH.replace('1px', fz + 'px');
    const x = clamp(X(hp.x), 60, V.W - 60), tw = c.measureText(txt).width + fz * 2.4, bob = Math.sin(t * 3) * s * 0.3, by = Math.max(V.hud + fz * 1.2, Y(hp.y + 6.5)) + bob;
    c.fillStyle = 'rgba(30,14,6,.88)'; rrect(c, x - tw / 2, by - fz * 0.8, tw, fz * 1.6, fz * 0.5); c.fill();
    c.strokeStyle = B.next === 'beam' || B.next === 'charge' ? '#ffd36a' : B.next === 'flame' ? '#ff8a4a' : B.next === 'grab' ? '#ff6a6a' : '#c8d2e0'; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke();
    c.fillStyle = c.strokeStyle; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((BEAST_ICON[B.next] || '') + ' ' + txt, x, by + fz * 0.05);
  }
  if (B.tired) {
    const hu = B.P.hull && B.P.hull.body ? B.P.hull.body.getPosition() : { x: B.x, y: B.y }, x = X(hu.x - 3), y = Y(hu.y), r = s * (6 + 0.8 * Math.sin(t * 6));
    c.strokeStyle = 'rgba(255,225,74,.9)'; c.lineWidth = Math.max(1.5, s * 0.35); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + t; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); c.lineTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25); c.stroke(); }
    const fz = Math.max(10, s * 2.2); c.font = F_ZH.replace('1px', fz + 'px'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = fz * 0.22; c.strokeStyle = 'rgba(16,10,26,.9)'; c.strokeText('破綻 ×2', x, y - r - fz * 0.7); c.fillStyle = '#ffe14a'; c.fillText('破綻 ×2', x, y - r - fz * 0.7);
  }
}
