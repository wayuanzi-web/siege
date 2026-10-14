/* ===== 54-siege: 第二十九關「三重城」=====
   敵軍不是一座城，是一道接一道的三座：前哨 → 城牆 → 內城。我方是一座攻城車（城會一路帶著打過的傷走下去）。
   - 前兩座打塌（城防條歸零、這座城挨過我方兩輪以上）或守軍全倒，就攻下了：那座城整座垮掉，從三張卡裡挑一張
     （整修攻城車、援軍、火藥加量、戰鼓、包鐵），然後攻城車推進（背景往後捲），下一座城出現，接著打下一回合。
   - 最後一座照平常的規則（帥旗死守、城破）。每一座城各自算「拖太久」的回合。
   - 衝車兵：撞木落地沿地面滾向敵城，撞到城腳往上撞城基上面那一塊。雲梯兵：梯子鉤在敵城牆上，下一輪開火時爬上去砍人。
   - 敵軍的變材術士：把攻城車的石頭、鐵變成木頭 */
const ADV_T = 2.8, ADV_BUILD = 1.5, CARD_AUTO = 30;
const CARDS = {
  repair: { name: '整修攻城車', txt: '攻城車上還在原位的磚全部修好、火熄掉' },
  reinforce: { name: '援軍', txt: '倒下的兵回來兩個（七成血）' },
  powder: { name: '火藥加量', txt: '接下來全隊的傷害 ×1.2' },
  drums: { name: '戰鼓', txt: '連珠、護罩立刻充滿' },
  armor: { name: '包鐵', txt: '攻城車上的木頭全部包上鐵皮（更耐打、燒不起來）' }
};
const CARD_KEYS = ['repair', 'reinforce', 'powder', 'drums', 'armor'];
function siegeSetup() {
  S.siege = null; S.sudR = 0;
  const C = S.lv.siege; if (!C) return;
  S.siege = { stage: 0, n: C.stages.length, opts: null, picked: [], built: true, cleared: false, r0: 1 };          // r0：這一座城從第幾回合開始打
  S.sudR = C.sudden;
}
function suddenAt() { return S.sudR || S.lv.sudden || 10; }
// 第幾座城的名字
function siegeName(k) { const C = S.lv.siege; return C ? C.stages[Math.min(k, C.stages.length - 1)].name : ''; }
// 攻下一座：那座城整座垮掉，挑卡
function siegeClear() {
  const G2 = S.siege, st = S.st[1];
  G2.cleared = true; G2.opts = siegeOpts();
  S.phase = 'cards'; S.phaseT = 0; S.quietT = 0;
  siegeFall(st);
  for (const u of S.team[1].units) if (u.alive) u.flag = 0;
  ev('siegeclear', G2.stage, st.cx, st.y0 + st.h * 0.5);
  if (S.team[0].ai) siegePick(siegeBotPick());
}
// 城垮下來（跟城破一樣：佈滿裂痕、城腳一塊一塊碎、往前倒）
function siegeFall(st) {
  const dir = -1, front = st.x0, order = [];
  for (const b of st.blocks) {
    if (b.dead) continue;
    if (b.seg) { let hp = 0; for (let k = 0; k < b.seg.length; k++) { b.seg[k] *= 0.3; hp += b.seg[k]; } b.hp = hp; b.low = Math.min(b.low === undefined ? 1 : b.low, 0.3); } else b.hp *= 0.3;
    b.flash = 1; b.body.setAwake(true);
    const p = b.body.getPosition(), row = Math.max(0, (p.y - st.y0) / CS), dist = Math.abs(p.x - front) / CS;
    if (row < 2.2 || rnd() < 0.3) order.push({ b, t: 0.16 + (row < 2.2 ? dist * 0.055 + row * 0.07 : 0.3 + row * 0.085 + dist * 0.03) + rnd() * 0.1 });
  }
  st.fin = { t: 0, order: order.sort((a, b) => a.t - b.t), k: 0, dir, lean: 0 };
}
// 這一次給哪三張卡（援軍：有人倒下才給）
function siegeOpts() {
  const dead = S.team[0].units.some((u) => !u.alive);
  const L = CARD_KEYS.filter((k) => k !== 'reinforce' || dead), out = [];
  while (out.length < 3 && L.length) out.push(L.splice(ri(L.length), 1)[0]);
  return out;
}
function siegeBotPick() {
  const G2 = S.siege, o = G2.opts, T = S.team[0], dead = T.units.filter((u) => !u.alive).length;
  const pref = dead >= 2 ? ['reinforce', 'repair', 'powder'] : structBar(0) < 0.6 ? ['repair', 'reinforce', 'armor'] : ['powder', 'drums', 'repair'];
  for (const k of pref) { const i = o.indexOf(k); if (i >= 0) return i; }
  return 0;
}
// 挑了第 i 張：照卡片做，然後推進
function siegePick(i) {
  const G2 = S.siege; if (!G2 || S.phase !== 'cards' || !G2.opts) return false;
  const k = G2.opts[i] || G2.opts[0], A = S.team[0], st = S.st[0];
  G2.picked.push(k); G2.opts = null;
  if (k === 'repair') {
    for (const b of st.blocks) {
      if (b.dead || !b.body || !b.inPlace || b.frag) continue;
      if (b.seg) { let hp = 0; for (let j = 0; j < b.seg.length; j++) { if (b.seg[j] > 0) b.seg[j] = b.segM; hp += Math.max(0, b.seg[j]); } b.hp = hp; b.low = 1; } else b.hp = b.hm;
      b.brit = 0; b.acid = 0; b.burn = 0; b.soot = 0;
    }
  } else if (k === 'reinforce') {
    let n = 0;
    for (const u of A.units) { if (n >= 2) break; if (!u.alive && siegeRevive(u)) n++; }
  } else if (k === 'powder') A.dmg *= 1.2;
  else if (k === 'drums') { A.ult.c = A.ult.need; A.shield.c = A.shield.need; }
  else if (k === 'armor') { for (const b of st.blocks) if (!b.dead && b.body && b.mat === M_WOOD && !b.frag) matChange(b, M_IRON); }
  ev('siegepick', k, st.cx, st.y0 + st.h * 0.6);
  // 推進途中工匠順手修補：還在原位的磚補回少掉的四成（整修攻城車那張卡是補滿）
  if (k !== 'repair') for (const b of st.blocks) {
    if (b.dead || !b.body || !b.inPlace || b.frag || b.hp >= b.hm) continue;
    if (b.seg) { let hp = 0; for (let j = 0; j < b.seg.length; j++) { if (b.seg[j] > 0) b.seg[j] += (b.segM - b.seg[j]) * 0.4; hp += Math.max(0, b.seg[j]); } b.hp = hp; } else b.hp += (b.hm - b.hp) * 0.4;
  }
  S.phase = 'advance'; S.phaseT = 0; G2.built = false; G2.gone = false;
  ev('advance', G2.stage + 1);
  return true;
}
// 倒下的兵站回自己原本的位置（腳下那一格要還在：不在的話站到城頂最高的地方）
function siegeRevive(u) {
  let x = u.hx0, y = u.hy0;
  const taken = (px, py) => S.units.some((q) => q !== u && q.alive && q.side === u.side && Math.abs(q.x - px) < 1.8 && Math.abs(q.y - py) < 2.5);
  if (!u.homeB || u.homeB.dead || !u.homeB.inPlace || taken(x, y)) { const P = reviveSpot(u, taken); if (!P) return false; x = P.x; y = P.y; }
  u.alive = true; u.hp = u.hpMax * 0.7; u.frozen = 0; u.stun = 0; u.dazed = 0; u.flag = 0; u.out = 0; u.outT = 0; u.dieT = 0; u.loadT = 0; u.load = 0; u.turn = 0;
  u.x = x; u.y = y; u.hx = x; u.hy = y; mkUnitBody(u); u.body.setTransform({ x, y: y + u.bh / 2 + 0.1 }, 0);
  S.team[u.side].alive++;
  ev('revive', x, y, u.side, u.slot);
  return true;
}
// 援軍站哪裡：攻城車上還在原位的樓板、磚頂上（不站城基、不跟別人擠在一起），從後面往前找
function reviveSpot(u, taken) {
  const st = u.st;
  for (let k = 0.5; k < st.cols; k += 1) {
    const x = st.x0 + k * CS; let top = -1e9, ok = false;
    for (const b of st.blocks) {
      if (b.dead || !b.inPlace || b.frag || b.prop || !b.body) continue;
      const p = b.body.getPosition(); if (Math.abs(p.x - x) > b.w / 2 || p.y + b.h / 2 < top) continue;
      top = p.y + b.h / 2; ok = !b.base;
    }
    if (ok && top > -1e9 && !taken(x, top)) return { x, y: top };
  }
  return null;
}
// 換材質（變材彈、包鐵卡）：耐久照新材質的比例換算；重量不改（不讓整座城因為變輕、變重而晃）
function matChange(b, mat) {
  if (b.dead || b.mat === mat || b.mat === M_KEG || b.mat === M_ROCK || (mat === M_WOOD && MAT[b.mat].hp <= MAT[M_WOOD].hp)) return false;          // 變材只把比木頭耐打的變成木頭（陶、雪、琉璃不會變得更耐打）
  const k = MAT[mat].hp / MAT[b.mat].hp;
  b.hm *= k; b.hp *= k; if (b.seg) { b.segM *= k; for (let j = 0; j < b.seg.length; j++) b.seg[j] *= k; }
  if (b.burn > 0 && !MAT[mat].burn) b.burn = 0;
  b.mat = mat; b.flash = 1; b.st.ver++;
  return true;
}
// 推進：舊的城拆掉、下一座蓋起來
function siegeStep(dt) {
  const G2 = S.siege;
  if (S.phase === 'cards') { if (S.phaseT > CARD_AUTO) siegePick(0); return; }          // 一直沒挑（畫面上沒有卡片可按）：自動挑第一張
  if (S.phase !== 'advance') return;
  if (!G2.gone) { siegeGone(); G2.gone = true; }          // 一開始推進：打下來的那一座整片拆掉（背景開始往後捲）
  if (!G2.built && S.phaseT >= ADV_BUILD) { siegeNext(); G2.built = true; }
  if (G2.built && S.phaseT >= ADV_T) roundStart();
}
function siegeGone() {
  const B = S.team[1], old = S.st[1];
  // 拆掉打下來的那一座（連碎塊、天上的砲彈、留在那裡的東西）；還活著的守軍算我方打倒的
  ev('siegegone', old.cx, old.y0 + old.h * 0.4);
  for (const u of B.units) if (u.alive) killUnit(u, 0, 0);
  if (old.fin) old.fin = null;
  for (const b of old.blocks) if (!b.dead) blockKill(b, 2, K_CRUSH, true);
  old.dead = true;
  for (const b of S.blocks) if (!b.dead && b.body && (b.frag || b.st.loose) && b.body.getPosition().x > MID - 6) blockKill(b, 2, K_CRUSH, true);
  for (const u of B.units) if (u.body) { PH.world.destroyBody(u.body); u.body = null; }
  S.units = S.units.filter((u) => u.side !== 1); B.units = []; B.alive = 0;
  for (let i = S.objs.length - 1; i >= 0; i--) { const o = S.objs[i]; if (o.x > MID - 6 || o.side === 1) S.objs.splice(i, 1); }
  SH.n = 0; SH.cnt[0] = SH.cnt[1] = SH.cnt[2] = 0; S.pend.length = 0;
  const si = S.structs.indexOf(old); if (si >= 0) S.structs.splice(si, 1);
}
function siegeNext() {
  const G2 = S.siege, C = S.lv.siege, B = S.team[1];
  // 下一座
  G2.stage++;
  const def = C.stages[G2.stage], d = CASTLES[def.castle];
  const st = S.st[1] = mkCastle(1, d, CASTLE_R - castleCols(d) * CS, 0, B.hpMul, true);
  S.structs.splice(1, 0, st);
  st.slots.forEach((sl, k) => { const t = def.crew[k]; if (t) mkUnit(1, t, st, sl, B.hpMul); });
  B.alive = B.units.length;
  physStep(STEP);
  for (const b of st.blocks) { b.body.setTransform({ x: b.x0, y: b.y0 }, b.a0 || 0); b.body.setLinearVelocity({ x: 0, y: 0 }); b.body.setAngularVelocity(0); b.body.setAwake(false); }
  for (const u of B.units) { u.body.setTransform({ x: u.hx, y: u.hy + u.bh / 2 }, 0); u.body.setLinearVelocity({ x: 0, y: 0 }); u.body.setAwake(false); }
  castleScan(st); for (let i = 0; i < st.n; i++) st.back[i] = st.backTo[i];
  supInit(st);
  S.flags[1] = null; S.team[0].volleys = 0;
  if (S.flags[0]) S.flags[0].v0 -= B.volleys;          // 我方正在帥旗死守：對方的輪數重新算，死守的倒數不能變長
  B.volleys = 0;
  B.ult.c = 0; B.ult.armed = false; B.shield.on = false; B.shield.c = 0;
  S.team[0].shield.on = false;
  S.sudR = S.round + C.sudden; G2.r0 = S.round + 1;          // 這一座城的第 sudden 回合起開始自己塌
  if (B.ai) B.ai.warmR = S.round + 1;          // 新來的守軍第一回合也在試射（手抖）
  if (S.rage > 1) { S.rage = 1; S.sudden = false; }
  G2.cleared = false;
  ev('siegestage', G2.stage, st.cx, st.y0 + st.h * 0.5);
}

/* ---------- 衝車、雲梯、變材 ---------- */
function siegeHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i], mass = SH.mass[i], T = side < 2 ? S.team[side] : null, mul = (T ? T.dmg : 1) * S.rage * mass;
  if (w.ram) {
    // 落在地上：沿著地面往敵城滾
    if (hit === 1 && (!o || !o.moon)) { saLoad(i); SA.vx = vx; SA.vy = vy; rollStart(hx); const dir = side === 0 ? 1 : -1; SA.vx = dir * Math.max(Math.abs(SA.vx), w.ram.v); saStore(i); SH.flag[i] |= F_ROLL; ev('rollgo', hx, hy, side); return 2; }
    if (hit === 2 && o && o.isBlock) { ramHit(side, o, hx, hy, vx, vy, mul, w); return 1; }
    return 0;
  }
  if (w.ladder) {
    physExplode(hx, hy, w, side, mass, SH.flag[i], hit === 1 ? null : o, vx, vy);
    if (hit === 2 && o && o.isBlock && !o.dead && o.body && o.side !== side && o.side < 2 && !o.frag) {
      const lp = o.body.getLocalPoint({ x: hx, y: hy });
      S.objs.push({ t: 'ladder', side, b: o, lp: { x: lp.x, y: lp.y }, x: hx, y: hy, hp: w.ladder.hp * (T ? T.hpMul : 1), age: 0, flash: 0, L: w.ladder, mul });
      ev('ladderin', hx, hy, side);
    }
    return 1;
  }
  if (w.alter) {
    physExplode(hx, hy, w, side, mass, SH.flag[i], hit === 1 ? null : o, vx, vy);
    const R = w.alter.R * Math.min(1.3, Math.sqrt(mass)); let n = 0;
    for (const b of S.blocks) {
      if (b.dead || !b.body || b.base || b.side === side || b.mat === M_WOOD || b.mat === M_ROOF) continue;
      if (blockDist(b, hx, hy) > R) continue;
      if (matChange(b, M_WOOD)) n++;
    }
    ev('alter', hx, hy, side, n);
    return 1;
  }
  return 0;
}
// 撞木撞到城：撞到城基的話往上撞城基上面那一塊（撞門、撞牆腳）
function ramHit(side, o, hx, hy, vx, vy, mul, w) {
  let tg = o;
  if (o.base) {
    const dir = side === 0 ? 1 : -1, ty = o.body.getPosition().y + o.h / 2 + CS * 0.5; let best = null, bd = 1e9;
    for (const b of S.blocks) {
      if (b.dead || !b.body || b.base || b.side !== o.side || b.frag) continue;
      const p = b.body.getPosition(), d = Math.abs(p.y - ty) * 2 + Math.abs(p.x - (hx + dir * CS * 0.6));
      if (Math.abs(p.x - hx) > CS * 2.5 || p.y < ty - CS) continue;
      if (d < bd) { bd = d; best = b; }
    }
    if (best) tg = best;
  }
  const p = tg.body.getPosition(), sp = Math.hypot(vx, vy) || 1, dir = side === 0 ? 1 : -1;
  blockHurt(tg, w.dmg * w.ram.k * mul, K_HEAVY, side, p.x, p.y);
  if (!tg.dead && tg.body) { const j = Math.min(tg.mass * 9, w.J * Math.sqrt(mul)); tg.body.applyLinearImpulse({ x: dir * j, y: j * 0.15 }, { x: p.x - dir * tg.w * 0.4, y: p.y - tg.h * 0.2 }, true); }
  for (const u of S.units) if (u.alive && u.side !== side && Math.hypot(u.x - hx, u.y + 1 - hy) < 2.4) hurtUnit(u, w.ud * mul, side, K_HEAVY);
  ev('ramhit', p.x - dir * tg.w * 0.5, p.y, side, w.i);
}
// 雲梯：跟著鉤住的那塊磚走；那塊磚碎了梯子就倒；被炸到也會斷
function ladderStep(o, dt) {
  o.age += dt; if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 4);
  if (o.hp <= 0) { ev('ladderdown', o.x, o.y, o.side); return true; }
  if (!o.b || o.b.dead || !o.b.body) { ev('ladderdown', o.x, o.y, o.side); return true; }
  const q = o.b.body.getWorldPoint(o.lp); o.x = q.x; o.y = q.y;
  return false;
}
// 自己這一邊又開火：梯子上的兵爬上去（梯子頂）砍最近的敵兵；旁邊沒有兵就砍兩塊磚
function laddersGo(side) {
  for (let i = S.objs.length - 1; i >= 0; i--) {
    const o = S.objs[i]; if (o.t !== 'ladder' || o.side !== side) continue;
    S.objs.splice(i, 1);
    const L = o.L, top = { x: o.x, y: o.y + 1.5 }; let best = null, bd = L.reach;
    for (const u of S.units) { if (!u.alive || u.side === side) continue; const d = Math.hypot(u.x - top.x, u.y + 1.2 - top.y); if (d < bd) { bd = d; best = u; } }
    if (best) {
      hurtUnit(best, L.ud * o.mul, side, K_PIERCE);
      if (best.alive && !best.immune && !best.def.big && !r1v(best.side)) { best.stun = Math.max(best.stun, 1); best.dazed = 1; ev('skip', best.x, best.y + 4, best.side, 1); }
      ev('ladderraid', best.x, best.y + 1.5, side, 1);
    } else {
      const L2 = S.blocks.filter((b) => !b.dead && b.body && b.side === 1 - side && !b.base && blockDist(b, top.x, top.y) < 3).sort((a, b) => blockDist(a, top.x, top.y) - blockDist(b, top.x, top.y));
      for (let k = 0; k < Math.min(2, L2.length); k++) { const p = L2[k].body.getPosition(); blockHurt(L2[k], L.d * o.mul, K_PIERCE, side, p.x, p.y); }
      ev('ladderraid', top.x, top.y, side, 0);
    }
  }
}
// 爆炸炸到梯子
function siegeBlast(x, y, r, dmg, side) {
  for (const o of S.objs) if (o.t === 'ladder' && o.side !== side && o.hp > 0 && Math.hypot(o.x - x, o.y - y) < r + 1.2) { o.hp -= dmg * 0.8; o.flash = 1; }
}
