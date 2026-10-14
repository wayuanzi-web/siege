/* ===== 77-polish: 第五批的畫面升級 —— 畫質三段、爆炸分層、動態光影、天氣、鏡頭、兵的動作、城的損傷。
   全部只動「畫」：亂數用 Math.random、不改模擬的任何東西，同一個種子打出來的戰局跟以前一模一樣 ===== */

/* ---------- 畫質：0 低、1 中、2 高 ----------
   低：粒子少一半、不畫煙的柔邊、不畫地上的焦痕和光影，解析度 1 倍
   中：爆炸分層、焦痕、兵的動作、鏡頭都有；沒有整片的光影、熱浪扭曲，解析度最多 1.5 倍
   高：全部都有，解析度最多 2 倍 */
const PF = {};          // 量效能用：PF.x = 1 就關掉那一項（只給測試腳本用）
function gfxApply(q, boot) {
  q = clamp(q | 0, 0, 2); G.gq = q; FX.q = q; FX.low = q === 0; FX.hi = q === 2;
  const cap = q === 2 ? 2 : q === 1 ? 1.5 : 1;
  if (cap !== G.dprCap) { G.dprCap = cap; if (!boot) layout(); }
}

/* ---------- 光源 ----------
   FX.lights：會熄的光（爆炸、砲口、雷），跟著特效的時間走（慢動作時也慢）。
   每一幀再把會一直亮的（著火的磚、照明箭、燈籠、飛行中的火彈）收進 RD.lt，一起畫成一層加亮 */
function lightAdd(x, y, r, ci, a, life) { if (FX.lights.length < 28) FX.lights.push({ x, y, r, ci, a, t: 0, max: life }); }
const LT_MAX = 48;
function lightsGather(t) {
  const L = RD.lt || (RD.lt = []), pool = RD.ltPool || (RD.ltPool = []); L.length = 0;
  const add = (x, y, r, ci, a, tr) => { if (L.length >= LT_MAX) return; const o = pool[L.length] || (pool[L.length] = [0, 0, 0, 0, 0, 0]); o[0] = x; o[1] = y; o[2] = r; o[3] = ci; o[4] = a; o[5] = tr; L.push(o); };
  for (const o of FX.lights) { const f = 1 - o.t / o.max; add(o.x, o.y, o.r * (0.8 + 0.2 * (1 - f)), o.ci, o.a * f * f, 1); }
  // 著火的磚（直接看 S.blocks：有吊著的磚的關卡 drawBlocks 會跑兩次，RD.burn 只剩吊著的那些）
  if (S.nburn > 0) for (const b of S.blocks) if (!b.dead && b.burn > 0 && b.body) { const p = b.body.getPosition(); add(p.x, p.y + 0.4, 5.2, C_ORANGE, 0.42 * Math.min(1, b.burn) * (0.85 + 0.15 * Math.sin(t * 13 + b.id)), 0); }
  for (const o of S.objs) {
    if (o.t === 'flare' && o.hp > 0) add(o.x, o.y, 7, C_WHITEHOT, 0.38, 0);
    else if (o.t === 'torch' && o.hp > 0) add(o.x, o.y, 5.5, C_ORANGE, 0.3, 0);
  }
  for (let i = 0; i < SH.n; i++) { const k = WL[SH.w[i]] && WL[SH.w[i]].kind; if (k === K_FIRE) add(SH.x[i], SH.y[i], 3.4, C_ORANGE, 0.32, 0); }
  const F = S.flux; if (F) { let m = 0; for (let i = 0; i < F.amt.length && m < 14; i += 3) if ((F.typ[i] === LQ_LAVA && F.amt[i] > 0.3) || (F.fire[i] > 0 && F.typ[i] === LQ_OIL)) { add(lqX(i), lqY(i) + 0.4, 4.2, C_ORANGE, 0.34, 0); m++; } }          // 第二十六關：岩漿、燒著的油
  return L;
}
// 黑暗那一層挖洞用的柔邊圓（畫一次，之後用 destination-out 蓋上去；不用每個洞每一幀都新做一個漸層）
function holeSprite() {
  let g = RD.holeSp; if (g) return g;
  g = RD.holeSp = mkCanvas(128, 128); const c = g.getContext('2d');
  c.fillStyle = rg(c, 64, 64, 0, 64, [0, 'rgba(0,0,0,1)', 0.12, 'rgba(0,0,0,1)', 0.6, 'rgba(0,0,0,.72)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, 0, 128, 128);
  return g;
}
// 一層加亮：被光照到的磚和兵亮起來（只有「高」畫質；「中」只畫爆炸本身的閃光）
function drawLights(c) {
  if (!FX.hi || PF.light) return;
  const L = RD.lt; if (!L || !L.length) return;
  const s = V.s; c.globalCompositeOperation = 'lighter';
  for (const l of L) { const r = l[2] * s, a = l[4] * (S.lv.night ? 0.5 : S.lv.theme === 16 ? 1.25 : 0.8); if (a < 0.01) continue; c.globalAlpha = Math.min(1, a); c.drawImage(glowSprite(l[3]), X(l[0]) - r, Y(l[1]) - r, r * 2, r * 2); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
/* 地底礦坑（第十七關）：四周真的暗下來，只有油燈、豎井的天光、著火的地方和爆炸照得亮。
   兩座城本身留一層淡淡的亮（看得出城在哪、兵在哪），黑只是氣氛，不擋住要打的東西 */
function drawCaveDark(c, t) {
  if (S.lv.theme !== 16 || FX.low || !SCENE.theme || PF.cave) return;
  // 暗的那一層很柔，用四分之一的解析度畫再放大貼上（省很多）
  const s = V.s, Q = 4, W = Math.ceil(V.W / Q), H = Math.ceil(V.H / Q);
  let cv = RD.caveCv; if (!cv || cv.width !== W || cv.height !== H) cv = RD.caveCv = mkCanvas(W, H);
  const n = cv.getContext('2d');
  n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, W, H); n.setTransform(1 / Q, 0, 0, 1 / Q, 0, 0);
  n.fillStyle = lg(n, 0, 0, 0, V.H, [0, 'rgba(6,4,10,.62)', 0.55, 'rgba(6,4,10,.44)', 1, 'rgba(6,4,10,.3)']); n.fillRect(0, 0, V.W, V.H);
  n.globalCompositeOperation = 'destination-out';
  const hs = holeSprite(), hole = (x, y, R, a) => { const r = R * s; n.globalAlpha = Math.min(1, a); n.drawImage(hs, X(x) - r, Y(y) - r, r * 2, r * 2); };
  for (const st of S.st) if (st && !st.dead) { const cc = stCenter(st); hole(cc.x, cc.y, Math.max(st.w, st.h) * 0.8, 0.62); }
  hole(MID, (S.ceil ? S.ceil.y : 21) * 0.55, 13, 0.75);          // 豎井的天光
  const lamps = SCENE.theme.lamps; if (lamps) for (const L of lamps) hole(L.x, L.y, 9 * (0.92 + 0.08 * Math.sin(t * 7 + L.ph)), 0.85);
  for (const l of RD.lt || []) hole(l[0], l[1], l[2] * 1.5, Math.min(1, l[4] * 2.2));
  for (const u of S.units) if (u.alive) hole(u.x, u.y + 1.2, 3.2, 0.5);
  for (let i = 0; i < SH.n; i++) hole(SH.x[i], SH.y[i], 1.8, 0.8);          // 砲彈看得清楚
  n.globalAlpha = 1;
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(cv, 0, 0, W, H, 0, 0, W * Q, H * Q); c.setTransform(1, 0, 0, 1, FX.shx, FX.shy);
}

/* ---------- 煙的柔邊貼圖（取代一顆一顆的實心圓） ---------- */
function smokeSprite(ci) {
  const m = RD.smk || (RD.smk = {}); let g = m[ci]; if (g) return g;
  g = mkCanvas(64, 64); const c = g.getContext('2d'), hex = PCOL[ci];
  c.fillStyle = rg(c, 32, 32, 0, 32, [0, rgba(hex, 0.95), 0.45, rgba(hex, 0.7), 0.8, rgba(hex, 0.22), 1, rgba(hex, 0)]); c.fillRect(0, 0, 64, 64);
  m[ci] = g; return g;
}

/* ---------- 爆炸分層：閃光 → 火球 → 衝擊波 → 濃煙 → 餘燼；冰會碎裂、雷會放電弧、酸會冒泡、暗會往內塌 ---------- */
function boomLayers(x, y, r, k, lit) {
  const lc = lit || k === K_FIRE ? C_ORANGE : k === K_ICE ? C_ICE : k === K_ZAP ? C_YELLOW : k === K_DARK ? C_PURPLE : k === K_ACID ? C_GREEN : k === K_MAG ? C_SKY : k === K_WIND ? C_WHITE : C_GOLD;
  lightAdd(x, y, 3.5 + r * 2.4, lc, Math.min(0.95, 0.45 + r * 0.07), 0.3 + r * 0.035);
  if (FX.low) return;
  const big = r >= 3.2, hot = lit || k === K_FIRE || k === K_BLAST || k === K_HEAVY || k === K_CRUSH;
  // 火球：一團一團往外脹、由白轉橘轉暗紅
  if (hot) { const n = Math.min(7, 2 + r * 0.8 | 0); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = r * (1.5 + Math.random() * 2.5); part(P_FIRE, x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, Math.cos(a) * v, Math.sin(a) * v + 2, 0.32 + r * 0.03 + Math.random() * 0.12, r * (0.45 + Math.random() * 0.3), C_ORANGE); } }
  // 衝擊波：一圈很快、很淡的白；貼著地爆的話地上捲起一圈塵土
  if (big) ring(x, y, r * 0.5, r * 2.2, 0.18, 'rgba(255,255,255,.55)', 0.22);
  const gy = groundY(x);
  if (gy > -100 && y - gy < r * 0.9 && y - gy > -1.5) {
    const n = Math.min(8, 3 + r | 0); for (let i = 0; i < n; i++) { const d = i & 1 ? 1 : -1; part(P_DUST, x + d * Math.random() * r * 0.5, gy + 0.3, d * (8 + r * 3) * (0.6 + Math.random() * 0.6), 1 + Math.random() * 3, 0.7 + Math.random() * 0.4, 1.4 + r * 0.25, k === K_ICE ? C_WHITE : C_SAND); }
    scorchAdd(x, gy, r, k, lit);
  }
  // 濃煙：大爆炸留一柱黑煙慢慢往上飄
  if (hot && big) for (let i = 0; i < 2 + (FX.hi ? 2 : 0); i++) part(P_SMOKE, x + rndS() * r * 0.6, y + rndS() * r * 0.4, rndS() * 3, 2 + Math.random() * 3, 1.6 + Math.random() * 0.9, 1.6 + r * 0.35, C_SOOT);
  // 餘燼：一顆一顆火星飄下來
  if (hot && r >= 2.4) burst(P_EMBER, x, y, FX.hi ? 5 : 3, 10 + r * 2, 0.9, 0.5, C_GOLD, 6);
  if (k === K_ICE) {          // 冰：整團碎開，冰晶往外噴，留一圈白霜霧
    burst(P_SHARD, x, y, 6 + (r | 0), 26 + r * 3, 0.7, 0.5, C_WHITE, 6);
    for (let i = 0; i < 3; i++) part(P_DUST, x + rndS() * r, y + rndS() * r * 0.5, rndS() * 4, 1 + Math.random() * 2, 1.2, 1.8 + r * 0.3, C_WHITE);
    ring(x, y, r * 0.2, r * 1.6, 0.4, '#e8fbff', 0.3);
  } else if (k === K_ZAP) {          // 雷：幾道細細的電弧往外竄
    for (let j = 0; j < 3 + (FX.hi ? 2 : 0); j++) { const a = Math.random() * TAU, L = r * (0.9 + Math.random() * 0.8), pts = [x, y]; for (let q = 1; q <= 4; q++) { const u = q / 4; pts.push(x + Math.cos(a) * L * u + rndS() * r * 0.35, y + Math.sin(a) * L * u + rndS() * r * 0.35); } FX.bolts.push({ pts, t: 0, max: 0.12 + Math.random() * 0.1, col: j & 1 ? '#bfe8ff' : '#fff3a0', w: 0.4 }); }
  } else if (k === K_ACID) {          // 酸：一堆泡泡冒上來、一個一個破
    for (let i = 0; i < (FX.hi ? 8 : 5); i++) part(P_BUBBLE, x + rndS() * r, y + rndS() * r * 0.6, rndS() * 2, 1.5 + Math.random() * 3, 0.8 + Math.random() * 0.7, 0.35 + Math.random() * 0.35, C_GREEN);
  } else if (k === K_DARK) {          // 暗：火花從外圈往中心吸進去，一圈往內縮的紫環
    for (let i = 0; i < (FX.hi ? 12 : 7); i++) { const a = Math.random() * TAU, R = r * 1.5; part(P_SPARK, x + Math.cos(a) * R, y + Math.sin(a) * R, -Math.cos(a) * R * 5, -Math.sin(a) * R * 5, 0.22, 0.5, i & 1 ? C_PURPLE : C_PINK); }
    ring(x, y, r * 1.8, r * 0.2, 0.3, '#d8a0ff', 0.4);
  } else if (k === K_MAG) {
    for (let j = 0; j < 2; j++) ring(x, y, r * (0.4 + j * 0.5), r * (1.4 + j * 0.6), 0.3 + j * 0.1, '#9fd8ff', 0.25);
  } else if (k === K_WIND) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, R = r * 0.8; part(P_DUST, x + Math.cos(a) * R, y + Math.sin(a) * R, -Math.sin(a) * 14, Math.cos(a) * 14, 0.5, 1.1, C_WHITE); }
  }
}

/* ---------- 地上的焦痕（爆炸貼著地面才有）：畫在一張透明的圖上，每一關開打時清掉 ---------- */
function scorchAdd(x, gy, r, k, lit) {
  if (FX.low || (S.water && x > S.water.x0 && x < S.water.x1 && gy < S.water.y)) return;
  const W = V.W, H = V.H; let cv = RD.decal; if (!cv || cv.width !== W || cv.height !== H) { cv = RD.decal = mkCanvas(W, H); RD.decalN = 0; }
  const c = cv.getContext('2d'), s = V.s, px = X(x), py = Y(gy) + s * 0.15, rx = s * r * (0.9 + Math.random() * 0.3), ry = Math.max(2, s * Math.min(0.7, r * 0.16));
  const col = k === K_ACID ? '60,110,30' : k === K_ICE ? '230,246,255' : k === K_DARK ? '60,20,70' : '24,16,12', a = k === K_ICE ? 0.4 : 0.38;
  if (RD.decalN > 90) return;          // 疊太多就不再加（不會越疊越黑）
  const ang = Math.atan2(groundY(x - 1) - groundY(x + 1), 2);          // 斜坡上的焦痕跟著坡度斜
  c.save(); c.translate(px, py); if (Math.abs(ang) < 1.2) c.rotate(ang); c.scale(1, ry / rx);
  c.fillStyle = rg(c, 0, 0, 0, rx, [0, 'rgba(' + col + ',' + a + ')', 0.6, 'rgba(' + col + ',' + (a * 0.5) + ')', 1, 'rgba(' + col + ',0)']);
  c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
  RD.decalN = (RD.decalN || 0) + 1;
}
function decalReset() { if (RD.decal) RD.decal.getContext('2d').clearRect(0, 0, RD.decal.width, RD.decal.height); RD.decalN = 0; }
function drawDecals(c) { if (!PF.decal && RD.decalN && RD.decal && RD.decal.width === V.W && RD.decal.height === V.H && !FX.low) c.drawImage(RD.decal, 0, 0); }

/* ---------- 兵的動作 ----------
   待機：輕輕呼吸；瞄準：往後仰、蹲低一點蓄力；開火：後座力往後一頓、身體壓扁一下；挨打：抖一下；
   贏了：跳起來；輸了：垂頭。倒下：被打倒的往後一倒、砸扁的整個壓扁，慢慢淡掉、飄起一縷魂 */
const POSE = { dx: 0, dy: 0, ang: 0, sx: 1, sy: 1 };
function unitPose(u, t, dir) {
  const P = POSE, s = V.s; P.dx = 0; P.dy = 0; P.ang = 0; P.sx = 1; P.sy = 1;
  if (FX.low) return P;
  const held = u.frozen > 0 || u.stun > 0 || u.sunk;
  if (!held && !u.air) P.sy = 1 + 0.022 * Math.sin(t * 2.3 + u.slot * 1.7);
  const aiming = S.state === 'play' && S.phase === 'aim' && S.turn === u.side && !held && (u.side === 1 || RD.aimOn);
  const am = RD.aimK || (RD.aimK = new WeakMap()), ak = (am.get(u) || 0) + ((aiming ? 1 : 0) - (am.get(u) || 0)) * 0.12; am.set(u, ak);          // 瞄準的程度記在畫面這邊，不寫進兵的資料
  if (ak > 0.01) { P.ang -= dir * 0.09 * ak; P.sy *= 1 - 0.04 * ak; P.sx *= 1 + 0.02 * ak; }
  if (u.recoil > 0.01) { const k = Math.min(1, u.recoil); P.sx *= 1 + 0.12 * k; P.sy *= 1 - 0.1 * k; P.ang -= dir * 0.12 * k; }
  if (u.hurtT > 0) { P.dx += Math.sin(t * 70 + u.slot) * u.hurtT * s * 1.6; P.ang += dir * 0.18 * Math.min(1, u.hurtT * 4); }
  if (S.state !== 'play' && !held) {
    const win = (S.state === 'won') === (u.side === 0);
    if (win) { const h = Math.abs(Math.sin(t * 6.5 + u.slot * 0.9)); P.dy -= h * s * 1.4; P.sy *= 1 + (h > 0.9 ? 0.05 : 0) - (h < 0.15 ? 0.08 : 0); if (FX.hi && h < 0.08 && Math.random() < 0.25) burst(P_CONF, u.x, u.y + 2.5, 3, 12, 0.9, 0.5, u.side === 0 ? C_GOLD : C_RED, 8); }
    else { P.ang += dir * 0.22; P.sy *= 0.93; }
  }
  return P;
}
// 畫一個兵：以腳底為準縮放、以身體中間為準轉
function drawUnitSprite(c, sp, img, x, y, oy, P, sx, sy) {
  const cs = Math.cos(P.ang), sn = Math.sin(P.ang);
  c.setTransform(cs * P.sx, sn * P.sx, -sn * P.sy, cs * P.sy, x + P.dx - sn * oy + sx, y + P.dy + (cs - 1) * oy + sy);
  c.drawImage(img, -sp.ax, -sp.ay);
}
function fallAdd(side, type, x, y, how) {
  if (FX.low || FX.falls.length > 10) return false;
  FX.falls.push({ side, type, x, y, t: 0, mode: how === 1 ? 1 : 0, dir: side === 0 ? -1 : 1 });
  return true;
}
function fallsStep(dt) {
  for (let i = FX.falls.length - 1; i >= 0; i--) { const f = FX.falls[i]; const t0 = f.t; f.t += dt; if (t0 < 0.55 && f.t >= 0.55) part(P_EMBER, f.x, f.y + 1.2, 0, 3, 1.4, 0.9, f.side === 0 ? C_SKY : C_SALMON); if (f.t > 1.6) FX.falls.splice(i, 1); }
}
function drawFalls(c) {
  if (!FX.falls.length) return;
  const s = V.s, sx = FX.shx, sy = FX.shy;
  for (const f of FX.falls) {
    const sp = unitSprite(f.side, f.type), k = Math.min(1, f.t / 0.42), P = POSE;
    P.dx = 0; P.dy = 0; P.sx = 1; P.sy = 1; P.ang = 0;
    if (f.mode === 1) { P.sy = Math.max(0.22, 1 - k * 0.78); P.sx = 1 + (1 - P.sy) * 0.55; }
    else { P.ang = f.dir * k * k * 1.45; P.dy = -Math.sin(k * Math.PI) * s * 0.5; }
    c.globalAlpha = f.t < 0.8 ? 1 : Math.max(0, 1 - (f.t - 0.8) / 0.8);
    drawUnitSprite(c, sp, sp.cv, X(f.x), Y(f.y), 0, P, sx, sy);
    if (f.t < 0.25) { c.globalAlpha = (0.25 - f.t) * 3; c.drawImage(sp.wh, -sp.ax, -sp.ay); }
  }
  c.globalAlpha = 1; c.setTransform(1, 0, 0, 1, sx, sy);
}

/* ---------- 城的損傷：快塌的磚冒煙、燻得很黑的磚偶爾飄出火星 ---------- */
function blockWear(b, p, hf) {
  if (FX.low || b.frag || b.dead) return;
  if (hf < 0.34 && b.mat !== M_ICE && b.mat !== M_GLASS && b.mat !== M_SNOW && b.mat !== M_KEG && ((RD.frame + b.id * 7) & 31) === 0 && RD.wearN++ < 3)
    part(P_SMOKE, p.x + rndS() * b.w * 0.5, p.y + b.h * 0.4, rndS() * 1.5 + S.wind * 0.1, 2 + Math.random() * 2, 1.3, 0.7 + Math.random() * 0.5, hf < 0.18 ? C_DARK : C_GRAY);
  if (FX.hi && (b.soot || 0) > 0.7 && ((RD.frame + b.id * 5) & 63) === 0 && RD.wearN++ < 4)
    part(P_EMBER, p.x + rndS() * b.w * 0.6, p.y + rndS() * b.h * 0.5, rndS(), 2 + Math.random() * 2, 0.8, 0.32, C_ORANGE);
}

/* ---------- 天氣 ---------- */
const HOT_THEMES = { desert: 1, volcano: 1, forge: 1, dune: 1 };
// 熱浪：近地面那一帶的背景一條一條左右晃（只有「高」畫質；只扭背景，城和兵不扭，瞄得準）
function sceneBlit(c, t) {
  const th = SCENE.theme;
  if (!FX.hi || !th || !HOT_THEMES[th.key] || FX.calm) { c.drawImage(SCENE.cv, 0, 0); return; }
  let gt = 0; for (const st of S.st) if (st) gt = Math.max(gt, st.y0);          // 城基站在多高：晃的那一帶在它上面
  const y0 = Math.max(0, Math.round(Y(gt + 12))), y1 = Math.min(V.H, Math.round(Y(gt + 1.5))), step = Math.max(2, Math.round(V.dpr * 2)), cv = SCENE.cv;
  c.drawImage(cv, 0, 0);          // 先整張貼一次：每一條左右挪開以後，邊上露出來的那一點是原圖，不是上一幀的殘影
  for (let y = y0; y < y1; y += step) { const h = Math.min(step, y1 - y), k = (y - y0) / Math.max(1, y1 - y0), dx = Math.sin(y * 0.09 + t * 5.2) * Math.sin(y * 0.023 - t * 1.7) * V.dpr * 1.3 * Math.sin(k * Math.PI); c.drawImage(cv, 0, y, V.W, h, dx, y, V.W, h); }          // 中間晃得最多，上下兩頭接回不動的背景（城基、地面不跟著晃）
}
function weatherStep(dt, t) {
  if (FX.low || !(dt > 0) || !SCENE.theme) return;
  const key = SCENE.theme.key;
  // 暴雨：雨點打在地上、打在城頂上濺起水花
  if (key === 'storm') {
    const n = (FX.hi ? 4 : 1.6) * dt * 60;
    for (let i = 0; i < n; i++) { if (Math.random() > n - i) break; const x = V.x0 + Math.random() * (V.x1 - V.x0); let y = FX.hi ? surfaceY(x) : -999; if (y < -100) y = groundY(x); if (y < -100) continue; part(P_SHARD, x, y + 0.05, rndS() * 4, 3 + Math.random() * 4, 0.22, 0.22, i & 1 ? C_WHITE : C_ICE); }
  }
  // 熔岩飛沫：岩漿面上偶爾彈起一團火紅的岩漿，掉回去
  if (S.water && S.water.lava && Math.random() < dt * (FX.hi ? 2.4 : 1)) { const W = S.water, x = Math.max(W.x0, V.x0) + Math.random() * (Math.min(W.x1, V.x1) - Math.max(W.x0, V.x0)); part(P_LAVA, x, W.y + 0.2, rndS() * 5, 8 + Math.random() * 10, 2, 0.45 + Math.random() * 0.4, C_ORANGE); }
}
// 颶風（第十四關）：遠處海上一道龍捲風慢慢移動，捲著一些碎片
function drawTwister(c, t) {
  if (FX.low || !SCENE.theme || SCENE.theme.key !== 'storm') return;
  // 在兩座城中間的遠方（海平線上）慢慢左右飄：底下一團捲起來的水霧，往上越轉越粗，頂上接進雲裡
  const s = V.s, cx = MID + 9 * Math.sin(t * 0.05), base = 8.6, top = 40;
  c.save();
  c.fillStyle = rg(c, X(cx), Y(base + 0.6), 0, s * 5, [0, 'rgba(70,80,86,.55)', 1, 'rgba(70,80,86,0)']); ell(c, X(cx), Y(base + 0.6), s * 5, s * 1.8); c.fill();
  for (let k = 0; k < 26; k++) {
    const u = k / 25, y = base + (top - base) * u, w = (0.45 + u * u * u * 11) * (1 + 0.1 * Math.sin(t * 7 + k * 1.3)), x = cx + Math.sin(t * 1.1 + u * 3.2) * (0.4 + u * 2.6);
    c.fillStyle = 'rgba(' + (48 + u * 26 | 0) + ',' + (56 + u * 24 | 0) + ',' + (64 + u * 22 | 0) + ',' + (0.62 - 0.3 * u).toFixed(2) + ')';
    ell(c, X(x), Y(y), w * s, Math.max(1, s * 1.15)); c.fill();
    if (k % 3 === 1) { c.strokeStyle = 'rgba(150,160,166,' + (0.35 - 0.2 * u).toFixed(2) + ')'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.ellipse(X(x), Y(y), w * s * 0.85, Math.max(1, s * 0.5), 0, Math.PI * (0.1 + 0.3 * Math.sin(t * 5 + k)), Math.PI * (0.9 + 0.3 * Math.sin(t * 5 + k))); c.stroke(); }
  }
  c.fillStyle = 'rgba(30,32,36,.85)';
  for (let k = 0; k < 12; k++) { const a = t * (2.4 + k * 0.21) + k * 1.9, u = (k * 0.137 + t * 0.04) % 1, y = base + (top - base) * u * 0.55, R = (0.6 + u * u * u * 11) * 1.25; c.fillRect(X(cx + Math.cos(a) * R), Y(y + Math.sin(a) * 0.4), Math.max(1, s * 0.25), Math.max(1, s * 0.18)); }
  c.restore();
}

/* ---------- 鏡頭：大坍塌、城破的時候慢慢拉近；魔王關開場從敵城拉遠 ----------
   畫完整張以後再把要看的那一塊放大貼回去。輪到自己瞄準時一定拉回全景（虛線、手指的位置才對得上） */
function camFocus(x, y, z, hold) {
  if (FX.q === 0 || FX.calm || G.demo) return;
  const C = RD.cam; if (z < C.tz && C.hold > 0) return;
  C.tz = z; C.hold = hold; C.fx = x; C.fy = y; if (C.z <= 1.001) { C.cx = x; C.cy = y; }
}
function camIntro(lv) {
  const C = RD.cam; C.z = C.tz = 1; C.hold = 0;
  if (FX.q === 0 || FX.calm || !(lv.boss || lv.beast || lv.aerie)) return;
  const st = S.st[1]; if (!st) return; const cc = stCenter(st);
  C.z = C.tz = 1.4; C.hold = 0.25; C.fx = C.cx = cc.x; C.fy = C.cy = cc.y - st.h * 0.05; C.fast = 1;          // 開場只有 1.1 秒：很快拉遠，輪到你瞄準以前就是全景
}
function camStep(rdt) {
  const C = RD.cam;
  const mine = S.state === 'play' && S.turn === 0 && S.phase === 'aim';
  if (mine || G.drag) { C.z = C.tz = 1; C.hold = 0; return; }          // 輪到自己瞄準、手指拖著：一定是全景（虛線、手指的位置才對得上）
  if (G.mode !== 'play') { C.tz = 1; C.hold = 0; }
  else if (C.hold > 0) { C.hold -= rdt; if (C.hold <= 0) C.tz = 1; }
  C.z += (C.tz - C.z) * Math.min(1, rdt * (C.tz > C.z ? 3 : C.fast ? 4.5 : 1.8)); if (C.z < 1.01) C.fast = 0;
  C.cx += (C.fx - C.cx) * Math.min(1, rdt * 4); C.cy += (C.fy - C.cy) * Math.min(1, rdt * 4);
  if (Math.abs(C.z - 1) < 0.002 && C.tz === 1) C.z = 1;
}
function camApply(c) {
  const C = RD.cam; if (C.z <= 1.001 || PF.cam) return;
  const W = V.W, H = V.H; let b = RD.camCv; if (!b || b.width !== W || b.height !== H) b = RD.camCv = mkCanvas(W, H);
  const bc = b.getContext('2d'); bc.drawImage(RD.cv, 0, 0);
  const w = W / C.z, h = H / C.z, x0 = clamp(X(C.cx) - w / 2, 0, W - w), y0 = clamp(Y(C.cy) - h * 0.55, 0, H - h);
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(b, x0, y0, w, h, 0, 0, W, H);
}
