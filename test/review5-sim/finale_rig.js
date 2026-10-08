// node test/review5-sim/finale_rig.js [每種情境每關幾個種子=4]
// 城破的演出：在各種不尋常的時機分出勝負，之後再跑 6 秒。每一步都跑內部一致性檢查（第三輪的 mkCheck），另外記：
//   例外、贏的那一邊的兵有沒有再受傷／陣亡、S.stat.lost / S.endBar 有沒有變、碎塊和剛體的數量上限、每一步花多久
const L3 = require('../review3-sim/lib'); const L = require('./lib5');
const NS = +(process.argv[2] || 4);
const H = {}; const G = L.load('', H); const { S, SH, PH, simInit, simStep, BOTS, LEVELS, killUnit, blockKill, blockHurt, simSkill, FRAG_MAX } = G;
const chk = L3.mkCheck(G);
const killSide = (sd) => { for (const u of S.team[sd].units) if (u.alive) killUnit(u, 1 - sd, 0); };
const rocksFalling = () => S.rubble.blocks.some((b) => !b.dead && b.fall);
const SC = [
  { n: 'foe dies at my aim', when: () => S.round >= 2 && S.phase === 'aim' && S.turn === 0, act: () => killSide(1) },
  { n: 'foe dies while MY shots are in flight', when: () => S.round >= 2 && S.turn === 0 && SH.cnt[0] >= 2, act: () => killSide(1) },
  { n: 'foe dies while HIS shots are in flight', when: () => S.round >= 2 && S.turn === 1 && S.phase !== 'aim' && SH.cnt[1] >= 2 && S.phaseT > 0.3, act: () => killSide(1) },
  { n: 'same, with my shield up', pre: () => { if (S.turn === 1 && S.phase === 'aim' && S.round >= 2) { S.team[0].shield.c = S.team[0].shield.need; simSkill(0, 'shield'); } }, when: () => S.round >= 2 && S.turn === 1 && S.phase !== 'aim' && SH.cnt[1] >= 2 && S.phaseT > 0.3 && S.team[0].shield.on, act: () => killSide(1) },
  { n: 'foe dies during rockfall (hazard)', lv: [3, 5], when: () => S.phase === 'hazard' && rocksFalling(), act: () => killSide(1) },
  { n: 'I die during rockfall (hazard)', lv: [3, 5], when: () => S.phase === 'hazard' && rocksFalling(), act: () => killSide(0) },
  { n: 'foe dies with no blocks left', when: () => S.round >= 2 && S.phase === 'aim' && S.turn === 0, act: () => { for (const b of S.st[1].blocks.slice()) if (!b.dead) blockKill(b, 0, 0, true); killSide(1); } },
  { n: 'both sides die in the same step', when: () => S.round >= 2 && S.phase === 'resolve', act: () => { killSide(0); killSide(1); } },
  { n: 'I die at foe aim', when: () => S.round >= 2 && S.phase === 'aim' && S.turn === 1, act: () => killSide(0) },
  { n: 'I die while my own shots are in flight', when: () => S.round >= 2 && S.turn === 0 && SH.cnt[0] >= 2, act: () => killSide(0) },
  { n: 'slab split + death in the same step', when: () => S.round >= 2 && S.phase === 'resolve' && S.st[1].blocks.some((b) => !b.dead && b.seg && b.cw >= 3), act: () => { for (const b of S.st[1].blocks.slice()) if (!b.dead && b.seg && b.cw >= 3) { const p = b.body.getPosition(); blockHurt(b, 9999, 0, 0, p.x, p.y); } killSide(1); } },
  { n: 'boss dies, minions alive', lv: [5], when: () => S.round >= 2 && S.phase === 'resolve' && S.turn === 0, act: () => { killUnit(G.bossUnit(), 0, 0); } },
  { n: 'boss dies while an orb is flying at me', lv: [5], when: () => S.objs.some((o) => o.t === 'orb' && o.st === 'run'), act: () => { killUnit(G.bossUnit(), 0, 0); }, maxT: 200 },
  { n: 'foe dies while his balloon is on its bombing run', lv: [4], when: () => S.objs.some((o) => o.t === 'balloon' && o.side === 1 && o.st === 'run' && o.n > 0), act: () => killSide(1), maxT: 200 }
];
let exc = 0; const rows = [];
for (const sc of SC) {
  const r = { n: sc.n, runs: 0, skipped: 0, exc: 0, winHurt: 0, winHurtSum: 0, winKilled: 0, lostChg: 0, barChg: 0, maxFrag: 0, maxBodies: 0, maxMs: 0, notOver: 0, finLeft: 0, ex: [] };
  for (const li of (sc.lv || [0, 1, 2, 3, 4, 5])) for (let sd = 1; sd <= NS; sd++) {
    const seed = 31000 + sd * 977 + li * 13, tag = `[${sc.n}] L${li + 1} seed${seed}`;
    simInit(li, {}, seed, 1, { botA: BOTS.casual }); chk.reset(); S.on = null; H.hurt = null; H.kill = null;
    try {
      let ok = false; const lim = (sc.maxT || 90) * 60;
      for (let i = 0; i < lim && S.state === 'play'; i++) { if (sc.pre) sc.pre(); if (sc.when()) { ok = true; break; } simStep(1 / 60); }
      if (!ok) { r.skipped++; continue; }
      r.runs++;
      sc.act();
      let win = -1, snap = null, hurt = 0, killed = 0;
      H.hurt = (u, d, side, kind, ctx) => { if (snap && u.side === win) { hurt += Math.min(d, u.hp); if (r.ex.length < 3 && !u._ex) { u._ex = 1; r.ex.push(`${tag} t+${S.endT.toFixed(2)}s: winner's ${u.type}#${u.slot} hurt by ${ctx} (${d.toFixed(0)})`); } } };
      H.kill = (u, side, how, ctx) => { if (snap && u.side === win) { killed++; if (r.ex.length < 6) r.ex.push(`${tag} t+${S.endT.toFixed(2)}s: winner's ${u.type}#${u.slot} KILLED by ${ctx}`); } };
      for (let i = 0; i < 400; i++) {
        const t0 = process.hrtime.bigint(); simStep(1 / 60); const ms = Number(process.hrtime.bigint() - t0) / 1e6; if (ms > r.maxMs) r.maxMs = ms;
        if (!snap && S.state !== 'play') { win = 1 - S.loser; snap = { lost: S.stat.lost, bar: [S.endBar[0], S.endBar[1]] }; }
        chk.step(tag);
        if (S.nfrag > r.maxFrag) r.maxFrag = S.nfrag;
        if ((i & 7) === 0) { let n = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) n++; if (n > r.maxBodies) r.maxBodies = n; }
      }
      if (S.state === 'play') { r.notOver++; continue; }
      if (hurt > 0) { r.winHurt++; r.winHurtSum += hurt; } r.winKilled += killed;
      if (S.stat.lost !== snap.lost) r.lostChg++;
      if (S.endBar[0] !== snap.bar[0] || S.endBar[1] !== snap.bar[1]) r.barChg++;
      if (S.st[S.loser].fin) r.finLeft++;
    } catch (e) { r.exc++; exc++; if (r.ex.length < 6) r.ex.push(`${tag} EXCEPTION t=${S.time.toFixed(2)} ${S.phase}: ${e.stack.split('\n').slice(0, 4).join(' | ')}`); }
  }
  rows.push(r);
}
for (const r of rows) {
  console.log(`${r.n}: ${r.runs} runs (${r.skipped} never reached the state)${r.notOver ? ', NOT decided ' + r.notOver : ''}; exceptions ${r.exc}; winner's units hurt afterwards in ${r.winHurt} runs (${r.winHurtSum.toFixed(0)} hp), killed ${r.winKilled}; S.stat.lost changed ${r.lostChg}, endBar changed ${r.barChg}; max fragments ${r.maxFrag}, bodies ${r.maxBodies}, slowest step ${r.maxMs.toFixed(1)} ms; finale not finished after 6.7 s: ${r.finLeft}`);
  for (const e of r.ex) console.log('     ' + e);
}
console.log(`invariants over ${chk.stats.steps} steps: ${chk.fails.size ? chk.fails.size + ' kinds of failure' : 'no failures'} (fragment cap during the finale is ${FRAG_MAX}+36)`);
if (chk.fails.size) console.log(L3.report(chk.fails));
