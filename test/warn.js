// node test/warn.js [場數=16]：敵軍回合的預警（「敵軍的砲彈會穿過倍增符：×N」）準不準：有預警的那幾輪真的有穿過嗎？沒預警的有沒有漏掉？
const G = require('./load')(); const { S, simInit, simStep, LEVELS, BOTS } = G;
const N = +(process.argv[2] || 16);
for (let li = 1; li < 6; li++) {
  let turns = 0, warn = 0, warnHit = 0, silentHit = 0, wrongN = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 31000 + sd * 7919 + li * 131, 1, { botA: BOTS.casual });
    let cur = null;
    S.on = (t, a, b, c, d, e) => {
      if (t === 'volley' && a === 1) { cur = { warn: S.team[1].ai.warn, passed: 0, any: b }; }
      else if (t === 'gate' && e === 1 && cur) cur.passed = Math.max(cur.passed, c);
      else if (t === 'turn' && cur) { turns++; const w = cur.warn >= 2; if (w) { warn++; if (cur.passed >= 2) warnHit++; } else if (cur.passed >= 2) silentHit++; cur = null; }
    };
    while (S.state === 'play' && S.round < 30) simStep(1 / 60);
  }
  console.log(`L${li + 1} ${LEVELS[li].name}: 敵軍 ${turns} 輪；有預警 ${warn} 輪，其中真的有砲彈穿過符 ${warnHit} 輪（${warn ? Math.round(100 * warnHit / warn) : '-'}%）；沒預警卻穿過 ${silentHit} 輪`);
}
