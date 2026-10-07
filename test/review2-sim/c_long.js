// node test/review2-sim/c_long.js <out/xxx.jsonl …> [--min=11] [--top=3] [--detail]
// C：拖得久的對局裡到底在發生什麼。每一關挑回合數最多的幾場，一回合印一列：
//   雙方還剩幾個兵／總血量、這一回合我方那一輪瞄什麼（tg）、穿了幾倍的符、打掉對方兵多少血（du）、打掉幾個兵、有幾個兵被凍住不能打（held）、對方是不是開著護罩；敵方那一輪同樣。
// 另外統計「打空的輪」（整輪沒有傷到對方任何一個兵）的比例，前五回合 vs 第十回合以後。
const fs = require('fs');
const files = process.argv.slice(2).filter((a) => a[0] !== '-'), arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const MIN = +arg('min', 11), TOP = +arg('top', 3), detail = process.argv.includes('--detail');
const recs = []; for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) recs.push(JSON.parse(l));
const byL = new Map(); for (const r of recs) { const k = `L${r.li + 1} ${r.bot} d${r.diff} u${r.up}`; if (!byL.has(k)) byL.set(k, []); byL.get(k).push(r); }
for (const [k, L] of [...byL.entries()].sort()) {
  // 打空的比例
  const whiff = { early: [0, 0, 0, 0], late: [0, 0, 0, 0] };      // [我方打空, 我方總輪數, 敵方打空, 敵方總輪數]
  const reason = {};
  for (const r of L) for (const v of r.vols) {
    const w = v.r <= 5 ? whiff.early : v.r >= 10 ? whiff.late : null; if (!w) continue;
    w[v.s * 2 + 1]++; if (v.du < 1 && !v.kills) { w[v.s * 2]++; if (v.r >= 10) { const why = v.sh ? 'shielded' : !v.any ? 'all frozen' : v.tg === 'none' ? 'no target found' : v.tg !== 'unit' ? 'aimed at ' + v.tg : 'missed'; reason[v.s + ':' + why] = (reason[v.s + ':' + why] || 0) + 1; } }
  }
  const long = L.filter((r) => r.rounds >= MIN).sort((a, b) => b.rounds - a.rounds);
  const p = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
  console.log(`\n${k}: ${long.length} of ${L.length} games lasted ≥${MIN} rounds.  volleys that hurt no enemy unit — rounds 1-5: me ${p(whiff.early[0], whiff.early[1])}, foe ${p(whiff.early[2], whiff.early[3])};  rounds 10+: me ${p(whiff.late[0], whiff.late[1])} (${whiff.late[1]} volleys), foe ${p(whiff.late[2], whiff.late[3])} (${whiff.late[3]})`);
  if (Object.keys(reason).length) console.log('   why the late volleys did nothing: ' + Object.keys(reason).sort().map((x) => (x[0] === '0' ? 'me ' : 'foe ') + x.slice(2) + ' ×' + reason[x]).join(', '));
  for (const r of long.slice(0, TOP)) {
    console.log(`   sd ${r.sd} seed ${r.seed}: ${r.state} in ${r.rounds} rounds (${r.time}s sim time); sudden death from round ${r.suddenR || '-'}; shields me ${r.sh[0]} ult me ${r.ult[0]} foe ${r.ult[1]}; revives me ${r.revive[0]} foe ${r.revive[1]}; bonuses ${r.bonus.map((b) => 'r' + b.r + (b.side ? 'foe' : 'me') + ':' + b.kind).join(' ')}`);
    if (r.endUnits) console.log('      alive at the end: ' + r.endUnits.map((u) => (u.s ? 'foe ' : 'me ') + u.type + '#' + u.slot + ' hp' + u.hp + (u.home ? '' : ` displaced(x=${u.relx},y=${u.y})`)).join(', '));
    if (!detail) continue;
    for (let rd = 1; rd <= r.rounds; rd++) {
      const s = r.rnd[rd]; if (!s) continue; const v0 = r.vols.find((v) => v.r === rd && v.s === 0), v1 = r.vols.find((v) => v.r === rd && v.s === 1);
      const f = (v) => v ? `${v.tg}${v.gm > 1 ? '×' + v.gm : ''}${v.ult ? ' ULT' : ''}${v.rage ? ' x2' : ''} du${v.du}${v.kills ? ' KILL' + v.kills : ''}${v.held ? ' held' + v.held : ''}${v.sh ? ' [shielded]' : ''}${!v.any ? ' [nobody could fire]' : ''}` : '-';
      console.log(`      r${String(rd).padStart(2)} units ${s.a0}v${s.a1} hp ${s.h0}/${s.h1}${s.boss >= 0 ? ' boss ' + s.boss + ' P' + s.ph : ''}${s.rage > 1 ? ' rage×' + s.rage : ''}${s.wind ? ' wind ' + s.wind : ''} | me: ${f(v0)} | foe: ${f(v1)}`);
    }
  }
}
