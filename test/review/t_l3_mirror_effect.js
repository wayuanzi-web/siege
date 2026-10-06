// 第三關的冰鏡：我方吊高的砲彈（尤其是穿過倍增符散開的那幾發）常常被敵城上空的鏡子彈回來炸自己的城。
// 量一下：有鏡子 vs 把鏡子拿掉，自動玩家的勝率、勝利時的城防、每場被自己砲彈炸到幾次。
const G = require('./h')();
const { S, SH, simInit, simStep, BOTS, teamBar, RAY } = G;
const N = +(process.argv[2] || 6);
for (const mirrors of [true, false]) {
  let wins = 0, games = 0, bar = 0, selfHits = 0, foeSelf = 0, rounds = 0;
  for (const bot of ['casual', 'expert']) for (let sd = 0; sd < N; sd++) {
    simInit(2, {}, 31000 + sd * 7919 + bot.length, 1, { botA: BOTS[bot] }); games++;
    if (!mirrors) S.objs = S.objs.filter((o) => o.t !== 'mirror');
    S.on = (t, x, y, r, wi, side) => { if (t === 'boom' && RAY.x === x && RAY.y === y && RAY.o && RAY.o.isBlock && RAY.o.side === side && (side === 0 || side === 1)) { let wild = false; for (let i = 0; i < SH.n; i++) if (SH.side[i] === side && (SH.flag[i] & G.F_WILD) && Math.hypot(SH.x[i] - x, SH.y[i] - y) < 2.2) wild = true; if (wild) { if (side === 0) selfHits++; else foeSelf++; } } };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
    if (S.state === 'won') { wins++; bar += teamBar(0); } rounds += S.round;
  }
  console.log(`L3 ${mirrors ? 'with mirrors (as shipped)' : 'mirrors removed        '}: bot wins ${wins}/${games}, avg rounds ${(rounds / games).toFixed(1)}, avg bar when winning ${wins ? (100 * bar / wins).toFixed(0) : '-'}%, player shots bounced onto the player's own bricks: ${(selfHits / games).toFixed(1)} per game, enemy shots bounced onto enemy bricks: ${(foeSelf / games).toFixed(1)} per game`);
}
