// node test/lanes.js [關卡] [秒數…]：列出每一種彈道（由平到高）會穿過什麼、打到什麼
//   .  砲口做不到     o  直接打中敵城     2 3 6…  穿過倍增符後打中（數字是倍數，>9 用 *）
//   x  被擋（赤門、冰牆、鏡子、結界）     -  沒打中     b  打到氣球/光球    ½ 折損
const G = require('./load')();
const { S, simInit, simStep, LEVELS, simTrace, aimFor, aimOk, teamBar } = G;
const arg = process.argv.slice(2), only = arg[0] ? +arg[0] - 1 : -1, times = arg.length > 1 ? arg.slice(1).map(Number) : [1, 14, 30];
const av = [0, 0];
function lanes(side) {
  const T = S.team[side], dir = T.dir, foe = S.team[1 - side];
  const out = [];
  for (const u of T.units) {
    if (!u.alive || !u.w) continue;
    const mx = u.x + dir * 1.3, my = u.y + 2.3;
    for (const tu of foe.units) {
      if (!tu.alive) continue;
      let s = '';
      for (let tau = 0.8; tau <= 3.61; tau += 0.1) {
        aimFor(mx, my, tu.x, tu.y + 1.9, tau, S.wind, av);
        if (!aimOk(av[0], av[1], dir)) { s += '.'; continue; }
        const R = simTrace(side, mx, my, av[0], av[1], S.wind);
        if (R.hit === 1) s += R.mult === 1 ? 'o' : R.mult < 1 ? '½' : R.mult > 9 ? '*' : String(Math.round(R.mult));
        else if (R.hit === 2) s += 'x'; else if (R.hit === 3) s += 'b'; else s += '-';
      }
      out.push(`    ${u.type.padEnd(6)}→ ${tu.type.padEnd(6)} ${s}`);
    }
  }
  return out;
}
for (let li = 0; li < LEVELS.length; li++) {
  if (only >= 0 && li !== only) continue;
  simInit(li, {}, 7, 1, null);
  for (const u of S.team[1].units) u.cool = 1e9;        // 敵軍不開火，只看幾何
  for (const u of S.team[0].units) u.cool = 1e9;
  S.team[1].ai = null;
  console.log(`\n=== L${li + 1} ${LEVELS[li].name}   (tau 0.8 → 3.6，左邊平射、右邊吊高)`);
  for (const t of times) {
    while (S.time < t) simStep(1 / 60);
    console.log(`  t=${t}s gates: ` + S.gates.map((g) => `${['藍', '赤', '金', '折'][g.owner]}×${g.mult}@(${g.x.toFixed(0)},${g.y.toFixed(0)})`).join(' '));
    console.log('   我方'); console.log(lanes(0).join('\n'));
    console.log('   敵方'); console.log(lanes(1).join('\n'));
  }
}
