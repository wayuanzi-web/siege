// node test/review2-sim/e_icewall.js
// E（第三關提示）：「中間的冰牆擋住平射：把它轟倒，或是吊高越過去」。照著做：每一輪都平射冰牆（三種高度各試），敵軍不開火。
// 幾輪之後平射的砲彈過得去？牆還剩多高？
const { load } = require('./lib');
const G = load({ extra: ['simAim', 'simFire'] });
const { S, SH, simInit, simStep, simAim, simFire, MAT } = G;
for (const [vx, vy, label] of [[70, 12, 'flat & hard at the foot of the wall'], [60, 22, 'flat at the middle of the wall'], [48, 34, 'at the upper third of the wall']]) {
  simInit(2, {}, 11, 1, { mute: 1 }); S.team[0].ai = null;
  const wall = S.structs.find((st) => st.side === 2 && !st.loose), n0 = wall.blocks.length; const out = [];
  for (let rd = 1; rd <= 6 && S.state === 'play'; rd++) {
    while (!(S.phase === 'aim' && S.turn === 0) && S.state === 'play') simStep(1 / 60);
    simAim(0, vx, vy); let wallHits = 0, past = 0, booms = 0;
    S.on = (t, x, y, c, d, e) => { if (t === 'boom' && e === 0) { booms++; if (x > 49 && x < 63) wallHits++; else if (x >= 63) past++; } };
    simFire(0);
    while (!(S.phase === 'aim' && S.turn === 0) && S.state === 'play') simStep(1 / 60);
    let top = -9, alive = 0, inPlace = 0; for (const b of wall.blocks) { if (b.dead) continue; if (b.frag) continue; alive++; if (b.inPlace) inPlace++; const p = b.body.getPosition(); if (p.x > 49 && p.x < 63 && p.y + b.h / 2 > top) top = p.y + b.h / 2; }
    let rub = -9; for (const b of S.blocks) { if (b.dead) continue; const p = b.body.getPosition(); if (p.x > 49 && p.x < 63 && p.y + 1 > rub) rub = p.y + 1; }
    out.push(`r${rd}: ${wallHits}/${booms} shots stopped at the wall, ${past} got past; wall blocks left ${alive}/${n0} (${inPlace} in place), pile height ${Math.max(top, rub).toFixed(0)} (was 35)`);
  }
  console.log(`aim (${vx},${vy}) — ${label}:\n   ` + out.join('\n   '));
}
