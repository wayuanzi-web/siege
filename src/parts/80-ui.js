/* ===== 80-ui: 存檔、主畫面、強化、設定、結算、戰鬥中的資訊列 ===== */
const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'qianpao-pocheng-1';
const SV = { coins: 0, stars: LEVELS.map(() => 0), open: 1, up: { dmg: 0, rate: 0, hp: 0, shield: 0, ult: 0 }, sfx: true, mus: true, vib: true, seen: false, seenUlt: false, seenSh: false, diff: 1, flip: false };
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && typeof s === 'object') {
      SV.coins = Math.max(0, +s.coins || 0); SV.open = clamp(+s.open || 1, 1, LEVELS.length);
      if (Array.isArray(s.stars)) for (let i = 0; i < LEVELS.length; i++) SV.stars[i] = clamp(+s.stars[i] || 0, 0, 3);
      if (s.up) for (const k in SV.up) SV.up[k] = clamp(+s.up[k] || 0, 0, 5);
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
  { k: 'rate', name: '裝填', desc: '所有兵的射速 +7%' },
  { k: 'hp', name: '城防', desc: '城磚和兵的耐久 +9%' },
  { k: 'shield', name: '護罩', desc: '護城罩多撐 0.3 秒，冷卻快 1.1 秒' },
  { k: 'ult', name: '連珠', desc: '連珠砲集氣快 14%，多射 0.4 秒' }
];
const UP_COST = [80, 150, 240, 360, 520];
const NUM_ZH = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const UI = { sel: 0, wipeArm: 0, resRun: 0 };

function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function banner(txt, kind, small) {
  const el = $('banner'); el.className = kind || 'gold'; el.textContent = '';
  if (small) { const s = document.createElement('small'); s.textContent = small; el.appendChild(s); }
  el.appendChild(document.createTextNode(txt)); replay(el, 'show');
}
function say(txt, alert) { const el = $('say'); el.textContent = txt; el.classList.toggle('alert', !!alert); replay(el, 'show'); }
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
  '讓瞄準的虛線穿過藍色倍增符再落到敵城，火力直接翻好幾倍。',
  '敵軍的赤符會擋住你的砲彈，也會讓他們的砲彈變多：先把它打掉，或是換個角度繞過去。',
  '看到一大片紅色砲彈飛過來，就按「護罩」；它擋得住整波攻擊。',
  '「連珠」集滿就放，放之前先把彈道對準倍增符。',
  '打掉下層的磚，上面整層會塌下來，連兵一起摔傷。',
  '戰利品可以在「強化」換成火力和城防。'
];
const LOSE_TIPS_LV = [
  [],
  ['風會把砲彈吹偏，看上方的風向箭頭；虛線已經把風算進去了。', '倍增符下面那道紫色的折損符會吃掉一半砲彈，瞄高一點。'],
  ['兵被凍住就開護城罩，會立刻解凍。', '火油兵的火對冰牆是三倍傷害；也可以直接吊高越過去。'],
  ['地火噴發時讓砲彈從火柱裡穿過去，傷害多五成。', '落石會先在落點畫紅圈，來得及就開護城罩。'],
  ['氣球飄到你城上才會丟炸彈，飄過來的路上先打掉。', '把砲彈射進藍色傳送門，會從敵城頭頂往下灌，繞過正面的鐵甲。'],
  ['結界有三個缺口在轉，對準缺口打；也可以集中火力把一片結界打碎。', '毀滅光球很慢：瞄準它打掉，或是等它快到了開護城罩。']
];
function showResult(won, st) {
  $('resTitle').textContent = won ? (st.idx === LEVELS.length - 1 ? '魔王伏誅' : '敵城攻破') : '城樓失守';
  $('resTitle').className = won ? '' : 'lose';
  $('resSub').textContent = '第' + NUM_ZH[st.idx] + '關 ' + LEVELS[st.idx].name;
  const stars = $('resStars'); stars.hidden = !won;
  const run = ++UI.resRun;
  [...stars.children].forEach((s, i) => { s.className = ''; if (won && i < st.stars) setTimeout(() => { if (UI.resRun === run && !$('result').hidden) { s.className = 'on'; sfx('star', i); } }, 350 + i * 320); });
  $('rsBar').textContent = Math.round(st.bar * 100) + '%'; $('rsPeak').textContent = fmt(st.peak); $('rsSwarm').textContent = fmt(st.swarm);
  $('rsTime').textContent = Math.floor(st.time / 60) + ':' + String(Math.floor(st.time % 60)).padStart(2, '0');
  $('rsCoins').textContent = '+' + fmt(st.coins);
  const tip = $('resTip'), tips = LOSE_TIPS.concat(LOSE_TIPS_LV[st.idx] || [], LOSE_TIPS_LV[st.idx] || []); tip.hidden = won; if (!won) tip.textContent = tips[(Math.random() * tips.length) | 0];
  $('btnNext').hidden = !(won && st.idx < LEVELS.length - 1);
  $('btnAgain').firstChild.textContent = won ? '再玩一次' : '再戰';
  $('btnAgain').className = 'btn' + (won ? '' : ' btn-gold');
  $('result').hidden = false;
}

/* ---------- 戰鬥中的資訊列 ---------- */
const HUD = { a: -1, b: -1, crew: [[], []], ult: -1, sh: -1, wind: 99, deg: -1, pow: -1, mile: 0, n: 0 };
const MILES = [[40, '彈如雨下'], [90, '百砲齊發'], [180, '遮天蔽日'], [320, '千砲破城']];
function hudBuild() {
  for (let sd = 0; sd < 2; sd++) {
    const box = $(sd ? 'crewB' : 'crewA'); box.textContent = ''; HUD.crew[sd] = [];
    for (const u of S.team[sd].units) {
      const el = document.createElement('span'); el.className = 'cu'; el.title = u.def.name;
      const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d'); c.scale(96 / 64, 96 / 64); c.lineJoin = 'round'; c.lineCap = 'round';
      if (sd === 1) { c.translate(64, 0); c.scale(-1, 1); }
      (UNIT_ART[u.type] || UNIT_ART.rocket)(c, sd, TEAM_PAL[sd]);
      el.appendChild(cv); box.appendChild(el); HUD.crew[sd].push({ el, u, st: '' });
    }
  }
  // 魔王城：城防條上標出換階段的位置
  const hb = $('hpB'); hb.querySelectorAll('.tick').forEach((e) => e.remove());
  if (S.lv.boss) for (const p of [S.lv.boss.p2, S.lv.boss.p3]) { const t = document.createElement('span'); t.className = 'tick'; t.style.right = (p * 100) + '%'; hb.appendChild(t); }
  $('foeLbl').textContent = S.lv.boss ? '魔王城' : '敵城';
  $('windBox').hidden = !S.lv.wind;
  HUD.a = HUD.b = -1; HUD.ult = HUD.sh = -1; HUD.wind = 99; HUD.deg = HUD.pow = -1; HUD.mile = 0;
}
function hudUpdate() {
  HUD.n++;
  const a = Math.round(teamBar(0) * 100), b = Math.round(teamBar(1) * 100);
  if (a !== HUD.a) { if (HUD.a >= 0 && a < HUD.a) replayFlash($('hpA')); HUD.a = a; $('pctA').textContent = a + '%'; $('barA').style.transform = 'scaleX(' + (a / 100) + ')'; }
  if (b !== HUD.b) { if (HUD.b >= 0 && b < HUD.b) replayFlash($('hpB')); HUD.b = b; $('pctB').textContent = b + '%'; $('barB').style.transform = 'scaleX(' + (b / 100) + ')'; }
  if ((HUD.n & 3) !== 0) return;
  for (let sd = 0; sd < 2; sd++) for (const k of HUD.crew[sd]) { const st = !k.u.alive ? 'dead' : k.u.frozen > 0 ? 'frozen' : ''; if (st !== k.st) { k.st = st; k.el.className = 'cu' + (st ? ' ' + st : ''); } }
  const T = S.team[0], bu = $('btnUlt'), bs = $('btnShield');
  const up = T.ult.T > 0 ? 1 : clamp(T.ult.c / T.ult.need, 0, 1), uk = Math.round(up * 100) + (T.ult.T > 0 ? 1000 : 0);
  if (uk !== HUD.ult) { HUD.ult = uk; bu.style.setProperty('--p', up.toFixed(3)); bu.classList.toggle('ready', up >= 1 && T.ult.T <= 0); bu.classList.toggle('on', T.ult.T > 0); $('ultNum').textContent = T.ult.T > 0 ? '發射中' : up >= 1 ? '發射' : Math.floor(up * 100) + '%'; }
  const sp = T.shield.T > 0 ? 1 : 1 - clamp(T.shield.cd / T.shield.cdMax, 0, 1), sk = Math.round(sp * 100) + (T.shield.T > 0 ? 1000 : 0) + Math.ceil(T.shield.cd) * 2000;
  if (sk !== HUD.sh) { HUD.sh = sk; bs.style.setProperty('--p', sp.toFixed(3)); bs.classList.toggle('ready', sp >= 1 && T.shield.T <= 0); bs.classList.toggle('on', T.shield.T > 0); $('shNum').textContent = T.shield.T > 0 ? '展開' : sp >= 1 ? '可用' : Math.ceil(T.shield.cd) + '秒'; }
  if (S.lv.wind) {
    const w = Math.round(S.windTo);
    if (w !== HUD.wind) { HUD.wind = w; const box = $('windBox'), m = Math.abs(w); box.classList.toggle('calm', m < 2); $('windTxt').textContent = m < 2 ? '無風' : (m > 10 ? '強風' : m > 5 ? '風' : '微風'); $('windArr').style.transform = 'scaleX(' + (w < 0 ? -1 : 1) * (0.55 + Math.min(1, m / 15) * 0.6) + ')'; }
  }
  const ang = Math.round(Math.atan2(T.aim[1], T.aim[0]) * 180 / Math.PI), pw = Math.round((Math.hypot(T.aim[0], T.aim[1]) - VMIN) / (VMAX - VMIN) * 100);
  if (ang !== HUD.deg) { HUD.deg = ang; $('aimDeg').textContent = ang; }
  if (pw !== HUD.pow) { HUD.pow = pw; $('aimPow').textContent = pw; }
  while (HUD.mile < MILES.length && S.stat.peak >= MILES[HUD.mile][0]) { mile(MILES[HUD.mile][1]); HUD.mile++; }
}
function replayFlash(el) { el.classList.add('hit'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('hit'), 90); }
