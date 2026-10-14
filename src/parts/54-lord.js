/* ===== 54-lord: 第三十關「乾坤魔君」（最後的魔王，借用 50-sim 的魔王框架：預告招式、換階段、破綻）=====
   - 他那一邊的砲擊全部先預告（跟第二十七關一樣：紅線、紅圈），魔君自己的乾坤彈也是。
   - 第二階段起「天秤審判」：預告的那一回合，他開火時兩邊的城防拉成一樣（高的那座被削到平均、低的那座修到平均）；你開著護罩就擋下來。
   - 第三階段起「乾坤倒轉」：他開火時天地倒轉一下（他的城不算）：沒罩住的城整片被拋起來再摔下去，兵也一樣。放完他會累一回合（破綻）。
   - 我方新兵：鏡影兵（鏡影彈飛到最高點停在半空變成一面直立的鏡子：對方的砲彈打到它就照鏡子彈回去，落在鏡子另一邊對稱的地方）、
     星盤師（星盤彈標一個星位，這一回合結束時一顆流星直直砸下來，護罩擋不住） */
const BOSS_LINES_LORD = {
  intro: '天地乾坤，皆在我掌中。', castle: '我的倒懸殿……！', p2: '天秤，舉起來！', p3: '乾坤——倒轉！', tired: '……天地也要喘口氣。', lamp: '', core: '',
  hit: ['有點意思。', '區區凡砲。', '再來啊！'], kill: ['一個也逃不掉。', '輕如鴻毛。'], die: '乾坤……竟然……',
  next: { barrage: '看好了，這一輪我打兩次。', judge: '天秤舉起：這一輪，兩邊的城一樣高！', flip: '這一輪，天地翻過來！' }
};
function bossLines() { return S.lv.boss && S.lv.boss.lines === 'lord' ? BOSS_LINES_LORD : BOSS_LINES; }
const FLIP_G = 0.33, FLIP_T = 0.46;          // 乾坤倒轉：往上的加速度是重力的幾倍、倒多久

// 天秤審判：兩邊的城防（城樓完整度）拉到平均
function lordJudge(bu) {
  const s0 = S.st[0], s1 = S.st[1]; castleScan(s0); castleScan(s1);
  const f0 = structFrac(0), f1 = structFrac(1), avg = (f0 + f1) / 2;
  if (S.team[0].shield.on) { ev('judge', bu.x, bu.y + bu.bh + 4, 0, 0); ev('shieldhit', s0.cx, s0.y0 + s0.h * 0.5, 0); return; }          // 護罩擋下來
  ev('judge', bu.x, bu.y + bu.bh + 4, f0 > f1 ? 1 : -1, Math.abs(f0 - f1));
  if (Math.abs(f0 - f1) < 0.02) return;
  const hi = f0 > f1 ? s0 : s1, lo = f0 > f1 ? s1 : s0;
  stLose(hi, avg);
  stGain(lo, (avg - Math.min(f0, f1)) * lo.hp0);
}
// 這座城的城防削到 target（城樓完整度的比例）：隨便挑還在原位的磚打裂（一次打一小截、每打一下重量一次，到了就停）
function stLose(st, target) {
  const L = st.blocks.filter((b) => !b.dead && b.inPlace && !b.lost && b.wt > 0 && !b.base);
  let n = 0;
  while (L.length && n++ < 400) {
    castleScan(st); if (st.hpNow / st.hp0 <= target + 0.005) break;
    const i = ri(L.length), b = L[i];
    blockHurt(b, (b.seg ? b.segM : b.hm) * 0.35, K_CRUSH, 2);
    if (b.dead || !b.body || b.hp < b.hm * 0.3) L.splice(i, 1);
    const p = b.dead ? { x: b.x, y: b.y } : b.body.getPosition(); if (rnd() < 0.3) ev('judgehit', p.x, p.y, st.side);
  }
}
// 這座城多 need：打裂的磚修回來（垮掉的修不回來）
function stGain(st, need) {
  const L = st.blocks.filter((b) => !b.dead && b.body && b.inPlace && !b.lost && b.wt > 0 && b.hp < b.hm).sort((a, b) => (1 - b.hp / b.hm) * b.wt - (1 - a.hp / a.hm) * a.wt);
  for (const b of L) {
    if (need <= 0) break;
    const room = b.wt * (1 - STAND_K) * (1 - clamp(b.hp / b.hm, 0, 1)), k = room <= need ? 1 : need / room;
    if (b.seg) { let hp = 0, low = 1; for (let j = 0; j < b.seg.length; j++) { if (b.seg[j] > 0) b.seg[j] += (b.segM - b.seg[j]) * k; hp += Math.max(0, b.seg[j]); low = Math.min(low, b.seg[j] / b.segM); } b.hp = hp; b.low = low; }
    else b.hp += (b.hm - b.hp) * k;
    need -= room * k;
    const p = b.body.getPosition(); if (rnd() < 0.4) ev('judgeheal', p.x, p.y, st.side);
  }
}
// 乾坤倒轉：開始倒（物理每一步把東西往上推）
function lordFlip(bu) {
  S.flip = { t: 0, T: FLIP_T };
  ev('flip', bu.x, bu.y + bu.bh + 4, S.team[0].shield.on ? 1 : 0);
}
const _ff = { x: 0, y: 0 };
function flipForces(dt) {
  const F = S.flip; F.t += dt; if (F.t > F.T) { S.flip = null; return; }
  const sh = S.team[0].shield.on ? S.st[0] : null, up = GRAV * (1 + FLIP_G);
  for (const b of S.blocks) {
    if (b.dead || !b.body || b.base || b.side === 1) continue;          // 魔君的城不算（那是他的天地）
    const p = b.body.getPosition(); if (sh && inBubble(sh, p.x, p.y)) continue;
    if (!b.body.isAwake()) b.body.setAwake(true);
    _ff.x = 0; _ff.y = up * b.mass; b.body.applyForceToCenter(_ff, true);
  }
  for (const u of S.units) {
    if (!u.alive || !u.body || u.side === 1) continue;
    if (sh && inBubble(sh, u.x, u.y + 1)) continue;
    _ff.x = 0; _ff.y = up * u.mass; u.body.applyForceToCenter(_ff, true);
  }
}

/* ---------- 鏡影兵、星盤師 ---------- */
// 鏡影彈飛到最高點（或撞到東西）：停在那裡變成一面直立的鏡子，鏡面朝著敵軍
function mirageSpawn(side, x, y, w, mass) {
  const fs = S.st[1 - side]; if (fs && x > fs.x0 - 3 && x < fs.x1 + 3) { ev('mirrorbreak', x, y, side); return; }          // 擺不進敵城的範圍裡（不然鏡子貼在他的砲口前面，他打什麼都砸回自己）
  const M = w.mirage, hp = M.hp * (side < 2 ? S.team[side].hpMul : 1) * Math.min(1.5, Math.sqrt(mass)), ang = side === 0 ? -Math.PI / 2 : Math.PI / 2;
  const o = { t: 'bmirror', side, u: null, fixed: 1, x, y, len: M.len, ang, dx: Math.cos(ang) * M.len, dy: Math.sin(ang) * M.len, hp, hm: hp, one: 1, flash: 1, age: 0, n: 0 };
  S.objs.push(o); ev('mirageup', x, y, side);
}
function lordHit(i, w, hit, o, hx, hy, vx, vy) {
  const side = SH.side[i], mass = SH.mass[i];
  if (w.mirage) {
    const sp = Math.hypot(vx, vy) || 1;
    physExplode(hx, hy, w, side, mass * 0.5, SH.flag[i], hit === 1 ? null : o, vx, vy);
    mirageSpawn(side, hx - vx / sp * 2.2, Math.max(hy - vy / sp * 2.2, (groundY(hx) < -100 ? 0 : groundY(hx)) + w.mirage.len + 0.5), w, mass);
    return 1;
  }
  if (w.starmark) {
    physExplode(hx, hy, w, side, mass, SH.flag[i], hit === 1 ? null : o, vx, vy);
    (S.stars || (S.stars = [])).push({ x: hx, side, t0: S.time, mass });
    ev('starmark', hx, hy, side);
    return 1;
  }
  return 0;
}
// 回合結束：每個星位一顆流星直直砸下來（砸在那一欄最上面的東西上）
function starsFall() {
  const L = S.stars; if (!L || !L.length) return false;
  for (const m of L) {
    const top = 70; rayShot(m.x, top, m.x, -30, 2, false);
    if (!RAY.hit) continue;          // 底下是深谷：流星直接掉下去
    S.pend.push({ t: S.time + 0.35 + rnd() * 0.25, x: m.x, y: RAY.y, w: WPN.starfall, side: m.side, ev: 'starfall', mass: Math.min(1.5, m.mass || 1), vy: -1 });
  }
  L.length = 0;
  return true;
}
