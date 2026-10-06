// node test/sim.js [關卡|all] [bot] [場數] [強化等級] [-v]    例：node test/sim.js all casual 6 0
// 環境變數 DIFF=0|1|2 換難度
const G = require('./load')();
const { S, SH, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const arg = process.argv.slice(2);
const which = arg[0] || 'all', botName = arg[1] || 'casual', seeds = +(arg[2] || 6), upL = +(arg[3] || 0), verbose = arg.includes('-v');
const diff = process.env.DIFF === undefined ? 1 : +process.env.DIFF;
const up = { dmg: upL, rate: upL, hp: upL, shield: upL, ult: upL };
const lvs = which === 'all' ? LEVELS.map((_, i) => i) : [+which - 1];
for (const li of lvs) {
  let wins = 0, tsum = 0, barsum = 0, allbar = 0, byUnits = 0, lostU = 0; const out = [];
  for (let sd = 0; sd < seeds; sd++) {
    simInit(li, up, 1000 + sd * 7919 + li * 131, diff, botName === 'idle' ? null : { botA: BOTS[botName] });
    let steps = 0, tot = 0, worst = 0, maxShots = 0; const log = [];
    while (S.state === 'play' && S.time < 320) {
      const t0 = process.hrtime.bigint();
      simStep(1 / 60);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6; tot += ms; if (ms > worst) worst = ms; steps++;
      if (SH.n > maxShots) maxShots = SH.n;
      if (verbose && S.frame % 300 === 0) log.push(`   t=${S.time.toFixed(0)} me=${(teamBar(0) * 100).toFixed(0)}%/${S.team[0].alive} foe=${(teamBar(1) * 100).toFixed(0)}%/${S.team[1].alive} shots=${SH.cnt[0]}/${SH.cnt[1]} gates=${S.gates.length} wind=${S.wind.toFixed(1)} ult=${S.team[0].ult.uses} sh=${S.team[0].shield.uses}`);
    }
    const bar0 = teamBar(0), why = (S.loser >= 0 && S.team[S.loser].alive <= 0) ? 'units' : 'bar'; if (why === 'units') byUnits++; allbar += S.state === 'won' ? bar0 : 0; lostU += S.team[0].units.length - S.team[0].alive;
    for (let k = 0; k < 120; k++) simStep(1 / 60);
    const won = S.state === 'won'; if (won) { wins++; barsum += teamBar(0); } tsum += S.time - 2;
    out.push(`${S.state.padEnd(4)} t=${(S.time - 2).toFixed(0).padStart(3)} me=${(teamBar(0) * 100).toFixed(0).padStart(3)}%/${S.team[0].alive} foe=${(teamBar(1) * 100).toFixed(0).padStart(3)}%/${S.team[1].alive} fired=${S.stat.fired} peak=${S.stat.peak} swarm=${S.stat.swarm} cells=${S.stat.cells} ult=${S.team[0].ult.uses} sh=${S.team[0].shield.uses} maxShots=${maxShots} ms=${(tot / steps).toFixed(3)}/${worst.toFixed(1)}`);
    if (verbose) console.log(log.join('\n'));
  }
  console.log(`L${li + 1} ${LEVELS[li].name} [${botName} up${upL} diff${diff}] wins ${wins}/${seeds}  avgT=${(tsum / seeds).toFixed(0)}s  avgBar(win)=${wins ? (barsum / wins * 100).toFixed(0) : '-'}%  endByUnits=${byUnits}/${seeds}  unitsLost=${(lostU / seeds).toFixed(1)}`);
  if (seeds <= 8 || verbose) for (const o of out) console.log('   ' + o);
}
