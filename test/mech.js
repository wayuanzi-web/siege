// node test/mech.js <關卡 1-12> <side 0|1> "<動作>; <動作>..." [秒數=10]
// 直接對某一邊的機關動手（不用瞄準）：看機關有沒有照設計垮，兩邊都要一樣。
//   cut:<tag>        剪斷那一邊 tag 的繩子／鐵鍊（例 cut:stay、cut:front、cut:back、cut:bell、cut:lamp）
//   cutlow:<tag>     只剪最低的那一條   kill:<欄>,<列>   打掉藍圖上那一格的磚   pop:<第幾顆氣球>   hull:<bow|mid|stern>   fuse   stake   bell
const G = require('./load')('ropeCut, tetherPop, castleB, fuseIgnite, blockKill, bellPush');
const { S, simInit, simStep, LEVELS } = G;
const li = +process.argv[2] - 1, side = +process.argv[3], acts = (process.argv[4] || '').split(';').map((x) => x.trim()).filter(Boolean), T = +(process.argv[5] || 10);
simInit(li, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'resolve'; S.turn = 1 - side; S.round = 2;
const ev = []; S.on = (t, a, b, c, d, e) => { if (t === 'udie' || t === 'snap' || t === 'tilt' || t === 'tpop' || t === 'leak' || t === 'fuse' || t === 'roll' || t === 'reso') ev.push(`${S.time.toFixed(1)}s ${t}${t === 'udie' ? ' ' + (c ? '敵' : '我') + '#' + f + ' how' + e : ''}`); };
let f; S.on = ((on) => (t, a, b, c, d, e, ff) => { f = ff; on(t, a, b, c, d, e); })(S.on);
const by = 1 - side;
for (const a of acts) {
  const [k, v] = a.split(':');
  if (k === 'cut' || k === 'cutlow') { let rs = S.ropes.filter((r) => r.side === side && !r.cut && r.tag === v); if (k === 'cutlow') rs = [rs.reduce((p, q) => (Math.min(p.e[1], p.e[3]) < Math.min(q.e[1], q.e[3]) ? p : q))]; for (const r of rs) G.ropeCut(r, by, 0, false); }
  else if (k === 'kill') { const [cx, row] = v.split(',').map(Number), b = G.castleB(side, cx, row); if (b) G.blockKill(b, by, 0); else console.log('沒有磚', v); }
  else if (k === 'pop') { const T2 = S.objs.filter((o) => o.t === 'tether' && o.side === side); G.tetherPop(T2[+v], by); }
  else if (k === 'hull') { const P = S.st[side].plat; for (const c of P.comps) if ((v === 'bow' && c.bow) || (v === 'stern' && c.stern) || (v === 'mid' && !c.bow && !c.stern)) c.hp = 0; P.body.setAwake(true); }
  else if (k === 'fuse') { const F = S.st[side].fuse; G.fuseIgnite(F, 0.3, by); }
  else if (k === 'stake') { const R = S.rollers.find((r) => r.to === side); G.blockKill(R.stake, by, 0); }
  else if (k === 'bell') { const B = S.bell; G.bellPush(by); B.b.body.setLinearVelocity({ x: (side ? 1 : -1) * +(v || 20), y: 0 }); B.b.body.setAwake(true); }
}
for (let i = 0; i < T * 60 && S.state === 'play'; i++) { S.phase = 'resolve'; S.phaseT = 0; simStep(1 / 60); }
const u = (s) => S.team[s].units.map((x) => (x.alive ? x.hp.toFixed(0) : 'X')).join(',');
console.log(`L${li + 1} ${LEVELS[li].name} 對${side ? '敵城' : '我方'}：${acts.join('; ')}  → 我方 ${u(0)}  敵軍 ${u(1)}  ${S.state}${S.pivots.length ? '  天秤 ' + S.pivots.map((p) => (p.ang * 57.3).toFixed(0) + '°').join(' ') : ''}`);
for (const e of ev) console.log('   ' + e);
