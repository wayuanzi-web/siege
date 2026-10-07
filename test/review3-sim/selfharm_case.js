// node test/review3-sim/selfharm_case.js <關卡> [場數=30] [回合=8]：我方不開火，找出敵城的磚第一次「離開原位」或受傷是什麼時候、被什麼弄的（附近的爆炸、是誰打的）
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, simFire, LEVELS, structBar, WL } = G;
const li = +process.argv[2] - 1, N = +(process.argv[3] || 30), R = +(process.argv[4] || 8);
let shown = 0;
for (let sd = 0; sd < N && shown < 4; sd++) {
  const seed = 91000 + sd * 7919 + li * 131;
  simInit(li, {}, seed, 1, { mute: 0 }); S.team[0].ai = null;
  const st = S.st[1], hp0 = new Map(); for (const b of st.blocks) hp0.set(b, b.hp);
  const booms = []; let found = false;
  S.on = (t, a, b, c, d, e, f) => { if (t === 'boom' && a > st.x0 - 15) booms.push(`r${S.round} t=${S.time.toFixed(1)} ${WL[d].id} by side${e} at (${a.toFixed(1)},${b.toFixed(1)}) r=${c}`); };
  let guard = 0;
  while (S.state === 'play' && S.round <= R && guard++ < 60 * 80 * R && !found) {
    if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60);
    for (const b of st.blocks) { if (b.frag || b.prop) continue; const h = hp0.get(b); if (h === undefined) continue; if (b.dead || !b.inPlace || b.hp < h - 0.01) {
      found = true; shown++; const p = b.dead ? { x: b.x, y: b.y } : b.body.getPosition();
      console.log(`L${li + 1} seed${seed} r${S.round} ${S.phase}/turn${S.turn} t=${S.time.toFixed(1)}: enemy block m${b.mat} ${b.cw}x${b.ch} c(${b.cx},${b.cy}) ${b.dead ? 'DESTROYED' : !b.inPlace ? `left its place (dx=${(p.x - b.x0).toFixed(2)} dy=${(p.y - b.y0).toFixed(2)} a=${b.body.getAngle().toFixed(2)})` : `damaged ${h.toFixed(0)} -> ${b.hp.toFixed(0)}`}; structBar=${structBar(1).toFixed(3)}`);
      console.log('    blasts near the enemy castle so far: ' + (booms.slice(-6).join(' | ') || 'none'));
      const aw = st.blocks.filter((q) => !q.dead && q.body.isAwake()).length; console.log(`    enemy castle bodies awake: ${aw}/${st.blocks.filter((q) => !q.dead).length}; shots in the air: ${G.SH.n} (side counts ${Array.from(G.SH.cnt)})`);
      break; } }
  }
}
if (!shown) console.log(`L${li + 1}: nothing happened to the enemy castle in ${N} games`);
