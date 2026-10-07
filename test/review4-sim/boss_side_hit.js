// node test/review4-sim/boss_side_hit.js [速度=8]
// 一個魔王大小的兵站在空地上，一塊兩格的石磚（23 公斤）從正側面平平地撞過來（不是從頭上掉下來）：算不算「被重物砸到頭」而扣半成血？
// 對照：撞在腰部（門檻以下）、從頭頂正上方 1 公尺掉下來
const L = require('./lib4');
function run(name, place) {
  const H = {}; const G = L.load('', { hooks: H }); const { S, simInit, simStep, mkBlock, mkUnit, M_STONE, CS } = G;
  simInit(3, {}, 3, 1, {}); const fake = { side: 1, x0: 40, x1: 60, y0: -3.5, units: [] };
  const bu = mkUnit(1, 'boss', fake, { slot: 9, cx: (50 - 40) / CS - 0.5, cy: 0 }, 1); S.team[1].alive++; bu.body.setAwake(true);
  const hp0 = bu.hp, log = [];
  H.hurt = (u, d, side, kind, ctx) => { if (u !== bu) return; const r = H.imp, oth = r && (r.a === bu ? r.b : r.a); log.push(`t=${S.time.toFixed(2)} ${ctx} ${d.toFixed(1)} (contact ${(r.y - bu.body.getPosition().y).toFixed(2)} above centre, "on the head" if > ${(bu.bh * 0.2).toFixed(2)}; hit by ${oth && oth.isBlock ? L.bdesc(oth) : '?'})`); };
  for (let i = 0; i < 30; i++) { S.phaseT = 0; simStep(1 / 60); }
  const b = place(G, bu, mkBlock, M_STONE); b.inPlace = false;
  for (let i = 0; i < 120; i++) { S.phaseT = 0; simStep(1 / 60); }
  console.log(`${name}: hp ${hp0.toFixed(0)} -> ${bu.hp.toFixed(0)} (${((hp0 - bu.hp) / bu.hpMax * 100).toFixed(1)}% of max)  ${log.join(' | ') || '(no damage)'}`);
}
const V = +(process.argv[2] || 8);
const side = (dy) => (G, bu, mkBlock, M) => { const p = bu.body.getPosition(); const b = mkBlock(G.S.rubble, { mat: M, kind: 'box', x: p.x - 7, y: p.y + dy, w: 6.8, h: 3.4, a: Math.PI / 2 * 0, awake: true }); b.body.setGravityScale(0); b.body.setLinearVelocity({ x: V, y: 0 }); return b; };
run(`2-cell stone block (23 kg) sliding in from the SIDE at ${V} m/s, its lower edge at shoulder height`, (G, bu, mkBlock, M) => { const p = bu.body.getPosition(); const b = mkBlock(G.S.rubble, { mat: M, kind: 'box', x: p.x - 7, y: p.y + bu.bh * 0.24 + 1.7 - 0.05, w: 6.8, h: 3.4, awake: true }); b.body.setGravityScale(0); b.body.setLinearVelocity({ x: V, y: 0 }); return b; });
run('same block from the side, centred on his waist', side(-0.3));
run('same block dropped on his head from 1 m', (G, bu, mkBlock, M) => { const p = bu.body.getPosition(); return mkBlock(G.S.rubble, { mat: M, kind: 'box', x: p.x, y: p.y + bu.bh / 2 + 1.7 + 1, w: 6.8, h: 3.4, awake: true }); });
