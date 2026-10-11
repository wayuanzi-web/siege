/* ===== 36-scene-rail: 第十六關「鋼鐵列車」— 夕陽下的大草原，兩列裝甲列車在路堤上並排狂奔：
   遠山慢慢往後退、近一點的丘陵退得快、路邊的電線桿一根根掠過去，枕木一路往後捲（城樓本身不動，動的是佈景）。
   中場那樣路邊的東西（水塔、號誌橋、路塹的小山）照 S.pass 畫：換景的時候舊的往後退出去、新的從前面滑進來；
   鑽隧道的時候，隧道口從前面掃過整個畫面，裡面是磚砌的隧道壁、一盞盞往後掠的燈，頂上一整片岩頂 ===== */
THEMES[15] = (function () {
  const HZ = 5.5;                       // 遠方的地平線（戰場座標）
  const SPD = 30;                       // 佈景往後捲的速度（近處，戰場單位／秒）
  let mtn = null, hill = null, dust = [], lines = [];
  // 隧道的程度：0 在外面、1 在隧道裡；換景的時候回傳隧道口在哪（x 之右／之左是隧道裡）
  function tunnelEdge() {
    const P = S.pass; if (!P) return null;
    if (P.anim) {
      const u = Math.min(1, P.anim.t / PASS_SLIDE), e = u * u * (3 - 2 * u), xp = (1 - e) * (V.x1 + 6) + e * (V.x0 - 6);
      if (P.kind === 'tunnel') return { xp, inRight: true };          // 進隧道：隧道口從右邊掃過來，右邊已經在隧道裡
      if (P.outKind === 'tunnel') return { xp, inRight: false };      // 出隧道：出口從右邊掃過來，左邊還在隧道裡
      return null;
    }
    return P.kind === 'tunnel' ? { xp: V.x0 - 20, inRight: true } : null;
  }
  // 遠山、丘陵：用稜線函數照捲動的距離取值
  function layer(c, fn, base, amp, off, col, step) {
    c.beginPath(); c.moveTo(X(V.x0 - 2), Y(HZ - 1));
    for (let x = V.x0 - 2; x <= V.x1 + 2 + step; x += step) c.lineTo(X(x), Y(base + amp * fn(x + off)));
    c.lineTo(X(V.x1 + 2 + step), Y(HZ - 1)); c.closePath(); c.fillStyle = col; c.fill();
  }
  // 中場路邊的東西（照 PASS_SHAPES 的形狀畫；cx 是它現在畫在哪）
  function drawPass(c, kind, cx, t) {
    const s = V.s, D = PASS_SHAPES[kind]; if (!D || kind === 'tunnel') return;
    const R = mkRand(kind.length * 977);
    if (kind === 'tower') {
      // 水塔：紅磚砌的塔身、一扇小門、上面一個用鐵箍箍著的大木桶、尖頂、一根放水的管子
      const [bx, by, bw, bh] = D.boxes[0], [tx, ty, tw, th] = D.boxes[1];
      c.fillStyle = lg(c, X(cx + bx), 0, X(cx + bx + bw), 0, [0, '#7a3a26', 0.4, '#a85638', 1, '#5e2a1a']); c.fillRect(X(cx + bx), Y(by + bh), bw * s, bh * s);
      c.strokeStyle = 'rgba(40,16,8,.5)'; c.lineWidth = Math.max(1, s * 0.06);
      for (let y = 0.6; y < bh; y += 0.6) { c.beginPath(); c.moveTo(X(cx + bx), Y(by + y)); c.lineTo(X(cx + bx + bw), Y(by + y)); c.stroke(); for (let x = ((y / 0.6) & 1) * 0.55; x < bw; x += 1.1) { c.beginPath(); c.moveTo(X(cx + bx + x), Y(by + y)); c.lineTo(X(cx + bx + x), Y(by + y - 0.6)); c.stroke(); } }
      c.fillStyle = '#2a1a12'; c.fillRect(X(cx - 0.7), Y(2.6), 1.4 * s, 2.6 * s); c.fillStyle = '#6a4a2a'; c.fillRect(X(cx - 0.6), Y(2.5), 1.2 * s, 2.5 * s);
      c.fillStyle = lg(c, X(cx + tx), 0, X(cx + tx + tw), 0, [0, '#5a3c22', 0.3, '#8e6a40', 0.6, '#a07a4a', 1, '#4a301a']); c.fillRect(X(cx + tx), Y(ty + th), tw * s, th * s);
      c.strokeStyle = 'rgba(40,24,10,.6)'; for (let x = 0.5; x < tw; x += 0.55) { c.beginPath(); c.moveTo(X(cx + tx + x), Y(ty)); c.lineTo(X(cx + tx + x), Y(ty + th)); c.stroke(); }
      c.fillStyle = '#3a3a40'; for (const f of [0.2, 0.55, 0.88]) c.fillRect(X(cx + tx), Y(ty + th * f + 0.15), tw * s, 0.3 * s);
      c.fillStyle = '#5a3a2a'; poly(c, [X(cx + tx - 0.3), Y(ty + th), X(cx + tx + tw + 0.3), Y(ty + th), X(cx), Y(ty + th + 1.4)]); c.fill(); c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.1); c.stroke();
      c.strokeStyle = '#2c2c32'; c.lineWidth = Math.max(2, s * 0.32); c.beginPath(); c.moveTo(X(cx + tx + tw), Y(ty + 1.2)); c.lineTo(X(cx + tx + tw + 1.6), Y(ty + 1.2)); c.lineTo(X(cx + tx + tw + 1.6), Y(ty - 0.6)); c.stroke();
      c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.12); c.strokeRect(X(cx + bx), Y(by + bh), bw * s, bh * s); c.strokeRect(X(cx + tx), Y(ty + th), tw * s, th * s);
    } else if (kind === 'gantry') {
      // 號誌橋：兩根鐵格柱、上面一道鐵格樑，樑下掛著紅綠號誌燈
      const lat = (x0, y0, w, h, vert) => {
        c.fillStyle = 'rgba(30,34,40,.35)'; c.fillRect(X(x0), Y(y0 + h), w * s, h * s);
        c.strokeStyle = '#2b2f36'; c.lineWidth = Math.max(1.5, s * 0.16); c.strokeRect(X(x0), Y(y0 + h), w * s, h * s);
        c.lineWidth = Math.max(1, s * 0.08); c.beginPath();
        if (vert) { const n = Math.max(2, Math.round(h / 1.2)); for (let k = 0; k < n; k++) { const ya = y0 + h * k / n, yb = y0 + h * (k + 1) / n; c.moveTo(X(x0), Y(ya)); c.lineTo(X(x0 + w), Y(yb)); c.moveTo(X(x0 + w), Y(ya)); c.lineTo(X(x0), Y(yb)); } }
        else { const n = Math.max(2, Math.round(w / 1.3)); for (let k = 0; k < n; k++) { const xa = x0 + w * k / n, xb = x0 + w * (k + 1) / n; c.moveTo(X(xa), Y(y0)); c.lineTo(X(xb), Y(y0 + h)); c.moveTo(X(xa), Y(y0 + h)); c.lineTo(X(xb), Y(y0)); } }
        c.stroke();
      };
      for (const [x, y, w, h] of D.boxes) lat(cx + x, y, w, h, h > w);
      const on = Math.sin(t * 2.2) > 0;
      for (const [lx, col] of [[-2.2, on ? '#ff4a3a' : '#5a1a14'], [2.2, on ? '#3a1410' : '#ff4a3a']]) {
        c.fillStyle = '#1a1c20'; rrect(c, X(cx + lx - 0.55), Y(13.4), 1.1 * s, 2.4 * s, s * 0.2); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(X(cx + lx), Y(12.5), s * 0.34, 0, TAU); c.fill();
        c.fillStyle = lx < 0 ? (on ? '#123a18' : '#3aff6a') : '#123a18'; c.beginPath(); c.arc(X(cx + lx), Y(11.6), s * 0.34, 0, TAU); c.fill();
      }
    } else if (kind === 'hill') {
      // 路塹：鐵路切開的小山（碎石的斜坡、頂上一層草）
      const pts = D.poly;
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(X(cx + x), Y(y)) : c.moveTo(X(cx + x), Y(y)))); c.closePath();
      c.fillStyle = lg(c, 0, Y(D.top), 0, Y(0), [0, '#8a7a52', 0.5, '#6e5c3c', 1, '#4e4030']); c.fill();
      c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.12); c.stroke();
      c.fillStyle = 'rgba(40,30,20,.35)'; for (let k = 0; k < 26; k++) { const x = (R() - 0.5) * 16, y = R() * D.top * 0.85; if (Math.abs(x) < 10 - y * 1.0) { ell(c, X(cx + x), Y(y), s * (0.25 + R() * 0.4), s * (0.15 + R() * 0.2)); c.fill(); } }
      c.fillStyle = '#6f8a3a'; c.beginPath(); c.moveTo(X(cx - 3.2), Y(D.top - 0.3)); for (let x = -3.2; x <= 3.2; x += 0.4) c.lineTo(X(cx + x), Y(D.top + 0.15 + Math.sin(x * 5) * 0.12)); c.lineTo(X(cx + 3.2), Y(D.top - 0.3)); c.closePath(); c.fill();
    }
  }
  return {
    key: 'rail',
    build(c, W, H) {
      const R = mkRand(1616), s = V.s;
      // 天：上面深紫、往地平線一路轉成橘紅，太陽快落到地平線
      c.fillStyle = lg(c, 0, 0, 0, Y(HZ), [0, '#2a2140', 0.35, '#5a3458', 0.62, '#b4544a', 0.84, '#f08a3c', 1, '#ffc46a']); c.fillRect(0, 0, W, Y(HZ) + 1);
      const sx = X(78), sy = Y(HZ + 6);
      c.fillStyle = rg(c, sx, sy, 0, s * 26, [0, 'rgba(255,220,140,.75)', 0.25, 'rgba(255,170,90,.35)', 1, 'rgba(255,140,60,0)']); c.fillRect(sx - s * 26, sy - s * 26, s * 52, s * 52);
      c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(sx, sy, s * 4.2, 0, TAU); c.fill();
      // 細長的晚霞
      for (let k = 0; k < 9; k++) { const x = X(V.x0 + R() * (V.x1 - V.x0)), y = Y(20 + R() * 32), w = s * (14 + R() * 26), h = s * (0.6 + R() * 0.9); c.fillStyle = 'rgba(255,190,150,' + (0.15 + R() * 0.2).toFixed(2) + ')'; ell(c, x, y, w / 2, h / 2); c.fill(); c.fillStyle = 'rgba(90,40,70,' + (0.12 + R() * 0.1).toFixed(2) + ')'; ell(c, x + w * 0.05, y + h * 0.4, w / 2.2, h / 2.6); c.fill(); }
    },
    terrain(c) {
      // 路堤：碎石鋪的斜坡（整條一樣，不用捲），坡腳下是暗一點的草原
      const s = V.s, R = mkRand(1717);
      c.fillStyle = lg(c, 0, Y(0), 0, V.H, [0, '#6a5a48', 0.35, '#54463a', 1, '#2e2a26']); c.fillRect(0, Y(0) - 1, V.W, V.H - Y(0) + 2);
      c.fillStyle = 'rgba(30,24,20,.35)'; for (let k = 0; k < 420; k++) { const x = R() * V.W, y = Y(-R() * 9); c.fillRect(x, y, Math.max(1, s * 0.18), Math.max(1, s * 0.12)); }
      c.fillStyle = 'rgba(200,180,150,.18)'; for (let k = 0; k < 220; k++) { const x = R() * V.W, y = Y(-R() * 9); c.fillRect(x, y, Math.max(1, s * 0.14), Math.max(1, s * 0.1)); }
    },
    init() {
      const R = mkRand(1818);
      mtn = ridgeFn(R, 0.035); hill = ridgeFn(R, 0.08);
      dust = []; for (let k = 0; k < 26; k++) dust.push({ x: V.x0 + R() * (V.x1 - V.x0), y: 0.3 + R() * 6, v: 0.6 + R() * 0.5, r: 0.2 + R() * 0.5 });
      lines = []; for (let k = 0; k < 10; k++) lines.push({ x: V.x0 + R() * (V.x1 - V.x0), y: 6 + R() * 40, l: 4 + R() * 9, v: 1.4 + R() * 1.2 });
    },
    back(c, t, dt) {
      const s = V.s, T = tunnelEdge(), go = t * SPD;
      // 遠山（退得最慢）、丘陵
      layer(c, mtn, HZ + 9, 5, go * 0.04, '#6a4a6a', 1.6);
      layer(c, hill, HZ + 3, 2.2, go * 0.14, '#5a4a4e', 1.2);
      // 遠方的草原（地平線到路堤頂）
      c.fillStyle = lg(c, 0, Y(HZ + 1), 0, Y(0), [0, '#7a6a52', 1, '#8e7a56']); c.fillRect(0, Y(HZ + 1), V.W, Y(0) - Y(HZ + 1) + 1);
      // 電線桿、電線（往後掠）
      const PS = 26, po = (go * 0.62) % PS;
      c.strokeStyle = '#2a201c'; c.lineWidth = Math.max(1, s * 0.07);
      for (let x = V.x0 - po; x < V.x1 + PS; x += PS) {
        c.fillStyle = '#3a2c24'; c.fillRect(X(x - 0.18), Y(9.4), s * 0.36, s * 9); c.fillRect(X(x - 1.1), Y(9.2), s * 2.2, s * 0.3);
        c.beginPath(); c.moveTo(X(x - 0.9), Y(9.1)); c.quadraticCurveTo(X(x + PS / 2), Y(7.6), X(x + PS - 0.9), Y(9.1)); c.moveTo(X(x + 0.9), Y(9.1)); c.quadraticCurveTo(X(x + PS / 2 + 1.8), Y(7.7), X(x + PS + 0.9), Y(9.1)); c.stroke();
      }
      // 路邊的草叢、石頭（掠得更快）
      c.fillStyle = 'rgba(70,58,34,.75)'; const BS = 9, bo = (go * 0.85) % BS;
      for (let x = V.x0 - bo, k = 0; x < V.x1 + BS; x += BS, k++) { const kk = Math.floor((go * 0.85) / BS) + k; ell(c, X(x + (kk * 37 % 5)), Y(0.5), s * (0.8 + (kk * 13 % 7) * 0.12), s * 0.45); c.fill(); }
      // 鐵軌：枕木一路往後捲，兩條鐵軌
      const SL = 1.15, so = (go) % SL;
      c.fillStyle = '#3a2a1e'; for (let x = V.x0 - so - SL; x < V.x1 + SL; x += SL) c.fillRect(X(x), Y(0.05), s * 0.55, s * 0.4);
      c.fillStyle = '#9a9ca4'; c.fillRect(0, Y(0.2), V.W, Math.max(1.5, s * 0.16)); c.fillStyle = '#4a4c54'; c.fillRect(0, Y(0.04), V.W, Math.max(1, s * 0.08));
      // 中場路邊的東西（換景時舊的退出去、新的滑進來）
      const P = S.pass;
      if (P) { if (P.anim && P.outKind) drawPass(c, P.outKind, MID + P.outOff, t); drawPass(c, P.kind, MID + P.off, t); }
      // 隧道裡：磚砌的隧道壁蓋住天、山，牆上一盞盞燈往後掠
      if (T) {
        const xa = T.inRight ? Math.max(V.x0 - 2, T.xp) : V.x0 - 2, xb = T.inRight ? V.x1 + 2 : Math.min(V.x1 + 2, T.xp);
        if (xb > xa) {
          c.save(); c.beginPath(); c.rect(X(xa), 0, (xb - xa) * s, Y(0.3)); c.clip();
          c.fillStyle = lg(c, 0, 0, 0, Y(0), [0, '#1a1514', 0.6, '#2a2220', 1, '#3a2e28']); c.fillRect(X(xa), 0, (xb - xa) * s, Y(0) + 1);
          const BW = 2.2, bo2 = (go) % BW; c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = Math.max(1, s * 0.06);
          for (let y = 0; y < 26; y += 0.9) { c.beginPath(); c.moveTo(X(xa), Y(y)); c.lineTo(X(xb), Y(y)); c.stroke(); const sh = ((y / 0.9) & 1) * BW / 2; c.beginPath(); for (let x = xa - bo2 + sh; x < xb; x += BW) { c.moveTo(X(x), Y(y)); c.lineTo(X(x), Y(y + 0.9)); } c.stroke(); }
          const LS = 18, lo = (go) % LS;
          for (let x = V.x0 - lo - LS; x < V.x1 + LS; x += LS) { if (x < xa - 2 || x > xb + 2) continue; c.fillStyle = rg(c, X(x), Y(13), 0, s * 5, [0, 'rgba(255,200,120,.5)', 1, 'rgba(255,170,80,0)']); c.fillRect(X(x) - s * 5, Y(13) - s * 5, s * 10, s * 10); c.fillStyle = '#ffd890'; c.beginPath(); c.arc(X(x), Y(13), s * 0.42, 0, TAU); c.fill(); }
          c.restore();
        }
      }
      // 路邊揚起的塵土（隧道外）
      if (!T || !T.inRight || T.xp > V.x0) for (const d of dust) { d.x -= SPD * d.v * dt; if (d.x < V.x0 - 3) { d.x = V.x1 + 3; d.y = 0.3 + Math.random() * 6; } c.fillStyle = 'rgba(200,170,120,.18)'; ell(c, X(d.x), Y(d.y), s * d.r * 2.2, s * d.r); c.fill(); }
    },
    front(c, t, dt) {
      const s = V.s, T = tunnelEdge();
      // 風馳電掣的速度線（隧道外）
      if (!T) { c.strokeStyle = 'rgba(255,230,200,.13)'; c.lineWidth = Math.max(1, s * 0.08); c.beginPath(); for (const L of lines) { L.x -= SPD * L.v * dt; if (L.x + L.l < V.x0 - 4) { L.x = V.x1 + 4; L.y = 6 + Math.random() * 40; } c.moveTo(X(L.x), Y(L.y)); c.lineTo(X(L.x + L.l), Y(L.y)); } c.stroke(); }
      // 隧道的岩頂：頂上一整片（換景時只蓋在已經進隧道的那一邊）；隧道口是一道石砌的拱門
      if (T) {
        const roof = PASS_SHAPES.tunnel.roof, xa = T.inRight ? Math.max(V.x0 - 2, T.xp) : V.x0 - 2, xb = T.inRight ? V.x1 + 2 : Math.min(V.x1 + 2, T.xp);
        if (xb > xa) {
          c.fillStyle = lg(c, 0, 0, 0, Y(roof), [0, '#14100e', 0.8, '#2a221e', 1, '#40342c']); c.fillRect(X(xa), 0, (xb - xa) * s, Y(roof));
          c.fillStyle = '#5a4a3c'; c.fillRect(X(xa), Y(roof) - Math.max(2, s * 0.35), (xb - xa) * s, Math.max(2, s * 0.35));
          c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(X(xa), Y(roof), (xb - xa) * s, V.H - Y(roof));
        }
        if (T.xp > V.x0 - 6 && T.xp < V.x1 + 6) {
          // 隧道口的石拱
          const x = T.xp, w = 3.2;
          c.fillStyle = lg(c, X(x - w), 0, X(x + w), 0, [0, '#4a3e34', 0.5, '#7a6a58', 1, '#4a3e34']); c.fillRect(X(x - w / 2), 0, w * s, Y(0) + 1);
          c.strokeStyle = 'rgba(20,14,10,.5)'; c.lineWidth = Math.max(1, s * 0.08); for (let y = 0; y < 40; y += 1.4) { c.beginPath(); c.moveTo(X(x - w / 2), Y(y)); c.lineTo(X(x + w / 2), Y(y)); c.stroke(); }
          c.strokeStyle = INK; c.lineWidth = Math.max(1.5, s * 0.16); c.strokeRect(X(x - w / 2), -2, w * s, Y(0) + 3);
        }
      }
    }
  };
})();
