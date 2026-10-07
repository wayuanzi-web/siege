// node test/review3-sim/revive_void.js
// 第五關：防空弩站在伸出牆外的木板露台上，底下是雲海（沒有地面）。把露台打斷、防空弩掉下去之後，
// 敵軍打到「援兵」天燈（grantBonus(1, 'troop')）把他救回來：他會被放在哪裡？活得下來嗎？
const L = require('./lib'); const G = L.load('grantBonus, groundY, K_CRUSH');
const { S, PH, simInit, simStep, blockHurt, grantBonus, groundY, K_CRUSH, CS } = G;
simInit(4, {}, 11, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].ai = null;
const hold = (n) => { for (let i = 0; i < n; i++) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); } };
const log = []; S.on = (t, a, b, c, d, e, f) => { if (t === 'udie') log.push(`t=${S.time.toFixed(2)} udie side${c} ${d}#${f} how=${e} at (${a.toFixed(1)},${(b - 1.8).toFixed(1)})`); if (t === 'revive') log.push(`t=${S.time.toFixed(2)} revive side${c} slot${d} at (${a.toFixed(1)},${b.toFixed(1)})`); };
hold(30);
const flak = S.team[1].units.find((u) => u.type === 'flak'), st = S.st[1];
console.log(`flak home (${flak.hx.toFixed(1)},${flak.hy.toFixed(1)}); enemy castle x0=${st.x0} foundation fx0=${st.fx0} ; void ${JSON.stringify(S.voids)} ; groundY under the flak = ${groundY(flak.hx)}`);
// 把露台那一段木板打穿（最靠我方的那一格）
const beam = S.blocks.find((b) => b.st === st && b.seg && b.cy === 7);
console.log(`balcony beam: cells ${beam.cx}..${beam.cx + beam.cw - 1} row ${beam.cy}, seg hp ${beam.segM.toFixed(1)} each`);
blockHurt(beam, 1e4, K_CRUSH, 0, st.x0 + 0.5 * CS, beam.y0);
hold(240);
console.log(`after breaking the balcony cell: flak alive=${flak.alive}; kills stat=${S.stat.kills}`);
const kills0 = S.stat.kills;
grantBonus(1, 'troop', 56, 24);
console.log(`revived: alive=${flak.alive} at (${flak.x.toFixed(2)},${flak.y.toFixed(2)}), body at y=${flak.body ? flak.body.getPosition().y.toFixed(2) : '-'}`);
hold(240);
console.log(`4s later: flak alive=${flak.alive}; kills stat ${kills0} -> ${S.stat.kills}; enemy alive count ${S.team[1].alive}`);
for (const l of log) console.log('   ' + l);
