// node test/review8/l8upper.js：第八關只打斷上面那間殿的鐵鍊（x 75.1），上面那間掉下來會不會把下面那條鐵鍊也繃斷（輸了的訣竅這樣講）
const G = require('../load')('PH, ropeEnds, ropeHurt');
const { S, simInit, simStep, WPN } = G;
for (const seed of [1, 2, 3, 4, 5]) {
  simInit(7, {}, seed, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'resolve'; S.turn = 0; S.round = 1;
  const ev = []; S.on = (t, a, b, c, d, e, f) => { if (t === 'snap') ev.push(`${S.time.toFixed(1)}s snap ${e}${c ? '(鐵)' : ''}@${a.toFixed(1)},${b.toFixed(1)}`); if (t === 'udie') ev.push(`${S.time.toFixed(1)}s E#${f} die ${e}`); };
  const up = S.ropes.find((r) => r.tag === 'stay' && Math.abs(G.ropeEnds(r)[0] - 75.1) < 0.3);
  G.ropeHurt(up, 999, 2, 0);
  for (let i = 0; i < 8 * 60; i++) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); }
  const low = S.ropes.find((r) => r.tag === 'stay' && Math.abs(r.cx[0] - 71.7) < 0.3 || (r.tag === 'stay' && !r.cut && Math.abs(G.ropeEnds(r)[0] - 71.7) < 0.5));
  console.log(`seed ${seed}: 下面那條鐵鍊 ${S.ropes.filter((r) => r.tag === 'stay' && r.cut).length === 2 ? '也斷了' : '還在'}；插銷 ${S.pins.map((o) => o.broke ? '斷' : '在').join('/')}；${ev.join('  ')}`);
}
