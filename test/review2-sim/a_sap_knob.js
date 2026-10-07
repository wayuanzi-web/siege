// node test/review2-sim/a_sap_knob.js [場數=32]
// A6：敵軍 AI 的 sap 參數（「會去打牆腳和柱子的機率」）真的有作用嗎？第四、五、六關各用 sap = 0、原本的值、1 跑同樣的種子，
// 比：敵軍有幾輪是瞄「磚」的、我方勝率、我方損兵。
const { load, play, H } = require('./lib');
const N = +(process.argv[2] || 32);
for (const li of [3, 4, 5]) {
  const row = [];
  for (const sap of [0, null, 1]) {
    const G = load(); const lv = G.LEVELS[li]; const orig = lv.foe.ai.sap; if (sap !== null) lv.foe.ai.sap = sap;
    let wins = 0, blockVol = 0, vols = 0, lost = 0, rounds = 0;
    for (let sd = 0; sd < N; sd++) { const r = play(G, { li, seed: H.seed(9000, sd, li), bot: 'casual' }); if (r.state === 'won') wins++; lost += r.lostU; rounds += r.rounds; for (const v of r.vols) if (v.s === 1) { vols++; if (v.tg === 'block') blockVol++; } }
    row.push(`sap=${sap === null ? orig + ' (shipped)' : sap}: enemy volleys aimed at a wall/pillar ${blockVol}/${vols} (${(100 * blockVol / vols).toFixed(0)}%), I win ${wins}/${N}, lose ${(lost / N).toFixed(2)} units/game, ${(rounds / N).toFixed(1)} rounds`);
  }
  console.log(`L${li + 1}: ` + row.join('\n     '));
}
