// review5：新的兵身體（不互撞、邊緣滑落、往兩邊推開）帶來的新風險，逐格量：
//   overlaps  兩個兵（或兵和魔王）畫在同一個位置超過 0.8 秒（中心水平距離 < 半個身寬、身體上下重疊一半以上）
//   edges     「腳底正中間懸空 → 往外滑」每一次：開始時腳下的支撐樣子、滑了多遠、最後有沒有摔死
//   seps      「疊在一起 → 往兩邊推」每一次：推了多久、推多遠、有沒有人因此摔下去
//   inside    兵的身體中心點在某塊磚裡面超過 0.75 秒
//   jitters   瞄準階段（場上應該靜止）兵還在左右晃：位移總長、來回次數、醒著的比例
//   bossMoves 魔王每一次移動（從哪到哪、當時有沒有爆炸、是不是邊緣滑落）
//   deaths    每一個兵倒下：死法、階段、倒下前幾秒有沒有被推／滑落／附近有沒有爆炸、原本站在哪
//   revives   復活的位置：半秒後是不是跟別的兵疊在一起、是不是在磚裡
//   onHead    回合結束時還有整塊的磚（特別是屋瓦）壓在兵頭上
//   pops      跳出來的字「實際畫在哪」（包住 fillText 量的）：被按鈕蓋住多少、有沒有超出畫面
(() => {
  const q = window.__qp, S = q.S, PH = q.PH, FX = q.FX, V = q.V, G = q.G;
  const KILL = new Set(['砸扁！', '摔下去了！', '轟出城外！', '轟飛了！', '燒到了！', '擊倒！', '被轟出城', '摔下去了', '被轟飛了', '被砸扁了', '陣亡']);
  const R = {};
  const reset = () => { Object.assign(R, { frames: 0, play: 0, turnEnds: 0, overlaps: [], edges: [], seps: [], inside: [], jitters: [], bossMoves: [], bossBack: [], deaths: [], revives: [], onHead: [], aims: 0, aimUnitChecks: 0,
    pops: { n: 0, kills: 0, cov30: 0, cov60: 0, cutBottom: 0, cutTop: 0, cutSide: 0, moved: 0, samples: [], texts: {} } }); };
  reset();
  let ov = new Map(), us = new Map(), booms = [], revQ = [], prevPhase = '', aim = null, calls = [], popSeen = new WeakMap(), rects = [], rectAt = -99;
  const lab = (u) => (u.side ? 'foe:' : 'me:') + u.type + '#' + u.slot;
  const r2 = (v) => +(+v).toFixed(2);
  const boomDt = (x, y, rad) => { let best = 99; for (const b of booms) if (Math.hypot(b[1] - x, b[2] - y) < rad) { const d = S.time - b[0]; if (d < best) best = d; } return r2(best); };
  const support = (u) => { let s = ''; const hw = u.bw / 2; for (let k = -4; k <= 4; k++) { const x = u.x + hw * k / 4; let h = '0'; PH.world.rayCast({ x, y: u.y + 0.6 }, { x, y: u.y - 0.9 }, (f, pt, n, fr) => { const o = f.getUserData(); if (o && o.isUnit) return -1; h = o && o.isBlock ? (o.frag ? 'f' : 'B') : 'T'; return fr; }); s += h; } return s; };
  const blockAt = (px, py) => { let hit = null; try { PH.world.queryAABB({ lowerBound: { x: px - 0.02, y: py - 0.02 }, upperBound: { x: px + 0.02, y: py + 0.02 } }, (f) => { const o = f.getUserData(); if (!o || !o.isBlock || o.dead) return true; if (f.testPoint({ x: px, y: py })) { hit = o; return false; } return true; }); } catch (e) { R.qerr = String(e); } return hit; };
  const bdesc = (b) => (b.frag ? 'frag' : b.prop ? 'prop' : b.seg ? 'slab' : 'block') + ':mat' + b.mat + ':' + b.kind + ':' + (+b.w).toFixed(1) + 'x' + (+b.h).toFixed(1);
  const st = (u) => { let s = us.get(u); if (!s) { s = { edgeT: -99, sepT: -99, restX: u.x, restY: u.y, restT: S.time, edgeEp: null, sepEp: null, inEp: null, mv: null, still: 0, prevSep: false }; us.set(u, s); } return s; };
  const lvl = () => S.idx + 1;
  const onEv = (t, a, b, c, d, e, f) => {
    if (t === 'boom') { booms.push([S.time, a, b, c]); if (booms.length > 300) booms.splice(0, 100); }
    else if (t === 'udie') {
      let u = null; for (const k of S.units) if (k.side === c && k.type === d && k.slot === f) u = k;
      const s = u ? st(u) : null;
      R.deaths.push({ lvl: lvl(), t: r2(S.time), round: S.round, phase: S.phase, turn: S.turn, phaseT: r2(S.phaseT), state: S.state, who: u ? lab(u) : c + ':' + d, how: e, x: r2(a), y: r2(b - 1.8),
        edgeDt: s ? r2(Math.min(99, S.time - s.edgeT)) : 99, sepDt: s ? r2(Math.min(99, S.time - s.sepT)) : 99, boomDt: boomDt(a, b, 11), restDt: s ? r2(S.time - s.restT) : 99, rest: s ? [r2(s.restX), r2(s.restY)] : null, load: u ? r2(u.load || 0) : 0 });
      if (s) { if (s.edgeEp) s.edgeEp.died = e; if (s.sepEp) s.sepEp.died = e; }
    } else if (t === 'revive') revQ.push({ at: S.time + 0.5, side: c, slot: d, x: r2(a), y: r2(b), t: r2(S.time) });
    else if (t === 'bossback') { const u = S.boss && S.units.find((k) => k.def.big); const s = u ? st(u) : null; R.bossBack.push({ lvl: lvl(), t: r2(S.time), round: S.round, phase: S.phase + S.turn, rest: s ? [r2(s.restX), r2(s.restY)] : null, restDt: s ? r2(S.time - s.restT) : 99, edgeDt: s ? r2(Math.min(99, S.time - s.edgeT)) : 99, boomDt: u ? boomDt(u.x, u.y, 14) : 99 }); }
  };
  const closeOv = (key, why) => { const o = ov.get(key); if (!o) return; ov.delete(key); const dur = S.time - o.t0; if (dur >= 0.8) R.overlaps.push({ lvl: o.lvl, t0: r2(o.t0), dur: r2(dur), a: o.a, b: o.b, x: r2(o.x), y: r2(o.y), minDx: r2(o.minDx), meanDx: r2(o.sumDx / Math.max(1, o.n)), lastDx: r2(o.lastDx), lastAt: [r2(o.lx), r2(o.ly)], tEnd: r2(o.lastT), restFrac: r2(o.rest / Math.max(1, o.n)), phases: Object.keys(o.ph).join(','), end: why, round: o.round }); };
  const finEdge = (u, s, why) => { const e = s.edgeEp; if (!e) return; s.edgeEp = null; e.dur = r2((e.endT || S.time) - e.t0); e.dx = r2((u.alive ? u.x : e.lx) - e.x0); e.dy = r2((u.alive ? u.y : e.ly) - e.y0); e.end = why; delete e.endT; delete e.lx; delete e.ly; R.edges.push(e); };
  const finSep = (u, s, why) => { const e = s.sepEp; if (!e) return; s.sepEp = null; e.dur = r2((e.endT || S.time) - e.t0); e.dx = r2((u.alive ? u.x : e.lx) - e.x0); e.dy = r2((u.alive ? u.y : e.ly) - e.y0); e.end = why; e.sepT = r2(u.sepT || 0); delete e.endT; delete e.lx; delete e.ly; R.seps.push(e); };
  const getRects = () => {
    if (R.frames - rectAt < 20) return rects; rectAt = R.frames; rects = [];
    for (const id of ['btnFire', 'aimInfo', 'btnShield', 'btnUlt', 'btnPause', 'turnChip']) { const el = document.getElementById(id); if (!el || el.hidden) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.3) continue; const b = el.getBoundingClientRect(); if (b.width > 0) rects.push([id, b.left, b.top, b.right, b.bottom]); }
    return rects;
  };
  window.__hook = () => {
    R.frames++;
    if (S.on && !S.on.__w5) { const o = S.on; S.on = function (t, a, b, c, d, e, f) { try { onEv(t, a, b, c, d, e, f); } catch (err) { console.error('EV5 ' + (err && err.stack || err)); } return o.apply(this, arguments); }; S.on.__w5 = 1; }
    const c = q.RD.c;
    if (c && !c.__w5) { const ft = c.fillText; c.fillText = function (txt, x, y) { if (calls.length < 300) { const tr = this.getTransform(), m = /([\d.]+)px/.exec(this.font); calls.push([String(txt), x + tr.e, y + tr.f, this.measureText(txt).width, m ? +m[1] : 0, this.globalAlpha]); } return ft.apply(this, arguments); }; c.__w5 = 1; }
    const frameCalls = calls; calls = [];
    if (G.mode !== 'play') { for (const k of [...ov.keys()]) closeOv(k, 'leave'); for (const [u, s] of us) { finEdge(u, s, 'leave'); finSep(u, s, 'leave'); } us = new Map(); booms = []; revQ = []; prevPhase = ''; aim = null; return; }
    R.play++;
    // ---- 跳字實際畫在哪 ----
    if (G.rot === 0 && FX.pops.length) {
      const k = 1 / V.dpr, Wc = V.W * k, Hc = V.H * k, hud = V.hud * k; let ci = frameCalls.length - 1;
      for (let i = FX.pops.length - 1; i >= 0; i--) {
        const p = FX.pops[i]; while (ci >= 0 && frameCalls[ci][0] !== p.txt) ci--; if (ci < 0) break; const cl = frameCalls[ci--];
        const n = (popSeen.get(p) || 0) + 1; popSeen.set(p, n); if (n !== 12) continue;
        const fz = cl[4], bx = { x0: (cl[1] - cl[3] / 2) * k, x1: (cl[1] + cl[3] / 2) * k, y0: (cl[2] - fz * 0.55) * k, y1: (cl[2] + fz * 0.55) * k }, area = Math.max(1, (bx.x1 - bx.x0) * (bx.y1 - bx.y0));
        let cov = 0, by = ''; for (const r of getRects()) { const ox = Math.min(bx.x1, r[3]) - Math.max(bx.x0, r[1]), oy = Math.min(bx.y1, r[4]) - Math.max(bx.y0, r[2]); if (ox > 0 && oy > 0) { cov += ox * oy; by += r[0] + ' '; } }
        const P = R.pops, frac = cov / area, kill = KILL.has(p.txt); P.n++; if (kill) P.kills++;
        const key = p.txt.replace(/[0-9]+/g, '#'); P.texts[key] = (P.texts[key] || 0) + 1;
        const cutB = bx.y1 > Hc + 0.5, cutT = bx.y0 < hud - 0.5, cutS = bx.x0 < -0.5 || bx.x1 > Wc + 0.5;
        // 原本（沒夾住的話）會畫在哪：世界座標換過來
        const rawY = (V.gy - p.y * V.s) * k, rawX = ((p.x - 56) * V.s + V.cx) * k, moved = Math.abs(rawY - (bx.y0 + bx.y1) / 2) > fz * k * 1.2 || Math.abs(rawX - (bx.x0 + bx.x1) / 2) > 2;
        if (frac >= 0.3) P.cov30++; if (frac >= 0.6) P.cov60++; if (cutB) P.cutBottom++; if (cutT) P.cutTop++; if (cutS) P.cutSide++; if (moved) P.moved++;
        if ((frac >= 0.15 || cutB || cutT || cutS) && P.samples.length < 12) P.samples.push({ lvl: lvl(), t: r2(S.time), txt: p.txt, cov: r2(frac), by: by.trim(), cutB, cutT, cutS, box: [Math.round(bx.x0), Math.round(bx.y0), Math.round(bx.x1), Math.round(bx.y1)] });
        else if (moved && kill && (P.movedS = P.movedS || []).length < 8) P.movedS.push({ lvl: lvl(), t: r2(S.time), txt: p.txt, raw: [Math.round(rawX), Math.round(rawY)], box: [Math.round(bx.x0), Math.round(bx.y0), Math.round(bx.x1), Math.round(bx.y1)] });
      }
    }
    while (booms.length && S.time - booms[0][0] > 8) booms.shift();
    const U = S.units, ph = S.phase, playing = S.state === 'play';
    // ---- 每個兵 ----
    for (const u of U) {
      const s = st(u);
      if (!u.alive) { if (s.edgeEp) finEdge(u, s, 'died'); if (s.sepEp) finSep(u, s, 'died'); s.inEp = null; continue; }
      const speed = Math.hypot(u.vx, u.vy);
      if (speed < 0.3 && !u.air) { s.still++; if (s.still > 6) { s.restX = u.x; s.restY = u.y; s.restT = S.time; } } else s.still = 0;
      // 邊緣滑落
      if (u.edge) {
        s.edgeT = S.time;
        if (!s.edgeEp) s.edgeEp = { lvl: lvl(), t0: r2(S.time), round: S.round, phase: ph + S.turn, state: S.state, who: lab(u), x0: r2(u.x), y0: r2(u.y), dir: u.edge, sup: support(u), boomDt: boomDt(u.x, u.y, 11), restDt: r2(S.time - s.restT), sp0: r2(speed) };
        s.edgeEp.endT = 0;
      } else if (s.edgeEp) { if (!s.edgeEp.endT) s.edgeEp.endT = S.time; else if (S.time - s.edgeEp.endT > 1.2) finEdge(u, s, 'settled'); }
      if (s.edgeEp) { s.edgeEp.lx = u.x; s.edgeEp.ly = u.y; }
      // 被推開
      if (u.sepNow) {
        s.sepT = S.time;
        if (!s.sepEp) { let other = ''; for (const k of U) if (k !== u && k.alive && Math.abs(k.x - u.x) < (k.bw + u.bw) * 0.45 && Math.abs(k.y + k.bh / 2 - u.y - u.bh / 2) < (k.bh + u.bh) * 0.43) other = lab(k); s.sepEp = { lvl: lvl(), t0: r2(S.time), round: S.round, phase: ph + S.turn, state: S.state, who: lab(u), other, x0: r2(u.x), y0: r2(u.y), sup: support(u), boomDt: boomDt(u.x, u.y, 11), restDt: r2(S.time - s.restT) }; }
        s.sepEp.endT = 0;
      } else if (s.sepEp) { if (!s.sepEp.endT) s.sepEp.endT = S.time; else if (S.time - s.sepEp.endT > 1.2) finSep(u, s, 'settled'); }
      if (s.sepEp) { s.sepEp.lx = u.x; s.sepEp.ly = u.y; }
      // 身體中心在磚裡
      { const b = blockAt(u.x, u.y + u.bh * 0.5);
        if (b) { if (!s.inEp) s.inEp = { t0: S.time, b: bdesc(b), x: u.x, y: u.y, logged: false }; else if (!s.inEp.logged && S.time - s.inEp.t0 > 0.75) { s.inEp.logged = true; s.inEp.rec = { lvl: lvl(), t0: r2(s.inEp.t0), round: S.round, phase: ph + S.turn, who: lab(u), block: s.inEp.b, x: r2(u.x), y: r2(u.y), dur: 0 }; R.inside.push(s.inEp.rec); } if (s.inEp.rec) s.inEp.rec.dur = r2(S.time - s.inEp.t0); }
        else s.inEp = null; }
      // 魔王的移動
      if (u.def.big) {
        if (!s.mv) { if (speed > 1.0) s.mv = { lvl: lvl(), t0: r2(S.time), round: S.round, phase: ph + S.turn, from: [r2(s.restX), r2(s.restY)], restDt: r2(S.time - s.restT), boomDt: boomDt(u.x, u.y, 14), edge: u.edge, sep: u.sepNow ? 1 : 0, sup: support(u), maxSp: 0, edgeSeen: 0 }; }
        else { if (speed > s.mv.maxSp) s.mv.maxSp = r2(speed); if (u.edge) s.mv.edgeSeen = 1; if (s.still > 12) { const m = s.mv; s.mv = null; m.to = [r2(u.x), r2(u.y)]; m.dur = r2(S.time - m.t0); if (Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1]) > 0.8) R.bossMoves.push(m); } }
      }
    }
    // ---- 兩兩重疊 ----
    for (let i = 0; i < U.length; i++) { const a = U[i]; for (let j = i + 1; j < U.length; j++) { const b = U[j], key = i + '-' + j;
      if (!a.alive || !b.alive) { closeOv(key, 'death'); continue; }
      const dx = Math.abs(a.x - b.x), dyc = Math.abs(a.y + a.bh / 2 - b.y - b.bh / 2), oy = (a.bh + b.bh) / 2 - dyc;
      if (dx < 0.8 * Math.min(a.bw, b.bw) && oy > 0.5 * Math.min(a.bh, b.bh)) {
        let o = ov.get(key); if (!o) { o = { lvl: lvl(), t0: S.time, a: lab(a), b: lab(b), x: a.x, y: a.y, minDx: 9, rest: 0, n: 0, ph: {}, round: S.round }; ov.set(key, o); }
        o.n++; o.sumDx = (o.sumDx || 0) + dx; o.lastDx = dx; o.lastT = S.time; o.lx = a.x; o.ly = a.y; if (dx < o.minDx) { o.minDx = dx; o.x = a.x; o.y = a.y; } if (Math.hypot(a.vx, a.vy) < 0.6 && Math.hypot(b.vx, b.vy) < 0.6) o.rest++; o.ph[ph + S.turn] = 1;
      } else closeOv(key, 'apart');
    } }
    // ---- 復活 ----
    for (let i = revQ.length - 1; i >= 0; i--) { const r = revQ[i]; if (S.time < r.at) continue; revQ.splice(i, 1);
      const u = U.find((k) => k.side === r.side && k.slot === r.slot); if (!u) continue;
      let near = ''; if (u.alive) for (const k of U) if (k !== u && k.alive && Math.abs(k.x - u.x) < (k.bw + u.bw) * 0.45 && Math.abs(k.y + k.bh / 2 - u.y - u.bh / 2) < (k.bh + u.bh) * 0.43) near = lab(k);
      const b = u.alive ? blockAt(u.x, u.y + u.bh * 0.5) : null;
      R.revives.push({ lvl: lvl(), t: r.t, who: lab(u), at: [r.x, r.y], home: [r2(u.hx), r2(u.hy)], now: u.alive ? [r2(u.x), r2(u.y)] : null, alive: u.alive, overlap: near, inBlock: b ? bdesc(b) : '', sup: u.alive ? support(u) : '' }); }
    // ---- 瞄準階段的晃動 ----
    if (playing && ph === 'aim') {
      if (!aim || aim.turn !== S.turn || aim.round !== S.round) { aim = { turn: S.turn, round: S.round, t0: S.time, m: new Map() }; R.aims++; }
      for (const u of U) { if (!u.alive) continue; let a = aim.m.get(u); if (!a) { a = { x0: u.x, y0: u.y, lx: u.x, path: 0, rev: 0, sg: 0, awake: 0, n: 0, maxSp: 0, sep: 0, edge: 0 }; aim.m.set(u, a); }
        const d = u.x - a.lx; a.lx = u.x; a.path += Math.abs(d); if (Math.abs(d) > 0.0015) { const sg = d > 0 ? 1 : -1; if (a.sg && sg !== a.sg) a.rev++; a.sg = sg; }
        a.n++; if (u.body.isAwake()) a.awake++; const sp = Math.hypot(u.vx, u.vy); if (sp > a.maxSp) a.maxSp = sp; if (u.sepNow) a.sep++; if (u.edge) a.edge++; }
    } else if (aim) {
      for (const [u, a] of aim.m) { R.aimUnitChecks++; const net = u.alive ? Math.abs(u.x - a.x0) : -1, dy = u.alive ? u.y - a.y0 : 0;
        if (a.path > 0.35 || a.rev >= 4 || (a.n > 90 && a.awake / a.n > 0.6) || Math.abs(dy) > 0.5) R.jitters.push({ lvl: lvl(), t0: r2(aim.t0), dur: r2(a.n / 60), round: aim.round, turn: aim.turn, who: lab(u), path: r2(a.path), net: r2(net), dy: r2(dy), rev: a.rev, awakeFrac: r2(a.awake / Math.max(1, a.n)), maxSp: r2(a.maxSp), sepFr: a.sep, edgeFr: a.edge, x: r2(a.x0), y: r2(a.y0), boomDt: boomDt(a.x0, a.y0, 12), alive: u.alive }); }
      aim = null;
    }
    // ---- 回合結束：還有整塊磚壓在頭上？ ----
    if (playing && (prevPhase === 'resolve' || prevPhase === 'hazard') && ph !== prevPhase && ph !== 'hazard') {
      R.turnEnds++;
      for (let ct = PH.world.getContactList(); ct; ct = ct.getNext()) {
        if (!ct.isTouching()) continue; const A = ct.getFixtureA().getUserData(), B = ct.getFixtureB().getUserData(); if (!A || !B) continue;
        const u = A.isUnit ? A : B.isUnit ? B : null, b = A.isBlock ? A : B.isBlock ? B : null; if (!u || !b || !u.alive || b.dead) continue;
        const wm = ct.getWorldManifold(null); if (!wm) continue; const ny = A === u ? wm.normal.y : -wm.normal.y;       // 由兵指向磚
        if (ny > 0.35 && b.body.getPosition().y > u.y + u.bh * 0.5) R.onHead.push({ lvl: lvl(), t: r2(S.time), round: S.round, next: ph + S.turn, who: lab(u), block: bdesc(b), roof: b.mat === 4 ? 1 : 0, x: r2(u.x), y: r2(u.y), load: r2(u.load || 0), loadT: r2(u.loadT || 0), bodyAwake: u.body.isAwake() ? 1 : 0 });
      }
    }
    prevPhase = playing ? ph : '';
  };
  window.__hookResult = () => { for (const k of [...ov.keys()]) closeOv(k, 'gameend'); for (const [u, s] of us) { finEdge(u, s, 'gameend'); finSep(u, s, 'gameend'); } const r = JSON.parse(JSON.stringify(R)); reset(); us = new Map(); return r; };
})();
