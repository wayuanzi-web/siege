/* ===== 30-art: 磚、兵、砲彈的圖。全部用程式畫，進關卡或畫面大小改變時依實際像素重畫一次 ===== */
const INK = '#1a1420';
const SKINS = {
  blue: { stone: ['#d6dcea', '#aeb7cc', '#7f8aa3', '#5a6482'], wood: ['#cc9a60', '#a87543', '#724a22'], roof: ['#73adff', '#2f6fe0', '#1a429c'], iron: ['#b4bdcc', '#808b9d', '#4c5566'], panel: ['#3a4066', '#2b3052'], ink: '#1b2040', trim: '#ffc93c', flag: '#2f7bff', flagDk: '#1b46b8' },
  bandit: { stone: ['#bdb19d', '#978c7b', '#6c6356', '#4c463d'], wood: ['#c08a55', '#996737', '#613f1e'], roof: ['#ecd07a', '#c9a244', '#8f6f25'], iron: ['#a2a2a8', '#73747c', '#46474e'], panel: ['#423628', '#33291e'], ink: '#2a1d12', trim: '#e9c46a', flag: '#dc3a2e', flagDk: '#8f1418' },
  sand: { stone: ['#f4dcaa', '#dcbb7f', '#ad8b54', '#89693a'], wood: ['#bb9060', '#986d40', '#614222'], roof: ['#ee8a62', '#cc5c38', '#8f3a1f'], iron: ['#c0aa82', '#93805a', '#5f5036'], panel: ['#4d3d2a', '#3b2e1f'], ink: '#3a2812', trim: '#fff0b0', flag: '#dc3a2e', flagDk: '#8f1418' },
  frost: { stone: ['#e4eef8', '#b9cde0', '#8399b5', '#617899'], wood: ['#a7b8cc', '#8092ab', '#54657f'], roof: ['#9bbcf0', '#6088cc', '#385a98'], iron: ['#b1c6da', '#7f97b0', '#4e647e'], panel: ['#313f5c', '#25314b'], ink: '#1d2b46', trim: '#e2f6ff', flag: '#dc3a2e', flagDk: '#8f1418' },
  ember: { stone: ['#917979', '#6e585a', '#47373a', '#2c2023'], wood: ['#9e6640', '#784829', '#492813'], roof: ['#cf4a32', '#983220', '#5e1b10'], iron: ['#9197a3', '#5f6571', '#353941'], panel: ['#37262d', '#291c22'], ink: '#1b0f13', trim: '#ffb347', flag: '#ff7a2e', flagDk: '#a83c0c' },
  jade: { stone: ['#f4f7f0', '#d3ddd0', '#9eb1a0', '#778b7a'], wood: ['#d0aa70', '#aa844c', '#6f542a'], roof: ['#6ce0b2', '#2fa87c', '#167353'], iron: ['#f6d985', '#cda640', '#8d6d1c'], panel: ['#31504a', '#253e39'], ink: '#1a2f2b', trim: '#ffe9a0', flag: '#dc3a2e', flagDk: '#8f1418' },
  demon: { stone: ['#8474a0', '#5e4e77', '#3c3050', '#221932'], wood: ['#77505f', '#563642', '#331e26'], roof: ['#bf3774', '#882250', '#50112e'], iron: ['#67607a', '#423c50', '#24202e'], panel: ['#2c1933', '#1f1126'], ink: '#110916', trim: '#ff5aa0', flag: '#c0164a', flagDk: '#5a0a24' }
};
const PAL_ICE = ['#e6f8ff', '#a8e0f8', '#62b6e4', '#3c8cc0'];
const PAL_ROCK = ['#8e8794', '#665f70', '#403a49', '#2a2532'];

/* ---------- 磚塊：每一塊一張貼圖（依外觀、材質、形狀、大小、破損程度），第一次用到時才畫 ---------- */
const BSPR = {};
function blockSprite(b, ds) {
  const key = b.skin + ':' + b.mat + ':' + b.kind + ':' + Math.round(b.w * 10) + ':' + Math.round(b.h * 10) + ':' + Math.round(b.il * 10) + ':' + Math.round(b.ir * 10) + ':' + b.deco + ':' + ds + ':' + (b.vr & 1) + (b.hot ? 'h' : '') + (b.prop ? 'p' : '') + (b.seg ? 's' : '');
  let s = BSPR[key]; if (s) return s;
  const sc = V.s, w = b.w * sc, h = b.h * sc, roof = b.kind === 'roof';
  const padX = Math.ceil((roof ? 0.62 : 0.14) * CS * sc), padY = Math.ceil((roof ? 0.5 : 0.14) * CS * sc);
  const cv = mkCanvas(w + padX * 2, h + padY * 2), c = cv.getContext('2d');
  c.translate(padX, padY); c.lineJoin = 'round'; c.lineCap = 'round';
  paintBlock(c, b, ds, w, h, sc);
  s = BSPR[key] = { cv, ax: padX + w / 2, ay: padY + h / 2 };
  return s;
}
// 碎塊：從原本那塊磚的圖上，照碎塊的形狀剪一塊下來，再描一圈邊
function fragSprite(b) {
  const sc = V.s; if (b._sp && b._spS === sc) return b._sp;
  const P = SKINS[b.skin] || SKINS.blue, pts = b.pts, pad = Math.ceil(Math.max(2, sc * 0.3));
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < pts.length; i += 2) { if (pts[i] < x0) x0 = pts[i]; if (pts[i] > x1) x1 = pts[i]; if (pts[i + 1] < y0) y0 = pts[i + 1]; if (pts[i + 1] > y1) y1 = pts[i + 1]; }
  const cv = mkCanvas((x1 - x0) * sc + pad * 2, (y1 - y0) * sc + pad * 2), c = cv.getContext('2d');
  const px = (x) => (x - x0) * sc + pad, py = (y) => (y1 - y) * sc + pad;
  const path = () => { c.beginPath(); for (let i = 0; i < pts.length; i += 2) { if (i) c.lineTo(px(pts[i]), py(pts[i + 1])); else c.moveTo(px(pts[i]), py(pts[i + 1])); } c.closePath(); };
  c.save(); path(); c.clip();
  const ps = blockSprite(b.par, 2);
  c.drawImage(ps.cv, px(-b.pcx) - ps.ax, py(-b.pcy) - ps.ay);       // 原本那塊磚的中心，在碎塊自己的座標裡是 (-pcx, -pcy)
  c.restore();
  c.lineJoin = 'round'; path(); c.strokeStyle = P.ink; c.lineWidth = Math.max(1.5, sc * 0.28); c.stroke();
  b._sp = { cv, ax: px(0), ay: py(0) }; b._spS = sc;
  return b._sp;
}
function paintBlock(c, b, ds, w, h, sc) {
  const P = SKINS[b.skin] || SKINS.blue, u = CS * sc, lw = Math.max(1.5, sc * 0.3);
  const R = mkRand(b.mat * 131 + Math.round(b.w * 7) + Math.round(b.h * 13) + (b.vr & 1) * 17 + 3);
  const roof = b.kind === 'roof', ball = b.kind === 'ball', il = b.il * sc, ir = b.ir * sc;
  const path = () => {
    if (roof) { c.beginPath(); c.moveTo(0, h); c.lineTo(w, h); c.lineTo(w - ir, 0); c.lineTo(il, 0); c.closePath(); }
    else if (ball) { c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, TAU); }
    else if (b.mat === M_CLAY) {
      // 陶甕：窄口、鼓肚子、小底
      c.beginPath(); c.moveTo(w * 0.26, 0); c.lineTo(w * 0.74, 0); c.lineTo(w * 0.7, h * 0.1); c.quadraticCurveTo(w * 0.62, h * 0.2, w * 0.86, h * 0.34);
      c.quadraticCurveTo(w * 1.06, h * 0.62, w * 0.72, h); c.lineTo(w * 0.28, h); c.quadraticCurveTo(w * -0.06, h * 0.62, w * 0.14, h * 0.34); c.quadraticCurveTo(w * 0.38, h * 0.2, w * 0.3, h * 0.1); c.closePath();
    }
    else rrect(c, 0, 0, w, h, Math.min(w, h) * 0.09);
  };
  c.save(); path(); c.clip();
  switch (b.mat) {
    case M_STONE: {
      const p = P.stone;
      c.fillStyle = lg(c, 0, 0, 0, h, [0, mix(p[1], p[0], 0.55), 0.6, p[1], 1, mix(p[1], p[2], 0.45)]); c.fillRect(0, 0, w, h);
      if (w > u * 2.6) {
        // 石板：一條有齒飾的飾帶
        c.fillStyle = rgba(p[2], 0.55); c.fillRect(0, h * 0.62, w, h * 0.38);
        c.fillStyle = mix(p[1], p[0], 0.3); for (let x = u * 0.2; x < w - u * 0.3; x += u * 0.5) c.fillRect(x, h * 0.66, u * 0.26, h * 0.22);
        c.fillStyle = rgba(p[3], 0.5); c.fillRect(0, h * 0.54, w, Math.max(1, h * 0.07));
      } else if (h > u * 1.6) {
        c.fillStyle = rgba(p[2], 0.45); c.fillRect(w * 0.3, 0, Math.max(1, w * 0.07), h); c.fillRect(w * 0.64, 0, Math.max(1, w * 0.07), h);
      } else {
        c.fillStyle = rgba(p[2], 0.5); for (let k = 0; k < 4 + (w > u * 1.5 ? 4 : 0); k++) c.fillRect(R() * w, h * (0.2 + R() * 0.65), Math.max(1, u * 0.06), Math.max(1, u * 0.05));
        c.fillStyle = rgba(p[0], 0.5); for (let k = 0; k < 2; k++) c.fillRect(R() * w * 0.8, h * (0.25 + R() * 0.5), u * (0.12 + R() * 0.2), Math.max(1, u * 0.04));
      }
      c.fillStyle = rgba(p[0], 0.85); c.fillRect(0, 0, w, Math.max(1, u * 0.085));
      c.fillStyle = rgba(p[3], 0.45); c.fillRect(0, h - Math.max(1, u * 0.1), w, Math.max(1, u * 0.1));
      break;
    }
    case M_WOOD: {
      if (ball) {
        // 木桶（看到的是桶底）：一圈鐵箍、幾片桶板、中間一個塞子
        const p = P.wood, r = w / 2;
        c.fillStyle = rg(c, r * 0.8, r * 0.7, r * 0.1, r * 1.2, [0, mix(p[1], p[0], 0.6), 0.7, p[1], 1, p[2]]); c.fillRect(0, 0, w, h);
        c.strokeStyle = rgba(p[2], 0.75); c.lineWidth = Math.max(1, u * 0.04);
        for (let k = -2; k <= 2; k++) { const x = r + k * r * 0.36, dy = Math.sqrt(Math.max(0, r * r - (x - r) * (x - r))); c.beginPath(); c.moveTo(x, r - dy); c.lineTo(x, r + dy); c.stroke(); }
        c.strokeStyle = '#3a3340'; c.lineWidth = Math.max(1.5, u * 0.1); c.beginPath(); c.arc(r, r, r * 0.8, 0, TAU); c.stroke();
        c.fillStyle = p[2]; c.beginPath(); c.arc(r, r, Math.max(1.2, r * 0.14), 0, TAU); c.fill();
        break;
      }
      const p = P.wood, vert = h > w * 1.2;
      c.fillStyle = vert ? lg(c, 0, 0, w, 0, [0, mix(p[1], p[0], 0.45), 0.55, p[1], 1, mix(p[1], p[2], 0.5)]) : lg(c, 0, 0, 0, h, [0, mix(p[1], p[0], 0.45), 0.55, p[1], 1, mix(p[1], p[2], 0.5)]);
      c.fillRect(0, 0, w, h);
      c.strokeStyle = rgba(p[2], 0.5); c.lineWidth = Math.max(1, u * 0.035);
      const L = vert ? h : w, T = vert ? w : h;
      for (let k = 0; k < 3; k++) {
        const t0 = T * (0.24 + 0.26 * k); c.beginPath();
        for (let x = 0; x <= L; x += u * 0.45) { const tt = t0 + Math.sin(x / u * 2.1 + k * 2 + (b.vr & 7)) * T * 0.045; if (vert) (x ? c.lineTo(tt, x) : c.moveTo(tt, x)); else (x ? c.lineTo(x, tt) : c.moveTo(x, tt)); }
        c.stroke();
      }
      if (b.deco === 1) {
        // 城門：兩扇門板、鐵條、門釘
        c.fillStyle = rgba(p[2], 0.75); c.fillRect(w / 2 - Math.max(1, u * 0.05), 0, Math.max(2, u * 0.1), h);
        c.fillStyle = '#3a3340'; c.fillRect(0, h * 0.22, w, u * 0.16); c.fillRect(0, h * 0.7, w, u * 0.16);
        c.fillStyle = '#ffc93c'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { c.beginPath(); c.arc(w * (0.14 + 0.24 * i), h * (0.22 + 0.48 * j) + u * 0.08, Math.max(1, u * 0.07), 0, TAU); c.fill(); }
      } else if (!vert && w < u * 1.5 && !b.seg) {
        // 單塊木頭：木箱的斜撐（從長樑上斷下來的一截不算，還是畫成木板）
        c.strokeStyle = rgba(p[2], 0.7); c.lineWidth = Math.max(1.5, u * 0.11); c.beginPath(); c.moveTo(u * 0.1, h - u * 0.1); c.lineTo(w - u * 0.1, u * 0.1); c.stroke();
        c.strokeRect(u * 0.09, u * 0.09, w - u * 0.18, h - u * 0.18);
      } else {
        // 兩端的鐵釘
        c.fillStyle = rgba(p[2], 0.9);
        for (const f of [0.5 * u / L, 1 - 0.5 * u / L]) for (const g of [0.3, 0.7]) { c.beginPath(); if (vert) c.arc(T * g, L * f, Math.max(1, u * 0.055), 0, TAU); else c.arc(L * f, T * g, Math.max(1, u * 0.055), 0, TAU); c.fill(); }
      }
      c.fillStyle = rgba(p[0], 0.6); if (vert) c.fillRect(0, 0, Math.max(1, u * 0.07), h); else c.fillRect(0, 0, w, Math.max(1, u * 0.07));
      break;
    }
    case M_ROOF: {
      // 筒瓦：一條一條直的瓦壟，上緣一道屋脊，下緣一排瓦當
      const p = P.roof, tw = u / 3;
      c.fillStyle = p[2]; c.fillRect(0, 0, w, h);
      for (let x = -tw * 0.5; x < w; x += tw) { c.fillStyle = lg(c, x, 0, x + tw, 0, [0, p[2], 0.3, p[1], 0.52, p[0], 0.8, p[1], 1, p[2]]); c.fillRect(x + tw * 0.05, 0, tw * 0.9, h); }
      c.fillStyle = rgba(p[2], 0.55); for (let y = h * 0.34; y < h * 0.9; y += h * 0.3) c.fillRect(0, y, w, Math.max(1, u * 0.045));
      c.fillStyle = lg(c, 0, 0, 0, h, [0, 'rgba(255,255,255,.25)', 0.5, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,.25)']); c.fillRect(0, 0, w, h);
      c.fillStyle = mix(p[0], '#ffffff', 0.25); c.fillRect(0, 0, w, Math.max(2, u * 0.13));
      c.fillStyle = p[2]; c.fillRect(0, h - u * 0.2, w, u * 0.2);
      c.fillStyle = p[0]; for (let x = tw * 0.5; x < w; x += tw) { c.beginPath(); c.arc(x, h - u * 0.1, Math.max(1, u * 0.085), 0, TAU); c.fill(); }
      break;
    }
    case M_IRON: {
      const p = P.iron, bz = u * 0.11;
      c.fillStyle = lg(c, 0, 0, w, h, [0, mix(p[1], p[0], 0.5), 0.5, p[1], 1, mix(p[1], p[2], 0.5)]); c.fillRect(0, 0, w, h);
      c.strokeStyle = rgba(p[2], 0.7); c.lineWidth = Math.max(1, u * 0.05);
      const n = Math.max(1, Math.round(h / u)), m = Math.max(1, Math.round(w / u));
      for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) {
        const x0 = w * i / m, y0 = h * j / n, cw = w / m, ch = h / n;
        c.strokeRect(x0 + bz, y0 + bz, cw - bz * 2, ch - bz * 2);
        if (((i + j + (b.vr & 1)) & 1) === 0) { c.beginPath(); c.moveTo(x0 + bz, y0 + bz); c.lineTo(x0 + cw - bz, y0 + ch - bz); c.moveTo(x0 + cw - bz, y0 + bz); c.lineTo(x0 + bz, y0 + ch - bz); c.stroke(); }
        for (const [fx, fy] of [[0.17, 0.17], [0.83, 0.17], [0.17, 0.83], [0.83, 0.83]]) { c.fillStyle = p[2]; c.beginPath(); c.arc(x0 + cw * fx, y0 + ch * fy, u * 0.06, 0, TAU); c.fill(); c.fillStyle = p[0]; c.beginPath(); c.arc(x0 + cw * fx - u * 0.015, y0 + ch * fy - u * 0.015, u * 0.03, 0, TAU); c.fill(); }
      }
      c.fillStyle = rgba(p[0], 0.8); c.fillRect(0, 0, w, Math.max(1, u * 0.07));
      break;
    }
    case M_ICE: {
      const p = PAL_ICE;
      c.fillStyle = lg(c, 0, 0, w * 0.6, h, [0, p[0], 0.55, p[1], 1, p[2]]); c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineCap = 'round';
      for (let x = u * (0.15 + (b.vr & 1) * 0.2); x < w; x += u * 1.0) { c.lineWidth = Math.max(1, u * 0.075); c.beginPath(); c.moveTo(x, h * 0.66); c.lineTo(x + u * 0.36, h * 0.16); c.stroke(); c.lineWidth = Math.max(1, u * 0.04); c.beginPath(); c.moveTo(x + u * 0.36, h * 0.84); c.lineTo(x + u * 0.62, h * 0.46); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(0, 0, w, Math.max(1, u * 0.07));
      c.fillStyle = rgba(p[3], 0.35); c.fillRect(0, h - Math.max(1, u * 0.09), w, Math.max(1, u * 0.09));
      break;
    }
    case M_ROCK: {
      const p = PAL_ROCK, r = w / 2;
      c.fillStyle = rg(c, r * 0.75, r * 0.65, r * 0.1, r * 1.15, [0, p[0], 0.6, p[1], 1, p[2]]); c.fillRect(0, 0, w, h);
      for (let k = 0; k < 7; k++) { const a = R() * TAU, d = R() * r * 0.75, x = r + Math.cos(a) * d, y = r + Math.sin(a) * d, q = r * (0.16 + R() * 0.2); c.fillStyle = k & 1 ? rgba(p[0], 0.5) : rgba(p[3], 0.6); poly(c, [x - q, y, x - q * 0.3, y - q * 0.8, x + q * 0.9, y - q * 0.3, x + q * 0.6, y + q * 0.7, x - q * 0.4, y + q * 0.8]); c.fill(); }
      if (b.hot) { c.strokeStyle = '#ff8a2a'; c.lineWidth = Math.max(1, u * 0.07); for (let k = 0; k < 4; k++) { let a = R() * TAU, x = r + Math.cos(a) * r * 0.2, y = r + Math.sin(a) * r * 0.2; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 3; j++) { a += (R() - 0.5) * 1.4; x += Math.cos(a) * r * 0.32; y += Math.sin(a) * r * 0.32; c.lineTo(x, y); } c.stroke(); } }
      break;
    }
    case M_CLAY: {
      c.fillStyle = lg(c, 0, 0, w, 0, [0, '#8a4a22', 0.3, '#c8743c', 0.55, '#e39a5c', 0.8, '#c8743c', 1, '#8a4a22']); c.fillRect(0, 0, w, h);
      c.fillStyle = '#5a2e14'; c.fillRect(0, h * 0.44, w, Math.max(1.5, h * 0.07));
      c.fillStyle = '#f0d9a8'; for (let x = w * 0.14; x < w; x += w * 0.24) { poly(c, [x, h * 0.42, x + w * 0.08, h * 0.34, x + w * 0.16, h * 0.42]); c.fill(); }
      c.fillStyle = '#5a2e14'; c.fillRect(w * 0.2, 0, w * 0.6, Math.max(1.5, h * 0.09));
      break;
    }
    case M_KEG: {
      c.fillStyle = lg(c, 0, 0, w, 0, [0, '#5a3418', 0.28, '#a8672e', 0.55, '#cf8a46', 0.8, '#a8672e', 1, '#5a3418']); c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(60,30,10,.55)'; c.lineWidth = Math.max(1, u * 0.035); for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(w * k / 5, 0); c.lineTo(w * k / 5, h); c.stroke(); }
      c.fillStyle = '#2b2b33'; c.fillRect(0, h * 0.14, w, h * 0.1); c.fillRect(0, h * 0.76, w, h * 0.1);
      c.fillStyle = '#e23a2a'; poly(c, [w * 0.5, h * 0.3, w * 0.7, h * 0.5, w * 0.5, h * 0.7, w * 0.3, h * 0.5]); c.fill();
      c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(w * 0.5, h * 0.5, Math.max(1, w * 0.08), 0, TAU); c.fill();
      break;
    }
  }
  if (ds > 0 && b.mat !== M_KEG) {
    // 裂痕；第二級更多、整塊變暗
    c.strokeStyle = b.mat === M_ICE ? 'rgba(40,90,140,.85)' : 'rgba(10,6,14,.75)'; c.lineWidth = Math.max(1, u * 0.06);
    const crack = (x, y, a, len, n) => { c.beginPath(); c.moveTo(x, y); for (let k = 0; k < n; k++) { a += (R() - 0.5) * 1.3; x += Math.cos(a) * len; y += Math.sin(a) * len; c.lineTo(x, y); } c.stroke(); };
    const nc = Math.max(1, Math.round(Math.max(w, h) / u * 0.7)) * ds;
    for (let k = 0; k < nc; k++) crack(R() * w, R() < 0.5 ? 0 : h, R() < 0.5 ? 1.2 + R() * 0.7 : -1.2 - R() * 0.7, u * 0.24, 3);
    if (ds > 1) { c.fillStyle = 'rgba(8,4,12,.2)'; c.fillRect(0, 0, w, h); }
  }
  c.restore();
  path(); c.strokeStyle = b.mat === M_KEG ? '#2a1608' : b.mat === M_CLAY ? '#3a1c0a' : P.ink; c.lineWidth = b.prop ? lw * 0.8 : lw; c.stroke();
  if (roof) {
    // 屋簷兩端往上翹的角（只是畫的，不算在碰撞裡）
    const p = P.roof, T = u;
    for (let sd = -1; sd <= 1; sd += 2) {
      const xe = sd < 0 ? 0 : w;
      c.beginPath(); c.moveTo(xe - sd * T * 0.06, h); c.lineTo(xe + sd * T * 0.2, h - T * 0.02); c.quadraticCurveTo(xe + sd * T * 0.5, h - T * 0.1, xe + sd * T * 0.56, h - T * 0.46);
      c.quadraticCurveTo(xe + sd * T * 0.26, h - T * 0.36, xe - sd * T * 0.04, h - T * 0.3); c.closePath();
      c.fillStyle = p[1]; c.fill(); c.strokeStyle = P.ink; c.lineWidth = lw * 0.85; c.stroke();
    }
  }
}

/* ---------- 兵（設計座標 64×64，腳底在 y=58，面向右） ---------- */
const TEAM_PAL = [
  { body: ['#6aa8ff', '#1c4fd0'], limb: '#3d80f7', ink: '#0f2a78', head: ['#a8d0ff', '#2a66e6'], dark: '#123596' },
  { body: ['#ff7257', '#c2201d'], limb: '#f04a3a', ink: '#6a0b10', head: ['#ff9478', '#dd2e26'], dark: '#7a1014' }
];
function uShadow(c) { c.fillStyle = 'rgba(6,10,30,.28)'; ell(c, 32, 58, 13, 3.6); c.fill(); }
function uLegs(c, P) { c.fillStyle = P.ink; rrect(c, 24.5, 46, 6.5, 11.5, 3); c.fill(); rrect(c, 33, 46, 6.5, 11.5, 3); c.fill(); }
function uBody(c, P, robe) {
  if (robe) { poly(c, [22, 30, 42, 30, 46, 57, 18, 57]); fs(c, lg(c, 0, 28, 0, 58, [0, P.body[0], 1, P.body[1]]), P.ink, 2); c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(30.5, 31, 3, 25); return; }
  rrect(c, 21, 28, 22, 22, 8.5); fs(c, lg(c, 0, 28, 0, 50, [0, P.body[0], 1, P.body[1]]), P.ink, 2);
  c.fillStyle = P.dark; c.fillRect(22, 43, 20, 3); c.fillStyle = '#ffc93c'; c.fillRect(30, 42.6, 4, 3.8);
}
function uHead(c, side, P, hat) {
  const x = 32, y = 19, r = 10.5;
  if (side === 1) {
    // 赤潮：長角、怒眼
    poly(c, [x - r * 0.8, y - r * 0.45, x - r * 1.3, y - r * 1.5, x - r * 0.3, y - r * 0.9]); fs(c, '#f3e6c4', '#7a5a2a', 1.2);
    poly(c, [x + r * 0.8, y - r * 0.45, x + r * 1.3, y - r * 1.5, x + r * 0.3, y - r * 0.9]); fs(c, '#f3e6c4', '#7a5a2a', 1.2);
    ell(c, x, y, r, r * 0.95); fs(c, rg(c, x - 4, y - 5, 1, 15, [0, P.head[0], 1, P.head[1]]), P.ink, 2);
    c.fillStyle = '#fff';
    poly(c, [x - r * 0.5, y - r * 0.28, x + r * 0.05, y + r * 0.06, x - r * 0.02, y + r * 0.36, x - r * 0.46, y + r * 0.2]); c.fill();
    poly(c, [x + r * 0.82, y - r * 0.28, x + r * 0.24, y + r * 0.06, x + r * 0.32, y + r * 0.36, x + r * 0.78, y + r * 0.2]); c.fill();
    c.fillStyle = '#1a0608'; ell(c, x - r * 0.12, y + r * 0.14, r * 0.13, r * 0.15); c.fill(); ell(c, x + r * 0.5, y + r * 0.14, r * 0.13, r * 0.15); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - r * 0.1, y + r * 0.62); c.lineTo(x + r * 0.5, y + r * 0.62); c.stroke();
  } else {
    ell(c, x, y, r, r * 0.97); fs(c, rg(c, x - 4, y - 5, 1, 15, [0, P.head[0], 1, P.head[1]]), P.ink, 2);
    // 面甲開口與眼睛
    rrect(c, x - 3, y - 2.5, 12.5, 7, 3.2); fs(c, '#0f2a78');
    c.fillStyle = '#fff'; ell(c, x + 1.5, y + 1, 1.7, 2.1); c.fill(); ell(c, x + 6.5, y + 1, 1.7, 2.1); c.fill();
    if (!hat) { c.beginPath(); c.ellipse(x - 1, y - r - 2.5, 3, 5.4, -0.2, 0, TAU); fs(c, '#ffffff', '#9db3d9', 1); }
  }
}
function uHat(c, kind, side, P) {
  const x = 32, y = 19;
  if (kind === 'wiz') {            // 尖帽
    poly(c, [x - 13, y - 5, x + 13, y - 5, x + 3, y - 25, x - 2, y - 19]); fs(c, side ? '#7a1014' : '#1b46b8', P.ink, 1.8);
    c.fillStyle = side ? '#ffb0a0' : '#bfe6ff'; ell(c, x + 1, y - 12, 2.2, 2.2); c.fill();
    c.fillStyle = side ? '#b51d1d' : '#2f6fe0'; rrect(c, x - 14.5, y - 7.5, 29, 4.6, 2.2); fs(c, side ? '#b51d1d' : '#2f6fe0', P.ink, 1.6);
  } else if (kind === 'sage') {    // 方巾
    rrect(c, x - 9, y - 16.5, 18, 8, 2.5); fs(c, side ? '#4a0c10' : '#16307a', P.ink, 1.8);
    c.fillStyle = '#ffc93c'; c.fillRect(x - 9, y - 10.6, 18, 2.2);
    c.strokeStyle = side ? '#4a0c10' : '#16307a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - 8, y - 12); c.quadraticCurveTo(x - 16, y - 10, x - 17, y - 3); c.stroke();
  } else if (kind === 'gog') {     // 護目鏡
    c.fillStyle = '#3a2a1c'; c.fillRect(x - 10, y - 5.5, 20.5, 3);
    ell(c, x + 1.5, y - 4, 3.6, 3.6); fs(c, '#bfe6ff', '#3a2a1c', 1.6); ell(c, x + 8, y - 4, 3.2, 3.6); fs(c, '#bfe6ff', '#3a2a1c', 1.6);
  }
}
function uArm(c, P, x, y) { ell(c, x, y, 4.3, 4.8); fs(c, P.limb, P.ink, 1.8); }
// 每個兵種手上的傢伙
const UNIT_ART = {
  rocket(c, side, P) {
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    uHead(c, side, P);
    c.save(); c.translate(36, 30); c.rotate(-0.62);
    rrect(c, -15, -5, 31, 10, 3.5); fs(c, lg(c, 0, -5, 0, 5, [0, '#f0dc94', 0.5, '#cfae5a', 1, '#8d6c2a']), '#4a3410', 1.8);
    c.fillStyle = '#6b4f18'; c.fillRect(-7, -5, 2.2, 10); c.fillRect(5, -5, 2.2, 10);
    poly(c, [16, -4.2, 24, 0, 16, 4.2]); fs(c, '#e23a2a', '#6a0b10', 1.4);
    c.restore();
    uArm(c, P, 41, 36);
  },
  bolt(c, side, P) {
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    uHead(c, side, P);
    c.save(); c.translate(39, 37); c.rotate(-0.35);
    rrect(c, -9, -2.6, 25, 5.2, 2); fs(c, '#9a6a3a', '#3c2410', 1.6);
    rrect(c, -3, -8.5, 11, 6.5, 1.6); fs(c, '#6b4424', '#3c2410', 1.5);
    c.strokeStyle = '#2b303b'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(13, -11); c.quadraticCurveTo(20, 0, 13, 11); c.stroke();
    c.strokeStyle = '#e8e2d0'; c.lineWidth = 1; c.beginPath(); c.moveTo(13, -11); c.lineTo(2, 0); c.lineTo(13, 11); c.stroke();
    poly(c, [16, -1.4, 23, 0, 16, 1.4]); fs(c, '#dfe8f6', '#3c2410', 1);
    c.restore();
    uArm(c, P, 39, 39);
  },
  bomb(c, side, P) {
    uShadow(c);
    c.save(); c.translate(-7, 0); uLegs(c, P); uBody(c, P); uHead(c, side, P); uArm(c, P, 42, 37); c.restore();
    // 砲身與砲架
    poly(c, [36, 57, 60, 57, 56, 48, 40, 48]); fs(c, '#8a5a30', '#3c2410', 1.8);
    ell(c, 42, 56.5, 4.2, 4.2); fs(c, '#5a3a1c', '#2a1608', 1.6); ell(c, 55, 56.5, 4.2, 4.2); fs(c, '#5a3a1c', '#2a1608', 1.6);
    c.save(); c.translate(47, 44); c.rotate(-0.55);
    rrect(c, -9, -7.5, 27, 15, 6); fs(c, lg(c, 0, -7.5, 0, 7.5, [0, '#e2b45c', 0.45, '#b47a26', 1, '#6a430e']), '#3a2203', 2);
    c.fillStyle = '#3a2203'; c.fillRect(-1, -7.5, 2.6, 15); c.fillRect(9, -7.5, 2.6, 15);
    ell(c, 18.5, 0, 3, 6.6); fs(c, '#1a1008', '#3a2203', 1.4);
    c.restore();
  },
  fire(c, side, P) {
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    uHead(c, side, P);
    // 高舉的火油罐
    c.strokeStyle = P.ink; c.lineWidth = 4.6; c.beginPath(); c.moveTo(42, 34); c.lineTo(47, 24); c.stroke();
    c.strokeStyle = P.limb; c.lineWidth = 2.6; c.beginPath(); c.moveTo(42, 34); c.lineTo(47, 24); c.stroke();
    ell(c, 49, 17, 7.5, 6.6); fs(c, lg(c, 42, 0, 56, 0, [0, '#5a4a44', 0.5, '#8a756c', 1, '#3a2c28']), '#1c1210', 1.8);
    c.fillStyle = '#1c1210'; c.fillRect(45, 9.6, 8, 2.6);
    c.beginPath(); c.moveTo(49, -2); c.quadraticCurveTo(55, 4, 52.5, 9.5); c.lineTo(45.5, 9.5); c.quadraticCurveTo(43, 5, 46.5, 2); c.quadraticCurveTo(48, 3.5, 49, -2); fs(c, lg(c, 0, -2, 0, 10, [0, '#fff1a8', 0.5, '#ffb02e', 1, '#ee4a1e']), '#a83c0c', 1);
  },
  ice(c, side, P) {
    uShadow(c); uBody(c, P, 1);
    c.strokeStyle = '#6b4424'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(48, 57); c.lineTo(48, 16); c.stroke();
    poly(c, [48, 2, 53.5, 10.5, 48, 19, 42.5, 10.5]); fs(c, lg(c, 42, 2, 54, 19, [0, '#ffffff', 0.5, '#a8e8ff', 1, '#3c9be0']), '#1b5e9a', 1.5);
    uArm(c, P, 45, 37);
    uHead(c, side, P, 1); uHat(c, 'wiz', side, P);
    if (side === 0) { c.fillStyle = '#f2f6ff'; poly(c, [29, 24.5, 43, 24.5, 39, 34, 33, 34]); c.fill(); }
  },
  zap(c, side, P) {
    uShadow(c); uBody(c, P, 1);
    c.strokeStyle = '#6b4424'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(48, 57); c.lineTo(48, 19); c.stroke();
    ell(c, 48, 11, 7, 7); fs(c, rg(c, 46, 9, 1, 8, [0, '#fffbe0', 0.6, '#ffd84a', 1, '#f09a1a']), '#8a5a08', 1.6);
    poly(c, [49.5, 5.5, 45, 11.5, 48, 11.5, 46.5, 16.5, 51.5, 10, 48.3, 10]); fs(c, '#6a3cff');
    uArm(c, P, 45, 37);
    uHead(c, side, P, 1); uHat(c, 'sage', side, P);
  },
  flak(c, side, P) {
    uShadow(c);
    c.save(); c.translate(-8, 0); uLegs(c, P); uBody(c, P); uHead(c, side, P); uArm(c, P, 42, 38); c.restore();
    c.strokeStyle = '#3c2410'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(48, 43); c.lineTo(41, 57); c.moveTo(48, 43); c.lineTo(57, 57); c.stroke();
    c.save(); c.translate(48, 40); c.rotate(-0.95);
    rrect(c, -9, -2.8, 28, 5.6, 2); fs(c, '#9a6a3a', '#3c2410', 1.6);
    c.strokeStyle = '#2b303b'; c.lineWidth = 3; c.beginPath(); c.moveTo(11, -13); c.quadraticCurveTo(19, 0, 11, 13); c.stroke();
    c.strokeStyle = '#e8e2d0'; c.lineWidth = 1; c.beginPath(); c.moveTo(11, -13); c.lineTo(-2, 0); c.lineTo(11, 13); c.stroke();
    poly(c, [17, -2, 27, 0, 17, 2]); fs(c, '#dfe8f6', '#3c2410', 1);
    c.restore();
  },
  bal(c, side, P) {
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    c.strokeStyle = '#e8e2d0'; c.lineWidth = 1; c.beginPath(); c.moveTo(43, 34); c.lineTo(46, 12); c.moveTo(43, 34); c.lineTo(54, 18); c.stroke();
    ell(c, 46, 7, 6, 7); fs(c, side ? '#ff8a3a' : '#5ad0ff', P.ink, 1.5); ell(c, 55, 13, 5, 6); fs(c, side ? '#ffd34a' : '#bfe6ff', P.ink, 1.5);
    uHead(c, side, P); uHat(c, 'gog', side, P);
    uArm(c, P, 42, 36);
  },
  boss(c, side, P) {
    // 魔王：披風、巨角、掌心一顆黑球
    c.fillStyle = 'rgba(6,10,30,.3)'; ell(c, 32, 58, 20, 4.4); c.fill();
    poly(c, [12, 26, 52, 26, 60, 57, 4, 57]); fs(c, lg(c, 0, 26, 0, 58, [0, '#5a1038', 1, '#20061a']), '#0c0410', 2);
    poly(c, [20, 28, 44, 28, 49, 57, 15, 57]); fs(c, lg(c, 0, 28, 0, 58, [0, '#8a2a9a', 1, '#3a0f52']), '#12061c', 2);
    c.fillStyle = '#ffc93c'; poly(c, [32, 32, 37, 39, 32, 46, 27, 39]); c.fill();
    const x = 32, y = 18, r = 12.5;
    c.beginPath(); c.moveTo(x - 9, y - 6); c.quadraticCurveTo(x - 24, y - 12, x - 20, y - 27); c.quadraticCurveTo(x - 14, y - 16, x - 4, y - 11); c.closePath(); fs(c, '#f3e6c4', '#5a4420', 1.6);
    c.beginPath(); c.moveTo(x + 9, y - 6); c.quadraticCurveTo(x + 24, y - 12, x + 20, y - 27); c.quadraticCurveTo(x + 14, y - 16, x + 4, y - 11); c.closePath(); fs(c, '#f3e6c4', '#5a4420', 1.6);
    ell(c, x, y, r, r * 0.96); fs(c, rg(c, x - 4, y - 5, 1, 17, [0, '#b455c8', 1, '#4a1668']), '#12061c', 2.2);
    c.fillStyle = '#ffe14a';
    poly(c, [x - 8.5, y - 3.5, x - 1.5, y + 0.5, x - 2.5, y + 4, x - 8, y + 2]); c.fill(); poly(c, [x + 8.5, y - 3.5, x + 1.5, y + 0.5, x + 2.5, y + 4, x + 8, y + 2]); c.fill();
    c.fillStyle = '#c0164a'; ell(c, x - 4.6, y + 1.2, 1.5, 1.8); c.fill(); ell(c, x + 4.6, y + 1.2, 1.5, 1.8); c.fill();
    c.strokeStyle = '#12061c'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x - 5, y + 8); c.lineTo(x - 2.5, y + 6.4); c.lineTo(x, y + 8); c.lineTo(x + 2.5, y + 6.4); c.lineTo(x + 5, y + 8); c.stroke();
    poly(c, [x - 8, y - 11, x - 5, y - 17, x - 2, y - 12.5, x, y - 19, x + 2, y - 12.5, x + 5, y - 17, x + 8, y - 11]); fs(c, '#ffc93c', '#7a4a08', 1.3);
    ell(c, 52, 36, 5, 5.4); fs(c, '#6a2a86', '#12061c', 1.8);
    ell(c, 55, 27, 6.5, 6.5); fs(c, rg(c, 53, 25, 0.5, 7.5, [0, '#ff9ad8', 0.45, '#8a1fb4', 1, '#1c0630']), '#0c0410', 1.4);
  }
};
const USPR = {};     // 'side:type' → { cv, wh (白色剪影，受擊閃白用), px, w, h, ax, ay (腳底), cy (身體中心) }
const UNIT_TOP = 16;  // 設計座標上面多留的高度：帽尖、角、舉高的火油罐都畫在 y < 0
function unitSprite(side, type) {
  const big = type === 'boss' ? 1.95 : 1, px = Math.max(16, Math.round(V.T * 1.38 * big)), key = side + ':' + type;
  let s = USPR[key]; if (s && s.px === px) return s;
  const k = px / 64, top = Math.ceil(UNIT_TOP * k), cv = mkCanvas(px, px + top), c = cv.getContext('2d');
  c.translate(0, top); c.scale(k, k); c.lineJoin = 'round'; c.lineCap = 'round';
  if (side === 1) { c.translate(64, 0); c.scale(-1, 1); }
  (UNIT_ART[type] || UNIT_ART.rocket)(c, side, TEAM_PAL[side]);
  const wh = mkCanvas(px, px + top), w = wh.getContext('2d');
  w.drawImage(cv, 0, 0); w.globalCompositeOperation = 'source-in'; w.fillStyle = '#fff'; w.fillRect(0, 0, px, px + top);
  s = USPR[key] = { cv, wh, px, w: px, h: px + top, ax: px / 2, ay: top + px * 58 / 64, cy: top + px * 36 / 64 };
  return s;
}

/* ---------- 砲彈（設計座標 32×16，頭朝右，中心在 (16,8)） ---------- */
const SHOT_ART = {
  rocket(c, side) {
    poly(c, [3, 3.5, 9, 6, 9, 10, 3, 12.5]); fs(c, side ? '#8f1418' : '#1b46b8', INK, 1);
    rrect(c, 7, 4.6, 16, 6.8, 2.6); fs(c, lg(c, 0, 4.6, 0, 11.4, [0, '#f6eeda', 1, '#b9b0a0']), INK, 1.1);
    poly(c, [22, 4, 30.5, 8, 22, 12]); fs(c, side ? '#ee3b30' : '#3d86ff', INK, 1.1);
  },
  bolt(c, side) {
    c.strokeStyle = side ? '#ffb4a4' : '#bfe0ff'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(4, 8); c.lineTo(24, 8); c.stroke();
    poly(c, [22, 5, 31, 8, 22, 11]); fs(c, '#f6f2e6', INK, 0.9);
    c.fillStyle = side ? '#ee3b30' : '#3d86ff'; poly(c, [2, 5, 8, 8, 2, 11]); c.fill();
  },
  bomb(c, side) {
    ell(c, 16, 8, 7.2, 7.2); fs(c, rg(c, 13.5, 5.5, 0.5, 8, [0, '#8a8f9c', 0.5, '#3a3f4a', 1, '#14161c']), '#07080b', 1.2);
    c.fillStyle = side ? '#ee3b30' : '#3d86ff'; c.fillRect(13.2, 0.6, 5.6, 2.2);
    c.fillStyle = 'rgba(255,255,255,.55)'; ell(c, 13.2, 5.2, 1.8, 1.2, -0.6); c.fill();
  },
  fire(c) {
    ell(c, 17, 8, 6.2, 5.8); fs(c, rg(c, 16, 7, 0.5, 7, [0, '#fff6c0', 0.5, '#ffae2a', 1, '#e8431c']), '#8f2a0c', 1);
    poly(c, [12, 4, 3, 8, 12, 12]); fs(c, '#ff7a1e');
  },
  ice(c) {
    poly(c, [30, 8, 19, 2.8, 5, 8, 19, 13.2]); fs(c, lg(c, 5, 2, 30, 14, [0, '#ffffff', 0.5, '#a8e8ff', 1, '#3c9be0']), '#1b5e9a', 1.1);
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(9, 8); c.lineTo(26, 8); c.stroke();
  },
  zap(c) {
    ell(c, 16, 8, 6.6, 6.6); fs(c, rg(c, 15, 7, 0.5, 7, [0, '#ffffff', 0.45, '#ffe66a', 1, '#f09a1a']), '#8a5a08', 1);
    poly(c, [18, 3, 12.5, 8.6, 15.5, 8.6, 13.5, 13, 19.5, 7, 16.4, 7]); fs(c, '#6a3cff');
  },
  dark(c) {
    ell(c, 16, 8, 6.8, 6.8); fs(c, rg(c, 14.5, 6.5, 0.5, 7.5, [0, '#ffa6e0', 0.4, '#9a22c4', 1, '#1a0630']), '#0c0410', 1.2);
  },
  drop(c) {
    poly(c, [5, 8, 9, 3, 12, 8, 9, 13]); fs(c, '#6a0b10', INK, 0.9);
    ell(c, 19, 8, 8, 6.2); fs(c, lg(c, 0, 2, 0, 14, [0, '#5a5f6c', 1, '#1c1e25']), '#07080b', 1.2);
    c.fillStyle = '#ffd34a'; c.fillRect(17, 3.4, 4, 9.2);
  },
  lava(c) {
    poly(c, [8, 3, 16, 0.8, 24, 4, 26.5, 10, 20, 15, 11, 14, 6, 9]); fs(c, rg(c, 15, 7, 1, 11, [0, '#ffe68a', 0.4, '#ff7a1e', 1, '#5a1608']), '#2a0a04', 1.2);
    c.fillStyle = 'rgba(40,10,4,.65)'; poly(c, [10, 5, 15, 3.5, 14, 8]); c.fill(); poly(c, [18, 10, 23, 8, 21, 13]); c.fill();
  }
};
SHOT_ART.keg = SHOT_ART.bomb; SHOT_ART.doom = SHOT_ART.dark;
const SSPR = {};     // 'id:side' → { cv, w, h }
function shotSprite(wi, side) {
  const w = WL[wi], key = w.id + ':' + side, sc = (w.id === 'bolt' ? 0.22 : w.id === 'bomb' || w.id === 'lava' || w.id === 'drop' ? 0.34 : 0.27) * V.T / 16 * 3.4;
  const pw = Math.max(8, Math.round(32 * sc)), ph = Math.max(4, Math.round(16 * sc));
  let s = SSPR[key]; if (s && s.w === pw) return s;
  const cv = mkCanvas(pw, ph), c = cv.getContext('2d'); c.scale(pw / 32, ph / 16); c.lineJoin = 'round'; c.lineCap = 'round';
  (SHOT_ART[w.id] || SHOT_ART.rocket)(c, side === 1 ? 1 : 0);
  s = SSPR[key] = { cv, w: pw, h: ph };
  return s;
}
function artReset() { for (const k in USPR) delete USPR[k]; for (const k in SSPR) delete SSPR[k]; for (const k in BSPR) delete BSPR[k]; }
