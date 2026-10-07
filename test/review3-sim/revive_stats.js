// node test/review3-sim/revive_stats.js <每關場數=40> [bot=casual] [只跑第幾關=0]
// 「援兵」天燈把倒下的兵救回來之後，他活得下來嗎？統計每一關兩邊各救回幾次、救回來 4 秒內又死掉幾次（怎麼死的、被放在哪裡）
const L = require('./lib'); const G = L.load('groundY');
const { S, simInit, simStep, LEVELS, BOTS, groundY } = G;
const N = +(process.argv[2] || 40), bot = process.argv[3] || 'casual', only = +(process.argv[4] || 0);
const HOW = ['hit', 'crushed', '?', 'burnt', 'fell out of the world', 'out of the castle'];
console.log(`src=${G.__dir} bot=${bot}`);
for (let li = 0; li < LEVELS.length; li++) {
  if (only && li !== only - 1) continue;
  const rev = [0, 0], again = [0, 0], ex = [], lant = { n: 0, by: [0, 0], troop: [0, 0] }; let overVoid = 0;
  for (let sd = 0; sd < N; sd++) {
    const seed = 303000 + sd * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    const pend = [];
    S.on = (t, a, b, c, d, e, f) => {
      if (t === 'revive') { rev[c]++; const u = S.team[c].units.find((q) => q.slot === d); const gy = groundY(a); if (gy < -100) overVoid++; pend.push({ side: c, slot: d, t: S.time, x: a, y: b, type: u.type, gy, air: b - (gy < -100 ? -999 : gy) }); }
      else if (t === 'udie') { const i = pend.findIndex((p) => p.side === c && p.slot === f && S.time - p.t < 4); if (i >= 0) { const p = pend[i]; again[c]++; pend.splice(i, 1); if (ex.length < 6) ex.push(`L${li + 1} seed${seed} r${S.round}: side${c} ${p.type}#${p.slot} revived at (${p.x.toFixed(1)},${p.y.toFixed(1)})${p.gy < -100 ? ' OVER THE VOID' : ''}, dead again ${(S.time - p.t).toFixed(1)}s later (${HOW[e]})`); } }
      else if (t === 'bonus') { lant.n++; lant.by[c]++; if (d === 'troop') lant.troop[c]++; }
    };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  }
  console.log(`L${li + 1}: ${N} games; lanterns taken: mine ${lant.by[0]}, enemy ${lant.by[1]}; revives: mine ${rev[0]}, enemy ${rev[1]}; dead again within 4s: mine ${again[0]}, enemy ${again[1]}; revived with no ground below: ${overVoid}`);
  for (const e of ex) console.log('     ' + e);
}
