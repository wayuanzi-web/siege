// node test/review2-sim/cmp_fix.js <out/fix_xxx.jsonl> [場數=32]
// 套了建議修法的對照組 vs 原版（同樣的種子：main_L*.jsonl 裡 casual 的前 N 場）
const fs = require('fs');
const f = process.argv[2], N = +(process.argv[3] || 32);
const rd = (p) => fs.readFileSync(p, 'utf8').trim().split('\n').map(JSON.parse);
const fix = rd(f);
const sum = (L) => {
  const n = L.length, w = L.filter((r) => r.state === 'won').length, rs = L.map((r) => r.rounds).sort((a, b) => a - b);
  const r1 = L.filter((r) => r.deaths.some((d) => d.s === 0 && !d.post && d.r === 1)).length, r2 = L.filter((r) => r.deaths.some((d) => d.s === 0 && !d.post && d.r <= 2)).length;
  const multi = L.filter((r) => { const per = {}; for (const d of r.deaths) if (d.s === 0 && !d.post && d.turn === 1) per[d.r] = (per[d.r] || 0) + 1; return Math.max(0, ...Object.values(per)) >= 2; }).length;
  const pins0 = L.reduce((s, r) => s + r.pins.filter((p) => p.side === 0).length, 0), pinHome0 = L.reduce((s, r) => s + r.pins.filter((p) => p.side === 0 && !p.moved).length, 0), pins1 = L.reduce((s, r) => s + r.pins.filter((p) => p.side === 1).length, 0);
  const lost = L.reduce((s, r) => s + r.lostU, 0) / n, kills1 = L.filter((r) => r.deaths.filter((d) => d.s === 1 && !d.post && d.r <= 2).length >= 2).length;
  const keg1 = L.filter((r) => r.kegs.some((q) => !q.post && q.r === 1)).length;
  return `won ${String(w).padStart(2)}/${n}  rounds med ${rs[n >> 1]} max ${rs[n - 1]}  my units lost/game ${lost.toFixed(2)}  lost a unit in r1: ${r1}, by r2: ${r2}  ≥2 lost in one enemy turn: ${multi}  burial hits me ${pins0} (at post ${pinHome0}) foe ${pins1}  I killed ≥2 by r2: ${kills1}${keg1 ? '  kegs blown in r1: ' + keg1 : ''}`;
};
for (let li = 0; li < 6; li++) {
  const base = rd(`${__dirname}/out/main_L${li + 1}.jsonl`).filter((r) => r.bot === 'casual' && r.sd < N), fx = fix.filter((r) => r.li === li && r.sd < N);
  console.log(`L${li + 1} shipped: ${sum(base)}\n   patched: ${sum(fx)}`);
}
