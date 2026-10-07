// 回合節奏：每一次「這一輪結束」（resolve/hazard → 下一個階段）記下：
//   等了多久（phaseT）、是塵埃落定（quiet）還是等到上限（cap）、結束那一刻還有多少東西在動、最快多快；
//   結束之後 2 秒內，哪一塊磚／哪個兵又移動了最多（回合結束之後還在動的東西）；
//   結束之前「其實已經沒有東西在動了」多久（lastMove：最後一次有東西動得比 1 快的時間）
(() => {
  const q = window.__qp, S = q.S, PH = q.PH, out = [];
  let prev = '', prevT = 0, lastMove = 0, track = null, wasQuietT = 0, maxSp = 0;
  const speeds = () => { let n = 0, mx = 0, who = ''; for (let b = PH.world.getBodyList(); b; b = b.getNext()) { if (!b.isDynamic() || !b.isAwake()) continue; const p = b.getPosition(); if (p.x < -11 || p.x > 123 || p.y < -10) continue; const v = b.getLinearVelocity(), s = Math.hypot(v.x, v.y) + Math.abs(b.getAngularVelocity()); if (s > 0.6) n++; if (s > mx) { mx = s; const o = b.getUserData(); who = o ? (o.isUnit ? 'unit' + o.side : (o.frag ? 'frag' : o.prop ? 'prop' : 'block') + 'm' + o.mat + 's' + o.side) : '?'; } } return [n, mx, who]; };
  const snap = () => { const m = new Map(); for (const b of S.blocks) if (!b.dead) { const p = b.body.getPosition(); m.set(b, [p.x, p.y, b.body.getAngle()]); } for (const u of S.units) if (u.alive) m.set(u, [u.x, u.y, 0]); return m; };
  window.__hook = () => {
    if (q.G.mode !== 'play' || S.state !== 'play') { prev = ''; track = null; return; }
    const ph = S.phase;
    if (ph === 'resolve' || ph === 'hazard') { const sp = speeds(); if (sp[1] > 1.0) lastMove = S.time; }
    if ((prev === 'resolve' || prev === 'hazard') && ph !== prev) {
      const sp = speeds();
      const rec = { lvl: S.idx + 1, t: +S.time.toFixed(2), round: S.round, from: prev, to: ph + S.turn, waited: +prevT.toFixed(2), how: wasQuietT >= 0.49 ? 'quiet' : 'cap', moving: sp[0], maxSpeed: +sp[1].toFixed(2), who: sp[2], idleBefore: +(S.time - lastMove).toFixed(2) };
      out.push(rec); track = { rec, t0: S.time, pos: snap() };
    }
    // 只量到下一輪開火為止（自動玩家想得很快，兩秒內下一輪的砲彈就打到了，那不算「回合結束後自己又動」）
    if (track && (S.time - track.t0 >= 2.0 || (ph !== 'aim' && S.time - track.t0 > 0.05))) {
      track.rec.window = +(S.time - track.t0).toFixed(2);
      let best = 0, who = '';
      for (const [o, p] of track.pos) { if (o.dead || (o.isUnit && !o.alive)) continue; const x = o.isUnit ? o.x : o.body.getPosition().x, y = o.isUnit ? o.y : o.body.getPosition().y; const d = Math.hypot(x - p[0], y - p[1]); if (d > best && p[0] > -11 && p[0] < 123 && p[1] > -8) { best = d; who = (o.isUnit ? 'unit' + o.side : (o.frag ? 'frag' : o.prop ? 'prop' : 'block') + 'm' + o.mat + 's' + o.side + (o.kind === 'ball' ? 'ball' : '')) + '@' + p[0].toFixed(0) + ',' + p[1].toFixed(0); } }
      track.rec.movedAfter = +best.toFixed(2); track.rec.movedWho = who; track.rec.shotsAfter = q.SH.n; track = null;
    }
    prev = ph; prevT = S.phaseT; wasQuietT = S.quietT;
  };
  window.__hookResult = () => { const r = out.slice(); out.length = 0; return r; };
})();
