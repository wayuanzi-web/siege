// node test/review4-sim/squeeze_rig.js [推力是體重的幾倍=3]
// 最小重現：一個兵站在平地上，右邊是一面不會動的牆，左邊有一塊石磚被一股固定的「水平」力道推著擠他（頭上什麼都沒有）。
//   A. 石磚跟他一樣高（接觸到肩膀的高度）  B. 石磚只到他的腰（接觸點在門檻以下）  C. 對照：同樣重量的石磚疊在他頭上（1.1 倍體重，不到門檻）
const L = require('./lib4');
const K = +(process.argv[2] || 3);
function run(name, mk) {
  const H = {}; const G = L.load('', { hooks: H }); const { S, PH, PL, simInit, simStep, mkBlock, mkUnit, M_STONE, CS, GRAV } = G;
  simInit(3, {}, 7, 1, {}); const X0 = 50, GY = -3.5;
  const wall = PH.world.createBody({ type: 'static' }); wall.createFixture({ shape: new PL.Box(0.5, 6, { x: X0 + 1.1 + 0.5 + 0.02, y: GY + 6 }, 0), friction: 0.7 });
  const fake = { side: 0, x0: X0 - 10, x1: X0 + 10, y0: GY, units: [] };
  const u = mkUnit(0, 'rocket', fake, { slot: 9, cx: (X0 - fake.x0) / CS - 0.5, cy: 0 }, 1); S.team[0].alive++; u.body.setAwake(true);
  const by = {}; let maxLoad = 0, died = -1;
  H.hurt = (uu, d, side, kind, ctx) => { if (uu === u) by[ctx] = (by[ctx] || 0) + d; };
  H.load = (uu, load) => { if (uu === u && load > maxLoad) maxLoad = load; };
  H.kill = (uu, s, how, ctx) => { if (uu === u) died = S.time; };
  for (let i = 0; i < 30; i++) { S.phaseT = 0; simStep(1 / 60); }
  const b = mk(G, u, mkBlock, M_STONE, X0, GY); b.inPlace = false; const t0 = S.time, F = K * u.mass * GRAV;
  let overMax = 0;
  for (let i = 0; i < 60 * 6 && u.alive; i++) { if (b.push) b.body.applyForceToCenter({ x: F, y: 0 }, true); S.phaseT = 0; const ov = L.over(G, u).filter((q) => Math.abs(q.body.getPosition().x - u.x) < 1.2); if (ov.length > overMax) overMax = ov.length; simStep(1 / 60); }
  console.log(`${name}: ${u.alive ? 'alive, hp ' + u.hp.toFixed(0) + '/100' : 'DEAD after ' + (died - t0).toFixed(2) + ' s'}; peak "load" ${maxLoad.toFixed(1)}x; damage by source ${JSON.stringify(by)}; blocks ever directly above his head: ${overMax}`);
}
run(`A. block as tall as the unit pushed sideways with ${K}x his weight`, (G, u, mkBlock, M, X0, GY) => { const b = mkBlock(G.S.rubble, { mat: M, kind: 'box', x: X0 - 1.1 - 1.72, y: GY + 1.5, w: 3.4, h: 3.0, awake: true }); b.push = 1; return b; });
run(`B. waist-high block pushed sideways with ${K}x his weight`, (G, u, mkBlock, M, X0, GY) => { const b = mkBlock(G.S.rubble, { mat: M, kind: 'box', x: X0 - 1.1 - 1.72, y: GY + 0.9, w: 3.4, h: 1.8, awake: true }); b.push = 1; return b; });
run('C. control: an 11 kg block resting on his head (1.1x his weight, under the 2.2x threshold), wedged by a second wall', (G, u, mkBlock, M, X0, GY) => { const w2 = G.PH.world.createBody({ type: 'static' }); w2.createFixture({ shape: new G.PL.Box(0.5, 6, { x: X0 - 1.1 - 0.5 - 0.6, y: GY + 6 }, 0), friction: 0.7 }); return mkBlock(G.S.rubble, { mat: M, kind: 'box', x: X0 - 0.25, y: GY + 3.0 + 1.75, w: 3.36, h: 3.4, awake: true }); });
