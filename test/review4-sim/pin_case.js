// node test/review4-sim/pin_case.js <關卡> <bot> <seed> [難度=1]
// 重播一場，把「被壓住」的經過印出來：哪個兵、什麼時候開始被壓（load 超過門檻）、扣了多少血、
// 什麼時候整組東西睡著（扣血跟著停）、睡著的時候頭上壓著什麼、後來是被什麼吵醒／有沒有活到最後
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, simInit, simStep, BOTS, CRUSH_LOAD } = G;
const li = +(process.argv[2] || 1) - 1, bot = process.argv[3] || 'casual', seed = +(process.argv[4] || 1), diff = +(process.argv[5] === undefined ? 1 : process.argv[5]);
simInit(li, {}, seed, diff, { botA: BOTS[bot] });
const st = new Map();
const name = (u) => `side${u.side} ${u.type}#${u.slot}`;
H.load = (u, load) => {
  let r = st.get(u); if (!r) st.set(u, r = { on: false, lastLoad: 0, asleep: false, hp0: 0, t0: 0, sleepAt: 0 });
  const awake = u.body.isAwake();
  if (awake) {
    if (r.asleep) { console.log(`t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn}  ${name(u)} woke up after ${(S.time - r.sleepAt).toFixed(1)}s asleep under the load (hp ${u.hp.toFixed(0)})`); r.asleep = false; }
    if (load > CRUSH_LOAD && !r.on) { r.on = true; r.hp0 = u.hp; r.t0 = S.time; console.log(`t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn}  ${name(u)} at (${u.x.toFixed(1)},${u.y.toFixed(1)}) is under ${load.toFixed(1)}x its weight (hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)}); overhead: ${L.over(G, u).map(L.bdesc).join(' ') || '(no block overhead)'}`); }
    else if (load <= CRUSH_LOAD && r.on && u.loadT <= 0) { r.on = false; console.log(`t=${S.time.toFixed(2)}  ${name(u)} load gone while awake (weight moved off); lost ${(r.hp0 - u.hp).toFixed(0)} hp`); }
    r.lastLoad = load;
  } else if (r.on && !r.asleep && r.lastLoad > CRUSH_LOAD) {
    r.asleep = true; r.sleepAt = S.time;
    console.log(`t=${S.time.toFixed(2)} r${S.round} ${S.phase}/${S.turn}  ${name(u)} PILE FELL ASLEEP with ${r.lastLoad.toFixed(1)}x still on him: damage stops at hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)} (lost ${(r.hp0 - u.hp).toFixed(0)} in ${(S.time - r.t0).toFixed(2)}s); overhead: ${L.over(G, u).map(L.bdesc).join(' ') || '(no block overhead)'}`);
  }
};
H.kill = (u, side, how, ctx) => { const r = st.get(u); if (r && (r.on || r.asleep)) console.log(`t=${S.time.toFixed(2)}  ${name(u)} died (ctx=${ctx}, how=${how})`); st.delete(u); };
while (S.state === 'play' && S.round < 40) simStep(1 / 60);
for (const [u, r] of st) if (u.alive && r.asleep) console.log(`END: ${name(u)} is still alive (hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)}) and still asleep under ${r.lastLoad.toFixed(1)}x his weight since t=${r.sleepAt.toFixed(1)}`);
console.log(`result ${S.state} at t=${S.time.toFixed(1)}, round ${S.round}`);
