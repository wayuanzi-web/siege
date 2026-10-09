/* ===== 72-amp-draw: 戰場中間的放大機關怎麼畫（噴流、雷雲、彈簧板、稜鏡、黑洞、浮空晶石、冰鏡） ===== */
function drawAmp(c, t) {
  const s = V.s;
  for (const o of S.objs) {
    switch (o.t) {
      case 'jet': {
        // 一條水平的氣流帶：淡淡的一層，裡面一道道往氣流方向跑的白線，兩頭有箭頭
        const x0 = X(o.x0), x1 = X(o.x1), yc = Y(o.y), hh = o.hh * s, dir = o.U > 0 ? 1 : -1, fade = Math.min(1, (o.age || 0) / 0.6);
        c.save(); c.globalAlpha = fade;
        c.fillStyle = lg(c, 0, yc - hh * 1.4, 0, yc + hh * 1.4, [0, 'rgba(220,240,255,0)', 0.3, 'rgba(220,240,255,.16)', 0.5, 'rgba(235,248,255,.26)', 0.7, 'rgba(220,240,255,.16)', 1, 'rgba(220,240,255,0)']);
        c.fillRect(x0, yc - hh * 1.4, x1 - x0, hh * 2.8);
        c.lineCap = 'round';
        for (let k = 0; k < 14; k++) {
          const lane = ((k * 0.37) % 1) * 2 - 1, sp = 0.5 + ((k * 0.61) % 1) * 0.5, L = (o.x1 - o.x0), u = ((t * sp * Math.abs(o.U) / L * 0.9 + k * 0.173) % 1), xw = o.x0 + (dir > 0 ? u : 1 - u) * L;
          const len = s * (3 + sp * 4), y = yc + lane * hh * 0.8 + Math.sin(t * 3 + k) * s * 0.2, x = X(xw), a = Math.sin(u * Math.PI);
          c.strokeStyle = 'rgba(255,255,255,' + (0.55 * a).toFixed(2) + ')'; c.lineWidth = Math.max(1, s * (0.16 + sp * 0.12));
          c.beginPath(); c.moveTo(x - dir * len, y); c.lineTo(x, y); c.stroke();
        }
        // 箭頭：看得出這一回合往哪邊吹
        c.fillStyle = 'rgba(255,255,255,.75)'; c.strokeStyle = 'rgba(40,70,120,.6)'; c.lineWidth = Math.max(1, s * 0.15);
        for (let k = 0; k < 3; k++) { const ax = lerp(x0, x1, (k + 0.5) / 3) + dir * Math.sin(t * 4 + k) * s * 0.4; poly(c, [ax + dir * s * 1.4, yc, ax - dir * s * 0.6, yc - hh * 0.55, ax - dir * s * 0.1, yc, ax - dir * s * 0.6, yc + hh * 0.55]); c.fill(); c.stroke(); }
        c.restore();
        break;
      }
      case 'cloud': {
        // 雷雲：幾團深色的雲疊在一起，裡面時不時閃一下
        const x = X(o.px === undefined ? o.x : o.px), y = Y(o.py === undefined ? o.y : o.py), rx = o.rx * s, ry = o.ry * s, fl = Math.max(o.flash || 0, Math.sin(t * 7.3 + o.bx) > 0.93 ? 0.6 : 0);
        c.save();
        if (fl > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = fl * 0.6; const g = glowSprite(C_YELLOW), r = rx * 1.3; c.drawImage(g, x - r, y - r * 0.8, r * 2, r * 1.6); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + t * 0.15, px = x + Math.cos(a) * rx * 0.55, py = y + Math.sin(a) * ry * 0.35 - ry * 0.1; ell(c, px, py, rx * 0.5, ry * 0.62); c.fillStyle = k & 1 ? '#3a3f55' : '#4a5068'; c.fill(); }
        ell(c, x, y, rx * 0.72, ry * 0.7); c.fillStyle = '#2c3044'; c.fill();
        c.strokeStyle = 'rgba(255,240,150,' + (0.35 + 0.25 * Math.sin(t * 9)) + ')'; c.lineWidth = Math.max(1, s * 0.22); c.lineJoin = 'round';
        for (let k = 0; k < 2; k++) { const ph = Math.floor(t * 3 + k * 1.7), R = mkRand(ph * 13 + k), bx = x + (R() - 0.5) * rx, by = y - ry * 0.2; c.beginPath(); c.moveTo(bx, by); for (let q = 1; q <= 4; q++) c.lineTo(bx + (R() - 0.5) * s * 2.2, by + q * ry * 0.22); c.stroke(); }
        c.restore();
        break;
      }
      case 'spring': {
        // 彈簧板：一片黃銅板，後面一圈一圈的彈簧頂著牆
        const nx = -o.dy / o.len, ny = o.dx / o.len, x0 = o.x - o.dx, y0 = o.y - o.dy, x1 = o.x + o.dx, y1 = o.y + o.dy, sq = (o.flash || 0) * 0.6;
        c.lineCap = 'round';
        for (const u of [0.25, 0.75]) {
          const bx = lerp(x0, x1, u), by = lerp(y0, y1, u); c.strokeStyle = '#8a8f9a'; c.lineWidth = Math.max(1, s * 0.22); c.beginPath();
          for (let k = 0; k <= 8; k++) { const d = -k / 8 * (2.2 - sq), w = (k & 1 ? 0.55 : -0.55); c.lineTo(X(bx + nx * d + o.dx / o.len * w), Y(by + ny * d + o.dy / o.len * w)); }
          c.stroke();
        }
        // 彈簧腳下的鐵座（釘在岩柱頂上）
        c.strokeStyle = '#2a2224'; c.lineWidth = s * 0.7; c.beginPath(); c.moveTo(X(x0 - nx * 2.35 + o.dx / o.len * 0.3), Y(y0 - ny * 2.35 + o.dy / o.len * 0.3)); c.lineTo(X(x1 - nx * 2.35 - o.dx / o.len * 0.3), Y(y1 - ny * 2.35 - o.dy / o.len * 0.3)); c.stroke();
        c.strokeStyle = '#6a6470'; c.lineWidth = s * 0.22; c.stroke();
        const ox = nx * sq, oy = ny * sq;
        c.strokeStyle = '#3a2a10'; c.lineWidth = s * 1.1; c.beginPath(); c.moveTo(X(x0 + ox), Y(y0 + oy)); c.lineTo(X(x1 + ox), Y(y1 + oy)); c.stroke();
        c.strokeStyle = o.flash > 0 ? '#fff6d0' : '#e8b83c'; c.lineWidth = s * 0.7; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = s * 0.18; c.beginPath(); c.moveTo(X(x0 + ox + nx * 0.2), Y(y0 + oy + ny * 0.2)); c.lineTo(X(x1 + ox + nx * 0.2), Y(y1 + oy + ny * 0.2)); c.stroke();
        break;
      }
      case 'prism': {
        // 稜鏡：慢慢轉的三角水晶，邊上閃彩光
        const x = X(o.x), y = Y(o.y), r = o.r * s, a0 = t * 0.4 + (o.ang || 0);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.45 + (o.flash || 0) * 0.5; const g = glowSprite(C_WHITE); c.drawImage(g, x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        const P = []; for (let k = 0; k < 3; k++) { const a = a0 + k * TAU / 3; P.push(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        poly(c, P); c.fillStyle = lg(c, x - r, y - r, x + r, y + r, [0, 'rgba(255,170,190,.75)', 0.35, 'rgba(255,250,200,.8)', 0.65, 'rgba(160,230,255,.8)', 1, 'rgba(200,170,255,.75)']); c.fill();
        c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1.2, s * 0.3); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(1, s * 0.14); c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(x, y); c.lineTo(P[2], P[3]); c.moveTo(x, y); c.lineTo(P[4], P[5]); c.stroke();
        // 三道彩色的光：往外散
        const cols = ['rgba(255,110,60,', 'rgba(255,225,74,', 'rgba(120,200,255,'];
        for (let k = 0; k < 3; k++) { const a = (k - 1) * 0.45 + (o.dir || 1) * 0, len = r * (2 + 0.3 * Math.sin(t * 3 + k)); c.strokeStyle = cols[k] + (0.28 + (o.flash || 0) * 0.4) + ')'; c.lineWidth = Math.max(1, s * 0.5); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(a) * len, y + Math.sin(a) * len); c.stroke(); }
        break;
      }
      case 'hole': {
        if (!o.on && !(o.lvl > 0.02)) break;
        o.lvl = lerp(o.lvl || 0, o.on ? 1 : 0, 0.04);
        const x = X(o.x), y = Y(o.y), R = o.R * s * o.lvl, rs = o.rs * s * 1.3 * o.lvl;
        // 吸積盤：一圈一圈往中間轉
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 5; k++) { const f = ((t * 0.35 + k / 5) % 1), rr = lerp(R * 0.55, rs * 1.2, f); c.strokeStyle = 'rgba(200,120,255,' + (0.35 * f).toFixed(2) + ')'; c.lineWidth = Math.max(1, s * 0.5 * (1 - f) + 1); c.beginPath(); c.ellipse(x, y, rr, rr * 0.42, -0.25, 0, TAU); c.stroke(); }
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = 'rgba(255,170,250,.25)'; c.setLineDash([s * 1.2, s * 1.6]); c.lineDashOffset = t * s * 6; c.lineWidth = Math.max(1, s * 0.25); c.beginPath(); c.arc(x, y, R * 0.92, 0, TAU); c.stroke(); c.setLineDash([]);
        c.fillStyle = rg(c, x, y, rs * 0.2, rs * 1.6, [0, '#000000', 0.55, '#05010a', 1, 'rgba(40,0,60,0)']); c.beginPath(); c.arc(x, y, rs * 1.6, 0, TAU); c.fill();
        c.strokeStyle = '#d8a0ff'; c.lineWidth = Math.max(1, s * 0.3); c.beginPath(); c.arc(x, y, rs, 0, TAU); c.stroke();
        c.restore();
        break;
      }
      case 'lift': {
        // 浮空晶石：吊在浮島底下的一顆紫水晶，往上打一道淡淡的光托著島
        if (o.hp <= 0) break;
        const x = X(o.x), y = Y(o.y + Math.sin(t * 2 + o.ph) * 0.15), r = o.r * s;
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = lg(c, 0, y - r * 2.6, 0, y, [0, 'rgba(200,150,255,0)', 1, 'rgba(200,150,255,' + (0.3 + 0.1 * Math.sin(t * 3 + o.ph)) + ')']); c.fillRect(x - r * 0.7, y - r * 2.6, r * 1.4, r * 2.6);
        c.globalAlpha = 0.55 + (o.flash || 0) * 0.45; const g = glowSprite(C_PURPLE); c.drawImage(g, x - r * 2, y - r * 2, r * 4, r * 4); c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
        poly(c, [x, y - r * 1.15, x + r * 0.62, y - r * 0.15, x + r * 0.3, y + r * 1.1, x - r * 0.3, y + r * 1.1, x - r * 0.62, y - r * 0.15]);
        c.fillStyle = lg(c, x - r, y - r, x + r, y + r, [0, '#f2e2ff', 0.4, '#b27aff', 1, '#5a2aa8']); c.fill(); c.strokeStyle = o.flash > 0 ? '#ffffff' : '#2a0a5a'; c.lineWidth = Math.max(1.2, s * 0.26); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1, s * 0.14); c.beginPath(); c.moveTo(x - r * 0.62, y - r * 0.15); c.lineTo(x + r * 0.1, y - r * 0.05); c.lineTo(x, y - r * 1.15); c.stroke();
        if (o.hp < o.hm) { const bw = r * 2, bh = Math.max(2.5, s * 0.45), bx = x - bw / 2, by = y + r * 1.4; c.fillStyle = 'rgba(10,8,20,.75)'; c.fillRect(bx - 1, by - 1, bw + 2, bh + 2); c.fillStyle = o.side === 1 ? '#ffc93c' : '#7fc0ff'; c.fillRect(bx, by, bw * clamp(o.hp / o.hm, 0, 1), bh); }
        break;
      }
    }
  }
}
// 砲彈身上的放大效果：結霜（冰藍）、帶電（黃色電光）、加速過（白色尾巴）、滾地（揚起沙塵）
function drawShotFx(c) {
  const n = SH.n, s = V.s; if (!n) return;
  c.globalCompositeOperation = 'lighter';
  const gi = glowSprite(C_ICE), gy = glowSprite(C_YELLOW);
  for (let i = 0; i < n; i++) {
    const f = SH.flag[i]; if (!(f & (F_FROST | F_ZAPC))) continue;
    const x = X(SH.x[i]), y = Y(SH.y[i]), r = s * 1.6;
    if (f & F_FROST) c.drawImage(gi, x - r, y - r, r * 2, r * 2);
    if (f & F_ZAPC) { c.drawImage(gy, x - r, y - r, r * 2, r * 2); if ((RD.frame + i) % 3 === 0) { c.strokeStyle = 'rgba(255,250,200,.9)'; c.lineWidth = Math.max(1, s * 0.15); c.beginPath(); c.moveTo(x, y); c.lineTo(x + rndS() * s * 2.4, y + rndS() * s * 2.4); c.stroke(); } }
  }
  c.globalCompositeOperation = 'source-over';
  if (!FX.low) for (let i = RD.frame % 3; i < n; i += 3) if (SH.flag[i] & F_ROLL) part(P_DUST, SH.x[i] + rndS(), SH.y[i] - 0.4, -SH.vx[i] * 0.1 + rndS() * 2, 1 + Math.random() * 2, 0.5, 1.1, C_SAND);
}
/* ---------- 魔王：預告的招式、破綻、說話的泡泡 ---------- */
const BOSS_ICON = { barrage: '⚔', orb: '●', meteor: '☄', summon: '☠' };
function drawBossUI(c, t) {
  if (!S.boss || S.state !== 'play') return;
  const bu = bossUnit(); if (!bu || !bu.alive) return;
  const s = V.s, B = S.boss, x = X(bu.x), top = Y(bu.y + bu.bh + 4.2);
  // 這一回合預告的招：頭上一個小牌子（他打完這一輪就收起來）
  if (B.next && !(S.turn === 1 && (S.phase === 'resolve' || S.phase === 'hazard'))) {
    const txt = '預告：' + BOSS_MOVES[B.next], fz = Math.max(10, s * 2.1); c.font = F_ZH.replace('1px', fz + 'px');
    const tw = c.measureText(txt).width + fz * 2.2, bob = Math.sin(t * 3) * s * 0.3, by = top - fz * 1.2 + bob;
    c.fillStyle = 'rgba(30,6,40,.88)'; rrect(c, x - tw / 2, by - fz * 0.8, tw, fz * 1.6, fz * 0.5); c.fill();
    c.strokeStyle = B.next === 'meteor' ? '#ff8a4a' : B.next === 'orb' ? '#ff6ad0' : B.next === 'summon' ? '#b8ff9a' : '#ffd34a'; c.lineWidth = Math.max(1.5, s * 0.3); c.stroke();
    c.fillStyle = c.strokeStyle; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((BOSS_ICON[B.next] || '') + ' ' + txt, x, by + fz * 0.05);
  }
  // 破綻：一圈一圈往裡縮的金色準星
  if (B.tired) {
    const r = s * (4.2 + 0.8 * Math.sin(t * 6)), y = Y(bu.y + bu.bh * 0.55);
    c.strokeStyle = 'rgba(255,225,74,.9)'; c.lineWidth = Math.max(1.5, s * 0.35); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + t; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); c.lineTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25); c.stroke(); }
    const fz = Math.max(10, s * 2.2); c.font = F_ZH.replace('1px', fz + 'px'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = fz * 0.22; c.strokeStyle = 'rgba(16,10,26,.9)'; c.strokeText('破綻 ×2', x, y - r - fz * 0.7); c.fillStyle = '#ffe14a'; c.fillText('破綻 ×2', x, y - r - fz * 0.7);
  }
}
// 說話的泡泡（魔王）：跟著說話的人，幾秒後淡掉
function drawBubbles(c) {
  const s = V.s, L = FX.bubbles; if (!L || !L.length) return;
  for (let i = L.length - 1; i >= 0; i--) {
    const b = L[i]; b.t += RD.dt || 0.016; if (b.t > b.max) { L.splice(i, 1); continue; }
    const bu = b.who && b.who.alive ? b.who : null, wx = bu ? bu.x : b.x, wy = bu ? bu.y + bu.bh + 7.4 : b.y;
    const fz = Math.max(11, s * 2.3); c.font = F_ZH.replace('1px', fz + 'px');
    const tw = c.measureText(b.txt).width + fz * 1.4, th = fz * 1.7, a = b.t < 0.15 ? b.t / 0.15 : b.t > b.max - 0.4 ? (b.max - b.t) / 0.4 : 1;
    let x = clamp(X(wx), tw / 2 + 4, V.W - tw / 2 - 4), y = Math.max(V.hud + th, Y(wy) - th);
    c.globalAlpha = a; c.fillStyle = 'rgba(255,248,236,.96)'; rrect(c, x - tw / 2, y - th / 2, tw, th, fz * 0.6); c.fill();
    c.beginPath(); c.moveTo(x - fz * 0.4, y + th / 2 - 1); c.lineTo(x + fz * 0.1, y + th / 2 + fz * 0.7); c.lineTo(x + fz * 0.5, y + th / 2 - 1); c.closePath(); c.fill();
    c.strokeStyle = '#5a1640'; c.lineWidth = Math.max(1.5, s * 0.25); rrect(c, x - tw / 2, y - th / 2, tw, th, fz * 0.6); c.stroke();
    c.fillStyle = '#4a0e30'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.txt, x, y + fz * 0.05);
  }
  c.globalAlpha = 1;
}
/* ---------- 大鐘的共振：鐘的兩邊各一條弧，左藍（我方）右紅（敵軍），累積到滿就「噹」 ---------- */
function drawBellGauge(c, t) {
  const B = S.bell; if (!B || !B.e || !B.b.body) return;
  const s = V.s, p = B.b.body.getPosition(), x = X(p.x), y = Y(p.y), r = s * 5.6;
  for (let k = 0; k < 2; k++) {
    const e = B.e[k], a0 = k === 0 ? Math.PI * 0.6 : -Math.PI * 0.4, span = Math.PI * 0.8, dir = k === 0 ? 1 : -1;
    c.strokeStyle = 'rgba(10,8,20,.55)'; c.lineWidth = s * 0.9; c.beginPath(); c.arc(x, y, r, Math.min(a0, a0 + dir * span), Math.max(a0, a0 + dir * span)); c.stroke();
    if (e > 0.005) { const col = k === 0 ? '#7fc0ff' : '#ff8a6a'; c.strokeStyle = e > 0.8 ? (Math.sin(t * 12) > 0 ? '#ffffff' : col) : col; c.lineWidth = s * 0.55; c.beginPath(); const e0 = a0, e1 = a0 + dir * span * e; c.arc(x, y, r, Math.min(e0, e1), Math.max(e0, e1)); c.stroke(); }
  }
}
// 戰船中艙的火藥庫：船身上一扇小艙門、門後幾桶火藥；炸過的變成一個燒黑的大洞
function drawShipMag(c) {
  const s = V.s;
  for (const P of S.plats) {
    if (P.dead || P.kind !== 'ship' || !P.comps) continue;
    for (const cp of P.comps) {
      if (!cp.mag) continue;
      const q = polyCentroid(cp.pts), body = P.body, w = body.getWorldPoint({ x: q[0], y: q[1] + 0.6 }), a = body.getAngle();
      c.save(); c.translate(X(w.x), Y(w.y)); c.rotate(-a);
      if (cp.mag === 1) {
        c.fillStyle = '#1c120a'; rrect(c, -s * 1.5, -s * 1.1, s * 3, s * 2.2, s * 0.3); c.fill(); c.strokeStyle = '#8a6a3a'; c.lineWidth = Math.max(1, s * 0.22); c.stroke();
        for (let k = -1; k <= 1; k++) { c.fillStyle = '#6e4624'; c.fillRect(k * s * 0.85 - s * 0.35, -s * 0.7, s * 0.7, s * 1.5); c.fillStyle = '#1c1c24'; c.fillRect(k * s * 0.85 - s * 0.35, -s * 0.45, s * 0.7, s * 0.14); c.fillRect(k * s * 0.85 - s * 0.35, s * 0.45, s * 0.7, s * 0.14); }
        c.fillStyle = '#ffd34a'; c.font = '900 ' + Math.round(s * 1.2) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('火藥', 0, -s * 1.9);
      } else { c.fillStyle = '#0a0604'; ell(c, 0, 0, s * 2.2, s * 1.4); c.fill(); c.strokeStyle = 'rgba(255,120,40,.5)'; c.lineWidth = Math.max(1, s * 0.25); c.stroke(); }
      c.restore();
    }
  }
}
