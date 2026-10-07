// node test/review3-sim/idle.js <場數=36> [bot=casual] [最多等幾秒=30] [只跑第幾關=0 全部]
// 「輪到我瞄準」的時候，真人會花好幾秒慢慢瞄。這裡模擬這件事：每次輪到我方瞄準就先不開火，放著讓世界自己跑，
// 記錄多久之後場上所有東西都睡著（不再動）、等的時候有沒有東西自己垮掉、有沒有兵在沒人開火的時候死掉。然後才讓自動玩家開火。
// SIEGE_SRC 可以換成舊版原始碼比較
const L = require('./lib'); const G = L.load();
const { S, SH, PH, simInit, simStep, LEVELS, BOTS } = G;
const N = +(process.argv[2] || 36), bot = process.argv[3] || 'casual', TMAX = +(process.argv[4] || 30), only = +(process.argv[5] || 0);
console.log(`src=${G.__dir} bot=${bot} games/level=${N} wait<=${TMAX}s`);
function awakeList() {
  const out = [];
  for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic() || !b.isAwake()) continue; const p = b.getPosition(); if (p.x < -11 || p.x > 123 || p.y < -10) continue;
    out.push(b);
  }
  return out;
}
const kindOf = (u) => u.isBlock ? (u.frag ? 'frag' : u.kind === 'ball' ? (u.mat === 6 ? 'rock' : 'barrel') : u.prop ? 'prop' : 'block') + ':m' + u.mat + ':s' + u.side : 'unit';
for (let li = 0; li < LEVELS.length; li++) {
  if (only && li !== only - 1) continue;
  const hist = [0, 0, 0, 0, 0, 0], culprit = {}, late = []; let turns = 0, never = 0, lateDie = [0, 0], lateCells = 0, sumT = 0, wins = 0, maxLateV = 0;
  for (let sd = 0; sd < N; sd++) {
    const seed = 424200 + sd * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    let prev = '', ev = [];
    S.on = (t, a, b, c, d, e, f) => { if (t === 'udie') ev.push({ t: 'udie', side: c, type: d, how: e }); else if (t === 'cell') ev.push({ t: 'cell', side: d, mat: c }); };
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      const key = S.phase + S.turn + S.round;
      if (key !== prev) {
        prev = key;
        if (S.phase === 'aim' && S.turn === 0 && S.state === 'play') {
          // 先不開火，等世界自己靜下來
          const T = S.team[0], ai = T.ai; T.ai = null; turns++;
          let t = 0, slept = -1; ev = [];
          const t0 = S.time;
          while (t < TMAX && S.state === 'play') {
            const aw = awakeList(); if (!aw.length) { slept = t; break; }
            if (t >= 10 && t < 10 + 1 / 60 + 1e-9) { const seen = {}; for (const b of aw) { const k = kindOf(b.getUserData()); if (!seen[k]) { seen[k] = 1; culprit[k] = (culprit[k] || 0) + 1; } } }
            if (t > 5) for (const b of aw) { const v = b.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > maxLateV) maxLateV = sp; }
            const n0 = ev.length;
            simStep(1 / 60); t += 1 / 60;
            if (t > 3) for (let i = n0; i < ev.length; i++) { const e = ev[i]; if (e.t === 'udie') { lateDie[e.side]++; if (late.length < 12) late.push(`seed${seed} r${S.round} +${t.toFixed(1)}s: side${e.side} ${e.type} died (how ${e.how})`); } else if (e.t === 'cell' && e.side < 2) lateCells++; }
          }
          if (slept < 0) { never++; if (late.length < 12 && S.state === 'play') { const aw = awakeList().slice(0, 3).map((b) => { const u = b.getUserData(), p = b.getPosition(), v = b.getLinearVelocity(); return kindOf(u) + (u.isBlock ? ' ' + u.cw + 'x' + u.ch + ' c(' + u.cx + ',' + u.cy + ')' : '') + `@(${p.x.toFixed(1)},${p.y.toFixed(1)}) v=${Math.hypot(v.x, v.y).toFixed(2)}`; }); late.push(`seed${seed} r${S.round}: still awake after ${TMAX}s: ${aw.join(' ; ')}`); } }
          const tt = slept < 0 ? TMAX : slept; sumT += tt; hist[tt < 1 ? 0 : tt < 3 ? 1 : tt < 5 ? 2 : tt < 10 ? 3 : tt < TMAX ? 4 : 5]++;
          T.ai = ai; if (ai) ai.st = 0;
          prev = S.phase + S.turn + S.round;
        }
      }
    }
    if (S.state === 'won') wins++;
  }
  console.log(`L${li + 1}: my aim turns ${turns}; time until everything sleeps  <1s ${hist[0]} | 1-3s ${hist[1]} | 3-5s ${hist[2]} | 5-10s ${hist[3]} | 10-${TMAX}s ${hist[4]} | never ${hist[5]}  (mean ${(sumT / Math.max(1, turns)).toFixed(1)}s); wins ${wins}/${N}`);
  console.log(`     awake at +10s by kind: ${Object.keys(culprit).sort((a, b) => culprit[b] - culprit[a]).map((k) => k + '×' + culprit[k]).join(' ') || '—'};  max speed seen after +5s: ${maxLateV.toFixed(1)};  units dying >3s into my idle aim: mine ${lateDie[0]} theirs ${lateDie[1]};  castle blocks breaking >3s in: ${lateCells}`);
  for (const l of late) console.log('     ' + l);
}
