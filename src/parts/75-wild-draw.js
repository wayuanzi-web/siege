/* ===== 75-wild-draw: 第四篇第二批的東西怎麼畫 —— 古樹的樹幹和樹冠、綁城的古藤、藤種、鼓樁、地道、流沙（模擬在 54-wild） ===== */

/* ---------- 樹幹（第二十一關的岩壁 A 畫成樹幹；70-render 的 drawRock 轉過來，畫進快取） ---------- */
function drawTrunk(c, st) {
  const s = V.s, cells = st.rock, R = mkRand(st.x0 * 7 + 3), has = new Set();
  let gx0 = 1e9, gx1 = -1e9, gy0 = 1e9, gy1 = -1e9;
  for (let i = 0; i < cells.length; i += 2) { const x = cells[i], y = cells[i + 1]; has.add(x + ',' + y); gx0 = Math.min(gx0, x); gx1 = Math.max(gx1, x + 1); gy0 = Math.min(gy0, y); gy1 = Math.max(gy1, y + 1); }
  const at = (x, y) => has.has(x + ',' + y), cx0 = st.x0 + gx0 * CS, cx1 = st.x0 + gx1 * CS;
  // 樹皮：每一格一塊，左右照整棵樹的寬度打光（左亮右暗），貼著外面的邊描深色的邊
  for (let i = 0; i < cells.length; i += 2) {
    const x = cells[i], y = cells[i + 1], wx = st.x0 + x * CS, wy = st.y0 + y * CS, px = X(wx), py = Y(wy + CS), w = CS * s + 0.6, h = CS * s + 0.6;
    c.fillStyle = lg(c, X(cx0), 0, X(cx1), 0, [0, '#8a6440', 0.3, '#6e4c2c', 0.7, '#553820', 1, '#3a2614']); c.fillRect(px - 0.3, py - 0.3, w, h);
    // 縱向的樹皮紋
    c.strokeStyle = 'rgba(30,18,8,.55)'; c.lineWidth = Math.max(1, s * 0.16);
    for (let k = 0; k < 3; k++) { const fx = (k + 0.3 + R() * 0.4) / 3; c.beginPath(); c.moveTo(px + w * fx, py); c.bezierCurveTo(px + w * (fx + (R() - 0.5) * 0.2), py + h * 0.35, px + w * (fx + (R() - 0.5) * 0.2), py + h * 0.65, px + w * fx, py + h); c.stroke(); }
    c.strokeStyle = 'rgba(200,160,110,.22)'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.moveTo(px + w * 0.15, py); c.lineTo(px + w * 0.15, py + h); c.stroke();
    if (R() < 0.25) { const kx = px + w * (0.3 + R() * 0.4), ky = py + h * (0.3 + R() * 0.4); ell(c, kx, ky, s * 0.6, s * 0.9); fs(c, '#3a2614', 'rgba(150,110,70,.6)', Math.max(1, s * 0.1)); }
    // 青苔
    if (R() < 0.35) { c.fillStyle = 'rgba(110,150,60,.55)'; ell(c, px + w * R(), py + h * R(), s * (0.6 + R() * 0.8), s * 0.45); c.fill(); }
    c.strokeStyle = '#22160a'; c.lineWidth = Math.max(1.5, s * 0.24); c.beginPath();
    if (!at(x - 1, y)) { c.moveTo(px, py); c.lineTo(px, py + h); }
    if (!at(x + 1, y)) { c.moveTo(px + w - 0.6, py); c.lineTo(px + w - 0.6, py + h); }
    if (!at(x, y + 1)) { c.moveTo(px, py); c.lineTo(px + w, py); }
    c.stroke();
  }
  // 樹根：最底下一排往兩邊攤開，插進土裡
  if (Math.abs(st.y0 + gy0 * CS) < 0.5) {
    const by = st.y0 + gy0 * CS;
    for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
      const bx = sd < 0 ? cx0 : cx1, L = 2.2 + k * 1.6 + R(), hh = 2.4 - k * 0.8;
      c.beginPath(); c.moveTo(X(bx - sd * 0.6), Y(by + hh)); c.quadraticCurveTo(X(bx + sd * L * 0.4), Y(by + hh * 0.4), X(bx + sd * L), Y(by - 0.1)); c.lineTo(X(bx - sd * 0.6), Y(by - 0.1)); c.closePath();
      fs(c, lg(c, 0, Y(by + hh), 0, Y(by), [0, '#6e4c2c', 1, '#3a2614']), '#22160a', Math.max(1, s * 0.18));
    }
  }
}
// 樹冠（畫在城樓後面，快取成一張圖）：一團一團的葉子，越外面越暗；古樹的樹冠在樹幹頂上，城的那棵往戰場那邊攤開罩著樹屋
function drawCanopies(c, t) {
  const s = V.s;
  for (const st of S.structs) {
    if (st.skinB !== 'grove' || !st.rock || !st.rock.length) continue;
    const key = V.T + '|' + V.s;
    if (!st._cn || st._cnKey !== key) {
      let gx0 = 1e9, gx1 = -1e9, gy1 = -1e9; for (let i = 0; i < st.rock.length; i += 2) { gx0 = Math.min(gx0, st.rock[i]); gx1 = Math.max(gx1, st.rock[i] + 1); gy1 = Math.max(gy1, st.rock[i + 1] + 1); }
      const tx0 = st.x0 + gx0 * CS, tx1 = st.x0 + gx1 * CS, top = st.y0 + gy1 * CS, mid = st.side === 2;
      const ccx = mid ? (tx0 + tx1) / 2 : (st.side === 0 ? tx1 + 5 : tx0 - 5), ccy = top + (mid ? 3.5 : 4.5), rw = mid ? 11 : 13, rh = mid ? 7 : 6.5;
      const pad = 2, wx0 = ccx - rw - 3, wy1 = ccy + rh + 3, W = Math.ceil((rw + 3) * 2 * s) + pad * 2, H = Math.ceil((rh + 3) * 2 * s + (ccy - top + 1) * s) + pad * 2;
      const cv = mkCanvas(W, H), k = cv.getContext('2d'), R = mkRand(st.x0 * 3 + 11), lx = (x) => (x - wx0) * s + pad, ly = (y) => (wy1 - y) * s + pad;
      // 從樹幹頂上伸出去的粗枝
      k.strokeStyle = '#4a3018'; k.lineCap = 'round';
      for (let n = 0; n < 4; n++) { const bx = (tx0 + tx1) / 2, ex = ccx + (R() - 0.5) * rw * 1.4, ey = ccy + (R() - 0.3) * rh; k.lineWidth = s * (0.9 - n * 0.12); k.beginPath(); k.moveTo(lx(bx), ly(top - 0.5)); k.quadraticCurveTo(lx((bx + ex) / 2), ly(top + 1.5), lx(ex), ly(ey)); k.stroke(); }
      // 葉團：先畫暗的大團，再疊亮的小團
      for (const [n, sz, cols] of [[16, 3.4, ['#2c4a1c', '#3a5a22']], [22, 2.6, ['#45702a', '#557e30']], [18, 1.8, ['#6a9a3a', '#82b048']]]) {
        for (let i = 0; i < n; i++) {
          const a = R() * TAU, rr = Math.sqrt(R()), x = ccx + Math.cos(a) * rr * rw, y = ccy + Math.sin(a) * rr * rh * (sz > 3 ? 1 : 0.85) + (sz < 2 ? rh * 0.25 : 0), r = sz * (0.7 + R() * 0.6);
          k.fillStyle = cols[i & 1]; k.beginPath(); k.arc(lx(x), ly(y), r * s, 0, TAU); k.fill();
        }
      }
      // 垂下來的氣根、藤
      k.strokeStyle = 'rgba(70,110,40,.8)'; k.lineWidth = Math.max(1, s * 0.16);
      for (let i = 0; i < 9; i++) { const x = ccx + (R() - 0.5) * rw * 1.6, y0 = ccy - rh * (0.3 + R() * 0.4), L = 2 + R() * 5; k.beginPath(); k.moveTo(lx(x), ly(y0)); k.quadraticCurveTo(lx(x + 0.4), ly(y0 - L / 2), lx(x - 0.2), ly(y0 - L)); k.stroke(); }
      st._cn = cv; st._cnKey = key; st._cnX = wx0; st._cnY = wy1; st._cnP = pad;
    }
    const sway = Math.sin(t * 0.8 + st.x0) * s * 0.08;
    c.drawImage(st._cn, Math.round(X(st._cnX) - st._cnP + sway), Math.round(Y(st._cnY) - st._cnP));
  }
}

/* ---------- 城樓後面 ---------- */
function drawWildBack(c, t) {
  if (S.lv.vines || S.structs.some((st) => st.skinB === 'grove')) drawCanopies(c, t);
}

/* ---------- 磚上面：古藤、藤種、鼓樁 ---------- */
function drawWildMid(c, t) {
  if (S.lv.vines) drawVines(c, t);
  for (const o of S.objs) {
    if (o.t === 'sprout' && o.hp > 0) drawSprout(c, o, t);
    else if (o.t === 'stake' && o.hp > 0) drawStake(c, o, t);
  }
}
// 古藤：每一個藤結畫兩三圈綠藤橫過接縫，一兩片葉子；斷了的畫一截垂下來的斷藤（燒斷的是黑的）
function drawVines(c, t) {
  const s = V.s;
  for (const w of S.welds) {
    if (!w.vine || w.a.dead || !w.a.body) continue;
    const p = vinePt(w), x = X(p.x), y = Y(p.y), A = w.a.body.getAngle(), horiz = Math.abs(w.la.y) > Math.abs(w.la.x);          // 接縫是橫的（上下兩塊）還是直的（左右兩塊）
    c.save(); c.translate(x, y); c.rotate(-A + (horiz ? 0 : Math.PI / 2));
    if (w.j) {
      const g = w.grow > 0 ? 1 : 0; if (w.grow > 0) w.grow = Math.max(0, w.grow - 0.02);
      c.strokeStyle = w.flash > 0 ? '#c8ff90' : '#3a6a1c'; c.lineWidth = Math.max(1.2, s * 0.26); c.lineCap = 'round';
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(k * s * 0.55 - s * 0.3, -s * 0.7); c.quadraticCurveTo(k * s * 0.55 + s * 0.45, 0, k * s * 0.55 - s * 0.3, s * 0.7); c.stroke(); }
      c.strokeStyle = 'rgba(160,220,100,.6)'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.moveTo(-s * 0.3, -s * 0.6); c.quadraticCurveTo(s * 0.4, 0, -s * 0.3, s * 0.6); c.stroke();
      c.fillStyle = '#5a9a30'; c.beginPath(); c.ellipse(s * 0.9, -s * 0.2, s * 0.45, s * 0.22, -0.5, 0, TAU); c.fill();
      if (g) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; const gl = glowSprite(C_GREEN), r = s * 2.2; c.drawImage(gl, -r, -r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
      if (w.flash > 0) w.flash = Math.max(0, w.flash - 0.08);
    } else {
      c.strokeStyle = w.burnt ? '#1a1410' : '#4a6a2a'; c.lineWidth = Math.max(1, s * 0.2); c.lineCap = 'round';
      c.beginPath(); c.moveTo(-s * 0.2, 0); c.quadraticCurveTo(s * 0.3, s * 0.5 + Math.sin(t * 2 + p.x) * s * 0.1, 0, s * 1.2); c.stroke();
    }
    c.restore();
  }
}
// 藤種：照長到第幾次，從一棵小芽、到爬滿那塊磚的粗藤（帶刺）
function drawSprout(c, o, t) {
  const s = V.s, b = o.host; if (!b || b.dead || !b.body) return;
  const p = b.body.getPosition(), A = b.body.getAngle(), hw = b.w / 2 * s, hh = b.h / 2 * s, lv = o.lv;
  const q = b.body.getLocalPoint({ x: o.x, y: o.y }), qx = q.x * s, qy = -q.y * s;
  c.save(); c.translate(X(p.x), Y(p.y)); c.rotate(-A);
  c.lineCap = 'round';
  if (lv >= 1) {
    const n = lv === 1 ? 3 : 6, R = mkRand(o.a * 1000 | 0);
    c.strokeStyle = o.side ? '#6a3a5a' : '#2e5a18'; c.lineWidth = Math.max(1.2, s * (0.22 + lv * 0.08));
    for (let k = 0; k < n; k++) {
      const ex = (R() - 0.5) * 2 * hw * (lv === 1 ? 0.7 : 1.05), ey = (R() - 0.5) * 2 * hh * (lv === 1 ? 0.7 : 1.05);
      c.beginPath(); c.moveTo(qx, qy); c.bezierCurveTo(qx + (ex - qx) * 0.3 + (R() - 0.5) * s * 2, qy + (ey - qy) * 0.3 + (R() - 0.5) * s * 2, ex + (R() - 0.5) * s, ey + (R() - 0.5) * s, ex, ey); c.stroke();
      c.fillStyle = o.side ? '#a85a8a' : '#5aa030'; c.beginPath(); c.ellipse(ex, ey, s * 0.45, s * 0.22, R() * 3, 0, TAU); c.fill();
      if (lv >= 2) { c.strokeStyle = '#d8d0a0'; c.lineWidth = Math.max(1, s * 0.08); c.beginPath(); c.moveTo((qx + ex) / 2, (qy + ey) / 2); c.lineTo((qx + ex) / 2 + s * 0.35, (qy + ey) / 2 - s * 0.35); c.stroke(); c.strokeStyle = o.side ? '#6a3a5a' : '#2e5a18'; c.lineWidth = Math.max(1.2, s * (0.22 + lv * 0.08)); }
    }
  }
  // 種子和芽
  ell(c, qx, qy, s * 0.55, s * 0.42); fs(c, o.side ? '#c86aa0' : '#7ac84a', '#1a3a08', Math.max(1, s * 0.1));
  const sw = Math.sin(t * 3 + o.a) * 0.2; c.strokeStyle = '#3a7a1c'; c.lineWidth = Math.max(1, s * 0.14); c.beginPath(); c.moveTo(qx, qy - s * 0.3); c.quadraticCurveTo(qx + s * 0.2, qy - s * 1.0, qx + s * sw * 2, qy - s * 1.5); c.stroke();
  c.fillStyle = '#8ae060'; c.beginPath(); c.ellipse(qx + s * sw * 2 + s * 0.35, qy - s * 1.5, s * 0.4, s * 0.2, -0.4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(qx + s * sw * 2 - s * 0.35, qy - s * 1.45, s * 0.36, s * 0.18, 0.4, 0, TAU); c.fill();
  if (o.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = o.flash; const gl = glowSprite(C_GREEN), r = s * 2.6; c.drawImage(gl, qx - r, qy - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  c.restore();
  // 長到第幾次（三格）
  const x = X(o.x), y = Y(o.y) - s * 2.4;
  for (let k = 0; k < 3; k++) { c.fillStyle = k < lv ? (o.side ? '#ff8ac0' : '#a8f070') : 'rgba(20,30,10,.55)'; c.beginPath(); c.arc(x + (k - 1) * s * 0.7, y, s * 0.24, 0, TAU); c.fill(); }
}
// 鼓樁：一根削尖的木樁斜插著，樁頭一面小鼓（隊色）；剛擂過鼓的抖一下
function drawStake(c, o, t) {
  const s = V.s, x = X(o.x), y = Y(o.y), dir = o.side === 0 ? 1 : -1, jig = o.beat ? Math.sin(t * 60) * s * 0.08 : 0;
  c.save(); c.translate(x + jig, y); c.rotate(dir * -0.5);
  c.fillStyle = lg(c, -s * 0.25, 0, s * 0.25, 0, [0, '#d8a466', 1, '#7a4e24']); c.beginPath(); c.moveTo(-s * 0.25, -s * 2.2); c.lineTo(s * 0.25, -s * 2.2); c.lineTo(s * 0.25, -s * 0.2); c.lineTo(0, s * 0.4); c.lineTo(-s * 0.25, -s * 0.2); c.closePath(); c.fill(); c.strokeStyle = '#3a2410'; c.lineWidth = Math.max(1, s * 0.1); c.stroke();
  rrect(c, -s * 0.75, -s * 3.2, s * 1.5, s * 1.1, s * 0.25); fs(c, o.side ? '#d8402e' : '#2e6ad8', '#2a1608', Math.max(1, s * 0.12));
  c.fillStyle = '#fff0d0'; c.fillRect(-s * 0.75, -s * 3.2, s * 1.5, s * 0.28);
  c.restore();
  if (o.hp < o.hm) { const k = clamp(o.hp / o.hm, 0, 1); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x - s * 0.8, y + s * 0.7, s * 1.6, s * 0.25); c.fillStyle = '#ffe08a'; c.fillRect(x - s * 0.8, y + s * 0.7, s * 1.6 * k, s * 0.25); }
}

/* ---------- 最前面：流沙、地道 ---------- */
function drawWildFront(c, t) {
  for (const o of S.objs) if (o.t === 'mole' && !o.dead) drawMole(c, o, t);
  if (S.sand) drawSand(c, t);
}
// 流沙：坑上面一片沙（蓋住陷進去的城腳、兵），沙面有細細的波紋，城牆邊沙往下漏
function drawSand(c, t) {
  const s = V.s, sy = Y(S.sand.y);
  for (const P of S.sand.pits) {
    const x0 = X(P.px0 - SAND_GAP - 0.3), x1 = X(P.px1 + SAND_GAP + 0.3), moving = !!P.mv;
    c.fillStyle = lg(c, 0, sy - s * 0.4, 0, V.H, [0, '#f2d79e', 0.06, '#e2bf7e', 0.35, '#c99c5c', 1, '#8a6232']); c.fillRect(x0, sy - s * 0.15, x1 - x0, V.H - sy + s * 0.2);
    // 沙面的波紋（慢慢往戰場中間流）
    c.strokeStyle = 'rgba(255,240,200,.45)'; c.lineWidth = Math.max(1, s * 0.12);
    for (let k = 0; k < 7; k++) { const y = sy + s * (0.6 + k * 0.9), ph = t * (moving ? 2.5 : 0.6) + k * 1.3; c.beginPath(); for (let x = x0; x <= x1; x += s * 1.2) { const yy = y + Math.sin((x - x0) / (s * 2.4) + ph) * s * 0.18; if (x === x0) c.moveTo(x, yy); else c.lineTo(x, yy); } c.stroke(); }
    // 陷了多深：沙面下一道暗線（城牆的影子）
    c.fillStyle = 'rgba(90,60,20,.25)'; c.fillRect(X(P.px0), sy, X(P.px1) - X(P.px0), s * 0.5);
    if (moving && !FX.low && (RD.frame & 1) === 0) for (const sd of [0, 1]) part(P_DUST, sd ? P.px1 : P.px0, S.sand.y + 0.2, rndS() * 2, 1 + Math.random() * 2, 0.6, 1.2, C_SAND);
  }
}
// 地道：還在挖的，地面上一道隆起的土（從落點到現在挖到哪），前面一團一直冒的土；挖到城底下的，城腳一道發紅的裂縫
function drawMole(c, o, t) {
  const s = V.s;
  if (o.st === 'dig') {
    const a = Math.min(o.sx, o.x), b = Math.max(o.sx, o.x);
    c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, s * 0.5); c.lineCap = 'round'; c.beginPath();
    for (let x = a; x <= b + 0.01; x += 0.6) { const gy = sandTop(x); if (gy < -100) continue; const yy = Y(gy + 0.18 + Math.sin(x * 2.3) * 0.06); if (x === a) c.moveTo(X(x), yy); else c.lineTo(X(x), yy); }
    c.stroke();
    const gy = sandTop(o.x); ell(c, X(o.x), Y(gy + 0.3), s * 0.9, s * 0.5); fs(c, '#9a744a', '#4a3018', Math.max(1, s * 0.12));
    if (!FX.low && (RD.frame & 3) === 0) part(P_DUST, o.x, gy + 0.4, rndS() * 4, 2 + Math.random() * 3, 0.5, 0.9, C_SAND);
  } else if (o.st === 'wait' || o.st === 'down') {
    const x = X(o.x), y = Y(o.y), p = 0.5 + 0.5 * Math.sin(t * 6);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.35 * p; const g = glowSprite(C_ORANGE), r = s * 2.2; c.drawImage(g, x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#2a1608'; c.lineWidth = Math.max(1, s * 0.16); c.beginPath(); c.moveTo(x - s * 1.2, y); c.lineTo(x - s * 0.4, y - s * 0.4); c.lineTo(x + s * 0.2, y + s * 0.1); c.lineTo(x + s * 1.1, y - s * 0.3); c.stroke();
  }
}
