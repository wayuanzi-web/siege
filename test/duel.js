// node test/duel.js <場數> <bot> "關卡 hp dmg err [強化=0] [難度=1]" ...：只跑對打，一組一行（兩組兩組平行跑）
const { spawn } = require('child_process');
const N = +process.argv[2], bot = process.argv[3], cfgs = process.argv.slice(4);
const code = `
const G = require('./load')(); const { S, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const [li, bot, N, hp, dmg, err, upL, diff] = [+process.argv[1] - 1, process.argv[2], +process.argv[3], process.argv[4], process.argv[5], process.argv[6], +process.argv[7] || 0, process.argv[8] === undefined ? 1 : +process.argv[8]];
const lv = LEVELS[li]; if (hp !== '-') lv.foe.hp = +hp; if (dmg !== '-') lv.foe.dmg = +dmg; if (err !== '-') lv.foe.ai.err = +err;
const up = { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL }; let w = 0, r = 0, l = 0, lw = 0, bar = 0, st3 = 0, rw = 0, rl = 0, wipe = 0; const rs = [];
for (let sd = 0; sd < N; sd++) {
  simInit(li, up, 700 + sd * 7919 + li * 131, diff, { botA: BOTS[bot] });
  const per = {}; let mx = 0; S.on = (t, a, b, c) => { if (t === 'udie' && c === 0) { const k = S.round + ':' + S.turn; per[k] = (per[k] || 0) + 1; if (per[k] > mx) mx = per[k]; } };
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  const lost = S.team[0].units.length - S.team[0].alive; if (mx >= 3) wipe++;
  if (S.state === 'won') { w++; bar += S.endBar[0]; lw += lost; rw += S.round; if (S.endBar[0] >= 0.6 && !S.stat.lost) st3++; } else rl += S.round; r += S.round; l += lost; rs.push(S.round);
}
rs.sort((a, b) => a - b);
console.log('L' + (li + 1) + ' hp=' + lv.foe.hp + ' dmg=' + lv.foe.dmg + ' err=' + lv.foe.ai.err + (upL ? ' up' + upL : '') + (diff !== 1 ? ' diff' + diff : '') + ' [' + bot + ']  勝 ' + w + '/' + N + ' (' + Math.round(100 * w / N) + '%)  回合 ' + (r / N).toFixed(1) + '（最短 ' + rs[0] + '、中位 ' + rs[N >> 1] + '、最長 ' + rs[N - 1] + '；輸的平均 ' + (N - w ? (rl / (N - w)).toFixed(1) : '-') + '）  贏的時候損兵 ' + (w ? (lw / w).toFixed(1) : '-') + ' 城防 ' + (w ? Math.round(100 * bar / w) : '-') + '%  三星 ' + st3 + '  一輪倒三個以上 ' + wipe);`;
let i = 0, running = 0; const out = [];
function next() {
  while (running < 2 && i < cfgs.length) {
    const k = i++, a = cfgs[k].split(/\s+/); running++;
    const p = spawn(process.execPath, ['-e', code, a[0], bot, String(N), a[1] || '-', a[2] || '-', a[3] || '-', a[4] || '0', a[5] === undefined ? '1' : a[5]], { cwd: __dirname }); let o = '';
    p.stdout.on('data', (d) => o += d); p.stderr.on('data', (d) => process.stderr.write(d));
    p.on('close', () => { out[k] = o.trim(); running--; if (i >= cfgs.length && !running) console.log(out.join('\n')); else next(); });
  }
}
next();
