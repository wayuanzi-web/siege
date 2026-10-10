// node test/range.js [場數=4] [戰場=0] [輪數=3]：靶場。我方六個同一種兵（戰場 1–11 照那一關的兵位，通常四個；自動玩家「普通」來瞄），敵軍不還手，
// 打 K 輪之後：敵城完整度掉多少、敵兵掉多少血、倒幾個、幾場打到城破。拿來比十八種兵器的火力（ONLY=chain,drill 只比幾種，NOCRIT=1 不算暴擊）
const G = require('./load')('practiceLevel, UNIT_LIST, structFrac'); const { S, simInit, simStep, BOTS, structFrac, structBar } = G;
const N = +(process.argv[2] || 4), map = +(process.argv[3] || 0), K = +(process.argv[4] || 3), only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const types = (only || G.UNIT_LIST).filter((t) => t !== 'flak' && t !== 'bal' && t !== 'eng');
console.log(`戰場 ${map}、每種 ${N} 場、打 ${K} 輪：敵城完整度掉 / 敵兵掉血（佔全部） / 倒下 / 打到城破的場數 / 每輪秒數`);
for (const t of types) {
  let df = 0, dh = 0, kills = 0, secs = 0, fell = 0;
  for (let sd = 0; sd < N; sd++) {
    const lv = G.practiceLevel(map, [t, t, t, t, t, t], ['rocket', 'rocket', 'rocket', 'rocket', 'rocket', 'rocket'], 0);
    if (process.env.NOCRIT) lv.rules.crit = 0;          // NOCRIT=1：不算弱點暴擊（拿來看暴擊加了多少）
    simInit(lv, {}, 8100 + sd * 7919, 1, { botA: BOTS.casual, mute: 1 });
    const hp0 = S.team[1].units.reduce((a, u) => a + u.hp, 0), f0 = structFrac(1); let vols = 0, g = 0;
    S.on = (e, a) => { if (e === 'volley' && a === 0) vols++; };
    while (S.state === 'play' && g++ < 60 * 60 * 3 && !(vols >= K && S.turn === 1 && S.phase === 'aim')) simStep(1 / 60);
    // 我方第 K 輪打完、輪到敵軍（不還手）的那一刻
    df += f0 - structFrac(1); if (S.state === 'won' || structBar(1) <= 0) fell++; dh += (hp0 - S.team[1].units.reduce((a, u) => a + (u.alive ? u.hp : 0), 0)) / hp0; kills += S.team[1].units.length - S.team[1].alive; secs += S.time / Math.max(1, vols);
  }
  console.log(`${(t + '        ').slice(0, 8)} 城 -${(df / N * 100).toFixed(1)}%   兵 -${(dh / N * 100).toFixed(1)}%   倒 ${(kills / N).toFixed(1)}   破 ${fell}/${N}   ${(secs / N).toFixed(1)}s`);
}
