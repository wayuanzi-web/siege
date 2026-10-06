// 載入模擬，但先對原始碼套幾個「建議的修法」（只在記憶體裡改，不動 src/）。用來確認修法真的有效、沒有副作用。
//   const G = require('./patched')(['fin-all-blocks', 'aim-lock', ...])
const fs = require('fs'), path = require('path');
const planck = require(path.join(__dirname, '..', '..', 'src', 'vendor', 'planck.min.js'));
const PATCHES = {
  // H3：還在自己城裡（F_IN）的砲彈，不只穿過自己的磚，也穿過落石和別人的碎磚（兵照樣會擋）
  'fin-all-blocks': [["if (o.isBlock) { if (RAY.own && o.side === RAY.side) return -1; }", "if (o.isBlock) { if (RAY.own && (o.side === RAY.side || o.side === 2 || o.frag)) return -1; }"]],
  // H16/H20：F_IN 只在「從正面飛出去」或「飛到城頂上面」時取消，而且這一步先照舊的旗標撞完再取消
  'fin-front-only': [
    ["      if (SH.age[i] > 0.3 && (nx < st.x0 - 1 || nx > st.x1 + 1 || ny > st.y1 + 4)) { flag &= ~F_IN; SH.flag[i] = flag; }\n    }\n    // 磚、兵、地面\n    const hit = rayShot(x, y, nx, ny, side, (flag & F_IN) !== 0);",
     "    }\n    // 磚、兵、地面\n    const hit = rayShot(x, y, nx, ny, side, (flag & F_IN) !== 0);\n    if (!hit && (flag & F_IN) && side < 2) { const st = S.st[side]; if (SH.age[i] > 0.3 && ((side === 0 ? nx > st.x1 + 1 : nx < st.x0 - 1) || ny > st.y1 + 4)) { flag &= ~F_IN; SH.flag[i] = flag; } }"],
    ["    if (inOwn && t > 0.3 && (nx < own.x0 - 1 || nx > own.x1 + 1 || ny > own.y1 + 4)) inOwn = false;\n    const h = rayShot(x, y, nx, ny, side, inOwn);",
     "    const h = rayShot(x, y, nx, ny, side, inOwn);\n    if (!h && inOwn && t > 0.3 && ((side === 0 ? nx > own.x1 + 1 : nx < own.x0 - 1) || ny > own.y1 + 4)) inOwn = false;"]
  ],
  // H1：開火那一刻把角度鎖進佇列
  'aim-lock': [
    ["for (let r = 0; r < reps; r++) for (let k = 0; k < n; k++) q.push({ t: t0 + r * (n * g + 0.16) + k * g, u, w });", "for (let r = 0; r < reps; r++) for (let k = 0; k < n; k++) q.push({ t: t0 + r * (n * g + 0.16) + k * g, u, w, ax: T.aim[0], ay: T.aim[1] });"],
    ["if (e.w) unitFire(e.u, T, e.w);", "if (e.w) unitFire(e.u, T, e.w, e.ax, e.ay);"],
    ["function unitFire(u, T, w) {", "function unitFire(u, T, w, ax, ay) {"],
    ["const vx = (T.aim[0] * c - T.aim[1] * s * dir) * sp, vy = (T.aim[1] * c + T.aim[0] * s * dir) * sp;", "const vx = (ax * c - ay * s * dir) * sp, vy = (ay * c + ax * s * dir) * sp;"]
  ],
  // H7：simTrace 用砲彈飛到時的傳送門位置
  'trace-portal-motion': [["else if (o.t === 'portal') { if (o.owner === side) { const dx = nx - o.x, dy = ny - o.y;", "else if (o.t === 'portal') { if (o.owner === side) { const py = o.mv ? o.by + o.mv.a * tri((t0 + t) / o.mv.per + (o.mv.ph || 0)) : o.y, dx = nx - o.x, dy = ny - py;"]],
  // H2：凍住／電暈的判斷要在遞減之前做
  'boss-frozen': [
    ["  let t0 = 0.05, any = false;\n  for (const u of T.units) {", "  let t0 = 0.05, any = false; const bu0 = S.boss && side === 1 ? bossUnit() : null, bossOut = !!(bu0 && (bu0.frozen > 0 || bu0.stun > 0));\n  for (const u of T.units) {"],
    ["if (S.boss && side === 1 && !T.mute) bossVolley(q, t0);", "if (S.boss && side === 1 && !T.mute && !bossOut) bossVolley(q, t0);"]
  ],
  // H17：開火瞬間開護罩只給自動玩家用（關卡的 foe.ai.skill 只管連珠）
  'no-foe-shield': [["function aiReact(T) { const A = T.ai; if (A && A.skill > 0 &&", "function aiReact(T) { const A = T.ai; if (A && T.side === 0 && A.skill > 0 &&"]],
  // H23：防空弩的凍結／電暈改在「對方開火」時消耗（那才是它做事的時候）
  'flak-freeze': [
    ["    if (u.frozen > 0 || u.stun > 0) { ev('skip', u.x, u.y + 4, side, u.frozen > 0 ? 0 : 1);", "    if (u.def.flak) continue;\n    if (u.frozen > 0 || u.stun > 0) { ev('skip', u.x, u.y + 4, side, u.frozen > 0 ? 0 : 1);"],
    ["for (const u of foe.units) if (u.alive && u.def.flak) u.flakN = u.def.flak;", "for (const u of foe.units) if (u.alive && u.def.flak) { if (u.frozen > 0 || u.stun > 0) { ev('skip', u.x, u.y + 4, 1 - side, u.frozen > 0 ? 0 : 1); u.flakN = 0; u.hold = 1; } else { u.flakN = u.def.flak; u.hold = 0; } }\n  for (const u of T.units) if (u.alive && u.def.flak && u.hold) { u.hold = 0; u.frozen = Math.max(0, u.frozen - 1); u.stun = Math.max(0, u.stun - 1); }"]
  ],
  // H18：兵一離開看得到的戰場就算掉出去（原本是 -30 / +30）
  'unit-bounds': [["if (u.y < -26 || u.x < -30 || u.x > VIEW_W + 30)", "if (u.y < -26 || u.x < -GUT + 3 || u.x > VIEW_W + GUT - 3)"]],
  // G：落石落地之後滾動阻力加大；滾出畫面就清掉
  'rock-damping': [
    ["if (v.y > -12) { b.fall = 0; b.body.setBullet(false); continue; }", "if (v.y > -12) { b.fall = 0; b.body.setBullet(false); b.rollD = 3; b.body.setAngularDamping(3); continue; }"],
    ["b.body.setAngularDamping(slow ? 9 : 0.7);", "b.body.setAngularDamping(slow ? 9 : (b.rollD || 0.7));"]
  ]
};
module.exports = function load(names, extra) {
  const dir = path.join(__dirname, '..', '..', 'src', 'parts');
  let src = fs.readdirSync(dir).filter((f) => /^(10|40|45|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  for (const n of names || []) for (const [a, b] of PATCHES[n]) { const k = src.split(a).length - 1; if (k !== 1) throw new Error(`patch ${n}: expected exactly 1 match, found ${k}: ${a.slice(0, 60)}`); src = src.replace(a, () => b); }
  const names0 = 'S, SH, PH, PL, simInit, simStep, simAim, simFire, simSkill, LEVELS, BOTS, CASTLES, UNIT, WL, WPN, MAT, DIFFS, teamBar, structBar, srand, rnd, simTrace, aimFor, aimOk, groundY, mkCastle, physNew, physStep, physExplode, castleScan, blockKill, blockHurt, CS, GRAV, VIEW_W, MID, STEP';
  const all = Array.from(new Set((names0 + (extra ? ', ' + extra : '')).split(',').map((x) => x.trim()).filter(Boolean)));
  return new Function('planck', src + '\nreturn {' + all.join(', ') + '};')(planck);
};
module.exports.PATCHES = PATCHES;
