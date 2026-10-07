// node test/review3-sim/rocks.js [場數=40] [回合=20] [關卡=4] [every=關卡原本的] [n=關卡原本的] [foe=關卡原本的]
// 落石：兩邊都不開火，只讓落石一回合一回合砸（可以改成每回合砸、一次砸好幾顆來加壓）。
// 看：場上同時最多幾顆、落點分布（我方城／中間／敵城）、有沒有卡在半空或一直不停、落石階段多久結束、砸死幾個兵、有沒有掉進沒有地面的地方
const L = require('./lib'); const G = L.load('rockMarks, dropRock');
const { S, SH, PH, simInit, simStep, simFire, LEVELS, groundY } = G;
const N = +(process.argv[2] || 40), R = +(process.argv[3] || 20), li = +(process.argv[4] || 4) - 1;
const lv = LEVELS[li]; if (!lv.rocks && !lv.boss) { console.log('no rocks on this level'); process.exit(0); }
if (lv.rocks) { if (process.argv[5]) lv.rocks.every = +process.argv[5]; if (process.argv[6]) lv.rocks.n = +process.argv[6]; if (process.argv[7] !== undefined) lv.rocks.foe = +process.argv[7]; }
console.log(`L${li + 1} rocks=${JSON.stringify(lv.rocks || lv.boss)}  src=${G.__dir}`);
const chk = L.mkCheck(G);
let maxLive = 0, hz = 0, hzT = 0, hzCap = 0, marks = [0, 0, 0], dead = [0, 0], ended = [0, 0], fallLeak = 0, restOn = { ground: 0, mine: 0, foe: 0, air: 0, gone: 0 }, drops = 0, moving = 0, voidMarks = 0; const ex = [];
for (let sd = 0; sd < N; sd++) {
  const seed = 6100 + sd * 104729, tag = `L${li + 1} seed${seed}`;
  simInit(li, {}, seed, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].mute = true; chk.reset();
  if (lv.boss) S.boss.phase = 3;                                         // 魔王關：直接進第三階段才有隕石
  S.on = (t, a, b, c, d, e, f) => { if (t === 'udie') dead[c]++; };
  let pre = '', preT = 0, preQ = 0, lastMarks = 0;
  try {
    while (S.state === 'play' && S.round <= R) {
      if (S.phase === 'aim') { if (S.turn === 0) simFire(0); else simFire(1); }
      if (S.marks.length !== lastMarks) { for (let i = lastMarks; i < S.marks.length; i++) { const x = S.marks[i].x; marks[x < S.st[0].x1 + 1 ? 0 : x > S.st[1].x0 - 1 ? 2 : 1]++; if (groundY(x) < -100) voidMarks++; } lastMarks = S.marks.length; }
      pre = S.phase; preT = S.phaseT; preQ = S.quietT; const m0 = S.marks.length;
      simStep(1 / 60); chk.step(tag);
      if (pre !== 'hazard' && S.phase === 'hazard') drops += m0;
      if (S.marks.length === 0) lastMarks = 0;
      if (pre === 'hazard' && S.phase !== 'hazard') {
        hz++; hzT += preT; if (preT + 1 / 60 > 9 && preQ + 1 / 60 < 0.45) { hzCap++; if (ex.length < 8) ex.push(`${tag} r${S.round - 1}: hazard ran to the 9s cap; rocks: ` + S.rubble.blocks.filter((b) => !b.dead).map((b) => { const p = b.body.getPosition(), v = b.body.getLinearVelocity(); return `(${p.x.toFixed(1)},${p.y.toFixed(1)}) v=${Math.hypot(v.x, v.y).toFixed(1)}${b.fall ? ' fall' : ''}`; }).join(' ')); }
        for (const b of S.rubble.blocks) if (!b.dead && b.fall) fallLeak++;
      }
      let live = 0; for (const b of S.rubble.blocks) if (!b.dead) live++; if (live > maxLive) maxLive = live;
    }
  } catch (e) { chk.fail('EXCEPTION', `${tag}: ${e.stack.split('\n').slice(0, 4).join(' | ')}`); }
  if (S.state !== 'play') ended[S.state === 'won' ? 1 : 0]++;
  // 最後每一顆石頭停在哪
  for (const b of S.rubble.blocks) {
    if (b.dead) { restOn.gone++; continue; }
    const p = b.body.getPosition(), v = b.body.getLinearVelocity(), gy = groundY(p.x);
    if (Math.hypot(v.x, v.y) > 1.8 && b.body.isAwake()) moving++;
    let under = null; for (let ce = b.body.getContactList(); ce; ce = ce.next) { if (!ce.contact.isTouching()) continue; const o = ce.other.getUserData(); const q = ce.other.getPosition(); if (!o) { under = 'ground'; break; } if (o.isBlock && q.y < p.y) under = o.side === 0 ? 'mine' : o.side === 1 ? 'foe' : under || 'ground'; }
    restOn[under || 'air']++; if (!under && ex.length < 8) ex.push(`${tag}: rock touching nothing at (${p.x.toFixed(1)},${p.y.toFixed(1)}) v=${Math.hypot(v.x, v.y).toFixed(1)} awake=${b.body.isAwake()} groundY=${gy}`);
  }
}
console.log(`${N} games x <=${R} rounds: rocks dropped ${drops}; marks on my castle / middle / enemy castle = ${marks.join(' / ')} (${(100 * marks[2] / Math.max(1, marks[0] + marks[1] + marks[2])).toFixed(0)}% enemy); marks over a void ${voidMarks}`);
console.log(`max rocks alive at once ${maxLive}; hazard phases ${hz}, mean ${(hzT / Math.max(1, hz)).toFixed(2)}s, ran to the 9s cap ${hzCap}; rocks still flagged 'falling' when the hazard phase ended ${fallLeak}`);
console.log(`units killed (nobody firing): mine ${dead[0]}, enemy ${dead[1]}; games ended by rocks alone: lost ${ended[0]}, won ${ended[1]}`);
console.log(`where the rocks left at the end rest: on the ground ${restOn.ground}, on my castle ${restOn.mine}, on the enemy castle ${restOn.foe}, touching nothing ${restOn.air}; still moving ${moving}`);
for (const e of ex) console.log('   ' + e);
if (chk.fails.size) { console.log(`${chk.fails.size} kinds of invariant failure:`); console.log(L.report(chk.fails)); } else console.log('no invariant failures');
