// node test/review2-sim/b_volley_one.js <關卡> <仰角（度）> <力道> [ult]
// 重現 b_volley_scan.js 找到的某一個瞄準：全新的城、第一回合、敵軍用這個角度和力道打一輪（沒有手抖）。印出爆炸落點、被打掉的磚、每個兵的下場。
const { load, KIND } = require('./lib');
const G = load({ extra: ['simAim', 'simFire', 'simSkill'] });
const { S, simInit, simStep, simAim, simFire, simSkill, MAT, WL, CS } = G;
const li = +process.argv[2] - 1, v = +process.argv[4], ult = process.argv.includes('ult');
// 角度用跟 b_volley_scan.js 一樣的累加方式取到同一個浮點數（差一點點結果就不一樣）
let ang = 0.10; { const want = +process.argv[3]; let best = ang, bd = 1e9; for (let a2 = 0.10; a2 <= 1.5; a2 += 0.03) { const d = Math.abs(a2 * 57.3 - want); if (d < bd) { bd = d; best = a2; } } ang = best; }
simInit(li, {}, 4242, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].ai = null;
let k = 0; while (!(S.phase === 'aim' && S.turn === 1) && S.state === 'play' && k++ < 3000) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
const st = S.st[0], t0 = S.time; const booms = [], dead = [], log = [];
S.on = (t, x, y, c, d, e, f) => { if (t === 'boom' && e === 1) booms.push(`${WL[d].id}@(${(x - st.x0).toFixed(1)},${y.toFixed(1)} row ${Math.floor(y / CS)})`); if (t === 'udie' && c === 0) log.push(`t=${(S.time - t0).toFixed(2)}s ${d}#${f} dies (${['hit', 'crush', '?', 'burn', 'fell', 'out'][e]})`); };
S.onKill = (b, by, kind) => { if (b.st === st && !b.frag && !b.prop) dead.push(`${(S.time - t0).toFixed(2)}s ${MAT[b.mat].k}(${b.cx},${b.cy}${b.cw > 1 || b.ch > 1 ? ' ' + b.cw + 'x' + b.ch : ''})/${kind === 6 ? 'impact' : KIND[kind]}`); };
S.onPin = (u, load, moved) => log.push(`t=${(S.time - t0).toFixed(2)}s burial ${u.type}#${u.slot} load ${load.toFixed(0)}${moved ? '' : ' (at its post)'}`);
const dmg = new Map(); S.onHurt = (u, d, by, kind) => { if (u.side === 0) { const m = dmg.get(u) || {}; m[KIND[kind]] = (m[KIND[kind]] || 0) + d; dmg.set(u, m); } };
if (ult) { S.team[1].ult.c = 100; simSkill(1, 'ult'); }
simAim(1, -Math.cos(ang) * v, Math.sin(ang) * v); simFire(1);
k = 0; while (S.state === 'play' && !(S.phase === 'aim' && S.turn === 0) && k++ < 3000) simStep(1 / 60);
console.log(`L${li + 1}, round 1, fresh castle; enemy fires ${ult ? 'an ULT volley' : 'one volley'} at ${process.argv[3]}° power ${v}. state after: ${S.state}`);
console.log('  explosions: ' + booms.join('  '));
console.log('  my blocks destroyed: ' + dead.join('  '));
for (const u of S.team[0].units) { const m = dmg.get(u) || {}; console.log(`  ${u.type}#${u.slot}: ${u.alive ? 'alive hp ' + u.hp.toFixed(0) + '/' + u.hpMax : 'DEAD'}  damage {${Object.keys(m).map((q) => q + ' ' + m[q].toFixed(0)).join(', ')}}`); }
for (const l of log) console.log('  ' + l);
