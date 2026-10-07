// 跳出來的字：每一個第一次出現時記下文字和它在畫面上的位置；統計「畫在畫面外面看不到」的（fxDraw 只夾上緣和左右，沒有夾下緣）
(() => {
  const q = window.__qp, S = q.S, FX = q.FX, V = q.V, seen = new WeakSet(), stat = {}, off = [];
  window.__hook = () => {
    if (q.G.mode !== 'play') return;
    for (const p of FX.pops) {
      if (seen.has(p)) continue; seen.add(p);
      const fz = p.size * V.s, y = Math.max(V.gy - p.y * V.s, V.hud + fz * 0.9), key = p.txt.replace(/[0-9]+/g, '#');
      const s = stat[key] || (stat[key] = { n: 0, off: 0 }); s.n++;
      if (y - fz * 0.6 > V.H) { s.off++; if (off.length < 12) off.push({ lvl: S.idx + 1, t: +S.time.toFixed(2), txt: p.txt, worldY: +p.y.toFixed(1), pxBelowBottom: Math.round((y - V.H) / V.dpr) }); }
    }
  };
  window.__hookResult = () => ({ stat, off });
})();
