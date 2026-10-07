// review2-sim 共用的對局記錄器。
//   const { load, play } = require('./lib');  const G = load();  const rec = play(G, { li, seed, diff, up, bot, maxR, player });
// load() 載入的是「加了觀察點」的模擬：只在幾個函式裡多呼叫 S.onXxx（不動亂數、不改任何數值），
// 所以同一個種子跑出來的戰局跟原版一模一樣（check_instrument.js 會驗證這一點）。
const H = require('./h');
const INSTR = [
  // 兵受傷
  ["function hurtUnit(u, d, side, kind) {\n  if (!u.alive || d <= 0) return;", "function hurtUnit(u, d, side, kind) {\n  if (!u.alive || d <= 0) return; if (S.onHurt) S.onHurt(u, d, side, kind);"],
  // 被埋
  ["if (load > (moved ? 3 : 30)) { ev('pinned', u.x, u.y + 4.6, u.side);", "if (load > (moved ? 3 : 30)) { if (S.onPin) S.onPin(u, load, moved); ev('pinned', u.x, u.y + 4.6, u.side);"],
  // 火藥桶被火點著（PH.ek = 1：爆炸當下點著的；0：延燒過去的）
  ["if (b.mat === M_KEG) { blockKill(b, 2, K_FIRE); return; }", "if (b.mat === M_KEG) { if (S.onKegFire) S.onKegFire(b, PH.ek); blockKill(b, 2, K_FIRE); return; }"],
  // 磚被打掉（誰打的）
  ["function blockKill(b, side, kind, clean) {\n  if (b.dead) return;", "function blockKill(b, side, kind, clean) {\n  if (b.dead) return; if (S.onKill) S.onKill(b, side, kind, clean);"],
  // 爆炸推兵
  ["if (j > 0) o.body.applyLinearImpulse({ x: dx / dl * j, y: dy / dl * j + j * 0.3 }, o.body.getWorldCenter(), true);", "if (j > 0) { o.body.applyLinearImpulse({ x: dx / dl * j, y: dy / dl * j + j * 0.3 }, o.body.getWorldCenter(), true); if (S.onKb) S.onKb(o, j, dx / dl, dy / dl, w, side, ov); }"]
];
/* 建議修法的試驗（只在記憶體裡改，不動 src/）：R2PATCH=名字,名字 node test/review2-sim/xxx.js
   nocrush   還在原位的磚，不會被同一座城裡「也還在原位」的磚撞壞（樓板彈一下不該把自己的牆和柱子壓碎）
   center    爆炸推「還在原位、質量 > 30 的大塊」（樓板、長樑）時，力作用在重心（不讓它像蹺蹺板一樣一頭翹起、另一頭砸下去），而且最多推到 6
   shieldpin 護城罩開著的那一邊，這一輪不做埋壓判定
   pinforce  埋壓只算「已經離開原位的磚和碎塊」的重量（還在原位、只是沉下來碰到頭的樓板不算）
   firereach 火只延燒到真的貼著的磚（查詢範圍改成自己的外框往外 0.8，而不是以長邊為半徑的正方形） */
const PATCHES = {
  nocrush: [["        const d = (dv - IMP_V0) * IMP_K * MAT[o.mat].frag;\n        if (d > 0) blockHurt(o, Math.min(d, o.hm * 0.9 + 6), K_CRUSH, o.side === credit ? 2 : credit);",
    "        const d = (dv - IMP_V0) * IMP_K * MAT[o.mat].frag; const oth = k ? r.a : r.b;\n        if (d > 0 && !(o.inPlace && oth && oth.isBlock && oth.inPlace && oth.st === o.st)) blockHurt(o, Math.min(d, o.hm * 0.9 + 6), K_CRUSH, o.side === credit ? 2 : credit);"]],
  center: [["      const j = Math.min(Jw * f, o.mass * Math.max(0, (o.mat === M_KEG ? 10 : DV_MAX) - along));          // 火藥桶很沉，不會被震得到處飛\n      o.body.applyLinearImpulse({ x: nx / nl * j, y: ny / nl * j + j * 0.22 }, { x: _cp.x, y: _cp.y }, true);",
    "      const big = o.inPlace && o.mass > 30; const j = Math.min(Jw * f, o.mass * Math.max(0, (o.mat === M_KEG ? 10 : big ? 6 : DV_MAX) - along));\n      o.body.applyLinearImpulse({ x: nx / nl * j, y: ny / nl * j + j * 0.22 }, big ? o.body.getWorldCenter() : { x: _cp.x, y: _cp.y }, true);"]],
  shieldpin: [["    if (!u.alive || u.def.big || u.side === credit) continue;\n    const p = u.body.getPosition(); let load = 0;", "    if (!u.alive || u.def.big || u.side === credit || S.team[u.side].shield.on) continue;\n    const p = u.body.getPosition(); let load = 0;"]],
  pinforce: [["      if (q.y > p.y + u.bh * 0.3 && Math.abs(q.x - p.x) < o.w / 2 + u.bw * 0.4) load += o.mass;", "      if (q.y > p.y + u.bh * 0.3 && Math.abs(q.x - p.x) < o.w / 2 + u.bw * 0.4 && (o.frag || !o.inPlace)) load += o.mass;"]],
  // 爆炸點火也要夠近（f > 0.5）或是直接打中，跟火藥桶同一個標準（不然隔著鐵甲、石牆照樣把裡面的木頭點著）
  fireocc: [["if (fire && MAT[o.mat].burn && (o.mat === M_KEG ? f > 0.5 : rnd() < 0.3 + 0.6 * f)) ignite(o, 3 + rnd() * 2);", "if (fire && MAT[o.mat].burn && (o.mat === M_KEG ? f > 0.5 : (o === hit || f > 0.5) && rnd() < 0.3 + 0.6 * f)) ignite(o, 3 + rnd() * 2);"]],
  // 連弩直接打中：推力跟著倍增後的威力縮小，而且跟爆炸一樣有累計上限（兵 UKB_V、磚 DV_MAX）
  boltcap: [["if (hit && hit.isBlock && !hit.dead) { const b = hit; if (b.body) b.body.applyLinearImpulse({ x: ux * Math.min(Jw, b.mass * 12), y: uy * Math.min(Jw, b.mass * 12) }, { x, y }, true); blockHurt(b, dmg, kind, side); }\n    else if (hit && hit.alive) { hurtUnit(hit, ud, side, kind); if (hit.body) hit.body.applyLinearImpulse({ x: ux * 20, y: uy * 20 + 8 }, hit.body.getWorldCenter(), true); }",
    "if (hit && hit.isBlock && !hit.dead) { const b = hit; if (b.body) { const bv = b.body.getLinearVelocity(), al = Math.max(0, bv.x * ux + bv.y * uy), jb = Math.min(Jw, b.mass * 12, b.mass * Math.max(0, DV_MAX - al)); b.body.applyLinearImpulse({ x: ux * jb, y: uy * jb }, { x, y }, true); } blockHurt(b, dmg, kind, side); }\n    else if (hit && hit.alive) { hurtUnit(hit, ud, side, kind); if (hit.body) { const hv = hit.body.getLinearVelocity(), al = Math.max(0, hv.x * ux + hv.y * uy), ju = Math.min(28 * Math.pow(mass, 0.8), hit.mass * Math.max(0, UKB_V - al)) / 28; hit.body.applyLinearImpulse({ x: ux * 20 * ju, y: (uy * 20 + 8) * ju }, hit.body.getWorldCenter(), true); } }"]],
  firereach: [["      const p = b.body.getPosition(), reach = Math.max(b.w, b.h) * 0.5 + 0.8, list = physQuery(p.x, p.y, reach).slice();\n      for (let k = 0; k < list.length; k++) {\n        const o = list[k];\n        if (o.isBlock) { if (!o.dead && o !== b && o.burn <= 0 && MAT[o.mat].burn && rnd() < 0.1) ignite(o, 2.5 + rnd() * 2); }",
    "      const p = b.body.getPosition(), reach = Math.max(b.w, b.h) * 0.5 + 0.8, list = physQuery(p.x, p.y, reach).slice();\n      for (let k = 0; k < list.length; k++) {\n        const o = list[k];\n        if (o.isBlock) { if (!o.dead && o !== b && o.burn <= 0 && MAT[o.mat].burn && blockDist(b, o.body.getPosition().x, o.body.getPosition().y) < Math.max(o.w, o.h) * 0.5 + 0.8 && rnd() < 0.1) ignite(o, 2.5 + rnd() * 2); }"]]
};
function load(opt) {
  opt = opt || {};
  let extra = []; const names = (opt.fix || process.env.R2PATCH || '').split(',').filter(Boolean);
  for (const n of names) { if (!PATCHES[n]) throw new Error('unknown patch ' + n); extra = extra.concat(PATCHES[n]); }
  if (names.length && !opt.quiet) console.error('[sim patched in memory: ' + names.join(', ') + ']');
  return H({ patch: (opt.noInstr ? [] : INSTR).concat(extra, opt.patch || []), extra: opt.extra });
}
const HOW = ['hit', 'crush', '?', 'burn', 'fell', 'out'];
const KIND = ['blast', 'pierce', 'heavy', 'fire', 'ice', 'zap', 'crush', 'dark'];
const r1 = (v) => +v.toFixed(1), r0 = (v) => Math.round(v);

/* o: { li, seed, diff=1, up=0|{..}, bot='casual'|null, maxR=40, player(G, ctx) 自訂的玩家（bot 為 null 時用）, onStep(G), on(event…), setup(G), mute }
   回傳一場的記錄 */
function play(G, o) {
  const { S, SH, simInit, simStep, BOTS, teamBar, structBar } = G;
  const li = o.li, diff = o.diff === undefined ? 1 : o.diff, up = typeof o.up === 'object' ? o.up : H.UP(o.up || 0), maxR = o.maxR || 40;
  const opts = {}; if (o.bot) opts.botA = typeof o.bot === 'string' ? BOTS[o.bot] : o.bot; if (o.mute !== undefined) opts.mute = o.mute;
  simInit(li, up, o.seed, diff, opts);
  if (o.setup) o.setup(G);
  const rec = {
    li, seed: o.seed, diff, up: typeof o.up === 'object' ? -1 : (o.up || 0), bot: typeof o.bot === 'string' ? o.bot : (o.name || 'script'),
    state: '', rounds: 0, time: 0, deaths: [], pins: [], lossBy: {}, maxLoss: 0, earlyWipe: 0, earlyWipeAt: '',
    tmo: { resolve: 0, hazard: 0 }, tmoAt: [], sh: [0, 0], ult: [0, 0], rnd: [], bonus: [], postLost: 0, postKill: 0, exc: '', nan: 0, stuck: '',
    gateShots: 0, gates: {}, revive: [0, 0], chainMax: 0, vols: [], kegs: [], phases: [], bback: [], orbs: { spawn: [], die: [], hit: [] }, bar: { hit: 0, brk: 0 },
    skips: [0, 0], suddenR: 0, kbMax: [0, 0], vMax: [0, 0], evc: {}
  };
  // 每個兵最近受到的傷害（看兵是怎麼死的）
  const dmgLog = new Map(); for (const u of S.units) dmgLog.set(u, []);
  let inPin = false, vol = null, pendUlt = -1;
  const kbSum = new Map();
  S.onHurt = (u, d, side, kind) => {
    const L = dmgLog.get(u); if (L) { L.push({ t: S.time, d, side, kind: inPin ? 'pin' : KIND[kind], r: S.round, ph: S.phase, turn: S.turn }); if (L.length > 60) L.shift(); } inPin = false;
    if (vol && side === vol.s && u.side !== side) vol.du += d;
    if (vol && u.side === vol.s) vol.self += d;
  };
  S.onPin = (u, load, moved) => {
    inPin = true;       // burialCheck 緊接著就同步呼叫 hurtUnit：onHurt 記完這一筆之後把記號清掉
    const p = u.body.getPosition(); const parts = [];
    for (let ce = u.body.getContactList(); ce; ce = ce.next) {
      if (!ce.contact.isTouching()) continue; const b = ce.other.getUserData(); if (!b || !b.isBlock || b.dead) continue; const q = ce.other.getPosition();
      if (q.y > p.y + u.bh * 0.3 && Math.abs(q.x - p.x) < b.w / 2 + u.bw * 0.4) parts.push({ mat: b.mat, mass: r1(b.mass), frag: b.frag, inPlace: b.inPlace ? 1 : 0, side: b.side, w: r1(b.w), h: r1(b.h), dy: r1(q.y - p.y), dx: r1(q.x - p.x), ang: +ce.other.getAngle().toFixed(2), awake: ce.other.isAwake() ? 1 : 0 });
    }
    rec.pins.push({ side: u.side, type: u.type, slot: u.slot, r: S.round, turn: S.turn, load: r1(load), moved: moved ? 1 : 0, hp: r0(u.hp), dmg: r0(14 + Math.min(load, 80) * 0.7), x: r1(u.x), y: r1(u.y), hx: r1(u.hx), hy: r1(u.hy), parts });
  };
  S.onKegFire = (b, ek) => { b._fireCause = ek ? 'fireblast' : 'burnspread'; };
  S.onKill = (b, side, kind, clean) => {
    if (b.mat !== 7 || b.prop) return;
    rec.kegs.push({ r: S.round, turn: S.turn, ph: S.phase, by: side, kind: kind === 99 ? 'fin' : KIND[kind] || kind, cause: b._fireCause || (kind === 99 ? 'fin' : clean ? 'clean' : 'dmg'), post: S.state !== 'play' ? 1 : 0, inPlace: b.inPlace ? 1 : 0, t: r1(S.time) });
  };
  S.onKb = (u, j, nx, ny, w, side, ov) => {
    // 這一輪爆炸加在這個兵身上的衝量（向量和）／質量 = 光靠爆炸給的速度
    let k = kbSum.get(u); if (!k || k.vol !== S.vol) kbSum.set(u, k = { vol: S.vol, x: 0, y: 0 });
    k.x += nx * j / u.mass; k.y += (ny * j + j * 0.3) / u.mass;
    const s = Math.hypot(k.x, k.y); if (s > rec.kbMax[u.side]) rec.kbMax[u.side] = r1(s);
    const v = u.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > rec.vMax[u.side]) rec.vMax[u.side] = r1(sp);
  };
  const user = o.on;
  const tgtKind = (T) => { const A = T.ai; if (!A) return 'human'; const b = A.best; if (!b) return 'none'; const t = b.t; if (t.obj) return t.obj.t; if (t.hg) return 'gate'; if (t.w === 1.35) return 'keg'; if (t.w < 1) return 'block'; return 'unit'; };
  const closeVol = () => { if (!vol) return; const T = S.team[vol.s]; vol.db = r0(T.dealt - vol.d0); delete vol.d0; vol.du = r0(vol.du); vol.self = r0(vol.self); vol.fired = T.fired - vol.f0; delete vol.f0; vol.dur = r1(S.time - vol.t0); delete vol.t0; rec.vols.push(vol); vol = null; };
  S.on = (t, a, b, c, d, e, f) => {
    rec.evc[t] = (rec.evc[t] || 0) + 1;
    if (t === 'udie') {
      const u = S.units.find((k) => !k.alive && k.side === c && k.slot === f && !k._logged); if (u) u._logged = S.time;
      const L = u ? dmgLog.get(u) : [], last = L.length ? L[L.length - 1] : null;
      const recent = {}; if (L) for (const h of L) if (S.time - h.t < 12) recent[h.kind] = +(((recent[h.kind] || 0) + h.d)).toFixed(0);
      const st = S.st[c];
      const dd = { s: c, type: d, slot: f, how: HOW[e], r: S.round, ph: S.phase, turn: S.turn, vol: S.vol, t: +S.time.toFixed(2), x: r1(a), y: r1(b - 1.8), relx: r1(a - st.x0), last: last ? last.kind : '', lastBy: last ? last.side : -1, lastAge: last ? +(S.time - last.t).toFixed(2) : -1, recent, post: S.state !== 'play' ? 1 : 0, hx: u ? r1(u.hx) : 0, hy: u ? r1(u.hy) : 0, vx: u ? r1(u.vx) : 0, vy: u ? r1(u.vy) : 0 };
      rec.deaths.push(dd);
      if (u) u._logged = 0;       // 復活之後再倒一次也要記得到
      const k = c + ':' + S.round + ':' + S.turn + ':' + (S.phase === 'hazard' ? 'hz' : 'v'); rec.lossBy[k] = (rec.lossBy[k] || 0) + 1;
      if (vol && c !== vol.s) vol.kills++;
    } else if (t === 'shield') rec.sh[c]++;
    else if (t === 'ult') { rec.ult[c]++; pendUlt = c; }      // 'ult' 事件在 'volley' 事件之前發出：先記著，等這一輪的記錄開出來再標上去
    else if (t === 'bonus') rec.bonus.push({ r: S.round, side: c, kind: d });
    else if (t === 'revive') rec.revive[c]++;
    else if (t === 'gate') { if (e === 0) rec.gateShots++; const k = e + 'x' + c + 'o' + d; rec.gates[k] = (rec.gates[k] || 0) + 1; if (vol && e === vol.s && c > vol.gm) vol.gm = c; }
    else if (t === 'chain') { if (b === 0 && a > rec.chainMax) rec.chainMax = a; }
    else if (t === 'volley') {
      closeVol();
      const T = S.team[a];
      let held = 0, can = 0; for (const u of T.units) if (u.alive) { if (u.held) held++; else if (u.w || u.def.bal) can++; }
      vol = { r: S.round, s: a, any: b, tg: tgtKind(T), held, can, ult: pendUlt === a ? 1 : 0, gm: 1, du: 0, self: 0, kills: 0, d0: T.dealt, f0: T.fired, t0: S.time, sh: S.team[1 - a].shield.on ? 1 : 0, ax: r1(T.aim[0]), ay: r1(T.aim[1]), rage: T.rage > 0 ? 1 : 0 };
      if (T.ai) vol.am = T.ai.mult; pendUlt = -1;
    } else if (t === 'turn' || t === 'round' || t === 'end') { if (t === 'turn' || t === 'end') closeVol(); }
    else if (t === 'skip') rec.skips[c]++;
    else if (t === 'phase') rec.phases.push({ p: a, r: S.round });
    else if (t === 'bossback') rec.bback.push({ r: S.round, turn: S.turn, ph: S.phase });
    else if (t === 'orb') rec.orbs.spawn.push(S.round);
    else if (t === 'orbdie') rec.orbs.die.push(S.round);
    else if (t === 'boom') { if (d === 9) rec.orbs.hit.push(S.round); }
    else if (t === 'bar') rec.bar.hit++;
    else if (t === 'barbreak') { rec.bar.hit++; rec.bar.brk++; }
    else if (t === 'sudden') rec.suddenR = S.round;
    if (user) user(t, a, b, c, d, e, f, rec);
  };
  let lastR = -1, phaseKey = '', phaseAt = 0, ended = null, steps = 0;
  const fin = (v) => typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity;
  const ctx = { rec, aimT: 0, data: {} };
  try {
    while ((S.state === 'play' && S.round <= maxR) || (S.state !== 'play' && S.endT < 4.3)) {
      const play0 = S.state === 'play', ph0 = S.phase, pT = S.phaseT, q0 = S.quietT, r0_ = S.round, t0_ = S.turn;
      // 自訂的玩家：每一步都叫一次（自己看現在是什麼階段）。ctx.aimT = 輪到我方瞄準之後過了幾秒
      if (play0 && !S.team[0].ai && o.player) { if (S.phase === 'aim' && S.turn === 0) ctx.aimT += 1 / 60; else ctx.aimT = 0; o.player(G, ctx); }
      simStep(1 / 60); steps++;
      if (o.onStep) o.onStep(G, ctx);
      if (play0 && (ph0 === 'resolve' || ph0 === 'hazard') && S.phase !== ph0 && pT + 1 / 60 > 9 && q0 + 1 / 60 < 0.45) { rec.tmo[ph0]++; if (rec.tmoAt.length < 12) rec.tmoAt.push(ph0[0] + r0_ + ':' + t0_ + ':s' + SH.n + ':b' + S.nburn); }
      const key = S.phase + S.turn + ':' + S.round;
      if (key !== phaseKey) { phaseKey = key; phaseAt = S.time; } else if (S.state === 'play' && S.time - phaseAt > 14 && !rec.stuck) rec.stuck = key + ' shots=' + SH.n;
      if (S.round !== lastR && S.state === 'play') {
        lastR = S.round;
        const bu = S.boss ? G.bossUnit() : null;
        let fh = 0; for (const u of S.team[1].units) if (u.alive) fh += u.hp;
        let mh = 0; for (const u of S.team[0].units) if (u.alive) mh += u.hp;
        rec.rnd[S.round] = { a0: S.team[0].alive, a1: S.team[1].alive, h0: Math.round(mh), h1: Math.round(fh), b0: +teamBar(0).toFixed(2), b1: +teamBar(1).toFixed(2), s0: +structBar(0).toFixed(2), s1: +structBar(1).toFixed(2), boss: bu ? Math.round(bu.hp) : -1, ph: S.boss ? S.boss.phase : 0, t: Math.round(S.time), wind: S.wind, u0: +S.team[0].ult.c.toFixed(0), u1: +S.team[1].ult.c.toFixed(0), rage: +S.rage.toFixed(1) };
      }
      if ((steps & 15) === 0) {
        for (const u of S.units) if (u.alive) { const p = u.body.getPosition(); if (!fin(p.x) || !fin(p.y) || !fin(u.hp)) rec.nan++; }
        for (const b of S.blocks) if (!b.dead) { const p = b.body.getPosition(); if (!fin(p.x) || !fin(p.y) || !fin(b.hp)) rec.nan++; }
        for (let i = 0; i < SH.n; i++) if (!fin(SH.x[i]) || !fin(SH.y[i]) || !fin(SH.mass[i])) rec.nan++;
      }
      if (S.state !== 'play' && !ended) {
        closeVol();
        ended = { lost: S.stat.lost, kills: S.stat.kills, phase: ph0, turn: S.turn, round: S.round, bar0: S.endBar[0], bar1: S.endBar[1], shots: [SH.cnt[0], SH.cnt[1], SH.cnt[2]], pend: S.pend.length };
        // 分出勝負那一刻，還活著的兵在哪
        rec.endUnits = S.units.filter((u) => u.alive).map((u) => ({ s: u.side, type: u.type, slot: u.slot, hp: r0(u.hp), relx: r1(u.x - u.st.x0), y: r1(u.y), home: Math.abs(u.x - u.hx) < 2.7 && Math.abs(u.y - u.hy) < 2 ? 1 : 0 }));
      }
    }
  } catch (e) { rec.exc = e.stack.split('\n').slice(0, 4).join(' | '); }
  closeVol();
  rec.state = S.state; rec.rounds = S.round; rec.time = +S.time.toFixed(1);
  rec.lostU = S.team[0].units.length - S.team[0].alive; rec.alive0 = S.team[0].alive; rec.alive1 = S.team[1].alive;
  if (ended) { rec.end = ended; rec.postLost = S.stat.lost - ended.lost; rec.lostAtEnd = ended.lost; }
  else rec.endUnits = S.units.filter((u) => u.alive).map((u) => ({ s: u.side, type: u.type, slot: u.slot, hp: r0(u.hp), relx: r1(u.x - u.st.x0), y: r1(u.y), home: Math.abs(u.x - u.hx) < 2.7 && Math.abs(u.y - u.hy) < 2 ? 1 : 0 }));
  rec.stat = Object.assign({}, S.stat);
  // 一輪敵軍砲擊最多帶走我方幾個兵；前三回合有沒有一輪就倒兩個以上
  for (const k of Object.keys(rec.lossBy)) { const [s, r, turn, kind] = k.split(':'); if (s !== '0') continue; const n = rec.lossBy[k]; if (n > rec.maxLoss) rec.maxLoss = n; if (n >= 2 && +r <= 3 && n > rec.earlyWipe) { rec.earlyWipe = n; rec.earlyWipeAt = k; } }
  S.on = null; S.onHurt = null; S.onPin = null; S.onKegFire = null; S.onKill = null; S.onKb = null;
  return rec;
}
module.exports = { load, play, HOW, KIND, INSTR, PATCHES, H };
