// node test/review4-sim/crush_census.js <每關每種自動玩家幾場=6> [第幾份=0] [共幾份=1] [難度=1]
// 壓扁機制的普查。每一場每一步看每個活著的兵：
//   A. 「壓著卻沒事」：身上的重量超過門檻（CRUSH_LOAD）之後整組東西睡著了，之後就不再扣血。記錄睡了多久、當時頭上有什麼
//   B. 「沒東西卻被壓」：因為 load 扣血的那一步，頭上方實際疊著的磚加起來不到自己體重的 CRUSH_LOAD 倍
// 另外統計每一邊的兵是怎麼死的（依扣血的來源）
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, PH, simInit, simStep, LEVELS, BOTS, CRUSH_LOAD } = G;
const N = +(process.argv[2] || 6), shard = +(process.argv[3] || 0), nsh = +(process.argv[4] || 1), diff = +(process.argv[5] === undefined ? 1 : process.argv[5]);
const BN = ['newbie', 'casual', 'expert'];
let games = 0, g = 0;
const deaths = [{}, {}], pinA = [], thinB = [], loadKills = [];
let cur = '';
const last = new Map();          // unit -> { load, sleepT, rec }
H.load = (u, load) => {
  let r = last.get(u); if (!r) last.set(u, r = { load: 0, sleepT: 0, rec: null, hi: 0 });
  if (u.body.isAwake()) { r.load = load; if (r.rec) { r.rec.woke = S.time; r.rec = null; } r.sleepT = 0; }
  else if (r.load > CRUSH_LOAD) {
    r.sleepT += 1 / 60;
    if (!r.rec && r.sleepT > 1) { r.rec = { tag: cur, t: S.time, round: S.round, side: u.side, type: u.type, hp: u.hp, hpMax: u.hpMax, load: r.load, over: L.over(G, u).map(L.bdesc).join(' '), woke: -1, endHp: 0, u }; pinA.push(r.rec); }
  }
};
H.hurt = (u, d, side, kind, ctx) => {
  if (ctx !== 'load') return;
  const ov = L.over(G, u); let m = 0; for (const b of ov) m += b.mass;
  if (m < CRUSH_LOAD * u.mass * 0.9) { if (!u._thin || S.time - u._thin > 2) { thinB.push({ tag: cur, t: S.time, round: S.round, side: u.side, type: u.type, hp: u.hp, over: ov.map(L.bdesc).join(' ') || '(nothing)', massOver: m, umass: u.mass, pos: `(${u.x.toFixed(1)},${u.y.toFixed(1)})`, phase: S.phase + '/' + S.turn }); } u._thin = S.time; }
};
H.kill = (u, side, how, ctx) => { const k = (S.state === 'play' ? '' : 'post:') + ctx + (ctx === 'impact' && H.imp ? '' : ''); deaths[u.side][k] = (deaths[u.side][k] || 0) + 1; if (ctx === 'load' && S.state === 'play') loadKills.push(`${cur} t=${S.time.toFixed(1)} r${S.round} side${u.side} ${u.type} over: ${L.over(G, u).map(L.bdesc).join(' ') || '(nothing)'}`); };
const t00 = Date.now();
for (let li = 0; li < LEVELS.length; li++) for (const bot of BN) for (let sd = 0; sd < N; sd++) {
  if (g++ % nsh !== shard) continue;
  const seed = 610000 + sd * 7919 + li * 131 + bot.length * 17;
  cur = `L${li + 1} ${bot} d${diff} seed${seed}`; last.clear();
  simInit(li, {}, seed, diff, { botA: BOTS[bot] }); games++;
  while (S.state === 'play' && S.round < 40) simStep(1 / 60);
  for (const r of pinA) if (r.tag === cur && !r.done) { r.done = 1; r.endHp = r.u.alive ? r.u.hp : 0; r.endAlive = r.u.alive; r.endT = S.time; r.result = S.state; delete r.u; }
}
console.log(`${games} games (shard ${shard}/${nsh}, diff ${diff}), ${((Date.now() - t00) / 1000).toFixed(0)}s`);
console.log('deaths side0 (mine):', JSON.stringify(deaths[0]));
console.log('deaths side1 (foe): ', JSON.stringify(deaths[1]));
console.log(`A. over the crush threshold, then asleep > 1 s (no more damage): ${pinA.length} episodes`);
for (const r of pinA.slice(0, 40)) console.log(`   ${r.tag} t=${r.t.toFixed(1)} r${r.round} side${r.side} ${r.type} hp ${r.hp.toFixed(0)}/${r.hpMax.toFixed(0)} load ${r.load.toFixed(1)}x  over: ${r.over || '(nothing found)'}  ${r.woke > 0 ? 'woke at ' + r.woke.toFixed(1) : 'never woke'}; end of game: ${r.endAlive ? 'alive hp ' + r.endHp.toFixed(0) : 'dead'} (${r.result} at ${r.endT.toFixed(0)}s)`);
console.log(`B. load damage with < ${(CRUSH_LOAD * 0.9).toFixed(2)}x own mass found overhead: ${thinB.length} episodes`);
for (const r of thinB.slice(0, 40)) console.log(`   ${r.tag} t=${r.t.toFixed(1)} r${r.round} ${r.phase} side${r.side} ${r.type}@${r.pos} hp ${r.hp.toFixed(0)}; overhead mass ${r.massOver.toFixed(1)} vs unit ${r.umass.toFixed(1)}: ${r.over}`);
console.log(`kills by sustained load during play: ${loadKills.length}`); for (const l of loadKills.slice(0, 30)) console.log('   ' + l);
