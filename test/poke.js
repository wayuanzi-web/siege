// node test/poke.js <關卡 1-12> "<武器>@x,y[,s] ; <武器>@x,y ..." [秒數=8] [seed=1]
// 在指定的位置引爆（s：第幾秒；沒寫就是 0），跑幾秒，印出兵的死活、繩子斷了幾條、哪些磚離開原位。看機關有沒有照設計垮
// 例：node test/poke.js 6 "bomb@68,0 ; rocket@70,3,1.5" 8
const G = require('./load')('PH, ropeEnds, blockDist');
const { S, simInit, simStep, WPN, physExplode, LEVELS } = G;
const li = +process.argv[2] - 1, script = (process.argv[3] || '').split(';').map((x) => x.trim()).filter(Boolean), T = +(process.argv[4] || 8), seed = +(process.argv[5] || 1);
simInit(li, {}, seed, 1, {});
S.team[0].ai = null; S.team[1].ai = null;
const ev = []; S.on = (t, a, b, c, d, e) => { if (t === 'udie' || t === 'snap' || t === 'reso' || t === 'splash' && d === 1) ev.push(`${S.time.toFixed(2)}s ${t} ${typeof a === 'number' ? a.toFixed(1) : a},${typeof b === 'number' ? b.toFixed(1) : b} ${c} ${d === undefined ? '' : d} ${e === undefined ? '' : e}`); };
// 前面加「1:」表示是敵軍打的（例 1:bomb@40,10）：測我方城的機關
const acts = script.map((s) => { const m = s.match(/^(?:(\d):)?(\w+)@([-\d.]+),([-\d.]+)(?:,([\d.]+))?$/); return { side: +(m[1] || 0), w: WPN[m[2]], x: +m[3], y: +m[4], t: +(m[5] || 0), done: false }; });
// 開打：直接跳到我方砲擊的階段（規則照「砲擊進行中」跑）
S.phase = 'resolve'; S.turn = acts.length && acts[0].side ? 1 : 0; S.round = 2;
const steps = Math.round(T * 60); let t = 0;
for (let i = 0; i < steps && S.state === 'play'; i++) {
  for (const a of acts) if (!a.done && t >= a.t) {
    a.done = true;
    // 打在哪一塊上（像真的砲彈直接命中）：那個點落在哪一塊磚、哪個兵身上
    let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = G.blockDist(b, a.x, a.y); if (d < best) { best = d; hit = b; } }
    physExplode(a.x, a.y, a.w, a.side, 1, a.w.kind === 3 ? 4 : 0, hit, a.side ? -1 : 1, 0);
  }
  S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0;
  simStep(1 / 60); t += 1 / 60;
  if (process.env.TRACE && (i % 30) === 0) console.log(t.toFixed(2), process.env.TRACE.split(',').map((k) => k + '=' + JSON.stringify(eval(k))).join(' '));
}
const lv = LEVELS[li];
console.log(`L${li + 1} ${lv.name} 跑了 ${t.toFixed(1)} 秒，state ${S.state}`);
for (const u of S.units) console.log(`  ${u.side ? '敵' : '我'} #${u.slot} ${u.type.padEnd(6)} ${u.alive ? `活著 hp ${u.hp.toFixed(0)} @(${u.x.toFixed(1)},${u.y.toFixed(1)}) 原位(${u.hx.toFixed(1)},${u.hy.toFixed(1)})${u.wet ? ' 泡水' : ''}` : '倒了'}`);
let moved = 0, gone = 0; for (const b of S.blocks) { if (b.frag || b.st === S.rubble) continue; if (b.dead) gone++; else if (!b.inPlace) moved++; }
console.log(`  磚：碎掉 ${gone}、離開原位 ${moved}；繩索 ${S.ropes.filter((r) => r.cut).length}/${S.ropes.length} 斷；天秤角度 ${S.pivots.map((p) => (p.ang * 57.3).toFixed(1) + '°').join(' ') || '—'}`);
for (const e of ev) console.log('  ' + e);
