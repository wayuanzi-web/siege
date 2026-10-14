/* ===== 54-astro: 第二十八關「群星引力」=====
   兩座城蓋在兩顆小行星平平的岩頂上（城和兵照平常的重力站著），中間是太空：
   - 砲彈在太空裡的重力只剩 S.gk 倍：飛得又平又遠
   - 戰場正中間一顆衛星（打不壞的大圓岩），四周一圈引力：經過的砲彈被吸彎（越近吸得越用力，擦過去會被甩出去）；
     飛出城的碎磚、被轟飛的兵也被吸過去，掉在衛星上
   - 一顆小月繞著衛星轉，每回合換一個位置，它也有一小圈引力
   - 推進兵：推進彈飛到一半，點一下畫面就往前猛衝（自動玩家：飛了 at 秒自己點）
   - 引力錨手：引力錨釘在打到的磚上，往四周猛吸一陣子（整片城被吸得歪向它），路過的砲彈也被吸彎；自己下一輪開火時收起來
   - 拖網兵：網住落點附近的磚和兵，往自己這邊拖出城外
   掉進太空（離開小行星的岩頂往下掉、落在衛星上）的兵就沒了 */
function astroSetup() {
  const A = S.lv.space; if (!A) return;
  S.astro = { moons: [] };
  for (const m of A.moons) {
    const o = { t: 'moon', x: m.x, y: m.y, r: m.r, R: m.R, G: m.G, rs: 0, on: true, orbit: m.orbit || null, body: null, flash: 0, big: !m.orbit };
    if (o.orbit) { o.ph = o.orbit.ph; moonPlace(o); }
    o.body = PH.world.createBody({ type: o.orbit ? 'kinematic' : 'static', position: { x: o.x, y: o.y } });
    o.body.createFixture({ shape: new PL.Circle(o.r), friction: 0.9, restitution: 0.05, filterCategoryBits: CAT_TERR, userData: { isRock: true, side: 2, moon: o } });
    S.objs.push(o); AMP.holes.push(o); S.astro.moons.push(o);
  }
  AMP.any = true;
}
function moonPlace(o) { const c = o.orbit; o.x = c.x + Math.cos(o.ph) * c.r; o.y = c.y + Math.sin(o.ph) * c.r; }
// 每回合一開始：小月沿著軌道轉到下一個位置（擱在它上面的碎塊留在原地，再被吸過去）
function astroRound() {
  for (const o of S.astro.moons) {
    if (!o.orbit) continue;
    o.ph += o.orbit.step; moonPlace(o); o.body.setTransform({ x: o.x, y: o.y }, 0);
    for (let b = PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic()) { const p = b.getPosition(); if (Math.hypot(p.x - o.x, p.y - o.y) < o.r + 3) b.setAwake(true); }
  }
}
// 衛星、小月、引力錨把附近飛起來的東西吸過去（城樓上還在原位的磚不吸：只有引力錨吸得動）
const _af = { x: 0, y: 0 };
function astroForces() {
  const act = S.state !== 'play' || S.phase === 'volley' || S.phase === 'resolve' || S.phase === 'hazard';
  for (const o of S.objs) {
    if (o.t === 'moon') {
      const R2 = o.R * o.R;
      for (const b of S.blocks) {
        if (b.dead || !b.body || b.inPlace || !b.body.isAwake()) continue;
        const p = b.body.getPosition(), dx = o.x - p.x, dy = o.y - p.y, d2 = dx * dx + dy * dy; if (d2 > R2) continue;
        const d = Math.sqrt(d2) || 1, a = Math.min(GRAV * 4, o.G / Math.max(d2, o.r * o.r)) * b.mass;
        _af.x = dx / d * a; _af.y = dy / d * a; b.body.applyForceToCenter(_af, false);
      }
      for (const u of S.units) {
        if (!u.alive || !u.body || !u.body.isAwake()) continue;
        const p = u.body.getPosition(), dx = o.x - p.x, dy = o.y - p.y, d2 = dx * dx + dy * dy; if (d2 > R2) continue;
        const d = Math.sqrt(d2) || 1, a = Math.min(GRAV * 4, o.G / Math.max(d2, o.r * o.r)) * u.mass;
        _af.x = dx / d * a; _af.y = dy / d * a; u.body.applyForceToCenter(_af, false);
      }
    } else if (o.t === 'anchor' && act && S.time - o.t0 < o.pullT) {
      // 引力錨：釘下去之後吸一陣子（城樓上的磚也吸得動，吸得整片歪過去）
      const f = 1 - (S.time - o.t0) / o.pullT * 0.4;
      for (const b of S.blocks) {
        if (b.dead || !b.body || b === o.b || b.base || b.mat === M_ROCK) continue;
        const big = Math.max(b.w, b.h) > CS * 2.2;          // 長樑、整片樓板：吸不太動（整片被拖走的話一下子少掉一大截城防）
        const p = b.body.getPosition(), dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy); if (d > o.R || d < 0.3) continue;
        const a = o.F * GRAV * (1 - 0.5 * d / o.R) * f * b.mass * (big ? 0.25 : 1);
        if (!b.body.isAwake()) b.body.setAwake(true);
        _af.x = dx / d * a; _af.y = dy / d * a; b.body.applyForceToCenter(_af, true);
      }
      for (const u of S.units) {
        if (!u.alive || !u.body || u.def.big) continue;
        const p = u.body.getPosition(), dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy); if (d > o.R || d < 0.6) continue;
        const a = o.F * 0.55 * GRAV * (1 - 0.5 * d / o.R) * f * u.mass;
        _af.x = dx / d * a; _af.y = dy / d * a; u.body.applyForceToCenter(_af, true);
      }
    }
  }
}
// 這個兵是不是掉進太空了（離開小行星往下掉、或是落在衛星上一陣子）
function astroLost(u, dt) {
  if (groundY(u.x) < -100 && u.y < -5) return true;
  for (const o of S.astro.moons) if (Math.hypot(u.x - o.x, u.y + u.bh * 0.5 - o.y) < o.r + u.bh * 0.75) { u.moonT = (u.moonT || 0) + dt; if (u.moonT > 0.5) return true; return false; }
  u.moonT = 0; return false;
}

/* ---------- 推進彈 ---------- */
// 玩家點一下畫面：這一邊還沒加速過的推進彈全部加速（下一步 shotsStep 處理）
const BOOST_T = 0.25;          // 飛出砲口多久以後才點得動（還在自己城裡的那一下不算）
function canBoostNow(side) {
  if (S.state !== 'play' || S.turn !== side || (S.phase !== 'volley' && S.phase !== 'resolve')) return false;
  for (let i = 0; i < SH.n; i++) if (SH.side[i] === side && WL[SH.w[i]].boost && !SH.p[i] && SH.age[i] > BOOST_T) return true;
  return false;
}
function simBoost(side) { if (!canBoostNow(side)) return false; S.boostReq[side] = true; return true; }
// shotsStep 每一發推進彈都問一下：這一步要不要加速
function boostNow(i, W) {
  if (SH.p[i]) return false;
  const side = SH.side[i], T = side < 2 ? S.team[side] : null;
  return T && T.ai ? SH.age[i] >= W.boost.at : !!S.boostReq[side] && SH.age[i] > BOOST_T;
}

/* ---------- 引力錨、拖網 ---------- */
function astroHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i], mass = SH.mass[i];
  if (w.anchor) {
    physExplode(hx, hy, w, side, mass, SH.flag[i], hit === 1 ? null : o, vx, vy);
    if (hit === 1 && o && o.moon) { ev('anchorout', hx, hy, side); return 1; }          // 打在衛星、小月上：釘不住（小月會轉走）
    const A = w.anchor, b = hit === 2 && o && o.isBlock && !o.dead && o.body ? o : null;
    const a = { t: 'anchor', side, x: hx, y: hy, b, lp: null, R: A.R * Math.min(1.25, Math.sqrt(mass)), F: A.F, pullT: A.t, t0: S.time, G: A.G, rs: 0, on: true, flash: 1, age: 0 };
    if (b) { const q = b.body.getLocalPoint({ x: hx, y: hy }); a.lp = { x: q.x, y: q.y }; }
    S.objs.push(a); AMP.holes.push(a); S.nanchor++; ev('anchorin', hx, hy, side);
    return 1;
  }
  if (w.net) {
    physExplode(hx, hy, w, side, mass, SH.flag[i], hit === 1 ? null : o, vx, vy);
    const N = w.net, dir = side === 0 ? -1 : 1, list = [];
    for (const b of S.blocks) {
      if (b.dead || !b.body || b.base || b.mat === M_ROCK || b.st.side === side || Math.max(b.w, b.h) > CS * 1.6) continue;          // 網得住的只有一兩格大的磚、碎塊（整根樑、整片樓板拖不動）
      const d = blockDist(b, hx, hy); if (d < N.R) list.push([d, b]);
    }
    list.sort((p, q) => p[0] - q[0]);
    let n = 0;
    for (const [, b] of list) {
      if (n >= N.n) break;
      b.body.setAwake(true); b.body.setLinearVelocity({ x: dir * N.v * (1 - n * 0.08), y: 3.5 }); b.body.setAngularVelocity(dir * 1.5); b.netT = S.time; n++;
    }
    let nu = 0;
    for (const u of S.units) {
      if (!u.alive || !u.body || u.side === side || u.def.big) continue;
      if (Math.hypot(u.x - hx, u.y + u.bh * 0.5 - hy) > N.R) continue;
      tangle(u, side); if (!r1v(u.side)) { u.body.setAwake(true); u.body.setLinearVelocity({ x: dir * N.v * 0.75, y: 4.5 }); } nu++;
    }
    ev('netcatch', hx, hy, side, n, nu);
    return 1;
  }
  return 0;
}
// 引力錨跟著它釘著的磚走；磚沒了就掉下來（停止吸）；自己下一輪開火時收起來
function anchorStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 3);
  if (o.b) {
    if (o.b.dead || !o.b.body) { const k = AMP.holes.indexOf(o); if (k >= 0) AMP.holes.splice(k, 1); S.nanchor--; ev('anchorout', o.x, o.y, o.side); return true; }          // 釘著的磚碎了：錨跟著掉、收起來
    const q = o.b.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y;
  }
  return false;
}
function anchorsGo(side) {
  for (let i = S.objs.length - 1; i >= 0; i--) {
    const o = S.objs[i]; if (o.t !== 'anchor' || o.side !== side) continue;
    S.objs.splice(i, 1); const k = AMP.holes.indexOf(o); if (k >= 0) AMP.holes.splice(k, 1); S.nanchor--;
    ev('anchorout', o.x, o.y, side);
  }
}
