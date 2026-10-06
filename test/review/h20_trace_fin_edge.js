// H20：simTrace（瞄準虛線、AI 挑角度、上一輪軌跡）在「這一段的終點剛出城」的那一步就把 inOwn 關掉，
// 然後拿整段（起點還在城裡）去撞自己的磚 → 回報「打到自己的城牆／屋簷」。simTrace 一步是 1/30 秒（真的砲彈 1/60 秒），
// 所以這一段特別長、特別容易擦到。真的砲彈走同一條路其實穿得過去。
// 後果：玩家那個兵的虛線整條不見（R.hit 讓 end = R.t，而城裡那一段本來就不畫）；AI 把這些角度當成 0 分丟掉。
const G = require('./h')();
const { S, SH, simInit, simStep, simTrace, spawnShot, WPN, F_IN, STEP, LEVELS } = G;
let aims = 0, traceOwn = 0, realOwnToo = 0, realOwnOnly = 0; const perUnit = [], ex = [];
for (let li = 0; li < LEVELS.length; li++) for (const side of [0, 1]) {
  simInit(li, {}, 5, 1, { mute: 1 }); S.team[0].mute = true;
  while (S.phase !== 'aim') simStep(1 / 60);
  for (const sp of S.gsp) if (sp.g) G.gateRemove(sp.g, 3);
  S.objs.length = 0;                                   // 只看城樓本身
  const T = S.team[side], dir = T.dir, st = S.st[side];
  for (const u of T.units) {
    if (!u.w) continue;
    const big = u.def.big ? 1.5 : 1, mx = u.x + dir * 1.3 * big, my = u.y + 2.3 * big; let n = 0, bad = 0;
    for (let a = 0.10; a <= 1.5; a += 0.02) for (let v = 32; v <= 86; v += 2) {
      const vx = Math.cos(a) * v * dir, vy = Math.sin(a) * v; aims++; n++;
      const R = simTrace(side, mx, my, vx, vy, 0, S.time, 150), tOwn = R.hit === 2 && R.o && R.o.side === side && R.x > st.x0 - 1.5 && R.x < st.x1 + 1.5, tt = R.t, tx = R.x, ty = R.y;
      // 真的打一發，看它在離開自己城樓之前有沒有炸在自己的磚上
      let boom = null, t = 0; S.on = (e, x, y) => { if (e === 'boom' && !boom) boom = { x, y, o: G.RAY.o }; };
      const n0 = SH.n; spawnShot(side, WPN.bolt.i, mx, my, vx, vy, 1, F_IN, 0, 1);
      while (SH.n > n0 && t < 1.2) { G.shotsStep(STEP); t += STEP; }
      while (SH.n > n0) G.killShot(SH.n - 1); S.on = null;
      const rOwn = !!(boom && boom.o && boom.o.isBlock && boom.o.side === side && boom.x > st.x0 - 1.5 && boom.x < st.x1 + 1.5);
      if (tOwn && rOwn) realOwnToo++; else if (tOwn) { traceOwn++; bad++; if (ex.length < 3) ex.push(`L${li + 1} side${side} ${u.type} slot${u.slot}: angle ${(a * 57.3).toFixed(0)}deg power ${v}: preview stops at own brick (${tx.toFixed(1)},${ty.toFixed(1)}) t=${tt.toFixed(2)}s; the real shot leaves the castle untouched`); } else if (rOwn) realOwnOnly++;
    }
    perUnit.push(`L${li + 1} side${side} ${u.type}#${u.slot} (x=${u.x.toFixed(1)}): ${bad}/${n} = ${(100 * bad / n).toFixed(1)}%`);
  }
}
console.log(`${aims} aims tested (no wind, gates and objects removed)`);
console.log(`  preview/AI trace says "blocked by my own castle" but the real shot passes: ${traceOwn} (${(100 * traceOwn / aims).toFixed(2)}%)`);
console.log(`  both the trace and the real shot hit an own brick on the way out: ${realOwnToo};  only the REAL shot does: ${realOwnOnly}`);
for (const e of ex) console.log('    ' + e);
console.log('  per unit (share of that unit\'s aims that are wrongly cut off):'); for (const p of perUnit) console.log('    ' + p);
