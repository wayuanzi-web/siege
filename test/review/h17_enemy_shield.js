// H17：最後一次改動替第三～六關的敵軍加了 skill（關卡說明寫的是「連珠砲集滿之後會拿來用的機率」），
// 但 aiReact() 也是看 A.skill > 0，所以敵軍現在會在「玩家放手開火的那一瞬間」開護城罩（機率 0.8 × skill），
// 把玩家那一整輪（包含剛上膛的連珠）全部擋掉。介面沒有任何提示，玩家也看不到敵軍的護罩集氣。
//   node test/review/h17_enemy_shield.js [seeds=4]
const G = require('./h')();
const { S, simInit, simStep, BOTS, LEVELS } = G;
const N = +(process.argv[2] || 4);
for (let li = 0; li < LEVELS.length; li++) {
  let games = 0, vol = 0, shielded = 0, absorbed = 0, fired = 0, ultVol = 0, ultShielded = 0, firstRound = 99;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 9100 + sd * 7919 + li * 131, 1, { botA: BOTS.casual }); games++;
    let cur = null;
    S.on = (t, a, b, c, d, e) => {
      if (t === 'volley' && a === 0) { cur = { sh: S.team[1].shield.on, ult: false }; vol++; if (cur.sh) { shielded++; if (S.round < firstRound) firstRound = S.round; } }
      if (t === 'ult' && c === 0) { ultVol++; if (S.team[1].shield.on) ultShielded++; }      // simFire 裡 aiReact 在 ev('ult') 之後才跑，所以這裡還沒開；下面補算
      if (t === 'shield' && c === 1 && S.phase === 'volley' && S.turn === 0 && cur === null) { /* 開罩事件比 volley 事件早 */ }
      if (t === 'shieldhit' && c === 1) absorbed++;
      if (t === 'fire' && c === 0) fired++;
    };
    let lastUltVolley = -1, vcount = 0;
    const on0 = S.on; S.on = (t, a, b, c, d, e) => { if (t === 'ult' && c === 0) lastUltVolley = vcount; if (t === 'volley' && a === 0) { if (lastUltVolley === vcount && S.team[1].shield.on) ultShielded++; vcount++; } on0(t, a, b, c, d, e); };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  }
  console.log(`L${li + 1} ${LEVELS[li].name} (foe.ai.skill=${LEVELS[li].foe.ai.skill || 0}): player volleys ${vol}, met by an instant enemy shield ${shielded} (${(100 * shielded / vol).toFixed(0)}%), earliest round ${firstRound === 99 ? '-' : firstRound}; player shots absorbed by enemy shield ${absorbed}; player ult volleys ${ultVol}, of which fully shielded ${ultShielded}`);
}
