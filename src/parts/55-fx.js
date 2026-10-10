/* ===== 55-fx: 特效。聽模擬丟出來的事件，變成火花、煙、碎磚、震動、聲音 ===== */
const NP = 1100;
const FX = {
  n: 0, low: false, calm: false, fl0: -1e9, fl1: -1e9, shake: 0, shx: 0, shy: 0, flash: 0, flashCol: '#fff', slow: 1, slowT: 0, slowK: 0.3, slowCd: 0, chainRef: 0, chainT: 0, stop: 0, heat: 0,
  x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP),
  life: new Float32Array(NP), max: new Float32Array(NP), size: new Float32Array(NP), rot: new Float32Array(NP), vr: new Float32Array(NP),
  type: new Uint8Array(NP), col: new Uint8Array(NP),
  rings: [], bolts: [], pops: [], flung: [], tracers: [], gpop: {}, boomN: 0, glare: 0,
  nums: []          // 傷害數字（跟提示的字分開放：一輪幾十個數字也不會把重要的字擠掉）
};
// 粒子種類
const P_SPARK = 0, P_SMOKE = 1, P_DEBRIS = 2, P_FLASH = 3, P_EMBER = 4, P_SHARD = 5, P_DUST = 6, P_CONF = 7;
// 顏色表（粒子只記編號）
const PCOL = ['#fff6c8', '#ffc34a', '#ff7a2a', '#e8421c', '#8fd0ff', '#3d86ff', '#ff8a6a', '#ffffff', '#6a6470', '#3a3540', '#c9a56a', '#d9c9a8', '#a6e6ff', '#c58aff', '#7ada58', '#ff5aa0', '#ffe14a', '#2a2530'];
const C_WHITEHOT = 0, C_GOLD = 1, C_ORANGE = 2, C_RED = 3, C_SKY = 4, C_BLUE = 5, C_SALMON = 6, C_WHITE = 7, C_GRAY = 8, C_DARK = 9, C_TAN = 10, C_SAND = 11, C_ICE = 12, C_PURPLE = 13, C_GREEN = 14, C_PINK = 15, C_YELLOW = 16, C_SOOT = 17;
// 各種磚碎掉時的顏色（依外觀；第一次用到時從配色表補進 PCOL）
const DEBRIS_COL = {};
function debrisCol(skin, m) {
  const key = skin + m; let i = DEBRIS_COL[key]; if (i !== undefined) return i;
  const P = SKINS[skin] || SKINS.blue;
  const hex = m === M_WOOD ? P.wood[1] : m === M_STONE ? P.stone[1] : m === M_IRON ? P.iron[1] : m === M_ROOF ? P.roof[1] : m === M_ICE ? PAL_ICE[1] : m === M_ROCK ? PAL_ROCK[1] : m === M_KEG ? '#a8672e' : m === M_CLAY ? '#c8743c' : m === M_SNOW ? '#f2f8ff' : P.panel[0];
  i = PCOL.length; PCOL.push(hex); DEBRIS_COL[key] = i; return i;
}
// 同一種提示短時間內只出一次（一輪幾十發同時彈、同時加速，不要整片都是字、都是聲音）
function thr(k, ms) { const now = performance.now(), m = FX.thr || (FX.thr = {}); if (now - (m[k] || 0) < ms) return false; m[k] = now; return true; }
function fxReset() { FX.nums.length = 0; if (FX.bubbles) FX.bubbles.length = 0; FX.n = 0; FX.glare = 0; FX.rings.length = 0; FX.bolts.length = 0; FX.pops.length = 0; FX.flung.length = 0; FX.tracers.length = 0; FX.shake = 0; FX.flash = 0; FX.slow = 1; FX.slowT = 0; FX.slowCd = 0; FX.chainRef = 0; FX.chainT = 0; FX.stop = 0; FX.gpop = {}; FX.heat = 0; }
// 慢動作：精彩的瞬間（連環爆、大坍塌）放慢一下才看得清楚。k 放慢到幾成速度、dur 持續幾秒（真實時間）；不會連續觸發
function slowmo(k, dur, force) { if (FX.slowCd > 0 && !force) return; FX.slowT = dur; FX.slowK = k; FX.slow = k; FX.slowCd = dur + 2.5; }
function part(type, x, y, vx, vy, life, size, col) {
  if (FX.n >= NP) { if (type === P_SMOKE || type === P_DUST || type === P_EMBER) return; FX.n = NP - 1; }
  if (FX.low && (type === P_SMOKE || type === P_EMBER) && Math.random() < 0.5) return;
  const i = FX.n++;
  FX.x[i] = x; FX.y[i] = y; FX.vx[i] = vx; FX.vy[i] = vy; FX.life[i] = life; FX.max[i] = life; FX.size[i] = size; FX.type[i] = type; FX.col[i] = col;
  FX.rot[i] = Math.random() * TAU; FX.vr[i] = (Math.random() - 0.5) * 14;
}
const rndS = () => Math.random() - 0.5;
function burst(type, x, y, n, sp, life, size, col, up) {
  for (let k = 0; k < n; k++) { const a = Math.random() * TAU, v = sp * (0.35 + Math.random() * 0.65); part(type, x, y, Math.cos(a) * v, Math.sin(a) * v + (up || 0), life * (0.6 + Math.random() * 0.6), size * (0.7 + Math.random() * 0.6), col); }
}
function ring(x, y, r0, r1, life, col, lw) { if (FX.rings.length < 40) FX.rings.push({ x, y, r0, r1, t: 0, max: life, col, lw: lw || 0.5 }); }
// 跳出來的字。附近剛好有別的字還在：往上疊，不要蓋在一起
function pop(x, y, txt, col, size, life) {
  if (FX.pops.length > 14) FX.pops.shift();
  size = size || 3.4;
  for (const q of FX.pops) if (q.txt === txt && q.t < 0.45 && Math.abs(q.x - x) < 16 && Math.abs(q.y - y) < 14) return;          // 同一句話剛剛才在旁邊跳過：不再疊一句
  const tw = (t, sz) => { let w = 0; for (const ch of t) w += ch.charCodeAt(0) > 0xff ? 1 : 0.62; return w * sz; };          // 中文字一個字一格寬
  for (let k = 0; k < 4; k++) { let hit = false; for (const q of FX.pops) if (q.t < q.max * 0.75 && Math.abs(q.x - x) < (tw(q.txt, q.size) + tw(txt, size)) * 0.5 && Math.abs(q.y - y) < (q.size + size) * 0.52) { hit = true; y = q.y + (q.size + size) * 0.56; } if (!hit) break; }
  FX.pops.push({ x, y, txt, col: col || '#fff', size, t: 0, max: life || 1.0 });
}
/* 傷害數字：同一個目標短時間內又挨打（連弩一串、酸液一直蝕、一輪砲火炸在同一處），加在同一個數字上，不要跳一整排。
   key：同一個兵、同一處城牆；crit 暴擊的字大一號、金色 */
function numPop(x, y, v, col, size, key, crit) {
  for (const q of FX.nums) if (q.key === key && q.t < 0.55) { q.v += v; q.txt = String(Math.round(q.v)); if (q.t > 0.15) q.t = 0.15; q.crit = q.crit || crit; if (crit) q.size = size; q.x = (q.x + x) / 2; return; }
  if (v < 0.5) { FX.nums.push({ x, y, v, txt: '', col, size, key, t: 0.05, max: 0.95, crit }); return; }
  if (FX.nums.length > 26) FX.nums.shift();
  FX.nums.push({ x: x + rndS() * 0.8, y, v, txt: String(Math.round(v)), col, size, key, t: 0, max: 0.95, crit });
}
const ELEM_COL = { 火剋木: '#ffb05a', 火燒瓦: '#ffb05a', 火化冰: '#ffb05a', 雷剋鐵: '#ffe14a', 酸剋石: '#b8ff6a', 酸蝕鐵: '#b8ff6a', 風掀瓦: '#d8fff0', 風折竹: '#d8fff0', 風捲雪: '#d8fff0', 磁吸鐵: '#9fd8ff' };
function shake(a) { if (FX.calm) return; if (a > FX.shake) FX.shake = Math.min(a, 2.2); }
// 整個畫面閃一下。任一秒內最多兩次（閃太快對光敏感的人有危險）；系統設了「減少動態效果」就只留很淡的一層
function flash(v, col) {
  if (FX.calm) v = Math.min(v, 0.1);
  if (v <= FX.flash) return;
  const now = performance.now(); if (now - FX.fl0 < 1000) return;
  FX.fl0 = FX.fl1; FX.fl1 = now; FX.flash = v; FX.flashCol = col;
}

function fxStep(dt, rdt) {
  // 震動（用真實時間衰減，慢動作時也照常）
  if (FX.shake > 0.01) { const a = FX.shake * V.s * 0.55; FX.shx = (Math.random() - 0.5) * 2 * a; FX.shy = (Math.random() - 0.5) * 2 * a; FX.shake *= Math.pow(0.0025, rdt); } else { FX.shake = 0; FX.shx = FX.shy = 0; }
  if (FX.flash > 0) FX.flash = Math.max(0, FX.flash - rdt * 3.2);
  if (FX.slowT > 0) { FX.slowT -= rdt; FX.slow = FX.slowT <= 0 ? 1 : FX.slowT < 0.35 ? lerp(1, FX.slowK, FX.slowT / 0.35) : FX.slowK; }
  if (FX.slowCd > 0) FX.slowCd -= rdt;
  // 短時間內垮了很多塊：放慢
  FX.chainT -= dt; if (FX.chainT <= 0) { if (S.chain - FX.chainRef >= 5 && S.state === 'play') slowmo(0.45, 1.1); FX.chainRef = S.chain; FX.chainT = 0.35; } else if (S.chain < FX.chainRef) FX.chainRef = S.chain;
  FX.heat = Math.max(0, FX.heat - rdt * 0.5);
  const g = GRAV;
  for (let i = 0; i < FX.n; i++) {
    FX.life[i] -= dt;
    if (FX.life[i] <= 0) { const j = --FX.n; if (i !== j) { FX.x[i] = FX.x[j]; FX.y[i] = FX.y[j]; FX.vx[i] = FX.vx[j]; FX.vy[i] = FX.vy[j]; FX.life[i] = FX.life[j]; FX.max[i] = FX.max[j]; FX.size[i] = FX.size[j]; FX.type[i] = FX.type[j]; FX.col[i] = FX.col[j]; FX.rot[i] = FX.rot[j]; FX.vr[i] = FX.vr[j]; } i--; continue; }
    const t = FX.type[i];
    if (t === P_DEBRIS || t === P_SHARD || t === P_CONF) {
      FX.vy[i] -= g * (t === P_CONF ? 0.25 : 0.9) * dt; FX.rot[i] += FX.vr[i] * dt;
      if (t === P_CONF) { FX.vx[i] *= 1 - 2 * dt; }
      const gy = groundY(FX.x[i]);
      if (FX.y[i] <= gy && FX.vy[i] < 0 && gy > -100) { FX.y[i] = gy; FX.vy[i] *= -0.32; FX.vx[i] *= 0.55; FX.vr[i] *= 0.5; if (Math.abs(FX.vy[i]) < 4) { FX.vy[i] = 0; FX.vx[i] *= 0.7; } }
    } else if (t === P_SPARK) { FX.vy[i] -= g * 0.5 * dt; FX.vx[i] *= 1 - 1.6 * dt; FX.vy[i] *= 1 - 1.6 * dt; }
    else if (t === P_SMOKE) { FX.vx[i] *= 1 - 2.2 * dt; FX.vy[i] = FX.vy[i] * (1 - 2.2 * dt) + 5 * dt; FX.vx[i] += S.wind * 0.5 * dt; }
    else if (t === P_EMBER) { FX.vy[i] += 16 * dt; FX.vx[i] += (rndS() * 20 + S.wind * 0.6) * dt; }
    else if (t === P_DUST) { FX.vx[i] *= 1 - 3 * dt; FX.vy[i] *= 1 - 3 * dt; FX.vx[i] += S.wind * 0.4 * dt; }
    FX.x[i] += FX.vx[i] * dt; FX.y[i] += FX.vy[i] * dt;
  }
  for (let i = FX.rings.length - 1; i >= 0; i--) { const r = FX.rings[i]; r.t += dt; if (r.t >= r.max) FX.rings.splice(i, 1); }
  for (let i = FX.bolts.length - 1; i >= 0; i--) { const b = FX.bolts[i]; b.t += rdt; if (b.t >= b.max) FX.bolts.splice(i, 1); }
  for (let i = FX.pops.length - 1; i >= 0; i--) { const p = FX.pops[i]; p.t += rdt; if (p.t >= p.max) FX.pops.splice(i, 1); }
  for (let i = FX.nums.length - 1; i >= 0; i--) { const p = FX.nums[i]; p.t += rdt; if (p.t >= p.max) FX.nums.splice(i, 1); }
  for (let i = FX.tracers.length - 1; i >= 0; i--) { const p = FX.tracers[i]; p.t += dt; if (p.t >= 0.14) FX.tracers.splice(i, 1); }
  for (let i = FX.flung.length - 1; i >= 0; i--) { const f = FX.flung[i]; f.t += dt; f.vy -= g * 0.8 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; if (f.t > 2.2 || f.y < -20) FX.flung.splice(i, 1); }
  FX.boomN = 0; FX.glare *= Math.pow(0.03, rdt);
}

/* 模擬事件 → 特效 */
function fxOn(t, a, b, c, d, e, f) {
  switch (t) {
    case 'fire': {
      const w = WL[d], dir = c === 0 ? 1 : -1;
      part(P_FLASH, a + dir * 0.6, b, 0, 0, 0.09, w.id === 'bomb' ? 3.6 : w.id === 'bolt' ? 1.2 : 2.2, w.id === 'ice' ? C_ICE : w.id === 'zap' ? C_YELLOW : w.id === 'dark' ? C_PINK : C_WHITEHOT);
      if (w.id === 'bomb') { burst(P_SMOKE, a + dir, b, 4, 9, 0.6, 1.8, C_GRAY); shake(0.12); }
      sfx(w.id === 'bolt' ? 'bolt' : w.id === 'bomb' || w.id === 'cluster' ? 'cannon' : w.id === 'fire' || w.id === 'chain' || w.id === 'sticky' || w.id === 'acid' ? 'whoosh' : w.id === 'ice' ? 'frost' : w.id === 'zap' || w.id === 'magnet' ? 'charge' : w.id === 'dark' ? 'dark' : w.id === 'drill' ? 'drill' : w.id === 'snipe' ? 'snipe' : w.id === 'wind' ? 'gust' : 'rocket', c);
      break;
    }
    case 'boom': {
      const w = WL[d], lit = f >= 100, mass = lit ? f - 100 : f, r = Math.max(1.6, c) * (mass > 1 ? Math.min(1.5, Math.sqrt(mass)) : Math.max(0.55, Math.pow(mass, 0.22)));
      if (++FX.boomN > 26) break;             // 同一幀爆太多就不再加特效
      const k = w.kind; FX.heat = Math.min(1, FX.heat + 0.03 + r * 0.008);
      const col = lit || k === K_FIRE ? C_ORANGE : k === K_ICE ? C_ICE : k === K_ZAP ? C_YELLOW : k === K_DARK ? C_PURPLE : k === K_ACID ? C_GREEN : k === K_WIND ? C_WHITE : k === K_MAG ? C_SKY : C_GOLD;
      // 閃光：一顆一顆爆的時候夠亮；短時間內爆了一堆（倍增之後一輪幾十發、火藥桶連環爆）就一發比一發淡，
      // 不然整片白掉三分之一秒，城樓怎麼斷、怎麼垮正好都被蓋住
      { const gl = FX.glare, fi = FX.n; FX.glare += r; part(P_FLASH, a, b, 0, 0, 0.12 + r * 0.009, r * 1.2, k === K_ICE ? C_ICE : k === K_DARK ? C_PINK : C_WHITEHOT); if (FX.n > fi && gl > 3) FX.max[fi] = FX.life[fi] * (1 + (gl - 3) / 5); }
      if (k === K_PIERCE) { burst(P_SPARK, a, b, 2, 18, 0.2, 0.5, C_WHITEHOT); sfx('tick'); break; }
      ring(a, b, r * 0.3, r * 1.25, 0.26, k === K_ICE ? '#bfeeff' : k === K_DARK ? '#ff7ad0' : '#fff0b0', 0.42);
      burst(P_SPARK, a, b, FX.low ? 3 : 4 + Math.min(8, r * 1.2) | 0, 16 + r * 5, 0.38, 0.6, col);
      burst(P_SMOKE, a, b, FX.low ? 1 : 2 + Math.min(4, r * 0.5) | 0, 5 + r, 0.7 + r * 0.05, 1.3 + r * 0.32, k === K_ICE ? C_WHITE : C_GRAY, 3);
      if (k === K_ICE) burst(P_SHARD, a, b, 4, 22, 0.6, 0.55, C_ICE, 8);
      if (k === K_ACID) { burst(P_SHARD, a, b, 7, 18, 0.7, 0.5, C_GREEN, 6); burst(P_SMOKE, a, b, 3, 5, 0.9, 1.8, C_GREEN, 2); }
      if (lit || k === K_FIRE) burst(P_EMBER, a, b, 4, 8, 0.7, 0.7, C_ORANGE, 4);
      if (r >= 4.6) { shake(0.25 + r * 0.05); sfx(r >= 7 ? 'boom3' : 'boom2'); vibrate(20); } else { shake(0.06); sfx(k === K_ICE ? 'ice' : k === K_FIRE ? 'fireboom' : 'boom'); }
      if (w.id === 'keg' && S.state === 'play') slowmo(0.4, 1.3);
      break;
    }
    case 'cell': {
      // a,b 位置；c 磚材；d 哪一邊；e 傷害種類（99 = 整座垮掉）；f 那塊磚
      const fin = e === 99, col = debrisCol(f.skin || 'blue', c), cs = Math.cos(f.a), sn = Math.sin(f.a), area = f.w * f.h / (CS * CS);
      const n = Math.round(clamp(area * 3.5, 3, 12) * (FX.low ? 0.5 : 1) * (f.fragged ? 0.45 : 1));       // 已經裂成幾大塊的，小碎屑少一點
      for (let k = 0; k < n; k++) {
        const lx = rndS() * f.w * 0.9, ly = rndS() * f.h * 0.9;
        part(c === M_ICE || c === M_CLAY || c === M_GLASS ? P_SHARD : P_DEBRIS, a + lx * cs - ly * sn, b + lx * sn + ly * cs, rndS() * (c === M_GLASS ? 44 : 34), 8 + Math.random() * 26, 1.0 + Math.random() * 0.9, 0.7 + Math.random() * 0.7, c === M_GLASS ? (k & 1 ? C_ICE : C_WHITE) : col);
      }
      // 城破（整座自己垮下來）：不是炸開的，碎屑不往上噴；多的是往兩邊滾開的塵土
      for (let k = 0; k < (fin ? 3 : Math.min(3, 1 + area | 0)); k++) part(P_DUST, a + rndS() * f.w * 0.6, b + rndS() * f.h * 0.6, rndS() * (fin ? 22 : 8), 2 + Math.random() * (fin ? 7 : 4), fin ? 1.1 : 0.6, fin ? 3.4 : 2.4, c === M_ICE ? C_WHITE : C_SAND);
      if (c === M_GLASS) { burst(P_SPARK, a, b, 5, 26, 0.4, 0.45, C_ICE); }
      if (c === M_SNOW) burst(P_DUST, a, b, 4, 9, 0.9, 2.6, C_WHITE, 2);
      if (f.roll) {          // 滾石撞停、碎成一地：大塊的石屑往四面滾開，一大團黃沙
        for (let k = 0; k < (FX.low ? 5 : 10); k++) part(P_DEBRIS, a + rndS() * f.w * 0.4, b + rndS() * f.h * 0.4, rndS() * 30, 6 + Math.random() * 20, 1.1 + Math.random() * 0.8, 1.0 + Math.random() * 0.9, col);
        for (let k = 0; k < 5; k++) part(P_DUST, a + rndS() * f.w * 0.5, b - f.h * 0.2 + Math.random() * f.h * 0.5, rndS() * 14, 1 + Math.random() * 5, 1.3, 3.6, C_SAND);
        shake(0.12);
      }
      sfx(c === M_GLASS ? 'glass' : c === M_ICE || c === M_CLAY ? 'shatter' : c === M_SNOW ? 'thud' : c === M_WOOD || c === M_ROOF || c === M_KEG || c === M_BAMBOO ? 'crack' : c === M_IRON ? 'clang' : 'crumble'); FX.heat = Math.min(1, FX.heat + 0.03);
      if (fin) shake(0.35);
      break;
    }
    case 'crack': if (Math.random() < 0.5) part(P_DEBRIS, a + rndS() * 2, b + rndS() * 2, rndS() * 16, 4 + Math.random() * 10, 0.7, 0.4, C_SAND); break;
    case 'gate': {
      // a,b 位置；c 倍數；d 符的主人；e 砲彈是哪一邊的
      ring(a, b, 0.6, 3.2 + c * 0.3, 0.22, d === 2 ? '#ffe9a0' : d === 1 ? '#ffb0a0' : '#bfe0ff', 0.36);
      burst(P_SPARK, a, b, 2, 14, 0.25, 0.45, d === 2 ? C_GOLD : d === 1 ? C_SALMON : C_SKY);
      if (e === 0) { const now = performance.now(); if (now - (FX.gpop[c] || 0) > 420) { FX.gpop[c] = now; pop(a, b + 4, '×' + c, d === 2 ? '#ffe14a' : '#cfe6ff', 3 + Math.min(2.4, c * 0.3), 0.7); } }
      sfx(d === 2 ? 'gold' : 'gate', e);
      break;
    }
    case 'gbad': burst(P_SMOKE, a, b, 2, 6, 0.4, 1.1, C_PURPLE); sfx('bad'); break;
    case 'ghit': burst(P_SPARK, a, b, 3, 16, 0.25, 0.5, c === 1 ? C_SALMON : C_SKY); sfx('ghit'); break;
    case 'gbreak': {
      // d: 1 被打掉、2 用完、3 時間到
      const col = c === 2 ? C_GOLD : c === 1 ? C_SALMON : c === 3 ? C_PURPLE : C_SKY;
      if (d === 1) { burst(P_SHARD, a, b, 14, 34, 0.9, 0.7, col, 10); burst(P_SPARK, a, b, 10, 30, 0.5, 0.7, col); ring(a, b, 1, 9, 0.4, '#ffffff', 0.5); pop(a, b + 6, c === 1 ? '赤符破！' : '藍符被毀', c === 1 ? '#ffe14a' : '#ff9a8a', 3.6, 1.1); sfx('gbreak'); shake(0.25); }
      else { burst(P_SPARK, a, b, 6, 12, 0.4, 0.5, col); sfx('gfade'); }
      break;
    }
    case 'gspawn': ring(a, b, 7, 1.5, 0.35, c === 2 ? '#ffe9a0' : c === 1 ? '#ff9a8a' : c === 3 ? '#c58aff' : '#9fd0ff', 0.5); burst(P_SPARK, a, b, 8, 16, 0.5, 0.5, c === 2 ? C_GOLD : c === 1 ? C_SALMON : c === 3 ? C_PURPLE : C_SKY); sfx(c === 2 ? 'goldin' : 'gspawn'); break;
    case 'thud': {
      // a,b 撞擊點；c 衝量；d 速度
      const k = Math.min(1, c / 2600);
      for (let i = 0; i < 2 + (k * 5 | 0); i++) part(P_DUST, a + rndS() * 3, b + Math.random() * 1.2, rndS() * (14 + k * 20), 2 + Math.random() * 6, 0.6 + Math.random() * 0.5, 1.8 + k * 2.4, C_SAND);
      shake(0.12 + k * 0.9); sfx(k > 0.42 ? 'crash' : 'thud'); if (k > 0.3) vibrate(25);
      break;
    }
    case 'udie': {
      // a,b 位置；c 哪一邊；d 兵種；e 死法
      FX.flung.push({ side: c, type: d, x: a, y: b - 1.8, vx: (c === 0 ? -1 : 1) * (8 + Math.random() * 14), vy: 26 + Math.random() * 14, rot: 0, vr: (c === 0 ? 1 : -1) * (5 + Math.random() * 6), t: 0 });
      burst(P_SPARK, a, b, 8, 22, 0.5, 0.6, c === 0 ? C_SKY : C_SALMON); ring(a, b, 0.5, 5, 0.3, '#ffffff', 0.4);
      // 剛才那一聲「哇！」不用留著跟這一句疊在一起；整座城垮掉時順便倒下的不再一個一個報
      for (let i = FX.pops.length - 1; i >= 0; i--) { const q = FX.pops[i]; if (q.yelp && Math.abs(q.x - a) < 9 && Math.abs(q.y - b) < 12) FX.pops.splice(i, 1); }
      if (S.state === 'play') pop(a, b + 3.5, c === 1 ? (e === 1 ? '砸扁！' : e === 4 ? '摔下去了！' : e === 5 ? '轟出城外！' : e === 6 ? '轟飛了！' : e === 3 ? '燒到了！' : e === 7 ? '沖走了！' : '擊倒！') : (e === 5 ? '被轟出城' : e === 4 ? '摔下去了' : e === 6 ? '被轟飛了' : e === 1 ? '被砸扁了' : e === 7 ? '被沖走了' : '陣亡'), c === 1 ? '#ffe14a' : '#ff8a7a', 3.2, 1.1);
      sfx(c === 1 ? 'kill' : 'lostunit'); if (c === 0) { shake(0.4); vibrate(60); }
      if (e === 1 && S.state === 'play') slowmo(0.5, 0.7);
      break;
    }
    case 'yelp': pop(a, b, c ? '哇啊！' : '哇！', '#ffffff', 2.5, 0.8); FX.pops[FX.pops.length - 1].yelp = 1; break;
    case 'uland': burst(P_DUST, a, b, 3, 8, 0.4, 1.4, C_SAND); break;
    case 'landout': burst(P_DUST, a, b, 6, 10, 0.5, 1.6, C_SAND); if (S.state === 'play') pop(a, b + 3.5, c === 1 ? '摔出城外！' : '摔出城外', c === 1 ? '#ffe14a' : '#ffb08a', 2.8, 1.0); break;
    case 'zap': {
      // a 欄位中心 x；b 劈到的高度；c 從多高劈下來
      const pts = []; let x = a, y = c; const n = 9;
      for (let k = 0; k <= n; k++) { pts.push(k === 0 || k === n ? a : a + rndS() * 5, lerp(c, b, k / n)); }
      FX.bolts.push({ pts, t: 0, max: 0.2, col: '#fff7c0' });
      part(P_FLASH, a, b, 0, 0, 0.16, 6, C_YELLOW); burst(P_SPARK, a, b, 10, 30, 0.4, 0.6, C_YELLOW); ring(a, b, 1, 6, 0.25, '#fff7c0', 0.4);
      flash(0.22, '#fff8d8'); shake(0.3); sfx('thunder');
      break;
    }
    case 'spark': burst(P_SPARK, a, b, 3, 16, 0.25, 0.4, C_YELLOW); break;
    case 'ignite': burst(P_EMBER, a, b, 2, 4, 0.6, 0.6, C_ORANGE, 3); break;
    case 'lit': burst(P_EMBER, a, b, 3, 6, 0.4, 0.7, C_ORANGE, 3); sfx('lit'); break;
    case 'shield': ring(a, b, 4, 30, 0.4, '#bfe6ff', 0.6); sfx('shield'); break;
    case 'shieldhit': if (FX.rings.length < 30) ring(a, b, 0.4, 3.4, 0.22, c === 0 ? '#cfeaff' : '#ffc0b0', 0.4); part(P_FLASH, a, b, 0, 0, 0.1, 1.8, c === 0 ? C_SKY : C_SALMON); sfx('shieldhit'); break;
    case 'ult': ring(a, b, 3, 40, 0.5, c === 0 ? '#ffe9a0' : '#ffb0a0', 0.8); burst(P_SPARK, a, b, 16, 40, 0.7, 0.8, C_GOLD); flash(0.25, '#fff0b0'); sfx('ult'); vibrate(40); break;
    case 'ultarm': ring(a, b, 26, 4, 0.4, '#ffe9a0', 0.7); sfx('arm'); break;
    case 'ultoff': sfx('click'); break;
    case 'shieldoff': break;
    case 'skip': pop(a, b, d ? '被電暈' : '凍住了', d ? '#ffe14a' : '#bfeeff', 2.6, 1.0); break;
    case 'freeze': burst(P_SHARD, a, b, 6, 14, 0.6, 0.5, C_ICE, 6); sfx('frost'); break;
    case 'chain': {
      // a 這一輪垮了幾塊；b 誰打的
      if (b === 0) { pop(MID + 30, 30, '坍塌 ×' + a, '#ffe14a', 3.4 + Math.min(2.6, a * 0.1), 1.6); sfx('chain', Math.min(6, a / 6 | 0)); }
      break;
    }
    case 'turn': if (a === 0) sfx('turn'); break;
    case 'volley': break;
    case 'round': break;
    case 'lanternoff': burst(P_SMOKE, a, b, 3, 4, 0.5, 1.2, C_WHITE); break;
    case 'orbgo': sfx('orb'); break;
    case 'port': burst(P_SPARK, a, b, 3, 12, 0.3, 0.5, c === 0 ? C_SKY : C_SALMON); if (d === 0) sfx('port'); break;
    case 'ping': part(P_FLASH, a, b, 0, 0, 0.12, 2.6, C_ICE); burst(P_SPARK, a, b, 3, 14, 0.25, 0.4, C_ICE); if (thr('ping', 90)) sfx('ping'); if (e) { burst(P_SHARD, a, b, 5, 16, 0.5, 0.45, C_ICE, 4); if (thr('frostpop', 700)) pop(a, b + 3.5, '結霜！', '#cfeeff', 2.8, 0.9); } break;          // 冰鏡反彈（e：結霜）
    case 'flak': FX.tracers.push({ x0: a, y0: b, x1: c, y1: d, t: 0, side: e }); if (f) { part(P_FLASH, c, d, 0, 0, 0.1, 1.8, C_WHITEHOT); burst(P_SMOKE, c, d, 2, 4, 0.4, 1.0, C_DARK); } sfx('flak'); break;
    case 'pop': burst(P_CONF, a, b, 16, 30, 1.0, 0.7, d === 1 ? C_RED : C_SKY, 6); burst(P_SMOKE, a, b, 4, 8, 0.6, 1.8, C_GRAY); ring(a, b, 1, 7, 0.3, '#ffffff', 0.4); pop(a, b + 4, '擊落！', '#ffe14a', 3.2, 0.9); sfx('pop'); break;
    case 'launch': burst(P_SMOKE, a, b, 4, 6, 0.6, 1.4, C_WHITE); sfx('launch'); break;
    case 'drop': sfx('drop'); break;
    case 'lantern': sfx('lantern'); break;
    case 'bonus': {
      // c 哪一邊拿到；d 種類
      const txt = d === 'heal' ? '全軍回血！' : d === 'rage' ? '怒火！下一輪打兩次' : d === 'charge' ? '技能全滿！' : '援軍到！';
      burst(P_CONF, a, b, 18, 34, 1.1, 0.7, c === 0 ? C_GOLD : C_RED, 8); ring(a, b, 1, 10, 0.4, '#fff0b0', 0.5);
      pop(a, b + 4, (c === 0 ? '' : '敵軍') + txt, c === 0 ? '#ffe14a' : '#ff8a7a', 3.4, 1.4); sfx(c === 0 ? 'bonus' : 'bad');
      break;
    }
    case 'revive': ring(a, b + 2, 6, 1, 0.5, '#bfe6ff', 0.5); burst(P_SPARK, a, b + 2, 10, 16, 0.6, 0.5, C_SKY); break;
    case 'build': part(P_DUST, a, b, 0, 3, 0.5, 2.2, C_WHITE); break;
    case 'orb': sfx('orb'); break;
    case 'orbdie': burst(P_SPARK, a, b, 22, 44, 0.7, 0.9, C_PINK); burst(P_SMOKE, a, b, 8, 12, 0.9, 2.6, C_PURPLE); ring(a, b, 1, 14, 0.45, '#ff9ad8', 0.7); pop(a, b + 5, '擊破！', '#ffe14a', 3.6, 1.0); shake(0.5); sfx('boom2'); break;
    case 'orbback': burst(P_SPARK, a, b, 26, 46, 0.7, 0.9, C_SKY); ring(a, b, 1, 16, 0.45, '#bfe6ff', 0.8); ring(a, b, 12, 2, 0.3, '#ffffff', 0.5); pop(a, b + 6, '反彈！', '#8fe0ff', 4.2, 1.3); flash(0.2, '#cfeaff'); shake(0.5); slowmo(0.45, 0.5); sfx('ping'); sfx('orb'); vibrate(50); break;
    case 'bar': part(P_FLASH, a, b, 0, 0, 0.1, 2.2, C_PINK); burst(P_SPARK, a, b, 2, 14, 0.25, 0.4, C_PINK); sfx('shieldhit'); break;
    case 'barbreak': burst(P_SHARD, a, b, 16, 36, 0.9, 0.7, C_PINK, 8); ring(a, b, 1, 10, 0.4, '#ffffff', 0.5); pop(a, b + 5, '結界破！', '#ffe14a', 3.4, 1.0); sfx('gbreak'); shake(0.3); break;
    case 'barup': sfx('gspawn'); break;
    case 'erupt': for (let k = 0; k < 12; k++) part(P_EMBER, a + rndS() * 4, b + Math.random() * 6, rndS() * 14, 24 + Math.random() * 30, 0.9, 1.0, C_ORANGE); shake(0.2); sfx('erupt'); break;
    case 'rockwarn': sfx('warn'); break;
    case 'rockstop': burst(P_DEBRIS, a, b, 10, 30, 0.8, 0.8, C_GRAY, 8); burst(P_DUST, a, b, 4, 8, 0.6, 2.4, C_SAND); pop(a, b + 4, '擋住了！', c === 0 ? '#cfe6ff' : '#ffc4b8', 3, 0.9); sfx('crumble'); break;
    case 'rumble': shake(0.5); sfx('rumble'); break;
    case 'slam': ring(a, b, 1, 9, 0.5, '#f3e2c0', 0.6); for (let i = 0; i < 9; i++) part(P_DUST, a + rndS() * 4, b + Math.random() * 1.5, rndS() * 26, 3 + Math.random() * 8, 0.9 + Math.random() * 0.5, 2.6 + Math.random() * 1.6, C_SAND); burst(P_DEBRIS, a, b + 1, 8, 24, 0.9, 0.9, '#9a9488', 6); shake(0.7); sfx('rumble'); vibrate(60); break;          // 石碑整塊砸進城裡
    case 'dirt': burst(P_DUST, a, b + 0.5, 3, 10, 0.5, 1.6, C_SAND, 4); break;
    case 'tick': burst(P_SPARK, a, b, 2, 12, 0.2, 0.4, C_WHITEHOT); sfx('tick'); break;
    // 第二篇
    case 'snap': {
      // 繩子斷了（c：1 鐵鍊；d 哪一邊的；e 吊著什麼）
      burst(c ? P_SPARK : P_DEBRIS, a, b, c ? 10 : 6, 22, 0.5, 0.5, c ? C_WHITEHOT : C_TAN); ring(a, b, 0.4, 4, 0.22, '#ffffff', 0.35);
      if (S.state === 'play') pop(a, b + 3, e === 'pin' ? '樑斷了！' : c ? '鐵鍊斷了！' : '繩子斷了！', d === 1 ? '#ffe14a' : '#ff8a7a', 2.8, 1.0);
      if (e === 'pin') { burst(P_DEBRIS, a, b, 10, 20, 0.8, 0.6, C_TAN); sfx('crash'); shake(0.4); } else { sfx(c ? 'chainsnap' : 'snap'); shake(0.15); }
      break;
    }
    case 'bonk': {
      // 吊鐘、吊燈砸在兵頭上（c：bell / lamp）
      if (c === 'bell') { ring(a, b, 1, 12, 0.6, '#ffe08a', 0.7); ring(a, b, 1, 20, 0.9, '#ffe08a', 0.4); sfx('bong'); shake(0.6); }
      else { burst(P_SHARD, a, b, 18, 28, 0.7, 0.6, C_ICE, 6); sfx('glass'); shake(0.4); }
      if (S.state === 'play') pop(a, b + 6.5, c === 'bell' ? '噹——！' : '砸中了！', '#ffe14a', 3.4, 1.2);
      vibrate(60);
      break;
    }
    case 'tilt': {
      // 天秤開始翻
      burst(P_DUST, a, b, 6, 10, 0.7, 2.0, C_SAND); sfx('groan'); shake(0.3);
      if (S.state === 'play') pop(a, b + 6, '失去平衡！', '#ffe14a', 3.6, 1.3);
      break;
    }
    case 'rhit': burst(c ? P_SPARK : P_DEBRIS, a, b, 2, 10, 0.3, 0.4, c ? C_WHITEHOT : C_TAN); break;
    case 'creak': {
      // 撐不住了：掉灰、嘎吱一聲（d：超載的程度）
      for (let k = 0; k < 2 + (d > 1.6 ? 2 : 0); k++) part(P_DUST, a + rndS() * 1.4, b, rndS() * 2, -2 - Math.random() * 3, 0.9, 0.9 + Math.random() * 0.6, c === M_GLASS ? C_WHITE : C_SAND);
      if (Math.random() < 0.5) part(P_DEBRIS, a + rndS(), b, rndS() * 4, 2, 0.8, 0.3, C_SAND);
      sfx(c === M_GLASS ? 'tink' : 'creak');
      break;
    }
    case 'splash': {
      // 掉進水裡（c 大小；d 0 磚 1 兵 2 砲彈）
      const n = d === 2 ? 4 : 6 + Math.min(8, c * 3 | 0);
      for (let k = 0; k < n; k++) part(P_SHARD, a + rndS() * (1 + c), b, rndS() * (8 + c * 4), 14 + Math.random() * (10 + c * 6), 0.6 + Math.random() * 0.3, 0.45 + Math.random() * 0.4, k & 1 ? C_WHITE : C_SKY);
      ring(a, b, 0.6, 3 + c * 1.6, 0.4, '#e8fbff', 0.35);
      if (d !== 2) sfx('splash');
      break;
    }
    case 'reso': {
      // 共鳴晶柱被打到：一圈一圈的紫光往外傳
      for (let k = 0; k < 4; k++) ring(a, b, 1 + k * 2, 30, 0.6 + k * 0.18, '#d8b8ff', 0.6);
      burst(P_SPARK, a, b, 18, 36, 0.8, 0.7, C_PURPLE); flash(0.18, '#e8d8ff');
      if (S.state === 'play') pop(a, b + 5, '共鳴！', '#e0c8ff', 4, 1.4);
      sfx('chime'); shake(0.3);
      break;
    }
    case 'resohit': part(P_FLASH, a, b, 0, 0, 0.14, 2.4, C_PURPLE); burst(P_SHARD, a, b, 3, 12, 0.4, 0.4, C_ICE); if (Math.random() < 0.4) sfx('tink'); break;
    case 'glint': part(P_FLASH, a, b, 0, 0, 0.18, 1.4, C_ICE); burst(P_SPARK, a, b, 3, 6, 0.5, 0.35, C_WHITE); break;
    // 新的機關
    case 'tpop': {
      // 吊著浮島的氣球破了（c 哪一邊的）
      burst(P_CONF, a, b, 22, 34, 1.2, 0.8, c === 1 ? C_RED : C_SKY, 6); burst(P_SMOKE, a, b, 5, 9, 0.7, 2.2, C_WHITE); ring(a, b, 1, 9, 0.35, '#ffffff', 0.5);
      if (S.state === 'play') pop(a, b + 4.5, c === 1 ? '氣球破了！' : '我方的氣球破了', c === 1 ? '#ffe14a' : '#ff8a7a', 3.3, 1.2);
      sfx('pop'); sfx('groan'); shake(0.35); vibrate(40);
      break;
    }
    case 'leak': {
      // 船艙打穿了，開始進水（c 哪一邊的船）
      for (let k = 0; k < 14; k++) part(P_SHARD, a + rndS() * 3, b + rndS() * 2, rndS() * 16, 6 + Math.random() * 16, 0.8, 0.5, k & 1 ? C_WHITE : C_SKY);
      ring(a, b, 0.8, 6, 0.35, '#e8fbff', 0.4);
      if (S.state === 'play') pop(a, b + 4, c === 1 ? '敵船進水了！' : '我方的船進水了', c === 1 ? '#ffe14a' : '#ff8a7a', 3.2, 1.3);
      sfx('splash'); sfx('crack'); shake(0.3);
      break;
    }
    case 'splinter': burst(P_DEBRIS, a, b, 4, 14, 0.6, 0.45, C_TAN, 4); break;
    case 'fuse': {
      // 引信點著了（c 哪一邊的；d 第幾次點著）
      burst(P_SPARK, a, b, 12, 18, 0.5, 0.5, C_GOLD); burst(P_EMBER, a, b, 4, 6, 0.6, 0.7, C_ORANGE, 3); part(P_FLASH, a, b, 0, 0, 0.16, 2.2, C_ORANGE);
      if (S.state === 'play' && d === 1) pop(a, b + 3.5, c === 1 ? '引信點著了！' : '我方的引信著火了！', c === 1 ? '#ffe14a' : '#ff8a7a', 3.2, 1.4);
      sfx('lit'); sfx('fizz');
      break;
    }
    case 'roll': {
      // 滾石衝下坡（c 往哪一邊的城）
      burst(P_DUST, a, b - 1.5, 6, 10, 0.9, 2.4, C_SAND, 2); burst(P_DEBRIS, a, b - 1, 6, 14, 0.7, 0.5, C_TAN, 6);
      if (S.state === 'play') pop(a, b + 4, c === 1 ? '滾石衝下去了！' : '滾石往我方衝過來！', c === 1 ? '#ffe14a' : '#ff8a7a', 3.4, 1.3);
      sfx('rumble'); shake(0.4); vibrate(30);
      break;
    }
    case 'reroll': burst(P_DUST, a, b, 5, 8, 0.8, 2.2, C_SAND, 3); if (S.state === 'play') pop(a, b + 4, '新的滾石架好了', '#fff0c0', 2.6, 1.1); sfx('thud'); break;
    case 'bellpeak': sfx('bong'); break;
    case 'snowpuff': burst(P_DUST, a, b, 2, 4, 0.7, 1.6, C_WHITE, 2); break;
    case 'thunk': {
      const k = Math.min(1, c / 900);
      burst(P_DUST, a, b, 3 + (k * 4 | 0), 10 + k * 14, 0.6, 1.6 + k * 1.6, C_SAND); burst(P_DEBRIS, a, b, 4, 18, 0.7, 0.5, C_GRAY);
      shake(0.2 + k * 0.5); sfx('thunk');
      break;
    }
    // ---- 戰場中間的放大（49-amp） ----
    case 'rollgo': burst(P_DUST, a, b, 4, 9, 0.6, 1.8, C_SAND, 2); burst(P_DEBRIS, a, b, 3, 12, 0.5, 0.4, C_TAN, 6); if (thr('rollgo', 120)) sfx('thud'); break;
    case 'rollhit': {
      // c：這一發滾到最後變成幾倍
      if (c >= 1.25 && thr('rollhit' + (c * 10 | 0), 300)) pop(a, b + 3.5, '×' + c.toFixed(1), c >= 2 ? '#ffe14a' : '#fff0c0', 2.6 + Math.min(1.6, c * 0.5), 0.8);
      if (c >= 1.8) { ring(a, b, 0.8, 4 + c, 0.3, '#fff0b0', 0.45); shake(0.15 + c * 0.05); }
      break;
    }
    case 'hop': burst(P_DUST, a, b, 3, 8, 0.5, 1.4, C_SAND, 3); if (thr('hop', 150)) sfx('tick'); break;
    case 'rollsmash': burst(P_DEBRIS, a, b, 8, 20, 0.7, 0.6, C_TAN, 6); pop(a, b + 4, '撞斷了！', '#ffe14a', 3, 1.0); sfx('crack'); shake(0.2); break;
    case 'wskip': {
      // c 第幾跳；d 誰的；e 現在幾倍
      ring(a, b, 0.4, 2.6 + c * 0.6, 0.35, '#e8fbff', 0.4);
      for (let k = 0; k < 5; k++) part(P_SHARD, a + rndS() * 1.5, b, rndS() * 10, 8 + Math.random() * 10, 0.5, 0.4, k & 1 ? C_WHITE : C_SKY);
      if (thr('wskip' + c, 260)) { pop(a, b + 2.6 + c * 0.6, '×' + e.toFixed(1), c >= 3 ? '#ffe14a' : '#cfeeff', 2.4 + c * 0.3, 0.7); sfx('splash'); }
      break;
    }
    case 'boost': burst(P_SPARK, a, b, 4, 16, 0.3, 0.5, C_WHITE); if (thr('boost', 380)) { pop(a, b + 3, '加速 ×' + (+d || 1).toFixed(1), '#e8f6ff', 2.8, 0.8); sfx('whoosh'); } break;          // d：現在幾倍
    case 'jet': if (S.state === 'play') sfx('gust'); break;
    case 'spring': ring(a, b, 0.5, 3.4, 0.25, '#ffe9a0', 0.45); burst(P_SPARK, a, b, 5, 18, 0.3, 0.5, C_GOLD); if (thr('spring', 140)) sfx('ping'); if (d >= 2 && thr('spring2', 400)) pop(a, b + 3, '彈 ×' + d, '#ffe14a', 2.8, 0.8); break;
    case 'prism': {
      for (const col of [C_ORANGE, C_YELLOW, C_SKY]) burst(P_SPARK, a, b, 3, 20, 0.4, 0.5, col);
      ring(a, b, 1, 6, 0.3, '#ffffff', 0.4); if (thr('prism', 160)) sfx('chime');
      break;
    }
    case 'charge': burst(P_SPARK, a, b, 3, 14, 0.25, 0.4, C_YELLOW); if (thr('charge', 220)) sfx('charge'); break;
    case 'swallow': burst(P_SPARK, a, b, 6, 10, 0.35, 0.5, C_PURPLE); if (thr('swallow', 300)) { pop(a, b + 3, '被吞了', '#d8b8ff', 2.4, 0.7); sfx('dark'); } break;
    case 'rodzap': {
      // 雷劈在避雷針上（c 從多高劈下來；d 哪一邊的針）
      const pts = []; const n = 7; for (let k = 0; k <= n; k++) pts.push(k === 0 || k === n ? a : a + rndS() * 4, lerp(c, b, k / n));
      FX.bolts.push({ pts, t: 0, max: 0.18, col: '#fff7c0' }); part(P_FLASH, a, b, 0, 0, 0.14, 4, C_YELLOW); burst(P_SPARK, a, b, 8, 22, 0.35, 0.5, C_YELLOW);
      flash(0.12, '#fff8d8'); sfx('thunder');
      if (S.state === 'play' && thr('rodzap', 1200)) pop(a, b + 4, d === 1 ? '避雷針把雷引走了' : '我方避雷針引走了雷', d === 1 ? '#ffc4b8' : '#cfe6ff', 2.8, 1.1);
      break;
    }
    case 'liftbreak': {
      burst(P_SHARD, a, b, 22, 36, 1.0, 0.7, C_ICE, 6); burst(P_SPARK, a, b, 14, 30, 0.6, 0.6, C_PURPLE); ring(a, b, 1, 12, 0.45, '#e8d8ff', 0.6);
      if (S.state === 'play') pop(a, b + 4.5, c === 1 ? '浮空晶石碎了！' : '我方的浮空晶石碎了', c === 1 ? '#ffe14a' : '#ff8a7a', 3.4, 1.3);
      sfx('glass'); sfx('groan'); shake(0.45); vibrate(50);
      break;
    }
    case 'magboom': if (S.state === 'play') pop(a, b + 6, c === 1 ? '火藥庫爆炸！' : '我方火藥庫爆炸了', c === 1 ? '#ffe14a' : '#ff8a7a', 4, 1.5); slowmo(0.4, 1.4); break;
    // 魔王、大鐘、吊籠
    case 'bosssay': { const bu = typeof bossUnit === 'function' ? bossUnit() : null; (FX.bubbles || (FX.bubbles = [])).length = 0; FX.bubbles.push({ txt: c, x: a, y: b, who: bu && bu.alive ? bu : null, t: 0, max: clamp(1.4 + c.length * 0.16, 2.2, 4.2) }); break; }
    case 'bossnext': sfx(c === 'meteor' ? 'warn' : c === 'orb' ? 'orb' : 'dark'); ring(a, b, 1, 7, 0.4, c === 'meteor' ? '#ffb07a' : '#ff9ad8', 0.5); break;
    case 'bosstired': ring(a, b, 9, 1.5, 0.5, '#ffe14a', 0.7); pop(a, b + 7, '破綻！傷害加倍', '#ffe14a', 3.4, 1.6); sfx('star'); break;
    case 'bossheal': if (c >= 4) pop(a, b + 5, '+' + Math.round(c), '#b8ff9a', 2.6, 0.9); burst(P_SPARK, a, b, 8, 14, 0.6, 0.5, C_GREEN); break;
    case 'summon': ring(a, b, 1, 9, 0.5, '#b8ff9a', 0.6); burst(P_SMOKE, a, b, 6, 8, 0.8, 2.2, C_PURPLE); sfx('dark'); break;
    case 'bellring': {
      // 鐘鳴：一圈一圈的金色聲波往對面那座塔推過去（d：心柱還在）
      for (let k = 0; k < 5; k++) ring(a + (c === 0 ? 1 : -1) * k * 3, b - k * 2, 2 + k * 2, 40, 0.7 + k * 0.12, '#ffe08a', 0.7);
      flash(0.15, '#fff2c8'); shake(0.8); sfx('bong'); sfx('chime'); vibrate(80);
      if (S.state === 'play') pop(a, b + 7, c === 0 ? (d ? '鐘鳴！（心柱擋掉大半）' : '鐘鳴！') : (d ? '敵軍敲響了大鐘' : '敵軍的鐘鳴！'), c === 0 ? '#ffe14a' : '#ff8a7a', 3.8, 1.5);
      break;
    }
    case 'brake': burst(P_DEBRIS, a, b, 8, 16, 0.6, 0.5, C_TAN, 4); if (S.state === 'play') pop(a, b - 3, c === 1 ? '閘斷了！吊籠在往下沉' : '我方的閘斷了！', c === 1 ? '#ffe14a' : '#ff8a7a', 3.2, 1.5); sfx('chainsnap'); sfx('groan'); shake(0.3); break;
    case 'end': {
      slowmo(0.3, 1.8, true); shake(2.0); flash(0.3, '#fff6d8'); sfx('collapse'); vibrate(200);
      ring(a, b, 2, 16, 0.6, '#fff0b0', 0.7);         // 只留一圈小的，別把整座城垮下來的樣子蓋住
      break;
    }
    case 'bossback': ring(a, b, 14, 1.5, 0.5, '#ff7ad0', 0.8); burst(P_SPARK, a, b, 18, 30, 0.7, 0.8, C_PINK); burst(P_SMOKE, a, b, 6, 8, 0.8, 2.4, C_PURPLE); pop(a, b + 7, '魔王飛回來了', '#ff9ad8', 3.4, 1.4); flash(0.3, '#ff5aa0'); sfx('dark'); break;
    case 'phase': flash(0.7, '#ff5aa0'); shake(1.6); sfx('phase'); vibrate(120); break;
    case 'crumble': shake(0.5); sfx('collapse'); burst(P_DUST, a, b, 14, 10, 1.2, 2.6, C_SAND); pop(a, b + 8, c === 1 ? '敵城搖搖欲墜' : '我方城樓搖搖欲墜', c === 1 ? '#ffe14a' : '#ff9a8a', 3, 1.3); break;
    case 'bosscastle': flash(0.6, '#ffd36a'); shake(2.2); sfx('collapse'); vibrate(180); ring(a, b, 3, 18, 0.7, '#ffe08a', 0.8); pop(a, b + 9, '魔王城塌了！魔王摔下寶座', '#ffe14a', 4, 1.6); break;
    case 'sudden': flash(0.5, '#ff6a3a'); sfx('horn'); break;
    // ---- 第三篇：傷害數字、暴擊、屬性剋制、新兵器 ----
    case 'udmg': if (S.state === 'play' || c >= 1) numPop(a, b, c, e ? '#ffd23a' : d === 0 ? '#ff9a88' : '#ffffff', e ? 3.6 : 2.5, f, e); break;
    case 'bdmg': if (c >= 2) numPop(a, b, c, '#f3dca8', 2.1, 'b' + Math.round(a / 5) + ':' + Math.round(b / 5), false); break;
    case 'crit': ring(a, b, 0.5, 4.5, 0.3, '#ffe14a', 0.6); burst(P_SPARK, a, b, 10, 26, 0.4, 0.6, C_YELLOW); if (thr('crit', 260)) { pop(a, b + 3.4, '暴擊！', '#ffe14a', 3.4, 0.9); sfx('crit'); } break;
    case 'elem': if (thr('elem' + c, 700)) pop(a, b, c, ELEM_COL[c] || '#ffffff', 2.8, 0.9); break;
    case 'douse': burst(P_SMOKE, a, b, 6, 6, 1.0, 2.0, C_WHITE, 4); if (thr('douse', 600)) pop(a, b + 2, '冰滅火', '#bfeeff', 2.8, 0.9); sfx('fizz'); break;
    case 'split': part(P_FLASH, a, b, 0, 0, 0.12, 2.6, C_GOLD); ring(a, b, 0.5, 4, 0.25, '#fff0b0', 0.4); burst(P_SMOKE, a, b, 3, 6, 0.6, 1.4, C_GRAY); if (thr('split', 120)) sfx('pop'); break;
    case 'stuck': burst(P_SPARK, a, b, 5, 10, 0.3, 0.4, C_RED); if (thr('stuck', 200)) { sfx('stick'); if (S.state === 'play') pop(a, b + 2.6, c === 0 ? '炸藥黏上去了' : '敵軍的炸藥黏上來了！', c === 0 ? '#ffd0a0' : '#ff9a88', 2.6, 1.1); } break;
    case 'chargego': ring(a, b, 3, 0.5, 0.3, '#ff8a6a', 0.5); if (thr('chargego', 300)) sfx('warn'); break;
    case 'defuse': burst(P_SPARK, a, b, 8, 14, 0.4, 0.5, C_ORANGE); burst(P_SMOKE, a, b, 2, 4, 0.6, 1.2, C_GRAY); if (thr('defuse', 300)) { pop(a, b + 2.6, d === 1 ? '炸藥跟著掉下去了' : d === 2 ? '護罩悶熄了炸藥' : '炸藥被拆掉了', '#ffe9a0', 2.6, 1.0); sfx(d === 2 ? 'fizz' : 'click'); } break;          // d：1 黏的磚碎了、2 護罩悶熄
    case 'drill': burst(P_DEBRIS, a, b, 4, 12, 0.5, 0.4, C_TAN, 4); burst(P_SPARK, a, b, 4, 16, 0.25, 0.4, C_WHITEHOT); if (thr('drillhit', 90)) sfx('drill'); break;
    case 'chainhit': burst(P_SPARK, a, b, 6, 18, 0.3, 0.45, C_WHITEHOT); if (thr('chainhit', 120)) sfx('clang'); break;
    case 'tangle': if (S.state === 'play') pop(a, b + 2.6, '被鐵鍊纏住！', '#d8dee8', 2.6, 1.0); sfx('chainsnap'); break;
    case 'magpulse': for (let k = 0; k < 3; k++) ring(a, b, c * (1 - k * 0.22), 1, 0.45 + k * 0.1, '#9fd8ff', 0.5); burst(P_SPARK, a, b, 8, 20, 0.35, 0.45, C_SKY); sfx('mag'); break;
    case 'twister': burst(P_DUST, a, b, 8, 12, 0.8, 2.2, C_WHITE, 6); sfx('gust'); break;
    case 'fix': burst(P_SPARK, a, b, 6, 10, 0.5, 0.45, C_GREEN, 4); if (thr('fix' + d, 500)) { pop(a, b + 2.4, '修好了', '#b8ff9a', 2.4, 0.9); sfx('fix'); } break;
    case 'wall': burst(P_DUST, a, b - 2, 6, 8, 0.6, 2, C_SAND, 3); pop(a, b + 3.2, '架起木牆', '#ffe0a8', 2.6, 1.0); sfx('fix'); break;
    case 'wind': sfx('gust'); break;
  }
  if (typeof uiEvent === 'function') uiEvent(t, a, b, c, d, e, f);
}
