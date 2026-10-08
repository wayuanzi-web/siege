// node test/review5-sim/roof_crush_case.js [seed=282306] [level=6]
// 重播 first_death 找到的那一場（我方不開火，敵軍打第一輪）：頂樓的兵被自己的屋瓦「壓扁」。印出屋瓦和他的狀態
const L = require('./lib5'); const H = {}; const G = L.load('', H);
const { S, simInit, simStep, simFire } = G; const seed = +(process.argv[2] || 282306), li = +(process.argv[3] || 6) - 1;
simInit(li, {}, seed, 1, { mute: 0 }); S.team[0].ai = null;
const u = S.team[0].units[0], st = S.st[0], roofs = st.blocks.filter((b) => b.mat === G.M_ROOF);
let nRoof = 0; H.roof = (unit, roof, r, k) => { nRoof++; console.log(`   [${S.time.toFixed(2)}] ROOF RULE fired on ${unit.type}#${unit.slot}: roof ${roof.cw}w vn=${r.vn.toFixed(1)}`); };
H.hurt = (k, d, sd, kind, ctx) => { if (k === u && ctx !== 'load') console.log(`   [${S.time.toFixed(2)}] hurt ${d.toFixed(1)} by ${ctx}`); };
H.kill = (k, sd, how, ctx) => { if (k === u) console.log(`   [${S.time.toFixed(2)}] KILLED by ${ctx}`); };
let n = 0, guard = 0;
while (S.state === 'play' && S.round <= 1 && guard++ < 60 * 40) {
  if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); n++;
  if (S.time > 4.2 && n % 6 === 0 && u.alive) console.log(`t=${S.time.toFixed(2)} ${S.phase}/${S.turn} unit y=${u.y.toFixed(2)} head=${(u.y + u.bh).toFixed(2)} hp=${u.hp.toFixed(0)} load=${u.load.toFixed(2)} loadT=${u.loadT.toFixed(2)} ${u.body.isAwake() ? 'awake' : 'asleep'} | roofs: ${roofs.map((b) => (b.dead ? b.cw + 'w dead' : `${b.cw}w y=${b.body.getPosition().y.toFixed(2)} bottom=${(b.body.getPosition().y - b.h / 2).toFixed(2)} a=${b.body.getAngle().toFixed(2)} vy=${b.body.getLinearVelocity().y.toFixed(1)} M${b.mass.toFixed(0)}`)).join(' ; ')} | walls on his floor: ${st.blocks.filter((b) => !b.dead && !b.frag && b.mat !== G.M_ROOF && Math.abs(b.y0 - (u.hy + 1.7)) < 0.5).map((b) => `x${b.body.getPosition().x.toFixed(1)}/a${b.body.getAngle().toFixed(2)}`).join(' ')}`);
}
console.log(`roof rule fired ${nRoof} times; unit alive=${u.alive}`);
