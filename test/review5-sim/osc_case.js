// node test/review5-sim/osc_case.js <關卡> <bot> <seed> <side> <slot> [從幾秒開始印=0] [到幾秒=999]
// 重播一場，每個階段印一行：那個兵的「邊緣判定」變了幾次、左右來回走了多遠、這個階段是靜下來結束的還是等到上限
const L = require('./lib5'); const H = {}; const G = L.load('', H); const { S, simInit, simStep, BOTS } = G;
const li = +process.argv[2] - 1, bot = process.argv[3], seed = +process.argv[4], side = +process.argv[5], slot = +process.argv[6], t0 = +(process.argv[7] || 0), t1 = +(process.argv[8] || 999);
simInit(li, {}, seed, 1, { botA: BOTS[bot] }); let u = null; for (const k of S.team[side].units) if (k.slot === slot) u = k;
let flips = 0, last = '', ph0 = 0, xmin = 1e9, xmax = -1e9, travel = 0, px = u.x, log = [], caps = 0, tot = 0;
H.edgeSet = (k) => { if (k === u) flips++; };
H.turnEnd = (q, pt) => { log.push(`      -> ${S.phase}/${S.turn} ends: ${q ? 'settled' : 'HIT THE CAP'} after ${pt.toFixed(1)}s`); if (S.time >= t0 && S.time <= t1) { tot++; if (!q) caps++; } };
while (S.state === 'play' && S.time < t1) {
  const key = `r${S.round} ${S.phase}/${S.turn}`;
  if (key !== last) { if (last && S.time > t0 && flips >= 3) console.log(`t=${ph0.toFixed(1)}..${S.time.toFixed(1)} ${last}: ${u.type}#${u.slot} ${u.alive ? 'alive' : 'dead'}, edge flips ${flips}, x ${xmin.toFixed(2)}..${xmax.toFixed(2)}, sideways travel ${travel.toFixed(1)} m`); for (const l of log) if (S.time > t0 && flips >= 3) console.log(l); log = []; last = key; ph0 = S.time; flips = 0; xmin = 1e9; xmax = -1e9; travel = 0; }
  simStep(1 / 60); if (u.alive) { if (u.x < xmin) xmin = u.x; if (u.x > xmax) xmax = u.x; travel += Math.abs(u.x - px); px = u.x; }
}
console.log(`(only phases with 3+ edge flips are listed) turn ends in the window: ${tot}, of which hit the cap: ${caps}; game: ${S.state} round ${S.round}`);
