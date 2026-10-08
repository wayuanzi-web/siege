// node test/review7/turnend.js <關卡> "<武器>@x,y ; ..." [秒數=20]
// 照真的回合流程：我方「開火」（這一輪的砲彈直接在指定點炸開），之後不干預，讓回合自己結束、敵軍自己瞄準開火。
// 印出：回合什麼時候換手、嘎吱聲（超載）、磚碎、兵倒、繩斷 —— 看超載還在嘎吱作響的時候，回合是不是就先換人了
const G = require('../load')('PH, blockDist');
const { S, simInit, simStep, WPN, physExplode, LEVELS, MAT } = G;
const li = +process.argv[2] - 1, script = (process.argv[3] || '').split(';').map((x) => x.trim()).filter(Boolean), T = +(process.argv[4] || 20);
simInit(li, {}, +(process.env.SEED || 1), 1, {});
S.team[0].ai = null;               // 我方不自己打
if (process.env.FOEMUTE) S.team[1].mute = true;
const f1 = (v) => typeof v === 'number' ? v.toFixed(1) : String(v);
const log = []; const SHOW = new Set((process.env.SHOW || 'turn,creak,udie,snap,volley,tilt').split(','));
let creaks = 0;
S.on = (t, a, b, c, d, e, f) => { if (t === 'creak') { creaks++; if (creaks > 30) return; } if (t === 'cell' && (d === 0 || d === 1) && SHOW.has('cell')) { log.push(`${S.time.toFixed(2)} [${S.phase}/turn${S.turn}] cell side${d} mat${c} (${f1(a)},${f1(b)}) kind ${e}`); return; } if (SHOW.has(t)) log.push(`${S.time.toFixed(2)} [${S.phase}/turn${S.turn}] ${t} ${f1(a)} ${f1(b)} ${c === undefined ? '' : f1(c)} ${d === undefined ? '' : f1(d)} ${e === undefined ? '' : f1(e)}`); };
// 跳到我方瞄準
while (!(S.phase === 'aim' && S.turn === 0)) simStep(1 / 60);
// 開火（我方這一輪什麼都不射：mute），再在指定點炸開
S.team[0].mute = true; G.simFire(0); S.team[0].mute = false;
const t0 = S.time;
for (const s of script) { const m = s.match(/^(\w+)@([-\d.]+),([-\d.]+)$/); const x = +m[2], y = +m[3]; let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = G.blockDist(b, x, y); if (d < best) { best = d; hit = b; } } physExplode(x, y, WPN[m[1]], 0, 1, 0, hit, 1, 0); }
log.push(`${S.time.toFixed(2)} [${S.phase}/turn${S.turn}] *** 我方的砲彈炸開`);
while (S.time - t0 < T && S.state === 'play') { simStep(1 / 60); }
for (const l of log) console.log(l);
console.log(`state ${S.state}; 敵兵 ` + S.team[1].units.map((u) => `#${u.slot}${u.alive ? '' : '✗'}`).join(' '));
