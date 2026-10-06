/* ===== 50-sim: 戰局模擬。不碰畫面，Node 裡也能跑（自動玩家測難度用） ===== */
const F_IN = 1, F_WILD = 2, F_FIRE = 4, F_PORT = 8;
const NS = 2000;
const SH = {
  n: 0, cnt: [0, 0, 0],
  x: new Float32Array(NS), y: new Float32Array(NS), vx: new Float32Array(NS), vy: new Float32Array(NS),
  age: new Float32Array(NS), mass: new Float32Array(NS), side: new Int8Array(NS), w: new Uint8Array(NS),
  flag: new Uint8Array(NS), mask: new Int32Array(NS), lin: new Int32Array(NS)
};
const LIN_N = 4096;
const S = {
  idx: 0, lv: null, time: 0, frame: 0, state: 'idle', diff: 1, endT: 0, loser: -1,
  st: [null, null], structs: [], units: [], team: [null, null],
  gates: [], gsp: [], bitUse: new Float64Array(30),
  objs: [], marks: [], pend: [],
  wind: 0, windTo: 0, windT: 0, windAI: 0, rage: 1, sudden: false,
  gpts: null, voids: null, gmax: 1, boss: null, evq: [], rep: [],
  lin: new Int16Array(LIN_N), linNext: 1,
  stat: { fired: 0, peak: 0, swarm: 0, cells: 0, kills: 0, gates: 0, lost: 0 },
  on: null
};
const DIFFS = [
  { name: '輕鬆', aiErr: 1.5, aiThink: 1.3, foeHp: 0.85, foeDmg: 0.8, foeRate: 0.88 },
  { name: '標準', aiErr: 1.0, aiThink: 1.0, foeHp: 1.0, foeDmg: 1.0, foeRate: 1.0 },
  { name: '硬仗', aiErr: 0.7, aiThink: 0.8, foeHp: 1.18, foeDmg: 1.12, foeRate: 1.12 }
];
const BAR_TH = 0.55;      // 城防條歸零時，磚的總耐久還剩這個比例（剩下的一次垮光）
const SPLIT_P = 0.45;      // 砲彈穿過倍增符後，每一發的威力打幾折（0 = 不打折）
const GATE_BLOCK = true; // 對方的倍增符會不會擋住砲彈
function ev(t, a, b, c, d, e, f) { if (S.on) S.on(t, a, b, c, d, e, f); }

/* ---------- 地面 ---------- */
function groundY(x) {
  const v = S.voids;
  if (v) for (let i = 0; i < v.length; i++) if (x > v[i][0] && x < v[i][1]) return -999;
  const p = S.gpts; if (!p) return 0;
  if (x <= p[0][0]) return p[0][1];
  const n = p.length; if (x >= p[n - 1][0]) return p[n - 1][1];
  for (let i = 1; i < n; i++) if (x <= p[i][0]) { const a = p[i - 1], b = p[i]; return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); }
  return 0;
}

/* ---------- 建築（一格一格的磚） ---------- */
function mkStruct(side, def, x0, y0, hpMul, mirror) {
  const map = def.map, rows = map.length; let cols = 0;
  for (const r of map) if (r.length > cols) cols = r.length;
  const n = cols * rows;
  const st = {
    side, skin: def.skin, x0, y0, cols, rows, n, w: cols * CS, h: rows * CS, x1: x0 + cols * CS, y1: y0 + rows * CS, cx: x0 + cols * CS / 2,
    m: new Uint8Array(n), hp: new Float32Array(n), hm: new Float32Array(n), burn: new Float32Array(n), brit: new Float32Array(n),
    deco: new Uint8Array(n), deco0: new Uint8Array(n), vr: new Uint8Array(n), m0: new Uint8Array(n),
    mark: new Uint8Array(n), q: new Int32Array(n), gid: new Int16Array(n), sup: new Uint8Array(n),
    groups: [], units: [], slots: [], hpMul, hp0: 0, hpNow: 0, need: false, nburn: 0, burnT: 0, ver: 0, dead: false, fin: null, shake: 0, hitT: 0
  };
  for (let r = 0; r < rows; r++) {
    const row = map[r], cy = rows - 1 - r;
    for (let c = 0; c < cols; c++) {
      const ch = row[c] || ' ', cx = mirror ? cols - 1 - c : c, i = cy * cols + cx;
      let m = 0, deco = 0;
      switch (ch) {
        case '#': m = M_STONE; break; case '=': m = M_WOOD; break; case 'I': m = M_IRON; break; case '^': m = M_ROOF; break;
        case 'i': m = M_ICE; break; case 'R': m = M_ROCK; break; case 'K': m = M_KEG; break; case '.': m = M_PANEL; break;
        case 'D': m = M_STONE; deco = 1; break; case 'w': m = M_STONE; deco = 2; break;
        default: if (ch >= '1' && ch <= '9') { m = M_PANEL; st.slots.push({ slot: +ch, cx, cy }); }
      }
      if (!m) continue;
      st.m[i] = st.m0[i] = m; st.deco[i] = st.deco0[i] = deco; st.vr[i] = (cx * 7 + cy * 13 + ((cx * cy) % 5)) & 255;
      const hp = MAT[m].hp * (m === M_KEG || m === M_PANEL ? 1 : hpMul); st.hp[i] = st.hm[i] = hp;
      if (isSolid(m)) st.hp0 += hp;
    }
  }
  st.hpNow = st.hp0; st.slots.sort((a, b) => a.slot - b.slot);
  return st;
}
function structHp(st) {
  let s = 0; const m = st.m, hp = st.hp;
  for (let i = 0; i < st.n; i++) if (m[i] !== 0 && m[i] !== M_PANEL && hp[i] > 0) s += hp[i];
  for (const g of st.groups) if (!g.done) for (const c of g.cells) if (c.m !== M_PANEL && c.hp > 0) s += c.hp;
  st.hpNow = s; return s;
}
function teamBar(side) { const st = S.st[side]; return clamp((st.hpNow / st.hp0 - BAR_TH) / (1 - BAR_TH), 0, 1); }
function cellX(st, i) { return st.x0 + ((i % st.cols) + 0.5) * CS; }
function cellY(st, i) { return st.y0 + (((i / st.cols) | 0) + 0.5) * CS; }

function hitCell(st, i, dmg, kind, side) {
  const m = st.m[i]; if (!m) return;
  let d = dmg * DM[kind][m]; if (st.brit[i] > 0) d *= 1.6;
  if (d <= 0) return;
  const before = st.hp[i]; st.hp[i] = before - d; st.hitT = 0.12;
  if (side < 2 && st.side < 2 && st.side !== side && m !== M_PANEL) { const T = S.team[side], got = Math.min(d, before); T.dealt += got; if (T.ult.T <= 0) T.ult.c = Math.min(T.ult.need, T.ult.c + got * T.ult.gain); }
  if (st.hp[i] <= 0) destroyCell(st, i, side, kind);
  else if (((before / st.hm[i]) * 3 | 0) !== ((st.hp[i] / st.hm[i]) * 3 | 0)) { st.ver++; ev('crack', cellX(st, i), cellY(st, i), m); }
}
function destroyCell(st, i, side, kind) {
  const m = st.m[i]; if (!m) return;
  st.m[i] = 0; st.hp[i] = 0; st.burn[i] = 0; st.brit[i] = 0; st.ver++;
  const x = cellX(st, i), y = cellY(st, i);
  ev('cell', x, y, m, st.side, kind, st.skin);
  st.need = true;
  if (m === M_PANEL) return;
  if (st.side === 1 && side === 0) S.stat.cells++;
  if (m === M_KEG) S.pend.push({ t: S.time + 0.1 + rnd() * 0.08, x, y, w: WPN.keg, side: st.side < 2 ? 1 - st.side : 2 });
}
function ignite(st, i, dur) {
  const m = st.m[i]; if (!m || !MAT[m].burn) return;
  if (m === M_KEG) { st.hp[i] = 0; destroyCell(st, i, 2, K_FIRE); return; }
  if (st.burn[i] <= 0) { st.nburn = Math.max(0, st.nburn) + 1; ev('ignite', cellX(st, i), cellY(st, i)); }
  if (dur > st.burn[i]) st.burn[i] = dur;
}
function burnStep(st, dt) {
  if (st.nburn <= 0) return;
  const { cols, rows, m, burn } = st; let nb = 0;
  st.burnT -= dt; const tick = st.burnT <= 0; if (tick) st.burnT = 0.42;
  const foe = st.side < 2 ? 1 - st.side : 2;
  for (let i = 0; i < st.n; i++) {
    if (burn[i] <= 0) continue;
    burn[i] -= dt; if (burn[i] <= 0 || !m[i]) { burn[i] = 0; continue; }
    hitCell(st, i, 3.4 * dt, K_FIRE, foe);
    if (tick && m[i]) {
      const cx = i % cols, cy = (i / cols) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? -1 : k === 1 ? 1 : 0), ny = cy + (k === 2 ? -1 : k === 3 ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx, mj = m[j];
        if (mj && MAT[mj].burn && burn[j] <= 0 && rnd() < (k === 3 ? 0.11 : 0.05)) ignite(st, j, 3 + rnd() * 2.2);
      }
    }
  }
  for (let i = 0; i < st.n; i++) if (burn[i] > 0) nb++;
  st.nburn = nb;
  // 站在火旁邊的兵會被燒
  for (const u of st.units) {
    if (!u.alive || u.grp) continue;
    const i = u.cy * cols + u.cx; let hot = false;
    if (u.cy < rows && burn[i] > 0) hot = true;
    else if (u.cx > 0 && burn[i - 1] > 0) hot = true; else if (u.cx < cols - 1 && burn[i + 1] > 0) hot = true; else if (u.cy > 0 && burn[i - cols] > 0) hot = true;
    if (hot) hurtUnit(u, 2.4 * dt, foe, K_FIRE);
  }
}

/* 支撐：實心磚要一路連到最底下一列才站得住。沒連到的整群一起往下掉，落地時互相撞傷。 */
function structCollapse(st) {
  st.need = false;
  const { cols, rows, n, m, mark, q, gid } = st;
  mark.fill(0); gid.fill(-1);
  let qh = 0, qt = 0;
  for (let cx = 0; cx < cols; cx++) if (isSolid(m[cx])) { mark[cx] = 1; q[qt++] = cx; }
  while (qh < qt) {
    const i = q[qh++], cx = i % cols, cy = (i / cols) | 0;
    if (cx > 0 && !mark[i - 1] && isSolid(m[i - 1])) { mark[i - 1] = 1; q[qt++] = i - 1; }
    if (cx < cols - 1 && !mark[i + 1] && isSolid(m[i + 1])) { mark[i + 1] = 1; q[qt++] = i + 1; }
    if (cy > 0 && !mark[i - cols] && isSolid(m[i - cols])) { mark[i - cols] = 1; q[qt++] = i - cols; }
    if (cy < rows - 1 && !mark[i + cols] && isSolid(m[i + cols])) { mark[i + cols] = 1; q[qt++] = i + cols; }
  }
  const g0 = st.groups.length;
  for (let s = 0; s < n; s++) {
    if (mark[s] || !isSolid(m[s])) continue;
    const gi = st.groups.length, g = { cells: [], k: 0, off: 0, vy: 0, units: [], done: false };
    qh = qt = 0; q[qt++] = s; mark[s] = 2;
    while (qh < qt) {
      const i = q[qh++], cx = i % cols, cy = (i / cols) | 0; gid[i] = gi;
      if (cx > 0 && !mark[i - 1] && isSolid(m[i - 1])) { mark[i - 1] = 2; q[qt++] = i - 1; }
      if (cx < cols - 1 && !mark[i + 1] && isSolid(m[i + 1])) { mark[i + 1] = 2; q[qt++] = i + 1; }
      if (cy > 0 && !mark[i - cols] && isSolid(m[i - cols])) { mark[i - cols] = 2; q[qt++] = i - cols; }
      if (cy < rows - 1 && !mark[i + cols] && isSolid(m[i + cols])) { mark[i + cols] = 2; q[qt++] = i + cols; }
    }
    st.groups.push(g);
  }
  // 房間的壁板：腳下、左右或頭上有站得住的東西才留著
  const sup = st.sup; sup.fill(0);
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < n; i++) {
      if (m[i] !== M_PANEL || sup[i]) continue;
      const cx = i % cols, cy = (i / cols) | 0;
      const ok = (j) => (mark[j] === 1) || (m[j] === M_PANEL && sup[j]);
      if (cy === 0 || ok(i - cols) || (cx > 0 && ok(i - 1)) || (cx < cols - 1 && ok(i + 1)) || (cy < rows - 1 && mark[i + cols] === 1)) sup[i] = 1;
    }
  }
  for (let i = 0; i < n; i++) {
    if (m[i] !== M_PANEL || sup[i]) continue;
    const cx = i % cols, cy = (i / cols) | 0; let gi = -1;
    if (cy > 0 && gid[i - cols] >= 0) gi = gid[i - cols]; else if (cx > 0 && gid[i - 1] >= 0) gi = gid[i - 1];
    else if (cx < cols - 1 && gid[i + 1] >= 0) gi = gid[i + 1]; else if (cy < rows - 1 && gid[i + cols] >= 0) gi = gid[i + cols];
    if (gi >= 0) gid[i] = gi; else destroyCell(st, i, 2, K_CRUSH);
  }
  st.need = false;        // 上面清掉的壁板不用再重算一次
  if (st.groups.length === g0) {
    // 沒有新的落石，只檢查兵腳下還有沒有地板
    for (const u of st.units) if (u.alive && !u.grp && !u.fall && u.cy > 0 && !isSolid(m[(u.cy - 1) * cols + u.cx])) { u.fall = true; u.vy = 0; u.cy0 = u.cy; }
    return;
  }
  for (const u of st.units) {
    if (!u.alive || u.grp || u.fall) continue;
    if (u.cy <= 0) continue;
    const j = (u.cy - 1) * cols + u.cx;
    if (gid[j] >= 0) { u.grp = st.groups[gid[j]]; u.grp.units.push(u); u.gy = u.y; }
    else if (!isSolid(m[j])) { u.fall = true; u.vy = 0; u.cy0 = u.cy; }
  }
  for (let i = 0; i < n; i++) {
    const gi = gid[i]; if (gi < 0) continue;
    const g = st.groups[gi];
    g.cells.push({ cx: i % cols, cy: (i / cols) | 0, m: m[i], hp: st.hp[i], hm: st.hm[i], burn: st.burn[i], deco: st.deco[i], vr: st.vr[i] });
    m[i] = 0; st.hp[i] = 0; st.burn[i] = 0; st.brit[i] = 0;
  }
  st.ver++;
  for (let gi = g0; gi < st.groups.length; gi++) { const g = st.groups[gi]; if (g.cells.length >= 3) { const c = g.cells[0]; ev('fall', st.x0 + (c.cx + 0.5) * CS, st.y0 + (c.cy + 0.5) * CS, g.cells.length, st.side); } }
}
function groupCanDrop(st, g, k) {
  const { cols, m } = st;
  for (const c of g.cells) {
    if (c.m === M_PANEL) continue;
    const ny = c.cy - k; if (ny < 0) return false;
    if (isSolid(m[ny * cols + c.cx])) return false;
  }
  return true;
}
function groupLand(st, g) {
  const { cols, m } = st, k = g.k, foe = st.side < 2 ? 1 - st.side : 2;
  g.done = true; let sx = 0, sy = 0, ns = 0;
  for (const c of g.cells) {
    const ny = c.cy - k; if (ny < 0) continue;
    const i = ny * cols + c.cx;
    if (c.m === M_PANEL) { if (m[i] === 0) { m[i] = M_PANEL; st.hp[i] = c.hp; st.hm[i] = c.hm; } continue; }
    if (m[i] === M_PANEL) { st.burn[i] = 0; ev('cell', cellX(st, i), cellY(st, i), M_PANEL, st.side, K_CRUSH, st.skin); }
    else if (m[i] !== 0) { ev('cell', cellX(st, i), cellY(st, i), c.m, st.side, K_CRUSH, st.skin); c.gone = true; continue; }
    // 砸在兵頭上：兵受重傷，這塊磚碎掉
    let onHead = false;
    for (const u of st.units) if (u.alive && !u.grp && u.cx === c.cx && u.cy === ny) { onHead = true; hurtUnit(u, u.hpMax * (c.m === M_STONE || c.m === M_IRON || c.m === M_ROCK ? 0.42 : 0.28), foe, K_CRUSH); u.stun = Math.max(u.stun, 0.8); }
    if (onHead) { ev('cell', cellX(st, i), cellY(st, i), c.m, st.side, K_CRUSH, st.skin); c.gone = true; if (st.side === 1) S.stat.cells++; continue; }
    m[i] = c.m; st.hp[i] = c.hp; st.hm[i] = c.hm; st.deco[i] = c.deco; st.vr[i] = c.vr; st.burn[i] = c.burn; if (c.burn > 0) st.nburn++;
    sx += c.cx; sy += ny; ns++;
  }
  st.ver++;
  // 落地的撞擊：掉得越遠傷得越重，被壓到的那一塊也一起受傷
  if (k > 0) {
    for (const c of g.cells) {
      if (c.m === M_PANEL) continue;
      const ny = c.cy - k; if (ny < 0 || c.gone) continue; const i = ny * cols + c.cx;
      if (!m[i]) continue;
      const below = ny > 0 ? i - cols : -1;
      if (below >= 0 && isSolid(m[below]) && !g.cells.some((d) => d.cx === c.cx && d.cy - k === ny - 1 && d.m !== M_PANEL)) hitCell(st, below, c.hm * 0.16 * k, K_CRUSH, foe);
      hitCell(st, i, c.hm * (0.14 + 0.05 * rnd()) * Math.min(k, 4), K_CRUSH, foe);
    }
    if (ns) ev('thud', st.x0 + (sx / ns + 0.5) * CS, st.y0 + (sy / ns) * CS, ns, k, st.side);
  }
  for (const u of g.units) {
    if (!u.alive || u.grp !== g) continue;
    u.grp = null; u.cy -= k; u.y = st.y0 + u.cy * CS;
    if (k > 0) hurtUnit(u, 5 + 7 * k, foe, K_CRUSH);
  }
  st.need = true;
}
function groupsStep(st, dt) {
  if (!st.groups.length) return;
  for (const g of st.groups) {
    if (g.done) continue;
    g.vy += 52 * dt; g.off += g.vy * dt;
    const want = Math.floor(g.off / CS) + 1;      // 下緣已經進到第幾格
    while (g.k < want) {
      if (groupCanDrop(st, g, g.k + 1)) g.k++;
      else { g.off = g.k * CS; groupLand(st, g); break; }
    }
    if (!g.done && g.off > g.k * CS && !groupCanDrop(st, g, g.k + 1)) { g.off = g.k * CS; groupLand(st, g); }
    for (const u of g.units) if (u.alive && u.grp === g) u.y = u.gy - g.off;
  }
  let any = false; for (const g of st.groups) if (!g.done) { any = true; break; }
  if (!any) st.groups.length = 0;
}
// 修城：把還撐得住的缺口補回去（由下往上），並替現有的磚回一些耐久
function repairStruct(st, maxCells, heal) {
  const { cols, rows, n, m, m0 } = st; let made = 0;
  for (let i = 0; i < n; i++) if (m[i] && m[i] !== M_PANEL) st.hp[i] = Math.min(st.hm[i], st.hp[i] + st.hm[i] * heal);
  for (let i = 0; i < n && made < maxCells; i++) {
    if (m[i] || !m0[i] || m0[i] === M_KEG) continue;
    const cx = i % cols, cy = (i / cols) | 0;
    if (m0[i] === M_PANEL) continue;
    if (cy > 0 && !isSolid(m[i - cols])) continue;
    let busy = false; for (const u of st.units) if (u.alive && u.cx === cx && u.cy === cy) { busy = true; break; }
    if (busy) continue;
    m[i] = m0[i]; st.deco[i] = st.deco0[i]; st.hm[i] = MAT[m0[i]].hp * st.hpMul; st.hp[i] = st.hm[i] * 0.7; made++;
    ev('build', cellX(st, i), cellY(st, i), m0[i]);
  }
  st.ver++; return made;
}

/* ---------- 兵 ---------- */
function mkUnit(side, type, st, slot, hpMul) {
  const def = UNIT[type], T = S.team[side];
  const u = {
    side, type, def, st, slot: slot.slot, cx: slot.cx, cy: slot.cy, hx: slot.cx, hy: slot.cy,
    x: st.x0 + (slot.cx + 0.5) * CS, y: st.y0 + slot.cy * CS, hp: def.hp * hpMul, hpMax: def.hp * hpMul,
    cool: 0, burst: 0, frozen: 0, stun: 0, alive: true, fall: false, vy: 0, cy0: 0, grp: null, gy: 0,
    recoil: 0, hurtT: 0, w: def.w ? WPN[def.w] : null, t2: def.spawn ? def.spawn.first : def.flak ? 1 : 0, rateMul: 1, dieT: 0
  };
  st.units.push(u); T.units.push(u); S.units.push(u);
  return u;
}
function hurtUnit(u, d, side, kind) {
  if (!u.alive || d <= 0) return;
  u.hp -= d; u.hurtT = 0.22;
  if (side < 2 && side !== u.side) { const T = S.team[side]; if (T.ult.T <= 0) T.ult.c = Math.min(T.ult.need, T.ult.c + d * T.ult.gain * 0.6); }
  if (u.hp <= 0) killUnit(u, side, kind === K_CRUSH ? 2 : kind === K_FIRE ? 3 : 0);
}
function killUnit(u, side, crushed) {
  if (!u.alive) return;
  u.alive = false; u.hp = 0; u.grp = null;
  S.team[u.side].alive--;
  if (u.side === 1) S.stat.kills++; else S.stat.lost++;
  ev('udie', u.x, u.y + 1.8, u.side, u.type, crushed, u.slot);
}
function unitFire(u, T) {
  const w = u.w, dir = T.dir, mx = u.x + dir * 1.3, my = u.y + 2.3;
  const n = w.fan || 1;
  for (let k = 0; k < n; k++) {
    const a = (n > 1 ? (k - (n - 1) / 2) * 0.085 : 0) + gauss() * 0.012, c = Math.cos(a), s = Math.sin(a), sp = 1 + gauss() * 0.01;
    const vx = (T.aim[0] * c - T.aim[1] * s * dir) * sp, vy = (T.aim[1] * c + T.aim[0] * s * dir) * sp;
    const lin = S.linNext; S.linNext = (S.linNext % (LIN_N - 1)) + 1; S.lin[lin] = 1;
    spawnShot(u.side, w.i, mx, my, vx, vy, 1, F_IN, 0, lin);
  }
  T.fired += n; if (u.side === 0) S.stat.fired += n;
  u.recoil = 1;
  ev('fire', mx, my, u.side, w.i, u.slot);
}
function unitsStep(dt) {
  for (const u of S.units) {
    if (!u.alive) { if (u.dieT < 3) u.dieT += dt; continue; }
    const st = u.st, T = S.team[u.side];
    if (u.hurtT > 0) u.hurtT -= dt; if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 5);
    if (u.frozen > 0) u.frozen -= dt; if (u.stun > 0) u.stun -= dt;
    if (u.grp) continue;
    if (u.fall) {
      u.vy += 52 * dt; u.y -= u.vy * dt;
      let cy = Math.floor((u.y - st.y0) / CS); if (cy < 0) cy = 0;
      // 腳下那一格是實心的（或到地面）就站住
      let land = -1;
      if (u.y <= st.y0) land = 0; else if (cy < st.rows && isSolid(st.m[cy * st.cols + u.cx])) land = cy + 1;
      else if (cy > 0 && isSolid(st.m[(cy - 1) * st.cols + u.cx]) && u.y - (st.y0 + cy * CS) < 0.5) land = cy;
      if (land >= 0) {
        const fell = u.cy0 - land; u.fall = false; u.cy = land; u.y = st.y0 + land * CS; u.vy = 0;
        if (fell > 0) { ev('uland', u.x, u.y, u.side); hurtUnit(u, 4 + Math.max(0, fell - 1) * 11, 1 - u.side, K_CRUSH); }
      }
      continue;
    }
    if (u.cy < st.rows && isSolid(st.m[u.cy * st.cols + u.cx])) { killUnit(u, 1 - u.side, 1); continue; }
    if (S.state !== 'play') continue;
    if (u.frozen > 0 || u.stun > 0) continue;
    const rate = T.rate * u.rateMul * (T.ult.T > 0 ? 3 : 1) * (T.rageT > 0 ? 1.6 : 1);
    if (u.w) {
      u.cool -= dt * rate;
      if (u.cool <= 0) {
        unitFire(u, T);
        if (u.w.burst) { if (u.burst <= 0) u.burst = u.w.burst; u.burst--; u.cool += u.burst > 0 ? u.w.gap : u.w.reload; }
        else u.cool += u.w.reload;
        if (u.cool < 0) u.cool = 0;
      }
    } else if (u.def.flak) {
      u.t2 -= dt * rate;
      if (u.t2 <= 0) { u.t2 = flakFire(u) ? u.def.flak.rate : 0.08; }
    } else if (u.def.spawn) {
      u.t2 -= dt * rate;
      if (u.t2 <= 0) {
        let nb = 0; for (const o of S.objs) if (o.t === 'balloon' && o.side === u.side) nb++;
        if (nb < 2) { spawnBalloon(u); u.t2 = u.def.spawn.every; u.recoil = 1; } else u.t2 = 1.2;
      }
    }
  }
}
// 防空弩：射下一發正往自己城飛過來的砲彈
function flakFire(u) {
  const R = u.def.flak.range, R2 = R * R, ux = u.x, uy = u.y + 2.4; let best = -1, bd = 1e9;
  for (let i = 0; i < SH.n; i++) {
    if (SH.side[i] === u.side) continue;
    const dx = SH.x[i] - ux, dy = SH.y[i] - uy, d2 = dx * dx + dy * dy;
    if (d2 > R2 || d2 >= bd) continue;
    if (dx * SH.vx[i] + dy * SH.vy[i] > 0) continue;      // 已經飛過去的不管
    bd = d2; best = i;
  }
  if (best < 0) return false;
  u.recoil = 1;
  const hit = rnd() < 0.75;
  ev('flak', ux, uy, SH.x[best], SH.y[best], u.side, hit ? 1 : 0);
  if (hit) { if (SH.mass[best] > 1.5) SH.mass[best] -= 1; else killShot(best); }
  return true;
}

/* ---------- 砲彈 ---------- */
function spawnShot(side, wi, x, y, vx, vy, mass, flag, mask, lin) {
  if (SH.n >= NS) return -1;
  const i = SH.n++;
  SH.x[i] = x; SH.y[i] = y; SH.vx[i] = vx; SH.vy[i] = vy; SH.age[i] = 0; SH.mass[i] = mass; SH.side[i] = side; SH.w[i] = wi;
  SH.flag[i] = flag; SH.mask[i] = mask; SH.lin[i] = lin; SH.cnt[side]++;
  return i;
}
function killShot(i) {
  SH.cnt[SH.side[i]]--;
  const j = --SH.n;
  if (i !== j) {
    SH.x[i] = SH.x[j]; SH.y[i] = SH.y[j]; SH.vx[i] = SH.vx[j]; SH.vy[i] = SH.vy[j]; SH.age[i] = SH.age[j]; SH.mass[i] = SH.mass[j];
    SH.side[i] = SH.side[j]; SH.w[i] = SH.w[j]; SH.flag[i] = SH.flag[j]; SH.mask[i] = SH.mask[j]; SH.lin[i] = SH.lin[j];
  }
}
function lightning(x, y, mul, side) {
  let st = null;
  for (const s of S.structs) if (x >= s.x0 && x < s.x1 && !s.dead && s.side !== side) { st = s; break; }
  if (!st) { ev('zap', x, groundY(x), 70, 0); return; }
  const { cols, rows, m } = st, cx = clamp(((x - st.x0) / CS) | 0, 0, cols - 1); let n = 0, top = -1, bot = 0;
  for (let cy = rows - 1; cy >= 0 && n < 3; cy--) {
    const i = cy * cols + cx;
    if (!isSolid(m[i])) continue;
    if (top < 0) top = cy; bot = cy; n++;
    const iron = m[i] === M_IRON;
    hitCell(st, i, 9.5 * mul, K_ZAP, side);
    if (iron) {
      // 鐵會導電：往旁邊的鐵再傳兩格
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? -1 : k === 1 ? 1 : 0), ny = cy + (k === 2 ? -1 : k === 3 ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const j = ny * cols + nx; if (m[j] === M_IRON) { hitCell(st, j, 4.5 * mul, K_ZAP, side); ev('spark', cellX(st, j), cellY(st, j)); }
      }
    }
  }
  const xc = st.x0 + (cx + 0.5) * CS;
  for (const u of st.units) if (u.alive && u.cx === cx && (top < 0 || u.cy >= bot)) { hurtUnit(u, 7.5 * mul, side, K_ZAP); u.stun = Math.max(u.stun, 0.9); }
  ev('zap', xc, top >= 0 ? st.y0 + bot * CS : st.y0, 78, 1);
}
function explode(x, y, w, side, mass, flag, hitSt, hitI, hitU) {
  const T = side < 2 ? S.team[side] : null;
  const fire = w.kind === K_FIRE || (flag & F_FIRE) !== 0;
  const mul = (T ? T.dmg : 1) * S.rage * mass * ((flag & F_FIRE) && w.kind !== K_FIRE ? 1.5 : 1);
  const dmg = w.dmg * mul, ud = w.ud * mul, kind = w.kind;
  const r = w.r * (mass > 1 ? Math.min(1.5, Math.sqrt(mass)) : 1);
  if (hitSt && hitI >= 0) {
    hitCell(hitSt, hitI, dmg, kind, side);
    if (fire) ignite(hitSt, hitI, 4 + rnd() * 2);
    if (kind === K_ICE && hitSt.m[hitI]) hitSt.brit[hitI] = 6;
  }
  if (hitU) { hurtUnit(hitU, ud, side, kind); if (kind === K_ICE) hitU.frozen = Math.max(hitU.frozen, 3.2); }
  if (r > 0) {
    const R = r + CS * 0.5;
    for (const st of S.structs) {
      if (x + R < st.x0 || x - R > st.x1 || y + R < st.y0 || y - R > st.y1) continue;
      const cols = st.cols, cx0 = Math.max(0, Math.floor((x - R - st.x0) / CS)), cx1 = Math.min(cols - 1, Math.floor((x + R - st.x0) / CS));
      const cy0 = Math.max(0, Math.floor((y - R - st.y0) / CS)), cy1 = Math.min(st.rows - 1, Math.floor((y + R - st.y0) / CS));
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const i = cy * cols + cx; if (!st.m[i] || (st === hitSt && i === hitI)) continue;
        const dx = st.x0 + (cx + 0.5) * CS - x, dy = st.y0 + (cy + 0.5) * CS - y;
        let f = 1 - (Math.sqrt(dx * dx + dy * dy) - CS * 0.5) / r; if (f <= 0) continue; if (f > 1) f = 1;
        if (fire && MAT[st.m[i]].burn && rnd() < 0.25 + 0.5 * f) ignite(st, i, 3 + rnd() * 2.5);
        if (kind === K_ICE) st.brit[i] = 6;
        hitCell(st, i, dmg * 0.6 * f, kind, side);
      }
      for (const u of st.units) {
        if (!u.alive || u === hitU) continue;
        const dx = u.x - x, dy = u.y + 1.9 - y; let f = 1 - (Math.sqrt(dx * dx + dy * dy) - 1.3) / r; if (f <= 0) continue; if (f > 1) f = 1;
        if (kind === K_ICE) u.frozen = Math.max(u.frozen, 2.2 + f);
        hurtUnit(u, ud * 0.7 * f, side, kind);
      }
    }
    for (const o of S.objs) {
      if ((o.t !== 'balloon' && o.t !== 'orb') || o.side === side || o.hp <= 0) continue;
      const dx = o.x - x, dy = o.y - y; if (dx * dx + dy * dy < (r + o.r) * (r + o.r)) o.hp -= dmg * 0.6;
    }
  }
  if (kind === K_ZAP) lightning(x, y, mul, side);
  ev('boom', x, y, r, w.i, side, mass + ((flag & F_FIRE) ? 100 : 0));
}

// 線段 p→q 跟線段 a→b 有沒有相交；有的話回傳 p→q 上的比例，沒有回傳 -1
function segHit(px, py, qx, qy, ax, ay, bx, by) {
  const rx = qx - px, ry = qy - py, sx = bx - ax, sy = by - ay, den = rx * sy - ry * sx;
  if (den === 0) return -1;
  const t = ((ax - px) * sy - (ay - py) * sx) / den, u = ((ax - px) * ry - (ay - py) * rx) / den;
  return (t >= 0 && t <= 1 && u >= 0 && u <= 1) ? t : -1;
}
function shotsStep(dt) {
  const wind = S.wind, gates = S.gates, objs = S.objs, structs = S.structs, team = S.team;
  const sh0 = team[0].shield.T > 0 ? S.st[0] : null, sh1 = team[1].shield.T > 0 ? S.st[1] : null;
  for (let i = 0; i < SH.n; i++) {
    let x = SH.x[i], y = SH.y[i], vx = SH.vx[i], vy = SH.vy[i];
    const side = SH.side[i];
    vy -= GRAV * dt; vx += wind * dt;
    let nx = x + vx * dt, ny = y + vy * dt;
    SH.age[i] += dt;
    if (nx < -60 || nx > VIEW_W + 60 || ny < -40 || SH.age[i] > 9) { killShot(i); i--; continue; }
    let dead = false;

    // 倍增符
    for (let gi = 0; gi < gates.length && !dead; gi++) {
      const g = gates[gi];
      if (g.dead) continue;
      const reach = g.h + 3;
      if ((x < g.x - reach && nx < g.x - reach) || (x > g.x + reach && nx > g.x + reach) || (y < g.y - reach && ny < g.y - reach) || (y > g.y + reach && ny > g.y + reach)) continue;
      if (SH.mask[i] & g.bit) continue;
      const t = segHit(x, y, nx, ny, g.x - g.dx, g.y - g.dy, g.x + g.dx, g.y + g.dy);
      if (t < 0) continue;
      const hx = x + (nx - x) * t, hy = y + (ny - y) * t;
      if (g.owner === 3) {                                  // 折損符：每兩發吃掉一發
        SH.mask[i] |= g.bit; g.flash = 1; g.tog ^= 1;
        if (g.tog) { ev('gbad', hx, hy); dead = true; }
        continue;
      }
      if (g.owner === 2 || g.owner === side) {
        SH.mask[i] |= g.bit;
        const ga = gateMultiply(i, g, hx, hy, vx, vy);
        if (ga !== 0) { const c = Math.cos(ga), s2 = Math.sin(ga), ox = vx; vx = ox * c - vy * s2; vy = vy * c + ox * s2; }
        continue;
      }
      if (side === 2 || !GATE_BLOCK) continue;
      // 對方的倍增符：會擋砲彈，但打得掉
      g.hp -= WL[SH.w[i]].dmg * SH.mass[i] * team[side].dmg; g.flash = 1;
      ev('ghit', hx, hy, g.owner);
      dead = true;
    }
    if (dead) { killShot(i); i--; continue; }

    // 機關：鏡子、傳送門、氣球、天燈、光球、結界、地火
    for (let oi = 0; oi < objs.length && !dead; oi++) {
      const o = objs[oi];
      switch (o.t) {
        case 'mirror': {
          if (Math.abs(nx - o.x) > o.len + 4 && Math.abs(x - o.x) > o.len + 4) break;
          const t = segHit(x, y, nx, ny, o.x - o.dx, o.y - o.dy, o.x + o.dx, o.y + o.dy);
          if (t < 0) break;
          const hx = x + (nx - x) * t, hy = y + (ny - y) * t;
          // 法線反射
          let nxn = -o.dy / o.len, nyn = o.dx / o.len; const dot = vx * nxn + vy * nyn;
          vx -= 2 * dot * nxn; vy -= 2 * dot * nyn;
          const sp = Math.hypot(vx, vy) || 1;
          nx = hx + vx / sp * 0.6; ny = hy + vy / sp * 0.6; x = nx; y = ny;
          SH.flag[i] = (SH.flag[i] | F_WILD) & ~F_IN; o.flash = 1; o.hits++;
          ev('ping', hx, hy);
          break;
        }
        case 'portal': {
          if (o.owner !== side || (SH.flag[i] & F_PORT)) break;
          const dx = nx - o.x, dy = ny - o.y;
          if (dx * dx + dy * dy > o.r * o.r) break;
          const sp = Math.max(46, Math.hypot(vx, vy)), a = o.ea + (rnd() - 0.5) * o.ej;
          ev('port', nx, ny, o.owner, 0);
          nx = o.ex + (rnd() - 0.5) * o.ew; ny = o.ey + (rnd() - 0.5) * 2; x = nx; y = ny;
          vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
          SH.flag[i] = (SH.flag[i] | F_PORT) & ~F_IN; o.flash = 1;
          ev('port', nx, ny, o.owner, 1);
          break;
        }
        case 'geyser': {
          if (!o.on || (SH.flag[i] & F_FIRE)) break;
          if (Math.abs(nx - o.x) < o.w && ny < o.top && ny > o.base - 2) { SH.flag[i] |= F_FIRE; ev('lit', nx, ny); }
          break;
        }
        case 'balloon': case 'orb': {
          if (o.side === side || o.hp <= 0) break;
          const dx = nx - o.x, dy = ny - o.y;
          if (dx * dx + dy * dy > o.r * o.r) break;
          const w = WL[SH.w[i]], d = w.dmg * SH.mass[i] * (side < 2 ? team[side].dmg : 1);
          o.hp -= d; o.flash = 1;
          if (w.r > 0) explode(nx, ny, w, side, SH.mass[i], SH.flag[i], null, -1, null); else ev('tick', nx, ny, side);
          dead = true;
          break;
        }
        case 'lantern': {
          if (o.hp <= 0 || side === 2) break;
          const dx = nx - o.x, dy = ny - o.y;
          if (dx * dx + dy * dy > o.r * o.r) break;
          o.hp = 0; o.by = side;
          break;
        }
        case 'barrier': {
          if (side !== 0) break;
          const d0 = Math.hypot(x - o.x, y - o.y), d1 = Math.hypot(nx - o.x, ny - o.y);
          if (!(d0 > o.R && d1 <= o.R)) break;
          let a = Math.atan2(ny - o.y, nx - o.x) - o.rot; a -= Math.floor(a / TAU) * TAU;
          for (const sg of o.segs) {
            if (sg.dead > 0) continue;
            let da = a - sg.a; da -= Math.round(da / TAU) * TAU;
            if (Math.abs(da) > sg.w) continue;
            sg.hp -= WL[SH.w[i]].dmg * SH.mass[i] * team[0].dmg; sg.flash = 1;
            if (sg.hp <= 0) { sg.dead = o.regen; ev('barbreak', nx, ny); } else ev('bar', nx, ny);
            dead = true; break;
          }
          break;
        }
      }
    }
    if (dead) { killShot(i); i--; continue; }

    // 護城罩
    if (side !== 0 && sh0 && inBubble(sh0, nx, ny)) { ev('shieldhit', nx, ny, 0); killShot(i); i--; continue; }
    if (side !== 1 && sh1 && inBubble(sh1, nx, ny)) { ev('shieldhit', nx, ny, 1); killShot(i); i--; continue; }

    // 建築、兵、地面
    const flag = SH.flag[i];
    let near = false;
    for (let si = 0; si < structs.length; si++) {
      const st = structs[si]; if (st.dead) continue;
      const inside = nx >= st.x0 - 1 && nx <= st.x1 + 1 && ny >= st.y0 - 1 && ny <= st.y1 + 1;
      if (st.side === side && (flag & F_IN)) { if (!inside) SH.flag[i] = flag & ~F_IN; continue; }
      if (inside || (Math.max(x, nx) >= st.x0 && Math.min(x, nx) <= st.x1 && Math.max(y, ny) >= st.y0 && Math.min(y, ny) <= st.y1)) near = true;
    }
    if (near) {
      const dist = Math.hypot(nx - x, ny - y), nsub = Math.max(1, Math.ceil(dist / 1.1));
      for (let k = 1; k <= nsub && !dead; k++) {
        const px = x + (nx - x) * k / nsub, py = y + (ny - y) * k / nsub;
        for (let si = 0; si < structs.length; si++) {
          const st = structs[si]; if (st.dead) continue;
          if (px < st.x0 || px >= st.x1 || py < st.y0 || py >= st.y1) continue;
          if (st.side === side && (SH.flag[i] & F_IN)) continue;
          const ci = (((py - st.y0) / CS) | 0) * st.cols + (((px - st.x0) / CS) | 0);
          if (isSolid(st.m[ci])) { explode(px, py, WL[SH.w[i]], side, SH.mass[i], SH.flag[i], st, ci, null); dead = true; break; }
          for (const u of st.units) {
            if (!u.alive) continue;
            if (Math.abs(px - u.x) < 1.45 && py > u.y - 0.2 && py < u.y + 3.9) { explode(px, py, WL[SH.w[i]], side, SH.mass[i], SH.flag[i], null, -1, u); dead = true; break; }
          }
          if (dead) break;
        }
      }
      if (dead) { killShot(i); i--; continue; }
    }
    if (ny < S.gmax) {
      const gy = groundY(nx);
      if (ny <= gy) {
        if (y < gy - 1.5) explode(nx, ny, WL[SH.w[i]], side, SH.mass[i], SH.flag[i], null, -1, null);       // 從無地面區的下方撞上崖壁
        else { explode(nx, gy, WL[SH.w[i]], side, SH.mass[i], SH.flag[i], null, -1, null); ev('dirt', nx, gy); }
        killShot(i); i--; continue;
      }
    }
    SH.x[i] = nx; SH.y[i] = ny; SH.vx[i] = vx; SH.vy[i] = vy;
  }
  for (let s = 0; s < 2; s++) if (SH.cnt[s] > team[s].peak) team[s].peak = SH.cnt[s];
  if (SH.cnt[0] > S.stat.peak) S.stat.peak = SH.cnt[0];
}
function inBubble(st, x, y) {
  const dx = (x - st.cx) / (st.w * 0.5 + 6), dy = (y - (st.y0 + st.h * 0.42)) / (st.h * 0.6 + 6);
  return dx * dx + dy * dy < 1;
}
// 穿過倍增符：一發變 mult 發，往兩邊散開。回傳原本那一發要偏轉的角度
function gateMultiply(i, g, hx, hy, vx, vy) {
  const n = g.mult, side = SH.side[i];
  const A = Math.min(0.17, 0.028 * (n - 1) + 0.022);       // 扇形半角
  const step = n > 1 ? (2 * A) / (n - 1) : 0, self = (n - 1) >> 1;      // 原本這一發佔扇形中間的位置
  // 分裂後每一發的威力打折：數量 ×n，總威力大約 ×n^(1-SPLIT_P)
  const lin = SH.lin[i], mask = SH.mask[i], flag = SH.flag[i], wi = SH.w[i], age = SH.age[i], mass = SH.mass[i] * Math.pow(n, -SPLIT_P);
  SH.mass[i] = mass;
  const want = Math.min(n - 1, Math.max(0, SHOT_CAP - SH.cnt[side]));
  let made = 1, slot = 0;
  for (let k = 0; k < n && slot < want; k++) {
    if (k === self) continue;
    slot++;
    const a = -A + step * k + gauss() * 0.008, c = Math.cos(a), s = Math.sin(a), sp = 1 + gauss() * 0.014;
    const j = spawnShot(side, wi, hx, hy, (vx * c - vy * s) * sp, (vy * c + vx * s) * sp, mass, flag, mask, lin);
    if (j >= 0) { SH.age[j] = age; made++; }
  }
  if (made < n) SH.mass[i] = mass * (n - made + 1);               // 天上已經滿了：沒生出來的份量加在原本這一發上
  if (side < 2) { const c = S.lin[lin] = Math.min(30000, S.lin[lin] + n - 1); if (side === 0 && c > S.stat.swarm) S.stat.swarm = c; }
  g.used++; g.flash = 1; if (g.uses > 0) g.left--;
  ev('gate', hx, hy, n, g.owner, side);
  return -A + step * self;
}

/* ---------- 倍增符 ---------- */
function gateSpawn(sp) {
  const d = sp.def, spot = d.spots[sp.idx % d.spots.length];
  let bit = 0, old = 1e18; for (let b = 0; b < 30; b++) if (S.bitUse[b] < old) { old = S.bitUse[b]; bit = b; }
  S.bitUse[bit] = 1e17;
  const ang = d.ang === undefined ? Math.PI / 2 : d.ang, h = d.h || 7;
  const g = {
    b: bit, bit: 1 << bit, owner: d.owner, mult: d.mult, x: spot[0], y: spot[1], bx: spot[0], by: spot[1], h, ang, dx: Math.cos(ang) * h, dy: Math.sin(ang) * h,
    move: d.move || null, born: S.time, life: d.life || 0, uses: d.uses || 0, left: d.uses || 0, hp: d.hp || (60 + 25 * d.mult), hpMax: 0,
    flash: 0, used: 0, tog: 0, dead: false, sp, ph: spot[2] || 0
  };
  g.hpMax = g.hp; sp.g = g; S.gates.push(g);
  ev('gspawn', g.x, g.y, g.owner, g.mult);
}
function gatesStep(dt) {
  for (const sp of S.gsp) {
    if (sp.g || S.state !== 'play') continue;
    if (sp.def.phase && (!S.boss || S.boss.phase < sp.def.phase)) continue;
    if (sp.def.until && S.boss && S.boss.phase > sp.def.until) continue;
    sp.t -= dt; if (sp.t <= 0) gateSpawn(sp);
  }
  for (let i = S.gates.length - 1; i >= 0; i--) {
    const g = S.gates[i];
    if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 6);
    const mv = g.move, age = S.time - g.born;
    if (mv) {
      if (mv.t === 'bob') g.y = g.by + mv.a * tri(age / mv.per + g.ph);
      else if (mv.t === 'slide') g.x = g.bx + mv.a * tri(age / mv.per + g.ph);
      else if (mv.t === 'orbit') { const a = age / mv.per * TAU + g.ph * TAU; g.x = g.bx + Math.cos(a) * mv.rx; g.y = g.by + Math.sin(a) * mv.ry; }
    }
    let why = 0;
    if (g.hp <= 0) why = 1; else if (g.uses > 0 && g.left <= 0) why = 2; else if (g.life > 0 && age > g.life) why = 3;
    else if (g.sp.def.until && S.boss && S.boss.phase > g.sp.def.until) why = 3;
    if (why) {
      g.dead = true; S.bitUse[g.b] = S.time; S.gates.splice(i, 1);
      const sp = g.sp; sp.g = null; sp.idx++; sp.t = why === 1 ? (sp.def.regap || sp.def.gap || 12) : (sp.def.gap || 5);
      if (why === 1 && g.owner === 1) S.stat.gates++;
      ev('gbreak', g.x, g.y, g.owner, why);
    }
  }
}

/* ---------- 氣球、天燈、光球、結界、地火、落石 ---------- */
function spawnBalloon(u) {
  const st = u.st, dir = S.team[u.side].dir;
  S.objs.push({ t: 'balloon', side: u.side, x: u.x + dir * 2, y: u.y + 5, r: 3.6, hp: 30 * S.team[u.side].hpMul, alt: 45 + rnd() * 5, spd: 7.4, n: 3, cd: 0.3, flash: 0, dir, age: 0 });
  ev('launch', u.x, u.y + 5, u.side);
}
function spawnLantern() {
  const kinds = S.team[0].alive < S.team[0].units.length || S.team[1].alive < S.team[1].units.length ? ['heal', 'rage', 'charge', 'troop'] : ['heal', 'rage', 'charge'];
  const kind = kinds[ri(kinds.length)];
  const x = MID + (rnd() - 0.5) * 24;
  S.objs.push({ t: 'lantern', x, y: Math.max(groundY(x), -6) + 2, r: 3.3, hp: 1, kind, vy: 5.4, by: -1, age: 0 });
  ev('lantern', x, 0, kind);
}
function grantBonus(side, kind, x, y) {
  const T = S.team[side], st = S.st[side];
  if (kind === 'troop') {
    let u = null; for (const k of T.units) if (!k.alive) { u = k; break; }
    if (u) {
      // 回到原本的房間；房間沒了就站到那一欄最上面
      let cy = u.hy; const cols = st.cols;
      if (!(cy === 0 || isSolid(st.m[(cy - 1) * cols + u.hx])) || isSolid(st.m[cy * cols + u.hx])) { cy = 0; for (let r = st.rows - 1; r >= 0; r--) if (isSolid(st.m[r * cols + u.hx])) { cy = r + 1; break; } }
      if (cy < st.rows) {
        u.alive = true; u.hp = u.hpMax * 0.7; u.cx = u.hx; u.cy = cy; u.x = st.x0 + (u.cx + 0.5) * CS; u.y = st.y0 + cy * CS; u.fall = false; u.grp = null; u.frozen = 0; u.stun = 0; u.cool = 0.6; u.dieT = 0;
        T.alive++; ev('revive', u.x, u.y, side, u.slot);
      } else kind = 'heal';
    } else kind = 'heal';
  }
  if (kind === 'heal') repairStruct(st, 12, 0.45);
  else if (kind === 'rage') T.rageT = 9;
  else if (kind === 'charge') { T.ult.c = T.ult.need; T.shield.cd = 0; }
  ev('bonus', x, y, side, kind);
}
function objsStep(dt) {
  const objs = S.objs;
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i]; let gone = false;
    if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 5);
    switch (o.t) {
      case 'mirror': {
        o.ang += o.spin * dt; if (o.swing) o.ang = o.a0 + Math.sin(S.time * o.swing + o.ph) * o.sw;
        o.dx = Math.cos(o.ang) * o.len; o.dy = Math.sin(o.ang) * o.len;
        if (o.bob) o.y = o.by + Math.sin(S.time * 0.9 + o.ph) * o.bob;
        break;
      }
      case 'portal': if (o.mv) o.y = o.by + o.mv.a * tri(S.time / o.mv.per + (o.mv.ph || 0)); break;
      case 'geyser': {
        const p = (S.time + o.ph) % o.per, was = o.on;
        o.warn = p >= o.per - o.lead; o.on = p < o.dur;
        o.top = o.base + o.hgt * (o.on ? Math.min(1, p / 0.35) * (p > o.dur - 0.4 ? (o.dur - p) / 0.4 : 1) : 0);
        if (o.on && !was) ev('erupt', o.x, o.base, o.hgt);
        break;
      }
      case 'balloon': {
        o.age += dt;
        const tg = S.st[1 - o.side];
        if (o.y < o.alt) o.y = Math.min(o.alt, o.y + 9 * dt);
        o.x += (o.dir * o.spd + S.wind * 0.3) * dt;
        if (o.hp <= 0) { ev('pop', o.x, o.y, 0, o.side); if (o.side === 1) { const T = S.team[0]; T.ult.c = Math.min(T.ult.need, T.ult.c + 10); } gone = true; break; }
        if (o.n > 0 && o.x > tg.x0 + 2 && o.x < tg.x1 - 2 && S.state === 'play') {
          o.cd -= dt;
          if (o.cd <= 0) { o.cd = 0.8; o.n--; spawnShot(o.side, WPN.drop.i, o.x, o.y - 3.6, o.dir * 2, -6, 1, 0, 0, 0); ev('drop', o.x, o.y - 3.6); }
        }
        if (o.x < -20 || o.x > VIEW_W + 20 || (o.n <= 0 && (o.x < tg.x0 - 14 || o.x > tg.x1 + 14))) gone = true;
        const tT = S.team[1 - o.side];
        if (tT.shield.T > 0 && inBubble(tg, o.x, o.y - 2)) { ev('pop', o.x, o.y, 0, o.side); gone = true; }
        break;
      }
      case 'lantern': {
        o.age += dt; o.y += o.vy * dt; o.x += S.wind * 0.35 * dt + Math.sin(o.age * 1.3) * 1.2 * dt;
        if (o.hp <= 0) { if (o.by >= 0 && S.state === 'play') grantBonus(o.by, o.kind, o.x, o.y); gone = true; }
        else if (o.y > 72) gone = true;
        break;
      }
      case 'orb': {
        o.age += dt; o.vy -= o.g * dt; o.x += o.vx * dt; o.y += o.vy * dt;
        const tg = S.st[0];
        if (o.hp <= 0) { ev('orbdie', o.x, o.y); const T = S.team[0]; T.ult.c = Math.min(T.ult.need, T.ult.c + 14); gone = true; break; }
        if (S.team[0].shield.T > 0 && inBubble(tg, o.x, o.y)) { ev('orbdie', o.x, o.y); ev('shieldhit', o.x, o.y, 0); gone = true; break; }
        let hit = o.y <= groundY(o.x) || o.x < -10;
        if (!hit && o.x >= tg.x0 && o.x < tg.x1 && o.y >= tg.y0 && o.y < tg.y1) {
          const ci = (((o.y - tg.y0) / CS) | 0) * tg.cols + (((o.x - tg.x0) / CS) | 0);
          if (tg.m[ci] !== 0) hit = true;
          else for (const u of tg.units) if (u.alive && Math.abs(u.x - o.x) < 3 && Math.abs(u.y + 2 - o.y) < 3.5) hit = true;
        }
        if (hit) { explode(o.x, o.y, WPN.doom, 1, 1, 0, null, -1, null); gone = true; }
        break;
      }
      case 'barrier': {
        o.rot += o.spin * dt;
        for (const sg of o.segs) { if (sg.flash > 0) sg.flash = Math.max(0, sg.flash - dt * 6); if (sg.dead > 0) { sg.dead -= dt; if (sg.dead <= 0) { sg.hp = sg.hm; ev('barup', o.x, o.y); } } }
        break;
      }
    }
    if (gone) objs.splice(i, 1);
  }
  for (let i = S.marks.length - 1; i >= 0; i--) if (S.time > S.marks[i].t1) S.marks.splice(i, 1);
}
function spawnRock(x, w) {
  // 從畫面外掉下來，大約 1.5 秒後砸到；先在落點畫記號
  S.marks.push({ x, t0: S.time, t1: S.time + 1.55 });
  spawnShot(2, (w || WPN.lava).i, x + (rnd() - 0.5) * 3, 128, (rnd() - 0.5) * 2, -32, 1, F_WILD, 0, 0);
  ev('rockwarn', x, 0);
}
function spawnOrb() {
  const bossU = S.team[1].units.find((u) => u.type === 'boss' && u.alive); if (!bossU) return;
  const tg = S.st[0], tx = tg.cx + (rnd() - 0.5) * tg.w * 0.4, ty = tg.y0 + tg.h * 0.55, g = 9, tau = 4.2;
  const x = bossU.x - 3, y = bossU.y + 4;
  S.objs.push({ t: 'orb', side: 1, x, y, vx: (tx - x) / tau, vy: (ty - y + 0.5 * g * tau * tau) / tau, g, r: 4.4, hp: 62 * S.team[1].hpMul, hm: 62 * S.team[1].hpMul, flash: 0, age: 0 });
  ev('orb', x, y);
}

/* ---------- 技能 ---------- */
function simSkill(side, name) {
  if (S.state !== 'play') return false;
  const T = S.team[side];
  if (name === 'ult') {
    if (T.ult.c < T.ult.need || T.ult.T > 0) return false;
    T.ult.T = T.ult.dur; T.ult.c = 0; T.ult.uses++;
    ev('ult', S.st[side].cx, S.st[side].y0 + S.st[side].h * 0.5, side);
    return true;
  }
  if (name === 'shield') {
    if (T.shield.cd > 0 || T.shield.T > 0) return false;
    T.shield.T = T.shield.dur; T.shield.cd = T.shield.cdMax; T.shield.uses++;
    for (const u of T.units) if (u.alive) { u.frozen = 0; }           // 開罩順便解凍
    ev('shield', S.st[side].cx, S.st[side].y0 + S.st[side].h * 0.42, side);
    return true;
  }
  return false;
}
function simAim(side, vx, vy) { if (!(vx === vx) || !(vy === vy)) return; const a = clampAim(vx, vy, S.team[side].dir); S.team[side].aim[0] = a[0]; S.team[side].aim[1] = a[1]; }

/* ---------- 開局 ---------- */
function mkTeam(side) {
  return { side, dir: side === 0 ? 1 : -1, units: [], alive: 0, aim: [0, 0], rate: 1, dmg: 1, hpMul: 1, rageT: 0,
    ult: { c: 0, need: 100, T: 0, dur: 5, gain: 0.085, uses: 0 }, shield: { cd: 0, cdMax: 14, T: 0, dur: 2.6, uses: 0 }, fired: 0, peak: 0, dealt: 0, ai: null };
}
function simInit(idx, up, seed, diff, opts) {
  srand(seed || 1);
  const lv = LEVELS[idx], D = DIFFS[diff === undefined ? 1 : diff]; up = up || {};
  S.idx = idx; S.lv = lv; S.time = 0; S.frame = 0; S.state = 'play'; S.diff = diff === undefined ? 1 : diff; S.endT = 0; S.loser = -1;
  SH.n = 0; SH.cnt[0] = SH.cnt[1] = SH.cnt[2] = 0;
  S.structs = []; S.units = []; S.gates = []; S.gsp = []; S.objs = []; S.marks = []; S.pend = []; S.bitUse.fill(0);
  S.wind = 0; S.windTo = 0; S.windAI = 0; S.windT = lv.wind ? (lv.wind.at || 6) : 1e9; S.rage = 1; S.sudden = false;
  S.gpts = lv.ground || null; S.voids = lv.voids || null; S.gmax = 1; if (S.gpts) for (const p of S.gpts) if (p[1] + 1 > S.gmax) S.gmax = p[1] + 1; S.lin.fill(0); S.linNext = 1;
  S.stat = { fired: 0, peak: 0, swarm: 1, cells: 0, kills: 0, gates: 0, lost: 0 };
  const A = S.team[0] = mkTeam(0), B = S.team[1] = mkTeam(1);
  A.rate = 1 + 0.07 * (up.rate || 0); A.dmg = 1 + 0.08 * (up.dmg || 0); A.hpMul = 1 + 0.09 * (up.hp || 0);
  A.shield.dur = 2.6 + 0.3 * (up.shield || 0); A.shield.cdMax = 14 - 1.1 * (up.shield || 0);
  A.ult.gain = 0.085 * (1 + 0.14 * (up.ult || 0)); A.ult.dur = 5 + 0.4 * (up.ult || 0);
  B.rate = (lv.foe.rate || 1) * D.foeRate; B.dmg = (lv.foe.dmg || 1) * D.foeDmg; B.hpMul = (lv.foe.hp || 1) * D.foeHp;
  const dA = CASTLES[lv.me.castle], dB = CASTLES[lv.foe.castle];
  const sA = S.st[0] = mkStruct(0, dA, CASTLE_L, 0, A.hpMul, false);
  let colsB = 0; for (const r of dB.map) if (r.length > colsB) colsB = r.length;
  const sB = S.st[1] = mkStruct(1, dB, CASTLE_R - colsB * CS, 0, B.hpMul, true);
  S.structs.push(sA, sB);
  if (lv.extra) for (const e of lv.extra) { const d = CASTLES[e.castle]; let c = 0; for (const r of d.map) if (r.length > c) c = r.length; S.structs.push(mkStruct(2, d, e.x - c * CS / 2, e.y || 0, e.hp || 1, false)); }
  sA.slots.forEach((sl, k) => { const t = lv.me.crew[k]; if (t) { const u = mkUnit(0, t, sA, sl, A.hpMul); u.cool = 0.9 + k * 0.37; } });
  sB.slots.forEach((sl, k) => { const t = lv.foe.crew[k]; if (t) { const u = mkUnit(1, t, sB, sl, B.hpMul); u.cool = (lv.foe.delay || 2.5) + k * 0.45; if (u.def.spawn || u.def.flak) u.t2 += (lv.foe.delay || 2.5) * 0.5; } });
  A.alive = A.units.length; B.alive = B.units.length;
  const dist = sB.cx - sA.cx, v0 = Math.sqrt(dist * GRAV / Math.sin(2 * 0.8));
  A.aim = clampAim(Math.cos(1.16) * 36, Math.sin(1.16) * 36, 1);      // 我方一開始故意打不到，要自己調
  B.aim = clampAim(-Math.cos(0.85) * v0, Math.sin(0.85) * v0, -1);
  for (const d of (lv.gates || [])) S.gsp.push({ def: d, t: d.at || 0, idx: 0, g: null });
  for (const d of (lv.objs || [])) {
    const o = Object.assign({ flash: 0 }, d);
    if (o.t === 'mirror') { o.a0 = o.ang; o.by = o.y; o.ph = o.ph || 0; o.spin = o.spin || 0; o.dx = Math.cos(o.ang) * o.len; o.dy = Math.sin(o.ang) * o.len; o.hits = 0; }
    if (o.t === 'portal') { o.by = o.y; }
    if (o.t === 'geyser') { o.base = groundY(o.x) < -100 ? -GROUND_D : groundY(o.x); o.on = false; o.warn = false; o.top = o.base; }
    S.objs.push(o);
  }
  S.evq = (lv.events || []).map((e) => Object.assign({}, e)).sort((a, b) => a.t - b.t);
  S.rep = (lv.repeat || []).map((e) => ({ def: e, t: e.at }));
  S.boss = lv.boss ? { phase: 1, orbT: 0, metT: 0 } : null;
  aiInit(B, lv.foe.ai || {}, D);
  if (opts && opts.botA) aiInit(A, opts.botA, { aiErr: 1, aiThink: 1 });
  structHp(sA); structHp(sB);
}

/* ---------- 每一步 ---------- */
function simStep(dt) {
  S.time += dt; S.frame++;
  const lv = S.lv, play = S.state === 'play';
  // 風
  if (lv.wind && play) {
    S.windT -= dt;
    if (S.windT <= 0) {
      S.windT = lv.wind.per * (0.8 + rnd() * 0.4);
      let w = (0.35 + rnd() * 0.65) * lv.wind.max; if (S.windTo > 0 || (S.windTo === 0 && rnd() < 0.5)) w = -w; if (rnd() < 0.2) w = -w;
      S.windTo = w; ev('wind', w);
    }
  }
  S.wind += (S.windTo - S.wind) * Math.min(1, dt * 1.4);
  S.windAI += (S.wind - S.windAI) * Math.min(1, dt * 0.8);
  // 排好的事件
  while (play && S.evq.length && S.evq[0].t <= S.time) runEvent(S.evq.shift());
  if (play) for (const r of S.rep) { r.t -= dt; if (r.t <= 0) { r.t += r.def.every * (0.85 + rnd() * 0.3); runEvent(r.def); } }
  for (let i = S.pend.length - 1; i >= 0; i--) { const p = S.pend[i]; if (p.t <= S.time) { S.pend.splice(i, 1); explode(p.x, p.y, p.w, p.side, 1, 0, null, -1, null); } }
  if (play) {
    for (let s = 0; s < 2; s++) {
      const T = S.team[s];
      if (T.ult.T > 0) T.ult.T -= dt; else T.ult.c = Math.min(T.ult.need, T.ult.c + dt * 1.1);
      if (T.shield.T > 0) T.shield.T -= dt; else if (T.shield.cd > 0) T.shield.cd -= dt;
      if (T.rageT > 0) T.rageT -= dt;
      if (T.ai) aiStep(T, dt);
    }
    if (S.boss) bossStep(dt);
    const sd = lv.sudden || 150;
    if (S.time > sd) { if (!S.sudden) { S.sudden = true; ev('sudden'); } S.rage = 1 + Math.min(2.5, (S.time - sd) / 20); }
  }
  gatesStep(dt);
  unitsStep(dt);
  shotsStep(dt);
  objsStep(dt);
  for (const st of S.structs) {
    if (st.shake > 0) st.shake -= dt; if (st.hitT > 0) st.hitT -= dt;
    if (st.fin) { finStep(st, dt); continue; }
    burnStep(st, dt);
    if (st.need) structCollapse(st);
    groupsStep(st, dt);
    if (st.need) structCollapse(st);
    for (let i = 0; i < st.n; i++) if (st.brit[i] > 0) st.brit[i] -= dt;
  }
  if (play) endCheck(); else S.endT += dt;
}
function runEvent(e) {
  switch (e.do) {
    case 'say': ev('say', e.text, e.alert ? 1 : 0); break;
    case 'lantern': spawnLantern(); break;
    case 'rocks': {
      for (let k = 0; k < (e.n || 3); k++) {
        const r = rnd(); let x;
        if (r < 0.34) x = S.st[0].x0 + rnd() * S.st[0].w; else if (r < 0.68) x = S.st[1].x0 + rnd() * S.st[1].w; else x = 38 + rnd() * 36;
        spawnRock(x, e.w ? WPN[e.w] : null);
      }
      ev('rumble');
      break;
    }
    case 'gust': S.windTo = e.w; S.windT = e.hold || 5; ev('wind', e.w, 1); break;
  }
}
function bossStep(dt) {
  const B = S.boss, lb = S.lv.boss, bar = teamBar(1);
  if (B.phase === 1 && bar < lb.p2) {
    B.phase = 2; B.orbT = 3.5;
    const st = S.st[1];
    S.objs.push({ t: 'barrier', x: st.cx, y: st.y0 + st.h * 0.45, R: Math.max(st.w, st.h) * 0.62 + 4, rot: 0, spin: lb.spin || 0.5, regen: lb.regen || 7, flash: 0,
      segs: [0, 1, 2].map((k) => ({ a: k * TAU / 3, w: lb.arc || 0.62, hp: lb.segHp || 140, hm: lb.segHp || 140, dead: 0, flash: 0 })) });
    ev('phase', 2);
  } else if (B.phase === 2 && bar < lb.p3) {
    B.phase = 3; B.metT = 2.5;
    for (const u of S.team[1].units) if (u.type === 'boss') u.rateMul = 1.5;
    ev('phase', 3);
  }
  if (B.phase >= 2) { B.orbT -= dt; if (B.orbT <= 0) { B.orbT = (lb.orbEvery || 11) * (B.phase === 3 ? 0.8 : 1); spawnOrb(); } }
  if (B.phase >= 3) { B.metT -= dt; if (B.metT <= 0) { B.metT = lb.metEvery || 8; runEvent({ do: 'rocks', n: 3 }); } }
}
function endCheck() {
  let lose0 = false, lose1 = false;
  for (let s = 0; s < 2; s++) {
    const st = S.st[s]; structHp(st);
    const T = S.team[s];
    let dead = teamBar(s) <= 0 || T.alive <= 0;
    if (s === 1 && S.boss && !T.units.some((u) => u.type === 'boss' && u.alive)) dead = true;
    if (dead) { if (s === 0) lose0 = true; else lose1 = true; }
  }
  if (!lose0 && !lose1) return;
  const loser = lose1 ? 1 : 0;
  S.state = loser === 1 ? 'won' : 'lost'; S.loser = loser; S.endT = 0;
  const st = S.st[loser];
  // 整座垮掉：由下往上一塊一塊炸開
  const order = [];
  for (let i = 0; i < st.n; i++) if (st.m[i]) order.push({ i, t: ((i / st.cols) | 0) * 0.075 + rnd() * 0.12 });
  for (const g of st.groups) g.done = true;
  st.groups.length = 0;
  st.fin = { t: 0, order: order.sort((a, b) => a.t - b.t), k: 0 };
  ev('end', st.cx, st.y0 + st.h * 0.4, loser, S.team[loser].alive <= 0 ? 1 : 0);
  S.team[0].ult.T = 0; S.team[1].ult.T = 0; S.team[0].shield.T = 0; S.team[1].shield.T = 0;
  for (const u of st.units) u.grp = null;
}
function finStep(st, dt) {
  const f = st.fin; f.t += dt;
  while (f.k < f.order.length && f.order[f.k].t <= f.t) {
    const i = f.order[f.k++].i, m = st.m[i]; if (!m) continue;
    st.m[i] = 0; st.hp[i] = 0; st.burn[i] = 0; st.ver++;
    ev('cell', cellX(st, i), cellY(st, i), m, st.side, 99, st.skin);
    if (f.k % 5 === 0) ev('boom', cellX(st, i), cellY(st, i), 5, WPN.bomb.i, 2, 1);
  }
  if (f.t > 0.5) for (const u of st.units) if (u.alive) killUnit(u, 1 - st.side, 0);
  if (f.k >= f.order.length) { st.dead = true; st.hpNow = 0; }
}
