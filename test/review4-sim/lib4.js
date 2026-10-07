// 第四輪審查共用：載入器（可在記憶體裡替原始碼加探針，不動 src/）、常用小工具
// const L = require('./lib4'); const G = L.load('extra, names', { hooks: H, tag: true });
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const planck = require(path.join(ROOT, 'src', 'vendor', 'planck.min.js'));
const BASE = 'S, SH, PH, PL, simInit, simStep, simAim, simFire, simSkill, LEVELS, BOTS, CASTLES, UNIT, WL, WPN, MAT, DIFFS, teamBar, structBar, srand, rnd, aiInit, simTrace, aimFor, aimOk, groundY, groundYRaw, mkCastle, mkBlock, mkUnit, physNew, physStep, physExplode, physQuery, castleScan, blockKill, blockHurt, hurtUnit, killUnit, grantBonus, endCheck, worldQuiet, segSplit, segSettle, fracture, ignite, dropRock, spawnShot, clampAim, CS, GRAV, VIEW_W, MID, STEP, M_WOOD, M_STONE, M_IRON, M_ROOF, M_ICE, M_ROCK, M_KEG, M_CLAY, K_BLAST, K_PIERCE, K_HEAVY, K_FIRE, K_ICE, K_ZAP, K_CRUSH, K_DARK, CRUSH_LOAD, FRAG_MAX, FRAG_KEEP';
// 探針：__H.ctx 記「現在是誰在扣血」；__H.hurt(u, d, side, kind, ctx) 每次扣血都叫
const TAGS = [
  ['function hurtUnit(u, d, side, kind) {\n  if (!u.alive || d <= 0) return;', 'function hurtUnit(u, d, side, kind) {\n  if (!u.alive || d <= 0) return; if (__H.hurt) __H.hurt(u, d, side, kind, __H.ctx);'],
  ['function killUnit(u, side, how) {\n  if (!u.alive) return;', 'function killUnit(u, side, how) {\n  if (!u.alive) return; if (__H.kill) __H.kill(u, side, how, __H.ctx);'],
  // （壓扁那一行後來改寫過：新舊兩種寫法都認，找得到哪一種就掛哪一種）
  [['if (!u.def.big && u.load > CRUSH_LOAD) { u.loadT += dt; if (u.loadT > 0.3) { hurtUnit(', 'if (__H.load) __H.load(u, u.load); if (!u.def.big && u.load > CRUSH_LOAD) { u.loadT += dt; if (u.loadT > 0.3) { __H.ctx = "load"; hurtUnit('],
   ['if (load > CRUSH_LOAD) { u.loadT += dt; if (u.loadT > 0.3) { hurtUnit(', 'if (__H.load) __H.load(u, load); if (load > CRUSH_LOAD) { u.loadT += dt; if (u.loadT > 0.3) { __H.ctx = "load"; hurtUnit(']],
  ['  const credit = S.phase === \'hazard\' ? 2 : S.turn;\n  for (let i = 0; i < PH.impN; i++) {\n    const r = PH.imp[i];', '  const credit = S.phase === \'hazard\' ? 2 : S.turn;\n  for (let i = 0; i < PH.impN; i++) {\n    const r = PH.imp[i]; __H.ctx = "impact"; __H.imp = r;'],
  ['function physExplode(x, y, w, side, mass, flag, hit, vx, vy) {', 'function physExplode(x, y, w, side, mass, flag, hit, vx, vy) { __H.ctx = "blast:" + w.id; if (__H.boom) __H.boom(x, y, w, side, mass, flag, hit);'],
  ['function lightning(x, y, mul, side) {', 'function lightning(x, y, mul, side) { __H.ctx = "zap";'],
  ['function burnStep(dt) {\n  if (S.nburn <= 0) return;', 'function burnStep(dt) {\n  if (S.nburn <= 0) return; __H.ctx = "burn";'],
  ['function bossReturn(u) {', 'function bossReturn(u) { __H.ctx = "bossReturn";'],
  ['function finStep(st, dt) {', 'function finStep(st, dt) { __H.ctx = "fin";'],
  ['if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, u.y < -26 ? 4 : 6); continue; }', '__H.ctx = "offfield"; if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, u.y < -26 ? 4 : 6); continue; }'],
  ['if (u.outT > 0.6) { if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, 5); }', 'if (u.outT > 0.6) { __H.ctx = "outcastle"; if (u.def.big) bossReturn(u); else killUnit(u, 1 - u.side, 5); }'],
  ['function segSplit(b, side, kind) {', 'function segSplit(b, side, kind) { if (__H.split) __H.split(b, side, kind);'],
  ['function grantBonus(side, kind, x, y) {', 'function grantBonus(side, kind, x, y) { if (__H.bonus) __H.bonus(side, kind, x, y);']
];
function load(extra, opt) {
  opt = opt || {};
  const dir = opt.dir || process.env.SIEGE_SRC || path.join(ROOT, 'src', 'parts');
  let src = fs.readdirSync(dir).filter((f) => /^(10|40|45|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const H = opt.hooks || {};
  const patches = (opt.tag === false ? [] : TAGS).concat(opt.patch || []);
  for (let pt of patches) {
    if (Array.isArray(pt[0])) { pt = pt.find((q) => src.includes(q[0])) || pt[0]; }
    const [a, b] = pt; if (!src.includes(a)) throw new Error('patch anchor not found: ' + a.slice(0, 80)); src = src.replace(a, b);
  }
  // 舊版原始碼可能沒有其中幾個名字：沒有的就給 undefined，不要整個載入失敗
  src += '\nreturn {' + (BASE + (extra ? ', ' + extra : '')).split(',').map((n) => n.trim()).filter(Boolean).map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + ', __eval: (s) => eval(s)};';
  const G = new Function('planck', '__H', src)(planck, H);
  G.__dir = dir; G.__H = H;
  return G;
}
const UPMAX = { dmg: 5, aim: 5, hp: 5, shield: 5, ult: 5 };
// 一場打到底；回傳結束時的狀態。opt.maxRound 回合上限（預設 40）；opt.each 每一步叫一次
function play(G, li, up, seed, diff, bot, opt) {
  opt = opt || {};
  const { S, simInit, simStep, BOTS } = G;
  simInit(li, up || {}, seed, diff === undefined ? 1 : diff, bot ? { botA: typeof bot === 'string' ? BOTS[bot] : bot } : undefined);
  if (opt.init) opt.init();
  const maxR = opt.maxRound || 40;
  while (S.state === 'play' && S.round < maxR) { simStep(1 / 60); if (opt.each) opt.each(); }
  if (opt.tail) { let n = Math.round(opt.tail * 60); while (n-- > 0) { simStep(1 / 60); if (opt.each) opt.each(); } }
  return S.state;
}
function unitsAt(G, x, y, r) { const out = []; for (const u of G.S.units) if (u.alive && Math.hypot(u.x - x, u.y + 1.5 - y) < r) out.push(u); return out; }
// 一個兵頭頂上（肩膀以上、左右各一點）有哪些磚壓著或擋著
function over(G, u) {
  const out = [], p = u.body.getPosition();
  for (const b of G.S.blocks) {
    if (b.dead) continue; const q = b.body.getPosition();
    const rad = b.kind === 'ball' ? b.r : Math.hypot(b.w, b.h) / 2;
    if (Math.abs(q.x - p.x) < u.bw / 2 + rad && q.y > p.y && q.y - p.y < u.bh / 2 + rad + 0.6) out.push(b);
  }
  return out;
}
const bdesc = (b) => (b.frag ? 'frag' : b.kind === 'ball' ? (b.mat === 6 ? 'rock' : 'barrel') : b.prop ? 'prop' : b.seg ? 'seg' + b.cw : 'blk' + (b.cw || '?') + 'x' + (b.ch || '?')) + '.m' + b.mat + '.s' + b.side + '.M' + b.mass.toFixed(0);
module.exports = { load, UPMAX, ROOT, play, unitsAt, over, bdesc, TAGS };
