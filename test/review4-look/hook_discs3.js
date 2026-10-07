// 找「天空裡憑空出現的淡色圓盤」：(1) 包住 S.on，記下發生在奇怪位置的 cell / thud / dirt 事件；(2) 每一格掃粒子，記下出現在城樓上空或畫面左右邊緣的煙塵
(() => {
  const q = window.__qp, S = q.S, FX = q.FX, NAMES = ['SPARK', 'SMOKE', 'DEBRIS', 'FLASH', 'EMBER', 'SHARD', 'DUST', 'CONF'];
  const evs = [], parts = []; let lastP = -1e9;
  const odd = (x, y) => x < 1 || x > 111 || y > 46;
  window.__hook = () => {
    if (S.on && !S.on.__w) {
      const o = S.on;
      S.on = function (t, a, b, c, d, e, f) {
        if ((t === 'cell' || t === 'thud' || t === 'dirt' || t === 'uland' || t === 'rockstop' || t === 'lanternoff' || t === 'launch') && typeof a === 'number' && odd(a, b) && evs.length < 60) {
          evs.push([+S.time.toFixed(2), 'L' + (S.idx + 1), S.phase + S.turn, S.state, t, +a.toFixed(1), +b.toFixed(1), t === 'cell' ? 'mat' + c + ' side' + d + ' kind' + e + (f && f.frag ? ' frag' : '') + (f && f.prop ? ' prop' : '') + (f && f.kind ? ' ' + f.kind : '') : '']);
        }
        return o.apply(this, arguments);
      };
      S.on.__w = 1;
    }
    if (q.G.mode !== 'play') return;
    if (S.time - lastP < 0.3 || parts.length > 40) return;
    for (let i = 0; i < FX.n; i++) { const tp = FX.type[i]; if (tp !== 1 && tp !== 6) continue; const x = FX.x[i], y = FX.y[i]; if (!odd(x, y)) continue; const f = FX.life[i] / FX.max[i]; lastP = S.time; parts.push([+S.time.toFixed(2), 'L' + (S.idx + 1), S.phase + S.turn, S.state, NAMES[tp], 'col' + FX.col[i], 'size' + FX.size[i].toFixed(1), 'x' + x.toFixed(1), 'y' + y.toFixed(1), 'f' + f.toFixed(2)].join(' ')); break; }
  };
  window.__hookResult = () => ({ evs, parts });
})();
