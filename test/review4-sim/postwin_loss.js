// node test/review4-sim/postwin_loss.js <每關幾場=60> [bot=expert] [難度=1] [第幾份=0] [共幾份=1]
// 結算的星數看「有沒有兵倒下」（S.stat.lost），可是這個數字是垮城演出播完（約 4.2 秒真實時間、戰局裡約 2.6 秒）之後才讀的。
// 統計：贏的那一刻一個兵都沒倒、城防也夠三顆星，結果演出期間我方有兵倒下（星數因此掉成兩顆）的場數；是怎麼倒的
const L = require('./lib4'); const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, LEVELS, BOTS } = G;
const N = +(process.argv[2] || 60), bot = process.argv[3] || 'expert', diff = +(process.argv[4] === undefined ? 1 : process.argv[4]), shard = +(process.argv[5] || 0), nsh = +(process.argv[6] || 1);
const TAIL = 2.6;
for (let li = 0; li < LEVELS.length; li++) {
  let wins = 0, three = 0, robbed = 0, anyLate = 0, games = 0; const how = {}, ex = [];
  for (let sd = 0; sd < N; sd++) {
    if (sd % nsh !== shard) continue;
    const seed = 123000 + sd * 7919 + li * 131; simInit(li, {}, seed, diff, { botA: BOTS[bot] }); games++;
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
    if (S.state !== 'won') continue; wins++;
    const lost0 = S.stat.lost, bar = S.endBar[0], t0 = S.time, late = [];
    H.kill = (u, side, hw, ctx) => { if (u.side === 0) late.push(`${u.type}#${u.slot}:${ctx} +${(S.time - t0).toFixed(1)}s`); };
    for (let i = 0; i < TAIL * 60; i++) simStep(1 / 60);
    H.kill = null;
    const was3 = bar >= 0.6 && !lost0; if (was3) three++;
    if (S.stat.lost > lost0) { anyLate++; for (const l of late) { const k = l.split(':')[1].split(' ')[0]; how[k] = (how[k] || 0) + 1; } if (was3) { robbed++; if (ex.length < 4) ex.push(`seed${seed} won at t=${t0.toFixed(1)} r${S.round} with bar ${(bar * 100).toFixed(0)}% and no losses, then ${late.join(', ')}`); } }
  }
  console.log(`L${li + 1} ${bot} diff${diff}: ${wins}/${games} won; 3-star at the moment of victory: ${three}; a unit of mine died during the ${TAIL}s finale in ${anyLate} wins ${JSON.stringify(how)}; of the 3-star wins, ${robbed} drop to 2 stars because of that`);
  for (const e of ex) console.log('     ' + e);
}
