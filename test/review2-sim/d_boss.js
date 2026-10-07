// node test/review2-sim/d_boss.js <out/xxx.jsonl …> [-v]
// D：魔王關的統計（只看第六關的記錄）。每一種自動玩家：
//   各階段到得了嗎、第幾回合到；魔王怎麼死的、第幾回合；被轟出城飛回來幾次；光球放了幾顆、被打掉幾顆、砸到幾顆；
//   結界吃掉幾發、被打破幾段；×20 黃金符兩邊各用了幾輪；魔王連續幾回合一滴血都沒掉。
const fs = require('fs');
const files = process.argv.slice(2).filter((a) => a[0] !== '-'), verbose = process.argv.includes('-v');
const recs = []; for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) { const r = JSON.parse(l); if (r.li === 5) recs.push(r); }
const byL = new Map(); for (const r of recs) { const k = `${r.bot} d${r.diff} u${r.up}`; if (!byL.has(k)) byL.set(k, []); byL.get(k).push(r); }
const q = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : '-';
for (const [k, L] of [...byL.entries()].sort()) {
  const N = L.length, W = L.filter((r) => r.state === 'won');
  const p2 = L.filter((r) => r.phases.some((p) => p.p === 2)), p3 = L.filter((r) => r.phases.some((p) => p.p === 3));
  const r2 = p2.map((r) => r.phases.find((p) => p.p === 2).r).sort((a, b) => a - b), r3 = p3.map((r) => r.phases.find((p) => p.p === 3).r).sort((a, b) => a - b);
  console.log(`\nL6 ${k}: N=${N}, won ${W.length}`);
  console.log(`   phase 2 reached in ${p2.length} games (round min/med/max ${r2[0]}/${q(r2, 0.5)}/${r2[r2.length - 1]}); phase 3 in ${p3.length} (round ${r3[0]}/${q(r3, 0.5)}/${r3[r3.length - 1]})`);
  // 贏的那幾場：魔王死的時候在第幾階段
  const wph = {}; const how = {}; const skipP = [];
  for (const r of W) { const ph = r.phases.length ? Math.max(...r.phases.map((p) => p.p)) : 1; wph[ph] = (wph[ph] || 0) + 1; const d = r.deaths.find((x) => x.s === 1 && x.type === 'boss'); if (d) { const kk = d.how + '/' + d.last; how[kk] = (how[kk] || 0) + 1; } if (ph < 3) skipP.push(`sd ${r.sd} (won r${r.rounds} in phase ${ph})`); }
  console.log(`   wins by the phase the boss was in when he died: ${Object.keys(wph).map((p) => 'P' + p + ':' + wph[p]).join(' ')}   boss death (how/last damage): ${Object.keys(how).map((h) => h + ' ' + how[h]).join(', ')}`);
  if (skipP.length) console.log(`   wins where phase 3 never started: ${skipP.slice(0, 10).join('; ')}`);
  // 階段跳過：同一回合血量從 >70% 掉到 <40%
  let jump = 0; for (const r of L) { const a = r.phases.find((p) => p.p === 2), b = r.phases.find((p) => p.p === 3); if (a && b && b.r === a.r + 1) jump++; }
  console.log(`   phase 3 started the very next round after phase 2: ${jump} games`);
  const bb = L.reduce((s, r) => s + r.bback.length, 0), bbg = L.filter((r) => r.bback.length).length;
  console.log(`   boss knocked out of the castle and flew back ("bossback"): ${bb} times in ${bbg} of ${N} games`);
  const os = L.reduce((s, r) => s + r.orbs.spawn.length, 0), od = L.reduce((s, r) => s + r.orbs.die.length, 0), oh = L.reduce((s, r) => s + r.orbs.hit.length, 0);
  console.log(`   doom orbs: launched ${os}, shot down (or stopped by shield) ${od}, exploded on my castle ${oh}; games with ≥1 orb: ${L.filter((r) => r.orbs.spawn.length).length}`);
  console.log(`   barrier: ${L.reduce((s, r) => s + r.bar.hit, 0)} of my shots absorbed, ${L.reduce((s, r) => s + r.bar.brk, 0)} lane breaks, over ${p2.length} games with a barrier`);
  const g20 = [0, 0], g20g = [0, 0]; for (const r of L) for (const s of [0, 1]) { const n = r.gates[s + 'x20o2'] || 0; g20[s] += n; if (n) g20g[s]++; }
  console.log(`   ×20 gold gate: my shots through it ${g20[0]} (in ${g20g[0]} games), enemy shots through it ${g20[1]} (in ${g20g[1]} games); games that reached phase 3: ${p3.length}`);
  // 魔王連續幾回合沒掉血
  const streaks = []; let noDmgVol = 0, vols = 0;
  for (const r of L) { let best = 0, cur = 0; for (let i = 2; i < r.rnd.length; i++) { const a = r.rnd[i - 1], b = r.rnd[i]; if (!a || !b) continue; if (b.boss >= a.boss - 0.5) { cur++; if (cur > best) best = cur; } else cur = 0; } streaks.push(best); }
  streaks.sort((a, b) => a - b);
  console.log(`   longest run of rounds in which the boss lost no hp: med ${q(streaks, 0.5)}, p90 ${q(streaks, 0.9)}, max ${streaks[streaks.length - 1]}`);
  // 我方打魔王那一輪瞄什麼
  const tg = {}; for (const r of L) for (const v of r.vols) if (v.s === 0) tg[v.tg] = (tg[v.tg] || 0) + 1;
  console.log(`   what my bot aimed at: ${Object.keys(tg).sort((a, b) => tg[b] - tg[a]).map((t) => t + ' ' + tg[t]).join(', ')}`);
  const br = W.map((r) => r.rounds).sort((a, b) => a - b); console.log(`   boss dead by round: min ${br[0]} med ${q(br, 0.5)} max ${br[br.length - 1]}; earliest: ${W.filter((r) => r.rounds <= 4).map((r) => 'sd ' + r.sd + ':r' + r.rounds).join(' ') || '-'}`);
  if (verbose) for (const r of L.slice(0, 8)) console.log(`     sd ${r.sd} ${r.state} r${r.rounds}: boss hp by round ${r.rnd.slice(1).map((x) => x ? x.boss : '?').join(' ')} | phases ${r.phases.map((p) => 'P' + p.p + '@r' + p.r).join(' ')} | orbs spawn ${r.orbs.spawn.join(',')} die ${r.orbs.die.join(',')} hit ${r.orbs.hit.join(',')} | back ${r.bback.map((b) => 'r' + b.r).join(',')}`);
}
