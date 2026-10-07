// node test/review3-sim/bolt_rock.js：爆炸推大石球有 DV_ROCK 的上限（5），連弩（不會爆炸、只打中的那一塊）推石球有沒有同樣的上限？
// 第二關平台上的大石球：(a) 旁邊炸 30 發火箭 (b) 直接被 30 支弩箭打中（都是水平往敵城後方推），各量石球最快被推到多快
const L = require('./lib'); const G = L.load('M_ROCK');
const { S, simInit, simStep, physExplode, WPN, M_ROCK } = G;
function trial(kind, n, mass) {
  simInit(1, {}, 3, 1, { mute: 0 }); S.team[0].ai = null; S.team[1].ai = null;
  for (let i = 0; i < 30; i++) { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60); }
  const rock = S.blocks.filter((b) => b.mat === M_ROCK && b.kind === 'ball').sort((a, b) => a.x0 - b.x0)[0], p0 = rock.body.getPosition(), x0 = p0.x, y0 = p0.y;
  let vmax = 0;
  for (let k = 0; k < n; k++) {
    const p = rock.body.getPosition();
    if (kind === 'bolt') physExplode(p.x - rock.r, p.y, WPN.bolt, 0, mass, 0, rock, 60, 0); else physExplode(p.x - rock.r - 0.5, p.y, WPN.rocket, 0, mass, 0, null, 60, 0);
    if (rock.dead) break; const v = rock.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > vmax) vmax = sp;
    S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; simStep(1 / 60);
    if (rock.dead) break;
  }
  const p = rock.dead ? null : rock.body.getPosition();
  console.log(`${n} x ${kind} (shot mass ${mass}) on the front boulder (mass ${rock.mass.toFixed(0)}, r ${rock.r.toFixed(2)}): fastest it was pushed ${vmax.toFixed(1)}; ${rock.dead ? 'destroyed' : `moved ${(p.x - x0).toFixed(1)} sideways`}, hp ${rock.hp.toFixed(0)}/${rock.hm.toFixed(0)}`);
}
trial('rocket', 30, 1); trial('bolt', 30, 1); trial('bolt', 90, 0.2); trial('rocket', 30, 0.2);
