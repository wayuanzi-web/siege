// 「該倒卻停在半空」：每一次回合結束，找出靜止的磚（含碎塊、小擺設），只靠底下的東西撐著（沒有靠在別的東西旁邊），
// 但重心的水平位置落在所有支撐點的外側（超過 0.3）——照理說會翻倒，卻睡著不動了。
(() => {
  const q = window.__qp, S = q.S, PH = q.PH, out = []; let prev = '', ends = 0, checked = 0;
  const probe = () => {
    const W = PH.world, info = new Map();
    const get = (b) => { let r = info.get(b); if (!r) { r = { sup: [], side: 0, top: 0 }; info.set(b, r); } return r; };
    for (let c = W.getContactList(); c; c = c.getNext()) {
      if (!c.isTouching()) continue; const m = c.getManifold(); if (!m.pointCount) continue; const wm = c.getWorldManifold(null); if (!wm) continue;
      const A = c.getFixtureA().getBody(), B = c.getFixtureB().getBody(), ny = wm.normal.y;       // 法線由 A 指向 B
      for (let k = 0; k < m.pointCount; k++) {
        const p = wm.points[k];
        // 對 B 來說：A 在法線的反方向。ny > 0.3 表示 A 在 B 下面撐著 B
        if (B.isDynamic()) { const r = get(B); if (ny > 0.3) r.sup.push(p.x); else if (ny < -0.3) r.top++; else r.side++; }
        if (A.isDynamic()) { const r = get(A); if (ny < -0.3) r.sup.push(p.x); else if (ny > 0.3) r.top++; else r.side++; }
      }
    }
    const flags = [];
    for (const b of S.blocks) {
      if (b.dead) continue; const bd = b.body, p = bd.getPosition(), v = bd.getLinearVelocity();
      if (p.x < -11 || p.x > 123 || p.y < -8) continue;
      if (Math.hypot(v.x, v.y) > 0.3 || Math.abs(bd.getAngularVelocity()) > 0.2) continue;
      const r = info.get(bd); if (!r || !r.sup.length) continue;
      checked++;
      if (r.side || r.top) continue;                       // 有靠著別的、或被壓著：不算
      const c = bd.getWorldCenter(), lo = Math.min(...r.sup), hi = Math.max(...r.sup), over = c.x < lo ? lo - c.x : c.x > hi ? c.x - hi : 0;
      if (over > 0.05) flags.push({ what: (b.frag ? 'frag' : b.prop ? 'prop' : 'block') + ' mat' + b.mat + ' ' + b.kind + ' ' + b.w.toFixed(1) + 'x' + b.h.toFixed(1) + ' side' + b.side, x: +p.x.toFixed(1), y: +p.y.toFixed(1), angDeg: Math.round(bd.getAngle() * 180 / Math.PI) % 360, over: +over.toFixed(2), span: [+lo.toFixed(1), +hi.toFixed(1)], comX: +c.x.toFixed(1), awake: bd.isAwake() ? 1 : 0 });
    }
    return flags;
  };
  window.__hangProbe = probe; window.__hangChecked = () => checked;
  window.__hook = () => {
    if (q.G.mode !== 'play' || S.state !== 'play') { prev = ''; return; }
    const ph = S.phase;
    if ((prev === 'resolve' || prev === 'hazard') && ph !== prev && ph !== 'hazard') { ends++; const fl = probe(); if (fl.length) out.push({ lvl: S.idx + 1, t: +S.time.toFixed(2), round: S.round, next: ph + S.turn, flags: fl }); }
    prev = ph;
  };
  window.__hookResult = () => { const r = { ends, checked, recs: out.slice() }; out.length = 0; ends = 0; checked = 0; return r; };
})();
