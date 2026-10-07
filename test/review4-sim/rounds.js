// node test/review4-sim/rounds.js <關卡 1-6> <場數=60> [bot=casual] [難度=1] [第幾份=0] [共幾份=1] [強化: 0 或 5]
// 各場打到分出勝負（最多 60 回合）：勝率、回合數分布、最久的幾場；順便看有沒有「這一輪沒有人開得了火」的回合
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, LEVELS, BOTS } = G;
const li = +(process.argv[2] || 1) - 1, N = +(process.argv[3] || 60), bot = process.argv[4] || 'casual', diff = +(process.argv[5] === undefined ? 1 : process.argv[5]), shard = +(process.argv[6] || 0), nsh = +(process.argv[7] || 1), upl = +(process.argv[8] || 0);
const up = upl ? { dmg: upl, aim: upl, hp: upl, shield: upl, ult: upl } : {};
let wins = 0, games = 0, unfinished = 0; const hist = {}, long = [], dud = [0, 0], vol = [0, 0];
const t00 = Date.now(); let secs = 0;
for (let sd = 0; sd < N; sd++) {
  if (sd % nsh !== shard) continue;
  const seed = 730000 + sd * 7919 + li * 131;
  simInit(li, up, seed, diff, { botA: BOTS[bot] }); games++;
  S.on = (t, a, b) => { if (t === 'volley') { vol[a]++; if (!b) dud[a]++; } };
  while (S.state === 'play' && S.round < 60) simStep(1 / 60);
  secs += S.time;
  if (S.state === 'won') wins++; else if (S.state === 'play') unfinished++;
  const r = S.round; hist[r] = (hist[r] || 0) + 1;
  long.push({ r, seed, st: S.state, me: S.team[0].alive, foe: S.team[1].alive, t: S.time, boss: S.boss ? S.boss.phase : 0, bhp: S.boss ? (() => { for (const u of S.team[1].units) if (u.type === 'boss') return (u.hp / u.hpMax).toFixed(2); })() : '' });
}
long.sort((a, b) => b.r - a.r);
console.log(`L${li + 1} ${bot} diff${diff} up${upl}: ${wins}/${games} won (${(100 * wins / games).toFixed(0)}%), unfinished at 60 rounds: ${unfinished}; mean game ${(secs / games).toFixed(0)}s sim time; ${((Date.now() - t00) / 1000).toFixed(0)}s wall`);
console.log('  rounds histogram: ' + Object.keys(hist).sort((a, b) => a - b).map((r) => r + ':' + hist[r]).join(' '));
console.log('  longest: ' + long.slice(0, 6).map((g) => `seed${g.seed} ${g.r}r ${g.st} me${g.me} foe${g.foe}${g.boss ? ' bossP' + g.boss + ' hp' + g.bhp : ''}`).join(' | '));
console.log(`  volleys where nobody could fire: mine ${dud[0]}/${vol[0]}, foe ${dud[1]}/${vol[1]}`);
