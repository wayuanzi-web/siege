// node test/review8/chain.js：第八關（懸空寺）殿外端的鐵鍊、第九關後面那籃的鐵鍊、第十二關吊燈的鐵鍊：每種兵一輪（照它一輪打幾發）正中鐵鍊中點，要幾輪才斷
const G = require('../load')('PH, ropeEnds');
const { S, simInit, simStep, WPN, WL, physExplode, UNIT } = G;
for (const [li, tag] of [[7, 'stay'], [8, 'back'], [11, 'lamp']]) {
  for (const w of ['rocket', 'bolt', 'bomb', 'fire', 'zap', 'ice']) {
    simInit(li, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'resolve'; S.turn = 0; S.round = 1;
    const r = S.ropes.find((o) => o.side === 1 && o.tag === tag); if (!r) continue;
    const W = WPN[w]; let shots = 0;
    while (!r.cut && shots < 200) {
      const e = G.ropeEnds(r), x = (e[0] + e[2]) / 2, y = (e[1] + e[3]) / 2;
      if (W.r <= 0) { // 穿刺：直接射中繩子（模擬 ropeCross 那一段）
        const before = r.hp; require; // 用模擬自己的函式
        G.physExplode; // noop
        // ropeHurt 不在 load 的匯出裡：用一顆砲彈從旁邊飛過繩子
      }
      physExplode(x, y, W, 0, 1, 0, null, 1, 0); shots++;
      if (W.r <= 0) break;
    }
    const perVol = W.n || 1;
    console.log(`L${li + 1} ${tag} 鐵鍊 hp ${r.hm.toFixed(0)}  ${w.padEnd(6)}：${W.r <= 0 ? '（穿刺，另算）' : `正中 ${shots} 發才斷 ≈ ${Math.ceil(shots / perVol)} 輪（一輪 ${perVol} 發）`}`);
  }
}
