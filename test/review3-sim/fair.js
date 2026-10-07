// node test/review3-sim/fair.js mute <場數=200> [難度=1] [敵軍打幾輪=3] [只跑第幾關=0]
//     我方完全不開火、不開護罩（跟 test/first.js 同一種跑法），敵軍照原本的 AI 打：每一輪各倒幾個我方的兵
// node test/review3-sim/fair.js play <場數=100> [bot=expert] [難度=1] [只跑第幾關=0]
//     自動玩家對打：我方第一輪倒幾個敵兵、第幾回合分出勝負；敵軍每一輪（分「沒穿過倍增符、沒放連珠、沒有怒火」和其他）倒幾個我方的兵
// SIEGE_SRC 可以換成舊版原始碼比較
const L = require('./lib'); const G = L.load();
const { S, simInit, simStep, simFire, LEVELS, BOTS } = G;
const mode = process.argv[2] || 'mute';
const HOW = ['hit', 'crushed', '?', 'burnt', 'fell out of the world', 'out of the castle'];
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
console.log(`src=${G.__dir}`);
if (mode === 'mute') {
  const N = +(process.argv[3] || 200), diff = +(process.argv[4] === undefined ? 1 : process.argv[4]), K = +(process.argv[5] || 3), only = +(process.argv[6] || 0);
  for (let li = 0; li < LEVELS.length; li++) {
    if (only && li !== only - 1) continue;
    // vol[k] = 第 k+1 輪的統計：[0 個, 1 個, 2 個, 3 個以上] 的場數；plain = 沒有加成的那幾輪
    const vol = [], plain = [], who = {}, ex2 = []; for (let k = 0; k < K; k++) { vol.push([0, 0, 0, 0]); plain.push([0, 0, 0, 0]); }
    let lostBy = 0;
    for (let sd = 0; sd < N; sd++) {
      const seed = 52000 + sd * 7919 + li * 131;
      simInit(li, {}, seed, diff, { mute: 0 }); S.team[0].ai = null;
      let cur = -1, kills = 0, boosted = false; const rec = [];
      S.on = (t, a, b, c, d, e, f) => {
        if (t === 'volley' && a === 1) { cur++; kills = 0; boosted = S.rage > 1; rec[cur] = { kills: 0, boosted: false }; }
        else if (t === 'gate' && e === 1 && cur >= 0) rec[cur].boosted = true;
        else if (t === 'ult' && c === 1 && cur >= 0) rec[cur].boosted = true;
        else if (t === 'udie' && c === 0 && cur >= 0) { rec[cur].kills++; const k = `v${cur + 1} ${d}#${f} ${HOW[e]}`; who[k] = (who[k] || 0) + 1; }
      };
      let guard = 0, rageSeen = false;
      while (S.state === 'play' && S.round <= K && guard++ < 60 * 80 * K) { if (S.phase === 'aim' && S.turn === 0) simFire(0); if (S.phase === 'aim' && S.turn === 1 && S.team[1].rage > 0 && rec.length <= K) rageSeen = true; simStep(1 / 60); }
      if (S.state === 'lost' && S.round <= K) lostBy++;
      for (let k = 0; k < K; k++) { const r = rec[k]; if (!r) continue; vol[k][Math.min(3, r.kills)]++; if (!r.boosted) plain[k][Math.min(3, r.kills)]++; if (r.kills >= 2 && ex2.length < 6) ex2.push(`seed${seed} volley${k + 1}${r.boosted ? ' (boosted)' : ''}: ${r.kills} down`); }
    }
    console.log(`L${li + 1} diff${diff}, ${N} games, I never fire:`);
    for (let k = 0; k < K; k++) { const v = vol[k], p = plain[k], n = v[0] + v[1] + v[2] + v[3], pn = p[0] + p[1] + p[2] + p[3]; console.log(`   enemy volley ${k + 1}: my units down 0/1/2/3+ = ${v.join('/')}  (>=1: ${pct(v[1] + v[2] + v[3], n)}, >=2: ${pct(v[2] + v[3], n)})   un-boosted volleys only (${pn}): >=1 ${pct(p[1] + p[2] + p[3], pn)}, >=2 ${pct(p[2] + p[3], pn)}`); }
    console.log(`   lost outright within ${K} rounds: ${lostBy};  deaths: ${Object.keys(who).sort((a, b) => who[b] - who[a]).slice(0, 10).map((k) => k + ' x' + who[k]).join(', ') || '-'}`);
    if (ex2.length) console.log('   e.g. ' + ex2.join(' | '));
  }
} else {
  const N = +(process.argv[3] || 100), bot = process.argv[4] || 'expert', diff = +(process.argv[5] === undefined ? 1 : process.argv[5]), only = +(process.argv[6] || 0);
  for (let li = 0; li < LEVELS.length; li++) {
    if (only && li !== only - 1) continue;
    const first = [0, 0, 0, 0, 0], endR = {}, eVol = [0, 0, 0, 0], eVolB = [0, 0, 0, 0], eFirst = [0, 0, 0, 0], who1 = {}, whoE = {}; let wins = 0, r1 = 0, r2 = 0, rounds = 0, firstBoost = 0;
    for (let sd = 0; sd < N; sd++) {
      const seed = 880000 + sd * 7919 + li * 131;
      simInit(li, {}, seed, diff, { botA: BOTS[bot] });
      let myVol = 0, enVol = 0, cur = null, k1 = 0, b1 = false; const en = [];
      S.on = (t, a, b, c, d, e, f) => {
        if (t === 'volley') { if (a === 0) { myVol++; cur = { side: 0, n: myVol, kills: 0, boosted: false }; } else { enVol++; cur = { side: 1, n: enVol, kills: 0, boosted: S.rage > 1 }; en.push(cur); } }
        else if (t === 'gate' && cur && e === cur.side) cur.boosted = true;
        else if (t === 'ult' && cur && c === cur.side) cur.boosted = true;
        else if (t === 'udie' && cur) {
          if (c === 1 && cur.side === 0) { cur.kills++; if (cur.n === 1) { k1++; const k = `${d}#${f} ${HOW[e]}`; who1[k] = (who1[k] || 0) + 1; } }
          if (c === 0 && cur.side === 1) { cur.kills++; const k = `${d}#${f} ${HOW[e]}`; whoE[k] = (whoE[k] || 0) + 1; }
        }
        if (t === 'gate' && cur && cur.side === 0 && cur.n === 1 && e === 0) b1 = true;
      };
      while (S.state === 'play' && S.round < 40) simStep(1 / 60);
      first[Math.min(4, k1)]++; if (b1) firstBoost++;
      if (S.state === 'won') { wins++; if (S.round <= 1) r1++; if (S.round <= 2) r2++; endR[S.round] = (endR[S.round] || 0) + 1; }
      rounds += S.round;
      en.forEach((v, i) => { const h = v.boosted ? eVolB : eVol; h[Math.min(3, v.kills)]++; if (i === 0) eFirst[Math.min(3, v.kills)]++; });
    }
    const ne = eVol[0] + eVol[1] + eVol[2] + eVol[3], nb = eVolB[0] + eVolB[1] + eVolB[2] + eVolB[3];
    console.log(`L${li + 1} ${bot} diff${diff}, ${N} games: won ${wins} (${pct(wins, N)}), mean ${(rounds / N).toFixed(1)} rounds; won in round 1: ${r1} (${pct(r1, N)}), by round 2: ${r2} (${pct(r2, N)}); win round histogram ${Object.keys(endR).sort((a, b) => a - b).map((r) => 'r' + r + ':' + endR[r]).join(' ')}`);
    console.log(`   my FIRST volley: enemy units down 0/1/2/3/4+ = ${first.join('/')}  (>=2: ${pct(first[2] + first[3] + first[4], N)}); it went through a multiplier in ${firstBoost} games;  who: ${Object.keys(who1).sort((a, b) => who1[b] - who1[a]).slice(0, 8).map((k) => k + ' x' + who1[k]).join(', ') || '-'}`);
    console.log(`   enemy FIRST volley: my units down 0/1/2/3+ = ${eFirst.join('/')} (>=1: ${pct(eFirst[1] + eFirst[2] + eFirst[3], N)});  all un-boosted enemy volleys (${ne}): 0/1/2/3+ = ${eVol.join('/')} (>=2: ${pct(eVol[2] + eVol[3], ne)});  boosted (${nb}): ${eVolB.join('/')} (>=2: ${pct(eVolB[2] + eVolB[3], nb)})`);
    console.log(`   my units lost to: ${Object.keys(whoE).sort((a, b) => whoE[b] - whoE[a]).slice(0, 8).map((k) => k + ' x' + whoE[k]).join(', ') || '-'}`);
  }
}
