// node test/review-play/crush.js [bot=casual] [場數=30]
// 「被砸到」到底是被什麼砸：兵受到撞擊傷害的那一刻，看他正碰著什麼（大石球、落石、自己城的磚、對面飛來的磚、只有地面＝摔的）。
// 另外統計：火藥桶在第幾回合爆、氣球／光球有沒有真的造成傷害、兵被炸飛出場外（fell）時的位置。
const G = require('./lib')();
const { S, PH, HOOK, simInit, simStep, LEVELS, BOTS, MAT } = G;
const botName = process.argv[2] || 'casual', N = +(process.argv[3] || 30);
const only = process.argv[4] ? process.argv[4].split(',').map((x) => +x - 1) : LEVELS.map((_, i) => i);
for (const li of only) {
  const by = [{}, {}], kills = [{}, {}], fell = [], kegRound = [], kegBy = {}, balloon = { launched: 0, popped: 0, ran: 0, drops: 0, dropDmgU: 0, dropKillB: 0 }, orb = { spawned: 0, killed: 0, hit: 0, dmgU: 0 };
  const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
  let boulderHitsFoe = 0, boulderDmgFoe = 0, boulderTotal = 0, boulderMoved = 0, games = 0, portalShots = [0, 0], gateUse = {}, mirrorPing = 0, barHit = 0, barBreak = 0, flak = [0, 0], litShots = 0, frozenSkips = [0, 0], stunSkips = [0, 0], lantern = {}, rockN = 0, rockHitU = 0, rockStop = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 777 + sd * 7919 + li * 131, 1, { botA: BOTS[botName] }); games++;
    let kegDone = false;
    const what = (u) => {
      let res = 'fall(ground only)', any = false;
      for (let ce = u.body.getContactList(); ce; ce = ce.next) {
        if (!ce.contact.isTouching()) continue;
        const o = ce.other.getUserData(); if (!o) continue;
        if (!o.isBlock) { res = 'another soldier'; any = true; continue; }
        const v = ce.other.getLinearVelocity(), sp = Math.hypot(v.x, v.y), uv = u.body.getLinearVelocity(), usp = Math.hypot(uv.x, uv.y);
        const moving = sp > usp + 2 ? 'hit by ' : 'landed on ';
        if (o.mat === G.M_ROCK && o.prop) return 'BOULDER(' + (sp > 3 ? 'moving' : 'resting') + ')';
        if (o.mat === G.M_ROCK && o.st.loose) return 'ROCKFALL';
        res = moving + (o.side === u.side ? 'own ' : o.side === 2 ? 'neutral ' : 'enemy ') + (o.frag ? 'fragment' : o.prop ? 'prop' : 'block') + ':' + MAT[o.mat].k; any = true;
      }
      return res;
    };
    HOOK.hurt = (u, d, side, kind) => {
      if (kind !== G.K_CRUSH) { if (HOOK.cur === 'drop') balloon.dropDmgU += d; if (HOOK.cur === 'doom') orb.dmgU += d; return; }
      const w = u.body ? what(u) : 'dead'; add(by[u.side], w.replace(/:.*/, ''), d);
      if (w.startsWith('BOULDER') && u.side === 1) { boulderHitsFoe++; boulderDmgFoe += d; }
      if (w === 'ROCKFALL') rockHitU += d;
    };
    HOOK.kill = (u, side, how) => { if (how === 4) fell.push([u.side, Math.round(u.x), Math.round(u.y), Math.round(u.vx), Math.round(u.vy), S.round]); };
    HOOK.blockKill = (b, side, kind, clean) => { if (b.mat === G.M_KEG && !kegDone) { kegDone = true; kegRound.push(S.round); add(kegBy, (HOOK.cur || 'impact/fire') + ' by side' + side + (S.turn === 0 ? ' (my turn)' : ' (foe turn)'), 1); } };
    HOOK.explode = (x, y, w) => { if (w.id === 'drop') balloon.drops++; if (w.id === 'doom') orb.hit++; };
    S.on = (t, a, b, c, d, e) => {
      if (t === 'launch') balloon.launched++; else if (t === 'pop') balloon.popped++; else if (t === 'orb') orb.spawned++; else if (t === 'orbdie') orb.killed++;
      else if (t === 'port' && d === 0) portalShots[c]++; else if (t === 'gate') add(gateUse, 'x' + c + (d === 2 ? ' gold' : '') + ' by ' + (e ? 'foe' : 'me'), 1); else if (t === 'ping') mirrorPing++;
      else if (t === 'bar') barHit++; else if (t === 'barbreak') barBreak++; else if (t === 'flak') flak[e]++; else if (t === 'lit') litShots++;
      else if (t === 'skip') { if (d) stunSkips[c]++; else frozenSkips[c]++; } else if (t === 'bonus') add(lantern, d + (c ? ' foe' : ' me'), 1); else if (t === 'rockwarn') rockN++; else if (t === 'rockstop') rockStop++;
    };
    const balls = S.blocks.filter((b) => b.mat === G.M_ROCK && b.prop); boulderTotal += balls.length;
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
    for (const b of balls) if (b.dead || Math.hypot(b.body.getPosition().x - b.x0, b.body.getPosition().y - b.y0) > 3) boulderMoved++;
    if (!kegDone && S.blocks.some((b) => b.mat === G.M_KEG)) kegRound.push(99);
  }
  const pct = (o) => { const t = Object.values(o).reduce((x, y) => x + y, 0) || 1; return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / t * 100).toFixed(0)}%`).join(', '); };
  console.log(`\n== L${li + 1} ${LEVELS[li].name} [${botName}, ${games} games]`);
  console.log(`  crush damage to FOE units, what they were touching: ${pct(by[1])}`);
  console.log(`  crush damage to MY units: ${pct(by[0])}`);
  if (boulderTotal) console.log(`  boulders: ${boulderTotal} placed, ${boulderMoved} knocked off; hits on foe soldiers ${boulderHitsFoe} (dmg ${boulderDmgFoe.toFixed(0)}) in ${games} games`);
  if (kegRound.length) console.log(`  first keg explodes in round: ${kegRound.sort((a, b) => a - b).join(' ')} (99 = never)  cause: ${JSON.stringify(kegBy)}`);
  if (balloon.launched) console.log(`  balloons: launched ${balloon.launched}, shot down ${balloon.popped}, bombs that exploded ${balloon.drops}, damage to my soldiers from them ${balloon.dropDmgU.toFixed(0)}`);
  if (orb.spawned) console.log(`  doom orbs: spawned ${orb.spawned}, destroyed ${orb.killed}, detonated on my castle ${orb.hit}, direct damage to my soldiers ${orb.dmgU.toFixed(0)}`);
  if (portalShots[0] + portalShots[1]) console.log(`  shots through portals: mine ${portalShots[0]}, foe ${portalShots[1]}`);
  if (mirrorPing) console.log(`  mirror bounces: ${mirrorPing}`);
  if (barHit + barBreak) console.log(`  barrier: shots absorbed ${barHit}, segments broken ${barBreak}`);
  if (flak[0] + flak[1]) console.log(`  flak shots: by me ${flak[0]}, by foe ${flak[1]}`);
  if (litShots) console.log(`  shots lit by geysers: ${litShots}`);
  console.log(`  skipped volleys: frozen me ${frozenSkips[0]} foe ${frozenSkips[1]}; stunned me ${stunSkips[0]} foe ${stunSkips[1]}`);
  console.log(`  gates used: ${JSON.stringify(gateUse)}`);
  console.log(`  lantern bonuses: ${JSON.stringify(lantern)}`);
  if (rockN) console.log(`  rockfalls announced ${rockN}, stopped by shield ${rockStop}, crush dmg to my soldiers with a rock touching ${rockHitU.toFixed(0)}`);
  if (fell.length) { const f1 = fell.filter((f) => f[0] === 1), f0 = fell.filter((f) => f[0] === 0); const out = (a) => `off right edge (x>142): ${a.filter((f) => f[1] > 141).length}, off left (x<-30): ${a.filter((f) => f[1] < -29).length}, into the gap (y<-26): ${a.filter((f) => f[2] < -25).length}`; console.log(`  "fell" deaths foe ${f1.length}: ${out(f1)} | me ${f0.length}: ${out(f0)}  sample foe [x,y,vx,vy,round]: ${JSON.stringify(f1.slice(0, 6).map((f) => f.slice(1)))}`); }
}
