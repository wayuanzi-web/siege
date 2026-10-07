// node test/review3-sim/l4_wall_grid.js [砲彈=bomb] [秒數=30]
// 第四關：開局後在敵城每一格的中心各引爆一發（我方的砲），然後放 30 秒不再打。
// 看正面那一排鐵甲：有沒有倒、是不是爆炸過了 3 秒以上才倒、30 秒後是不是還在晃（鐵甲還醒著）
// SIEGE_SRC 可以換成舊版原始碼比較
const L = require('./lib'); const G = L.load();
const { S, PH, simInit, simStep, physExplode, WPN, CS } = G;
const wname = process.argv[2] || 'bomb', T = +(process.argv[3] || 30);
// FIX=damp：試一個修法 —— 還在原位、動得很慢的磚加阻尼（跟圓木桶「快要停的時候讓它真的停下來」同一招）
if (process.env.FIX === 'damp') G.__eval('physStep = (function (o) { return function (dt) { o(dt); for (const b of S.blocks) { if (b.dead || b.kind === "ball" || b.frag || !b.body.isAwake()) continue; const v = b.body.getLinearVelocity(), om = b.body.getAngularVelocity(); const slow = b.inPlace && v.x * v.x + v.y * v.y < 9 && Math.abs(om) < 0.35; if (slow !== !!b.slowD) { b.slowD = slow; b.body.setLinearDamping(slow ? 2.5 : 0); b.body.setAngularDamping(slow ? 5 : 0.08); } } }; })(physStep)');
let runs = 0, fellFast = 0, fellLate = 0, rocking = 0, calm = 0, wallHit = 0; const lateEx = [], rockEx = [], map = [];
simInit(3, {}, 3, 1, null);
const cols = S.st[1].cols, rows = S.st[1].rows, x0 = S.st[1].x0, y0 = S.st[1].y0;
for (let cy = rows; cy >= 0; cy--) {
  let line = '';
  for (let cx = -1; cx <= cols; cx++) {
    simInit(3, {}, 3, 1, null); S.team[1].ai = null; S.phase = 'resolve'; S.turn = 0; S.round = 1; runs++;
    const st = S.st[1], col = S.blocks.filter((b) => b.st === st && !b.prop && b.cx === 0 && b.mat === 3).sort((a, b) => a.cy - b.cy), top = col[col.length - 1];
    const x = x0 + (cx + 0.5) * CS, y = y0 + (cy + 0.5) * CS;
    physExplode(x, y, WPN[wname], 0, 1, 0, null, 0, -1);
    let fell = -1, direct = col.some((b) => b.dead);
    for (let i = 0; i < T * 60 && fell < 0; i++) {
      S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60);
      if (top.dead) { direct = true; break; }
      const p = top.body.getPosition(); if (Math.abs(top.body.getAngle()) > 0.5 || Math.abs(p.x - top.x0) > 5) fell = i / 60;
    }
    let ch = '.';
    if (direct) { wallHit++; ch = 'x'; }
    else if (fell >= 0 && fell <= 3) { fellFast++; ch = 'F'; }
    else if (fell > 3) { fellLate++; ch = 'L'; if (lateEx.length < 6) lateEx.push(`cell(${cx},${cy}) at (${x.toFixed(1)},${y.toFixed(1)}): toppled ${fell.toFixed(1)}s after the single blast`); }
    else if (top.body.isAwake()) { rocking++; ch = 'r'; const v = top.body.getLinearVelocity(); if (rockEx.length < 4) rockEx.push(`cell(${cx},${cy}): still awake after ${T}s, top plate dx=${(top.body.getPosition().x - top.x0).toFixed(2)} v=${Math.hypot(v.x, v.y).toFixed(2)}`); }
    else calm++;
    line += ch;
  }
  map.push(line);
}
console.log(`src=${G.__dir}  L4, one ${wname} per run at each grid cell of the enemy castle, then ${T}s of nothing (${runs} runs)`);
console.log(`iron face: toppled within 3s ${fellFast} | toppled LATER than 3s after the blast ${fellLate} | still rocking (awake) after ${T}s ${rocking} | at rest ${calm} | a plate itself destroyed ${wallHit}`);
console.log('map (enemy castle as seen on screen, front on the left; one character per blast position, top row first):  . at rest   r still rocking   L fell late   F fell at once   x plate destroyed');
for (const l of map) console.log('   ' + l);
for (const e of lateEx) console.log('   late: ' + e);
for (const e of rockEx) console.log('   rocking: ' + e);
