// H4：分出勝負之後模擬還在跑（砲彈、火、倒塌、毀滅光球都繼續），而結算（85-main finishLevel）是 4.2 秒後才讀
// teamBar(0) 和 S.stat.lost 來算星數。勝利那一刻到結算之間我方還會掉血、死兵，星數因此變少。
// 順便查：最後一擊造成的坍塌（S.chain）沒有記進 S.stat.chain（只有 endTurn 會記，贏的那一輪不會走到 endTurn）。
//   node test/review/h4_after_victory.js [seeds=10] [levels=1-6]
const G = require('./h')();
const { S, simInit, simStep, BOTS, LEVELS, teamBar } = G;
const NSEED = +(process.argv[2] || 10), m = (process.argv[3] || '1-6').split('-'), stars = (b, l) => (b >= 0.6 && !l ? 3 : b >= 0.3 ? 2 : 1);
let wins = 0, starDrop = 0, lostAfter = 0, barDrop = 0, chainMiss = 0, chainMissBig = 0; const ex = [], exC = [];
for (let li = +m[0] - 1; li <= +(m[1] || m[0]) - 1; li++) for (const bot of ['casual', 'expert', 'newbie']) for (let sd = 0; sd < NSEED; sd++) {
  const seed = 52000 + sd * 7919 + li * 131 + bot.length, diff = sd % 3, upL = (sd * 2) % 6;
  simInit(li, { dmg: upL, hp: upL, shield: upL, ult: upL }, seed, diff, { botA: BOTS[bot] });
  let chainNow = 0, turnNow = 0, phaseNow = '';
  while (S.state === 'play' && S.round < 45) { chainNow = S.chain; turnNow = S.turn; phaseNow = S.phase; simStep(1 / 60); }
  if (S.state !== 'won') continue;
  wins++;
  const at = { bar: teamBar(0), lost: S.stat.lost, alive: S.team[0].alive, chainStat: S.stat.chain, chain: Math.max(chainNow, S.chain) };
  while (S.endT < 4.2) simStep(1 / 60);
  const end = { bar: teamBar(0), lost: S.stat.lost, alive: S.team[0].alive };
  const s0 = stars(at.bar, at.lost), s1 = stars(end.bar, end.lost), tag = `L${li + 1} ${bot} seed=${seed} diff=${diff} up=${upL}`;
  if (end.lost > at.lost) lostAfter++;
  if (end.bar < at.bar - 0.02) barDrop++;
  if (s1 < s0) { starDrop++; if (ex.length < 6) ex.push(`${tag}: won during ${phaseNow}/turn ${turnNow}; at victory bar ${(at.bar * 100).toFixed(0)}% lost ${at.lost} (${s0}★) -> at payout bar ${(end.bar * 100).toFixed(0)}% lost ${end.lost} (${s1}★)`); }
  if (turnNow === 0 && at.chain >= 6 && at.chain > at.chainStat) { chainMiss++; if (at.chain >= 10) chainMissBig++; if (exC.length < 4) exC.push(`${tag}: winning volley collapsed ${at.chain} bricks, result screen will show chain=${at.chainStat}`); }
}
console.log(`wins: ${wins}`);
console.log(`  units lost AFTER the victory moment: ${lostAfter} games;  bar dropped >2 points after victory: ${barDrop} games;  STAR RATING reduced after victory: ${starDrop} games`);
for (const e of ex) console.log('    ' + e);
console.log(`  winning volley's chain (>=6) not recorded in S.stat.chain: ${chainMiss} games (${chainMissBig} with chain >= 10)`);
for (const e of exC) console.log('    ' + e);
