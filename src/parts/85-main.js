/* ===== 85-main: 啟動、版面（直拿時轉向）、主迴圈、操作、關卡流程 ===== */
const G = {
  mode: 'home', demo: true, acc: 0, last: 0, endT: 0, drag: null, keys: {}, dprCap: 2, rot: 0, sw: 1, sh: 1, ox: 0, oy: 0,
  ft: 16, slowFrames: 0, started: false, run: 0, demoIdx: 0, demoWait: 0, tut: 0, said: {}, freeze: false, fired: 0
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
  // 主要的指標是手指才算手機／平板（有觸控螢幕的筆電還是用滑鼠為主，視窗比較高也不該轉向）
  const touch = G.forceTouch || (window.matchMedia ? matchMedia('(pointer: coarse)').matches : navigator.maxTouchPoints > 0);
  // 手機直拿：整個舞台轉 90 度，等於請玩家把手機橫過來（不必解除螢幕方向鎖定）
  const rot = touch && h > w * 1.08 ? (SV.flip ? -1 : 1) : 0;
  let sw = rot ? h : w, sh = rot ? w : h;
  if (sw / sh < 1.42) sh = Math.round(sw / 1.6);          // 視窗太高（電腦上的直式視窗）：上下留黑邊
  if (sw / sh > 2.5) sw = Math.round(sh * 2.5);            // 太扁：左右留黑邊
  const fw = rot ? h : w, fh = rot ? w : h, ox = Math.round((fw - sw) / 2), oy = Math.round((fh - sh) / 2);
  stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
  stage.style.transform = rot === 1 ? 'translate(' + (w - oy) + 'px,' + ox + 'px) rotate(90deg)' : rot === -1 ? 'translate(' + oy + 'px,' + (h - ox) + 'px) rotate(-90deg)' : 'translate(' + ox + 'px,' + oy + 'px)';
  const padL = rot || ox > 0 ? 0 : safeInset('l'), padR = rot || ox > 0 ? 0 : safeInset('r');
  const u = clamp(Math.min(sh / 100, sw / 185), 2.9, 6.4);       // 介面的單位：看高度，但太窄（接近 4:3）的時候也要縮，上面那一列才排得下
  stage.style.setProperty('--u', u.toFixed(3) + 'px'); stage.style.setProperty('--w', (sw / 100).toFixed(3) + 'px'); stage.style.setProperty('--pl', padL + 'px'); stage.style.setProperty('--pr', padR + 'px');
  $('btnFlip').hidden = !rot; stage.classList.toggle('rot', !!rot); $('turn').style.setProperty('--tilt', rot === -1 ? '90deg' : '-90deg');
  const changedRot = rot !== G.rot; G.rot = rot; G.sw = sw; G.sh = sh; G.ox = ox; G.oy = oy; G.vw = w; G.vh = h;
  if (rot && (changedRot || !G.turned)) { G.turned = true; const t = $('turn'); t.hidden = false; replay(t, 'x'); clearTimeout(G._turnT); G._turnT = setTimeout(() => { t.hidden = true; }, 3400); } else if (!rot) $('turn').hidden = true;
  const dpr = Math.min(window.devicePixelRatio || 1, G.dprCap);
  let W = Math.round(sw * dpr), H = Math.round(sh * dpr);
  if (W > 1840) { H = Math.round(H * 1840 / W); W = 1840; }
  const cv = $('cv');
  const hud = Math.round(8 * u * W / sw);                          // 上方資訊列佔掉的高度：戰場排在它下面
  if (W !== V.W || H !== V.H || padL !== G.padL || padR !== G.padR || hud !== V.hud) {
    G.padL = padL; G.padR = padR;
    cv.width = W; cv.height = H; setView(W, H, W / sw, padL * W / sw, padR * W / sw, hud); artReset(); RD.flame = null;
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
  G.demo = true; G.demoIdx = idx; G.demoWait = 0; G.drag = null;
  simInit(idx, { dmg: 1, hp: 1, shield: 2, ult: 2 }, (Math.random() * 1e9) | 0, 1, { botA: BOTS.demo });
  fxReset(); sceneBuild(true); S.on = fxOn; RD.showAim = false; RD.trail = null; RD.sh[0] = RD.sh[1] = 0;
}
function startLevel(idx) {
  auInit();
  G.demo = false; G.mode = 'play'; G.endT = 0; G.acc = 0; G.fired = 0; G.drag = null; G.said = {}; G.hinted = {}; G.tapAt = -1e9; G.tut = idx === 0 && !SV.seen ? 1 : 0;
  const run = ++G.run;
  simInit(idx, SV.up, (Math.random() * 1e9) | 0, SV.diff); fxReset(); sceneBuild(true); S.on = fxOn;
  RD.showAim = true; RD.aimOn = false; RD.trail = null; RD.sh[0] = RD.sh[1] = 0;
  RD.aimT = [1.2, 0.95, 0.75][SV.diff] + 0.11 * (SV.up.aim || 0);
  $('home').hidden = true; $('result').hidden = true; $('opt').hidden = true; $('shop').hidden = true; $('hud').hidden = false;
  $('hudName').textContent = LEVELS[idx].name;
  $('hint').hidden = true;
  $('banner').className = ''; sayClear(); $('mile').className = '';
  hudBuild(); hudUpdate();
  setTimeout(() => { if (G.mode === 'play' && G.run === run) banner(LEVELS[idx].name, 'blue', '第' + NUM_ZH[idx] + '關'); }, 60);
  musStart(LEVELS[idx].theme);
}
function goHome() {
  G.run++;
  G.mode = 'home'; sayClear(); $('hud').hidden = true; $('result').hidden = true; $('opt').hidden = true; $('shop').hidden = true; $('home').hidden = false;
  homeRender(); demoStart(UI.sel); musStart(6);
}
function pauseGame() { if (G.mode !== 'play' || S.state !== 'play') return; G.mode = 'pause'; G.drag = null; G.keys = {}; sayHold(true); openOpt(true); }
function resumeGame() { if (G.mode !== 'pause') return; G.mode = 'play'; $('opt').hidden = true; G.last = performance.now(); sayHold(false); }
function finishLevel() {
  // 用分出勝負那一刻的城防（之後整座垮掉的演出不算）
  const won = S.state === 'won', idx = S.idx, bar = S.endBar[0], lost = S.stat.lost;
  const stars = !won ? 0 : bar >= 0.6 && !lost ? 3 : bar >= 0.3 ? 2 : 1;
  let coins = won ? 50 + 25 * idx + Math.round(bar * 30) + Math.max(0, stars - SV.stars[idx]) * 20 : 10 + Math.round((1 - S.endBar[1]) * 25);
  if (SV.diff === 2) coins = Math.round(coins * 1.25);
  if (won) { SV.stars[idx] = Math.max(SV.stars[idx], stars); SV.open = Math.max(SV.open, Math.min(LEVELS.length, idx + 2)); }
  SV.coins += coins; SV.seen = true; save();
  G.mode = 'result'; sayClear(); musStop(); sfx(won ? 'win' : 'lose');
  if (won || G.lossAt !== idx) G.lossN = 0;
  if (!won) { G.lossAt = idx; G.lossN = (G.lossN || 0) + 1; }         // 同一關連輸幾場
  showResult(won, { idx, stars, bar, lost, rounds: S.round, chain: S.stat.chain, swarm: S.stat.swarm, coins, streak: won ? 0 : G.lossN });
}
// 模擬事件裡跟介面有關的：橫幅、提示
function uiEvent(t, a, b, c, d, e) {
  if (G.demo || G.mode === 'home') return;
  const once = (k, txt, alert, ok) => { if (G.said[k]) return; G.said[k] = 1; say(txt, alert, k, ok); };
  // 過一會兒再講：只算真的在玩的時間（暫停的時候不走，免得話在暫停選單後面講完就沒了）
  const later = (ms, fn) => {
    const run = G.run; let left = ms, last = performance.now();
    const tick = () => { if (G.run !== run) return; const now = performance.now(); if (G.mode === 'play') left -= now - last; last = now; if (left > 0) { setTimeout(tick, Math.min(250, Math.max(20, left))); return; } if (G.mode === 'play' && S.state === 'play') fn(); };
    setTimeout(tick, Math.min(250, ms));
  };
  switch (t) {
    case 'say': say(a, b); break;
    case 'turn':
      // a 輪到誰；b 第幾回合
      if (a === 0) {
        // 第一次玩：一回合教一件事
        const T = S.team[0], myAim = () => S.turn === 0 && S.phase === 'aim';
        // 沒有一個兵開得了火（全被凍住、電暈）：護罩可以解凍；沒有護罩就自動跳過這一輪，不用玩家對著空氣拖一下。
        // 這句最要緊，馬上講（別的話先放掉），這一輪也不講別的訣竅
        if (!T.units.some((u) => u.alive && u.w && u.frozen <= 0 && u.stun <= 0)) {
          sayFlush();
          if (T.shield.c >= T.shield.need && !T.shield.on) say('兵都動不了：開護罩可以馬上解凍；不開就按「發射」跳過這一輪', 1);
          else { say('兵都動不了，這一輪只能跳過', 1); later(1900, () => { if (canFire() && !S.team[0].units.some((u) => u.alive && u.w && u.frozen <= 0 && u.stun <= 0)) fireNow(); }); }
          break;
        }
        // 第一次玩：一回合教一件事
        if (G.tut === 1) { $('hint').hidden = false; }
        else if (G.tut === 2) { G.tut = 3; if (!G.said.gt) say('這次讓虛線穿過藍色的倍增符：一發變三發', 0, '', myAim); }
        else if (G.tut === 3) { G.tut = 4; if (foeHome(1)) say('打斷望樓的細柱子，上面整座會自己倒下來', 0, '', () => myAim() && foeHome(1)); }
        else if (G.tut === 4) { G.tut = 5; if (!G.said.kill) say('把守軍全部打倒就破城；上面的頭像是雙方還站著的兵'); }
        // 這一關的訣竅：一回合最多講一句，而且要還用得上才講（該打的東西已經不在了就跳過）。第一次玩第一關的時候讓教學先講
        const hs = S.lv.hints;
        if (!G.tut && hs) for (let i = 0; i < hs.length; i++) { const h = hs[i]; if (G.hinted[i] || b < h.r || (h.ok && !h.ok())) continue; G.hinted[i] = 1; say(h.t, 0, 'hint' + i, h.ok ? () => S.state === 'play' && h.ok() : null); break; }
        if (!SV.seenUlt && T.ult.c >= T.ult.need && !T.ult.armed) once('ult', '「連珠」集滿了！按右下角金色按鈕上膛，這一輪每個兵連打三次', 0, () => { const U = S.team[0].ult; return U.c >= U.need && !U.armed; });
      } else {
        // 護罩的教學：敵軍瞄準只有一秒多，排隊就來不及了——插隊馬上講；輪不到（前面有別的警告）就下一回合再講
        const T = S.team[0], ready = () => S.turn === 1 && (S.phase === 'aim' || S.phase === 'volley') && T.shield.c >= T.shield.need && !T.shield.on;
        if (!SV.seenSh && b >= 2 && ready()) once('sh', '輪到敵軍了：按「護罩」可以擋下他們這一整輪', 1, ready);
      }
      break;
    case 'wind': once('wind', '起風了！每回合的風都不一樣，虛線已經把風算進去'); break;
    case 'ultarm': if (c === 1) { const T = S.team[0]; say(T.shield.c >= T.shield.need && !T.shield.on ? '敵軍連珠砲上膛了，這一輪打三次：快開護罩！' : '敵軍連珠砲上膛了，這一輪打三次！', 1); } break;
    case 'phase': if (a === 2) { banner('魔王結界', 'boss', '第二階段'); later(1900, () => say('魔王張開結界了！結界分三段，每回合換缺口：從沒有光牆的地方打進去', 1)); } else { banner('魔王暴怒', 'boss', '最終階段'); later(1900, () => say('魔王暴怒了：每回合多砸一顆隕石。下一回合會出現 ×20 的倍增符', 1)); } break;
    case 'bossback': once('bback', '魔王摔下去又飛回來了，不過摔一次扣不少血'); break;
    case 'rockstop': if (c === 0) once('rstop', '護罩把落石擋下來了'); break;
    case 'sudden': banner('決戰時刻', 'red'); later(1900, () => say('拖太久了，雙方的砲火越來越猛', 1)); break;
    case 'end': sayClear(); banner(c === 1 ? (S.lv.boss ? '魔王伏誅' : '敵城攻破') : '城樓失守', c === 1 ? 'gold' : 'red', d ? (c === 1 ? '守軍全滅' : '我軍全滅') : ''); $('hint').hidden = true; break;
    case 'gate': if (e === 0 && G.tut >= 1 && G.tut <= 3 && !G.said.gt) { G.said.gt = 1; say('就是這樣！穿過倍增符，砲彈變多了'); } break;
    case 'gspawn': {
      // d 幾倍。高倍數的符只出現一回合：出現的那一刻才講（太早講，玩家找不到它在哪）
      const there = () => S.gates.some((g) => !g.dead && g.owner === c && g.mult === d);
      if (c === 1) once('rg', '敵軍的赤符：會擋住你的砲彈，也讓他們的砲彈變多。可以打掉它', 1, there);
      else if (c === 2) once('gg', '黃金符：倍數很高，兩邊都能用，而且只出現一回合', 0, there);
      else if (c === 3) once('hz', '紫色的折損符會吃掉一半砲彈，別穿過去', 0, there);
      else if (c === 0 && d >= 10) say('×' + d + ' 的倍增符出現了！只出現這一回合：穿過去，一發變' + (d === 20 ? '二十' : d === 10 ? '十' : d) + '發', 1, 'big' + d, there);       // 只有這一回合：插隊先講
      break;
    }
    case 'launch': if (c === 1) once('bal', '轟炸氣球升空了！它先停在半路，下一輪才飛過來，趁現在打下來', 1, () => S.objs.some((o) => o.t === 'balloon' && o.side === 1 && o.hp > 0 && (o.st === 'out' || o.st === 'hover'))); break;
    case 'orb': once('orb', '毀滅光球！它先停在半空中，下一輪砸過來：現在打爆它，它會掉頭砸在魔王自己身上', 1, () => S.objs.some((o) => o.t === 'orb' && o.hp > 0 && (o.st === 'out' || o.st === 'hover'))); break;
    case 'orbback': once('orbb', '漂亮！光球打爆了會掉頭砸回魔王身上，連結界都擋不住'); break;
    case 'lantern': once('lan', '天燈升起來了：打中它有補給（敵軍也會搶），兩回合後就飄走', 0, () => S.objs.some((o) => o.t === 'lantern' && o.hp > 0)); break;
    // 魔王關的隕石跟 ×20 的符同一回合開始出現：讓符先講（它只出現一回合），紅圈晚幾秒再講
    case 'rockwarn': { const f = () => once('rock', '紅圈是這一回合結束時落石的位置，會砸到你就開護罩', 1, () => S.phase !== 'hazard'); if (S.lv.boss && !G.said.rock) later(3400, f); else f(); break; }
    case 'erupt': if (!G.said.gey) later(3200, () => once('gey', '地火噴發：砲彈穿過火柱會著火，威力多五成')); break;        // 晚一點講，先讓這一關的訣竅講完
    case 'freeze': if (c === 0) once('frz', '兵被凍住了，下一輪不能開火；開護罩可以立刻解凍', 1); break;
    case 'udie': if (c === 0) once('lost', '有兵陣亡了，火力變少：兵全倒就輸了，用護罩撐住', 1); else if (S.idx === 0 && S.team[1].alive > 0) once('kill', '打倒一個守軍！守軍全倒，城就破了'); break;
    case 'chain': if (b === 0 && a >= 10) once('chain', '漂亮的坍塌！一次垮得越多，「連珠」集得越快'); break;
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
      hudUpdate();
      if (S.state !== 'play') { G.endT += rdt; if (G.endT > (S.state === 'won' ? 4.9 : 4.3)) finishLevel(); }        // 城破：讓整座垮完再跳結算
    } else if (G.demo && S.state !== 'play') { G.demoWait += rdt; if (G.demoWait > 4.5) demoStart(G.demoIdx); }
  }
  RD.aimOn = !!G.drag;
  renderFrame(sdt, run ? rdt : 0);
  const heat = S.state === 'play' && G.mode === 'play' ? Math.min(1, FX.heat + (S.boss ? 0.2 * S.boss.phase : 0) + (1 - foeBar()) * 0.3) : 0;
  musStep(heat);
}
function canFire() { return G.mode === 'play' && S.state === 'play' && S.phase === 'aim' && S.turn === 0; }
function fireNow() {
  if (!canFire()) return false;
  const T = S.team[0];
  // 記下這一輪帶頭那一發會怎麼飛（下一輪瞄準時畫出來當參考）
  for (const u of T.units) {
    if (!u.alive || !u.w || u.frozen > 0 || u.stun > 0) continue;
    const mx = u.x + 1.3, my = u.y + 2.3, vx = T.aim[0], vy = T.aim[1], w = S.wind, R = simTrace(0, mx, my, vx, vy, w, S.time), tr = RD.trail || (RD.trail = { x: new Float32Array(90), y: new Float32Array(90), n: 0 });
    const box = S.st[0]; tr.n = 0;
    for (let tt = 0.1; tt < R.t && tr.n < 89; tt += 0.075) { const x = mx + vx * tt + 0.5 * w * tt * (tt + STEP), y = my + vy * tt - 0.5 * GRAV * tt * (tt + STEP); if (x > box.x0 - 1 && x < box.x1 + 1.2 && y < box.y1 + 2.5) continue; tr.x[tr.n] = x; tr.y[tr.n] = y; tr.n++; }
    tr.x[tr.n] = R.x; tr.y[tr.n] = R.y; tr.n++;
    break;
  }
  if (!simFire(0)) return false;
  G.fired++; $('hint').hidden = true;
  if (G.tut === 1) G.tut = 2;
  return true;
}
function keyAim(dt) {
  const k = G.keys; let da = 0, dp = 0;
  if (k.ArrowUp || k.KeyW) da += 1; if (k.ArrowDown || k.KeyS) da -= 1; if (k.ArrowRight || k.KeyD) dp += 1; if (k.ArrowLeft || k.KeyA) dp -= 1;
  if (!da && !dp) return;
  const T = S.team[0], fine = k.ShiftLeft || k.ShiftRight ? 0.3 : 1; let a = Math.atan2(T.aim[1], T.aim[0]) + da * 0.6 * fine * dt, v = Math.hypot(T.aim[0], T.aim[1]) + dp * 26 * fine * dt;
  simAim(0, Math.cos(a) * v, Math.sin(a) * v);
}
function useSkill(name) {
  if (G.mode !== 'play') return;
  if (simSkill(0, name)) { if (name === 'ult' && !SV.seenUlt) { SV.seenUlt = true; save(); } if (name === 'shield' && !SV.seenSh) { SV.seenSh = true; save(); } }
  else sfx('deny');
}

function bindInput() {
  const stage = $('stage');
  // 滑鼠和手指都一樣：按住畫面任何地方拖曳，照拖的方向和距離微調（不是指到哪打到哪），放開就發射。
  // 這樣每一輪都是從上一輪的角度接著調，吊高、平射都拉得到，手指也不必蓋住城樓
  stage.addEventListener('pointerdown', (e) => {
    auInit(); if (!G.started) { G.started = true; if (G.mode === 'home') musStart(6); }
    G.kbNav = false;
    // 分出勝負之後的垮城演出：看了一會兒再點畫面，就直接跳到結算
    if (G.mode === 'play' && S.state !== 'play' && G.endT > 1.6 && !e.target.closest('button')) { G.endT = 99; return; }
    if (G.mode !== 'play' || S.state !== 'play' || e.target.closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // 下面會取消這一下的預設動作，連「把鍵盤焦點移進這個頁框」也會被取消（遊戲嵌在別的頁面裡時，方向鍵、空白鍵會打到外面去）：自己拿回來
    try { window.focus(); } catch (err) { /* 拿不到焦點也能玩 */ }
    // 已經有一根手指在瞄準：其他手指不搶（同一支滑鼠、同一支筆不會同時按兩次，那是上一次沒收乾淨）
    const d0 = G.drag; if (d0 && !(d0.type !== 'touch' && d0.type === e.pointerType)) return;
    G.drag = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, far: 0, live: canFire() };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 沒有指標捕捉也能玩 */ }
    e.preventDefault();
  });
  stage.addEventListener('pointermove', (e) => {
    const d = G.drag;
    if (G.mode !== 'play' || S.state !== 'play' || !d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    // 還沒輪到我就先按住的（開場、敵軍砲擊中）：輪到我之後才開始算「有沒有拖過」
    if (!d.live && canFire()) { d.live = true; d.x0 = d.x; d.y0 = d.y; d.far = 0; }
    d.x = e.clientX; d.y = e.clientY; d.far = Math.max(d.far, Math.hypot(d.x - d.x0, d.y - d.y0));
    const m = stageDelta(dx, dy), k = (V.dpr / V.s) * 1.5, T = S.team[0];
    simAim(0, T.aim[0] + m[0] * k, T.aim[1] - m[1] * k);
  });
  const up = (e) => {
    const d = G.drag; if (!d || d.id !== e.pointerId) return;
    G.drag = null;
    if (e.type !== 'pointerup' || !canFire()) return;
    // 真的拖過才發射（看離起點最遠拖了多遠，手指按著不動的抖動不算）
    if (d.live && d.far > 14) fireNow();
    else if (d.far <= 14 && $('hint').hidden && performance.now() - G.tapAt > 15000) { G.tapAt = performance.now(); say('按住拖曳瞄準，放開就發射；也可以按左下角的「發射」'); }
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  // 萬一沒收到放開的事件（指標捕捉被搶走、系統手勢）：別讓瞄準卡住
  stage.addEventListener('lostpointercapture', (e) => {
    const d = G.drag; if (!d || d.id !== e.pointerId) return;
    // 左鍵還按著（中途按了一下右鍵或中鍵，瀏覽器會把捕捉收回去）：重新抓住，這次拖曳繼續算
    if (e.buttons & 1) { try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 抓不回來就算了 */ } return; }
    setTimeout(() => { if (G.drag === d) G.drag = null; }, 60);
  });
  const noTouch = (e) => { const d = G.drag; if (d && d.type === 'touch' && e.touches && e.touches.length === 0) setTimeout(() => { if (G.drag === d) G.drag = null; }, 80); };
  document.addEventListener('touchend', noTouch, { passive: true }); document.addEventListener('touchcancel', noTouch, { passive: true });
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (!e.target.closest || !e.target.closest('.modal')) e.preventDefault(); }, { passive: false });
  // 是不是正在用 Tab 鍵選按鈕（G.kbNav）：自己記，不靠 :focus-visible（瀏覽器在按下任何鍵的那一刻就會把有焦點的按鈕算成 focus-visible）
  document.addEventListener('pointerdown', () => { G.kbNav = false; }, true);
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;                 // 瀏覽器、系統自己的快速鍵（Ctrl+C、Alt+←…）不攔
    if (e.code === 'Tab') { G.kbNav = true; return; }
    const play = G.mode === 'play', ae = document.activeElement, onBtn = !!ae && ae.tagName === 'BUTTON', act = e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter';
    if (act && onBtn && G.kbNav) return;                            // 用 Tab 選到某顆按鈕再按 Enter／空白鍵：那是要按那顆按鈕
    G.keys[e.code] = true;
    if (play && (/^Arrow/.test(e.code) || act)) e.preventDefault();
    if (e.repeat) return;
    const pk = e.code === 'KeyP' || e.code === 'Escape';
    if (play) {
      if (act) { if (onBtn) ae.blur(); if (!fireNow()) sfx('deny'); }
      else if (e.code === 'KeyX' || e.code === 'KeyC') useSkill('ult');
      else if (e.code === 'KeyZ') useSkill('shield');
      else if (pk) pauseGame();
    } else if (G.mode === 'pause' && pk) resumeGame();
    else if (e.code === 'Escape') { for (const id of ['shop', 'opt']) if (!$(id).hidden) { $(id).hidden = true; sfx('click'); if (G.mode === 'home') homeRender(); break; } }
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; G.drag = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.mode === 'play' && S.state === 'play') pauseGame(); if (AU.ctx) AU.ctx.suspend(); } else if (AU.ctx) AU.ctx.resume(); });
  window.addEventListener('resize', layout); window.addEventListener('orientationchange', () => setTimeout(layout, 120));
  if (window.ResizeObserver) new ResizeObserver(layout).observe($('app'));

  const click = (id, fn) => onTap($(id), fn);
  const fresh = (e) => !!e && e.type === 'pointerup' && performance.now() - UI.resAt < 800;       // 結算視窗剛跳出來：手指或滑鼠的這一下多半是想跳過演出的連點，不算（鍵盤按的照算）
  // 戰鬥中的按鈕按下去就算（不等 click）：另一根手指正在瞄準的時候，瀏覽器不會替第二根手指合成 click。
  // 鍵盤（Tab 選到再按 Enter）還是走 click；按完把焦點還回去，免得之後按空白鍵又「按」到它
  const press = (id, fn) => {
    const el = $(id); if (!window.PointerEvent) { click(id, fn); return; }
    let at = -1e9, kb = -1e9;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); G.kbNav = false;        // 右鍵、中鍵也擋掉（不然按鈕會拿到焦點，之後按空白鍵變成在按它）
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { window.focus(); } catch (err) { /* 見舞台的 pointerdown */ }
      auInit(); at = performance.now(); fn(e); el.blur();
    });
    // 滑鼠、手指的那一下已經在 pointerdown 處理過；這裡只收鍵盤按的（沒有指標種類、detail 是 0），而且按住不放不會一直重複
    el.addEventListener('click', (e) => { const now = performance.now(); if (e.pointerType || e.detail > 0 || now - at < 700) { el.blur(); return; } if (now - kb < 350) { kb = now; return; } kb = now; auInit(); fn(e); });
  };
  press('btnFire', () => { if (!fireNow()) sfx('deny'); });
  press('btnUlt', () => useSkill('ult'));
  press('btnShield', () => useSkill('shield'));
  press('btnPause', () => { sfx('click'); pauseGame(); });
  click('btnGo', () => { sfx('click'); startLevel(UI.sel); });
  click('btnShop', () => { sfx('click'); shopRender(); $('shop').hidden = false; });
  click('btnOpt', () => { sfx('click'); openOpt(false); });
  click('btnResume', () => { sfx('click'); resumeGame(); });
  click('btnRetry', () => { sfx('click'); startLevel(S.idx); });
  click('btnQuit', () => { sfx('click'); goHome(); });
  click('btnNext', (e) => { if (fresh(e)) return; sfx('click'); UI.sel = Math.min(LEVELS.length - 1, S.idx + 1); startLevel(UI.sel); });
  click('btnAgain', (e) => { if (fresh(e)) return; sfx('click'); startLevel(S.idx); });
  click('btnUp', (e) => { if (fresh(e)) return; sfx('click'); shopRender(); $('shop').hidden = false; });
  click('btnHome', (e) => { if (fresh(e)) return; sfx('click'); UI.sel = Math.min(S.state === 'won' ? S.idx + 1 : S.idx, SV.open - 1, LEVELS.length - 1); goHome(); });
  click('tSfx', () => { SV.sfx = !SV.sfx; toggleSync(); save(); sfx('click'); });
  click('tMus', () => { SV.mus = !SV.mus; toggleSync(); save(); sfx('click'); });
  click('tVib', () => { SV.vib = !SV.vib; toggleSync(); save(); vibrate(30); sfx('click'); });
  click('btnFlip', () => { SV.flip = !SV.flip; save(); sfx('click'); layout(); });
  document.querySelectorAll('#diffSeg button').forEach((b) => onTap(b, () => { SV.diff = +b.dataset.d; toggleSync(); save(); sfx('click'); }));
  click('btnUnlock', () => { SV.open = LEVELS.length; save(); sfx('buy'); homeRender(); $('opt').hidden = true; });
  click('btnWipe', () => {
    if (!UI.wipeArm) { UI.wipeArm = 1; $('btnWipe').textContent = '再按一次，確定清除'; sfx('deny'); return; }
    SV.coins = 0; SV.open = 1; SV.seen = false; SV.seenUlt = false; SV.seenSh = false; SV.stars = LEVELS.map(() => 0); for (const k in SV.up) SV.up[k] = 0;
    save(); UI.sel = 0; homeRender(); demoStart(0); $('opt').hidden = true; sfx('click');
  });
  document.querySelectorAll('[data-close]').forEach((b) => onTap(b, () => { sfx('click'); b.closest('.modal').hidden = true; if (G.mode === 'home') homeRender(); }));
  // 有視窗開著的時候，後面的東西不收鍵盤焦點（Tab 不會跑到視窗後面的按鈕去）
  const layers = ['result', 'opt', 'shop'];       // 由下到上
  let prevTop = -1, opener = null;
  const scope = () => {
    let top = -1; layers.forEach((id, i) => { if (!$(id).hidden) top = i; });
    $('home').inert = top >= 0; $('hud').inert = top >= 0; layers.forEach((id, i) => { $(id).inert = i < top; });
    if (top === prevTop) return;
    // 用鍵盤操作的時候：視窗打開，焦點移進去；全部關掉，焦點回到原本那顆按鈕
    if (top >= 0) { if (prevTop < 0) opener = document.activeElement; if (G.kbNav) { const b = $(layers[top]).querySelector('button:not([hidden]):not([disabled])'); if (b) b.focus(); } }
    else { if (G.kbNav && opener && opener.isConnected && opener.offsetParent !== null) opener.focus(); opener = null; }
    prevTop = top;
  };
  if (window.MutationObserver) { const mo = new MutationObserver(scope); for (const id of layers) mo.observe($(id), { attributes: true, attributeFilter: ['hidden'] }); }
}

function boot() {
  loadSave(); toggleSync();
  // 系統設了「減少動態效果」：不晃畫面、閃光壓到很淡
  const rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  if (rm) { const f = () => { FX.calm = rm.matches; }; f(); if (rm.addEventListener) rm.addEventListener('change', f); else if (rm.addListener) rm.addListener(f); }
  $('keyHelp').hidden = !(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  UI.sel = clamp(SV.open - 1, 0, LEVELS.length - 1);
  renderInit($('cv'));
  bindInput(); homeRender();
  simInit(UI.sel, {}, 1, 1, { botA: BOTS.demo });      // 先有一局，layout 才知道要畫哪個場景
  layout(); demoStart(UI.sel);
  G.last = performance.now(); requestAnimationFrame(frame);
  // 字型晚一點才載到的話重新排一次
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); }).catch(() => { });
}
window.__qp = { S, SH, FX, G, V, SV, AU, RD, UI, PH, LEVELS, BOTS, simInit, simStep, simAim, simFire, simSkill, aiInit, teamBar, startLevel, goHome, layout, renderFrame, fxStep, hudUpdate, sfx, musStart, physExplode, blockKill, killUnit, WPN,
  // 測試用：凍結即時迴圈後，手動把戰局往前推 sec 秒
  advance(sec) { const n = Math.round(sec / STEP); let acc = 0; for (let i = 0; i < n; i++) { simStep(STEP); fxStep(STEP, STEP); acc += STEP; if (G.mode === 'play' && S.state !== 'play') G.endT += STEP; if (acc >= 0.05 && i < n - 1) { renderFrame(acc, acc); acc = 0; } } if (G.mode === 'play') hudUpdate(); renderFrame(acc || STEP, acc || STEP); }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
