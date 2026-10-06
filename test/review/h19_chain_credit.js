// H19：「坍塌連鎖」（S.chain）不分是誰的磚：輪到誰，這段時間裡離開原位的磚都算他的（自己的城在垮也算、中立的冰壁也算），
// 回合結束時 chain >= 6 就給連珠集氣（最多 +30）。另外：城樓還在慢慢倒的時候回合就換邊了（worldQuiet 的門檻），
// 之後才垮下來的部分算到對手那一輪：對手因為「自己的城在垮」拿到連珠。
//   node test/review/h19_chain_credit.js [seeds=3] [levels=1-6]
const G = require('./h')();
const { S, simInit, simStep, BOTS, LEVELS } = G;
const NSEED = +(process.argv[2] || 3), m = (process.argv[3] || '1-6').split('-');
let bonuses = 0, selfMajor = 0, selfOnly = 0, bonusPts = 0, selfPts = 0, foeSelf = 0, meSelf = 0; const ex = [];
let lateFalls = 0, lateBlocks = 0, turns = 0, tShots = 0, tPend = 0, tBurn = 0, tMoving = 0, tFly = 0;
for (let li = +m[0] - 1; li <= +(m[1] || m[0]) - 1; li++) for (const bot of ['casual', 'expert']) for (let sd = 0; sd < NSEED; sd++) {
  const seed = 73000 + sd * 7919 + li * 131 + bot.length;
  simInit(li, {}, seed, 1, { botA: BOTS[bot] });
  let tally = [0, 0, 0], aimTally = 0; const was = new Map();
  S.on = (t, a, b) => {
    if (t === 'turn') { tally = [0, 0, 0]; turns++; if (G.SH.n > 0) tShots++; if (S.pend.length) tPend++; if (S.nburn > 0) tBurn++; if (G.flyersBusy()) tFly++; if (!G.worldQuiet()) tMoving++; }
    if (t === 'chain') {
      // a = S.chain, b = 輪到誰
      const own = tally[b], other = tally[1 - b], neu = tally[2], pts = Math.min(30, a);
      bonuses++; bonusPts += pts;
      if (other < 6) { selfOnly++; selfPts += pts; if (b === 1) foeSelf++; else meSelf++; if (ex.length < 6) ex.push(`L${li + 1} ${bot} seed=${seed} r${S.round}: side ${b} got +${pts} ult for a chain of ${a} = ${other} enemy bricks + ${own} of ITS OWN bricks + ${neu} neutral`); }
      else if (own + neu > other) selfMajor++;
    }
  };
  while (S.state === 'play' && S.round < 40) {
    was.clear(); for (const b of S.blocks) if (!b.dead && !b.frag && !b.prop) was.set(b, b.inPlace);
    const ph = S.phase, turn = S.turn;
    simStep(1 / 60);
    let n = 0; for (const [b, w] of was) if (w && (b.dead || !b.inPlace)) { tally[b.side]++; if (ph === 'aim' && b.side === turn) n++; }
    if (n) { lateBlocks += n; }
  }
}
console.log(`chain bonuses paid (chain >= 6 at end of a turn): ${bonuses}, total +${bonusPts} ult`);
console.log(`  paid although fewer than 6 of the bricks belonged to the opponent (i.e. earned by own/neutral bricks falling): ${selfOnly} (+${selfPts} ult; enemy got ${foeSelf} of them, player ${meSelf})`);
console.log(`  own+neutral bricks were the majority of the chain: ${selfMajor} more`);
for (const e of ex) console.log('    ' + e);
console.log(`turn hand-overs: ${turns}; at the moment the next side starts aiming: shots still in the air ${tShots}, keg fuse pending ${tPend}, fires burning ${tBurn}, balloon/orb still moving ${tFly}, bodies still moving faster than the quiet threshold ${tMoving}`);
console.log(`bricks that left place during the AIM phase of their own side (collapse still running after the turn changed hands): ${lateBlocks}`);
