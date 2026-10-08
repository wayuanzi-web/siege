// node test/review7/trace_stress.js <關卡> "<武器>@x,y" [秒數] [x0,x1,y0,y1 只看這個範圍內的磚]
// 引爆之後，每 0.25 秒印出範圍內每一塊有超載上限的磚：現在撐的力 / 上限（打折後）、血量、有沒有離位
const G = require('../load')('PH, blockDist');
const { S, simInit, simStep, WPN, physExplode, LEVELS, MAT } = G;
const li = +process.argv[2] - 1, cmd = process.argv[3], T = +(process.argv[4] || 5);
const box = (process.argv[5] || '-999,999,-999,999').split(',').map(Number);
simInit(li, {}, 1, 1, {}); S.team[0].ai = null; S.team[1].ai = null;
S.phase = 'resolve'; S.turn = 0; S.round = 1;
const evs = []; S.on = (t, a, b, c, d) => { if (t === 'creak' || t === 'cell' || t === 'snap') evs.push(`${S.time.toFixed(2)} ${t} ${a.toFixed(1)},${b.toFixed(1)}${t === 'creak' ? ' r=' + d.toFixed(2) : ''}`); };
const m = cmd.match(/^(\w+)@([-\d.]+),([-\d.]+)$/);
const x = +m[2], y = +m[3];
let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = G.blockDist(b, x, y); if (d < best) { best = d; hit = b; } }
const watch = S.blocks.filter((b) => b.cap && b.x0 >= box[0] && b.x0 <= box[1] && b.y0 >= box[2] && b.y0 <= box[3]);
physExplode(x, y, WPN[m[1]], 0, 1, 0, hit, 1, 0);
for (let i = 0; i < T * 60; i++) {
  S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60);
  if (i % 15 === 14) console.log(`t=${((i + 1) / 60).toFixed(2)} ` + watch.map((b) => { if (b.dead) return `(${b.x0.toFixed(1)},${b.y0.toFixed(1)})✗`; const cap = b.cap * (0.35 + 0.65 * Math.max(0, b.seg ? (b.low === undefined ? 1 : b.low) : b.hp / b.hm)); const p = b.body.getPosition(); return `(${b.x0.toFixed(1)},${b.y0.toFixed(1)}) ${(b.sL / cap).toFixed(2)} hp${(100 * b.hp / b.hm).toFixed(0)}%${b.inPlace ? '' : ' 離位'} a${(b.body.getAngle() * 57.3).toFixed(1)} dx${(p.x - b.x0).toFixed(2)}`; }).join(' | '));
}
for (const e of evs.slice(0, 40)) console.log('  ' + e);
