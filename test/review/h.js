// 共用：把模擬載進來，順便匯出一堆內部名字（review 用）
const path = require('path');
const EXTRA = [
  'physQuery', 'hurtUnit', 'killUnit', 'grantBonus', 'spawnLantern', 'startTurn', 'endTurn', 'roundEnd', 'roundStart',
  'bossUnit', 'bossReturn', 'bossRound', 'bossVolley', 'spawnOrb', 'spawnBalloon', 'dropRock', 'rocksVsShields', 'rockMarks',
  'gateSpawn', 'gateRemove', 'gatesRound', 'gatesStep', 'shotsStep', 'spawnShot', 'killShot', 'objsStep', 'unitsStep', 'burnStep',
  'endCheck', 'finStep', 'ignite', 'fracture', 'mkBlock', 'mkUnit', 'mkUnitBody', 'lightning', 'rayShot', 'RAY', 'blockDist', 'inBubble',
  'barrierSeg', 'barrierRound', 'flakStep', 'flyersBusy', 'worldQuiet', 'aiBegin', 'aiEval', 'aiChoose', 'aiStep', 'aiReact', 'gatePosAt',
  'clampAim', 'K_BLAST', 'K_PIERCE', 'K_HEAVY', 'K_FIRE', 'K_ICE', 'K_ZAP', 'K_CRUSH', 'K_DARK',
  'M_WOOD', 'M_STONE', 'M_IRON', 'M_ROOF', 'M_ICE', 'M_ROCK', 'M_KEG', 'M_CLAY', 'F_IN', 'F_WILD', 'F_FIRE', 'F_PORT',
  'FRAG_MAX', 'FRAG_KEEP', 'SHOT_CAP', 'NS', 'DV_MAX', 'IMP_GATE', 'IMP_V0', 'IMP_K', 'UIMP_V0', 'UIMP_K', 'VMIN', 'VMAX', 'ANG_MIN', 'ANG_MAX',
  'CASTLE_L', 'CASTLE_R', 'GROUND_D', 'groundYRaw', 'tri', 'gauss', 'segHit', 'gateMultiply', 'unitFire', 'BAR_LANES', 'UNIT_W', 'UNIT_H',
  'polyArea', 'splitPoly', 'TAU', 'DM', 'BAR_TH', 'SPLIT_P', 'castleCols', 'mkTeam', 'terrainRuns', 'aiInit', 'ev', 'ri', 'rr'
].join(', ');
// PATCH=fin-all-blocks,aim-lock node test/review/xxx.js → 用套了建議修法的模擬跑同一支腳本（見 patched.js）
module.exports = function () {
  if (process.env.PATCH) { console.log('[patched sim: ' + process.env.PATCH + ']'); return require('./patched')(process.env.PATCH.split(','), EXTRA); }
  return require(path.join(__dirname, '..', 'load.js'))(EXTRA);
};
