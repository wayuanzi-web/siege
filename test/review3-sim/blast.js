// node test/review3-sim/blast.js grid [第幾份=0] [共幾份=1] [只跑第幾關=0]
// node test/review3-sim/blast.js rand <組數=600> [第幾份=0] [共幾份=1] [起始編號=0]
// 開局後直接在城樓各處引爆（兩邊的城、每一格的中心，各種砲彈），或是隨機連續引爆好幾發，然後讓世界跑幾秒。
// 每一步檢查內部一致性，另外量：
//   · 沒有任何爆炸、沒有磚碎掉的時候，整個世界的力學能（動能＋位能）有沒有自己變多
//   · 最後一次爆炸過了 1.5 秒之後，還有沒有東西往上飛得很快
//   · 過了 8 秒（隨機模式 10 秒）還有沒有東西在動（沒辦法「塵埃落定」）
const L = require('./lib'); const G = L.load('physQuery, blockDist, F_FIRE');
const { S, SH, PH, simInit, simStep, LEVELS, physExplode, WPN, CS, physQuery, blockDist, teamBar, structBar } = G;
const mode = process.argv[2] || 'grid';
const chk = L.mkCheck(G, { stuckT: 1e9 });
const out = { runs: 0, splits: 0, noQuiet: 0, upLate: [], eGain: [], noQuietEx: [], barUp: [], deadAll: 0, t0: Date.now() };
function energy() {
  let ke = 0, pe = 0;
  for (const b of S.blocks) { if (b.dead) continue; const v = b.body.getLinearVelocity(), w = b.body.getAngularVelocity(); ke += 0.5 * b.mass * (v.x * v.x + v.y * v.y) + 0.5 * b.body.getInertia() * w * w; pe += b.mass * 48 * b.body.getWorldCenter().y; }
  for (const u of S.units) if (u.alive) { const v = u.body.getLinearVelocity(); ke += 0.5 * u.mass * (v.x * v.x + v.y * v.y); pe += u.mass * 48 * u.body.getWorldCenter().y; }
  return ke + pe;
}
function hitAt(x, y) { let best = null; for (const o of physQuery(x, y, 0.2)) if (o.isBlock && !o.dead && blockDist(o, x, y) <= 1e-6) { best = o; break; } return best; }
// plan: [{t, x, y, w, side, mass, flag, direct}]
function run(tag, li, seed, plan, T) {
  simInit(li, {}, seed, 1, null); S.team[1].ai = null; S.phase = 'resolve'; S.turn = plan[0].side < 2 ? plan[0].side : 0; S.round = 1;
  chk.reset(); out.runs++;
  let lastEv = -1, evs = 0, splitsHere = 0, bodies0 = 0;
  S.on = (t, a, b, c, d, e, f) => { if (t === 'boom' || t === 'cell' || t === 'udie' || t === 'bossback' || t === 'revive' || t === 'phase') { lastEv = S.frame; evs++; if (t === 'cell' && f && !f.isBlock) splitsHere++; } };
  let pi = 0, prevE = energy(), gain = 0, gainMax = 0, upMax = 0, upWho = '', prevBar = [structBar(0), structBar(1)], barUp = 0;
  const steps = Math.round(T * 60);
  try {
    for (let i = 0; i < steps; i++) {
      S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0;
      while (pi < plan.length && plan[pi].t <= i / 60 + 1e-9) {
        const p = plan[pi++]; S.turn = p.side < 2 ? p.side : S.turn;
        physExplode(p.x, p.y, WPN[p.w], p.side, p.mass || 1, p.flag || 0, p.direct ? hitAt(p.x, p.y) : null, 0, -1);
        lastEv = S.frame + 1;
      }
      const ev0 = evs, nb0 = S.nburn, pend0 = S.pend.length;
      simStep(1 / 60);
      chk.step(tag);
      const E = energy();
      // 力學能只會越來越少（撞擊、摩擦都是損耗）。以「最近一次爆炸、磚碎掉、兵倒下之後」的能量當基準：之後要是比基準還高，就是憑空多出來的
      if (evs !== ev0 || S.frame - lastEv <= 2 || pend0 !== 0 || S.state !== 'play') prevE = E;
      else if (E - prevE > gain) { gain = E - prevE; gainMax = i / 60; }
      if (S.frame - lastEv > 90 && S.state === 'play') {
        for (const b of S.blocks) { if (b.dead) continue; const v = b.body.getLinearVelocity(); if (v.y > upMax) { upMax = v.y; const p = b.body.getPosition(); upWho = `${b.frag ? 'frag' : b.kind === 'ball' ? 'ball' : b.prop ? 'prop' : b.seg ? 'seg' + b.cw : 'blk' + b.cw + 'x' + b.ch} m${b.mat} s${b.side} @(${p.x.toFixed(1)},${p.y.toFixed(1)}) t=${(i / 60).toFixed(2)}`; } }
        for (const u of S.units) if (u.alive) { const v = u.body.getLinearVelocity(); if (v.y > upMax) { upMax = v.y; upWho = `unit ${u.type} s${u.side} t=${(i / 60).toFixed(2)}`; } }
      }
      if (S.state === 'play' && (S.frame & 3) === 0) for (let s = 0; s < 2; s++) { const sb = structBar(s); if (sb > prevBar[s] + 1e-9) barUp = Math.max(barUp, sb - prevBar[s]); prevBar[s] = sb; }
    }
  } catch (e) { chk.fail('EXCEPTION', `${tag}: ${e.stack.split('\n').slice(0, 4).join(' | ')}`); }
  out.splits += splitsHere;
  if (S.state !== 'play') out.deadAll++;
  // 還在動的
  if (S.state === 'play') {
    const mv = [];
    for (let b = PH.world.getBodyList(); b; b = b.getNext()) { if (!b.isDynamic() || !b.isAwake()) continue; const p = b.getPosition(); if (p.x < -11 || p.x > 123 || p.y < -10) continue; const v = b.getLinearVelocity(); if (v.x * v.x + v.y * v.y > 3.2 || Math.abs(b.getAngularVelocity()) > 0.7) { const u = b.getUserData(); mv.push(`${u.isBlock ? (u.frag ? 'frag' : u.kind === 'ball' ? 'ball' : u.prop ? 'prop' : 'blk' + u.cw + 'x' + u.ch) + ' m' + u.mat + ' s' + u.side : 'unit'}@(${p.x.toFixed(1)},${p.y.toFixed(1)}) v=${Math.hypot(v.x, v.y).toFixed(1)}`); } }
    if (mv.length && S.nburn === 0) { out.noQuiet++; if (out.noQuietEx.length < 25) out.noQuietEx.push(`${tag}: ${mv.slice(0, 3).join(' ; ')}`); }
  }
  if (upMax > 12) out.upLate.push([upMax, `${tag}: vy=${upMax.toFixed(1)} ${upWho}`]);
  if (gain > 150) out.eGain.push([gain, `${tag}: energy rose ${gain.toFixed(0)} above the level after the last blast/break (at t=${gainMax.toFixed(2)})`]);
  if (barUp > 0.02) out.barUp.push([barUp, `${tag}: structBar rose by ${barUp.toFixed(3)}`]);
}
const WS = ['bomb', 'doom', 'keg', 'fire', 'ice', 'zap', 'rocket', 'drop'];
if (mode === 'grid') {
  const shard = +(process.argv[3] || 0), nsh = +(process.argv[4] || 1), only = +(process.argv[5] || 0); let idx = 0;
  for (let li = 0; li < LEVELS.length; li++) {
    if (only && li !== only - 1) continue;
    simInit(li, {}, 3, 1, null);
    const sts = S.structs.filter((s) => !s.loose).map((s) => ({ x0: s.x0, y0: s.y0, cols: s.cols, rows: s.rows, side: s.side }));
    for (const st of sts) for (let cy = -1; cy <= st.rows; cy++) for (let cx = -1; cx <= st.cols; cx++) for (const w of WS) {
      if (idx++ % nsh !== shard) continue;
      const x = st.x0 + (cx + 0.5) * CS, y = st.y0 + (cy + 0.5) * CS, side = st.side === 0 ? 1 : 0;
      run(`grid L${li + 1} castle${st.side} cell(${cx},${cy}) ${w}`, li, 3, [{ t: 0, x, y, w, side, mass: 1, flag: w === 'fire' ? G.F_FIRE : 0, direct: (cx + cy) % 2 === 0 }], 8);
    }
  }
} else {
  const N = +(process.argv[3] || 600), shard = +(process.argv[4] || 0), nsh = +(process.argv[5] || 1), g0 = +(process.argv[6] || 0);
  let seed = 1; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let g = g0; g < g0 + N; g++) {
    if (g % nsh !== shard) continue;
    seed = (g * 2654435761 + 12345) >>> 0; rnd();
    const li = g % 6; simInit(li, {}, 3, 1, null);
    const sts = S.structs.filter((s) => !s.loose), st = sts[(rnd() * Math.min(sts.length, 2)) | 0], n = 2 + ((rnd() * 5) | 0), plan = [];
    const cx0 = st.x0 + rnd() * st.w, cy0 = st.y0 + rnd() * st.h; let t = 0;
    for (let k = 0; k < n; k++) {
      const w = WS[(rnd() * WS.length) | 0];
      plan.push({ t, x: cx0 + (rnd() - 0.5) * 12, y: Math.max(0.5, cy0 + (rnd() - 0.5) * 12), w, side: rnd() < 0.85 ? (st.side === 0 ? 1 : 0) : 2, mass: [0.4, 1, 1, 2.2][(rnd() * 4) | 0], flag: w === 'fire' || rnd() < 0.15 ? G.F_FIRE : 0, direct: rnd() < 0.5 });
      t += [0.05, 0.3, 0.8, 1.6, 2.5][(rnd() * 5) | 0];
    }
    run(`rand g${g} L${li + 1} castle${st.side} ${plan.map((p) => `${p.w}@${p.t.toFixed(2)}(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' ')}`, li, 3, plan, t + 10);
  }
}
const top = (a, n) => a.sort((p, q) => q[0] - p[0]).slice(0, n).map((r) => '   ' + r[1]).join('\n');
console.log(`${mode}: ${out.runs} runs, ${chk.stats.steps} steps, ${((Date.now() - out.t0) / 1000).toFixed(0)}s; slab/beam splits ${out.splits}; runs that ended the game ${out.deadAll}`);
console.log(`not settled at the end (no fire burning): ${out.noQuiet}`); for (const l of out.noQuietEx) console.log('   ' + l);
console.log(`late upward speed > 12 (more than 1.5s after the last blast/break): ${out.upLate.length}`); console.log(top(out.upLate, 15));
console.log(`energy rising > 150 above the post-blast level with nothing exploding or breaking: ${out.eGain.length}`); console.log(top(out.eGain, 15));
console.log(`structBar rising by > 0.02: ${out.barUp.length}`); console.log(top(out.barUp, 15));
if (chk.fails.size) { console.log(`${chk.fails.size} kinds of invariant failure:`); console.log(L.report(chk.fails)); } else console.log('no invariant failures');
