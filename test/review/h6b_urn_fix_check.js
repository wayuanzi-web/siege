// H6 修法確認：把第六關那個陶甕從木箱正上方（懸空 1.5）移到同一間房的地板上，再跑一次「全部叫醒 12 秒」的穩定度檢查。
const G = require('./h')();
const { S, simInit, physStep, CASTLES } = G;
function stab(label) {
  simInit(5, {}, 1, 1, null); S.phase = 'idle-test';
  const urn = S.blocks.find((b) => b.mat === G.M_CLAY && b.side === 1);
  for (const b of S.blocks) b.body.setAwake(true); for (const u of S.units) u.body.setAwake(true);
  let slept = -1; for (let i = 0; i < 720 && slept < 0; i++) { physStep(1 / 60); let aw = 0; for (const b of S.blocks) if (!b.dead && b.body.isAwake()) aw++; for (const u of S.units) if (u.alive && u.body.isAwake()) aw++; if (!aw) slept = (i + 1) / 60; }
  let moved = 0, gone = 0; for (const b of S.blocks) { if (b.dead) { gone++; continue; } if (b.frag) continue; const p = b.body.getPosition(); if (b.kind !== 'ball' && Math.hypot(p.x - b.x0, p.y - b.y0) > 0.35) moved++; }
  console.log(`${label}: urn ${urn.dead ? 'SHATTERED' : 'intact'}; bricks destroyed ${gone}, displaced ${moved}; all asleep after ${slept > 0 ? slept.toFixed(2) + 's' : '>12s'}`);
}
stab('E6 as shipped        ');
const m = CASTLES.E6.map, i7 = m.indexOf('^^^S.u.S^^^'), i6 = m.indexOf('|2|S.x.S|3|');
m[i7] = '^^^S...S^^^'; m[i6] = '|2|Sux.S|3|';
stab('E6 with urn on floor ');
