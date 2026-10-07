// node test/review2-sim/a_kegs_lit.js [種子數=40]
// A4 補充：一發「著火的」砲彈（穿過地火的那種）炸在全新敵城 E4 的外面（鐵甲外側、背牆外側、屋頂），火藥桶被引爆的機率。
// 爆炸本身炸不到火藥桶（隔著鐵甲／石牆／石板，f ≤ 0.5），但爆炸「點火」不看遮蔽，旁邊的木頭著了火再延燒到火藥桶。
const { load } = require('./lib');
const G = load({ extra: ['F_FIRE', 'WPN', 'M_KEG'] });
const { S, simInit, simStep, physExplode, WPN, F_FIRE, M_KEG, CS } = G;
const N = +(process.argv[2] || 40);
function fresh(seed) { simInit(3, {}, seed, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'resolve'; S.turn = 0; S.phaseT = 0; S.quietT = 0; S.round = 1; }
function run(sec) { let n = 0; while (S.state === 'play' && n++ < sec * 60) { simStep(1 / 60); if (S.phase !== 'resolve') { S.phase = 'resolve'; S.turn = 0; S.phaseT = 0; S.quietT = 0; } } }
fresh(1); const st = S.st[1];
const pts = [
  ['outer face of the upper iron plate, keg row (cy=7)', st.x0 - 0.05, st.y0 + 7.5 * CS, 1, 0],
  ['outer face of the upper iron plate, beam row (cy=6)', st.x0 - 0.05, st.y0 + 6.5 * CS, 1, 0],
  ['outer face of the upper iron plate, room below (cy=5)', st.x0 - 0.05, st.y0 + 5.5 * CS, 1, 0],
  ['top of the roof', st.x0 + 4.5 * CS, st.y0 + 11 * CS + 0.05, 0, -1],
  ['top of the stone slab beside the top room (cy=8)', st.x0 + 1.5 * CS, st.y0 + 9 * CS + 0.05, 0, -1],
  ['outer face of the back wall, keg row', st.x0 + 8 * CS + 0.05, st.y0 + 7.5 * CS, -1, 0]
];
for (const [wn, label] of [['rocket', 'lit rocket'], ['bomb', 'lit bomb'], ['ice', 'lit ice shot']]) for (const [name, x, y, vx, vy] of pts) {
  let any = 0, slabDead = 0, ironDead = 0; const cause = {};
  for (let s = 0; s < N; s++) {
    fresh(500 + s * 31); let first = null; S.onKegFire = (b, ek) => { b._c = ek ? 'ignited by the blast itself' : 'fire spread'; }; S.onKill = (b, side, kind) => { if (b.mat === M_KEG && !first) first = b._c || 'blast/impact'; };
    const slab = S.st[1].blocks.find((b) => b.cy === 8 && !b.prop), iron = S.st[1].blocks.find((b) => b.mat === 3 && b.cy === 5);
    physExplode(x, y, WPN[wn], 0, 1, F_FIRE, null, vx * 40, vy * 40); run(12);
    if (first) { any++; cause[first] = (cause[first] || 0) + 1; } if (slab.dead) slabDead++; if (iron.dead) ironDead++;
    S.onKegFire = null; S.onKill = null;
  }
  console.log(`${label.padEnd(13)} on ${name.padEnd(52)} kegs explode in ${String(any).padStart(2)}/${N} (${String(Math.round(100 * any / N)).padStart(3)}%)  [stone slab destroyed in ${slabDead}, iron plate in ${ironDead}]  ${Object.keys(cause).map((c) => c + ' ' + cause[c]).join(', ')}`);
}
