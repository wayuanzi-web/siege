// 每一格找「剛生出來的煙塵粒子」落在奇怪位置的（戰場外側、城樓上空、地面以下），連同剛剛發生的事件一起記下來
(() => {
  const q = window.__qp, S = q.S, FX = q.FX, NAMES = ['SPARK', 'SMOKE', 'DEBRIS', 'FLASH', 'EMBER', 'SHARD', 'DUST', 'CONF'];
  const recent = [], found = []; let lastT = -1;
  const odd = (x, y) => x < -2 || x > 114 || y > 50 || y < -7;
  window.__hook = () => {
    if (S.on && !S.on.__w) {
      const o = S.on;
      S.on = function (t, a, b, c, d, e, f) {
        if (t === 'cell' || t === 'thud' || t === 'dirt' || t === 'uland' || t === 'rockstop' || t === 'crack' || t === 'boom') {
          recent.push([+S.time.toFixed(3), t, typeof a === 'number' ? +a.toFixed(1) : a, typeof b === 'number' ? +b.toFixed(1) : b, t === 'cell' ? 'mat' + c + ' side' + d + ' kind' + e + ' w' + (f ? (+f.w).toFixed(1) : '?') + ' h' + (f ? (+f.h).toFixed(1) : '?') + ' a' + (f ? (+f.a).toFixed(2) : '?') + (f && f.frag ? ' frag' : '') + (f && f.prop ? ' prop' : '') + ' ' + (f && f.kind || 'seg') + (f && f.isBlock ? '' : ' (segpart)') : t === 'thud' ? 'J' + (+c).toFixed(0) : t === 'boom' ? 'r' + c : '']);
          if (recent.length > 14) recent.shift();
        }
        return o.apply(this, arguments);
      };
      S.on.__w = 1;
    }
    if (q.G.mode !== 'play' || found.length >= 12) return;
    for (let i = 0; i < FX.n; i++) {
      const tp = FX.type[i]; if (tp !== 6 && tp !== 1) continue;
      const f = FX.life[i] / FX.max[i]; if (f < 0.9) continue;
      const x = FX.x[i], y = FX.y[i]; if (!odd(x, y)) continue;
      if (S.time - lastT < 0.25) return; lastT = S.time;
      found.push({ t: +S.time.toFixed(3), lvl: S.idx + 1, phase: S.phase + S.turn, state: S.state, p: [NAMES[tp], 'col' + FX.col[i], 'size' + FX.size[i].toFixed(1), 'x' + x.toFixed(1), 'y' + y.toFixed(1), 'f' + f.toFixed(2)].join(' '), recent: recent.filter((e) => S.time - e[0] < 0.2).map((e) => e.join(' ')) });
      return;
    }
  };
  window.__hookResult = () => found;
})();
