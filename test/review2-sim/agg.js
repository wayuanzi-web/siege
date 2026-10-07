// node test/review2-sim/agg.js <out/xxx.jsonl …> [--by=bot|diff|up]
// 把 batch.js 的記錄整理成一張表：勝率、回合數分布、太早被打垮／太早打贏的場數、逾時、異常、兵怎麼倒的。
const fs = require('fs');
const files = process.argv.slice(2).filter((a) => a[0] !== '-');
const recs = []; for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) recs.push(JSON.parse(l));
const key = (r) => `L${r.li + 1} ${r.bot.padEnd(6)} d${r.diff} u${r.up}`;
const groups = new Map(); for (const r of recs) { const k = key(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
const q = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN;
const pct = (n, d) => d ? Math.round(100 * n / d) + '%' : '-';
for (const [k, L] of [...groups.entries()].sort()) {
  const N = L.length, W = L.filter((r) => r.state === 'won'), Lo = L.filter((r) => r.state === 'lost'), un = L.filter((r) => r.state === 'play');
  const rs = L.map((r) => r.rounds).sort((a, b) => a - b), rw = W.map((r) => r.rounds).sort((a, b) => a - b), rl = Lo.map((r) => r.rounds).sort((a, b) => a - b);
  console.log(`\n${k}  N=${N}  won ${W.length} (${pct(W.length, N)})  lost ${Lo.length}  undecided@40 ${un.length}`);
  console.log(`   rounds all: min ${rs[0]} / med ${q(rs, 0.5)} / p90 ${q(rs, 0.9)} / max ${rs[N - 1]}   wins: ${rw.length ? rw[0] + '/' + q(rw, 0.5) + '/' + q(rw, 0.9) + '/' + rw[rw.length - 1] : '-'}   losses: ${rl.length ? rl[0] + '/' + q(rl, 0.5) + '/' + q(rl, 0.9) + '/' + rl[rl.length - 1] : '-'}`);
  const hist = {}; for (const r of rs) { const b = r <= 2 ? '1-2' : r <= 4 ? '3-4' : r <= 6 ? '5-6' : r <= 8 ? '7-8' : r <= 10 ? '9-10' : r <= 14 ? '11-14' : r <= 19 ? '15-19' : r <= 24 ? '20-24' : '25+'; hist[b] = (hist[b] || 0) + 1; }
  console.log('   rounds histogram: ' + ['1-2', '3-4', '5-6', '7-8', '9-10', '11-14', '15-19', '20-24', '25+'].map((b) => b + ':' + (hist[b] || 0)).join('  '));
  // 太早
  const w2 = W.filter((r) => r.rounds <= 2), l3 = Lo.filter((r) => r.rounds <= 3);
  const ew = L.filter((r) => r.earlyWipe >= 2), ew3 = L.filter((r) => r.earlyWipe >= 3);
  const multi = L.filter((r) => r.maxLoss >= 2);
  console.log(`   won in ≤2 rounds: ${w2.length} (sd ${w2.slice(0, 12).map((r) => r.sd).join(',')})   lost in ≤3 rounds: ${l3.length} (sd ${l3.slice(0, 12).map((r) => r.sd + ':r' + r.rounds).join(',')})`);
  console.log(`   ≥2 of my units lost to one enemy turn in rounds 1-3: ${ew.length} games (${pct(ew.length, N)}; ≥3: ${ew3.length})  e.g. sd ${ew.slice(0, 14).map((r) => r.sd + '@' + r.earlyWipeAt).join(' ')}   any round: ${multi.length} games`);
  // 異常
  const tmoR = L.reduce((s, r) => s + r.tmo.resolve, 0), tmoH = L.reduce((s, r) => s + r.tmo.hazard, 0), vols = L.reduce((s, r) => s + r.vols.length, 0);
  const stuck = L.filter((r) => r.stuck), nan = L.filter((r) => r.nan), exc = L.filter((r) => r.exc);
  console.log(`   forced phase endings (phaseT > 9): resolve ${tmoR} of ${vols} volleys (${pct(tmoR, vols)}), hazard ${tmoH}; games with any: ${L.filter((r) => r.tmo.resolve + r.tmo.hazard > 0).length}   stuck>14s: ${stuck.length}  NaN: ${nan.length}  exceptions: ${exc.length}${exc.length ? ' ' + exc[0].exc : ''}`);
  // 兵怎麼倒的
  const how = [{}, {}]; for (const r of L) for (const d of r.deaths) { if (d.post) continue; how[d.s][d.how] = (how[d.s][d.how] || 0) + 1; }
  const f = (o) => Object.keys(o).sort().map((x) => x + ' ' + (o[x] / N).toFixed(2)).join(', ');
  console.log(`   deaths per game (before the game was decided)  mine: ${f(how[0])}   |  foe: ${f(how[1])}`);
  const pins = [0, 0], pinStill = [0, 0], pinKill = [0, 0]; for (const r of L) for (const p of r.pins) { pins[p.side]++; if (!p.moved) pinStill[p.side]++; if (p.dmg >= p.hp) pinKill[p.side]++; }
  console.log(`   burial hits: mine ${pins[0]} (unit not displaced: ${pinStill[0]}; fatal: ${pinKill[0]})   foe ${pins[1]} (not displaced: ${pinStill[1]}; fatal: ${pinKill[1]})`);
  const kb0 = L.map((r) => r.kbMax[0]).sort((a, b) => a - b), kb1 = L.map((r) => r.kbMax[1]).sort((a, b) => a - b), v0 = L.map((r) => r.vMax[0]).sort((a, b) => a - b), v1 = L.map((r) => r.vMax[1]).sort((a, b) => a - b);
  console.log(`   blast push on a unit, summed over one volley (u/s; cap UKB_V = 9): mine med ${q(kb0, 0.5)} p90 ${q(kb0, 0.9)} max ${kb0[N - 1]}   foe med ${q(kb1, 0.5)} p90 ${q(kb1, 0.9)} max ${kb1[N - 1]}   speed right after a push: mine max ${v0[N - 1]}  foe max ${v1[N - 1]}`);
  console.log(`   shield uses/game: me ${(L.reduce((s, r) => s + r.sh[0], 0) / N).toFixed(1)}  ult uses/game: me ${(L.reduce((s, r) => s + r.ult[0], 0) / N).toFixed(1)} foe ${(L.reduce((s, r) => s + r.ult[1], 0) / N).toFixed(1)}   revives: me ${L.reduce((s, r) => s + r.revive[0], 0)} foe ${L.reduce((s, r) => s + r.revive[1], 0)}   sudden death reached: ${L.filter((r) => r.suddenR).length} games`);
}
