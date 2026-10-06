// H16 的統計版：多跑幾場，數「站在自己城樓範圍外的兵」打出去的砲彈炸在自己磚上的次數（只算沒被鏡子／傳送門碰過的）。
//   node test/review/h16b_scan.js [levels=5-6] [seeds=6]
const G = require('./h')();
const { S, SH, simInit, simStep, BOTS, RAY } = G;
const m = (process.argv[2] || '5-6').split('-'), N = +(process.argv[3] || 6);
let games = 0, gHit = 0, shots = 0, hpLoss = 0; const ex = [];
for (let li = +m[0] - 1; li <= +(m[1] || m[0]) - 1; li++) for (const bot of ['casual', 'expert', 'newbie']) for (let sd = 0; sd < N; sd++) {
  const seed = 700001 + sd * 104729 + li * 977 + bot.length, diff = sd % 3;
  simInit(li, {}, seed, diff, { botA: BOTS[bot] }); games++;
  const st = S.st[0], fires = []; let n = 0, hp0 = 0, loss = 0;
  const ownHp = () => { let s = 0; for (const b of st.blocks) if (!b.dead && !b.frag) s += b.hp; return s; };
  S.on = (t, x, y, r, wi, side) => {
    if (t === 'fire' && r === 0) fires.push({ t: S.time, x, y, w: wi });
    if (t === 'boom' && side === 0 && RAY.x === x && RAY.y === y && RAY.o && RAY.o.isBlock && RAY.o.side === 0) {
      let bi = -1, bd = 2.2; for (let i = 0; i < SH.n; i++) { if (SH.side[i] !== 0) continue; const d = Math.hypot(SH.x[i] - x, SH.y[i] - y); if (d < bd) { bd = d; bi = i; } }
      if (bi < 0 || (SH.flag[bi] & (G.F_WILD | G.F_PORT))) return;
      const born = S.time - SH.age[bi]; let src = null; for (const fr of fires) if (fr.w === wi && Math.abs(fr.t - born) < 0.04) src = fr;
      if (!src || (src.x > st.x0 - 1 && src.x < st.x1 + 1)) return;            // 只算砲口在城樓範圍外的
      n++; loss += hp0 - ownHp(); if (ex.length < 4 && n === 1) ex.push(`L${li + 1} ${bot} seed=${seed} diff=${diff} round ${S.round}: muzzle at x=${src.x.toFixed(1)} (castle ${st.x0}..${st.x1.toFixed(1)}), shot hit own brick at (${x.toFixed(1)},${y.toFixed(1)})`);
    }
  };
  while (S.state === 'play' && S.round < 45) { hp0 = ownHp(); simStep(1 / 60); while (fires.length && S.time - fires[0].t > 9.5) fires.shift(); }
  if (n) { gHit++; shots += n; hpLoss += loss; }
}
console.log(`levels ${m.join('-')}: ${games} games; in ${gHit} of them a player unit standing OUTSIDE its castle shot the castle (total ${shots} shots, ${hpLoss.toFixed(0)} own brick hp)`);
for (const e of ex) console.log('    ' + e);
