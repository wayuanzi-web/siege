// 第 1 項：在亂七八糟的時間點呼叫 simFire / simSkill / simAim（兩邊都叫、參數也亂給），看回合順序會不會亂、會不會當掉。
// 我方不掛 AI（像真人一樣由外面呼叫 simFire），敵方照常。
const G = require('./h')();
const { S, SH, PH, simInit, simStep, simFire, simSkill, simAim, LEVELS, teamBar } = G;
let seedR = 12345; const R = () => { seedR = (Math.imul(seedR, 1103515245) + 12345) >>> 0; return seedR / 4294967296; };      // 自己的亂數，不動模擬的
let bad = 0, games = 0, accepted = { fire0: 0, fire1wrong: 0, skill: 0 }; const fail = (m) => { bad++; if (bad < 20) console.log('  ✗ ' + m); };
const weird = [NaN, Infinity, -Infinity, 0, 1e9, -1e9, 1e-9, 50, -50, 20];
for (let li = 0; li < LEVELS.length; li++) for (let sd = 0; sd < 3; sd++) {
  simInit(li, { shield: 5, ult: 5 }, 900 + sd * 31 + li, sd % 3, null); games++;
  const tag = `L${li + 1} #${sd}`; let lastVol = -1, vol = [0, 0], humanAimT = 0;
  S.on = (t, a) => { if (t === 'volley') { vol[a]++; if (a === lastVol) fail(`${tag}: side ${a} fired twice in a row (round ${S.round})`); if (a !== S.turn) fail(`${tag}: volley by side ${a} during side ${S.turn}'s turn`); lastVol = a; } if (t === 'round') lastVol = -1; };
  try {
    let steps = 0;
    while (S.state === 'play' && S.round < 30 && steps < 60 * 900) {
      steps++;
      // 亂叫一通
      if (R() < 0.3) simAim(R() < 0.5 ? 0 : 1 * (R() < 0.1 ? 1 : 0), weird[(R() * weird.length) | 0], weird[(R() * weird.length) | 0]);
      if (R() < 0.05) { const ph = S.phase, tn = S.turn, ok = simFire(1); if (ok && !(ph === 'aim' && tn === 1)) { accepted.fire1wrong++; fail(`${tag}: simFire(1) accepted in phase ${ph} turn ${tn}`); } }
      if (R() < 0.05) { const ph = S.phase, tn = S.turn, ok = simFire(0); if (ok) { accepted.fire0++; if (!(ph === 'aim' && tn === 0)) fail(`${tag}: simFire(0) accepted in phase ${ph} turn ${tn}`); } }
      if (R() < 0.03) { if (simSkill(R() < 0.8 ? 0 : 1, R() < 0.5 ? 'ult' : R() < 0.9 ? 'shield' : 'bogus')) accepted.skill++; }
      if (R() < 0.02) S.team[0].ult.c = S.team[0].ult.need;           // 讓連珠常常可以用
      if (S.phase === 'aim' && S.turn === 0) { humanAimT += 1 / 60; if (humanAimT > 2 + R() * 3) { simAim(0, 30 + R() * 40, 20 + R() * 50); simFire(0); humanAimT = 0; } } else humanAimT = 0;
      simStep(1 / 60);
      for (let s = 0; s < 2; s++) { const T = S.team[s]; if (!(T.aim[0] === T.aim[0]) || !(T.aim[1] === T.aim[1]) || Math.abs(T.aim[0]) > 100 || Math.abs(T.aim[1]) > 100) fail(`${tag}: aim out of range ${T.aim}`); if (T.ult.c < 0 || T.ult.c > T.ult.need || T.shield.c < 0 || T.shield.c > T.shield.need) fail(`${tag}: skill charge out of range`); }
      if (Math.abs(vol[0] - vol[1]) > 1) fail(`${tag}: volley counts ${vol}`);
      const b0 = teamBar(0), b1 = teamBar(1); if (!(b0 >= 0 && b0 <= 1 && b1 >= 0 && b1 <= 1)) fail(`${tag}: teamBar ${b0} ${b1}`);
    }
    if (S.state === 'play' && S.round < 30) fail(`${tag}: no progress (round ${S.round}, phase ${S.phase}, turn ${S.turn})`);
    if (S.state === 'play') { console.log(`  (${tag}: still undecided at round ${S.round} — the random 'human' rarely hits anything)`); continue; }
    for (let i = 0; i < 300; i++) { simStep(1 / 60); if (simFire(0) || simFire(1) || simSkill(0, 'shield') || simSkill(0, 'ult')) { fail(`${tag}: input accepted after the game ended (state ${S.state})`); break; } }
  } catch (e) { fail(`${tag}: EXCEPTION ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}
console.log(`${games} games, random calls: simFire(0) accepted ${accepted.fire0}x (always during own aim), simFire(1) accepted out of turn ${accepted.fire1wrong}x, skills accepted ${accepted.skill}x`);
console.log(bad ? `${bad} problems` : 'no turn-order violation, no crash, no out-of-range state');
