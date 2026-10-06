/* ===== 55-fx: 特效。聽模擬丟出來的事件，變成火花、煙、碎磚、震動、聲音 ===== */
const NP = 1100;
const FX = {
  n: 0, low: false, shake: 0, shx: 0, shy: 0, flash: 0, flashCol: '#fff', slow: 1, slowT: 0, stop: 0, heat: 0,
  x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP),
  life: new Float32Array(NP), max: new Float32Array(NP), size: new Float32Array(NP), rot: new Float32Array(NP), vr: new Float32Array(NP),
  type: new Uint8Array(NP), col: new Uint8Array(NP),
  rings: [], bolts: [], pops: [], flung: [], tracers: [], gpop: {}, boomN: 0
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
  const hex = m === M_WOOD ? P.wood[1] : m === M_STONE ? P.stone[1] : m === M_IRON ? P.iron[1] : m === M_ROOF ? P.roof[1] : m === M_ICE ? PAL_ICE[1] : m === M_ROCK ? PAL_ROCK[1] : m === M_KEG ? '#a8672e' : P.panel[0];
  i = PCOL.length; PCOL.push(hex); DEBRIS_COL[key] = i; return i;
}
function fxReset() { FX.n = 0; FX.rings.length = 0; FX.bolts.length = 0; FX.pops.length = 0; FX.flung.length = 0; FX.tracers.length = 0; FX.shake = 0; FX.flash = 0; FX.slow = 1; FX.slowT = 0; FX.stop = 0; FX.gpop = {}; FX.heat = 0; }
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
function pop(x, y, txt, col, size, life) { if (FX.pops.length > 14) FX.pops.shift(); FX.pops.push({ x, y, txt, col: col || '#fff', size: size || 3.4, t: 0, max: life || 1.0 }); }
function shake(a) { if (a > FX.shake) FX.shake = Math.min(a, 2.2); }

function fxStep(dt, rdt) {
  // 震動（用真實時間衰減，慢動作時也照常）
  if (FX.shake > 0.01) { const a = FX.shake * V.s * 0.55; FX.shx = (Math.random() - 0.5) * 2 * a; FX.shy = (Math.random() - 0.5) * 2 * a; FX.shake *= Math.pow(0.0025, rdt); } else { FX.shake = 0; FX.shx = FX.shy = 0; }
  if (FX.flash > 0) FX.flash = Math.max(0, FX.flash - rdt * 3.2);
  if (FX.slowT > 0) { FX.slowT -= rdt; FX.slow = FX.slowT > 0 ? 0.28 : 1; if (FX.slowT <= 0.35 && FX.slowT > 0) FX.slow = lerp(1, 0.28, FX.slowT / 0.35); }
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
  for (let i = FX.tracers.length - 1; i >= 0; i--) { const p = FX.tracers[i]; p.t += dt; if (p.t >= 0.14) FX.tracers.splice(i, 1); }
  for (let i = FX.flung.length - 1; i >= 0; i--) { const f = FX.flung[i]; f.t += dt; f.vy -= g * 0.8 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; if (f.t > 2.2 || f.y < -20) FX.flung.splice(i, 1); }
  FX.boomN = 0;
}

/* 模擬事件 → 特效 */
function fxOn(t, a, b, c, d, e, f) {
  switch (t) {
    case 'fire': {
      const w = WL[d], dir = c === 0 ? 1 : -1;
      part(P_FLASH, a + dir * 0.6, b, 0, 0, 0.09, w.id === 'bomb' ? 3.6 : w.id === 'bolt' ? 1.2 : 2.2, w.id === 'ice' ? C_ICE : w.id === 'zap' ? C_YELLOW : w.id === 'dark' ? C_PINK : C_WHITEHOT);
      if (w.id === 'bomb') { burst(P_SMOKE, a + dir, b, 4, 9, 0.6, 1.8, C_GRAY); shake(0.12); }
      sfx(w.id === 'bolt' ? 'bolt' : w.id === 'bomb' ? 'cannon' : w.id === 'fire' ? 'whoosh' : w.id === 'ice' ? 'frost' : w.id === 'zap' ? 'charge' : w.id === 'dark' ? 'dark' : 'rocket', c);
      break;
    }
    case 'boom': {
      const w = WL[d], lit = f >= 100, mass = lit ? f - 100 : f, r = Math.max(1.6, c) * (mass > 1 ? Math.min(1.5, Math.sqrt(mass)) : 1);
      if (++FX.boomN > 26) break;             // 同一幀爆太多就不再加特效
      const k = w.kind; FX.heat = Math.min(1, FX.heat + 0.03 + r * 0.008);
      const col = lit || k === K_FIRE ? C_ORANGE : k === K_ICE ? C_ICE : k === K_ZAP ? C_YELLOW : k === K_DARK ? C_PURPLE : C_GOLD;
      part(P_FLASH, a, b, 0, 0, 0.14 + r * 0.012, r * 1.5, k === K_ICE ? C_ICE : k === K_DARK ? C_PINK : C_WHITEHOT);
      if (k === K_PIERCE) { burst(P_SPARK, a, b, 2, 18, 0.2, 0.5, C_WHITEHOT); sfx('tick'); break; }
      ring(a, b, r * 0.3, r * 1.25, 0.26, k === K_ICE ? '#bfeeff' : k === K_DARK ? '#ff7ad0' : '#fff0b0', 0.42);
      burst(P_SPARK, a, b, FX.low ? 3 : 4 + Math.min(8, r * 1.2) | 0, 16 + r * 5, 0.38, 0.6, col);
      burst(P_SMOKE, a, b, FX.low ? 1 : 2 + Math.min(4, r * 0.5) | 0, 5 + r, 0.7 + r * 0.05, 1.3 + r * 0.32, k === K_ICE ? C_WHITE : C_GRAY, 3);
      if (k === K_ICE) burst(P_SHARD, a, b, 4, 22, 0.6, 0.55, C_ICE, 8);
      if (lit || k === K_FIRE) burst(P_EMBER, a, b, 4, 8, 0.7, 0.7, C_ORANGE, 4);
      if (r >= 5) { shake(0.22 + r * 0.04); sfx(r >= 8 ? 'boom3' : 'boom2'); } else { shake(0.05); sfx(k === K_ICE ? 'ice' : k === K_FIRE ? 'fireboom' : 'boom'); }
      break;
    }
    case 'cell': {
      // a,b 位置；c 磚材；d 哪一邊；e 傷害種類（99 = 整座垮掉）；f 外觀
      const fin = e === 99, col = debrisCol(f || 'blue', c), n = c === M_PANEL ? 2 : FX.low ? 3 : 5;
      for (let k = 0; k < n; k++) part(c === M_ICE ? P_SHARD : P_DEBRIS, a + rndS() * CS * 0.8, b + rndS() * CS * 0.8, rndS() * (fin ? 60 : 30), (fin ? 16 : 6) + Math.random() * (fin ? 46 : 24), 1.0 + Math.random() * 0.9, c === M_PANEL ? 0.5 : 0.75 + Math.random() * 0.6, col);
      if (c !== M_PANEL) { part(P_DUST, a, b, rndS() * 8, 2 + Math.random() * 4, 0.6, 2.4, c === M_ICE ? C_WHITE : C_SAND); sfx(c === M_ICE ? 'shatter' : c === M_WOOD || c === M_ROOF ? 'crack' : c === M_IRON ? 'clang' : 'crumble'); FX.heat = Math.min(1, FX.heat + 0.02); }
      if (fin) shake(0.5);
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
    case 'fall': sfx('creak'); break;
    case 'thud': {
      // a,b 落點；c 幾塊；d 掉了幾格
      const w = Math.sqrt(c) * 2.2;
      for (let k = 0; k < Math.min(10, 3 + c); k++) part(P_DUST, a + rndS() * w * 2, b + Math.random() * 1.5, rndS() * 26, 2 + Math.random() * 6, 0.7 + Math.random() * 0.5, 2.2 + Math.random() * 2, C_SAND);
      shake(Math.min(1.3, 0.2 + c * 0.04 + d * 0.12)); sfx(c > 8 ? 'crash' : 'thud'); vibrate(c > 8 ? 40 : 15);
      break;
    }
    case 'udie': {
      // a,b 位置；c 哪一邊；d 兵種；e 死法
      FX.flung.push({ side: c, type: d, x: a, y: b - 1.8, vx: (c === 0 ? -1 : 1) * (8 + Math.random() * 14), vy: 26 + Math.random() * 14, rot: 0, vr: (c === 0 ? 1 : -1) * (5 + Math.random() * 6), t: 0 });
      burst(P_SPARK, a, b, 8, 22, 0.5, 0.6, c === 0 ? C_SKY : C_SALMON); ring(a, b, 0.5, 5, 0.3, '#ffffff', 0.4);
      pop(a, b + 3.5, c === 1 ? '擊倒！' : '陣亡', c === 1 ? '#ffe14a' : '#ff8a7a', 3.2, 1.0);
      sfx(c === 1 ? 'kill' : 'lostunit'); if (c === 0) { shake(0.4); vibrate(60); }
      break;
    }
    case 'uland': burst(P_DUST, a, b, 3, 8, 0.4, 1.4, C_SAND); break;
    case 'zap': {
      // a 欄位中心 x；b 劈到的高度；c 從多高劈下來
      const pts = []; let x = a, y = c; const n = 9;
      for (let k = 0; k <= n; k++) { pts.push(k === 0 || k === n ? a : a + rndS() * 5, lerp(c, b, k / n)); }
      FX.bolts.push({ pts, t: 0, max: 0.2, col: '#fff7c0' });
      part(P_FLASH, a, b, 0, 0, 0.16, 6, C_YELLOW); burst(P_SPARK, a, b, 10, 30, 0.4, 0.6, C_YELLOW); ring(a, b, 1, 6, 0.25, '#fff7c0', 0.4);
      FX.flash = Math.max(FX.flash, 0.22); FX.flashCol = '#fff8d8'; shake(0.3); sfx('thunder');
      break;
    }
    case 'spark': burst(P_SPARK, a, b, 3, 16, 0.25, 0.4, C_YELLOW); break;
    case 'ignite': burst(P_EMBER, a, b, 2, 4, 0.6, 0.6, C_ORANGE, 3); break;
    case 'lit': burst(P_EMBER, a, b, 3, 6, 0.4, 0.7, C_ORANGE, 3); sfx('lit'); break;
    case 'shield': ring(a, b, 4, 30, 0.4, '#bfe6ff', 0.6); sfx('shield'); break;
    case 'shieldhit': if (FX.rings.length < 30) ring(a, b, 0.4, 3.4, 0.22, c === 0 ? '#cfeaff' : '#ffc0b0', 0.4); part(P_FLASH, a, b, 0, 0, 0.1, 1.8, c === 0 ? C_SKY : C_SALMON); sfx('shieldhit'); break;
    case 'ult': ring(a, b, 3, 40, 0.5, c === 0 ? '#ffe9a0' : '#ffb0a0', 0.8); burst(P_SPARK, a, b, 16, 40, 0.7, 0.8, C_GOLD); FX.flash = Math.max(FX.flash, 0.25); FX.flashCol = '#fff0b0'; sfx('ult'); vibrate(40); break;
    case 'port': burst(P_SPARK, a, b, 3, 12, 0.3, 0.5, c === 0 ? C_SKY : C_SALMON); if (d === 0) sfx('port'); break;
    case 'ping': part(P_FLASH, a, b, 0, 0, 0.12, 2.6, C_ICE); burst(P_SPARK, a, b, 3, 14, 0.25, 0.4, C_ICE); sfx('ping'); break;
    case 'flak': FX.tracers.push({ x0: a, y0: b, x1: c, y1: d, t: 0, side: e }); if (f) { part(P_FLASH, c, d, 0, 0, 0.1, 1.8, C_WHITEHOT); burst(P_SMOKE, c, d, 2, 4, 0.4, 1.0, C_DARK); } sfx('flak'); break;
    case 'pop': burst(P_CONF, a, b, 16, 30, 1.0, 0.7, d === 1 ? C_RED : C_SKY, 6); burst(P_SMOKE, a, b, 4, 8, 0.6, 1.8, C_GRAY); ring(a, b, 1, 7, 0.3, '#ffffff', 0.4); pop(a, b + 4, '擊落！', '#ffe14a', 3.2, 0.9); sfx('pop'); break;
    case 'launch': burst(P_SMOKE, a, b, 4, 6, 0.6, 1.4, C_WHITE); sfx('launch'); break;
    case 'drop': sfx('drop'); break;
    case 'lantern': sfx('lantern'); break;
    case 'bonus': {
      // c 哪一邊拿到；d 種類
      const txt = d === 'heal' ? '修城！' : d === 'rage' ? '怒火！射速提升' : d === 'charge' ? '技能全滿！' : '援軍到！';
      burst(P_CONF, a, b, 18, 34, 1.1, 0.7, c === 0 ? C_GOLD : C_RED, 8); ring(a, b, 1, 10, 0.4, '#fff0b0', 0.5);
      pop(a, b + 4, (c === 0 ? '' : '敵軍') + txt, c === 0 ? '#ffe14a' : '#ff8a7a', 3.4, 1.4); sfx(c === 0 ? 'bonus' : 'bad');
      break;
    }
    case 'revive': ring(a, b + 2, 6, 1, 0.5, '#bfe6ff', 0.5); burst(P_SPARK, a, b + 2, 10, 16, 0.6, 0.5, C_SKY); break;
    case 'build': part(P_DUST, a, b, 0, 3, 0.5, 2.2, C_WHITE); break;
    case 'orb': sfx('orb'); break;
    case 'orbdie': burst(P_SPARK, a, b, 22, 44, 0.7, 0.9, C_PINK); burst(P_SMOKE, a, b, 8, 12, 0.9, 2.6, C_PURPLE); ring(a, b, 1, 14, 0.45, '#ff9ad8', 0.7); pop(a, b + 5, '擊破！', '#ffe14a', 3.6, 1.0); shake(0.5); sfx('boom2'); break;
    case 'bar': part(P_FLASH, a, b, 0, 0, 0.1, 2.2, C_PINK); burst(P_SPARK, a, b, 2, 14, 0.25, 0.4, C_PINK); sfx('shieldhit'); break;
    case 'barbreak': burst(P_SHARD, a, b, 16, 36, 0.9, 0.7, C_PINK, 8); ring(a, b, 1, 10, 0.4, '#ffffff', 0.5); pop(a, b + 5, '結界破！', '#ffe14a', 3.4, 1.0); sfx('gbreak'); shake(0.3); break;
    case 'barup': sfx('gspawn'); break;
    case 'erupt': for (let k = 0; k < 12; k++) part(P_EMBER, a + rndS() * 4, b + Math.random() * 6, rndS() * 14, 24 + Math.random() * 30, 0.9, 1.0, C_ORANGE); shake(0.25); sfx('erupt'); break;
    case 'rockwarn': sfx('warn'); break;
    case 'rumble': shake(0.5); sfx('rumble'); break;
    case 'dirt': burst(P_DUST, a, b + 0.5, 3, 10, 0.5, 1.6, C_SAND, 4); break;
    case 'tick': burst(P_SPARK, a, b, 2, 12, 0.2, 0.4, C_WHITEHOT); sfx('tick'); break;
    case 'end': {
      FX.slowT = 1.9; FX.slow = 0.28; shake(2.2); FX.flash = 0.9; FX.flashCol = '#ffffff'; sfx('collapse'); vibrate(200);
      for (let k = 0; k < 5; k++) ring(a + rndS() * 16, b + rndS() * 20, 2, 26, 0.7 + k * 0.1, '#fff0b0', 0.9);
      break;
    }
    case 'phase': FX.flash = 0.7; FX.flashCol = '#ff5aa0'; shake(1.6); sfx('phase'); vibrate(120); break;
    case 'sudden': FX.flash = 0.5; FX.flashCol = '#ff6a3a'; sfx('horn'); break;
    case 'wind': sfx('gust'); break;
  }
  if (typeof uiEvent === 'function') uiEvent(t, a, b, c, d, e, f);
}
