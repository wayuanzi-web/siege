// node test/tiptoe.js [每關場數=6] [bot=casual]：每次輪到人瞄準的時候，有幾個兵的身體中心底下是空的（只靠腳尖勾著邊站著，看起來懸空）
// 「跨在窄縫上、兩邊都有地」的另外算（那是站得住的）。SIEGE_SRC=<目錄> 可換成別版來比
const G = require('./load')('PH');
const { S, PH, simInit, simStep, BOTS } = G;
const N = +(process.argv[2] || 6), bot = process.argv[3] || 'casual';
let checks = 0, toe = 0, gap = 0; const per = [], ex = [];
const under = (u, dx) => { let h = false; PH.world.rayCast({ x: u.x + dx, y: u.y + 0.6 }, { x: u.x + dx, y: u.y - 0.9 }, (f, pt, n, fr) => { const o = f.getUserData(); if (o && o.isUnit) return -1; h = true; return fr; }); return h; };
for (let li = 0; li < LEVELS.length; li++) {
  let t = 0, c = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 51000 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] });
    let last = '';
    while (S.state === 'play' && S.round < 30) {
      simStep(1 / 60);
      const key = S.phase + S.turn + ':' + S.round;
      if (key !== last && S.phase === 'aim') {
        for (const u of S.units) {
          if (!u.alive || !u.body || u.air || u.def.big) continue; c++;
          if (under(u, 0)) continue;
          const hw = u.bw * 0.5, side = (d) => under(u, d * hw * 0.3) || under(u, d * hw * 0.58);          // 鞋底寬 ±0.6 個半身寬
          const L = side(-1), R = side(1);
          if (L && R) gap++; else { t++; if (ex.length < 8) ex.push(`L${li + 1} seed${sd} r${S.round} ${u.type} side${u.side} x=${u.x.toFixed(2)} y=${u.y.toFixed(2)} awake=${u.body.isAwake()} edge=${u.edge} edgeT=${u.edgeT.toFixed(2)}`); }
        }
      }
      last = key;
    }
  }
  per.push(`L${li + 1} ${t}/${c}`); toe += t; checks += c;
}
console.log(`${process.env.SIEGE_SRC ? process.env.SIEGE_SRC : '目前版本'}：瞄準時身體中心底下是空的、只靠一邊腳尖站著 ${toe}/${checks} 次（跨在窄縫上 ${gap} 次）  ${per.join('  ')}`);
for (const e of ex) console.log('   ' + e);
