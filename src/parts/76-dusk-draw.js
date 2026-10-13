/* ===== 76-dusk-draw: 第四篇第三批的東西怎麼畫 —— 燈籠、照明箭、反重力、黑夜、天空要塞的主砲充能（模擬在 54-dusk） ===== */

/* ---------- 磚上面：燈籠、照明箭、反重力、主砲充能 ---------- */
function drawDuskMid(c, t) {
  for (const o of S.objs) {
    if (o.t === 'torch' && o.hp > 0) drawTorch(c, o, t);
    else if (o.t === 'flare' && o.hp > 0) drawFlare(c, o, t);
    else if (o.t === 'grav' && o.st !== 'done') drawGrav(c, o, t);
  }
  if (S.aerie && S.aerie.charge) { const u = aerieCaptain(); if (u) { const s = V.s, x = X(u.x - 2.2), y = Y(u.y + 3.6), p = 0.5 + 0.5 * Math.sin(t * 8); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.4 * p; const g = glowSprite(C_SKY), r = s * (3 + p * 1.5); c.drawImage(g, x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#a8d8ff'; c.lineWidth = Math.max(1, s * 0.2); c.beginPath(); c.arc(x, y, s * (2.4 - p), 0, TAU); c.stroke(); } }
}
// 燈籠：一盞紙燈籠掛在牆上（隊色的穗），裡面的火一閃一閃
function drawTorch(c, o, t) {
  const s = V.s, x = X(o.x), y = Y(o.y), fl = 0.85 + 0.15 * Math.sin(t * 9 + o.ph) * Math.sin(t * 5.3 + o.ph * 2);
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * fl; const g = glowSprite(C_ORANGE), r = s * 3.2; c.drawImage(g, x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.strokeStyle = '#2a1608'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.moveTo(x, y - s * 1.1); c.lineTo(x, y - s * 0.7); c.stroke();
  ell(c, x, y, s * 0.55, s * 0.7); fs(c, rg(c, x, y, 0, s * 0.7, [0, '#fff4c0', 0.5, '#ffb050', 1, '#c84a1c']), '#3a1a08', Math.max(1, s * 0.1));
  c.fillStyle = '#3a1a08'; c.fillRect(x - s * 0.35, y - s * 0.78, s * 0.7, s * 0.14); c.fillRect(x - s * 0.35, y + s * 0.64, s * 0.7, s * 0.14);
  c.fillStyle = o.side ? '#e8402e' : '#3d86ff'; c.fillRect(x - s * 0.06, y + s * 0.78, s * 0.12, s * 0.5);
}
// 照明箭：插著的一支箭，箭頭一團刺眼的白光，冒火花
function drawFlare(c, o, t) {
  const s = V.s, x = X(o.x), y = Y(o.y), fl = 0.8 + 0.2 * Math.sin(t * 23 + o.x);
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8 * fl; const g = glowSprite(C_WHITEHOT), r = s * (2.6 + o.flash * 3); c.drawImage(g, x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.strokeStyle = '#c8b080'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (o.side ? s : -s) * 1.2, y + s * 0.5); c.stroke();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, s * 0.3, 0, TAU); c.fill();
  if (!FX.low && (RD.frame & 3) === 0) part(P_SPARK, o.x, o.y, rndS() * 4, 1 + Math.random() * 3, 0.4, 0.25, C_GOLD);
}
// 反重力：一團半透明的紫色光球，裡面一圈一圈往上飄的光環
function drawGrav(c, o, t) {
  const s = V.s, x = X(o.x), y = Y(o.y), r = o.R * s, slam = o.st === 'slam';
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = rg(c, x, y, r * 0.2, r, [0, slam ? 'rgba(255,160,200,.18)' : 'rgba(170,140,255,.16)', 0.8, slam ? 'rgba(255,120,170,.10)' : 'rgba(140,110,255,.08)', 1, 'rgba(120,90,255,0)']); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = slam ? 'rgba(255,170,210,.6)' : 'rgba(190,170,255,.55)'; c.lineWidth = Math.max(1, s * 0.12);
  for (let k = 0; k < 3; k++) { const u = (t * (slam ? -1.6 : 0.4) + k / 3) % 1, uu = u < 0 ? u + 1 : u, yy = y + r * (0.8 - uu * 1.6), w = Math.sqrt(Math.max(0, 1 - Math.pow((yy - y) / r, 2))) * r; c.beginPath(); c.ellipse(x, yy, w, w * 0.18, 0, 0, TAU); c.stroke(); }
  c.globalCompositeOperation = 'source-over';
  if (!FX.low && (RD.frame & 3) === 0) part(P_SPARK, o.x + rndS() * o.R, o.y + rndS() * o.R, 0, slam ? -6 : 2, 0.6, 0.25, C_PURPLE);
}

/* ---------- 黑夜（第二十三關）：整片蓋一層黑，有光的地方挖一個洞 ---------- */
function drawNight(c, t) {
  if (!S.lv.night) return;
  // 黑夜那一層用一半的解析度畫再放大貼上（光的邊本來就是柔的，看不出差別，省一大截）
  const s = V.s, Q = 2, W = Math.ceil(V.W / Q), H = Math.ceil(V.H / Q), k = S.lv.night.dark || 0.9;
  let cv = RD.nightCv; if (!cv || cv.width !== W || cv.height !== H) { cv = RD.nightCv = mkCanvas(W, H); }
  const n = cv.getContext('2d');
  n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, W, H); n.fillStyle = 'rgba(4,6,18,' + k + ')'; n.fillRect(0, 0, W, H); n.setTransform(1 / Q, 0, 0, 1 / Q, 0, 0);
  n.globalCompositeOperation = 'destination-out';
  const hs = holeSprite(), hole = (x, y, R, a) => { const r = R * s; n.globalAlpha = Math.min(1, a); n.drawImage(hs, X(x) - r, Y(y) - r, r * 2, r * 2); };          // 柔邊圓只畫一次（77-polish）
  // 自己的城（摸黑也認得出來）
  const me = S.st[0]; if (me) hole(me.cx, me.y0 + me.h * 0.5, Math.max(me.w, me.h) * 0.75, 0.55);
  for (const o of S.objs) {
    if (o.t === 'torch' && o.hp > 0) hole(o.x, o.y, o.R * (0.95 + 0.05 * Math.sin(t * 9 + o.ph)), 0.95);
    else if (o.t === 'flare' && o.hp > 0) hole(o.x, o.y, o.R * (S.round >= o.until ? 0.8 : 1), 1);
  }
  if (S.nburn > 0) for (const b of S.blocks) if (!b.dead && b.burn > 0 && b.body) { const p = b.body.getPosition(); hole(p.x, p.y, FIRE_R * (0.9 + 0.1 * Math.sin(t * 11 + p.x)), 0.85); }
  for (let i = 0; i < SH.n; i++) hole(SH.x[i], SH.y[i], 1.6, 0.7);          // 砲彈自己帶一點光（看得到在飛）
  for (const l of RD.lt || []) if (l[5]) hole(l[0], l[1], l[2] * 1.15, Math.min(1, l[4] * 1.8));          // 爆炸、砲口的光：那一瞬間照亮附近（第五批）
  n.globalAlpha = 1;
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(cv, 0, 0, W, H, 0, 0, W * Q, H * Q); c.setTransform(1, 0, 0, 1, FX.shx, FX.shy);
}
