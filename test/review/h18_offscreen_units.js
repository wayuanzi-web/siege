// H18：兵被炸出城樓之後，只要 x 還在 -30..142 之間就算活著（unitsStep），可是畫面只看得到大約 -9..121
// （手機 2.16:1 的橫向畫面大約 -15.5..127.5）。躲在畫面外的兵：看不到、照樣開火（我方的會打到自己城背面）、
// 也照樣算「守軍還沒全倒」。最糟的情況：敵方最後一個兵站在畫面外，玩家看不到要打誰。
//   node test/review/h18_offscreen_units.js [seeds=6] [levels=1-6]
const G = require('./h')();
const { S, simInit, simStep, BOTS, LEVELS } = G;
const NSEED = +(process.argv[2] || 6), m = (process.argv[3] || '1-6').split('-');
const XL = -15.5, XR = 127.5;            // 手機橫向（844×390）看得到的範圍；窄一點的畫面只到 -9..121
let games = 0, gOwn = 0, gFoe = 0, gAllFoe = 0, aimsBlind = 0; const ex = [];
for (let li = +m[0] - 1; li <= +(m[1] || m[0]) - 1; li++) for (const bot of ['casual', 'expert', 'newbie']) for (let sd = 0; sd < NSEED; sd++) {
  const seed = 61000 + sd * 7919 + li * 131 + bot.length, diff = sd % 3;
  simInit(li, {}, seed, diff, { botA: BOTS[bot] }); games++;
  let own = 0, foe = 0, allFoe = 0, blindAims = 0, lastAimKey = '', note = '';
  while (S.state === 'play' && S.round < 45) {
    simStep(1 / 60);
    if ((S.frame & 7) !== 0) continue;
    const off = (u) => u.alive && (u.x < XL || u.x > XR) && Math.abs(u.vx) + Math.abs(u.vy) < 1;
    let o0 = 0, o1 = 0, a1 = 0; for (const u of S.team[0].units) if (off(u)) o0++; for (const u of S.team[1].units) { if (u.alive) a1++; if (off(u)) o1++; }
    if (o0) own += 8 / 60; if (o1) foe += 8 / 60;
    if (S.phase === 'aim' && S.turn === 0) {
      const key = 'r' + S.round;
      // 魔王關只看魔王；其他關：敵方活著的兵全部在畫面外
      const blind = S.boss ? off(G.bossUnit()) : (a1 > 0 && o1 === a1);
      if (blind && key !== lastAimKey) { lastAimKey = key; blindAims++; if (!note) { const u = S.team[1].units.find((u) => off(u)); note = `round ${S.round}: every living enemy is off-screen (e.g. ${u.type} at x=${u.x.toFixed(1)}, y=${u.y.toFixed(1)}, hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)})`; } }
    }
  }
  if (own > 1) gOwn++; if (foe > 1) gFoe++; if (blindAims) { gAllFoe++; aimsBlind += blindAims; if (ex.length < 6) ex.push(`L${li + 1} ${bot} seed=${seed} diff=${diff}: ${note}; player had ${blindAims} aim phase(s) with nothing visible to shoot at; result ${S.state} r${S.round}`); }
}
console.log(`${games} games (visible x taken as ${XL}..${XR}):`);
console.log(`  a living player unit rested off-screen for >1 s: ${gOwn} games;  a living enemy unit rested off-screen for >1 s: ${gFoe} games`);
console.log(`  player had to aim while EVERY living enemy (or the boss) was off-screen: ${gAllFoe} games, ${aimsBlind} aim phases`);
for (const e of ex) console.log('    ' + e);
