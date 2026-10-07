// 第二關垮城演出 endT≈1.3 與 2.5 的那一格：把所有比較大的粒子、圓圈、飛出去的東西全部列出來（找左上角那顆淡色圓盤是什麼）
(() => {
  const q = window.__qp, S = q.S, FX = q.FX, V = q.V, out = [], NAMES = ['SPARK', 'SMOKE', 'DEBRIS', 'FLASH', 'EMBER', 'SHARD', 'DUST', 'CONF'];
  const done = {};
  window.__hook = () => {
    if (q.G.mode !== 'play' || S.idx !== 1 || S.state !== 'won') return;
    const e = q.G.endT, key = e > 1.25 && e < 1.4 ? 'a' : e > 2.45 && e < 2.6 ? 'b' : '';
    if (!key || done[key]) return; done[key] = 1;
    const parts = [];
    for (let i = 0; i < FX.n; i++) { const tp = FX.type[i]; if (tp !== 1 && tp !== 6 && tp !== 3 && tp !== 4) continue; const f = FX.life[i] / FX.max[i]; const r = tp === 3 ? FX.size[i] * (1.6 - f * 0.6) : tp === 4 ? FX.size[i] * (0.5 + f) : FX.size[i] * (1.7 - f * 0.9); if (r < 1.2 && !(FX.x[i] < 6 && FX.y[i] > 30)) continue; parts.push([NAMES[tp], 'col' + FX.col[i], 'r' + r.toFixed(1), 'x' + FX.x[i].toFixed(1), 'y' + FX.y[i].toFixed(1), 'f' + f.toFixed(2), 'max' + FX.max[i].toFixed(2), 'v' + FX.vx[i].toFixed(1) + ',' + FX.vy[i].toFixed(1)].join(' ')); }
    out.push({ key, t: +S.time.toFixed(2), endT: +e.toFixed(2), n: FX.n, parts: parts.slice(0, 40), rings: FX.rings.map((r) => [+r.x.toFixed(1), +r.y.toFixed(1), r.r0, r.r1, +(r.t / r.max).toFixed(2), r.col]), flung: FX.flung.map((f) => [f.flag ? 'flag' : f.type, +f.x.toFixed(1), +f.y.toFixed(1)]), view: [+V.x0.toFixed(1), +V.x1.toFixed(1), +V.top.toFixed(1), +V.s.toFixed(2)], pcol: q.FX && null });
  };
  window.__hookResult = () => out;
})();
