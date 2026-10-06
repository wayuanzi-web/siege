// H3：落石（side 2 的「rubble」）砸進我方城樓之後留在原地。我方的砲彈只會穿過「自己這一邊的磚」（F_IN），
// 落石不算自己的，所以砲口旁邊只要卡著一顆落石，那個兵每一發都在自己城裡爆炸。
//   node test/review/h3_rock_blocks_own_shots.js [level=4] [bot=newbie] [seed=702959] [diff=0] [up=3]
const G = require('./h')();
const { S, SH, simInit, simStep, BOTS, RAY, teamBar } = G;
const a = process.argv.slice(2), li = +(a[0] || 4) - 1, bot = a[1] || 'newbie', seed = +(a[2] || 702959), diff = +(a[3] || 0), upL = +(a[4] || 3);
simInit(li, { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL }, seed, diff, { botA: BOTS[bot] });
const ownHp = () => { let s = 0; for (const b of S.st[0].blocks) if (!b.dead && !b.frag) s += b.hp; return s; };
let hp0 = 0, n = 0, lossTot = 0, fired = 0; const rounds = new Set();
S.on = (t, x, y, r, wi, side, f) => {
  if (t === 'fire' && side === undefined) return;
  if (t === 'boom' && side === 0 && RAY.x === x && RAY.y === y && RAY.o && RAY.o.isBlock && RAY.o.st === S.rubble) {
    const st = S.st[0]; if (!(x > st.x0 - 1 && x < st.x1 + 1 && y < st.y1 + 4)) return;
    const loss = hp0 - ownHp(); n++; lossTot += loss; rounds.add(S.round);
    if (n <= 8) console.log(`  round ${S.round} t=${S.time.toFixed(2)}: my ${G.WL[wi].id} shot blew up on a fallen rock at (${x.toFixed(1)},${y.toFixed(1)}) inside my own castle (x ${st.x0.toFixed(1)}..${st.x1.toFixed(1)}, top ${st.y1.toFixed(1)});  my bricks lost ${loss.toFixed(1)} hp this step`);
  }
};
while (S.state === 'play' && S.round < 45) { hp0 = ownHp(); simStep(1 / 60); }
console.log(`L${li + 1} ${bot} seed=${seed} diff=${diff} up=${upL}: result=${S.state} after ${S.round} rounds`);
console.log(`own shots that detonated on a fallen rock inside my own castle: ${n} (in ${rounds.size} different rounds); brick hp lost in those steps: ${lossTot.toFixed(0)}`);
