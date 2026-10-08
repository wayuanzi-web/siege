// node test/review7/pk.js <關卡 1-12> "<cmd> ; <cmd> ..." [秒數=8] [seed=1]
// 跟 test/poke.js 一樣（我方在指定點引爆、規則照「砲擊進行中」跑），多了：
//   cut@<tag 或 #index>[,t]     直接剪斷一條繩子（記成我方打斷的）
//   kill@x,y[,t]                直接把那一點上的磚整塊打掉（blockKill，記成我方）
//   hurt@x,y,dmg[,t]            對那一點上的磚造成 dmg 點壓碎傷害（我方）
//   <武器>@x,y[,t]              在那一點引爆（打中那一點上的磚）
// 環境變數：TURN=1 把回合當成敵軍的（看敵軍自己打自己）、EV=all 印所有事件、TRACK=1 每 0.5 秒印兵和天秤
const G = require('../load')('PH, ropeEnds, blockDist, blockKill, blockHurt, ropeCut, K_CRUSH');
const { S, simInit, simStep, WPN, physExplode, LEVELS, MAT } = G;
const li = +process.argv[2] - 1, script = (process.argv[3] || '').split(';').map((x) => x.trim()).filter(Boolean), T = +(process.argv[4] || 8), seed = +(process.argv[5] || 1);
const turn = +(process.env.TURN || 0), side = turn;
simInit(li, {}, seed, 1, {});
S.team[0].ai = null; S.team[1].ai = null;
const ALL0 = S.blocks.slice();
const EVK = process.env.EV === 'all' ? null : new Set(['udie', 'snap', 'reso', 'creak', 'tilt', 'bonk', 'revive', 'ignite']);
const evs = [], cnt = {};
const f1 = (v) => typeof v === 'number' ? v.toFixed(1) : String(v);
S.on = (t, a, b, c, d, e, f) => { cnt[t] = (cnt[t] || 0) + 1; if (EVK && !EVK.has(t)) return; if (t === 'creak' && cnt[t] > 12) return; evs.push(`${S.time.toFixed(2)}s ${t} ${f1(a)},${f1(b)} ${c === undefined ? '' : f1(c)} ${d === undefined ? '' : f1(d)} ${e === undefined ? '' : f1(e)} ${f === undefined || typeof f === 'object' ? '' : f1(f)}`); };
const blockAt = (x, y) => { let hit = null, best = 0.6; for (const b of S.blocks) { if (b.dead) continue; const d = G.blockDist(b, x, y); if (d < best) { best = d; hit = b; } } return hit; };
const acts = script.map((s) => {
  let m = s.match(/^cut@([#\w]+)(?:,([\d.]+))?$/); if (m) return { k: 'cut', tag: m[1], t: +(m[2] || 0) };
  m = s.match(/^kill@([-\d.]+),([-\d.]+)(?:,([\d.]+))?$/); if (m) return { k: 'kill', x: +m[1], y: +m[2], t: +(m[3] || 0) };
  m = s.match(/^hurt@([-\d.]+),([-\d.]+),([\d.]+)(?:,([\d.]+))?$/); if (m) return { k: 'hurt', x: +m[1], y: +m[2], d: +m[3], t: +(m[4] || 0) };
  m = s.match(/^(\w+)@([-\d.]+),([-\d.]+)(?:,([\d.]+))?$/); return { k: 'boom', w: WPN[m[1]], x: +m[2], y: +m[3], t: +(m[4] || 0) };
});
S.phase = 'resolve'; S.turn = turn; S.round = 1;
const steps = Math.round(T * 60); let t = 0; const track = process.env.TRACK;
for (let i = 0; i < steps && S.state === 'play'; i++) {
  for (const a of acts) if (!a.done && t >= a.t) {
    a.done = true;
    if (a.k === 'cut') { const r = a.tag[0] === '#' ? S.ropes[+a.tag.slice(1)] : S.ropes.find((q) => !q.cut && q.tag === a.tag); if (r) G.ropeCut(r, side, G.K_CRUSH, false); else console.log('no rope ' + a.tag); }
    else if (a.k === 'kill') { const b = blockAt(a.x, a.y); if (b) G.blockKill(b, side, G.K_CRUSH); else console.log('no block at', a.x, a.y); }
    else if (a.k === 'hurt') { const b = blockAt(a.x, a.y); if (b) G.blockHurt(b, a.d, G.K_CRUSH, side, a.x, a.y); else console.log('no block at', a.x, a.y); }
    else physExplode(a.x, a.y, a.w, side, 1, 0, blockAt(a.x, a.y), 1, 0);
  }
  S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0;
  simStep(1 / 60); t += 1 / 60;
  if (track && i % 30 === 29) console.log(`  t=${t.toFixed(1)} ` + S.units.filter((u) => u.side === 1).map((u) => `#${u.slot}${u.alive ? `(${u.x.toFixed(1)},${u.y.toFixed(1)})${u.wet ? 'w' + u.wet.toFixed(2) : ''}${u.hp < u.hpMax ? ' hp' + u.hp.toFixed(0) : ''}` : '✗'}`).join(' ') + (S.pivots.length ? ` 天秤 ${(S.pivots[0].ang * 57.3).toFixed(1)}°` : '') + (S.pins.length ? ' 插銷 ' + S.pins.map((o) => o.broke ? '斷' : o.b && o.b.body ? ((o.b.body.getAngle() - o.a0) * o.droop * 57.3).toFixed(1) + '°' : '?').join('/') : ''));
}
const lv = LEVELS[li];
console.log(`L${li + 1} ${lv.name} 跑了 ${t.toFixed(1)} 秒，state ${S.state}`);
for (const u of S.units) console.log(`  ${u.side ? '敵' : '我'} #${u.slot} ${u.type.padEnd(6)} ${u.alive ? `活著 hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)} @(${u.x.toFixed(1)},${u.y.toFixed(1)}) 原位(${u.hx.toFixed(1)},${u.hy.toFixed(1)})${u.wet ? ' 泡水' + u.wet.toFixed(2) : ''}` : '倒了'}`);
let moved = 0, gone = 0; for (const b of ALL0) { if (b.frag || b.st === S.rubble) continue; if (b.dead) gone++; else if (!b.inPlace) moved++; }
console.log(`  磚：碎掉 ${gone}、離開原位 ${moved}；繩索 ${S.ropes.map((r) => (r.tag || r.kind) + (r.cut ? '斷' : '')).join(',')}；天秤 ${S.pivots.map((p) => (p.ang * 57.3).toFixed(1) + '°').join(' ') || '—'}；插銷 ${S.pins.map((o) => o.broke ? '斷' : '在').join(',') || '—'}`);
console.log('  counts: ' + Object.keys(cnt).map((k) => k + '×' + cnt[k]).join(' '));
for (const e of evs) console.log('  ' + e);
