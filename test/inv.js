// node test/inv.js [場數=3]：各關各種自動玩家各打幾場，一路檢查內部數字有沒有對不上、有沒有卡住
const G = require('./load')('physQuery');
const { S, SH, PH, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const N = +(process.argv[2] || 3); let bad = 0, games = 0;
const fail = (m) => { bad++; if (bad < 40) console.log('  ✗ ' + m); };
for (let li = 0; li < LEVELS.length; li++) for (const bot of ['newbie', 'casual', 'expert']) for (let sd = 0; sd < N; sd++) {
  const seed = 31337 + sd * 104729 + li * 977 + bot.length, tag = `L${li + 1} ${bot} #${sd}`;
  const up = { dmg: sd % 6, aim: sd % 6, hp: (sd * 2) % 6, shield: (sd * 3) % 6, ult: (sd * 5) % 6 };
  simInit(li, up, seed, sd % 3, { botA: BOTS[bot] }); games++;
  let lastPhase = '', phaseAt = 0, steps = 0, stuck = false;
  try {
    while ((S.state === 'play' && S.round < 45) || (S.state !== 'play' && S.endT < 5)) {
      simStep(1 / 60); steps++;
      const key = S.phase + S.turn + S.round;
      if (key !== lastPhase) { lastPhase = key; phaseAt = S.time; } else if (S.state === 'play' && S.time - phaseAt > 14 && !stuck) { stuck = true; fail(`${tag}: 卡在 ${S.phase}（輪到 ${S.turn}，第 ${S.round} 回合）超過 14 秒，天上 ${SH.n} 發`); }
      if ((steps & 31) === 0) {
        let nf = 0, nb = 0; for (const b of S.blocks) { if (b.dead) continue; if (b.frag) nf++; if (b.burn > 0) nb++; const p = b.body.getPosition(); if (!(p.x === p.x) || !(p.y === p.y)) fail(`${tag}: 磚的位置變成 NaN`); }
        if (nf !== S.nfrag) fail(`${tag}: 碎塊數對不上 ${nf} vs ${S.nfrag}`);
        if (nb !== S.nburn) fail(`${tag}: 著火數對不上 ${nb} vs ${S.nburn}`);
        for (let s = 0; s < 2; s++) { let a = 0; for (const u of S.team[s].units) { if (u.alive) { a++; if (!u.body) fail(`${tag}: 活著的兵沒有身體`); if (!(u.x === u.x)) fail(`${tag}: 兵的位置 NaN`); } else if (u.body) fail(`${tag}: 倒下的兵還有身體`); } if (a !== S.team[s].alive) fail(`${tag}: 存活數對不上 side${s} ${a} vs ${S.team[s].alive}`); }
        let c0 = 0, c1 = 0, c2 = 0; for (let i = 0; i < SH.n; i++) { if (SH.side[i] === 0) c0++; else if (SH.side[i] === 1) c1++; else c2++; if (!(SH.x[i] === SH.x[i])) fail(`${tag}: 砲彈 NaN`); }
        if (c0 !== SH.cnt[0] || c1 !== SH.cnt[1] || c2 !== SH.cnt[2]) fail(`${tag}: 砲彈數對不上`);
        const b0 = teamBar(0), b1 = teamBar(1); if (!(b0 >= 0 && b0 <= 1 && b1 >= 0 && b1 <= 1)) fail(`${tag}: 城防超出範圍 ${b0} ${b1}`);
        let bodies = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) bodies++;
        let live = 0; for (const b of S.blocks) if (!b.dead) live++; for (const u of S.units) if (u.alive) live++;
        if (bodies !== live + 1) fail(`${tag}: 物理世界裡的物體數對不上 ${bodies} vs ${live + 1}`);
      }
    }
  } catch (e) { fail(`${tag}: 例外 ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
  if (S.state === 'play') fail(`${tag}: 45 回合還沒分出勝負（我 ${S.team[0].alive} 兵、敵 ${S.team[1].alive} 兵）`);
}
console.log(bad ? `${bad} 個問題（${games} 場）` : `${games} 場都沒問題`);
process.exit(bad ? 1 : 0);
