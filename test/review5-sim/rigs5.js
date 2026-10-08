// node test/review5-sim/rigs5.js <sep|blast|bosshall|roofjump|roofboss|staleedge|all>
// 第五輪的小型重現（每一個都是獨立的一局，不動 src）。SIEGE_SRC=<舊版 parts> 可以拿舊版來比（roofboss）
const L3 = require('../review3-sim/lib'); const L = require('./lib5');
const which = process.argv[2] || 'all';
const on = (n) => which === 'all' || which === n;
function fresh(li, seed) { const H = {}; const G = L.load('', H); G.simInit(li, {}, seed || 7, 1, {}); return { G, H, S: G.S }; }
function hold(W, secs, each) { const { G, S } = W; for (let i = 0; i < secs * 60; i++) { if (S.state === 'play') S.phaseT = 0; G.simStep(1 / 60); if (each) each(i); } }
function flat(W, X0, type, slot) {
  const { G, S } = W, GY = -3.5, fake = W.fake || (W.fake = { side: 0, x0: X0 - 16, x1: X0 + 16, y0: GY, units: [] });
  const u = G.mkUnit(0, type || 'rocket', fake, { slot: slot || 9, cx: (X0 - fake.x0) / G.CS - 0.5, cy: 0 }, 1); S.team[0].alive++; u.body.setAwake(true); return u;
}
const plat = (W, x0, x1, top) => { const b = W.G.PH.world.createBody({ type: 'static' }); b.createFixture({ shape: new W.G.PL.Box((x1 - x0) / 2, 1.5, { x: (x0 + x1) / 2, y: top - 1.5 }, 0), friction: 0.72 }); return b; };

if (on('sep')) {
  console.log('SEP 1: two units dropped on exactly the same spot on flat ground');
  { const W = fresh(3), a = flat(W, 56, 'rocket', 8), b = flat(W, 56, 'bolt', 9); let tSep = -1, moved = 0; const t0 = W.S.time;
    hold(W, 8, () => { const [ox, oy] = L.overlap(a, b); if (tSep < 0 && (ox <= 0 || oy <= 0)) tSep = W.S.time - t0; if (Math.abs(a.vx) > 0.5 || Math.abs(b.vx) > 0.5) moved = W.S.time - t0; });
    console.log(`   separated after ${tSep.toFixed(2)}s; final dx ${(b.x - a.x).toFixed(2)} (bodies 2.2 wide); last moving at ${moved.toFixed(2)}s; sepT ${a.sepT.toFixed(2)}/${b.sepT.toFixed(2)}; asleep ${!a.body.isAwake()}/${!b.body.isAwake()}; hp ${a.hp}/${b.hp}`); }
  console.log('SEP 2: two units on the same spot on top of a platform of width w (drop 6.8 to the ground on both sides)');
  for (const w of [2.4, 3.4, 4.4, 5.4]) for (const off of [0, 0.6]) {
    const W = fresh(3), a = flat(W, 56, 'rocket', 8), b = flat(W, 56, 'bolt', 9), top = -3.5 + 6.8; plat(W, 56 - w / 2, 56 + w / 2, top);
    a.body.setTransform({ x: 56 + off, y: top + a.bh / 2 + 0.02 }, 0); b.body.setTransform({ x: 56 + off, y: top + b.bh / 2 + 0.02 }, 0);
    const hurt = [0, 0]; W.H.hurt = (u, d) => { if (u === a) hurt[0] += d; if (u === b) hurt[1] += d; };
    hold(W, 8);
    const st = (u) => (!u.alive ? 'DEAD' : u.y < top - 1 ? `fell off (x=${(u.x - 56).toFixed(1)})` : `on top (x=${(u.x - 56).toFixed(1)})`);
    console.log(`   platform ${w} wide, start offset ${off}: A ${st(a)}, B ${st(b)}; fall damage ${hurt[0].toFixed(0)}/${hurt[1].toFixed(0)}`); }
}
if (on('blast')) {
  console.log('BLAST: one rocket (enemy, mass 1) exploding 2 m beside two units -- side by side (2.4 apart) vs stacked on the same spot (separation patched out so they stay stacked)');
  for (const stacked of [0, 1]) {
    const H = {}; const G = L.load('', H, { must: stacked ? [['const dir = dx > 0.01 ? 1 : dx < -0.01 ? -1 :', 'continue; const dir = dx > 0.01 ? 1 : dx < -0.01 ? -1 :']] : [] }); G.simInit(3, {}, 7, 1, {}); const W = { G, H, S: G.S };
    const a = flat(W, 56, 'rocket', 8), b = flat(W, stacked ? 56 : 58.4, 'bolt', 9); hold(W, 1);
    const hp0 = [a.hp, b.hp]; G.physExplode(a.x - 2, a.y + 1.5, G.WPN.rocket, 1, 1, 0, null, 1, 0); const d1 = [hp0[0] - a.hp, hp0[1] - b.hp];
    G.physExplode(a.x, a.y + 1.5, G.WPN.bomb, 1, 1, 0, a, 1, 0); const d2 = [hp0[0] - a.hp - d1[0], hp0[1] - b.hp - d1[1]];
    console.log(`   ${stacked ? 'stacked' : 'side by side'}: rocket 2 m away -> ${d1[0].toFixed(1)} + ${d1[1].toFixed(1)} damage; bomb direct hit on A -> ${d2[0].toFixed(1)} + ${d2[1].toFixed(1)}`); }
}
if (on('bosshall')) {
  console.log('BOSSHALL: boss and a minion on the same spot in a 10.2-wide walled hall (like L6 "J.4.J"); a crate-sized fixed obstacle 0.3 beside the minion blocks him for 3 s, then is removed');
  for (const block of [0, 1]) {
    const W = fresh(3), G = W.G, X0 = 56; W.fake = { side: 1, x0: X0 - 16, x1: X0 + 16, y0: -3.5, units: [] };
    const wall = G.PH.world.createBody({ type: 'static' }); for (const sx of [-1, 1]) wall.createFixture({ shape: new G.PL.Box(0.5, 6, { x: X0 + sx * 5.6, y: 2.5 }, 0), friction: 0.5 });
    const bu = G.mkUnit(1, 'boss', W.fake, { slot: 1, cx: (X0 - W.fake.x0) / G.CS - 0.5, cy: 0 }, 1), mn = G.mkUnit(1, 'fire', W.fake, { slot: 4, cx: (X0 + 0.4 - W.fake.x0) / G.CS - 0.5, cy: 0 }, 1); W.S.team[1].alive += 2; bu.body.setAwake(true); mn.body.setAwake(true);
    let obs = null; if (block) { obs = G.PH.world.createBody({ type: 'static' }); obs.createFixture({ shape: new G.PL.Box(0.6, 0.9, { x: mn.x + 1.1 + 0.3 + 0.6, y: -3.5 + 0.9 }, 0), friction: 0.6 }); }
    const log = []; const snap = (t) => log.push(`t=${t}s dx=${(mn.x - bu.x).toFixed(2)} overlap ${((bu.bw + mn.bw) / 2 - Math.abs(mn.x - bu.x)).toFixed(2)} sepT=${mn.sepT.toFixed(1)}`);
    hold(W, 3); snap(3); if (obs) G.PH.world.destroyBody(obs); hold(W, 3); snap(6); hold(W, 20); snap(26);
    // 再讓一發砲彈把小兵震一下（看推開的規則會不會重新啟動）
    G.physExplode(mn.x - 3, mn.y, G.WPN.rocket, 0, 0.3, 0, null, 1, 0); hold(W, 4); snap(30);
    console.log(`   ${block ? 'blocked for 3 s ' : 'free           '}: ${log.join(' | ')}; boss moved ${(bu.x - X0).toFixed(2)}`); }
}
if (on('roofjump')) {
  console.log('ROOFJUMP: L1/L3/L5 player castle, enemy blast near the top soldier (pavilion roofs intact, nothing else touched): do the roofs die because he bumps his head?');
  for (const li of [0, 2, 4]) for (const wn of ['rocket', 'bomb', 'drop']) for (const [dx, dy] of [[0, -0.3], [1.5, 0.2], [-1.5, 0.2], [0, -2.2]]) {
    const W = fresh(li), G = W.G, S = W.S, u = S.team[0].units[0]; let roofHits = 0, up = 0; const roofs0 = S.st[0].blocks.filter((b) => b.mat === G.M_ROOF && !b.dead).length;
    W.H.roof = (unit, roof) => { roofHits++; if (unit.vy > 2) up++; };
    hold(W, 0.5); const hp0 = u.hp, y0 = u.y; let ymax = y0;
    G.physExplode(u.x + dx, u.y + dy, G.WPN[wn], 1, 1, 0, null, -1, -0.3);
    hold(W, 4, () => { if (u.alive && u.y > ymax) ymax = u.y; });
    const roofs1 = S.st[0].blocks.filter((b) => b.mat === G.M_ROOF && !b.dead && !b.frag).length, posts = S.st[0].blocks.filter((b) => !b.dead && !b.frag && b.cy === u.slot * 0 + Math.round((u.hy - S.st[0].y0) / G.CS) && Math.abs(b.x0 - u.hx) < G.CS * 2.6 && b.mat !== G.M_ROOF).length;
    if (roofHits || roofs1 < roofs0) console.log(`   L${li + 1} ${wn} at (${dx},${dy}) from his feet: jumped ${(ymax - y0).toFixed(2)} (headroom 0.4), roof-rule fired ${roofHits}x (${up} with him moving up), roofs intact ${roofs1}/${roofs0}, wall/post blocks still standing on his floor ${posts}, hp ${hp0.toFixed(0)} -> ${u.alive ? u.hp.toFixed(0) : 'DEAD'}`);
  }
  console.log('   (cases not listed: no roof lost)');
}
if (on('roofboss')) {
  console.log('ROOFBOSS: L6, the two posts of the boss hall are removed (nothing else): what does the roof do to the boss? 5 seeds');
  for (let seed = 1; seed <= 5; seed++) {
    const W = fresh(5, seed), G = W.G, S = W.S; let bu = null; for (const u of S.team[1].units) if (u.type === 'boss') bu = u;
    const st = S.st[1], posts = st.blocks.filter((b) => b.mat === G.M_WOOD && b.ch >= 2 && Math.abs(b.y0 - (bu.hy + G.CS)) < 1), roof = st.blocks.filter((b) => b.mat === G.M_ROOF && b.cw >= 5)[0];
    const log = []; let n = 0; W.H.hurt = (u, d, sd, kind, ctx) => { if (u === bu) { n++; log.push(`${ctx} ${d.toFixed(0)}`); } };
    hold(W, 0.5); const hp0 = bu.hp; for (const p of posts) G.blockKill(p, 0, G.K_BLAST, true);
    hold(W, 6);
    console.log(`   seed ${seed}: posts removed ${posts.length}; boss hp ${hp0.toFixed(0)} -> ${bu.hp.toFixed(0)} (${((hp0 - bu.hp) / bu.hpMax * 100).toFixed(1)}% of max) in ${n} hits [${log.join(', ')}]; roof ${roof.dead ? 'destroyed' : 'intact at y=' + roof.body.getPosition().y.toFixed(1) + ' (boss head ' + (bu.y + bu.bh).toFixed(1) + ')'}; phase ${S.boss.phase}`);
  }
}
if (on('staleedge')) {
  console.log('STALEEDGE: a unit dies while the ledge push is active (edge=+1, edgeT small), then is revived by a lantern at his intact home slot');
  for (const e of [0, 1, -1]) {
    const W = fresh(0), G = W.G, S = W.S, u = S.team[0].units[1]; hold(W, 0.5);
    u.edge = e; u.edgeT = 0.05; G.killUnit(u, 1, 0); hold(W, 0.5); S.state = 'play';
    // 對齊到「下一次重新判定還要等最久」的那一格
    while (((S.frame + 1 + u.slot * 3) & 7) !== 1) hold(W, 1 / 60);
    G.grantBonus(0, 'troop', u.hx, u.hy); const x0 = u.x, y0 = u.y; let vmax = 0, xoff = 0; hold(W, 3, () => { if (u.alive) { if (Math.abs(u.vx) > vmax) vmax = Math.abs(u.vx); if (Math.abs(u.x - x0) > Math.abs(xoff)) xoff = u.x - x0; } });
    console.log(`   stale edge=${e}: revived at (${x0.toFixed(2)},${y0.toFixed(2)}) home (${u.hx.toFixed(2)},${u.hy.toFixed(2)}); peak sideways speed ${vmax.toFixed(1)} m/s, max sideways drift ${xoff.toFixed(2)} m, ends at (${u.alive ? u.x.toFixed(2) + ',' + u.y.toFixed(2) : 'DEAD'}) hp ${u.hp.toFixed(0)}`); }
}
