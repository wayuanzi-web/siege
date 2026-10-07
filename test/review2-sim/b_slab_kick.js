// node test/review2-sim/b_slab_kick.js [關卡=4]
// B1 的機制：一發轟天砲打在我方城樓（P2）下層房間的正面牆 S(7,6) 上，上面那塊七格長的石板被爆炸「踢」得多快？
// 之後一步一步看：哪些支撐（牆、柱）是被爆炸直接打掉的、哪些是被彈起來又砸下去的石板壓碎的。
const { load } = require('./lib');
const G = load({ extra: ['WPN'] });
const { S, simInit, simStep, physExplode, rayShot, RAY, MAT, WPN, CS } = G;
const li = +(process.argv[2] || 4) - 1;
simInit(li, {}, 4242, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'resolve'; S.turn = 1; S.phaseT = 0; S.quietT = 0; S.round = 1;
const st = S.st[0], slab = st.blocks.find((b) => b.cy === 7 && !b.prop), wall = st.blocks.find((b) => b.cx === 7 && b.cy === 6 && !b.prop), u3 = S.team[0].units.find((u) => u.slot === 3);
const sup = st.blocks.filter((b) => !b.prop && ((b.cy === 6 && (b.cx === 1 || b.cx === 4 || b.cx === 7)) || (b.cy === 8 && (b.cx === 2 || b.cx === 6))));
console.log(`L${li + 1} P2: slab above the lower room = ${MAT[slab.mat].k} ${slab.cw}x${slab.ch}, mass ${slab.mass.toFixed(0)}, hp ${slab.hm.toFixed(0)}. its supports: ${sup.filter((b) => b.cy === 6).map((b) => `${MAT[b.mat].k}(${b.cx},${b.cy}) mass ${b.mass.toFixed(1)} hp ${b.hm.toFixed(0)}`).join(', ')}. unit ${u3.type}#3 hp ${u3.hp}`);
const log = [];
S.onKill = (b, by, kind) => { if (b.st === st && !b.frag && !b.prop) log.push(`   t=${(S.time - t0).toFixed(3)}s  ${MAT[b.mat].k}(${b.cx},${b.cy}) destroyed by ${kind === 6 ? 'IMPACT (crush) — hit by a moving block' : 'the blast itself'}`); };
S.onHurt = (u, d, by, kind) => { if (u === u3) log.push(`   t=${(S.time - t0).toFixed(3)}s  ${u.type}#3 takes ${d.toFixed(0)} (${['blast', 'pierce', 'heavy', 'fire', 'ice', 'zap', 'impact', 'dark'][kind]})`); };
S.onPin = (u, load, moved) => log.push(`   t=${(S.time - t0).toFixed(3)}s  burial check: ${u.type}#${u.slot} load ${load.toFixed(0)}${moved ? '' : ' (at its post)'}`);
const t0 = S.time;
const p = wall.body.getPosition(), hx = p.x + wall.w / 2, hy = p.y + 0.4;
physExplode(hx, hy, WPN.bomb, 1, 1, 0, wall, -40, 0);
const v = slab.body.getLinearVelocity(), om = slab.body.getAngularVelocity();
console.log(`one enemy bomb (×${S.team[1].dmg}) on the front face of stone(7,6) at (${(hx - st.x0).toFixed(1)}, ${hy.toFixed(1)}).  Immediately after the blast (before any physics step):`);
console.log(`   slab centre velocity (${v.x.toFixed(1)}, ${v.y.toFixed(1)}) u/s, spin ${om.toFixed(2)} rad/s → its front end moves at ${(v.y + om * slab.w / 2).toFixed(1)} u/s vertically, its BACK end at ${(v.y - om * slab.w / 2).toFixed(1)} u/s (negative = slamming down onto the back wall)`);
for (const b of st.blocks) { if (b.dead || b.prop) continue; const bv = b.body.getLinearVelocity(), sp = Math.hypot(bv.x, bv.y); if (sp > 4 && b !== slab) console.log(`   also kicked: ${MAT[b.mat].k}(${b.cx},${b.cy} ${b.cw}x${b.ch}) mass ${b.mass.toFixed(0)} → (${bv.x.toFixed(1)}, ${bv.y.toFixed(1)}) spin ${b.body.getAngularVelocity().toFixed(1)}`); }
let n = 0; while (S.state === 'play' && S.phase === 'resolve' && n++ < 900) simStep(1 / 60);
console.log(log.join('\n'));
console.log(`result: ${S.team[0].units.map((u) => u.type + '#' + u.slot + (u.alive ? ' hp ' + u.hp.toFixed(0) : ' DEAD')).join(', ')}`);
