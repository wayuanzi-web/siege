'use strict';
/* ===== 10-core: 常數、工具、亂數 ===== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const sign = (v) => (v < 0 ? -1 : 1);

// 模擬用的可重現亂數（特效另外用 Math.random，不影響戰局）
let _seed = 20261006;
function srand(s) { _seed = s >>> 0; }
function rnd() {
  _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rr = (a, b) => a + (b - a) * rnd();
const ri = (n) => (rnd() * n) | 0;
function gauss() { return (rnd() + rnd() + rnd() + rnd() - 2) * 1.22; }   // 近似常態，標準差約 0.7

/* 戰場座標：x 往右、y 往上，城腳所在的地面是 y = 0。
   我方城樓在左（side 0，往右打），敵城在右（side 1，往左打）。 */
const CS = 3.4;            // 一塊磚的邊長
const GRAV = 48;           // 重力
const VIEW_W = 112;        // 戰場寬（兩座城加中間的空地）
const GUT = 9;             // 戰場左右各留一條放按鈕的空間
const VIEW_H = 66;         // 一定看得到的高度（含地面以下 GROUND_D）
const GROUND_D = 9;        // 地面線以下留給地面的高度
const MID = VIEW_W / 2;    // 戰場中線
const VMIN = 32, VMAX = 86;            // 砲口初速範圍
const ANG_MIN = 0.10, ANG_MAX = 1.50;  // 仰角範圍（弧度）
const CASTLE_L = 3.4;                  // 我方城樓左緣
const CASTLE_R = VIEW_W - 3.4;         // 敵城右緣
const STEP = 1 / 60;

// 三角波（-1..1）：移動的倍增符用，等速來回比較好預判
function tri(p) { p = p - Math.floor(p); return p < 0.5 ? p * 4 - 1 : 3 - p * 4; }
function fmt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// 把初速向量限制在可用的仰角與力道範圍內。dir = +1 往右打、-1 往左打
function clampAim(vx, vy, dir) {
  let fx = vx * dir, fy = vy;
  if (fx < 1) fx = 1;
  let a = Math.atan2(fy, fx), v = Math.hypot(fx, fy);
  a = clamp(a, ANG_MIN, ANG_MAX); v = clamp(v, VMIN, VMAX);
  return [Math.cos(a) * v * dir, Math.sin(a) * v];
}
