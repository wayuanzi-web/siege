// 「回合結束之後自己又動」：以城為單位量。
// 某一邊的砲擊結算完（resolve 結束）的那一刻，記下被打的那座城所有磚和兵的位置；一直追到「同一邊下一次開火」為止
// （中間隔了對方的整個回合和自己的瞄準時間，這段時間這座城不該有新的撞擊）。
// 記下：位移最大的是誰、動了多少、是結算完之後第幾秒開始動的（位移第一次超過 0.5）、這段時間這座城有沒有兵倒下、中間有沒有落石（有的話另外標記）。
(() => {
  const q = window.__qp, S = q.S, out = [];
  let prev = '', prevTurn = -1; const tr = [null, null];
  const label = (o) => o.isUnit ? 'unit(' + o.type + ')' : (o.frag ? 'frag' : o.prop ? 'prop' : o.seg ? 'slab' : o.kind === 'roof' ? 'roof' : 'block') + ':mat' + o.mat + (o.kind === 'ball' ? ':ball' : '');
  const begin = (side) => {
    const st = S.st[side], m = new Map();
    for (const b of st.blocks) if (!b.dead) { const p = b.body.getPosition(); m.set(b, [p.x, p.y, b.body.getAngle(), 0, -1]); }
    for (const u of st.units) if (u.alive) m.set(u, [u.x, u.y, 0, 0, -1]);
    tr[side] = { side, t0: S.time, round: S.round, pos: m, hazard: 0, deaths: [], ownHit: 0, lvl: S.idx + 1 };
  };
  const finish = (side) => {
    const T = tr[side]; if (!T) return; tr[side] = null;
    let best = 0, who = '', when = -1, n05 = 0, n34 = 0;
    for (const [o, p] of T.pos) { if (p[3] > 0.5) n05++; if (p[3] > 3.4) n34++; if (p[3] > best) { best = p[3]; who = label(o) + '@' + p[0].toFixed(0) + ',' + p[1].toFixed(0); when = p[4]; } }
    out.push({ lvl: T.lvl, round: T.round, castle: side, t0: +T.t0.toFixed(2), window: +(S.time - T.t0).toFixed(2), maxMove: +best.toFixed(2), who, startedAt: +when.toFixed(2), n05, n34, hazard: T.hazard, deaths: T.deaths, state: S.state });
  };
  window.__hook = () => {
    if (S.on && !S.on.__w2) {
      const o = S.on;
      S.on = function (t, a, b, c, d, e, f) {
        if (t === 'udie' && S.state === 'play') { const T = tr[c]; if (T) T.deaths.push([d, e, +(S.time - T.t0).toFixed(2), S.phase + S.turn]); }
        return o.apply(this, arguments);
      };
      S.on.__w2 = 1;
    }
    if (q.G.mode !== 'play') { prev = ''; tr[0] = tr[1] = null; return; }
    if (S.state !== 'play') { if (tr[0]) finish(0); if (tr[1]) finish(1); prev = ''; return; }
    const ph = S.phase, turn = S.turn;
    // 這一邊開火了：被打的那座城（1 - turn）上一段的追蹤到此為止
    if (ph === 'volley' && prev !== 'volley') finish(1 - turn);
    // 這一邊的砲擊結算完：開始追蹤被打的那座城
    if (prev === 'resolve' && ph !== 'resolve') begin(1 - prevTurn);
    if (ph === 'hazard' && S.hz) { for (const T of tr) if (T) T.hazard = 1; }
    for (const T of tr) {
      if (!T) continue; const dt = S.time - T.t0;
      for (const [o, p] of T.pos) {
        if (o.isUnit ? !o.alive : o.dead) continue;
        const x = o.isUnit ? o.x : o.body.getPosition().x, y = o.isUnit ? o.y : o.body.getPosition().y;
        if (x < -11 || x > 123 || y < -8) continue;                  // 掉出畫面的不算
        const d = Math.hypot(x - p[0], y - p[1]); if (d > p[3]) p[3] = d; if (p[4] < 0 && d > 0.5) p[4] = dt;
      }
    }
    prev = ph; prevTurn = turn;
  };
  window.__hookResult = () => { const r = out.slice(); out.length = 0; return r; };
})();
