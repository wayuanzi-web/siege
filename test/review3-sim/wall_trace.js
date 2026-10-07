// node test/review3-sim/wall_trace.js <soak 場次 g> [追到第幾回合=2]：追蹤敵城正面那一排（最靠我方那一行格子）的磚，每 0.25 秒印一次位置、角度、速度，連同這段時間的爆炸
const L = require('./lib'); const G = L.load();
const { S, SH, PH, simInit, simStep, BOTS, CS } = G;
const g = +process.argv[2], maxR = +(process.argv[3] || 2);
const BN = ['newbie', 'casual', 'expert'];
const li = g % 6, bot = BN[(g / 6 | 0) % 3], diff = (g / 18 | 0) % 3, upOn = (g / 54 | 0) % 2, seed = 9176 + g * 100003;
simInit(li, upOn ? L.UPMAX : {}, seed, diff, { botA: BOTS[bot] });
const st = S.st[1];
const col = S.blocks.filter((b) => b.st === st && !b.prop && b.cx === 0).sort((a, b) => a.cy - b.cy);
console.log(`g${g} L${li + 1} ${bot}: front column blocks: ` + col.map((b) => `#${b.id} m${b.mat} ${b.cw}x${b.ch} cy${b.cy} mass ${b.mass.toFixed(0)} hp ${b.hp.toFixed(0)}`).join(' | '));
const booms = [];
S.on = (t, a, b, c, d, e, f) => { if (t === 'boom' && a > st.x0 - 12) booms.push(`boom(${a.toFixed(1)},${b.toFixed(1)} r${c} w${G.WL[d].id} side${e})`); if (t === 'cell' && d === 1) booms.push(`cell(${a.toFixed(1)},${b.toFixed(1)} m${c})`); if (t === 'volley') booms.push(`VOLLEY side${a}`); };
let last = '';
while (S.state === 'play' && S.round <= maxR) {
  simStep(1 / 60);
  if (S.frame % 15 === 0) {
    const line = col.map((b) => b.dead ? 'dead' : `${(b.body.getPosition().x - b.x0).toFixed(2)},${(b.body.getPosition().y - b.y0).toFixed(2)},${b.body.getAngle().toFixed(3)}${b.body.isAwake() ? '' : 'z'}`).join(' | ');
    if (line !== last || booms.length) console.log(`t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn} ${S.phaseT.toFixed(1)}: ${line}  ${booms.join(' ')}`);
    last = line; booms.length = 0;
  }
}
