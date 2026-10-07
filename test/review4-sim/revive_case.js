// node test/review4-sim/revive_case.js <關卡> <bot> <seed> [難度=1]
// 重播一場，援軍復活之後每 0.5 秒印一次他跟「疊在一起的那個兵」的位置，一直印到其中一個死掉或分開為止
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, BOTS } = G;
const li = +(process.argv[2] || 1) - 1, bot = process.argv[3] || 'casual', seed = +(process.argv[4] || 1), diff = +(process.argv[5] === undefined ? 1 : process.argv[5]);
simInit(li, {}, seed, diff, { botA: BOTS[bot] });
let pair = null, t0 = 0, last = -1;
const ov = (a, b) => Math.abs(a.x - b.x) < (a.bw + b.bw) / 2 - 0.4 && Math.abs(a.y - b.y) < (a.bh + b.bh) / 2 - 0.4;
S.on = (t, a, b, c, d) => {
  if (t !== 'revive') return;
  let u = null; for (const k of S.team[c].units) if (k.slot === d) u = k;
  console.log(`t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn}: side${c} ${u.type}#${d} revived at (${u.x.toFixed(2)},${u.y.toFixed(2)}), home (${u.hx.toFixed(1)},${u.hy.toFixed(1)})`);
  for (const o of S.units) if (o !== u && o.alive && ov(o, u)) { console.log(`    overlaps ${o.type}#${o.slot} side${o.side} at (${o.x.toFixed(2)},${o.y.toFixed(2)})`); if (!pair) { pair = [u, o]; t0 = S.time; } }
};
H.hurt = (u, d, side, kind, ctx) => { if (pair && (u === pair[0] || u === pair[1]) && d > 3) console.log(`    t=${S.time.toFixed(2)} ${u.type}#${u.slot} takes ${d.toFixed(1)} (${ctx}) -> hp ${(u.hp - d).toFixed(0)}`); };
H.kill = (u, side, how, ctx) => { if (pair && (u === pair[0] || u === pair[1])) console.log(`    t=${S.time.toFixed(2)} ${u.type}#${u.slot} DIED how=${how} ctx=${ctx}`); };
let overlapT = 0;
while (S.state === 'play' && S.round < 40) {
  simStep(1 / 60);
  if (pair) {
    const [a, b] = pair;
    if (!a.alive || !b.alive) { console.log(`    pair ended at t=${S.time.toFixed(2)} after ${overlapT.toFixed(1)}s of overlap`); pair = null; continue; }
    if (ov(a, b)) overlapT += 1 / 60;
    if (S.time - last >= 0.5) { last = S.time; console.log(`    t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn}  ${a.type}#${a.slot} (${a.x.toFixed(2)},${a.y.toFixed(2)}) hp${a.hp.toFixed(0)} awake=${a.body.isAwake()}   ${b.type}#${b.slot} (${b.x.toFixed(2)},${b.y.toFixed(2)}) hp${b.hp.toFixed(0)} awake=${b.body.isAwake()}  overlapping=${ov(a, b)}`); }
    if (!ov(a, b) && S.time - t0 > 1.5 && overlapT > 0) { console.log(`    separated at t=${S.time.toFixed(2)} after ${overlapT.toFixed(1)}s of overlap`); pair = null; }
  }
}
console.log(`result ${S.state} at t=${S.time.toFixed(1)} round ${S.round}`);
