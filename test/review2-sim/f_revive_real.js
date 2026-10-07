// node test/review2-sim/f_revive_real.js [場數=40] [bot=casual]
// F：真的對局裡，天燈「援軍」復活的兵有幾個其實原本的房間還好好的（地板在、位置是空的），卻被放到城頂上？之後活了幾回合？
const { load, H } = require('./lib');
const G = load({ patch: [["      mkUnitBody(u); u.body.setAwake(true);\n      T.alive++; ev('revive', u.x, u.y, side, u.slot);", "      if (S.onRevive) S.onRevive(u, blocked, top);\n      mkUnitBody(u); u.body.setAwake(true);\n      T.alive++; ev('revive', u.x, u.y, side, u.slot);"]] });
const { S, PH, simInit, simStep, BOTS, LEVELS } = G;
const N = +(process.argv[2] || 40), bot = process.argv[3] || 'casual';
const tot = [{ n: 0, roomOk: 0, roomOkMoved: 0, life: [], lifeHome: [], lifeTop: [] }, { n: 0, roomOk: 0, roomOkMoved: 0, life: [], lifeHome: [], lifeTop: [] }];
for (let li = 0; li < 6; li++) for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, H.seed(9000, sd, li), 1, { botA: BOTS[bot] });
  const live = new Map();
  S.onRevive = (u, blocked, top) => {
    // 原本的房間還能站嗎：位置沒被磚佔住，而且腳下 0.8 以內有東西
    let floor = -999; PH.world.rayCast({ x: u.hx, y: u.hy + 1.5 }, { x: u.hx, y: u.hy - 0.8 }, (f, pt, n, fr) => { const o = f.getUserData(); if (o && !o.isBlock) return -1; floor = pt.y; return fr; });
    const roomOk = !blocked && floor > u.hy - 0.6;
    const t = tot[u.side]; t.n++; if (roomOk) { t.roomOk++; if (Math.abs(u.y - u.hy) > 0.6) t.roomOkMoved++; }
    live.set(u, { r: S.round, top: Math.abs(u.y - u.hy) > 0.6, roomOk });
  };
  S.on = (t, x, y, c, d, e, f) => { if (t !== 'udie') return; const u = S.units.find((k) => k.side === c && k.slot === f), L = live.get(u); if (!L || S.state !== 'play') return; live.delete(u); const tt = tot[c]; tt.life.push(S.round - L.r); (L.top ? tt.lifeTop : tt.lifeHome).push(S.round - L.r); };
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  S.onRevive = null; S.on = null;
}
for (const s of [0, 1]) { const t = tot[s]; const avg = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
  console.log(`${s ? 'enemy' : 'my'} units revived by a lantern (${6 * N} ${bot} games): ${t.n}; own room was still usable (spot free, floor present) in ${t.roomOk}; of those, put on top of the castle anyway: ${t.roomOkMoved}.  Died again later in ${t.life.length}: after ${avg(t.life)} rounds on average (${t.life.filter((x) => x <= 1).length} within one round)`); }
