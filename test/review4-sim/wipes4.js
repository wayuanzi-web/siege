// node test/review4-sim/wipes4.js <每關幾場=60> [bot=casual] [難度=1] [第幾份=0] [共幾份=1] [只跑第幾關=0]
// 敵軍一輪（或一次落石）帶走我方幾個兵。列出一輪倒 3 個以上的每一次：第幾回合、那一輪有沒有加成（倍增符、連珠、怒火、決戰加重）、各是怎麼死的。
// 另外：我方第一次有兵倒下是在第幾回合（敵軍第幾輪），開場兩輪就倒人的比例
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, LEVELS, BOTS } = G;
const N = +(process.argv[2] || 60), bot = process.argv[3] || 'casual', diff = +(process.argv[4] === undefined ? 1 : process.argv[4]), shard = +(process.argv[5] || 0), nsh = +(process.argv[6] || 1), only = +(process.argv[7] || 0);
for (let li = 0; li < LEVELS.length; li++) {
  if (only && li !== only - 1) continue;
  const hist = [0, 0, 0, 0, 0], big = [], firstLoss = {}, cause3 = {}; let games = 0, wins = 0, vols = 0, volsB = 0, w3 = 0, w3plain = 0, gamesW3 = 0, lostAfterW3 = 0;
  for (let sd = 0; sd < N; sd++) {
    if (sd % nsh !== shard) continue;
    const seed = 915000 + sd * 7919 + li * 131;
    simInit(li, {}, seed, diff, { botA: BOTS[bot] }); games++;
    let cur = null, first = 0, hadW3 = false; const all = [];
    const close = () => { if (!cur) return; all.push(cur); cur = null; };
    S.on = (t, a, b, c, d, e, f) => {
      if (t === 'volley') { close(); cur = { side: a, round: S.round, kills: [], boost: [] }; if (S.rage > 1) cur.boost.push('sudden x' + S.rage.toFixed(1)); }
      else if (t === 'rumble') { close(); cur = { side: 2, round: S.round, kills: [], boost: ['rocks'] }; }
      else if (t === 'gate' && cur && e === cur.side && e === 1 && !cur.boost.includes('gate x' + c)) cur.boost.push('gate x' + c);
      else if (t === 'ult' && cur && c === 1 && cur.side === 1) cur.boost.push('ult');
    };
    const rageAt = () => S.team[1].rage > 0;
    let rageNext = false;
    H.kill = (u, side, how, ctx) => { if (S.state !== 'play' && ctx === 'fin') return; if (u.side !== 0 || !cur || cur.side === 0) return; cur.kills.push(`${u.type}#${u.slot}:${ctx}`); if (!first) first = S.round; };
    while (S.state === 'play' && S.round < 40) {
      if (S.phase === 'aim' && S.turn === 1) rageNext = rageAt();
      const ph = S.phase; simStep(1 / 60);
      if (ph === 'aim' && S.phase === 'volley' && S.turn === 1 && cur && rageNext) cur.boost.push('rage');
    }
    close();
    if (S.state === 'won') wins++;
    firstLoss[first || 0] = (firstLoss[first || 0] || 0) + 1;
    for (const v of all) {
      if (v.side === 0) continue;
      vols++; if (v.boost.length) volsB++;
      hist[Math.min(4, v.kills.length)]++;
      if (v.kills.length >= 3) { w3++; hadW3 = true; if (!v.boost.length) w3plain++; for (const k of v.kills) { const c = k.split(':').slice(1).join(':'); cause3[c] = (cause3[c] || 0) + 1; } if (big.length < 14) big.push(`seed${seed} r${v.round} ${v.side === 2 ? 'ROCKS' : 'volley'} [${v.boost.join(', ') || 'plain'}] -> ${v.kills.join(', ')}  (${S.state})`); }
    }
    if (hadW3) { gamesW3++; if (S.state !== 'won') lostAfterW3++; }
  }
  console.log(`L${li + 1} ${bot} diff${diff}: ${wins}/${games} won. Enemy volleys+rockfalls ${vols} (${volsB} boosted); my units down per volley 0/1/2/3/4+ = ${hist.join('/')}`);
  console.log(`   3+ in one volley: ${w3} times (${w3plain} of them with NO boost) in ${gamesW3}/${games} games (${(100 * gamesW3 / games).toFixed(0)}%), ${lostAfterW3} of those games lost; causes: ${JSON.stringify(cause3)}`);
  console.log(`   round of my first loss: ${Object.keys(firstLoss).sort((a, b) => a - b).map((r) => (r === '0' ? 'never' : 'r' + r) + ':' + firstLoss[r]).join(' ')}`);
  for (const l of big) console.log('     ' + l);
}
