// node test/review3-sim/bar_cause.js <每關場數=12> [bot=casual]
// 城樓完整度（structBar）往上跳的原因分兩種：(a) 一塊原本被震歪、不算在原位的磚又晃回容許範圍裡；
// (b) 一塊已經歪掉（不算在原位）的樓板被打斷，斷出來的其中一截剛好落在容許範圍裡、重新算進城防 —— 這一種是「打它反而讓城防變高」。
// 統計兩種各發生幾次、各讓 structBar 高了多少（一場裡累計）
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, LEVELS, BOTS, structBar } = G;
const N = +(process.argv[2] || 12), bot = process.argv[3] || 'casual';
G.__eval(`(function(){ const o = segSplit; segSplit = function(b, side, kind){ const was = b.inPlace, id0 = S.bid; o(b, side, kind); for (let i = S.blocks.length - 1; i >= 0 && S.blocks[i].id >= id0; i--) { const c = S.blocks[i]; if (!c.frag) { c.__pw = was; c.__born = S.frame; } } }; })()`);
console.log(`src=${G.__dir} bot=${bot}`);
for (let li = 0; li < LEVELS.length; li++) {
  let flapN = 0, flapSum = 0, flapMax = 0, splitN = 0, splitSum = 0, splitMax = 0, games = 0; const ex = [];
  for (let sd = 0; sd < N; sd++) {
    const seed = 31000 + sd * 7919 + li * 131; games++;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    const was = new Map(); for (const b of S.blocks) was.set(b, b.inPlace);
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      if ((S.frame & 3) !== 0) continue;
      for (const st of [S.st[0], S.st[1]]) for (const b of st.blocks) {
        if (b.dead || b.frag || b.prop || !b.wt) continue;
        const w = was.get(b), gain = b.hp * b.wt / st.hp0 / 0.85;
        if (b.inPlace && w === false) { flapN++; flapSum += gain; if (gain > flapMax) flapMax = gain; }
        else if (b.inPlace && w === undefined && b.__pw === false) { splitN++; splitSum += gain; if (gain > splitMax) splitMax = gain; if (ex.length < 4) ex.push(`L${li + 1} seed${seed} r${S.round} ${S.phase}/turn${S.turn}: side${b.side} slab piece cells ${b.cx}..${b.cx + b.cw - 1} row ${b.cy} counted as in place ${(S.frame - b.__born)} frames after its out-of-place parent was broken: structBar +${(100 * gain).toFixed(1)} points`); }
        was.set(b, b.inPlace);
      }
    }
  }
  console.log(`L${li + 1} (${games} games): block wobbled back into place ${flapN} times (structBar +${(100 * flapSum / games).toFixed(1)} points per game in total, biggest single +${(100 * flapMax).toFixed(1)});  piece of a broken out-of-place slab counted as in place ${splitN} times (+${(100 * splitSum / games).toFixed(1)} per game, biggest +${(100 * splitMax).toFixed(1)})`);
  for (const e of ex) console.log('     ' + e);
}
