// node test/review4-sim/pin_sleep.js [石球半徑=1.598] [密度=4] [落下高度=0.3] [井寬=3.4]
// 一個兵站在一格寬的井底（兩邊是靜止的牆），一顆大石球輕輕落在他頭上、卡在兩面牆中間。
// 看：他被壓多久、扣多少血；整組東西「睡著」之後還有沒有繼續扣。
const L = require('./lib4');
const H = {}; const G = L.load('', { hooks: H });
const { S, PH, PL, simInit, simStep, mkBlock, mkUnit, M_ROCK, CS } = G;
const R = +(process.argv[2] || 1.598), DEN = +(process.argv[3] || 4), DROP = +(process.argv[4] || 0.3), WID = +(process.argv[5] || 3.4);
simInit(3, {}, 7, 1, {});
const X0 = 50, GY = -3.5;
// 靜止的牆
const wall = PH.world.createBody({ type: 'static' });
for (const sx of [-1, 1]) wall.createFixture({ shape: new PL.Box(0.5, 6, { x: X0 + sx * (WID / 2 + 0.5), y: GY + 6 }, 0), friction: 0.7 });
const fake = { side: 0, x0: X0 - 10, x1: X0 + 10, y0: GY, units: [] };
const u = mkUnit(0, 'rocket', fake, { slot: 9, cx: (X0 - fake.x0) / CS - 0.5, cy: 0 }, 1);
S.team[0].alive++;
u.body.setAwake(true);
const rub = S.rubble;
let hurtLog = [];
H.hurt = (uu, d, side, kind, ctx) => { if (uu === u) hurtLog.push([S.time, d, ctx]); };
let ball = null, t = 0, lastHp = u.hp, sleptAt = -1, firstHurt = -1, lastHurt = -1, maxLoad = 0;
H.load = (uu, load) => { if (uu === u && load > maxLoad) maxLoad = load; };
console.log(`ball r=${R} den=${DEN} mass=${(Math.PI * R * R * DEN).toFixed(1)}  unit mass=${u.mass.toFixed(2)}  ratio=${(Math.PI * R * R * DEN / u.mass).toFixed(2)}  CRUSH_LOAD=${G.CRUSH_LOAD}`);
for (let i = 0; i < 60 * 20; i++) {
  S.phaseT = 0;                    // 停在開場：沒有人開火
  if (i === 30) { ball = mkBlock(rub, { mat: M_ROCK, kind: 'ball', x: X0, y: u.y + u.bh + R + DROP, r: R, den: DEN, awake: true }); ball.inPlace = false; }
  maxLoad = 0;
  simStep(1 / 60); t += 1 / 60;
  if (!u.alive) { console.log(`t=${t.toFixed(2)} unit died`); break; }
  if (u.hp < lastHp) { if (firstHurt < 0) firstHurt = t; lastHurt = t; lastHp = u.hp; }
  const aw = u.body.isAwake(), baw = ball ? ball.body.isAwake() : true;
  if (ball && !aw && !baw && sleptAt < 0) { sleptAt = t; }
  if (i % 30 === 0 || (ball && i < 120 && i % 6 === 0)) console.log(`t=${t.toFixed(2)} hp=${u.hp.toFixed(1)} loadT=${u.loadT.toFixed(2)} load=${maxLoad.toFixed(2)} unitAwake=${aw} ballAwake=${baw}` + (ball ? ` ball@(${ball.body.getPosition().x.toFixed(2)},${ball.body.getPosition().y.toFixed(2)}) unit@(${u.x.toFixed(2)},${u.y.toFixed(2)})` : ''));
}
console.log(`first hurt ${firstHurt.toFixed(2)}s, last hurt ${lastHurt.toFixed(2)}s, both asleep at ${sleptAt.toFixed(2)}s, final hp ${u.alive ? u.hp.toFixed(1) : 0} / ${u.hpMax}, alive=${u.alive}`);
const by = {}; for (const h of hurtLog) by[h[2]] = (by[h[2]] || 0) + h[1];
console.log('damage by source:', JSON.stringify(by));
