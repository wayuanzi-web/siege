// node test/review5-sim/rock_head.js [場數=60] [bot=casual]      （SIEGE_SRC=<舊版 parts> 可以拿舊版來比）
// 第二關的招牌機關：木板打穿，大石球砸在底下的兵頭上。統計石球碰到兵之後的結局：
//   當場砸死（impact）、壓扁（load）、石球滾開、還是「石球就這樣擱在他頭上，人活著」（每個回合開始時檢查：石球還從上面碰著他、他還活著）
const L = require('./lib5'); const H = {}; const G = L.load('', H);
const { S, simInit, simStep, BOTS, M_ROCK, GRAV } = G;
const N = +(process.argv[2] || 60), bot = process.argv[3] || 'casual';
const res = { games: 0, won: 0, touched: 0, impactKill: 0, loadKill: 0, otherKill: 0, restTurns: 0, restUnits: 0, restGames: 0, longest: 0, aliveAtEnd: 0, loadDmgUnits: 0 }, ex = [];
function rockOn(u) {
  for (let ce = u.body.getContactList(); ce; ce = ce.next) {
    const c = ce.contact; if (!c.isTouching()) continue; const o = ce.other.getUserData(); if (!o || !o.isBlock || o.mat !== M_ROCK || o.kind !== 'ball') continue;
    const wm = c.getWorldManifold(null); if (!wm) continue; const ny = c.getFixtureA().getBody() === u.body ? wm.normal.y : -wm.normal.y;
    if (ny > 0.35) { let J = 0; const m = c.getManifold(); for (let k = 0; k < m.pointCount; k++) J += m.points[k].normalImpulse; return { ny, mass: o.mass, down: J * ny / (GRAV / 60 * u.mass), awake: u.body.isAwake() }; }
  }
  return null;
}
for (let sd = 0; sd < N; sd++) {
  const seed = 220000 + sd * 7919; simInit(1, {}, seed, 1, { botA: BOTS[bot] }); res.games++;
  const tr = new Map(); let gameRest = false;
  H.hurt = (u, d, side, kind, ctx) => { const t = tr.get(u); if (t && ctx === 'load') t.loadDmg += d; };
  H.kill = (u, side, how, ctx) => { const t = tr.get(u); if (!t || S.state !== 'play') return; t.dead = ctx; if (ctx === 'impact') res.impactKill++; else if (ctx === 'load') res.loadKill++; else res.otherKill++; };
  S.on = (t, a) => {
    if (t !== 'turn') return;
    for (const u of S.team[1].units) { if (!u.alive) continue; const r = rockOn(u); let k = tr.get(u);
      if (r) { if (!k) { k = { rest: 0, run: 0, loadDmg: 0, dead: '', first: S.round }; tr.set(u, k); } k.rest++; k.run++; k.last = r; if (k.run > res.longest) res.longest = k.run; res.restTurns++; if (k.rest === 1) { res.restUnits++; gameRest = true; } if (k.rest === 3 && ex.length < 10) ex.push(`seed${seed} r${S.round}: ${u.type}#${u.slot} hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)} has had the boulder (${r.mass.toFixed(0)} kg = ${(r.mass / u.mass).toFixed(1)}x his weight) on his head for 3 turn starts: contact normal ny=${r.ny.toFixed(2)}, downward push now ${r.down.toFixed(2)}x (threshold 2.2), load field ${(u.load === undefined ? NaN : u.load).toFixed(2)}, ${r.awake ? 'awake' : 'asleep'}`); }
      else if (k) k.run = 0; }
  };
  // 石球第一次碰到兵（不管回合）：算「碰到過」
  const seen = new Set();
  while (S.state === 'play' && S.round < 40) { simStep(1 / 60); if ((S.frame & 3) === 0) for (const u of S.team[1].units) if (u.alive && !seen.has(u) && rockOn(u)) { seen.add(u); res.touched++; if (!tr.has(u)) tr.set(u, { rest: 0, run: 0, loadDmg: 0, dead: '', first: S.round }); } }
  if (S.state === 'won') res.won++; if (gameRest) res.restGames++;
  for (const [u, k] of tr) { if (k.rest && u.alive) res.aliveAtEnd++; if (k.loadDmg > 0) res.loadDmgUnits++; }
}
console.log(`L2 ${bot}: ${res.won}/${res.games} won. Boulder came down on a living soldier ${res.touched} times -> killed by the impact ${res.impactKill}, crushed (load) ${res.loadKill}, killed by something else later ${res.otherKill}.`);
console.log(`   Boulder still resting on a LIVING soldier at the start of a turn: ${res.restUnits} soldiers in ${res.restGames}/${res.games} games, ${res.restTurns} turn starts in total, longest ${res.longest} turn starts in a row; of them took any crush damage ${res.loadDmgUnits}; still alive under it when the game ended ${res.aliveAtEnd}`);
for (const e of ex) console.log('     ' + e);
