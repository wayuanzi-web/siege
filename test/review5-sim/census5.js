// node test/review5-sim/census5.js <每關每種自動玩家幾場=4> [第幾份=0] [共幾份=1] [關卡=1,2,3,4,5,6] [bots=newbie,casual,expert] [難度=1]
// 第五輪普查：自動玩家照常對打（不加料），一路量這一輪改動可能弄壞的東西：
//   兵疊在一起、推開的力道把人推下樓／推出城、邊緣規則（開場就滑下去？來回抖？把人推死？）、壓扁（頭上沒東西卻被壓死？睡著之後數字卡住？）、
//   屋瓦砸頭就碎（兵往上跳撞到的也算？）、回合等到上限的比例、瞄準階段有沒有人掉血、分出勝負之後贏的那一邊有沒有人受傷／陣亡、結算數字有沒有變、碎塊數量
// 環境變數：CHK=0 不跑每一步的內部一致性檢查；SIEGE_SRC=<舊版 parts 目錄> 拿舊版來比（掛不上的探針自動略過）
const L3 = require('../review3-sim/lib'); const L = require('./lib5');
const H = {}; const G = L.load('flyersBusy', H);
const { S, SH, PH, simInit, simStep, LEVELS, BOTS, CRUSH_LOAD, GRAV, CS, FRAG_MAX, VIEW_W, GUT } = G;
const N = +(process.argv[2] || 4), shard = +(process.argv[3] || 0), nsh = +(process.argv[4] || 1);
const LV = (process.argv[5] || '1,2,3,4,5,6').split(',').map((x) => +x - 1), BN = (process.argv[6] || 'newbie,casual,expert').split(','), diff = +(process.argv[7] === undefined ? 1 : process.argv[7]);
const CHK = process.env.CHK !== '0';
const chk = L3.mkCheck(G);
const CL = CRUSH_LOAD === undefined ? 2.2 : CRUSH_LOAD;
const M = {
  games: 0, steps: 0, lv: {},
  aimLoss: {}, aimLossEx: [], deaths: {}, deathPhase: {},
  loadKills: 0, loadKillNoOver: 0, loadKillEx: [],
  edge: { ep: 0, atHome: 0, noBlast: 0, fell: 0, died: {}, diedNoBlast: {}, long: 0, ex: [], exHome: [] }, osc: { n: 0, max: 0, ex: [] },
  sep: { ep: 0, noBlast: 0, fell: 0, died: {}, diedNoBlast: {}, long: 0, withBoss: 0, ex: [] },
  ovl: { turns: 0, pairs: 0, same: 0, gaveUp: 0, cross: 0, persistMax: 0, ex: [] },
  roof: { n: 0, inPlace: 0, unitUp: 0, boss: 0, own: 0, afterRevive: 0, wide: 0, byPhase: {}, ex: [], exUp: [] },
  caps: {}, capWhy: {}, capEx: [],
  revive: { n: 0, crowded: 0, staleEdge: 0, ex: [] }, diedWithEdge: 0,
  post: { games: 0, lostChanged: 0, statChanged: 0, winnerHurtGames: 0, winnerHurt: {}, winnerKilled: 0, endBarChanged: 0, maxFrag: 0, maxBodies: 0, maxStepMs: 0, sumStepMs: 0, nStep: 0, playMaxMs: 0, playSumMs: 0, playN: 0, ex: [] },
  aimKills: { n: 0, late: 0, ex: [] }, buried: { n: 0, ex: [] }, asleepLoad: { steps: 0, units: 0, noOver: 0, ex: [] }, loadAtAim: 0, exc: []
};
let cur = '', pending = [], winner = -1, snap = null, pairRun = new Map();
const R5 = (u) => u._r5 || (u._r5 = { blastT: -99, hurtT: -99, hurtCtx: '', edgeT: -99, sepT: -99, reviveT: -99, deathCtx: '', deathT: -1, flipKey: '', flips: 0, asl: false });
const where = () => `${cur} t=${S.time.toFixed(1)} r${S.round} ${S.phase}/${S.turn}`;
const ud = (u) => `side${u.side} ${u.type}#${u.slot}@(${u.x.toFixed(1)},${u.y.toFixed(1)})`;
const inc = (o, k, v) => { o[k] = (o[k] || 0) + (v === undefined ? 1 : v); };
H.boom = (x, y, w) => { const r = (w.r || 0) + 5; for (const u of S.units) if (u.alive && Math.abs(u.x - x) < r && Math.abs(u.y + 1.5 - y) < r) R5(u).blastT = S.time; };
H.hurt = (u, d, side, kind, ctx) => {
  const r = R5(u); r.hurtT = S.time; r.hurtCtx = ctx;
  if (S.state === 'play' && (S.phase === 'aim' || S.phase === 'intro')) { inc(M.aimLoss, ctx, Math.min(d, u.hp)); if (M.aimLossEx.length < 12 && !r.aimEx) { r.aimEx = 1; M.aimLossEx.push(`${where()} ${ud(u)} loses hp to ${ctx} (${d.toFixed(1)}) phaseT=${S.phaseT.toFixed(2)} load=${(u.load || 0).toFixed(2)} awake=${u.body.isAwake()}`); } }
  if (S.state !== 'play' && u.side === winner) inc(M.post.winnerHurt, ctx, Math.min(d, u.hp));
};
H.kill = (u, side, how, ctx) => {
  const r = R5(u); r.deathCtx = ctx; r.deathT = S.time;
  if (u.edge && u.edgeT < 1.5) M.diedWithEdge++;
  if (S.state !== 'play') { if (u.side === winner) { M.post.winnerKilled++; if (M.post.ex.length < 12) M.post.ex.push(`${where()} WINNER's ${ud(u)} killed after the decision by ${ctx} (endT=${S.endT.toFixed(2)})`); } return; }
  inc(M.deaths, ctx); inc(M.deathPhase, S.phase + ':' + ctx);
  if (S.phase === 'aim' || S.phase === 'intro') { M.aimKills.n++; if (S.phaseT > 0.25) M.aimKills.late++; if (M.aimKills.ex.length < 10) M.aimKills.ex.push(`${where()} ${ud(u)} killed by ${ctx} ${S.phaseT.toFixed(2)}s into the aim phase (outT=${u.outT.toFixed(2)}, last hurt ${r.hurtCtx} ${(S.time - r.hurtT).toFixed(1)}s ago, edge push ${(S.time - r.edgeT).toFixed(1)}s ago, sep push ${(S.time - r.sepT).toFixed(1)}s ago)`); }
  if (ctx === 'load') {
    M.loadKills++;
    const ov = L.over(G, u).filter((b) => !b.frag || b.mass > 2);
    if (!ov.length) { M.loadKillNoOver++; if (M.loadKillEx.length < 10) { let cs = []; for (let ce = u.body.getContactList(); ce; ce = ce.next) { const o = ce.other.getUserData(); if (ce.contact.isTouching()) cs.push(o ? (o.isUnit ? 'unit' : L.bdesc(o)) : 'ground'); } M.loadKillEx.push(`${where()} ${ud(u)} crushed with nothing above: load=${u.load.toFixed(2)} awake=${u.body.isAwake()} touching [${cs.join(' ')}]`); } }
  }
};
function epi(u, kind, other) {
  const r = R5(u); let e = r[kind];
  if (!e || S.time - e.last > 0.3) {
    e = r[kind] = { kind, u, t0: S.time, last: S.time, dur: 0, x0: u.x, y0: u.y, where: where(), home: Math.hypot(u.x - u.hx, u.y - u.hy), blastAgo: S.time - r.blastT, other: other ? ud(other) : '', who: ud(u), vol: S.vol };
    pending.push(e); M[kind].ep++;
    if (e.home < 0.4) { if (kind === 'edge') { M.edge.atHome++; } }
    if (e.blastAgo > 5) M[kind].noBlast++;
  }
  e.last = S.time; e.dur += 1 / 60;
}
function settle(force) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const e = pending[i]; if (!force && S.time < e.last + 2.0) continue;
    pending.splice(i, 1);
    const u = e.u, r = R5(u), m = M[e.kind], died = !u.alive && r.deathT >= e.t0 && r.deathT <= e.last + 2.0 && r.deathCtx !== 'fin';
    const dx = u.alive ? u.x - e.x0 : 0, dy = u.alive ? u.y - e.y0 : 0;
    if (e.dur > 1.2) m.long++;
    if (died) { inc(m.died, r.deathCtx); if (e.blastAgo > 5) inc(m.diedNoBlast, r.deathCtx); }
    else if (dy < -1.5) m.fell++;
    const txt = `${e.where} ${e.who}${e.other ? ' vs ' + e.other : ''}: pushed ${e.dur.toFixed(2)}s, started ${e.home.toFixed(1)} from home, last blast nearby ${e.blastAgo > 50 ? 'never' : e.blastAgo.toFixed(1) + 's ago'} -> ${died ? 'DIED (' + r.deathCtx + ') ' + (r.deathT - e.last).toFixed(1) + 's later' : `moved (${dx.toFixed(1)},${dy.toFixed(1)})`}`;
    if ((died || dy < -1.5) && m.ex.length < 8) m.ex.push(txt); if ((died || dy < -1.5) && e.blastAgo > 5) { if (!m.exNB) m.exNB = []; if (m.exNB.length < 12) m.exNB.push(txt); }
    if (e.kind === 'edge' && e.home < 0.4 && M.edge.exHome.length < 10) M.edge.exHome.push(txt);
  }
}
H.edge = (u) => { R5(u).edgeT = S.time; epi(u, 'edge'); };
H.edgeSet = (u, e) => { const r = R5(u), k = S.vol + S.phase; if (r.flipKey !== k) { r.flipKey = k; r.flips = 0; } r.flips++; if (r.flips > M.osc.max) M.osc.max = r.flips; if (r.flips === 8) { M.osc.n++; if (M.osc.ex.length < 8) M.osc.ex.push(`${where()} ${ud(u)} edge state changed 8 times in one phase`); } };
H.sepPush = (a, b) => { if (a.def.big || b.def.big) M.sep.withBoss++; if (!a.def.big) { R5(a).sepT = S.time; epi(a, 'sep', b); } if (!b.def.big) { R5(b).sepT = S.time; epi(b, 'sep', a); } };
H.roof = (u, roof, r, k) => {
  const m = M.roof; m.n++; const up = u.vy > 2, rv = roof.body.getLinearVelocity();
  if (roof.inPlace) m.inPlace++; if (up) m.unitUp++; if (u.def.big) m.boss++; if (roof.side === u.side) m.own++; if (S.time - R5(u).reviveT < 2) m.afterRevive++; if (roof.cw >= 5) m.wide++;
  inc(m.byPhase, S.phase + '/' + S.turn + (roof.side === S.turn ? ' own-roof' : ' foe-roof'));
  const txt = `${where()} ${ud(u)} vy(before)=${u.vy.toFixed(1)} roof ${roof.cw}w side${roof.side} inPlace=${roof.inPlace} roofV=(${rv.x.toFixed(1)},${rv.y.toFixed(1)}) vn=${r.vn.toFixed(1)} ny=${(k ? -r.ny : r.ny).toFixed(2)} J=${r.J.toFixed(0)}`;
  if (m.ex.length < 8) m.ex.push(txt); if ((up || roof.inPlace) && m.exUp.length < 14) m.exUp.push(txt);
};
H.turnEnd = (quiet, phaseT) => {
  const c = M.caps[S.phase] || (M.caps[S.phase] = [0, 0, 0]); c[quiet ? 0 : 1]++; c[2] += phaseT;
  if (quiet) return;
  let why = '';
  if (SH.n > 0) why = 'shots in flight'; else if (S.pend.length) why = 'pending explosions'; else if (G.flyersBusy && G.flyersBusy()) why = 'flyers';
  if (!why) for (const u of S.units) if (u.alive && !u.def.big && u.loadT > 0 && u.load > CL) why = 'unit being crushed';
  if (!why) {
    let first = null, fs2 = 0;
    for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
      if (!b.isDynamic() || !b.isAwake()) continue; const p = b.getPosition(); if (p.x < -GUT - 2 || p.x > VIEW_W + GUT + 2 || p.y < -10) continue;
      const v = b.getLinearVelocity(), s2 = v.x * v.x + v.y * v.y, om = Math.abs(b.getAngularVelocity()), o = b.getUserData();
      const hard = o && (o.isUnit || (o.isBlock && !o.frag && !o.prop && !o.st.loose));
      if (s2 > 3.2 || om > 0.7 || (hard && (s2 > 0.5 || om > 0.16))) { if (!first || s2 > fs2) { first = o; fs2 = s2; } }
    }
    if (first) why = first.isUnit ? 'unit moving' + (first.edge && first.edgeT < 1.5 ? ' (edge push)' : first.sepNow && first.sepT <= 2.4 ? ' (separation push)' : first.air ? ' (airborne)' : '') : first.frag ? 'fragment moving fast' : first.prop ? 'prop moving fast' : first.st.loose ? 'rock moving fast' : 'block moving (' + (first.inPlace ? 'in place' : 'displaced') + ')';
    else why = 'quiet now but not for 0.5 s';
  }
  inc(M.capWhy, S.phase + ': ' + why); if (M.capEx.length < 10 && /unit/.test(why)) M.capEx.push(`${where()} cap after ${phaseT.toFixed(1)}s: ${why}`);
};
function onEv(t, a, b, c, d) {
  if (t === 'revive') {
    let u = null; for (const k of S.team[c].units) if (k.slot === d) u = k; if (!u) return;
    const r = R5(u); r.reviveT = S.time; M.revive.n++;
    let crowd = false; for (const k of S.units) if (k !== u && k.alive) { const [ox, oy] = L.overlap(u, k); if (ox > 0 && oy > 0) crowd = true; }
    if (crowd) { M.revive.crowded++; if (M.revive.ex.length < 8) M.revive.ex.push(`${where()} ${ud(u)} revived overlapping another unit`); }
    if (u.edge && u.edgeT < 1.5) { M.revive.staleEdge++; if (M.revive.ex.length < 8) M.revive.ex.push(`${where()} ${ud(u)} revived with stale edge=${u.edge} edgeT=${u.edgeT.toFixed(2)}`); }
  } else if (t === 'turn') {
    M.ovl.turns++; const us = S.units, seen = new Set();
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const p = us[i], q = us[j]; if (!p.alive || !q.alive) continue; const [ox, oy] = L.overlap(p, q); if (ox <= 0 || oy <= 0) continue;
      M.ovl.pairs++; const key = i + ':' + j; seen.add(key); const run = (pairRun.get(key) || 0) + 1; pairRun.set(key, run); if (run > M.ovl.persistMax) M.ovl.persistMax = run;
      const same = Math.abs(p.x - q.x) < 0.6 && Math.abs(p.y - q.y) < 0.6; if (same) M.ovl.same++; const tw = (p.bw + q.bw) / 2 - Math.abs(p.x - q.x), deep = tw >= 1.1 && Math.abs(p.y - q.y) < 1.5; if (deep) { M.ovl.deep = (M.ovl.deep || 0) + 1; if (run === 1) { M.ovl.deepPairs = (M.ovl.deepPairs || 0) + 1; if (!M.ovl.exDeep) M.ovl.exDeep = []; if (M.ovl.exDeep.length < 12) M.ovl.exDeep.push(`${where()} ${ud(p)} & ${ud(q)} bodies overlap ${tw.toFixed(2)} wide: dx=${(q.x - p.x).toFixed(2)} dy=${(q.y - p.y).toFixed(2)} sepT=${p.sepT.toFixed(1)}/${q.sepT.toFixed(1)}`); } } if (p.sepT > 2.4 || q.sepT > 2.4) M.ovl.gaveUp++; if (p.side !== q.side) M.ovl.cross++;
      if (run === 1 && M.ovl.ex.length < 14) M.ovl.ex.push(`${where()} ${ud(p)} & ${ud(q)} overlapped at the start of a turn: dx=${(q.x - p.x).toFixed(2)} dy=${(q.y - p.y).toFixed(2)} sepT=${p.sepT.toFixed(1)}/${q.sepT.toFixed(1)} awake=${p.body.isAwake()}/${q.body.isAwake()}`);
    }
    for (const k of Array.from(pairRun.keys())) if (!seen.has(k)) pairRun.delete(k);
    for (const u of us) {
      if (!u.alive || u.def.big) continue;
      if (u.load > CL) M.loadAtAim++;
      // 頭上直接壓著多重的磚（只算碰到他、而且在他上面的那幾塊）
      let top = 0, who = []; const seenB = new Set();
      for (let ce = u.body.getContactList(); ce; ce = ce.next) {
        const cc = ce.contact; if (!cc.isTouching()) continue; const o = ce.other.getUserData(); if (!o || !o.isBlock || seenB.has(o)) continue;
        const wm = cc.getWorldManifold(null); if (!wm) continue; const ny = cc.getFixtureA().getBody() === u.body ? wm.normal.y : -wm.normal.y;
        if (ny > 0.35) { seenB.add(o); top += o.mass; who.push(L.bdesc(o) + `[ny=${ny.toFixed(2)}]`); }
      }
      if (top > CL * u.mass * 1.3 && u.load <= CL) { M.buried.n++; if (M.buried.ex.length < 12) M.buried.ex.push(`${where()} ${ud(u)} hp ${u.hp.toFixed(0)}: ${top.toFixed(0)} kg (${(top / u.mass).toFixed(1)}x his weight) of blocks touching him from above but load=${u.load.toFixed(2)} awake=${u.body.isAwake()}: ${who.join(' ')}`); }
    }
  } else if (t === 'end') {
    winner = 1 - c;
    snap = { stat: JSON.stringify(S.stat), bar: [S.endBar[0], S.endBar[1]], lost: S.stat.lost, hp: S.team[winner].units.map((u) => (u.alive ? u.hp : 0)), alive: S.team[winner].alive, t: S.time, phase: S.phase, shots: [SH.cnt[0], SH.cnt[1], SH.cnt[2]] };
  }
}
function perStep(tag) {
  M.steps++;
  if (CHK) chk.step(tag);
  for (const u of S.units) {
    if (!u.alive || u.def.big) continue; const r = R5(u);
    if (u.load > CL && !u.body.isAwake()) { M.asleepLoad.steps++; if (!r.asl) { r.asl = true; M.asleepLoad.units++; const ov = L.over(G, u); if (!ov.length) { M.asleepLoad.noOver++; if (M.asleepLoad.ex.length < 8) M.asleepLoad.ex.push(`${where()} ${ud(u)} asleep with load=${u.load.toFixed(2)} and nothing overhead`); } } } else r.asl = false;
  }
  if ((S.frame & 15) === 0) settle(false);
}
const t00 = Date.now(); let g = 0; const slow = [];
for (const li of LV) for (const bot of BN) for (let sd = 0; sd < N; sd++) {
  if (g++ % nsh !== shard) continue;
  const seed = +(process.env.SEED0 || 510000) + sd * 7919 + li * 131 + bot.length * 17;
  cur = `L${li + 1} ${bot} seed${seed}`; pending = []; winner = -1; snap = null; pairRun = new Map();
  const R = M.lv[li] || (M.lv[li] = { games: 0, won: 0, rounds: 0, maxR: 0, unfinished: 0, firstVolleyLoss: 0, byBot: {} });
  try {
    simInit(li, {}, seed, diff, { botA: BOTS[bot] }); S.on = onEv; M.games++; chk.reset();
    let lossR1 = false; const lost0 = () => S.stat.lost;
    while (S.state === 'play' && S.round < 45) {
      const shN = SH.n, t0 = process.hrtime.bigint(); simStep(1 / 60); const ms = Number(process.hrtime.bigint() - t0) / 1e6; M.post.playSumMs += ms; M.post.playN++; if (ms > M.post.playMaxMs) M.post.playMaxMs = ms;
      if (ms > 40) { let nb = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) nb++; let ct = 0; for (let c = PH.world.getContactList(); c; c = c.getNext()) ct++; slow.push(`${ms.toFixed(0)}ms ${where()} f=${S.frame} shots before/after ${shN}/${SH.n} bodies ${nb} contacts ${ct} frags ${S.nfrag} pend ${S.pend.length}`); }
      perStep(cur);
      if (!lossR1 && S.round === 1 && lost0() > 0) lossR1 = true;
    }
    R.games++; R.rounds += S.round; if (S.round > R.maxR) R.maxR = S.round; if (S.state === 'won') R.won++; if (S.state === 'play') R.unfinished++; if (lossR1) R.firstVolleyLoss++;
    const bb = R.byBot[bot] || (R.byBot[bot] = [0, 0]); bb[1]++; if (S.state === 'won') bb[0]++;
    if (S.state !== 'play' && snap) {
      M.post.games++; let hurtBefore = JSON.stringify(M.post.winnerHurt);
      for (let i = 0; i < 300; i++) {
        const t0 = process.hrtime.bigint(); simStep(1 / 60); const ms = Number(process.hrtime.bigint() - t0) / 1e6; M.post.sumStepMs += ms; M.post.nStep++; if (ms > M.post.maxStepMs) M.post.maxStepMs = ms;
        perStep(cur);
        if (S.nfrag > M.post.maxFrag) M.post.maxFrag = S.nfrag;
        if ((i & 7) === 0) { let n = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) n++; if (n > M.post.maxBodies) M.post.maxBodies = n; }
      }
      if (JSON.stringify(M.post.winnerHurt) !== hurtBefore) M.post.winnerHurtGames++;
      if (S.stat.lost !== snap.lost) { M.post.lostChanged++; if (M.post.ex.length < 12) M.post.ex.push(`${cur}: S.stat.lost ${snap.lost} -> ${S.stat.lost} after the decision (decided at t=${snap.t.toFixed(1)}, shots in flight then: mine ${snap.shots[0]}, foe ${snap.shots[1]}, neutral ${snap.shots[2]})`); }
      if (JSON.stringify(S.stat) !== snap.stat) M.post.statChanged++;
      if (S.endBar[0] !== snap.bar[0] || S.endBar[1] !== snap.bar[1]) M.post.endBarChanged++;
    }
    settle(true);
  } catch (e) { M.exc.push(`${cur} t=${S.time.toFixed(2)} r${S.round} ${S.phase} state=${S.state}: ${e.stack.split('\n').slice(0, 5).join(' | ')}`); }
}
const secs = ((Date.now() - t00) / 1000).toFixed(0), J = JSON.stringify;
console.log(`== census5 shard ${shard}/${nsh}: ${M.games} games, ${M.steps} steps, ${secs}s, diff ${diff}${G.__missing.length ? '; probes not attached: ' + G.__missing.length : ''}`);
for (const li of Object.keys(M.lv)) { const r = M.lv[li]; console.log(`  L${+li + 1}: won ${r.won}/${r.games} (${Object.keys(r.byBot).map((b) => b + ' ' + r.byBot[b][0] + '/' + r.byBot[b][1]).join(', ')}), mean ${(r.rounds / r.games).toFixed(1)} rounds, max ${r.maxR}, unfinished@45 ${r.unfinished}, games with a player unit lost in round 1: ${r.firstVolleyLoss}`); }
console.log(`exceptions: ${M.exc.length}`); for (const e of M.exc.slice(0, 6)) console.log('   ' + e);
if (CHK) { if (chk.fails.size) { console.log(`invariant failures (${chk.fails.size} kinds):`); console.log(L3.report(chk.fails)); } else console.log('invariants: no failures'); console.log(`   longest phase ${chk.stats.maxPhase.toFixed(1)}s at ${chk.stats.maxPhaseAt}; max fragments ${chk.stats.maxFrag}, max bodies ${chk.stats.maxBodies}`); }
console.log(`hp lost during AIM/INTRO phases by source: ${J(M.aimLoss, (k, v) => (typeof v === 'number' ? +v.toFixed(0) : v))}`); for (const e of M.aimLossEx) console.log('   ' + e);
console.log(`deaths during play by final blow: ${J(M.deaths)}`); console.log(`   by phase: ${J(M.deathPhase)}`);
console.log(`kills during AIM/INTRO: ${M.aimKills.n} (${M.aimKills.late} later than 0.25 s into the phase)`); for (const e of M.aimKills.ex) console.log('   ' + e);
console.log(`crush kills ${M.loadKills}; with no block overhead at the moment of death: ${M.loadKillNoOver}`); for (const e of M.loadKillEx) console.log('   ' + e);
console.log(`load > threshold while ASLEEP: ${M.asleepLoad.steps} steps, ${M.asleepLoad.units} episodes, ${M.asleepLoad.noOver} with nothing overhead; units with load > threshold at the start of a turn: ${M.loadAtAim}`); for (const e of M.asleepLoad.ex) console.log('   ' + e);
console.log(`heavy blocks touching a unit from above (> ${(CL * 1.3).toFixed(1)}x his weight) at the start of a turn but load under the threshold: ${M.buried.n}`); for (const e of M.buried.ex) console.log('   ' + e);
console.log(`EDGE rule: ${M.edge.ep} push episodes (${M.edge.atHome} began at the unit's home spot, ${M.edge.noBlast} with no explosion near in the previous 5 s, ${M.edge.long} lasted > 1.2 s); then fell > 1.5: ${M.edge.fell}; died within 2 s: ${J(M.edge.died)} (no recent blast: ${J(M.edge.diedNoBlast)})`);
for (const e of M.edge.exHome) console.log('   home: ' + e); for (const e of (M.edge.exNB || [])) console.log('   no-blast: ' + e); for (const e of M.edge.ex) console.log('   ' + e);
console.log(`   edge state flips per unit per phase: max ${M.osc.max}; units with >= 8 flips in one phase: ${M.osc.n}`); for (const e of M.osc.ex) console.log('   ' + e);
console.log(`SEPARATION: ${M.sep.ep} push episodes (${M.sep.withBoss} push-steps involving the boss, ${M.sep.noBlast} with no explosion near in the previous 5 s, ${M.sep.long} lasted > 1.2 s); then fell > 1.5: ${M.sep.fell}; died within 2 s: ${J(M.sep.died)} (no recent blast: ${J(M.sep.diedNoBlast)})`); for (const e of (M.sep.exNB || [])) console.log('   no-blast: ' + e); for (const e of M.sep.ex) console.log('   ' + e);
console.log(`OVERLAP at the start of a turn: ${M.ovl.pairs} unit pairs over ${M.ovl.turns} turn starts (${M.ovl.same} within 0.6 of the same spot, ${M.ovl.gaveUp} after separation gave up, ${M.ovl.cross} cross-team); longest run of consecutive turn starts for one pair: ${M.ovl.persistMax}`); console.log(`   DEEP (bodies overlap by half a body width or more, same height): ${M.ovl.deep || 0} pair-turns, ${M.ovl.deepPairs || 0} distinct episodes`); for (const e of (M.ovl.exDeep || [])) console.log('   deep: ' + e); for (const e of M.ovl.ex.slice(0, 6)) console.log('   ' + e);
console.log(`ROOF-on-head rule fired ${M.roof.n} times: roof still in place ${M.roof.inPlace}, unit was moving UP (vy > 2) ${M.roof.unitUp}, on the boss ${M.roof.boss}, unit's own castle roof ${M.roof.own}, within 2 s of a revive ${M.roof.afterRevive}, 5-wide roofs ${M.roof.wide}; by phase ${J(M.roof.byPhase)}`); for (const e of M.roof.exUp) console.log('   up/inPlace: ' + e); for (const e of M.roof.ex.slice(0, 4)) console.log('   ' + e);
console.log(`turn ends [settled, hit the cap, sum phaseT]: ${J(M.caps, (k, v) => (typeof v === 'number' ? +v.toFixed(0) : v))}`); console.log(`   cap reasons: ${J(M.capWhy)}`); for (const e of M.capEx) console.log('   ' + e);
console.log(`revives ${M.revive.n}: overlapping another unit ${M.revive.crowded}, with stale edge push pending ${M.revive.staleEdge}; units that died with an edge push active: ${M.diedWithEdge}`); for (const e of M.revive.ex) console.log('   ' + e);
console.log(`AFTER THE DECISION (${M.post.games} finished games, 5 s each): S.stat.lost changed in ${M.post.lostChanged}, any S.stat field changed in ${M.post.statChanged}, S.endBar changed in ${M.post.endBarChanged}; winner's units hurt in ${M.post.winnerHurtGames} games ${J(M.post.winnerHurt, (k, v) => (typeof v === 'number' ? +v.toFixed(0) : v))}, killed ${M.post.winnerKilled}; max fragments ${M.post.maxFrag} (cap ${FRAG_MAX}+36), max bodies ${M.post.maxBodies}; sim step ms: finale mean ${(M.post.sumStepMs / Math.max(1, M.post.nStep)).toFixed(3)} max ${M.post.maxStepMs.toFixed(1)}; play mean ${(M.post.playSumMs / Math.max(1, M.post.playN)).toFixed(3)} max ${M.post.playMaxMs.toFixed(1)}`);
for (const e of M.post.ex) console.log('   ' + e);
console.log(`slow steps (> 40 ms) during play: ${slow.length}`); for (const e of slow.slice(0, 40)) console.log('   slow: ' + e);
