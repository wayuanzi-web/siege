// node test/review2-sim/f_rock.js
// F：落石砸在「完好的」我方城樓上會怎樣？每一欄（x）各丟一顆，看兵會不會死、掉多少血。第四關（小石）、第六關第三階段（大隕石）。
const { load } = require('./lib');
const G = load({ extra: ['dropRock'] });
const { S, simInit, simStep, dropRock, CS } = G;
for (const [li, big, label] of [[3, false, 'L4 rock (r 1.9)'], [5, true, 'L6 meteor (r 2.5)'], [5, false, 'L6-castle small rock']]) {
  const rows = []; let worstDead = 0, anyDead = 0, n = 0, hpLost = 0;
  for (let cx = 0; cx < 9; cx++) for (const off of [0.25, 0.75]) {
    simInit(li, {}, 99 + cx, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.round = 2; S.phase = 'hazard'; S.turn = 1; S.phaseT = 0; S.quietT = 0; S.hz = 1;
    const st = S.st[0], T = S.team[0], hp0 = T.units.reduce((s, u) => s + u.hp, 0);
    const killed = []; S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && c === 0) killed.push(d + '#' + f); };
    dropRock(st.x0 + (cx + off) * CS, big);
    let k = 0; while (S.state === 'play' && S.phase === 'hazard' && k++ < 900) simStep(1 / 60);
    const lost = hp0 - T.units.reduce((s, u) => s + Math.max(0, u.hp), 0); n++; hpLost += lost; if (killed.length) anyDead++; worstDead = Math.max(worstDead, killed.length);
    if (killed.length || lost > 25) rows.push(`col ${cx}${off > 0.5 ? '+' : ''}: ${killed.length ? 'DEAD ' + killed.join(',') : ''} hp lost ${lost.toFixed(0)}`);
    S.on = null;
  }
  console.log(`${label} on the intact player castle, ${n} drop positions: kills a unit in ${anyDead}; avg hp lost ${(hpLost / n).toFixed(0)}; ` + (rows.join(' | ') || 'no drop cost more than 25 hp'));
}
