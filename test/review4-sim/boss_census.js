// node test/review4-sim/boss_census.js <場數=40> [bot=casual] [難度=1] [強化 0/5] [第幾份=0] [共幾份=1]
// 第六關普查：魔王的血是被什麼扣掉的（依來源）、摔了幾次、飛回來幾次、光球放了幾顆／被反彈幾顆／砸到我方幾顆、
// 結界擋了幾發、隕石幾顆、殺了我方幾個；各階段在第幾回合開始；有沒有哪一輪魔王「整輪打不到」（我方開了火但魔王一滴血沒掉）
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, BOTS } = G;
const N = +(process.argv[2] || 40), bot = process.argv[3] || 'casual', diff = +(process.argv[4] === undefined ? 1 : process.argv[4]), upl = +(process.argv[5] || 0), shard = +(process.argv[6] || 0), nsh = +(process.argv[7] || 1);
const up = upl ? { dmg: upl, aim: upl, hp: upl, shield: upl, ult: upl } : {};
const tot = { games: 0, wins: 0, rounds: 0 }, src = {}, cnt = { ret: 0, orb: 0, orbback: 0, orbhit: 0, orbdie: 0, bar: 0, barbreak: 0, rocks: 0, rockKills: 0, fallHits: 0, roofHits: 0, minionCrushed: 0 };
const p2 = [], p3 = [], endR = [], dry = { vol: 0, dry: 0, maxRun: 0 }, odd = [];
for (let sd = 0; sd < N; sd++) {
  if (sd % nsh !== shard) continue;
  const seed = 660000 + sd * 7919;
  simInit(5, up, seed, diff, { botA: BOTS[bot] }); tot.games++;
  let bu = null; for (const u of S.team[1].units) if (u.type === 'boss') bu = u;
  let r2 = 0, r3 = 0, volHp = bu.hp, myVol = false, run = 0, maxRun = 0, inRocks = false;
  S.on = (t, a, b, c) => {
    if (t === 'phase') { if (a === 2) r2 = S.round; else r3 = S.round; }
    else if (t === 'bossback') cnt.ret++;
    else if (t === 'orb') cnt.orb++;
    else if (t === 'orbback') cnt.orbback++;
    else if (t === 'orbdie') cnt.orbdie++;
    else if (t === 'bar') cnt.bar++;
    else if (t === 'barbreak') cnt.barbreak++;
    else if (t === 'rumble') { cnt.rocks += 1; inRocks = true; }
    else if (t === 'volley') {
      inRocks = false;
      if (myVol) { dry.vol++; if (bu.hp >= volHp - 1e-6) { dry.dry++; run++; if (run > maxRun) maxRun = run; } else run = 0; }
      myVol = a === 0 && b === 1; volHp = bu.hp;
    }
  };
  H.boom = (x, y, w, side) => { if (w.id === 'doom' && side === 1) cnt.orbhit++; };
  H.hurt = (u, d, side, kind, ctx) => {
    if (u !== bu) return;
    let k = ctx;
    if (ctx === 'impact' && H.imp) { const r = H.imp, oth = r.a === bu ? r.b : r.a; const top = oth && oth.isBlock && oth.mass >= 12 && r.y > bu.body.getPosition().y + bu.bh * 0.2; k = top ? 'impact:roof' : 'impact:fall'; if (top) cnt.roofHits++; else cnt.fallHits++; }
    src[k] = (src[k] || 0) + Math.min(d, u.hp) / u.hpMax;
  };
  H.kill = (u, side, how, ctx) => { if (S.state !== 'play') return; if (u.side === 0 && inRocks) cnt.rockKills++; if (u.side === 1 && u !== bu && ctx === 'load') { let onTop = false; for (let ce = u.body.getContactList(); ce; ce = ce.next) if (ce.contact.isTouching() && ce.other.getUserData() === bu) onTop = true; if (onTop) cnt.minionCrushed++; } };
  let stuckOut = 0;
  while (S.state === 'play' && S.round < 60) {
    simStep(1 / 60);
    if (bu.alive) { const st = bu.st; if (bu.x < st.x0 - 1.6 || bu.x > st.x1 + 1.6) { stuckOut += 1 / 60; if (stuckOut > 6 && stuckOut < 6 + 1 / 59) odd.push(`seed${seed} t=${S.time.toFixed(1)} boss outside his castle for 6 s at (${bu.x.toFixed(1)},${bu.y.toFixed(1)}) air=${bu.air}`); } else stuckOut = 0; }
  }
  if (maxRun > dry.maxRun) dry.maxRun = maxRun;
  if (maxRun >= 4) odd.push(`seed${seed}: ${maxRun} of my volleys in a row did no damage to the boss (result ${S.state}, round ${S.round}, boss hp ${(bu.hp / bu.hpMax).toFixed(2)})`);
  if (S.state === 'won') tot.wins++; tot.rounds += S.round; endR.push(S.round); if (r2) p2.push(r2); if (r3) p3.push(r3);
  if (S.state === 'play') odd.push(`seed${seed}: not finished at round 60`);
}
const avg = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
console.log(`L6 ${bot} diff${diff} up${upl}: ${tot.wins}/${tot.games} won, mean ${(tot.rounds / tot.games).toFixed(1)} rounds (max ${Math.max(...endR)}); phase 2 reached in ${p2.length} games (mean round ${avg(p2)}), phase 3 in ${p3.length} (mean round ${avg(p3)})`);
console.log('  boss hp removed per game by source (fractions of max hp): ' + Object.keys(src).sort((a, b) => src[b] - src[a]).map((k) => k + ' ' + (src[k] / tot.games).toFixed(3)).join(', '));
console.log(`  per game: falls that hurt ${(cnt.fallHits / tot.games).toFixed(2)}, roof/slab hits that hurt ${(cnt.roofHits / tot.games).toFixed(2)}, returns ${(cnt.ret / tot.games).toFixed(2)}, orbs ${(cnt.orb / tot.games).toFixed(2)} (reflected ${(cnt.orbback / tot.games).toFixed(2)}, hit me ${(cnt.orbhit / tot.games).toFixed(2)}, destroyed mid-run ${(cnt.orbdie / tot.games).toFixed(2)}), barrier blocked ${(cnt.bar / tot.games).toFixed(1)} shots + ${(cnt.barbreak / tot.games).toFixed(2)} breaks, rockfalls ${(cnt.rocks / tot.games).toFixed(2)} killing ${(cnt.rockKills / tot.games).toFixed(2)} of mine, minions crushed under the boss ${(cnt.minionCrushed / tot.games).toFixed(2)}`);
console.log(`  my volleys ${dry.vol}, of which ${dry.dry} (${(100 * dry.dry / Math.max(1, dry.vol)).toFixed(0)}%) took nothing off the boss; longest dry run ${dry.maxRun}`);
for (const o of odd.slice(0, 12)) console.log('  odd: ' + o);
