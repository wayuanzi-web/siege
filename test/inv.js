// 不變量測試：用自動玩家打很多場，每一步都檢查模擬狀態有沒有壞掉；另外擺幾個「指定情境」直接證明特定缺陷。
//
//   node test/inv.js          全部：6 關 × expert/casual/newbie/idle × 難度 0/1/2 × 強化 0 級/5 級 × 多個亂數種子，再加指定情境
//   node test/inv.js quick    快速子集（每關每種玩家一場 + 指定情境，幾秒鐘）
//   node test/inv.js scen     只跑指定情境
//   node test/inv.js fuzz     只跑「亂拆」：兩邊都不開火，隨機打磚、放火、炸、修城、救兵、殺兵，專門逼落石／支撐／兵的站位出錯
//                             （全部模式也會跑一小輪；--seeds=200 可以加量，--level / --seed 可以指定）
//
// 篩選（可跟 quick 併用）：--level=4 --bot=casual --diff=1 --up=0 --seed=2962 --seeds=12   加 -v 每場印一行
// --tmax=600：改「幾秒內一定要分出勝負」的時限（預設 320）
// 重現：報告裡每一條違反都附「L關 玩家 d難度 up強化 seed=種子 t=秒」，照填即可，例如
//   node test/inv.js --level=4 --bot=expert --diff=0 --up=3 --seed=9336 -v
// 結束碼：有任何違反或指定情境失敗 → 1；全部成立 → 0。
//
// 「違反」是真的不該發生的狀態；「觀察到的現象」只是統計（例如暫時差一步、之後自己會對回來的帳）。
'use strict';
// load.js 預設沒有匯出、這裡要用到的名字（指定情境會直接呼叫模擬裡面的函式）
const NAMES = ['ignite', 'hitCell', 'destroyCell', 'killUnit', 'grantBonus', 'gateMultiply', 'spawnShot', 'explode',
  'NS', 'SHOT_CAP', 'VMIN', 'VMAX', 'ANG_MIN', 'ANG_MAX', 'M_PANEL', 'M_WOOD', 'M_ROOF', 'BAR_TH', 'K_BLAST'];
// 少了哪個名字也照樣載得進來（那個名字會是 undefined，用到它的情境會自己跳過）
const G = require('./load')(NAMES.map((n) => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', '));
const { S, SH, simInit, simStep, LEVELS, BOTS, WL, WPN, teamBar, isSolid, groundY, CS } = G;
const def = (v, d) => (v === undefined ? d : v);
const NS = def(G.NS, 2000), M_PANEL = def(G.M_PANEL, 8), BAR_TH = def(G.BAR_TH, 0.42);
const VMIN = def(G.VMIN, 32), VMAX = def(G.VMAX, 86), ANG_MIN = def(G.ANG_MIN, 0.10), ANG_MAX = def(G.ANG_MAX, 1.50);
const GRAV = def(G.GRAV, 48);
const DT = 1 / 60, T_HARD = 900, AFTER_STEPS = 300;
const BOT_NAMES = ['expert', 'casual', 'newbie', 'idle'];

/* ---------- 參數 ---------- */
const argv = process.argv.slice(2), opt = {};
for (const a of argv) { const m = /^--(\w+)=(.*)$/.exec(a); if (m) opt[m[1]] = m[2]; }
const QUICK = argv.includes('quick'), ONLY_SCEN = argv.includes('scen'), ONLY_FUZZ = argv.includes('fuzz'), VERBOSE = argv.includes('-v');
const num = (k) => (opt[k] === undefined ? null : +opt[k]);
const T_MAX = num('tmax') !== null ? num('tmax') : 320;      // 幾秒內一定要分出勝負（--tmax=600 可以放寬）

/* ---------- 違反紀錄 ---------- */
const V = new Map();          // 說明 -> { n 次數, battles 哪幾場, first 前幾場第一次發生的地方, max 最嚴重的程度 }
const NOTE = new Map();       // 觀察到的現象 -> { n, max, at 第一次看到的地方 }
let CUR = null;               // 目前這一場
function viol(key, detail, mag) {
  let r = V.get(key); if (!r) { r = { n: 0, battles: new Set(), first: [], max: -Infinity, maxAt: '' }; V.set(key, r); }
  r.n++;
  const id = CUR ? CUR.id : '指定情境';
  if (mag !== undefined && mag > r.max) { r.max = mag; r.maxAt = `${id} t=${S.time.toFixed(2)}s`; }
  if (!r.battles.has(id)) { r.battles.add(id); if (r.first.length < 4) r.first.push(`${id} t=${S.time.toFixed(2)}s  ${detail || ''}`); }
  if (CUR) CUR.viol++;
}
function note(key, n, mag) {
  let r = NOTE.get(key); if (!r) { r = { n: 0, max: -Infinity, at: '' }; NOTE.set(key, r); }
  const where = `${CUR ? CUR.id : '指定情境'} t=${S.time.toFixed(2)}s`;
  if (!r.at) r.at = where;
  r.n += n === undefined ? 1 : n; if (mag !== undefined && mag > r.max) { r.max = mag; r.at = where; }
}
const fin = Number.isFinite;
const pct = (v) => (v * 100).toFixed(0) + '%';

/* ---------- 每一場自己的追蹤狀態 ---------- */
function newTrack() {
  return {
    solid: new Map(),                                  // 建築 -> 上一步的實心磚總數（格子裡 + 掉落中）
    destroyed: [0, 0, 0], built: [0, 0, 0],            // 這一步各建築碎了、補了幾塊實心磚
    ends: 0, endedAt: -1, after: new Map(),            // 'end' 事件、結束之後又發生的事
    bitFreed: new Float64Array(31).fill(-1e9), liveBits: new Map(),
    ust: new Map(), gst: new Map(), late: new Set(),   // 兵、掉落群的連續狀態
    revived: new Set(),                                // 這一步被天燈救回來的兵（位置本來就會變）
    burnBad: new Map(), burnStuck: new Map(), burnNeg: new Set(), panelBad: new Map(), hpBad: new Map(),
    lastState: 'play', maxShots: 0, peak: [0, 0]
  };
}
// 戰局結束之後不該再發生的事（物理收尾的 boom/cell/udie 之類不算）
const AFTER_END = { fire: 1, drop: 1, bonus: 1, revive: 1, ult: 1, shield: 1, wind: 1, phase: 1, orb: 1, launch: 1, rockwarn: 1, lantern: 1, sudden: 1, say: 1, rumble: 1, build: 1, gspawn: 1, flak: 1 };
function hook(tr) {
  S.on = (t, a, b, c, d) => {
    if (t === 'cell') { if (c !== M_PANEL && d >= 0 && d <= 2) tr.destroyed[d]++; }
    else if (t === 'build') { for (const st of S.structs) if (a >= st.x0 && a < st.x1) { tr.built[st.side]++; break; } }
    else if (t === 'end') { tr.ends++; tr.endedAt = S.time; }
    else if (t === 'dirt') { if (PRE.n) checkDirt(a, b); }
    else if (t === 'revive') { for (const u of S.team[c].units) if (u.slot === d) tr.revived.add(u); }
    else if (t === 'gspawn') {
      // 符剛出現的這一刻：天上不能有砲彈已經帶著它的 bit（不然那些砲彈會直接穿過去／不會被擋）
      const g = S.gates[S.gates.length - 1];
      if (g) {
        let stale = 0; for (let i = 0; i < SH.n; i++) if (SH.mask[i] & g.bit) stale++;
        if (stale) viol('倍增符：新出現的符用到的 bit，天上還有砲彈的 mask 帶著（會被當成已經穿過）', `bit ${g.b}，${stale} 發`);
        if (S.time - tr.bitFreed[g.b] < 9.1) viol('倍增符：bit 釋放後不到 9 秒（砲彈最長壽命）就被重用', `bit ${g.b}，${(S.time - tr.bitFreed[g.b]).toFixed(1)} 秒前才釋放`);
      }
    }
    if (tr.endedAt >= 0 && S.time > tr.endedAt && AFTER_END[t]) tr.after.set(t, (tr.after.get(t) || 0) + 1);
  };
}

/* ---------- 砲彈 ---------- */
// 每一步之前先記下砲彈的位置：有「沒有地面的區間」的關卡用來查砲彈是不是從地面以下鑽出來才爆
const PRE = { n: 0, x: new Float32Array(NS), y: new Float32Array(NS), vx: new Float32Array(NS), vy: new Float32Array(NS) };
function preStep() {
  if (!S.voids) { PRE.n = 0; return; }
  const n = PRE.n = SH.n;
  PRE.x.set(SH.x.subarray(0, n)); PRE.y.set(SH.y.subarray(0, n)); PRE.vx.set(SH.vx.subarray(0, n)); PRE.vy.set(SH.vy.subarray(0, n));
}
// 'dirt'（落地）事件：落點 (x, gy)。找出是哪一發；如果它上一步就已經比這個落點低一格以上，
// 那它不是落在地面上，而是掉進無地面區之後從崖壁底下鑽進來的（有起伏的地面一步最多高 2.9，不會誤判）
function checkDirt(x, gy) {
  let deep = -1;
  for (let i = 0; i < PRE.n; i++) {
    const px = PRE.x[i];
    if (Math.abs(px + (PRE.vx[i] + S.wind * DT) * DT - x) > 2e-3) continue;
    const py = PRE.y[i], ny = py + (PRE.vy[i] - GRAV * DT) * DT;
    if (ny > gy + 1e-3) continue;                        // 這一發還沒掉到落點的高度，不是它
    if (py >= gy - CS) return;                           // 找到一發正常落地的，這個事件算它的
    if (deep < 0) deep = i;
  }
  if (deep < 0) return;
  const px = PRE.x[deep], py = PRE.y[deep], ny = py + (PRE.vy[deep] - GRAV * DT) * DT;
  viol('砲彈：掉進無地面區、已經在地面以下，飄過崖邊時卻被當成落地，在地面上爆炸（還會炸到城腳）', `上一步在 (${px.toFixed(1)}, ${py.toFixed(1)})，這一步到 (${x.toFixed(1)}, ${ny.toFixed(1)})，卻在 (${x.toFixed(1)}, ${(+gy).toFixed(1)}) 爆`, gy - ny);
}
const _cnt = [0, 0, 0];
function checkShots(tr) {
  const n = SH.n;
  if (!(n >= 0 && n <= NS) || (n | 0) !== n) { viol('砲彈：SH.n 超出 0…容量', 'n=' + n); return; }
  if (n > tr.maxShots) tr.maxShots = n;
  _cnt[0] = _cnt[1] = _cnt[2] = 0;
  let bad = 0, badSide = 0, badW = 0, badMass = 0, under = 0;
  for (let i = 0; i < n; i++) {
    const s = SH.side[i];
    if (s < 0 || s > 2) badSide++; else _cnt[s]++;
    const x = SH.x[i], y = SH.y[i], vx = SH.vx[i], vy = SH.vy[i], age = SH.age[i], mass = SH.mass[i];
    // NaN 過不了任何比較；Infinity 用範圍抓
    if (!(x > -1e4 && x < 1e4 && y > -1e4 && y < 1e4 && vx > -1e4 && vx < 1e4 && vy > -1e4 && vy < 1e4 && age >= 0 && age < 100)) { bad++; continue; }
    if (!(mass > 0 && mass < 1e6)) badMass++;
    if (SH.w[i] >= WL.length) badW++;
    const gy = groundY(x); if (gy > -100 && y <= gy) under++;
  }
  if (bad) viol('砲彈：位置／速度／age 出現 NaN、Infinity 或離譜的值', bad + ' 發');
  if (badMass) viol('砲彈：mass 不是正的有限值', badMass + ' 發');
  if (badSide) viol('砲彈：side 不是 0/1/2', badSide + ' 發');
  if (badW) viol('砲彈：砲彈種類編號超出範圍', badW + ' 發');
  if (under) note('一步結束時有砲彈在地面以下、又不在無地面區（剛好停在無地面區的邊界上）', under);
  if (_cnt[0] !== SH.cnt[0] || _cnt[1] !== SH.cnt[1] || _cnt[2] !== SH.cnt[2]) viol('砲彈：SH.cnt 跟逐發重數的結果不一樣', `cnt=${SH.cnt.join('/')} 重數=${_cnt.join('/')}`);
  for (let s = 0; s < 2; s++) if (_cnt[s] > tr.peak[s]) tr.peak[s] = _cnt[s];
}

/* ---------- 建築 ---------- */
let _q = new Int32Array(512), _mk = new Uint8Array(512);
// 把實心磚裡「連得到最底下一列」的標成 1，回傳標了幾塊
function markSupported(st) {
  const { cols, rows, n, m } = st;
  if (_q.length < n) { _q = new Int32Array(n); _mk = new Uint8Array(n); }
  let qh = 0, qt = 0; _mk.fill(0, 0, n);
  for (let cx = 0; cx < cols; cx++) if (isSolid(m[cx])) { _mk[cx] = 1; _q[qt++] = cx; }
  while (qh < qt) {
    const i = _q[qh++], cx = i % cols, cy = (i / cols) | 0;
    if (cx > 0 && !_mk[i - 1] && isSolid(m[i - 1])) { _mk[i - 1] = 1; _q[qt++] = i - 1; }
    if (cx < cols - 1 && !_mk[i + 1] && isSolid(m[i + 1])) { _mk[i + 1] = 1; _q[qt++] = i + 1; }
    if (cy > 0 && !_mk[i - cols] && isSolid(m[i - cols])) { _mk[i - cols] = 1; _q[qt++] = i - cols; }
    if (cy < rows - 1 && !_mk[i + cols] && isSolid(m[i + cols])) { _mk[i + cols] = 1; _q[qt++] = i + cols; }
  }
  return qt;
}
// 壁板：跟 structCollapse 同一條規則（腳下、左右有站得住的磚或壁板，或頭上有站得住的磚），但一路傳到不再變為止。回傳懸空的壁板數
function floatingPanels(st) {
  const { cols, rows, n, m } = st; let changed = true, f = 0;
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (m[i] !== M_PANEL || _mk[i]) continue;
      const cx = i % cols, cy = (i / cols) | 0;
      if (cy === 0 || _mk[i - cols] || (cx > 0 && _mk[i - 1]) || (cx < cols - 1 && _mk[i + 1]) || (cy < rows - 1 && _mk[i + cols] === 1)) { _mk[i] = 2; changed = true; }
    }
  }
  for (let i = 0; i < n; i++) if (m[i] === M_PANEL && !_mk[i]) f++;
  return f;
}
// 真正還在的耐久：格子裡的實心磚 + 還在往下掉的那幾群（已經落地的群不能再算一次）
function realHp(st) {
  let s = 0; const { n, m, hp } = st;
  for (let i = 0; i < n; i++) if (m[i] && m[i] !== M_PANEL && hp[i] > 0) s += hp[i];
  for (const g of st.groups) if (!g.done) for (const c of g.cells) if (c.m !== M_PANEL && c.hp > 0) s += c.hp;
  return s;
}
const barOf = (st, hp) => Math.max(0, Math.min(1, (hp / st.hp0 - BAR_TH) / (1 - BAR_TH)));
const K_FROZEN = '著火：有磚在燒但 st.nburn<=0 → burnStep 直接跳過，火被凍住（不扣血、不延燒、不畫火焰）；最嚴重 = 凍住幾秒';
function countBurning(st) { let nb = 0; for (let i = 0; i < st.n; i++) if (st.burn[i] > 0) nb++; return nb; }

function checkStruct(st, tr, play) {
  const { cols, rows, n, m, hp, hm, burn } = st, tag = st.side === 2 ? '中立建築' : st.side === 0 ? '我方城' : '敵城';
  let nb = 0, solid = 0, badHp = 0, ghost = 0;
  for (let i = 0; i < n; i++) {
    const mi = m[i];
    if (!mi) { if (hp[i] !== 0 || burn[i] > 0) ghost++; continue; }
    const h = hp[i];
    if (!(h > 0) || !(h <= hm[i] * 1.0001) || !(hm[i] > 0)) badHp++;
    if (burn[i] > 0) nb++;
    if (mi !== M_PANEL) solid++;
  }
  if (badHp) viol('磚：還在的磚 hp<=0、hp>hm 或 NaN', `${tag} ${badHp} 塊`);
  if (ghost) viol('磚：空格子還留著 hp 或 burn', `${tag} ${ghost} 格`);
  if (st.fin) return;                      // 輸的那一邊正在整座垮掉，下面的規則不適用
  // 掉落中的群
  let flying = 0, anyFall = false, doneLeft = 0;
  for (const g of st.groups) {
    if (g.done) { doneLeft++; continue; }
    anyFall = true;
    let gs = 0;
    for (const c of g.cells) {
      if (c.m === M_PANEL) continue;
      gs++; flying++;
      const ny = c.cy - g.k;
      if (ny < 0 || ny >= rows || c.cx < 0 || c.cx >= cols) viol('落石：掉落中的磚跑到格子外面', `${tag} 磚 ${c.cx},${c.cy} k=${g.k}`);
      if (!(c.hp > 0) || !(c.hp <= c.hm * 1.0001)) viol('落石：掉落中的磚 hp 不合理', `${tag} hp=${c.hp} hm=${c.hm}`);
    }
    if (!gs) viol('落石：整群沒有任何實心磚', tag);
    if (!fin(g.off) || !fin(g.vy) || g.k < 0) viol('落石：off/vy/k 不合理', `${tag} off=${g.off} vy=${g.vy} k=${g.k}`);
    let t0 = tr.gst.get(g); if (t0 === undefined) { t0 = S.time; tr.gst.set(g, t0); }
    if (S.time - t0 > 3 && !tr.late.has(g)) { tr.late.add(g); viol('落石：一群磚掉了 3 秒還沒落地', `${tag} ${g.cells.length} 塊 k=${g.k} off=${g.off.toFixed(1)}`); }
    // 掛在落石上陣亡、落石還沒落地就被救回來的兵：groupLand 如果不看 u.grp，落地時會把他一起往下搬（見指定情境）
    for (const u of g.units) if (u.alive && u.grp !== g) note('活著的兵還列在一群他已經不在上面的落石的 units 裡（步數）');
  }
  if (doneLeft && anyFall) note('已落地的群還留在 st.groups（要等其它群也落地才清掉）的步數');
  if (st.need) viol('建築：一步結束時 st.need 還是 true（支撐沒有重算）', tag);
  // 支撐：每一塊實心磚都要連得到最底下一列
  const sup = markSupported(st);
  if (sup !== solid) viol('建築：有實心磚沒連到最底下一列卻留在格子裡（懸空）', `${tag} ${solid - sup} 塊`);
  // 壁板
  const fp = floatingPanels(st);
  if (fp && !anyFall) {
    const k = (tr.panelBad.get(st) || 0) + 1; tr.panelBad.set(st, k);
    if (k === 1) note('壁板懸空（次）'); note('壁板懸空（最長幾步）', 0, k);
    if (k === 31) viol('壁板：沒有任何支撐的房間壁板懸空超過 0.5 秒 [只影響畫面]', `${tag} ${fp} 片`);
  } else tr.panelBad.set(st, 0);
  // 著火的數目
  if (st.nburn !== nb) {
    const k = (tr.burnBad.get(st) || 0) + 1; tr.burnBad.set(st, k);
    note('st.nburn 跟實際著火格數不一樣的步數（下一步 burnStep 會重數）'); note('st.nburn 連續不對的最長步數', 0, k);
    if (k === 6) viol('著火：st.nburn 連續 6 步以上跟實際著火格數不一樣', `${tag} nburn=${st.nburn} 實際=${nb}`);
  } else tr.burnBad.set(st, 0);
  if (st.nburn < 0 && !tr.burnNeg.has(st)) { tr.burnNeg.add(st); viol('著火：st.nburn 變成負的', `${tag} nburn=${st.nburn} 實際=${nb}`); }
  if (nb > 0 && st.nburn <= 0) {
    // 連續兩步以上才算（差一步的帳下一步會重數）；之後每一步只更新「凍了多久」
    const k = (tr.burnStuck.get(st) || 0) + 1; tr.burnStuck.set(st, k);
    if (k === 2) viol(K_FROZEN, `${tag} nburn=${st.nburn} 實際=${nb}`);
    if (k >= 2) { const r = V.get(K_FROZEN); if (k * DT > r.max) { r.max = k * DT; r.maxAt = `${CUR ? CUR.id : '指定情境'} t=${S.time.toFixed(2)}s`; } }
  } else tr.burnStuck.set(st, 0);
  // 磚數守恆：只有 'cell' 事件會少、'build' 事件會多
  const tot = solid + flying, prev = tr.solid.get(st);
  if (prev !== undefined) {
    const want = prev - tr.destroyed[st.side] + tr.built[st.side];
    if (tot !== want) viol('磚：實心磚數量變了卻沒有對應的 cell／build 事件（憑空消失或多出來）', `${tag} 原本 ${prev}，碎 ${tr.destroyed[st.side]} 補 ${tr.built[st.side]}，現在 ${tot}`);
  }
  tr.solid.set(st, tot);
  // 城防：st.hpNow 要等於實際還在的磚
  if (play && st.side < 2) {
    const real = realHp(st), d = st.hpNow - real;
    if (Math.abs(d) > 0.02 + real * 1e-5) {
      const k = (tr.hpBad.get(st) || 0) + 1; tr.hpBad.set(st, k);
      const shown = teamBar(st.side), rb = barOf(st, real);
      viol('城防：st.hpNow（structHp 算的）不等於實際還立著＋還在掉的磚的耐久 → 城防條不準', `${tag} hpNow=${st.hpNow.toFixed(0)} 實際=${real.toFixed(0)}（差 ${(d / st.hp0 * 100).toFixed(1)}% hp0；城防條顯示 ${pct(shown)}，實際 ${pct(rb)}）`, (shown - rb) * 100);
      note('城防條不準持續最久（步）', 0, k);
    } else tr.hpBad.set(st, 0);
    const b = teamBar(st.side);
    if (!(b >= 0 && b <= 1)) viol('城防：teamBar 超出 [0,1]', `${tag} bar=${b}`);
  }
}

/* ---------- 兵 ---------- */
function ustate(tr, u) { let s = tr.ust.get(u); if (!s) { s = { noFloor: 0, inSolid: 0, fall: 0, deadGrp: 0, cy: u.cy, cx: u.cx, still: false }; tr.ust.set(u, s); } return s; }
function checkUnits(tr) {
  const alive = [0, 0];
  for (const u of S.units) {
    const st = u.st, who = `${u.side === 0 ? '我方' : '敵方'} ${u.type} 兵位 ${u.slot} 在 ${u.cx},${u.cy}`;
    if (!fin(u.x) || !fin(u.y) || !fin(u.hp) || !fin(u.vy) || !fin(u.cool) || !fin(u.frozen) || !fin(u.stun) || !fin(u.t2)) viol('兵：狀態出現 NaN/Infinity', who);
    if ((u.cx | 0) !== u.cx || (u.cy | 0) !== u.cy || u.cx < 0 || u.cx >= st.cols || u.cy < 0 || u.cy > st.rows) viol('兵：格子座標超出範圍', who);
    if (!u.alive) { if (u.hp !== 0) viol('兵：死掉的兵 hp 不是 0', who); if (u.grp) viol('兵：死掉的兵還掛在落石上', who); const d = tr.ust.get(u); if (d) d.still = false; continue; }
    alive[u.side]++;
    if (!(u.hp > 0) || u.hp > u.hpMax * 1.0001) viol('兵：活著的兵 hp<=0 或超過 hpMax', `${who} hp=${u.hp}`);
    if (st.fin) continue;
    const s = ustate(tr, u);
    // 上一步結束時好好站著（沒在掉、沒掛在落石上）的兵，這一步不可能換格子：要先開始掉或跟著落石，下一步以後才會動
    if (s.still && !tr.revived.has(u) && (u.cy !== s.cy || u.cx !== s.cx)) viol('兵：好好站著的兵被憑空搬到另一格（沒有經過「往下掉」或「跟著落石」）', `${u.side === 0 ? '我方' : '敵方'} ${u.type} 兵位 ${u.slot} 從 ${s.cx},${s.cy} 到 ${u.cx},${u.cy}`);
    s.cy = u.cy; s.cx = u.cx; s.still = !u.grp && !u.fall;
    if (u.grp) {
      const g = u.grp;
      if (g.done || st.groups.indexOf(g) < 0) { if (++s.deadGrp === 2) viol('兵：活著的兵掛在一群已經落地／被丟掉的落石上（永遠不會被放下來）', who); }
      else { s.deadGrp = 0; if (g.units.indexOf(u) < 0) viol('兵：兵掛著的那群落石的 units 裡沒有他', who); }
      s.noFloor = s.inSolid = s.fall = 0; continue;
    }
    s.deadGrp = 0;
    if (u.fall) { if (++s.fall === 240) viol('兵：往下掉超過 4 秒還沒落地', `${who} y=${u.y.toFixed(1)}`); s.noFloor = s.inSolid = 0; continue; }
    s.fall = 0;
    if (Math.abs(u.y - (st.y0 + u.cy * CS)) > 1e-6) viol('兵：站著的兵 y 跟所在的列對不上', `${who} y=${u.y}`);
    const inSolid = u.cy < st.rows && isSolid(st.m[u.cy * st.cols + u.cx]);
    const floor = u.cy === 0 || isSolid(st.m[(u.cy - 1) * st.cols + u.cx]);
    // 給一點寬限：被磚蓋住的兵下一步就會被判壓死；真的卡住才算違反
    if (inSolid) { if (++s.inSolid === 1) note('站著的兵一步結束時人在實心磚裡（下一步被判壓死）'); if (s.inSolid === 3) viol('兵：一直卡在實心磚裡', who); } else s.inSolid = 0;
    if (!floor) { if (++s.noFloor === 1) note('站著的兵一步結束時腳下沒有磚'); if (s.noFloor === 3) viol('兵：浮在半空（腳下沒有實心磚也不是地面，卻沒有在掉）', who); } else s.noFloor = 0;
  }
  tr.revived.clear();
  for (let s = 0; s < 2; s++) {
    const T = S.team[s];
    if (T.alive !== alive[s]) viol('兵：team.alive 跟實際活著的兵數不一樣', `side${s} alive=${T.alive} 實際=${alive[s]}`);
    let k = 0; for (const u of T.units) if (u.alive) k++;
    if (k !== alive[s]) viol('兵：S.units 跟 team.units 對不起來', `side${s}`);
  }
}

/* ---------- 倍增符 ---------- */
function checkGates(tr) {
  let bits = 0;
  for (const g of S.gates) {
    if (g.dead) viol('倍增符：已經消失的符還留在 S.gates');
    if (g.bit !== (1 << g.b) || g.b < 0 || g.b >= 30) viol('倍增符：bit 不合理', `b=${g.b} bit=${g.bit}`);
    if (bits & g.bit) viol('倍增符：兩個同時存在的符共用同一個 bit', `bit ${g.b}`);
    bits |= g.bit;
    if (!fin(g.x) || !fin(g.y) || !fin(g.hp) || !fin(g.dx) || !fin(g.dy)) viol('倍增符：出現 NaN/Infinity');
    if (S.bitUse[g.b] !== 1e17) viol('倍增符：存在中的符，bitUse 沒有標成使用中', `bit ${g.b}`);
    if (g.sp.g !== g) viol('倍增符：出生點沒有指回這個符');
    if (g.uses > 0 && g.left < 0) viol('倍增符：限次數的符被用超過次數', `left=${g.left}`);
  }
  for (const [b, g] of tr.liveBits) if (S.gates.indexOf(g) < 0) { tr.bitFreed[b] = S.time; tr.liveBits.delete(b); }
  for (const g of S.gates) tr.liveBits.set(g.b, g);
  for (const sp of S.gsp) if (sp.g && (sp.g.dead || S.gates.indexOf(sp.g) < 0)) viol('倍增符：出生點還抓著一個已經不在的符');
}

/* ---------- 隊伍、風、機關、結束狀態 ---------- */
function aimBad(vx, vy, dir) {
  if (!fin(vx) || !fin(vy)) return 'NaN';
  const fx = vx * dir, v = Math.hypot(fx, vy), a = Math.atan2(vy, fx);
  if (!(fx > 0)) return '往後打';
  if (v < VMIN - 1e-6 || v > VMAX + 1e-6) return '力道 ' + v.toFixed(3);
  if (a < ANG_MIN - 1e-9 || a > ANG_MAX + 1e-9) return '仰角 ' + a.toFixed(4);
  return null;
}
function checkWorld(tr) {
  for (let s = 0; s < 2; s++) {
    const T = S.team[s]; let b = aimBad(T.aim[0], T.aim[1], T.dir);
    if (b) viol('瞄準：隊伍的 aim 不在允許的仰角／力道範圍', `side${s} ${b} (${T.aim[0]},${T.aim[1]})`);
    if (T.ai) { b = aimBad(T.ai.px, T.ai.py, T.dir); if (b) viol('瞄準：AI 算出來的 px/py 不合法', `side${s} ${b}`); if (!fin(T.ai.t)) viol('瞄準：AI 計時器 NaN', `side${s}`); }
    if (!(T.ult.c >= 0 && T.ult.c <= T.ult.need) || !fin(T.ult.T) || !fin(T.shield.T) || !fin(T.shield.cd) || !fin(T.rageT)) viol('隊伍：技能數值超出範圍或 NaN', `side${s} ult.c=${T.ult.c}`);
  }
  const wmax = S.lv.wind ? S.lv.wind.max : 0;
  if (!fin(S.wind) || !fin(S.windTo) || !fin(S.windAI) || Math.abs(S.wind) > wmax + 1e-9 || Math.abs(S.windTo) > wmax + 1e-9) viol('風：NaN 或超過關卡的最大風力', `wind=${S.wind} to=${S.windTo}`);
  if (!(S.rage >= 1 && S.rage <= 3.5)) viol('決戰倍率 S.rage 超出 1…3.5', '' + S.rage);
  const nbal = [0, 0];
  for (const o of S.objs) {
    if (!fin(o.x) || (o.t === 'geyser' ? !fin(o.base) || !fin(o.top) : !fin(o.y)) || (o.hp !== undefined && !fin(o.hp)) || (o.vx !== undefined && !fin(o.vx)) || (o.vy !== undefined && !fin(o.vy))) viol('機關：出現 NaN/Infinity（' + o.t + '）');
    if (o.t === 'mirror' && (!fin(o.dx) || !fin(o.dy) || !fin(o.ang))) viol('機關：鏡子出現 NaN');
    if (o.t === 'balloon') nbal[o.side]++;
  }
  if (nbal[0] > 2 || nbal[1] > 2) viol('機關：同一邊的氣球超過 2 顆', nbal.join('/'));
  if (S.objs.length > 60) viol('機關：S.objs 一直變多', 'n=' + S.objs.length);
  for (const p of S.pend) if (!fin(p.t) || p.t < S.time - 1e-9) viol('延遲爆炸：過期還沒爆或 NaN', 't=' + p.t);
  if (S.pend.length > 200) viol('延遲爆炸：S.pend 一直累積', 'n=' + S.pend.length);
  // 結束之後不能再變回來
  if (tr.lastState !== 'play' && S.state !== tr.lastState) viol('結束：分出勝負之後 S.state 又變了', `${tr.lastState} -> ${S.state}`);
  if (S.state !== 'play') { if (S.loser !== 0 && S.loser !== 1) viol('結束：S.loser 沒有設定'); if ((S.state === 'won') !== (S.loser === 1)) viol('結束：S.state 跟 S.loser 對不上'); }
  tr.lastState = S.state;
  if (tr.ends > 1) viol('結束：end 事件發了不只一次', 'n=' + tr.ends);
}

function checkAll(tr, play) {
  checkShots(tr);
  for (const st of S.structs) checkStruct(st, tr, play);
  tr.destroyed[0] = tr.destroyed[1] = tr.destroyed[2] = 0; tr.built[0] = tr.built[1] = tr.built[2] = 0;
  checkUnits(tr); checkGates(tr); checkWorld(tr);
}

/* ---------- 跑一場 ---------- */
const SUM = new Map();        // "L bot" -> 統計
let PEAK = [0, 0], STEPS = 0;
function runBattle(li, bot, seed, diff, upL) {
  const id = `L${li + 1} ${bot} d${diff} up${upL} seed=${seed}`;
  CUR = { id, viol: 0 };
  const up = { dmg: upL, rate: upL, hp: upL, shield: upL, ult: upL };
  const key = `L${li + 1} ${bot}`; let sm = SUM.get(key); if (!sm) { sm = { n: 0, won: 0, lost: 0, slow: 0, never: 0, t: 0, tmax: 0, thrown: 0 }; SUM.set(key, sm); }
  sm.n++;
  const tr = newTrack();
  try {
    simInit(li, up, seed, diff, bot === 'idle' ? null : { botA: BOTS[bot] });
    hook(tr);
    checkAll(tr, false);                                  // 開局的狀態也要是乾淨的
    while (S.state === 'play' && S.time < T_MAX) { preStep(); simStep(DT); STEPS++; checkAll(tr, S.state === 'play'); }
    if (S.state === 'play') {
      // 超過時限：記下當時的戰況，再繼續跑，看它到底會不會結束
      const snap = `${T_MAX} 秒時 我方 ${pct(teamBar(0))}/${S.team[0].alive} 兵、敵方 ${pct(teamBar(1))}/${S.team[1].alive} 兵`;
      while (S.state === 'play' && S.time < T_HARD) { preStep(); simStep(DT); STEPS++; checkAll(tr, S.state === 'play'); }
      const save = S.time;
      if (S.state === 'play') { sm.never++; viol(`結束：打了 ${T_HARD} 秒還沒分出勝負（可能永遠不會結束）`, snap); }
      else { sm.slow++; viol(`結束：超過 ${T_MAX} 秒才分出勝負` + (bot === 'idle' ? '（我方完全不操作）' : ''), `${snap}；到 t=${save.toFixed(0)}s 才結束`, save); }
    }
    const tEnd = S.time;
    if (S.state !== 'play') {
      if (S.state === 'won') sm.won++; else sm.lost++; sm.t += tEnd; if (tEnd > sm.tmax) sm.tmax = tEnd;
      if (tr.ends !== 1) viol('結束：分出勝負卻不是剛好一次 end 事件', 'n=' + tr.ends);
      // 結算畫面用的是結束那一刻凍住的 st.hpNow
      const w = S.st[1 - S.loser], shown = teamBar(1 - S.loser), rb = barOf(w, realHp(w));
      if (Math.abs(shown - rb) > 1e-4) viol('城防：結束那一刻贏家的城防條（結算星等用的）不等於實際值', `顯示 ${(shown * 100).toFixed(1)}% 實際 ${(rb * 100).toFixed(1)}%`, Math.abs(shown - rb) * 100);
      for (let k = 0; k < AFTER_STEPS; k++) { preStep(); simStep(DT); STEPS++; checkAll(tr, false); }
      for (const [t, n] of tr.after) viol(`結束：分出勝負之後還發生「${t}」事件` + (t === 'gspawn' ? '（倍增符照常出現）[只影響畫面／提示]' : ''), n + ' 次');
      const ls = S.st[S.loser];
      if (!ls.dead) viol('結束：過了 5 秒輸家的城還沒垮完');
      for (const u of S.team[S.loser].units) if (u.alive) viol('結束：過了 5 秒輸家還有兵活著', `${u.type} 兵位 ${u.slot}`);
      for (let s = 0; s < 2; s++) if (S.team[s].shield.T > 0) viol('結束：護城罩的倒數在分出勝負後停住，罩子永遠不會消失 [只影響畫面]', `side${s} shield.T=${S.team[s].shield.T.toFixed(2)}`);
    }
    for (let s = 0; s < 2; s++) if (tr.peak[s] > PEAK[s]) PEAK[s] = tr.peak[s];
    if (VERBOSE) console.log(`  ${id}: ${S.state} t=${tEnd.toFixed(1)} 我方 ${pct(teamBar(0))}/${S.team[0].alive} 敵方 ${pct(teamBar(1))}/${S.team[1].alive} 最多砲彈=${tr.maxShots} 違反=${CUR.viol}`);
  } catch (e) {
    sm.thrown++;
    viol('丟出例外：' + String(e && e.message).slice(0, 90), (e && e.stack ? e.stack.split('\n').slice(1, 3).map((s) => s.trim()).join(' | ') : ''));
  }
  S.on = null; CUR = null; PRE.n = 0;
}

/* ---------- 指定情境：直接擺出會出錯的狀態 ----------
   都用第一關的敵城（山寨 E1，9×10，放進戰場時左右鏡射）：
     9 |   ^^^   |      兵位 1 在 (4,7)，腳下是 (4,6)
     8 |  ^^^^^  |      (3,7)、(6,7) 兩根木柱撐著最上面兩列屋瓦
     7 |   =..=  |      (3,5)、(6,5) 兩根木柱撐著整個塔頂
     6 |   ====  |
     5 |^^ =..=  |
     4 |^^^^^^^^ |
     3 | =.....= |      兵位 2 在 (2,3)
     2 | ======= |
     1 |#########|
     0 |#########|
        012345678                                                              */
const need = (...names) => names.filter((n) => typeof G[n] !== 'function' && G[n] === undefined);
function stage(seed) {
  simInit(0, {}, seed || 1, 1, null);
  // 兩邊都不開火、不放天燈、不出符：只看我們自己動的手腳
  for (const u of S.units) { u.cool = 1e9; u.t2 = 1e9; }
  S.team[0].ai = null; S.team[1].ai = null; S.rep.length = 0; S.gsp.length = 0; S.on = null;
  const st = S.st[1], at = (cx, cy) => cy * st.cols + cx;
  const M = G, ok = st.cols === 9 && st.rows === 10 && st.m[at(3, 7)] === M.M_WOOD && st.m[at(6, 7)] === M.M_WOOD && st.m[at(4, 8)] === M.M_ROOF && st.m[at(4, 7)] === M_PANEL &&
    st.m[at(3, 5)] === M.M_WOOD && st.m[at(6, 5)] === M.M_WOOD && st.m[at(4, 4)] === M.M_ROOF && st.m[at(0, 5)] === M.M_ROOF && st.m[at(4, 3)] === M_PANEL && st.units.length > 0 && st.units[0].cx === 4 && st.units[0].cy === 7;
  return { st, at, ok };
}
const SCEN = [];
function scenario(name, fn) { SCEN.push({ name, fn }); }

scenario('城防：一群磚已經落地、另一群還在掉的時候，st.hpNow 要等於實際的磚', () => {
  const miss = need('destroyCell', 'K_BLAST'); if (miss.length) return { skip: '載不到 ' + miss.join(',') };
  const { st, at, ok } = stage(1); if (!ok) return { skip: '第一關敵城的藍圖變了' };
  // 打掉兩根柱子：最上面的屋瓦掉 1 格；再讓左邊一塊屋瓦單獨掉 3 格（比較晚落地）
  for (const [cx, cy] of [[6, 7], [3, 7], [1, 5], [1, 4], [0, 4]]) G.destroyCell(st, at(cx, cy), 2, G.K_BLAST);
  let bad = 0, max = 0, first = -1;
  for (let k = 0; k < 120; k++) { simStep(DT); const e = st.hpNow - realHp(st); if (Math.abs(e) > 0.02) { bad++; if (first < 0) first = S.time; if (Math.abs(e) > Math.abs(max)) max = e; } }
  return bad ? { fail: `${bad} 步不對（從 t=${first.toFixed(2)}s 起），最多差 ${max.toFixed(1)}（${(max / st.hp0 * 100).toFixed(1)}% hp0）：已落地的群還在 st.groups 裡，被 structHp 又算了一次` } : {};
});

scenario('著火：火往左／往下延燒的同一步，著火的磚整群垮下來，st.nburn 不能變負、火不能被凍住', () => {
  const miss = need('destroyCell', 'ignite', 'K_BLAST'); if (miss.length) return { skip: '載不到 ' + miss.join(',') };
  let neg = 0, frozen = 0, tried = 0, ex = '';
  for (let seed = 1; seed <= 60; seed++) {
    const { st, at, ok } = stage(seed); if (!ok) return { skip: '第一關敵城的藍圖變了' };
    // 兵頭上那塊屋瓦著火，下一次 burnStep 剛好是延燒的那一拍；同一步把柱子打掉，屋瓦整群往下掉
    G.ignite(st, at(4, 8), 30); st.burnT = 0;
    G.destroyCell(st, at(6, 7), 2, G.K_BLAST); G.destroyCell(st, at(3, 7), 2, G.K_BLAST);
    tried++; let wasNeg = false, stuck = 0, maxStuck = 0;
    for (let k = 0; k < 360; k++) { simStep(DT); if (st.nburn < 0) wasNeg = true; if (countBurning(st) > 0 && st.nburn <= 0) { if (++stuck > maxStuck) maxStuck = stuck; } else stuck = 0; }
    if (wasNeg) neg++;
    if (maxStuck >= 180) { frozen++; if (!ex) ex = `例：seed ${seed} 跑完 6 秒 nburn=${st.nburn}，實際還有 ${countBurning(st)} 格在燒（burn 值不再減少）`; }
  }
  return neg || frozen ? { fail: `${tried} 個種子裡 ${neg} 個 st.nburn 變成負的、${frozen} 個火被凍住 3 秒以上。${ex}` } : {};
});

scenario('援軍：兵掛在落石上陣亡，落石還沒落地就被天燈救回來 → 落石落地時不能再搬動他', () => {
  const miss = need('destroyCell', 'killUnit', 'grantBonus', 'K_BLAST'); if (miss.length) return { skip: '載不到 ' + miss.join(',') };
  const { st, at, ok } = stage(1); if (!ok) return { skip: '第一關敵城的藍圖變了' };
  const u = st.units[0];
  G.destroyCell(st, at(3, 5), 2, G.K_BLAST); G.destroyCell(st, at(6, 5), 2, G.K_BLAST);     // 塔頂整個往下掉，兵位 1 跟著掉
  simStep(DT);
  if (!u.grp) return { skip: '兵沒有掛到落石上（規則變了）' };
  const g = u.grp;
  G.killUnit(u, 0, 0);                         // 掉到一半被打死
  G.grantBonus(1, 'troop', 56, 30);            // 敵軍打中「援軍」天燈
  if (!u.alive) return { skip: '沒有被救回來（規則變了）' };
  const cx = u.cx, cy = u.cy, hp = u.hp, listed = g.units.indexOf(u) >= 0;
  let moved = '';
  for (let k = 0; k < 90; k++) {
    const before = u.cy, flying = !g.done; simStep(DT);
    // 舊落石落地的那一步：他已經不在上面，列數不該被改
    if (flying && g.done && u.cy !== before) moved = `t=${S.time.toFixed(2)}s 舊落石落地（掉了 ${g.k} 格）時把他從第 ${before} 列搬到第 ${u.cy} 列` + (u.cy < st.rows && isSolid(st.m[u.cy * st.cols + u.cx]) ? '、塞進實心磚裡' : '') + '，還多扣一次摔傷';
  }
  if (moved || u.cy !== cy) return { fail: `救回來時站在 (${cx},${cy})、hp ${hp.toFixed(0)}${listed ? '，但還列在舊落石的 units 裡' : ''}；${moved}；1.5 秒後${u.alive ? `人在 (${u.cx},${u.cy})、hp ${u.hp.toFixed(0)}` : '已經死了'}` };
  return {};
});

scenario('倍增符：天上快滿（SHOT_CAP）只生得出一部分時，總份量還是要 ×倍數', () => {
  const miss = need('gateMultiply', 'spawnShot', 'SHOT_CAP'); if (miss.length) return { skip: '載不到 ' + miss.join(',') };
  const bad = [];
  for (const mult of [2, 3, 5, 8]) for (let room = 0; room <= mult; room++) {
    stage(1);
    for (let k = 0; k < G.SHOT_CAP - 1 - room; k++) G.spawnShot(0, WPN.rocket.i, 50, 60, 0, 0, 1, 0, 0, 0);
    const i = G.spawnShot(0, WPN.rocket.i, 50, 40, 30, 10, 1, 0, 0, 1), n0 = SH.n;
    G.gateMultiply(i, { mult, used: 0, flash: 0, uses: 0, left: 0, owner: 0 }, 50, 40, 30, 10);
    let mass = SH.mass[i]; for (let j = n0; j < SH.n; j++) mass += SH.mass[j];
    if (Math.abs(mass - mult) > 1e-3) bad.push(`×${mult} 還有 ${room} 個空位：生出 ${SH.n - n0 + 1} 發，總份量 ${mass.toFixed(2)}（應該 ${mult}）`);
  }
  return bad.length ? { fail: bad.length + ' 種情況份量不見了，例：' + bad.slice(0, 3).join('；') } : {};
});

scenario('壁板：撐著隔壁壁板的那一片被打掉之後，剩下懸空的壁板要跟著清掉', () => {
  const miss = need('destroyCell', 'hitCell', 'K_BLAST'); if (miss.length) return { skip: '載不到 ' + miss.join(',') };
  const { st, at, ok } = stage(1); if (!ok) return { skip: '第一關敵城的藍圖變了' };
  // 把 (4,3) 這片壁板的地板、天花板、右邊的壁板都拿掉：它只剩左邊 (3,3) 那片壁板撐著
  for (const [cx, cy] of [[4, 2], [4, 4], [5, 3]]) G.destroyCell(st, at(cx, cy), 2, G.K_BLAST);
  simStep(DT);
  if (st.m[at(4, 3)] !== M_PANEL) return { skip: '壁板支撐的規則變了' };
  G.hitCell(st, at(3, 3), 999, G.K_BLAST, 0);         // 一發砲彈把 (3,3) 打掉
  for (let k = 0; k < 120; k++) simStep(DT);
  markSupported(st); const f = floatingPanels(st);
  return f ? { fail: `2 秒後還有 ${f} 片壁板懸在半空（destroyCell 打掉壁板時沒有設 st.need，支撐不會重算）` } : {};
});

/* ---------- 亂拆：兩邊都不開火，隨機對建築和兵動手，每一步照樣檢查全部不變量 ---------- */
let FUZZ = { n: 0, acts: 0 };
function runFuzz(li, seed) {
  const miss = need('hitCell', 'destroyCell', 'ignite', 'killUnit', 'grantBonus', 'explode', 'K_BLAST');
  if (miss.length) return false;
  CUR = { id: `fuzz L${li + 1} seed=${seed}`, viol: 0 };
  let r = (seed * 2654435761) >>> 0; const R = () => { r = (Math.imul(r ^ (r >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; r ^= r >>> 13; return (r >>> 0) / 4294967296; };
  const upL = seed % 2 ? 5 : 0, tr = newTrack();
  try {
    simInit(li, { dmg: upL, rate: upL, hp: upL, shield: upL, ult: upL }, seed, 1, null);
    for (const u of S.units) { u.cool = 1e9; u.t2 = 1e9; }
    S.team[0].ai = null; S.team[1].ai = null; S.rep.length = 0; S.gsp.length = 0;
    hook(tr); checkAll(tr, false);
    const weapons = WL.filter((w) => w.r > 0);
    let after = 0, troop = -1;
    for (let step = 0; step < 1500 && after < 120; step++) {
      if (S.state === 'play') {
        const st = S.structs[(R() * S.structs.length) | 0];
        // 專門逼「掛在落石上陣亡 → 落石落地前被救回來」這條路
        if (troop >= 0 && R() < 0.5) { G.grantBonus(troop, 'troop', 56, 30); troop = -1; FUZZ.acts++; }
        for (const u of S.units) if (u.alive && u.grp && S.team[u.side].alive > 1 && R() < 0.05) { G.killUnit(u, 1 - u.side, 0); troop = u.side; FUZZ.acts++; break; }
        if (R() < 0.22) {                                   // 打一塊磚（傷害、種類、是誰打的都隨機）
          const i = (R() * st.n) | 0;
          if (st.m[i]) { G.hitCell(st, i, 3 + R() * R() * 260, (R() * 8) | 0, (R() * 3) | 0); FUZZ.acts++; }
        }
        if (R() < 0.04) { const w = weapons[(R() * weapons.length) | 0]; G.explode(st.x0 + R() * st.w, st.y0 + R() * st.h, w, (R() * 3) | 0, 1 + ((R() * 3) | 0), R() < 0.3 ? 4 : 0, null, -1, null); FUZZ.acts++; }
        if (R() < 0.03) { const i = (R() * st.n) | 0; if (st.m[i]) { G.ignite(st, i, 2 + R() * 6); FUZZ.acts++; } }
        if (R() < 0.012) { G.grantBonus((R() * 2) | 0, R() < 0.5 ? 'troop' : 'heal', 56, 30); FUZZ.acts++; }
        if (R() < 0.006) { const u = S.units[(R() * S.units.length) | 0]; if (u.alive && S.team[u.side].alive > 1) { G.killUnit(u, 1 - u.side, 0); FUZZ.acts++; } }
      } else after++;
      preStep(); simStep(DT); STEPS++; checkAll(tr, S.state === 'play');
    }
  } catch (e) {
    viol('丟出例外：' + String(e && e.message).slice(0, 90), (e && e.stack ? e.stack.split('\n').slice(1, 3).map((x) => x.trim()).join(' | ') : ''));
  }
  S.on = null; CUR = null; PRE.n = 0; FUZZ.n++;
  return true;
}

function runScenarios() {
  const out = [];
  for (const sc of SCEN) {
    let r; try { r = sc.fn() || {}; } catch (e) { r = { fail: '丟出例外：' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e) }; }
    out.push({ name: sc.name, ok: !r.fail && !r.skip, fail: r.fail, skip: r.skip });
  }
  S.on = null;
  return out;
}

/* ---------- 主程式 ---------- */
function seedFor(li, bot, diff, upL, k) { return 1009 + k * 7919 + li * 131 + diff * 17 + upL * 5 + BOT_NAMES.indexOf(bot) * 1543; }
function main() {
  const t0 = Date.now();
  const lvs = num('level') !== null ? [num('level') - 1] : LEVELS.map((_, i) => i);
  const bots = opt.bot ? [opt.bot] : BOT_NAMES;
  const diffs = num('diff') !== null ? [num('diff')] : QUICK ? [1] : [0, 1, 2];
  const ups = num('up') !== null ? [num('up')] : QUICK ? [0] : [0, 5];
  const nSeeds = num('seeds') !== null ? num('seeds') : QUICK ? 1 : 6;
  const filtered = num('level') !== null || !!opt.bot || num('seed') !== null || num('diff') !== null || num('up') !== null;
  let battles = 0;
  if (!ONLY_SCEN && !ONLY_FUZZ) {
    for (const li of lvs) for (const bot of bots) {
      if (bot !== 'idle' && !BOTS[bot]) { console.error('沒有這種自動玩家：' + bot); process.exit(2); }
      for (const diff of diffs) for (const upL of ups) {
        // 不操作的那幾場又長又像，少跑幾個種子
        const k = num('seed') !== null ? 1 : bot === 'idle' && num('seeds') === null ? Math.min(nSeeds, 2) : nSeeds;
        for (let j = 0; j < k; j++) { runBattle(li, bot, num('seed') !== null ? num('seed') : seedFor(li, bot, diff, upL, j), diff, upL); battles++; }
      }
    }
  }
  // 亂拆：全部模式跑一小輪；fuzz 模式跑多一點
  if (ONLY_FUZZ || (!ONLY_SCEN && !filtered)) {
    const n = num('seeds') !== null && ONLY_FUZZ ? num('seeds') : ONLY_FUZZ ? 60 : QUICK ? 4 : 20;
    for (const li of lvs) for (let k = 0; k < (num('seed') !== null ? 1 : n); k++) if (!runFuzz(li, num('seed') !== null ? num('seed') : 1 + k + li * 1000)) break;
  }
  const scen = ONLY_SCEN || (!filtered && !ONLY_FUZZ) ? runScenarios() : null;
  report(battles, scen, (Date.now() - t0) / 1000);
}

function report(battles, scen, secs) {
  console.log(`\n=== inv.js：${battles} 場對戰${FUZZ.n ? ` + ${FUZZ.n} 場亂拆（${FUZZ.acts} 次動手）` : ''}、${STEPS} 步、${secs.toFixed(1)} 秒；同時在天上的砲彈最多 我方 ${PEAK[0]} / 敵方 ${PEAK[1]} ===`);
  if (battles) {
    console.log('關卡 玩家          場   勝   敗  >320s  沒結束  平均秒  最長秒  例外');
    for (const [k, s] of SUM) {
      const done = s.won + s.lost;
      console.log(`${k.padEnd(14)} ${String(s.n).padStart(5)} ${String(s.won).padStart(4)} ${String(s.lost).padStart(4)} ${String(s.slow).padStart(6)} ${String(s.never).padStart(7)} ${(done ? (s.t / done).toFixed(0) : '-').padStart(7)} ${(done ? s.tmax.toFixed(0) : '-').padStart(7)} ${String(s.thrown).padStart(5)}`);
    }
  }
  if (NOTE.size) {
    console.log('\n觀察到的現象（不算違反）：');
    for (const [k, r] of NOTE) console.log(`  ${(r.n ? String(r.n) : r.max > -Infinity ? String(r.max) : '').padStart(8)}  ${k}   （${r.n ? '第一次' : '出現在'}：${r.at}）`);
  }
  let scenFail = 0;
  if (scen && scen.length) {
    console.log('\n指定情境：');
    for (const s of scen) { if (s.fail) scenFail++; console.log(`  ${s.fail ? '失敗' : s.skip ? '跳過' : '通過'}  ${s.name}${s.fail ? '\n          → ' + s.fail : s.skip ? '\n          （' + s.skip + '）' : ''}`); }
  }
  const bad = [...V.entries()].sort((a, b) => b[1].battles.size - a[1].battles.size);
  if (!bad.length) { console.log(`\n對戰中檢查的不變量全部成立。${scenFail ? '指定情境有 ' + scenFail + ' 個失敗。' : ''}`); process.exit(scenFail ? 1 : 0); }
  console.log(`\n違反的不變量：${bad.length} 條`);
  for (const [k, r] of bad) {
    console.log(`\n✗ ${k}\n    共 ${r.n} 次，出現在 ${r.battles.size} 場${r.max > -Infinity ? `；最嚴重 ${r.max.toFixed(1)}（${r.maxAt}）` : ''}。前幾場第一次發生的地方：`);
    for (const f of r.first) console.log('      ' + f);
  }
  console.log('\n重現某一場：node test/inv.js --level=<L> --bot=<玩家> --diff=<d> --up=<up> --seed=<seed> -v      亂拆的：node test/inv.js fuzz --level=<L> --seed=<seed>');
  process.exit(1);
}
main();
