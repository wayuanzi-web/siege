/* ===== 70-render: 每一幀把戰場畫出來 ===== */
const F_NUM = '"Lilita One", "NumFB", "Arial Black", system-ui, sans-serif';
const F_ZH = '900 1px "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif';
const RD = {
  cv: null, c: null, t: 0, frame: 0, glow: {}, flame: null, flameKey: 0,
  showAim: true, aimOn: false, aimT: 1.0, aimMask: 0, aimFar: 0, trail: null, sh: [0, 0], burn: [],
  avoid: []          // 畫面角落那幾顆按鈕佔的位置（畫布像素 [x0, y0, x1, y1]）：跳出來的字要避開，不然被按鈕蓋住看不到
};
const SOOT_MAX = 0.5;          // 被炸過的磚燻黑到什麼程度為止（疊太黑的話，深色的鐵甲和石磚整塊變成一團黑，看不出是什麼）
const GATE_COL = [
  { e: 'rgba(60,140,255,.36)', m: 'rgba(160,214,255,.62)', line: '#cfe6ff', glow: 'rgba(60,140,255,.30)', ink: '#0f2a78' },
  { e: 'rgba(240,60,50,.36)', m: 'rgba(255,176,156,.62)', line: '#ffcabb', glow: 'rgba(255,70,40,.28)', ink: '#6a0b10' },
  { e: 'rgba(255,196,50,.42)', m: 'rgba(255,246,196,.72)', line: '#fff3c0', glow: 'rgba(255,200,60,.36)', ink: '#7a4a08' },
  { e: 'rgba(120,50,170,.42)', m: 'rgba(206,160,244,.56)', line: '#dcb8ff', glow: 'rgba(150,60,220,.28)', ink: '#2a0a40' }
];
function renderInit(cv) { RD.cv = cv; RD.c = cv.getContext('2d', { alpha: false }); }
// 一顆柔邊的光點（加亮混色用），每種顏色只畫一次
function glowSprite(ci) {
  let g = RD.glow[ci]; if (g) return g;
  g = mkCanvas(64, 64); const c = g.getContext('2d'), hex = PCOL[ci];
  c.fillStyle = rg(c, 32, 32, 0, 32, [0, rgba(hex, 1), 0.25, rgba(hex, 0.75), 0.6, rgba(hex, 0.22), 1, rgba(hex, 0)]); c.fillRect(0, 0, 64, 64);
  RD.glow[ci] = g; return g;
}
function flameSprite() {
  const px = Math.max(8, Math.round(V.T));
  if (RD.flame && RD.flameKey === px) return RD.flame;
  const cv = mkCanvas(px, px * 1.5), c = cv.getContext('2d'), w = px, h = px * 1.5;
  c.beginPath(); c.moveTo(w * 0.5, 0); c.quadraticCurveTo(w * 0.98, h * 0.5, w * 0.82, h * 0.82); c.quadraticCurveTo(w * 0.5, h * 1.08, w * 0.18, h * 0.82); c.quadraticCurveTo(w * 0.02, h * 0.55, w * 0.34, h * 0.36); c.quadraticCurveTo(w * 0.42, h * 0.52, w * 0.5, 0);
  c.fillStyle = lg(c, 0, 0, 0, h, [0, 'rgba(255,240,170,.95)', 0.45, 'rgba(255,160,40,.9)', 1, 'rgba(230,60,20,.55)']); c.fill();
  RD.flame = cv; RD.flameKey = px; return cv;
}

/* ---------- 城樓 ---------- */
// 城基：畫進靜態的佈景裡（不會動、打不壞）
function drawFoundations(c) {
  for (const st of S.structs) if (st.rock && st.rock.length) drawRock(c, st);
  for (const st of S.structs) {
    if (st.side > 1 || st.nofound) continue;
    const P = SKINS[st.skin], x0 = X(st.fx0 - CS * 0.45), x1 = X(st.fx1 + CS * 0.45), y0 = Y(st.y0), h = V.s * 2.1, s = V.s;
    c.fillStyle = lg(c, 0, y0, 0, y0 + h, [0, P.stone[1], 1, P.stone[2]]); rrect(c, x0, y0 - s * 0.05, x1 - x0, h, s * 0.5); c.fill();
    c.fillStyle = P.stone[0]; c.fillRect(x0 + s * 0.3, y0 - s * 0.05, x1 - x0 - s * 0.6, Math.max(1, s * 0.3));
    c.strokeStyle = P.ink; c.lineWidth = Math.max(1.5, s * 0.28); rrect(c, x0, y0 - s * 0.05, x1 - x0, h, s * 0.5); c.stroke();
    c.fillStyle = rgba(P.stone[3], 0.6); for (let x = x0 + s * 2.4; x < x1 - s; x += s * 3.4) c.fillRect(x, y0 + s * 0.5, Math.max(1, s * 0.2), h - s * 1.0);
  }
}
// 岩壁（藍圖裡的 A）：一格一格的岩石，跟旁邊不是岩壁的地方畫一道深色的邊，上緣長一點苔
function drawRock(c, st) {
  const T = V.T, s = V.s, R = mkRand(st.x0 * 13 + 7), cells = st.rock, has = new Set();
  for (let i = 0; i < cells.length; i += 2) has.add(cells[i] + ',' + cells[i + 1]);
  const pal = st.skin === 'canyon' ? ['#d98c62', '#b4643e', '#83432a', '#5a2a18'] : st.skin === 'karst' ? ['#c9cbc2', '#a2a49b', '#76786f', '#52544c'] : ['#a39a8c', '#81786b', '#5c554b', '#3e3932'];
  for (let i = 0; i < cells.length; i += 2) {
    const cx = cells[i], cy = cells[i + 1], x = X(st.x0 + cx * CS), y = Y(st.y0 + (cy + 1) * CS);
    c.fillStyle = lg(c, x, y, x + T, y + T, [0, pal[1], 0.6, pal[2], 1, pal[3]]); c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    c.fillStyle = rgba(pal[0], 0.35); for (let k = 0; k < 3; k++) c.fillRect(x + R() * T * 0.8, y + R() * T * 0.8, T * (0.12 + R() * 0.2), Math.max(1, s * 0.25));
    c.strokeStyle = rgba(pal[3], 0.6); c.lineWidth = Math.max(1, s * 0.2); c.beginPath(); c.moveTo(x + R() * T, y + R() * T * 0.3); c.lineTo(x + R() * T, y + T * (0.5 + R() * 0.5)); c.stroke();
  }
  c.strokeStyle = pal[3]; c.lineWidth = Math.max(1.5, s * 0.32); c.lineCap = 'round';
  for (let i = 0; i < cells.length; i += 2) {
    const cx = cells[i], cy = cells[i + 1], x = X(st.x0 + cx * CS), y = Y(st.y0 + (cy + 1) * CS);
    c.beginPath();
    if (!has.has(cx + ',' + (cy + 1))) { c.moveTo(x, y); c.lineTo(x + T, y); }
    if (!has.has(cx + ',' + (cy - 1))) { c.moveTo(x, y + T); c.lineTo(x + T, y + T); }
    if (!has.has((cx - 1) + ',' + cy)) { c.moveTo(x, y); c.lineTo(x, y + T); }
    if (!has.has((cx + 1) + ',' + cy)) { c.moveTo(x + T, y); c.lineTo(x + T, y + T); }
    c.stroke();
    if (!has.has(cx + ',' + (cy + 1)) && st.skin !== 'canyon') { c.fillStyle = 'rgba(110,160,80,.75)'; c.fillRect(x, y - s * 0.25, T, Math.max(1.5, s * 0.45)); }
  }
}
// 屋內的暗色背景：整座城畫成一張圖，之後每一幀只貼還看得到的那幾格
function backSprite(st) {
  const T = V.T; if (st._bk && st._bkT === T) return st._bk;
  const { cols, rows, cellK } = st, cv = mkCanvas(cols * T, rows * T), c = cv.getContext('2d'), P = SKINS[st.skin] || SKINS.blue, lw = Math.max(1, T * 0.04);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const k = cellK[cy * cols + cx]; if (!k || k === 3) continue;
    const x = cx * T, y = (rows - 1 - cy) * T;
    c.fillStyle = lg(c, 0, y, 0, y + T, [0, P.panel[0], 1, P.panel[1]]); c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    // 內牆的磚縫
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x, y + T * 0.5, T, lw);
    c.fillRect(x + ((cx + cy) & 1 ? T * 0.5 : T * 0.02), y, lw, T * 0.5); c.fillRect(x + ((cx + cy) & 1 ? T * 0.02 : T * 0.5), y + T * 0.5, lw, T * 0.5);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x, y, T, lw);
  }
  // 站著兵的房間：牆上一盞燈
  for (const sl of st.slots) {
    const x = (sl.cx + 0.5) * T, y = (rows - 1 - sl.cy + 0.34) * T;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, x, y, 0, T * 1.5, [0, 'rgba(255,214,140,.30)', 0.5, 'rgba(255,190,110,.10)', 1, 'rgba(255,180,90,0)']); c.fillRect(x - T * 1.5, y - T * 1.5, T * 3, T * 3);
    c.globalCompositeOperation = 'source-over';
  }
  st._bk = cv; st._bkT = T; return cv;
}
function drawBackdrop(c, st, rdt) {
  const { cols, rows, back, backTo, n } = st; if (!n || st.side > 1) return;
  let any = false; const k = Math.min(1, rdt * 7);
  for (let i = 0; i < n; i++) { let v = back[i]; const to = backTo[i]; if (v !== to) { v += (to - v) * k; if (Math.abs(v - to) < 0.03) v = to; back[i] = v; } if (v > 0) any = true; }
  if (!any) return;
  const sp = backSprite(st), T = V.T, bx = X(st.x0), by = Y(st.y1);
  for (let cy = 0; cy < rows; cy++) {
    const sy = (rows - 1 - cy) * T; let cx = 0;
    while (cx < cols) {
      const v = back[cy * cols + cx]; if (v <= 0) { cx++; continue; }
      let e = cx + 1; while (e < cols && Math.abs(back[cy * cols + e] - v) < 0.01) e++;
      c.globalAlpha = v; c.drawImage(sp, cx * T, sy, (e - cx) * T, T, bx + cx * T, by + sy, (e - cx) * T, T);
      cx = e;
    }
  }
  c.globalAlpha = 1;
}
const _noBlock = { h: 0 };
// 旗子插在最高的那片屋瓦上，屋瓦歪了、掉了，旗子跟著走
function flagBlock(st) {
  if (st._flagB !== undefined) return st._flagB;
  let best = null;
  for (const b of st.blocks) if (b.kind === 'roof' && (!best || b.y0 > best.y0 + 0.1 || (Math.abs(b.y0 - best.y0) <= 0.1 && Math.abs(b.x0 - st.cx) < Math.abs(best.x0 - st.cx)))) best = b;
  st._flagB = best; return best;
}
function drawFlag(c, st, b, t) {
  // 在這塊屋瓦自己的座標裡畫（原點是屋瓦中心，y 往下）
  const s = V.s, P = SKINS[st.skin] || SKINS.blue, py = -b.h * s / 2, ph = s * 5.6, wind = S.wind;
  const dir = wind > 1 ? 1 : wind < -1 ? -1 : (st.side === 0 ? 1 : -1), amp = 0.18 + Math.min(0.5, Math.abs(wind) * 0.03), sp = 5 + Math.abs(wind) * 0.3;
  c.strokeStyle = '#3a2a1c'; c.lineWidth = Math.max(1.5, s * 0.36); c.lineCap = 'round'; c.beginPath(); c.moveTo(0, py); c.lineTo(0, py - ph); c.stroke();
  c.fillStyle = P.trim; c.beginPath(); c.arc(0, py - ph, s * 0.45, 0, TAU); c.fill();
  const fw = s * 4.4, fh = s * 2.5, y0 = py - ph + s * 0.3; c.beginPath(); c.moveTo(0, y0);
  for (let k = 1; k <= 6; k++) { const u = k / 6; c.lineTo(dir * fw * u, y0 + Math.sin(t * sp - u * 5) * fh * amp * u); }
  for (let k = 6; k >= 0; k--) { const u = k / 6; c.lineTo(dir * fw * u * (k === 6 ? 0.82 : 1), y0 + fh * (1 - u * 0.25) + Math.sin(t * sp - u * 5) * fh * amp * u); }
  c.closePath(); c.fillStyle = lg(c, 0, 0, dir * fw, 0, [0, P.flag, 1, P.flagDk]); c.fill(); c.strokeStyle = P.ink; c.lineWidth = Math.max(1, s * 0.2); c.stroke();
}
// 一塊磚的冰藍剪影（變脆的磚罩在上面用），跟著那張貼圖一起留著
function frostSprite(sp) {
  if (sp.frost) return sp.frost;
  const cv = mkCanvas(sp.cv.width, sp.cv.height), c = cv.getContext('2d');
  c.drawImage(sp.cv, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#9fdcff'; c.fillRect(0, 0, cv.width, cv.height);
  sp.frost = cv; return cv;
}
// 每一塊磚：照它現在的位置和角度貼上去
function drawBlocks(c, t, rdt) {
  const s = V.s, sx = FX.shx, sy = FX.shy, burn = RD.burn; burn.length = 0;
  const f0 = flagBlock(S.st[0]), f1 = flagBlock(S.st[1]);
  // 插旗的那片屋瓦碎了：旗子飛出去（不是憑空不見）
  for (let k = 0; k < 2; k++) { const fb = k ? f1 : f0, st = S.st[k]; if (fb && fb.dead && !st._flagOut) { st._flagOut = 1; FX.flung.push({ flag: st, x: fb.x, y: fb.y + fb.h / 2, vx: rndS() * 9, vy: 15 + Math.random() * 9, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3), t: 0 }); } }
  for (const b of S.blocks) {
    if (b.dead) continue;
    const p = b.body.getPosition(), a = b.body.getAngle(), seg = b.seg, f = seg ? 1 : b.hp / b.hm;
    if (b.hot > 0) { b.hot -= rdt * 0.22; if (b.hot < 0) b.hot = 0; }
    const ds = b.mat === M_KEG || b.mat === M_ROCK ? 0 : f > 0.66 ? 0 : f > 0.33 ? 1 : 2, sp = b.frag ? fragSprite(b) : blockSprite(b, ds);
    if (a === 0) c.setTransform(1, 0, 0, 1, X(p.x) + sx, Y(p.y) + sy);
    else { const cs = Math.cos(a), sn = Math.sin(a); c.setTransform(cs, -sn, sn, cs, X(p.x) + sx, Y(p.y) + sy); }
    if (b === f0 || b === f1) drawFlag(c, b.st, b, t);
    c.drawImage(sp.cv, -sp.ax, -sp.ay);
    if (seg) {
      /* 長樑、樓板一段一段畫：哪一段受傷，裂痕、燻黑、挨打的那一下閃光就只畫在那一段
         （裂痕另外有一張只有裂紋的透明貼圖；燻黑和閃光是把原圖那一段再疊一次） */
      const n = b.cw, wpx = b.w * s, pad = sp.ax - wpx / 2, cell = wpx / n, H = sp.cv.height, soot = b.sootS, fl = b.flash > 0 ? b.flashM : 0;
      let cr = null;
      for (let k = 0; k < n; k++) {
        const r = seg[k] / b.segM, so = soot && !FX.low ? soot[k] : 0, f1 = (fl >> k) & 1;
        if (r > 0.66 && so <= 0.05 && !f1) continue;
        const x0 = k === 0 ? 0 : Math.round(pad + k * cell), x1 = k === n - 1 ? sp.cv.width : Math.round(pad + (k + 1) * cell), w0 = x1 - x0;
        if (so > 0.05) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = Math.min(SOOT_MAX, so * SOOT_MAX); c.drawImage(sp.cv, x0, 0, w0, H, x0 - sp.ax, -sp.ay, w0, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
        if (r <= 0.66) { if (!cr) cr = blockSprite(b, 3); c.drawImage(cr.cv, x0, 0, w0, H, x0 - sp.ax, -sp.ay, w0, H); if (r <= 0.33) c.drawImage(cr.cv, sp.cv.width - x1, 0, w0, H, x0 - sp.ax, -sp.ay, w0, H); }
        if (f1) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, b.flash) * 0.55; c.drawImage(sp.cv, x0, 0, w0, H, x0 - sp.ax, -sp.ay, w0, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
      }
      if (b.flash > 0) { b.flash = Math.max(0, b.flash - rdt * 5); if (b.flash <= 0) b.flashM = 0; }
    } else {
      if (b.soot > 0.05 && !FX.low) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = Math.min(SOOT_MAX, b.soot * SOOT_MAX); c.drawImage(sp.cv, -sp.ax, -sp.ay); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
      if (b.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, b.flash) * 0.55; c.drawImage(sp.cv, -sp.ax, -sp.ay); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; b.flash = Math.max(0, b.flash - rdt * 5); }
    }
    // 被冰術士打到、變脆的磚：罩一層淡淡的冰藍（不是整塊變白）
    if (b.brit > 0 && !b.frag) { const fr = frostSprite(sp); c.globalAlpha = 0.34; c.drawImage(fr, -sp.ax, -sp.ay); c.globalAlpha = 1; }
    // 共鳴晶柱：一閃一閃的紫光；吊燈：一團暖光
    if ((b.reso && !b.resoDone) || b.kind === 'lamp') { c.globalCompositeOperation = 'lighter'; c.globalAlpha = b.reso ? 0.35 + 0.25 * Math.sin(t * 3.4) : 0.45; const g = glowSprite(b.reso || b.mat === M_IRON ? C_PURPLE : C_GOLD), r = V.T * (b.reso ? 1.1 : 1.3); c.drawImage(g, -r, -r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    if (b.burn > 0) burn.push(b);
  }
  c.setTransform(1, 0, 0, 1, sx, sy);
  if (!burn.length) return;
  // 著火的磚：火苗永遠往上
  const fl = flameSprite(); c.globalCompositeOperation = 'lighter';
  for (const b of burn) {
    const p = b.body.getPosition(), a = b.body.getAngle(), ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a)), hw = (b.w * ca + b.h * sa) / 2, hh = (b.w * sa + b.h * ca) / 2;
    const n = Math.max(1, Math.round(hw * 2 / CS)), al = Math.min(1, b.burn);
    for (let k = 0; k < n; k++) {
      const ph = t * 9 + b.id * 1.7 + k * 2.1, sc = 0.8 + 0.3 * Math.sin(ph), fw = V.T * sc * 0.85, fh = fw * 1.5;
      const x = X(p.x + (n > 1 ? (k / (n - 1) - 0.5) * hw * 1.5 : 0) + Math.sin(ph * 0.7) * 0.3), y = Y(p.y + hh * 0.6);
      c.globalAlpha = al * 0.8; c.drawImage(fl, x - fw / 2, y - fh * 0.95, fw, fh);
    }
    if (!FX.low && ((RD.frame + b.id) & 15) === 0) part(P_SMOKE, p.x + rndS() * hw, p.y + hh, rndS() * 2, 6, 0.9, 1.3, C_DARK);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
/* ---------- 繩索、鐵鍊 ---------- */
function ropeLine(c, x0, y0, x1, y1, sag, kind, hurt, flash) {
  const s = V.s, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag * 2;
  if (kind === 'chain') {
    const L = Math.hypot(x1 - x0, y1 - y0) + Math.abs(sag), n = Math.max(2, Math.round(L / (s * 0.9)));
    for (let k = 0; k <= n; k++) {
      const u = k / n, a = 1 - u, px = a * a * x0 + 2 * a * u * mx + u * u * x1, py = a * a * y0 + 2 * a * u * my + u * u * y1;
      const tx = 2 * a * (mx - x0) + 2 * u * (x1 - mx), ty = 2 * a * (my - y0) + 2 * u * (y1 - my), ang = Math.atan2(ty, tx);
      ell(c, px, py, s * 0.5, k & 1 ? s * 0.16 : s * 0.3, ang); c.strokeStyle = hurt > 0.5 ? '#8a4a3a' : '#3a3f48'; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke();
      c.strokeStyle = flash > 0 ? '#ffffff' : '#9aa3b0'; c.lineWidth = Math.max(1, s * 0.12); c.stroke();
    }
    return;
  }
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1);
  c.strokeStyle = '#3a2a16'; c.lineWidth = Math.max(2, s * 0.46); c.stroke();
  c.strokeStyle = flash > 0 ? '#fff6d0' : hurt > 0.5 ? '#d8b98a' : '#c9a05e'; c.lineWidth = Math.max(1.2, s * 0.26); c.stroke();
  c.setLineDash([s * 0.35, s * 0.45]); c.strokeStyle = 'rgba(90,60,25,.6)'; c.lineWidth = Math.max(1, s * 0.12); c.stroke(); c.setLineDash([]);
  if (hurt > 0.5) { c.strokeStyle = '#e8d2a6'; c.lineWidth = Math.max(1, s * 0.1); for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(mx, (y0 + y1) / 2 + sag); c.lineTo(mx + k * s * 0.6, (y0 + y1) / 2 + sag + s * 0.5); c.stroke(); } }
}
function drawRopes(c, t) {
  if (!S.ropes.length) return;
  const s = V.s;
  for (const r of S.ropes) {
    if (r.cut) {
      // 斷掉的繩子：兩頭各剩一截，先甩一下再垂下來；吊點還在的話，留一小截掛著
      const dt = S.time - r.cutT, L = Math.min(r.len * 0.5, 9);
      for (let k = 0; k < 2; k++) {
        const o = k ? r.b : r.a; if (o && o.dead) continue;
        let ax, ay; if (!o) { ax = k ? r.lb.x : r.la.x; ay = k ? r.lb.y : r.la.y; } else if (o.body) { const p = o.body.getWorldPoint(k ? r.lb : r.la); ax = p.x; ay = p.y; } else continue;
        const ox = k ? r.cx[0] - r.cx[2] : r.cx[2] - r.cx[0], oy = k ? r.cx[1] - r.cx[3] : r.cx[3] - r.cx[1], a0 = Math.atan2(ox, -oy);
        const len = dt < 1.6 ? L : Math.min(L, 1.8), th = a0 * Math.exp(-dt * 2.4) * Math.cos(dt * 7);
        const ex = ax + Math.sin(th) * len, ey = ay - Math.cos(th) * len;
        if (o && o.hang && !o.dead) continue;          // 吊著的東西已經掉了：它身上那一截不畫
        ropeLine(c, X(ax), Y(ay), X(ex), Y(ey), 0, r.kind, 0, 0);
      }
      continue;
    }
    const e = r.e, d = Math.hypot(e[2] - e[0], e[3] - e[1]), slack = r.len - d;
    const sag = slack > 0.05 ? Math.min(r.len * 0.5, Math.sqrt(Math.max(0, r.len * r.len - d * d)) * 0.5) * s * 0.5 : 0;
    ropeLine(c, X(e[0]), Y(e[1]), X(e[2]), Y(e[3]), sag, r.kind, 1 - r.hp / r.hm, r.flash);
    if (r.burn > 0) {
      const fl = flameSprite(); c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const u = (k + 0.5) / 3, ph = t * 9 + k * 2.1, fw = V.T * (0.55 + 0.15 * Math.sin(ph)), x = X(lerp(e[0], e[2], u)), y = Y(lerp(e[1], e[3], u)); c.globalAlpha = 0.8; c.drawImage(fl, x - fw / 2, y - fw * 1.4, fw, fw * 1.5); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  }
}
/* ---------- 河水：畫在東西前面（半透明），泡在水裡的看起來在水面下 ---------- */
function drawWater(c, t) {
  const W = S.water; if (!W) return;
  const s = V.s, x0 = X(Math.max(W.x0, V.x0 - 2)), x1 = X(Math.min(W.x1, V.x1 + 2)), y = Y(W.y), yb = V.H + 2;
  c.fillStyle = lg(c, 0, y, 0, yb, [0, 'rgba(70,160,170,.42)', 0.35, 'rgba(30,100,120,.62)', 1, 'rgba(10,40,60,.85)']);
  c.beginPath(); c.moveTo(x0, yb);
  for (let x = x0; x <= x1 + 1; x += 6) c.lineTo(x, y + Math.sin(x * 0.045 + t * 2.2) * s * 0.18 + Math.sin(x * 0.11 - t * 1.4) * s * 0.1);
  c.lineTo(x1, yb); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(220,250,255,.75)'; c.lineWidth = Math.max(1, s * 0.22); c.beginPath();
  for (let x = x0; x <= x1 + 1; x += 6) { const yy = y + Math.sin(x * 0.045 + t * 2.2) * s * 0.18 + Math.sin(x * 0.11 - t * 1.4) * s * 0.1; if (x === x0) c.moveTo(x, yy); else c.lineTo(x, yy); }
  c.stroke();
  // 水流的白紋
  c.strokeStyle = 'rgba(220,250,255,.28)'; c.lineWidth = Math.max(1, s * 0.16);
  for (let k = 0; k < 9; k++) { const u = ((k * 0.137 + t * W.cur * 0.012) % 1), xx = lerp(x0, x1, u), yy = y + s * (1 + (k % 3) * 1.4); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + s * (2 + (k % 2)), yy); c.stroke(); }
  // 浮在水面上的東西旁邊一圈白沫
  c.fillStyle = 'rgba(240,255,255,.55)';
  for (const b of S.blocks) if (!b.dead && b.wet > 0.05 && b.wet < 0.95) { const p = b.body.getPosition(); ell(c, X(p.x), y, Math.max(2, b.w * s * 0.45), Math.max(1, s * 0.3)); c.fill(); }
}
function drawUnits(c, t) {
  const s = V.s, sx = FX.shx, sy = FX.shy, us = S.units;
  /* 兩個兵擠在同一個地方分不開（被瓦礫夾住、一格寬的小隔間）：畫的時候往兩邊錯開一點，看得出是兩個人擠在一起，
     不會一個整個被另一個蓋住（只是畫的位置，不影響戰局） */
  for (const u of us) u._tx = 0;
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (!a.alive) continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (!b.alive) continue;
      const dx = b.x - a.x, want = (a.bw + b.bw) * 0.32; if (Math.abs(dx) >= want || Math.abs(b.y - a.y) > 2) continue;
      const d = dx > 0.02 ? 1 : dx < -0.02 ? -1 : (a.slot + a.side * 9 < b.slot + b.side * 9 ? 1 : -1), k = (want - Math.abs(dx)) * 0.5;
      if (a.def.big) b._tx += d * k * 2; else if (b.def.big) a._tx -= d * k * 2; else { a._tx -= d * k; b._tx += d * k; }
    }
  }
  for (const u of us) { if (!u.alive) { u.rox = 0; continue; } u.rox += (clamp(u._tx, -1.6, 1.6) - u.rox) * 0.15; }
  for (const u of S.units) {
    if (!u.alive) continue;
    const T = S.team[u.side], sp = unitSprite(u.side, u.type), dir = T.dir, big = u.def.big ? 1.9 : 1, held = u.frozen > 0 || u.stun > 0;
    const x = X(u.x + u.rox) - dir * u.recoil * s * 0.7, y = Y(u.y) + (u.air || held ? 0 : Math.sin(t * 3.2 + u.slot * 1.9) * s * 0.07);
    if (T.ult.armed || T.rage > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 14 + u.slot); const g = glowSprite(T.ult.armed ? C_GOLD : C_ORANGE), r = sp.px * 0.75; c.drawImage(g, x - r, y - sp.px * 0.5 - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    const tilt = u.tilt;
    if (Math.abs(tilt) > 0.02) { const cs = Math.cos(tilt), sn = Math.sin(tilt), oy = u.bh * s * 0.5; c.setTransform(cs, sn, -sn, cs, x + sx, y - oy + sy); c.drawImage(sp.cv, -sp.ax, -sp.ay + oy); if (u.hurtT > 0) { c.globalAlpha = Math.min(0.85, u.hurtT * 5); c.drawImage(sp.wh, -sp.ax, -sp.ay + oy); c.globalAlpha = 1; } c.setTransform(1, 0, 0, 1, sx, sy); }
    else { c.drawImage(sp.cv, x - sp.ax, y - sp.ay); if (u.hurtT > 0) { c.globalAlpha = Math.min(0.85, u.hurtT * 5); c.drawImage(sp.wh, x - sp.ax, y - sp.ay); c.globalAlpha = 1; } }
    const hw = s * 1.5 * big, top = y - s * 3.5 * big;
    if (u.frozen > 0) {
      c.fillStyle = 'rgba(170,228,255,.5)'; c.strokeStyle = 'rgba(235,250,255,.9)'; c.lineWidth = Math.max(1, s * 0.22);
      poly(c, [x - hw * 1.05, y, x - hw * 1.2, top + s, x - hw * 0.4, top - s * 0.4, x + hw * 0.7, top - s * 0.1, x + hw * 1.2, top + s * 1.4, x + hw * 1.05, y]); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(x - hw * 0.6, top + s * 1.2); c.lineTo(x - hw * 0.1, top + s * 0.2); c.stroke();
    }
    if (u.stun > 0) { c.fillStyle = '#ffe14a'; for (let k = 0; k < 3; k++) { const a = t * 7 + k * 2.1; c.beginPath(); c.arc(x + Math.cos(a) * hw * 0.8, top - s * 0.3 + Math.sin(a) * s * 0.35, Math.max(1.2, s * 0.26), 0, TAU); c.fill(); } }
    if (u.hp < u.hpMax * 0.995) {
      const f = clamp(u.hp / u.hpMax, 0.06, 1), bw = s * 3.1 * big, bh = Math.max(2.5, s * 0.52), bx = x - bw / 2, by = top - s * 0.95;
      c.fillStyle = 'rgba(10,8,20,.75)'; c.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      c.fillStyle = f > 0.5 ? '#6fe05a' : f > 0.25 ? '#ffc93c' : '#ff5a3c'; c.fillRect(bx, by, bw * f, bh);
    }
  }
}

/* ---------- 倍增符 ---------- */
function drawGates(c, t) {
  const s = V.s;
  for (const g of S.gates) {
    const col = GATE_COL[g.owner], x = X(g.x), y = Y(g.y), hh = g.h * s, w = s * 1.3, age = S.time - g.born;
    const aimed = (RD.aimMask & g.bit) !== 0, ap = Math.min(1, age / 0.22), pulse = 1 + g.flash * 0.14 + (aimed ? 0.05 + 0.04 * Math.sin(t * 10) : 0);
    c.save(); c.translate(x, y); c.rotate(Math.PI / 2 - g.ang); c.scale(ap * pulse, pulse);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, 0, 0, 0, hh * 1.25, [0, col.glow, 1, 'rgba(0,0,0,0)']); c.fillRect(-hh * 1.25, -hh * 1.25, hh * 2.5, hh * 2.5);
    if (aimed) c.fillRect(-hh * 1.25, -hh * 1.25, hh * 2.5, hh * 2.5);
    c.globalCompositeOperation = 'source-over';
    // 符身：兩側隨風抖動
    const n = 8; c.beginPath();
    for (let k = 0; k <= n; k++) { const yy = -hh + 2 * hh * k / n, xx = -w + Math.sin(t * 4.2 + k * 0.9 + g.b) * w * 0.16; if (k === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
    for (let k = n; k >= 0; k--) { const yy = -hh + 2 * hh * k / n, xx = w + Math.sin(t * 4.2 + k * 0.9 + g.b + 1.4) * w * 0.16; c.lineTo(xx, yy); }
    c.closePath(); c.fillStyle = lg(c, -w, 0, w, 0, [0, col.e, 0.5, col.m, 1, col.e]); c.fill();
    if (g.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + (g.flash * 0.6) + ')'; c.fill(); }
    c.strokeStyle = aimed ? '#ffffff' : col.line; c.lineWidth = Math.max(1, s * (aimed ? 0.32 : 0.2)); c.stroke();
    // 上下兩根卷軸桿
    for (let k = -1; k <= 1; k += 2) {
      const ry = k * hh;
      rrect(c, -w * 1.5, ry - s * 0.42, w * 3, s * 0.84, s * 0.4); c.fillStyle = lg(c, 0, ry - s * 0.42, 0, ry + s * 0.42, [0, '#fff0b0', 0.5, '#ffc93c', 1, '#b9790f']); c.fill(); c.strokeStyle = '#5a3a08'; c.lineWidth = Math.max(1, s * 0.16); c.stroke();
    }
    // 倍數
    c.rotate(-(Math.PI / 2 - g.ang));
    const txt = g.owner === 3 ? '÷2' : '×' + g.mult, fz = s * (g.mult >= 5 ? 4.9 : 4.3);
    c.font = '400 ' + fz + 'px ' + F_NUM; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = fz * 0.24; c.strokeStyle = col.ink; c.strokeText(txt, 0, 0); c.fillStyle = '#ffffff'; c.fillText(txt, 0, 0);
    // 耐久（被打過才顯示）；限時的符：還剩幾回合
    const bw = w * 3, by = hh + s * 1.0;
    if (g.hp < g.hpMax && g.owner < 2) { c.fillStyle = 'rgba(10,8,20,.7)'; c.fillRect(-bw / 2, by, bw, s * 0.5); c.fillStyle = g.owner === 0 ? '#7fc0ff' : '#ff8a6a'; c.fillRect(-bw / 2, by, bw * clamp(g.hp / g.hpMax, 0, 1), s * 0.5); }
    else if (g.life > 0) { const left = g.life - (S.round - g.bornR); for (let k = 0; k < g.life; k++) { c.fillStyle = k < left ? '#ffffff' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc((k - (g.life - 1) / 2) * s * 1.1, by + s * 0.3, s * 0.34, 0, TAU); c.fill(); } }
    c.restore();
  }
}

/* ---------- 機關 ---------- */
function drawObjs(c, t) {
  const s = V.s;
  for (const o of S.objs) {
    switch (o.t) {
      case 'geyser': {
        const x = X(o.x), yb = Y(o.base);
        // 下一回合輪到它噴：地面先冒火星
        if (o.next && !o.on) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6 + o.x); const g = glowSprite(C_ORANGE), r = s * 4.2; c.drawImage(g, x - r, yb - r * 0.7, r * 2, r * 1.4); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; if ((RD.frame & 7) === 0) part(P_EMBER, o.x + rndS() * 3, o.base, rndS() * 5, 8 + Math.random() * 8, 0.5, 0.5, C_ORANGE); }
        if (o.top > o.base + 0.5) {
          const yt = Y(o.top), w = o.w * s;
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = lg(c, x - w * 1.6, 0, x + w * 1.6, 0, [0, 'rgba(255,90,20,0)', 0.25, 'rgba(255,110,30,.5)', 0.5, 'rgba(255,230,140,.9)', 0.75, 'rgba(255,110,30,.5)', 1, 'rgba(255,90,20,0)']);
          c.beginPath(); c.moveTo(x - w * 1.6, yb + s * 2);
          for (let k = 0; k <= 10; k++) { const u = k / 10; c.lineTo(x - w * (1.5 - 0.5 * u) + Math.sin(t * 13 + k * 1.3) * w * 0.18, lerp(yb, yt, u)); }
          for (let k = 10; k >= 0; k--) { const u = k / 10; c.lineTo(x + w * (1.5 - 0.5 * u) + Math.sin(t * 13 + k * 1.3 + 2) * w * 0.18, lerp(yb, yt, u)); }
          c.closePath(); c.fill();
          const g = glowSprite(C_WHITEHOT), r = w * 2.4; c.drawImage(g, x - r, yt - r, r * 2, r * 2);
          c.globalCompositeOperation = 'source-over';
          if ((RD.frame & 1) === 0) part(P_EMBER, o.x + rndS() * o.w * 2, o.base + Math.random() * (o.top - o.base), rndS() * 10, 8 + Math.random() * 14, 0.6, 0.7, Math.random() < 0.5 ? C_ORANGE : C_GOLD);
        }
        break;
      }
      case 'portal': {
        const col = o.owner === 0 ? ['#7fc0ff', '#2f6fe0', C_SKY] : ['#ff9a80', '#d83a2e', C_SALMON];
        for (let e = 0; e < 2; e++) {
          const x = X(e ? o.ex : o.x), y = Y(e ? o.ey : o.y), rx = e ? o.ew * 0.5 * s : o.r * s * 0.62, ry = e ? s * 1.5 : o.r * s;
          c.globalCompositeOperation = 'lighter'; const g = glowSprite(col[2]), gr = Math.max(rx, ry) * 1.7; c.globalAlpha = 0.55 + o.flash * 0.4; c.drawImage(g, x - gr, y - gr, gr * 2, gr * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
          ell(c, x, y, rx, ry); c.fillStyle = e ? 'rgba(10,6,30,.5)' : 'rgba(10,6,30,.78)'; c.fill(); c.strokeStyle = col[0]; c.lineWidth = Math.max(1.5, s * 0.5); c.stroke();
          c.strokeStyle = col[1]; c.lineWidth = Math.max(1, s * 0.28);
          for (let k = 0; k < 3; k++) { const a = t * (e ? -2.4 : 3) + k * TAU / 3; c.beginPath(); c.ellipse(x, y, rx * 0.66, ry * 0.66, 0, a, a + 1.5); c.stroke(); }
          if (e) { c.fillStyle = col[0]; for (let k = -1; k <= 1; k++) { poly(c, [x + k * rx * 0.5 - s * 0.6, y + s * 2.2, x + k * rx * 0.5 + s * 0.6, y + s * 2.2, x + k * rx * 0.5, y + s * 3.4 + Math.sin(t * 6 + k) * s * 0.4]); c.fill(); } }
        }
        break;
      }
      case 'mirror': {
        const x0 = X(o.x - o.dx), y0 = Y(o.y - o.dy), x1 = X(o.x + o.dx), y1 = Y(o.y + o.dy);
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(120,200,255,.35)'; c.lineWidth = s * 1.9; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        c.strokeStyle = '#5fb6e4'; c.lineWidth = s * 0.95; c.stroke();
        c.strokeStyle = o.flash > 0 ? '#ffffff' : '#e6f8ff'; c.lineWidth = s * 0.42; c.stroke();
        const u = (Math.sin(t * 1.7 + o.ph) + 1) / 2; c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(lerp(x0, x1, u), lerp(y0, y1, u), s * 0.5, 0, TAU); c.fill();
        break;
      }
      case 'barrier': {
        if (S.state !== 'play') break;                       // 分出勝負了：結界跟著消失
        const x = X(o.x), y = Y(o.y), R = o.R * s;
        c.lineCap = 'butt';
        for (const sg of o.segs) {
          // 畫面的角度跟戰場的角度上下相反；兩段光牆之間留一點縫
          const a0 = -sg.a1 + 0.02, a1 = -sg.a0 - 0.02, lv = sg.lvl;
          if (lv < 0.05) { c.strokeStyle = 'rgba(255,120,190,.2)'; c.lineWidth = Math.max(1, s * 0.4); c.setLineDash([s, s * 1.6]); c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke(); c.setLineDash([]); continue; }
          c.globalAlpha = lv;
          c.strokeStyle = 'rgba(255,60,150,' + (0.24 + sg.flash * 0.4 + 0.06 * Math.sin(t * 5 + sg.a0 * 3)) + ')'; c.lineWidth = s * 3; c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke();
          c.strokeStyle = sg.flash > 0 ? '#ffffff' : '#ff8ac6'; c.lineWidth = s * 0.8; c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke();
          const f = sg.hp / sg.hm; if (f < 0.99) { c.strokeStyle = '#ffe14a'; c.lineWidth = s * 0.34; c.beginPath(); c.arc(x, y, R - s * 1.6, a0, a0 + (a1 - a0) * f); c.stroke(); }
          c.globalAlpha = 1;
        }
        break;
      }
    }
  }
}
// 從天上往下看，x 這個位置最上面的東西有多高（落石的預告用）
let _sy = 0;
const _syA = { x: 0, y: 92 }, _syB = { x: 0, y: -14 };
function _syCb(f, p, n, fr) { _sy = p.y; return fr; }
function surfaceY(x) { _sy = -999; _syA.x = x; _syB.x = x; PH.world.rayCast(_syA, _syB, _syCb); return _sy; }
function drawFlyers(c, t) {
  const s = V.s;
  for (const o of S.objs) {
    if (o.t === 'balloon') {
      const x = X(o.x), y = Y(o.y) + Math.sin(t * 2 + o.x) * s * 0.3, r = o.r * s;
      // 停在半路：下一輪才飛過來，畫一圈提醒
      if (o.st === 'hover') { c.strokeStyle = 'rgba(255,225,74,' + (0.45 + 0.35 * Math.sin(t * 6)) + ')'; c.lineWidth = Math.max(1.2, s * 0.3); c.setLineDash([s * 1.2, s * 1.2]); c.lineDashOffset = -t * s * 6; ell(c, x, y + r * 0.5, r * 1.9, r * 2.2); c.stroke(); c.setLineDash([]); }
      c.strokeStyle = '#3a2a1c'; c.lineWidth = Math.max(1, s * 0.18); c.beginPath(); c.moveTo(x - r * 0.55, y + r * 0.6); c.lineTo(x - r * 0.32, y + r * 1.45); c.moveTo(x + r * 0.55, y + r * 0.6); c.lineTo(x + r * 0.32, y + r * 1.45); c.stroke();
      ell(c, x, y, r, r * 0.92); c.fillStyle = rg(c, x - r * 0.3, y - r * 0.35, r * 0.1, r * 1.1, o.side === 1 ? [0, '#ff9a80', 0.6, '#e03a2c', 1, '#8f1418'] : [0, '#a8d0ff', 0.6, '#2f6fe0', 1, '#1b46b8']); c.fill(); c.strokeStyle = INK; c.lineWidth = Math.max(1.2, s * 0.26); c.stroke();
      c.strokeStyle = 'rgba(255,225,74,.9)'; c.lineWidth = Math.max(1, s * 0.3); c.beginPath(); c.ellipse(x, y, r * 0.45, r * 0.9, 0, 0, TAU); c.stroke();
      rrect(c, x - r * 0.4, y + r * 1.4, r * 0.8, r * 0.52, r * 0.1); fs(c, '#8a5a30', INK, Math.max(1, s * 0.2));
      for (let k = 0; k < o.n; k++) { c.fillStyle = '#1c1e25'; c.beginPath(); c.arc(x + (k - (o.n - 1) / 2) * r * 0.34, y + r * 2.1, r * 0.15, 0, TAU); c.fill(); }
      if (o.flash > 0) { c.globalAlpha = o.flash * 0.7; ell(c, x, y, r, r * 0.92); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1; }
    } else if (o.t === 'lantern') {
      const x = X(o.x), y = Y(o.y), r = s * 2.3, K = { heal: ['#7af0a0', '#1f9a56', C_GREEN], rage: ['#ffb07a', '#e04a1c', C_ORANGE], charge: ['#fff0a0', '#e0a81c', C_GOLD], troop: ['#a8d8ff', '#2f6fe0', C_SKY] }[o.kind];
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6 + 0.2 * Math.sin(t * 5 + o.x); const g = glowSprite(K[2]); c.drawImage(g, x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.beginPath(); c.moveTo(x - r * 0.62, y + r); c.quadraticCurveTo(x - r * 1.15, y - r * 0.2, x - r * 0.7, y - r); c.lineTo(x + r * 0.7, y - r); c.quadraticCurveTo(x + r * 1.15, y - r * 0.2, x + r * 0.62, y + r); c.closePath();
      c.fillStyle = lg(c, 0, y - r, 0, y + r, [0, K[0], 1, K[1]]); c.fill(); c.strokeStyle = INK; c.lineWidth = Math.max(1.2, s * 0.24); c.stroke();
      c.fillStyle = '#3a2a1c'; c.fillRect(x - r * 0.62, y + r * 0.92, r * 1.24, r * 0.22);
      c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, s * 0.42); c.lineCap = 'round';
      if (o.kind === 'heal') { c.beginPath(); c.moveTo(x - r * 0.38, y); c.lineTo(x + r * 0.38, y); c.moveTo(x, y - r * 0.38); c.lineTo(x, y + r * 0.38); c.stroke(); }
      else if (o.kind === 'rage') { poly(c, [x, y - r * 0.55, x + r * 0.36, y + r * 0.1, x + r * 0.1, y + r * 0.45, x - r * 0.3, y + r * 0.3, x - r * 0.38, y - r * 0.1]); c.fill(); }
      else if (o.kind === 'charge') { poly(c, [x + r * 0.12, y - r * 0.6, x - r * 0.36, y + r * 0.08, x - r * 0.04, y + r * 0.08, x - r * 0.14, y + r * 0.6, x + r * 0.36, y - r * 0.1, x + r * 0.05, y - r * 0.1]); c.fill(); }
      else { c.beginPath(); c.arc(x, y - r * 0.22, r * 0.24, 0, TAU); c.fill(); rrect(c, x - r * 0.3, y + r * 0.08, r * 0.6, r * 0.46, r * 0.14); c.fill(); }
      // 快飄走了：最後一回合閃爍
      if (S.round - o.bornR >= 1) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 9); c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, s * 0.22); ell(c, x, y, r * 1.5, r * 1.6); c.stroke(); c.globalAlpha = 1; }
    } else if (o.t === 'orb') {
      const x = X(o.x), y = Y(o.y), r = o.r * s * (1 + 0.06 * Math.sin(t * 12));
      if (o.st === 'hover') { c.strokeStyle = 'rgba(255,225,74,' + (0.45 + 0.35 * Math.sin(t * 6)) + ')'; c.lineWidth = Math.max(1.2, s * 0.3); c.setLineDash([s * 1.2, s * 1.2]); c.lineDashOffset = -t * s * 6; ell(c, x, y, r * 1.9, r * 1.9); c.stroke(); c.setLineDash([]); }
      // 被打爆、掉頭飛回去的光球換成藍白色（變成我方的了）
      const mine = o.st === 'back';
      c.globalCompositeOperation = 'lighter'; const g = glowSprite(mine ? C_SKY : C_PINK); c.drawImage(g, x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2); c.globalCompositeOperation = 'source-over';
      ell(c, x, y, r, r); c.fillStyle = rg(c, x - r * 0.3, y - r * 0.3, r * 0.1, r, mine ? [0, '#ffffff', 0.35, '#58b8ff', 1, '#0a2a6a'] : [0, '#ffb0e6', 0.35, '#a024cc', 1, '#16042a']); c.fill(); c.strokeStyle = mine ? '#06183a' : '#0c0410'; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke();
      if (!mine) { c.strokeStyle = '#ffe14a'; c.lineWidth = Math.max(1.5, s * 0.45); c.beginPath(); c.arc(x, y, r * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(o.hp / o.hm, 0, 1)); c.stroke(); }
      if (o.flash > 0) { c.globalAlpha = o.flash * 0.7; ell(c, x, y, r, r); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1; }
      if (mine) { part(P_SPARK, o.x + rndS() * 2, o.y + rndS() * 2, rndS() * 8, rndS() * 8, 0.35, 0.7, C_SKY); part(P_EMBER, o.x + rndS() * 2.5, o.y + rndS() * 2.5, rndS() * 5, rndS() * 5, 0.5, 1.0, C_WHITE); }
      else if ((RD.frame & 1) === 0) part(P_EMBER, o.x + rndS() * 3, o.y + rndS() * 3, rndS() * 6, rndS() * 6, 0.5, 0.9, C_PURPLE);
    }
  }
  // 落石的預告：這一回合結束時會砸在這裡。落點一圈紅、往上一條虛線
  for (const mk of S.marks) {
    if (mk.sy === undefined || (RD.frame & 7) === 0) { const y = surfaceY(mk.x); mk.sy = y > -100 ? y : 0; }
    const x = X(mk.x), y = Y(mk.sy), r = s * (mk.big ? 4.2 : 3.2) * (0.9 + 0.1 * Math.sin(t * 8));
    c.strokeStyle = 'rgba(255,80,40,' + (0.55 + 0.35 * Math.sin(t * 12)) + ')'; c.lineWidth = Math.max(1.5, s * 0.4);
    c.beginPath(); c.ellipse(x, y, r, r * 0.4, 0, 0, TAU); c.stroke();
    c.setLineDash([s * 1.2, s * 1.2]); c.lineDashOffset = -t * s * 10; c.beginPath(); c.moveTo(x, V.hud); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,90,50,.9)'; poly(c, [x - s * 1.1, y - s * 3.6, x + s * 1.1, y - s * 3.6, x, y - s * 1.7]); c.fill();
  }
}

/* ---------- 砲彈 ---------- */
function drawShots(c) {
  const n = SH.n, s = V.s; if (!n) return;
  const k = 0.034 * s;
  c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
  for (let sd = 0; sd < 3; sd++) {
    if (!SH.cnt[sd]) continue;
    c.beginPath();
    for (let i = 0; i < n; i++) { if (SH.side[i] !== sd) continue; const x = X(SH.x[i]), y = Y(SH.y[i]); c.moveTo(x, y); c.lineTo(x - SH.vx[i] * k, y + SH.vy[i] * k); }
    c.strokeStyle = sd === 0 ? 'rgba(110,184,255,.62)' : sd === 1 ? 'rgba(255,120,88,.62)' : 'rgba(255,170,60,.7)'; c.lineWidth = Math.max(1.5, s * 0.5); c.stroke();
  }
  // 著火的砲彈多一團火光
  const gf = glowSprite(C_ORANGE);
  for (let i = 0; i < n; i++) if (SH.flag[i] & F_FIRE) { const r = s * 1.9; c.drawImage(gf, X(SH.x[i]) - r, Y(SH.y[i]) - r, r * 2, r * 2); }
  c.globalCompositeOperation = 'source-over';
  const sx = FX.shx, sy = FX.shy;
  for (let i = 0; i < n; i++) {
    // 分裂過的砲彈比較小顆（威力也比較小），合併的比較大顆
    const sp = shotSprite(SH.w[i], SH.side[i]), a = Math.atan2(-SH.vy[i], SH.vx[i]), ms = SH.mass[i], m = ms > 1 ? Math.min(2, Math.sqrt(ms)) : Math.max(0.6, Math.pow(ms, 0.2)), cs = Math.cos(a) * m, sn = Math.sin(a) * m;
    c.setTransform(cs, sn, -sn, cs, X(SH.x[i]) + sx, Y(SH.y[i]) + sy);
    c.drawImage(sp.cv, -sp.w / 2, -sp.h / 2);
  }
  c.setTransform(1, 0, 0, 1, sx, sy);
  // 火箭和砲彈拖一點煙
  if (!FX.low) for (let i = RD.frame % 5; i < n; i += 5) { const id = WL[SH.w[i]].id; if (id === 'rocket' || id === 'bomb' || id === 'drop') part(P_SMOKE, SH.x[i], SH.y[i], rndS() * 2, rndS() * 2, 0.45, id === 'rocket' ? 0.8 : 1.3, C_GRAY); else if (id === 'fire') part(P_EMBER, SH.x[i], SH.y[i], rndS() * 3, rndS() * 3, 0.35, 0.6, C_ORANGE); else if (id === 'ice') part(P_SPARK, SH.x[i], SH.y[i], rndS() * 4, rndS() * 4, 0.25, 0.3, C_ICE); else if (id === 'dark') part(P_EMBER, SH.x[i], SH.y[i], rndS() * 3, rndS() * 3, 0.3, 0.6, C_PURPLE); }
}

/* ---------- 特效 ---------- */
function fxDraw(c) {
  const s = V.s, n = FX.n, sx = FX.shx, sy = FX.shy;
  // 煙和塵先畫（用戰場的座標）；碎屑每一顆自己轉自己的角度，另外一趟畫。
  // 兩種混在同一趟的話，碎屑設的旋轉會留給後面的煙塵用，煙就會畫到不相干的地方去
  for (let i = 0; i < n; i++) {
    const tp = FX.type[i];
    if (tp === P_SMOKE || tp === P_DUST) {
      const f = FX.life[i] / FX.max[i], r = FX.size[i] * s * (1.7 - f * 0.9);
      c.globalAlpha = f * (tp === P_DUST ? 0.42 : 0.5); c.fillStyle = PCOL[FX.col[i]]; c.beginPath(); c.arc(X(FX.x[i]), Y(FX.y[i]), r, 0, TAU); c.fill();
    }
  }
  for (let i = 0; i < n; i++) {
    const tp = FX.type[i];
    if (tp === P_DEBRIS || tp === P_CONF || tp === P_SHARD) {
      const r = FX.size[i] * s * 0.5, a = FX.rot[i], cs = Math.cos(a), sn = Math.sin(a);
      c.globalAlpha = Math.min(1, FX.life[i] * 3); c.setTransform(cs, sn, -sn, cs, X(FX.x[i]) + sx, Y(FX.y[i]) + sy);
      c.fillStyle = PCOL[FX.col[i]];
      if (tp === P_SHARD) { c.beginPath(); c.moveTo(0, -r * 1.5); c.lineTo(r * 0.7, 0); c.lineTo(0, r * 1.5); c.lineTo(-r * 0.7, 0); c.closePath(); c.fill(); }
      else { c.fillRect(-r, -r * 0.8, r * 2, r * 1.6); if (tp === P_DEBRIS) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(-r, r * 0.2, r * 2, r * 0.6); } }
    }
  }
  c.setTransform(1, 0, 0, 1, sx, sy); c.globalAlpha = 1;
  c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const tp = FX.type[i];
    if (tp === P_SPARK) {
      const f = FX.life[i] / FX.max[i], x = X(FX.x[i]), y = Y(FX.y[i]), k = 0.03 * s;
      c.globalAlpha = Math.min(1, f * 1.6); c.strokeStyle = PCOL[FX.col[i]]; c.lineWidth = Math.max(1, FX.size[i] * s * 0.5);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - FX.vx[i] * k, y + FX.vy[i] * k); c.stroke();
    } else if (tp === P_FLASH) {
      const f = FX.life[i] / FX.max[i], r = FX.size[i] * s * (1.6 - f * 0.6); c.globalAlpha = f; c.drawImage(glowSprite(FX.col[i]), X(FX.x[i]) - r, Y(FX.y[i]) - r, r * 2, r * 2);
    } else if (tp === P_EMBER) {
      const f = FX.life[i] / FX.max[i], r = FX.size[i] * s * (0.5 + f); c.globalAlpha = f * 0.9; c.drawImage(glowSprite(FX.col[i]), X(FX.x[i]) - r, Y(FX.y[i]) - r, r * 2, r * 2);
    }
  }
  for (const r of FX.rings) { const f = r.t / r.max, rad = lerp(r.r0, r.r1, 1 - (1 - f) * (1 - f)) * s; c.globalAlpha = (1 - f) * 0.9; c.strokeStyle = r.col; c.lineWidth = Math.max(1, r.lw * s * (1 - f * 0.6)); c.beginPath(); c.arc(X(r.x), Y(r.y), Math.max(0.5, rad), 0, TAU); c.stroke(); }
  for (const b of FX.bolts) {
    const f = 1 - b.t / b.max; c.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) { c.globalAlpha = f * (pass ? 1 : 0.4); c.strokeStyle = pass ? '#ffffff' : b.col; c.lineWidth = s * (pass ? 0.5 : 1.9); c.beginPath(); for (let k = 0; k < b.pts.length; k += 2) { const x = X(b.pts[k]), y = Y(b.pts[k + 1]); if (k === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
  }
  for (const p of FX.tracers) { c.globalAlpha = 1 - p.t / 0.14; c.strokeStyle = p.side === 0 ? '#bfe0ff' : '#ffd0a0'; c.lineWidth = Math.max(1, s * 0.3); c.beginPath(); c.moveTo(X(p.x0), Y(p.y0)); c.lineTo(X(p.x1), Y(p.y1)); c.stroke(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // 被炸飛的兵
  for (const f of FX.flung) {
    const cs = Math.cos(f.rot), sn = Math.sin(f.rot);
    c.globalAlpha = Math.min(1, (2.2 - f.t) * 2); c.setTransform(cs, sn, -sn, cs, X(f.x) + sx, Y(f.y) + sy);
    if (f.flag) { drawFlag(c, f.flag, _noBlock, RD.t); continue; }
    const sp = unitSprite(f.side, f.type); c.drawImage(sp.cv, -sp.ax, -sp.cy);
  }
  c.setTransform(1, 0, 0, 1, sx, sy); c.globalAlpha = 1;
  // 跳出來的字
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (const p of FX.pops) {
    const f = p.t / p.max, sc = f < 0.12 ? 0.6 + f / 0.12 * 0.5 : 1.1 - Math.min(0.1, (f - 0.12) * 0.5), fz = p.size * s * sc;
    c.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
    c.font = /[^\x00-\xff]/.test(p.txt) && !/^×/.test(p.txt) ? F_ZH.replace('1px', fz + 'px') : '400 ' + fz * 1.15 + 'px ' + F_NUM;
    // 整句都要看得到：不超出左右、不躲到上方資訊列後面、不掉到畫面底下（摔進深淵的兵在畫面外），也不要被角落的按鈕蓋住
    const hw = c.measureText(p.txt).width / 2 + fz * 0.15, x = clamp(X(p.x), hw + 2, Math.max(hw + 2, V.W - hw - 2));
    let y = clamp(Y(p.y) - f * s * 3.5, V.hud + fz * 0.9, V.H - fz * 0.8);
    for (const r of RD.avoid) if (x + hw > r[0] && x - hw < r[2] && y + fz * 0.6 > r[1] && y - fz * 0.6 < r[3]) y = Math.max(V.hud + fz * 0.9, r[1] - fz * 0.7);
    c.lineWidth = fz * 0.22; c.strokeStyle = 'rgba(16,10,26,.9)'; c.strokeText(p.txt, x, y); c.fillStyle = p.col; c.fillText(p.txt, x, y);
  }
  c.globalAlpha = 1;
}
function drawShields(c, t, rdt) {
  const s = V.s;
  for (let sd = 0; sd < 2; sd++) {
    const T = S.team[sd], st = S.st[sd]; if (!T) continue;
    RD.sh[sd] += ((T.shield.on && !st.dead ? 1 : 0) - RD.sh[sd]) * Math.min(1, rdt * 9);
    const a = RD.sh[sd]; if (a < 0.02) continue;
    const x = X(st.cx), y = Y(st.y0 + st.h * 0.42), rx = (st.w * 0.5 + 6) * s * (0.9 + 0.1 * a), ry = (st.h * 0.6 + 6) * s * (0.9 + 0.1 * a);
    c.save(); c.beginPath(); c.rect(0, 0, V.W, Y(st.y0) + s * 0.5); c.clip();
    ell(c, x, y, rx, ry); c.fillStyle = rg(c, x, y, ry * 0.5, Math.max(rx, ry), sd === 0 ? [0, 'rgba(90,170,255,0)', 0.75, 'rgba(90,170,255,' + 0.12 * a + ')', 1, 'rgba(170,220,255,' + 0.4 * a + ')'] : [0, 'rgba(255,90,70,0)', 0.75, 'rgba(255,90,70,' + 0.12 * a + ')', 1, 'rgba(255,170,150,' + 0.4 * a + ')']); c.fill();
    c.strokeStyle = sd === 0 ? 'rgba(210,236,255,' + 0.9 * a + ')' : 'rgba(255,200,190,' + 0.9 * a + ')'; c.lineWidth = Math.max(1.5, s * 0.5); c.stroke();
    c.setLineDash([s * 2.4, s * 3.2]); c.lineDashOffset = -t * s * 14; c.lineWidth = Math.max(1, s * 0.3); ell(c, x, y, rx * 0.93, ry * 0.93); c.stroke(); c.setLineDash([]);
    c.restore();
  }
}

/* ---------- 瞄準 ---------- */
// 一串圓點：照現在的角度、力道和風算出來的彈道（跟模擬用同一種算法，所以對得上）。
// box：還在這座城樓的範圍裡的那一段不畫（自己的砲彈會穿過自己的城，畫出來反而亂）；inside = true 則是只畫那一段（帶頭的那一發用，畫淡一點）
function aimDots(c, mx, my, vx, vy, t0, t1, tMax, r0, r1, box, inside) {
  const w = S.wind, s = V.s; let n = 0;
  for (let tt = t0; tt <= t1; tt += 0.065) {
    const x = mx + vx * tt + 0.5 * w * tt * (tt + STEP), y = my + vy * tt - 0.5 * GRAV * tt * (tt + STEP);
    if (box && (x > box.x0 - 1 && x < box.x1 + 1.2 && y < box.y1 + 2.5) !== !!inside) continue;
    const px = X(x), py = Y(y), r = Math.max(1.3, s * lerp(r0, r1, tt / tMax));
    c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); n++;
  }
  return n;
}
function drawAim(c, t) {
  RD.aimMask = 0;
  if (!RD.showAim || S.state !== 'play') return;
  const s = V.s, T = S.team[0], E = S.team[1], mine = S.phase === 'aim' && S.turn === 0;
  // 上一輪實際飛過的路線：一串淡淡的小點，盡頭打一個叉，方便照著微調
  const tr = RD.trail;
  if (mine && tr && tr.n > 1) {
    c.beginPath(); const r = Math.max(1, s * 0.2);
    for (let k = 0; k < tr.n; k++) { const px = X(tr.x[k]), py = Y(tr.y[k]); c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); }
    c.fillStyle = 'rgba(255,255,255,.34)'; c.fill();
    const ex = X(tr.x[tr.n - 1]), ey = Y(tr.y[tr.n - 1]), q = s * 0.8;
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(1.5, s * 0.26); c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - q, ey - q); c.lineTo(ex + q, ey + q); c.moveTo(ex + q, ey - q); c.lineTo(ex - q, ey + q); c.stroke();
  }
  if (mine || RD.aimOn) {
    const vx = T.aim[0], vy = T.aim[1], maxT = RD.aimT, flow = mine ? (t * 0.9) % 1 * 0.065 : 0, kmax = Math.ceil(maxT * 30) + 1;
    let first = true; const box = S.st[0];
    for (const u of T.units) {
      if (!u.alive || !u.w || u.frozen > 0 || u.stun > 0) continue;
      const mx = u.x + 1.3, my = u.y + 2.3, inBox = u.x > box.x0 - 1 && u.x < box.x1 + 1 ? box : null;
      let end = maxT;
      if (mine) {
        const R = simTrace(0, mx, my, vx, vy, S.wind, S.time, kmax); RD.aimMask |= R.gm; if (R.hit && R.t < end) end = R.t;
        // 帶頭那一發的整條彈道會穿過哪些符（虛線畫不到那麼遠的也算）：符會亮起來。每四幀算一次就夠
        if (first) { if ((RD.frame & 3) === 0) RD.aimFar = R.hit ? R.gm : simTrace(0, mx, my, vx, vy, S.wind, S.time).gm; RD.aimMask |= RD.aimFar; }
      }
      // 帶頭那一發在自己城裡的那一段：畫淡淡的小點（吊高打的時候，起頭那一段幾乎都在城裡，不畫就看不出自己瞄哪）
      if (first && inBox && mine) { c.beginPath(); if (aimDots(c, mx, my, vx, vy, 0.05 + flow, end, maxT, 0.4, 0.3, inBox, true)) { c.fillStyle = 'rgba(255,255,255,.42)'; c.fill(); } }
      c.beginPath();
      if (!aimDots(c, mx, my, vx, vy, 0.05 + flow, end, maxT, first ? 0.6 : 0.36, first ? 0.26 : 0.18, inBox)) { first = false; continue; }
      c.fillStyle = mine ? (first ? 'rgba(255,255,255,.97)' : 'rgba(255,255,255,.55)') : 'rgba(255,255,255,.4)'; c.fill();
      if (mine && first) { c.strokeStyle = 'rgba(15,42,120,.85)'; c.lineWidth = Math.max(1, s * 0.16); c.stroke(); }
      first = false;
    }
  }
  // 敵軍瞄準的時候：一小段紅色虛線，看得出他們在瞄哪
  if (S.phase === 'aim' && S.turn === 1) {
    let lead = E.ai && E.ai.lead; if (!lead || !lead.alive) { lead = null; for (const u of E.units) if (u.alive && u.w) { lead = u; break; } }
    if (lead) {
      const big = lead.def.big ? MUZ_BIG : 1; c.beginPath();
      aimDots(c, lead.x - 1.3 * big, lead.y + 2.3 * big, E.aim[0], E.aim[1], 0.06 + (t * 0.9) % 1 * 0.065, 0.62, 0.62, 0.46, 0.2);
      c.fillStyle = 'rgba(255,150,130,.85)'; c.fill(); c.strokeStyle = 'rgba(106,11,16,.7)'; c.lineWidth = Math.max(1, s * 0.14); c.stroke();
    }
  }
}
function renderFrame(dt, rdt) {
  const c = RD.c; if (!c || !S.lv || !SCENE.cv) return;
  RD.t += rdt; RD.frame++;
  const t = RD.t;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // 震動時邊緣會露出來，先鋪一層底色
  if (FX.shx || FX.shy) { c.fillStyle = '#0d1019'; c.fillRect(0, 0, V.W, V.H); }
  c.setTransform(1, 0, 0, 1, FX.shx, FX.shy);
  sceneBack(c, t, dt);
  drawObjs(c, t);
  for (const st of S.structs) drawBackdrop(c, st, rdt);
  drawBlocks(c, t, rdt);
  drawRopes(c, t);
  drawGates(c, t);
  drawUnits(c, t);
  drawWater(c, t);
  drawFlyers(c, t);
  drawShots(c);
  fxDraw(c);
  drawShields(c, t, rdt);
  drawAim(c, t);
  sceneFront(c, t, dt);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (S.sudden && S.state === 'play') { c.fillStyle = 'rgba(255,60,20,' + (0.05 + 0.03 * Math.sin(t * 5)) + ')'; c.fillRect(0, 0, V.W, V.H); }
  if (FX.flash > 0) { c.globalAlpha = Math.min(0.8, FX.flash); c.fillStyle = FX.flashCol; c.fillRect(0, 0, V.W, V.H); c.globalAlpha = 1; }
}
