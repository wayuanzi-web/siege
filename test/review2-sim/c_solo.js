// node test/review2-sim/c_solo.js [場數=12]
// C：一邊完全不還手的時候要幾回合才結束？（a）我方完全不開火（掛機／怎麼打都打不到的新手）：敵軍要幾回合才打完；
// （b）敵軍不開火、我方是 newbie：要幾回合。看有沒有拖到 20 回合以上的。
const { load, play, H } = require('./lib');
const N = +(process.argv[2] || 12);
const G = load();
const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
for (const [mute, bot, label] of [[0, 'casual', 'I never fire (enemy alone)'], [1, 'newbie', 'enemy never fires (newbie alone)']]) {
  for (let li = 0; li < 6; li++) {
    const rs = []; let undecided = 0, time = 0;
    for (let sd = 0; sd < N; sd++) { const r = play(G, { li, seed: H.seed(9000, sd, li), bot, mute, maxR: 40 }); rs.push(r.rounds); if (r.state === 'play') undecided++; time += r.time; }
    rs.sort((a, b) => a - b);
    console.log(`${label.padEnd(34)} L${li + 1}: rounds min ${rs[0]} / med ${q(rs, 0.5)} / max ${rs[N - 1]}${undecided ? `  UNDECIDED at round 40: ${undecided}` : ''}  (${(time / N).toFixed(0)}s of game time on average)`);
  }
}
