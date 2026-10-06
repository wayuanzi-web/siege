// node test/review-play/audit.js <關卡|all> [bot=casual] [場數=12] [強化=0] [難度=1] [--json=檔名] [-v]
// 每一關用自動玩家打 N 場，統計：
//   勝率／回合數／每回合花幾秒（等塵埃落定等了多久、幾次等到 9 秒上限）
//   兵是怎麼倒的（哪一回合、被什麼打倒）、每一回合雙方還剩幾個兵
//   每回合開始（輪到我瞄準、世界應該靜止）時的物理狀態：還醒著的物體、懸空的磚／兵、互相嵌進去的深度
const G = require('./lib')();
const { S, SH, PH, HOOK, simInit, simStep, LEVELS, BOTS, teamBar, structBar, CS, bossUnit } = G;
const args = process.argv.slice(2).filter((a) => a[0] !== '-');
const opt = {}; for (const a of process.argv.slice(2)) if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); opt[k] = v === undefined ? '1' : v; }
const which = args[0] || 'all', botName = args[1] || 'casual', N = +(args[2] || 12), upL = +(args[3] || 0), diff = +(args[4] === undefined ? 1 : args[4]);
const verbose = process.argv.includes('-v');
const up = { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL };
// --botjson='{"guard":0}'：在選定的自動玩家上覆蓋幾個參數（例如不打氣球／光球）
if (opt.botjson) BOTS[botName] = Object.assign({}, BOTS[botName], JSON.parse(opt.botjson));
// --seed0=N：換一批亂數種子
const SEED0 = +(opt.seed0 || 4242);
const lvs = which === 'all' ? LEVELS.map((_, i) => i) : which.split(',').map((x) => +x - 1);
const HOW = ['hit', 'crush', '?', 'burn', 'fell'];
const KIND = ['blast', 'pierce', 'heavy', 'fire', 'ice', 'zap', 'crush', 'dark'];

function restAudit() {
  const out = { awake: 0, awakeList: [], floatB: 0, floatU: 0, floatList: [], deep: 0, deepMax: 0, deepList: [], unitDeep: 0, unitOut: 0, bodies: 0 };
  for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic()) continue;
    out.bodies++;
    const o = b.getUserData(); if (!o) continue;
    const p = b.getPosition(), v = b.getLinearVelocity(), sp = Math.hypot(v.x, v.y);
    if (b.isAwake() && (sp > 0.5 || Math.abs(b.getAngularVelocity()) > 0.3)) { out.awake++; if (out.awakeList.length < 6) out.awakeList.push((o.isBlock ? (o.frag ? 'frag' : o.prop ? 'prop' : 'blk') + ':' + G.MAT[o.mat].k + (o.kind === 'ball' ? '(ball)' : '') : 'unit:' + o.type) + '@' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ' v=' + sp.toFixed(1) + ' w=' + b.getAngularVelocity().toFixed(1)); }
    let touching = 0, minSep = 0, worst = null;
    for (let ce = b.getContactList(); ce; ce = ce.next) {
      const c = ce.contact; if (!c.isTouching()) continue; touching++;
      const wm = c.getWorldManifold(null); if (!wm) continue;
      const n = c.getManifold().pointCount;
      for (let k = 0; k < n; k++) if (wm.separations[k] < minSep) { minSep = wm.separations[k]; worst = ce.other.getUserData(); }
    }
    if (!touching && sp < 1.2) { if (o.isBlock) out.floatB++; else out.floatU++; if (out.floatList.length < 6) out.floatList.push((o.isBlock ? (o.frag ? 'frag' : o.prop ? 'prop' : 'blk') + ':' + G.MAT[o.mat].k : 'unit:' + o.type) + '@' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + (b.isAwake() ? ' awake' : ' asleep')); }
    if (minSep < -0.35) {
      if (o.isBlock) out.deep++; else out.unitDeep++;
      if (out.deepList.length < 6) out.deepList.push((o.isBlock ? (o.frag ? 'frag' : o.prop ? 'prop' : 'blk') + ':' + G.MAT[o.mat].k : 'unit:' + o.type) + '@' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ' sep=' + minSep.toFixed(2) + ' vs ' + (worst ? (worst.isBlock ? G.MAT[worst.mat].k : 'unit') : 'ground'));
    }
    if (-minSep > out.deepMax) out.deepMax = -minSep;
    if (!o.isBlock && o.alive) { const st = o.st; if (o.x < st.x0 - 1.5 || o.x > st.x1 + 1.5) out.unitOut++; }
  }
  return out;
}

const all = {};
for (const li of lvs) {
  const R = { level: li + 1, name: LEVELS[li].name, bot: botName, N, wins: 0, rounds: [], winRounds: [], time: [], games: [],
    deaths: { 0: {}, 1: {} }, deathRound: { 0: {}, 1: {} }, dmg: { 0: {}, 1: {} }, aliveByRound: { 0: [], 1: [] }, barByRound: { 0: [], 1: [] }, cnt: [],
    resolve: { n: 0, sum: 0, cap: 0, max: 0, byTurn: [{ n: 0, sum: 0, cap: 0 }, { n: 0, sum: 0, cap: 0 }, { n: 0, sum: 0, cap: 0 }] },
    rest: { n: 0, awake: 0, awakeN: 0, floatB: 0, floatU: 0, deep: 0, unitDeep: 0, deepMax: 0, unitOut: 0, bodies: 0, bodiesMax: 0, samples: [] },
    endStruct: [], endBy: {}, lastKill: {}, roundTime: [], chains: [], firstBlood: { 0: [], 1: [] } };
  for (let sd = 0; sd < N; sd++) {
    const seed = SEED0 + sd * 7919 + li * 131;
    simInit(li, up, seed, diff, { botA: BOTS[botName] });
    const game = { seed, log: [], state: '', rounds: 0 };
    const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
    HOOK.hurt = (u, d, side, kind) => {
      // 來源：爆炸（哪一種砲彈）、撞擊（倒塌／摔落）、火
      const curLive = HOOK.cur;
      let src = kind === G.K_CRUSH ? (S.phase === 'hazard' ? 'rockfall/crush' : S.turn === u.side ? 'crush(own turn)' : 'crush') : kind === G.K_FIRE && !curLive ? 'burn' : (curLive || KIND[kind]);
      add(R.dmg[u.side], src, d);
      if (verbose && d >= 6) game.log.push(`     r${S.round} ${S.phase}/${S.turn} ${u.side ? 'foe' : 'ME '} ${u.type}#${u.slot} -${d.toFixed(0)} (${src}) → ${Math.max(0, u.hp).toFixed(0)}`);
    };
    HOOK.kill = (u, side, how) => {
      const curLive = HOOK.cur;
      const key = u.type + '#' + u.slot;
      add(R.deaths[u.side], HOW[how] || how, 1);
      (R.deathRound[u.side][key] = R.deathRound[u.side][key] || []).push(S.round);
      if (R.firstBlood[u.side].length <= sd) R.firstBlood[u.side][sd] = S.round;
      game.log.push(`     r${S.round} ${S.phase}/${S.turn} ${u.side ? 'foe' : 'ME '} ${key} DOWN (${HOW[how]}${curLive ? ', ' + curLive : ''})`);
      game.lastKill = { side: u.side, key, how: HOW[how], src: curLive };
    };
    let lastPhase = '', lastTurn = -1, lastRound = 0, roundT0 = 0, phaseStartT = 0;
    S.on = (t, a, b) => { if (t === 'chain' ) R.chains.push([li + 1, S.round, b, a]); };
    while (S.state === 'play' && S.round < 40) {
      const ph0 = S.phase, turn0 = S.turn, pT = S.phaseT;
      simStep(1 / 60);
      if ((ph0 === 'resolve' || ph0 === 'hazard') && S.phase !== ph0) {
        const k = ph0 === 'hazard' ? 2 : turn0, cap = pT > 8.9 ? 1 : 0;
        R.resolve.n++; R.resolve.sum += pT; R.resolve.cap += cap; if (pT > R.resolve.max) R.resolve.max = pT;
        R.resolve.byTurn[k].n++; R.resolve.byTurn[k].sum += pT; R.resolve.byTurn[k].cap += cap;
      }
      if (S.phase === 'aim' && (ph0 !== 'aim' || S.turn !== turn0) && S.state === 'play') {
        const a = restAudit(), r = R.rest;
        r.n++; r.awake += a.awake; if (a.awake) r.awakeN++; r.floatB += a.floatB; r.floatU += a.floatU; r.deep += a.deep; r.unitDeep += a.unitDeep; r.unitOut += a.unitOut; r.bodies += a.bodies; if (a.bodies > r.bodiesMax) r.bodiesMax = a.bodies; if (a.deepMax > r.deepMax) r.deepMax = a.deepMax;
        if ((a.awake || a.floatB || a.floatU || a.deep || a.unitDeep) && r.samples.length < 14) r.samples.push(`seed#${sd} r${S.round} turn${S.turn}: awake ${a.awake} [${a.awakeList.join('; ')}] float ${a.floatB}+${a.floatU}u [${a.floatList.join('; ')}] deep ${a.deep}+${a.unitDeep}u [${a.deepList.join('; ')}]`);
      }
      if (S.round !== lastRound) {
        if (lastRound > 0) R.roundTime.push(S.time - roundT0);
        roundT0 = S.time; lastRound = S.round;
        const k = S.round - 1;
        for (let s = 0; s < 2; s++) { (R.aliveByRound[s][k] = R.aliveByRound[s][k] || []).push(S.team[s].alive); (R.barByRound[s][k] = R.barByRound[s][k] || []).push(teamBar(s)); }
        const bu = S.boss ? bossUnit() : null;
        game.log.push(`   round ${S.round}: me ${(teamBar(0) * 100).toFixed(0)}%/${S.team[0].alive} (struct ${(structBar(0) * 100).toFixed(0)}%)  foe ${(teamBar(1) * 100).toFixed(0)}%/${S.team[1].alive} (struct ${(structBar(1) * 100).toFixed(0)}%)${bu ? ' boss ' + Math.round(bu.hp) + '/' + Math.round(bu.hpMax) + ' P' + S.boss.phase : ''}  t=${S.time.toFixed(0)}s`);
      }
    }
    const won = S.state === 'won';
    game.state = S.state; game.rounds = S.round;
    if (won) { R.wins++; R.winRounds.push(S.round); }
    R.rounds.push(S.round); R.time.push(S.time);
    const loser = S.loser;
    if (loser >= 0) { R.endStruct.push([won ? 'W' : 'L', +(S.st[loser].hpNow / S.st[loser].hp0).toFixed(2)]); const lk = game.lastKill; if (lk) add(R.lastKill, (won ? 'W:' : 'L:') + lk.how + (lk.src ? '/' + lk.src : ''), 1); }
    R.games.push(`${S.state.padEnd(4)} r=${String(S.round).padStart(2)} t=${S.time.toFixed(0).padStart(3)}s me=${(teamBar(0) * 100).toFixed(0)}%/${S.team[0].alive} foe=${(teamBar(1) * 100).toFixed(0)}%/${S.team[1].alive} ult=${S.team[0].ult.uses}/${S.team[1].ult.uses} sh=${S.team[0].shield.uses}/${S.team[1].shield.uses} swarm=${S.stat.swarm} chain=${S.stat.chain}`);
    if (verbose) console.log(`--- L${li + 1} seed#${sd} ${S.state} in ${S.round}\n` + game.log.join('\n'));
  }
  all[li + 1] = R;
  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, f1 = (x) => x.toFixed(1);
  const pct = (o) => { const t = Object.values(o).reduce((x, y) => x + y, 0) || 1; return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / t * 100).toFixed(0)}%`).join(', '); };
  console.log(`\n===== L${li + 1} ${R.name} [${botName} up${upL} diff${diff}] wins ${R.wins}/${N}  rounds avg ${f1(avg(R.rounds))} (win ${f1(avg(R.winRounds))}; min ${Math.min(...R.rounds)} max ${Math.max(...R.rounds)})  sim time/game ${f1(avg(R.time))}s  s/round ${f1(avg(R.roundTime))}`);
  for (const g of R.games) console.log('   ' + g);
  console.log(`  alive by round  me: ${R.aliveByRound[0].map((a) => f1(avg(a))).join(' ')}`);
  console.log(`                 foe: ${R.aliveByRound[1].map((a) => f1(avg(a))).join(' ')}`);
  console.log(`  bar by round    me: ${R.barByRound[0].map((a) => (avg(a) * 100).toFixed(0)).join(' ')}`);
  console.log(`                 foe: ${R.barByRound[1].map((a) => (avg(a) * 100).toFixed(0)).join(' ')}   (games still running: ${R.barByRound[1].map((a) => a.length).join(' ')})`);
  for (let s = 0; s < 2; s++) {
    console.log(`  ${s ? 'FOE' : 'MY '} units: damage taken by source: ${pct(R.dmg[s])}`);
    console.log(`       deaths by cause: ${JSON.stringify(R.deaths[s])}; death rounds: ${Object.entries(R.deathRound[s]).map(([k, v]) => `${k}: n=${v.length} avg r${f1(avg(v))} [${v.join(',')}]`).join(' | ')}`);
  }
  console.log(`  last kill: ${JSON.stringify(R.lastKill)}   loser's structure left when it ended: ${R.endStruct.map((e) => e[0] + (e[1] * 100).toFixed(0)).join(' ')}`);
  const rs = R.resolve;
  console.log(`  settle time after a volley: avg ${f1(rs.sum / (rs.n || 1))}s max ${f1(rs.max)}s, hit the 9s cap ${rs.cap}/${rs.n}  | after my volley ${f1(rs.byTurn[0].sum / (rs.byTurn[0].n || 1))}s (cap ${rs.byTurn[0].cap}/${rs.byTurn[0].n}), after foe ${f1(rs.byTurn[1].sum / (rs.byTurn[1].n || 1))}s (cap ${rs.byTurn[1].cap}/${rs.byTurn[1].n}), hazard ${f1(rs.byTurn[2].sum / (rs.byTurn[2].n || 1))}s (cap ${rs.byTurn[2].cap}/${rs.byTurn[2].n})`);
  const r = R.rest;
  console.log(`  rest state at ${r.n} aim starts: still-MOVING bodies (v>0.5 or w>0.3) in ${r.awakeN} (${r.awake} bodies); floating blocks ${r.floatB}, floating units ${r.floatU}; deep overlaps (>0.35) blocks ${r.deep} units ${r.unitDeep}, worst ${r.deepMax.toFixed(2)}; unit-outside-castle samples ${r.unitOut}; bodies avg ${f1(r.bodies / (r.n || 1))} max ${r.bodiesMax}`);
  for (const s of r.samples) console.log('     ' + s);
  const ch = R.chains.filter((c) => c[2] === 0).map((c) => c[3]), ch1 = R.chains.filter((c) => c[2] === 1).map((c) => c[3]);
  console.log(`  chains ≥6 by me: ${ch.length} (avg ${f1(avg(ch))}, max ${ch.length ? Math.max(...ch) : 0}) in ${avg(R.rounds) * N | 0} rounds; by foe: ${ch1.length} (max ${ch1.length ? Math.max(...ch1) : 0})`);
}
if (opt.json) require('fs').writeFileSync(opt.json, JSON.stringify(all));
