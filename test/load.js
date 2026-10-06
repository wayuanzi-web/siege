// 把模擬用的幾個原始檔載進 Node：const G = require('./load')();
const fs = require('fs'), path = require('path');
module.exports = function load(extra) {
  const dir = path.join(__dirname, '..', 'src', 'parts');
  const src = fs.readdirSync(dir).filter((f) => /^(10|40|50|52|60|65)-.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')
    + '\nreturn {S, SH, simInit, simStep, simAim, simSkill, LEVELS, BOTS, CASTLES, UNIT, WL, WPN, MAT, DIFFS, teamBar, structHp, srand, rnd, aiInit, aiPlan, simTrace, aimFor, aimOk, groundY, isSolid, CS, GRAV, VIEW_W, MID, STEP' + (extra ? ', ' + extra : '') + '};';
  return new Function(src)();
};
