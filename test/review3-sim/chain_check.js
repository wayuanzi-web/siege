// node test/review3-sim/chain_check.js [每關場數=10] [bot=expert]：連鎖計數（S.chain）。每一輪齊射結束時的 S.chain，跟我自己數的
// 「這一輪裡，被打的那一邊有幾塊磚（不含碎塊、小擺設；同一塊樓板斷出來的幾截算同一塊）從在原位變成不在原位或被打掉」比：多算或少算各幾輪、最多差多少
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, LEVELS, BOTS } = G;
const N = +(process.argv[2] || 10), bot = process.argv[3] || 'expert';
G.__eval(`(function(){ const o = segSplit; segSplit = function(b, side, kind){ const id0 = S.bid, root = b.__root === undefined ? b.id : b.__root, was = b.inPlace; o(b, side, kind); for (let i = S.blocks.length - 1; i >= 0 && S.blocks[i].id >= id0; i--) { const c = S.blocks[i]; if (!c.frag) { c.__root = root; c.__bornVol = S.vol; c.__pw = was; } } if (globalThis.__split) globalThis.__split(b, root, was); }; })()`);
console.log(`src=${G.__dir} bot=${bot}`);
for (let li = 0; li < LEVELS.length; li++) {
  let vols = 0, over = 0, under = 0, maxOver = 0, maxUnder = 0, maxChain = 0, sum = 0; const ex = [];
  for (let sd = 0; sd < N; sd++) {
    const seed = 808000 + sd * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    let cur = null, lastChain = 0; const was = new Map();
    const snap = () => { was.clear(); for (const b of S.blocks) if (!b.dead && !b.frag && !b.prop) was.set(b, b.inPlace); };
    const close = () => { if (!cur) return; vols++; const mine = cur.roots.size, c = cur.chain; sum += c; if (c > maxChain) maxChain = c; if (c > mine) { over++; if (c - mine > maxOver) { maxOver = c - mine; if (ex.length < 3) ex.push(`L${li + 1} seed${seed} r${cur.r} side${cur.side} volley: S.chain=${c}, distinct blocks that left their place=${mine}`); } } else if (c < mine) { under++; if (mine - c > maxUnder) maxUnder = mine - c; } };
    globalThis.__split = (b, root, w) => { if (cur && w && b.side !== cur.side && b.side !== undefined) cur.roots.add(root); };
    S.on = (t, a) => { if (t === 'volley') { close(); cur = { side: a, r: S.round, roots: new Set(), chain: 0 }; snap(); } };
    while (S.state === 'play' && S.round < 40) {
      const ph = S.phase, tn = S.turn;
      simStep(1 / 60);
      if (cur && (ph === 'volley' || ph === 'resolve') && tn === cur.side) {
        if (S.turn === cur.side && (S.phase === 'volley' || S.phase === 'resolve')) cur.chain = S.chain;
        for (const b of S.blocks) { if (b.frag || b.prop || b.side === cur.side) continue; const w = was.get(b); if (w === true && (b.dead || !b.inPlace)) { cur.roots.add(b.__root === undefined ? b.id : (b.__bornVol === S.vol ? b.__root : b.id)); was.set(b, false); } else if (w === undefined && !b.dead) was.set(b, b.inPlace); else if (!b.dead && b.inPlace && w === false) was.set(b, true); }
      }
    }
    close();
  }
  console.log(`L${li + 1}: ${vols} volleys; mean chain ${(sum / vols).toFixed(1)}, largest ${maxChain}; S.chain higher than my count in ${over} volleys (by at most ${maxOver}), lower in ${under} (by at most ${maxUnder})`);
  for (const e of ex) console.log('     ' + e);
}
