/* ===== 70-render: 每一幀把戰場畫出來 ===== */
const F_NUM = '"Lilita One", "NumFB", "Arial Black", system-ui, sans-serif';
const F_ZH = '900 1px "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif';
const RD = { cv: null, c: null, t: 0, xs: new Float32Array(20), ys: new Float32Array(24), showAim: true, aimT: 1.05, glow: {}, flame: null, flameKey: 0, frame: 0 };
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
function drawFoundations(c) {
  for (const st of S.structs) {
    if (st.side > 1) continue;
    const P = SKINS[st.skin], x0 = X(st.x0 - CS * 0.45), x1 = X(st.x1 + CS * 0.45), y0 = Y(st.y0), h = V.s * 2.1, s = V.s;
    c.fillStyle = lg(c, 0, y0, 0, y0 + h, [0, P.stone[1], 1, P.stone[2]]); rrect(c, x0, y0 - s * 0.25, x1 - x0, h, s * 0.5); c.fill();
    c.fillStyle = P.stone[0]; c.fillRect(x0 + s * 0.3, y0 - s * 0.25, x1 - x0 - s * 0.6, Math.max(1, s * 0.3));
    c.strokeStyle = P.ink; c.lineWidth = Math.max(1.5, s * 0.28); rrect(c, x0, y0 - s * 0.25, x1 - x0, h, s * 0.5); c.stroke();
    c.fillStyle = rgba(P.stone[3], 0.6); for (let x = x0 + s * 2.4; x < x1 - s; x += s * 3.4) c.fillRect(x, y0 + s * 0.3, Math.max(1, s * 0.2), h - s * 0.8);
  }
}
function tileAt(c, tl, m, v, d, x, y, w, h) { c.drawImage(tl.cv, (v * TILE_DMG + d) * tl.px, m * tl.px, tl.px, tl.px, x, y, w, h); }
function drawDeco(c, st, i, x, y, w, h, P) {
  const d = st.deco[i], cols = st.cols;
  if (d === 1) {
    // 城門：左右兩扇、上面一道拱
    const top = !(i + cols < st.n && st.deco[i + cols] === 1 && st.m[i + cols]), left = (i % cols) > 0 && st.deco[i - 1] === 1;
    c.fillStyle = lg(c, x, 0, x + w, 0, left ? [0, '#6a4424', 1, '#4a2e16'] : [0, '#4a2e16', 1, '#6a4424']);
    if (top) { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + h * 0.5); if (left) c.quadraticCurveTo(x + w * 0.02, y + h * 0.16, x + w, y + h * 0.5); else c.quadraticCurveTo(x + w * 0.98, y + h * 0.16, x + w, y + h * 0.16); if (left) c.lineTo(x + w, y + h); else { c.lineTo(x + w, y + h); } c.closePath(); c.fill(); }
    else c.fillRect(x, y, w, h);
    c.fillStyle = '#ffc93c'; const r = Math.max(1, w * 0.07);
    for (let k = 0; k < 2; k++) { c.beginPath(); c.arc(x + w * (left ? 0.3 : 0.7), y + h * (0.35 + k * 0.4) + (top ? h * 0.18 : 0), r, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(left ? x : x + w - Math.max(1, w * 0.06), y + (top ? h * 0.3 : 0), Math.max(1, w * 0.06), h);
  } else if (d === 2) {
    rrect(c, x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.6, w * 0.2); c.fillStyle = P.ink; c.fill();
    c.fillStyle = 'rgba(255,220,140,.5)'; c.fillRect(x + w * 0.38, y + h * 0.5, w * 0.24, h * 0.24);
  }
}
function drawStruct(c, st, t) {
  if (st.dead) return;
  const { cols, rows, m, hp, hm } = st, P = SKINS[st.skin], tl = tilesFor(st.skin, Math.max(4, Math.ceil(V.T))), xs = RD.xs, ys = RD.ys, s = V.s;
  const jx = st.hitT > 0 ? (Math.random() - 0.5) * s * 0.3 : 0;
  for (let i = 0; i <= cols; i++) xs[i] = Math.round(X(st.x0 + i * CS) + jx);
  for (let j = 0; j <= rows; j++) ys[j] = Math.round(Y(st.y0 + j * CS));
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const i = cy * cols + cx, mm = m[i]; if (!mm) continue;
    const f = hp[i] / hm[i], d = mm === M_PANEL || mm === M_KEG ? 0 : f > 0.66 ? 0 : f > 0.33 ? 1 : 2;
    tileAt(c, tl, mm, st.vr[i] & 1, d, xs[cx], ys[cy + 1], xs[cx + 1] - xs[cx], ys[cy] - ys[cy + 1]);
    if (st.deco[i]) drawDeco(c, st, i, xs[cx], ys[cy + 1], xs[cx + 1] - xs[cx], ys[cy] - ys[cy + 1], P);
  }
  // 屋簷的翹角
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const i = cy * cols + cx; if (m[i] !== M_ROOF) continue;
    const yb = ys[cy], yt = ys[cy + 1], T = yb - yt;
    for (let sd = -1; sd <= 1; sd += 2) {
      const nb = cx + sd; if (nb >= 0 && nb < cols && isSolid(m[cy * cols + nb])) continue;
      const xe = sd < 0 ? xs[cx] : xs[cx + 1];
      c.beginPath(); c.moveTo(xe, yb); c.lineTo(xe + sd * T * 0.5, yb - T * 0.02); c.quadraticCurveTo(xe + sd * T * 0.86, yb - T * 0.1, xe + sd * T * 0.98, yb - T * 0.56); c.quadraticCurveTo(xe + sd * T * 0.5, yb - T * 0.42, xe, yt + T * 0.12); c.closePath();
      c.fillStyle = P.roof[1]; c.fill(); c.strokeStyle = P.ink; c.lineWidth = Math.max(1.2, s * 0.24); c.stroke();
    }
  }
  // 外輪廓：實心磚旁邊是空的那幾邊描一條墨線
  c.beginPath();
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const i = cy * cols + cx; if (!isSolid(m[i])) continue;
    if (cx === 0 || !isSolid(m[i - 1])) { c.moveTo(xs[cx], ys[cy]); c.lineTo(xs[cx], ys[cy + 1]); }
    if (cx === cols - 1 || !isSolid(m[i + 1])) { c.moveTo(xs[cx + 1], ys[cy]); c.lineTo(xs[cx + 1], ys[cy + 1]); }
    if (cy === rows - 1 || !isSolid(m[i + cols])) { c.moveTo(xs[cx], ys[cy + 1]); c.lineTo(xs[cx + 1], ys[cy + 1]); }
    if (cy > 0 && !isSolid(m[i - cols])) { c.moveTo(xs[cx], ys[cy]); c.lineTo(xs[cx + 1], ys[cy]); }
  }
  c.strokeStyle = P.ink; c.lineWidth = Math.max(1.5, s * 0.3); c.lineCap = 'square'; c.stroke();
  // 掉落中的那幾群
  for (const g of st.groups) {
    if (g.done) continue; const dy = g.off * s;
    for (const k of g.cells) {
      const f = k.hp / k.hm, d = k.m === M_PANEL || k.m === M_KEG ? 0 : f > 0.66 ? 0 : f > 0.33 ? 1 : 2, x = xs[k.cx], y = ys[k.cy + 1] + dy, w = xs[k.cx + 1] - x, h = ys[k.cy] - ys[k.cy + 1];
      tileAt(c, tl, k.m, k.vr & 1, d, x, y, w, h);
      if (k.m !== M_PANEL) { c.strokeStyle = P.ink; c.lineWidth = Math.max(1, s * 0.2); c.strokeRect(x, y, w, h); }
    }
  }
  // 結霜、著火
  let anyBurn = st.nburn > 0;
  for (let i = 0; i < st.n; i++) {
    if (!m[i]) continue;
    if (st.brit[i] > 0) { const cx = i % cols, cy = (i / cols) | 0; c.fillStyle = 'rgba(190,236,255,' + Math.min(0.34, st.brit[i] * 0.2) + ')'; c.fillRect(xs[cx], ys[cy + 1], xs[cx + 1] - xs[cx], ys[cy] - ys[cy + 1]); }
  }
  if (anyBurn) {
    const fl = flameSprite(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < st.n; i++) {
      if (st.burn[i] <= 0 || !m[i]) continue;
      const cx = i % cols, cy = (i / cols) | 0, w = xs[cx + 1] - xs[cx], a = Math.min(1, st.burn[i]);
      for (let k = 0; k < 2; k++) {
        const ph = t * 9 + i * 1.7 + k * 2.1, sc = 0.75 + 0.3 * Math.sin(ph) + k * 0.1, fw = w * sc * 0.8, fh = fw * 1.5;
        c.globalAlpha = a * (0.75 - k * 0.2); c.drawImage(fl, xs[cx] + w * (0.5 + (k ? 0.22 : -0.18) * Math.sin(ph * 0.7)) - fw / 2, ys[cy] - fh * 0.92 - w * 0.1, fw, fh);
      }
      if (!FX.low && ((RD.frame + i) & 15) === 0) part(P_SMOKE, st.x0 + (cx + 0.5) * CS, st.y0 + (cy + 1) * CS, rndS() * 2, 6, 0.9, 1.3, C_DARK);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  // 旗子
  if (st.side < 2) {
    if (st._flag === undefined) { let best = -1; for (let cy = rows - 1; cy >= 0 && best < 0; cy--) for (let cx = 0; cx < cols; cx++) if (isSolid(m[cy * cols + cx])) { let a = cx, b = cx; while (b + 1 < cols && isSolid(m[cy * cols + b + 1])) b++; best = cy * cols + ((a + b) >> 1); break; } st._flag = best; }
    const fi = st._flag;
    if (fi >= 0 && isSolid(m[fi])) {
      const cx = fi % cols, cy = (fi / cols) | 0, px = (xs[cx] + xs[cx + 1]) / 2, py = ys[cy + 1], ph = s * 6.2, dir = S.wind > 1 ? 1 : S.wind < -1 ? -1 : (st.side === 0 ? 1 : -1), amp = 0.18 + Math.min(0.5, Math.abs(S.wind) * 0.03);
      c.strokeStyle = '#3a2a1c'; c.lineWidth = Math.max(1.5, s * 0.36); c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - ph); c.stroke();
      c.fillStyle = P.trim; c.beginPath(); c.arc(px, py - ph, s * 0.45, 0, TAU); c.fill();
      const fw = s * 4.6, fh = s * 2.6; c.beginPath(); c.moveTo(px, py - ph + s * 0.3);
      for (let k = 1; k <= 6; k++) { const u = k / 6; c.lineTo(px + dir * fw * u, py - ph + s * 0.3 + Math.sin(t * (5 + Math.abs(S.wind) * 0.3) - u * 5) * fh * amp * u); }
      for (let k = 6; k >= 0; k--) { const u = k / 6; c.lineTo(px + dir * fw * u * (k === 6 ? 0.82 : 1), py - ph + s * 0.3 + fh * (1 - u * 0.25) + Math.sin(t * (5 + Math.abs(S.wind) * 0.3) - u * 5) * fh * amp * u); }
      c.closePath(); c.fillStyle = lg(c, px, 0, px + dir * fw, 0, [0, P.flag, 1, P.flagDk]); c.fill(); c.strokeStyle = P.ink; c.lineWidth = Math.max(1, s * 0.2); c.stroke();
    }
  }
}
function drawUnits(c, st, t) {
  const s = V.s, T = st.side < 2 ? S.team[st.side] : null;
  for (const u of st.units) {
    if (!u.alive) continue;
    const sp = unitSprite(u.side, u.type), dir = u.side === 0 ? 1 : -1;
    const x = X(u.x) - dir * u.recoil * s * 0.7, y = Y(u.y) + (u.frozen > 0 ? 0 : Math.sin(t * 3.2 + u.slot * 1.9) * s * 0.07);
    if (T && (T.ult.T > 0 || T.rageT > 0)) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 14 + u.slot); const g = glowSprite(T.ult.T > 0 ? C_GOLD : C_ORANGE), r = sp.px * 0.75; c.drawImage(g, x - r, y - sp.px * 0.5 - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    c.drawImage(sp.cv, x - sp.ax, y - sp.ay);
    if (u.hurtT > 0) { c.globalAlpha = Math.min(0.85, u.hurtT * 5); c.drawImage(sp.wh, x - sp.ax, y - sp.ay); c.globalAlpha = 1; }
    const big = u.def.big ? 1.9 : 1, hw = s * 1.5 * big, top = y - s * 3.5 * big;
    if (u.frozen > 0) {
      c.fillStyle = 'rgba(170,228,255,.5)'; c.strokeStyle = 'rgba(235,250,255,.9)'; c.lineWidth = Math.max(1, s * 0.22);
      poly(c, [x - hw * 1.05, y, x - hw * 1.2, top + s, x - hw * 0.4, top - s * 0.4, x + hw * 0.7, top - s * 0.1, x + hw * 1.2, top + s * 1.4, x + hw * 1.05, y]); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(x - hw * 0.6, top + s * 1.2); c.lineTo(x - hw * 0.1, top + s * 0.2); c.stroke();
    }
    if (u.stun > 0) { c.fillStyle = '#ffe14a'; for (let k = 0; k < 3; k++) { const a = t * 7 + k * 2.1; c.beginPath(); c.arc(x + Math.cos(a) * hw * 0.8, top - s * 0.3 + Math.sin(a) * s * 0.35, Math.max(1.2, s * 0.26), 0, TAU); c.fill(); } }
    if (u.hp < u.hpMax * 0.995) {
      const f = clamp(u.hp / u.hpMax, 0, 1), bw = s * 3.1 * big, bh = Math.max(2.5, s * 0.52), bx = x - bw / 2, by = top - s * 0.95;
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
    const ap = Math.min(1, age / 0.22), pulse = 1 + g.flash * 0.14;
    c.save(); c.translate(x, y); c.rotate(Math.PI / 2 - g.ang); c.scale(ap * pulse, pulse);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, 0, 0, 0, hh * 1.25, [0, col.glow, 1, 'rgba(0,0,0,0)']); c.fillRect(-hh * 1.25, -hh * 1.25, hh * 2.5, hh * 2.5); c.globalCompositeOperation = 'source-over';
    // 符身：兩側隨風抖動
    const n = 8; c.beginPath();
    for (let k = 0; k <= n; k++) { const yy = -hh + 2 * hh * k / n, xx = -w + Math.sin(t * 4.2 + k * 0.9 + g.b) * w * 0.16; if (k === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
    for (let k = n; k >= 0; k--) { const yy = -hh + 2 * hh * k / n, xx = w + Math.sin(t * 4.2 + k * 0.9 + g.b + 1.4) * w * 0.16; c.lineTo(xx, yy); }
    c.closePath(); c.fillStyle = lg(c, -w, 0, w, 0, [0, col.e, 0.5, col.m, 1, col.e]); c.fill();
    if (g.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + (g.flash * 0.6) + ')'; c.fill(); }
    c.strokeStyle = col.line; c.lineWidth = Math.max(1, s * 0.2); c.stroke();
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
    // 耐久（被打過才顯示）與剩餘時間
    const bw = w * 3, by = hh + s * 1.0;
    if (g.hp < g.hpMax && g.owner < 2) { c.fillStyle = 'rgba(10,8,20,.7)'; c.fillRect(-bw / 2, by, bw, s * 0.5); c.fillStyle = g.owner === 0 ? '#7fc0ff' : '#ff8a6a'; c.fillRect(-bw / 2, by, bw * clamp(g.hp / g.hpMax, 0, 1), s * 0.5); }
    else if (g.life > 0) { c.fillStyle = 'rgba(10,8,20,.6)'; c.fillRect(-bw / 2, by, bw, s * 0.4); c.fillStyle = '#ffffff'; c.fillRect(-bw / 2, by, bw * clamp(1 - age / g.life, 0, 1), s * 0.4); }
    else if (g.uses > 0) { c.fillStyle = 'rgba(10,8,20,.6)'; c.fillRect(-bw / 2, by, bw, s * 0.4); c.fillStyle = '#ffffff'; c.fillRect(-bw / 2, by, bw * clamp(g.left / g.uses, 0, 1), s * 0.4); }
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
        if (o.warn && !o.on) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 18); const g = glowSprite(C_ORANGE), r = s * 5; c.drawImage(g, x - r, yb - r * 0.7, r * 2, r * 1.4); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; if ((RD.frame & 3) === 0) part(P_EMBER, o.x + rndS() * 4, o.base, rndS() * 6, 10 + Math.random() * 10, 0.5, 0.6, C_ORANGE); }
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
          if (e) { c.fillStyle = col[0]; for (let k = -1; k <= 1; k++) poly(c, [x + k * rx * 0.5 - s * 0.6, y + s * 2.2, x + k * rx * 0.5 + s * 0.6, y + s * 2.2, x + k * rx * 0.5, y + s * 3.4 + Math.sin(t * 6 + k) * s * 0.4]), c.fill(); }
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
        const x = X(o.x), y = Y(o.y), R = o.R * s;
        c.lineCap = 'butt';
        for (const sg of o.segs) {
          const a0 = -(o.rot + sg.a + sg.w), a1 = -(o.rot + sg.a - sg.w);
          if (sg.dead > 0) { c.strokeStyle = 'rgba(255,90,160,.14)'; c.lineWidth = s * 0.5; c.setLineDash([s, s * 1.4]); c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke(); c.setLineDash([]); continue; }
          c.strokeStyle = 'rgba(255,60,150,' + (0.22 + sg.flash * 0.4) + ')'; c.lineWidth = s * 2.6; c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke();
          c.strokeStyle = sg.flash > 0 ? '#ffffff' : '#ff8ac6'; c.lineWidth = s * 0.7; c.beginPath(); c.arc(x, y, R, a0, a1); c.stroke();
          const f = sg.hp / sg.hm; if (f < 0.99) { c.strokeStyle = '#ffe14a'; c.lineWidth = s * 0.3; c.beginPath(); c.arc(x, y, R + s * 1.2, a0, a0 + (a1 - a0) * f); c.stroke(); }
        }
        break;
      }
    }
  }
}
function drawFlyers(c, t) {
  const s = V.s;
  for (const o of S.objs) {
    if (o.t === 'balloon') {
      const x = X(o.x), y = Y(o.y) + Math.sin(t * 2 + o.x) * s * 0.3, r = o.r * s;
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
    } else if (o.t === 'orb') {
      const x = X(o.x), y = Y(o.y), r = o.r * s * (1 + 0.06 * Math.sin(t * 12));
      c.globalCompositeOperation = 'lighter'; const g = glowSprite(C_PINK); c.drawImage(g, x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2); c.globalCompositeOperation = 'source-over';
      ell(c, x, y, r, r); c.fillStyle = rg(c, x - r * 0.3, y - r * 0.3, r * 0.1, r, [0, '#ffb0e6', 0.35, '#a024cc', 1, '#16042a']); c.fill(); c.strokeStyle = '#0c0410'; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke();
      c.strokeStyle = '#ffe14a'; c.lineWidth = Math.max(1.5, s * 0.45); c.beginPath(); c.arc(x, y, r * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(o.hp / o.hm, 0, 1)); c.stroke();
      if (o.flash > 0) { c.globalAlpha = o.flash * 0.7; ell(c, x, y, r, r); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1; }
      if ((RD.frame & 1) === 0) part(P_EMBER, o.x + rndS() * 3, o.y + rndS() * 3, rndS() * 6, rndS() * 6, 0.5, 0.9, C_PURPLE);
    }
  }
  // 落石的預告：落點一圈紅、往上一條虛線
  for (const mk of S.marks) {
    const x = X(mk.x), f = clamp((S.time - mk.t0) / (mk.t1 - mk.t0), 0, 1); let gy = groundY(mk.x); if (gy < -50) gy = 0;
    for (const st of S.structs) if (!st.dead && mk.x >= st.x0 && mk.x < st.x1) { const cx = ((mk.x - st.x0) / CS) | 0; for (let cy = st.rows - 1; cy >= 0; cy--) if (st.m[cy * st.cols + cx]) { gy = st.y0 + (cy + 1) * CS; break; } }
    const y = Y(gy), r = s * (3.6 - f * 1.6);
    c.strokeStyle = 'rgba(255,80,40,' + (0.5 + 0.4 * Math.sin(t * 22)) + ')'; c.lineWidth = Math.max(1.5, s * 0.4);
    c.beginPath(); c.ellipse(x, y, r, r * 0.4, 0, 0, TAU); c.stroke();
    c.setLineDash([s * 1.2, s * 1.2]); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
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
    const sp = shotSprite(SH.w[i], SH.side[i]), a = Math.atan2(-SH.vy[i], SH.vx[i]), m = SH.mass[i] > 1 ? Math.min(2, Math.sqrt(SH.mass[i])) : 1, cs = Math.cos(a) * m, sn = Math.sin(a) * m;
    c.setTransform(cs, sn, -sn, cs, X(SH.x[i]) + sx, Y(SH.y[i]) + sy);
    c.drawImage(sp.cv, -sp.w / 2, -sp.h / 2);
  }
  c.setTransform(1, 0, 0, 1, sx, sy);
  // 火箭和砲彈拖一點煙
  if (!FX.low) for (let i = RD.frame % 5; i < n; i += 5) { const id = WL[SH.w[i]].id; if (id === 'rocket' || id === 'bomb' || id === 'lava' || id === 'drop') part(P_SMOKE, SH.x[i], SH.y[i], rndS() * 2, rndS() * 2, 0.45, id === 'rocket' ? 0.8 : 1.3, id === 'lava' ? C_SOOT : C_GRAY); else if (id === 'fire') part(P_EMBER, SH.x[i], SH.y[i], rndS() * 3, rndS() * 3, 0.35, 0.6, C_ORANGE); else if (id === 'ice') part(P_SPARK, SH.x[i], SH.y[i], rndS() * 4, rndS() * 4, 0.25, 0.3, C_ICE); }
}

/* ---------- 特效 ---------- */
function fxDraw(c) {
  const s = V.s, n = FX.n, sx = FX.shx, sy = FX.shy;
  for (let i = 0; i < n; i++) {
    const tp = FX.type[i];
    if (tp === P_SMOKE || tp === P_DUST) {
      const f = FX.life[i] / FX.max[i], r = FX.size[i] * s * (1.7 - f * 0.9);
      c.globalAlpha = f * (tp === P_DUST ? 0.42 : 0.5); c.fillStyle = PCOL[FX.col[i]]; c.beginPath(); c.arc(X(FX.x[i]), Y(FX.y[i]), r, 0, TAU); c.fill();
    } else if (tp === P_DEBRIS || tp === P_CONF || tp === P_SHARD) {
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
    const sp = unitSprite(f.side, f.type), cs = Math.cos(f.rot), sn = Math.sin(f.rot);
    c.globalAlpha = Math.min(1, (2.2 - f.t) * 2); c.setTransform(cs, sn, -sn, cs, X(f.x) + sx, Y(f.y) + sy); c.drawImage(sp.cv, -sp.px / 2, -sp.px / 2);
  }
  c.setTransform(1, 0, 0, 1, sx, sy); c.globalAlpha = 1;
  // 跳出來的字
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (const p of FX.pops) {
    const f = p.t / p.max, sc = f < 0.12 ? 0.6 + f / 0.12 * 0.5 : 1.1 - Math.min(0.1, (f - 0.12) * 0.5), fz = p.size * s * sc;
    c.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
    c.font = /[^\x00-\xff]/.test(p.txt) && !/^×/.test(p.txt) ? F_ZH.replace('1px', fz + 'px') : '400 ' + fz * 1.15 + 'px ' + F_NUM;
    const x = clamp(X(p.x), fz * 2, V.W - fz * 2), y = Y(p.y) - f * s * 3.5;
    c.lineWidth = fz * 0.22; c.strokeStyle = 'rgba(16,10,26,.9)'; c.strokeText(p.txt, x, y); c.fillStyle = p.col; c.fillText(p.txt, x, y);
  }
  c.globalAlpha = 1;
}
function drawShields(c, t) {
  const s = V.s;
  for (let sd = 0; sd < 2; sd++) {
    const T = S.team[sd], st = S.st[sd]; if (!T || T.shield.T <= 0 || st.dead) continue;
    const a = Math.min(1, T.shield.T * 3) * Math.min(1, (T.shield.dur - T.shield.T) * 8 + 0.2);
    const x = X(st.cx), y = Y(st.y0 + st.h * 0.42), rx = (st.w * 0.5 + 6) * s, ry = (st.h * 0.6 + 6) * s;
    c.save(); c.beginPath(); c.rect(0, 0, V.W, Y(st.y0) + s * 0.5); c.clip();
    ell(c, x, y, rx, ry); c.fillStyle = rg(c, x, y, ry * 0.5, Math.max(rx, ry), sd === 0 ? [0, 'rgba(90,170,255,0)', 0.75, 'rgba(90,170,255,' + 0.12 * a + ')', 1, 'rgba(170,220,255,' + 0.4 * a + ')'] : [0, 'rgba(255,90,70,0)', 0.75, 'rgba(255,90,70,' + 0.12 * a + ')', 1, 'rgba(255,170,150,' + 0.4 * a + ')']); c.fill();
    c.strokeStyle = sd === 0 ? 'rgba(210,236,255,' + 0.9 * a + ')' : 'rgba(255,200,190,' + 0.9 * a + ')'; c.lineWidth = Math.max(1.5, s * 0.5); c.stroke();
    c.setLineDash([s * 2.4, s * 3.2]); c.lineDashOffset = -t * s * 14; c.lineWidth = Math.max(1, s * 0.3); ell(c, x, y, rx * 0.93, ry * 0.93); c.stroke(); c.setLineDash([]);
    c.restore();
  }
}
// 瞄準的虛線：每個兵各一條，照現在的角度、力道和風算出來的前一小段彈道
function drawAim(c, t) {
  if (!RD.showAim || S.state !== 'play') return;
  const s = V.s, w = S.wind, foe = S.st[1], T = S.team[0], vx = T.aim[0], vy = T.aim[1], maxT = RD.aimT, flow = (t * 0.9) % 1 * 0.065;
  let first = true;
  for (const u of T.units) {
    if (!u.alive || !u.w || u.fall || u.grp) continue;
    const mx = u.x + 1.3, my = u.y + 2.3;
    c.beginPath(); let lx = 0, ly = 0, n = 0;
    for (let tt = 0.05 + flow; tt <= maxT; tt += 0.065) {
      const x = mx + vx * tt + 0.5 * w * tt * tt, y = my + vy * tt - 0.5 * GRAV * tt * tt;
      if (y < groundY(x) || (x >= foe.x0 && x < foe.x1 && y >= foe.y0 && y < foe.y1 && isSolid(foe.m[(((y - foe.y0) / CS) | 0) * foe.cols + (((x - foe.x0) / CS) | 0)]))) break;
      const px = X(x), py = Y(y), r = Math.max(1.4, s * lerp(first ? 0.62 : 0.48, 0.22, tt / maxT)); c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); lx = px; ly = py; n++;
    }
    if (!n) continue;
    c.fillStyle = first ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.6)'; c.strokeStyle = 'rgba(15,42,120,.8)'; c.lineWidth = Math.max(1, s * 0.16); c.fill(); c.stroke();
    first = false;
  }
  // 敵軍砲口的方向：一小段紅色虛線，讓你看得出他們在瞄哪
  const E = S.team[1]; let lead = null; for (const u of E.units) if (u.alive && u.w && !u.fall && !u.grp) { lead = u; break; }
  if (lead) {
    const mx = lead.x - 1.3, my = lead.y + 2.3; c.beginPath();
    for (let tt = 0.06 + flow; tt <= 0.5; tt += 0.065) { const x = mx + E.aim[0] * tt + 0.5 * w * tt * tt, y = my + E.aim[1] * tt - 0.5 * GRAV * tt * tt, px = X(x), py = Y(y), r = Math.max(1.2, s * lerp(0.42, 0.18, tt / 0.5)); c.moveTo(px + r, py); c.arc(px, py, r, 0, TAU); }
    c.fillStyle = 'rgba(255,150,130,.7)'; c.fill();
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
  drawGates(c, t);
  for (const st of S.structs) drawStruct(c, st, t);
  for (const st of S.structs) drawUnits(c, st, t);
  drawFlyers(c, t);
  drawShots(c);
  fxDraw(c);
  drawShields(c, t);
  drawAim(c, t);
  sceneFront(c, t, dt);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (S.sudden && S.state === 'play') { c.fillStyle = 'rgba(255,60,20,' + (0.05 + 0.03 * Math.sin(t * 5)) + ')'; c.fillRect(0, 0, V.W, V.H); }
  if (FX.flash > 0) { c.globalAlpha = Math.min(0.8, FX.flash); c.fillStyle = FX.flashCol; c.fillRect(0, 0, V.W, V.H); c.globalAlpha = 1; }
}
