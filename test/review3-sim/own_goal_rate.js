// node test/review3-sim/own_goal_rate.js <每關場數=30> [bot=casual]
// 敵軍的砲彈打在敵軍自己的城上：自己的砲彈要「出了自己的城」才會撞到東西（往上飛超過城頂 + 4 也算出城），
// 吊得很高、水平速度很小的時候，後排的兵打出去的砲彈會掉回自己城的前半邊。統計每一關有幾輪敵軍齊射發生這種事、打掉自己幾塊磚、有沒有打死自己人
// SIEGE_SRC 可以換成舊版原始碼比較
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, LEVELS, BOTS, WL } = G;
const N = +(process.argv[2] || 30), bot = process.argv[3] || 'casual';
globalThis.__pe = null;
G.__eval(`(function(){ const p = physExplode; physExplode = function(x, y, w, side, mass, flag, hit, vx, vy){ if (globalThis.__pe) globalThis.__pe(x, y, w, side, mass, flag, hit, vx, vy); return p(x, y, w, side, mass, flag, hit, vx, vy); }; })()`);
console.log(`src=${G.__dir} bot=${bot}`);
for (let li = 0; li < LEVELS.length; li++) {
  const cnt = [{ vol: 0, volOwn: 0, hits: 0, cells: 0 }, { vol: 0, volOwn: 0, hits: 0, cells: 0 }], ex = []; let steep = 0;
  for (let sd = 0; sd < N; sd++) {
    const seed = 505000 + sd * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    let cur = null, inShot = -1;
    globalThis.__pe = (x, y, w, side, mass, flag, hit, vx, vy) => { inShot = -1; if (side > 1 || !cur || !w.n) return; if (hit && hit.isBlock && hit.side === side && !hit.frag && cur.side === side) { cur.own++; inShot = side; if (ex.length < 6 && side === 1) ex.push(`L${li + 1} seed${seed} r${S.round}: enemy ${w.id} came down on its own castle at (${x.toFixed(1)},${y.toFixed(1)}), aim was (${S.team[1].aim[0].toFixed(1)},${S.team[1].aim[1].toFixed(1)})`); } };
    S.on = (t, a, b, c, d, e, f) => { if (t === 'volley') { if (cur) { const k = cnt[cur.side]; k.vol++; if (cur.own) { k.volOwn++; k.hits += cur.own; } } cur = { side: a, own: 0 }; } if (t === 'cell' && cur && inShot === d && d === cur.side) cnt[d].cells++; };
    while (S.state === 'play' && S.round < 40) { simStep(1 / 60); inShot = -1; }
  }
  console.log(`L${li + 1}: enemy volleys ${cnt[1].vol}, with at least one own shell landing on its own castle: ${cnt[1].volOwn} (${(100 * cnt[1].volOwn / Math.max(1, cnt[1].vol)).toFixed(1)}%), ${cnt[1].hits} shells in all;   my (bot) volleys ${cnt[0].vol}, own-castle hits in ${cnt[0].volOwn} (${(100 * cnt[0].volOwn / Math.max(1, cnt[0].vol)).toFixed(1)}%), ${cnt[0].hits} shells`);
  for (const e of ex) console.log('     ' + e);
}
