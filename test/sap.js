// node test/sap.js <關卡 1-6> [打哪一邊：0 我方城、1 敵城 = 1] [武器=bomb｜volley（攻方全部的兵同時打在同一點）] [lit]
// 「一發轟天砲」測試：在城樓正面每一層、城頂每一格各引爆一發，看守軍會倒幾個。
// 用來找出「打一下整座就倒」的弱點：我方的城不該有，敵城的弱點要是設計好的那幾個
const G = require('./load')('rayShot, RAY, F_FIRE, WPN, endTurn');
const { S, simInit, simStep, LEVELS, physExplode, rayShot, RAY, CS, MID, WL } = G;
const li = +(process.argv[2] || 1) - 1, tgt = process.argv[3] === undefined ? 1 : +process.argv[3], wid = process.argv[4] || 'bomb', lit = process.argv.includes('lit');
const w = wid === 'volley' ? null : WL.find((k) => k.id === wid), att = 1 - tgt;
function fresh() { simInit(li, {}, 4242, 1, {}); S.phase = 'resolve'; S.turn = att; S.phaseT = 0; S.quietT = 0; S.round = 1; S.on = null; }
function settle() { let n = 0; while (S.state === 'play' && S.phase === 'resolve' && n++ < 900) simStep(1 / 60); }
fresh();
const st = S.st[tgt], pts = [];
// 正面：從兩城中間水平射過去；城頂：從天上往下
for (let y = st.y0 + CS * 0.5; y < st.y1 + CS; y += CS) { const h = rayShot(MID, y, tgt ? st.x1 + 2 : st.x0 - 2, y, att, false); if (h === 2 && RAY.o && RAY.o.side === tgt) pts.push({ x: RAY.x, y: RAY.y, vx: tgt ? 1 : -1, vy: 0, tag: 'F' + ((y - st.y0) / CS | 0) }); }
for (let x = st.x0 + CS * 0.5; x < st.x1; x += CS) { const h = rayShot(x, st.y1 + 20, x, st.y0 - 2, att, false); if (h === 2 && RAY.o && RAY.o.side === tgt) pts.push({ x: RAY.x, y: RAY.y, vx: 0, vy: -1, tag: 'T' + ((x - st.x0) / CS | 0) }); }
let worst = 0, sum = 0; const out = [];
for (const p of pts) {
  fresh();
  const T = S.team[tgt], n0 = T.alive;
  const h = rayShot(p.x - p.vx * 3, p.y - p.vy * 3, p.x + p.vx * 2, p.y + p.vy * 2, att, false);
  if (w) physExplode(p.x, p.y, w, att, 1, lit ? G.F_FIRE : 0, h ? RAY.o : null, p.vx * 40, p.vy * 40);
  else {
    // 整輪齊射：每個兵的每一發都落在這一點附近（隔 0.1 秒一發）
    const q = []; for (const u of S.team[att].units) if (u.alive && u.w) for (let k = 0; k < (u.w.n || 1) * (u.w.fan || 1); k++) q.push(u.w);
    for (let k = 0; k < q.length; k++) {
      const jx = (k % 3 - 1) * 0.7, jy = ((k * 7) % 5 - 2) * 0.5, ex = p.x + (p.vy ? jx : 0), ey = p.y + (p.vx ? jy : 0);
      const hh = rayShot(ex - p.vx * 3, ey - p.vy * 3, ex + p.vx * 6, ey + p.vy * 6, att, false);
      physExplode(hh ? RAY.x : ex, hh ? RAY.y : ey, q[k], att, 1, lit ? G.F_FIRE : 0, hh === 2 || hh === 3 ? RAY.o : null, p.vx * 40, p.vy * 40);
      for (let i = 0; i < 6; i++) simStep(1 / 60);
    }
  }
  settle();
  const dead = n0 - T.alive, hurt = T.units.filter((u) => u.alive && u.hp < u.hpMax * 0.6).length;
  worst = Math.max(worst, dead); sum += dead; out.push(`${p.tag}:${dead}${hurt ? '+' + hurt + '傷' : ''}`);
}
console.log(`L${li + 1} ${tgt ? '敵城 ' + LEVELS[li].foe.castle : '我方 ' + LEVELS[li].me.castle}  ${wid}${lit ? '（著火 ×1.5）' : ''} × 攻方傷害 ${S.team[att].dmg.toFixed(2)}：最多一發倒 ${worst} 個，平均 ${(sum / pts.length).toFixed(2)} 個（F=正面第幾層、T=城頂第幾欄：倒幾個）`);
console.log('   ' + out.join('  '));
