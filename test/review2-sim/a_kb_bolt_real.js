// node test/review2-sim/a_kb_bolt_real.js [關卡=1,2,3] [場數=32] [bot=casual]
// A1（真的對局）：敵兵被打出城／飛出場之前的 1.5 秒內，被連弩直接射中幾箭（每一箭固定推 1.9 u/s，沒有上限）、被爆炸推了多少。
const { load, H } = require('./lib');
const G = load({ patch: [["if (hit.body) hit.body.applyLinearImpulse({ x: ux * 20, y: uy * 20 + 8 }, hit.body.getWorldCenter(), true);", "if (hit.body) { hit.body.applyLinearImpulse({ x: ux * 20, y: uy * 20 + 8 }, hit.body.getWorldCenter(), true); if (S.onBoltKb) S.onBoltKb(hit, ux, uy); }"]] });
const { S, simInit, simStep, BOTS, LEVELS } = G;
const lvs = (process.argv[2] || '1,2,3').split(',').map((x) => +x - 1), N = +(process.argv[3] || 32), bot = process.argv[4] || 'casual';
for (const li of lvs) {
  let exits = 0, withBolts = 0, bolt10 = 0, boltDom = 0, maxBoltDv = 0, peak = 0; const ex = []; let boltHits = 0, maxSpeedAfterBolt = 0;
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, H.seed(9000, sd, li), 1, { botA: BOTS[bot] });
    const log = new Map(); const get = (u) => { let l = log.get(u); if (!l) log.set(u, l = []); return l; };
    S.onBoltKb = (u, ux, uy) => { boltHits++; get(u).push({ t: S.time, k: 'b', dv: Math.hypot(ux * 20, uy * 20 + 8) / u.mass, dvx: ux * 20 / u.mass }); const v = u.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > maxSpeedAfterBolt) maxSpeedAfterBolt = sp; };
    S.onKb = (u, j, nx, ny) => { get(u).push({ t: S.time, k: 'e', dv: j / u.mass, dvx: nx * j / u.mass }); };
    S.on = (t, x, y, c, d, e, f) => {
      if (t !== 'udie' || c !== 1 || (e !== 4 && e !== 5)) return; const u = S.units.find((k) => k.side === 1 && k.slot === f); exits++;
      const l = (log.get(u) || []).filter((q) => S.time - q.t < 1.5); const nb = l.filter((q) => q.k === 'b').length, bdv = l.filter((q) => q.k === 'b').reduce((s, q) => s + q.dvx, 0), edv = l.filter((q) => q.k === 'e').reduce((s, q) => s + q.dvx, 0);
      if (nb) withBolts++; if (bdv >= 9) bolt10++; if (bdv > Math.abs(edv) && bdv >= 5) boltDom++; if (bdv > maxBoltDv) maxBoltDv = bdv;
      if (bdv >= 9 && ex.length < 4) ex.push(`sd ${sd} r${S.round} ${d}#${f}: ${nb} bolt hits in the last 1.5s pushed it ${bdv.toFixed(0)} u/s toward the back (explosions: ${edv.toFixed(0)}); left at v=(${u.vx.toFixed(0)},${u.vy.toFixed(0)}) with ${Math.max(0, u.hp).toFixed(0)} hp before the exit`);
    };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
    S.onBoltKb = null; S.onKb = null; S.on = null;
  }
  console.log(`L${li + 1} ${N} ${bot} games: ${boltHits} direct bolt hits on enemy units (top speed right after one: ${maxSpeedAfterBolt.toFixed(0)} u/s). enemy units that left their castle: ${exits}; hit by bolts in the 1.5s before: ${withBolts}; bolts alone pushed ≥9 u/s (the cap for explosions): ${bolt10}; bolts pushed more than explosions did: ${boltDom}; most from bolts ${maxBoltDv.toFixed(0)} u/s`);
  for (const e of ex) console.log('    ' + e);
}
