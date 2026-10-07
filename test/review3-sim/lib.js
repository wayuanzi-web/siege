// 第三輪模擬審查共用：載入器（可指定別的原始碼目錄，方便跟舊版比）、每一步都跑的內部一致性檢查
// const L = require('./lib'); const G = L.load('segSplit, fracture');   // 環境變數 SIEGE_SRC=<目錄> 可換成別版的 src/parts
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const planck = require(path.join(ROOT, 'src', 'vendor', 'planck.min.js'));
const BASE = 'S, SH, PH, PL, simInit, simStep, simAim, simFire, simSkill, LEVELS, BOTS, CASTLES, UNIT, WL, WPN, MAT, DIFFS, teamBar, structBar, srand, rnd, aiInit, simTrace, aimFor, aimOk, groundY, mkCastle, physNew, physStep, physExplode, castleScan, blockKill, blockHurt, CS, GRAV, VIEW_W, MID, STEP';
function load(extra, dir) {
  dir = dir || process.env.SIEGE_SRC || path.join(ROOT, 'src', 'parts');
  const src = fs.readdirSync(dir).filter((f) => /^(10|40|45|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')
    + '\nreturn {' + BASE + (extra ? ', ' + extra : '') + ', __eval: (s) => eval(s)};';
  const G = new Function('planck', src)(planck);
  G.__dir = dir;
  return G;
}
const UPMAX = { dmg: 5, aim: 5, hp: 5, shield: 5, ult: 5 };

/* 內部一致性檢查。每呼叫一次 simStep 之後叫一次 chk.step(tag)。
   fails: Map<種類, {n, first}>；只記每一種的第一次（附當時的場次、時間），其餘只數次數 */
function mkCheck(G, o) {
  o = o || {};
  const { S, SH, PH, CS, teamBar, structBar } = G;
  const fails = new Map();
  const fail = (kind, msg) => { const r = fails.get(kind); if (r) r.n++; else fails.set(kind, { n: 1, first: msg }); if (o.onFail) o.onFail(kind, msg); };
  let lastKey = '', phaseAt = 0, stuck = false, orbBad = new Map(), backT = new Map();
  const st = { steps: 0, maxRub: 0, maxFrag: 0, maxBodies: 0, maxPhase: 0, maxPhaseAt: '' };
  function reset() { lastKey = ''; phaseAt = 0; stuck = false; orbBad = new Map(); backT = new Map(); }
  function step(tag) {
    st.steps++;
    const where = () => `${tag} t=${S.time.toFixed(2)} f=${S.frame} r${S.round} ${S.phase}/${S.turn}`;
    // --- 磚 ---
    let nf = 0, nb = 0, live = 0;
    for (const b of S.blocks) {
      if (b.dead) { if (b.inPlace) fail('dead block inPlace', where() + ` id${b.id}`); if (b.body) fail('dead block has body', where() + ` id${b.id}`); continue; }
      live++; if (b.frag) nf++; if (b.burn > 0) nb++;
      if (!b.body) { fail('live block without body', where() + ` id${b.id}`); continue; }
      const p = b.body.getPosition(), a = b.body.getAngle(), v = b.body.getLinearVelocity(), om = b.body.getAngularVelocity();
      if (!(isFinite(p.x) && isFinite(p.y) && isFinite(a) && isFinite(v.x) && isFinite(v.y) && isFinite(om))) fail('block NaN', where() + ` id${b.id} mat${b.mat} p=(${p.x},${p.y}) a=${a} v=(${v.x},${v.y}) om=${om}`);
      if (!(b.hp > 0)) fail('live block hp<=0', where() + ` id${b.id} mat${b.mat} hp=${b.hp} seg=${b.seg ? Array.from(b.seg).map((x) => x.toFixed(1)) : '-'}`);
      if (!isFinite(b.hp) || !isFinite(b.hm)) fail('block hp NaN', where() + ` id${b.id}`);
      if (b.seg) {
        let sum = 0, bad0 = false; for (let k = 0; k < b.seg.length; k++) { if (!(b.seg[k] > 0)) bad0 = true; sum += b.seg[k]; }
        if (b.seg.length !== b.cw) fail('seg length != cw', where() + ` id${b.id} ${b.seg.length} vs ${b.cw}`);
        if (bad0) fail('live seg block has dead cell', where() + ` id${b.id} [${Array.from(b.seg).map((x) => x.toFixed(1))}]`);
        if (Math.abs(sum - b.hp) > 0.5) fail('seg sum != hp', where() + ` id${b.id} hp=${b.hp.toFixed(2)} sum=${sum.toFixed(2)} [${Array.from(b.seg).map((x) => x.toFixed(1))}]`);
        if (Math.abs(b.w - b.cw * CS) > 0.01) fail('seg width != cw*CS', where() + ` id${b.id} w=${b.w} cw=${b.cw}`);
        if (b.frag || b.prop || b.kind !== 'box' || b.ch !== 1) fail('seg on wrong kind of block', where() + ` id${b.id}`);
        if (!(b.segM > 0) || Math.abs(b.hm - b.segM * b.cw) > 0.01) fail('seg hm != segM*cw', where() + ` id${b.id} hm=${b.hm} segM=${b.segM} cw=${b.cw}`);
        for (let k = 0; k < b.seg.length; k++) if (b.seg[k] > b.segM + 1e-3) fail('seg cell > segM', where() + ` id${b.id}`);
      }
      if (b.frag && b.inPlace) fail('frag inPlace', where() + ` id${b.id}`);
    }
    if (nf !== S.nfrag) fail('nfrag mismatch', where() + ` real=${nf} S.nfrag=${S.nfrag}`);
    if (nb !== S.nburn) fail('nburn mismatch', where() + ` real=${nb} S.nburn=${S.nburn}`);
    if (nf > st.maxFrag) st.maxFrag = nf;
    // --- 格子對照表 ---
    for (const s of S.structs) {
      if (s.loose) continue;
      for (let i = 0; i < s.n; i++) {
        const b = s.cellB[i]; if (!b) continue;
        if (b.st !== s) fail('cellB wrong struct', where());
        if (b.dead) { if (b.inPlace) fail('cellB -> dead block with inPlace', where() + ` id${b.id}`); continue; }
        const cx = i % s.cols, cy = (i / s.cols) | 0;
        if (cx < b.cx || cx >= b.cx + b.cw || cy < b.cy || cy >= b.cy + b.ch) fail('cellB -> block that does not cover the cell', where() + ` side${s.side} cell(${cx},${cy}) -> id${b.id} cells ${b.cx}..${b.cx + b.cw - 1},${b.cy}`);
      }
      for (const b of s.blocks) {
        if (b.dead || !b.seg) continue;
        for (let k = 0; k < b.cw; k++) { const i = b.cy * s.cols + b.cx + k; if (s.cellB[i] !== b) { fail('live seg block missing from cellB', where() + ` side${s.side} id${b.id} cell(${b.cx + k},${b.cy}) -> ${s.cellB[i] ? 'id' + s.cellB[i].id + (s.cellB[i].dead ? ' dead' : '') : 'null'}`); break; } }
      }
    }
    // --- 兵 ---
    let liveU = 0;
    for (let s = 0; s < 2; s++) {
      let a = 0;
      for (const u of S.team[s].units) {
        if (u.alive) {
          a++; liveU++;
          if (!u.body) { fail('alive unit without body', where() + ` ${u.type}`); continue; }
          const p = u.body.getPosition(); if (!(isFinite(p.x) && isFinite(p.y) && isFinite(u.x) && isFinite(u.y) && isFinite(u.hp))) fail('unit NaN', where() + ` ${u.type}`);
          if (!(u.hp > 0)) fail('alive unit hp<=0', where() + ` ${u.type} hp=${u.hp}`);
          if (u.hp > u.hpMax + 1e-6) fail('unit hp>max', where() + ` ${u.type}`);
        } else if (u.body) fail('dead unit has body', where() + ` ${u.type}`);
      }
      if (a !== S.team[s].alive) fail('alive count mismatch', where() + ` side${s} real=${a} T.alive=${S.team[s].alive}`);
    }
    // --- 砲彈 ---
    let c0 = 0, c1 = 0, c2 = 0;
    for (let i = 0; i < SH.n; i++) { const sd = SH.side[i]; if (sd === 0) c0++; else if (sd === 1) c1++; else c2++; if (!(isFinite(SH.x[i]) && isFinite(SH.y[i]) && isFinite(SH.vx[i]) && isFinite(SH.vy[i]) && isFinite(SH.mass[i]))) fail('shot NaN', where()); }
    if (c0 !== SH.cnt[0] || c1 !== SH.cnt[1] || c2 !== SH.cnt[2]) fail('shot count mismatch', where());
    // --- 城防 ---
    for (let s = 0; s < 2; s++) { const tb = teamBar(s), sb = structBar(s); if (!(tb >= 0 && tb <= 1 + 1e-9)) fail('teamBar out of range', where() + ` side${s} ${tb}`); if (!(sb >= 0 && sb <= 1 + 1e-9)) fail('structBar out of range', where() + ` side${s} ${sb}`); const stt = S.st[s]; if (stt.hpNow > stt.hp0 + 1e-6) fail('hpNow > hp0', where() + ` side${s} ${stt.hpNow} > ${stt.hp0}`); }
    // --- 物理世界 ---
    let bodies = 0;
    for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
      bodies++; const ud = b.getUserData();
      if (b === PH.ground) continue;
      if (!ud) { fail('body without userData', where()); continue; }
      if (ud.body !== b) fail('body/userData mismatch (orphan body)', where() + ` ${ud.isBlock ? 'block id' + ud.id + (ud.dead ? ' dead' : '') : 'unit ' + ud.type + (ud.alive ? '' : ' dead')}`);
    }
    if (bodies !== live + liveU + 1) fail('body count mismatch', where() + ` world=${bodies} expect=${live + liveU + 1}`);
    if (bodies > st.maxBodies) st.maxBodies = bodies;
    // --- 飛行物、落石 ---
    for (const ob of S.objs) {
      if (ob.t === 'orb' || ob.t === 'balloon') {
        if (!(isFinite(ob.x) && isFinite(ob.y))) fail('flyer NaN', where() + ` ${ob.t} ${ob.st}`);
        if (ob.hp <= 0 && ob.st !== 'back') { const n = (orbBad.get(ob) || 0) + 1; orbBad.set(ob, n); if (n === 3) fail('dead flyer kept in S.objs', where() + ` ${ob.t} st=${ob.st} hp=${ob.hp}`); }
        if (ob.st === 'back') { if (!backT.has(ob)) backT.set(ob, S.time); else if (S.time - backT.get(ob) > 4 && !ob._rep) { ob._rep = 1; fail('orb stuck in back > 4s', where() + ` at (${ob.x.toFixed(1)},${ob.y.toFixed(1)}) -> (${ob.tx.toFixed(1)},${ob.ty.toFixed(1)})`); } if (ob.t !== 'orb') fail('non-orb in back', where()); if (ob.side !== 0) fail('back orb side != 0', where()); }
      }
    }
    if (S.rubble) { let r = 0; for (const b of S.rubble.blocks) if (!b.dead) r++; if (r > st.maxRub) st.maxRub = r; if (r > 7) fail('more than 7 rocks alive', where() + ` ${r}`); }
    // --- 卡住 ---
    const key = S.phase + '|' + S.turn + '|' + S.round;
    if (key !== lastKey) { lastKey = key; phaseAt = S.time; stuck = false; }
    else if (S.state === 'play') { const d = S.time - phaseAt; if (d > st.maxPhase) { st.maxPhase = d; st.maxPhaseAt = where(); } if (d > (o.stuckT || 14) && !stuck) { stuck = true; fail('phase stuck', where() + ` shots=${SH.n} pend=${S.pend.length} nburn=${S.nburn}`); } }
  }
  return { step, fails, stats: st, reset, fail };
}
function report(fails, max) {
  const out = []; for (const [k, r] of fails) out.push(`  x ${k}  x${r.n}   first: ${r.first}`);
  return out.slice(0, max || 60).join('\n');
}
module.exports = { load, mkCheck, report, UPMAX, ROOT };
