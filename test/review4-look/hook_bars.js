// 上方的城防條有沒有做出跟畫面矛盾的事：
//  UP    沒有補給（全軍回血／援軍）卻往上跳超過 2 個百分點
//  IDLE  沒有人在開火、場上也沒有東西在動的時候（瞄準階段）自己掉超過 2 個百分點
//  記下每一次：哪一邊、從多少到多少、當時的階段
(() => {
  const q = window.__qp, S = q.S, out = []; let last = [-1, -1], bonusT = [-99, -99], lastPhase = '', aimStart = [0, 0], aimT = 0, n = 0;
  window.__hook = () => {
    if (S.on && !S.on.__w3) { const o = S.on; S.on = function (t, a, b, c, d) { if (t === 'bonus' || t === 'revive') { bonusT[c] = S.time; } return o.apply(this, arguments); }; S.on.__w3 = 1; }
    if (q.G.mode !== 'play' || S.state !== 'play') { last = [-1, -1]; lastPhase = ''; return; }
    n++;
    const bar = [q.teamBar(0) * 100, q.teamBar(1) * 100];
    if (S.phase === 'aim' && lastPhase !== 'aim') { aimStart = bar.slice(); aimT = S.time; }
    for (let s = 0; s < 2; s++) {
      if (last[s] >= 0 && bar[s] - last[s] > 2 && S.time - bonusT[s] > 0.5 && out.length < 40) out.push({ kind: 'UP', lvl: S.idx + 1, t: +S.time.toFixed(2), side: s, from: +last[s].toFixed(1), to: +bar[s].toFixed(1), phase: S.phase + S.turn, round: S.round });
    }
    // 瞄準階段結束（有人開火）的那一刻：這段瞄準期間城防條自己掉了多少
    if (lastPhase === 'aim' && S.phase !== 'aim') for (let s = 0; s < 2; s++) { const d = aimStart[s] - last[s]; if (d > 2 && out.length < 40) out.push({ kind: 'IDLE', lvl: S.idx + 1, t: +S.time.toFixed(2), side: s, from: +aimStart[s].toFixed(1), to: +last[s].toFixed(1), aimSec: +(S.time - aimT).toFixed(1), round: S.round }); }
    last = bar; lastPhase = S.phase;
  };
  window.__hookResult = () => { const r = { frames: n, recs: out.slice() }; out.length = 0; n = 0; return r; };
})();
