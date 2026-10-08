// node test/log.js <關卡> [bot=casual] [seed=1] [diff=1]：跑一場自動對戰，印出每一回合發生的大事（誰倒了、機關、坍塌）
const G = require('./load')();
const { S, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const li = +process.argv[2] - 1, bot = process.argv[3] || 'casual', seed = +(process.argv[4] || 1), diff = +(process.argv[5] === undefined ? 1 : process.argv[5]);
simInit(li, {}, 9000 + seed * 7919 + li * 131, diff, { botA: BOTS[bot] });
const HOW = ['擊倒', '砸扁', '?', '燒死', '摔出場', '出城', '轟飛', '沖走'];
const log = [];
S.on = (t, a, b, c, d, e, f) => {
  const r = 'R' + S.round + (S.turn ? '敵' : '我');
  if (t === 'udie') log.push(`${r} ${c ? '敵' : '我'}#${f}${d}倒（${HOW[e]}）`);
  else if (['snap', 'tpop', 'leak', 'fuse', 'roll', 'reso', 'tilt', 'phase', 'reroll', 'bonus'].includes(t)) log.push(`${r} ${t}${c !== undefined && typeof c !== 'object' ? ':' + c : ''}`);
  else if (t === 'chain' && a >= 6) log.push(`${r} 坍塌×${a}`);
};
while (S.state === 'play' && S.round < 40) simStep(1 / 60);
console.log(`L${li + 1} ${LEVELS[li].name} ${bot} seed${seed}：${S.state} 第 ${S.round} 回合，我方 ${S.team[0].alive}/${S.team[0].units.length}、敵軍 ${S.team[1].alive}/${S.team[1].units.length}`);
console.log('  ' + log.join('\n  '));
