// 第 8 項：同一個接觸在同一步裡會不會被記兩次撞擊傷害（一般求解一次、連續碰撞 TOI 再一次）？
// 做法：自己再掛一組 pre-solve / post-solve（排在遊戲自己的後面），看 PH.impN 在同一步裡有沒有為同一個接觸多加一次。
const G = require('./h')();
const { S, PH, simInit, simStep, BOTS, LEVELS } = G;
let dup = 0, recs = 0, steps = 0, toiPre = 0;
for (let li = 0; li < LEVELS.length; li++) for (let sd = 0; sd < 2; sd++) {
  simInit(li, {}, 31 + sd * 1009 + li, 1, { botA: BOTS.expert });
  let lastStep = -1, lastN = 0; const seen = new Map(), preSeen = new Map();
  PH.world.on('pre-solve', (c) => { if (PH.stepId !== lastStep) { lastStep = PH.stepId; lastN = 0; seen.clear(); preSeen.clear(); } if (c._vs === PH.stepId) { const k = (preSeen.get(c) || 0) + 1; preSeen.set(c, k); if (k > 1) toiPre++; } });
  PH.world.on('post-solve', (c) => { if (PH.stepId !== lastStep) { lastStep = PH.stepId; lastN = 0; seen.clear(); preSeen.clear(); } if (PH.impN > lastN) { lastN = PH.impN; recs++; const k = (seen.get(c) || 0) + 1; seen.set(c, k); if (k > 1) { dup++; if (dup <= 5) { const a = c.getFixtureA().getUserData(), b = c.getFixtureB().getUserData(); console.log(`  L${li + 1} step ${PH.stepId}: same contact recorded ${k}x (A=${a ? (a.isBlock ? 'block mat' + a.mat + ' ' + a.kind : 'unit') : 'ground'}, B=${b ? (b.isBlock ? 'block mat' + b.mat + ' ' + b.kind : 'unit') : 'ground'}, bulletA=${c.getFixtureA().getBody().isBullet()}, bulletB=${c.getFixtureB().getBody().isBullet()})`); } } } });
  while (S.state === 'play' && S.round < 14) { simStep(1 / 60); steps++; }
}
console.log(`${steps} steps, ${recs} impact records, contacts flagged twice by pre-solve in one step: ${toiPre}, contacts RECORDED twice in one step: ${dup}`);
