// node test/review-play/bosslog.js [bot=casual] [場數=30] [-v] [--botjson='{"guard":0}']
// 魔王關：每一輪我方砲擊到底打掉魔王多少血、沒打到的時候是為什麼。
//   每一輪記：魔王在哪（城裡／城後地上／畫面外／技能按鈕底下）、階段、結界開哪一段、我方瞄的是什麼（魔王／光球／天燈／赤符／火藥桶／其他兵／磚）、
//   這一輪被結界吃掉幾發、被赤符擋掉幾發、被防空射下幾發、打在光球上幾發、魔王這一輪掉多少血（爆炸／砸到／摔出去飛回來）。
const G = require('./lib')();
const { S, SH, HOOK, simInit, simStep, LEVELS, BOTS, bossUnit, teamBar } = G;
const args = process.argv.slice(2).filter((a) => a[0] !== '-');
const opt = {}; for (const a of process.argv.slice(2)) if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); opt[k] = v === undefined ? '1' : v; }
const botName = args[0] || 'casual', N = +(args[1] || 30), verbose = process.argv.includes('-v');
if (opt.botjson) BOTS[botName] = Object.assign({}, BOTS[botName], JSON.parse(opt.botjson));
if (opt.foehp) LEVELS[5].foe.hp = +opt.foehp; if (opt.foedmg) LEVELS[5].foe.dmg = +opt.foedmg;
if (opt.boss) Object.assign(LEVELS[5].boss, JSON.parse(opt.boss));
const where = (u) => { const st = u.st; if (u.x >= 126.5) return 'offscreen'; if (u.x > 116.3 && u.y < 14) return 'under-buttons'; if (u.x > st.x1 + 1.5) return 'behind-castle'; if (u.x < st.x0 - 1.5) return 'front-ground'; return u.y > st.y0 + st.h * 0.55 ? 'castle-top' : u.y > st.y0 + st.h * 0.25 ? 'castle-mid' : 'castle-low'; };
const T = { vol: [0, 0, 0, 0], dmg: [0, 0, 0, 0], zero: [0, 0, 0, 0], byTarget: {}, byWhere: {}, zeroWhy: {}, absorbed: [0, 0, 0, 0], shots: [0, 0, 0, 0], ghit: [0, 0, 0, 0], flak: [0, 0, 0, 0], orbHits: [0, 0, 0, 0], phaseRounds: [0, 0, 0, 0], wins: 0, rounds: 0, back: 0, backDmg: 0, crushDmg: 0, blastDmg: 0, stall: [], p2at: [], p3at: [], endPhase: { W: [0, 0, 0, 0], L: [0, 0, 0, 0] }, myDead: [0, 0, 0, 0], deadWhen: [] };
const add = (o, k, v) => { o[k] = (o[k] || 0) + (v === undefined ? 1 : v); };
for (let sd = 0; sd < N; sd++) {
  simInit(5, {}, 500 + sd * 7919 + 5 * 131, 1, { botA: BOTS[botName] });
  const rows = []; let cur = null, lastHp = 0, stall = 0, maxStall = 0;
  HOOK.hurt = (u, d, side, kind) => { if (u.type !== 'boss' || !cur) return; cur.dmg += d; if (kind === G.K_CRUSH) { if (cur.back) cur.backD += d; else cur.crush += d; } else cur.blast += d; };
  S.on = (t, a, b, c, d, e) => {
    if (t === 'phase') { (a === 2 ? T.p2at : T.p3at).push(S.round); }
    if (!cur) return;
    if (t === 'bar' || t === 'barbreak') cur.absorbed++; else if (t === 'ghit' && S.turn === 0) cur.ghit++; else if (t === 'flak' && e === 1) cur.flak++; else if (t === 'bossback') { cur.back = 1; } else if (t === 'orbdie') cur.orbKill = 1; else if (t === 'gate' && e === 0) cur.gates++;
    else if (t === 'udie' && c === 0) cur.myDead++;
  };
  HOOK.explode = (x, y, w, side, mass, flag, hit) => { if (!cur || side !== 0) return; for (const o of S.objs) if (o.t === 'orb' && Math.hypot(o.x - x, o.y - y) < o.r + 1) cur.orbHits++; };
  let prevKey = '';
  while (S.state === 'play' && S.round < 40) {
    const ph0 = S.phase, t0 = S.turn;
    // 我方開火前一刻：記下瞄的是什麼
    if (ph0 === 'aim' && t0 === 0 && !cur) {
      const bu = bossUnit(), bar = S.objs.find((o) => o.t === 'barrier');
      cur = { r: S.round, phase: S.boss.phase, hp0: bu.hp, where: where(bu), bx: Math.round(bu.x), by: Math.round(bu.y), open: bar ? bar.segs.map((s) => (s.on && s.dead <= 0 ? '#' : s.dead > 0 ? 'x' : '_')).join('') : '', dmg: 0, crush: 0, blast: 0, backD: 0, back: 0, absorbed: 0, ghit: 0, flak: 0, orbHits: 0, gates: 0, myDead: 0, target: '?', alive: S.team[0].alive, orb: S.objs.some((o) => o.t === 'orb'), spawned: 0 };
    }
    const n0 = SH.cnt[0];
    simStep(1 / 60);
    if (cur && ph0 === 'aim' && t0 === 0 && S.phase !== 'aim') {
      const A = S.team[0].ai, b = A.best, bu = bossUnit();
      let tg = 'fallback(no line)';
      if (b && b.t) { const t = b.t; tg = t.obj ? t.obj.t : t.hg ? 'red-gate' : (Math.abs(t.x - bu.x) < 0.6 && Math.abs(t.y - (bu.y + 1.6)) < 0.6) ? 'BOSS' : S.team[1].units.some((u) => u.alive && Math.abs(t.x - u.x) < 0.6 && Math.abs(t.y - (u.y + 1.6)) < 0.6) ? 'minion' : t.w > 1.3 ? 'keg' : 'block'; }
      cur.target = tg; cur.mult = A.mult;
    }
    if (cur && S.turn === 1 && S.phase === 'aim') {
      // 我方這一輪結算完了
      const bu = bossUnit(); cur.hp1 = bu.hp; rows.push(cur);
      const p = cur.phase; T.vol[p]++; T.dmg[p] += cur.dmg; if (cur.dmg < 1) { T.zero[p]++; add(T.zeroWhy, `P${p} ${cur.target} / boss ${cur.where}`); } T.absorbed[p] += cur.absorbed; T.ghit[p] += cur.ghit; T.flak[p] += cur.flak; T.orbHits[p] += cur.orbHits;
      add(T.byTarget, `P${p} ${cur.target}`); T.byTarget[`P${p} ${cur.target} dmg`] = (T.byTarget[`P${p} ${cur.target} dmg`] || 0) + cur.dmg;
      add(T.byWhere, `P${p} ${cur.where}`); T.byWhere[`P${p} ${cur.where} dmg`] = (T.byWhere[`P${p} ${cur.where} dmg`] || 0) + cur.dmg;
      if (cur.back) { T.back++; T.backDmg += cur.backD; } T.crushDmg += cur.crush; T.blastDmg += cur.blast;
      if (cur.dmg < 1) { stall++; if (stall > maxStall) maxStall = stall; } else stall = 0;
      cur = null;
    }
    if (S.state !== 'play' && cur) { const bu = bossUnit(); cur.hp1 = bu ? bu.hp : 0; rows.push(cur); const p = cur.phase; T.vol[p]++; T.dmg[p] += cur.dmg; cur = null; }
  }
  const won = S.state === 'won'; if (won) T.wins++; T.rounds += S.round; T.stall.push(maxStall); T.endPhase[won ? 'W' : 'L'][S.boss.phase]++;
  if (verbose) { console.log(`--- game ${sd}: ${S.state} in ${S.round}`); for (const r of rows) console.log(`  r${String(r.r).padStart(2)} P${r.phase} boss ${Math.round(r.hp0)}→${Math.round(r.hp1)} @${r.bx},${r.by} ${r.where.padEnd(13)} bar[${r.open}] aim:${r.target.padEnd(10)} x${r.mult || 1} gates${r.gates} | absorbed ${r.absorbed} redgate ${r.ghit} flak ${r.flak} orbhits ${r.orbHits}${r.orbKill ? ' ORB-KILLED' : ''} | dmg ${r.dmg.toFixed(0)} (blast ${r.blast.toFixed(0)} crush ${r.crush.toFixed(0)}${r.back ? ' +BACK ' + r.backD.toFixed(0) : ''}) | my alive ${r.alive}${r.myDead ? ' (-' + r.myDead + ')' : ''}`); }
}
const f = (x) => x.toFixed(1);
console.log(`\nL6 [${botName}${opt.botjson ? ' ' + opt.botjson : ''}] hp=${LEVELS[5].foe.hp} dmg=${LEVELS[5].foe.dmg} boss=${JSON.stringify(LEVELS[5].boss)}: wins ${T.wins}/${N}, avg rounds ${f(T.rounds / N)}`);
console.log(`  phase 2 starts at round ${f(T.p2at.reduce((a, b) => a + b, 0) / (T.p2at.length || 1))} (${T.p2at.length}/${N} games), phase 3 at ${f(T.p3at.reduce((a, b) => a + b, 0) / (T.p3at.length || 1))} (${T.p3at.length}/${N}); games ended in phase: won ${T.endPhase.W.slice(1).join('/')} lost ${T.endPhase.L.slice(1).join('/')}`);
for (let p = 1; p <= 3; p++) console.log(`  phase ${p}: my volleys ${T.vol[p]}, boss dmg per volley ${f(T.dmg[p] / (T.vol[p] || 1))} (${f(T.dmg[p] / (T.vol[p] || 1) / 3.61)}% of max), volleys with ZERO boss damage ${T.zero[p]} (${(T.zero[p] / (T.vol[p] || 1) * 100).toFixed(0)}%), per volley: absorbed by barrier ${f(T.absorbed[p] / (T.vol[p] || 1))}, stopped by red gates ${f(T.ghit[p] / (T.vol[p] || 1))}, flak ${f(T.flak[p] / (T.vol[p] || 1))}, explosions on orb ${f(T.orbHits[p] / (T.vol[p] || 1))}`);
console.log(`  boss damage sources: blast ${T.blastDmg.toFixed(0)}, crush/fall ${T.crushDmg.toFixed(0)}, knocked out & flew back ${T.back} times = ${T.backDmg.toFixed(0)} (${(T.backDmg / (T.blastDmg + T.crushDmg + T.backDmg) * 100).toFixed(0)}% of all boss damage)`);
const tk = Object.keys(T.byTarget).filter((k) => !k.endsWith(' dmg')).sort();
console.log('  what the bot aimed at → volleys, avg boss dmg:  ' + tk.map((k) => `${k}: ${T.byTarget[k]} (${f(T.byTarget[k + ' dmg'] / T.byTarget[k])})`).join(' | '));
const wk = Object.keys(T.byWhere).filter((k) => !k.endsWith(' dmg')).sort();
console.log('  where the boss was → volleys, avg boss dmg:  ' + wk.map((k) => `${k}: ${T.byWhere[k]} (${f(T.byWhere[k + ' dmg'] / T.byWhere[k])})`).join(' | '));
console.log('  zero-damage volleys by (target / boss position): ' + Object.entries(T.zeroWhy).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}: ${v}`).join(' | '));
console.log(`  longest run of zero-damage volleys per game: ${T.stall.sort((a, b) => a - b).join(' ')}`);
