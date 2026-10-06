// node test/review/soak.js [levels=1-6] [bots=newbie,casual,expert] [seeds=4] [seed0=0] [diffs=0,1,2] [ups=0,3,5]
// 廣域壓力測試：比 test/inv.js 多查很多內部數字、回合順序、卡住的原因、分出勝負之後還有沒有東西在變。
// 輸出：每一種異常的次數 + 前幾個例子（關卡、bot、seed、難度、強化）。
const G = require('./h')();
const { S, SH, PH, simInit, simStep, LEVELS, BOTS, teamBar, structBar, groundY, groundYRaw, RAY } = G;
const arg = process.argv.slice(2);
const lvArg = arg[0] || '1-6', bots = (arg[1] || 'newbie,casual,expert').split(','), NSEED = +(arg[2] || 4), SEED0 = +(arg[3] || 0);
const diffs = (arg[4] || '0,1,2').split(',').map(Number), ups = (arg[5] || '0,3,5').split(',').map(Number);
const lvs = []; { const m = lvArg.split('-'); for (let i = +m[0]; i <= +(m[1] || m[0]); i++) lvs.push(i - 1); }
const MAXR = +(process.env.MAXR || 45);
const issues = {};      // key -> { n, ex: [] }
function flag(key, tag, detail) { const o = issues[key] || (issues[key] = { n: 0, games: new Set(), ex: [] }); o.n++; o.games.add(tag); if (o.ex.length < 4) o.ex.push(tag + (detail ? ' :: ' + detail : '')); }
const fin = (v) => typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity;
const stats = { games: 0, won: 0, lost: 0, undecided: 0, resolveQuiet: 0, resolveTimeout: 0, hazardQuiet: 0, hazardTimeout: 0, steps: 0, simSec: 0, rounds: 0, maxAimAI: 0, timeoutWhy: {} };

function runGame(li, bot, seed, diff, upL) {
  const tag = `L${li + 1} ${bot} seed=${seed} diff=${diff} up=${upL}`;
  const up = { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL };
  simInit(li, up, seed, diff, { botA: BOTS[bot] }); stats.games++;
  const evq = [];        // 回合順序用
  let vol = [0, 0], lastVolSide = -1, roundSeen = 0, turnSeen = -1, revives = [], booms = 0;
  let ownBoom = 0;
  S.on = (t, a, b, c, d, e, f) => {
    if (t === 'round') { if (a !== roundSeen + 1) flag('round-skip', tag, `round ${roundSeen} -> ${a}`); roundSeen = a; if (lastVolSide === 0) flag('round-started-before-side1-volley', tag, 'r' + a); lastVolSide = -1; turnSeen = -1; }
    else if (t === 'turn') { if (a === 0 && turnSeen !== -1) flag('turn-order', tag, `turn0 after ${turnSeen} r${b}`); if (a === 1 && turnSeen !== 0) flag('turn-order', tag, `turn1 after ${turnSeen} r${b}`); turnSeen = a; }
    else if (t === 'volley') { vol[a]++; if (a === lastVolSide) flag('double-volley', tag, `side ${a} r${S.round}`); if (a !== S.turn) flag('volley-wrong-side', tag); if (a === 1 && lastVolSide !== 0) flag('side1-volley-without-side0', tag, 'r' + S.round); lastVolSide = a; }
    else if (t === 'revive') revives.push({ u: S.team[c].units.find((u) => u.slot === d), t: S.time, side: c, y: b, hy: 0 });
    else if (t === 'boom') {
      booms++;
      // 我方砲彈在自己城樓範圍裡爆炸：打中的是什麼？（找出是哪一發，看它的旗標和飛了多久）
      if (e === 0 && RAY.x === a && RAY.y === b) {
        const st = S.st[0];
        if (a > st.x0 - 1 && a < st.x1 + 1 && b < st.y1 + 4) {
          let bi = -1, bd = 2.2; for (let i = 0; i < SH.n; i++) { if (SH.side[i] !== 0) continue; const d = Math.hypot(SH.x[i] - a, SH.y[i] - b); if (d < bd) { bd = d; bi = i; } }
          const fl = bi >= 0 ? SH.flag[bi] : -1, age = bi >= 0 ? SH.age[bi] : -1, o = RAY.o;
          const what = o ? (o.isBlock ? (o.side === 0 ? 'own-side-block' : o.side === 2 ? (o.st === S.rubble ? 'fallen-rock' : 'neutral-block') : 'enemy-debris') : 'enemy-unit') : 'ground';
          const how = fl < 0 ? '?' : (fl & G.F_WILD) ? 'mirrored' : (fl & G.F_PORT) ? 'ported' : (fl & G.F_IN) ? 'still-F_IN' : 'F_IN-cleared';
          flag(`own-shot-explodes-inside-own-castle:${what}:${how}`, tag, `r${S.round} at (${a.toFixed(1)},${b.toFixed(1)}) age=${age.toFixed(2)} w=${G.WL[d].id} mass=${(f % 100).toFixed(2)}`);
        }
      }
    }
  };
  let prevPhase = S.phase, prevPhaseT = 0, prevTurn = 0, aimT = 0, steps = 0, ended = null, post = null, lastTimeoutInfo = '';
  let consecTimeout = 0, maxConsecTimeout = 0;
  const seenBlocks = new Set();
  try {
    while ((S.state === 'play' && S.round < MAXR) || (S.state !== 'play' && S.endT < 6)) {
      // 逾時前一步先記下「為什麼還不安靜」
      let why = '';
      if (S.state === 'play' && (S.phase === 'resolve' || S.phase === 'hazard') && S.phaseT + 1 / 60 > 9) {
        const w = []; if (SH.n > 0) w.push('shots'); if (S.pend.length) w.push('pend'); if (G.flyersBusy()) w.push('flyers'); if (S.nburn > 0) w.push('burn');
        if (!G.worldQuiet()) { let worst = null, wv = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) { if (!b.isDynamic() || !b.isAwake()) continue; const v = b.getLinearVelocity(), sp = Math.hypot(v.x, v.y) + Math.abs(b.getAngularVelocity()); if (sp > wv) { wv = sp; worst = b; } } const o = worst && worst.getUserData(); w.push('moving:' + (o ? (o.isBlock ? (o.kind === 'ball' ? 'ball' : o.frag ? 'frag' : o.prop ? 'prop' : 'block') + '/mat' + o.mat : 'unit') : '?')); lastTimeoutInfo = `v=${wv.toFixed(1)} at (${worst.getPosition().x.toFixed(1)},${worst.getPosition().y.toFixed(1)})`; }
        why = w.join('+') || 'quiet<0.45';
      }
      const wasPlay = S.state === 'play', pPhase = S.phase, pT = S.phaseT, pQuiet = S.quietT;
      simStep(1 / 60); steps++;
      if (wasPlay && (pPhase === 'resolve' || pPhase === 'hazard') && S.phase !== pPhase) {
        const timeout = pT + 1 / 60 > 9 && pQuiet + 1 / 60 < 0.45;
        if (pPhase === 'resolve') { if (timeout) stats.resolveTimeout++; else stats.resolveQuiet++; } else { if (timeout) stats.hazardTimeout++; else stats.hazardQuiet++; }
        if (timeout && S.state === 'play') { consecTimeout++; if (consecTimeout > maxConsecTimeout) maxConsecTimeout = consecTimeout; stats.timeoutWhy[why] = (stats.timeoutWhy[why] || 0) + 1; flag('phase-timeout-9s:' + why, tag, `r${S.round} ${pPhase} ${lastTimeoutInfo}`); } else if (!timeout) consecTimeout = 0;
      }
      if (S.state === 'play' && S.phase === 'aim' && S.team[S.turn].ai) { aimT = S.phase === prevPhase && S.turn === prevTurn ? aimT + 1 / 60 : 0; if (aimT > stats.maxAimAI) stats.maxAimAI = aimT; if (aimT > 6) { flag('ai-aim-stall', tag, `side ${S.turn} r${S.round}`); aimT = -1e9; } }
      prevPhase = S.phase; prevTurn = S.turn;
      // 分出勝負的那一刻記下我方狀態；4.2 秒後（finishLevel 結算的時間）再比一次
      if (S.state !== 'play' && !ended) ended = { state: S.state, bar: teamBar(0), lost: S.stat.lost, alive: S.team[0].alive, kills: S.stat.kills, phaseWas: pPhase, turnWas: S.turn, round: S.round };
      if (ended && !post && S.endT >= 4.2) { post = { bar: teamBar(0), lost: S.stat.lost, alive: S.team[0].alive }; if (ended.state === 'won') { if (post.lost !== ended.lost) flag('won-but-units-lost-after-victory', tag, `lost ${ended.lost}->${post.lost} alive ${ended.alive}->${post.alive} (ended in ${ended.phaseWas}/turn${ended.turnWas} r${ended.round})`); if (post.bar < ended.bar - 0.02) flag('won-but-bar-drops-after-victory', tag, `bar ${(ended.bar * 100).toFixed(0)}%->${(post.bar * 100).toFixed(0)}% (ended in ${ended.phaseWas}/turn${ended.turnWas})`); const s0 = (b, l) => b >= 0.6 && !l ? 3 : b >= 0.3 ? 2 : 1; if (s0(ended.bar, ended.lost) !== s0(post.bar, post.lost)) flag('won-stars-change-after-victory', tag, `${s0(ended.bar, ended.lost)}★ -> ${s0(post.bar, post.lost)}★`); } }
      if (S.state !== 'play' && S.phase !== 'over') flag('ended-but-phase-not-over', tag, S.phase);
      // ---- 每一步都查的（便宜） ----
      for (let s = 0; s < 2; s++) {
        const T = S.team[s];
        if (!fin(T.ult.c) || T.ult.c < 0 || T.ult.c > T.ult.need + 1e-9) flag('ult-charge-out-of-range', tag, `side${s} ${T.ult.c}`);
        if (!fin(T.shield.c) || T.shield.c < 0 || T.shield.c > T.shield.need + 1e-9) flag('shield-charge-out-of-range', tag, `side${s} ${T.shield.c}`);
        if (!fin(T.aim[0]) || !fin(T.aim[1])) flag('aim-nan', tag);
        else { const v = Math.hypot(T.aim[0], T.aim[1]), a = Math.atan2(T.aim[1], T.aim[0] * T.dir); if (v < G.VMIN - 1e-6 || v > G.VMAX + 1e-6 || a < G.ANG_MIN - 1e-6 || a > G.ANG_MAX + 1e-6) flag('aim-out-of-range', tag, `side${s} v=${v} a=${a}`); }
        if (SH.cnt[s] > G.SHOT_CAP + 80) flag('shots-over-cap', tag, `side${s} ${SH.cnt[s]}`);
      }
      if (SH.n > G.NS) flag('shots-over-NS', tag);
      if (S.nfrag > G.FRAG_MAX) flag('nfrag-over-max', tag, '' + S.nfrag);
      if (S.nfrag < 0 || S.nburn < 0 || S.chain < 0) flag('negative-counter', tag, `${S.nfrag} ${S.nburn} ${S.chain}`);
      if (!(S.rage >= 1 && S.rage <= 3)) flag('rage-range', tag, '' + S.rage);
      if (S.wind !== Math.round(S.wind) || (S.lv.wind ? Math.abs(S.wind) > S.lv.wind.max : S.wind !== 0)) flag('wind-range', tag, '' + S.wind);
      // ---- 每 8 步查的 ----
      if ((steps & 7) === 0) {
        let nf = 0, nb = 0, live = 0;
        seenBlocks.clear();
        for (const b of S.blocks) {
          if (seenBlocks.has(b)) flag('dup-in-S.blocks', tag); seenBlocks.add(b);
          if (b.dead) { if (b.body) flag('dead-block-has-body', tag); continue; }
          live++;
          if (!b.body) { flag('live-block-no-body', tag); continue; }
          if (b.body.getUserData() !== b) flag('body-userdata-mismatch', tag);
          if (b.frag) nf++; if (b.burn > 0) nb++;
          if (!fin(b.hp) || b.hp <= 0 || b.hp > b.hm + 1e-6) flag('block-hp-range', tag, `hp=${b.hp} hm=${b.hm} mat${b.mat}`);
          const p = b.body.getPosition(), v = b.body.getLinearVelocity();
          if (!fin(p.x) || !fin(p.y) || !fin(v.x) || !fin(v.y) || !fin(b.body.getAngle())) { flag('block-nan', tag); continue; }
          if (Math.hypot(v.x, v.y) > 125) flag('block-speed>125', tag, Math.hypot(v.x, v.y).toFixed(0));
          // 鑽到地面底下（穿過地形）
          const gy = groundY(p.x); if (gy > -100 && p.x > -70 && p.x < G.VIEW_W + 70 && p.y < gy - Math.max(b.w, b.h) * 0.75 - 1) flag('block-under-terrain', tag, `mat${b.mat} ${b.kind} (${p.x.toFixed(1)},${p.y.toFixed(1)}) ground=${gy.toFixed(1)}`);
          if (!b.st.blocks.includes(b)) flag('live-block-missing-from-st.blocks', tag);
          if (b.kind === 'ball' && !S.balls.includes(b)) flag('live-ball-missing-from-S.balls', tag);
        }
        if (nf !== S.nfrag) flag('nfrag-drift', tag, `${nf} vs ${S.nfrag}`);
        if (nb !== S.nburn) flag('nburn-drift', tag, `${nb} vs ${S.nburn}`);
        for (const st of S.structs) { for (const b of st.blocks) if (!b.dead && !seenBlocks.has(b)) flag('st.block-not-in-S.blocks', tag); if (!st.loose) { if (!fin(st.hpNow) || st.hpNow < -1e-6 || st.hpNow > st.hp0 * (1 + 1e-9)) flag('struct-hp-range', tag, `${st.hpNow} / ${st.hp0}`); } }
        let ulive = 0;
        for (let s = 0; s < 2; s++) {
          let a = 0;
          for (const u of S.team[s].units) {
            if (u.alive) {
              a++; ulive++;
              if (!u.body) { flag('alive-unit-no-body', tag); continue; }
              if (!fin(u.hp) || u.hp <= 0 || u.hp > u.hpMax + 1e-6) flag('unit-hp-range', tag, `${u.type} hp=${u.hp}/${u.hpMax}`);
              const p = u.body.getPosition(); if (!fin(p.x) || !fin(p.y)) { flag('unit-nan', tag); continue; }
              const gy = groundY(p.x); if (gy > -100 && p.y - u.bh / 2 < gy - 1.2) flag('unit-under-terrain', tag, `${u.type} side${s} y=${(p.y - u.bh / 2).toFixed(1)} ground=${gy.toFixed(1)} x=${p.x.toFixed(1)}`);
              if (u.frozen < 0 || u.stun < 0 || u.frozen > 1 || u.stun > 1) flag('frozen-stun-range', tag, `${u.frozen} ${u.stun}`);
            } else { if (u.body) flag('dead-unit-has-body', tag); if (u.hp !== 0) flag('dead-unit-hp-nonzero', tag, '' + u.hp); }
          }
          if (a !== S.team[s].alive) flag('alive-count-drift', tag, `side${s} ${a} vs ${S.team[s].alive}`);
        }
        let bodies = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) bodies++;
        if (bodies !== live + ulive + 1) flag('body-count-mismatch', tag, `${bodies} vs ${live + ulive + 1}`);
        let c = [0, 0, 0]; for (let i = 0; i < SH.n; i++) { c[SH.side[i]]++; if (!fin(SH.x[i]) || !fin(SH.y[i]) || !fin(SH.vx[i]) || !fin(SH.vy[i])) flag('shot-nan', tag); if (!(SH.mass[i] > 0) || !fin(SH.mass[i])) flag('shot-mass-range', tag, '' + SH.mass[i]); if (SH.mass[i] > 60) flag('shot-mass>60', tag, SH.mass[i].toFixed(1)); }
        if (c[0] !== SH.cnt[0] || c[1] !== SH.cnt[1] || c[2] !== SH.cnt[2]) flag('shot-count-drift', tag);
        const b0 = teamBar(0), b1 = teamBar(1); if (!(b0 >= 0 && b0 <= 1 && b1 >= 0 && b1 <= 1)) flag('teamBar-range', tag, `${b0} ${b1}`);
        // 倍增符
        let bits = 0; for (const g of S.gates) { if (g.dead) flag('dead-gate-in-list', tag); if (bits & g.bit) flag('gate-bit-collision', tag); bits |= g.bit; if (!fin(g.hp) || !fin(g.x) || !fin(g.y)) flag('gate-nan', tag); if (S.bitUse[g.b] !== 1e17) flag('gate-bitUse-not-held', tag); if (g.sp.g !== g) flag('gate-spawner-link', tag); }
        for (const sp of S.gsp) if (sp.g && (sp.g.dead || !S.gates.includes(sp.g))) flag('spawner-holds-dead-gate', tag);
        // 機關
        let nBar = 0, nOrb = 0, nBal = [0, 0], nLan = 0;
        for (const o of S.objs) { if (o.t === 'barrier') nBar++; else if (o.t === 'orb') nOrb++; else if (o.t === 'balloon') nBal[o.side]++; else if (o.t === 'lantern') nLan++; if (o.x !== undefined && !fin(o.x)) flag('obj-nan', tag, o.t); if (o.y !== undefined && !fin(o.y)) flag('obj-nan', tag, o.t); if (o.hp !== undefined && !fin(o.hp)) flag('obj-hp-nan', tag, o.t); }
        if (nBar > 1 || nOrb > 1 || nBal[0] > 1 || nBal[1] > 1 || nLan > 1) flag('too-many-objs', tag, `bar${nBar} orb${nOrb} bal${nBal} lan${nLan}`);
        if (S.state === 'play' && Math.abs(vol[0] - vol[1]) > 1) flag('volley-count-imbalance', tag, vol.join('/'));
        if (S.team[0].volleys !== vol[0] || S.team[1].volleys !== vol[1]) flag('T.volleys-mismatch', tag);
        // 補進來的兵：三秒內又倒下去
        for (let i = revives.length - 1; i >= 0; i--) { const r = revives[i]; if (!r.u) { revives.splice(i, 1); continue; } if (!r.u.alive) { flag('revived-unit-died-within-3s', tag, `side${r.side} ${r.u.type} after ${(S.time - r.t).toFixed(1)}s (round ${S.round}, spawned y=${r.y.toFixed(1)}, home y=${r.u.hy.toFixed(1)})`); revives.splice(i, 1); } else if (S.time - r.t > 3) revives.splice(i, 1); }
      }
    }
  } catch (e) { flag('EXCEPTION', tag, e.stack.split('\n').slice(0, 4).join(' | ')); }
  if (S.state === 'play') { stats.undecided++; flag('undecided-after-' + MAXR + '-rounds', tag, `me ${S.team[0].alive} foe ${S.team[1].alive} bars ${(teamBar(0) * 100).toFixed(0)}/${(teamBar(1) * 100).toFixed(0)}`); } else if (S.state === 'won') stats.won++; else stats.lost++;
  if (maxConsecTimeout >= 3) flag('3+consecutive-9s-timeouts', tag, 'max ' + maxConsecTimeout);
  stats.steps += steps; stats.simSec += S.time; stats.rounds += S.round;
  S.on = null;
}

const t0 = Date.now();
for (const li of lvs) for (const bot of bots) for (const diff of diffs) for (const upL of ups) for (let sd = 0; sd < NSEED; sd++) {
  const seed = 700001 + (SEED0 + sd) * 104729 + li * 977 + diff * 31 + upL * 7 + bot.length;
  runGame(li, bot, seed, diff, upL);
}
const out = { stats, wallSec: (Date.now() - t0) / 1000, issues: {} };
for (const k of Object.keys(issues).sort()) out.issues[k] = { n: issues[k].n, games: issues[k].games.size, ex: issues[k].ex };
if (process.env.JSON_OUT) console.log(JSON.stringify(out));
else {
  console.log(`games=${stats.games} won=${stats.won} lost=${stats.lost} undecided=${stats.undecided} rounds=${stats.rounds} simSec=${stats.simSec.toFixed(0)} wall=${out.wallSec.toFixed(0)}s`);
  console.log(`resolve: quiet ${stats.resolveQuiet}, 9s-timeout ${stats.resolveTimeout};  hazard: quiet ${stats.hazardQuiet}, 9s-timeout ${stats.hazardTimeout};  longest AI aim ${stats.maxAimAI.toFixed(2)}s`);
  console.log('timeout causes:', JSON.stringify(stats.timeoutWhy));
  for (const k of Object.keys(out.issues)) { const o = out.issues[k]; console.log(`\n[${o.n}x in ${o.games} games] ${k}`); for (const e of o.ex) console.log('    ' + e); }
}
