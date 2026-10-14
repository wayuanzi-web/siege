// node test/arms.js [場數=3] [戰場 0–26，12、18、24、25 是魔王城、巨獸、天空要塞、疊城對決，不能選]：演武場（第三、四篇的兵器、誤傷、暴擊）各種組合打完整場，檢查會不會出錯、卡住
const G = require('./load')('practiceLevel, PRACTICE_BASE, UNIT_LIST'); const { S, simInit, simStep, BOTS, structBar } = G;
const N = +(process.argv[2] || 3), map = +(process.argv[3] || 0);
const NEW = ['chain', 'drill', 'cluster', 'sapper', 'magnet', 'wind', 'acid', 'sniper', 'eng'];
const crews = [NEW.slice(0, 6), NEW.slice(3, 9), ['sniper', 'sniper', 'acid', 'acid', 'magnet', 'wind'], ['cluster', 'drill', 'chain', 'sapper', 'eng', 'eng'],
  ['hook', 'weight', 'warp', 'mirror', 'hook', 'weight'], ['warp', 'sapper', 'mirror', 'chain', 'weight', 'drill'],
  ['vine', 'axe', 'mole', 'drum', 'vine', 'axe'], ['mole', 'fire', 'drum', 'axe', 'bomb', 'vine'],
  ['flare', 'glider', 'antigrav', 'time', 'glider', 'antigrav'], ['time', 'bomb', 'antigrav', 'flare', 'chain', 'time'],          // 第四篇（工匠營）
  ['press', 'rivet', 'jar', 'oilpot', 'alch', 'press'], ['alch', 'jar', 'zap', 'oilpot', 'fire', 'ice'],          // 第五篇
  ['shove', 'swivel', 'decoy', 'boost', 'anchor', 'net'], ['net', 'anchor', 'shove', 'bomb', 'swivel', 'boost'],          // 第五篇第二批
  ['ram', 'ladder', 'alter', 'mirage', 'star', 'ram'], ['star', 'mirage', 'ladder', 'bomb', 'alter', 'fire']];          // 第五篇第三批
let bad = 0;
for (let k = 0; k < crews.length; k++) for (let sd = 0; sd < N; sd++) {
  const me = crews[k], foe = crews[(k + 1) % crews.length], lv = G.practiceLevel(map, me, foe, 1);
  const ev = {}; let t0 = Date.now();
  try {
    simInit(lv, {}, 7000 + sd * 7919 + k * 131, 1, { botA: BOTS.casual });
    S.on = (t) => { ev[t] = (ev[t] || 0) + 1; };
    while (S.state === 'play' && S.round < 30) simStep(1 / 60);
  } catch (e) { bad++; console.log('ERR', k, sd, e.stack.split('\n').slice(0, 4).join(' | ')); continue; }
  const keys = ['split', 'stuck', 'chargego', 'defuse', 'drill', 'chainhit', 'tangle', 'magpulse', 'twister', 'fix', 'wall', 'crit', 'elem', 'douse', 'hookin', 'hookyank', 'warpopen', 'warpin', 'mirrorhit', 'weightpress', 'sawtilt', 'vinecut', 'vinegrow', 'strangle', 'axechop', 'moleboom', 'drumquake', 'sandsink', 'flarein', 'gravslam', 'echoarm', 'torchout', 'pressin', 'rivet', 'lqpour', 'tankburst', 'lqshock', 'oilfire', 'lqstone', 'shoved', 'swivel', 'dummy', 'boostgo', 'anchorin', 'netcatch', 'ramhit', 'ladderin', 'ladderraid', 'alter', 'mirageup', 'mirrorhit', 'starmark', 'starfall'].map((q) => q + ':' + (ev[q] || 0)).join(' ');
  console.log(`crew${k} #${sd} ${S.state} R${S.round} bars ${structBar(0).toFixed(2)}/${structBar(1).toFixed(2)} alive ${S.team[0].alive}/${S.team[1].alive} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${keys}`);
}
console.log(bad ? bad + ' 場出錯' : '都沒出錯');
