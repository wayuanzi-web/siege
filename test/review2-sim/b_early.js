// node test/review2-sim/b_early.js <out/xxx.jsonl …> [--maxr=3] [--min=2] [--side=0]
// B：前幾回合裡，一個敵軍回合（那一輪砲擊＋緊接著的落石）就帶走我方兩個以上的兵的對局，逐場列出每個兵是怎麼倒的。
// --side=1 改看敵方（我方一輪帶走敵方幾個兵）
const fs = require('fs');
const files = process.argv.slice(2).filter((a) => a[0] !== '-'), arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const MAXR = +arg('maxr', 3), MIN = +arg('min', 2), side = +arg('side', 0), quiet = process.argv.includes('-q');
const recs = []; for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) recs.push(JSON.parse(l));
const byL = new Map(); for (const r of recs) { const k = `L${r.li + 1} ${r.bot} d${r.diff} u${r.up}`; if (!byL.has(k)) byL.set(k, []); byL.get(k).push(r); }
for (const [k, L] of [...byL.entries()].sort()) {
  const out = []; const mech = {}; let games = 0;
  for (const r of L) {
    const per = {}; for (const d of r.deaths) { if (d.s !== side || d.post) continue; const key = d.r + ':' + d.turn; (per[key] = per[key] || []).push(d); }
    let hit = false;
    for (const key of Object.keys(per)) {
      const [rd, turn] = key.split(':').map(Number); if (rd > MAXR || per[key].length < MIN) continue;
      hit = true;
      const v = r.vols.find((q) => q.r === rd && q.s === turn);
      const ds = per[key].map((d) => {
        const dropped = d.hy - d.y, slid = Math.abs(d.x - d.hx);
        const m = d.ph === 'hazard' ? 'rock' : d.how === 'out' || d.how === 'fell' ? 'left the castle' : d.last === 'pin' ? 'buried' : d.how === 'crush' ? (dropped > 2.5 ? 'fell/crushed after floor went' : 'crushed in place') : d.how === 'burn' ? 'burned' : 'shot';
        mech[m] = (mech[m] || 0) + 1;
        return `${d.type}#${d.slot} ${d.how}${d.ph === 'hazard' ? '(rockfall)' : ''} last=${d.last} dropped ${dropped.toFixed(1)} slid ${slid.toFixed(1)} v=(${d.vx},${d.vy}) dmg{${Object.keys(d.recent).map((x) => x + ' ' + d.recent[x]).join(',')}}`;
      });
      out.push(`   sd ${String(r.sd).padStart(2)} r${rd} ${turn === 1 - side ? (side ? 'my' : 'enemy') + ' turn' : 'own turn'}${v ? ` [aimed at ${v.tg}${v.gm > 1 ? ' through ×' + v.gm : ''}${v.ult ? ', ULT' : ''}${v.rage ? ', lantern ×2' : ''}; unit dmg ${v.du}]` : ''} → ${r.state} in ${r.rounds}:\n        ` + ds.join('\n        '));
    }
    if (hit) games++;
  }
  console.log(`\n${k}: ${games} of ${L.length} games had ≥${MIN} ${side ? 'enemy' : 'of my'} units die in one turn within rounds 1-${MAXR}.  mechanisms: ${Object.keys(mech).map((m) => m + ' ' + mech[m]).join(', ')}`);
  if (!quiet) for (const o of out) console.log(o);
}
