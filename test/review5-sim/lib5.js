// 第五輪審查共用：載入器（探針都是「找得到錨點才掛」，所以同一支腳本可以拿舊版原始碼來比）
// const L = require('./lib5'); const H = {}; const G = L.load('extra, names', H, { dir, patch });
const fs = require('fs'), path = require('path');
const L4 = require('../review4-sim/lib4');
const ROOT = L4.ROOT;
const planck = require(path.join(ROOT, 'src', 'vendor', 'planck.min.js'));
const BASE = 'S, SH, PH, PL, simInit, simStep, simAim, simFire, simSkill, LEVELS, BOTS, CASTLES, UNIT, WL, WPN, MAT, DIFFS, teamBar, structBar, srand, rnd, aiInit, simTrace, aimFor, aimOk, groundY, groundYRaw, mkCastle, mkBlock, mkUnit, mkUnitBody, physNew, physStep, physExplode, physQuery, castleScan, blockKill, blockHurt, hurtUnit, killUnit, grantBonus, endCheck, worldQuiet, segSplit, segSettle, fracture, ignite, dropRock, spawnShot, clampAim, bossReturn, bossUnit, roundEnd, roundStart, startTurn, CS, GRAV, VIEW_W, MID, STEP, GUT, OUT_M, M_WOOD, M_STONE, M_IRON, M_ROOF, M_ICE, M_ROCK, M_KEG, M_CLAY, K_BLAST, K_PIERCE, K_HEAVY, K_FIRE, K_ICE, K_ZAP, K_CRUSH, K_DARK, CRUSH_LOAD, FRAG_MAX, FRAG_KEEP, UNIT_W, UNIT_H, foeHome, foeCell, wallLeft, foeAt, foeHas, foeKegs';
// 第五輪新加的探針
const TAGS5 = [
  // 邊緣規則：每推一步叫一次；判定改變叫一次
  ['if (u.edge && u.edgeT < 1.5) { u.edgeT += dt; u.body.applyLinearImpulse(', 'if (u.edge && u.edgeT < 1.5) { if (__H.edge) __H.edge(u, dt); u.edgeT += dt; u.body.applyLinearImpulse('],
  ['if (e !== u.edge) { u.edge = e; u.edgeT = 0; }', 'if (e !== u.edge) { if (__H.edgeSet) __H.edgeSet(u, e); u.edge = e; u.edgeT = 0; }'],
  // 兵跟兵推開
  ['a.sepNow = b.sepNow = true;\n      if (a.sepT > 2.4 || b.sepT > 2.4) continue;', 'a.sepNow = b.sepNow = true; if (__H.sepOn) __H.sepOn(a, b, ox, oy);\n      if (a.sepT > 2.4 || b.sepT > 2.4) continue; if (__H.sepPush) __H.sepPush(a, b, ox, oy, dt);'],
  // 屋瓦砸頭就碎
  ['if (oth && oth.isBlock && oth.mat === M_ROOF && !oth.dead && !oth.frag && (k ? -r.ny : r.ny) > 0.3) blockKill(', 'if (oth && oth.isBlock && oth.mat === M_ROOF && !oth.dead && !oth.frag && (k ? -r.ny : r.ny) > 0.3) { if (__H.roof) __H.roof(o, oth, r, k); } if (oth && oth.isBlock && oth.mat === M_ROOF && !oth.dead && !oth.frag && (k ? -r.ny : r.ny) > 0.3) blockKill('],
  // 回合怎麼結束的（靜下來了，還是等到上限）
  ["if (S.quietT >= 0.5 || S.phaseT > (S.time - S.chainT < 1.5 ? 14 : 9)) { if (S.phase === 'hazard') roundStart(); else endTurn(); }", "if (S.quietT >= 0.5 || S.phaseT > (S.time - S.chainT < 1.5 ? 14 : 9)) { if (__H.turnEnd) __H.turnEnd(S.quietT >= 0.5, S.phaseT); if (S.phase === 'hazard') roundStart(); else endTurn(); }"]
];
function load(extra, H, opt) {
  opt = opt || {}; H = H || {};
  const dir = opt.dir || process.env.SIEGE_SRC || path.join(ROOT, 'src', 'parts');
  let src = fs.readdirSync(dir).filter((f) => /^(10|40|45|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const missing = [];
  const patches = (opt.tag === false ? [] : L4.TAGS.concat(TAGS5)).concat(opt.patch || []);
  for (let pt of patches) {
    if (Array.isArray(pt[0])) { pt = pt.find((q) => src.includes(q[0])) || pt[0]; }
    const [a, b] = pt; if (!src.includes(a)) { missing.push(a.slice(0, 70).replace(/\n/g, ' ')); continue; } src = src.replace(a, b);
  }
  for (const pt of (opt.must || [])) { const [a, b] = pt; if (!src.includes(a)) throw new Error('patch anchor not found: ' + a.slice(0, 80)); src = src.replace(a, b); }
  src += '\nreturn {' + (BASE + (extra ? ', ' + extra : '')).split(',').map((n) => n.trim()).filter(Boolean).map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + ', __eval: (s) => eval(s)};';
  const G = new Function('planck', '__H', src)(planck, H);
  G.__dir = dir; G.__H = H; G.__missing = missing;
  return G;
}
// 兩個兵的身體有沒有疊在一起（跟 unitsStep 用同一條算式）；回傳 [橫向重疊, 縱向重疊]
function overlap(a, b) {
  const ox = (a.bw + b.bw) * 0.5 * 0.9 - Math.abs(b.x - a.x), oy = (a.bh + b.bh) * 0.5 * 0.85 - Math.abs(b.y + b.bh * 0.5 - a.y - a.bh * 0.5);
  return [ox, oy];
}
module.exports = { load, overlap, ROOT, UPMAX: L4.UPMAX, over: L4.over, bdesc: L4.bdesc, TAGS5 };
