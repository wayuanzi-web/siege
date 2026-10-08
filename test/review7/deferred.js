// node test/review7/deferred.js <關卡範圍> [自動玩家=casual] [場數=10] [seed0=5150]
// 換手的那一刻，有沒有「還在超載、正在嘎吱作響」的磚（sT > 0.22，下一輪砲擊一開始就會接著扣血、斷掉）。
// 也數：這些磚之後是在誰的回合斷掉的、那時候有沒有連帶倒兵
const G = require('../load')('PH');
const { S, simInit, simStep, LEVELS, BOTS, MAT } = G;
const rg = (process.argv[2] || '6-11').split('-').map(Number), bot = process.argv[3] || 'casual', N = +(process.argv[4] || 10), seed0 = +(process.argv[5] || 5150);
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1; let handoffs = 0, withOver = 0, brokeLater = 0, examples = [];
  for (let g = 0; g < N; g++) {
    const seed = seed0 + g * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    const pending = new Map();
    S.on = (t, a, b, c, d, e, f) => {
      if (t === 'turn') {
        handoffs++;
        const over = S.blocks.filter((q) => !q.dead && q.cap && q.sT > 0.22);
        if (over.length) { withOver++; for (const q of over) if (!pending.has(q)) pending.set(q, { turn: 1 - a, round: S.round }); if (examples.length < 4) examples.push(`seed ${seed} R${S.round}: hand-off to side${a} with ${over.length} overloaded: ` + over.slice(0, 3).map((q) => `${MAT[q.mat].k}(${q.x0.toFixed(1)},${q.y0.toFixed(1)}) side${q.side} hp${(100 * q.hp / q.hm).toFixed(0)}%`).join(' ')); }
      }
      if (t === 'cell' && f && pending.has(f)) { const p = pending.get(f); if (S.turn !== p.turn || S.round !== p.round) brokeLater++; pending.delete(f); }
    };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  }
  console.log(`L${L} ${LEVELS[li].name} [${bot}] ${N} games: ${withOver}/${handoffs} turn hand-offs happened while a member was still overloaded; ${brokeLater} of those members then broke in a later turn`);
  for (const s of examples) console.log('   ' + s);
}
