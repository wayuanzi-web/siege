// H16：被炸到城樓後面（或前面空地）的兵，照同一個角度開火，砲彈從外面打進自己的城。
// F_IN（自己的磚不擋自己的砲）在「飛了 0.3 秒而且人在城樓範圍外」時就取消，所以站在城外的兵打出去的砲彈，
// 飛到自己城牆時已經沒有 F_IN，直接炸在自己城上。
//   node test/review/h16_unit_behind_castle.js [level=5] [bot=casual] [seed=808679] [diff=0] [up=5]
const G = require('./h')();
const { S, SH, simInit, simStep, BOTS, RAY } = G;
const a = process.argv.slice(2), li = +(a[0] || 5) - 1, bot = a[1] || 'casual', seed = +(a[2] || 808679), diff = +(a[3] || 0), upL = +(a[4] || 5);
simInit(li, { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL }, seed, diff, { botA: BOTS[bot] });
const st = S.st[0]; let n = 0; const fires = [];      // 最近開火的紀錄：哪個兵、砲口在哪
const ownHp = () => { let s = 0; for (const b of st.blocks) if (!b.dead && !b.frag) s += b.hp; return s; };
let hp0 = 0, lossTot = 0;
S.on = (t, x, y, r, wi, side, f) => {
  if (t === 'fire' && r === 0) fires.push({ t: S.time, x, y, slot: side, w: wi });
  if (t === 'boom' && side === 0 && RAY.x === x && RAY.y === y && RAY.o && RAY.o.isBlock && RAY.o.side === 0 && x > st.x0 - 1 && x < st.x1 + 1 && y < st.y1 + 4) {
    let bi = -1, bd = 2.2; for (let i = 0; i < SH.n; i++) { if (SH.side[i] !== 0) continue; const d = Math.hypot(SH.x[i] - x, SH.y[i] - y); if (d < bd) { bd = d; bi = i; } }
    if (bi < 0 || (SH.flag[bi] & (G.F_WILD | G.F_PORT | G.F_IN))) return;
    const age = SH.age[bi], born = S.time - age; let src = null; for (const fr of fires) if (fr.w === wi && Math.abs(fr.t - born) < 0.04) src = fr;
    const loss = hp0 - ownHp(); lossTot += loss; n++;
    if (n <= 6) console.log(`  round ${S.round}: my ${G.WL[wi].id} shot (age ${age.toFixed(2)}s, vx=${SH.vx[bi].toFixed(0)}) exploded on MY OWN brick at (${x.toFixed(1)},${y.toFixed(1)}); it was fired from muzzle ${src ? '(' + src.x.toFixed(1) + ',' + src.y.toFixed(1) + ') by slot ' + src.slot : '?'}  [my castle spans x ${st.x0}..${st.x1.toFixed(1)}]  own brick hp lost this step: ${loss.toFixed(1)}`);
  }
};
while (S.state === 'play' && S.round < 45) { hp0 = ownHp(); simStep(1 / 60); while (fires.length && S.time - fires[0].t > 9.5) fires.shift(); }
console.log(`L${li + 1} ${bot} seed=${seed} diff=${diff} up=${upL}: ${S.state} after ${S.round} rounds; own un-mirrored shots that detonated on own bricks: ${n}; own brick hp lost in those steps: ${lossTot.toFixed(0)}`);
