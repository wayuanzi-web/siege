// node test/review3-sim/soak.js <場數=108> [第幾份=0] [共幾份=1] [起始編號=0]
// 長時間隨機對打：六關 × 三種自動玩家 × 三種難度 × 有無滿級強化（108 場一輪），每一步都檢查內部一致性。
// 另外統計：每一段「等塵埃落定」花多久、有幾次是撐到 9 秒上限才硬切（那時候是什麼還在動）
const L = require('./lib'); const G = L.load();
const { S, SH, PH, simInit, simStep, LEVELS, BOTS, teamBar, structBar } = G;
const N = +(process.argv[2] || 108), shard = +(process.argv[3] || 0), nsh = +(process.argv[4] || 1), g0 = +(process.argv[5] || 0);
const BN = ['newbie', 'casual', 'expert'];
const chk = L.mkCheck(G);
const res = {}, caps = [], capWhy = {}; let games = 0, resolves = 0, capN = 0, resT = 0, exc = 0, noEnd = 0; const t00 = Date.now();
const durH = new Array(10).fill(0);
function flyers() { for (const o of S.objs) if ((o.t === 'balloon' || o.t === 'orb') && (o.st === 'out' || o.st === 'run' || o.st === 'back')) return true; return false; }
function movers() {
  const out = [];
  for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic() || !b.isAwake()) continue; const p = b.getPosition(); if (p.x < -11 || p.x > 123 || p.y < -10) continue;
    const v = b.getLinearVelocity(), sp = Math.hypot(v.x, v.y), om = Math.abs(b.getAngularVelocity()); if (sp * sp > 3.2 || om > 0.7) { const u = b.getUserData(); out.push((u.isBlock ? (u.frag ? 'frag' : u.kind === 'ball' ? 'ball' : u.prop ? 'prop' : u.seg ? 'seg' + u.cw : 'blk') + '.m' + u.mat + '.s' + u.side : 'unit.' + u.type) + `@(${p.x.toFixed(1)},${p.y.toFixed(1)}) v=${sp.toFixed(1)} w=${om.toFixed(1)}`); }
  }
  return out;
}
for (let g = g0; g < g0 + N; g++) {
  if (g % nsh !== shard) continue;
  const li = g % 6, bot = BN[(g / 6 | 0) % 3], diff = (g / 18 | 0) % 3, upOn = (g / 54 | 0) % 2, seed = 9176 + g * 100003;
  const tag = `g${g} L${li + 1} ${bot} d${diff} up${upOn ? 5 : 0} seed${seed}`;
  simInit(li, upOn ? L.UPMAX : {}, seed, diff, { botA: BOTS[bot] }); games++; chk.reset();
  let prePhase = '', preT = 0, preQ = 0;
  try {
    while ((S.state === 'play' && S.round < 45) || (S.state !== 'play' && S.endT < 5)) {
      prePhase = S.phase; preT = S.phaseT; preQ = S.quietT;
      const why = (prePhase === 'resolve' || prePhase === 'hazard') && preT + 1 / 60 > 9 ? { sh: SH.n, pend: S.pend.length, fly: flyers(), nburn: S.nburn, mv: movers() } : null;
      simStep(1 / 60);
      chk.step(tag);
      if ((prePhase === 'resolve' || prePhase === 'hazard') && S.phase !== prePhase) {
        resolves++; resT += preT; durH[Math.min(9, preT | 0)]++;
        if (why && preQ + 1 / 60 < 0.45) { capN++; const k = why.sh ? 'shots' : why.pend ? 'pend' : why.fly ? 'flyer' : why.mv.length ? 'moving' : 'quiet-not-long-enough'; capWhy[k] = (capWhy[k] || 0) + 1; if (caps.length < 400) caps.push(`${tag} r${S.round} ${prePhase}: ${k} ${why.mv.slice(0, 4).join(' ; ')}${why.mv.length > 4 ? ' …+' + (why.mv.length - 4) : ''}`); }
      }
    }
  } catch (e) { exc++; chk.fail('EXCEPTION', `${tag} t=${S.time.toFixed(2)} r${S.round} ${S.phase}: ${e.stack.split('\n').slice(0, 5).join(' | ')}`); }
  if (S.state === 'play') { noEnd++; chk.fail('no result after 45 rounds', `${tag} me ${S.team[0].alive} foe ${S.team[1].alive}`); }
  const k = `L${li + 1} ${bot}`; const r = res[k] = res[k] || { n: 0, w: 0, rounds: 0 }; r.n++; if (S.state === 'won') r.w++; r.rounds += S.round;
}
console.log(`shard ${shard}/${nsh}: ${games} games, ${chk.stats.steps} steps, ${((Date.now() - t00) / 1000).toFixed(0)}s wall; exceptions ${exc}; unfinished ${noEnd}`);
console.log(`max rocks alive ${chk.stats.maxRub}, max fragments ${chk.stats.maxFrag}, max bodies ${chk.stats.maxBodies}, longest phase ${chk.stats.maxPhase.toFixed(1)}s at ${chk.stats.maxPhaseAt}`);
console.log(`settle phases: ${resolves}, mean ${(resT / Math.max(1, resolves)).toFixed(2)}s, hist by whole seconds [${durH.join(' ')}], ended by the 9s cap: ${capN} (${(100 * capN / Math.max(1, resolves)).toFixed(2)}%) ${JSON.stringify(capWhy)}`);
console.log(Object.keys(res).sort().map((k) => `${k} ${res[k].w}/${res[k].n} ${(res[k].rounds / res[k].n).toFixed(1)}r`).join('  |  '));
if (process.env.CAPS) for (const c of caps.slice(0, +process.env.CAPS)) console.log('  cap: ' + c);
if (chk.fails.size) { console.log(`${chk.fails.size} kinds of failure:`); console.log(L.report(chk.fails)); } else console.log('no invariant failures');
process.exit(chk.fails.size ? 1 : 0);
