// node test/sim.js [關卡|all] [bot] [場數] [強化等級] [-v]    例：node test/sim.js all casual 6 0
// 環境變數 DIFF=0|1|2 換難度
const G = require('./load')();
const { S, SH, simInit, simStep, LEVELS, BOTS, teamBar, structBar } = G;
const arg = process.argv.slice(2).filter((a) => a[0] !== '-');
const which = arg[0] || 'all', botName = arg[1] || 'casual', seeds = +(arg[2] || 6), upL = +(arg[3] || 0), verbose = process.argv.includes('-v');
const diff = process.env.DIFF === undefined ? 1 : +process.env.DIFF;
const up = { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL };
const lvs = which === 'all' ? LEVELS.map((_, i) => i) : [+which - 1];
for (const li of lvs) {
  let wins = 0, rsum = 0, barsum = 0, lostU = 0, byU = 0; const out = [];
  for (let sd = 0; sd < seeds; sd++) {
    simInit(li, up, 1000 + sd * 7919 + li * 131, diff, { botA: BOTS[botName], mute: process.env.MUTE === undefined ? undefined : +process.env.MUTE });
    const log = []; let steps = 0, tot = 0, worst = 0, lastRound = 0, maxBodies = 0;
    S.on = (t, a, b, c, d, e) => { if (!verbose) return; if (t === 'udie') log.push(`     r${S.round} ${c === 0 ? 'ME ' : 'foe'} ${d} down (${['hit', 'crush', '', 'burn', 'fell'][e]})`); else if (t === 'chain') log.push(`     r${S.round} chain ×${a} by side ${b}`); };
    while (S.state === 'play' && S.round < +(process.env.MAXR || 60) && S.time < 1500) {
      const t0 = process.hrtime.bigint(); simStep(1 / 60); const ms = Number(process.hrtime.bigint() - t0) / 1e6; tot += ms; if (ms > worst) worst = ms; steps++;
      if (verbose && S.round !== lastRound) { lastRound = S.round; log.push(`   round ${S.round}: me ${(teamBar(0) * 100).toFixed(0)}%/${S.team[0].alive}  foe ${(teamBar(1) * 100).toFixed(0)}%/${S.team[1].alive}  t=${S.time.toFixed(0)}s blocks=${S.blocks.filter((b) => !b.dead).length}`); }
    }
    const won = S.state === 'won'; if (won) { wins++; barsum += teamBar(0); if (S.team[1].alive <= 0) byU++; } rsum += S.round; lostU += S.team[0].units.length - S.team[0].alive;
    out.push(`${S.state.padEnd(4)} rounds=${String(S.round).padStart(2)} t=${S.time.toFixed(0).padStart(3)}s me=${(teamBar(0) * 100).toFixed(0).padStart(3)}%/${S.team[0].alive} foe=${(teamBar(1) * 100).toFixed(0).padStart(3)}%/${S.team[1].alive} struct=${(structBar(0) * 100).toFixed(0)}/${(structBar(1) * 100).toFixed(0)} peak=${S.stat.peak} swarm=${S.stat.swarm} chain=${S.stat.chain} ult=${S.team[0].ult.uses} sh=${S.team[0].shield.uses} ms=${(tot / steps).toFixed(2)}/${worst.toFixed(0)}`);
    if (verbose) console.log(log.join('\n'));
  }
  console.log(`L${li + 1} ${LEVELS[li].name} [${botName} up${upL} diff${diff}] wins ${wins}/${seeds}  avgRounds=${(rsum / seeds).toFixed(1)}  avgBar(win)=${wins ? (barsum / wins * 100).toFixed(0) : '-'}%  winByUnits=${byU}  unitsLost=${(lostU / seeds).toFixed(1)}`);
  if (seeds <= 8 || verbose) for (const o of out) console.log('   ' + o);
}
