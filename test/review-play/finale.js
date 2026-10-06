// node test/review-play/finale.js [bot=casual] [場數=30]：分出勝負的那一刻，輸的那座城還剩多少東西可以炸（結尾的連環爆有沒有料）
const G = require('./lib')();
const { S, simInit, simStep, LEVELS, BOTS, CS } = G;
const bot = process.argv[2] || 'casual', N = +(process.argv[3] || 30);
for (let li = 0; li < LEVELS.length; li++) {
  const W = { n: 0, whole: 0, upper: 0, frags: 0, tall: 0, total0: 0, lastAlone: 0, how: {} }, L = { n: 0, whole: 0, upper: 0, frags: 0, tall: 0 };
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, 606 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] });
    const tot = [0, 0]; for (let s = 0; s < 2; s++) tot[s] = S.st[s].blocks.filter((b) => !b.prop).length;
    let lastKillT = [0, 0], prevAlive = [S.team[0].alive, S.team[1].alive], soloRounds = 0, soloFrom = 0;
    while (S.state === 'play' && S.round < 40) { simStep(1 / 60); if (S.team[1].alive === 1 && !soloFrom) soloFrom = S.round; }
    if (S.state === 'play') continue;
    const los = S.loser, st = S.st[los], R = los === 1 ? W : L; R.n++;
    let whole = 0, upper = 0, frags = 0, top = st.y0;
    for (const b of st.blocks) { if (b.dead) continue; if (b.frag) { frags++; continue; } if (b.prop) continue; whole++; if (b.cy >= st.base && b.inPlace) upper++; const p = b.body.getPosition(); if (p.x > st.x0 - 2 && p.x < st.x1 + 2 && p.y + b.h / 2 > top) top = p.y + b.h / 2; }
    R.whole += whole; R.upper += upper; R.frags += frags; R.tall += (top - st.y0) / CS;
    if (los === 1) { W.total0 += tot[1]; W.lastAlone += soloFrom ? S.round - soloFrom + 1 : 0; }
  }
  const f = (x) => x.toFixed(1);
  console.log(`L${li + 1} ${LEVELS[li].name}: when I WIN (${W.n}): enemy castle has ${f(W.whole / (W.n || 1))} whole blocks left of ${f(W.total0 / (W.n || 1))} (${f(W.upper / (W.n || 1))} above the base still in place) + ${f(W.frags / (W.n || 1))} fragments; rubble/remains stand ${f(W.tall / (W.n || 1))} rows tall; rounds spent with only ONE enemy left: ${f(W.lastAlone / (W.n || 1))}` + (L.n ? ` | when I LOSE (${L.n}): my castle has ${f(L.whole / L.n)} whole blocks, ${f(L.tall / L.n)} rows tall` : ''));
}
