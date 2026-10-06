// 很長的對局（雙方都不開火，150 回合）：倍增符的 bit 用過三十個以上之後重複利用有沒有撞號、落石／天燈／碎塊會不會越積越多、
// 回合時間有沒有越拖越長。
const G = require('./h')();
const { S, SH, PH, simInit, simStep, LEVELS } = G;
for (const li of [1, 3, 4, 5]) {
  simInit(li, {}, 5150 + li, 1, { mute: 1 }); S.team[0].mute = true; S.team[0].ai = null;
  let spawns = 0, bad = 0, maxBodies = 0, maxObjs = 0, maxRocks = 0, t150 = 0; const bitsSeen = new Set();
  S.on = (t) => { if (t === 'gspawn') spawns++; };
  for (let i = 0; i < 60 * 3000 && S.round < 150 && S.state === 'play'; i++) {
    if (S.phase === 'aim' && S.turn === 0) G.simFire(0);
    simStep(1 / 60);
    if ((i & 15) === 0) {
      let bits = 0; for (const g of S.gates) { if (bits & g.bit) bad++; bits |= g.bit; bitsSeen.add(g.b); if (S.bitUse[g.b] !== 1e17) bad++; }
      let n = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) n++; if (n > maxBodies) maxBodies = n;
      if (S.objs.length > maxObjs) maxObjs = S.objs.length;
      let r = 0; for (const b of S.rubble.blocks) if (!b.dead) r++; if (r > maxRocks) maxRocks = r;
      if (S.blocks.length > 600) bad++;
    }
  }
  console.log(`L${li + 1}: state=${S.state} round=${S.round} t=${S.time.toFixed(0)}s (${(S.time / Math.max(1, S.round)).toFixed(1)}s/round); gate spawns ${spawns}, distinct bits used ${bitsSeen.size}/30, bit problems ${bad}; max bodies ${maxBodies}, max objs ${maxObjs}, max live rocks ${maxRocks}, S.blocks.length ${S.blocks.length}, alive ${S.team[0].alive}/${S.team[1].alive}, rage ${S.rage}`);
}
