// node test/review2-sim/b_volley_scan.js <關卡,…> [ult] [角度步距=0.03] [力道步距=3]
// B：「真的一輪敵軍齊射」打在全新的我方城樓上，最壞能倒幾個兵？
// 跟 sap.js / b_blastmap.js 不同：這裡是真的讓敵軍開火（每個敵兵從自己的位置、用同一個角度和力道打，所以落點是散開的），
// 把敵軍所有瞄得到我方城樓的角度 × 力道都試一遍（沒有手抖）。我方第一回合不開火、不開護罩。
// 加 ult：敵軍這一輪用連珠（打三次）。
const { load } = require('./lib');
const G = load({ extra: ['simAim', 'simFire', 'simSkill', 'ANG_MIN', 'ANG_MAX', 'VMIN', 'VMAX'] });
const { S, simInit, simStep, simTrace, simAim, simFire, simSkill, LEVELS, MUZ_BIG } = G;
const a = process.argv.slice(2), lvs = (a[0] || '2,3,4,5,6').split(',').map((x) => +x - 1), ult = a.includes('ult'), da = +(a.find((x) => /^0\.\d+$/.test(x)) || 0.03), dv = 3;
function toEnemyAim(li) {
  simInit(li, {}, 4242, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].ai = null;
  let k = 0; while (!(S.phase === 'aim' && S.turn === 1) && S.state === 'play' && k++ < 3000) { if (S.phase === 'aim' && S.turn === 0) simFire(0); simStep(1 / 60); }
}
for (const li of lvs) {
  toEnemyAim(li);
  // 帶頭的兵（威力最大的）：先用試射挑出「打得到我方城樓」的瞄準
  const T = S.team[1]; let lead = null, bv = -1; for (const u of T.units) { if (!u.w) continue; const v = u.w.dmg * (u.w.n || 1) * (u.w.fan || 1); if (v > bv) { bv = v; lead = u; } }
  const big = lead.def.big ? MUZ_BIG : 1, mx = lead.x - 1.3 * big, my = lead.y + 2.3 * big, st = S.st[0];
  const aims = [];
  for (let ang = 0.10; ang <= 1.5; ang += da) for (let v = 32; v <= 86; v += dv) {
    const vx = -Math.cos(ang) * v, vy = Math.sin(ang) * v, R = simTrace(1, mx, my, vx, vy, S.wind, S.time, 200);
    if ((R.hit === 2 && R.o && R.o.isBlock && R.o.st === st) || (R.hit === 3 && R.o && R.o.side === 0)) aims.push([vx, vy, ang, v]);
  }
  const hist = [0, 0, 0, 0, 0]; let worst = null, hpSum = 0; const who = {};
  for (const [vx, vy, ang, v] of aims) {
    toEnemyAim(li);
    const hp0 = S.team[0].units.reduce((s, u) => s + u.hp, 0); const killed = [];
    S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && c === 0) killed.push(d + '#' + f + ':' + ['hit', 'crush', '?', 'burn', 'fell', 'out'][e]); };
    if (ult) { S.team[1].ult.c = S.team[1].ult.need; simSkill(1, 'ult'); }
    simAim(1, vx, vy); simFire(1);
    let k = 0; while (S.state === 'play' && !(S.phase === 'aim' && S.turn === 0) && k++ < 3000) simStep(1 / 60);
    const lost = hp0 - S.team[0].units.reduce((s, u) => s + Math.max(0, u.hp), 0); hpSum += lost;
    hist[Math.min(4, killed.length)]++; for (const q of killed) who[q.split(':')[0]] = (who[q.split(':')[0]] || 0) + 1;
    if (!worst || killed.length > worst.k.length || (killed.length === worst.k.length && lost > worst.lost)) worst = { k: killed, lost, ang, v };
    S.on = null;
  }
  const n = aims.length;
  console.log(`L${li + 1} ${LEVELS[li].me.castle}: enemy ${ult ? 'ULT volley (×3)' : 'volley'} (${T.units.filter((u) => u.w).map((u) => u.type).join('+')}; lead ${lead.type}) on a fresh castle, ${n} aims that reach it: kills 0/1/2/3/4 units in ${hist.join('/')} aims (≥1: ${Math.round(100 * (n - hist[0]) / n)}%, ≥2: ${Math.round(100 * (hist[2] + hist[3] + hist[4]) / n)}%); avg hp lost ${(hpSum / n).toFixed(0)}; worst: ${worst.k.join(', ') || 'no kill'} (−${worst.lost.toFixed(0)} hp) at ${Math.round(worst.ang * 57.3)}° power ${worst.v}; victims: ${JSON.stringify(who)}`);
}
