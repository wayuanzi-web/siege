/* ===== 36-scene-volcano: 第四關「熔岩雙峰」— 暗紅的灰雲天、左右兩座淌著熔岩的遠峰、黑玄武岩尖稜，谷底一池熔岩湖 ===== */
THEMES[3] = (function () {
  let clouds = [], puffs = [], embers = [], flakes = [], bands = [], bubs = [], flows = [];
  let gDot = null, gGlow = null, gPuff = null, gBand = null, gHaze = null, gCrust = null;
  const LK = { on: false, a: 40, b: 72, y: -3.5, vents: [46, 56, 66] };      // 熔岩湖：谷底那段平地（on = 這一關的地形真的有）、地火口的位置
  // 兩座遠峰：峰頂 x、口緣高 h、左右坡寬 wl/wr、火口半寬 cw、火口深 cd、口緣左右的高低差 tilt、外側是哪一邊 out
  const PK = [{ x: 3, h: 42, wl: 27, wr: 35, cw: 2.2, cd: 1.4, tilt: -0.35, out: -1, n: null }, { x: 109, h: 44.5, wl: 37, wr: 27, cw: 2.5, cd: 1.6, tilt: 0.4, out: 1, n: null }];
  const FOOT = 4, LAKE_D = -9.6, WX0 = -36, WX1 = 148;      // 佈景一律在 WX0…WX1 這段戰場座標上生成，不管畫面多寬看到的都是同一幅
  const ss = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const cone = (u) => 0.58 * Math.exp(-u * 3.4) + 0.42 * Math.exp(-u * 0.95);
  // 遠峰的輪廓高度：凹的錐面，頂上一個缺口（火口）
  function peakY(p, x) {
    const dx = x - p.x, d = Math.abs(dx);
    if (d < p.cw) { const u = dx / p.cw; return p.h + p.tilt * u - p.cd * (1 - u * u); }
    const w = dx < 0 ? p.wl : p.wr, e = dx < 0 ? -p.tilt : p.tilt;
    return FOOT + (p.h + e - FOOT) * cone(d / w) / cone(p.cw / w) + (p.n ? p.n(x) * 0.6 * ss((d - p.cw - 1) / 8) : 0);
  }
  // 反過來：高度 y 的地方，山坡離峰頂多遠（熔岩流照這個比例往下淌，才會貼著山形）
  function flankD(p, dir, y) {
    const w = dir < 0 ? p.wl : p.wr, e = dir < 0 ? -p.tilt : p.tilt, k = (p.h + e - FOOT) / cone(p.cw / w);
    let a = p.cw, b = 220;
    for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (FOOT + k * cone(m / w) > y) a = m; else b = m; }
    return a;
  }
  // 一團橢圓的柔光
  function glow(c, wx, wy, rx, ry, st) { c.save(); c.translate(X(wx), Y(wy)); c.scale(rx * V.s, ry * V.s); c.fillStyle = rg(c, 0, 0, 0, 1, st); c.fillRect(-1, -1, 2, 2); c.restore(); }
  const soft = (col, a) => [0, rgba(col, a), 0.35, rgba(col, a * 0.8), 0.7, rgba(col, a * 0.3), 1, rgba(col, 0)];
  // 灰雲：幾個扁圓疊成一團，頂上暗、肚子被底下的火光照亮。畫在 (x, y) 為左上角、寬 w 高 h 的範圍裡（像素）
  function ashCloud(c, x, y, w, h, R, top, mid, bot) {
    const n = 4 + ((R() * 3) | 0);
    c.beginPath(); c.ellipse(x + w / 2, y + h * 0.56, w * 0.4, h * 0.2, 0, 0, TAU);
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, a = Math.sin(u * Math.PI), rb = h * (0.13 + 0.2 * a + R() * 0.06), bx = x + w * (0.1 + 0.8 * u) + (R() - 0.5) * w * 0.05, by = y + h * 0.97 - rb - h * 0.2 * (1 - a) * R();
      const rt = rb * (0.55 + R() * 0.25), tx = bx + (R() - 0.5) * rb * 1.2, ty = Math.max(y + rt + 1, by - rb * 0.6);
      c.moveTo(bx + rb * 1.5, by); c.ellipse(bx, by, rb * 1.5, rb, 0, 0, TAU); c.moveTo(tx + rt * 1.4, ty); c.ellipse(tx, ty, rt * 1.4, rt, 0, 0, TAU);
    }
    c.fillStyle = lg(c, 0, y, 0, y + h, [0, top, 0.45, mid, 0.72, mid, 1, bot]); c.fill();
  }
  // 一塊岩：底寬 w、高 h、頂寬 tw、頂往旁邊歪 lean，兩肩各一個折點。朝熔岩湖的那一面（dir）塗 lit，稜線描一道邊光 rim
  function crag(c, o, body, lit, rim) {
    const x = o.x, yb = o.yb, w = o.w, h = o.h, P = (a) => { const q = []; for (const p of a) q.push(X(p[0]), Y(p[1])); return q; };
    const tl = [x + o.lean - o.tw / 2, yb + h], tr = [x + o.lean + o.tw / 2, yb + h - o.sl], bl = [x - w / 2, yb], br = [x + w / 2, yb];
    const sl = [lerp(bl[0], tl[0], o.p) - o.kl * w, yb + h * o.p], sr = [lerp(br[0], tr[0], o.q) + o.kr * w, yb + h * o.q];
    if (rim) { c.beginPath(); c.moveTo(X(sl[0]), Y(sl[1])); c.lineTo(X(tl[0]), Y(tl[1])); c.lineTo(X(tr[0]), Y(tr[1])); c.lineTo(X(sr[0]), Y(sr[1])); c.strokeStyle = rim; c.lineWidth = Math.max(1.5, V.s * 0.32); c.lineJoin = 'round'; c.lineCap = 'butt'; c.stroke(); }
    poly(c, P([bl, sl, tl, tr, sr, br])); c.fillStyle = body; c.fill();
    if (lit) { const m = [lerp(tl[0], tr[0], o.m), lerp(tl[1], tr[1], o.m)], f = [x + o.lean * 0.35 + o.dir * w * 0.06, yb], kn = [lerp(m[0], f[0], 0.45) - o.dir * w * 0.05, yb + h * 0.55]; poly(c, P(o.dir > 0 ? [m, tr, sr, br, f, kn] : [m, tl, sl, bl, f, kn])); c.fillStyle = lit; c.fill(); }
  }
  const mkCrag = (R, x, yb, w, h) => ({ x, yb, w, h, tw: w * (0.08 + R() * 0.26), lean: (R() - 0.5) * w * 0.5, sl: (R() - 0.5) * w * 0.14, kl: R() * 0.15 - 0.05, kr: R() * 0.15 - 0.05, p: 0.3 + R() * 0.4, q: 0.3 + R() * 0.4, m: 0.2 + R() * 0.6, dir: x < 56 ? 1 : -1 });
  // 一排岩：env(x) 是岩頂大概多高（從 yb 算起），asp 是高寬比的上限。大岩後面常跟一根窄而高的、腳邊常有一塊碎石
  function cragRow(R, x0, x1, yb, env, wA, wB, gap, asp) {
    const out = [];
    for (let x = x0; x < x1;) {
      const w = wA + R() * (wB - wA), h = Math.min(env(x) * (0.5 + R() * 0.5), w * asp * (0.7 + R() * 0.5));
      out.push(mkCrag(R, x, yb, w, h));
      if (R() < 0.55) { const k = mkCrag(R, x + (R() - 0.5) * w * 0.5, yb, w * (0.38 + R() * 0.22), h * (1.12 + R() * 0.36)); k.tw *= 0.7; out.push(k); }
      if (R() < 0.5) out.push(mkCrag(R, x + (R() < 0.5 ? -1 : 1) * w * (0.36 + R() * 0.2), yb, w * (0.3 + R() * 0.2), h * (0.28 + R() * 0.22)));
      x += w * (gap + R() * 0.4);
    }
    return out.sort((a, b) => b.h - a.h);
  }
  // 遠處一座燒剩半截的塔（跟第一關山上那座塔同一個樣子，只是歪了、頂上斷了）
  function ruin(c, x, y, u, col) {
    c.save(); c.translate(x, y); c.rotate(-0.06); c.fillStyle = col;
    for (let k = 0; k < 3; k++) {
      const w = u * (2.6 - k * 0.42), yy = -k * u * 1.25;
      c.fillRect(-w * 0.36, yy - u * 1.25, w * 0.72, u * 1.26);
      c.beginPath(); c.moveTo(-w * 0.78, yy - u * 0.86); c.quadraticCurveTo(-w * 0.5, yy - u * 1.02, -w * 0.36, yy - u * 1.3); c.lineTo(w * 0.36, yy - u * 1.3); c.quadraticCurveTo(w * 0.5, yy - u * 1.02, w * 0.78, yy - u * 0.86); c.closePath(); c.fill();
    }
    poly(c, [-u * 0.5, -u * 3.74, -u * 0.5, -u * 4.6, -u * 0.22, -u * 4.25, u * 0.04, -u * 5.05, u * 0.3, -u * 4.4, u * 0.5, -u * 4.75, u * 0.5, -u * 3.74]); c.fill();
    c.restore();
  }
  // 燒焦的枯樹：一根歪歪的樹幹，往上分兩次岔
  function snag(c, R, x, y, h, col) {
    const s = V.s, br = (x0, y0, ang, len, w, d) => {
      const x1 = x0 + Math.sin(ang) * len, y1 = y0 + Math.cos(ang) * len, bend = (R() - 0.5) * 0.5;
      c.lineWidth = Math.max(1, w * s); c.beginPath(); c.moveTo(X(x0), Y(y0)); c.quadraticCurveTo(X(x0 + Math.sin(ang + bend) * len * 0.5), Y(y0 + Math.cos(ang + bend) * len * 0.5), X(x1), Y(y1)); c.stroke();
      if (d > 0) for (let k = 0; k < 2; k++) { const f = 0.4 + R() * 0.5; br(lerp(x0, x1, f), lerp(y0, y1, f), ang + (k ? 1 : -1) * (0.45 + R() * 0.5), len * (0.36 + R() * 0.26), w * 0.55, d - 1); }
    };
    c.strokeStyle = col; c.lineCap = 'round'; br(x, y, (R() - 0.5) * 0.35, h, h * 0.085, 2);
  }
  // 一道熔岩流（緞帶狀，尾巴收尖）：從高度 yA 淌到 yB，離峰頂的距離佔山坡寬的比例從 fA 變到 fB，貼著山形走。
  // 顏色照「離火口多遠」算，越往下越暗；par 是它分出來的那道主流（起點接在主流上）
  function stream(c, p, dir, yA, yB, fA, fB, ph, wid, a, par) {
    const pts = []; let off = 0;
    for (let y = yA; y >= yB - 0.01; y -= 0.5) {
      const u = (yA - y) / (yA - yB), x = p.x + dir * lerp(fA, fB, u * (0.55 + 0.45 * u)) * flankD(p, dir, Math.min(y, p.h - 0.02)) + (Math.sin(y * 0.36 + ph) * 0.8 + Math.sin(y * 0.83 + ph * 1.7) * 0.3) * Math.min(1, u * 3);
      if (par && !pts.length) { let b = par[0]; for (const q of par) if (Math.abs(q[1] - yA) < Math.abs(b[1] - yA)) b = q; off = b[0] - x; }
      pts.push([x + off * (1 - u) * (1 - u), y, wid * (1 - 0.45 * u) * Math.min(1, (1 - u) * 5)]);
    }
    const g = (st) => lg(c, 0, Y(p.h - p.cd * 0.8), 0, Y(8), st), rib = (k, st) => { c.beginPath(); for (const q of pts) c.lineTo(X(q[0] - q[2] * k), Y(q[1])); for (let i = pts.length - 1; i >= 0; i--) c.lineTo(X(pts[i][0] + pts[i][2] * k), Y(pts[i][1])); c.closePath(); c.fillStyle = g(st); c.fill(); };
    rib(1.9, [0, 'rgba(255,110,40,' + 0.24 * a + ')', 0.55, 'rgba(240,70,24,' + 0.15 * a + ')', 1, 'rgba(220,60,20,' + 0.04 * a + ')']);
    rib(0.5, [0, 'rgba(255,200,104,' + a + ')', 0.25, 'rgba(255,146,50,' + 0.95 * a + ')', 0.65, 'rgba(232,84,30,' + 0.7 * a + ')', 1, 'rgba(206,58,24,' + 0.3 * a + ')']);
    rib(0.2, [0, 'rgba(255,248,210,' + a + ')', 0.22, 'rgba(255,228,146,' + 0.75 * a + ')', 0.5, 'rgba(255,200,100,0)', 1, 'rgba(255,200,100,0)']);
    return pts;
  }
  // 熔岩湖的兩岸（越靠近畫面下緣越寬，岸線有點參差）
  const shore = (sd, y) => (sd < 0 ? LK.a : LK.b) + sd * ((LK.y - y) * 0.42 + 0.3 * Math.sin(y * 2.3 + sd) + 0.16 * Math.sin(y * 5.7 + sd * 2));
  // 找出谷底那段平的地（熔岩湖）和湖裡地火口的位置；地形沒有這樣一段的話就不畫湖
  function findLake() {
    let lo = 0, a = 0, b = 0;
    for (let x = 30; x <= 82; x += 0.25) lo = Math.min(lo, groundYRaw(x));
    for (let x = 30; x <= 82; x += 0.25) if (groundYRaw(x) <= lo + 0.02) { if (!a) a = x; b = x; }
    LK.on = lo < -0.5 && b - a >= 6; if (!LK.on) return;
    LK.a = a; LK.b = b; LK.y = lo;
    LK.vents = (S.lv && S.lv.objs ? S.lv.objs : []).filter((k) => k.t === 'geyser' && k.x > a + 2 && k.x < b - 2).map((k) => k.x);
  }
  // 浮在湖面的硬殼和地火口：獨立一張小圖，每幀蓋在湖面的亮帶上面
  function crustSprite(R) {
    const s = V.s, ox = LK.a - 4, oy = LK.y + 1.4, PX = (x) => (x - ox) * s, PY = (y) => (oy - y) * s;
    const cv = mkCanvas((LK.b - LK.a + 8) * s, (oy - LAKE_D) * s), g = cv.getContext('2d'); cv._x = ox; cv._y = oy;
    const plates = [];
    for (let k = 0; k < 260 && plates.length < 30; k++) {
      const y = LK.y - 0.75 - R() * (LK.y - 0.9 - LAKE_D), dep = (LK.y - y) / (LK.y - LAKE_D), xl = shore(-1, y), xr = shore(1, y), x = xl + R() * (xr - xl);
      const edge = Math.min(x - xl, xr - x), want = 0.16 + 0.84 * (1 - ss(edge / 9)); if (R() > want) continue;
      const rx = (0.9 + R() * 1.5) * (0.7 + dep * 0.9), ry = rx * (0.2 + R() * 0.1) * (0.8 + dep * 0.5);
      if (x - rx < xl + 0.3 || x + rx > xr - 0.3) continue;
      if (LK.vents.some((v) => Math.abs(x - v) < rx + 2.6 && y > LK.y - 1.9)) continue;
      if (plates.some((q) => Math.abs(q[0] - x) < (q[2] + rx) * 0.92 && Math.abs(q[1] - y) < (q[3] + ry) * 1.05)) continue;
      plates.push([x, y, rx, ry, R() * TAU, 5 + ((R() * 3) | 0)]);
    }
    for (const [x, y, rx, ry, ph, n] of plates) {
      const pt = []; for (let k = 0; k < n; k++) { const a = ph + (k + (R() - 0.5) * 0.6) * TAU / n, m = 0.78 + R() * 0.3; pt.push(PX(x + Math.cos(a) * rx * m), PY(y + Math.sin(a) * ry * m)); }
      g.lineJoin = 'round'; poly(g, pt); g.strokeStyle = 'rgba(255,238,170,.9)'; g.lineWidth = Math.max(1.5, s * 0.26); g.stroke();
      g.fillStyle = lg(g, 0, PY(y + ry), 0, PY(y - ry), [0, '#5a2018', 1, '#2c1014']); g.fill();
      g.strokeStyle = 'rgba(150,60,30,.6)'; g.lineWidth = Math.max(1, s * 0.1); g.beginPath(); g.moveTo(pt[0], pt[1]); g.lineTo(pt[2], pt[3]); g.stroke();
    }
    // 地火口：一小圈噴濺堆起來的黑殼，口子裡是白熱的
    for (const v of LK.vents) {
      const y = LK.y, bx = PX(v);
      g.fillStyle = 'rgba(255,240,170,.95)'; ell(g, bx, PY(y - 0.75), s * 2.9, s * 0.62); g.fill();
      g.beginPath(); g.moveTo(PX(v - 2.6), PY(y - 0.9)); g.quadraticCurveTo(PX(v - 1.7), PY(y - 0.2), PX(v - 1.15), PY(y + 0.5)); g.lineTo(PX(v + 1.15), PY(y + 0.5)); g.quadraticCurveTo(PX(v + 1.7), PY(y - 0.2), PX(v + 2.6), PY(y - 0.9)); g.quadraticCurveTo(bx, PY(y - 1.5), PX(v - 2.6), PY(y - 0.9)); g.closePath();
      g.fillStyle = lg(g, 0, PY(y + 0.5), 0, PY(y - 1.3), [0, '#3a1616', 1, '#1e0c10']); g.fill();
      g.fillStyle = '#ff9a34'; ell(g, bx, PY(y + 0.45), s * 1.15, s * 0.26); g.fill();
      g.fillStyle = '#fff2b8'; ell(g, bx, PY(y + 0.43), s * 0.8, s * 0.15); g.fill();
      g.strokeStyle = 'rgba(255,140,50,.85)'; g.lineWidth = Math.max(1, s * 0.13); g.lineCap = 'round';
      for (const dx of [-0.9, 0.2, 1.0]) { g.beginPath(); g.moveTo(PX(v + dx * 0.9), PY(y + 0.3)); g.lineTo(PX(v + dx * 1.3), PY(y - 0.25)); g.lineTo(PX(v + dx * 1.2 + 0.2), PY(y - 0.7)); g.stroke(); }
    }
    return cv;
  }
  function spawnEmber(e, warm) {
    const lake = LK.on && Math.random() < 0.68;
    e.x = lake ? LK.a + Math.random() * (LK.b - LK.a) : V.x0 + Math.random() * (V.x1 - V.x0);
    e.y = lake ? LK.y - Math.random() * 1.2 : groundYRaw(e.x) - Math.random() * 0.6;
    e.vy = 2.6 + Math.random() * 5; e.vx = (Math.random() - 0.5) * 2.4; e.max = 2.4 + Math.random() * 4.2; e.r = 0.3 + Math.random() * 0.34; e.p = Math.random() * TAU;
    e.t = warm ? Math.random() * e.max : 0; e.y += e.vy * e.t; e.x += e.vx * e.t;
  }
  return {
    key: 'volcano',
    build(c, W, H) {
      const s = V.s, top = V.top, xa = WX0, xb = WX1, sp = (y) => clamp(1 - y / top, 0, 1);
      let R = mkRand(404);
      for (const p of PK) p.n = ridgeFn(R, 0.42);
      flows = []; findLake();
      // 天空：上面是暗的炭紅，越靠地平線越亮
      c.fillStyle = lg(c, 0, 0, 0, Y(0), [0, '#180b13', sp(66), '#1b0c15', sp(56), '#200e18', sp(46), '#2c131c', sp(36), '#411c20', sp(26), '#532621', sp(16), '#693022', sp(8), '#8c4625', sp(3), '#b2622c', 1, '#d07a33']); c.fillRect(0, 0, W, H);
      // 橫在半空的幾道薄煙
      for (let k = 0; k < 9; k++) { const y = 13 + R() * 26, dk = k & 1; glow(c, xa + R() * (xb - xa), y, 26 + R() * 22, 1.2 + R() * 1.6, dk ? [0, 'rgba(24,8,16,.2)', 1, 'rgba(24,8,16,0)'] : [0, 'rgba(214,104,54,.13)', 1, 'rgba(214,104,54,0)']); }
      // 高空的灰雲（靜態）：一朵一朵錯開，越高越大越暗
      for (let y = 48, row = 0; y < top + 14; y += 6.5, row++) {
        const u = clamp((y - 48) / 28, 0, 1); R = mkRand(411 + row * 7);
        for (let x = xa - 20 + (row & 1) * 17 + R() * 10; x < xb; x += 30 + R() * 22) {
          const w = 30 + R() * 18 + u * 10, h = w * (0.24 + R() * 0.06), yy = y + R() * 4, Rc = mkRand((R() * 1e6) | 0);
          if (x + w > V.x0 && x < V.x1) ashCloud(c, X(x), Y(yy), w * s, h * s, Rc, mix('#241119', '#160a11', u), mix('#2e151c', '#1c0d14', u), mix('#5c281f', '#30151a', u));
        }
      }
      // 兩座火山口映在天上的火光
      c.globalCompositeOperation = 'lighter';
      glow(c, PK[0].x, 37, 38, 32, [0, 'rgba(255,92,40,.34)', 0.5, 'rgba(232,60,30,.13)', 1, 'rgba(200,40,20,0)']);
      glow(c, PK[1].x, 39, 42, 36, [0, 'rgba(255,110,48,.4)', 0.5, 'rgba(240,70,30,.16)', 1, 'rgba(200,40,20,0)']);
      c.globalCompositeOperation = 'source-over';
      // 遠峰
      for (const p of PK) {
        R = mkRand(420 + p.x);
        const o = p.out, y0 = p.h - p.cd * 0.8, trace = () => { c.beginPath(); c.moveTo(X(xa), V.H); for (let x = xa; x <= xb; x += 0.25) c.lineTo(X(x), Y(peakY(p, x))); c.lineTo(X(xb), V.H); c.closePath(); };
        glow(c, p.x, p.h - 0.6, 5, 4.4, [0, 'rgba(255,244,196,1)', 0.25, 'rgba(255,196,96,.92)', 0.6, 'rgba(255,120,40,.4)', 1, 'rgba(255,90,30,0)']);
        trace(); c.fillStyle = lg(c, 0, Y(p.h), 0, Y(FOOT), [0, '#44202b', 0.4, '#5c2b2c', 1, '#753a2a']); c.fill();
        // 右半邊在暗處：沿著一道稜線切開，暗面再壓深一點
        c.save(); trace(); c.clip(); c.beginPath(); c.moveTo(X(p.x + 0.4), Y(p.h + 2));
        for (let y = p.h - p.cd; y >= FOOT - 1; y -= 1.5) c.lineTo(X(p.x + (0.1 + 0.16 * ss((p.h - y) / 30)) * flankD(p, 1, Math.min(y, p.h - 0.02)) + Math.sin(y * 0.5 + p.x) * 0.5), Y(y));
        c.lineTo(X(p.x + 90), Y(FOOT - 1)); c.lineTo(X(p.x + 90), Y(p.h + 2)); c.closePath(); c.fillStyle = lg(c, 0, Y(p.h), 0, Y(FOOT), [0, 'rgba(28,8,24,.34)', 1, 'rgba(28,8,24,.08)']); c.fill();
        // 山坡的溝紋
        c.strokeStyle = 'rgba(34,10,22,.14)'; c.lineWidth = Math.max(1, s * 0.3); c.lineCap = 'round';
        for (let k = 0; k < 8; k++) { const dir = k & 1 ? 1 : -1, f = 0.2 + R() * 0.7, ya = p.h - 3 - R() * 6, yz = FOOT + 3 + R() * 6; c.beginPath(); for (let y = ya; y >= yz; y -= 1) c.lineTo(X(p.x + dir * f * flankD(p, dir, y) + Math.sin(y * 0.4 + k) * 0.4), Y(y)); c.stroke(); }
        c.restore();
        // 口緣被火光照亮
        c.globalCompositeOperation = 'lighter'; glow(c, p.x, p.h, 8, 6.5, [0, 'rgba(255,130,50,.5)', 0.4, 'rgba(240,80,30,.18)', 1, 'rgba(200,50,20,0)']); c.globalCompositeOperation = 'source-over';
        // 熔岩流：外側一道主流、半路分一道岔出去，內側一道
        const main = stream(c, p, o, y0, 9.5, 0.1, 0.46, 1.3 + p.x, 0.55, 1); flows.push(main);
        stream(c, p, o, y0 - (o < 0 ? 11 : 8), o < 0 ? 16 : 13, 0.2, o < 0 ? 0.84 : 0.72, 2.9 + p.x, 0.36, 0.85, main);
        stream(c, p, -o, y0, 12, 0.3, o < 0 ? 0.2 : 0.36, 4.1 + p.x, 0.44, 0.9);
        // 火口冒的煙柱（靜態的那部分）：一串越來越大的圓，越高越往外側歪；靠火口的地方被照成暗橘色
        const bl = [];
        for (let t = 0.2, r = 1; t - r < top - p.h + 4 && bl.length < 60; t += r * (0.3 + R() * 0.16)) { r = 0.95 + t * 0.24; bl.push([p.x + p.tilt * 0.5 + o * (0.42 * t + 0.014 * t * t) + (R() - 0.5) * r * 1.3, p.h + t, r * (0.75 + R() * 0.4)]); }
        c.beginPath(); for (const b of bl) { c.moveTo(X(b[0]) + b[2] * s, Y(b[1])); c.arc(X(b[0]), Y(b[1]), b[2] * s, 0, TAU); }
        c.fillStyle = lg(c, 0, Y(p.h), 0, Y(p.h + 24), [0, '#c05c2c', 0.1, '#84382a', 0.34, '#40201f', 1, '#1d0e16']); c.fill();
        c.beginPath(); for (const b of bl) { const r = b[2] * s * 0.7; c.moveTo(X(b[0] + o * b[2] * 0.22) + r, Y(b[1] + b[2] * 0.28)); c.arc(X(b[0] + o * b[2] * 0.22), Y(b[1] + b[2] * 0.28), r, 0, TAU); }
        c.fillStyle = 'rgba(24,9,18,.26)'; c.fill();
      }
      // 兩峰之間更遠的一道矮山，山上一座燒剩半截的塔
      R = mkRand(441);
      const far = ridgeFn(R, 0.085);
      ruin(c, X(63), Y(10.5 + 2.4 * far(63) - 0.3), s * 1.1, '#552728');
      ridge(c, far, 10.5, 2.4, lg(c, 0, Y(13), 0, Y(3), [0, '#532526', 1, '#733b28']));
      // 中景：暗紅的岩稜（大塊、扁）
      const e1 = (x) => 8.6 + 9 * ss((Math.abs(x - 56) - 14) / 34), e2 = (x) => 7 + 12 * ss((Math.abs(x - 56) - 12) / 24);
      const g1 = lg(c, 0, Y(15), 0, Y(-2), [0, '#38171f', 0.6, '#4b2020', 1, '#8a4020']), lit1 = lg(c, 0, Y(15), 0, Y(-2), [0, 'rgba(150,66,40,.14)', 0.6, 'rgba(190,84,42,.18)', 1, 'rgba(232,112,44,.32)']);
      for (const k of cragRow(R, xa, xb, -2, e1, 8, 16, 0.55, 0.95)) crag(c, k, g1, lit1, 'rgba(176,86,44,.5)');
      // 熔岩湖往上映的光
      c.globalCompositeOperation = 'lighter';
      if (LK.on) glow(c, (LK.a + LK.b) / 2, LK.y, 25, 11.5, [0, 'rgba(255,170,70,.4)', 0.45, 'rgba(255,110,40,.16)', 1, 'rgba(255,80,30,0)']);
      c.globalCompositeOperation = 'source-over';
      // 近一層：幾乎全黑的玄武岩，朝熔岩湖的那一面帶一點暖光，稜線上一道邊光；兩側各立幾叢尖石柱
      const g2 = lg(c, 0, Y(16), 0, Y(-5), [0, '#170c15', 0.6, '#22111a', 1, '#32161a']), lit2 = lg(c, 0, Y(14), 0, Y(-4), [0, 'rgba(120,52,34,.22)', 1, 'rgba(226,96,36,.5)']), lit2f = lg(c, 0, Y(14), 0, Y(-4), [0, 'rgba(104,44,36,.16)', 1, 'rgba(160,66,36,.3)']);
      // 先鋪一道連續的矮稜當底，尖岩立在上面
      c.beginPath(); c.moveTo(X(xa), V.H);
      for (let x = xa, up = 0; x < xb; x += 1.6 + R() * 2.6, up ^= 1) c.lineTo(X(x), Y(-5 + e2(x) * (0.2 + 0.14 * up + 0.12 * R()) * lerp(0.62, 1.15, ss((Math.abs(x - 56) - 16) / 12))));
      c.lineTo(X(xb), V.H); c.closePath(); c.strokeStyle = 'rgba(214,104,44,.6)'; c.lineWidth = Math.max(1.5, s * 0.3); c.lineJoin = 'round'; c.stroke(); c.fillStyle = g2; c.fill();
      const row2 = cragRow(R, xa, xb, -5, e2, 4.5, 10, 0.5, 1.45);
      for (const [x, h] of [[-22, 24], [-6.5, 21], [113.5, 20], [127, 23]]) for (const [dx, w, k, ln] of [[0, 4.2, 1, 0.5], [-2.2, 3.4, 0.78, -0.7], [2, 3.2, 0.6, 0.9], [-0.6, 5.4, 0.38, 0.2]]) { const q = mkCrag(R, x + dx, -5, w, h * k); q.tw = w * 0.12; q.lean = ln * (x < 56 ? 1 : -1); row2.push(q); }
      for (const k of row2.sort((a, b) => b.h - a.h)) crag(c, k, g2, Math.abs(k.x - 56) < 26 ? lit2 : lit2f, 'rgba(214,104,44,.8)');
      // 幾棵燒焦的枯樹，站在地面上（腳會被地面蓋住）
      for (const [x, h] of [[-21, 5.4], [-13.5, 6.2], [-5.6, 4.6], [112.4, 5], [119.6, 6.4], [130, 5.6]]) snag(c, R, x, groundYRaw(x) - 0.3, h + 0.3, '#1c0e16');
      c.globalCompositeOperation = 'lighter';
      if (LK.on) glow(c, (LK.a + LK.b) / 2, LK.y - 0.5, 22, 8, [0, 'rgba(255,190,90,.5)', 0.5, 'rgba(255,120,40,.18)', 1, 'rgba(255,80,30,0)']);
      c.globalCompositeOperation = 'source-over';
      // 城樓背後被熔岩照亮的煙：一團團柔光疊起來，外圈橘、裡面淡金。敵城是暗色的，背後要夠亮；我方的城淺，背後暗一點、紅一點。
      // 全是柔邊的光，所以先畫在 1/4 大小的小圖上再放大貼回來，省很多時間
      R = mkRand(447);
      const sm = mkCanvas(W / 4, H / 4), g = sm.getContext('2d'); g.scale(sm.width / W, sm.height / H);
      const smoke = (cx, col, a, k) => { for (const [y, hw, r] of [[1, 17, 11], [11, 16, 11], [21, 15, 10.5], [30, 12.5, 9.5], [38, 10, 9], [45, 7, 8]]) for (let x = -hw * k; x <= hw * k + 0.1; x += 7.5 * k) { const q = r * (0.85 + R() * 0.35) * (0.5 + 0.5 * k); glow(g, cx + x + Math.sin(y * 0.11 + cx) * 2.2 + (R() - 0.5) * 3.5, y + (R() - 0.5) * 4, q, q, soft(col, a)); } };
      smoke(93.5, '#f0782c', 0.34, 1.14); smoke(93.5, '#ffb866', 0.42, 0.9); smoke(18.5, '#b8452a', 0.2, 1);
      // 煙的邊緣鼓出幾團，才不會像一根直直的光柱；敵城右上角（右峰的暗坡就在後面）也補上
      for (const [x, y, r, a] of [[79, 27, 6, 0.3], [73.5, 13, 8.5, 0.3], [83, 46, 6, 0.26], [70.5, 3, 9, 0.3], [113, 12, 9, 0.3], [116, 2, 9, 0.3], [103.5, 38, 7.5, 0.5], [106, 30, 7, 0.5], [100, 43, 6.5, 0.5]]) glow(g, x, y, r, r, soft(a < 0.4 ? '#f28a3a' : '#ffb866', a));
      c.drawImage(sm, 0, 0, W, H);
      // 煙裡幾團往上翻的煙頭（頂上被照亮、往下淡掉），讓那片光看得出是煙
      for (const [x, y, w, h, al] of [[68, 9, 18, 7.5, 0.17], [72, 22, 17, 7, 0.17], [77, 36, 18, 7.5, 0.15], [86, 50, 20, 8, 0.12], [98, 46, 18, 7.5, 0.14], [104, 31, 19, 8, 0.14], [106, 15, 20, 8, 0.15]]) {
        c.save(); c.translate(X(x), Y(y)); c.scale(1, -1);
        ashCloud(c, 0, -h * s, w * s, h * s, R, 'rgba(244,150,70,0)', 'rgba(248,166,84,' + al * 0.5 + ')', 'rgba(255,214,150,' + al * 1.6 + ')');
        c.restore();
      }
    },
    terrain(c) {
      const R = mkRand(505), s = V.s; findLake();
      const mid = (LK.a + LK.b) / 2, heat = (x) => 1 - ss((Math.abs(x - mid) - (LK.b - LK.a) / 2) / 26);
      const runs = groundRuns(), solid = (x) => runs.some((r) => x > r[0] && x < r[1]) && (!LK.on || x < LK.a || x > LK.b);
      for (const [xa, xb] of runs) {
        // 玄武岩：越往下越暗
        c.beginPath(); traceGround(c, xa, xb, 0, true); c.lineTo(X(xb), V.H + 4); c.lineTo(X(xa), V.H + 4); c.closePath();
        c.fillStyle = lg(c, 0, Y(1), 0, V.H, [0, '#34191c', 0.4, '#241217', 1, '#160b11']); c.fill();
        // 表面一層燒紅的殼（外暗內亮三層），離熔岩湖越近越亮
        const hg = (far, near) => lg(c, X(mid - 60), 0, X(mid + 60), 0, [0, far, 0.3, far, 0.5 - (LK.b - LK.a) / 240, near, 0.5 + (LK.b - LK.a) / 240, near, 0.7, far, 1, far]);
        for (const [h, far, near] of [[1.9, '#4a1a16', '#7e2414'], [1.1, '#7a2a18', '#cf4a1a'], [0.5, '#b04a20', '#ff9a34']]) { c.beginPath(); traceGround(c, xa, xb, 0, true); traceGroundBack(c, xa, xb, -h); c.closePath(); c.fillStyle = hg(far, near); c.fill(); }
        c.beginPath(); traceGround(c, xa, xb, 0, true); c.strokeStyle = '#1c0a0d'; c.lineWidth = Math.max(1.5, s * 0.22); c.lineJoin = 'round'; c.stroke();
      }
      // 岩層的紋理：幾道淡淡的橫紋
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(86,40,38,.3)'; c.lineWidth = Math.max(1, s * 0.22);
      for (let k = 0; k < 15; k++) { const x = WX0 + R() * (WX1 - WX0), y = groundYRaw(x) - 3.2 - R() * 4.6, w = 5 + R() * 9, b = 0.5 + R() * 0.5, e = (R() - 0.5) * 0.6; if (!solid(x - 4) || !solid(x + w + 4)) continue; c.beginPath(); c.moveTo(X(x), Y(y)); c.quadraticCurveTo(X(x + w * 0.5), Y(y - b), X(x + w), Y(y + e)); c.stroke(); }
      // 岩層裡發亮的裂縫：從表面那層熱殼往下鑽，細細的、會分岔，離熔岩湖越近越亮
      const veins = [], vein = (px, py, ang, n, h) => {
        const pts = [[px, py]]; let fork = -1;
        for (let k = 0; k < n; k++) { ang = clamp(ang + (R() - 0.5) * 1.5, -1.15, 1.15); const l = 0.45 + R() * 0.9; px += Math.sin(ang) * l; py -= Math.cos(ang) * l; pts.push([px, py]); if (fork < 0 && k > 0 && k < n - 1 && R() < 0.45) fork = k; }
        veins.push([pts, h]); if (fork > 0) vein(pts[fork][0], pts[fork][1], ang + (R() < 0.5 ? -1 : 1) * (0.7 + R() * 0.5), 2 + ((R() * 2) | 0), h * 0.8);
      };
      for (let x = WX0 + R() * 3; x < WX1; x += 2.6 + R() * 5.5) vein(x, groundYRaw(x) - 0.8, (R() - 0.5) * 0.8, 3 + ((R() * 5) | 0), 0.45 + 0.55 * heat(x));
      for (const [w, col, a] of [[0.62, '255,84,28', 0.16], [0.24, '255,120,40', 0.62], [0.1, '255,224,150', 0.8]]) for (const [pts, h] of veins) {
        if (!solid(pts[0][0] - 2.5) || !solid(pts[0][0] + 2.5)) continue;
        c.beginPath(); pts.forEach((q, k) => (k ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1])))); c.strokeStyle = 'rgba(' + col + ',' + (a * h).toFixed(3) + ')'; c.lineWidth = Math.max(1, s * w); c.stroke();
      }
      // 地表散著的碎石（像草原的草叢那樣點綴，矮矮的不擋路），朝熔岩湖的那一面亮一點
      for (let x = WX0 + R() * 2; x < WX1; x += 1.2 + R() * 2.8) {
        const w = (0.55 + R() * 0.9) * s, h = w * (0.4 + R() * 0.45), px = X(x), py = Y(groundYRaw(x)) + 1, l = (R() - 0.5) * w * 0.4, d = x < mid ? 1 : -1;
        if (!solid(x - 0.7) || !solid(x + 0.7)) continue;
        const q = [px - w / 2, py, px - w * 0.3 + l, py - h * 0.75, px + l, py - h, px + w * 0.32 + l, py - h * 0.7, px + w / 2, py];
        poly(c, q); c.fillStyle = '#22121a'; c.fill();
        poly(c, d > 0 ? [q[4], q[5], q[6], q[7], q[8], q[9], px + l * 0.5, py] : [q[4], q[5], q[2], q[3], q[0], q[1], px + l * 0.5, py]); c.fillStyle = rgba('#c45a2a', 0.2 + 0.3 * heat(x)); c.fill();
        c.beginPath(); c.moveTo(q[2], q[3]); c.lineTo(q[4], q[5]); c.lineTo(q[6], q[7]); c.strokeStyle = 'rgba(226,116,50,.75)'; c.lineWidth = Math.max(1, s * 0.11); c.stroke();
      }
      if (!LK.on) return;
      // 熔岩湖：遠的那邊（上緣）最亮，往近處轉橘紅
      c.save();
      c.beginPath(); traceGround(c, LK.a, LK.b, 0, true);
      for (let y = LK.y; y >= LAKE_D; y -= 0.4) c.lineTo(X(shore(1, y)), Y(y));
      for (let y = LAKE_D; y <= LK.y; y += 0.4) c.lineTo(X(shore(-1, y)), Y(y));
      c.closePath(); c.fillStyle = lg(c, 0, Y(LK.y), 0, Y(-9), [0, '#ffe07a', 0.16, '#ffbd45', 0.55, '#ff8d2a', 1, '#e8581c']); c.fill(); c.clip();
      // 兩岸附近結了殼，暗下來；湖心最亮
      c.fillStyle = lg(c, X(LK.a - 3), 0, X(LK.a + 9), 0, [0, 'rgba(120,26,12,.8)', 0.5, 'rgba(176,52,16,.38)', 1, 'rgba(200,70,20,0)']); c.fillRect(X(LK.a - 4), Y(LK.y), s * 14, s * 8);
      c.fillStyle = lg(c, X(LK.b + 3), 0, X(LK.b - 9), 0, [0, 'rgba(120,26,12,.8)', 0.5, 'rgba(176,52,16,.38)', 1, 'rgba(200,70,20,0)']); c.fillRect(X(LK.b - 10), Y(LK.y), s * 14, s * 8);
      glow(c, mid, LK.y - 2.4, 13, 2.8, [0, 'rgba(255,252,214,.95)', 0.45, 'rgba(255,232,150,.5)', 1, 'rgba(255,206,100,0)']);
      c.restore();
      // 岸邊被熔岩照亮的一道邊、湖面上緣的亮線（這條線就是碰撞的地面）
      for (const sd of [-1, 1]) for (const [w, col] of [[1.1, 'rgba(255,110,40,.28)'], [0.3, '#ffb24a']]) { c.beginPath(); for (let y = LK.y; y >= LAKE_D; y -= 0.4) c.lineTo(X(shore(sd, y)), Y(y)); c.strokeStyle = col; c.lineWidth = Math.max(1, s * w); c.stroke(); }
      c.beginPath(); traceGround(c, LK.a, LK.b, 0, true); c.strokeStyle = '#fff3c0'; c.lineWidth = Math.max(1.5, s * 0.2); c.stroke();
    },
    init() {
      const R = mkRand(606), s = V.s; findLake();
      // 光點：火星、熔岩的亮斑、火口的光都用它
      gDot = mkCanvas(32, 32); let g = gDot.getContext('2d');
      g.fillStyle = rg(g, 16, 16, 0, 16, [0, 'rgba(255,244,200,1)', 0.22, 'rgba(255,190,90,.9)', 0.55, 'rgba(255,110,40,.3)', 1, 'rgba(255,80,30,0)']); g.fillRect(0, 0, 32, 32);
      gGlow = mkCanvas(128, 128); g = gGlow.getContext('2d');
      g.fillStyle = rg(g, 64, 64, 0, 64, [0, 'rgba(255,200,110,.9)', 0.25, 'rgba(255,130,50,.5)', 0.6, 'rgba(240,80,30,.16)', 1, 'rgba(220,60,20,0)']); g.fillRect(0, 0, 128, 128);
      // 一團煙
      gPuff = mkCanvas(96, 96); g = gPuff.getContext('2d');
      for (let k = 0; k < 7; k++) { const a = R() * TAU, d = R() * 20, x = 48 + Math.cos(a) * d, y = 48 + Math.sin(a) * d, r = 18 + R() * 10; g.fillStyle = rg(g, x, y, 0, r, [0, 'rgba(46,22,26,.55)', 0.6, 'rgba(40,18,24,.3)', 1, 'rgba(36,16,22,0)']); g.fillRect(x - r, y - r, r * 2, r * 2); }
      // 湖面上滑動的亮帶
      gBand = mkCanvas(128, 16); g = gBand.getContext('2d'); g.save(); g.translate(64, 8); g.scale(64, 8);
      g.fillStyle = rg(g, 0, 0, 0, 1, [0, 'rgba(255,250,210,.95)', 0.4, 'rgba(255,220,130,.5)', 1, 'rgba(255,190,90,0)']); g.fillRect(-1, -1, 2, 2); g.restore();
      // 湖上方的熱氣光
      gHaze = mkCanvas(160, 64); g = gHaze.getContext('2d'); g.save(); g.translate(80, 64); g.scale(80, 64);
      g.fillStyle = rg(g, 0, 0, 0, 1, [0, 'rgba(255,170,70,.6)', 0.4, 'rgba(255,110,40,.26)', 1, 'rgba(255,80,30,0)']); g.fillRect(-1, -1, 2, 1); g.restore();
      gCrust = LK.on ? crustSprite(R) : null;
      // 高空慢慢飄的灰雲
      clouds = [];
      for (let k = 0; k < 5; k++) {
        const w = 20 + R() * 14, h = w * (0.3 + R() * 0.06);
        const cv = mkCanvas(w * s, h * s); ashCloud(cv.getContext('2d'), 0, 0, w * s, h * s, R, '#1b0c14', '#28121a', '#7c3520');
        clouds.push({ cv, w, x: V.x0 + R() * (V.x1 - V.x0 + 40) - 20, y: 47.5 + h + R() * Math.max(3, V.top - 46 - h), v: 0.22 + R() * 0.34, a: 0.86 + R() * 0.14 });
      }
      // 火口冒出來的煙
      puffs = [];
      for (let k = 0; k < 8; k++) puffs.push({ p: PK[k & 1], t: (k >> 1) / 4 + R() * 0.2, max: 6.5 + R() * 2.5, dx: (R() - 0.5) * 1.6, r: 1.5 + R() * 0.7 });
      embers = []; for (let k = 0; k < 48; k++) { const e = {}; spawnEmber(e, true); embers.push(e); }
      flakes = []; for (let k = 0; k < 12; k++) flakes.push({ x: V.x0 + R() * (V.x1 - V.x0), y: R() * V.top, v: 1.6 + R() * 1.8, w: 0.6 + R() * 0.9, p: R() * TAU, r: 0.22 + R() * 0.2 });
      bands = []; for (let k = 0; k < 5; k++) bands.push({ y: LK.y - 1 - (k + R() * 0.6) * ((LK.y - 1.4 - LAKE_D) / 5), u: R(), v: (0.03 + R() * 0.03) * (k & 1 ? 1 : -1), w: 6 + R() * 6 });
      bubs = []; for (let k = 0; k < 4; k++) bubs.push({ x: 0, y: 0, t: R(), max: 0 });
    },
    back(c, t, dt) {
      const s = V.s;
      // 火口的煙：慢慢往上、變大、變淡
      for (const k of puffs) {
        k.t += dt / k.max; if (k.t >= 1) { k.t -= 1; k.dx = (Math.random() - 0.5) * 1.6; }
        const p = k.p, f = k.t, r = k.r * (1 + f * 2.2) * s, x = X(p.x + k.dx + p.out * f * f * 5), y = Y(p.h + 0.6 + f * 11);
        c.globalAlpha = Math.sin(Math.min(1, f * 1.15) * Math.PI) * 0.85; c.drawImage(gPuff, x - r, y - r, r * 2, r * 2);
      }
      // 高空的灰雲
      for (const k of clouds) {
        k.x += k.v * dt; if (k.x > V.x1 + 2) k.x = V.x0 - k.w - 2;
        c.globalAlpha = k.a; c.drawImage(k.cv, X(k.x), Y(k.y));
      }
      c.globalCompositeOperation = 'lighter';
      // 火口的光一明一暗
      for (let k = 0; k < 2; k++) {
        const p = PK[k], r = s * (9 + 1.2 * Math.sin(t * 0.7 + k * 2.2));
        c.globalAlpha = 0.34 + 0.22 * Math.sin(t * 0.9 + k * 1.9) + 0.06 * Math.sin(t * 3.7 + k); c.drawImage(gGlow, X(p.x) - r, Y(p.h + 0.4) - r, r * 2, r * 2);
      }
      // 熔岩順著山坡往下淌：每道主流上幾顆亮點慢慢往下滑
      for (let k = 0; k < flows.length * 3; k++) {
        const pts = flows[(k / 3) | 0], f = (t * 0.045 + (k % 3) / 3 + ((k / 3) | 0) * 0.17) % 1, q = pts[Math.min(pts.length - 1, (f * 0.8 * pts.length) | 0)], r = s * (1.4 - f * 0.6);
        c.globalAlpha = Math.sin(f * Math.PI) * 0.42; c.drawImage(gDot, X(q[0]) - r * 0.6, Y(q[1]) - r * 1.3, r * 1.2, r * 2.6);
      }
      if (!gCrust) { c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; return; }
      // 熔岩湖：上方的熱氣光、湖面滑動的亮帶、冒泡，最後蓋上硬殼
      const la = LK.a, lw = LK.b - LK.a, hw = (lw / 2 + 10) * s, hh = 11 * s;
      c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 1.3) + 0.08 * Math.sin(t * 4.1); c.drawImage(gHaze, X(la + lw / 2) - hw, Y(LK.y) - hh, hw * 2, hh);
      for (const b of bands) {
        b.u += b.v * dt; if (b.u > 1) b.u -= 1; else if (b.u < 0) b.u += 1;
        const w = b.w * s, h = Math.max(2, s * 0.7);
        c.globalAlpha = Math.sin(b.u * Math.PI) * 0.75; c.drawImage(gBand, X(la + 2 + b.u * (lw - 4)) - w / 2, Y(b.y) - h / 2, w, h);
      }
      c.globalAlpha = 0.2 + 0.16 * Math.sin(t * 1.1 + 1); c.drawImage(gBand, X(la + lw * 0.2), Y(LK.y - 0.6), lw * 0.6 * s, 3.6 * s);
      for (const b of bubs) {
        b.t += dt; if (b.t >= b.max) { b.t = 0; b.max = 0.7 + Math.random() * 0.9; b.y = LK.y - 0.9 - Math.random() * 4; b.x = la + 3 + Math.random() * (lw - 6); }
        const f = b.t / b.max, r = s * (0.25 + f * 0.75);
        c.globalAlpha = f < 0.7 ? 0.9 : (1 - f) * 3; c.drawImage(gDot, X(b.x) - r, Y(b.y) - r * 0.6, r * 2, r * 1.2);
      }
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.drawImage(gCrust, Math.round(X(gCrust._x)), Math.round(Y(gCrust._y)));
    },
    front(c, t, dt) {
      const s = V.s;
      // 慢慢落下的灰燼
      c.fillStyle = 'rgba(64,48,50,.7)'; c.beginPath();
      for (const f of flakes) {
        f.y -= f.v * dt; f.x += (Math.sin(t * f.w + f.p) * 1.2 + S.wind * 0.3) * dt;
        if (f.y < groundYRaw(f.x) - 1) { f.y = V.top + 1; f.x = V.x0 + Math.random() * (V.x1 - V.x0); }
        const px = X(f.x), py = Y(f.y), r = f.r * s, a = f.p + t * f.w * 0.7;
        c.moveTo(px + r * Math.cos(a), py + r * Math.sin(a)); c.ellipse(px, py, r, r * (0.3 + 0.35 * Math.abs(Math.sin(t * f.w * 1.3 + f.p))), a, 0, TAU);
      }
      c.fill();
      // 往上飄的火星
      c.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        e.t += dt; if (e.t >= e.max) spawnEmber(e, false);
        e.y += e.vy * dt; e.x += (e.vx + Math.sin(t * 1.7 + e.p) * 1.5 + S.wind * 0.25) * dt;
        const f = e.t / e.max, r = e.r * s * (1.3 - f * 0.6);
        c.globalAlpha = (f < 0.1 ? f * 10 : 1 - (f - 0.1) / 0.9) * (0.72 + 0.28 * Math.sin(t * 8 + e.p * 5)); c.drawImage(gDot, X(e.x) - r, Y(e.y) - r, r * 2, r * 2);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  };
})();
