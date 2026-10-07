// node test/review4-sim/revive_check.js <每關幾場=40> [bot=casual] [難度=1] [第幾份=0] [共幾份=1]
// 正常對打（不加料），每次有援軍（天燈的「troop」）就記錄：復活的那一刻有沒有跟別的兵或磚疊在一起、
// 之後 4 秒內怎麼了（摔了多高、有沒有死、怎麼死的、是不是一直跟別的兵卡在一起、有沒有因此被「壓」扣血）
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, LEVELS, BOTS, PL } = G;
const N = +(process.argv[2] || 40), bot = process.argv[3] || 'casual', diff = +(process.argv[4] === undefined ? 1 : process.argv[4]), shard = +(process.argv[5] || 0), nsh = +(process.argv[6] || 1);
function overlapDepth(u) {
  // 跟別的東西重疊多深（看接觸點的 separation）；回傳 [最深, 跟誰]
  let deep = 0, who = '';
  for (let ce = u.body.getContactList(); ce; ce = ce.next) { const c = ce.contact; if (!c.isTouching()) continue; const wm = c.getWorldManifold(null); if (!wm) continue; for (let k = 0; k < wm.pointCount; k++) if (-wm.separations[k] > deep) { deep = -wm.separations[k]; const o = ce.other.getUserData(); who = o ? (o.isUnit ? 'unit:' + o.type + '#' + o.slot : L.bdesc(o)) : 'ground'; } }
  return [deep, who];
}
function unitOverlap(u) {
  // 直接比位置：有沒有別的兵的身體跟他疊在一起（兩個身體的外框重疊超過 0.4）
  for (const o of S.units) { if (o === u || !o.alive) continue; const dx = Math.abs(o.x - u.x), dy = Math.abs(o.y - u.y); if (dx < (o.bw + u.bw) / 2 - 0.4 && dy < (o.bh + u.bh) / 2 - 0.4) return o; }
  return null;
}
let games = 0, g = 0; const recs = [], t00 = Date.now(); let cur = '';
const track = [];
H.hurt = (u, d, side, kind, ctx) => { for (const r of track) if (r.u === u) { r.dmg[ctx] = (r.dmg[ctx] || 0) + d; } else if (r.partner === u) { r.pdmg[ctx] = (r.pdmg[ctx] || 0) + d; } };
H.kill = (u, side, how, ctx) => { for (const r of track) if (r.u === u && !r.died) { r.died = `how${how} ${ctx} +${(S.time - r.t).toFixed(2)}s`; } else if (r.partner === u && !r.pdied) r.pdied = `how${how} ${ctx} +${(S.time - r.t).toFixed(2)}s`; };
for (let li = 0; li < LEVELS.length; li++) for (let sd = 0; sd < N; sd++) {
  if (g++ % nsh !== shard) continue;
  const seed = 250000 + sd * 7919 + li * 131;
  cur = `L${li + 1} ${bot} d${diff} seed${seed}`; track.length = 0;
  simInit(li, {}, seed, diff, { botA: BOTS[bot] }); games++;
  S.on = (t, a, b, c, d) => {
    if (t !== 'revive') return;
    let u = null; for (const k of S.team[c].units) if (k.slot === d) u = k;
    const o = unitOverlap(u);
    const r = { tag: cur, t: S.time, round: S.round, side: c, type: u.type, slot: d, x: u.x, y: u.y, home: `(${u.hx.toFixed(1)},${u.hy.toFixed(1)})`, moved: Math.hypot(u.x - u.hx, u.y - u.hy), u, partner: o, pname: o ? o.type + '#' + o.slot : '', dmg: {}, pdmg: {}, died: '', pdied: '', maxDeep: 0, deepWho: '', minY: u.y, stuckT: 0, y0: u.y };
    recs.push(r); track.push(r);
  };
  while (S.state === 'play' && S.round < 40) {
    simStep(1 / 60);
    for (let i = track.length - 1; i >= 0; i--) {
      const r = track[i]; if (S.time - r.t > 4) { track.splice(i, 1); continue; }
      if (!r.u.alive) continue;
      const [d, who] = overlapDepth(r.u); if (d > r.maxDeep) { r.maxDeep = d; r.deepWho = who; }
      if (unitOverlap(r.u)) r.stuckT += 1 / 60;
      if (r.u.y < r.minY) r.minY = r.u.y;
    }
  }
  for (const r of recs) if (r.tag === cur && !r.done) { r.done = 1; r.result = S.state; }
}
console.log(`${games} games, ${recs.length} revivals, ${((Date.now() - t00) / 1000).toFixed(0)}s`);
let onUnit = 0, died = 0, fell = 0, moved = 0;
for (const r of recs) { if (r.partner) onUnit++; if (r.died) died++; if (r.y0 - r.minY > 3) fell++; if (r.moved > 1) moved++; }
console.log(`revived on top of / inside another live unit: ${onUnit}; died within 4 s: ${died}; dropped more than 3 m within 4 s: ${fell}; placed more than 1 m from the home slot: ${moved}`);
const bySide = [0, 0]; for (const r of recs) bySide[r.side]++; console.log(`by side: mine ${bySide[0]}, foe ${bySide[1]}`);
for (const r of recs) {
  if (!r.partner && !r.died && r.y0 - r.minY <= 3 && r.maxDeep < 0.5) continue;
  console.log(`  ${r.tag} t=${r.t.toFixed(1)} r${r.round} side${r.side} ${r.type}#${r.slot} home ${r.home} placed (${r.x.toFixed(1)},${r.y.toFixed(1)})${r.partner ? ' INSIDE ' + r.pname + ' (overlapping for ' + r.stuckT.toFixed(2) + 's)' : ''}; max penetration ${r.maxDeep.toFixed(2)} (${r.deepWho}); fell ${(r.y0 - r.minY).toFixed(1)}; dmg ${JSON.stringify(r.dmg)}${r.partner ? ' partner dmg ' + JSON.stringify(r.pdmg) : ''}; ${r.died ? 'DIED ' + r.died : 'survived 4s'}${r.pdied ? '; partner DIED ' + r.pdied : ''}`);
}
