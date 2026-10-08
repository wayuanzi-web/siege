// node test/review7/realvolley.js <關卡> <兵位> <tx,ty> <tau> [秒數=30]
// 照真的回合流程：輪到我方時，用「某個兵瞄準 (tx,ty)、飛行 tau 秒」算出來的角度和力道，全隊一起開火（真的砲彈）。之後我方每輪都空放（mute），
// 敵軍 FOEMUTE=1 時也空放。印出換手、斷繩、天秤翻、兵倒、插銷，以及每次換手時天秤的角度和角速度
const G = require('../load')('PH, clampAim');
const { S, simInit, simStep, simAim, simFire, aimFor, simTrace, LEVELS } = G;
const li = +process.argv[2] - 1, slot = +process.argv[3], [tx, ty] = process.argv[4].split(',').map(Number), tau = +process.argv[5], T = +(process.argv[6] || 30);
simInit(li, {}, +(process.env.SEED || 1), 1, {}); S.team[0].ai = null;
if (process.env.FOEMUTE) S.team[1].mute = true;
const f1 = (v) => typeof v === 'number' ? v.toFixed(1) : String(v);
S.on = (t, a, b, c, d, e) => { if (['udie', 'snap', 'tilt', 'volley'].includes(t)) console.log(`${S.time.toFixed(2)} R${S.round} [${S.phase}/turn${S.turn}] ${t} ${f1(a)} ${f1(b)} ${c === undefined ? '' : f1(c)} ${d === undefined ? '' : f1(d)} ${e === undefined ? '' : f1(e)}`);
  if (t === 'turn') console.log(`${S.time.toFixed(2)} R${S.round} ---- turn side${a}` + (S.pivots[0] ? ` | beam ${(S.pivots[0].ang * 57.3).toFixed(2)}° w ${S.pivots[0].b ? S.pivots[0].b.body.getAngularVelocity().toFixed(3) : '-'} awake ${S.pivots[0].b ? S.pivots[0].b.body.isAwake() : '-'}` : '') + (S.pins.length ? ' | pins ' + S.pins.map((o) => o.broke ? 'broke' : ((o.b.body.getAngle() - o.a0) * o.droop * 57.3).toFixed(1) + '° awake ' + o.b.body.isAwake()).join(', ') : '')); };
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
const u = S.team[0].units.find((q) => q.slot === slot), v = aimFor(u.x + 1.3, u.y + 2.3, tx, ty, tau, S.wind, [0, 0]), a = G.clampAim(v[0], v[1], 1);
const R = simTrace(0, u.x + 1.3, u.y + 2.3, a[0], a[1], S.wind, S.time, 150);
console.log(`aim (${a[0].toFixed(1)},${a[1].toFixed(1)}) from #${slot} ${u.type}: trace hit ${R.hit} at (${R.x.toFixed(1)},${R.y.toFixed(1)})${R.rope ? ' rope ' + R.rope.tag : ''}`);
simAim(0, a[0], a[1]); simFire(0);
const t0 = S.time;
while (S.time - t0 < T && S.state === 'play') { if (S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.3) { S.team[0].mute = true; simFire(0); S.team[0].mute = false; } simStep(1 / 60); }
console.log(`end ${S.state} R${S.round}; enemy ` + S.team[1].units.map((q) => `#${q.slot}${q.alive ? '' : '✗'}`).join(' '));
