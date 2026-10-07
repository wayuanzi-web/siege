// node test/review4-sim/crush_census2.js <每關每種自動玩家幾場=6> [第幾份=0] [共幾份=1] [難度=1]
// 壓扁機制的普查（第二版，用接觸點算）。對每一次「開始因為被壓而扣血」的事件（loadT 過了 0.3 秒）記錄結局：
//   crushed  一路扣到死
//   relieved 重量自己移開了（還醒著，load 掉回門檻以下）
//   asleep   還壓著，但是整組東西睡著了、物理引擎不再算，扣血就停了（之後被別的東西吵醒才會再扣）
// 另外：扣血的那一步，「往下壓」的分量有沒有超過門檻（沒有的話就是被側面擠到肩膀，不是頭上有重物）；壓著他的是不是別的兵
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, LEVELS, BOTS, CRUSH_LOAD, GRAV } = G;
const N = +(process.argv[2] || 6), shard = +(process.argv[3] || 0), nsh = +(process.argv[4] || 1), diff = +(process.argv[5] === undefined ? 1 : process.argv[5]);
const BN = ['newbie', 'casual', 'expert'];
function loadParts(u) {
  // 回傳 [往下壓的分量, 全部, 來自別的兵的分量]（都以自己體重為單位）；只算程式會算進 load 的那些接觸點
  const p = u.body.getPosition(); let down = 0, all = 0, fromUnit = 0, who = [];
  for (let ce = u.body.getContactList(); ce; ce = ce.next) {
    const c = ce.contact; if (!c.isTouching()) continue;
    const o = ce.other.getUserData(); if (!o) continue;
    const m = c.getManifold(), wm = c.getWorldManifold(null); if (!wm || wm.points[0].y <= p.y + u.bh * 0.2) continue;
    let J = 0; for (let k = 0; k < m.pointCount; k++) J += m.points[k].normalImpulse;
    const isA = c.getFixtureA().getBody() === u.body, ny = isA ? -wm.normal.y : wm.normal.y, w = J / (GRAV / 60 * u.mass);
    all += w; down += w * Math.max(0, -ny); if (o.isUnit) fromUnit += w; who.push((o.isUnit ? 'unit:' + o.type : L.bdesc(o)) + `[${w.toFixed(1)}x,ny=${ny.toFixed(2)}]`);
  }
  return [down, all, fromUnit, who.join(' ')];
}
let games = 0, g = 0, cur = '';
const ev = new Map();    // unit -> 進行中的事件
const out = { crushed: 0, relieved: 0, asleep: 0 }, bySide = [{ crushed: 0, relieved: 0, asleep: 0 }, { crushed: 0, relieved: 0, asleep: 0 }];
const asleepList = [], side = { steps: 0, sideways: 0, unit: 0, dmg: 0, dmgSide: 0, dmgUnit: 0 }, sidewaysEx = [], unitEx = [];
let asleepDmgSaved = 0;
H.load = (u, load) => {
  let e = ev.get(u);
  const hot = load > CRUSH_LOAD && u.loadT > 0.3 - 1e-9;
  if (hot && !e) { e = { tag: cur, t0: S.time, hp0: u.hp, side: u.side, type: u.type, peak: load, last: load }; ev.set(u, e); }
  if (e) {
    if (load > CRUSH_LOAD) { e.last = load; if (load > e.peak) e.peak = load; e.lastT = S.time; e.who = L.over(G, u).map(L.bdesc).join(' '); }
    else {
      // 這一步不扣了：是睡著還是重量移開
      const sleep = !u.body.isAwake();
      const kind = sleep ? 'asleep' : 'relieved'; out[kind]++; bySide[u.side][kind]++;
      if (sleep) asleepList.push({ tag: e.tag, t: S.time, round: S.round, side: u.side, type: u.type, hp: u.hp, hpMax: u.hpMax, took: e.hp0 - u.hp, dur: S.time - e.t0, load: e.last, who: e.who, u });
      ev.delete(u);
    }
  }
};
H.hurt = (u, d, sd, kind, ctx) => {
  if (ctx !== 'load') return;
  const [down, all, fromUnit, who] = loadParts(u);
  side.steps++; side.dmg += d;
  { let q = epi.get(u); if (!q || S.time - q.last > 1) epi.set(u, q = { maxDown: 0, dmg: 0, dmgSide: 0, unitDmg: 0, last: S.time, who: '' }); q.last = S.time; q.dmg += d; if (down > q.maxDown) q.maxDown = down; if (down <= CRUSH_LOAD) q.dmgSide += d; if (down <= CRUSH_LOAD * 0.5) q.dmgPure = (q.dmgPure || 0) + d; if (fromUnit > all * 0.5) q.unitDmg += d; q.who = who; }
  if (down <= CRUSH_LOAD) { side.sideways++; side.dmgSide += d; if (!u._sx || S.time - u._sx > 3) { u._sx = S.time; if (sidewaysEx.length < 25) sidewaysEx.push(`${cur} t=${S.time.toFixed(1)} r${S.round} side${u.side} ${u.type} hp ${u.hp.toFixed(0)}: downward ${down.toFixed(2)}x of ${all.toFixed(2)}x  ${who}`); } }
  if (fromUnit > all * 0.5) { side.unit++; side.dmgUnit += d; if (!u._ux || S.time - u._ux > 3) { u._ux = S.time; if (unitEx.length < 25) unitEx.push(`${cur} t=${S.time.toFixed(1)} r${S.round} side${u.side} ${u.type} hp ${u.hp.toFixed(0)}: ${who}`); } }
};
H.kill = (u, sd, how, ctx) => { const e = ev.get(u); if (e) { if (ctx === 'load') { out.crushed++; bySide[u.side].crushed++; } ev.delete(u); }
  if (ctx === 'load' && S.state === 'play') { const q = epi.get(u) || { maxDown: 0, dmg: 0, dmgSide: 0, unitDmg: 0, who: '' }; lk.n++; if (q.maxDown <= CRUSH_LOAD) { lk.side++; lkEx.push(`${cur} t=${S.time.toFixed(1)} r${S.round} side${u.side} ${u.type}: never more than ${q.maxDown.toFixed(2)}x pushing DOWN in the final episode (${q.dmg.toFixed(0)} load dmg); last contacts: ${q.who}`); } if ((q.dmgPure || 0) > q.dmg * 0.5) lk.pure++; if (q.unitDmg > q.dmg * 0.5) { lk.unit++; lkU.push(`${cur} t=${S.time.toFixed(1)} side${u.side} ${u.type}: ${q.who}`); } } };
const epi = new Map(), lk = { n: 0, side: 0, pure: 0, unit: 0 }, lkEx = [], lkU = [];
const t00 = Date.now();
for (let li = 0; li < LEVELS.length; li++) for (const bot of BN) for (let sd = 0; sd < N; sd++) {
  if (g++ % nsh !== shard) continue;
  const seed = 610000 + sd * 7919 + li * 131 + bot.length * 17;
  cur = `L${li + 1} ${bot} d${diff} seed${seed}`; ev.clear();
  simInit(li, {}, seed, diff, { botA: BOTS[bot] }); games++;
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  for (const r of asleepList) if (r.tag === cur && !r.done) { r.done = 1; r.endAlive = r.u.alive; r.endHp = r.u.alive ? r.u.hp : 0; r.result = S.state; r.endT = S.time; delete r.u; }
}
console.log(`${games} games (shard ${shard}/${nsh}, diff ${diff}), ${((Date.now() - t00) / 1000).toFixed(0)}s`);
console.log(`crush events (load damage started): crushed to death ${out.crushed}, weight moved off ${out.relieved}, damage simply stopped because the pile fell asleep ${out.asleep}`);
console.log(`   mine: ${JSON.stringify(bySide[0])}   foe: ${JSON.stringify(bySide[1])}`);
asleepList.sort((a, b) => a.hp - b.hp);
console.log(`"asleep" events, lowest hp first (hp left / damage taken before the pile slept / what was overhead / end of game):`);
for (const r of asleepList.slice(0, 30)) console.log(`   ${r.tag} t=${r.t.toFixed(1)} r${r.round} side${r.side} ${r.type}: hp ${r.hp.toFixed(0)}/${r.hpMax.toFixed(0)} after ${r.took.toFixed(0)} dmg in ${r.dur.toFixed(2)}s, load ${r.load.toFixed(1)}x, over: ${r.who || '?'}; end: ${r.endAlive ? 'ALIVE hp ' + r.endHp.toFixed(0) : 'dead'} (${r.result} at ${r.endT.toFixed(0)}s)`);
console.log(`load-damage steps ${side.steps} (total ${side.dmg.toFixed(0)} hp); of those the DOWNWARD push alone was under the threshold in ${side.sideways} steps (${side.dmgSide.toFixed(0)} hp); the pusher was mostly another unit in ${side.unit} steps (${side.dmgUnit.toFixed(0)} hp)`);
console.log(`KILLS by load during play: ${lk.n}; in ${lk.side} of them the downward push never exceeded the threshold in the final episode; in ${lk.pure} more than half the final-episode damage came with under half the threshold pushing down; in ${lk.unit} the pusher was mostly another unit`);
for (const l of lkEx.slice(0, 20)) console.log('   sideways kill: ' + l);
for (const l of lkU.slice(0, 12)) console.log('   unit-on-unit kill: ' + l);
if (process.env.VERBOSE) for (const l of sidewaysEx) console.log('   sideways: ' + l);
if (process.env.VERBOSE) for (const l of unitEx) console.log('   unit-on-unit: ' + l);
