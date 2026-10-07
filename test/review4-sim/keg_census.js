// node test/review4-sim/keg_census.js [每關幾場=40] [bot=casual]
// 火藥桶（第四、六關）：每場爆幾桶、是被什麼引爆的（直接打中／旁邊爆炸、火燒到、撞擊太重、另一桶連環爆、整座城垮掉）、在誰的回合、炸死兩邊各幾個兵
const L = require('./lib4'); const H = {};
const G = L.load('', { hooks: H, patch: [
  ['if (o.mat === M_KEG) { if (dv > KEG_V) blockKill(', 'if (o.mat === M_KEG) { if (dv > KEG_V) { __H.kegWhy = "impact dv=" + dv.toFixed(0); } if (dv > KEG_V) blockKill('],
  ['if (b.mat === M_KEG) { blockKill(b, by, K_FIRE); return; }', 'if (b.mat === M_KEG) { __H.kegWhy = "fire"; blockKill(b, by, K_FIRE); return; }'],
  ['if (o.mat === M_KEG && w.id === \'keg\') { blockKill(o, side, kind); continue; }', 'if (o.mat === M_KEG && w.id === \'keg\') { __H.kegWhy = "chain"; blockKill(o, side, kind); continue; }'],
  ['  if (b.mat === M_KEG) S.pend.push(', '  if (b.mat === M_KEG && __H.keg) __H.keg(b, side, kind, clean); if (b.mat === M_KEG) S.pend.push(']
] });
const { S, simInit, simStep, BOTS } = G; const N = +(process.argv[2] || 40), bot = process.argv[3] || 'casual';
for (const li of [3, 5]) {
  const why = {}, when = {}; let games = 0, kegs = 0, killed = [0, 0], early = 0, firstRound = 0, sumChain = 0, chains = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 246000 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] }); games++; let lastT = -9, run = 0, seenR1 = false;
    H.keg = (b, side, kind, clean) => { if (S.state !== 'play') return; kegs++; const w = kind === 99 ? 'castle finale' : H.kegWhy || (clean ? 'removed (fell off the field)' : 'shot / blast'); H.kegWhy = ''; const k = w.replace(/dv=\d+/, ''); why[k] = (why[k] || 0) + 1; const ph = S.phase + '/' + S.turn; when[ph] = (when[ph] || 0) + 1; if (S.time < 1.2) early++; if (S.round === 1 && !seenR1) { seenR1 = true; firstRound++; } if (S.time - lastT < 0.5) run++; else { if (run) { sumChain += run + 1; chains++; } run = 0; } lastT = S.time; };
    H.kill = (u, side, how, ctx) => { if (S.state === 'play' && ctx === 'blast:keg') killed[u.side]++; };
    while (S.state === 'play' && S.round < 40) { H.kegWhy = H.kegWhy || ''; simStep(1 / 60); }
  }
  console.log(`L${li + 1} ${bot}: ${games} games, ${kegs} kegs went off during play (${(kegs / games).toFixed(1)}/game; before anyone fired: ${early}; games with a keg in round 1: ${firstRound}); cause ${JSON.stringify(why)}; phase/turn ${JSON.stringify(when)}; units killed by keg blasts: mine ${killed[0]}, foe ${killed[1]}; chains of 2+ within 0.5 s: ${chains} (mean ${(sumChain / Math.max(1, chains)).toFixed(1)} kegs)`);
}
