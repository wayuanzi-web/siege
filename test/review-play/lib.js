// 審查用：把模擬載進 Node，並在同一個作用域裡加上觀測用的掛鉤（不改 src/）。
//   const G = require('./lib')();   G.HOOK.hurt = (u, d, side, kind) => {...}
const fs = require('fs'), path = require('path');
const planck = require(path.join(__dirname, '..', '..', 'src', 'vendor', 'planck.min.js'));
// 內建的「如果這樣改」補丁（只改記憶體裡的原始碼字串，不動 src/）：load({ patches: ['balloon', 'oob'] })
const PATCHES = {
  // 氣球一開始飛就被當成「已經飛過頭」而消失：只檢查飛行方向的那一側
  balloon: [["if (o.x < o.tgx0 - 12 || o.x > o.tgx1 + 12) gone = true;", "if (o.dir < 0 ? o.x < o.tgx0 - 12 : o.x > o.tgx1 + 12) gone = true;"]],
  // 兵被打到自己城樓後面（畫面外／按鈕底下）就算出局；魔王則是扣血飛回城頂。OOB_K = 離城樓外緣幾個單位
  oob: [["if (u.y < -26 || u.x < -30 || u.x > VIEW_W + 30) {", "if (u.y < -26 || u.x < -30 || u.x > VIEW_W + 30 || (u.side === 1 ? u.x > u.st.x1 + OOB_K : u.x < u.st.x0 - OOB_K)) {"]],
  // 另一種做法：兵被打到自己城樓後面不算出局，而是扣一截血（RET_PEN × 最大血量）之後回到城頂（跟魔王一樣）
  oobreturn: [["if (u.y < -26 || u.x < -30 || u.x > VIEW_W + 30) { if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, 4); }", "if (u.y < -26 || u.x < -30 || u.x > VIEW_W + 30) { if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, 4); } else if ((u.side === 1 ? u.x > u.st.x1 + OOB_K : u.x < u.st.x0 - OOB_K) && !u.air) bossReturn(u);"],
              ["hurtUnit(u, u.hpMax * 0.15, 1 - u.side, K_CRUSH);", "hurtUnit(u, u.hpMax * (u.def.big ? 0.15 : RET_PEN), 1 - u.side, K_CRUSH);"],
              ["u.body.setTransform({ x: st.cx, y: top + u.bh / 2 + 6 }, 0);", "u.body.setTransform({ x: st.cx + (u.def.big ? 0 : (u.slot - 2.5) * 2.6), y: top + u.bh / 2 + 6 }, 0);"]],
  // 判斷「塵埃落定」時不管畫面外的東西
  quietview: [["if (!b.isDynamic() || !b.isAwake()) continue;\n    const v = b.getLinearVelocity(); if (v.x * v.x", "if (!b.isDynamic() || !b.isAwake()) continue;\n    { const p = b.getPosition(); if (p.x < -16 || p.x > VIEW_W + 16) continue; }\n    const v = b.getLinearVelocity(); if (v.x * v.x"]],
  // 天燈只有我方打得到（敵軍的砲彈穿過去沒事）
  lanternmine: [["if (o.hp <= 0 || side === 2) break;", "if (o.hp <= 0 || side !== 0) break;"]],
  // 爆炸把兵炸飛的力道上限（原本是 26：一炸就飛出城外）。KNOCK 由環境變數或 opt.knock 指定
  knock: [["const j = Math.min(Jw * 0.5 * f, o.mass * 26), dl = d || 1;", "const j = Math.min(Jw * 0.5 * f, o.mass * KNOCK), dl = d || 1;"]],
  // 火藥桶只有被直接打中、被火燒到（延燒）、被另一桶炸到才會爆；隔著樓板的爆風不算
  kegdirect: [["(o.mat === M_KEG ? f > 0.5 : rnd() < 0.3 + 0.6 * f)) ignite(o, 3 + rnd() * 2);", "(o.mat === M_KEG ? o === hit : rnd() < 0.3 + 0.6 * f)) ignite(o, 3 + rnd() * 2);"],
              ["blockHurt(o, o === hit ? dmg : dmg * 0.6 * f, kind, side);", "if (o.mat !== M_KEG || o === hit) blockHurt(o, o === hit ? dmg : dmg * 0.6 * f, kind, side);"]],
  // 被掉下來的東西砸到（對方比自己快、從上面來）傷害加倍
  crushup: [["const d = (dv - UIMP_V0) * UIMP_K;\n        if (d > 0) hurtUnit(o,", "let d = (dv - UIMP_V0) * UIMP_K; { const ot = k ? r.a : r.b; if (ot && ot.isBlock && ot.body && ot.body.getPosition().y > o.body.getPosition().y + 0.5) d = (dv - UIMP_V0 * 0.5) * UIMP_K * 2; }\n        if (d > 0) hurtUnit(o,"]]
};
module.exports = function load(opt) {
  opt = Object.assign({}, opt || {});
  // 也可以用環境變數指定：PATCHES=balloon,oob OOBK=4 KNOCK=10 node test/review-play/…
  if (!opt.patches && process.env.PATCHES) opt.patches = process.env.PATCHES.split(',');
  if (opt.oobK === undefined && process.env.OOBK) opt.oobK = +process.env.OOBK;
  if (opt.knock === undefined && process.env.KNOCK) opt.knock = +process.env.KNOCK;
  const dir = path.join(__dirname, '..', '..', 'src', 'parts');
  let base = fs.readdirSync(dir).filter((f) => /^(10|40|45|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  for (const name of (opt.patches || [])) for (const [a, b] of (PATCHES[name] || [])) { if (!base.includes(a)) throw new Error('patch ' + name + ' does not apply: ' + a.slice(0, 60)); base = base.split(a).join(b); }
  for (const [a, b] of (opt.replace || [])) { if (!base.includes(a)) throw new Error('replace does not apply: ' + a.slice(0, 60)); base = base.split(a).join(b); }
  const src = 'let OOB_K = ' + (opt.oobK === undefined ? 6 : opt.oobK) + ', KNOCK = ' + (opt.knock === undefined ? 26 : opt.knock) + ', RET_PEN = ' + (opt.retPen === undefined ? (process.env.RETPEN ? +process.env.RETPEN : 0.3) : opt.retPen) + ';\n' + base
    + `
const HOOK = { hurt: null, kill: null, explode: null, blockHurt: null, blockKill: null, cur: null };
{ const f0 = hurtUnit; hurtUnit = function (u, d, side, kind) { const hp0 = u.hp, al = u.alive; f0(u, d, side, kind); if (HOOK.hurt && al && d > 0) HOOK.hurt(u, Math.min(d, hp0), side, kind, hp0); }; }
{ const f0 = killUnit; killUnit = function (u, side, how) { const al = u.alive; f0(u, side, how); if (HOOK.kill && al) HOOK.kill(u, side, how); }; }
{ const f0 = physExplode; physExplode = function (x, y, w, side, mass, flag, hit, vx, vy) { if (HOOK.explode) HOOK.explode(x, y, w, side, mass, flag, hit); const prev = HOOK.cur; HOOK.cur = w.id; try { return f0(x, y, w, side, mass, flag, hit, vx, vy); } finally { HOOK.cur = prev; } }; }
{ const f0 = blockKill; blockKill = function (b, side, kind, clean) { const al = !b.dead, ip = b.inPlace; f0(b, side, kind, clean); if (HOOK.blockKill && al) HOOK.blockKill(b, side, kind, clean, ip); }; }
return {S, SH, PH, PL, HOOK, simInit, simStep, simAim, simFire, simSkill, LEVELS, BOTS, CASTLES, UNIT, WL, WPN, MAT, DIFFS, teamBar, structBar, srand, rnd, aiInit, simTrace, aimFor, aimOk, groundY, groundYRaw, mkCastle, physNew, physStep, physExplode, castleScan, blockKill, blockHurt, bossUnit, physQuery, blockDist, worldQuiet, flyersBusy, clampAim, CS, GRAV, VIEW_W, MID, STEP, VMIN, VMAX, ANG_MIN, ANG_MAX, K_CRUSH, K_FIRE, M_KEG, M_ICE, M_IRON, M_ROCK, M_WOOD, M_STONE, M_ROOF, M_CLAY, UNIT_W, UNIT_H, FRAG_MAX, FRAG_KEEP, setOob(k) { OOB_K = k; }};`;
  const G = new Function('planck', src)(planck);
  // 資料覆蓋（所有審查腳本通用）：CASTLE='{"E5":[…]}'  LV='{"5":{"foe":{"dmg":1.15}}}'（鍵是關卡編號 1–6）  MAT='{"keg":{"hp":30}}'
  const merge = (dst, src2) => { for (const k in src2) { if (src2[k] && typeof src2[k] === 'object' && !Array.isArray(src2[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], src2[k]); else dst[k] = src2[k]; } };
  const castle = opt.castle || (process.env.CASTLE ? JSON.parse(process.env.CASTLE) : null); if (castle) for (const k in castle) G.CASTLES[k].map = castle[k];
  const lv = opt.lv || (process.env.LV ? JSON.parse(process.env.LV) : null); if (lv) for (const k in lv) merge(G.LEVELS[+k - 1], lv[k]);
  const mat = opt.mat || (process.env.MAT ? JSON.parse(process.env.MAT) : null); if (mat) for (const k in mat) merge(G.MAT.find((x) => x && x.k === k), mat[k]);
  return G;
};
