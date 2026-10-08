// node test/review7/monkey.js <關卡範圍> [場數=3] [seed0=99]
// 我方亂打（隨機角度、力道，偶爾開護罩、連珠），敵軍照常。檢查：例外、NaN、某個階段卡超過 15 秒、回合數爆表、兵在瞄準階段死掉（瞄準時不該有人突然倒下）
const G = require('../load')('PH, simSkill');
const { S, SH, simInit, simStep, simAim, simFire, LEVELS, srand } = G;
const rg = (process.argv[2] || '6-12').split('-').map(Number), N = +(process.argv[3] || 3), seed0 = +(process.argv[4] || 99);
let R = 12345; const mr = () => { R = (R * 1103515245 + 12345) & 0x7fffffff; return R / 0x7fffffff; };
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1; let issues = [], aimDeaths = [], maxPhase = 0, games = 0, rounds = 0;
  for (let g = 0; g < N; g++) {
    R = seed0 + g * 31 + L;
    simInit(li, {}, seed0 + g * 7919 + li * 131, 1, {}); S.team[0].ai = null; games++;
    S.on = (t, a, b, c, d, e, f) => { if (t === 'udie' && S.state === 'play' && (S.phase === 'aim' || S.phase === 'intro')) aimDeaths.push(`L${L} g${g} R${S.round} turn${S.turn} side${c} #${f} ${d} how ${e} at (${a.toFixed(1)},${b.toFixed(1)}) in ${S.phase}`); };
    let key = '', at = 0, aimWait = 0;
    try {
      while (S.state === 'play' && S.round < 30) {
        if (S.phase === 'aim' && S.turn === 0) {
          aimWait += 1 / 60;
          if (aimWait > 0.4) {
            const a = 0.1 + mr() * 1.4, v = 32 + mr() * 54; simAim(0, Math.cos(a) * v, Math.sin(a) * v);
            if (mr() < 0.2) G.simSkill(0, 'ult');
            simFire(0); aimWait = 0;
          }
        }
        if (S.phase === 'volley' && S.turn === 1 && mr() < 0.01) G.simSkill(0, 'shield');
        simStep(1 / 60);
        const k = S.phase + S.turn + S.round; if (k !== key) { key = k; at = S.time; } else if (S.phase !== 'aim' && S.time - at > 15) { issues.push(`L${L} g${g}: stuck in ${S.phase} turn${S.turn} R${S.round} for 15s`); at = 1e9; }
        if (S.phase !== 'aim') maxPhase = Math.max(maxPhase, S.time - at);
        if ((S.frame & 63) === 0) { for (const b of S.blocks) if (!b.dead) { const p = b.body.getPosition(); if (!(p.x === p.x)) { issues.push(`L${L} g${g}: NaN block`); break; } } for (const u of S.units) if (u.alive && !(u.x === u.x)) issues.push(`L${L} g${g}: NaN unit`); }
      }
    } catch (e) { issues.push(`L${L} g${g}: exception ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
    rounds += S.round;
  }
  console.log(`L${L} ${LEVELS[li].name}: ${games} monkey games, avg rounds ${(rounds / games).toFixed(1)}, longest non-aim phase ${maxPhase.toFixed(1)}s; issues ${issues.length}; deaths during aim ${aimDeaths.length}`);
  for (const s of issues.slice(0, 6)) console.log('   ' + s);
  for (const s of aimDeaths.slice(0, 6)) console.log('   AIM-DEATH ' + s);
}
