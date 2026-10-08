// node test/review7/zaprock.js：L8 雷法師的雷打在岩簷「上面」（86.5, 40.9）：雷會不會穿過 3.4 格厚的岩石，劈到底下的銅鐘、鐵鍊、上殿的屋頂和兵
const G = require('../load')('PH, ropeEnds');
const { S, simInit, simStep, WPN, physExplode, MAT } = G;
simInit(7, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null;
S.phase = 'resolve'; S.turn = 0; S.round = 1;
const hp0 = new Map(S.blocks.map((b) => [b, b.hp])), r0 = S.ropes.map((r) => r.hp), u0 = S.units.map((u) => u.hp);
const x = +(process.argv[2] || 86.5), y = +(process.argv[3] || 40.9);
S.on = (t, a, b, c, d, e) => { if (t === 'zap') console.log(`zap bolt drawn from y=${(c).toFixed(1)} down to y=${b.toFixed(1)} (hit ${d ? 'blocks' : 'nothing'})`); };
physExplode(x, y, WPN.zap, 0, 1, 0, null, 0, -1);
console.log(`zap explodes at (${x},${y}) — the top surface of the rock ledge spans x 71.2-108.6 at y 40.8, its underside at 37.4`);
for (const b of S.blocks) if (hp0.has(b) && b.hp < hp0.get(b) - 0.01) { const p = b.body.getPosition(); console.log(`  block ${MAT[b.mat].k}${b.hang ? '(' + b.hang + ')' : ''} at (${p.x.toFixed(1)},${p.y.toFixed(1)}) lost ${(hp0.get(b) - b.hp).toFixed(1)} hp`); }
S.ropes.forEach((r, k) => { if (r.hp < r0[k] - 0.01) console.log(`  ${r.kind} ${r.tag} lost ${(r0[k] - r.hp).toFixed(1)} hp (now ${r.hp.toFixed(0)}/${r.hm.toFixed(0)})`); });
S.units.forEach((u, k) => { if (u.hp < u0[k] - 0.01 || u.stun) console.log(`  unit side${u.side} #${u.slot} at (${u.x.toFixed(1)},${u.y.toFixed(1)}) lost ${(u0[k] - u.hp).toFixed(1)} hp, stun ${u.stun}`); });
