// node test/review3-sim/debris_dmg.js <每關場數=20> [bot=casual]
// 飛過整個戰場的碎塊：打對面的城，炸出來的碎塊／小東西飛回來砸到自己人、撞歪自己的城。
// 統計（自動玩家對打）：對方的碎塊、磚、小擺設飛進這一邊城樓範圍的次數和速度；「輪到自己開火的那一輪裡，自己的兵被砸傷（撞擊傷害）」的次數和總量；
// 有沒有兵是在自己開火的那一輪被砸死的。SIEGE_SRC 可以換成舊版原始碼比較
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, LEVELS, BOTS } = G;
const N = +(process.argv[2] || 20), bot = process.argv[3] || 'casual';
globalThis.__hu = null;
G.__eval(`(function(){ const o = hurtUnit; hurtUnit = function(u, d, side, kind){ const hp0 = u.hp, was = u.alive; o(u, d, side, kind); if (globalThis.__hu) globalThis.__hu(u, hp0 - Math.max(0, u.hp), side, kind, was && !u.alive); }; })()`);
console.log(`src=${G.__dir} bot=${bot}`);
for (let li = 0; li < LEVELS.length; li++) {
  const arr = [0, 0], fast = [0, 0], vmax = [0, 0], selfN = [0, 0], selfD = [0, 0], selfK = [0, 0], ex = []; let games = 0, vols = 0;
  for (let sd = 0; sd < N; sd++) {
    const seed = 606000 + sd * 7919 + li * 131; games++;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    const seen = new Set(); let volT = -99;
    S.on = (t, a) => { if (t === 'volley') { vols++; volT = S.time; } };
    globalThis.__hu = (u, lost, side, kind, died) => {
      // 輪到 u 這一邊開火、齊射之後的結算階段，他被撞傷：不是對方打的（對方這時候沒開火）
      if (kind !== 6 || lost <= 0 || u.side !== S.turn || (S.phase !== 'volley' && S.phase !== 'resolve') || S.time - volT < 0.8) return;
      selfN[u.side]++; selfD[u.side] += lost / u.hpMax; if (died) { selfK[u.side]++; if (ex.length < 5) ex.push(`L${li + 1} seed${seed} r${S.round}: side${u.side} ${u.type}#${u.slot} crushed to death during its own side's volley (${(S.time - volT).toFixed(1)}s after firing)`); }
    };
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      if (S.frame & 1) continue;
      for (const b of S.blocks) { if (b.dead || b.side > 1 || seen.has(b)) continue; const st = S.st[1 - b.side], p = b.body.getPosition(); if (p.x > st.x0 - 1 && p.x < st.x1 + 1 && p.y > 1.5) { seen.add(b); arr[b.side]++; const v = b.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > 30) fast[b.side]++; if (sp > vmax[b.side]) vmax[b.side] = sp; } }
    }
  }
  console.log(`L${li + 1} (${games} games, ${vols} volleys): pieces of the ENEMY castle that reached MY castle: ${arr[1]} (${(arr[1] / games).toFixed(1)}/game; faster than 30: ${fast[1]}; fastest ${vmax[1].toFixed(0)});  pieces of MY castle that reached theirs: ${arr[0]} (faster than 30: ${fast[0]}; fastest ${vmax[0].toFixed(0)})`);
  console.log(`     units hurt by impacts during their OWN side's volley: mine ${selfN[0]} times (${(100 * selfD[0] / games).toFixed(1)}% of a unit per game), theirs ${selfN[1]} times (${(100 * selfD[1] / games).toFixed(1)}%); killed that way: mine ${selfK[0]}, theirs ${selfK[1]}`);
  for (const e of ex) console.log('     ' + e);
}
