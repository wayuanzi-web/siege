// 每一次回合結束（resolve / hazard → 下一階段）那一刻，檢查靜止狀態：
//   U_AIR   兵靜止，但腳下三個點（左腳、中間、右腳）往下 0.7 都沒有東西
//   U_EDGE  兵靜止，腳的正中間底下沒有東西（只有一邊的腳尖搭著）
//   U_ONUNIT 兵站在另一個兵身上
//   U_PEN   兵跟別的東西互相卡進去超過 0.3
//   B_FLOAT 磚睡著了，卻沒有任何接觸
//   B_PEN   磚互相卡進去超過 0.35
(() => {
  const q = window.__qp, S = q.S, PH = q.PH, out = []; let prev = '', n = 0, units = 0;
  const probe = () => {
    const W = PH.world, info = new Map(), z = { nc: 0, sup: 0, pen: 0 };
    const get = (b) => { let r = info.get(b); if (!r) { r = { nc: 0, sup: 0, pen: 0 }; info.set(b, r); } return r; };
    for (let c = W.getContactList(); c; c = c.getNext()) {
      if (!c.isTouching()) continue; const m = c.getManifold(); if (!m.pointCount) continue; const wm = c.getWorldManifold(null); if (!wm) continue;
      let sep = 0; for (let k = 0; k < m.pointCount; k++) { const s = wm.separations[k]; if (s < sep) sep = s; }
      const A = c.getFixtureA().getBody(), B = c.getFixtureB().getBody(), ra = get(A), rb = get(B), ny = wm.normal.y;
      ra.nc++; rb.nc++; if (ny < -0.3) ra.sup++; if (ny > 0.3) rb.sup++; if (sep < ra.pen) ra.pen = sep; if (sep < rb.pen) rb.pen = sep;
    }
    const flags = [];
    for (const u of S.units) {
      if (!u.alive) continue; units++;
      const bd = u.body, p = bd.getPosition(), v = bd.getLinearVelocity(), r = info.get(bd) || z, fy = p.y - u.bh / 2, hw = u.bw / 2, feet = [];
      if (p.x < -11 || p.x > 123) continue;
      for (const dx of [-hw * 0.5, 0, hw * 0.5]) { let hit = 0; W.rayCast({ x: p.x + dx, y: fy + 0.5 }, { x: p.x + dx, y: fy - 0.7 }, (f, pt, nn, fr) => { if (f.getBody() === bd) return -1; const o = f.getUserData(); hit = o && !o.isBlock ? 2 : 1; return fr; }); feet.push(hit); }
      const who = 'unit s' + u.side + ' ' + u.type;
      if (Math.hypot(v.x, v.y) < 0.6) {
        if (feet[0] === 0 && feet[1] === 0 && feet[2] === 0) flags.push(['U_AIR', who, +u.x.toFixed(1), +u.y.toFixed(1), 'sup' + r.sup + ' nc' + r.nc]);
        else if (feet[1] === 0) flags.push(['U_EDGE', who, +u.x.toFixed(1), +u.y.toFixed(1), 'feet' + feet.join('') + ' sup' + r.sup]);
        if (feet.includes(2)) flags.push(['U_ONUNIT', who, +u.x.toFixed(1), +u.y.toFixed(1), 'feet' + feet.join('')]);
      }
      if (r.pen < -0.3) flags.push(['U_PEN', who, +u.x.toFixed(1), +u.y.toFixed(1), 'overlap ' + (-r.pen).toFixed(2)]);
    }
    for (const b of S.blocks) {
      if (b.dead) continue; const bd = b.body, p = bd.getPosition(), r = info.get(bd) || z;
      if (p.x < -11 || p.x > 123 || p.y < -8) continue;
      const who = (b.frag ? 'frag' : b.prop ? 'prop' : 'block') + ' mat' + b.mat + ' ' + b.kind + ' ' + b.w.toFixed(1) + 'x' + b.h.toFixed(1) + ' s' + b.side;
      if (!bd.isAwake() && r.nc === 0) flags.push(['B_FLOAT', who, +p.x.toFixed(1), +p.y.toFixed(1), '']);
      if (r.pen < -0.35) flags.push(['B_PEN', who, +p.x.toFixed(1), +p.y.toFixed(1), 'overlap ' + (-r.pen).toFixed(2)]);
    }
    return flags;
  };
  window.__hook = () => {
    if (q.G.mode !== 'play' || S.state !== 'play') { prev = ''; return; }
    const ph = S.phase;
    if ((prev === 'resolve' || prev === 'hazard') && ph !== prev && ph !== 'hazard') { n++; const fl = probe(); if (fl.length) out.push({ lvl: S.idx + 1, t: +S.time.toFixed(2), round: S.round, next: ph + S.turn, flags: fl }); }
    prev = ph;
  };
  window.__hookResult = () => { const r = { ends: n, unitChecks: units, recs: out.slice() }; out.length = 0; n = 0; units = 0; return r; };
})();
