// node test/review3-sim/split_geom.js
// 直接測 segAt / segBlast / segSplit 的幾何：把每一關每一塊分段的樓板、長樑搬到半空中，給它各種角度、速度、角速度，
// 打穿其中幾段，然後檢查：
//   1. 打在世界座標 (x, y) 的傷害有沒有落在離那一點最近的那一段（包含歪掉、倒過來的磚，還有鏡射過的敵城）
//   2. 斷開後每一截新磚的四個角，跟原本那塊磚對應那幾段的四個角是不是同一個位置（位置、角度都沒跑掉）
//   3. 新磚的速度是不是原本那塊磚在那一點的速度（v + ω × r），角速度一樣
//   4. 新磚的耐久、格子位置、原位（x0, y0）、著火、脆化有沒有照搬
//   5. 碎塊有沒有落在被打穿的那一段的範圍裡
const L = require('./lib'); const G = L.load('segAt, segBlast, segSplit, segSettle, M_STONE, M_WOOD, M_ICE, K_CRUSH, K_BLAST');
const { S, PH, simInit, LEVELS, CS, blockHurt, physExplode, WPN, segAt, K_CRUSH } = G;
let bad = 0, tests = 0; const seen = new Map();
const fail = (k, m) => { bad++; const r = seen.get(k); if (r) r.n++; else { seen.set(k, { n: 1, m }); } };
const corners = (x, y, a, hw, hh) => { const c = Math.cos(a), s = Math.sin(a); return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([lx, ly]) => [x + lx * c - ly * s, y + lx * s + ly * c]); };
const STATES = [
  { a: 0, v: [0, 0], w: 0 }, { a: 0.3, v: [0, 0], w: 0 }, { a: -0.7, v: [3, -5], w: 0 }, { a: 1.2, v: [-6, 2], w: 1.5 }, { a: Math.PI / 2, v: [0, -10], w: -2 },
  { a: 2.6, v: [4, 4], w: 3 }, { a: Math.PI, v: [0, 0], w: 0 }, { a: -2.2, v: [-8, -3], w: -4 }, { a: 5.5, v: [1, 1], w: 0.5 }, { a: -7.0, v: [2, -9], w: 2.5 }
];
for (let li = 0; li < LEVELS.length; li++) {
  simInit(li, {}, 7, 1, null); S.phase = 'resolve';
  const segs = S.blocks.filter((b) => b.seg).map((b) => b.id);
  for (const id of segs) for (let si = 0; si < STATES.length; si++) for (let pat = 0; pat < 4; pat++) {
    simInit(li, {}, 7, 1, null); S.phase = 'resolve'; S.turn = 0;
    const b = S.blocks.find((q) => q.id === id), st = STATES[si], n = b.cw, tag = `L${li + 1} side${b.side} block c(${b.cx},${b.cy}) ${n} cells mat${b.mat} state${si} pat${pat}`;
    const X = b.x0 + 5, Y = 150 + si;           // 半空中，四周沒有別的東西
    b.body.setTransform({ x: X, y: Y }, st.a); b.body.setLinearVelocity({ x: st.v[0], y: st.v[1] }); b.body.setAngularVelocity(st.w); b.body.setAwake(true);
    b.inPlace = false;
    const c = Math.cos(st.a), s = Math.sin(st.a), cw = b.w / n;
    const cellC = (k) => { const lx = -b.w / 2 + (k + 0.5) * cw; return [X + lx * c, Y + lx * s]; };
    // (1) segAt：每一段的中心、稍微偏上偏下，都要回到自己那一段
    for (let k = 0; k < n; k++) for (const off of [0, 1.2, -1.2]) { const p = cellC(k), k2 = segAt(b, p[0] - off * s, p[1] + off * c); tests++; if (k2 !== k) fail('segAt wrong cell', `${tag}: point in cell ${k} -> ${k2}`); }
    // 要打穿哪幾段
    const kill = pat === 0 ? [0] : pat === 1 ? [n - 1] : pat === 2 ? [(n / 2) | 0] : n >= 5 ? [1, 3] : [1];
    if (kill.some((k) => k >= n) || kill.length >= n) continue;
    const before = Array.from(b.seg), burn = (si % 3 === 0) ? 2.5 : 0, brit = si % 2;
    if (burn) { b.burn = burn; b.burnBy = 0; S.nburn++; } b.brit = brit; b.soot = 0.3;
    const id0 = S.bid, nburn0 = S.nburn, parentC = corners(X, Y, st.a, b.w / 2, b.h / 2);
    // 先打傷另一段（不打穿），確認各段的耐久會跟著對應的新磚走
    const hurtK = [...Array(n).keys()].find((k) => !kill.includes(k)); { const p = cellC(hurtK); blockHurt(b, 7 / (brit ? 1.6 : 1), K_CRUSH, 2, p[0], p[1]); }
    tests++; if (Math.abs(b.seg[hurtK] - (before[hurtK] - 7)) > 1e-3) fail('localized damage landed on the wrong cell', `${tag}: aimed at cell ${hurtK}, seg now [${Array.from(b.seg).map((v) => v.toFixed(1))}] was [${before.map((v) => v.toFixed(1))}]`);
    const exp = Array.from(b.seg);
    for (let i = 0; i < kill.length; i++) { const p = cellC(kill[i]); if (b.dead) { fail('block died before all cells were hit', tag); break; } if (i < kill.length - 1) { b.seg[kill[i]] = 0; continue; } blockHurt(b, 1e4, K_CRUSH, 2, p[0], p[1]); }
    tests++;
    if (!b.dead) { fail('block not split', tag); continue; }
    const kids = S.blocks.filter((q) => q.id >= id0 && !q.frag && !q.dead), frags = S.blocks.filter((q) => q.id >= id0 && q.frag && !q.dead);
    // 應該有的幾截
    const runs = []; { let j = 0; while (j < n) { if (kill.includes(j)) { j++; continue; } let e = j; while (e + 1 < n && !kill.includes(e + 1)) e++; runs.push([j, e]); j = e + 1; } }
    if (kids.length !== runs.length) { fail('wrong number of children', `${tag}: ${kids.length} vs ${runs.length}`); continue; }
    kids.sort((p, q) => p.cx - q.cx);
    for (let r = 0; r < runs.length; r++) {
      const [j, e] = runs[r], m = e - j + 1, k = kids[r], lx = -b.w / 2 + (j + m / 2) * cw, ex = X + lx * c, ey = Y + lx * s, p = k.body.getPosition(), v = k.body.getLinearVelocity();
      const kc = corners(p.x, p.y, k.body.getAngle(), k.w / 2, k.h / 2), pc = corners(ex, ey, st.a, m * cw / 2, b.h / 2);
      let d = 0; for (let q = 0; q < 4; q++) d = Math.max(d, Math.hypot(kc[q][0] - pc[q][0], kc[q][1] - pc[q][1]));
      if (d > 1e-3) fail('child corners moved', `${tag}: run ${j}..${e} corner error ${d.toFixed(4)}`);
      const evx = st.v[0] - st.w * lx * s, evy = st.v[1] + st.w * lx * c;
      if (Math.hypot(v.x - evx, v.y - evy) > 1e-3) fail('child velocity wrong', `${tag}: run ${j}..${e} v=(${v.x.toFixed(3)},${v.y.toFixed(3)}) expected (${evx.toFixed(3)},${evy.toFixed(3)})`);
      if (Math.abs(k.body.getAngularVelocity() - st.w) > 1e-3) fail('child angular velocity wrong', tag);
      if (k.cx !== b.cx + j || k.cy !== b.cy || k.cw !== m || k.ch !== 1) fail('child grid cells wrong', `${tag}: run ${j}..${e} -> c(${k.cx},${k.cy}) cw ${k.cw}`);
      if (Math.abs(k.x0 - (b.x0 + lx)) > 1e-6 || k.y0 !== b.y0) fail('child home position wrong', tag);
      if (k.inPlace) fail('child of a displaced block is inPlace', tag);
      for (let q = 0; q < m; q++) if (Math.abs(k.seg[q] - exp[j + q]) > 1e-3) fail('child cell hp not carried over', `${tag}: run ${j}..${e} [${Array.from(k.seg).map((x) => x.toFixed(1))}] expected [${exp.slice(j, e + 1).map((x) => x.toFixed(1))}]`);
      let sum = 0; for (let q = 0; q < m; q++) sum += k.seg[q];
      if (Math.abs(k.hp - sum) > 1e-3 || Math.abs(k.hm - m * b.segM) > 1e-3 || k.segM !== b.segM) fail('child hp/hm/segM wrong', `${tag}: hp ${k.hp} sum ${sum} hm ${k.hm} segM ${k.segM}`);
      if ((k.burn > 0) !== (burn > 0) || (burn > 0 && k.burnBy !== 0) || k.brit !== brit || k.soot !== 0.3 || k.wt !== b.wt || !!k.base !== !!b.base || k.mat !== b.mat || k.side !== b.side || k.st !== b.st) fail('child state not inherited', `${tag}: burn ${k.burn} by ${k.burnBy} brit ${k.brit} soot ${k.soot}`);
      if (Math.abs(k.mass - b.mass * m / n) > 1e-6 * b.mass) fail('child mass not proportional', `${tag}: ${k.mass} vs ${b.mass * m / n}`);
      if (!k.body.isAwake()) fail('child asleep', tag);
    }
    // 碎塊：頂點都要落在某一段被打穿的範圍裡
    for (const f of frags) {
      const p = f.body.getPosition(), a = f.body.getAngle(), fc = Math.cos(a), fs = Math.sin(a);
      for (let i = 0; i < f.pts.length; i += 2) {
        const wx = p.x + f.pts[i] * fc - f.pts[i + 1] * fs, wy = p.y + f.pts[i] * fs + f.pts[i + 1] * fc, lx = (wx - X) * c + (wy - Y) * s, ly = -(wx - X) * s + (wy - Y) * c, k = Math.floor((lx + b.w / 2) / cw);
        if (!kill.includes(k) || Math.abs(ly) > b.h / 2 + 1e-6) { fail('fragment outside the broken cell', `${tag}: vertex in cell ${k} ly=${ly.toFixed(2)}`); break; }
      }
      if ((f.burn > 0) !== (burn > 0)) fail('fragment burn not inherited', tag);
    }
    // 帳
    let nb = 0, nf = 0; for (const q of S.blocks) if (!q.dead) { if (q.burn > 0) nb++; if (q.frag) nf++; }
    if (nb !== S.nburn) fail('nburn mismatch after split', `${tag}: real ${nb} S.nburn ${S.nburn}`);
    if (nf !== S.nfrag) fail('nfrag mismatch after split', `${tag}: real ${nf} S.nfrag ${S.nfrag}`);
    const stt = b.st; for (let k = 0; k < n; k++) { const cb = stt.cellB[b.cy * stt.cols + b.cx + k]; if (kill.includes(k) ? cb !== null : (!cb || cb.dead || cb.cx > b.cx + k || cb.cx + cb.cw <= b.cx + k)) fail('cellB wrong after split', `${tag}: cell ${k} -> ${cb ? 'id' + cb.id + (cb.dead ? ' dead' : '') : 'null'}`); }
    let bodies = 0; for (let q = PH.world.getBodyList(); q; q = q.getNext()) bodies++;
    let live = 0; for (const q of S.blocks) if (!q.dead) live++; for (const u of S.units) if (u.alive) live++;
    if (bodies !== live + 1) fail('body count mismatch after split', tag);
  }
}
console.log(`${tests} checks; ${bad} failures in ${seen.size} kinds`);
for (const [k, r] of seen) console.log(`  x ${k} x${r.n}   first: ${r.m}`);
process.exit(bad ? 1 : 0);
