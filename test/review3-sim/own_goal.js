// node test/review3-sim/own_goal.js <關卡> <seed> <第幾回合>：我方不開火。把敵軍那一輪每一發砲彈的軌跡印出來（誰打的、初速、什麼時候出了自己的城、在哪裡爆炸、打到什麼）
const L = require('./lib'); const G = L.load('F_IN');
const { S, SH, simInit, simStep, simFire, WL, F_IN } = G;
const li = +process.argv[2] - 1, seed = +process.argv[3], R = +process.argv[4];
simInit(li, {}, seed, 1, { mute: 0 }); S.team[0].ai = null;
const st = S.st[1]; console.log(`L${li + 1} seed${seed}: enemy castle x ${st.x0}..${st.x1}, top y ${st.y1}; units: ` + S.team[1].units.map((u) => `${u.type}#${u.slot}@(${u.x.toFixed(1)},${u.y.toFixed(1)})`).join(' '));
let on = false; const fires = [];
globalThis.__pe = null;
G.__eval(`(function(){ const p = physExplode; physExplode = function(x, y, w, side, mass, flag, hit, vx, vy){ if (globalThis.__pe) globalThis.__pe(x, y, w, side, mass, flag, hit, vx, vy); return p(x, y, w, side, mass, flag, hit, vx, vy); }; })()`);
globalThis.__pe = (x, y, w, side, mass, flag, hit, vx, vy) => { if (!on || side !== 1) return; console.log(`   BLAST t=${S.phaseT.toFixed(2)} ${S.phase} ${w.id} at (${x.toFixed(1)},${y.toFixed(1)}) shot v=(${(vx || 0).toFixed(1)},${(vy || 0).toFixed(1)}) F_IN=${(flag & F_IN) ? 1 : 0} hit=${hit ? (hit.isBlock ? `block side${hit.side} m${hit.mat} ${hit.frag ? 'frag' : hit.cw + 'x' + hit.ch + ' c(' + hit.cx + ',' + hit.cy + ')'}` : 'unit side' + hit.side) : 'ground/none'}`); };
S.on = (t, a, b, c, d, e, f) => { if (t === 'volley' && a === 1 && S.round === R) { on = true; console.log(`enemy volley, aim v=(${S.team[1].aim[0].toFixed(1)},${S.team[1].aim[1].toFixed(1)})`); } if (t === 'fire' && on && c === 1) console.log(`   FIRE t=${S.phaseT.toFixed(2)} ${WL[d].id} from slot ${e} muzzle (${a.toFixed(1)},${b.toFixed(1)})`); if (t === 'turn' && on && a === 0) on = false; };
let guard = 0, seen = new Set();
while (S.state === 'play' && S.round <= R && guard++ < 60 * 80 * R) {
  if (S.phase === 'aim' && S.turn === 0) simFire(0);
  simStep(1 / 60);
  if (on) for (let i = 0; i < SH.n; i++) if (SH.side[i] === 1 && !(SH.flag[i] & F_IN)) { const key = Math.round(SH.vx[i] * 1000) + ':' + Math.round(SH.age[i] * 60 - S.frame); if (!seen.has(key)) { seen.add(key); console.log(`   shot left own-castle mode at (${SH.x[i].toFixed(1)},${SH.y[i].toFixed(1)}) v=(${SH.vx[i].toFixed(1)},${SH.vy[i].toFixed(1)}) age ${SH.age[i].toFixed(2)} ${WL[SH.w[i]].id}`); } }
}
