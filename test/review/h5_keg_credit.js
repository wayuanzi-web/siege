// H5：火（火油兵、或穿過地火著火的砲彈）點爆的火藥桶，功勞算在「沒有人」頭上。
// ignite() 對火藥桶直接 blockKill(b, 2, K_FIRE)，所以那一桶的爆炸 side = 2：
//   不吃我方的傷害強化和決戰加成、不累積連珠、不算拆掉的磚（S.stat.cells）、T.dealt 不加。
// 同一發砲彈如果沒著火，走 blockHurt(…, side) → blockKill(b, side)，功勞就是我的。
const G = require('./h')();
const { S, simInit, simStep, physExplode, WPN, M_KEG } = G;
function run(flag, label) {
  simInit(3, { dmg: 5 }, 12345, 1, { mute: 1 });                 // 第四關（火山鐵寨，三桶火藥）；傷害強化 5 級
  while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
  const T = S.team[0], keg = S.st[1].blocks.find((b) => b.mat === M_KEG && !b.dead), p = keg.body.getPosition();
  const before = { ult: T.ult.c, cells: S.stat.cells, dealt: T.dealt, foeHp: S.team[1].units.reduce((s, u) => s + u.hp, 0), struct: S.st[1].hpNow };
  const sides = [];
  const push0 = S.pend.push.bind(S.pend);
  physExplode(p.x, p.y, WPN.rocket, 0, 1, flag, keg, 30, -30);   // 我方一發火箭直接命中火藥桶
  for (const e of S.pend) sides.push(e.side);
  let kegBooms = [];
  S.on = (t, a, b, c, d, e) => { if (t === 'boom' && G.WL[d].id === 'keg') kegBooms.push(e); };
  for (let i = 0; i < 360; i++) simStep(1 / 60);
  const after = { ult: T.ult.c, cells: S.stat.cells, dealt: T.dealt, foeHp: S.team[1].units.reduce((s, u) => s + (u.alive ? u.hp : 0), 0), struct: S.st[1].hpNow };
  console.log(`${label}: first keg explosion credited to side ${sides.join(',')}; all keg booms credited to sides [${kegBooms.join(',')}]`);
  console.log(`    ult charge +${(after.ult - before.ult).toFixed(1)}   bricks credited (stat.cells) +${after.cells - before.cells}   T.dealt +${(after.dealt - before.dealt).toFixed(0)}   enemy unit hp ${before.foeHp.toFixed(0)} -> ${after.foeHp.toFixed(0)}   enemy structure hp ${before.struct.toFixed(0)} -> ${after.struct.toFixed(0)}`);
  return after.ult - before.ult;
}
const a = run(0, 'plain rocket   ');
const b = run(G.F_FIRE, 'flaming rocket ');
console.log(b < a * 0.5 ? 'CONFIRMED: the same hit earns far less credit when the shot is on fire' : 'not reproduced');
