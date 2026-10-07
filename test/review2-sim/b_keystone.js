// node test/review2-sim/b_keystone.js [關卡=1,3,5] [side=0]
// B：我方城樓「拿掉一塊磚」會怎樣？對每一塊（城基以上、不是小擺設的）磚各做一次：
//   全新開局 → 當成敵軍剛打完（S.turn = 1、resolve 階段）→ 只把這一塊磚拿掉（不爆炸、不推任何東西）→ 等塵埃落定（含埋壓判定）→ 數倒了幾個兵、掉多少血。
// 這是在驗證藍圖註解說的「每一層樓板都有兩邊的牆加中間一根石柱撐著，所以打掉一面牆只會垮一角，不會整座連人一起倒」。
const { load } = require('./lib');
const G = load();
const { S, simInit, simStep, LEVELS, MAT, blockKill, K_HEAVY, CASTLES } = G;
const lvs = (process.argv[2] || '1,3,5').split(',').map((x) => +x - 1), side = +(process.argv[3] || 0);
function fresh(li) { simInit(li, {}, 4242, 1, {}); S.phase = 'resolve'; S.turn = 1 - side; S.phaseT = 0; S.quietT = 0; S.round = 1; S.on = null; }
function settle() { let n = 0; while (S.state === 'play' && S.phase === 'resolve' && n++ < 900) simStep(1 / 60); return n; }
for (const li of lvs) {
  fresh(li);
  const st0 = S.st[side], name = side ? LEVELS[li].foe.castle : LEVELS[li].me.castle;
  const ids = st0.blocks.filter((b) => !b.prop && (b.cy >= st0.base || b.mat === 1)).map((b) => ({ cx: b.cx, cy: b.cy, cw: b.cw, ch: b.ch, mat: b.mat, hm: b.hm }));
  console.log(`\nL${li + 1} ${name} (side ${side}): remove ONE block (no blast), let it settle, apply the end-of-volley burial check.  units: ${S.team[side].units.map((u) => u.type + '#' + u.slot + '@(' + st0.slots.find((s) => s.slot === u.slot).cx + ',' + st0.slots.find((s) => s.slot === u.slot).cy + ') hp' + u.hpMax.toFixed(0)).join(' ')}`);
  const res = [];
  for (const id of ids) {
    fresh(li);
    const st = S.st[side], b = st.blocks.find((k) => !k.prop && k.cx === id.cx && k.cy === id.cy), T = S.team[side];
    const hp0 = T.units.reduce((s, u) => s + u.hp, 0); const pins = []; const dmg = new Map();
    S.onPin = (u, load, moved) => pins.push(`${u.type}#${u.slot} load ${load.toFixed(0)}${moved ? '' : ' (not displaced)'}`);
    S.onHurt = (u, d, by, kind) => { if (u.side === side) dmg.set(u, (dmg.get(u) || 0) + d); };
    const how = []; S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && c === side) how.push(d + '#' + f + ':' + ['hit', 'crush', '?', 'burn', 'fell', 'out'][e]); };
    blockKill(b, 1 - side, K_HEAVY, true);
    const n = settle();
    const dead = T.units.filter((u) => !u.alive).length, lost = hp0 - T.units.reduce((s, u) => s + Math.max(0, u.hp), 0);
    res.push({ id, dead, lost, how, pins, n, moved: T.units.filter((u) => u.alive && (Math.abs(u.x - u.hx) > 2.7 || Math.abs(u.y - u.hy) > 2)).length });
    S.onPin = null; S.onHurt = null; S.on = null;
  }
  // 地圖：每一格印「拿掉這一格所在的那塊磚會倒幾個兵」
  const st = S.st[side], rows = st.rows, cols = st.cols, map = CASTLES[name].map;
  const grid = []; for (let cy = 0; cy < rows; cy++) grid.push(new Array(cols).fill(' '));
  for (const r of res) for (let a = 0; a < r.id.cw; a++) for (let c = 0; c < r.id.ch; c++) grid[r.id.cy + c][r.id.cx + a] = r.dead ? String(r.dead) : r.lost >= 20 ? '+' : '·';
  for (let cy = rows - 1; cy >= 0; cy--) { let row = map[rows - 1 - cy]; row += ' '.repeat(cols - row.length); if (side) row = row.split('').reverse().join(''); console.log(`   cy=${String(cy).padStart(2)}  ${row}    ${grid[cy].join('')}`); }
  console.log('   (digit = units killed when that one block vanishes; + = no death but ≥20 hp lost; · = harmless; blank = not tested)');
  const bad = res.filter((r) => r.dead || r.lost >= 20).sort((p, q) => q.dead - p.dead || q.lost - p.lost);
  for (const r of bad) console.log(`   ${MAT[r.id.mat].k}(${r.id.cx},${r.id.cy}${r.id.cw > 1 || r.id.ch > 1 ? ' ' + r.id.cw + 'x' + r.id.ch : ''}) hp ${r.id.hm.toFixed(0)}: ${r.dead} dead [${r.how.join(', ')}], total hp lost ${r.lost.toFixed(0)}${r.pins.length ? '; burial: ' + r.pins.join('; ') : ''}${r.moved ? '; survivors displaced: ' + r.moved : ''}`);
  console.log(`   → ${res.filter((r) => r.dead >= 2).length} of ${res.length} blocks are single points of failure that cost ≥2 units; ${res.filter((r) => r.dead === 1).length} cost 1 unit`);
}
