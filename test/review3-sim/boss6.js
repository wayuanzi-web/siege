// node test/review3-sim/boss6.js <場數=60> [bot=casual] [難度=1] [強化 0|5=0]
// 第六關魔王戰的流水帳：魔王的血是被什麼扣掉的（砲、摔、被轟出場飛回來、自己的光球）、每一輪最多被送回城頂幾次、
// 階段是在哪一輪換的、光球的下場、魔王最後是怎麼死的（有沒有在沒人打他的時候自己死掉）
const L = require('./lib'); const G = L.load('bossUnit');
const { S, SH, simInit, simStep, LEVELS, BOTS, bossUnit } = G;
const N = +(process.argv[2] || 60), bot = process.argv[3] || 'casual', diff = +(process.argv[4] === undefined ? 1 : process.argv[4]), up = +(process.argv[5] || 0) ? L.UPMAX : {};
globalThis.__bossHurt = null; globalThis.__bossRet = null;
G.__eval(`(function(){ const o = hurtUnit; hurtUnit = function(u, d, side, kind){ const hp0 = u.hp; o(u, d, side, kind); if (u.def.big && globalThis.__bossHurt) globalThis.__bossHurt(u, hp0, d, side, kind); }; const r = bossReturn; bossReturn = function(u){ if (globalThis.__bossRet) globalThis.__bossRet(u, 0); r(u); if (globalThis.__bossRet) globalThis.__bossRet(u, 1); }; })()`);
const chk = L.mkCheck(G);
const src = { shot: 0, crush: 0, ret: 0, orb: 0, fire: 0, other: 0 }, deathBy = {}, deathWhen = {}, maxRetHist = {}, orb = { spawned: 0, back: 0, hitMe: 0, died: 0, shield: 0 }, ex = [];
let wins = 0, rounds = 0, retTotal = 0, retGames = 0, p2p3same = 0, x20 = 0, selfDeaths = 0, phaseVol = [], hpAtEnd = [], orbDmgTot = 0, orbHits = 0;
for (let sd = 0; sd < N; sd++) {
  const seed = 660000 + sd * 7919, tag = `L6 ${bot} seed${seed}`;
  simInit(5, up, seed, diff, { botA: BOTS[bot] }); chk.reset();
  let inRet = false, inOrb = false, last = null, retThisVol = 0, maxRet = 0, vols = 0, pv = {}, lastShotVol = -1, retAny = 0, myVolSinceHit = 0;
  globalThis.__bossRet = (u, ph) => { inRet = ph === 0; if (ph === 0) { retThisVol++; retAny++; if (retThisVol > maxRet) maxRet = retThisVol; } };
  globalThis.__bossHurt = (u, hp0, d, side, kind) => {
    const lost = hp0 - Math.max(0, u.hp); if (lost <= 0) return;
    const k = inRet ? 'ret' : inOrb ? 'orb' : kind === 6 ? 'crush' : kind === 3 ? 'fire' : side === 0 ? 'shot' : 'other';
    src[k] += lost / u.hpMax; last = { k, phase: S.phase, turn: S.turn, vol: S.vol, phT: S.phaseT, side, kind }; if (k === 'orb') { orbDmgTot += lost / u.hpMax; orbHits++; }
    if (k === 'shot') lastShotVol = S.vol;
  };
  S.on = (t, a, b, c, d, e, f) => {
    if (t === 'volley') { vols++; retThisVol = 0; }
    else if (t === 'phase') pv[a] = S.vol;
    else if (t === 'orb') orb.spawned++; else if (t === 'orbback') orb.back++; else if (t === 'orbdie') orb.died++;
    else if (t === 'boom' && d === G.WPN.doom.i) { if (e === 1) orb.hitMe++; }
    else if (t === 'gate' && c === 20 && e === 0) x20++;
  };
  // 光球砸回來的那一下：objsStep 裡 physExplode(…, side 0, doom)。用「這一步開頭有 back 的光球、結束時不見了」來標記
  try {
    while (S.state === 'play' && S.round < 45) { inOrb = S.objs.some((o) => o.t === 'orb' && o.st === 'back'); simStep(1 / 60); inOrb = false; chk.step(tag); }
  } catch (e) { chk.fail('EXCEPTION', `${tag}: ${e.stack.split('\n').slice(0, 4).join(' | ')}`); }
  const bu = bossUnit(); rounds += S.round; retTotal += retAny; if (retAny) retGames++;
  maxRetHist[maxRet] = (maxRetHist[maxRet] || 0) + 1;
  if (pv[2] !== undefined && pv[3] !== undefined && pv[3] - pv[2] <= 1) p2p3same++;
  if (S.state === 'won') {
    wins++; const k = last ? last.k : '?'; deathBy[k] = (deathBy[k] || 0) + 1; const w = last ? `${last.phase}/turn${last.turn}` : '?'; deathWhen[w] = (deathWhen[w] || 0) + 1;
    if (last && (last.k === 'ret' || last.k === 'crush' || last.k === 'fire') && (last.turn !== 0 || last.phase === 'aim' || last.phase === 'hazard')) { selfDeaths++; if (ex.length < 10) ex.push(`${tag}: boss died from '${last.k}' during ${last.phase} (turn ${last.turn}, ${last.phT.toFixed(1)}s in), round ${S.round}; returns this game ${retAny}, max in one volley ${maxRet}`); }
  } else hpAtEnd.push(bu.alive ? bu.hp / bu.hpMax : 0);
  if (maxRet >= 2 && ex.length < 10) ex.push(`${tag}: boss sent back to his roof ${maxRet} times within one volley (round ${S.round}, ${S.state})`);
}
const tot = Object.values(src).reduce((a, b) => a + b, 0);
console.log(`L6 ${bot} diff${diff} up${up.dmg ? 5 : 0}: ${N} games, won ${wins}, mean ${(rounds / N).toFixed(1)} rounds   src=${G.__dir}`);
console.log(`boss damage by source (share of all damage dealt): ${Object.keys(src).map((k) => k + ' ' + (100 * src[k] / Math.max(1e-9, tot)).toFixed(1) + '%').join(', ')}   (in boss-HP units per game: ${Object.keys(src).map((k) => k + ' ' + (src[k] / N).toFixed(2)).join(', ')})`);
console.log(`bossReturn: ${retTotal} in total, in ${retGames} games; max returns within a single volley per game: ${Object.keys(maxRetHist).sort().map((k) => k + 'x:' + maxRetHist[k]).join(' ')}`);
console.log(`orbs: spawned ${orb.spawned}, reflected ${orb.back} (mean damage to boss ${(100 * orbDmgTot / Math.max(1, orb.back)).toFixed(1)}% of his max HP each), exploded on my castle ${orb.hitMe}, died otherwise ${orb.died}`);
console.log(`phase 2 and phase 3 entered within one volley of each other: ${p2p3same} games;  x20 gate passes by my shots: ${x20}`);
console.log(`won games: killing blow by ${JSON.stringify(deathBy)}, during ${JSON.stringify(deathWhen)};  boss died with nobody shooting at him (fall / return / fire outside my volley): ${selfDeaths}`);
if (hpAtEnd.length) console.log(`lost games: boss HP left ${hpAtEnd.map((x) => (100 * x).toFixed(0) + '%').join(' ')}`);
for (const e of ex) console.log('   ' + e);
if (chk.fails.size) { console.log(`${chk.fails.size} kinds of invariant failure:`); console.log(L.report(chk.fails)); } else console.log('no invariant failures');
