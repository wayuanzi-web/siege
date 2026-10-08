// node test/table.js [場數=8] [強化等級=0] [難度=1] [關卡 例 7-12]：各關 × 三種自動玩家的勝率表
const { execFileSync, spawn } = require('child_process');
const N = +(process.argv[2] || 8), up = +(process.argv[3] || 0), diff = process.argv[4] || '1';
const NL = require('./load')().LEVELS.length, rg = (process.argv[5] || '1-' + NL).split('-').map(Number), L0 = rg[0] - 1, L1 = (rg[1] || rg[0]) - 1;
const code = `
const G = require('./load')(); const { S, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const [li, bot, N, upL, diff] = [+process.argv[1], process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5]];
const up = { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL }; let w = 0, r = 0, l = 0, bar = 0, t = 0, st3 = 0;
for (let sd = 0; sd < N; sd++) { simInit(li, up, 9000 + sd * 7919 + li * 131, diff, { botA: BOTS[bot] }); while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  const lost = S.team[0].units.length - S.team[0].alive; if (S.state === 'won') { w++; bar += teamBar(0); if (teamBar(0) >= 0.6 && !S.stat.lost) st3++; } r += S.round; l += lost; t += S.time; }
console.log(JSON.stringify({ li, bot, w, r: r / N, l: l / N, bar: w ? bar / w : 0, t: t / N, st3 }));`;
const BS = (process.env.BOTS || 'newbie,casual,expert').split(',');
const jobs = []; for (let li = L0; li <= L1; li++) for (const bot of BS) jobs.push([li, bot]);
const res = {}; let running = 0, idx = 0;
function next() { while (running < (+process.env.J || 6) && idx < jobs.length) { const [li, bot] = jobs[idx++]; running++; const p = spawn(process.execPath, ['-e', code, String(li), bot, String(N), String(up), diff], { cwd: __dirname }); let out = ''; p.stdout.on('data', (d) => out += d); p.stderr.on('data', (d) => process.stderr.write(d)); p.on('close', () => { try { const o = JSON.parse(out); res[o.li + o.bot] = o; } catch (e) { console.error('bad', out); } running--; if (idx >= jobs.length && !running) done(); else next(); }); } }
function done() {
  console.log(`強化 ${up} 級、難度 ${diff}、每格 ${N} 場：勝場 / 平均回合 / 平均損兵 / 勝時城防 / 三星場數 / 每場秒數`);
  for (let li = L0; li <= L1; li++) console.log(`L${li + 1} ` + BS.map((b) => { const o = res[li + b]; return o ? `${b} ${o.w}/${N} ${o.r.toFixed(1)}r -${o.l.toFixed(1)} ${(o.bar * 100).toFixed(0)}% ★${o.st3} ${o.t.toFixed(0)}s` : b + ' ?'; }).join('   |   '));
}
next();
