// node test/review-play/hidden.js [bot=casual] [場數=40]
// 輪到我瞄準的時候，還活著的敵兵站在哪裡：城裡、城外看得到的地方、被右下角技能按鈕蓋住（844x390：x 116.3–126.5、y < 14）、畫面外（x > 127.5，還沒到 142 所以還活著）。
// 我方的兵同樣統計（畫面左緣 x < -15.5）。
const G = require('./lib')();
const { S, simInit, simStep, LEVELS, BOTS } = G;
const botName = process.argv[2] || 'casual', N = +(process.argv[3] || 40);
for (let li = 0; li < LEVELS.length; li++) {
  let turns = 0, anyOut = 0, anyBtn = 0, anyOff = 0, lastBtn = 0, lastOff = 0, lastTurns = 0, myOff = 0, myOut = 0, gamesHidden = 0, myField = 0, roundsWasted = 0;
  const xs = [];
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 31 + sd * 7919 + li * 131, 1, { botA: BOTS[botName] });
    let prev = '', hid = false;
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      const key = S.phase + S.turn + S.round;
      if (key !== prev) {
        prev = key;
        if (S.phase === 'aim' && S.turn === 0) {
          turns++; let out = false, btn = false, off = false; const foe = S.team[1].units.filter((u) => u.alive), st = S.st[1];
          for (const u of foe) { if (u.x > st.x1 + 1.5 || u.x < st.x0 - 1.5) { out = true; xs.push(Math.round(u.x)); } if (u.x > 116.3 && u.x < 126.5 && u.y < 14) btn = true; if (u.x >= 126.5) off = true; }
          if (out) anyOut++; if (btn) anyBtn++; if (off) anyOff++;
          if (foe.length === 1 || (S.boss && foe.some((u) => u.type === 'boss'))) { lastTurns++; const u = S.boss ? foe.find((x) => x.type === 'boss') : foe[0]; if (u.x > 116.3 && u.x < 126.5 && u.y < 14) { lastBtn++; hid = true; } if (u.x >= 126.5) { lastOff++; hid = true; } }
          const my = S.team[0].units.filter((u) => u.alive), ms = S.st[0];
          for (const u of my) { if (u.x < -15.5) myOff++; if (u.x < ms.x0 - 1.5 || u.x > ms.x1 + 1.5) myOut++; if (u.x > 40) myField++; }
        }
      }
    }
    if (hid) gamesHidden++;
  }
  const hist = {}; for (const x of xs) { const k = x < 78 ? '<78 (front/field)' : x <= 110 ? '78-110' : x <= 116 ? '110-116 visible' : x <= 126 ? '116-126 UNDER BUTTONS' : '>126 OFF-SCREEN'; hist[k] = (hist[k] || 0) + 1; }
  console.log(`L${li + 1} ${LEVELS[li].name}: my aim turns ${turns}; a living foe outside its castle in ${anyOut} (${(anyOut / turns * 100).toFixed(0)}%), under the skill buttons in ${anyBtn} (${(anyBtn / turns * 100).toFixed(0)}%), off-screen right in ${anyOff} (${(anyOff / turns * 100).toFixed(0)}%)`);
  console.log(`     when one foe is left (${lastTurns} turns): under buttons ${lastBtn}, off-screen ${lastOff}; games where the last foe was hidden at least once: ${gamesHidden}/${N}`);
  console.log(`     where outside foes stand: ${JSON.stringify(hist)}; my soldiers: outside my castle ${myOut} unit-turns, in the middle/enemy side (x>40) ${myField}, off-screen left ${myOff}`);
}
