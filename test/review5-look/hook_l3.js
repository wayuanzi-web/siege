// review5 第 6 項：第三關敵城的「兩步拆法」在實戰裡有沒有發生。
// 每一次回合結束記一筆：兩根冰柱還在不在（藍圖 cx=3、5，cy=4/5）、長冰板九格還剩幾格在原位、兩座塔的兵（1、2 號）和大廳的冰術士（3 號）還在不在原位；
// 另外記每一個敵兵倒下的時間、回合、死法，以及冰術士倒下那一刻兩根冰柱和冰板的狀態。
(() => {
  const q = window.__qp, S = q.S, out = { turns: [], deaths: [], firsts: {} }; let prev = '';
  const cell = (cx, cy) => { const st = S.st[1], b = st.cellB[cy * st.cols + (st.cols - 1 - cx)]; return !!(b && !b.dead && b.inPlace); };
  const home = (slot) => S.team[1].units.some((u) => u.alive && u.slot === slot && Math.abs(u.x - u.hx) < 2.2 && Math.abs(u.y - u.hy) < 1.6);
  const alive = (slot) => S.team[1].units.some((u) => u.alive && u.slot === slot);
  const snap = () => { let slab = 0; for (let cx = 0; cx < 9; cx++) if (cell(cx, 6)) slab++; return { pA: cell(3, 4) || cell(3, 5) ? 1 : 0, pA2: (cell(3, 4) ? 1 : 0) + (cell(3, 5) ? 1 : 0), pB: cell(5, 4) || cell(5, 5) ? 1 : 0, pB2: (cell(5, 4) ? 1 : 0) + (cell(5, 5) ? 1 : 0), slab, h1: home(1) ? 1 : 0, h2: home(2) ? 1 : 0, h3: home(3) ? 1 : 0, a: [alive(1) ? 1 : 0, alive(2) ? 1 : 0, alive(3) ? 1 : 0] }; };
  const note = (k) => { if (!(k in out.firsts)) out.firsts[k] = { t: +S.time.toFixed(1), round: S.round, turn: S.turn, phase: S.phase }; };
  window.__hook = () => {
    if (S.on && !S.on.__w6) { const o = S.on; S.on = function (t, a, b, c, d, e, f) { if (t === 'udie' && c === 1 && S.idx === 2) out.deaths.push(Object.assign({ t: +S.time.toFixed(1), round: S.round, turn: S.turn, type: d, slot: f, how: e, x: +a.toFixed(1), y: +(b - 1.8).toFixed(1), state: S.state }, snap())); return o.apply(this, arguments); }; S.on.__w6 = 1; }
    if (q.G.mode !== 'play' || S.idx !== 2) { prev = ''; return; }
    if (S.state === 'play' && (S.frame & 3) === 0) { const s = snap(); if (!s.pA) note('pillarA_gone'); if (!s.pB) note('pillarB_gone'); if (s.slab < 9) note('slab_first_cell'); if (s.slab <= 4) note('slab_half_gone'); if (!s.h1) note('tower1_unit_left'); if (!s.h2) note('tower2_unit_left'); if (!s.h3) note('mage_left_home'); }
    const ph = S.phase;
    if (S.state === 'play' && (prev === 'resolve' || prev === 'hazard') && ph !== prev && ph !== 'hazard') out.turns.push(Object.assign({ t: +S.time.toFixed(1), round: S.round, next: ph + S.turn, foe: Math.round(q.teamBar(1) * 100) }, snap()));
    prev = S.state === 'play' ? ph : '';
  };
  window.__hookResult = () => { const r = JSON.parse(JSON.stringify(out)); out.turns = []; out.deaths = []; out.firsts = {}; return r; };
})();
