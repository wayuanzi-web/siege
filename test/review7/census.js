// node test/review7/census.js <關卡範圍 例 6-12> [自動玩家=casual] [場數=6] [seed0=777]
// 每一場照真的打（自動玩家 vs 敵軍 AI），記下：
//   每一輪瞄的是什麼（兵、磚、繩子、要害、天燈…）、砲彈炸在哪裡（自己城、對方城、中立石碑、深谷、水、空地）
//   自己打自己：開火那一邊自己的磚被自己的爆炸直接打掉、自己的兵在自己那一輪倒下、自己的繩子在自己那一輪斷、天秤在自己那一輪翻
//   回合有多長（resolve 階段幾秒）、有沒有撞到 9 秒／14 秒的上限
const G = require('../load')('PH');
const { S, simInit, simStep, LEVELS, BOTS, MAT, groundY } = G;
const rg = (process.argv[2] || '6-12').split('-').map(Number), bot = process.argv[3] || 'casual', N = +(process.argv[4] || 6), seed0 = +(process.argv[5] || 777);
const KN = ['blast', 'pierce', 'heavy', 'fire', 'ice', 'zap', 'crush', 'dark'];
const verbose = !!process.env.V;
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1;
  const agg = { games: 0, won: 0, rounds: 0, volleys: [0, 0], booms: [{}, {}], tgt: [{}, {}], selfCell: [0, 0], selfCellK: [{}, {}], selfUnit: [0, 0], selfUnitHow: [{}, {}], selfRope: [0, 0], selfPin: [0, 0], selfTilt: [0, 0], longRes: 0, capRes: 0, resT: [], deathHow: [{}, {}], stele: { R: [0, 0], L: [0, 0] }, maxRes: 0, revive: [], waterKillFloor: 0 };
  for (let g = 0; g < N; g++) {
    const seed = seed0 + g * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    agg.games++;
    const stB = [S.st[0], S.st[1]];
    const neutral = S.structs.filter((q) => q.side === 2 && !q.loose);
    const steles = []; for (const q of neutral) for (const b of q.blocks) if (b.dom) steles.push({ b, fell: 0 });
    let resStart = -1; const vlog = [];
    const inBox = (st, x, y) => x > st.x0 - 1 && x < st.x1 + 1 && y > st.y0 - 2 && y < st.y1 + 3;
    S.on = (t, a, b, c, d, e, f) => {
      if (t === 'volley') {
        const side = a; agg.volleys[side]++;
        const A = S.team[side].ai; let k = 'none';
        if (A && A.best && A.best.t) { const T = A.best.t; k = T.obj ? 'obj:' + T.obj.t : T.hg ? 'enemygate' : T.rope ? 'rope:' + (T.rope.tag || T.rope.kind) : T.blk ? 'weak' : (T.w >= 1.15 ? 'unit' : T.w >= 1.3 ? 'keg' : 'block'); }
        else if (A) k = 'fallback';
        agg.tgt[side][k] = (agg.tgt[side][k] || 0) + 1;
        if (verbose) vlog.push(`R${S.round} side${side} → ${k}`);
      } else if (t === 'boom' && (e === 0 || e === 1)) {
        const side = e, x = a, y = b; let where;
        if (inBox(stB[side], x, y)) where = 'own';
        else if (inBox(stB[1 - side], x, y)) where = 'foe';
        else if (neutral.some((q) => x > q.x0 - 1.5 && x < q.x1 + 1.5 && y < q.y1 + 2)) where = 'neutral';
        else if (S.water && x > S.water.x0 && x < S.water.x1 && Math.abs(y - S.water.y) < 0.3) where = 'water';
        else if (groundY(x) < -100) where = 'void';
        else if (y < groundY(x) + 0.6) where = 'field-ground';
        else where = 'air/other';
        agg.booms[side][where] = (agg.booms[side][where] || 0) + 1;
      } else if (t === 'cell') {
        // d: 那塊磚是哪一邊的；e: 傷害種類。開火的那一邊在自己那一輪，用爆炸（不是壓、燒）打掉自己的磚
        if ((d === 0 || d === 1) && d === S.turn && (S.phase === 'volley' || S.phase === 'resolve') && e !== 6 && e !== 3 && e !== 99) { agg.selfCell[d]++; agg.selfCellK[d][KN[e]] = (agg.selfCellK[d][KN[e]] || 0) + 1; }
      } else if (t === 'udie') {
        agg.deathHow[c][e] = (agg.deathHow[c][e] || 0) + 1;
        if (c === S.turn && (S.phase === 'volley' || S.phase === 'resolve') && S.state === 'play') { agg.selfUnit[c]++; agg.selfUnitHow[c][e] = (agg.selfUnitHow[c][e] || 0) + 1; if (verbose) vlog.push(`  R${S.round} side${c} unit #${f} ${d} died during OWN volley how=${e} at (${a.toFixed(1)},${b.toFixed(1)})`); }
      } else if (t === 'snap') {
        if (d === S.turn && (S.phase === 'volley' || S.phase === 'resolve')) { if (e === 'pin') agg.selfPin[d]++; else agg.selfRope[d]++; if (verbose) vlog.push(`  R${S.round} side${d} ${e} snapped during OWN volley`); }
      } else if (t === 'tilt') {
        const side = S.pivots[0] ? S.pivots[0].st.side : -1; if (side === S.turn) agg.selfTilt[side]++;
      } else if (t === 'revive') agg.revive.push({ x: a, y: b, side: c, L });
    };
    let lastPhase = '';
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      if (S.phase !== lastPhase) {
        if (lastPhase === 'resolve') { const dur = S.time - resStart; agg.resT.push(dur); if (dur > 8.9) agg.capRes++; if (dur > agg.maxRes) agg.maxRes = dur; }
        if (S.phase === 'resolve') resStart = S.time;
        lastPhase = S.phase;
      }
      for (const s of steles) if (!s.fell && !s.b.dead && s.b.body) { const a = s.b.body.getAngle(); if (Math.abs(a) > 0.6) { s.fell = 1; agg.stele[a < 0 ? 'R' : 'L'][S.turn]++; if (verbose) vlog.push(`  R${S.round} stele@${s.b.x0.toFixed(1)} fell ${a < 0 ? 'RIGHT(toward foe)' : 'LEFT(toward me)'} during side${S.turn} turn`); } }
    }
    if (S.state === 'won') agg.won++;
    agg.rounds += S.round;
    if (verbose) console.log(`  game ${g} seed ${seed}: ${S.state} R${S.round}\n` + vlog.join('\n'));
  }
  const fmt = (o) => Object.keys(o).sort((a, b) => o[b] - o[a]).map((k) => `${k}×${o[k]}`).join(' ') || '—';
  const rt = agg.resT.slice().sort((a, b) => a - b), med = rt.length ? rt[rt.length >> 1] : 0;
  console.log(`L${L} ${LEVELS[li].name} [${bot}] ${agg.won}/${agg.games} won, avg rounds ${(agg.rounds / agg.games).toFixed(1)}; resolve median ${med.toFixed(1)}s max ${agg.maxRes.toFixed(1)}s, hit 9s cap ${agg.capRes}/${rt.length}`);
  for (const s of [0, 1]) {
    console.log(`  side${s} ${s ? 'ENEMY' : 'bot'} volleys ${agg.volleys[s]}  targets: ${fmt(agg.tgt[s])}`);
    console.log(`     booms: ${fmt(agg.booms[s])}`);
    console.log(`     self: own blocks blasted ${agg.selfCell[s]} (${fmt(agg.selfCellK[s])}), own units died in own turn ${agg.selfUnit[s]} (how ${fmt(agg.selfUnitHow[s])}), own ropes snapped ${agg.selfRope[s]}, own pins broke ${agg.selfPin[s]}, own pivot tilt ${agg.selfTilt[s]}`);
    console.log(`     deaths (how): ${fmt(agg.deathHow[s])}`);
  }
  if (agg.stele.R[0] + agg.stele.R[1] + agg.stele.L[0] + agg.stele.L[1]) console.log(`  steles fell RIGHT (toward foe) in bot turn ${agg.stele.R[0]} / enemy turn ${agg.stele.R[1]}; LEFT (toward me) bot turn ${agg.stele.L[0]} / enemy turn ${agg.stele.L[1]}`);
}
