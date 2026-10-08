// node test/review7/turnend2.js <關卡> "<cut@#i | kill@x,y | 武器@x,y> ; ..." [秒數=25] [延遲秒=0]
// 跟 turnend.js 一樣照真的回合流程（我方開火、之後不干預），但可以剪繩子 / 打掉一塊磚；延遲：開火後幾秒才動手（模擬這一輪最後一發才打中）
const G = require('../load')('PH, blockDist, blockKill, ropeCut, K_CRUSH');
const { S, simInit, simStep, WPN, physExplode, LEVELS } = G;
const li = +process.argv[2] - 1, script = (process.argv[3] || '').split(';').map((x) => x.trim()).filter(Boolean), T = +(process.argv[4] || 25), delay = +(process.argv[5] || 0);
simInit(li, {}, +(process.env.SEED || 1), 1, {}); S.team[0].ai = null;
if (process.env.FOEMUTE) S.team[1].mute = true;
const f1 = (v) => typeof v === 'number' ? v.toFixed(1) : String(v);
S.on = (t, a, b, c, d, e, f) => { if (t === 'creak' && process.env.CREAK) { console.log(`${S.time.toFixed(2)} [${S.phase}/turn${S.turn}] creak (${f1(a)},${f1(b)}) ${f1(d)}`); return; } if (['turn', 'udie', 'snap', 'volley', 'tilt', 'yelp'].includes(t)) console.log(`${S.time.toFixed(2)} [${S.phase}/turn${S.turn} phaseT ${S.phaseT.toFixed(1)}] ${t} ${f1(a)} ${f1(b)} ${c === undefined ? '' : f1(c)} ${d === undefined ? '' : f1(d)} ${e === undefined ? '' : f1(e)}` + (t === 'turn' || t === 'volley' ? (S.pivots[0] && S.pivots[0].b ? ` | beam ${(S.pivots[0].ang * 57.3).toFixed(2)}° w ${S.pivots[0].b.body.getAngularVelocity().toFixed(3)} awake ${S.pivots[0].b.body.isAwake()}` : '') + (S.pins.length ? ' | pins ' + S.pins.map((o) => o.broke ? 'broke' : ((o.b.body.getAngle() - o.a0) * o.droop * 57.3).toFixed(1) + '° w ' + (o.b.body.getAngularVelocity() * o.droop).toFixed(3) + ' awake ' + o.b.body.isAwake()).join(', ') : '') : '')); };
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
S.team[0].mute = true; G.simFire(0); S.team[0].mute = false;
const t0 = S.time; let done = false;
const blockAt = (x, y) => { let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = G.blockDist(b, x, y); if (d < best) { best = d; hit = b; } } return hit; };
while (S.time - t0 < T && S.state === 'play') {
  if (!done && S.time - t0 >= delay) {
    done = true; console.log(`${S.time.toFixed(2)} [${S.phase}] *** act: ${script.join(' ; ')}`);
    for (const s of script) { let m = s.match(/^cut@#(\d+)$/); if (m) { G.ropeCut(S.ropes[+m[1]], 0, G.K_CRUSH, false); continue; } m = s.match(/^kill@([-\d.]+),([-\d.]+)$/); if (m) { const b = blockAt(+m[1], +m[2]); if (b) G.blockKill(b, 0, G.K_CRUSH); continue; } m = s.match(/^(\w+)@([-\d.]+),([-\d.]+)$/); if (m) physExplode(+m[2], +m[3], WPN[m[1]], 0, 1, 0, blockAt(+m[2], +m[3]), 1, 0); }
  }
  if (process.env.AUTOFIRE && S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.3) { S.team[0].mute = true; G.simFire(0); S.team[0].mute = false; }
  simStep(1 / 60);
}
console.log(`state ${S.state}; 敵兵 ` + S.team[1].units.map((u) => `#${u.slot}${u.alive ? '' : '✗'}`).join(' '));
