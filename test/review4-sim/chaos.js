// node test/review4-sim/chaos.js <場數=24> [第幾份=0] [共幾份=1] [起始編號=0] [每秒幾次亂炸=1.5]
// 壓力測試：自動玩家照常對打，同時「老天爺」不停亂來：在兩座城裡隨機引爆各種砲彈（含中立的）、點火、冰凍、直接打穿樓板的一格、
// 丟落石、放援軍（復活）、補滿技能、把兵往旁邊推。每一步都檢查內部一致性（沿用第三輪的 mkCheck），另外加：
//   兵跑到地面以下、兵長時間深深卡在磚裡、磚掉到地面以下卻還活著、速度離譜、碎塊超過上限、例外
const L3 = require('../review3-sim/lib'); const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, SH, PH, simInit, simStep, LEVELS, BOTS, WL, WPN, physExplode, blockHurt, blockKill, ignite, dropRock, grantBonus, groundY, FRAG_MAX, CS, simSkill } = G;
const N = +(process.argv[2] || 24), shard = +(process.argv[3] || 0), nsh = +(process.argv[4] || 1), g0 = +(process.argv[5] || 0), RATE = +(process.argv[6] || 1.5);
const BURST = +(process.env.BURST || 0);
const chk = L3.mkCheck(G);
const BN = ['newbie', 'casual', 'expert'];
let rs = 1; const R = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
let games = 0, exc = 0, acts = {}, deepT = new Map(), res = { won: 0, lost: 0, play: 0 };
const t00 = Date.now();
function extra(tag) {
  const where = () => `${tag} t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn}`;
  let nf = 0;
  for (const b of S.blocks) {
    if (b.dead) continue; if (b.frag) nf++;
    const p = b.body.getPosition(), v = b.body.getLinearVelocity(), gy = groundY(p.x);
    if (v.x * v.x + v.y * v.y > 150 * 150) chk.fail('block faster than 150', where() + ` ${L.bdesc(b)} v=(${v.x.toFixed(0)},${v.y.toFixed(0)})`);
    if (gy > -100 && p.y < gy - Math.max(1.2, (b.kind === 'ball' ? b.r : Math.min(b.w, b.h) / 2) + 0.6) && p.x > -9 && p.x < 121) chk.fail('block below the ground surface', where() + ` ${L.bdesc(b)} at (${p.x.toFixed(1)},${p.y.toFixed(1)}) ground ${gy.toFixed(1)}`);
  }
  if (nf > FRAG_MAX) chk.fail('more fragments than FRAG_MAX', where() + ` ${nf}`);
  for (const u of S.units) {
    if (!u.alive) continue;
    const p = u.body.getPosition(), gy = groundY(p.x), v = u.body.getLinearVelocity();
    const feet = p.y - u.bh / 2; if (gy > -100 && feet < gy - 0.5) chk.fail('unit below the ground surface', where() + ` side${u.side} ${u.type} feet ${feet.toFixed(2)} ground ${gy.toFixed(2)} x=${p.x.toFixed(1)}`);
    if (v.x * v.x + v.y * v.y > 120 * 120) chk.fail('unit faster than 120', where() + ` ${u.type}`);
    // 卡在磚裡多深
    let deep = 0, who = '';
    for (let ce = u.body.getContactList(); ce; ce = ce.next) { const c = ce.contact; if (!c.isTouching()) continue; const wm = c.getWorldManifold(null); if (!wm) continue; for (let k = 0; k < wm.pointCount; k++) if (-wm.separations[k] > deep) { deep = -wm.separations[k]; const o = ce.other.getUserData(); who = o ? (o.isUnit ? 'unit:' + o.type : L.bdesc(o)) : 'ground'; } }
    if (deep > 0.5) { const t = (deepT.get(u) || 0) + 1; deepT.set(u, t); if (t === 45) chk.fail('unit stuck > 0.5 deep inside something for 0.75 s', where() + ` side${u.side} ${u.type} depth ${deep.toFixed(2)} in ${who}`); } else deepT.delete(u);
  }
}
function act(tag) {
  const k = R(), a = (n) => { acts[n] = (acts[n] || 0) + 1; };
  const sd = R() < 0.5 ? 0 : 1, st = S.st[sd];
  const live = st.blocks.filter((b) => !b.dead);
  const rx = st.x0 + R() * st.w, ry = st.y0 + R() * (st.h + 4);
  if (k < 0.30) { const w = WL[(R() * WL.length) | 0], side = R() < 0.4 ? 0 : R() < 0.7 ? 1 : 2; let hit = null; if (R() < 0.5 && live.length) { hit = live[(R() * live.length) | 0]; } const p = hit ? hit.body.getPosition() : null; physExplode(p ? p.x : rx, p ? p.y : ry, w, side, 0.2 + R() * R() * 6, R() < 0.2 ? 4 : 0, hit, (R() - 0.5) * 60, (R() - 0.7) * 60); a('explode'); }
  else if (k < 0.42) { const segs = live.filter((b) => b.seg); if (segs.length) { const b = segs[(R() * segs.length) | 0], p = b.body.getPosition(), kk = (R() * b.cw) | 0, cs = Math.cos(b.body.getAngle()), sn = Math.sin(b.body.getAngle()), lx = -b.w / 2 + (kk + 0.5) * (b.w / b.cw); blockHurt(b, 5 + R() * 400, (R() * 8) | 0, (R() * 3) | 0, p.x + lx * cs, p.y + lx * sn); a('segHit'); } }
  else if (k < 0.52) { if (live.length) { const b = live[(R() * live.length) | 0]; ignite(b, 1 + R() * 5, (R() * 3) | 0); a('ignite'); } }
  else if (k < 0.60) { if (live.length) { const b = live[(R() * live.length) | 0]; b.brit = 2; a('brittle'); } }
  else if (k < 0.68) { if (live.length) { const b = live[(R() * live.length) | 0]; blockKill(b, (R() * 3) | 0, (R() * 8) | 0, R() < 0.3); a('kill'); } }
  else if (k < 0.76) { dropRock(R() < 0.7 ? rx : 36 + R() * 40, R() < 0.5); a('rock'); }
  else if (k < 0.86) { if (S.state === 'play') { grantBonus(sd, ['troop', 'heal', 'rage', 'charge'][(R() * 4) | 0], rx, ry); a('bonus'); } }
  else if (k < 0.92) { const us = S.units.filter((u) => u.alive); if (us.length) { const u = us[(R() * us.length) | 0]; u.body.applyLinearImpulse({ x: (R() - 0.5) * 30 * u.mass, y: R() * 14 * u.mass }, u.body.getWorldCenter(), true); a('shove'); } }
  else if (k < 0.96) { simSkill(sd, R() < 0.5 ? 'ult' : 'shield'); a('skill'); }
  else { const us = S.units.filter((u) => u.alive && !u.def.big); if (us.length) { const u = us[(R() * us.length) | 0]; u.frozen = 1; u.stun = 1; a('daze'); } }
}
for (let g = g0; g < g0 + N; g++) {
  if (g % nsh !== shard) continue;
  const li = g % 6, bot = BN[(g / 6 | 0) % 3], diff = (g / 18 | 0) % 3, upOn = (g / 54 | 0) % 2, seed = 4242 + g * 100003;
  const tag = `g${g} L${li + 1} ${bot} d${diff} up${upOn ? 5 : 0} seed${seed}`;
  rs = seed % 2147483646 + 1; deepT = new Map();
  simInit(li, upOn ? L.UPMAX : {}, seed, diff, { botA: BOTS[bot] }); games++; chk.reset();
  try {
    while ((S.state === 'play' && S.round < 30) || (S.state !== 'play' && S.endT < 5)) {
      if (R() < RATE / 60) act(tag);
      if (BURST && S.frame % 90 === 45) { for (let k = 0; k < BURST; k++) act(tag); acts.bursts = (acts.bursts || 0) + 1; }      // 同一步裡連續亂來很多下（同一步很多塊樓板斷開、碎塊衝上限）
      simStep(1 / 60);
      chk.step(tag); extra(tag);
    }
  } catch (e) { exc++; chk.fail('EXCEPTION', `${tag} t=${S.time.toFixed(2)} r${S.round} ${S.phase}: ${e.stack.split('\n').slice(0, 6).join(' | ')}`); }
  res[S.state === 'won' ? 'won' : S.state === 'lost' ? 'lost' : 'play']++;
}
console.log(`shard ${shard}/${nsh}: ${games} games, ${chk.stats.steps} steps, ${((Date.now() - t00) / 1000).toFixed(0)}s; exceptions ${exc}; results ${JSON.stringify(res)}; acts ${JSON.stringify(acts)}`);
console.log(`max fragments ${chk.stats.maxFrag}, max bodies ${chk.stats.maxBodies}, max rocks ${chk.stats.maxRub}, longest phase ${chk.stats.maxPhase.toFixed(1)}s at ${chk.stats.maxPhaseAt}`);
if (chk.fails.size) { console.log(`${chk.fails.size} kinds of failure:`); console.log(L3.report(chk.fails)); } else console.log('no invariant failures');
