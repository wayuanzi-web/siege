// 第 3 項：castleScan 每次看到一塊磚「原本在原位、現在不在」就 S.chain++。磚晃一下又回到原位再離開，會不會被重複算？
const G = require('./h')();
const { S, simInit, simStep, BOTS, LEVELS } = G;
let blocksLeft = 0, flaps = 0, maxFlap = 0, games = 0; const ex = [];
for (let li = 0; li < LEVELS.length; li++) for (let sd = 0; sd < 2; sd++) {
  simInit(li, {}, 4400 + sd * 97 + li, 1, { botA: BOTS.expert }); games++;
  const cnt = new Map(), was = new Map();
  while (S.state === 'play' && S.round < 25) {
    simStep(1 / 60);
    if ((S.frame & 3) !== 0) continue;
    for (const st of S.structs) { if (st.loose) continue; for (const b of st.blocks) { if (b.frag || b.prop) continue; const w = was.get(b); const now = !b.dead && b.inPlace; if (w === true && !now) { const k = (cnt.get(b) || 0) + 1; cnt.set(b, k); } was.set(b, now); } }
  }
  for (const [b, k] of cnt) { blocksLeft++; if (k > 1) { flaps += k - 1; if (k > maxFlap) maxFlap = k; if (ex.length < 4) ex.push(`L${li + 1}: mat${b.mat} ${b.cw}x${b.ch} at cell(${b.cx},${b.cy}) side${b.side} counted ${k} times`); } }
}
console.log(`${games} games: ${blocksLeft} bricks left their place; extra chain counts from bricks that returned and left again: ${flaps} (worst single brick: ${maxFlap}x)`);
for (const e of ex) console.log('   ' + e);
