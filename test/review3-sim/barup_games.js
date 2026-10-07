// node test/review3-sim/barup_games.js <每關場數=20> [bot=casual]
// 畫面上方的城防條（teamBar）會不會在「挨打之後」自己往上跳：每一步記錄兩邊的 teamBar / structBar，
// 沒有補血、沒有援兵的時候，只要比前一步高就算一次，記下最大的一次跳了多少、是在什麼時候。
// SIEGE_SRC 可以換成舊版原始碼比較
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, LEVELS, BOTS, teamBar, structBar } = G;
const N = +(process.argv[2] || 20), bot = process.argv[3] || 'casual';
console.log(`src=${G.__dir} bot=${bot}`);
for (let li = 0; li < LEVELS.length; li++) {
  let vols = 0, upVol = [0, 0, 0, 0], maxUp = 0, maxAt = '', maxS = 0, sumNet = 0, netN = 0; const ex = [];
  for (let sd = 0; sd < N; sd++) {
    const seed = 31000 + sd * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    let bonus = -99, prev = [teamBar(0), teamBar(1)], prevS = [structBar(0), structBar(1)], cur = null, low = [1, 1], lowS = [1, 1];
    const close = () => { if (!cur) return; vols++; const u = Math.max(cur.up[0], cur.up[1]); upVol[u > 0.05 ? 3 : u > 0.02 ? 2 : u > 0.005 ? 1 : 0]++; if (u > maxUp) { maxUp = u; maxAt = cur.tag; } const us = Math.max(cur.ups[0], cur.ups[1]); if (us > maxS) maxS = us; if (u > 0.03 && ex.length < 5) ex.push(`${cur.tag}: bar came back up by ${(100 * u).toFixed(1)} points (structure part ${(100 * us).toFixed(0)} points of structBar)`); };
    S.on = (t, a, b, c, d) => { if (t === 'bonus' || t === 'revive') bonus = S.frame; if (t === 'volley') { close(); cur = { tag: `L${li + 1} seed${seed} r${S.round} volley by side${a}`, up: [0, 0], ups: [0, 0] }; low = [teamBar(0), teamBar(1)]; lowS = [structBar(0), structBar(1)]; } };
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      if (S.state !== 'play') break;
      for (let s = 0; s < 2; s++) {
        const tb = teamBar(s), sb = structBar(s);
        if (S.frame - bonus < 3) { low[s] = tb; lowS[s] = sb; }           // 補血、援兵：重新起算
        // 這一輪裡，從最低點回升了多少
        if (tb < low[s]) low[s] = tb; else if (cur && tb - low[s] > cur.up[s]) cur.up[s] = tb - low[s];
        if (sb < lowS[s]) lowS[s] = sb; else if (cur && sb - lowS[s] > cur.ups[s]) cur.ups[s] = sb - lowS[s];
      }
    }
    close();
  }
  console.log(`L${li + 1}: ${vols} volleys; within one volley the top bar (teamBar) climbed back from its lowest point by  <0.5pt: ${upVol[0]} | 0.5-2pt: ${upVol[1]} | 2-5pt: ${upVol[2]} | >5pt: ${upVol[3]}   (largest ${(100 * maxUp).toFixed(1)} points at ${maxAt}; largest structBar rebound ${(100 * maxS).toFixed(0)} points)`);
  for (const e of ex) console.log('     ' + e);
}
