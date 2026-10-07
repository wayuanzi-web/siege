// node test/review2-sim/batch.js <關卡,…> <bot,…> <場數> [難度,…=1] [強化,…=0] [種子基數=9000] [起始場次=0] > out/xxx.jsonl
// 每一場印一行 JSON（lib.js 的記錄）。種子算法跟 test/table.js 一樣（9000 + sd*7919 + li*131），可以互相對照。
const { load, play, H } = require('./lib');
const a = process.argv.slice(2);
const lvs = a[0].split(',').map((x) => +x - 1), bots = a[1].split(','), N = +a[2], diffs = (a[3] || '1').split(',').map(Number), ups = (a[4] || '0').split(',').map(Number), base = +(a[5] || 9000), sd0 = +(a[6] || 0);
const G = load();
for (const li of lvs) for (const bot of bots) for (const diff of diffs) for (const up of ups) for (let sd = sd0; sd < sd0 + N; sd++) {
  const rec = play(G, { li, seed: H.seed(base, sd, li), diff, up, bot, maxR: 40 });
  rec.sd = sd;
  console.log(JSON.stringify(rec));
}
