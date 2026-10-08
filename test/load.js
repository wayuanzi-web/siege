// 把模擬用的幾個原始檔載進 Node：const G = require('./load')();
const fs = require('fs'), path = require('path');
const planck = require(path.join(__dirname, '..', 'src', 'vendor', 'planck.min.js'));
module.exports = function load(extra) {
  const dir = process.env.SIEGE_SRC || path.join(__dirname, '..', 'src', 'parts');          // SIEGE_SRC=<目錄>：換成別版的原始檔來比
  const src = fs.readdirSync(dir).filter((f) => /^(10|40|45|48|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')
    + '\nreturn {S, SH, PH, PL, simInit, simStep, simAim, simFire, simSkill, LEVELS, BOTS, CASTLES, UNIT, WL, WPN, MAT, DIFFS, teamBar, structBar, srand, rnd, aiInit, simTrace, aimFor, aimOk, groundY, mkCastle, physNew, physStep, physExplode, castleScan, blockKill, blockHurt, CS, GRAV, VIEW_W, MID, STEP' + (extra ? ', ' + extra : '') + '};';
  return new Function('planck', src)(planck);
};
