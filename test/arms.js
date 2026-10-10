// node test/arms.js [場數=3] [戰場 0–11]：演武場（第三篇的兵器、誤傷、暴擊）各種組合打完整場，檢查會不會出錯、卡住
const G = require('./load')('practiceLevel, PRACTICE_BASE, UNIT_LIST'); const { S, simInit, simStep, BOTS, structBar } = G;
const N = +(process.argv[2] || 3), map = +(process.argv[3] || 0);
const NEW = ['chain', 'drill', 'cluster', 'sapper', 'magnet', 'wind', 'acid', 'sniper', 'eng'];
const crews = [NEW.slice(0, 6), NEW.slice(3, 9), ['sniper', 'sniper', 'acid', 'acid', 'magnet', 'wind'], ['cluster', 'drill', 'chain', 'sapper', 'eng', 'eng']];
let bad = 0;
for (let k = 0; k < crews.length; k++) for (let sd = 0; sd < N; sd++) {
  const me = crews[k], foe = crews[(k + 1) % crews.length], lv = G.practiceLevel(map, me, foe, 1);
  const ev = {}; let t0 = Date.now();
  try {
    simInit(lv, {}, 7000 + sd * 7919 + k * 131, 1, { botA: BOTS.casual });
    S.on = (t) => { ev[t] = (ev[t] || 0) + 1; };
    while (S.state === 'play' && S.round < 30) simStep(1 / 60);
  } catch (e) { bad++; console.log('ERR', k, sd, e.stack.split('\n').slice(0, 4).join(' | ')); continue; }
  const keys = ['split', 'stuck', 'chargego', 'defuse', 'drill', 'chainhit', 'tangle', 'magpulse', 'twister', 'fix', 'wall', 'crit', 'elem', 'douse'].map((q) => q + ':' + (ev[q] || 0)).join(' ');
  console.log(`crew${k} #${sd} ${S.state} R${S.round} bars ${structBar(0).toFixed(2)}/${structBar(1).toFixed(2)} alive ${S.team[0].alive}/${S.team[1].alive} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${keys}`);
}
console.log(bad ? bad + ' 場出錯' : '都沒出錯');
