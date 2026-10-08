// node test/review7/shoot.js <關卡> <side> <兵位> <tx,ty> [tau=1.6] [秒數=8] [seed=1]
// 用某一邊某一個兵，照真的開火（unitFire：砲彈、投石的大石頭），瞄準 (tx,ty)、飛行時間 tau 秒（不手抖），跑幾秒，印事件
// 多發：用「;」分隔多組 <兵位>:<tx,ty>:<tau>:<延遲秒>，例如 "1:40,9:1.4:0 ; 4:62,12:1.8:0.5"
const G = require('../load')('PH, unitFire, ropeEnds, blockDist, clampAim');
const { S, simInit, simStep, LEVELS, MAT, aimFor, simTrace } = G;
const li = +process.argv[2] - 1, side = +process.argv[3];
const T = +(process.argv[5] || 8), seed = +(process.argv[6] || 1);
const shots = process.argv[4].split(';').map((s) => { const [sl, xy, tau, dl] = s.trim().split(':'); const [x, y] = xy.split(',').map(Number); return { slot: +sl, x, y, tau: +(tau || 1.6), t: +(dl || 0) }; });
simInit(li, {}, seed, 1, {}); S.team[0].ai = null; S.team[1].ai = null;
const B0 = [S.st[0].blocks.slice(), S.st[1].blocks.slice()], N0 = S.structs.filter((q) => q.side === 2 && !q.loose).map((q) => q.blocks.slice());
if (process.env.WIND) S.wind = +process.env.WIND;
const evs = [], cnt = {};
const f1 = (v) => typeof v === 'number' ? v.toFixed(1) : String(v);
const SHOW = new Set((process.env.SHOW || 'udie,snap,reso,creak,tilt,bonk,thunk,rockstop,splash').split(','));
S.on = (t, a, b, c, d, e, f) => { cnt[t] = (cnt[t] || 0) + 1; if (!SHOW.has(t)) return; if (t === 'creak' && cnt[t] > 10) return; evs.push(`${S.time.toFixed(2)}s ${t} ${f1(a)},${f1(b)} ${c === undefined ? '' : f1(c)} ${d === undefined ? '' : f1(d)} ${e === undefined ? '' : f1(e)} ${f === undefined || typeof f === 'object' ? '' : f1(f)}`); };
S.phase = 'volley'; S.turn = side; S.round = 1; S.vol++;
const Tm = S.team[side];
let t = 0;
for (let i = 0; i < T * 60 && S.state === 'play'; i++) {
  for (const s of shots) if (!s.done && t >= s.t) {
    s.done = true;
    const u = Tm.units.find((q) => q.slot === s.slot); if (!u || !u.alive) { console.log('no unit', s.slot); continue; }
    const mx = u.x + Tm.dir * 1.3, my = u.y + 2.3, v = aimFor(mx, my, s.x, s.y, s.tau, S.wind, [0, 0]);
    const a = G.clampAim(v[0], v[1], Tm.dir);
    const R = simTrace(side, mx, my, a[0], a[1], S.wind, S.time, 150);
    console.log(`fire #${s.slot} ${u.type} aim (${a[0].toFixed(1)},${a[1].toFixed(1)}) → trace hit ${R.hit} at (${R.x.toFixed(1)},${R.y.toFixed(1)}) t=${R.t.toFixed(2)} ${R.o ? (R.o.isBlock ? MAT[R.o.mat].k + ' side' + R.o.side + (R.o.dom ? ' 石碑' : '') : 'unit') : ''}`);
    G.unitFire(u, Tm, u.w, a[0], a[1]);
  }
  if (S.phase === 'aim' || S.phase === 'resolve') { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; }
  simStep(1 / 60); t += 1 / 60;
  if (S.phase !== 'volley') { S.phase = 'resolve'; S.turn = side; }
}
console.log(`L${li + 1} ${LEVELS[li].name} ${t.toFixed(1)}s state ${S.state}`);
for (const u of S.units) if (u.side !== side) console.log(`  ${u.side ? '敵' : '我'} #${u.slot} ${u.type.padEnd(6)} ${u.alive ? `活著 hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)} @(${u.x.toFixed(1)},${u.y.toFixed(1)})` : '倒了'}`);
for (const bl of N0) for (const b of bl) { if (b.dead) { console.log(`  中立 ${MAT[b.mat].k} (${b.x0.toFixed(1)}) 碎了`); continue; } const p = b.body.getPosition(); console.log(`  中立 ${MAT[b.mat].k} (${b.x0.toFixed(1)},${b.y0.toFixed(1)}) → (${p.x.toFixed(1)},${p.y.toFixed(1)}) 角 ${(b.body.getAngle() * 57.3).toFixed(0)}° hp ${b.hp.toFixed(0)}/${b.hm.toFixed(0)}`); }
for (const b of S.rubble.blocks) if (b.boulder) { if (b.dead) console.log('  boulder gone'); else { const p = b.body.getPosition(), v = b.body.getLinearVelocity(); console.log(`  boulder (${p.x.toFixed(1)},${p.y.toFixed(1)}) v(${v.x.toFixed(1)},${v.y.toFixed(1)}) fly ${b.bFly} hit ${b.bHit} in ${b.bIn} awake ${b.body.isAwake()}`); } }
let lost = []; for (const b of B0[1 - side]) if (!b.frag && (b.dead || !b.inPlace)) lost.push(`${MAT[b.mat].k}(${b.x0.toFixed(1)},${b.y0.toFixed(1)})${b.dead ? '✗' : '↘'}`);
console.log(`  對方城：${lost.length} 塊沒了/離位 ${lost.slice(0, 14).join(' ')}`);
let own = []; for (const b of B0[side]) if (!b.frag && (b.dead || !b.inPlace)) own.push(`${MAT[b.mat].k}(${b.x0.toFixed(1)},${b.y0.toFixed(1)})${b.dead ? '✗' : '↘'}`);
if (own.length) console.log(`  自己城：${own.length} 塊沒了/離位 ${own.slice(0, 14).join(' ')}`);
console.log('  counts: ' + Object.keys(cnt).map((k) => k + '×' + cnt[k]).join(' '));
for (const e of evs) console.log('  ' + e);
