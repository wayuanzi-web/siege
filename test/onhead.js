// node test/onhead.js [每關場數=6] [bot=casual]：每次輪到人瞄準的時候，有幾個兵頭上還靠著磚（樓板、磚塊、碎塊）——看起來像用頭頂著
// 環境變數 SIEGE_SRC=<目錄> 可換成別版的 src/parts 來比
const fs = require('fs'), path = require('path');
const planck = require('../src/vendor/planck.min.js');
const dir = process.env.SIEGE_SRC || path.join(__dirname, '..', 'src', 'parts');
const src = fs.readdirSync(dir).filter((f) => /^(10|40|45|48|49|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const G = new Function('planck', src + '\nreturn { S, PH, simInit, simStep, BOTS, LEVELS };')(planck);
const { S, PH, simInit, simStep, BOTS } = G;
const N = +(process.argv[2] || 6), bot = process.argv[3] || 'casual';
let checks = 0, heads = 0, heavy = 0; const per = [];
for (let li = 0; li < LEVELS.length; li++) {
  let h = 0, c = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 31000 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] });
    let last = '';
    while (S.state === 'play' && S.round < 30) {
      simStep(1 / 60);
      const key = S.phase + S.turn + ':' + S.round;
      if (key !== last && S.phase === 'aim') {
        for (const u of S.units) {
          if (!u.alive || !u.body) continue; c++;
          const p = u.body.getPosition(); let on = 0;
          for (let ce = u.body.getContactList(); ce; ce = ce.next) {
            const ct = ce.contact; if (!ct.isTouching()) continue;
            const o = ce.other.getUserData(); if (!o || !o.isBlock) continue;
            const wm = ct.getWorldManifold(null); if (!wm || !wm.pointCount) continue;
            const pt = wm.points[0]; if (pt.y > p.y + u.bh * 0.25) on++;          // 碰在肩膀以上
          }
          if (on) { h++; }
        }
      }
      last = key;
    }
  }
  per.push(`L${li + 1} ${h}/${c}`); heads += h; checks += c;
}
console.log(`${dir.includes('parts') && !process.env.SIEGE_SRC ? '目前版本' : dir}：輪到人瞄準時，頭上（肩膀以上）還靠著磚的兵 ${heads}/${checks} 次（${(100 * heads / checks).toFixed(1)}%）  ${per.join('  ')}`);
