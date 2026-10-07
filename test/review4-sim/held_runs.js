// node test/review4-sim/held_runs.js [每關幾場=30] [bot=casual]
// 被凍住／電暈而「這一輪不能開火」：同一個兵最多連續幾輪動不了（設計上剛解凍的那一輪免疫，所以應該最多連續 1 輪）；
// 一整邊都開不了火的輪數；有武器的兵還活著、卻連續好幾輪沒開過火的情況
const L = require('./lib4'); const G = L.load('', { hooks: {}, tag: false, patch: [["if (u.frozen > 0 || u.stun > 0) { u.held = true; u.immune = true; ev('skip',", "if (u.frozen > 0 || u.stun > 0) { if (__H.held) __H.held(u); u.held = true; u.immune = true; ev('skip',"]] });
const { S, simInit, simStep, LEVELS, BOTS } = G; const H = G.__H; const N = +(process.argv[2] || 30), bot = process.argv[3] || 'casual';
for (let li = 0; li < LEVELS.length; li++) {
  let maxRun = [0, 0], held = [0, 0], vol = [0, 0], dud = [0, 0], maxDry = [0, 0]; const ex = [];
  for (let sd = 0; sd < N; sd++) {
    const seed = 369000 + sd * 7919 + li * 131; simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    const run = new Map(), dry = new Map(), heldNow = new Set(), firedNow = new Set();
    H.held = (u) => { heldNow.add(u); held[u.side]++; };
    S.on = (t, a, b, c, d, e) => {
      if (t === 'fire') { for (const u of S.team[c].units) if (u.slot === e) firedNow.add(u); }
      if (t === 'volley') {
        vol[a]++; if (!b) dud[a]++;
        for (const u of S.team[a].units) { if (!u.alive) continue; const r = heldNow.has(u) ? (run.get(u) || 0) + 1 : 0; run.set(u, r); if (r > maxRun[a]) { maxRun[a] = r; if (r >= 2) ex.push(`seed${seed} r${S.round} side${a} ${u.type}#${u.slot} held ${r} volleys in a row`); } }
        heldNow.clear();
      }
      if (t === 'turn') { const prev = 1 - a; for (const u of S.team[prev].units) { if (!u.alive || !u.w) continue; const r = firedNow.has(u) ? 0 : (dry.get(u) || 0) + 1; dry.set(u, r); if (r > maxDry[prev]) maxDry[prev] = r; } firedNow.clear(); }
    };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  }
  console.log(`L${li + 1} ${bot}: unit-volleys lost to freeze/stun: mine ${held[0]}, foe ${held[1]}; longest run for one unit: mine ${maxRun[0]}, foe ${maxRun[1]}; whole-side dud volleys: mine ${dud[0]}/${vol[0]}, foe ${dud[1]}/${vol[1]}; longest stretch an armed living unit went without firing (turns): mine ${maxDry[0]}, foe ${maxDry[1]}`);
  for (const e of ex.slice(0, 4)) console.log('     ' + e);
}
