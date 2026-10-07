// node test/review2-sim/f_revive.js
// F：天燈「援軍」把倒下的兵放回哪裡？城樓完好（房間、天花板都在）的情況下，每一個兵位各試一次：
//   把那個兵拿掉（killUnit）→ grantBonus(side, 'troop') → 看他出現在哪、之後 4 秒落在哪、有沒有受傷或出局。
const { load } = require('./lib');
const G = load();
const { S, simInit, simStep, LEVELS, killUnit, grantBonus, CS } = G;
for (const [li, side] of [[0, 0], [2, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]]) {
  const name = side ? LEVELS[li].foe.castle : LEVELS[li].me.castle; const rows = [];
  simInit(li, {}, 7, 1, {}); const n = S.team[side].units.length;
  for (let k = 0; k < n; k++) {
    simInit(li, {}, 7, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.team[0].mute = true; S.team[1].mute = true;
    while (S.phase !== 'aim') simStep(1 / 60);
    const u = S.team[side].units[k]; if (u.def.big) continue;
    const st = u.st; killUnit(u, 1 - side, 0);
    for (let i = 0; i < 30; i++) simStep(1 / 60);
    const log = []; S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && c === side) log.push('DIES (' + ['hit', 'crush', '?', 'burn', 'fell', 'out'][e] + ')'); };
    grantBonus(side, 'troop', 56, 40);
    const y0 = u.y, x0 = u.x;
    let minHp = u.hp; for (let i = 0; i < 300 && S.state === 'play'; i++) { simStep(1 / 60); if (u.alive && u.hp < minHp) minHp = u.hp; }
    const home = Math.abs(u.x - u.hx) < 0.6 && Math.abs(u.y - u.hy) < 0.6;
    rows.push(`   ${u.type}#${u.slot} home cell (${Math.floor((u.hx - st.x0) / CS)},${Math.round(u.hy / CS)}) y=${u.hy.toFixed(1)}: reappears at y=${y0.toFixed(1)} (${(y0 - u.hy).toFixed(1)} above its room floor) → after 5s ${u.alive ? `at (${(u.x - st.x0).toFixed(1)},${u.y.toFixed(1)}) ${home ? 'IN ITS ROOM' : 'NOT in its room (' + (u.y > u.hy + 2 ? 'standing on top of the castle, in the open' : 'elsewhere') + ')'}, hp ${u.hp.toFixed(0)}/${(u.hpMax * 0.7).toFixed(0)}` : log.join(' ')}`);
    S.on = null;
  }
  console.log(`L${li + 1} ${name} (side ${side}), castle intact, revive via lantern:`); for (const r of rows) console.log(r);
}
