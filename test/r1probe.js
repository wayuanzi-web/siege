// node test/r1probe.js <關卡 1-12> [場數=40]：我方不還手、敵軍打完第一輪，看我方的機關被動了什麼。
// 開場護符只護兵、不護機關（雙方一樣），所以這裡列出來的是「第一輪就打得到的機關」，拿來和 test/first.js（兵不會倒）一起看開場公不公平
// Player does nothing; enemy fires its round-1 volley. At the start of round 2, report what happened to the PLAYER's mechanisms.
const G = require('./load')('PH');
const { S, simInit, simStep, simFire, LEVELS, MID } = G;
const li = +process.argv[2] - 1, N = +(process.argv[3] || 40);
const agg = {}; const add = (k) => { agg[k] = (agg[k] || 0) + 1; };
let hpLost = 0, deaths = 0;
for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, 52000 + sd * 7919 + li * 131, 1, { mute: 0 }); S.team[0].ai = null;
  const evs = new Set();
  S.on = (t, a, b, c, d, e, f) => {
    if (t === 'snap' && d === 0) evs.add('snap:' + e);                        // ropeCut / pin snap (c=kind, d=side, e=tag)
    if (t === 'tpop' && c === 0) evs.add('tpop');
    if (t === 'leak' && c === 0) evs.add('leak');
    if (t === 'fuse' && c === 0) evs.add('fuse');
    if (t === 'roll' && c === 0) evs.add('roll->player');
    if (t === 'reso' && c === 1) evs.add('reso(by enemy)');
    if (t === 'tilt') evs.add('tilt');
    if (t === 'liftbreak' && c === 0) evs.add('liftbreak');
    if (t === 'magboom' && c === 0) evs.add('magboom');
    if (t === 'brake' && c === 0) evs.add('brake');
    if (t === 'bellring' && c === 1) evs.add('bellring(by enemy)');
  };
  const hp0 = S.team[0].units.reduce((a, u) => a + u.hp, 0);
  const cut0 = new Set(S.ropes.filter((r) => r.side === 0 && r.cut));
  let guard = 0;
  while (S.state === 'play' && S.round <= 1 && guard++ < 60 * 60) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
  // state at the start of round 2
  for (const r of S.ropes) if (r.side === 0 && r.cut && !cut0.has(r)) { evs.add('ropeCut:' + r.tag + (r.hp > 0 || r.cutT < 0 ? '' : '')); }
  for (const o of S.pins) if (o.st.side === 0 && o.broke) evs.add('pinBroke');
  for (const o of S.pivots) if (o.st.side === 0 && Math.abs(o.ang) > 0.05) evs.add('pivot>3deg');
  if (S.lv.snow) { let n = 0; for (const b of S.st[0].blocks) if (!b.dead && b.snow && !b.inPlace) n++; let dn = 0; for (const b of S.st[0].blocks) if (b.dead && b.snow) dn++; if (n + dn >= 3) evs.add('snowFell(' + (n + dn >= 8 ? '8+' : '3-7') + ')'); }
  if (S.bell) { const p = S.bell.b.body.getPosition(); if (p.x < MID - 3) evs.add('bellMovedToPlayer'); }
  for (const q of S.structs) if (q.side === 2 && !q.loose) for (const b of q.blocks) if (b.dom && (b.dead || !b.inPlace) && b.x0 < MID) { evs.add('steleDown(left row)'); break; }
  const P = S.st[0].plat; if (P && P.comps) for (const c of P.comps) if (c.hp < c.hm) evs.add('hullHurt'); if (P && P.teth.length) for (const o of P.teth) if (o.hp < o.hm) evs.add('tetherHurt');
  if (P && P.lifts) for (const o of P.lifts) if (o.hp < o.hm) evs.add('liftHurt');
  for (const b of S.st[0].blocks) { if (!(b.mat === 7 || b.rod || b.tslab || b.heart || b.brake || b.core)) continue; if (b.dead || !b.inPlace || b.hp < b.hm) evs.add((b.mat === 7 ? 'keg' : b.rod ? 'rod' : b.tslab ? 'tslab' : b.heart ? 'heart' : b.brake ? 'brake' : 'core') + (b.dead ? 'Dead' : !b.inPlace ? 'Moved' : 'Hurt')); }
  if (S.st[0].pulley && S.st[0].pulley.mode !== 'lock') evs.add('pulleyFree');
  const hp1 = S.team[0].units.reduce((a, u) => a + (u.alive ? u.hp : 0), 0);
  hpLost += hp0 - hp1; deaths += S.team[0].units.length - S.team[0].alive;
  for (const k of evs) add(k);
}
console.log(`L${li + 1} ${LEVELS[li].name}: ${N} games, player deaths ${deaths}, avg unit HP lost ${(hpLost / N).toFixed(1)} | ` + (Object.keys(agg).sort().map((k) => `${k} x${agg[k]}`).join(', ') || 'no mechanism events'));
