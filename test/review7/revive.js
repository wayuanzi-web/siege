// node test/review7/revive.js <關卡> "<pk 指令>" <slot> [等幾秒=6]
// 先照 pk.js 的寫法把城打垮（例如打斷 L6 的竹樁讓樓子掉進河裡），等幾秒，再讓敵軍拿到天燈的「援兵」，看復活的兵放在哪裡、活不活得下來
const G = require('../load')('PH, ropeEnds, blockDist, blockKill, blockHurt, ropeCut, K_CRUSH, grantBonus, killUnit');
const { S, simInit, simStep, WPN, physExplode, LEVELS } = G;
const li = +process.argv[2] - 1, script = (process.argv[3] || '').split(';').map((x) => x.trim()).filter(Boolean), slot = +process.argv[4], W = +(process.argv[5] || 6);
const side = +(process.env.SIDE || 1);
simInit(li, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null;
const blockAt = (x, y) => { let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = G.blockDist(b, x, y); if (d < best) { best = d; hit = b; } } return hit; };
S.phase = 'resolve'; S.turn = 0; S.round = 1;
for (const s of script) {
  let m = s.match(/^kill@([-\d.]+),([-\d.]+)$/); if (m) { const b = blockAt(+m[1], +m[2]); if (b) G.blockKill(b, 0, G.K_CRUSH); continue; }
  m = s.match(/^cut@#(\d+)$/); if (m) { G.ropeCut(S.ropes[+m[1]], 0, G.K_CRUSH, false); continue; }
  m = s.match(/^(\w+)@([-\d.]+),([-\d.]+)$/); if (m) physExplode(+m[2], +m[3], WPN[m[1]], 0, 1, 0, blockAt(+m[2], +m[3]), 1, 0);
}
for (let i = 0; i < W * 60; i++) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); }
let u = S.team[side].units.find((q) => q.slot === slot);
// grantBonus 復活的是 units 陣列裡第一個倒下的：把其他倒下的先標成「活著但沒身體」不行，所以改成：只留 slot 這一個是倒下的（其他倒下的先跳過）
const deadOthers = S.team[side].units.filter((q) => !q.alive && q !== u);
if (u.alive) { G.killUnit(u, 1 - side, 0); console.log(`(slot ${slot} was still alive at (${u.x.toFixed(1)},${u.y.toFixed(1)}); killed it to test the revive)`); }
const order = S.team[side].units.slice(); S.team[side].units.sort((a, b) => (a === u ? -1 : b === u ? 1 : 0));
let rev = null; S.on = (t, a, b, c, d, e) => { if (t === 'revive') rev = { x: a, y: b }; if (t === 'udie' && c === side) console.log(`  ${S.time.toFixed(2)} revived unit died again: how ${['hit', 'crush', '', 'burn', 'abyss', 'out of castle', 'off field', 'water'][e]}`); };
S.phase = 'aim'; S.turn = side;
G.grantBonus(side, 'troop', 0, 0); S.team[side].units.length = 0; S.team[side].units.push(...order);
console.log(`revived slot ${slot} at (${u.x.toFixed(1)},${u.y.toFixed(1)}), home (${u.hx.toFixed(1)},${u.hy.toFixed(1)}); water surface ${S.water ? S.water.y : '—'}; ground there ${G.groundY(u.x).toFixed(1)}`);
// 照「砲擊進行中」再跑 3 秒（瞄準的時候規則不走，所以換成 resolve）
for (let i = 0; i < 180; i++) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); if (i % 30 === 29) console.log(`  t+${((i + 1) / 60).toFixed(1)}s ${u.alive ? `(${u.x.toFixed(1)},${u.y.toFixed(1)}) hp ${u.hp.toFixed(0)}${u.wet ? ' wet ' + u.wet.toFixed(2) : ''}` : 'dead'}`); }
