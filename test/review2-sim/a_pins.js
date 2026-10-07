// node test/review2-sim/a_pins.js <out/xxx.jsonl …> [-v]
// A5：埋壓判定（burialCheck）在真的對局裡都打到誰？
//   分成：兵已經離開原位（moved）／還站在原位（not displaced）。還站在原位的再看壓在頭上的是什麼：
//   「還算在原位的磚」（天花板只是沉下來 0.4 壓在頭上，房間看起來是好的）或是掉下來的磚、碎塊。
const fs = require('fs');
const files = process.argv.slice(2).filter((a) => a[0] !== '-'), verbose = process.argv.includes('-v');
const MATN = [, 'wood', 'stone', 'iron', 'roof', 'ice', 'rock', 'keg', 'clay'];
const recs = []; for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l.trim()) recs.push(JSON.parse(l));
const byL = new Map(); for (const r of recs) { const k = `L${r.li + 1}`; if (!byL.has(k)) byL.set(k, []); byL.get(k).push(r); }
for (const [k, L] of [...byL.entries()].sort()) {
  const c = { n: 0, moved: 0, still: 0, stillInPlaceOnly: 0, stillMixed: 0, fatal: 0, fatalStill: 0, dmg: 0, small: 0 }; const ex = []; const perUnit = {};
  let games = 0;
  for (const r of L) {
    if (r.pins.length) games++;
    const seq = {};
    for (const p of r.pins) {
      c.n++; c.dmg += p.dmg; if (p.dmg >= p.hp) c.fatal++;
      const id = p.side + ':' + p.type + '#' + p.slot; seq[id] = (seq[id] || 0) + 1;
      if (p.moved) { c.moved++; if (p.load < 12) c.small++; continue; }
      c.still++; if (p.dmg >= p.hp) c.fatalStill++;
      const allIn = p.parts.length && p.parts.every((q) => q.inPlace && !q.frag);
      if (allIn) c.stillInPlaceOnly++; else c.stillMixed++;
      const key = (p.side ? 'foe ' : 'me ') + p.type + '#' + p.slot; perUnit[key] = (perUnit[key] || 0) + 1;
      if (ex.length < (verbose ? 40 : 6)) ex.push(`     ${r.bot} sd ${r.sd} r${p.r}: ${p.side ? 'foe' : 'my'} ${p.type}#${p.slot} hp ${p.hp} at home, load ${p.load} → -${p.dmg}${p.dmg >= p.hp ? ' (FATAL)' : ''}; on its head: ${p.parts.map((q) => `${MATN[q.mat]}${q.frag ? ' fragment' : ''} m${q.mass}${q.inPlace ? ' [still "in place", sagged]' : ''} ${q.w}x${q.h} tilt ${q.ang}`).join(' + ')}`);
    }
    for (const id of Object.keys(seq)) if (seq[id] >= 3) c.rep = (c.rep || 0) + 1;
  }
  console.log(`\n${k}: ${c.n} burial hits in ${games} of ${L.length} games; avg damage ${(c.dmg / (c.n || 1)).toFixed(0)}; fatal ${c.fatal}`);
  console.log(`   unit displaced from its spot: ${c.moved} (of which the load was under 12 mass — one small piece: ${c.small})`);
  console.log(`   unit still standing at its own spot: ${c.still} (fatal ${c.fatalStill}); load was only blocks still counted "in place" (ceiling sagged onto the head): ${c.stillInPlaceOnly}; fallen blocks/fragments involved: ${c.stillMixed}`);
  if (Object.keys(perUnit).length) console.log('   who: ' + Object.keys(perUnit).sort((a, b) => perUnit[b] - perUnit[a]).map((u) => u + ' ×' + perUnit[u]).join(', ') + (c.rep ? `   (same unit hit in ≥3 rounds of one game: ${c.rep} cases)` : ''));
  for (const e of ex) console.log(e);
}
