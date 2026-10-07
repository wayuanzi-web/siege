// node test/review3-sim/rock_wall.js [關卡=4] [水平速度=-4] [秒數=40]
// 開局什麼都不打，只把敵城正面那一排最上面那塊（第四關是鐵甲）往外輕推一下（設定水平速度），然後看這一排的擺幅：
// 正常應該越晃越小、幾秒內停下來。每 0.5 秒印一次最上面那塊離原位多遠
const L = require('./lib'); const G = L.load();
const { S, PH, simInit, simStep, CS } = G;
const li = +(process.argv[2] || 4) - 1, kick = +(process.argv[3] || -4), T = +(process.argv[4] || 40);
simInit(li, {}, 1, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].ai = null;       // 兩邊都不開火
const st = S.st[1];
const col = S.blocks.filter((b) => b.st === st && !b.prop && b.cx === 0).sort((a, b) => a.cy - b.cy), top = col[col.length - 1];
console.log(`L${li + 1} front column: ` + col.map((b) => `#${b.id} m${b.mat} ${b.cw}x${b.ch} cy${b.cy} mass ${b.mass.toFixed(0)}`).join(' | ') + `   kick top block vx=${kick}  src=${G.__dir}`);
// 試修法（環境變數 FIX）：base = 城基的磚密度 ×4；iron = 鐵甲密度降到 1.6；iter = 求解次數加倍
if (process.env.FIX === 'base') for (const b of S.blocks) if (b.base) { b.body.getFixtureList().setDensity(4); b.body.resetMassData(); b.mass = b.body.getMass(); }
if (process.env.FIX === 'iron') for (const b of S.blocks) if (b.mat === 3) { b.body.getFixtureList().setDensity(1.6); b.body.resetMassData(); b.mass = b.body.getMass(); }
if (process.env.FIX === 'iter') G.__eval('physStep = (function (o) { return function (dt) { const w = PH.world, st = w.step; w.step = function (d) { return st.call(w, d, 16, 6); }; try { return o(dt); } finally { w.step = st; } }; })(physStep)');
// damp = 還在原位、動得很慢的磚加阻尼（像圓木桶那樣「快要停的時候讓它真的停下來」）
if (process.env.FIX === 'damp') G.__eval('physStep = (function (o) { return function (dt) { o(dt); for (const b of S.blocks) { if (b.dead || b.kind === "ball" || b.frag || !b.inPlace || !b.body.isAwake()) continue; const v = b.body.getLinearVelocity(), om = b.body.getAngularVelocity(); const slow = v.x * v.x + v.y * v.y < 9 && Math.abs(om) < 0.35; if (slow !== b.slowD) { b.slowD = slow; b.body.setLinearDamping(slow ? 2.5 : 0); b.body.setAngularDamping(slow ? 5 : 0.08); } } }; })(physStep)');
for (let i = 0; i < 80; i++) simStep(1 / 60);         // 過場
top.body.setLinearVelocity({ x: kick, y: 0 }); top.body.setAwake(true);
let peak = 0, peaks = [], dir = 0, lastD = 0, fell = -1, awakeEnd = 0, ke0 = 0;
function ke() { let e = 0; for (const b of S.blocks) { if (b.dead || b.st !== st) continue; const v = b.body.getLinearVelocity(), w = b.body.getAngularVelocity(); e += 0.5 * b.mass * (v.x * v.x + v.y * v.y) + 0.5 * b.body.getInertia() * w * w; } return e; }
ke0 = ke();
for (let i = 1; i <= T * 60; i++) {
  S.phase = 'aim'; S.turn = 0;                           // 停在我方瞄準，不讓回合往下走
  simStep(1 / 60);
  if (top.dead) { fell = i / 60; break; }
  const d = top.body.getPosition().x - top.x0;
  if (dir === 0) dir = d < lastD ? -1 : 1; else if ((d - lastD) * dir < -1e-4) { peaks.push(lastD.toFixed(2)); dir = -dir; }
  lastD = d;
  if (Math.abs(top.body.getAngle()) > 1.2 && fell < 0) { fell = i / 60; break; }
  if (i % 30 === 0 && process.env.V) console.log(`t=${(i / 60).toFixed(1)} top dx=${d.toFixed(2)} a=${top.body.getAngle().toFixed(3)} awake=${col.filter((b) => !b.dead && b.body.isAwake()).length} KE=${ke().toFixed(0)}`);
}
let aw = 0; for (const b of S.blocks) if (!b.dead && b.body.isAwake()) aw++;
console.log(`KE given ${ke0.toFixed(0)}; turning points of top block dx: ${peaks.slice(0, 40).join(' ')}${peaks.length > 40 ? ' …' : ''}`);
console.log(fell > 0 ? `=> the column FELL OVER at t=${fell.toFixed(1)}s` : `=> still standing after ${T}s; awake blocks at the end: ${aw}; top dx=${lastD.toFixed(2)}`);
