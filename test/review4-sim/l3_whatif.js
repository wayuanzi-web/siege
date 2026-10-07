// node test/review4-sim/l3_whatif.js [場數=60]
// 第三關、同一個固定角度（34°、力道 44）、同一批種子：目前的程式 vs 「把壓扁規則關掉」（只在記憶體裡改，不動 src），第一輪就贏的場數，以及第一輪敵兵各是怎麼死的
const L = require('./lib4'); const N = +(process.argv[2] || 60);
function run(name, patch) {
  const H = {}; const G = L.load('', { hooks: H, patch }); const { S, simInit, simStep, simAim, simFire } = G;
  let w1 = 0; const how = {};
  for (let sd = 0; sd < N; sd++) {
    simInit(2, {}, 5550000 + sd * 7919 + 2 * 131, 1, {});
    H.kill = (u, side, hw, ctx) => { if (u.side === 1 && S.state === 'play') { const k = u.type + ':' + ctx; how[k] = (how[k] || 0) + 1; } };
    let fired = false;
    while (S.state === 'play' && !(S.turn === 1 && S.phase === 'aim')) { if (S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.2 && !fired) { simAim(0, Math.cos(0.6) * 56, Math.sin(0.6) * 56); simFire(0); fired = true; } simStep(1 / 60); }
    if (S.state === 'won') w1++;
  }
  console.log(`${name}: won by the first volley ${w1}/${N} (${(100 * w1 / N).toFixed(0)}%); enemy deaths in that volley: ${Object.keys(how).sort().map((k) => k + ' ' + how[k]).join(', ')}`);
}
run('HEAD as is', []);
run('HEAD with the load-crush rule switched off (CRUSH_LOAD = 1e9)', [['const CRUSH_LOAD = 2.2;', 'const CRUSH_LOAD = 1e9;']]);
