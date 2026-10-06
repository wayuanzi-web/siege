/* ===== 85-main: 啟動、版面（直拿時轉向）、主迴圈、操作、關卡流程 ===== */
const G = {
  mode: 'home', demo: true, acc: 0, last: 0, endT: 0, drag: null, moved: 0, keys: {}, dprCap: 2, rot: 0, sw: 1, sh: 1, ox: 0, oy: 0,
  ft: 16, slowFrames: 0, started: false, run: 0, demoIdx: 0, demoWait: 0, tut: 0, said: {}, freeze: false
};

/* ---------- 版面 ---------- */
function safeInset(side) {
  // 讀 env(safe-area-inset-*)：借一個看不見的元素量出來
  let p = G._probe; if (!p) { p = G._probe = document.createElement('div'); p.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)'; document.body.appendChild(p); }
  const cs = getComputedStyle(p); return parseFloat(side === 'l' ? cs.paddingLeft : cs.paddingRight) || 0;
}
function layout() {
  const app = $('app'), stage = $('stage'), w = app.clientWidth, h = app.clientHeight;
  if (!w || !h) return;
  const touch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0 || G.forceTouch;
  // 手機直拿：整個舞台轉 90 度，等於請玩家把手機橫過來（不必解除螢幕方向鎖定）
  const rot = touch && h > w * 1.08 ? (SV.flip ? -1 : 1) : 0;
  let sw = rot ? h : w, sh = rot ? w : h;
  if (sw / sh < 1.42) sh = Math.round(sw / 1.6);          // 視窗太高（電腦上的直式視窗）：上下留黑邊
  if (sw / sh > 2.5) sw = Math.round(sh * 2.5);            // 太扁：左右留黑邊
  const fw = rot ? h : w, fh = rot ? w : h, ox = Math.round((fw - sw) / 2), oy = Math.round((fh - sh) / 2);
  stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
  stage.style.transform = rot === 1 ? 'translate(' + (w - oy) + 'px,' + ox + 'px) rotate(90deg)' : rot === -1 ? 'translate(' + oy + 'px,' + (h - ox) + 'px) rotate(-90deg)' : 'translate(' + ox + 'px,' + oy + 'px)';
  const padL = rot || ox > 0 ? 0 : safeInset('l'), padR = rot || ox > 0 ? 0 : safeInset('r');
  const u = clamp(sh / 100, 2.9, 6.4);
  stage.style.setProperty('--u', u.toFixed(3) + 'px'); stage.style.setProperty('--pl', padL + 'px'); stage.style.setProperty('--pr', padR + 'px');
  $('btnFlip').hidden = !rot;
  const changedRot = rot !== G.rot; G.rot = rot; G.sw = sw; G.sh = sh; G.ox = ox; G.oy = oy; G.vw = w; G.vh = h;
  if (rot && (changedRot || !G.turned)) { G.turned = true; const t = $('turn'); t.hidden = false; replay(t, 'x'); clearTimeout(G._turnT); G._turnT = setTimeout(() => { t.hidden = true; }, 3400); } else if (!rot) $('turn').hidden = true;
  const dpr = Math.min(window.devicePixelRatio || 1, G.dprCap);
  let W = Math.round(sw * dpr), H = Math.round(sh * dpr);
  if (W > 1840) { H = Math.round(H * 1840 / W); W = 1840; }
  const cv = $('cv');
  if (W !== V.W || H !== V.H || padL !== G.padL || padR !== G.padR) {
    G.padL = padL; G.padR = padR;
    cv.width = W; cv.height = H; setView(W, H, W / sw, padL * W / sw, padR * W / sw); artReset(); RD.flame = null;
    if (S.lv) sceneBuild(true);
  }
}
// 視窗座標的位移 → 舞台座標的位移（舞台可能轉了 90 度）
function stageDelta(dx, dy) { return G.rot === 1 ? [dy, -dx] : G.rot === -1 ? [-dy, dx] : [dx, dy]; }
function stagePoint(x, y) {
  const r = $('app').getBoundingClientRect(); x -= r.left; y -= r.top;
  if (G.rot === 1) return [y - G.ox, (G.vw - G.oy) - x];
  if (G.rot === -1) return [(G.vh - G.ox) - y, x - G.oy];
  return [x - G.ox, y - G.oy];
}

/* ---------- 關卡流程 ---------- */
function demoStart(idx) {
  G.demo = true; G.demoIdx = idx; G.demoWait = 0;
  simInit(idx, { dmg: 2, rate: 2, hp: 2, shield: 2, ult: 2 }, (Math.random() * 1e9) | 0, 1, { botA: BOTS.casual });
  fxReset(); sceneBuild(true); S.on = fxOn; RD.showAim = false;
}
function startLevel(idx) {
  auInit();
  G.demo = false; G.mode = 'play'; G.endT = 0; G.acc = 0; G.moved = 0; G.said = {}; G.tut = idx === 0 && !SV.seen ? 1 : 0;
  const run = ++G.run;
  simInit(idx, SV.up, (Math.random() * 1e9) | 0, SV.diff); fxReset(); sceneBuild(true); S.on = fxOn;
  RD.showAim = true; RD.aimT = SV.diff === 0 ? 1.5 : SV.diff === 2 ? 0.85 : 1.1;
  $('home').hidden = true; $('result').hidden = true; $('opt').hidden = true; $('shop').hidden = true; $('hud').hidden = false;
  $('hudName').textContent = LEVELS[idx].name;
  $('hint').hidden = !G.tut;
  $('banner').className = ''; $('say').className = 'chamfer'; $('mile').className = '';
  hudBuild(); hudUpdate();
  setTimeout(() => { if (G.mode === 'play' && G.run === run) banner(LEVELS[idx].name, 'blue', '第' + NUM_ZH[idx] + '關'); }, 60);
  setTimeout(() => { if (G.mode === 'play' && G.run === run && S.time < 8 && !G.tut) say(LEVELS[idx].tip); }, 2100);
  musStart(LEVELS[idx].theme);
}
function goHome() {
  G.run++;
  G.mode = 'home'; $('hud').hidden = true; $('result').hidden = true; $('opt').hidden = true; $('shop').hidden = true; $('home').hidden = false;
  homeRender(); demoStart(UI.sel); musStart(6);
}
function pauseGame() { if (G.mode !== 'play' || S.state !== 'play') return; G.mode = 'pause'; G.drag = null; G.keys = {}; openOpt(true); }
function resumeGame() { if (G.mode !== 'pause') return; G.mode = 'play'; $('opt').hidden = true; G.last = performance.now(); }
function finishLevel() {
  const won = S.state === 'won', idx = S.idx, bar = teamBar(0);
  const stars = !won ? 0 : bar >= 0.6 ? 3 : bar >= 0.3 ? 2 : 1;
  let coins = won ? 50 + 25 * idx + Math.round(bar * 30) + Math.max(0, stars - SV.stars[idx]) * 20 : 10 + Math.round((1 - teamBar(1)) * 25);
  if (SV.diff === 2) coins = Math.round(coins * 1.25);
  if (won) { SV.stars[idx] = Math.max(SV.stars[idx], stars); SV.open = Math.max(SV.open, Math.min(LEVELS.length, idx + 2)); }
  SV.coins += coins; SV.seen = true; save();
  G.mode = 'result'; musStop(); sfx(won ? 'win' : 'lose');
  showResult(won, { idx, stars, bar, time: S.time - S.endT, peak: S.stat.peak, swarm: S.stat.swarm, coins });
}
// 模擬事件裡跟介面有關的：橫幅、提示
function uiEvent(t, a, b, c, d, e) {
  if (G.demo || G.mode === 'home') return;
  const once = (k, txt, alert) => { if (G.said[k]) return; G.said[k] = 1; say(txt, alert); };
  switch (t) {
    case 'say': say(a, b); break;
    case 'wind': once('wind', '風向變了，看上方的箭頭；虛線已經把風算進去'); break;
    case 'phase': if (a === 2) { banner('魔王結界', 'boss', '第二階段'); setTimeout(() => { if (G.mode === 'play') say('結界有缺口在轉，對準缺口打！毀滅光球要打掉', 1); }, 1900); } else { banner('魔王暴怒', 'boss', '最終階段'); setTimeout(() => { if (G.mode === 'play') say('黃金符出現了：穿過去，一發變八發！'); }, 1900); } break;
    case 'sudden': banner('決戰時刻', 'red'); setTimeout(() => { if (G.mode === 'play') say('雙方的砲火越來越猛，速戰速決', 1); }, 1900); break;
    case 'end': banner(c === 1 ? (S.lv.boss ? '魔王伏誅' : '敵城攻破') : '城樓失守', c === 1 ? 'gold' : 'red', d ? (c === 1 ? '守軍全滅' : '我軍全滅') : ''); break;
    case 'gate': if (e === 0 && G.tut === 2) { G.tut = 3; say('就是這樣！穿過倍增符，一發變兩發'); } break;
    case 'gspawn': if (c === 1) once('rg', '敵軍的赤符：會擋住你的砲彈，也讓他們的砲彈變多。打掉它！', 1); else if (c === 2) once('gg', '黃金符：兩邊都能用，而且很快就消失'); else if (c === 3) once('hz', '紫色的折損符會吃掉一半砲彈，別穿過去'); break;
    case 'launch': if (c === 1) once('bal', '轟炸氣球升空了！在它飄到你頭上之前打下來', 1); break;
    case 'orb': once('orb', '毀滅光球！打掉它，或是等它靠近時開護城罩', 1); break;
    case 'lantern': once('lan', '天燈升起來了：打中它有補給'); break;
    case 'rockwarn': once('rock', '落石！紅圈是落點，來得及就開護城罩', 1); break;
    case 'erupt': once('gey', '地火噴發：砲彈穿過火柱會著火，威力更大'); break;
    case 'udie': if (c === 0) once('lost', '有兵陣亡了，火力變少：用護城罩撐住，天燈有機會救回來', 1); break;
  }
}

/* ---------- 主迴圈 ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  let rdt = (now - G.last) / 1000; G.last = now;
  if (!(rdt > 0)) rdt = STEP; if (rdt > 0.1) rdt = 0.1;
  // 太慢就降特效、再不行降解析度
  G.ft += (rdt * 1000 - G.ft) * 0.05;
  if (G.ft > 38 && G.started) { if (++G.slowFrames > 150) { G.slowFrames = 0; if (!FX.low) FX.low = true; else if (G.dprCap > 1) { G.dprCap = Math.max(1, G.dprCap - 0.5); layout(); } } } else G.slowFrames = 0;
  AU.quiet = G.demo;
  const run = (G.mode === 'play' || (G.demo && G.mode !== 'pause')) && !G.freeze;
  let sdt = 0;
  if (run) {
    if (G.mode === 'play' && S.state === 'play') keyAim(rdt);
    let ts = FX.slow; if (FX.stop > 0) { FX.stop -= rdt; ts = 0; }
    G.acc += rdt * ts; let n = 0;
    while (G.acc >= STEP && n < 4) { simStep(STEP); G.acc -= STEP; n++; sdt += STEP; }
    if (n === 4) G.acc = 0;
    fxStep(rdt * ts, rdt);
    if (G.mode === 'play') {
      hudUpdate(); tutorStep();
      if (S.state !== 'play') { G.endT += rdt; if (G.endT > (S.state === 'won' ? 3.6 : 3.0)) finishLevel(); }
    } else if (G.demo && S.state !== 'play') { G.demoWait += rdt; if (G.demoWait > 4) demoStart(G.demoIdx); }
  }
  renderFrame(sdt, run ? rdt : 0);
  const heat = S.state === 'play' && G.mode === 'play' ? Math.min(1, FX.heat + (S.boss ? 0.2 * S.boss.phase : 0) + (1 - teamBar(1)) * 0.3) : 0;
  musStep(heat);
}
function tutorStep() {
  if (!G.tut) return;
  if (G.tut === 1 && G.moved > 110) { G.tut = 2; $('hint').hidden = true; say('很好！讓虛線穿過藍色的「×2」倍增符，再落到敵城上'); }
  if (G.tut === 1 && S.time > 16) $('hint').hidden = true;
  const T = S.team[0];
  if (!SV.seenUlt && T.ult.c >= T.ult.need && !G.said.ult) { G.said.ult = 1; say('「連珠」集滿了！按右下角金色按鈕，五秒內三倍射速'); }
  if (!SV.seenSh && !G.said.sh && S.time > 12 && SH.cnt[1] >= 3) { G.said.sh = 1; say('紅色砲彈飛過來時按「護罩」，整波都擋得住'); }
}
function keyAim(dt) {
  const k = G.keys; let da = 0, dp = 0;
  if (k.ArrowUp || k.KeyW) da += 1; if (k.ArrowDown || k.KeyS) da -= 1; if (k.ArrowRight || k.KeyD) dp += 1; if (k.ArrowLeft || k.KeyA) dp -= 1;
  if (!da && !dp) return;
  const T = S.team[0]; let a = Math.atan2(T.aim[1], T.aim[0]) + da * 0.75 * dt, v = Math.hypot(T.aim[0], T.aim[1]) + dp * 34 * dt;
  simAim(0, Math.cos(a) * v, Math.sin(a) * v); G.moved += 3;
}
function aimOrigin() { const T = S.team[0]; let x = 0, y = 0, n = 0; for (const u of T.units) if (u.alive) { x += u.x; y += u.y + 2.3; n++; } return n ? [x / n + 1.3, y / n] : [S.st[0].cx, S.st[0].y0 + S.st[0].h * 0.6]; }
function useSkill(name) {
  if (G.mode !== 'play') return;
  if (simSkill(0, name)) { if (name === 'ult' && !SV.seenUlt) { SV.seenUlt = true; save(); } if (name === 'shield' && !SV.seenSh) { SV.seenSh = true; save(); } }
  else sfx('deny');
}

function bindInput() {
  const stage = $('stage');
  stage.addEventListener('pointerdown', (e) => {
    auInit(); if (!G.started) { G.started = true; if (G.mode === 'home') musStart(6); }
    if (G.mode !== 'play' || e.target.closest('button')) return;
    if (G.drag && G.drag.id !== e.pointerId && e.pointerType !== 'mouse' && performance.now() - G.drag.at < 2000) return;   // 第二根手指不搶控制權
    G.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), mouse: e.pointerType === 'mouse' };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 沒有指標捕捉也能玩 */ }
    if (G.drag.mouse) mouseAim(e);
    e.preventDefault();
  });
  // 滑鼠：按住時砲口直接指向游標；觸控：相對拖曳，手指不必蓋住城樓
  const mouseAim = (e) => { const p = stagePoint(e.clientX, e.clientY), k = V.W / G.sw, o = aimOrigin(); simAim(0, (WX(p[0] * k) - o[0]) * 1.12, (WY(p[1] * k) - o[1]) * 1.12 + 14); G.moved += 6; };
  stage.addEventListener('pointermove', (e) => {
    if (G.mode !== 'play' || S.state !== 'play' || !G.drag || G.drag.id !== e.pointerId) return;
    if (G.drag.mouse) { mouseAim(e); return; }
    const d = stageDelta(e.clientX - G.drag.x, e.clientY - G.drag.y); G.drag.x = e.clientX; G.drag.y = e.clientY; G.drag.at = performance.now();
    const k = (V.dpr / V.s) * 1.5, T = S.team[0];
    simAim(0, T.aim[0] + d[0] * k, T.aim[1] - d[1] * k); G.moved += Math.abs(d[0]) + Math.abs(d[1]);
  });
  const up = (e) => { if (G.drag && G.drag.id === e.pointerId) G.drag = null; };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up); stage.addEventListener('lostpointercapture', up);
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (!e.target.closest || !e.target.closest('.modal')) e.preventDefault(); }, { passive: false });
  window.addEventListener('keydown', (e) => {
    G.keys[e.code] = true;
    if (/^Arrow/.test(e.code) || e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    const pk = e.code === 'KeyP' || e.code === 'Escape';
    if (G.mode === 'play') { if (e.code === 'Space' || e.code === 'KeyX') useSkill('ult'); else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyZ') useSkill('shield'); else if (pk) pauseGame(); }
    else if (G.mode === 'pause' && pk) resumeGame();
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.mode === 'play' && S.state === 'play') pauseGame(); if (AU.ctx) AU.ctx.suspend(); } else if (AU.ctx) AU.ctx.resume(); });
  window.addEventListener('resize', layout); window.addEventListener('orientationchange', () => setTimeout(layout, 120));
  if (window.ResizeObserver) new ResizeObserver(layout).observe($('app'));

  const click = (id, fn) => $(id).addEventListener('click', (e) => { auInit(); fn(e); });
  click('btnUlt', () => useSkill('ult'));
  click('btnShield', () => useSkill('shield'));
  click('btnPause', () => { sfx('click'); pauseGame(); });
  click('btnGo', () => { sfx('click'); startLevel(UI.sel); });
  click('btnShop', () => { sfx('click'); shopRender(); $('shop').hidden = false; });
  click('btnOpt', () => { sfx('click'); openOpt(false); });
  click('btnResume', () => { sfx('click'); resumeGame(); });
  click('btnRetry', () => { sfx('click'); startLevel(S.idx); });
  click('btnQuit', () => { sfx('click'); goHome(); });
  click('btnNext', () => { sfx('click'); UI.sel = Math.min(LEVELS.length - 1, S.idx + 1); startLevel(UI.sel); });
  click('btnAgain', () => { sfx('click'); startLevel(S.idx); });
  click('btnUp', () => { sfx('click'); shopRender(); $('shop').hidden = false; });
  click('btnHome', () => { sfx('click'); UI.sel = Math.min(S.state === 'won' ? S.idx + 1 : S.idx, SV.open - 1, LEVELS.length - 1); goHome(); });
  click('tSfx', () => { SV.sfx = !SV.sfx; toggleSync(); save(); sfx('click'); });
  click('tMus', () => { SV.mus = !SV.mus; toggleSync(); save(); sfx('click'); });
  click('tVib', () => { SV.vib = !SV.vib; toggleSync(); save(); vibrate(30); sfx('click'); });
  click('btnFlip', () => { SV.flip = !SV.flip; save(); sfx('click'); layout(); });
  document.querySelectorAll('#diffSeg button').forEach((b) => b.addEventListener('click', () => { auInit(); SV.diff = +b.dataset.d; toggleSync(); save(); sfx('click'); }));
  click('btnUnlock', () => { SV.open = LEVELS.length; save(); sfx('buy'); homeRender(); $('opt').hidden = true; });
  click('btnWipe', () => {
    if (!UI.wipeArm) { UI.wipeArm = 1; $('btnWipe').textContent = '再按一次，確定清除'; sfx('deny'); return; }
    SV.coins = 0; SV.open = 1; SV.seen = false; SV.seenUlt = false; SV.seenSh = false; SV.stars = LEVELS.map(() => 0); for (const k in SV.up) SV.up[k] = 0;
    save(); UI.sel = 0; homeRender(); demoStart(0); $('opt').hidden = true; sfx('click');
  });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { sfx('click'); b.closest('.modal').hidden = true; if (G.mode === 'home') homeRender(); }));
}

function boot() {
  loadSave(); toggleSync();
  UI.sel = clamp(SV.open - 1, 0, LEVELS.length - 1);
  renderInit($('cv'));
  bindInput(); homeRender();
  simInit(UI.sel, {}, 1, 1, { botA: BOTS.casual });      // 先有一局，layout 才知道要畫哪個場景
  layout(); demoStart(UI.sel);
  G.last = performance.now(); requestAnimationFrame(frame);
  // 字型晚一點才載到的話重新排一次
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); }).catch(() => { });
}
window.__qp = { S, SH, FX, G, V, SV, AU, RD, UI, LEVELS, BOTS, simInit, simStep, simAim, simSkill, aiInit, teamBar, startLevel, goHome, layout, renderFrame, fxStep, hudUpdate, sfx, musStart,
  // 測試用：凍結即時迴圈後，手動把戰局往前推 sec 秒
  advance(sec) { const n = Math.round(sec / STEP); for (let i = 0; i < n; i++) { simStep(STEP); fxStep(STEP, STEP); if (G.mode === 'play' && S.state !== 'play') G.endT += STEP; } if (G.mode === 'play') hudUpdate(); renderFrame(STEP, STEP); }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
