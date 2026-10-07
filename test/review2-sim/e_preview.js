// node test/review2-sim/e_preview.js
// E：瞄準虛線只畫前 RD.aimT 秒（輕鬆 1.2、標準 0.95、硬仗 0.75，準星每級 +0.11）。倍增符只有在「這一段虛線」穿過去的時候才會亮。
// 對每一關：所有「真的會穿過某一道我方／黃金倍增符、最後打到敵城」的瞄準（角度 × 力道格點、帶頭的兵），
// 其中有幾成是在虛線畫得到的時間內就穿過那道符（所以符會亮）？還有：虛線結束時砲彈離落點還有多遠（秒）。
const G = require('./h')();
const { S, simInit, simStep, simTrace } = G;
for (let li = 0; li < 6; li++) {
  simInit(li, {}, 5, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.team[0].mute = true; S.team[1].mute = true;
  // 跑到第二回合（×5 符出現之後），不開火
  let guard = 0; while (!(S.round >= 2 && S.phase === 'aim' && S.turn === 0) && guard++ < 6000) { if (S.phase === 'aim') G.simFire(S.turn); simStep(1 / 60); }
  const u = S.team[0].units.find((k) => k.alive && k.w), mx = u.x + 1.3, my = u.y + 2.3;
  const gates = S.gates.filter((g) => g.owner === 0 || g.owner === 2);
  const out = [];
  for (const g of gates) {
    const res = { n: 0 }; const T = [1.2, 0.95, 0.75, 0.95 + 0.55];
    const lit = [0, 0, 0, 0]; let tsum = 0, flight = 0;
    for (let a = 0.10; a <= 1.5; a += 0.02) for (let v = 32; v <= 86; v += 2) {
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      const R = simTrace(0, mx, my, vx, vy, S.wind, S.time, 150); if (!(R.gm & g.bit)) continue; if (!(R.hit === 2 || R.hit === 3) || !R.o || (R.o.isBlock ? R.o.side !== 1 : R.o.side !== 1)) continue;
      res.n++; flight += R.t;
      // 穿過這道符的時間：用越來越長的預覽去找
      let tg = 9; for (let k = 4; k <= 150; k += 1) { const r2 = simTrace(0, mx, my, vx, vy, S.wind, S.time, k); if (r2.gm & g.bit) { tg = k / 30; break; } }
      tsum += tg; T.forEach((tt, i) => { if (tg <= Math.ceil(tt * 30) / 30 + 1e-9) lit[i]++; });
    }
    if (!res.n) { out.push(`×${g.mult}${g.owner === 2 ? ' gold' : ''}@(${g.x.toFixed(0)},${g.y.toFixed(0)}): no aim from ${u.type}#${u.slot} goes through it and lands on the enemy castle`); continue; }
    out.push(`×${g.mult}${g.owner === 2 ? ' gold' : ''}@(${g.x.toFixed(0)},${g.y.toFixed(0)}): ${res.n} useful aims, shot reaches the gate after ${(tsum / res.n).toFixed(2)}s on average (lands after ${(flight / res.n).toFixed(1)}s); gate lights up while aiming in ${Math.round(100 * lit[0] / res.n)}% (easy) / ${Math.round(100 * lit[1] / res.n)}% (standard) / ${Math.round(100 * lit[2] / res.n)}% (hard) / ${Math.round(100 * lit[3] / res.n)}% (standard + 準星 maxed)`);
  }
  console.log(`L${li + 1} (round ${S.round}, lead ${u.type}#${u.slot} at x=${u.x.toFixed(0)}):\n   ` + out.join('\n   '));
}
