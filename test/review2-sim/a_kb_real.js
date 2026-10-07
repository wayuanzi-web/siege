// node test/review2-sim/a_kb_real.js [關卡=1,2,3,4,5,6] [場數=16] [bot=casual]
// A1（真的對局）：兵有沒有「光靠爆炸」被加速到遠超過 UKB_V（9）？
// 定義一段「連續挨炸」（burst）：同一個兵接連被爆炸推（中間隔不到 0.1 秒）。記：開始前的速度、這一段裡爆炸給的速度總和（向量）、
// 最後一推之後的速度、這一段期間有沒有碰到「正在動的磚」（相對速度 > 3；有的話就不算純爆炸）。
// 「乾淨的 burst」＝開始時幾乎靜止（< 1.5）而且全程沒碰到會動的磚：之後的速度只可能來自爆炸（加上重力、地板和牆，這些只會讓它變慢）。
const { load, H } = require('./lib');
const G = load();
const { S, simInit, simStep, BOTS, LEVELS, UKB_V } = G;
const lvs = (process.argv[2] || '1,2,3,4,5,6').split(',').map((x) => +x - 1), N = +(process.argv[3] || 16), bot = process.argv[4] || 'casual';
for (const li of lvs) {
  const bursts = []; const outs = [];
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, H.seed(9000, sd, li), 1, { botA: BOTS[bot] });
    const cur = new Map();
    S.onKb = (u, j, nx, ny, w, side) => {
      const v = u.body.getLinearVelocity(), dvx = nx * j / u.mass, dvy = (ny * j + 0.3 * j) / u.mass;
      let b = cur.get(u);
      if (!b || S.time - b.tLast > 0.1) { if (b) bursts.push(b); b = { li, sd, u: u.type + '#' + u.slot, side: u.side, r: S.round, t0: S.time, v0: [v.x - dvx, v.y - dvy], sx: 0, sy: 0, n: 0, dirty: false, dirs: [], frames: new Set(), y0: u.y, x0: u.x - u.st.x0, unit: u }; cur.set(u, b); }
      b.sx += dvx; b.sy += dvy; b.n++; b.tLast = S.time; b.v1 = [v.x, v.y]; b.frames.add(S.frame); if (b.dirs.length < 60) b.dirs.push(Math.round(Math.atan2(ny, nx) * 57.3));
    };
    S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && (e === 4 || e === 5)) { const u = S.units.find((k) => k.side === c && k.slot === f); outs.push({ li, sd, u: d + '#' + f, side: c, r: S.round, t: S.time, how: e, unit: u }); } };
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      // 這一步有沒有碰到正在動的磚
      for (const [u, b] of cur) {
        if (!u.alive || !u.body) continue; if (S.time - b.tLast > 0.1) continue;
        const uv = u.body.getLinearVelocity();
        for (let ce = u.body.getContactList(); ce; ce = ce.next) { if (!ce.contact.isTouching()) continue; const o = ce.other.getUserData(); if (!o || !o.isBlock) continue; const ov = ce.other.getLinearVelocity(); if (Math.hypot(ov.x, ov.y) > 3 && Math.hypot(ov.x - uv.x, ov.y - uv.y) > 1) b.dirty = true; if (Math.hypot(ov.x, ov.y) > 3) b.onMoving = true; }
      }
    }
    for (const b of cur.values()) bursts.push(b);
    S.onKb = null; S.on = null;
  }
  const sp = (v) => Math.hypot(v[0], v[1]);
  const clean = bursts.filter((b) => sp(b.v0) < 1.5 && !b.dirty && !b.onMoving);
  const top = clean.slice().sort((a, b) => sp(b.v1) - sp(a.v1));
  const cnt = (th) => clean.filter((b) => sp(b.v1) > th).length;
  console.log(`\nL${li + 1} ${LEVELS[li].name} — ${N} ${bot} games: ${bursts.length} blast bursts on units; ${clean.length} "clean" (unit at rest before, never touched a moving block during the burst).`);
  console.log(`   speed right after the last push of a clean burst: >9.9: ${cnt(9.9)}   >12: ${cnt(12)}   >15: ${cnt(15)}   >20: ${cnt(20)}   max ${top.length ? sp(top[0].v1).toFixed(1) : '-'}   (UKB_V = ${UKB_V}; a single direction tops out at 9.4–9.9)`);
  const hsp = (b) => Math.abs(b.v1[0]);
  console.log(`   horizontal speed after a clean burst: >9.9: ${clean.filter((b) => hsp(b) > 9.9).length}   >12: ${clean.filter((b) => hsp(b) > 12).length}   >15: ${clean.filter((b) => hsp(b) > 15).length}`);
  for (const b of top.slice(0, 4)) console.log(`     sd ${b.sd} r${b.r} ${b.side ? 'foe' : 'my'} ${b.u}: ${b.n} pushes over ${b.frames.size} steps (${(b.tLast - b.t0).toFixed(2)}s) from rest → v=(${b.v1[0].toFixed(1)},${b.v1[1].toFixed(1)}) |v|=${sp(b.v1).toFixed(1)}; sum of blast pushes (${b.sx.toFixed(1)},${b.sy.toFixed(1)}); push directions (deg): ${b.dirs.slice(0, 16).join(' ')}${b.dirs.length > 16 ? ' …' : ''}`);
  // 被轟出城／掉出場的兵：出事前最後一段 burst
  let o1 = 0, o2 = 0, o3 = 0; const ex = [];
  for (const o of outs) {
    const bs = bursts.filter((b) => b.unit === o.unit && b.sd === o.sd && b.tLast <= o.t && o.t - b.tLast < 4).sort((p, q) => q.tLast - p.tLast);
    const b = bs[0]; if (!b) { o3++; continue; }
    const cl = sp(b.v0) < 1.5 && !b.dirty && !b.onMoving;
    if (cl && sp(b.v1) > 11) { o1++; if (ex.length < 4) ex.push(`sd ${o.sd} r${o.r} ${o.side ? 'foe' : 'my'} ${o.u}: clean burst of ${b.n} pushes → v=(${b.v1[0].toFixed(1)},${b.v1[1].toFixed(1)}), left the castle ${(o.t - b.tLast).toFixed(1)}s later (${o.how === 4 ? 'off the field' : 'out of castle'})`); } else o2++;
  }
  console.log(`   units that left their castle (off field / out): ${outs.length} (mine ${outs.filter((o) => o.side === 0).length}, foe ${outs.filter((o) => o.side === 1).length}).  preceded (<4s) by a clean blast-only burst that ended above 11 u/s: ${o1};  by a burst that involved moving blocks or ≤11 u/s: ${o2};  no blast push at all in the 4s before (carried/fell with the structure): ${o3}`);
  for (const e of ex) console.log('     ' + e);
}
