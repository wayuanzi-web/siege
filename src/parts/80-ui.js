/* ===== 80-ui: 存檔、主畫面、強化、設定、結算、戰鬥中的資訊列 ===== */
const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'qianpao-pocheng-1';
const SV = { coins: 0, stars: LEVELS.map(() => 0), open: 1, up: { dmg: 0, aim: 0, hp: 0, shield: 0, ult: 0 }, sfx: true, mus: true, vib: true, seen: false, seenUlt: false, seenSh: false, diff: 1, flip: false };
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && typeof s === 'object') {
      // 存檔可能被改過或壞掉：每個數字都取整、夾在合理範圍裡
      const int = (v, lo, hi) => { v = Math.floor(+v); return v >= lo ? Math.min(v, hi) : lo; };
      SV.coins = int(s.coins, 0, 9999999); SV.open = int(s.open, 1, LEVELS.length);
      if (Array.isArray(s.stars)) for (let i = 0; i < LEVELS.length; i++) SV.stars[i] = int(s.stars[i], 0, 3);
      if (s.up && typeof s.up === 'object') { for (const k in SV.up) SV.up[k] = int(s.up[k], 0, 5); if (s.up.aim === undefined && s.up.rate) SV.up.aim = int(s.up.rate, 0, 5); }      // 舊版的「裝填」改成「準星」
      SV.sfx = s.sfx !== false; SV.mus = s.mus !== false; SV.vib = s.vib !== false; SV.seen = !!s.seen; SV.seenUlt = !!s.seenUlt; SV.seenSh = !!s.seenSh; SV.flip = !!s.flip;
      SV.diff = s.diff === 0 || s.diff === 2 ? s.diff : 1;
      let top = 0; for (let i = 0; i < LEVELS.length; i++) if (SV.stars[i] > 0) top = i + 1;
      SV.open = clamp(Math.max(SV.open, top + 1), 1, LEVELS.length);
    }
  } catch (e) { /* 讀不到存檔就當新玩家 */ }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SV)); } catch (e) { /* 存不了就只留在這次遊玩 */ } }

const UPS = [
  { k: 'dmg', name: '火力', desc: '每一發砲彈的威力 +8%' },
  { k: 'aim', name: '準星', desc: '瞄準的虛線畫得更遠' },
  { k: 'hp', name: '城防', desc: '城磚和兵的耐久 +9%' },
  { k: 'shield', name: '護罩', desc: '護城罩集氣更快，開場多帶一些' },
  { k: 'ult', name: '連珠', desc: '連珠砲集氣快 14%' }
];
const UP_COST = [80, 150, 240, 360, 520];
const NUM_ZH = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const UI = { sel: 0, wipeArm: 0, resRun: 0 };
function numZh(n) { return n <= 10 ? NUM_ZH[n - 1] : n < 20 ? '十' + NUM_ZH[n - 11] : n % 10 === 0 ? NUM_ZH[n / 10 - 1] + '十' : NUM_ZH[((n / 10) | 0) - 1] + '十' + NUM_ZH[n % 10 - 1]; }

function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function banner(txt, kind, small) {
  const el = $('banner'); el.className = kind || 'gold'; el.textContent = '';
  if (small) { const s = document.createElement('small'); s.textContent = small; el.appendChild(s); }
  el.appendChild(document.createTextNode(txt)); replay(el, 'show');
}
// 底部的提示一次只放得下一句：排隊輪流講，字多的講久一點。等太久、排太多而沒講到的，記號拿掉，下次遇到再講
const SAY = { q: [], cur: null, t0: 0, dur: 0, tm: 0 };
function sayDur(txt) { return clamp(1.3 + txt.length * 0.14, 2.6, 6.5) * 1000; }
function sayDrop(m) { if (m.key && typeof G !== 'undefined') delete G.said[m.key]; }
function say(txt, alert, key) {
  if ((SAY.cur && SAY.cur.txt === txt) || SAY.q.some((m) => m.txt === txt)) return;
  const m = { txt, alert: !!alert, key: key || '', at: performance.now() };
  if (m.alert) { let i = 0; while (i < SAY.q.length && SAY.q[i].alert) i++; SAY.q.splice(i, 0, m); } else SAY.q.push(m);      // 警告插隊
  while (SAY.q.length > 3) sayDrop(SAY.q.pop());
  sayPump();
}
function sayPump() {
  clearTimeout(SAY.tm);
  const now = performance.now(), hold = () => (SAY.q.length ? Math.max(1800, SAY.dur * 0.6) : SAY.dur);      // 後面有人在等：這一句至少講六成
  if (SAY.cur) { const left = hold() - (now - SAY.t0); if (left > 0) { SAY.tm = setTimeout(sayPump, left + 15); return; } SAY.cur = null; }
  while (SAY.q.length && now - SAY.q[0].at > 9000) sayDrop(SAY.q.shift());
  const m = SAY.q.shift(), el = $('say'); if (!m) return;
  SAY.cur = m; SAY.t0 = now; SAY.dur = sayDur(m.txt);
  el.textContent = m.txt; el.classList.toggle('alert', m.alert); el.style.setProperty('--say', (SAY.dur / 1000).toFixed(2) + 's'); replay(el, 'show');
  SAY.tm = setTimeout(sayPump, hold() + 15);
}
function sayClear() { clearTimeout(SAY.tm); SAY.q.length = 0; SAY.cur = null; $('say').className = 'chamfer'; }
function mile(txt) { const el = $('mile'); el.textContent = txt; replay(el, 'show'); }

function starsHtml(n) { return '<em>' + '★'.repeat(n) + '</em>' + '★'.repeat(3 - n); }
function homeRender() {
  const box = $('lvls'); box.textContent = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button'), locked = i >= SV.open;
    b.className = 'lv chamfer' + (locked ? ' locked' : ''); b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(i === UI.sel));
    b.setAttribute('aria-label', '第' + NUM_ZH[i] + '關 ' + lv.name + (locked ? '（未解鎖）' : ''));
    const n = document.createElement('b'); n.textContent = String(i + 1);
    const nm = document.createElement('strong'); nm.textContent = lv.name;
    const st = document.createElement('span'); st.className = 'stars'; st.innerHTML = starsHtml(SV.stars[i]);
    b.appendChild(n); b.appendChild(nm); b.appendChild(st);
    b.addEventListener('click', () => { auInit(); sfx('click'); if (UI.sel === i) return; UI.sel = i; homeRender(); if (typeof demoStart === 'function') demoStart(i); });
    box.appendChild(b);
  });
  const lv = LEVELS[UI.sel], locked = UI.sel >= SV.open;
  $('liName').textContent = lv.name; $('liTag').textContent = lv.tag;
  $('liTip').textContent = locked ? '先打下第' + NUM_ZH[UI.sel - 1] + '關「' + LEVELS[UI.sel - 1].name + '」才能出戰。' : lv.tip + '。';
  $('btnGo').disabled = locked;
  $('homeCoins').textContent = fmt(SV.coins);
}
function shopRender() {
  $('shopCoins').textContent = fmt(SV.coins);
  const ul = $('upList'); ul.textContent = '';
  UPS.forEach((u) => {
    const lvl = SV.up[u.k], li = document.createElement('li');
    const h = document.createElement('h3'); h.textContent = u.name;
    const sp = document.createElement('span'); sp.className = 'pips'; for (let i = 0; i < 5; i++) { const p = document.createElement('i'); if (i < lvl) p.className = 'on'; sp.appendChild(p); } h.appendChild(sp);
    const p = document.createElement('p'); p.textContent = u.desc;
    const b = document.createElement('button'); b.className = 'btn' + (lvl < 5 && SV.coins >= UP_COST[lvl] ? ' btn-gold' : '');
    if (lvl >= 5) { b.innerHTML = '<span>已滿</span>'; b.disabled = true; }
    else {
      b.innerHTML = '<em class="coin">' + UP_COST[lvl] + '</em>'; b.setAttribute('aria-label', '升級' + u.name + '，花費 ' + UP_COST[lvl]);
      b.addEventListener('click', () => {
        if (SV.coins < UP_COST[lvl]) { sfx('deny'); return; }
        SV.coins -= UP_COST[lvl]; SV.up[u.k]++; save(); sfx('buy'); shopRender(); homeRender();
      });
    }
    li.appendChild(h); li.appendChild(b); li.appendChild(p); ul.appendChild(li);
  });
}
function toggleSync() {
  $('tSfx').setAttribute('aria-pressed', String(SV.sfx)); $('tMus').setAttribute('aria-pressed', String(SV.mus)); $('tVib').setAttribute('aria-pressed', String(SV.vib));
  AU.sfxOn = SV.sfx; AU.musOn = SV.mus; AU.vibOn = SV.vib; auSet();
  document.querySelectorAll('#diffSeg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.d === SV.diff)));
}
function openOpt(paused) {
  $('optTitle').textContent = paused ? '暫停' : '設定';
  $('pauseBtns').hidden = !paused; $('homeOpts').hidden = paused; $('diffSeg').hidden = paused; $('opt').hidden = false;
  UI.wipeArm = 0; $('btnWipe').textContent = '清除進度';
}
const LOSE_TIPS = [
  '讓瞄準的虛線穿過藍色倍增符再落到敵城，一發變好幾發。',
  '別只打屋頂：打斷下層的柱子和牆，上面整層會自己塌下來。',
  '輪到敵軍的時候按「護罩」，他們那一整輪都打不進來；護罩撐到你下一次瞄準為止。',
  '「連珠」集滿就按下去上膛，這一輪每個兵連打三次；先把彈道對準倍增符再放手。',
  '兵全倒就輸了：紅色的短虛線是敵軍在瞄的方向，瞄到你的兵就開護罩。',
  '戰利品可以在「強化」換成火力、準星和城防。'
];
const TIP_RED = '敵軍的赤符會擋住你的砲彈，也讓他們的砲彈變多：把它打掉，或是換個角度繞過去。';
const LOSE_TIPS_LV = [
  ['上一輪的彈道會留一條淡淡的虛線，盡頭打一個叉：照著它微調就好。', '望樓只靠幾根細柱子撐著，打斷一根，整座連人一起倒。'],
  ['每回合風向都會變，虛線已經把風算進去了，照著虛線打。', '倍增符下面那道紫色的折損符會吃掉一半砲彈，瞄高一點。', '沙城閣樓上的大石球：打斷撐著它的木樑，它就砸在底下的兵頭上。', TIP_RED],
  ['兵被凍住就開護罩，會立刻解凍。', '冰很滑：打掉冰塔底下的一塊，整座就溜下來。火油兵的火對冰特別有效。', '中間的冰牆擋平射：吊高越過去，或是先把它轟倒。', TIP_RED],
  ['敵城正面是鐵甲：吊高從屋頂打進去，把樓上的火藥庫炸開，一桶爆就三桶連環爆。', '讓砲彈從正在噴的地火裡穿過去，威力多五成。', '紅圈是這一回合結束時的落石，砸得到你就開護罩。', TIP_RED],
  ['氣球先停在半路，下一輪才飛過來：趁它停著的時候打下來。', '把砲彈射進藍色傳送門，會從敵城頭頂往下灌，繞過正面的金甲。', '先打掉防空弩，不然每一輪都會被射下三發。', TIP_RED],
  ['結界每回合只開一個缺口：看哪一段沒有光牆，就用那個角度打進去；光牆也打得破。', '毀滅光球先停在半路，下一輪才砸過來：打掉它，或是開護罩。', '先把魔王頭上的屋頂轟掉，再把砲彈吊高落進大殿。', TIP_RED]
];
function showResult(won, st) {
  $('resTitle').textContent = won ? (st.idx === LEVELS.length - 1 ? '魔王伏誅' : '敵城攻破') : '城樓失守';
  $('resTitle').className = won ? '' : 'lose';
  $('resSub').textContent = '第' + NUM_ZH[st.idx] + '關 ' + LEVELS[st.idx].name;
  const stars = $('resStars'); stars.hidden = !won;
  const run = ++UI.resRun;
  [...stars.children].forEach((s, i) => { s.className = ''; if (won && i < st.stars) setTimeout(() => { if (UI.resRun === run && !$('result').hidden) { s.className = 'on'; sfx('star', i); } }, 350 + i * 320); });
  $('rsBar').textContent = Math.round(st.bar * 100) + '%'; $('rsRounds').textContent = String(st.rounds);
  $('rsChain').textContent = st.chain ? st.chain + ' 塊' : '—'; $('rsSwarm').textContent = fmt(st.swarm) + ' 發';
  $('rsCoins').textContent = '+' + fmt(st.coins);
  const tip = $('resTip'), own = LOSE_TIPS_LV[st.idx] || [], tips = Math.random() < 0.7 && own.length ? own : LOSE_TIPS;      // 多半講這一關自己的訣竅
  if (won) { tip.hidden = st.stars >= 3; if (st.stars < 3) tip.textContent = st.lost ? '三顆星：一個兵都不能倒，城防還要剩六成以上。' : '三顆星：城防要剩六成以上。'; }
  else { tip.hidden = false; tip.textContent = tips[(Math.random() * tips.length) | 0]; }
  $('btnNext').hidden = !(won && st.idx < LEVELS.length - 1);
  $('btnAgain').firstChild.textContent = won ? '再玩一次' : '再戰';
  $('btnAgain').className = 'btn' + (won ? '' : ' btn-gold');
  $('result').hidden = false;
}

/* ---------- 戰鬥中的資訊列 ---------- */
const HUD = { a: -1, b: -1, crew: [[], []], ult: -1, sh: -1, wind: 99, deg: -1, pow: -1, mile: 0, n: 0, turn: '', round: -1, fire: -1 };
const MILES = [[30, '彈如雨下'], [70, '百砲齊發'], [150, '遮天蔽日'], [300, '千砲破城']];
function hudBuild() {
  for (let sd = 0; sd < 2; sd++) {
    const box = $(sd ? 'crewB' : 'crewA'); box.textContent = ''; HUD.crew[sd] = [];
    for (const u of S.team[sd].units) {
      const el = document.createElement('span'); el.className = 'cu'; el.title = u.def.name;
      const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d'); c.scale(96 / 64, 96 / 64); c.lineJoin = 'round'; c.lineCap = 'round';
      if (sd === 1) { c.translate(64, 0); c.scale(-1, 1); }
      c.translate(0, u.def.big ? 12 : 7);                            // 帽子、角畫在格子上緣外面：往下挪才不會被切掉
      (UNIT_ART[u.type] || UNIT_ART.rocket)(c, sd, TEAM_PAL[sd]);
      el.appendChild(cv); box.appendChild(el); HUD.crew[sd].push({ el, u, st: '' });
    }
  }
  // 魔王城：城防條上標出換階段的位置
  const hb = $('hpB'); hb.querySelectorAll('.tick').forEach((e) => e.remove());
  if (S.lv.boss) for (const p of [S.lv.boss.p2, S.lv.boss.p3]) { const t = document.createElement('span'); t.className = 'tick'; t.style.right = (p * 100) + '%'; hb.appendChild(t); }
  $('foeLbl').textContent = S.lv.boss ? '魔王' : '敵城';
  $('windBox').hidden = !S.lv.wind;
  HUD.a = HUD.b = -1; HUD.ult = HUD.sh = -1; HUD.wind = 99; HUD.deg = HUD.pow = -1; HUD.mile = 0; HUD.turn = ''; HUD.round = -1; HUD.fire = -1;
  $('turnChip').hidden = true;                                       // 上一局留下來的「輪到你」不能帶進新的一局
}
function foeBar() { return teamBar(1); }
function hudUpdate() {
  HUD.n++;
  const a = Math.round(teamBar(0) * 100), b = Math.round(foeBar() * 100);
  if (a !== HUD.a) { if (HUD.a >= 0 && a < HUD.a) replayFlash($('hpA')); HUD.a = a; $('pctA').textContent = a + '%'; $('barA').style.transform = 'scaleX(' + (a / 100) + ')'; }
  if (b !== HUD.b) { if (HUD.b >= 0 && b < HUD.b) replayFlash($('hpB')); HUD.b = b; $('pctB').textContent = b + '%'; $('barB').style.transform = 'scaleX(' + (b / 100) + ')'; }
  // 輪到誰
  const play = S.state === 'play', mine = play && S.phase === 'aim' && S.turn === 0;
  const tk = !play || S.phase === 'intro' || (S.phase === 'hazard' && !S.hz) ? '' : S.phase === 'hazard' ? 'hz' : S.phase + S.turn + (S.team[S.turn].ult.armed ? 'u' : '');
  if (tk !== HUD.turn) {
    HUD.turn = tk; const el = $('turnChip');
    if (!tk) el.hidden = true;
    else {
      el.hidden = false;
      el.className = 'chamfer ' + (tk === 'hz' ? 'hz' : S.turn === 0 ? 'me' : 'foe') + (mine ? ' go' : '');
      el.textContent = tk === 'hz' ? '落石！' : S.phase === 'aim' ? (S.turn === 0 ? '輪到你：拖曳瞄準，放開發射' : S.team[1].ult.armed ? '敵軍連珠砲上膛！' : '敵軍瞄準中') : (S.turn === 0 ? '我方砲擊' : '敵軍砲擊');
    }
  }
  const fk = mine ? 1 : 0; if (fk !== HUD.fire) { HUD.fire = fk; $('btnFire').classList.toggle('ready', !!mine); $('btnFire').classList.toggle('btn-gold', !!mine); }
  if (S.round !== HUD.round) { HUD.round = S.round; $('roundTxt').textContent = S.round > 0 ? '第 ' + S.round + ' 回合' : ''; }
  if ((HUD.n & 3) !== 0) return;
  for (let sd = 0; sd < 2; sd++) for (const k of HUD.crew[sd]) { const st = !k.u.alive ? 'dead' : k.u.frozen > 0 ? 'frozen' : k.u.stun > 0 ? 'stun' : ''; if (st !== k.st) { k.st = st; k.el.className = 'cu' + (st ? ' ' + st : ''); } }
  const T = S.team[0], bu = $('btnUlt'), bs = $('btnShield');
  const up = clamp(T.ult.c / T.ult.need, 0, 1), armed = T.ult.armed, uk = Math.round(up * 100) + (armed ? 1000 : 0);
  if (uk !== HUD.ult) { HUD.ult = uk; bu.style.setProperty('--p', armed ? '1' : up.toFixed(3)); bu.classList.toggle('ready', up >= 1 && !armed); bu.classList.toggle('on', armed); $('ultNum').textContent = armed ? '已上膛' : up >= 1 ? '可用' : Math.floor(up * 100) + '%'; }
  const sp = clamp(T.shield.c / T.shield.need, 0, 1), son = T.shield.on, sk = Math.round(sp * 100) + (son ? 1000 : 0);
  if (sk !== HUD.sh) { HUD.sh = sk; bs.style.setProperty('--p', son ? '1' : sp.toFixed(3)); bs.classList.toggle('ready', sp >= 1 && !son); bs.classList.toggle('on', son); $('shNum').textContent = son ? '展開中' : sp >= 1 ? '可用' : Math.floor(sp * 100) + '%'; }
  if (S.lv.wind) {
    const w = S.wind;
    if (w !== HUD.wind) { HUD.wind = w; const box = $('windBox'), m = Math.abs(w); box.classList.toggle('calm', m < 1); $('windTxt').textContent = m < 1 ? '無風' : '風 ' + m; $('windArr').style.transform = 'scaleX(' + (w < 0 ? -1 : 1) * (0.55 + Math.min(1, m / 12) * 0.6) + ')'; }
  }
  const ang = Math.round(Math.atan2(T.aim[1], T.aim[0]) * 180 / Math.PI), pw = Math.round((Math.hypot(T.aim[0], T.aim[1]) - VMIN) / (VMAX - VMIN) * 100);
  if (ang !== HUD.deg) { HUD.deg = ang; $('aimDeg').textContent = ang; }
  if (pw !== HUD.pow) { HUD.pow = pw; $('aimPow').textContent = pw; }
  while (HUD.mile < MILES.length && S.stat.peak >= MILES[HUD.mile][0]) { mile(MILES[HUD.mile][1]); HUD.mile++; }
}
function replayFlash(el) { el.classList.add('hit'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('hit'), 90); }
