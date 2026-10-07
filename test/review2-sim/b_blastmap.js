// node test/review2-sim/b_blastmap.js <關卡,…> [武器=bomb] [挨打的那一邊=0] [步距=0.85] [-v]
// B：「一發砲彈」打在全新的城樓上，守軍會倒幾個？
// 跟 test/sap.js 一樣的想法，但取樣密得多（sap.js 每一層只在正中間的高度打一發，第三、四關正好打在城垛上，漏掉了牆）：
//   從正面水平飛來（每 0.85 高一發）、從正上方落下（每 0.85 寬一發）、45° 斜著落下，各自找到第一個碰到的磚或兵，在那裡引爆（用這一關敵軍的傷害倍率）。
//   之後等塵埃落定、做埋壓判定（跟真的回合結束一樣），數倒了幾個兵。全程只有這「一發」。
const { load } = require('./lib');
const G = load({ extra: ['WPN'] });
const { S, simInit, simStep, LEVELS, MAT, physExplode, rayShot, RAY, CS, WPN, CASTLES } = G;
const a = process.argv.slice(2).filter((x) => x[0] !== '-'), verbose = process.argv.includes('-v');
const lvs = (a[0] || '3').split(',').map((x) => +x - 1), wid = a[1] || 'bomb', side = +(a[2] || 0), stepD = +(a[3] || 0.85), att = 1 - side;
function fresh(li) { simInit(li, {}, 4242, 1, {}); S.team[0].ai = null; S.team[1].ai = null; S.phase = 'resolve'; S.turn = att; S.phaseT = 0; S.quietT = 0; S.round = 1; S.on = null; S.onPin = null; S.onHurt = null; S.onKill = null; }
function settle() { let n = 0; while (S.state === 'play' && S.phase === 'resolve' && n++ < 900) simStep(1 / 60); }
for (const li of lvs) {
  fresh(li);
  const st = S.st[side], dir = side === 0 ? -1 : 1;         // 攻方的砲彈往 dir 的方向飛（打我方的城：往左）
  const name = side ? LEVELS[li].foe.castle : LEVELS[li].me.castle;
  // 取樣點
  const pts = [];
  const far = side === 0 ? st.x1 + 14 : st.x0 - 14;
  for (let y = st.y0 + 0.4; y < st.y1 + 1; y += stepD) pts.push({ x0: far, y0: y, vx: dir, vy: 0, tag: 'flat' });
  for (let x = st.x0 + 0.4; x < st.x1; x += stepD) pts.push({ x0: x, y0: st.y1 + 12, vx: 0, vy: -1, tag: 'top' });
  for (let k = -st.h; k < st.w + 4; k += stepD * 1.4) { const x = (side === 0 ? st.x0 + k + st.h + 12 : st.x1 - k - st.h - 12); pts.push({ x0: x, y0: st.y1 + 12, vx: dir * 0.707, vy: -0.707, tag: 'diag' }); }
  const res = []; const cellHit = new Map();
  for (const p of pts) {
    fresh(li);
    const s2 = S.st[side], T = S.team[side];
    const h = rayShot(p.x0, p.y0, p.x0 + p.vx * 80, p.y0 + p.vy * 80, att, false);
    if (!h || !RAY.o || (RAY.o.isBlock ? RAY.o.st !== s2 : RAY.o.side !== side)) continue;
    const o = RAY.o, hx = RAY.x, hy = RAY.y;
    const what = o.isBlock ? `${MAT[o.mat].k}${o.prop ? ' prop' : ''}(${o.cx},${o.cy}${o.cw > 1 || o.ch > 1 ? ' ' + o.cw + 'x' + o.ch : ''})${o.base ? ' base' : ''}` : `unit ${o.type}#${o.slot}`;
    const hp0 = T.units.reduce((s, u) => s + u.hp, 0); const killed = []; const destroyed = []; const pins = [];
    S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && c === side) killed.push(d + '#' + f + ':' + ['hit', 'crush', '?', 'burn', 'fell', 'out'][e]); };
    S.onKill = (b, by, kind) => { if (b.st === s2 && !b.frag && !b.prop) destroyed.push(`${MAT[b.mat].k}(${b.cx},${b.cy})${kind === 6 ? '/crush' : ''}`); };
    S.onPin = (u, load, moved) => pins.push(`${u.type}#${u.slot} load ${load.toFixed(0)}${moved ? '' : ' at its post'}`);
    physExplode(hx, hy, WPN[wid], att, 1, 0, o, p.vx * 40, p.vy * 40);
    settle();
    const lost = hp0 - T.units.reduce((s, u) => s + Math.max(0, u.hp), 0);
    res.push({ p, what, killed, destroyed, pins, lost, hx: hx - s2.x0, hy, key: what });
    S.on = null; S.onKill = null; S.onPin = null;
  }
  const lethal = res.filter((r) => r.killed.length), two = res.filter((r) => r.killed.length >= 2);
  console.log(`\nL${li + 1} ${name} (side ${side}) — ONE ${wid} (attacker damage ×${S.team[att].dmg.toFixed(2)}) on a fresh castle; ${res.length} impact points (flat ${res.filter((r) => r.p.tag === 'flat').length}, from above ${res.filter((r) => r.p.tag === 'top').length}, 45° ${res.filter((r) => r.p.tag === 'diag').length})`);
  console.log(`   kills ≥1 unit: ${lethal.length} points (${Math.round(100 * lethal.length / res.length)}%);  kills ≥2: ${two.length};  average hp lost per shot ${(res.reduce((s, r) => s + r.lost, 0) / res.length).toFixed(0)}`);
  // 依「打中哪一塊」彙整
  const by = new Map(); for (const r of res) { const g = by.get(r.key) || { n: 0, k1: 0, k2: 0, lost: 0, ex: null }; g.n++; if (r.killed.length) { g.k1++; if (!g.ex || r.killed.length > g.ex.killed.length) g.ex = r; } if (r.killed.length >= 2) g.k2++; g.lost += r.lost; by.set(r.key, g); }
  const rows = [...by.entries()].filter(([k, g]) => g.k1 || verbose).sort((p, q) => q[1].k1 / q[1].n - p[1].k1 / p[1].n);
  for (const [k, g] of rows) console.log(`   hit on ${k.padEnd(22)} ${g.k1}/${g.n} lethal${g.k2 ? ' (' + g.k2 + ' kill two)' : ''}, avg hp lost ${(g.lost / g.n).toFixed(0)}${g.ex ? `   e.g. ${g.ex.p.tag} shot at (${g.ex.hx.toFixed(1)},${g.ex.hy.toFixed(1)}) → dead: ${g.ex.killed.join(', ')}; blocks destroyed: ${g.ex.destroyed.join(' ')}${g.ex.pins.length ? '; burial: ' + g.ex.pins.join(', ') : ''}` : ''}`);
  // 畫出來：每一格印這一格那塊磚被打中時「最多倒幾個」
  const grid = []; for (let cy = 0; cy < st.rows; cy++) grid.push(new Array(st.cols).fill(' '));
  for (const r of res) { const m = r.what.match(/\((\d+),(\d+)(?: (\d+)x(\d+))?\)/); if (!m || r.what.startsWith('unit')) continue; const cx = +m[1], cy = +m[2], cw = +(m[3] || 1), ch = +(m[4] || 1); for (let i = 0; i < cw; i++) for (let j = 0; j < ch; j++) { const cur = grid[cy + j][cx + i], v = r.killed.length ? String(r.killed.length) : r.lost >= 30 ? '+' : '·'; if (cur === ' ' || cur === '·' || (cur === '+' && v !== '·') || (v > cur && v !== '+' && v !== '·')) grid[cy + j][cx + i] = v; } }
  const map = CASTLES[name].map;
  for (let cy = st.rows - 1; cy >= 0; cy--) { let row = map[st.rows - 1 - cy]; row += ' '.repeat(st.cols - row.length); if (side) row = row.split('').reverse().join(''); console.log(`      cy=${String(cy).padStart(2)}  ${row}    ${grid[cy].join('')}`); }
  console.log('      (digit = most units killed by one shot landing on that block; + = ≥30 hp lost, nobody dead; · = little effect; blank = never the first thing hit)');
}
