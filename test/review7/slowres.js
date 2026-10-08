// node test/review7/slowres.js <關卡範圍> [自動玩家=casual] [場數=4] [seed0=777]
// 回合收尾（resolve / hazard）拖到 8.5 秒以上的時候，看是什麼讓 worldQuiet() 一直不成立（或天上還有砲彈、火還在燒、繩子在燒、超載在嘎吱）
const G = require('../load')('PH, flyersBusy, ropesBurning');
const { S, SH, PH, simInit, simStep, LEVELS, BOTS, MAT } = G;
const rg = (process.argv[2] || '6-12').split('-').map(Number), bot = process.argv[3] || 'casual', N = +(process.argv[4] || 4), seed0 = +(process.argv[5] || 777);
const GUT = 9, VIEW_W = 112, CRUSH_LOAD = 1.5;
function blockers() {
  const out = [];
  if (SH.n) out.push(`shots ${SH.n}`); if (S.pend.length) out.push(`pend ${S.pend.length}`); if (G.flyersBusy()) out.push('flyers');
  if (S.nburn > 0) out.push(`burning ${S.nburn}`); if (G.ropesBurning()) out.push('rope burning');
  if (S.time - S.chainT < 1.5) out.push(`chainT ${(S.time - S.chainT).toFixed(2)}s ago`);
  for (const u of S.units) if (u.alive && !u.def.big && u.loadT > 0 && u.load > CRUSH_LOAD) out.push(`unit ${u.side}#${u.slot} under load ${u.load.toFixed(2)}`);
  for (const u of S.units) if (u.alive && (u.edge || (u.sepNow && u.sepT <= 2)) && u.body.isAwake()) out.push(`unit ${u.side}#${u.slot} edge ${u.edge} sep ${u.sepNow} (${u.x.toFixed(1)},${u.y.toFixed(1)})`);
  for (const u of S.units) if (u.alive && u.outT > 0) out.push(`unit ${u.side}#${u.slot} out ${u.outT.toFixed(2)}`);
  let n = 0;
  for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
    if (!b.isDynamic() || !b.isAwake()) continue;
    const p = b.getPosition(); if (p.x < -GUT - 2 || p.x > VIEW_W + GUT + 2 || p.y < -10) continue;
    const v = b.getLinearVelocity(), s2 = v.x * v.x + v.y * v.y, om = Math.abs(b.getAngularVelocity()), o = b.getUserData();
    if (o && o.wet && !o.inPlace) continue;
    const strict = o && (o.isUnit || (o.isBlock && !o.frag && !o.prop && !o.st.loose));
    if (s2 > 3.2 || om > 0.7 || (strict && (s2 > 0.5 || om > 0.16))) { if (n++ < 4) out.push(`moving ${o ? (o.isUnit ? 'unit' + o.side + '#' + o.slot : (o.boulder ? 'BOULDER' : o.frag ? 'frag' : o.prop ? 'prop' : 'block') + ' ' + MAT[o.mat].k + ' side' + o.side + (o.hang ? ' hang:' + o.hang : '') + (o.pivot ? ' PIVOT-BEAM' : '') + (o.pins ? ' PINNED' : '')) : '?'} (${p.x.toFixed(1)},${p.y.toFixed(1)}) v${Math.sqrt(s2).toFixed(2)} w${om.toFixed(2)}${o && o.wet ? ' wet' + o.wet.toFixed(2) : ''}`); }
  }
  if (n > 4) out.push(`… ${n} moving bodies`);
  for (const b of S.blocks) if (!b.dead && b.sT > 0.22) { out.push(`overloaded ${MAT[b.mat].k} (${b.x0.toFixed(1)},${b.y0.toFixed(1)}) sT ${b.sT.toFixed(2)}`); break; }
  return out;
}
for (let L = rg[0]; L <= (rg[1] || rg[0]); L++) {
  const li = L - 1; let longN = 0, tot = 0; const kinds = {};
  for (let g = 0; g < N; g++) {
    const seed = seed0 + g * 7919 + li * 131;
    simInit(li, {}, seed, 1, { botA: BOTS[bot] });
    let dumped = -1;
    while (S.state === 'play' && S.round < 40) {
      simStep(1 / 60);
      if ((S.phase === 'resolve' || S.phase === 'hazard') && S.phaseT > 8.5 && dumped !== S.vol) {
        dumped = S.vol; longN++;
        const bl = blockers();
        for (const k of bl) { const kk = k.replace(/[-\d.]+/g, '#'); kinds[kk] = (kinds[kk] || 0) + 1; }
        if (process.env.V) console.log(`  L${L} seed ${seed} R${S.round} ${S.phase} turn${S.turn}: ${bl.join(' | ')}`);
      }
      if (S.phase === 'resolve' && S.phaseT < 1 / 59) tot++;
    }
  }
  console.log(`L${L} ${LEVELS[li].name}: ${longN} resolve/hazard phases ran past 8.5 s (of ~${tot}). blockers: ` + Object.keys(kinds).sort((a, b) => kinds[b] - kinds[a]).slice(0, 10).map((k) => `[${k}]×${kinds[k]}`).join(' '));
}
