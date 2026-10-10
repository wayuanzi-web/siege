// node test/why.js <關卡 1-12> [自動玩家=casual] [場數=8]：每一場怎麼結束的 —— 哪一邊輸（城破／守軍全倒）、雙方各倒了誰、怎麼倒的（擊倒／砸扁／燒／摔出場／出城）、第幾回合
const G = require('./load')(); const { S, simInit, simStep, LEVELS, BOTS } = G;
const li = +process.argv[2] - 1, bot = process.argv[3] || 'casual', N = +(process.argv[4] || 8);
const HOW = ['擊倒', '砸扁', '?', '燒', '摔出場', '出城', '轟飛', '被水沖走'];
const tot = { 0: {}, 1: {} };
for (let sd = 0; sd < N; sd++) {
  simInit(li, {}, 9000 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] });
  const log = []; let end = '';
  S.on = (t, x, y, c, d, e, f) => { if (t === 'end') end = (c ? '敵' : '我') + (d === 2 ? '城破' : '全倒'); if (t === 'udie') { const k = d + ' ' + HOW[e]; log.push(`R${S.round}${c ? '敵' : '我'}#${f}${d}:${HOW[e]}`); tot[c][k] = (tot[c][k] || 0) + 1; } };
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  console.log(`#${sd} ${S.state} ${end} ${S.round}回合  ${log.join(' ')}`);
}
for (const s of [0, 1]) console.log((s ? '敵軍' : '我方') + '倒下：' + Object.keys(tot[s]).sort((a, b) => tot[s][b] - tot[s][a]).map((k) => k + '×' + tot[s][k]).join('、'));
