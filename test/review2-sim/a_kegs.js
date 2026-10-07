// node test/review2-sim/a_kegs.js [試幾次=60]
// A4：火藥桶的新規則（直接打中、或爆炸夠近 f > 0.5 才會爆；被另一桶炸到一定爆）。
// 第四關敵城 E4（全新的城）：隔著完好的石板、鐵甲炸，火藥桶會不會爆？火（屋頂著火、樓板著火）會不會隔著石板把它點爆？
const { load } = require('./lib');
const G = load({ extra: ['ignite', 'F_FIRE', 'WPN', 'M_KEG', 'M_ROOF', 'M_WOOD', 'M_STONE', 'M_IRON'] });
const { S, simInit, simStep, physExplode, WPN, MAT, CS, ignite, F_FIRE, M_KEG, M_ROOF, M_WOOD, M_STONE, M_IRON } = G;
const N = +(process.argv[2] || 60);
function fresh(seed) { simInit(3, {}, seed || 4242, 1, {}); S.team[0].ai = null; S.phase = 'resolve'; S.turn = 0; S.phaseT = 0; S.quietT = 0; S.round = 1; S.on = null; S.onKill = null; S.onKegFire = null; }
function run(sec) { let n = 0; while (S.state === 'play' && n++ < sec * 60) { simStep(1 / 60); if (S.phase !== 'resolve') { S.phase = 'resolve'; S.turn = 0; S.phaseT = 0; S.quietT = 0; } } }
const kegs = () => S.st[1].blocks.filter((b) => b.mat === M_KEG && !b.dead);
function watch() { const log = []; S.onKegFire = (b, ek) => { b._c = ek ? 'lit by a burning shot' : 'fire spread (burnStep)'; }; S.onKill = (b, side, kind) => { if (b.mat === M_KEG) log.push({ t: S.time, c: b._c || (kind === 99 ? 'collapse' : 'blast/impact'), cx: b.cx }); }; return log; }

fresh();
const st = S.st[1];
console.log('E4 as placed in the field (front = left). kegs at cells: ' + kegs().map((k) => `(${k.cx},${k.cy})`).join(' ') + `; keg hp ${kegs()[0].hm.toFixed(1)}; slab above them: ${st.blocks.filter((b) => b.cy === 8 && !b.prop).map((b) => MAT[b.mat].k + ' ' + b.cw + 'x' + b.ch + ' hp ' + b.hm.toFixed(0)).join(', ')}`);

// --- (a) 隔著東西炸 ---
console.log('\n(a) one explosion at a point OUTSIDE the keg room, castle intact (kegs destroyed / 3; did the slab survive?)');
const kx = kegs().map((k) => k.body.getPosition().x), ky = kegs()[0].body.getPosition().y;
const slabTop = st.y0 + 9 * CS, frontX = st.x0, backX = st.x0 + 8 * CS + CS;          // 石板上緣、鐵甲外面、背面牆外面
const pts = [
  ['on top of the stone slab, right above the front keg', kx[0], slabTop + 0.05, 0, -1],
  ['on top of the stone slab, above the middle keg', kx[1], slabTop + 0.05, 0, -1],
  ['on the outer face of the iron plate, at keg height', frontX - 0.05, ky, 1, 0],
  ['on the back wall, at keg height', backX - CS + 0.05 + CS, ky, -1, 0],
  ['inside the room below, on the floor under the wooden beam', kx[1], st.y0 + 5 * CS + 0.05, 0, -1]
];
for (const [wn, mass, flag, label] of [['bomb', 1, 0, 'bomb'], ['bomb', 1, 4, 'bomb lit by a geyser (×1.5)'], ['bomb', 2, 0, 'bomb, merged mass 2 (radius ×1.4)'], ['rocket', 1, 0, 'rocket'], ['rocket', 1, 4, 'rocket lit'], ['drop', 1, 0, 'balloon bomb']]) {
  const row = [];
  for (const [name, x, y, vx, vy] of pts) {
    fresh(); const log = watch(), slab = S.st[1].blocks.find((b) => b.cy === 8 && !b.prop);
    physExplode(x, y, WPN[wn], 0, mass, flag, null, vx * 40, vy * 40); run(8);
    row.push(`${log.length}/3${slab.dead ? ' (slab destroyed)' : ''}${log.length ? ' [' + [...new Set(log.map((l) => l.c))].join(',') + ']' : ''}`);
  }
  console.log(`   ${label.padEnd(34)} ${pts.map((p, i) => p[0].split(',')[0].slice(0, 26) + ': ' + row[i]).join('  |  ')}`);
}
// 同一點連續 N 發火箭（倍增後的一群）
for (const n of [6, 15, 30]) {
  fresh(); const log = watch(), slab = S.st[1].blocks.find((b) => b.cy === 8 && !b.prop);
  for (let k = 0; k < n; k++) { physExplode(kx[1] + (k % 5 - 2) * 0.8, slabTop + 0.05, WPN.rocket, 0, 0.38, 0, slab.dead ? null : slab, 0, -40); for (let i = 0; i < 4; i++) simStep(1 / 60); }
  run(8);
  console.log(`   ${n} split rockets (mass 0.38) on top of the slab above the middle keg: kegs destroyed ${log.length}/3${slab.dead ? ' (slab destroyed first)' : ' (slab intact, hp ' + slab.hp.toFixed(0) + '/' + slab.hm.toFixed(0) + ')'}`);
}

// --- (b) 直接打中一桶：會不會三桶連環爆？炸死誰？ ---
console.log('\n(b) direct hit on one keg (castle intact): chain and result');
for (let i = 0; i < 3; i++) {
  fresh(); const log = watch(), k = kegs().sort((p, q) => p.cx - q.cx)[i], T = S.team[1], hp0 = T.units.map((u) => u.hp);
  const died = []; const prevOn = S.on; S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && c === 1) died.push(d + '#' + f); };
  physExplode(k.body.getPosition().x, k.body.getPosition().y + 1, WPN.rocket, 0, 1, 0, k, 0, -40); run(9);
  console.log(`   rocket hits keg at cell (${k.cx},${k.cy}): kegs destroyed ${log.length}/3 within ${(log.length ? log[log.length - 1].t - log[0].t : 0).toFixed(2)}s; enemy units killed: ${died.join(', ') || 'none'}; survivors hp ${T.units.filter((u) => u.alive).map((u) => u.type + '#' + u.slot + ' ' + u.hp.toFixed(0) + '/' + u.hpMax.toFixed(0)).join(', ')}; structure bar ${(G.structBar(1) * 100).toFixed(0)}%`);
}

// --- (c) 火：把某一塊會燒的磚點著（城是完好的），看火藥桶會不會被延燒引爆（隔著石板） ---
console.log(`\n(c) set ONE block on fire in an intact castle (${N} seeds each), no explosion anywhere: how often do the kegs go off, and how soon`);
function fireTest(label, pick) {
  let any = 0, all3 = 0, tsum = 0; const causes = {};
  for (let s = 0; s < N; s++) {
    fresh(1000 + s * 17); const log = watch(), b = pick(S.st[1]); if (!b) { console.log('   (no such block: ' + label + ')'); return; }
    ignite(b, 3 + (s % 3)); const t0 = S.time; run(14);
    if (log.length) { any++; tsum += log[0].t - t0; causes[log[0].c] = (causes[log[0].c] || 0) + 1; } if (log.length >= 3) all3++;
  }
  console.log(`   ${label.padEnd(56)} first keg explodes in ${any}/${N} (${Math.round(100 * any / N)}%)${any ? `, on average ${(tsum / any).toFixed(1)}s after ignition; all three in ${all3}/${N}; cause: ${Object.keys(causes).map((c) => c + ' ' + causes[c]).join(', ')}` : ''}`);
}
fireTest('roof tile (cy=10), two floors + a stone slab above the kegs', (st2) => st2.blocks.find((b) => b.mat === M_ROOF));
fireTest('one wooden post of the top room (cy=9)', (st2) => st2.blocks.find((b) => b.mat === M_WOOD && b.cy === 9 && !b.prop));
fireTest('the wooden beam the kegs stand on (cy=6)', (st2) => st2.blocks.find((b) => b.mat === M_WOOD && b.cy === 6 && !b.prop && b.cw > 2));
fireTest('wooden block in the room below (cy=5)', (st2) => st2.blocks.find((b) => b.mat === M_WOOD && b.cy === 5 && !b.prop));
fireTest('crate in the room below (cy=5, prop)', (st2) => st2.blocks.find((b) => b.mat === M_WOOD && b.cy === 5 && b.prop));
fireTest('the wooden gate in the base (cy=1)', (st2) => st2.blocks.find((b) => b.mat === M_WOOD && b.cy === 1 && !b.prop));

// --- (d) 著火的砲彈打在屋頂上（真的會發生的情況：火箭穿過地火） ---
console.log(`\n(d) lit shots landing on the ROOF of the intact castle (${N} seeds each)`);
for (const [wn, n, label] of [['rocket', 2, '2 lit rockets (one unit, no gate)'], ['rocket', 6, '6 lit split rockets (×3 gate)'], ['bomb', 1, '1 lit bomb']]) {
  let any = 0, tsum = 0; const causes = {};
  for (let s = 0; s < N; s++) {
    fresh(2000 + s * 13); const log = watch(), roof = S.st[1].blocks.find((b) => b.mat === M_ROOF), p = roof.body.getPosition();
    const t0 = S.time;
    for (let k = 0; k < n; k++) { physExplode(p.x + (k - n / 2) * 1.2, p.y + roof.h / 2, WPN[wn], 0, n > 2 ? 0.52 : 1, F_FIRE, roof.dead ? null : roof, 0, -40); for (let i = 0; i < 5; i++) simStep(1 / 60); }
    run(14);
    if (log.length) { any++; tsum += log[0].t - t0; causes[log[0].c] = (causes[log[0].c] || 0) + 1; }
  }
  console.log(`   ${label.padEnd(34)} kegs go off in ${any}/${N} (${Math.round(100 * any / N)}%)${any ? `, ${(tsum / any).toFixed(1)}s after impact on average; cause of the first: ${Object.keys(causes).map((c) => c + ' ' + causes[c]).join(', ')}` : ''}`);
}
