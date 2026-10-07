// node test/review3-sim/split_inplace.js [fire]
// 不用爆炸（沒有任何推力），把每一關每一塊樓板、長樑的每一段各打穿一次（撞擊傷害直接算在那一段），放 7 秒看後果：
//   · 有沒有東西在沒被炸的情況下往上、往旁邊飛（速度多快）    · 打穿這一段，哪些兵會死、怎麼死的
//   · 7 秒後是不是都停了                                      · 內部一致性
// 加 fire：改成把那一塊木樑點火燒（先把那一段打到快穿），讓它自己燒斷
const L = require('./lib'); const G = L.load('K_CRUSH, M_WOOD');
const { S, PH, simInit, simStep, LEVELS, CS, blockHurt, K_CRUSH, M_WOOD } = G;
const fire = process.argv[2] === 'fire';
const chk = L.mkCheck(G, { stuckT: 1e9 });
const HOW = ['hit', 'crushed', '?', 'burnt', 'fell out', 'out of castle'];
let runs = 0, splits = 0; const up = [], side = [], notQuiet = [], kills2 = [], killTab = {};
for (let li = 0; li < LEVELS.length; li++) {
  simInit(li, {}, 5, 1, null);
  const segs = S.blocks.filter((b) => b.seg && (!fire || b.mat === M_WOOD)).map((b) => ({ id: b.id, cw: b.cw, side: b.side }));
  for (const sg of segs) for (let k = 0; k < sg.cw; k++) {
    simInit(li, {}, 5, 1, null); S.team[1].ai = null; S.phase = 'resolve'; S.turn = sg.side === 0 ? 1 : 0; S.round = 1; chk.reset(); runs++;
    const b = S.blocks.find((q) => q.id === sg.id), tag = `L${li + 1} side${b.side} ${b.mat === 1 ? 'wood beam' : b.mat === 5 ? 'ice slab' : 'stone slab'} row${b.cy} cells ${b.cx}..${b.cx + b.cw - 1}, break cell ${b.cx + k}${fire ? ' by fire' : ''}`;
    const dead = []; let split = 0, lastSplit = -1e9, id0 = S.bid;
    S.on = (t, a, bb, c, d, e, f) => { if (t === 'udie') dead.push(`side${c} ${d}#${f} ${HOW[e]}`); if (t === 'cell' && f && !f.isBlock) { split++; lastSplit = S.frame; } };
    const x = b.x0 - b.w / 2 + (k + 0.5) * (b.w / b.cw);
    if (fire) { blockHurt(b, b.seg[k] - 0.6, K_CRUSH, 2, x, b.y0); b.burn = 3; b.burnBy = 1 - b.side; S.nburn++; }
    else blockHurt(b, 1e4, K_CRUSH, 2, x, b.y0);
    let mUp = 0, wUp = '', mSide = 0, wSide = '';
    const nm = (o) => o.isBlock ? `${o.frag ? 'frag' : o.kind === 'ball' ? 'ball' : o.prop ? 'prop' : (o.seg ? 'seg' : 'blk') + o.cw + 'x' + o.ch} m${o.mat} c(${o.cx},${o.cy})` : `unit ${o.type}`;
    try {
      for (let i = 0; i < 420; i++) {
        S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); chk.step(tag);
        for (const o of S.blocks) {
          if (o.dead) continue; const v = o.body.getLinearVelocity();
          if (o.frag && S.frame - lastSplit < 20) continue;       // 碎塊剛生出來本來就會往外彈一下
          if (v.y > mUp) { mUp = v.y; wUp = nm(o) + ` t=${(i / 60).toFixed(2)}`; } if (!o.frag && Math.abs(v.x) > mSide) { mSide = Math.abs(v.x); wSide = nm(o) + ` t=${(i / 60).toFixed(2)}`; }
        }
        for (const u of S.units) if (u.alive) { const v = u.body.getLinearVelocity(); if (v.y > mUp) { mUp = v.y; wUp = nm(u) + ` t=${(i / 60).toFixed(2)}`; } }
      }
    } catch (e) { chk.fail('EXCEPTION', `${tag}: ${e.stack.split('\n').slice(0, 4).join(' | ')}`); }
    splits += split;
    up.push([mUp, `${tag}: vy=${mUp.toFixed(1)} ${wUp}`]); side.push([mSide, `${tag}: |vx|=${mSide.toFixed(1)} ${wSide}`]);
    if (S.state === 'play') { let mv = 0; for (let q = PH.world.getBodyList(); q; q = q.getNext()) { if (!q.isDynamic() || !q.isAwake()) continue; const p = q.getPosition(); if (p.x < -11 || p.x > 123 || p.y < -10) continue; const v = q.getLinearVelocity(); if (v.x * v.x + v.y * v.y > 3.2 || Math.abs(q.getAngularVelocity()) > 0.7) mv++; } if (mv && S.nburn === 0) notQuiet.push(tag); }
    const mine = dead.filter((d) => d.startsWith('side' + b.side));
    if (mine.length) killTab[tag] = mine.join(', ');
    if (mine.length >= 2) kills2.push(`${tag}: ${mine.join(', ')}`);
  }
}
const top = (a, n) => a.sort((p, q) => q[0] - p[0]).slice(0, n).map((r) => '   ' + r[1]).join('\n');
console.log(`${runs} runs, ${splits} splits (no blast, no push)`);
console.log('fastest upward motion seen (anything; fragments only after their first 1/3 s):'); console.log(top(up, 8));
console.log('fastest sideways motion of a non-fragment:'); console.log(top(side, 8));
console.log(`not settled after 7s: ${notQuiet.length}`); for (const t of notQuiet.slice(0, 10)) console.log('   ' + t);
console.log(`single-cell breaks that kill units of that castle: ${Object.keys(killTab).length}`); for (const k of Object.keys(killTab)) console.log(`   ${k}: ${killTab[k]}`);
console.log(`...of which kill two or more: ${kills2.length}`);
if (chk.fails.size) { console.log(`${chk.fails.size} kinds of invariant failure:`); console.log(L.report(chk.fails)); } else console.log('no invariant failures');
