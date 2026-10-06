/* ===== 15-view: 戰場座標 ↔ 畫面像素。整個戰場固定入鏡，不捲動 ===== */
const V = { W: 1, H: 1, s: 1, gy: 0, cx: 0, dpr: 1, padL: 0, padR: 0, T: 1, x0: 0, x1: VIEW_W, top: 70 };
function setView(W, H, dpr, padL, padR) {
  V.W = W; V.H = H; V.dpr = dpr; V.padL = padL || 0; V.padR = padR || 0;
  const uw = W - V.padL - V.padR;
  V.s = Math.min(uw / (VIEW_W + GUT * 2), H / VIEW_H);
  V.cx = V.padL + uw / 2; V.gy = Math.round(H - GROUND_D * V.s); V.T = CS * V.s;
  V.x0 = MID - V.cx / V.s; V.x1 = MID + (W - V.cx) / V.s; V.top = V.gy / V.s;      // 畫面上看得到的戰場範圍
}
const X = (wx) => (wx - MID) * V.s + V.cx;
const Y = (wy) => V.gy - wy * V.s;
const WX = (px) => (px - V.cx) / V.s + MID;
const WY = (py) => (V.gy - py) / V.s;

/* ---------- 畫圖的小工具 ---------- */
function mkCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; }
function rrect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
function poly(c, p) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); }
function lg(c, x0, y0, x1, y1, st) { const g = c.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
function rg(c, x, y, r0, r1, st) { const g = c.createRadialGradient(x, y, r0, x, y, r1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
function fs(c, fill, stroke, lw) { if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
// 顏色混合：'#rrggbb' 之間取 t
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t)), bl = Math.round(lerp(pa & 255, pb & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function rgba(hex, a) { const p = parseInt(hex.slice(1), 16); return 'rgba(' + ((p >> 16) & 255) + ',' + ((p >> 8) & 255) + ',' + (p & 255) + ',' + a + ')'; }
// 特效、佈景用的亂數（跟戰局無關，可以指定種子讓每次畫出來一樣）
function mkRand(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
