// 兵是在什麼時候倒下的：哪個階段、輪到誰、死法；特別留意「回合已經換人（瞄準階段）才倒下」的
(() => {
  const q = window.__qp, S = q.S, out = [];
  window.__hook = () => {
    if (S.on && !S.on.__w) {
      const o = S.on;
      S.on = function (t, a, b, c, d, e, f) {
        if (t === 'udie' && S.state === 'play') out.push({ lvl: S.idx + 1, t: +S.time.toFixed(2), round: S.round, phase: S.phase, turn: S.turn, phaseT: +S.phaseT.toFixed(2), side: c, type: d, how: e, x: +a.toFixed(1), y: +b.toFixed(1) });
        return o.apply(this, arguments);
      };
      S.on.__w = 1;
    }
  };
  window.__hookResult = () => { const r = out.slice(); out.length = 0; return r; };
})();
