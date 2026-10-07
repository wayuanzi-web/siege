// node test/review3-sim/credit.js：分段的樓板受傷，功勞（T.dealt、連珠砲集氣）算給誰。
// 敵城的石板分別被我方、敵方自己、中立的爆炸炸到；被東西撞到（輪到我方／輪到敵方／落石階段）；我方放的火、敵方自己的火、火延燒
const L = require('./lib'); const G = L.load('K_CRUSH, K_FIRE, ignite, burnStep');
const { S, simInit, simStep, physExplode, WPN, blockHurt, K_CRUSH, ignite } = G;
let bad = 0; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) bad++; };
function fresh(li) { simInit(li, {}, 1, 1, null); S.team[1].ai = null; S.phase = 'resolve'; S.turn = 0; S.round = 1; return S.blocks.find((b) => b.seg && b.side === 1 && b.mat === 2) || S.blocks.find((b) => b.seg && b.side === 1); }
const snap = () => [S.team[0].dealt, S.team[1].dealt, S.team[0].ult.c, S.team[1].ult.c];
let book = null; const open = () => { book = new Map(); for (const q of S.blocks) if (!q.dead && !q.frag && q.side === 1) book.set(q, q.seg ? Array.from(q.seg) : [q.hp]); };
// 敵城所有磚（不含碎塊）實際掉了多少耐久（打穿的那一段只算到 0；斷開之後的新磚接著算）
const lostAll = () => { let now = 0, before = 0; for (const [q, v] of book) for (const x of v) before += x; for (const q of S.blocks) if (!q.dead && !q.frag && q.side === 1) { if (q.seg) for (const x of q.seg) now += Math.max(0, x); else now += Math.max(0, q.hp); } return before - now; };
const d = (a, b) => b.map((v, i) => +(v - a[i]).toFixed(2));
for (const side of [0, 1, 2]) { const b = fresh(1), s0 = snap(); open(); physExplode(b.x0, b.y0 + 3, WPN.rocket, side, 1, 0, null, 0, -1); const dd = d(s0, snap()), lost = lostAll(); console.log(`rocket by side ${side} on the enemy slab: enemy blocks lost ${lost.toFixed(1)} in all; dealt +[${dd[0]}, ${dd[1]}], ult +[${dd[2]}, ${dd[3]}]`); ok(side === 0 ? Math.abs(dd[0] - lost) < 0.6 && dd[1] === 0 && dd[2] > 0 : dd[0] === 0 && dd[1] === 0 && dd[2] === 0 && dd[3] === 0, side === 0 ? 'credited to me, once per point of damage' : 'no credit'); }
for (const [phase, turn, want] of [['resolve', 0, 0], ['resolve', 1, -1], ['hazard', 1, -1], ['hazard', 0, -1]]) { const b = fresh(1); S.phase = phase; S.turn = turn; const s0 = snap(); b.body.setAwake(true);
  // 真的拿一顆石頭砸：從上面丟一塊很重的東西下來太慢，直接照 physStep 的算法呼叫：撞擊傷害記在被打的那一邊以外的「現在輪到的那一邊」，落石階段不算任何人的
  const credit = S.phase === 'hazard' ? 2 : S.turn; blockHurt(b, 10, K_CRUSH, b.side === credit ? 2 : credit, b.x0, b.y0); const dd = d(s0, snap()); console.log(`impact on the enemy slab during ${phase}, turn ${turn}: dealt +[${dd[0]}, ${dd[1]}]`); ok(want === 0 ? dd[0] === 10 && dd[1] === 0 : dd[0] === 0 && dd[1] === 0, want === 0 ? 'credited to me' : 'credited to nobody'); }
{ const b = fresh(0), s0 = snap(), n = b.cw; open(); ignite(b, 3, 0); for (let i = 0; i < 60; i++) { S.phase = 'resolve'; S.turn = 1; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); } const dd = d(s0, snap()), lost = lostAll(); console.log(`my fire on the enemy ${n}-cell wooden beam, burning 1s during the ENEMY's turn (it spreads): enemy blocks lost ${lost.toFixed(1)} in all; dealt +[${dd[0]}, ${dd[1]}]`); ok(Math.abs(dd[0] - lost) < 0.8 && dd[0] >= 4.2 * 1.4 * n - 0.8 && dd[1] === 0, 'still credited to me while it is their turn, once per cell'); }
{ const b = fresh(0), s0 = snap(); ignite(b, 3, 1); for (let i = 0; i < 60; i++) { S.phase = 'resolve'; S.turn = 0; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); } const dd = d(s0, snap()); console.log(`the enemy's own fire on its own beam, burning during MY turn: dealt +[${dd[0]}, ${dd[1]}]`); ok(dd[0] === 0 && dd[1] === 0, 'credited to nobody'); }
console.log(bad ? `${bad} FAILED` : 'all passed'); process.exit(bad ? 1 : 0);
