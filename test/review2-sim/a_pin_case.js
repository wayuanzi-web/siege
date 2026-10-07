// node test/review2-sim/a_pin_case.js <關卡> <場次 sd> <bot> <回合> [挨打的那一邊=0] [難度=1] [強化=0]
// A5：把某一次「被埋」攤開來看。埋壓判定那一刻：兵離原位多遠、腳下踩著什麼、頭上碰著什麼（那塊磚離它原本的位置多遠、它自己的支撐還在不在）。
const { load, H } = require('./lib');
const a = process.argv.slice(2), li = +a[0] - 1, sd = +a[1], bot = a[2] || 'casual', R = +a[3], vic = +(a[4] || 0), diff = a[5] === undefined ? 1 : +a[5], upL = +(a[6] || 0);
const G = load(), { S, simInit, simStep, BOTS, MAT, CS } = G;
simInit(li, H.UP(upL), H.seed(9000, sd, li), diff, { botA: BOTS[bot] });
let shown = 0;
const d2 = (v) => v.toFixed(2);
S.onPin = (u, load, moved) => {
  if (u.side !== vic || S.round !== R) return; shown++;
  const st = u.st, p = u.body.getPosition();
  console.log(`L${li + 1} sd ${sd} ${bot} round ${R}: burial check on ${u.side ? 'enemy' : 'my'} ${u.type}#${u.slot}  hp ${u.hp.toFixed(0)}/${u.hpMax.toFixed(0)}  load ${load.toFixed(1)}  moved=${moved}  → damage ${(14 + Math.min(load, 80) * 0.7).toFixed(0)}`);
  console.log(`  unit feet at (${d2(u.x - st.x0)}, ${d2(u.y)}); home (${d2(u.hx - st.x0)}, ${d2(u.hy)}) → displaced by (${d2(u.x - u.hx)}, ${d2(u.y - u.hy)}); home cell (${Math.floor((u.hx - st.x0) / CS)}, ${Math.round(u.hy / CS)}); head at y=${d2(u.y + u.bh)} (ceiling of the cell at y=${d2(u.hy + CS)})`);
  for (let ce = u.body.getContactList(); ce; ce = ce.next) {
    if (!ce.contact.isTouching()) continue; const o = ce.other.getUserData(), q = ce.other.getPosition();
    if (!o) { console.log('  touching: ground'); continue; }
    if (!o.isBlock) { console.log('  touching: another unit'); continue; }
    const where = q.y > p.y + u.bh * 0.3 && Math.abs(q.x - p.x) < o.w / 2 + u.bw * 0.4 ? 'ABOVE (counted as load)' : q.y < p.y - 0.5 ? 'below' : 'beside';
    console.log(`  touching ${where}: ${MAT[o.mat].k}${o.frag ? ' fragment' : o.prop ? ' prop' : ''} cell(${o.cx},${o.cy}) ${o.cw || ''}x${o.ch || ''} mass ${o.mass.toFixed(1)} size ${o.w.toFixed(1)}x${o.h.toFixed(1)}; now at offset (${d2(q.x - o.x0)}, ${d2(q.y - o.y0)}) from where it was built, angle ${d2(ce.other.getAngle())}, inPlace=${o.inPlace}, asleep=${!ce.other.isAwake()}, hp ${o.hp.toFixed(0)}/${o.hm.toFixed(0)}`);
    if (where[0] === 'A' && !o.frag) {
      // 這塊磚自己還碰著哪些東西（它的重量到底壓在誰身上）
      const sup = [];
      for (let c2 = ce.other.getContactList(); c2; c2 = c2.next) { if (!c2.contact.isTouching()) continue; const o2 = c2.other.getUserData(), q2 = c2.other.getPosition(); if (o2 === u) continue; if (o2 && q2.y < q.y) sup.push(o2.isBlock ? `${MAT[o2.mat].k}${o2.frag ? ' frag' : ''}(${o2.cx},${o2.cy})${o2.inPlace ? '' : '*moved'}` : 'unit ' + o2.type + '#' + o2.slot); }
      console.log(`      that block also rests on: ${sup.join(', ') || '(nothing else)'}`);
    }
  }
  // 這個兵那一層樓的牆和柱子還在嗎
  const cy = Math.round(u.hy / CS), row = st.blocks.filter((b) => !b.prop && !b.frag && b.cy <= cy && b.cy + b.ch > cy);
  console.log(`  its own floor (row cy=${cy}) walls/pillars: ` + (row.map((b) => `${MAT[b.mat].k}(${b.cx},${b.cy})${b.dead ? ' DEAD' : b.inPlace ? ' ok' : ' moved'}`).join(', ') || 'none alive'));
  const dead = []; for (const b of S.st[vic].blocks) if (b.dead && !b.frag && !b.prop) dead.push(`${MAT[b.mat].k}(${b.cx},${b.cy})`);
  let gone = 0, movedN = 0, tot = 0; for (const b of S.st[vic].blocks) { if (b.frag || b.prop) continue; tot++; if (b.dead) gone++; else if (!b.inPlace) movedN++; }
  console.log(`  castle so far: ${gone} of ${tot} blocks destroyed, ${movedN} more out of place.`);
};
while (S.state === 'play' && S.round <= R) simStep(1 / 60);
if (!shown) console.log('no burial hit on that side in that round');
