/* ===== 71-astro-draw: 第二十八關「群星引力」怎麼畫 —— 衛星、小月和它們的引力圈；引力錨；推進彈「點一下加速」的提示（模擬在 54-astro） ===== */
function moonSprite(r, big) {
  const key = 'moon' + Math.round(r * V.s) + (big ? 'b' : 's');
  const cache = RD.moonSpr || (RD.moonSpr = {}); if (cache[key]) return cache[key];
  const px = Math.max(8, Math.round(r * V.s * 2 + 4)), cv = mkCanvas(px, px), c = cv.getContext('2d'), R = px / 2 - 2, h = px / 2;
  c.fillStyle = rg(c, h - R * 0.35, h - R * 0.35, R * 0.1, R * 1.1, big ? [0, '#f4f0e6', 0.55, '#b8b4c4', 1, '#5a5670'] : [0, '#ffe8d0', 0.55, '#c89a8a', 1, '#6a4a52']); c.beginPath(); c.arc(h, h, R, 0, TAU); c.fill();
  const rnd = mkRand(big ? 17 : 23);
  for (let k = 0; k < (big ? 9 : 4); k++) { const a = rnd() * TAU, d = rnd() * R * 0.7, cr = R * (0.08 + rnd() * 0.16), x = h + Math.cos(a) * d, y = h + Math.sin(a) * d; c.fillStyle = 'rgba(60,50,80,.28)'; c.beginPath(); c.arc(x, y, cr, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(x - cr * 0.25, y - cr * 0.25, cr * 0.6, 0, TAU); c.fill(); }
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = lg(c, 0, 0, px, px, [0, 'rgba(0,0,0,0)', 0.6, 'rgba(0,0,0,0)', 1, 'rgba(10,6,30,.55)']); c.fillRect(0, 0, px, px);
  return (cache[key] = cv);
}
// 衛星、小月（畫在城的後面）：引力圈畫一圈淡淡的虛線，慢慢往內縮
function drawMoons(c, t) {
  if (!S.astro) return;
  const s = V.s;
  for (const o of S.astro.moons) {
    const x = X(o.x), y = Y(o.y);
    c.strokeStyle = o.big ? 'rgba(170,190,255,.22)' : 'rgba(255,190,170,.22)'; c.lineWidth = Math.max(1, s * 0.14); c.setLineDash([s * 0.7, s * 0.9]); c.lineDashOffset = t * s * 2;
    c.beginPath(); c.arc(x, y, o.R * s, 0, TAU); c.stroke(); c.setLineDash([]);
    const ph = (t * 0.35 + (o.big ? 0 : 0.5)) % 1; c.strokeStyle = 'rgba(190,210,255,' + (0.18 * (1 - ph)).toFixed(3) + ')'; c.beginPath(); c.arc(x, y, (o.r + (o.R - o.r) * (1 - ph)) * s, 0, TAU); c.stroke();
    const g = glowSprite(o.big ? C_SKY : C_SALMON), q = o.r * s * 2.2; c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35; c.drawImage(g, x - q, y - q, q * 2, q * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    const sp = moonSprite(o.r, o.big); c.drawImage(sp, x - sp.width / 2, y - sp.height / 2);
    if (!o.big && o.orbit) {          // 小月的軌道：一圈點點，下一回合會到哪裡畫一個小圈
      const C = o.orbit; c.fillStyle = 'rgba(255,210,190,.25)'; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; c.beginPath(); c.arc(X(C.x + Math.cos(a) * C.r), Y(C.y + Math.sin(a) * C.r), Math.max(1, s * 0.12), 0, TAU); c.fill(); }
      const na = o.ph + C.step; c.strokeStyle = 'rgba(255,210,190,.4)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.arc(X(C.x + Math.cos(na) * C.r), Y(C.y + Math.sin(na) * C.r), o.r * s * 0.8, 0, TAU); c.stroke();
    }
  }
}
// 引力錨（畫在磚的前面）：紫光的錨，吸的時候一圈一圈往內縮
function drawAnchors(c, t) {
  if (!S.astro) return;
  const s = V.s;
  for (const o of S.objs) {
    if (o.t !== 'anchor') continue;
    const x = X(o.x), y = Y(o.y), pulling = S.time - o.t0 < o.pullT && o.pullT > 0, col = o.side === 0 ? [176, 138, 255] : [255, 122, 200], rgb = 'rgba(' + col.join(',') + ',';
    c.strokeStyle = rgb + '0.25)'; c.lineWidth = Math.max(1, s * 0.12); c.setLineDash([s * 0.5, s * 0.6]); c.beginPath(); c.arc(x, y, o.R * s, 0, TAU); c.stroke(); c.setLineDash([]);
    if (pulling) for (let k = 0; k < 3; k++) { const ph = (t * 1.6 + k / 3) % 1; c.strokeStyle = rgb + (0.5 * ph).toFixed(3) + ')'; c.lineWidth = Math.max(1, s * 0.22); c.beginPath(); c.arc(x, y, o.R * s * (1 - ph) + s * 0.4, 0, TAU); c.stroke(); }
    c.globalCompositeOperation = 'lighter'; const g = glowSprite(o.side === 0 ? C_PURPLE : C_PINK), q = s * (pulling ? 2.6 : 1.6); c.globalAlpha = 0.8; c.drawImage(g, x - q, y - q, q * 2, q * 2); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    const r = s * 0.9; c.strokeStyle = o.side === 0 ? '#4a2aa8' : '#a01a5a'; c.lineWidth = Math.max(1.4, s * 0.28); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x, y + r * 0.9); c.moveTo(x - r * 0.55, y - r * 0.5); c.lineTo(x + r * 0.55, y - r * 0.5); c.stroke();
    c.beginPath(); c.arc(x, y + r * 0.1, r * 0.75, 0.25, Math.PI - 0.25); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.moveTo(x, y - r); c.lineTo(x, y + r * 0.9); c.stroke();
  }
}
// 我方的推進彈還沒加速：繞一圈閃光，第一發旁邊寫「點一下！」
function drawBoostHint(c, t) {
  if (!S.astro || S.turn !== 0 || S.team[0].ai || S.state !== 'play') return;
  const s = V.s; let first = true;
  for (let i = 0; i < SH.n; i++) {
    if (SH.side[i] !== 0 || SH.p[i] || !WL[SH.w[i]].boost) continue;
    const x = X(SH.x[i]), y = Y(SH.y[i]), k = 0.5 + 0.5 * Math.sin(t * 12);
    c.strokeStyle = 'rgba(255,225,74,' + (0.5 + 0.4 * k) + ')'; c.lineWidth = Math.max(1.4, s * 0.24); c.beginPath(); c.arc(x, y, s * (1.3 + 0.4 * k), 0, TAU); c.stroke();
    if (first) {
      first = false; const fz = Math.max(14, s * 2.3); c.font = F_ZH.replace('1px', fz + 'px'); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = fz * 0.22; c.strokeStyle = 'rgba(16,10,26,.9)'; c.strokeText('點一下加速！', x, y - s * 3); c.fillStyle = '#ffe14a'; c.fillText('點一下加速！', x, y - s * 3);
    }
  }
}
