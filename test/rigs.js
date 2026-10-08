// node test/rigs.js [gap|ledge|sep|hall|all]
// 兵的幾條「站不住」規則的最小場景（都在「砲擊進行中」的階段跑，這些規則只在那時候作用）：
//   gap    兵跨在兩塊平台中間的窄縫上：不該來回滑個不停
//   ledge  兵站在平台邊緣、身體中心已經懸空 d：該滑下去；滑出去的那一刻不該很快、不該被甩很遠
//   sep    兩個兵疊在同一個地方，腳下的平台有寬有窄：夠寬就推開，不夠寬寧可擠著也不要被推下去
//   hall   魔王跟小兵疊在大殿裡，旁邊被東西擋了三秒才清開：清開之後（下一輪砲擊）要推得開
const load = require('./load');
const mode = process.argv[2] || 'all';
function world() {
  const G = load('PL, PH, mkUnit, CS, GRAV'); const { S, PH, PL, simInit, mkUnit, CS } = G;
  simInit(3, {}, 7, 1, {}); const X0 = 56, GY = -3.5;
  S.team[0].ai = null; S.team[1].ai = null;
  const fake = { side: 0, x0: X0 - 30, x1: X0 + 30, y0: GY, units: [] };
  const unit = (type, x, top) => { const u = mkUnit(0, type, fake, { slot: 9 + fake.units.length, cx: (X0 - fake.x0) / CS - 0.5, cy: 0 }, 1); S.team[0].alive++; u.body.setTransform({ x, y: top + u.bh / 2 + 0.02 }, 0); u.body.setAwake(true); return u; };
  const plat = (x0, x1, top, fr) => { const b = PH.world.createBody({ type: 'static' }); b.createFixture({ shape: new PL.Box((x1 - x0) / 2, 1.5, { x: (x0 + x1) / 2, y: top - 1.5 }, 0), friction: fr === undefined ? 0.72 : fr, filterCategoryBits: 2 }); return b; };
  const run = (secs, each) => { for (let i = 0; i < secs * 60; i++) { S.phase = 'resolve'; S.turn = 0; S.phaseT = 0; S.quietT = 0; G.simStep(1 / 60); if (each) each(i); } };
  return { G, S, PH, X0, GY, unit, plat, run };
}
if (mode === 'gap' || mode === 'all') {
  for (const type of ['rocket', 'boss']) {
    let bad = 0, n = 0, toe = 0; const notes = [], tnotes = [];
    for (let gap = 0.5; gap <= (type === 'boss' ? 2.6 : 2.0) + 1e-6; gap += 0.1) for (const off of [0, 0.2, 0.4, 0.7]) {
      const W = world(), top = W.GY + 3; W.plat(W.X0 - 8, W.X0 - gap / 2, top); W.plat(W.X0 + gap / 2, W.X0 + 8, top);
      const u = W.unit(type, W.X0 + off, top); let travel = 0, px = u.x, lastMove = 0, flips = 0, pe = 0; const t0 = W.S.time;
      W.run(10, () => { const v = Math.abs(u.body.getLinearVelocity().x); travel += Math.abs(u.x - px); px = u.x; if (v > 0.4) lastMove = W.S.time - t0; if (u.edge !== pe) { flips++; pe = u.edge; } });
      n++; if (lastMove > 6 || flips > 6) { bad++; notes.push(`gap ${gap.toFixed(1)} off ${off}: ${flips} flips, travel ${travel.toFixed(1)}, last moving ${lastMove.toFixed(1)}s`); }
      // 最後停在哪：身體中心底下是空的、又只有一邊的半個鞋底踩著東西 = 用腳尖勾著邊站（看起來懸空）
      if (u.alive && u.y > top - 0.3) { const hw = u.bw * 0.5, on = (dx) => { let h = false; W.PH.world.rayCast({ x: u.x + dx, y: u.y + 0.6 }, { x: u.x + dx, y: u.y - 0.9 }, (f, pt, nn, fr) => { const o = f.getUserData(); if (o && o.isUnit) return -1; h = true; return fr; }); return h; };
        if (!on(0)) { const L = on(-hw * 0.3) || on(-hw * 0.58), R = on(hw * 0.3) || on(hw * 0.58); if (L !== R) { toe++; tnotes.push(`gap ${gap.toFixed(1)} off ${off}: x=${(u.x - W.X0).toFixed(2)}`); } } }
    }
    console.log(`gap  ${type}: ${n} 種情況，來回滑個不停的 ${bad}，最後只靠一邊腳尖站著的 ${toe}` + (notes.length ? '\n     ' + notes.slice(0, 8).join('\n     ') : '') + (tnotes.length ? '\n     腳尖：' + tnotes.slice(0, 8).join('；') : ''));
  }
}
if (mode === 'ledge' || mode === 'all') {
  for (const fr of [0.72, 0.05]) for (const d of [0.1, 0.4, 0.7]) {
    const W = world(), Hh = 6.8, top = W.GY + Hh; W.plat(W.X0 - 8, W.X0, top, fr);
    const u = W.unit('rocket', W.X0 + d, top); let left = false, vxLeave = 0, tLeave = 0, landX = null, hp0 = u.hp; const t0 = W.S.time;
    W.run(5, () => { if (!u.alive) return; const v = u.body.getLinearVelocity(); if (!left && u.y < top - 0.3) { left = true; vxLeave = v.x; tLeave = W.S.time - t0; } if (left && landX === null && Math.abs(v.y) < 0.5 && u.y < W.GY + 0.6) landX = u.x; });
    console.log(`ledge 摩擦 ${fr} 中心懸空 ${d}：${left ? `${tLeave.toFixed(2)} 秒後滑下去，離開時水平速度 ${vxLeave.toFixed(1)}，落點離邊緣 ${landX === null ? '?' : (landX - W.X0).toFixed(1)}，摔傷 ${(hp0 - u.hp).toFixed(0)}${u.alive ? '' : '（倒下）'}` : '沒有滑下去（還站在邊上，x=' + (u.x - W.X0).toFixed(2) + '）'}`);
  }
}
if (mode === 'sep' || mode === 'all') {
  for (const w of [2.4, 3.4, 4.6, 6, 9]) for (const off of [0, 0.5]) {
    const W = world(), top = W.GY + 6.8; W.plat(W.X0 - w / 2, W.X0 + w / 2, top);
    const a = W.unit('rocket', W.X0 + off, top), b = W.unit('bomb', W.X0 + off, top); const hp = [a.hp, b.hp];
    W.run(6);
    const on = (u) => (u.alive && u.y > top - 0.5 ? '在上面 x=' + (u.x - W.X0).toFixed(1) : u.alive ? '掉下去了 x=' + (u.x - W.X0).toFixed(1) + ' 摔傷 ' + (hp[u === a ? 0 : 1] - u.hp).toFixed(0) : '倒下');
    console.log(`sep  平台寬 ${w}、起點偏 ${off}：A ${on(a)}，B ${on(b)}，兩人相距 ${Math.abs(a.x - b.x).toFixed(2)}`);
  }
}
if (mode === 'hall' || mode === 'all') {
  for (const blocked of [0, 1]) {
    const W = world(), top = W.GY + 3; W.plat(W.X0 - 5.1, W.X0 + 5.1, top);
    const wallL = W.plat(W.X0 - 8.5, W.X0 - 5.1, top + 8), wallR = W.plat(W.X0 + 5.1, W.X0 + 8.5, top + 8);
    const boss = W.unit('boss', W.X0, top), m = W.unit('fire', W.X0 + 0.4, top); const bx0 = boss.x;
    let obs = null; if (blocked) obs = [W.plat(W.X0 + 0.4 + 1.4, W.X0 + 0.4 + 2.4, top + 3), W.plat(W.X0 - 2.6, W.X0 - 1.6, top + 3)];
    const row = [];
    W.run(3); row.push('3 秒 重疊 ' + Math.max(0, 2.6 - Math.abs(m.x - boss.x)).toFixed(2));
    if (obs) for (const o of obs) W.PH.world.destroyBody(o);
    W.run(3); row.push('6 秒 重疊 ' + Math.max(0, 2.6 - Math.abs(m.x - boss.x)).toFixed(2));
    W.S.vol++; W.run(4); row.push('下一輪砲擊之後 重疊 ' + Math.max(0, 2.6 - Math.abs(m.x - boss.x)).toFixed(2));
    console.log(`hall ${blocked ? '先被擋三秒' : '沒東西擋'}：${row.join(' | ')}；魔王被推動 ${Math.abs(boss.x - bx0).toFixed(2)}`);
  }
}
