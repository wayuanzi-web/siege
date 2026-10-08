/* ===== 50-sim: 戰局。回合制：我方瞄準、發射一輪 → 等塵埃落定 → 敵方一輪 → 這一回合的災害 → 下一回合。
   不碰畫面，Node 裡也能跑（自動玩家測難度用） ===== */
const F_IN = 1, F_WILD = 2, F_FIRE = 4, F_PORT = 8;
const NS = 1400;
const SH = {
  n: 0, cnt: [0, 0, 0],
  x: new Float32Array(NS), y: new Float32Array(NS), vx: new Float32Array(NS), vy: new Float32Array(NS),
  age: new Float32Array(NS), mass: new Float32Array(NS), side: new Int8Array(NS), w: new Uint8Array(NS),
  flag: new Uint8Array(NS), mask: new Int32Array(NS), lin: new Int32Array(NS)
};
const S = {
  idx: 0, lv: null, time: 0, frame: 0, state: 'idle', diff: 1, endT: 0, loser: -1,
  phase: 'intro', turn: 0, round: 0, phaseT: 0, quietT: 0, vq: [], vqi: 0,
  st: [null, null], structs: [], blocks: [], units: [], team: [null, null], rubble: null,
  gates: [], gsp: [], bitUse: new Float64Array(30),
  objs: [], marks: [], pend: [],
  wind: 0, rage: 1, sudden: false, gpts: null, voids: null, boss: null, nburn: 0, burnT: 0, chain: 0, vol: 0, nfrag: 0, bid: 0, balls: [], hz: 0, endBar: [0, 0],
  ropes: [], pivots: [], pins: [], water: null, rollers: [], bell: null, mech: null, plats: [],
  stat: { fired: 0, peak: 0, swarm: 1, cells: 0, kills: 0, gates: 0, lost: 0, chain: 0 },
  on: null
};
const DIFFS = [
  { name: '輕鬆', aiErr: 1.6, foeHp: 0.85, foeDmg: 0.8 },
  { name: '標準', aiErr: 1.0, foeHp: 1.0, foeDmg: 1.0 },
  { name: '硬仗', aiErr: 0.6, foeHp: 1.15, foeDmg: 1.15 }
];
const CRUSH_LOAD = 1.5;   // 兵頭上壓著超過自己體重幾倍的東西，就會被壓扁（卡在頭和牆之間的石球有一部分重量是牆在撐，量到的只有一倍半多，所以門檻不能訂太高）
const BAR_TH = 0.15;       // 城樓完整度：還留在原位的磚剩不到這個比例就算全毀
const BASE_HP = 4;         // 城基的石磚特別厚：一輪齊射打不穿（不然轟一下牆腳，整座城連人一起倒，沒得打）
const BOSS_SOFT = 0.35;     // 魔王跨過換階段門檻的那一輪，超過門檻的傷害打幾折
const BASE_WT = 0.05;      // 城基的磚在城防裡只算一點點（主要看上面的樓閣）
const SPLIT_P = 0.6;       // 砲彈穿過倍增符後，每一發的威力打幾折：數量 ×n，總威力大約 ×n^(1-SPLIT_P)
const SHOT_CAP = 520;      // 每一邊同時在天上的砲彈上限（超過就改成加重）
function ev(t, a, b, c, d, e, f) { if (S.on) S.on(t, a, b, c, d, e, f); }

/* ---------- 城樓：把藍圖變成一塊一塊的磚 ---------- */
function mkCastle(side, def, x0, y0, hpMul, mirror) {
  const map = def.map, rows = map.length; let cols = 0;
  for (const r of map) if (r.length > cols) cols = r.length;
  const n = cols * rows;
  const st = {
    side, skin: side < 2 ? def.skin + '@' + side : def.skin, skinB: def.skin, x0, y0, cols, rows, n, w: cols * CS, h: rows * CS, x1: x0 + cols * CS, y1: y0 + rows * CS, cx: x0 + cols * CS / 2, hpMul,
    blocks: [], units: [], slots: [], cellB: new Array(n).fill(null), cellK: new Uint8Array(n), back: new Float32Array(n), backTo: new Uint8Array(n),
    hp0: 0, hpNow: 0, ver: 0, dead: false, fin: null, hitT: 0, loose: false
  };
  const at = (cx, cy) => (cx < 0 || cy < 0 || cx >= cols || cy >= rows) ? ' ' : (map[rows - 1 - cy][cx] || ' ');
  const used = new Uint8Array(n);
  const put = (mat, kind, cx, cy, cw, ch, ex) => {
    for (let a = 0; a < cw; a++) for (let b = 0; b < ch; b++) used[(cy + b) * cols + cx + a] = 1;
    const mx = mirror ? cols - cx - cw : cx;
    const o = { mat, kind, x: x0 + (mx + cw / 2) * CS, y: y0 + (cy + ch / 2) * CS, w: cw * CS, h: ch * CS };
    if (ex) { o.deco = ex.deco || 0; if (kind === 'roof') { o.il = (mirror ? ex.ir : ex.il) * CS; o.ir = (mirror ? ex.il : ex.ir) * CS; } if (kind === 'ball') { o.r = ex.r; o.y = y0 + cy * CS + ex.r; } if (ex.bw) { o.w = ex.bw; o.h = ex.bh; o.y = y0 + cy * CS + ex.bh / 2; } if (ex.sw) o.w = cw * CS * ex.sw; if (ex.den) o.den = ex.den; }
    const b = mkBlock(st, o);
    b.cx = mx; b.cy = cy; b.cw = cw; b.ch = ch;
    if (ex) { if (ex.dom) { b.dom = 1; b.body.getFixtureList().setFriction(0.3); } if (ex.reso) b.reso = 1; if (ex.sk) b.sk = ex.sk; if (ex.beam) { b.beam = 1; b.hp *= 12; b.hm *= 12; b.body.getFixtureList().setFriction(0.22); } if (ex.snow) b.snow = 1; }      // 天秤的大樑很滑：一歪，上面的東西就往下滑
    if (kind === 'box' && ch === 1 && cw >= 3 && !(ex && (ex.deco || ex.beam)) && (mat === M_STONE || mat === M_WOOD || mat === M_ICE || mat === M_BAMBOO || mat === M_GLASS)) segInit(b);        // 長樑、樓板：分段算耐久
    for (let a = 0; a < cw; a++) for (let bb = 0; bb < ch; bb++) { const i = (cy + bb) * cols + mx + a; st.cellB[i] = b; st.cellK[i] = 1; }
    return b;
  };
  // 擺在格子裡的小東西：dx 離格子中心多遠、by 離格子底多高（都以一格為單位）
  const prop = (mat, kind, cx, cy, dx, by, w, h, r, den) => {
    used[cy * cols + cx] = 1;
    const mx = mirror ? cols - 1 - cx : cx;
    const b = mkBlock(st, { mat, kind, x: x0 + (mx + 0.5 + (mirror ? -dx : dx)) * CS, y: y0 + (cy + by) * CS + (kind === 'ball' ? r : h / 2), w, h, r, prop: 1, den });
    b.cx = mx; b.cy = cy; b.cw = 1; b.ch = 1; st.cellK[cy * cols + mx] = 2;
    return b;
  };
  const rock = [], platC = []; let platK = '';
  const hrun = (cx, cy, ch) => { let k = 1; while (at(cx + k, cy) === ch) k++; return k; };
  const vrun = (cx, cy, ch) => { let k = 1; while (at(cx, cy + k) === ch) k++; return k; };
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    if (used[cy * cols + cx]) continue;
    const ch = at(cx, cy);
    switch (ch) {
      case '#': case 'i': {            // 兩格一塊、上下層錯開
        const m = ch === '#' ? M_STONE : M_ICE;
        if ((cx & 1) === (cy & 1) && at(cx + 1, cy) === ch) put(m, 'box', cx, cy, 2, 1); else put(m, 'box', cx, cy, 1, 1);
        break;
      }
      case 'S': put(M_STONE, 'box', cx, cy, 1, 1); break;
      case 'w': put(M_WOOD, 'box', cx, cy, 1, 1); break;
      case 'c': put(M_ICE, 'box', cx, cy, 1, 1); break;
      case 'J': put(M_IRON, 'box', cx, cy, 1, 1); break;
      case '_': put(M_STONE, 'box', cx, cy, hrun(cx, cy, ch), 1); break;
      case 'L': put(M_ICE, 'box', cx, cy, hrun(cx, cy, ch), 1); break;
      case '=': case '-': put(M_WOOD, 'box', cx, cy, hrun(cx, cy, ch), 1); break;
      case '|': put(M_WOOD, 'box', cx, cy, 1, vrun(cx, cy, ch), { sw: 0.62, sk: def.sk }); break;       // 柱子比一格窄一點
      case 'H': put(M_STONE, 'box', cx, cy, 1, vrun(cx, cy, ch), { sw: 0.74 }); break;
      case 'x': prop(M_WOOD, 'box', cx, cy, 0, 0, 0.56 * CS, 0.56 * CS); break;
      case 'X': prop(M_WOOD, 'box', cx, cy, -0.05, 0, 0.58 * CS, 0.56 * CS); prop(M_WOOD, 'box', cx, cy, 0.05, 0.565, 0.46 * CS, 0.42 * CS); break;
      case 'u': prop(M_CLAY, 'box', cx, cy, 0, 0, 0.46 * CS, 0.64 * CS); break;
      case 'o': prop(M_WOOD, 'ball', cx, cy, 0, 0, 0, 0, 0.36 * CS); break;
      case 'O': prop(M_ROCK, 'ball', cx, cy, 0, 0, 0, 0, 0.47 * CS, 4); break;
      case 'm': prop(M_STONE, 'box', cx, cy, -0.3, 0, 0.32 * CS, 0.5 * CS); prop(M_STONE, 'box', cx, cy, 0.3, 0, 0.32 * CS, 0.5 * CS); break;
      case 'I': put(M_IRON, 'box', cx, cy, 1, vrun(cx, cy, ch)); break;
      case '^': case '~': case 'n': {
        const k = hrun(cx, cy, ch); let above = false;
        for (let a = 0; a < k; a++) if (at(cx + a, cy + 1) !== ' ') above = true;
        const ins = above ? 0.5 : Math.min(1.4, k / 2 - 0.25);
        put(ch === 'n' ? M_GLASS : M_ROOF, 'roof', cx, cy, k, 1, { il: ins, ir: ins });          // n：琉璃屋頂
        break;
      }
      case 'D': { const w = hrun(cx, cy, ch), h = vrun(cx, cy, ch); put(M_WOOD, 'box', cx, cy, w, h, { deco: 1 }); break; }
      case 'K': put(M_KEG, 'box', cx, cy, 1, 1, { bw: CS * 0.78, bh: CS * 0.88 }); break;
      // 第二篇的新東西
      case 'A': { used[cy * cols + cx] = 1; rock.push(cx); rock.push(cy); break; }                 // 岩壁（不會動、打不壞，跟地面一樣）
      case 'R': case 'B': { used[cy * cols + cx] = 1; platC.push(cx, cy); platK = ch; break; }      // 浮島的岩石、船身：整片連成一塊會動的東西（見 48-mech 的 mkPlat）
      case '*': put(M_SNOW, 'box', cx, cy, 1, 1, { snow: 1 }); break;                              // 積雪
      case '!': put(M_BAMBOO, 'box', cx, cy, 1, vrun(cx, cy, ch), { sw: 0.42, sk: def.sk }); break;          // 竹樁、竹竿（細）
      case 'y': put(M_BAMBOO, 'box', cx, cy, hrun(cx, cy, ch), 1); break;                         // 竹排（同一列連著的算一整片）
      case 'g': put(M_GLASS, 'box', cx, cy, hrun(cx, cy, ch), 1); break;                          // 琉璃板
      case 'G': put(M_GLASS, 'box', cx, cy, 1, vrun(cx, cy, ch), { sw: 0.56 }); break;           // 琉璃柱
      case 'q': put(M_GLASS, 'box', cx, cy, 1, 1); break;                                         // 單塊琉璃
      case 'Q': put(M_GLASS, 'box', cx, cy, 1, 1, { reso: 1, sw: 0.5, den: 1.2 }); break;        // 共鳴晶柱
      case 'Z': put(M_WOOD, 'box', cx, cy, hrun(cx, cy, ch), 1, { beam: 1, den: 0.9 }); break;   // 天秤的大樑（打不斷）
      case 'P': put(M_STONE, 'box', cx, cy, 1, vrun(cx, cy, ch), { sw: 0.42, dom: 1 }); break;   // 石碑（骨牌）
      case 'h': put(M_WOOD, 'box', cx, cy, 1, 1, { sw: 0.3 }); break;                            // 短短的木樁（斜撐、欄杆）
      case ' ': break;
      default: {
        const mx = mirror ? cols - 1 - cx : cx; st.cellK[cy * cols + mx] = 2;
        if (ch >= '1' && ch <= '9') st.slots.push({ slot: +ch, cx: mx, cy });
      }
    }
  }
  if (platC.length) mkPlat(st, platC, platK, def);
  // 火藥桶那一格也算屋內
  for (const b of st.blocks) if (b.mat === M_KEG && !b.prop) { st.cellK[b.cy * cols + b.cx] = 2; st.cellB[b.cy * cols + b.cx] = null; }
  // 岩壁：一列一列併成長方形，掛在一個不會動的物體上（跟地面同一類，砲彈打到就跟打到地面一樣）
  if (rock.length) {
    const rb = PH.world.createBody({ type: 'static' }); st.rock = []; st.rockBody = rb; st.rockTag = { isRock: true, st, side };
    const isR = (cx, cy) => { for (let i = 0; i < rock.length; i += 2) if (rock[i] === cx && rock[i + 1] === cy) return true; return false; };
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      if (!isR(cx, cy) || (cx > 0 && isR(cx - 1, cy))) continue;
      let k = 1; while (isR(cx + k, cy)) k++;
      const mx = mirror ? cols - cx - k : cx;
      rb.createFixture({ shape: new PL.Box(k * CS / 2, CS / 2, { x: x0 + (mx + k / 2) * CS, y: y0 + (cy + 0.5) * CS }, 0), friction: 0.85, restitution: 0, filterCategoryBits: CAT_TERR, userData: st.rockTag });
      for (let a = 0; a < k; a++) { const ix = mirror ? cols - 1 - (cx + a) : cx + a; st.cellK[cy * cols + ix] = 3; st.rock.push(ix, cy); }
    }
  }
  // 城基：從最底下往上數，整列都沒有房間的那幾列
  let base = 0; while (base < rows) { let room = false; for (let cx = 0; cx < cols; cx++) if (st.cellK[base * cols + cx] === 2) room = true; if (room) break; base++; }
  if (base >= rows || def.nobase) base = 0;
  st.base = base;
  for (const b of st.blocks) {
    const low = b.cy + b.ch <= base;
    if (low && !b.prop && b.mat !== M_WOOD && b.mat !== M_BAMBOO && b.mat !== M_GLASS) { b.hp *= BASE_HP; b.hm *= BASE_HP; b.base = true; if (b.seg) { b.segM *= BASE_HP; for (let k = 0; k < b.cw; k++) b.seg[k] *= BASE_HP; } }
    b.wt = b.mat === M_KEG || b.prop || b.beam || b.snow ? 0 : low ? BASE_WT : 1; st.hp0 += b.hm * b.wt;
  }
  st.hpNow = st.hp0; st.slots.sort((a, b) => a.slot - b.slot);
  // 城基實際佔的範圍（最底下一列有磚的地方）：露台之類伸出去的部分底下沒有地基
  { let c0 = cols, c1 = -1; for (let cx = 0; cx < cols; cx++) if (st.cellK[cx] && st.cellK[cx] !== 3) { if (cx < c0) c0 = cx; if (cx > c1) c1 = cx; } st.fx0 = c1 < 0 ? x0 : x0 + c0 * CS; st.fx1 = c1 < 0 ? st.x1 : x0 + (c1 + 1) * CS; }
  st.nofound = !!def.nofound;
  for (let i = 0; i < n; i++) { st.backTo[i] = st.cellK[i] === 1 || st.cellK[i] === 2 ? 1 : 0; st.back[i] = st.backTo[i]; }
  // 繩索、鐵鍊、吊著的東西、天秤的支點（座標照藍圖寫的：第幾欄、由上往下第幾列、格子裡的位置 0..1）
  st.def = def; st.mirror = mirror;
  if (def.hangs) for (const h of def.hangs) mkHang(st, h);
  if (def.ropes) for (const r of def.ropes) mkRopeDef(st, r);
  if (def.pivot) mkPivot(st, def.pivot);
  if (def.pins) for (const pd of def.pins) mkPin(st, pd);
  if (def.fuse) mkFuse(st, def.fuse);
  if (def.tethers) for (const td of def.tethers) mkTether(st, td);
  return st;
}
// 每隔幾步檢查：哪些磚還在原位（算城防）、哪些格子後面還看得到屋內的暗色背景
function castleScan(st) {
  let hp = 0; const { cols, rows, cellB, cellK, backTo } = st;
  // 蓋在浮島、船上的城：跟著底下那一塊一起晃、一起歪的不算離開原位（用那一塊的座標來量）
  const P = st.plat; let pc = 1, ps = 0, ppx = 0, ppy = 0, pa = 0;
  if (P && P.body) { const pp = P.body.getPosition(); pa = P.body.getAngle() - P.a0; pc = Math.cos(pa); ps = Math.sin(pa); ppx = pp.x; ppy = pp.y; }
  for (const b of st.blocks) {
    if (b.dead || b.frag) continue;
    const p = b.body.getPosition(); let px = p.x, py = p.y;
    if (P) { const ex = p.x - ppx, ey = p.y - ppy; px = P.x0 + ex * pc + ey * ps; py = P.y0 - ex * ps + ey * pc; }
    const a = Math.abs(b.body.getAngle() - pa), was = b.inPlace, dx = Math.abs(px - b.x0), dy = Math.abs(py - b.y0);
    // 離開原位之後，要回到很接近原位才算回來（不然被震得晃回來一下，城防條會自己往上跳）
    b.inPlace = !b.gone && (was ? dx < CS * 0.5 && dy < CS * 0.5 && a < 0.4 : dx < CS * 0.2 && dy < CS * 0.2 && a < 0.15);
    b.snug = b.inPlace && dx < CS * 0.25 && dy < CS * 0.25 && a < 0.1;          // 幾乎沒動：背後的屋內暗色才畫（滑開了、歪了就看得到天）
    if (was && !b.inPlace) { chainCount(b); st.ver++; b.lost = true; }
    // 離開過原位的磚，就算被震回來，也不再算進城樓完整度（不然上方那一條會自己往回跳）
    if (b.inPlace && !b.lost) hp += b.hp * b.wt;
  }
  st.hpNow = hp;
  // 屋內的暗色背景：頭頂上還有東西蓋著的格子才畫。地板破了一格不影響（還是在屋裡），天花板那一格沒了就透天
  for (let cx = 0; cx < cols; cx++) {
    let above = false;
    for (let cy = rows - 1; cy >= 0; cy--) {
      const i = cy * cols + cx, k = cellK[i];
      backTo[i] = (k === 1 || k === 2) && above ? 1 : 0;
      if (k === 1) { const b = cellB[i]; if (b && !b.dead && b.snug) above = true; } else if (k === 3) above = true; else if (k === 0) above = false;
    }
  }
}
// 城樓完整度（0..1）：還留在原位、沒被打壞的磚
function structBar(side) { const st = S.st[side]; return clamp((st.hpNow / st.hp0 - BAR_TH) / (1 - BAR_TH), 0, 1); }
/* 城防（0..1），畫面上方那一條：主要看守軍還剩多少血（七成五），城樓完整度佔兩成五；守軍全倒就是 0（城破）。
   魔王城例外：只看魔王的血量 */
function teamBar(side) {
  const T = S.team[side]; if (T.alive <= 0) return 0;
  if (side === 1 && S.boss) { const bu = bossUnit(); return bu && bu.alive ? clamp(bu.hp / bu.hpMax, 0, 1) : 0; }
  let hp = 0, hm = 0; for (const u of T.units) { hm += u.hpMax; if (u.alive) hp += Math.max(0, u.hp); }
  return 0.75 * hp / hm + 0.25 * structBar(side);
}

/* ---------- 兵 ---------- */
function mkUnit(side, type, st, slot, hpMul) {
  const def = UNIT[type], T = S.team[side];
  const u = {
    isUnit: true, side, type, def, st, slot: slot.slot, hx: 0, hy: 0, x: st.x0 + (slot.cx + 0.5) * CS, y: st.y0 + slot.cy * CS, vx: 0, vy: 0,
    hp: def.hp * hpMul, hpMax: def.hp * hpMul, frozen: 0, stun: 0, alive: true, air: false, airT: 0, recoil: 0, hurtT: 0, tilt: 0,
    w: def.w ? WPN[def.w] : null, flakN: 0, flakT: 0, dieT: 0, body: null, mass: 1, bw: 0, bh: 0, stamp: 0, dazed: 0, outT: 0, held: false,
    loadJ: 0, loadT: 0, load: 0, sepT: 0, sepNow: false, sepVol: -1, edge: 0, edgeT: 0, edgeV: -1, edgeD: 0, roofOn: null, hcV: -1, hcN: 0, rox: 0
  };
  u.hx = u.x; u.hy = u.y; u.hx0 = u.x; u.hy0 = u.y;           // hx0、hy0：原本站的位置（浮島、船上的城用它自己的座標）
  mkUnitBody(u);
  st.units.push(u); T.units.push(u); S.units.push(u);
  return u;
}
function hurtUnit(u, d, side, kind) {
  if (!u.alive || d <= 0) return;
  if (S.state !== 'play' && u.side !== S.loser) return;          // 勝負已分：贏的那一邊不會再受傷（星數、損兵都以分出勝負那一刻為準）
  // 第二篇敵軍火力大：第一回合敵軍打到我方的兵只算幾成（開場不會還沒打就先倒一個）
  if (u.side === 0 && side === 1 && S.round <= 1 && S.lv.foe.open) d *= S.lv.foe.open * (kind === K_CRUSH ? 0.5 : 1);
  const boss = u.def.big && S.boss ? S.boss : null;
  if (boss) {
    /* 魔王換階段：血一掉過門檻就馬上換（第二階段的結界當場張開）。跨過門檻的那一輪，超過的傷害只算三成五，
       而且最多打到下一個門檻上面一點：連珠砲穿過倍增符一輪幾百點，不這樣會直接跳過結界和暴怒，什麼都沒看到就打完了 */
    const lb = S.lv.boss;
    if (boss.softVol === S.vol) d *= BOSS_SOFT;
    else {
      const th = u.hpMax * (boss.phase === 1 ? lb.p2 : boss.phase === 2 ? lb.p3 : -1);
      if (th > 0 && u.hp - d < th) { const pre = Math.max(0, u.hp - th); d = pre + (d - pre) * BOSS_SOFT; boss.softVol = S.vol; boss.softLo = u.hpMax * (boss.phase === 1 ? lb.p3 + 0.05 : 0.08); }
    }
    if (boss.softVol === S.vol && u.hp - d < boss.softLo) d = Math.max(0, u.hp - boss.softLo);
    if (d <= 0) { u.hurtT = 0.25; return; }
  }
  u.hp -= d; u.hurtT = 0.25;
  if (boss && u.hp > 0) bossPhase(u);
  if (side < 2 && side !== u.side) { const T = S.team[side]; T.ult.c = Math.min(T.ult.need, T.ult.c + d * T.ult.gain * 0.6 * ultK(side)); }
  if (u.hp <= 0) killUnit(u, side, kind === K_CRUSH ? 1 : kind === K_FIRE ? 3 : 0);
}
// how: 0 被打倒、1 被砸到或摔到、3 燒到、4 掉下深淵、5 被轟出自己的城、6 被轟飛出戰場、7 掉進河裡被沖走
function killUnit(u, side, how) {
  if (!u.alive) return;
  u.alive = false; u.hp = 0;
  S.team[u.side].alive--;
  if (u.side === 1) S.stat.kills++; else S.stat.lost++;
  ev('udie', u.x, u.y + 1.8, u.side, u.type, how, u.slot);
  if (u.body) { if (PH.inStep) PH.kill.push(u.body); else PH.world.destroyBody(u.body); u.body = null; }
}
// ax, ay：按下發射那一刻的角度和力道（開火之後再改瞄準，不會影響已經排好的這一輪）
function unitFire(u, T, w, ax, ay) {
  const dir = T.dir, big = u.def.big ? MUZ_BIG : 1, mx = u.x + dir * 1.3 * big, my = u.y + 2.3 * big;
  if (w.phys) {
    spawnBoulder(u, T, w, ax * (1 + gauss() * 0.008), ay * (1 + gauss() * 0.008));
    T.fired += 1; if (u.side === 0) S.stat.fired += 1;
    u.recoil = 1; ev('fire', mx, my, u.side, w.i, u.slot);
    return;
  }
  const n = w.fan || 1;
  for (let k = 0; k < n; k++) {
    const a = (n > 1 ? (k - (n - 1) / 2) * 0.085 : 0) + gauss() * 0.01, c = Math.cos(a), s = Math.sin(a), sp = 1 + gauss() * 0.008;
    const vx = (ax * c - ay * s * dir) * sp, vy = (ay * c + ax * s * dir) * sp;
    spawnShot(u.side, w.i, mx, my, vx, vy, 1, F_IN, 0, 1);
  }
  T.fired += n; if (u.side === 0) S.stat.fired += n;
  u.recoil = 1;
  ev('fire', mx, my, u.side, w.i, u.slot);
}
function unitsStep(dt) {
  for (const u of S.units) {
    if (!u.alive) { if (u.dieT < 3) u.dieT += dt; continue; }
    const p = u.body.getPosition(), v = u.body.getLinearVelocity();
    u.x = p.x; u.y = p.y - u.bh / 2; u.vx = v.x; u.vy = v.y;
    u.air = u.body.isAwake() && (Math.abs(v.y) > 5 || Math.abs(v.x) > 7);
    // 被炸飛或腳下空了：叫一聲（落地後才會再叫）
    if (u.air) { if (u.airT === 0 && (v.y < -9 || v.y > 12 || Math.abs(v.x) > 12)) { u.airT = 1; ev('yelp', u.x, u.y + 5, u.def.big ? 1 : 0, u.side); } } else if (u.airT > 0) { u.airT -= dt * 2; if (u.airT < 0) u.airT = 0; }
    u.tilt += ((u.air ? clamp(v.x * 0.035, -0.9, 0.9) : 0) - u.tilt) * Math.min(1, dt * 9);
    if (u.hurtT > 0) u.hurtT -= dt; if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 5);
    if (u.flakT > 0) u.flakT -= dt;
    // 這些「站不住、撐不住」的規則只在砲擊進行中才往下走：瞄準的時候不會有人突然被壓扁、突然滑下去
    const act = S.state !== 'play' || S.phase === 'volley' || S.phase === 'resolve' || S.phase === 'hazard';
    /* 被重的東西壓住（卡在頭上的石球、整片樓板、一堆瓦礫）：頭上撐著超過自己體重一倍半、撐了一會，就一直扣血直到被壓扁。
       整堆東西靜止「睡著」之後物理引擎不再回報接觸的力道：那時用睡著前量到的（東西還壓在那裡，不會因為不動了就沒事）。
       魔王撐得住，不算（他另外有「被屋頂、樓板砸到頭」的傷害）。
       掉下來的屋瓦是脆的：壓在頭上就碎掉、順著頭兩邊滑下去，不會整片完好地蓋在頭上把人壓扁
       （屋頂還好好的在原位、是兵自己被震得跳起來撞到的，不算——那樣屋頂不會碎） */
    if (u.roofOn) { const r = u.roofOn; u.roofOn = null; if (act && !r.dead && roofDown(r)) blockKill(r, S.phase === 'hazard' || r.side === S.turn ? 2 : S.turn, K_CRUSH); }
    if (u.body.isAwake()) u.load += (u.loadJ / (dt * u.mass * GRAV) - u.load) * 0.3;
    u.loadJ = 0;
    if (act) {
      if (!u.def.big && u.load > CRUSH_LOAD) { u.loadT += dt; if (u.loadT > 0.3) {
        // 第二篇第一回合（敵軍的第一輪）：壓在我方兵頭上的碎磚直接裂開掉下去，不會還沒開打就被壓扁
        if (u.side === 0 && S.round <= 1 && S.lv.foe.open && headClearUnit(u)) { u.loadT = 0; continue; }
        hurtUnit(u, 120 * dt, S.phase === 'hazard' ? 2 : 1 - u.side, K_CRUSH); if (!u.alive) continue; } }
      else if (u.loadT > 0) u.loadT = Math.max(0, u.loadT - dt * 2);
    }
    /* 站在邊緣、腳底正中間已經懸空，只剩半邊鞋底踩著東西（另外半邊底下是空的）：站不住，往空的那一邊滑下去。
       身體不會倒，所以沒有這一條的話，只要鞋底還勾著一點邊，大半個人就會懸在半空中站得好好的（睡著了也一樣：叫醒再推）。
       跨在一條比鞋底窄的縫上、兩個半邊都踩得到東西，就站得住，不推；只有一個半邊踩著的話，往另一邊滑：
       縫比鞋底窄，滑一點點兩邊就都踩到了，變成跨在縫上；縫比鞋底寬，就掉進縫裡。
       推的力道很小、速度有上限，推一陣子推不動就算了，不會把人甩出去，也不會來回推個不停 */
    if (act && !u.air) {
      if (((S.frame + u.slot * 3) & 3) === 0) {
        const fy = u.y, hw = u.bw * 0.5;
        const under = (dx) => { let h = false; PH.world.rayCast({ x: u.x + dx, y: fy + 0.6 }, { x: u.x + dx, y: fy - 0.9 }, (f, pt, n, fr) => { const o = f.getUserData(); if (o && o.isUnit) return -1; h = true; return fr; }); return h; };
        let e = 0;
        if (!under(0)) {
          const half = (d) => under(d * hw * 0.3) || under(d * hw * 0.58);          // 鞋底寬 ±0.6 個半身寬
          const L = half(-1), R = half(1); e = L && !R ? 1 : R && !L ? -1 : 0;
          // 同一輪砲擊裡不回頭推：滑過頭、換成另一邊半懸空的話就停在那裡（不然在比身體略寬的縫上會左右來回抖）
          if (e) { if (u.edgeV !== S.vol) { u.edgeV = S.vol; u.edgeD = e; } else if (e !== u.edgeD) e = 0; }
        }
        u.edge = e;
      }
      if (u.edge && u.edgeT < 1.2) { u.edgeT += dt; if (u.edge * v.x < 2.2) u.body.applyLinearImpulse({ x: u.edge * u.mass * GRAV * 1.2 * dt, y: 0 }, u.body.getWorldCenter(), true); }
      else if (!u.edge && u.edgeT > 0) u.edgeT = Math.max(0, u.edgeT - dt * 0.3);
    } else if (!act) u.edge = 0;
    // 掉下深淵、飛出戰場兩邊：出局
    if (u.y < -26 || u.x < -GUT + 1.5 || u.x > VIEW_W + GUT - 1.5) { if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, u.y < -26 ? 4 : 6); continue; }
    // 掉進河裡：被水沖走（身體一半泡進水裡、泡了一下子）
    if (u.wet > 0.45) { u.wetT = (u.wetT || 0) + dt; if (u.wetT > 0.5) { if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, 7); continue; } } else if (u.wetT) u.wetT = 0;
    // 被轟出自己的城、落地站定了：也算出局（守不了城了）。魔王會自己飛回去
    const st = u.st, ux = st.plat ? platLocal(st, u.x, u.y).x : u.x;
    if ((ux < st.x0 - OUT_M || ux > st.x1 + OUT_M) && !u.air) { u.outT += dt; if (u.outT > 0.6) { if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, 5); } } else u.outT = 0;
  }
  /* 兵跟兵不碰撞，所以掉到同一個地方會疊在一起：往兩邊慢慢推開（魔王不動，推小兵）。只在砲擊進行中推。
     推的方向前面沒有地可以踩就不推（寧可兩個人擠著，也不要把人推下去）；推了兩秒還分不開（被瓦礫擋住、擠在一格寬的小隔間裡）
     這一輪就先不推了，不然永遠靜不下來、回合結束不了——下一輪砲擊再試（擋路的東西可能已經被炸開） */
  const us = S.units;
  if (S.state !== 'play' || S.phase === 'volley' || S.phase === 'resolve' || S.phase === 'hazard') {
    const floorAt = (x, y) => { let h = false; PH.world.rayCast({ x, y: y + 0.6 }, { x, y: y - 1.3 }, (f, pt, n, fr) => { const o = f.getUserData(); if (o && o.isUnit) return -1; h = true; return fr; }); return h; };
    for (let i = 0; i < us.length; i++) { const u = us[i]; u.sepNow = false; if (u.sepVol !== S.vol) { u.sepVol = S.vol; u.sepT = 0; } }
    for (let i = 0; i < us.length; i++) {
      const a = us[i]; if (!a.alive) continue;
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j]; if (!b.alive) continue;
        const dx = b.x - a.x, ox = (a.bw + b.bw) * 0.5 * 0.9 - Math.abs(dx), oy = (a.bh + b.bh) * 0.5 * 0.85 - Math.abs(b.y + b.bh * 0.5 - a.y - a.bh * 0.5);
        if (ox <= 0 || oy <= 0) continue;
        a.sepNow = b.sepNow = true;
        if (a.sepT > 2 || b.sepT > 2) continue;
        const dir = dx > 0.01 ? 1 : dx < -0.01 ? -1 : (a.slot + a.side * 9 < b.slot + b.side * 9 ? 1 : -1), acc = GRAV * 1.25 * dt;
        const push = (u, d, k) => { if (u.def.big || u.air || d * u.vx > 2.2 || !floorAt(u.x + d * (u.bw * 0.5 + 0.5), u.y)) return; u.body.applyLinearImpulse({ x: d * acc * k * u.mass, y: 0 }, u.body.getWorldCenter(), true); };
        push(a, -dir, b.def.big ? 2 : 1); push(b, dir, a.def.big ? 2 : 1);
      }
    }
    for (let i = 0; i < us.length; i++) { const u = us[i]; if (u.sepNow) u.sepT += dt; }
  }
}

// 這片屋瓦是不是已經「掉下來」了：比原位低了一截、歪了、或橫移了。還好好的架在柱子上的不算
function roofDown(b) { const p = b.body.getPosition(); return b.y0 - p.y > 0.22 || Math.abs(p.x - b.x0) > 0.45 || Math.abs(b.body.getAngle()) > 0.1; }
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
// 線段 p→q 跟線段 a→b 有沒有相交；有的話回傳 p→q 上的比例，沒有回傳 -1
function segHit(px, py, qx, qy, ax, ay, bx, by) {
  const rx = qx - px, ry = qy - py, sx = bx - ax, sy = by - ay, den = rx * sy - ry * sx;
  if (den === 0) return -1;
  const t = ((ax - px) * sy - (ay - py) * sx) / den, u = ((ax - px) * ry - (ay - py) * rx) / den;
  return (t >= 0 && t <= 1 && u >= 0 && u <= 1) ? t : -1;
}
function inBubble(st, x, y) {
  const c = stCenter(st), dx = (x - c.x) / (st.w * 0.5 + 6), dy = (y - c.y) / (st.h * 0.6 + 6);
  return dx * dx + dy * dy < 1;
}
function shotsStep(dt) {
  const wind = S.wind, gates = S.gates, objs = S.objs, team = S.team;
  const sh0 = team[0].shield.on ? S.st[0] : null, sh1 = team[1].shield.on ? S.st[1] : null;
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
      if (side === 2) continue;
      // 對方的倍增符：會擋砲彈，但打得掉
      g.hp -= WL[SH.w[i]].dmg * SH.mass[i] * team[side].dmg; g.flash = 1;
      ev('ghit', hx, hy, g.owner);
      dead = true;
    }
    if (dead) { killShot(i); i--; continue; }

    // 機關：鏡子、傳送門、地火、氣球、天燈、光球、結界
    for (let oi = 0; oi < objs.length && !dead; oi++) {
      const o = objs[oi];
      switch (o.t) {
        case 'mirror': {
          if (Math.abs(nx - o.x) > o.len + 4 && Math.abs(x - o.x) > o.len + 4) break;
          const t = segHit(x, y, nx, ny, o.x - o.dx, o.y - o.dy, o.x + o.dx, o.y + o.dy);
          if (t < 0) break;
          const hx = x + (nx - x) * t, hy = y + (ny - y) * t;
          const nxn = -o.dy / o.len, nyn = o.dx / o.len, dot = vx * nxn + vy * nyn;
          vx -= 2 * dot * nxn; vy -= 2 * dot * nyn;
          const sp = Math.hypot(vx, vy) || 1;
          nx = hx + vx / sp * 0.6; ny = hy + vy / sp * 0.6; x = nx; y = ny;
          SH.flag[i] = (SH.flag[i] | F_WILD) & ~F_IN; o.flash = 1;
          ev('ping', hx, hy);
          break;
        }
        case 'portal': {
          if (o.owner !== side || (SH.flag[i] & F_PORT)) break;
          const dx = nx - o.x, dy = ny - o.y;
          if (dx * dx + dy * dy > o.r * o.r) break;
          const sp = Math.max(40, Math.hypot(vx, vy)), a = o.ea + (rnd() - 0.5) * o.ej;
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
        case 'balloon': case 'orb': case 'tether': {
          if (o.side === side || o.hp <= 0) break;
          const dx = nx - o.x, dy = ny - o.y;
          if (dx * dx + dy * dy > o.r * o.r) break;
          const w = WL[SH.w[i]], d = w.dmg * SH.mass[i] * (side < 2 ? team[side].dmg : 1);
          o.hp -= d; o.flash = 1;
          if (w.r > 0) physExplode(nx, ny, w, side, SH.mass[i], SH.flag[i], null, vx, vy); else ev('tick', nx, ny, side);
          if (o.t === 'tether' && o.hp <= 0) tetherPop(o, side);
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
          const sg = barrierSeg(o, nx, ny); if (!sg) break;
          sg.hp -= WL[SH.w[i]].dmg * SH.mass[i] * team[0].dmg; sg.flash = 1;
          if (sg.hp <= 0) { sg.dead = o.regen; ev('barbreak', nx, ny); } else ev('bar', nx, ny);
          dead = true;
          break;
        }
      }
    }
    if (dead) { killShot(i); i--; continue; }

    // 繩索、鐵鍊：箭射到就斷一點、繼續不了；會爆的砲彈在繩子上炸開
    if (S.ropes.length && side < 2) {
      const rc = ropeCross(x, y, nx, ny, side);
      if (rc) {
        const r = rc.r, hx = x + (nx - x) * rc.t, hy = y + (ny - y) * rc.t, w = WL[SH.w[i]];
        if (w.r <= 0) { ropeHurt(r, w.dmg * SH.mass[i] * team[side].dmg * S.rage, w.kind, side); ev('boom', hx, hy, 0, w.i, side, SH.mass[i]); }
        else physExplode(hx, hy, w, side, SH.mass[i], SH.flag[i], null, vx, vy);
        killShot(i); i--; continue;
      }
    }
    // 護城罩
    if (side !== 0 && sh0 && inBubble(sh0, nx, ny)) { ev('shieldhit', nx, ny, 0); killShot(i); i--; continue; }
    if (side !== 1 && sh1 && inBubble(sh1, nx, ny)) { ev('shieldhit', nx, ny, 1); killShot(i); i--; continue; }

    // 自己城裡的磚不擋自己的砲：飛出城樓的範圍之後才會撞到（散落在外面的碎磚照樣會擋）
    // （這一步的起點還在城裡，整段都當作還沒出城；先判定撞擊，再決定下一步算不算出城）
    const flag = SH.flag[i], own = (flag & F_IN) !== 0;
    if (own && side < 2) {
      const st = S.st[side];
      if (SH.age[i] > 0.3 && (nx < st.x0 - 1 || nx > st.x1 + 1 || ny > st.y1 + 4)) SH.flag[i] = flag & ~F_IN;
    }
    // 磚、兵、地面
    const hit = rayShot(x, y, nx, ny, side, own);
    const wt = S.water ? waterCross(x, y, nx, ny) : -1;
    if (hit && !(wt >= 0 && wt < RAY.f)) {
      physExplode(RAY.x, RAY.y, WL[SH.w[i]], side, SH.mass[i], flag, RAY.o, vx, vy);
      if (hit === 1) ev(RAY.o && RAY.o.isHull ? 'splinter' : 'dirt', RAY.x, RAY.y);
      killShot(i); i--; continue;
    }
    if (wt >= 0) {
      const hx = x + (nx - x) * wt;
      physExplode(hx, S.water.y, WL[SH.w[i]], side, SH.mass[i], flag, null, vx, vy);
      ev('splash', hx, S.water.y, 1, 2);
      killShot(i); i--; continue;
    }
    SH.x[i] = nx; SH.y[i] = ny; SH.vx[i] = vx; SH.vy[i] = vy;
  }
  for (let s = 0; s < 2; s++) if (SH.cnt[s] > team[s].peak) team[s].peak = SH.cnt[s];
  if (SH.cnt[0] > S.stat.peak) S.stat.peak = SH.cnt[0];
  flakStep(dt);
}
// 穿過倍增符：一發變 mult 發，往兩邊散開。回傳原本那一發要偏轉的角度
function gateMultiply(i, g, hx, hy, vx, vy) {
  const n = g.mult, side = SH.side[i];
  const A = Math.min(0.15, 0.022 * (n - 1) + 0.02);        // 扇形半角
  const step = n > 1 ? (2 * A) / (n - 1) : 0, self = (n - 1) >> 1;      // 原本這一發佔扇形中間的位置
  // 分裂後每一發的威力打折
  const lin = Math.min(1e6, SH.lin[i] * n), mask = SH.mask[i], flag = SH.flag[i], wi = SH.w[i], age = SH.age[i], mass = SH.mass[i] * Math.pow(n, -SPLIT_P);
  SH.mass[i] = mass; SH.lin[i] = lin;      // lin：這一發是原本那一發的幾分之一（一發變成了幾發）
  const want = Math.min(n - 1, Math.max(0, SHOT_CAP - SH.cnt[side]));
  let made = 1, slot = 0;
  for (let k = 0; k < n && slot < want; k++) {
    if (k === self) continue;
    slot++;
    const a = -A + step * k + gauss() * 0.008, c = Math.cos(a), s = Math.sin(a), sp = 1 + gauss() * 0.014;
    const j = spawnShot(side, wi, hx, hy, (vx * c - vy * s) * sp, (vy * c + vx * s) * sp, mass, flag, mask, lin);
    if (j >= 0) { SH.age[j] = age; made++; }
  }
  if (made < n) SH.mass[i] = mass * (n - made + 1);         // 天上已經滿了：沒生出來的份量加在原本這一發上
  if (side === 0 && lin > S.stat.swarm) S.stat.swarm = lin;
  g.used++; g.flash = 1;
  ev('gate', hx, hy, n, g.owner, side);
  return -A + step * self;
}
// 防空弩：對方這一輪的砲彈飛進射程，一發一發射下來（每一輪有次數上限）
function flakStep(dt) {
  for (const u of S.units) {
    if (!u.alive || !u.def.flak || u.flakN <= 0 || u.flakT > 0 || u.frozen > 0 || u.stun > 0) continue;
    const R2 = 30 * 30, ux = u.x, uy = u.y + 2.4; let best = -1, bd = 1e9;
    for (let i = 0; i < SH.n; i++) {
      if (SH.side[i] === u.side) continue;
      const dx = SH.x[i] - ux, dy = SH.y[i] - uy, d2 = dx * dx + dy * dy;
      if (d2 > R2 || d2 >= bd || dx * SH.vx[i] + dy * SH.vy[i] > 0) continue;
      bd = d2; best = i;
    }
    if (best < 0) continue;
    u.flakN--; u.flakT = 0.13; u.recoil = 1;
    ev('flak', ux, uy, SH.x[best], SH.y[best], u.side, 1);
    if (SH.mass[best] > 1.5) SH.mass[best] -= 1; else killShot(best);
  }
}

/* ---------- 倍增符 ---------- */
function gateSpawn(sp) {
  const d = sp.def, spot = d.spots[sp.idx % d.spots.length];
  let bit = 0, old = 1e18; for (let b = 0; b < 30; b++) if (S.bitUse[b] < old) { old = S.bitUse[b]; bit = b; }
  S.bitUse[bit] = 1e17;
  const ang = d.ang === undefined ? Math.PI / 2 : d.ang, h = d.h || 6;
  const g = {
    b: bit, bit: 1 << bit, owner: d.owner, mult: d.mult, x: spot[0], y: spot[1], bx: spot[0], by: spot[1], h, ang, dx: Math.cos(ang) * h, dy: Math.sin(ang) * h,
    move: d.move || null, born: S.time, bornR: S.round, life: d.life || 0, hp: (d.hp || (60 + 25 * d.mult)) * (d.owner === 1 ? S.team[1].hpMul : 1), hpMax: 0,
    flash: 0, used: 0, tog: 0, dead: false, sp, ph: spot[2] || 0
  };
  g.hpMax = g.hp; sp.g = g; S.gates.push(g);
  ev('gspawn', g.x, g.y, g.owner, g.mult);
}
// why: 1 被打掉、3 時間到、4 換位置
function gateRemove(g, why) {
  const i = S.gates.indexOf(g); if (i < 0) return;
  g.dead = true; S.bitUse[g.b] = S.time; S.gates.splice(i, 1);
  const sp = g.sp, d = sp.def; sp.g = null; sp.idx++;
  sp.wait = why === 1 ? (d.regap || 2) : why === 4 ? 0 : (d.gap || 0);
  if (why === 1 && g.owner === 1) S.stat.gates++;
  ev('gbreak', g.x, g.y, g.owner, why);
}
// 每回合開始：到期的收掉、會換位置的換位置、該出現的出現
function gatesRound() {
  for (const sp of S.gsp) {
    const d = sp.def, g = sp.g;
    if (g) {
      if (d.until && S.boss && S.boss.phase > d.until) { gateRemove(g, 3); continue; }
      if (g.life > 0 && S.round - g.bornR >= g.life) gateRemove(g, 3);
      else if (d.hop && d.spots.length > 1) gateRemove(g, 4);
      else continue;
    }
    if (S.round < (d.at || 1)) continue;
    if (d.phase && (!S.boss || S.boss.phase < d.phase)) continue;
    if (d.until && S.boss && S.boss.phase > d.until) continue;
    if (sp.wait > 0) { sp.wait--; continue; }
    gateSpawn(sp);
  }
}
function gatesStep(dt) {
  for (let i = S.gates.length - 1; i >= 0; i--) {
    const g = S.gates[i];
    if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 6);
    const mv = g.move, age = S.time - g.born;
    if (mv) {
      if (mv.t === 'bob') g.y = g.by + mv.a * tri(age / mv.per + g.ph);
      else if (mv.t === 'slide') g.x = g.bx + mv.a * tri(age / mv.per + g.ph);
      else if (mv.t === 'orbit') { const a = age / mv.per * TAU + g.ph * TAU; g.x = g.bx + Math.cos(a) * mv.rx; g.y = g.by + Math.sin(a) * mv.ry; }
    }
    if (g.hp <= 0) gateRemove(g, 1);
  }
}

/* ---------- 氣球、天燈、光球、結界、地火、落石 ---------- */
function spawnBalloon(u) {
  const T = S.team[u.side], dir = T.dir, tg = S.st[1 - u.side];
  S.objs.push({ t: 'balloon', side: u.side, x: u.x + dir * 2, y: u.y + 5, r: 3.6, hp: 30 * T.hpMul, st: 'out', hx: MID - dir * 5 + (rnd() - 0.5) * 6, hy: 22 + rnd() * 4, n: 3, cd: 0, flash: 0, dir, age: 0, tgx0: tg.x0, tgx1: tg.x1 });      // 停在兩城中間、倍增符的下面
  ev('launch', u.x, u.y + 5, u.side);
}
function spawnLantern() {
  const any = S.team[0].alive < S.team[0].units.length || S.team[1].alive < S.team[1].units.length;
  const kinds = any ? ['heal', 'rage', 'charge', 'troop', 'troop'] : ['heal', 'rage', 'charge'];
  const kind = kinds[ri(kinds.length)], sp = S.lv.lantern.spots, p = sp ? sp[ri(sp.length)] : [MID + (rnd() - 0.5) * 20, 30 + rnd() * 12];
  S.objs.push({ t: 'lantern', x: p[0], y: p[1], by0: p[1], r: 3.2, hp: 1, kind, by: -1, age: 0, bornR: S.round });
  ev('lantern', p[0], p[1], kind);
}
function grantBonus(side, kind, x, y) {
  const T = S.team[side], st = S.st[side];
  if (kind === 'troop') {
    let u = null; for (const k of T.units) if (!k.alive) { u = k; break; }
    if (u) {
      // 回到原本的位置；那裡的樓板已經不在（或被磚佔住）就站到那個位置現在最高的東西上面，不會摔傷
      { const H = platWorld(st, u.hx0, u.hy0); u.hx = H.x; u.hy = H.y; }           // 浮島、船上的城：原本站的位置現在在哪
      u.alive = true; u.hp = u.hpMax * 0.7; u.frozen = 0; u.stun = 0; u.dazed = 0; u.outT = 0; u.dieT = 0; u.wet = 0; u.wetT = 0; u.x = u.hx; u.y = u.hy + 0.2;
      // 腳下有沒有東西：從原位的腰部往下看一小段；身體那一格有沒有被磚佔住
      // （只站在還在原位的磚、岩壁、地面上：漂在河裡的碎木頭不算）
      const solid = (o) => !o || o.isRock || (o.isBlock && o.inPlace && !o.frag && !o.dead);
      let floor = -999; PH.world.rayCast({ x: u.x, y: u.hy + 1.2 }, { x: u.x, y: u.hy - 1.2 }, (f, pt, n, fr) => { if (!solid(f.getUserData())) return -1; floor = pt.y; return fr; });
      const W = S.water, wetAt = (x, y) => W && x > W.x0 && x < W.x1 && y < W.y + 0.4;          // 那裡在水面下（河底）：不能站
      if (wetAt(u.x, floor)) floor = -999;
      const q = physQuery(u.x, u.hy + 1.6, 2); let blocked = false; for (const o of q) if (o.isBlock && !o.dead && blockDist(o, u.x, u.hy + 1.6) < 1.25) blocked = true;
      // 那個位置現在有沒有別的兵站著（掉下來的隊友、摔下來的魔王）：有的話也要另外找地方，不要復活在別人身體裡
      const crowded = (x, y) => { for (const k of S.units) if (k !== u && k.alive && Math.abs(k.x - x) < (k.bw + UNIT_W) * 0.45 && Math.abs(k.y - y) < (k.bh + UNIT_H) * 0.45) return true; return false; };
      if (blocked || floor < u.hy - 0.7 || floor > u.hy + 0.5 || crowded(u.x, floor + 0.1)) {
        const find = (x) => { let top = -999; PH.world.rayCast({ x, y: st.y1 + 30 }, { x, y: st.y0 - 2 }, (f, pt, n, fr) => { if (!solid(f.getUserData())) return -1; top = pt.y; return fr; }); return wetAt(x, top) ? -999 : top; };
        // 先看原本那一直線上最高的地方；那裡底下什麼都沒有（露台斷了，下面是深淵）或已經有人，就往兩邊一格一格找，只在城基的範圍裡找
        let bx = u.x, top = find(u.x);
        if (top < -900 || crowded(u.x, top + 0.25)) {
          const lo = st.fx0 + 1.7, hi = st.fx1 - 1.7; let done = false;
          for (let k = 0; k <= 8 && !done; k++) for (const sg of (k ? [1, -1] : [1])) {
            const x = clamp(u.x + sg * k * CS, lo, hi), t = find(x);
            if (t > -900 && !crowded(x, t + 0.25)) { bx = x; top = t; done = true; break; }
          }
          if (!done && top < -900) { bx = clamp(u.x, lo, hi); top = find(bx); }
        }
        if (top < -900) { u.alive = false; u.hp = 0; u = null; }          // 城裡找不到能站的地方（整座都垮進河裡、掉進深谷了）：改成補血
        else { u.x = bx; u.y = top + 0.25; }
      } else u.y = floor + 0.1;
      if (u) { mkUnitBody(u); u.body.setAwake(true); T.alive++; ev('revive', u.x, u.y, side, u.slot); } else kind = 'heal';
    } else kind = 'heal';
  }
  if (kind === 'heal') { for (const u of T.units) if (u.alive) { u.hp = Math.min(u.hpMax, u.hp + u.hpMax * (u.def.big ? 0.06 : 0.45)); u.frozen = 0; u.stun = 0; } }       // 魔王只補一點點
  else if (kind === 'rage') T.rage = 1;
  else if (kind === 'charge') { T.ult.c = T.ult.need; T.shield.c = T.shield.need; }
  ev('bonus', x, y, side, kind);
}
// 飛行物還在動嗎（這一輪還不能結束）
function flyersBusy() { for (const o of S.objs) if ((o.t === 'balloon' || o.t === 'orb') && (o.st === 'out' || o.st === 'run' || o.st === 'back')) return true; return false; }
function objsStep(dt) {
  const objs = S.objs;
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i]; let gone = false;
    if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 5);
    switch (o.t) {
      case 'mirror': {
        if (o.swing) o.ang = o.a0 + Math.sin(S.time * o.swing + o.ph) * o.sw; else o.ang += (o.spin || 0) * dt;
        o.dx = Math.cos(o.ang) * o.len; o.dy = Math.sin(o.ang) * o.len;
        break;
      }
      case 'portal': if (o.mv) o.y = o.by + o.mv.a * tri(S.time / o.mv.per + (o.mv.ph || 0)); break;
      case 'geyser': {
        o.lvl += ((o.on ? 1 : 0) - o.lvl) * Math.min(1, dt * 4);
        o.top = o.base + o.hgt * o.lvl;
        break;
      }
      case 'balloon': {
        o.age += dt;
        if (o.hp <= 0) { ev('pop', o.x, o.y, 0, o.side); const T = S.team[1 - o.side]; T.ult.c = Math.min(T.ult.need, T.ult.c + 12); gone = true; break; }
        if (o.st === 'out') { const k = Math.min(1, dt * 1.6); o.x += (o.hx - o.x) * k; o.y += (o.hy - o.y) * k; if (Math.abs(o.x - o.hx) < 0.6 && Math.abs(o.y - o.hy) < 0.6) o.st = 'hover'; }
        else if (o.st === 'hover') { o.y = o.hy + Math.sin(o.age * 1.6) * 0.6; }
        else if (o.st === 'run') {
          o.x += o.dir * 26 * dt; o.y += (48 - o.y) * Math.min(1, dt * 2);
          const tT = S.team[1 - o.side], tg = S.st[1 - o.side];
          if (tT.shield.on && inBubble(tg, o.x, o.y - 3)) { ev('pop', o.x, o.y, 0, o.side); gone = true; break; }
          if (o.n > 0 && o.x > o.tgx0 + 3 && o.x < o.tgx1 - 3) { o.cd -= dt; if (o.cd <= 0) { o.cd = 0.32; o.n--; spawnShot(o.side, WPN.drop.i, o.x, o.y - 3.6, o.dir * 3, -8, 1, 0, 0, 0); ev('drop', o.x, o.y - 3.6); } }
          if (o.dir < 0 ? o.x < o.tgx0 - 12 : o.x > o.tgx1 + 12) gone = true;        // 飛過目標那座城就離場
        }
        break;
      }
      case 'lantern': {
        o.age += dt; o.y = o.by0 + Math.sin(o.age * 1.4) * 0.8;
        if (o.hp <= 0) { if (o.by >= 0 && S.state === 'play') grantBonus(o.by, o.kind, o.x, o.y); gone = true; }
        break;
      }
      case 'orb': {
        o.age += dt;
        if (o.st === 'back') {
          // 被我方打爆的光球：掉頭飛回去，砸在魔王自己身上（結界和城牆都擋不住它）
          const bu = bossUnit(); if (bu && bu.alive) { const p = bu.body.getPosition(); o.tx = p.x; o.ty = p.y; }
          const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy) || 1, v = (16 + o.age * 90) * dt;
          if (o.age > 0.25 && d <= v + 1.2) { physExplode(o.tx, o.ty, WPN.doom, 0, 1, 0, bu && bu.alive ? bu : null, dx / d, dy / d); gone = true; break; }
          if (o.age > 0.25) { o.x += dx / d * v; o.y += dy / d * v; }
          break;
        }
        if (o.hp <= 0) {
          const T = S.team[0], bu = bossUnit(); T.ult.c = Math.min(T.ult.need, T.ult.c + 16);
          if (o.st !== 'run' && bu && bu.alive) { o.st = 'back'; o.side = 0; o.age = 0; o.hp = 0; o.tx = bu.x; o.ty = bu.y; ev('orbback', o.x, o.y); }
          else { ev('orbdie', o.x, o.y); gone = true; }
          break;
        }
        if (o.st === 'out') { const k = Math.min(1, dt * 1.4); o.x += (o.hx - o.x) * k; o.y += (o.hy - o.y) * k; if (Math.abs(o.x - o.hx) < 0.6 && Math.abs(o.y - o.hy) < 0.6) o.st = 'hover'; }
        else if (o.st === 'hover') { o.y = o.hy + Math.sin(o.age * 2) * 0.5; }
        else if (o.st === 'run') {
          const tg = S.st[0], dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy) || 1, v = 34 * dt;
          if (S.team[0].shield.on && inBubble(tg, o.x, o.y)) { ev('orbdie', o.x, o.y); ev('shieldhit', o.x, o.y, 0); gone = true; break; }
          let hit = d <= v;
          if (!hit && rayShot(o.x, o.y, o.x + dx / d * (v + o.r * 0.5), o.y + dy / d * (v + o.r * 0.5), 1, false)) hit = true;
          if (hit) { physExplode(o.x, o.y, WPN.doom, 1, 1, 0, null, dx / d, dy / d); gone = true; break; }
          o.x += dx / d * v; o.y += dy / d * v;
        }
        break;
      }
      case 'barrier': {
        for (const sg of o.segs) { if (sg.flash > 0) sg.flash = Math.max(0, sg.flash - dt * 6); sg.lvl += ((sg.on && sg.dead <= 0 ? 1 : 0) - sg.lvl) * Math.min(1, dt * 5); }
        break;
      }
    }
    if (gone) objs.splice(i, 1);
  }
}
// 落石：一顆真的石頭從天上砸下來，砸完留在場上
function dropRock(x, big) {
  const st = S.rubble, r = big ? 2.5 : 1.9;
  let live = 0; for (const b of st.blocks) if (!b.dead) live++;
  if (live >= 7) { for (const b of st.blocks) if (!b.dead) { blockKill(b, 2, K_CRUSH, true); break; } }
  const b = mkBlock(st, { mat: M_ROCK, kind: 'ball', x: x + (rnd() - 0.5) * 2, y: 76 + rnd() * 8, r, awake: true });
  b.body.setLinearVelocity({ x: (rnd() - 0.5) * 4, y: -22 }); b.body.setAngularVelocity((rnd() - 0.5) * 3); b.body.setBullet(true); b.inPlace = false; b.hot = 1; b.fall = 1;
}
// 還在往下掉的落石碰到護城罩：碎掉
function rocksVsShields() {
  const s0 = S.team[0].shield.on, s1 = S.team[1].shield.on;
  for (const b of S.rubble.blocks) {
    if (b.dead || !b.fall) continue;
    const p = b.body.getPosition(), v = b.body.getLinearVelocity();
    if (v.y > -12) { b.fall = 0; b.body.setBullet(false); b.body.setAngularDamping(3); continue; }               // 已經落地（或被擋下來）：之後滾不遠
    for (let s = 0; s < 2; s++) if ((s ? s1 : s0) && inBubble(S.st[s], p.x, p.y - b.r)) { ev('shieldhit', p.x, p.y - b.r, s); ev('rockstop', p.x, p.y, s); blockKill(b, 2, K_CRUSH, true); break; }
  }
}

/* ---------- 技能 ---------- */
function simSkill(side, name) {
  if (S.state !== 'play') return false;
  const T = S.team[side];
  if (name === 'ult') {
    // 連珠：下一次開火時每個兵打三輪。再按一次取消
    if (T.ult.armed) { T.ult.armed = false; ev('ultoff', side); return true; }
    if (T.ult.c < T.ult.need) return false;
    T.ult.armed = true; ev('ultarm', S.st[side].cx, S.st[side].y0 + S.st[side].h * 0.5, side);
    return true;
  }
  if (name === 'shield') {
    // 護城罩：隨時可以開，撐到自己下一次瞄準為止
    if (T.shield.c < T.shield.need || T.shield.on) return false;
    T.shield.on = true; T.shield.c = 0; T.shield.uses++;
    for (const u of T.units) if (u.alive) { u.frozen = 0; u.stun = 0; u.dazed = 0; }         // 開罩順便解凍
    ev('shield', S.st[side].cx, S.st[side].y0 + S.st[side].h * 0.42, side);
    return true;
  }
  return false;
}
function simAim(side, vx, vy) { if (!(vx === vx) || !(vy === vy)) return; const a = clampAim(vx, vy, S.team[side].dir); S.team[side].aim[0] = a[0]; S.team[side].aim[1] = a[1]; }

/* ---------- 回合 ---------- */
function startTurn(side) {
  S.turn = side; S.phase = 'aim'; S.phaseT = 0; S.quietT = 0; S.chain = 0;
  const T = S.team[side];
  if (T.shield.on) { T.shield.on = false; ev('shieldoff', side); }
  ev('turn', side, S.round);
  if (T.ai) aiBegin(T);
}
// 發射：這一邊所有還能動的兵照同一個角度和力道各打一輪
function simFire(side) {
  if (S.state !== 'play' || S.phase !== 'aim' || S.turn !== side) return false;
  const T = S.team[side], foe = S.team[1 - side], q = S.vq; q.length = 0; S.vqi = 0; S.vol++;
  const reps = (T.ult.armed ? 3 : 1) * (T.rage > 0 ? 2 : 1), ax = T.aim[0], ay = T.aim[1];
  let t0 = 0.05, any = false;
  for (const u of T.units) {
    u.held = false;
    if (!u.alive || T.mute) continue;                       // mute：測試用，這一邊只瞄不打
    // 被凍住、被電暈：這一輪不能動（包括魔王放光球、氣球兵放氣球）
    if (u.frozen > 0 || u.stun > 0) { u.held = true; u.immune = true; ev('skip', u.x, u.y + 4, side, u.frozen > 0 ? 0 : 1); u.frozen = Math.max(0, u.frozen - 1); u.stun = Math.max(0, u.stun - 1); continue; }
    u.immune = false;
    if (u.w) {
      const w = u.w, n = w.n || 1, g = w.gap || 0;
      for (let r = 0; r < reps; r++) for (let k = 0; k < n; k++) q.push({ t: t0 + r * (n * g + 0.16) + k * g, u, w, ax, ay });
      t0 += 0.2; any = true;
    } else if (u.def.bal) q.push({ t: t0, u, w: null, act: 'bal' });
  }
  if (S.boss && side === 1 && !T.mute) bossVolley(q, t0);
  // 上一輪停在半路的氣球、光球，這一輪飛過去
  for (const o of S.objs) {
    if (o.side !== side || o.st !== 'hover') continue;
    if (o.t === 'balloon') { o.st = 'run'; o.cd = 0; }
    else if (o.t === 'orb') { const tg = S.st[0]; o.st = 'run'; o.tx = tg.cx + (rnd() - 0.5) * tg.w * 0.3; o.ty = tg.y0 + tg.h * 0.5; ev('orbgo', o.x, o.y); }
  }
  q.sort((a, b) => a.t - b.t);
  // 對方的防空弩：剛被凍住或電暈的，這一輪攔不了
  for (const u of foe.units) if (u.alive && u.def.flak) { if (u.dazed > 0) { u.flakN = 0; u.dazed = 0; } else u.flakN = u.def.flak; }
  // 連珠和怒火：有人開得了火才算用掉（全員被凍住的話留到下一輪）
  if (any) {
    if (T.ult.armed) { T.ult.armed = false; T.ult.c = 0; T.ult.uses++; ev('ult', S.st[side].cx, S.st[side].y0 + S.st[side].h * 0.5, side); }
    if (T.rage > 0) T.rage = 0;
  }
  S.phase = 'volley'; S.phaseT = 0; T.volleys++;
  if (foe.ai) aiReact(foe);
  ev('volley', side, any ? 1 : 0);
  return true;
}
// 場上的東西都停下來了嗎（畫面外的不管）。城樓的磚和兵要真的停了才算；碎塊、小擺設、落石慢慢滾的不等
function worldQuiet() {
  // 有兵正被壓著扣血（一兩秒內不是被壓扁就是東西滑開）：等出結果，不要輪到下一邊瞄準了他才倒下
  for (const u of S.units) if (u.alive && !u.def.big && u.loadT > 0 && u.load > CRUSH_LOAD) return false;
  for (const u of S.units) if (u.alive && (u.edge || (u.sepNow && u.sepT <= 2)) && u.body.isAwake()) return false;      // 還在往邊上滑、還在被推開的也等
  for (const u of S.units) if (u.alive && u.outT > 0) return false;          // 被轟出城外、正在倒數出局的：等他出局了再換人（不然換人那一格才跳「出局」）
  for (const u of S.units) if (u.alive && u.wet > 0.2) return false;         // 掉進河裡的兵：等他被沖走（或爬上來）再換人
  // 還在滑、還在掉的兵：等他停下來（天秤翻了、樓板歪了，人一路滑出去）；最多等的時間也跟著延長
  for (const u of S.units) if (u.alive && u.body) { const v = u.body.getLinearVelocity(); if (v.x * v.x + v.y * v.y > 4) { S.chainT = S.time; return false; } }
  // 第二篇：還在超載、嘎吱作響的柱子；還在往下垂的懸臂樑；還在翻的天秤 —— 等它斷完、翻完
  for (const b of S.blocks) if (!b.dead && b.sT > 0 && b.cap) return false;
  for (const o of S.pins) if (!o.broke && o.b && o.b.body && Math.abs(o.b.body.getAngularVelocity()) > 0.01) return false;
  for (const o of S.pivots) if (o.b && !o.b.dead && Math.abs(o.b.body.getAngularVelocity()) > 0.01) return false;
  for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic() || !b.isAwake()) continue;
    const p = b.getPosition(); if (p.x < -GUT - 2 || p.x > VIEW_W + GUT + 2 || p.y < -10) continue;
    const v = b.getLinearVelocity(), s2 = v.x * v.x + v.y * v.y, om = Math.abs(b.getAngularVelocity()), o = b.getUserData();
    if (o && o.isBlock && o.wet && !o.inPlace) continue;           // 泡在河裡漂走的碎木頭：不等
    if (o && o.hang && !o.hangFree) continue;                       // 還吊著、只是在晃的鐘和燈：不等
    if (s2 > 3.2 || om > 0.7) return false;
    if (o && (o.isUnit || (o.isBlock && !o.frag && !o.prop && !o.st.loose)) && (s2 > 0.5 || om > 0.16)) return false;
  }
  return true;
}
/* 收尾的時候（其他東西都停了）兵頭上還架著一塊掉下來的磚：卡在頭和牆中間的碎塊、斜靠過來的樓板、整塊的冰磚。
   讓它在頭上裂開、碎片往兩邊掉——不然看起來像兵用頭頂著一塊磚，一站好幾個回合。
   還在原位、只是往下沉了一點貼到頭的天花板不算（那是兵在撐著屋頂，拿走了屋頂會垮）；還沒掉下來的屋頂、火藥桶、石球也不算。
   魔王不管（他頂得開）。一個兵一輪最多碎三塊。碎了就有東西在動，回合照樣等它停 */
function headClear() {
  let hit = false;
  for (const u of S.units) if (headClearUnit(u)) hit = true;
  return hit;
}
function headClearUnit(u) {
  if (!u.alive || u.def.big || u.air || !u.body) return false;
  if (u.hcV !== S.vol) { u.hcV = S.vol; u.hcN = 0; }
  if (u.hcN >= 3) return false;
  const p = u.body.getPosition();
  for (let ce = u.body.getContactList(); ce; ce = ce.next) {
    const ct = ce.contact; if (!ct.isTouching()) continue;
    const o = ce.other.getUserData();
    if (!o || !o.isBlock || o.dead || o.inPlace || o.mat === M_KEG || o.kind === 'ball' || (o.mat === M_ROOF && !o.frag && !roofDown(o))) continue;
    const wm = ct.getWorldManifold(null); if (!wm || !wm.pointCount) continue;
    const pt = wm.points[0]; if (pt.y <= p.y + u.bh * 0.25) continue;          // 碰在肩膀以上
    u.hcN++;
    if (o.seg) blockHurt(o, 1e4, K_CRUSH, 2, pt.x, pt.y); else blockKill(o, 2, K_CRUSH);
    return true;
  }
  return false;
}
function chainNote() {
  if (S.turn === 0 && S.chain > S.stat.chain) S.stat.chain = S.chain;
  if (S.chain >= 6) { const T = S.team[S.turn]; T.ult.c = Math.min(T.ult.need, T.ult.c + Math.min(30, S.chain) * ultK(S.turn)); ev('chain', S.chain, S.turn); }
}
function endTurn() {
  chainNote();
  endCheck(); if (S.state !== 'play') return;
  if (S.turn === 0) startTurn(1); else roundEnd();
}
// 回合結束：場上的碎塊太多就把最舊的清掉；預告過的落石砸下來
function roundEnd() {
  let wait = false;
  mechRoundEnd();
  if (S.nfrag > FRAG_KEEP) { for (const b of S.blocks) { if (S.nfrag <= FRAG_KEEP) break; if (b.frag && !b.dead) { blockKill(b, 2, K_CRUSH, true); wait = true; } } }
  S.hz = 0;
  if (S.marks.length) { for (const m of S.marks) dropRock(m.x, m.big); S.marks.length = 0; wait = true; S.hz = 1; ev('rumble'); }
  if (wait) { S.phase = 'hazard'; S.phaseT = 0; S.quietT = 0; S.chain = 0; S.vol++; } else roundStart();
}
function roundStart() {
  S.round++;
  const lv = S.lv;
  if (lv.wind) { let w = (0.3 + rnd() * 0.7) * lv.wind.max; if (S.wind > 0 || (S.wind === 0 && rnd() < 0.5)) w = -w; if (rnd() < 0.22) w = -w; if (S.round < (lv.wind.at || 1)) w = 0; S.wind = Math.round(w); if (w) ev('wind', S.wind); }
  for (let s = 0; s < 2; s++) { const T = S.team[s]; T.shield.c = Math.min(T.shield.need, T.shield.c + T.shield.gain); }
  for (const b of S.blocks) if (b.brit > 0) b.brit--;
  if (S.boss) bossRound();
  if (S.rollers.length) rollersRound();
  gatesRound();
  // 天燈：兩回合沒人打就飄走
  for (let i = S.objs.length - 1; i >= 0; i--) { const o = S.objs[i]; if (o.t === 'lantern' && S.round - o.bornR >= 2) { S.objs.splice(i, 1); ev('lanternoff', o.x, o.y); } }
  if (lv.lantern && S.round >= lv.lantern.at && (S.round - lv.lantern.at) % lv.lantern.every === 0) spawnLantern();
  // 地火：每回合輪流開一個
  let gi = 0, gn = 0; for (const o of S.objs) if (o.t === 'geyser') gn++;
  for (const o of S.objs) if (o.t === 'geyser') { const was = o.on; o.on = (S.round - 1) % gn === gi; o.next = S.round % gn === gi; if (o.on && !was) ev('erupt', o.x, o.base, o.hgt); gi++; }
  // 落石預告：這一回合結束時砸下來
  if (lv.rocks && S.round >= lv.rocks.at && (S.round - lv.rocks.at) % (lv.rocks.every || 1) === 0) rockMarks(lv.rocks.n || 2, false, lv.rocks.foe || 0);
  if (S.boss && S.boss.phase >= 3) rockMarks(lv.boss.meteors || 2, true, 0);
  // 拖太久：雙方的砲火越來越猛
  const sd = lv.sudden || 10;
  if (S.round > sd) { if (!S.sudden) { S.sudden = true; ev('sudden'); } S.rage = 1 + Math.min(2, (S.round - sd) * 0.4); }
  ev('round', S.round);
  startTurn(0);
}
function rockMarks(n, big, foe) {
  // 落石：砸我方城樓，或是砸在兩城之間。foe 是砸到敵城頭上的機率（火山不認人；魔王的隕石只砸我方）
  for (let k = 0; k < n; k++) {
    const p = rnd();
    let x = p < foe ? S.st[1].x0 + 2 + rnd() * (S.st[1].w - 4) : p < foe + (1 - foe) * 0.62 ? S.st[0].x0 + 2 + rnd() * (S.st[0].w - 4) : 38 + rnd() * 30;
    if (groundY(x) < -100) x = S.st[0].cx + (rnd() - 0.5) * (S.st[0].w - 4);
    S.marks.push({ x, big, t0: S.time });
  }
  ev('rockwarn', S.marks[S.marks.length - 1].x, 0);
}

/* ---------- 魔王 ---------- */
// 魔王掉出戰場：不會就這樣死掉，扣一截血之後飛回自己的城頂
function bossReturn(u) {
  const st = u.st; let top = st.y0 + CS;
  for (const b of st.blocks) if (!b.dead && !b.frag) { const p = b.body.getPosition(); if (Math.abs(p.x - st.cx) < CS * 2.2 && p.y + b.h / 2 > top && p.y < st.y1 + 6) top = p.y + b.h / 2; }
  hurtUnit(u, u.hpMax * 0.15, 1 - u.side, K_CRUSH);
  if (!u.alive) return;
  u.body.setTransform({ x: st.cx, y: top + u.bh / 2 + 6 }, 0); u.body.setLinearVelocity({ x: 0, y: -6 }); u.body.setAwake(true);
  ev('bossback', st.cx, top + 6);
}
function bossUnit() { for (const u of S.team[1].units) if (u.type === 'boss') return u; return null; }
/* 結界：城樓外面一圈光牆，分成低、中、高三段（平射、拋射、吊高各走一段）。
   每回合只開一個缺口（第三階段開兩個），缺口每回合換位置：看哪一段沒有光牆，就從那裡打進去。
   光牆打得破，破了要隔幾回合才補回來。只擋我方的砲彈 */
const BAR_LANES = [[2.83, 3.67], [2.30, 2.83], [1.66, 2.30]];
function barrierSeg(o, x, y) {
  let a = Math.atan2(y - o.y, x - o.x); if (a < 0) a += TAU;
  for (const sg of o.segs) if (sg.on && sg.dead <= 0 && a >= sg.a0 && a <= sg.a1) return sg;
  return null;
}
function barrierRound(o) {
  const B = S.boss;
  for (const sg of o.segs) if (sg.dead > 0) { sg.dead--; if (sg.dead <= 0) { sg.hp = sg.hm; ev('barup', o.x, o.y); } }
  // 缺口換到另一段（不跟上一回合一樣）
  o.open = (o.open + 1 + ri(2)) % 3;
  const open2 = B.phase >= 3 ? (o.open + 1 + ri(2)) % 3 : -1;
  o.segs.forEach((sg, k) => { sg.on = k !== o.open && k !== open2; });
}
// 魔王的血掉過門檻：馬上換階段
function bossPhase(bu) {
  const B = S.boss, lb = S.lv.boss, f = bu.hp / bu.hpMax;
  if (B.phase === 1 && f <= lb.p2 + 1e-6) {
    B.phase = 2;
    const st = S.st[1], hp = (lb.segHp || 60) * S.team[1].hpMul, open = ri(3);
    S.objs.push({ t: 'barrier', x: st.cx, y: st.y0 + st.h * 0.45, R: Math.max(st.w, st.h) * 0.62 + 4, regen: lb.regen || 2, flash: 0, open,
      segs: BAR_LANES.map((l, k) => ({ a0: l[0], a1: l[1], hp, hm: hp, dead: 0, on: k !== open, lvl: 0, flash: 0 })) });
    ev('phase', 2);
  } else if (B.phase === 2 && f <= lb.p3 + 1e-6) { B.phase = 3; ev('phase', 3); }
}
function bossRound() {
  const bu = bossUnit(); if (!bu || !bu.alive) return;
  bossPhase(bu);
  for (const o of S.objs) if (o.t === 'barrier') barrierRound(o);
}
// 魔王這一輪額外做的事：第二階段起每隔一輪放一顆毀滅光球（先停在半路，下一輪砸過來）
function bossVolley(q, t0) {
  const B = S.boss, bu = bossUnit(); if (!bu || !bu.alive || bu.held) return;
  if (B.phase >= 2) {
    let has = false; for (const o of S.objs) if (o.t === 'orb') has = true;
    const gap = S.lv.boss.orbGap || [3, 2];
    if (!has && (B.orbN++ % gap[B.phase >= 3 ? 1 : 0]) === 0) q.push({ t: t0 + 0.5, u: bu, w: null, act: 'orb' });       // orbGap：第二、第三階段各隔幾輪放一顆
  }
}
function spawnOrb(u) {
  const hp = (S.lv.boss.orbHp || 60) * S.team[1].hpMul;
  S.objs.push({ t: 'orb', side: 1, x: u.x - 3, y: u.y + 5, hx: S.st[1].x0 - 6 + (rnd() - 0.5) * 3, hy: 26 + rnd() * 8, tx: 0, ty: 0, r: 4.2, hp, hm: hp, st: 'out', flash: 0, age: 0 });
  ev('orb', u.x - 3, u.y + 5);
}

/* ---------- 開局 ---------- */
// 不算城樓的一堆東西（落石、戰場中間的機關）：跟磚用同一套邏輯，但沒有藍圖、不量城防
function looseStruct(skin) { return { side: 2, skin, skinB: skin, x0: 0, y0: 0, cols: 0, rows: 0, n: 0, w: 0, h: 0, x1: 0, y1: 0, cx: 0, hpMul: 1, blocks: [], units: [], slots: [], cellB: [], cellK: new Uint8Array(0), back: new Float32Array(0), backTo: new Uint8Array(0), hp0: 1, hpNow: 1, ver: 0, dead: false, fin: null, hitT: 0, loose: true }; }
function mkTeam(side) {
  return { side, dir: side === 0 ? 1 : -1, units: [], alive: 0, aim: [0, 0], dmg: 1, hpMul: 1, rage: 0, volleys: 0,
    ult: { c: 0, need: 100, gain: 0.16, armed: false, uses: 0 }, shield: { c: 0, need: 100, gain: 25, on: false, uses: 0 }, fired: 0, peak: 0, dealt: 0, ai: null };
}
function castleCols(d) { let c = 0; for (const r of d.map) if (r.length > c) c = r.length; return c; }
function simInit(idx, up, seed, diff, opts) {
  srand(seed || 1);
  const lv = LEVELS[idx], D = DIFFS[diff === undefined ? 1 : diff]; up = up || {};
  S.idx = idx; S.lv = lv; S.time = 0; S.frame = 0; S.state = 'play'; S.diff = diff === undefined ? 1 : diff; S.endT = 0; S.loser = -1;
  S.phase = 'intro'; S.turn = 0; S.round = 0; S.phaseT = 0; S.quietT = 0; S.vq.length = 0; S.vqi = 0;
  SH.n = 0; SH.cnt[0] = SH.cnt[1] = SH.cnt[2] = 0;
  S.structs = []; S.blocks = []; S.balls = []; S.units = []; S.gates = []; S.gsp = []; S.objs = []; S.marks = []; S.pend = []; S.bitUse.fill(0);
  S.wind = 0; S.rage = 1; S.sudden = false; S.nburn = 0; S.burnT = 0; S.chain = 0; S.chainT = -99; S.vol = 0; S.nfrag = 0; S.bid = 0; S.hz = 0; S.endBar[0] = S.endBar[1] = 0;
  S.gpts = lv.ground || null; S.voids = lv.voids || null;
  S.ropes = []; S.pivots = []; S.pins = []; S.plats = []; S.rollers = []; S.bell = null; S.water = lv.water ? Object.assign({ rho: 0.85, cur: 2.2 }, lv.water) : null;
  S.stat = { fired: 0, peak: 0, swarm: 1, cells: 0, kills: 0, gates: 0, lost: 0, chain: 0 };
  physNew();
  const A = S.team[0] = mkTeam(0), B = S.team[1] = mkTeam(1);
  A.dmg = 1 + 0.08 * (up.dmg || 0); A.hpMul = 1 + 0.09 * (up.hp || 0);
  A.shield.gain = 25 + 4 * (up.shield || 0); A.shield.c = 50 + 10 * (up.shield || 0);
  A.ult.gain = 0.16 * (1 + 0.14 * (up.ult || 0));
  B.dmg = (lv.foe.dmg || 1) * D.foeDmg; B.hpMul = (lv.foe.hp || 1) * D.foeHp;
  // 雙方用同一張藍圖（每一關的 castle）；敵城左右鏡射放在右邊
  const dA = CASTLES[lv.castle || lv.me.castle], dB = CASTLES[lv.castle || lv.foe.castle], y0 = lv.y0 || 0;
  const sA = S.st[0] = mkCastle(0, dA, CASTLE_L, y0, A.hpMul, false);
  const sB = S.st[1] = mkCastle(1, dB, CASTLE_R - castleCols(dB) * CS, y0, B.hpMul, true);
  S.structs.push(sA, sB);
  if (lv.extra) for (const e of lv.extra) { const d = CASTLES[e.castle]; S.structs.push(mkCastle(2, d, e.x - castleCols(d) * CS / 2, e.y || 0, e.hp || 1, false)); }
  // 落石放在一個看不見的「建築」裡，跟磚用同一套邏輯；戰場中間的機關（滾石、大鐘）也是
  S.rubble = looseStruct('rock'); S.structs.push(S.rubble);
  S.mech = looseStruct(dA.skin); S.structs.push(S.mech);
  sA.slots.forEach((sl, k) => { const t = lv.me.crew[k]; if (t) mkUnit(0, t, sA, sl, A.hpMul); });
  sB.slots.forEach((sl, k) => { const t = lv.foe.crew[k]; if (t) mkUnit(1, t, sB, sl, B.hpMul); });
  A.alive = A.units.length; B.alive = B.units.length;
  for (const o of S.pivots) pivotBalance(o);          // 天秤：兵都站上去了，秤一下、把配重調到剛好平衡
  pinBalance();                                       // 懸臂樑：量插銷要撐多重
  for (const P of S.plats) platCalib(P);              // 浮島、船：兵都上去了，算氣球要吊多重、船要多少浮力
  if (lv.rollers) for (const d of lv.rollers) { const R = { d, to: d.to, ball: null, stake: null, go: false, goR: 0, by: 2, n: 0 }; S.rollers.push(R); rollerSpawn(R); }
  if (lv.bell) bellInit(lv.bell);
  // 一開始的砲口：大概往對面，但不準，要自己調
  A.aim = clampAim(Math.cos(0.95) * 46, Math.sin(0.95) * 46, 1);
  B.aim = clampAim(-Math.cos(0.9) * 50, Math.sin(0.9) * 50, -1);
  for (const d of (lv.gates || [])) S.gsp.push({ def: d, idx: 0, g: null, wait: 0 });
  for (const d of (lv.objs || [])) {
    const o = Object.assign({ flash: 0 }, d);
    if (o.t === 'mirror') { o.a0 = o.ang; o.ph = o.ph || 0; o.dx = Math.cos(o.ang) * o.len; o.dy = Math.sin(o.ang) * o.len; }
    if (o.t === 'portal') { o.by = o.y; }
    if (o.t === 'geyser') { o.base = groundY(o.x) < -100 ? -GROUND_D : groundY(o.x); o.on = false; o.next = false; o.lvl = 0; o.top = o.base; }
    S.objs.push(o);
  }
  S.boss = lv.boss ? { phase: 1, orbN: 0 } : null;
  aiInit(B, lv.foe.ai || {}, D);
  if (opts && opts.botA) aiInit(A, opts.botA, { aiErr: 1 });
  if (opts && opts.mute !== undefined) S.team[opts.mute].mute = true;
  // 先走一步讓每一塊磚跟鄰居「接上」，再全部擺回原位、設成靜止：開場時整座城紋風不動，被打到才會醒。
  // 第二篇（有超載、繩索的關卡）多走幾步，順便量每一塊磚撐著多重、每一條繩子吊著多重
  if (lv.stress || S.ropes.length || S.plats.length) stressCalib(12); else physStep(STEP);
  for (const b of S.blocks) { b.body.setTransform({ x: b.x0, y: b.y0 }, b.a0 || 0); b.body.setLinearVelocity({ x: 0, y: 0 }); b.body.setAngularVelocity(0); b.body.setAwake(false); }
  for (const u of S.units) { u.body.setTransform({ x: u.hx, y: u.hy + u.bh / 2 }, 0); u.body.setLinearVelocity({ x: 0, y: 0 }); u.body.setAwake(false); }
  for (const P of S.plats) { P.body.setTransform({ x: P.x0, y: P.y0 }, P.a0); P.body.setLinearVelocity({ x: 0, y: 0 }); P.body.setAngularVelocity(0); P.body.setAwake(false); }
  for (const st of S.structs) if (!st.loose) { castleScan(st); for (let i = 0; i < st.n; i++) st.back[i] = st.backTo[i]; }
}

/* ---------- 每一步 ---------- */
function simStep(dt) {
  S.time += dt; S.frame++; S.phaseT += dt;
  const play = S.state === 'play';
  if (play) {
    switch (S.phase) {
      case 'intro': if (S.phaseT > 1.1) roundStart(); break;
      case 'aim': { const T = S.team[S.turn]; if (T.ai) aiStep(T, dt); break; }
      case 'volley': {
        const q = S.vq, T = S.team[S.turn];
        while (S.vqi < q.length && q[S.vqi].t <= S.phaseT) {
          const e = q[S.vqi++]; if (!e.u.alive) continue;
          if (e.w) unitFire(e.u, T, e.w, e.ax, e.ay);
          else if (e.act === 'bal') { let has = false; for (const o of S.objs) if (o.t === 'balloon' && o.side === e.u.side) has = true; if (!has && !e.u.held) { spawnBalloon(e.u); e.u.recoil = 1; } }
          else if (e.act === 'orb') spawnOrb(e.u);
        }
        if (S.vqi >= q.length && S.phaseT > 0.35) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; }
        break;
      }
      case 'resolve': case 'hazard': {
        const busy = SH.n > 0 || S.pend.length > 0 || flyersBusy() || fusesBurning() || ((S.nburn > 0 || ropesBurning()) && S.phaseT < 6);
        if (!busy && worldQuiet()) { if (headClear()) S.quietT = 0; else S.quietT += dt; } else S.quietT = 0;
        // 最多等 9 秒；還在一塊接一塊垮的時候多等一下（等最後一塊垮完再過 1.5 秒），最久 14 秒
        if (S.quietT >= 0.5 || S.phaseT > (S.time - S.chainT < 1.5 ? 14 : 9)) { if (S.phase === 'hazard') roundStart(); else endTurn(); }
        break;
      }
    }
  }
  for (let i = S.pend.length - 1; i >= 0; i--) {
    const p = S.pend[i]; if (p.t > S.time) continue;
    S.pend.splice(i, 1);
    if (p.reso) { const o = p.reso; if (!o.dead) { const q = o.body.getPosition(); ev('resohit', q.x, q.y); blockHurt(o, (o.seg ? o.segM : o.hm) * 0.42, K_CRUSH, p.side); } }       // 共鳴：一圈一圈傳過去，每一塊琉璃都震出裂痕
    else physExplode(p.x, p.y, p.w, p.side, 1, 0, null, 0, 1);
  }
  gatesStep(dt);
  shotsStep(dt);
  objsStep(dt);
  physStep(dt);
  mechStep(dt);
  if (S.phase === 'hazard') rocksVsShields();
  unitsStep(dt);
  burnStep(dt);
  for (const st of S.structs) {
    if (st.hitT > 0) st.hitT -= dt;
    if (st.fin) finStep(st, dt);
    if (!st.loose && (S.frame & 3) === 0) castleScan(st);
  }
  // 掉出戰場的磚
  if ((S.frame & 15) === 0) for (const b of S.blocks) if (!b.dead) { const p = b.body.getPosition(); if (p.y < -28 || p.x < -GUT - 9 || p.x > VIEW_W + GUT + 9) blockKill(b, 2, K_CRUSH, true); }
  if ((S.frame & 255) === 0) for (const st of S.structs) { let k = 0; for (const b of st.blocks) if (!b.dead) st.blocks[k++] = b; st.blocks.length = k; }
  if ((S.frame & 255) === 0) { let k = 0; for (const b of S.blocks) if (!b.dead) S.blocks[k++] = b; S.blocks.length = k; k = 0; for (const b of S.balls) if (!b.dead) S.balls[k++] = b; S.balls.length = k; }
  if (S.state === 'play') endCheck(); else if (!play) S.endT += dt;
}
// 著火的木頭和屋瓦：一直掉血，會延燒到碰在一起的
function burnStep(dt) {
  if (S.nburn <= 0) return;
  // 瞄準的時候火不往下燒（火苗照樣畫著）：不然上一輪點的火會在別人瞄準時把樑燒斷、把兵燒倒。下一輪砲擊開始再接著燒
  if (S.state === 'play' && (S.phase === 'aim' || S.phase === 'intro')) return;
  S.burnT -= dt; const tick = S.burnT <= 0; if (tick) S.burnT = 0.4;
  let nb = 0; const credit = S.phase === 'hazard' ? 2 : S.turn;
  for (const b of S.blocks) {
    if (b.dead || b.burn <= 0) continue;
    b.burn -= dt; if (b.burn <= 0) { b.burn = 0; continue; }
    const foe = b.burnBy !== undefined && b.burnBy !== b.side ? b.burnBy : b.side === credit ? 2 : credit;
    blockHurt(b, 4.2 * dt, K_FIRE, foe);
    if (tick && !b.dead) {
      const p = b.body.getPosition(), reach = Math.max(b.w, b.h) * 0.5 + 0.8, list = physQuery(p.x, p.y, reach).slice(), A = b.body.getFixtureList().getAABB(0);
      for (let k = 0; k < list.length; k++) {
        const o = list[k];
        if (o.isBlock) {
          if (o.dead || o === b || o.burn > 0 || !MAT[o.mat].burn) continue;
          // 火只會延燒到貼著的東西（隔一層石板、隔一間房燒不過去）
          const B = o.body.getFixtureList().getAABB(0);
          if (Math.max(A.lowerBound.x - B.upperBound.x, B.lowerBound.x - A.upperBound.x, A.lowerBound.y - B.upperBound.y, B.lowerBound.y - A.upperBound.y) > 0.6) continue;
          if (o.mat === M_KEG || rnd() < 0.1) ignite(o, 2.5 + rnd() * 2, foe);          // 火燒到火藥桶：馬上爆
        } else if (o.alive && o.fireT !== S.frame && Math.abs(o.x - p.x) < b.w * 0.5 + 1.6 && Math.abs(o.y + 1.5 - p.y) < b.h * 0.5 + 2.2) { o.fireT = S.frame; hurtUnit(o, 3.5, foe, K_FIRE); }       // 身邊燒著好幾塊，一次也只算燒到一下
      }
    }
  }
  for (const b of S.blocks) if (!b.dead && b.burn > 0) nb++;
  S.nburn = nb;
}
function endCheck() {
  if (S.state !== 'play') return;
  let lose0 = false, lose1 = false;
  for (let s = 0; s < 2; s++) {
    const T = S.team[s];
    let dead = T.alive <= 0;                              // 守軍全倒就是城破
    if (s === 1 && S.boss) { const bu = bossUnit(); if (!bu || !bu.alive) dead = true; }
    if (dead) { if (s === 0) lose0 = true; else lose1 = true; }
  }
  if (!lose0 && !lose1) return;
  const loser = lose1 ? 1 : 0;
  // 結算用的數字在這一刻就記下來（之後整座城炸開，數字會再變）
  S.endBar[0] = lose0 ? 0 : teamBar(0); S.endBar[1] = lose1 ? 0 : teamBar(1);
  if (S.turn === 0 && S.phase !== 'hazard' && S.chain > S.stat.chain) S.stat.chain = S.chain;
  S.state = loser === 1 ? 'won' : 'lost'; S.loser = loser; S.endT = 0; S.phase = 'over';
  const st = S.st[loser];
  /* 城破：整座垮下來，而且是「自己垮」的——不是一塊一塊炸開。
     守軍一倒，整座城的磚瞬間佈滿裂痕（耐久只剩三成，摔到就碎）；接著城腳從正面開始一塊一塊碎掉，
     上面失去支撐，往戰場中間歪過去、塌下來，一路撞、一路碎。上面的磚只有少數會自己先裂開（讓它斷成幾截），其他都是摔下來才碎的 */
  const dir = loser === 1 ? -1 : 1, front = loser === 1 ? st.x0 : st.x1, order = [];
  for (const b of st.blocks) {
    if (b.dead) continue;
    if (b.seg) { let hp = 0; for (let k = 0; k < b.seg.length; k++) { b.seg[k] *= 0.3; hp += b.seg[k]; } b.hp = hp; b.low = Math.min(b.low === undefined ? 1 : b.low, 0.3); } else b.hp *= 0.3;
    b.flash = 1; b.body.setAwake(true);
    const p = b.body.getPosition(), row = Math.max(0, (p.y - st.y0) / CS), dist = Math.abs(p.x - front) / CS;
    if (row < 2.2 || rnd() < 0.3) order.push({ b, t: 0.16 + (row < 2.2 ? dist * 0.055 + row * 0.07 : 0.3 + row * 0.085 + dist * 0.03) + rnd() * 0.1 });
  }
  st.fin = { t: 0, order: order.sort((a, b) => a.t - b.t), k: 0, dir, lean: 0 };
  ev('end', st.cx, st.y0 + st.h * 0.4, loser, S.team[loser].alive <= 0 ? 1 : 0);
  S.team[0].ult.armed = false; S.team[1].ult.armed = false; S.team[0].shield.on = false; S.team[1].shield.on = false;
}
function finStep(st, dt) {
  const f = st.fin; f.t += dt;
  // 城腳開始碎的那一刻，上面的往戰場中間推一把（越高推得越用力）：整座往前倒，不是原地往下坐
  if (!f.lean && f.t > 0.2) {
    f.lean = 1;
    for (const b of st.blocks) {
      if (b.dead) continue;
      const p = b.body.getPosition(), row = (p.y - st.y0) / CS; if (row < 1.5) continue;
      b.body.applyLinearImpulse({ x: f.dir * b.mass * (1.0 + row * 0.55), y: 0 }, p, true);
      b.body.setAngularVelocity(b.body.getAngularVelocity() - f.dir * (0.15 + row * 0.04));
    }
  }
  while (f.k < f.order.length && f.order[f.k].t <= f.t) { const b = f.order[f.k++].b; if (!b.dead) blockKill(b, 2, 99); }
  if (f.t > 0.6) for (const u of st.units) if (u.alive) killUnit(u, 1 - st.side, 0);
  if (f.k >= f.order.length && f.t > 3.4) { st.dead = true; st.fin = null; }
}
