// review2-sim 共用：把模擬載進 Node，匯出一大堆內部名字。每呼叫一次就是一份全新的模擬（互不影響）。
//   const G = require('./h')();            // 原版
//   const G = require('./h')({ patch: [[舊字串, 新字串], ...] });   // 只在記憶體裡改原始碼（驗證建議的修法用，不動 src/）
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const planck = require(path.join(ROOT, 'src', 'vendor', 'planck.min.js'));
const NAMES = [
  'S', 'SH', 'PH', 'PL', 'simInit', 'simStep', 'simAim', 'simFire', 'simSkill', 'LEVELS', 'BOTS', 'CASTLES', 'UNIT', 'WL', 'WPN', 'MAT', 'DIFFS',
  'teamBar', 'structBar', 'srand', 'rnd', 'aiInit', 'simTrace', 'aimFor', 'aimOk', 'groundY', 'mkCastle', 'physNew', 'physStep', 'physExplode',
  'castleScan', 'blockKill', 'blockHurt', 'CS', 'GRAV', 'VIEW_W', 'MID', 'STEP', 'GUT', 'OUT_M', 'MUZ_BIG', 'VIEW_H', 'GROUND_D',
  'physQuery', 'hurtUnit', 'killUnit', 'grantBonus', 'spawnLantern', 'startTurn', 'endTurn', 'roundEnd', 'roundStart', 'burialCheck', 'chainNote', 'chainCount',
  'bossUnit', 'bossReturn', 'bossRound', 'bossVolley', 'spawnOrb', 'spawnBalloon', 'dropRock', 'rocksVsShields', 'rockMarks',
  'gateSpawn', 'gateRemove', 'gatesRound', 'gatesStep', 'shotsStep', 'spawnShot', 'killShot', 'objsStep', 'unitsStep', 'burnStep',
  'endCheck', 'finStep', 'ignite', 'fracture', 'mkBlock', 'mkUnit', 'mkUnitBody', 'lightning', 'rayShot', 'RAY', 'blockDist', 'inBubble',
  'barrierSeg', 'barrierRound', 'flakStep', 'flyersBusy', 'worldQuiet', 'aiBegin', 'aiEval', 'aiChoose', 'aiStep', 'aiReact', 'gatePosAt',
  'clampAim', 'K_BLAST', 'K_PIERCE', 'K_HEAVY', 'K_FIRE', 'K_ICE', 'K_ZAP', 'K_CRUSH', 'K_DARK',
  'M_WOOD', 'M_STONE', 'M_IRON', 'M_ROOF', 'M_ICE', 'M_ROCK', 'M_KEG', 'M_CLAY', 'F_IN', 'F_WILD', 'F_FIRE', 'F_PORT',
  'FRAG_MAX', 'FRAG_KEEP', 'SHOT_CAP', 'NS', 'DV_MAX', 'UKB_K', 'UKB_V', 'IMP_GATE', 'IMP_V0', 'IMP_K', 'UIMP_V0', 'UIMP_K', 'VMIN', 'VMAX', 'ANG_MIN', 'ANG_MAX',
  'CASTLE_L', 'CASTLE_R', 'groundYRaw', 'tri', 'gauss', 'segHit', 'gateMultiply', 'unitFire', 'BAR_LANES', 'UNIT_W', 'UNIT_H', 'UNIT_DEN',
  'polyArea', 'splitPoly', 'TAU', 'DM', 'BAR_TH', 'BASE_HP', 'BASE_WT', 'SPLIT_P', 'castleCols', 'mkTeam', 'terrainRuns', 'ev', 'ri', 'rr', 'clamp'
];
function source(patch) {
  const dir = path.join(ROOT, 'src', 'parts');
  let src = fs.readdirSync(dir).filter((f) => /^(10|40|45|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  for (const [a, b] of patch || []) { const k = src.split(a).length - 1; if (k !== 1) throw new Error('patch: expected exactly 1 match, found ' + k + ': ' + a.slice(0, 70)); src = src.replace(a, () => b); }
  return src;
}
module.exports = function load(opt) {
  opt = opt || {};
  const names = NAMES.concat(opt.extra || []);
  return new Function('planck', source(opt.patch) + '\nreturn {' + names.join(', ') + '};')(planck);
};
module.exports.ROOT = ROOT;
// 跟其它測試腳本一樣的種子算法（方便對照）
module.exports.seed = (base, sd, li) => base + sd * 7919 + li * 131;
module.exports.UP = (n) => ({ dmg: n, aim: n, hp: n, shield: n, ult: n });
