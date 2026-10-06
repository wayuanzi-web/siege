// 第六關拆解：把機關一個一個關掉，看是誰卡住進度
const G = require('./load')();
const { S, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const base = JSON.stringify(LEVELS[5]);
function run(name, mod, bot) {
  const lv = JSON.parse(base); mod(lv); LEVELS[5] = lv;
  let wins = 0, ts = 0, fb = 0; const N = 6;
  for (let sd = 0; sd < N; sd++) {
    simInit(5, {}, 31 + sd * 977, 1, { botA: BOTS[bot || 'casual'] });
    while (S.state === 'play' && S.time < 320) simStep(1 / 60);
    if (S.state === 'won') wins++; ts += S.time; fb += teamBar(1);
  }
  console.log(name.padEnd(28), `wins ${wins}/${N} avgT=${(ts / N).toFixed(0)} foeBarEnd=${(fb / N * 100).toFixed(0)}%`);
}
run('as is', () => {});
run('no barrier', (lv) => { lv.boss.p2 = -1; lv.boss.p3 = -1; });
run('no flak', (lv) => { lv.foe.crew[3] = 'rocket'; });
run('barrier arc 0.3', (lv) => { lv.boss.arc = 0.3; });
run('no flak + arc .3', (lv) => { lv.foe.crew[3] = 'rocket'; lv.boss.arc = 0.3; });
run('orb every 30', (lv) => { lv.boss.orbEvery = 30; });
