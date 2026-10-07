// 量化 fxDraw 的座標問題：煙（SMOKE）和塵（DUST）排在任何一顆碎屑（DEBRIS / CONF / SHARD）後面的，會被畫在那顆碎屑轉過的座標系裡。
// 每一格統計：煙塵共幾顆、其中幾顆排在碎屑後面（畫錯位置）、畫錯的裡面有幾顆剛好落在畫面內（看得到的「亂跑的圓盤」）
(() => {
  const q = window.__qp, S = q.S, FX = q.FX, V = q.V;
  const st = { frames: 0, framesWithSD: 0, sd: 0, bad: 0, badOn: 0, framesBadOn: 0, okOn: 0, maxBadOn: 0, sample: [] };
  const X = (wx) => (wx - 56) * V.s + V.cx, Y = (wy) => V.gy - wy * V.s;
  window.__hook = () => {
    if (q.G.mode !== 'play') return;
    st.frames++;
    let tr = null, sd = 0, bad = 0, badOn = 0, okOn = 0; const sx = FX.shx, sy = FX.shy, s = V.s;
    for (let i = 0; i < FX.n; i++) {
      const tp = FX.type[i];
      if (tp === 1 || tp === 6) {
        sd++; const f = FX.life[i] / FX.max[i], r = FX.size[i] * s * (1.7 - f * 0.9), al = f * (tp === 6 ? 0.42 : 0.5), px = X(FX.x[i]), py = Y(FX.y[i]);
        if (tr) { bad++; const x2 = tr[0] * px - tr[1] * py + tr[2], y2 = tr[1] * px + tr[0] * py + tr[3]; if (al > 0.08 && x2 > -r * 0.5 && x2 < V.W + r * 0.5 && y2 > -r * 0.5 && y2 < V.H + r * 0.5) { badOn++; if (st.sample.length < 6) st.sample.push({ t: +S.time.toFixed(2), lvl: S.idx + 1, phase: S.phase + S.turn, should: [Math.round(px / V.dpr), Math.round(py / V.dpr)], drawn: [Math.round(x2 / V.dpr), Math.round(y2 / V.dpr)], r: Math.round(r / V.dpr), alpha: +al.toFixed(2), type: tp === 6 ? 'DUST' : 'SMOKE' }); } }
        else if (al > 0.08) okOn++;
      } else if (tp === 2 || tp === 7 || tp === 5) { const a = FX.rot[i]; tr = [Math.cos(a), Math.sin(a), X(FX.x[i]) + sx, Y(FX.y[i]) + sy]; }
    }
    if (sd) st.framesWithSD++;
    st.sd += sd; st.bad += bad; st.badOn += badOn; st.okOn += okOn; if (badOn) st.framesBadOn++; if (badOn > st.maxBadOn) st.maxBadOn = badOn;
  };
  window.__hookResult = () => { const r = Object.assign({}, st); r.badPct = st.sd ? Math.round(st.bad / st.sd * 100) : 0; st.frames = st.framesWithSD = st.sd = st.bad = st.badOn = st.framesBadOn = st.okOn = st.maxBadOn = 0; st.sample = []; return r; };
})();
