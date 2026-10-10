/* ===== 30-art: 磚、兵、砲彈的圖。全部用程式畫，進關卡或畫面大小改變時依實際像素重畫一次 ===== */
const INK = '#1a1420';
const SKINS = {
  blue: { stone: ['#d6dcea', '#aeb7cc', '#7f8aa3', '#5a6482'], wood: ['#cc9a60', '#a87543', '#724a22'], roof: ['#73adff', '#2f6fe0', '#1a429c'], iron: ['#b4bdcc', '#808b9d', '#4c5566'], panel: ['#3a4066', '#2b3052'], ink: '#1b2040', trim: '#ffc93c', flag: '#2f7bff', flagDk: '#1b46b8' },
  bandit: { stone: ['#bdb19d', '#978c7b', '#6c6356', '#4c463d'], wood: ['#c08a55', '#996737', '#613f1e'], roof: ['#ecd07a', '#c9a244', '#8f6f25'], iron: ['#a2a2a8', '#73747c', '#46474e'], panel: ['#423628', '#33291e'], ink: '#2a1d12', trim: '#e9c46a', flag: '#dc3a2e', flagDk: '#8f1418' },
  sand: { stone: ['#f4dcaa', '#dcbb7f', '#ad8b54', '#89693a'], wood: ['#bb9060', '#986d40', '#614222'], roof: ['#ee8a62', '#cc5c38', '#8f3a1f'], iron: ['#c0aa82', '#93805a', '#5f5036'], panel: ['#4d3d2a', '#3b2e1f'], ink: '#3a2812', trim: '#fff0b0', flag: '#dc3a2e', flagDk: '#8f1418' },
  frost: { stone: ['#e4eef8', '#b9cde0', '#8399b5', '#617899'], wood: ['#a7b8cc', '#8092ab', '#54657f'], roof: ['#9bbcf0', '#6088cc', '#385a98'], iron: ['#b1c6da', '#7f97b0', '#4e647e'], panel: ['#313f5c', '#25314b'], ink: '#1d2b46', trim: '#e2f6ff', flag: '#dc3a2e', flagDk: '#8f1418' },
  ember: { stone: ['#917979', '#6e585a', '#47373a', '#2c2023'], wood: ['#9e6640', '#784829', '#492813'], roof: ['#cf4a32', '#983220', '#5e1b10'], iron: ['#9197a3', '#5f6571', '#353941'], panel: ['#37262d', '#291c22'], ink: '#1b0f13', trim: '#ffb347', flag: '#ff7a2e', flagDk: '#a83c0c' },
  jade: { stone: ['#f4f7f0', '#d3ddd0', '#9eb1a0', '#778b7a'], wood: ['#d0aa70', '#aa844c', '#6f542a'], roof: ['#6ce0b2', '#2fa87c', '#167353'], iron: ['#f6d985', '#cda640', '#8d6d1c'], panel: ['#31504a', '#253e39'], ink: '#1a2f2b', trim: '#ffe9a0', flag: '#dc3a2e', flagDk: '#8f1418' },
  demon: { stone: ['#8474a0', '#5e4e77', '#3c3050', '#221932'], wood: ['#77505f', '#563642', '#331e26'], roof: ['#bf3774', '#882250', '#50112e'], iron: ['#67607a', '#423c50', '#24202e'], panel: ['#2c1933', '#1f1126'], ink: '#110916', trim: '#ff5aa0', flag: '#c0164a', flagDk: '#5a0a24' },
  // 第二篇
  bamboo: { stone: ['#c9d3c0', '#a3b098', '#748469', '#56644d'], wood: ['#c9a46a', '#a17c45', '#6b5028'], roof: ['#e8c978', '#c39a44', '#86662a'], iron: ['#a9b0a2', '#7b8274', '#4c5246'], panel: ['#33422c', '#263221'], ink: '#1d2616', trim: '#f2e3a0', flag: '#dc3a2e', flagDk: '#8f1418' },
  karst: { stone: ['#dfe0d8', '#b8bab0', '#888b82', '#62655e'], wood: ['#c79763', '#9f7140', '#674621'], roof: ['#7f95a8', '#566b80', '#344456'], iron: ['#aab0b8', '#7c838c', '#4b5058'], panel: ['#3c3f3a', '#2d302b'], ink: '#1f221e', trim: '#ffd88a', flag: '#dc3a2e', flagDk: '#8f1418' },
  temple: { stone: ['#d4cfc6', '#aaa397', '#7a7368', '#575147'], wood: ['#d0563f', '#a8382a', '#6c2018'], roof: ['#7c8590', '#545c68', '#323842'], iron: ['#c9a65a', '#9a7a32', '#5e4718'], panel: ['#4a2620', '#381b16'], ink: '#24100c', trim: '#ffd36a', flag: '#dc3a2e', flagDk: '#8f1418' },
  canyon: { stone: ['#e8a47e', '#c97a52', '#9a5433', '#6e3720'], wood: ['#8f6a4a', '#6c4c32', '#43301e'], roof: ['#d9644a', '#a94330', '#6c2618'], iron: ['#a59a8e', '#776c61', '#4a423a'], panel: ['#4a2a1e', '#371f16'], ink: '#26140c', trim: '#ffcf7a', flag: '#dc3a2e', flagDk: '#8f1418' },
  crystal: { stone: ['#ece6f6', '#c8bfe0', '#958bb6', '#6a6190'], wood: ['#b8c4dc', '#8d9bba', '#5d6a88'], roof: ['#8fe6f0', '#46b6c8', '#22788a'], iron: ['#d8d2f0', '#a69ec8', '#6c6494'], panel: ['#1f2550', '#161b3e'], ink: '#10133a', trim: '#b9f6ff', flag: '#dc3a2e', flagDk: '#8f1418' },
  maple: { stone: ['#d8d2c8', '#b0a89b', '#80786c', '#5a5348'], wood: ['#b85a34', '#8c3e22', '#5a2412'], roof: ['#6f8a7e', '#4b6559', '#2e423a'], iron: ['#c4a45e', '#957732', '#5c4618'], panel: ['#3e2418', '#2f1a11'], ink: '#1e0f08', trim: '#ffcf6a', flag: '#dc3a2e', flagDk: '#8f1418' },
  ship: { stone: ['#d9cdb4', '#b3a585', '#857858', '#5d523a'], wood: ['#a8673a', '#7e4624', '#4c2610'], roof: ['#d9a35c', '#b07a34', '#76501c'], iron: ['#a9a49c', '#7a756d', '#4a4640'], panel: ['#3e2a1c', '#2e1f14'], ink: '#1f120a', trim: '#ffd27a', flag: '#dc3a2e', flagDk: '#8f1418' }
};
// 每一關雙方的城樓一模一樣，只有屋瓦和旗子分顏色：我方藍、敵方紅（藍圖的外觀名稱後面接 @0、@1）
const ROOF_TEAM = [['#78b2ff', '#2f6fe0', '#1a429c'], ['#ff8a6c', '#d43c2a', '#86180f']], FLAG_TEAM = [['#2f7bff', '#1b46b8'], ['#dc3a2e', '#8f1418']];
// 懸空寺的柱子、樑是朱漆（紅色）：我方那一座改成藍漆，不然整座看起來像敵軍的
const WOOD_TEAM = { temple: [{ wood: ['#5a86cc', '#3b63a8', '#213c6e'], panel: ['#1f2c48', '#172138'] }, null] };
for (const k of Object.keys(SKINS)) for (let sd = 0; sd < 2; sd++) SKINS[k + '@' + sd] = Object.assign({}, SKINS[k], { roof: ROOF_TEAM[sd], flag: FLAG_TEAM[sd][0], flagDk: FLAG_TEAM[sd][1] }, (WOOD_TEAM[k] && WOOD_TEAM[k][sd]) || {});
const PAL_GLASS = ['#e9fdff', '#a5eef6', '#5ccbdc', '#2a8fa6'];
const PAL_BAMBOO = ['#cfe58c', '#9cc457', '#6b9a33', '#40651c'];
const PAL_ICE = ['#e6f8ff', '#a8e0f8', '#62b6e4', '#3c8cc0'];
const PAL_ROCK = ['#8e8794', '#665f70', '#403a49', '#2a2532'];

/* ---------- 磚塊：每一塊一張貼圖（依外觀、材質、形狀、大小、破損程度），第一次用到時才畫 ---------- */
const BSPR = {};
function blockSprite(b, ds) {
  const key = b.skin + ':' + b.mat + ':' + b.kind + ':' + Math.round(b.w * 10) + ':' + Math.round(b.h * 10) + ':' + Math.round(b.il * 10) + ':' + Math.round(b.ir * 10) + ':' + b.deco + ':' + ds + ':' + (b.vr & 1) + (b.hot ? 'h' : '') + (b.prop ? 'p' : '') + (b.seg ? 's' : '') + (b.dom ? 'd' : '') + (b.beam ? 'b' : '') + (b.reso ? 'r' : '') + (b.mag ? 'm' : '') + (b.core ? 'c' : '') + (b.heart ? 'H' : '') + (b.brake ? 'k' : '');
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
    else if (b.kind === 'bell') { c.beginPath(); c.moveTo(0, h); c.lineTo(w, h); c.quadraticCurveTo(w * 0.86, h * 0.62, w * 0.81, h * 0.36); c.quadraticCurveTo(w * 0.76, 0, w * 0.5, 0); c.quadraticCurveTo(w * 0.24, 0, w * 0.19, h * 0.36); c.quadraticCurveTo(w * 0.14, h * 0.62, 0, h); c.closePath(); }
    else if (b.dom) { const r = w * 0.48; c.beginPath(); c.moveTo(0, h); c.lineTo(0, r); c.quadraticCurveTo(0, 0, r, 0); c.lineTo(w - r, 0); c.quadraticCurveTo(w, 0, w, r); c.lineTo(w, h); c.closePath(); }      // 石碑：圓頂
    else if (b.reso || b.core) { c.beginPath(); c.moveTo(w * 0.5, 0); c.lineTo(w * 0.95, h * 0.2); c.lineTo(w * 0.95, h * 0.86); c.lineTo(w * 0.5, h); c.lineTo(w * 0.05, h * 0.86); c.lineTo(w * 0.05, h * 0.2); c.closePath(); }
    else if (b.mat === M_SNOW) { c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * 0.3); c.quadraticCurveTo(w * 0.05, 0, w * 0.3, h * 0.06); c.quadraticCurveTo(w * 0.5, -h * 0.04, w * 0.68, h * 0.07); c.quadraticCurveTo(w * 0.97, h * 0.02, w, h * 0.32); c.lineTo(w, h); c.closePath(); }      // 積雪：上緣蓬蓬的
    else rrect(c, 0, 0, w, h, Math.min(w, h) * 0.09);
  };
  c.save(); path(); c.clip();
  if (ds !== 3 && paintSpecial(c, b, w, h, u, P, R)) { /* 吊鐘、吊燈、石籃、共鳴晶柱：自己畫 */ }
  else if (ds !== 3) switch (b.mat) {
    case M_STONE: {
      const p = P.stone;
      c.fillStyle = lg(c, 0, 0, 0, h, [0, mix(p[1], p[0], 0.55), 0.6, p[1], 1, mix(p[1], p[2], 0.45)]); c.fillRect(0, 0, w, h);
      if (w > u * 2.6 || b.seg) {
        // 石板：一條有齒飾的飾帶（從石板上斷下來的一小截也照樣畫）
        c.fillStyle = rgba(p[2], 0.55); c.fillRect(0, h * 0.62, w, h * 0.38);
        c.fillStyle = mix(p[1], p[0], 0.3); for (let x = u * 0.2; x < w - u * 0.3; x += u * 0.5) c.fillRect(x, h * 0.66, u * 0.26, h * 0.22);
        c.fillStyle = rgba(p[3], 0.5); c.fillRect(0, h * 0.54, w, Math.max(1, h * 0.07));
      } else if (b.dom) {
        // 石碑：圓頂的碑首刻一圈雲紋，碑身一道框、框裡一行塗了朱紅的字，底下一截碑座
        c.fillStyle = lg(c, 0, 0, w, 0, [0, mix(p[1], p[0], 0.7), 0.5, mix(p[1], p[0], 0.35), 1, p[1]]); c.fillRect(0, 0, w, h);
        c.strokeStyle = rgba(p[2], 0.8); c.lineWidth = Math.max(1, u * 0.05);
        c.beginPath(); c.arc(w * 0.5, w * 0.62, w * 0.26, Math.PI, TAU); c.stroke();
        c.beginPath(); c.arc(w * 0.5, w * 0.62, w * 0.12, Math.PI, TAU); c.stroke();
        const fy0 = w * 0.95, fy1 = h - u * 0.75;
        c.strokeRect(w * 0.16, fy0, w * 0.68, fy1 - fy0);
        c.fillStyle = '#b8352a';
        for (let y = fy0 + u * 0.35; y < fy1 - u * 0.3; y += u * 0.58) { const gx = w * 0.5; c.fillRect(gx - w * 0.2, y, w * 0.4, Math.max(1, u * 0.06)); c.fillRect(gx - Math.max(1, u * 0.03), y - u * 0.14, Math.max(1, u * 0.06), u * 0.34); if (R() < 0.6) c.fillRect(gx - w * 0.16, y + u * 0.16, w * 0.32, Math.max(1, u * 0.05)); }
        c.fillStyle = rgba(p[3], 0.7); c.fillRect(0, h - u * 0.5, w, u * 0.5); c.fillStyle = rgba(p[0], 0.6); c.fillRect(0, h - u * 0.5, w, Math.max(1, u * 0.05));
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
      if (b.heart) {
        // 五重塔的心柱：朱漆、上下兩道金箍
        c.fillStyle = lg(c, 0, 0, w, 0, [0, '#6a1410', 0.3, '#b8281c', 0.55, '#d8402a', 0.8, '#b8281c', 1, '#6a1410']); c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffc93c'; for (const f of [0.08, 0.92]) c.fillRect(0, h * f - u * 0.08, w, u * 0.16);
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(w * 0.18, 0, w * 0.12, h);
        break;
      }
      if (b.brake) {
        // 閘：木頭底座上一個絞盤（捲著鋼纜的圓筒）、一根煞車桿
        const p = P.wood; c.fillStyle = lg(c, 0, 0, 0, h, [0, p[0], 1, p[2]]); c.fillRect(0, 0, w, h);
        c.fillStyle = '#3a3440'; c.beginPath(); c.arc(w * 0.5, h * 0.45, w * 0.32, 0, TAU); c.fill(); c.strokeStyle = '#8a8496'; c.lineWidth = Math.max(1, u * 0.06); c.stroke();
        c.strokeStyle = '#c9c0d4'; c.lineWidth = Math.max(1, u * 0.04); for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(w * 0.5 + k * w * 0.1, h * 0.17); c.lineTo(w * 0.5 + k * w * 0.1, h * 0.73); c.stroke(); }
        c.strokeStyle = '#2a1608'; c.lineWidth = Math.max(1.5, u * 0.1); c.beginPath(); c.moveTo(w * 0.2, h * 0.95); c.lineTo(w * 0.85, h * 0.1); c.stroke();
        c.fillStyle = '#e23a2a'; c.beginPath(); c.arc(w * 0.85, h * 0.1, Math.max(1.5, u * 0.09), 0, TAU); c.fill();
        break;
      }
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
      if (b.beam) {
        // 天秤的大樑：一條一條鐵箍、大鉚釘
        for (let x = u * 0.6; x < w - u * 0.3; x += u * 1.5) { c.fillStyle = '#3a3340'; c.fillRect(x, 0, u * 0.28, h); c.fillStyle = '#8d8496'; c.fillRect(x, 0, u * 0.28, Math.max(1, u * 0.06)); c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(x + u * 0.14, h * 0.5, Math.max(1, u * 0.08), 0, TAU); c.fill(); }
      } else if (b.deco === 1) {
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
    case M_BAMBOO: {
      // 竹子：一節一節，節上一圈深色、上面一道亮；竹排是好幾根橫放綁在一起
      const p = PAL_BAMBOO, vert = h > w * 1.2;
      const tube = (x, y, L, T, ver) => {
        c.fillStyle = ver ? lg(c, x, 0, x + T, 0, [0, p[2], 0.35, p[0], 0.6, p[1], 1, p[3]]) : lg(c, 0, y, 0, y + T, [0, p[0], 0.4, p[1], 1, p[3]]); c.fillRect(x, y, ver ? T : L, ver ? L : T);
        const step = u * 0.95, off = ((b.vr & 3) * 0.23) * step;
        for (let k = off + step * 0.5; k < L - u * 0.15; k += step) {
          c.fillStyle = rgba(p[3], 0.85); if (ver) c.fillRect(x, y + k, T, Math.max(1, u * 0.07)); else c.fillRect(x + k, y, Math.max(1, u * 0.07), T);
          c.fillStyle = 'rgba(255,255,230,.45)'; if (ver) c.fillRect(x, y + k - Math.max(1, u * 0.05), T, Math.max(1, u * 0.04)); else c.fillRect(x + k + Math.max(1, u * 0.07), y, Math.max(1, u * 0.04), T);
        }
      };
      if (vert) tube(0, 0, h, w, true);
      else { const n = h > u * 0.7 ? 3 : 1, t = h / n; for (let k = 0; k < n; k++) tube(0, k * t, w, t, false); if (n > 1) { c.fillStyle = '#7a5a2a'; for (let x = u * 0.45; x < w - u * 0.2; x += u * 1.1) c.fillRect(x, 0, Math.max(1.5, u * 0.12), h); } }
      break;
    }
    case M_GLASS: {
      if (b.core) {
        // 魔王城城腳的魔晶：紫紅色、一道一道的亮紋
        c.fillStyle = lg(c, 0, 0, w, h, [0, '#ffd0f4', 0.35, '#d24adc', 0.75, '#6a1a9c', 1, '#2a0a4a']); c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,230,255,.8)'; c.lineWidth = Math.max(1, u * 0.06); c.beginPath(); c.moveTo(w * 0.5, 0); c.lineTo(w * 0.5, h); c.moveTo(w * 0.05, h * 0.2); c.lineTo(w * 0.5, h * 0.45); c.lineTo(w * 0.95, h * 0.2); c.stroke();
        break;
      }
      // 琉璃：半透明，邊上亮、斜著兩道反光
      const p = PAL_GLASS;
      c.fillStyle = lg(c, 0, 0, w, h, [0, rgba(p[0], 0.75), 0.45, rgba(p[1], 0.55), 1, rgba(p[2], 0.7)]); c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineCap = 'round';
      for (let x = -h + u * (0.2 + (b.vr & 1) * 0.3); x < w; x += u * 1.4) { c.lineWidth = Math.max(1, u * 0.09); c.beginPath(); c.moveTo(x, h); c.lineTo(x + h * 0.7, h * 0.3); c.stroke(); c.lineWidth = Math.max(1, u * 0.04); c.beginPath(); c.moveTo(x + u * 0.25, h); c.lineTo(x + u * 0.25 + h * 0.5, h * 0.5); c.stroke(); }
      c.strokeStyle = rgba(p[3], 0.6); c.lineWidth = Math.max(1, u * 0.05); c.strokeRect(u * 0.12, u * 0.12, w - u * 0.24, h - u * 0.24);
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(0, 0, w, Math.max(1, u * 0.08));
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
    case M_SNOW: {
      // 積雪：白，底下帶一點藍影，表面幾個凹痕和亮點
      c.fillStyle = lg(c, 0, 0, 0, h, [0, '#ffffff', 0.5, '#f0f6ff', 1, '#bcd2ec']); c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(140,175,215,.32)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(R() * w, h * (0.45 + R() * 0.45), u * (0.12 + R() * 0.16), 0, TAU); c.fill(); }
      c.fillStyle = '#ffffff'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(R() * w, h * (0.12 + R() * 0.3), Math.max(1, u * 0.05), 0, TAU); c.fill(); }
      break;
    }
    case M_KEG: {
      if (b.mag) {
        // 地窖火藥庫的大桶：深色的桶身、三道鐵箍、正中一個黃底紅字的「火」
        c.fillStyle = lg(c, 0, 0, w, 0, [0, '#2e1a0c', 0.3, '#5c3418', 0.55, '#7a4822', 0.8, '#5c3418', 1, '#2e1a0c']); c.fillRect(0, 0, w, h);
        c.fillStyle = '#1c1c24'; for (const f of [0.1, 0.5, 0.86]) c.fillRect(0, h * f - h * 0.05, w, h * 0.1);
        c.fillStyle = '#8a8496'; for (const f of [0.1, 0.5, 0.86]) c.fillRect(0, h * f - h * 0.05, w, h * 0.025);
        c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(w * 0.5, h * 0.3, w * 0.2, 0, TAU); c.fill(); c.strokeStyle = '#2a1608'; c.lineWidth = Math.max(1, u * 0.04); c.stroke();
        c.fillStyle = '#c8241a'; c.font = '900 ' + Math.round(w * 0.3) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('火', w * 0.5, h * 0.31);
        break;
      }
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
    c.strokeStyle = b.mat === M_ICE ? 'rgba(40,90,140,.85)' : b.mat === M_GLASS ? 'rgba(255,255,255,.95)' : 'rgba(10,6,14,.75)'; c.lineWidth = Math.max(1, u * 0.06); c.lineCap = 'round';
    const crack = (x, y, a, len, n) => { c.beginPath(); c.moveTo(x, y); for (let k = 0; k < n; k++) { a += (R() - 0.5) * 1.3; x += Math.cos(a) * len; y += Math.sin(a) * len; c.lineTo(x, y); } c.stroke(); };
    if (ds === 3) {
      // 只有裂紋的透明貼圖（長樑、樓板一段一段蓋上去用）：每一格各畫各的，裂紋不跨到隔壁那一格
      const n = Math.max(1, Math.round(w / u));
      for (let k = 0; k < n; k++) { const x0 = w * k / n, cw = w / n; c.save(); c.beginPath(); c.rect(x0 + 1, 0, cw - 2, h); c.clip(); for (let j = 0; j < 2; j++) crack(x0 + cw * (0.2 + R() * 0.6), j ? h : 0, j ? -1.2 - R() * 0.7 : 1.2 + R() * 0.7, u * 0.24, 3); c.restore(); }
    } else {
      const nc = Math.max(1, Math.round(Math.max(w, h) / u * 0.7)) * ds;
      for (let k = 0; k < nc; k++) crack(R() * w, R() < 0.5 ? 0 : h, R() < 0.5 ? 1.2 + R() * 0.7 : -1.2 - R() * 0.7, u * 0.24, 3);
      if (ds > 1) { c.fillStyle = 'rgba(8,4,12,.2)'; c.fillRect(0, 0, w, h); }
    }
  }
  c.restore();
  if (ds === 3) return;
  path(); c.strokeStyle = b.mat === M_KEG ? '#2a1608' : b.mat === M_CLAY ? '#3a1c0a' : b.mat === M_SNOW ? '#7f9cc4' : P.ink; c.lineWidth = b.prop || b.mat === M_SNOW ? lw * 0.8 : lw; c.stroke();
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

// 吊鐘、水晶吊燈、配重石籃、共鳴晶柱：自己畫（回傳 true 表示畫過了）
function paintSpecial(c, b, w, h, u, P, R) {
  if (b.kind === 'bell') {
    c.fillStyle = lg(c, 0, 0, w, 0, [0, '#6b4a14', 0.25, '#c9962e', 0.5, '#ffe08a', 0.7, '#c9962e', 1, '#5e3f10']); c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(70,45,10,.6)'; c.fillRect(0, h * 0.32, w, Math.max(1, u * 0.1)); c.fillRect(0, h * 0.72, w, Math.max(1.5, u * 0.14));
    c.fillStyle = 'rgba(255,240,180,.55)'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(w * (0.28 + 0.088 * k), h * 0.5, Math.max(1, u * 0.07), 0, TAU); c.fill(); }
    c.fillStyle = '#4a3008'; c.fillRect(0, h - u * 0.22, w, u * 0.22);
    return true;
  }
  if (b.kind === 'lamp' && b.mat === M_IRON) {
    // 魔王城的鐵吊燈：一圈黑鐵、尖刺、幾根燒著紫火的蠟燭
    c.fillStyle = 'rgba(40,20,50,.35)'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2a2433'; c.fillRect(0, h * 0.42, w, Math.max(3, u * 0.24)); c.fillRect(w * 0.46, 0, w * 0.08, h * 0.5);
    c.fillStyle = '#5a5068'; c.fillRect(0, h * 0.42, w, Math.max(1, u * 0.06));
    for (let k = 0; k < 6; k++) { const x = w * (0.09 + k * 0.164); c.fillStyle = '#2a2433'; poly(c, [x - u * 0.1, h * 0.55, x + u * 0.1, h * 0.55, x, h * 0.98]); c.fill(); }
    for (let k = 0; k < 4; k++) { const x = w * (0.16 + k * 0.227); c.fillStyle = '#e8dcc8'; c.fillRect(x - u * 0.07, h * 0.18, u * 0.14, h * 0.25); c.fillStyle = '#d08aff'; c.beginPath(); c.arc(x, h * 0.13, u * 0.11, 0, TAU); c.fill(); }
    return true;
  }
  if (b.kind === 'lamp') {
    // 水晶吊燈：金色的圈、一串一串的水晶、中間一團光
    c.fillStyle = 'rgba(255,240,190,.25)'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9962e'; c.fillRect(0, h * 0.18, w, Math.max(2, u * 0.16)); c.fillRect(w * 0.47, 0, w * 0.06, h * 0.3);
    for (let k = 0; k < 7; k++) { const x = w * (0.08 + k * 0.14), L = h * (0.45 + (k % 3) * 0.14); c.fillStyle = lg(c, x - u * 0.12, 0, x + u * 0.12, 0, [0, '#9feef6', 0.5, '#ffffff', 1, '#4cc0d4']); poly(c, [x - u * 0.13, h * 0.24, x + u * 0.13, h * 0.24, x + u * 0.08, h * 0.24 + L, x, h * 0.3 + L, x - u * 0.08, h * 0.24 + L]); c.fill(); }
    c.fillStyle = 'rgba(255,250,210,.9)'; c.beginPath(); c.arc(w * 0.5, h * 0.42, u * 0.3, 0, TAU); c.fill();
    return true;
  }
  if (b.kind === 'basket') {
    // 配重石籃：竹編的籃子，上面露出一堆石頭
    c.fillStyle = '#8a6a3a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(60,40,15,.75)'; c.lineWidth = Math.max(1, u * 0.07);
    for (let x = -h; x < w; x += u * 0.45) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke(); }
    const p = PAL_ROCK; for (let k = 0; k < 5; k++) { c.fillStyle = k & 1 ? p[1] : p[0]; c.beginPath(); c.arc(w * (0.15 + 0.17 * k), h * 0.12, u * (0.32 + R() * 0.12), 0, TAU); c.fill(); }
    c.fillStyle = '#5a4020'; c.fillRect(0, 0, w, Math.max(2, u * 0.14)); c.fillRect(0, h - u * 0.14, w, u * 0.14);
    return true;
  }
  if (b.reso) {
    // 共鳴晶柱：紫藍色的六角晶體，裡面一道一道光紋
    c.fillStyle = lg(c, 0, 0, w, h, [0, '#f2e8ff', 0.4, '#b48cff', 0.7, '#6a6cff', 1, '#3a2c9a']); c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1, u * 0.06);
    c.beginPath(); c.moveTo(w * 0.5, 0); c.lineTo(w * 0.5, h); c.moveTo(w * 0.05, h * 0.2); c.lineTo(w * 0.5, h * 0.4); c.lineTo(w * 0.95, h * 0.2); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(w * 0.18, h * 0.3, Math.max(1, w * 0.1), h * 0.5);
    return true;
  }
  return false;
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
  stone(c, side, P) {
    // 投石兵：兩手把一顆大石頭舉過肩，頭上綁一條頭巾
    uShadow(c); uLegs(c, P); uBody(c, P); uHead(c, side, P, side === 0);
    if (side === 0) { c.fillStyle = '#e8b04a'; rrect(c, 22, 9, 21, 5.5, 2.4); c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#e8b04a'; poly(c, [22, 11, 14, 8, 15, 15]); c.fill(); }
    // 石頭舉在頭的右上方（臉要露出來）
    uArm(c, P, 40, 19); uArm(c, P, 47, 22);
    ell(c, 47, 10, 9.5, 8.6); fs(c, rg(c, 44, 6, 1, 11, [0, '#bdb6c4', 0.55, '#8e8796', 1, '#5c5566']), '#2a2532', 2);
    c.fillStyle = 'rgba(40,34,48,.45)'; poly(c, [43, 12, 46, 9, 50, 11, 49, 15, 44, 15]); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; ell(c, 43, 6, 2.8, 1.8, -0.5); c.fill();
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
  },
  // ---- 第三篇的新兵種 ----
  chain(c, side, P) {
    // 鏈彈手：右手高舉，甩著鐵鍊連著的兩顆鐵球（後面一道甩動的弧）
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    uHead(c, side, P);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2.2; c.beginPath(); c.arc(50, 15, 13, -2.6, 0.4); c.stroke();
    c.strokeStyle = P.ink; c.lineWidth = 4.6; c.beginPath(); c.moveTo(41, 33); c.lineTo(45, 24); c.stroke();
    c.strokeStyle = P.limb; c.lineWidth = 2.6; c.beginPath(); c.moveTo(41, 33); c.lineTo(45, 24); c.stroke();
    c.strokeStyle = '#5a6070'; c.lineWidth = 2.2; c.setLineDash([2.2, 1.6]); c.beginPath(); c.moveTo(45, 23); c.quadraticCurveTo(47, 10, 53, 7); c.moveTo(45, 23); c.quadraticCurveTo(56, 22, 60, 17); c.stroke(); c.setLineDash([]);
    for (const [bx, by] of [[54, 6], [60, 17]]) { ell(c, bx, by, 4.4, 4.4); fs(c, rg(c, bx - 1.5, by - 1.5, 0.5, 5, [0, '#b8c0cc', 0.5, '#4a505c', 1, '#16181e']), '#0a0b0e', 1.4); }
    uArm(c, P, 45, 23);
  },
  drill(c, side, P) {
    // 鑽地手：頭戴礦工帽（帽燈），扛著一支鑽頭砲
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    uHead(c, side, P, 1);
    c.beginPath(); c.moveTo(20.5, 17); c.quadraticCurveTo(21, 4.5, 32, 4.5); c.quadraticCurveTo(43, 4.5, 43.5, 17); c.closePath(); fs(c, lg(c, 0, 4, 0, 17, [0, '#ffe36a', 1, '#d39a12']), '#5a3a06', 1.6);
    c.fillStyle = '#5a3a06'; c.fillRect(19, 15.5, 26, 2.6);
    ell(c, 39, 10, 2.6, 2.6); fs(c, '#fffbe0', '#5a3a06', 1); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,240,170,.35)'; poly(c, [41, 8, 50, 4, 50, 15, 41, 12]); c.fill(); c.globalCompositeOperation = 'source-over';
    c.save(); c.translate(37, 33); c.rotate(-0.5);
    rrect(c, -12, -5, 18, 10, 3); fs(c, lg(c, 0, -5, 0, 5, [0, '#ffb86a', 1, '#c4621c']), '#4a2408', 1.6);
    poly(c, [6, -5.5, 23, 0, 6, 5.5]); fs(c, lg(c, 6, -5, 6, 5, [0, '#f2f4f8', 0.5, '#9aa2b0', 1, '#5a6070']), '#2a2e38', 1.4);
    c.strokeStyle = '#3a3e48'; c.lineWidth = 1.1; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(8 + k * 5, -4.6 + k * 1.4); c.lineTo(11 + k * 5, 4.4 - k * 1.4); c.stroke(); }
    c.restore();
    uArm(c, P, 41, 36);
  },
  cluster(c, side, P) {
    // 子母砲手：一門矮胖的臼砲，砲口探出一顆滿是小炸彈的母彈
    uShadow(c);
    c.save(); c.translate(-8, 0); uLegs(c, P); uBody(c, P); uHead(c, side, P); uArm(c, P, 42, 37); c.restore();
    poly(c, [38, 57, 60, 57, 57, 51, 41, 51]); fs(c, '#6a5a44', '#2a2010', 1.6);
    c.save(); c.translate(49, 46); c.rotate(-1.05);
    rrect(c, -7, -8, 18, 16, 4); fs(c, lg(c, 0, -8, 0, 8, [0, '#8aa070', 0.5, '#5a7040', 1, '#2e3c1e']), '#1a2210', 1.8);
    c.fillStyle = '#1a2210'; c.fillRect(1, -8, 2.4, 16);
    ell(c, 13, 0, 6.5, 6.5); fs(c, rg(c, 11, -2, 0.5, 7, [0, '#9ab07a', 0.6, '#3a4a26', 1, '#1a2210']), '#0e1408', 1.4);
    c.fillStyle = '#ffd34a'; for (const [dx, dy] of [[12, -3], [15, 1], [11, 2.5], [14.5, -0.8]]) { c.beginPath(); c.arc(dx, dy, 1.1, 0, TAU); c.fill(); }
    c.restore();
  },
  sapper(c, side, P) {
    // 爆破兵：背著一個大背包，手上一捆冒著火花的炸藥
    uShadow(c);
    rrect(c, 12, 27, 11, 17, 3); fs(c, lg(c, 0, 27, 0, 44, [0, '#a88458', 1, '#6a4a28']), '#3a2410', 1.6);
    uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    uHead(c, side, P); uHat(c, 'gog', side, P);
    c.save(); c.translate(46, 33); c.rotate(0.25);
    for (let k = 0; k < 3; k++) { rrect(c, -5 + k * 3.4, -8, 3.6, 15, 1.4); fs(c, lg(c, 0, -8, 0, 7, [0, '#ff6a4a', 1, '#b81c14']), '#5a0a08', 1.1); }
    c.fillStyle = '#3a2410'; c.fillRect(-5.5, -3.5, 11.5, 2.4);
    c.strokeStyle = '#3a2410'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -8); c.quadraticCurveTo(3, -13, 1, -16); c.stroke();
    c.restore();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,220,120,.9)'; c.beginPath(); c.arc(50, 17.5, 2, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,150,60,.5)'; c.beginPath(); c.arc(50, 17.5, 3.8, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    uArm(c, P, 42, 37);
  },
  magnet(c, side, P) {
    // 磁暴師：長袍、方巾，舉著一塊大馬蹄磁鐵，兩個磁極之間電光閃閃
    uShadow(c); uBody(c, P, 1);
    uArm(c, P, 44, 30);
    c.save(); c.translate(50, 16); c.rotate(-0.3);
    c.lineCap = 'butt'; c.strokeStyle = '#3a0a0a'; c.lineWidth = 9; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI); c.stroke();
    c.strokeStyle = '#e8322a'; c.lineWidth = 6.4; c.beginPath(); c.arc(0, 0, 8, 0.05, Math.PI - 0.05); c.stroke();
    rrect(c, 4.6, -7, 6.8, 7.4, 1); fs(c, '#dfe4ec', '#2a2e38', 1.2); rrect(c, -11.4, -7, 6.8, 7.4, 1); fs(c, '#dfe4ec', '#2a2e38', 1.2);
    c.strokeStyle = '#8fd0ff'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-8, -8); c.lineTo(-4, -12); c.lineTo(-1, -9); c.lineTo(3, -13); c.lineTo(8, -8); c.stroke();
    c.restore(); c.lineCap = 'round';
    uHead(c, side, P, 1); uHat(c, 'sage', side, P);
  },
  wind(c, side, P) {
    // 風術士：長袍、尖帽，手持一把大摺扇，身邊兩道旋風
    uShadow(c); uBody(c, P, 1);
    c.strokeStyle = 'rgba(190,255,220,.75)'; c.lineWidth = 1.8;
    for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(52, 42 - k * 9, 8 - k * 2, 2.6, -0.15, 0.2, TAU - 0.9); c.stroke(); }
    uArm(c, P, 44, 33);
    c.save(); c.translate(48, 26); c.rotate(-0.45);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 15, -1.25, 0.3); c.closePath(); fs(c, lg(c, 0, -15, 0, 6, [0, '#f4fff8', 1, '#7ad8a4']), '#1e5a3a', 1.5);
    c.strokeStyle = 'rgba(30,90,58,.7)'; c.lineWidth = 1; for (let k = 1; k < 6; k++) { const a = -1.25 + k * 0.258; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); c.stroke(); }
    c.restore();
    uHead(c, side, P, 1); uHat(c, 'wiz', side, P);
  },
  acid(c, side, P) {
    // 酸液兵：戴防毒面具，舉著一瓶冒泡的綠色酸液
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    uHead(c, side, P);
    ell(c, 36, 23, 4.4, 4.4); fs(c, lg(c, 0, 19, 0, 27, [0, '#8a8f9c', 1, '#3a3f4a']), '#14161c', 1.4); c.fillStyle = '#1a1c22'; for (let k = -1; k <= 1; k++) c.fillRect(34.4 + k * 1.6, 21.5, 0.9, 3);
    c.strokeStyle = P.ink; c.lineWidth = 4.6; c.beginPath(); c.moveTo(42, 34); c.lineTo(46, 25); c.stroke();
    c.strokeStyle = P.limb; c.lineWidth = 2.6; c.beginPath(); c.moveTo(42, 34); c.lineTo(46, 25); c.stroke();
    c.beginPath(); c.moveTo(45, 8); c.lineTo(45, 12); c.quadraticCurveTo(38, 15, 38.5, 21); c.quadraticCurveTo(39, 27, 47, 27); c.quadraticCurveTo(55, 27, 55.5, 21); c.quadraticCurveTo(56, 15, 49, 12); c.lineTo(49, 8); c.closePath();
    fs(c, 'rgba(220,255,230,.35)', '#1e3a28', 1.5);
    c.beginPath(); c.moveTo(39.2, 19); c.quadraticCurveTo(47, 17, 54.8, 19); c.quadraticCurveTo(55, 26.5, 47, 26.5); c.quadraticCurveTo(39, 26.5, 39.2, 19); c.closePath(); c.fillStyle = '#7ce83a'; c.fill();
    c.fillStyle = '#d8ffb0'; for (const [bx, by, br] of [[44, 22, 1.3], [50, 23.5, 1], [47, 20, 0.8], [47, 4, 1.4], [50, 0.5, 1]]) { c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill(); }
    rrect(c, 44, 6.5, 6, 3, 1); fs(c, '#6b4424', '#2a1608', 1);
  },
  sniper(c, side, P) {
    // 狙擊手：壓低的帽子，一支很長、上面架著瞄準鏡的長槍
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 23, 37);
    uHead(c, side, P, 1);
    c.beginPath(); c.moveTo(20.5, 15); c.quadraticCurveTo(22, 6, 32, 6.5); c.quadraticCurveTo(41, 7, 43, 13); c.lineTo(48, 14.5); c.lineTo(43, 16); c.closePath(); fs(c, side ? '#4a2a1c' : '#2a3a2a', P.ink, 1.6);
    c.save(); c.translate(36, 31); c.rotate(-0.12);
    rrect(c, -14, -2.2, 18, 6.4, 2); fs(c, '#8a5a30', '#3c2410', 1.4);
    rrect(c, 2, -1.4, 26, 3, 1); fs(c, '#4a4e58', '#16181e', 1.2);
    rrect(c, 4, -6.5, 11, 3.6, 1.6); fs(c, '#2a2e38', '#0a0b0e', 1.1); c.fillStyle = '#8fd0ff'; c.fillRect(13.5, -6, 1.6, 2.6);
    c.restore();
    uArm(c, P, 40, 33);
  },
  eng(c, side, P) {
    // 工兵：黃色安全帽，高舉一把大鐵鎚，腰上掛著扳手
    uShadow(c); uLegs(c, P); uBody(c, P); uArm(c, P, 21, 38);
    uHead(c, side, P, 1);
    c.beginPath(); c.moveTo(20, 16.5); c.quadraticCurveTo(20.5, 5, 32, 5); c.quadraticCurveTo(43.5, 5, 44, 16.5); c.closePath(); fs(c, lg(c, 0, 5, 0, 17, [0, '#ffe36a', 1, '#e0a018']), '#5a3a06', 1.6);
    rrect(c, 18, 15, 28, 3, 1.4); fs(c, '#f0b82a', '#5a3a06', 1.2); c.fillStyle = '#5a3a06'; c.fillRect(31, 5.5, 2, 10);
    c.strokeStyle = '#7a8090'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(24, 44); c.lineTo(28, 52); c.stroke(); ell(c, 23.5, 43, 2.4, 2.4); fs(c, 'rgba(0,0,0,0)', '#7a8090', 1.8);
    c.strokeStyle = P.ink; c.lineWidth = 4.6; c.beginPath(); c.moveTo(42, 33); c.lineTo(47, 22); c.stroke();
    c.strokeStyle = P.limb; c.lineWidth = 2.6; c.beginPath(); c.moveTo(42, 33); c.lineTo(47, 22); c.stroke();
    c.strokeStyle = '#7a4a1c'; c.lineWidth = 2.8; c.beginPath(); c.moveTo(46, 26); c.lineTo(52, 8); c.stroke();
    c.save(); c.translate(52, 8); c.rotate(-0.33); rrect(c, -6, -3.6, 12, 7.2, 1.6); fs(c, lg(c, 0, -3.6, 0, 3.6, [0, '#c8ccd6', 1, '#5a5f6a']), '#1a1c22', 1.4); c.restore();
    uArm(c, P, 47, 22);
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
  },
  // ---- 第三篇 ----
  chain(c) {          // 兩顆鐵球連著鐵鍊（飛的時候整個轉）
    c.strokeStyle = '#4a505c'; c.lineWidth = 1.6; c.setLineDash([1.8, 1.2]); c.beginPath(); c.moveTo(7, 8); c.lineTo(25, 8); c.stroke(); c.setLineDash([]);
    for (const x of [6, 26]) { ell(c, x, 8, 5, 5); fs(c, rg(c, x - 1.6, 6.4, 0.5, 5.5, [0, '#c0c8d4', 0.5, '#4a505c', 1, '#14161c']), '#07080b', 1.1); }
  },
  drill(c, side) {          // 鑽頭：橘色的尾巴、銀色的螺旋錐頭
    rrect(c, 2, 4, 12, 8, 2.4); fs(c, lg(c, 0, 4, 0, 12, [0, '#ffb86a', 1, '#c4621c']), INK, 1.1);
    c.fillStyle = side ? '#ee3b30' : '#3d86ff'; c.fillRect(4, 4, 2.4, 8);
    poly(c, [13, 3, 31, 8, 13, 13]); fs(c, lg(c, 13, 3, 13, 13, [0, '#f2f4f8', 0.5, '#9aa2b0', 1, '#5a6070']), '#2a2e38', 1.1);
    c.strokeStyle = '#3a3e48'; c.lineWidth = 0.9; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(15 + k * 5, 3.8 + k * 1.3); c.lineTo(18 + k * 5, 12.2 - k * 1.3); c.stroke(); }
  },
  cluster(c) {          // 母彈：圓圓的、表面一圈小炸彈
    ell(c, 16, 8, 7.4, 7.4); fs(c, rg(c, 13.5, 5.5, 0.5, 8, [0, '#9ab07a', 0.5, '#4a5a30', 1, '#1a2210']), '#0e1408', 1.2);
    c.fillStyle = '#ffd34a'; for (const [x, y] of [[13, 5], [18, 4.5], [20.5, 9], [16, 11.5], [11.5, 9.5], [16, 8]]) { c.beginPath(); c.arc(x, y, 1.15, 0, TAU); c.fill(); }
  },
  bomblet(c, side) {
    ell(c, 16, 8, 6.5, 6.5); fs(c, rg(c, 13.5, 5.5, 0.5, 7, [0, '#7a7f8c', 0.5, '#2a2e38', 1, '#0e1014']), '#07080b', 1.1);
    c.fillStyle = side ? '#ee3b30' : '#ffd34a'; c.fillRect(9.5, 7, 13, 2);
  },
  sticky(c) {          // 一捆紅色炸藥，引信冒火花
    for (let k = 0; k < 3; k++) { rrect(c, 6, 2.6 + k * 3.6, 18, 3.6, 1.4); fs(c, lg(c, 0, 2.6 + k * 3.6, 0, 6.2 + k * 3.6, [0, '#ff6a4a', 1, '#b81c14']), '#5a0a08', 0.9); }
    c.fillStyle = '#3a2410'; c.fillRect(13, 2, 2.4, 12);
    c.strokeStyle = '#3a2410'; c.lineWidth = 1; c.beginPath(); c.moveTo(6, 8); c.quadraticCurveTo(2, 6, 1.5, 3); c.stroke();
    c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(1.5, 2.8, 1.4, 0, TAU); c.fill();
  },
  magnet(c) {          // 一顆藍白的磁暴彈，外面繞一圈電光
    ell(c, 16, 8, 6.4, 6.4); fs(c, rg(c, 14.5, 6.5, 0.5, 7, [0, '#ffffff', 0.45, '#8fd0ff', 1, '#2a5ab8']), '#14306a', 1.1);
    c.strokeStyle = '#e8322a'; c.lineWidth = 2.2; c.beginPath(); c.arc(16, 8, 3.4, 0.4, Math.PI - 0.4); c.stroke();
    c.strokeStyle = 'rgba(200,236,255,.9)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(6, 4); c.lineTo(9, 7); c.lineTo(7, 9); c.lineTo(10, 12); c.stroke();
  },
  wind(c) {          // 一團旋轉的綠白風球
    ell(c, 16, 8, 6.4, 6.4); fs(c, rg(c, 15, 7, 0.5, 7, [0, '#ffffff', 0.5, '#c4ffe0', 1, '#5ac08a']), '#1e5a3a', 1);
    c.strokeStyle = '#1e5a3a'; c.lineWidth = 1.1; c.beginPath(); c.arc(16, 8, 3.6, 0.3, 4.2); c.stroke(); c.beginPath(); c.arc(16, 8, 1.6, 2.2, 6); c.stroke();
    c.strokeStyle = 'rgba(200,255,225,.8)'; c.beginPath(); c.moveTo(2, 5); c.lineTo(8, 5); c.moveTo(1, 9); c.lineTo(8, 9); c.moveTo(3, 12.5); c.lineTo(9, 12.5); c.stroke();
  },
  acid(c) {          // 一團冒泡的綠色酸液
    c.beginPath(); c.moveTo(4, 8); c.quadraticCurveTo(8, 2, 17, 2.4); c.quadraticCurveTo(26, 2.8, 27, 8); c.quadraticCurveTo(26, 13.5, 17, 13.6); c.quadraticCurveTo(8, 14, 4, 8); c.closePath();
    fs(c, rg(c, 18, 6, 0.5, 11, [0, '#e8ffb0', 0.4, '#7ce83a', 1, '#2a7a10']), '#1a4a08', 1.1);
    c.fillStyle = 'rgba(240,255,210,.9)'; for (const [x, y, r] of [[20, 5.5, 1.4], [14, 9.5, 1], [23, 9, 0.8]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  },
  snipe(c) {          // 細長的銅彈頭
    c.strokeStyle = 'rgba(255,240,200,.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(1, 8); c.lineTo(14, 8); c.stroke();
    rrect(c, 12, 5.6, 12, 4.8, 1.6); fs(c, lg(c, 0, 5.6, 0, 10.4, [0, '#ffe08a', 1, '#b8801c']), '#4a3006', 1);
    poly(c, [23, 5.6, 31, 8, 23, 10.4]); fs(c, '#d8a040', '#4a3006', 1);
  }
};
SHOT_ART.keg = SHOT_ART.bomb; SHOT_ART.doom = SHOT_ART.dark;
const SSPR = {};     // 'id:side' → { cv, w, h }
function shotSprite(wi, side) {
  const w = WL[wi], key = w.id + ':' + side, sc = (w.id === 'bolt' || w.id === 'snipe' ? 0.22 : w.id === 'bomblet' ? 0.18 : w.id === 'bomb' || w.id === 'lava' || w.id === 'drop' || w.id === 'chain' ? 0.34 : w.id === 'cluster' || w.id === 'drill' || w.id === 'sticky' ? 0.31 : 0.27) * V.T / 16 * 3.4;
  const pw = Math.max(8, Math.round(32 * sc)), ph = Math.max(4, Math.round(16 * sc));
  let s = SSPR[key]; if (s && s.w === pw) return s;
  const cv = mkCanvas(pw, ph), c = cv.getContext('2d'); c.scale(pw / 32, ph / 16); c.lineJoin = 'round'; c.lineCap = 'round';
  (SHOT_ART[w.id] || SHOT_ART.rocket)(c, side === 1 ? 1 : 0);
  s = SSPR[key] = { cv, w: pw, h: ph };
  return s;
}
function artReset() { for (const k in USPR) delete USPR[k]; for (const k in SSPR) delete SSPR[k]; for (const k in BSPR) delete BSPR[k]; }
