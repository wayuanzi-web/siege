/* ===== 36-scene-mine: 第十七關「地底礦坑」— 地底深處的大礦洞：背後是一層層的岩層（夾著發亮的礦脈），
   遠處一排排木頭的坑道支架、掛著一盞盞油燈；地上鋪著礦車的鐵軌。頂上一整片岩頂（S.ceil），垂著鐘乳石，
   正中間一口直通地面的豎井（木框一層層撐著，吊著運礦的吊籠，一道天光從上面斜斜照下來）。
   砲彈撞上岩頂、城塌了，會震下一陣碎石灰。四周暗暗的，只有燈光、天光和爆炸照亮 ===== */
THEMES[16] = (function () {
  let lamps = [], motes = [], drips = [], dustT = 0, lastChain = 0;
  const SHAFT_W = 7.2;          // 豎井的寬（公尺，正中間 MID）
  return {
    key: 'mine',
    build(c, W, H) {
      const R = mkRand(1717), s = V.s, top = S.ceil ? S.ceil.y : 21, yTop = Y(top);
      // 岩層：暗褐色，越往上越暗；一條條斜斜的地層紋、幾條發亮的礦脈
      c.fillStyle = lg(c, 0, 0, 0, Y(0), [0, '#120e0c', 0.45, '#2a211c', 1, '#3a2e26']); c.fillRect(0, 0, W, Y(0) + 2);
      for (let k = 0; k < 14; k++) { const y = 2 + k * 1.6 + R() * 0.8, a = (R() - 0.5) * 0.05; c.strokeStyle = 'rgba(' + (R() < 0.5 ? '70,56,44' : '24,18,14') + ',.55)'; c.lineWidth = Math.max(1, s * (0.15 + R() * 0.35)); c.beginPath(); c.moveTo(0, Y(y)); for (let x = V.x0; x <= V.x1 + 2; x += 2) c.lineTo(X(x), Y(y + Math.sin(x * 0.07 + k) * 0.6 + (x - V.x0) * a)); c.stroke(); }
      for (let k = 0; k < 7; k++) { const x0 = V.x0 + R() * (V.x1 - V.x0), y0 = 3 + R() * (top - 6), L = 6 + R() * 12, ang = (R() - 0.5) * 0.6; c.strokeStyle = 'rgba(200,170,90,.35)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(X(x0), Y(y0)); c.lineTo(X(x0 + Math.cos(ang) * L), Y(y0 + Math.sin(ang) * L)); c.stroke(); c.fillStyle = 'rgba(255,220,120,.55)'; for (let j = 0; j < 6; j++) { const u = R(); c.fillRect(X(x0 + Math.cos(ang) * L * u) - 1, Y(y0 + Math.sin(ang) * L * u) - 1, Math.max(2, s * 0.18), Math.max(2, s * 0.18)); } }
      // 遠處的坑道支架：兩根木柱一根橫樑，一排排往後
      for (let x = V.x0 + 4; x < V.x1; x += 13 + R() * 4) {
        const h = 11 + R() * 3, w = 7 + R() * 2;
        c.fillStyle = 'rgba(60,40,24,.55)'; c.fillRect(X(x), Y(h), s * 0.7, s * h); c.fillRect(X(x + w), Y(h), s * 0.7, s * h); c.fillRect(X(x - 0.4), Y(h + 0.8), s * (w + 1.5), s * 0.9);
        c.strokeStyle = 'rgba(40,26,14,.5)'; c.lineWidth = Math.max(1, s * 0.25); c.beginPath(); c.moveTo(X(x + 0.7), Y(h - 2)); c.lineTo(X(x + 2.4), Y(h)); c.moveTo(X(x + w), Y(h - 2)); c.lineTo(X(x + w - 1.7), Y(h)); c.stroke();
      }
      lamps = []; this.lamps = lamps; for (let x = V.x0 + 10; x < V.x1 - 4; x += 18 + R() * 6) if (Math.abs(x - MID) > 5) lamps.push({ x, y: 13 + R() * 3, ph: R() * TAU });

      /* 岩頂：一整片厚厚的岩層（打不壞），一路到畫面頂端 */
      const sx0 = MID - SHAFT_W / 2, sx1 = MID + SHAFT_W / 2;
      c.fillStyle = lg(c, 0, 0, 0, yTop, [0, '#0a0807', 0.55, '#1c1612', 1, '#2e241d']); c.fillRect(0, 0, W, yTop + 1);
      // 岩頂的岩層紋（比洞裡的密、暗），夾著幾條礦脈
      for (let k = 0; k < 16; k++) {
        const y = top + 0.8 + k * 1.5 + R() * 0.6; if (Y(y) < -4) break;
        c.strokeStyle = 'rgba(' + (R() < 0.5 ? '92,74,58' : '14,10,8') + ',.65)'; c.lineWidth = Math.max(1, s * (0.14 + R() * 0.34));
        c.beginPath(); c.moveTo(0, Y(y)); for (let x = V.x0; x <= V.x1 + 2; x += 2) c.lineTo(X(x), Y(y + Math.sin(x * 0.09 + k * 1.7) * 0.45)); c.stroke();
      }
      // 岩頂裡嵌著的大石塊（淡淡的輪廓、上緣一道亮邊）、幾道深裂縫
      for (let k = 0; k < 16; k++) {
        const x = V.x0 + R() * (V.x1 - V.x0), y = top + 1.5 + R() * 14, rw = 1.6 + R() * 3, rh = 0.9 + R() * 1.6;
        if (Math.abs(x - MID) < SHAFT_W / 2 + rw + 1) continue;
        c.fillStyle = 'rgba(' + (R() < 0.5 ? '58,46,38' : '30,24,20') + ',.55)'; ell(c, X(x), Y(y), s * rw, s * rh); c.fill();
        c.strokeStyle = 'rgba(120,100,80,.28)'; c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); c.ellipse(X(x), Y(y), s * rw, s * rh, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      }
      c.strokeStyle = 'rgba(6,4,3,.7)'; c.lineWidth = Math.max(1, s * 0.12);
      for (let k = 0; k < 7; k++) { let x = V.x0 + R() * (V.x1 - V.x0), y = top; if (Math.abs(x - MID) < SHAFT_W) continue; c.beginPath(); c.moveTo(X(x), Y(y)); for (let j = 0; j < 5; j++) { x += (R() - 0.5) * 2.2; y += 0.8 + R() * 1.4; c.lineTo(X(x), Y(y)); } c.stroke(); }
      for (let k = 0; k < 6; k++) {
        const x0 = V.x0 + R() * (V.x1 - V.x0), y0 = top + 2 + R() * 12, L = 5 + R() * 9, ang = (R() - 0.5) * 0.5;
        if (Math.abs(x0 - MID) < 9) continue;
        c.strokeStyle = 'rgba(190,160,80,.3)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(X(x0), Y(y0)); c.lineTo(X(x0 + Math.cos(ang) * L), Y(y0 + Math.sin(ang) * L)); c.stroke();
        c.fillStyle = 'rgba(255,214,110,.5)'; for (let j = 0; j < 5; j++) { const u = R(); c.fillRect(X(x0 + Math.cos(ang) * L * u) - 1, Y(y0 + Math.sin(ang) * L * u) - 1, Math.max(2, s * 0.16), Math.max(2, s * 0.16)); }
      }
      // 豎井：正中間直通地面的井（裡面黑、越往上越亮），兩邊一層層的木框，一邊一架梯子，吊著運礦的吊籠
      c.fillStyle = lg(c, 0, 0, 0, yTop, [0, '#b8a882', 0.18, '#6a5c44', 0.45, '#2c241a', 0.8, '#140f0b', 1, '#0c0907']); c.fillRect(X(sx0), 0, s * SHAFT_W, yTop + 1);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(X(sx0), 0, s * 0.5, yTop + 1); c.fillRect(X(sx1 - 0.5), 0, s * 0.5, yTop + 1);
      for (let y = top + 0.9; Y(y) > -s * 2; y += 2.6) {
        c.fillStyle = '#4a3220'; c.fillRect(X(sx0), Y(y + 0.35), s * SHAFT_W, Math.max(2, s * 0.35));          // 橫的木框
        c.fillStyle = '#2a1c10'; c.fillRect(X(sx0), Y(y + 0.35) + Math.max(2, s * 0.35) - 1, s * SHAFT_W, Math.max(1, s * 0.08));
        c.fillStyle = '#3a2616'; c.fillRect(X(sx0), Y(y + 1.3), s * 0.42, s * 1.3); c.fillRect(X(sx1 - 0.42), Y(y + 1.3), s * 0.42, s * 1.3);          // 兩邊的立柱
      }
      c.strokeStyle = '#5a3e24'; c.lineWidth = Math.max(1, s * 0.14); const lx = sx0 + 0.7;
      c.beginPath(); c.moveTo(X(lx), Y(top)); c.lineTo(X(lx), 0); c.moveTo(X(lx + 0.9), Y(top)); c.lineTo(X(lx + 0.9), 0); c.stroke();
      c.lineWidth = Math.max(1, s * 0.1); c.beginPath(); for (let y = top + 0.4; Y(y) > 0; y += 0.7) { c.moveTo(X(lx), Y(y)); c.lineTo(X(lx + 0.9), Y(y)); } c.stroke();
      const cx = MID + 0.9, cyB = top + 3.2, cw = 2.4, chh = 2.6;          // 吊籠：停在井口上面一點
      c.strokeStyle = 'rgba(150,150,150,.8)'; c.lineWidth = Math.max(1, s * 0.07); c.beginPath(); c.moveTo(X(cx - 0.5), 0); c.lineTo(X(cx - 0.5), Y(cyB + chh)); c.moveTo(X(cx + 0.5), 0); c.lineTo(X(cx + 0.5), Y(cyB + chh)); c.stroke();
      c.fillStyle = '#2a2622'; c.fillRect(X(cx - cw / 2), Y(cyB + chh), s * cw, s * chh);
      c.strokeStyle = '#7a746a'; c.lineWidth = Math.max(1, s * 0.12); c.strokeRect(X(cx - cw / 2), Y(cyB + chh), s * cw, s * chh);
      c.lineWidth = Math.max(1, s * 0.06); c.beginPath(); for (let k = 1; k < 4; k++) { c.moveTo(X(cx - cw / 2 + cw * k / 4), Y(cyB + chh)); c.lineTo(X(cx - cw / 2 + cw * k / 4), Y(cyB)); } c.moveTo(X(cx - cw / 2), Y(cyB + chh * 0.5)); c.lineTo(X(cx + cw / 2), Y(cyB + chh * 0.5)); c.stroke();
      c.fillStyle = '#5a3a20'; c.fillRect(X(cx - cw / 2 - 0.1), Y(cyB) - 1, s * (cw + 0.2), Math.max(2, s * 0.22));
      // 井口：一圈粗木框（砲彈撞在這裡就像撞到岩頂一樣）
      c.fillStyle = '#5a3c22'; c.fillRect(X(sx0 - 0.9), Y(top + 0.9), s * (SHAFT_W + 1.8), s * 0.9);
      c.fillStyle = '#3a2614'; c.fillRect(X(sx0 - 0.9), Y(top) - Math.max(1, s * 0.12), s * (SHAFT_W + 1.8), Math.max(1, s * 0.12));
      c.fillStyle = '#8a6a44'; c.fillRect(X(sx0 - 0.9), Y(top + 0.9), s * (SHAFT_W + 1.8), Math.max(1, s * 0.1));
      // 井口兩邊各一盞吊在鐵鍊上的大馬燈
      for (const lx2 of [sx0 - 3.2, sx1 + 3.2]) { c.strokeStyle = '#3a342c'; c.lineWidth = Math.max(1, s * 0.09); c.beginPath(); c.moveTo(X(lx2), yTop); c.lineTo(X(lx2), Y(top - 2.2)); c.stroke(); c.fillStyle = '#2a241e'; c.fillRect(X(lx2 - 0.4), Y(top - 2.2), s * 0.8, s * 0.25); c.fillStyle = '#ffd890'; ell(c, X(lx2), Y(top - 2.75), s * 0.34, s * 0.48); c.fill(); c.fillStyle = '#2a241e'; c.fillRect(X(lx2 - 0.3), Y(top - 3.25), s * 0.6, s * 0.18); }
      // 岩頂的下緣：一根根鐘乳石（井口那一段沒有）
      c.fillStyle = '#3a2e26';
      for (let x = V.x0 - 1; x < V.x1 + 1; x += 1.6 + R() * 2.4) { const L = 0.4 + R() * 1.6, w = 0.3 + R() * 0.5; if (x > sx0 - 1.4 && x < sx1 + 1.4) continue; poly(c, [X(x - w), yTop - 1, X(x + w), yTop - 1, X(x + R() * 0.2), Y(top - L)]); c.fill(); }
      c.strokeStyle = 'rgba(120,96,72,.5)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(0, yTop); c.lineTo(X(sx0 - 0.9), yTop); c.moveTo(X(sx1 + 0.9), yTop); c.lineTo(W, yTop); c.stroke();
    },
    terrain(c) {
      // 坑底：碎石地，一條礦車的鐵軌一路鋪過去
      const s = V.s, R = mkRand(1818);
      c.fillStyle = lg(c, 0, Y(0), 0, V.H, [0, '#4a3c30', 0.3, '#3a2e24', 1, '#1e1814']); c.fillRect(0, Y(0), V.W, V.H - Y(0) + 2);
      c.fillStyle = '#5a4a3a'; c.fillRect(0, Y(0) - Math.max(1, s * 0.12), V.W, Math.max(2, s * 0.3));
      for (let k = 0; k < 180; k++) { c.fillStyle = R() < 0.5 ? 'rgba(20,14,10,.45)' : 'rgba(140,120,96,.25)'; ell(c, R() * V.W, Y(-R() * 8), s * (0.1 + R() * 0.35), s * (0.06 + R() * 0.2)); c.fill(); }
      for (let x = V.x0; x < V.x1 + 1; x += 1.3) { c.fillStyle = '#3a2618'; c.fillRect(X(x), Y(0.04), s * 0.6, s * 0.22); }
      c.fillStyle = '#7a7c84'; c.fillRect(0, Y(0.22), V.W, Math.max(1, s * 0.1));
    },
    init() {
      const R = mkRand(1919);
      motes = []; for (let k = 0; k < 40; k++) motes.push({ x: V.x0 + R() * (V.x1 - V.x0), y: R() * 20, v: 0.2 + R() * 0.5, p: R() * TAU });
      drips = []; dustT = 0; lastChain = 0;
    },
    back(c, t, dt) {
      const s = V.s, top = S.ceil ? S.ceil.y : 21;
      // 豎井透下來的天光：一道斜斜的淡光，照在中間的礦脈上
      c.globalCompositeOperation = 'lighter';
      const a = 0.07 + 0.015 * Math.sin(t * 0.7);
      c.fillStyle = lg(c, 0, Y(top), 0, Y(0), [0, 'rgba(255,236,190,' + (a * 1.6).toFixed(3) + ')', 1, 'rgba(255,236,190,0)']);
      poly(c, [X(MID - SHAFT_W / 2), Y(top), X(MID + SHAFT_W / 2), Y(top), X(MID + 7), Y(0), X(MID - 5.5), Y(0)]); c.fill();
      c.globalCompositeOperation = 'source-over';
      // 井口兩邊的馬燈：暖光
      for (const lx2 of [MID - SHAFT_W / 2 - 3.2, MID + SHAFT_W / 2 + 3.2]) { const fl = 0.85 + 0.15 * Math.sin(t * 5.3 + lx2); c.fillStyle = rg(c, X(lx2), Y(top - 2.75), 0, s * 7, [0, 'rgba(255,200,110,' + (0.3 * fl).toFixed(3) + ')', 1, 'rgba(255,150,60,0)']); c.fillRect(X(lx2) - s * 7, Y(top - 2.75) - s * 7, s * 14, s * 14); }
      // 油燈：一團暖光，一閃一閃
      for (const L of lamps) {
        const fl = 0.8 + 0.2 * Math.sin(t * 7 + L.ph) * Math.sin(t * 3.1 + L.ph * 2);
        c.fillStyle = rg(c, X(L.x), Y(L.y), 0, s * 9, [0, 'rgba(255,190,100,' + (0.32 * fl).toFixed(3) + ')', 1, 'rgba(255,150,60,0)']); c.fillRect(X(L.x) - s * 9, Y(L.y) - s * 9, s * 18, s * 18);
        c.strokeStyle = '#2a2018'; c.lineWidth = Math.max(1, s * 0.08); c.beginPath(); c.moveTo(X(L.x), Y(L.y + 0.6)); c.lineTo(X(L.x), Y(L.y + 3)); c.stroke();
        c.fillStyle = '#3a3026'; c.fillRect(X(L.x - 0.35), Y(L.y + 0.6), s * 0.7, s * 0.25); c.fillStyle = '#ffd890'; ell(c, X(L.x), Y(L.y), s * 0.32, s * 0.45); c.fill();
      }
      // 空氣裡浮著的灰（天光裡的比較亮）
      for (const m of motes) {
        m.y += m.v * dt * 0.4; m.x += Math.sin(t * 0.6 + m.p) * dt * 0.3; if (m.y > 20) { m.y = 0; m.x = V.x0 + Math.random() * (V.x1 - V.x0); }
        c.fillStyle = Math.abs(m.x - MID) < 4 ? 'rgba(255,240,200,.55)' : 'rgba(220,200,170,.25)'; c.fillRect(X(m.x), Y(m.y), Math.max(1, s * 0.1), Math.max(1, s * 0.1));
      }
    },
    front(c, t, dt) {
      const s = V.s, top = S.ceil ? S.ceil.y : 21;
      // 一陣大坍塌、砲彈撞上岩頂：頂上震下一陣碎石灰
      if (S.chainT > lastChain + 0.5 && S.chainT > S.time - 0.2) { lastChain = S.chainT; dustT = 1.4; }
      if (dustT > 0) { dustT -= dt; if (Math.random() < 0.6) drips.push({ x: V.x0 + Math.random() * (V.x1 - V.x0), y: top - 0.2, v: 0, r: 0.08 + Math.random() * 0.14 }); }
      c.fillStyle = 'rgba(170,150,120,.7)';
      for (let i = drips.length - 1; i >= 0; i--) { const d = drips[i]; d.v += 30 * dt; d.y -= d.v * dt; if (d.y < 0) { drips.splice(i, 1); continue; } c.fillRect(X(d.x), Y(d.y), Math.max(1, s * d.r), Math.max(1, s * d.r * 1.6)); }
      // 四周暗一圈（礦坑裡只有燈）
      const g = rg(c, V.W / 2, V.H * 0.6, V.H * 0.5, V.W * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,.28)']); c.fillStyle = g; c.fillRect(0, 0, V.W, V.H);
    }
  };
})();
