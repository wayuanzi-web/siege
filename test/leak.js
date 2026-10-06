// 檢查 simInit 有沒有把上一場的狀態清乾淨。
//   node test/leak.js          六關都測
//   node test/leak.js 3        只測第三關        加 -v 印出每一段比對
//
// 每一關的「B 場」固定是：seed 2、casual 自動玩家、標準難度、不強化，一路打到分出勝負再多跑 5 秒。
// 「乾淨的 B」：另開一個 node 行程，只打 B 這一場（真正的全新行程）。
// 「髒的 B」：在同一份模擬裡先打別的，再 simInit 成 B：
//     a. 同一關 seed 1 打 20 秒就中斷（符、落石、著火、砲彈都還在場上）
//     b. 另一關、expert、硬仗、強化全滿，打到分出勝負再多跑 5 秒（城已經垮完、魔王階段、決戰倍率都動過）
//     c. 同一關、我方不操作、輕鬆難度，打 40 秒，途中還掛著事件處理器
// 比對：
//   1. simInit 之後整份狀態（S、SH、關卡與兵種定義表）逐欄比對 —— 有差就直接列出是哪些欄位
//   2. 每 60 步記一行（時間、兩邊城防、存活兵數、砲彈數、整份狀態的雜湊），跟乾淨的那一場逐行比對
//   3. 同一行程裡另外載一份全新的模擬（require('./load')() 每呼叫一次就是一份獨立的 S/SH/亂數），
//      跟髒的那一份「一步一步」並排跑；一出現差異就列出是哪些欄位先不一樣
// 結束碼：有任何差異 → 1。
'use strict';
const path = require('path'), cp = require('child_process');
const load = require('./load');             // 每呼叫一次 load() 就是一份全新、互不相干的模擬
const DT = 1 / 60, EVERY = 60, AFTER = 300, T_MAX = 320;
const B = { seed: 2, bot: 'casual', diff: 1, up: 0 };
const argv = process.argv.slice(2), VERBOSE = argv.includes('-v');

/* ---------- 把整份狀態攤平成「路徑 → 值」 ---------- */
function flatten(G) {
  const { S, SH } = G, out = new Map(), seen = new Map();
  const put = (p, v) => { out.set(p, typeof v === 'number' ? (Object.is(v, -0) ? '-0' : String(v)) : String(v)); };
  function walk(p, v) {
    if (v === null || v === undefined) { put(p, v); return; }
    const t = typeof v;
    if (t === 'number' || t === 'string' || t === 'boolean') { put(p, v); return; }
    if (t === 'function') return;
    if (seen.has(v)) { put(p, '→' + seen.get(v)); return; }     // 同一個物件第二次遇到：只記它第一次出現的路徑
    seen.set(v, p);
    if (ArrayBuffer.isView(v)) { put(p + '.length', v.length); for (let i = 0; i < v.length; i++) if (v[i] !== 0) put(p + '[' + i + ']', v[i]); return; }
    if (Array.isArray(v)) { put(p + '.length', v.length); for (let i = 0; i < v.length; i++) walk(p + '[' + i + ']', v[i]); return; }
    if (v instanceof Map || v instanceof Set) { put(p, '[Map/Set ' + v.size + ']'); return; }
    for (const k of Object.keys(v).sort()) walk(p + '.' + k, v[k]);
  }
  // 定義表先走（之後 S 裡指到它們的地方就只是參照）：被改到的話這裡會不一樣
  walk('LEVELS', G.LEVELS); walk('CASTLES', G.CASTLES); walk('UNIT', G.UNIT); walk('WL', G.WL); walk('BOTS', G.BOTS); walk('DIFFS', G.DIFFS);
  for (const k of Object.keys(S).sort()) { if (k === 'on') continue; walk('S.' + k, S[k]); }
  // 砲彈陣列只看用到的那一段（n 以後是沒清掉的舊資料，本來就不會被讀）
  put('SH.n', SH.n); put('SH.cnt', Array.from(SH.cnt).join('/'));
  for (const k of Object.keys(SH).sort()) { const a = SH[k]; if (!ArrayBuffer.isView(a) || k === 'cnt') continue; for (let i = 0; i < SH.n; i++) put('SH.' + k + '[' + i + ']', a[i]); }
  return out;
}
function hashOf(flat) {
  let h = 2166136261 >>> 0;
  for (const [k, v] of flat) { const s = k + '=' + v + ';'; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
function diffFlat(a, b, max) {
  const out = []; let n = 0;
  // 數值陣列只記非零的元素，所以「沒記」而陣列本身存在的話就是 0
  const none = (m, k) => (/\[\d+\]$/.test(k) && m.has(k.replace(/\[\d+\]$/, '') + '.length') ? '0' : '（沒有）');
  for (const [k, v] of a) { const w = b.get(k); if (w !== v) { n++; if (out.length < max) out.push(`${k}: 乾淨=${v}  髒=${w === undefined ? none(b, k) : w}`); } }
  for (const [k, w] of b) if (!a.has(k)) { n++; if (out.length < max) out.push(`${k}: 乾淨=${none(a, k)}  髒=${w}`); }
  return { n, out };
}

/* ---------- 跑一場並記錄 ---------- */
const upOf = (L) => ({ dmg: L, rate: L, hp: L, shield: L, ult: L });
function initB(G, li) { G.S.on = null; G.simInit(li, upOf(B.up), B.seed, B.diff, { botA: G.BOTS[B.bot] }); }
function line(G) {
  const { S, SH, teamBar } = G;
  return `${S.time.toFixed(4)} ${S.state} ${teamBar(0).toFixed(6)} ${teamBar(1).toFixed(6)} ${S.team[0].alive}/${S.team[1].alive} ${SH.n} ${hashOf(flatten(G))}`;
}
// 已經 simInit 好的 B，一路跑完；回傳每 60 步一行的紀錄
function runB(G) {
  const { S, simStep } = G, trace = []; let steps = 0, after = 0;
  trace.push(line(G));
  while ((S.state === 'play' && S.time < T_MAX) || (S.state !== 'play' && after < AFTER)) {
    simStep(DT); steps++; if (S.state !== 'play') after++;
    if (steps % EVERY === 0) trace.push(line(G));
  }
  trace.push('END ' + line(G) + ` fired=${S.stat.fired} peak=${S.stat.peak} cells=${S.stat.cells} kills=${S.stat.kills}`);
  return trace;
}
// 先把模擬弄髒
const DIRTY = {
  a: { name: '同一關 seed 1 打 20 秒中斷', run(G, li) { G.simInit(li, upOf(0), 1, 1, { botA: G.BOTS.casual }); for (let k = 0; k < 1200; k++) G.simStep(DT); } },
  b: { name: '另一關 expert／硬仗／強化全滿，打完再多跑 5 秒', run(G, li) {
    const other = (li + 3) % G.LEVELS.length;
    G.simInit(other, upOf(5), 77 + li, 2, { botA: G.BOTS.expert });
    let after = 0; while ((G.S.state === 'play' && G.S.time < T_MAX) || (G.S.state !== 'play' && after < AFTER)) { G.simStep(DT); if (G.S.state !== 'play') after++; }
  } },
  c: { name: '同一關不操作／輕鬆，打 40 秒，掛著事件處理器', run(G, li) { G.simInit(li, upOf(3), 9, 0, null); let n = 0; G.S.on = () => { n++; }; for (let k = 0; k < 2400; k++) G.simStep(DT); } }
};

/* ---------- 子行程：只打 B 一場 ---------- */
if (argv[0] === '--child') {
  const G = load(), li = +argv[1];
  initB(G, li);
  const flat = flatten(G), trace = runB(G);
  process.stdout.write(JSON.stringify({ trace, flat: [...flat] }));
  process.exit(0);
}

/* ---------- 主程式 ---------- */
function freshChild(li) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'leak.js'), '--child', String(li)], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout) return null;
  try { const o = JSON.parse(r.stdout); o.flat = new Map(o.flat); return o; } catch (e) { return null; }
}
// 兩份模擬並排一步一步跑，回傳第一次出現差異的地方
function lockstep(GF, GD) {
  let steps = 0, after = 0;
  for (;;) {
    const a = flatten(GF), b = flatten(GD);
    if (hashOf(a) !== hashOf(b)) { const d = diffFlat(a, b, 14); return { step: steps, time: GF.S.time, n: d.n, out: d.out }; }
    if (!((GF.S.state === 'play' && GF.S.time < T_MAX) || (GF.S.state !== 'play' && after < AFTER))) return null;
    GF.simStep(DT); GD.simStep(DT); steps++; if (GF.S.state !== 'play') after++;
  }
}
function main() {
  const t0 = Date.now(), nLv = load().LEVELS.length;
  const only = argv.find((a) => /^\d+$/.test(a)), lvs = only ? [+only - 1] : Array.from({ length: nLv }, (_, i) => i);
  let bad = 0, childMissing = 0;
  for (const li of lvs) {
    // 乾淨的參考：子行程（真的全新行程）；起不了子行程就退而用同行程裡新載的一份
    let ref = freshChild(li), how = '子行程';
    if (!ref) { childMissing++; how = '同行程新載的一份（子行程起不來）'; const G0 = load(); initB(G0, li); const flat = flatten(G0); ref = { trace: runB(G0), flat }; }
    const last = ref.trace[ref.trace.length - 1].split(' ');
    const res = [];
    for (const key of Object.keys(DIRTY)) {
      const d = DIRTY[key];
      // 1 + 2：髒的那一份，開局狀態逐欄比、整場逐行比
      const GD = load(); d.run(GD, li); initB(GD, li);
      const fd = diffFlat(ref.flat, flatten(GD), 14);
      const got = runB(GD);
      let firstLine = -1; const nL = Math.max(got.length, ref.trace.length);
      for (let k = 0; k < nL; k++) if (got[k] !== ref.trace[k]) { firstLine = k; break; }
      // 3：有差的話，再用兩份新的並排找出最早是哪些欄位不一樣
      let ls = null;
      if (fd.n || firstLine >= 0) { const GF = load(), GD2 = load(); initB(GF, li); d.run(GD2, li); initB(GD2, li); ls = lockstep(GF, GD2); }
      const ok = !fd.n && firstLine < 0;
      if (!ok) bad++;
      res.push({ key, d, ok, fd, firstLine, ls, lines: got.length, got });
    }
    const allOk = res.every((r) => r.ok);
    console.log(`L${li + 1} ${load().LEVELS[li].name}  B = seed ${B.seed} ${B.bot} d${B.diff} up${B.up} → ${last[2]} t=${(+last[1]).toFixed(1)}s（${ref.trace.length} 行，參考：${how}）  ${allOk ? '三種弄髒方式都跟乾淨的完全一樣' : '有差異！'}`);
    for (const r of res) {
      if (r.ok) { if (VERBOSE) console.log(`    ${r.key}. ${r.d.name}：開局狀態一樣、${r.lines} 行紀錄一樣`); continue; }
      console.log(`  ✗ ${r.key}. 先「${r.d.name}」再打 B：`);
      if (r.fd.n) { console.log(`      simInit 之後就有 ${r.fd.n} 個欄位不一樣（上一場漏過來的）：`); for (const s of r.fd.out) console.log('        ' + s); }
      else console.log('      simInit 之後的狀態一樣');
      if (r.firstLine >= 0) console.log(`      第 ${r.firstLine} 行紀錄開始不同：\n        乾淨 ${ref.trace[r.firstLine]}\n        髒   ${r.got[r.firstLine]}`);
      if (r.ls) { console.log(`      並排一步一步跑：第 ${r.ls.step} 步（t=${r.ls.time.toFixed(3)}s）開始有 ${r.ls.n} 個欄位不同：`); for (const s of r.ls.out) console.log('        ' + s); }
    }
  }
  console.log(`\n=== leak.js：${lvs.length} 關 × 3 種弄髒方式，${((Date.now() - t0) / 1000).toFixed(1)} 秒；${bad ? bad + ' 組有差異（simInit 沒有清乾淨）' : '沒有任何狀態從上一場漏到下一場'}${childMissing ? `；注意：${childMissing} 關起不了子行程，改用同行程新載的一份當參考` : ''} ===`);
  process.exit(bad ? 1 : 0);
}
main();
