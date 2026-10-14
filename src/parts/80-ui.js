/* ===== 80-ui: 存檔、主畫面、強化、設定、結算、戰鬥中的資訊列 ===== */
const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'qianpao-pocheng-1';
const SV = { coins: 0, stars: LEVELS.map(() => 0), open: 1, up: { dmg: 0, aim: 0, hp: 0, shield: 0, ult: 0 }, sfx: true, mus: true, vib: true, seen: false, seenUlt: false, seenSh: false, diff: 1, flip: false, gfx: 2,
  prac: { map: 0, me: PRACTICE_BASE.me.crew.slice(), foe: PRACTICE_BASE.foe.crew.slice(), ff: 1 } };          // prac：演武場上次挑的戰場、兵、誤傷開關
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && typeof s === 'object') {
      // 存檔可能被改過或壞掉：每個數字都取整、夾在合理範圍裡
      const int = (v, lo, hi) => { v = Math.floor(+v); return v >= lo ? Math.min(v, hi) : lo; };
      SV.coins = int(s.coins, 0, 9999999); SV.open = int(s.open, 1, LEVELS.length);
      if (Array.isArray(s.stars)) {
        // 舊版（六關）的存檔：第六關魔王城現在是第十二關，星星搬過去；中間新加的第六到十一關從頭打
        if (s.stars.length === 6 && LEVELS.length === 12) { const st = s.stars.slice(); st[11] = st[5]; st[5] = 0; s.stars = st; }
        for (let i = 0; i < LEVELS.length; i++) SV.stars[i] = int(s.stars[i], 0, 3);
      }
      if (s.up && typeof s.up === 'object') { for (const k in SV.up) SV.up[k] = int(s.up[k], 0, 5); if (s.up.aim === undefined && s.up.rate) SV.up.aim = int(s.up.rate, 0, 5); }      // 舊版的「裝填」改成「準星」
      SV.sfx = s.sfx !== false; SV.mus = s.mus !== false; SV.vib = s.vib !== false; SV.seen = !!s.seen; SV.seenUlt = !!s.seenUlt; SV.seenSh = !!s.seenSh; SV.flip = !!s.flip;
      SV.diff = s.diff === 0 || s.diff === 2 ? s.diff : 1;
      SV.gfx = s.gfx === 0 || s.gfx === 1 ? s.gfx : 2;          // 畫質：0 低、1 中、2 高
      if (s.prac && typeof s.prac === 'object') {
        const ok = (a) => Array.isArray(a) && a.length === 6 && a.every((t) => UNIT_LIST.indexOf(t) >= 0);
        SV.prac.map = int(s.prac.map, 0, PRACTICE_MAPS - 1); if (!PRACTICE_LIST.includes(SV.prac.map)) SV.prac.map = 0; SV.prac.ff = s.prac.ff ? 1 : 0;
        if (ok(s.prac.me)) SV.prac.me = s.prac.me.slice(); if (ok(s.prac.foe)) SV.prac.foe = s.prac.foe.slice();
      }
      // 從第一關起一路過了幾關（存檔裡的「解鎖到第幾關」壞了也救得回來；舊存檔搬過去的魔王城星星不算，不會一口氣解鎖整個第二篇）
      let top = 0; while (top < LEVELS.length && SV.stars[top] > 0) top++;
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
const UI = { sel: 0, chap: 0, wipeArm: 0, resRun: 0, resAt: -1e9, prac: false, pickSlot: null };          // prac：選的是第三篇的演武場；pickSlot：換兵的軍牌是哪一個頭像打開的
const CHAP = 6;                                          // 一篇幾關
const CHAPS = ['第一篇', '第二篇', '第三篇', '第四篇', '第五篇'];          // 最後一篇的分頁裡也放演武場
// 演武場這一局的關卡（照存檔裡挑好的戰場、兵、誤傷開關）
function pracLevel() { const P = SV.prac; return practiceLevel(P.map, P.me, P.foe, P.ff); }
// 主畫面背景的示範戰局：選到哪一關就演那一關（演武場：照挑好的兵）
function homeDemo() { if (typeof demoStart === 'function') demoStart(UI.prac ? pracLevel() : UI.sel); }
function numZh(n) { return n <= 10 ? NUM_ZH[n - 1] : n < 20 ? '十' + NUM_ZH[n - 11] : n % 10 === 0 ? NUM_ZH[n / 10 - 1] + '十' : NUM_ZH[((n / 10) | 0) - 1] + '十' + NUM_ZH[n % 10 - 1]; }

function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
/* 選單和視窗裡的按鈕：手指或滑鼠在按鈕上按下去、再放開就算，不等瀏覽器的 click
   （另一根手指還放在螢幕上的時候，瀏覽器不會替這一下合成 click，按鈕會像壞掉一樣）。
   鍵盤（Tab 選到再按 Enter／空白鍵）和程式呼叫的 click() 還是走 click */
function onTap(el, fn) {
  const go = (e) => { if (typeof auInit === 'function') auInit(); fn(e); };
  if (!window.PointerEvent) { el.addEventListener('click', go); return; }
  let pid = -1, x0 = 0, y0 = 0;
  el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; pid = e.pointerId; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', (e) => { if (e.pointerId !== pid) return; pid = -1; if (Math.hypot(e.clientX - x0, e.clientY - y0) <= 24) go(e); });
  el.addEventListener('pointercancel', () => { pid = -1; });
  el.addEventListener('pointerleave', (e) => { if (e.pointerId === pid && e.pointerType === 'mouse') pid = -1; });
  el.addEventListener('click', (e) => { if (e.pointerType || e.detail > 0) return; go(e); });
}
// 第二十九關：攻下一座城，挑一張卡（電腦玩家自己挑，不跳出來）
const CARD_ICON = { repair: '🔨', reinforce: '🛡', powder: '💥', drums: '🥁', armor: '⛓' };
function cardsShow() {
  const G2 = S.siege; if (!G2 || !G2.opts || S.phase !== 'cards' || S.team[0].ai) return;
  $('cardsTitle').textContent = '攻下' + siegeName(G2.stage) + '！';
  $('cardsSub').textContent = '挑一張卡，帶著它打下一座城：' + siegeName(G2.stage + 1);
  const row = $('cardRow'); row.textContent = '';
  G2.opts.forEach((k, i) => {
    const C = CARDS[k], b = document.createElement('button'); b.className = 'card chamfer';
    const ic = document.createElement('i'); ic.textContent = CARD_ICON[k] || '★'; ic.setAttribute('aria-hidden', 'true');
    const h = document.createElement('h3'); h.textContent = C.name; const p = document.createElement('p'); p.textContent = C.txt;
    b.append(ic, h, p);
    onTap(b, () => { if (siegePick(i)) { sfx('buy'); $('cards').hidden = true; } });
    row.appendChild(b);
  });
  $('cards').hidden = false;
  setTimeout(() => { const b = row.firstElementChild; if (b && G.kbNav) b.focus({ preventScroll: true }); }, 0);
}
function banner(txt, kind, small) {
  const el = $('banner'); el.className = kind || 'gold'; el.textContent = '';
  if (small) { const s = document.createElement('small'); s.textContent = small; el.appendChild(s); }
  el.appendChild(document.createTextNode(txt)); replay(el, 'show');
}
// 底部的提示一次只放得下一句：排隊輪流講，字多的講久一點。等太久、排太多而沒講到的，記號拿掉，下次遇到再講
const SAY = { q: [], cur: null, t0: 0, dur: 0, tm: 0, held: 0 };
function sayDur(txt) { return clamp(1.3 + txt.length * 0.15, 2.6, 8.5) * 1000; }          // 一秒大約讀六、七個字
function sayDrop(m) { if (m.key && typeof G !== 'undefined') { delete G.said[m.key]; if (m.key.slice(0, 4) === 'hint' && G.hinted) G.hinted[+m.key.slice(4)] = 0; } }       // 沒講到的話：下次還可以再講
// ok：還用得上嗎。排隊等了幾秒才輪到的話，講之前再問一次（要打的東西已經沒了、時機過了就不講，之後還有機會再講）
function say(txt, alert, key, ok) {
  if ((SAY.cur && SAY.cur.txt === txt) || SAY.q.some((m) => m.txt === txt)) return;
  const m = { txt, alert: !!alert, key: key || '', at: performance.now(), ok: ok || null };
  if (m.alert) { let i = 0; while (i < SAY.q.length && SAY.q[i].alert) i++; SAY.q.splice(i, 0, m); } else SAY.q.push(m);      // 警告插隊
  while (SAY.q.length > 3) sayDrop(SAY.q.pop());
  if (!SAY.held) sayPump();
}
function sayPump() {
  clearTimeout(SAY.tm); if (SAY.held) return;
  const now = performance.now(), hold = () => (SAY.q.length ? Math.max(2300, SAY.dur * 0.78) : SAY.dur);      // 後面有人在等：這一句至少講將近八成
  if (SAY.cur) { const left = hold() - (now - SAY.t0); if (left > 0) { SAY.tm = setTimeout(sayPump, left + 15); return; } SAY.cur = null; }
  while (SAY.q.length && (now - SAY.q[0].at > 9000 || (SAY.q[0].ok && !SAY.q[0].ok()))) sayDrop(SAY.q.shift());
  const m = SAY.q.shift(), el = $('say'); if (!m) return;
  SAY.cur = m; SAY.t0 = now; SAY.dur = sayDur(m.txt);
  el.textContent = m.txt; el.classList.toggle('alert', m.alert); el.style.setProperty('--say', (SAY.dur / 1000).toFixed(2) + 's'); replay(el, 'show');
  SAY.tm = setTimeout(sayPump, hold() + 15);
}
// 有更要緊的話要馬上講：正在講的、排隊的都先放掉（沒講完的之後還可以再講）
function sayFlush() { clearTimeout(SAY.tm); for (const m of SAY.q) sayDrop(m); SAY.q.length = 0; if (SAY.cur && performance.now() - SAY.t0 < 1200) sayDrop(SAY.cur); SAY.cur = null; }
function sayClear() { clearTimeout(SAY.tm); SAY.q.length = 0; SAY.cur = null; SAY.held = 0; const el = $('say'); el.className = 'chamfer' + (S.lv && S.lv.sayTop ? ' top' : ''); el.style.animationPlayState = ''; }       // sayTop：這一關要打的東西在戰場下半（竹樁、石碑），提示改放在上面
// 暫停的時候提示也停住（計時和淡出動畫都停），繼續之後接著講
function sayHold(on) {
  const el = $('say');
  if (on) { if (SAY.held) return; SAY.held = performance.now(); clearTimeout(SAY.tm); el.style.animationPlayState = 'paused'; }
  else if (SAY.held) { const d = performance.now() - SAY.held; SAY.held = 0; SAY.t0 += d; for (const m of SAY.q) m.at += d; el.style.animationPlayState = ''; sayPump(); }
}
function mile(txt) { const el = $('mile'); el.textContent = txt; replay(el, 'show'); }

function starsHtml(n) { return '<em>' + '★'.repeat(n) + '</em>' + '★'.repeat(3 - n); }
// 換一篇：選那一篇裡打到的最後一關（還沒解鎖就選那一篇的第一關）
const LEVEL_MAX = 30;          // 五篇一共三十關：還沒做好的那幾關，最後一篇的清單上先寫「製作中」
function chapGo(k) {
  if (UI.chap === k) return;
  sfx('click'); UI.chap = k;
  const a = k * CHAP, b = Math.min(LEVELS.length, a + CHAP);
  // 最後一篇（最後一個分頁，裡面也放演武場）：這一篇的關卡還沒解鎖，就先選演武場
  if (k === CHAPS.length - 1 && (a >= LEVELS.length || SV.open - 1 < a)) UI.prac = true;
  else { UI.prac = false; UI.sel = clamp(SV.open - 1, a, b - 1); }
  homeRender(); homeDemo();
}
function homeRender() {
  const box = $('lvls'); box.textContent = '';
  const last = CHAPS.length - 1;
  UI.chap = UI.prac ? last : Math.floor(UI.sel / CHAP);
  // 每一篇一個分頁：一次只列一篇的六關（全部排成一長條放不下）
  const tabs = $('chaps'); tabs.textContent = '';
  CHAPS.forEach((nm, k) => {
    const t = document.createElement('button'), lock = k * CHAP >= SV.open && k < last;          // 最後一篇的演武場一直都能進
    t.className = 'chap chamfer' + (lock ? ' locked' : ''); t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', String(k === UI.chap));
    t.innerHTML = '<span>' + nm + '</span><small>' + (k * CHAP + 1) + '–' + (k + 1) * CHAP + '</small>';
    t.tabIndex = k === UI.chap ? 0 : -1;
    onTap(t, () => { chapGo(k); const nt = $('chaps').children[k]; if (nt) nt.focus({ preventScroll: true }); });
    // 方向鍵換篇（分頁的慣例）
    t.addEventListener('keydown', (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); const n = CHAPS.length, k2 = (k + (e.key === 'ArrowRight' ? 1 : n - 1)) % n; chapGo(k2); const nt = $('chaps').children[k2]; if (nt) nt.focus({ preventScroll: true }); });
    tabs.appendChild(t);
  });
  // 每邊六個兵（演武場、第三篇）：中間的卡片放寬，頭像排得下
  const six = UI.prac || LEVELS[UI.sel].me.crew.length > 4;
  $('liPrac').hidden = !UI.prac; $('home').classList.toggle('pmode', six);
  LEVELS.forEach((lv, i) => {
    if (Math.floor(i / CHAP) !== UI.chap) return;
    const b = document.createElement('button'), locked = i >= SV.open;
    // 還沒解鎖、可是有星星的（舊版存檔打過的魔王城搬到第十二關）：星星照樣顯示，不畫鎖頭
    b.className = 'lv chamfer' + (locked ? ' locked' : '') + (locked && SV.stars[i] > 0 ? ' had' : ''); b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(i === UI.sel && !UI.prac));
    b.setAttribute('aria-label', '第' + numZh(i + 1) + '關 ' + lv.name + (locked ? '（未解鎖）' : ''));
    const n = document.createElement('b'); n.textContent = String(i + 1);
    const nm = document.createElement('strong'); nm.textContent = lv.name;
    const st = document.createElement('span'); st.className = 'stars'; st.innerHTML = starsHtml(SV.stars[i]);
    b.appendChild(n); b.appendChild(nm); b.appendChild(st);
    onTap(b, () => {
      sfx('click'); if (UI.sel === i && !UI.prac) return; UI.sel = i; UI.prac = false; homeRender(); if (typeof demoStart === 'function') demoStart(i);
      const nb = $('lvls').children[i % CHAP]; if (nb) nb.focus({ preventScroll: true });      // 清單重畫過了，把焦點放回同一關（用鍵盤選關才不會跳掉）
    });
    box.appendChild(b);
  });
  if (UI.chap === last) {
    // 最後一篇：還沒做好的關先寫「製作中」，最後是演武場（一直都能進）
    if (LEVELS.length < LEVEL_MAX) { const soon = document.createElement('div'); soon.className = 'lv chamfer locked had'; soon.setAttribute('aria-hidden', 'true'); soon.innerHTML = '<b>' + (LEVELS.length + 1) + '</b><strong>製作中</strong><span class="stars">' + (LEVELS.length + 1 < LEVEL_MAX ? (LEVELS.length + 1) + '–' + LEVEL_MAX + ' 關' : '第 ' + LEVEL_MAX + ' 關') + '</span>'; box.appendChild(soon); }          // 名字放不下「十六到十八關製作中」：關數放在星星那一格
    const b = document.createElement('button'); b.className = 'lv chamfer'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(UI.prac)); b.setAttribute('aria-label', '演武場');
    b.innerHTML = '<b>演</b><strong>演武場</strong><span class="stars">試打</span>';
    onTap(b, () => { sfx('click'); if (UI.prac) return; UI.prac = true; homeRender(); homeDemo(); const nb = $('lvls').lastElementChild; if (nb) nb.focus({ preventScroll: true }); });
    box.appendChild(b);
  }
  box.classList.toggle('dense', box.children.length > 6);          // 第四篇六關都做好了，加上演武場一共七排：每一排矮一點才塞得下
  if (UI.prac) { pracRender(); return; }
  const lv = LEVELS[UI.sel], locked = UI.sel >= SV.open;
  $('liName').textContent = lv.name; $('liTag').textContent = lv.tag;
  const tipTxt = locked ? '先打下第' + numZh(UI.sel) + '關「' + LEVELS[UI.sel - 1].name + '」才能出戰。' : lv.tip + '。';
  const tip = $('liTip'); tip.textContent = tipTxt; tip.classList.remove('blurb');
  // 看不見的墊高文字：每一段可能出現在這裡的說明都放一份，格子的高度就是最長那一段的高度
  const tb = $('liTipBox'); tb.querySelectorAll('.sizer').forEach((e) => e.remove());
  for (const t of [tipTxt].concat([...new Set(lv.me.crew.concat(lv.foe.crew))].map((k) => UNIT[k].name + '：' + UNIT[k].blurb + '。'))) {
    const p = document.createElement('p'); p.className = 'sizer'; p.setAttribute('aria-hidden', 'true'); p.textContent = t; tb.appendChild(p);
  }
  // 這一關雙方派誰上場：一排頭像，點一下看那個兵會什麼（再點一下回到關卡說明）
  const cr = $('liCrew'); cr.textContent = ''; cr.classList.toggle('prac6', six); let picked = null;
  [[0, lv.me.crew, '我方'], [1, lv.foe.crew, '敵軍']].forEach(([sd, crew, label]) => {
    const row = document.createElement('div'); row.className = 'grp ' + (sd ? 'foe' : 'me');
    const lb = document.createElement('small'); lb.textContent = label; row.appendChild(lb);
    crew.forEach((type) => {
      const def = UNIT[type], b = document.createElement('button'); b.className = 'cu'; b.setAttribute('aria-label', label + '：' + def.name + '。' + def.blurb); b.setAttribute('aria-pressed', 'false');
      b.appendChild(unitPortrait(type, sd));
      onTap(b, () => {
        sfx('click');
        if (picked) picked.setAttribute('aria-pressed', 'false');
        if (picked === b) { picked = null; tip.textContent = tipTxt; tip.classList.remove('blurb'); return; }
        picked = b; b.setAttribute('aria-pressed', 'true'); tip.textContent = def.name + '：' + def.blurb + '。'; tip.classList.add('blurb');
      });
      row.appendChild(b);
    });
    cr.appendChild(row);
  });
  $('btnGo').disabled = locked;
  $('homeCoins').textContent = fmt(SV.coins);
}
/* ---------- 演武場（最後一篇的分頁）：挑戰場、挑兵、誤傷開關 ---------- */
function pracRender() {
  const P = SV.prac, base = P.map > 0 ? LEVELS[P.map - 1] : PRACTICE_BASE, n = practiceSlots(P.map);
  $('liName').textContent = '演武場'; $('liTag').textContent = PRACTICE_BASE.tag;
  const tip = $('liTip'), tipTxt = numZh(UNIT_LIST.length) + '種兵任你挑（點頭像換人），戰場也換得到各關的城（魔王城、機關巨獸除外）。第三篇起的規則：' + (P.ff ? '自己的砲炸到自己人一樣會傷；' : '誤傷現在關著；') + '打中接點、核心、兵的頭是暴擊 ×2。';
  tip.textContent = tipTxt; tip.classList.remove('blurb');
  const tb = $('liTipBox'); tb.querySelectorAll('.sizer').forEach((e) => e.remove());
  for (const t of [tipTxt].concat(UNIT_LIST.map((k) => UNIT[k].name + '：' + UNIT[k].blurb + '。'))) { const p = document.createElement('p'); p.className = 'sizer'; p.setAttribute('aria-hidden', 'true'); p.textContent = t; tb.appendChild(p); }
  $('pMap').textContent = P.map > 0 ? '第' + numZh(P.map) + '關・' + base.name : '演武城（六兵）';
  $('pFF').setAttribute('aria-pressed', String(!!P.ff)); $('pFF').textContent = P.ff ? '誤傷：開' : '誤傷：關';
  const cr = $('liCrew'); cr.textContent = ''; cr.classList.add('prac6');
  [[0, P.me, '我方'], [1, P.foe, '敵軍']].forEach(([sd, crew, label]) => {
    const row = document.createElement('div'); row.className = 'grp ' + (sd ? 'foe' : 'me');
    const lb = document.createElement('small'); lb.textContent = label; row.appendChild(lb);
    for (let k = 0; k < n; k++) {
      const type = crew[k], def = UNIT[type], bt = document.createElement('button'); bt.className = 'cu'; bt.dataset.slot = sd + ':' + k; bt.setAttribute('aria-label', label + '第' + numZh(k + 1) + '個：' + def.name + '（點一下換人）');
      bt.appendChild(unitPortrait(type, sd));
      onTap(bt, () => { sfx('click'); pickOpen(sd, k); });
      row.appendChild(bt);
    }
    cr.appendChild(row);
  });
  $('btnGo').disabled = false;
  $('homeCoins').textContent = fmt(SV.coins);
}
// 換人：所有的兵排成一格一格，點一個就換上去。關掉（選好、返回、Esc）之後焦點回到剛才點的那個頭像
function pickBack() {
  const sl = UI.pickSlot; if (!sl) return; UI.pickSlot = null;
  // 等視窗的 inert 解開（MutationObserver 在這之後才跑）再把焦點放回去
  setTimeout(() => { const b = document.querySelector('#liCrew .cu[data-slot="' + sl + '"]'); if (b && G.kbNav && !$('home').inert) b.focus({ preventScroll: true }); }, 0);
}
function pickOpen(sd, k) {
  const P = SV.prac, crew = sd ? P.foe : P.me, grid = $('pickGrid'); grid.textContent = ''; UI.pickSlot = sd + ':' + k;
  $('pickTitle').textContent = (sd ? '敵軍' : '我方') + '第' + numZh(k + 1) + '個兵'; $('pickSub').textContent = '現在是' + UNIT[crew[k]].name + '。點一個換上去';
  $('pickTip').textContent = UNIT[crew[k]].name + '：' + UNIT[crew[k]].blurb + '。';
  UNIT_LIST.forEach((type, i) => {          // 第四篇的新兵（UNIT_OLD 之後）標「新」
    const def = UNIT[type], b = document.createElement('button'); b.className = 'chamfer' + (i >= UNIT_OLD ? ' new' : ''); b.setAttribute('aria-pressed', String(type === crew[k])); b.setAttribute('aria-label', def.name + '：' + def.blurb);
    b.appendChild(unitPortrait(type, sd)); const nm = document.createElement('span'); nm.textContent = def.name; b.appendChild(nm);
    b.addEventListener('pointerenter', () => { $('pickTip').textContent = def.name + '：' + def.blurb + '。'; });
    onTap(b, () => { sfx('click'); crew[k] = type; save(); $('pick').hidden = true; homeRender(); homeDemo(); pickBack(); });
    grid.appendChild(b);
  });
  $('pick').hidden = false;
  setTimeout(() => { const cur = grid.querySelector('button[aria-pressed="true"]'); if (cur && !$('pick').hidden && G.kbNav) cur.focus({ preventScroll: true }); }, 0);          // 用鍵盤的：焦點放在現在這個兵上
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
      onTap(b, () => {
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
  document.querySelectorAll('#gfxSeg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.q === G.gq)));
}
function openOpt(paused) {
  $('optTitle').textContent = paused ? '暫停' : '設定';
  $('pauseBtns').hidden = !paused; $('homeOpts').hidden = paused; $('diffSeg').hidden = paused; $('opt').hidden = false;
  UI.wipeArm = 0; $('btnWipe').textContent = '清除進度';
}
const LOSE_TIPS = [
  '瞄準的虛線會照真的彈道轉彎：碰到冰鏡、噴流、彈簧板、黑洞會跟著拐過去，照著它瞄就好。',
  '別只打屋頂：打斷柱子和牆，上面整層會自己塌下來；每座城分好幾段，一段一段垮。上面的樓閣都塌了、只剩一樓，城防條就歸零：這時候血最多的兵扛起帥旗死守，打倒他（或再打兩輪逼他們投降）就破城。',
  '輪到敵軍的時候按「護罩」，他們那一整輪都打不進來；護罩撐到你下一次瞄準為止。',
  '「連珠」集滿就按下去上膛，這一輪每個兵連打三次；先把彈道對準這一關的機關再放手。',
  '你的城塌到城防條歸零，就輪到你的扛旗兵死守：撐兩輪、趁機把敵城也打垮。紅色的短虛線是敵軍在瞄的方向，瞄到扛旗兵就開護罩。',
  '樓板和木樑是一格一格碎的：打穿兵腳下那一格，他就摔到下一層；把樑的一頭打斷，整根會歪下去，上面的東西跟著滑下來。',
  '戰利品可以在「強化」升級火力、準星、城防、護罩和連珠。'
];
const TIP_EASY = '連輸幾場了？到主畫面的「設定」把難度調成「輕鬆」：敵軍比較不準，也比較不耐打。';
const LOSE_TIPS_LV = [
  ['上一輪的彈道會留一條淡淡的虛線，盡頭打一個叉：照著它微調就好。', '望樓最底下兩隻細腳中間夾著一桶火藥：打中它，腳一斷，上面兩層連人一起倒。望樓倒了城還沒破：後面石砌的主樓也要打掉一大塊，城防條才會歸零。', '讓虛線穿過藍色倍增符再落到敵城，一發變好幾發。', '敵軍也會打你的望樓：紅色的短虛線瞄到你的兵，就按「護罩」擋住那一輪。'],
  ['把砲彈打在山頂右邊一點的坡面上：它會一路滾下坡，越滾越重，撞進敵城一樓的大門（落點越高越痛）。門樓塌了，滾下來的砲彈才滾得到後面的主樓：撞斷一樓的木柱，整棟往前坐下去。', '滾下去的砲彈撞得斷擋滾石的木樁：滾石跟著衝下去。左邊那顆對著你，敵軍也會這樣打。', '每回合的風都不一樣，虛線已經把風算進去了。'],
  ['左邊那面冰鏡亮面朝上：從你這邊吊高打在上面，砲彈被彈成平射，打穿敵城最底層的薄牆、打到裡面的兩個兵。', '冰鏡彈過的砲彈會結霜：炸到的磚變脆，接下來的砲彈打它多六成；直接炸到的兵凍住一輪。', '敵城崖頂的冰棚壓著積雪，外端靠兩根冰柱撐著：火油兵的火一烤就化，冰柱一斷雪就崩下來。'],
  ['讓砲彈穿過正在噴的地火：每一個兵的砲彈都會著火，點得著敵塔頂垂下來的引信頭。', '引信一點著，每一輪砲擊往下燒一段：燒到哪一層的火藥桶就炸哪一層，兩三回合後燒進城腳裡面的地窖火藥庫，塔腳整個垮掉。', '你的塔也一樣：敵軍的火瞄上你的引信頭、火藥庫的那一輪，開護罩。', '紅圈是這一回合結束時落石的位置：火山不認人，敵城也會被砸。'],
  ['噴流往敵城吹的回合，把砲彈打進那條白色氣流帶：被捲住、加速、直直衝過去（威力 ×1.8）。噴流每兩回合換一個高度。', '浮島底下的浮空晶石碎了，那一頭沉一截、繩子吃滿重量；再把那一頭的氣球打破（或被打得一甩），整座島就盪下去。', '防空弩每一輪射下你三發砲彈：先把它打掉，或是多打幾發。'],
  ['仰角壓低、力道加大，平平地打到海面：砲彈會打水漂（一跳 ×1.3），最後撞進敵船的吃水線。', '敵船中艙底下是火藥庫：把中艙的船身打到剩一半，整艙炸開，甲板上的人連樓一起飛，中艙也灌滿水。', '專打同一頭的船艙：那一頭進滿水往下沉，甲板一歪，人就滑進海裡。'],
  ['右邊那排石碑往敵城那邊一塊比一塊高：砸中最靠中間那塊矮的上半截，整排往右倒，最高的那塊砸進敵城。', '敵城的石柱只踩著兩個石墩：打掉朝戰場那一個，整根石柱往前倒（投石兵的大石頭、轟天砲最有用）。', '石柱頂上那棟樓只靠兩根細石頸撐著：打斷一根，整棟樓往那一邊翻下去。'],
  ['砲彈穿過中間的雷雲會帶電，落地引一道雷，雷劈鐵鍊是三倍痛：先把敵寺岩簷頂上的避雷針打斷，不然雷全被它引走。', '下殿的鐵鍊比較細：打斷外側那條，下殿往深谷那一頭歪下去，人就滑出去。上殿的鐵鍊粗得多，最後才垮；上殿掉下去，吊在它底下的下殿跟著掉。', '你的避雷針也要護好：它還在，敵軍的雷就劈不到你的鐵鍊。'],
  ['敵寨岩柱腳下那台木頭絞盤是閘：打斷它，吊籠開始慢慢往下沉，沉到底配重桶升到岩臂，鋼纜一扯就斷。', '閘斷了以後打碎配重桶裡的石頭，吊籠沉得更快；吊籠上面那段鋼纜也打得斷（轟天砲、大石頭）。', '岩臂上的瞭望棚很窄：把它的牆打掉，兵很容易被炸下岩臂。', '峽谷正中間石柱頂上的彈簧板：打下去的砲彈會彈起來（×1.25），從底下打吊籠。'],
  ['穿過中間的稜鏡，一發砲彈分成紅（火）黃（雷）藍（霜）三發扇形散開：吊高、平射各散到不同的樓層。', '共鳴晶柱藏在敵宮石台的地窖裡，前面只隔一扇琉璃窗：打破窗、再重重打中晶柱，每打一次震一次，先震碎頂樓、再震二樓，打碎它整座宮殿的琉璃一起碎；剩下的石頭骨架再打垮，城才算破。', '大廳天花板吊著水晶吊燈，正下方就是一個兵：把天花板打穿，吊燈砸下來。'],
  ['打在大鐘上的力道會累積（鐘兩邊的弧是雙方的鐘鳴）：你那條滿了就「噹」一聲，震波打在敵塔每一塊木頭上。', '敵塔一樓正中間那根紅色的是心柱：它還在，震波大半被它吃掉，只震得裂柱子；先打斷它，鐘鳴一響柱子整排斷、兵還會被震暈。', '一輪打得夠重，大鐘會盪過去撞進敵塔。五重塔整座榫接：柱子斷了、榫頭碎了才會一層層壓下來，上面四層都塌了（只剩一樓）就算破城（守軍全倒也算贏）。'],
  ['魔王每回合會先預告招式：暗黑連射、隕石雨開護罩擋（你的城塌了也會輸）；毀滅光球停在半空，打爆它會掉頭砸回他身上。', '敵城城腳正面的兩顆紫色魔晶：打碎它們，魔王不能回血、結界補不回來、也叫不回魔兵。', '第二階段的黑洞會把砲彈吸過去再甩出來：擦過它、穿過繞著它轉的聖光符，一發變三發（太靠近會被吞）。他放完暗黑連射、隕石雨會累，下一回合打他加倍。'],
  ['潮水四回合一輪：第二回合（之後每四回合）退潮，敵寨的木樁整根露出水面，這時候打木樁、放火最有用；漲潮的時候先打上面的屋子。', '前面望樓腳下那兩根木樁一斷，望樓連人翻進海裡；主屋屋頂上的大水塔打破了，水從頂樓灌下來，把屋裡的兵往前沖。', '大潮那一回合結束時暴潮淹上甲板，退下去把沒有牆、沒有門擋著的兵拖下海：你的門和前牆也要護好（工兵修得好）。'],
  ['敵城風車的四個吊艙各吊在一支帆架的尖端：打斷帆架（火油燒得動），吊艙連人掉下去，城防也掉一截。葉輪每回合轉 45 度，轉到正下方的最好打。', '陣風：砲彈飛到一半風會反過來吹，虛線上的小漩渦就是轉向的地方，照著虛線打就好；龍捲風會把穿過的砲彈往上捲，繞開它或吊高越過去。', '四支帆架和吊艙加起來大約是城防的三分之一：先把帆架都打斷，再打塔身。'],
  ['敵城半腰的鑄造台靠兩條鐵鍊吊著：鏈彈、雷、磁暴打鐵鍊最痛，兩條都斷了，整座台連人掉進岩漿。', '先打斷吊鐵水鍋的鍊子：鐵水鍋砸穿鑄造台的屋頂，鐵水澆在兵身上；鑄造台先掉了，鐵水鍋就只會掉進岩漿裡。', '岩漿每回合漲一截，漲上崖腳的熔爐，鐵地板發紅變軟；火山彈兩邊一樣會落，紅圈是落點，開著護罩擋得住。'],
  ['敵車外側那節車廂只靠一個連結器掛著：鏈彈、轟天砲、雷打它最痛，炸在它旁邊也算。打斷了，整節車廂連人被甩下車。', '火車頭的大鍋爐（圓滾滾的那一截）一打爆，蒸汽炸開整個砲室和砲塔。', '每四回合鑽一次隧道：頂上整片岩頂、兩條軌道中間一道隔牆，砲彈要從隔牆和岩頂中間的縫吊過去（平射打在隔牆上），隧道裡也沒有風。看清楚這一回合路邊擋的是高的還是低的再瞄。'],
  ['頂上是岩頂，吊太高會撞上去：仰角壓低、力道加大，從中間的礦脈上面擦過去。礦脈打得碎，越打越低，敵城上層就露出來了（最底下一排岩心打不碎）。', '敵城頂樓那四根坑木頂著兩塊懸石：打斷靠岩壁那一塊底下的兩根，懸石砸穿頂樓、壓住上層的兵；前面那一塊會把前牆撞開。火油燒得動坑木。', '城是石頭造的，酸蝕得最快；岩壁裡那包發綠光的沼氣一炸，一團火衝進上層那一間。'],
  ['巨獸每回合結束往前走一段，走到城下就每回合踩城：先打護膝甲、再打膝關節，斷一條腿牠就踉蹌一回合（不走，下一回合打牠傷害加倍）。', '巨獸是鐵造的：雷、酸、磁暴打牠最痛；鏈彈打中腳會纏住牠，那一回合只走一半。', '預告噴火、咬人、光束的那一回合開護罩：都擋得住。牠倒地之後胸口的核心露出來，打核心最痛。'],
  ['整座峰頂是一根架在孤峰上的巨樑：每回合結束哪一頭比較重，就往那一頭歪下去一點。把千斤鐵砣丟到敵城那一頭，敵城那一頭越來越重，城跟著斜。', '鉤索手的鉤爪鉤住敵城的磚，下一輪開火前一收繩，整塊扯下來；炸到繩子中段會斷，鉤在高樓的外牆上最好扯。', '樑上的大石球會跟著傾斜滾：滾得快的時候撞到誰都很痛，把它滾向敵城那一頭。'],
  ['石壁通到天上，只能走古門：門上寫著這一回合通到哪裡（敵城前樓、主樓，或是你自己頭上）。通回自己頭上的那一回合別打進門。', '門術師的門珠落在敵城那一半，就在那上空開一道一直都在的門：通回自己頭上的回合改打這道門。', '敵軍的鏡盾兵會把砸在銅鏡上的砲彈彈回來：鏡子挨幾下重的才碎。千斤鐵砣太重，銅鏡彈不開：鏡子底下就丟鐵砣。'],
  ['古藤綁著的磚不會一塊一塊掉：先用迴旋斧砍斷一段古藤（砍中哪一塊，綁在那塊上的全斷），同一輪再把那一段打下來；隔一回合古藤就長回來了。', '火燒斷的古藤不會再長：帶火的砲彈、燒起來的木頭都燒得斷。', '敵軍種在你城上的藤，第三次長的時候會把那一塊勒碎：炸它、砍它，或先打倒敵軍的種藤師。'],
  ['流沙每回合都會把城往下拉：最底下那層的兵最先被埋、不能開火，能打的時候趕快打。', '地道兵的鑽地彈不用打準：落在地上就自己往敵城城腳挖，下一輪從底下炸開，還讓敵城陷得更快。', '敵軍的地道（地上一道隆起的土）還沒挖到你城底下之前，炸在它上面就塌了；鼓樁也打得掉。'],
  ['黑夜裡看不見的地方瞄不準：先讓照明弓手把敵寨照亮（照明箭亮到下一回合結束），再照著亮的地方打。', '你寨子裡的燈籠會照亮你自己（敵軍看得到你）；敵寨的燈還亮著的時候，趁看得到趕快打，燈滅了就只能靠照明箭。', '滑翔奇兵的滑翔翼會自己轉向最亮的地方：先射一支照明箭，滑翔翼就跟著撲過去。'],
  ['天空要塞底下四顆浮空晶石：同一邊碎兩顆，要塞就歪得很兇，上面的東西一路滑下去；全碎了整座掉進雲海。', '主砲充能的那一回合開護罩；打倒最上面的要塞艦長，主砲就停了。', '時砂術士讓你這一輪的砲擊下一輪再打一次：瞄準晶石的那一輪最值得。反重力把磚浮起來就不算城防，下一輪再砸下去。'],
  ['磚組擱得平、擱在城基正上方才站得穩：伸出城外、底下空著的那一截，挨一下就整塊翻下去。', '城疊得越高兵越多，可是也越容易被壓頂石壓歪：先疊寬、再疊高。', '壓頂石打在敵城疊得最高、最歪的那一邊，大石板一壓，上面的整截就倒了；固樑匠鉚過的磚比較不容易散。'],
  ['先灌油、再點火：油壺兵把火油灌進敵城，等它流到兵站的那一層，再用煉金師的火藥水一點。', '泡在水裡的兵怕雷：水甕兵灌水之後，等煉金師抽到雷藥水（黃色）再打，整片一起電暈。', '別打破自己的熔爐：岩漿流下去會點著你一樓的火油桶。敵軍灌進來的油，可以用冰藥水把水凍住擋一下，或用水把火澆熄。'],
  ['紅色虛線落在你城上的那幾個敵兵最要緊：先把他們打倒，那幾發就不會來。', '推擊手把預告好的敵兵推開，他會照原本的角度從新的位置打：推到城的邊上、推下城，紅線就跟著偏掉。', '敵軍的齒輪砲台每一輪都會轟你：打它齒輪的上緣讓砲口往上抬，抬過頭就砸它自己的城。轉向術士炸到敵軍的砲台一次抬兩格，炸到自己的砲台把它轉回原位。'],
  ['太空裡重力小，砲彈飛得又平又遠；經過中間的衛星會被吸彎（太靠近就撞上去），虛線已經把它算進去了。', '推進兵的砲彈飛到一半，點一下畫面就往前猛衝：本來打不到的落點，加速一下就到了。', '引力錨釘在敵城上會把附近的磚往它那邊吸，整片城歪掉、垮下來；拖網網到的磚和兵會被拖出城外，掉進太空。'],
  ['你的攻城車要撐過三座城：前哨別打太久，留著力氣；挑卡的時候城防低就選「整修攻城車」，兵倒了就選「援軍」。', '衝車兵的撞木瞄敵城前面的地上就好：它會沿著地面滾過去，撞城腳上面那一塊，城牆、門樓最怕它。', '敵軍的變材術士會把你的石頭、鐵變成木頭，他們的火油兵接著就燒：挑「包鐵」把木頭全部包上鐵皮。'],
  ['魔君每回合先預告他的砲擊（紅線、紅圈）：鏡影兵把鏡子擺在紅線經過的路上，砲彈就彈回他的城。', '天秤舉起來的那一回合，結束前開護罩：天秤審判會把兩邊的城防拉成一樣，你的城比他好就會被削掉一截。', '乾坤倒轉預告的那一回合開護罩：整個世界上下顛倒一下，沒罩住的城整片飛起來再摔下去。']
];
function showResult(won, st) {
  const prac = !!(S.lv && S.lv.practice);
  $('resTitle').textContent = won ? (!prac && LEVELS[st.idx] && LEVELS[st.idx].boss ? '魔王伏誅' : !prac && LEVELS[st.idx] && LEVELS[st.idx].beast ? '巨獸倒下' : !prac && LEVELS[st.idx] && LEVELS[st.idx].aerie ? '天空要塞墜落' : '敵城攻破') : '城樓失守';
  $('resTitle').className = won ? '' : 'lose';
  $('resSub').textContent = prac ? S.lv.name + '（試打，不算星星）' : '第' + numZh(st.idx + 1) + '關 ' + LEVELS[st.idx].name;
  const stars = $('resStars'); stars.hidden = !won || prac;
  const run = ++UI.resRun;
  [...stars.children].forEach((s, i) => { s.className = ''; if (won && i < st.stars) setTimeout(() => { if (UI.resRun === run && !$('result').hidden) { s.className = 'on'; sfx('star', i); } }, 350 + i * 320); });
  $('rsBar').textContent = Math.round(st.bar * 100) + '%'; $('rsRounds').textContent = String(st.rounds);
  $('rsChain').textContent = st.chain ? st.chain + ' 塊' : '—'; // 有倍增符、稜鏡的關：一發最多分成幾發；其他關：最強的一發放大到幾倍（滾地、打水漂、噴流、彈簧板…）
  if (st.swarm > 1) { $('rsSwarmT').textContent = '一發最多變成'; $('rsSwarm').textContent = fmt(st.swarm) + ' 發'; } else if (st.amp > 1.05 || !(st.hit >= 1)) { $('rsSwarmT').textContent = '最強的一發'; $('rsSwarm').textContent = st.amp > 1.05 ? '×' + st.amp.toFixed(1) : '—'; } else { $('rsSwarmT').textContent = '最重的一擊'; $('rsSwarm').textContent = fmt(Math.round(st.hit)); }          // 沒有放大機關的關卡（第三篇）：改成一炸打掉城樓多少
  $('rsCoins').textContent = '+' + fmt(st.coins); $('rsCoins').parentElement.hidden = prac;          // 演武場不給金幣：整行藏起來
  const tip = $('resTip'), own = (!prac && LOSE_TIPS_LV[st.idx]) || [], tips = Math.random() < 0.7 && own.length ? own : LOSE_TIPS;      // 多半講這一關自己的訣竅
  if (prac) { tip.hidden = false; tip.textContent = '演武場隨時都能再來：點主畫面上的頭像換兵、換戰場。'; }
  else if (won) { tip.hidden = st.stars >= 3; if (st.stars < 3) tip.textContent = st.lost ? '三顆星：一個兵都不能倒，城防還要剩一半以上。' : '三顆星：城防要剩一半以上。'; }
  else { tip.hidden = false; tip.textContent = st.streak >= 3 && SV.diff > 0 && st.streak % 2 === 1 ? TIP_EASY : tips[(Math.random() * tips.length) | 0]; }        // 同一關連輸三場、五場…：提醒可以調難度
  const next = won && !prac && st.idx < LEVELS.length - 1;
  if (won && !prac && st.idx === LEVELS.length - 1 && LEVELS.length < LEVEL_MAX) { tip.hidden = false; tip.textContent = '第' + numZh(LEVELS.length + 1) + '到' + numZh(LEVEL_MAX) + '關還在做，做好了會出現在第五篇的分頁。先到演武場，用' + numZh(UNIT_LIST.length) + '種兵試打吧。'; }
  else if (won && !prac && st.idx === LEVEL_MAX - 1) { tip.hidden = false; tip.textContent = numZh(LEVEL_MAX) + '關全破！想拿滿三顆星可以再來一次，也可以到演武場用' + numZh(UNIT_LIST.length) + '種兵試打各關的城。'; }          // 打完最後一關          // 打完目前最後一關：沒有「下一關」，講一聲後面的還在做
  $('btnNext').hidden = !next; $('resBtns').className = 'stack ' + (next ? 'three' : 'two');         // 沒有「下一關」的時候兩顆按鈕各佔一半
  $('btnAgain').firstChild.textContent = won ? '再玩一次' : '再戰';
  $('btnAgain').className = 'btn' + (next ? '' : ' btn-gold');
  UI.resAt = performance.now();                                    // 剛跳出來的那一下不收點擊（玩家可能正在點畫面想跳過垮城的演出）
  $('result').hidden = false;
}

// 兵的圓形頭像（資訊列、主畫面的關卡卡片共用）
function unitPortrait(type, sd) {
  const def = UNIT[type], cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d'); c.scale(96 / 64, 96 / 64); c.lineJoin = 'round'; c.lineCap = 'round';
  if (sd === 1) { c.translate(64, 0); c.scale(-1, 1); }
  c.translate(0, def.big ? 12 : 7);                            // 帽子、角畫在格子上緣外面：往下挪才不會被切掉
  (UNIT_ART[type] || UNIT_ART.rocket)(c, sd, TEAM_PAL[sd]);
  return cv;
}
/* ---------- 戰鬥中的資訊列 ---------- */
const HUD = { a: -1, b: -1, crew: [[], []], ult: -1, sh: -1, wind: 99, deg: -1, pow: -1, mile: 0, n: 0, turn: '', round: -1, fire: -1 };
const MILES = [[30, '彈如雨下'], [70, '百砲齊發'], [150, '遮天蔽日'], [300, '千砲破城']];
function hudBuild() {
  for (let sd = 0; sd < 2; sd++) {
    const box = $(sd ? 'crewB' : 'crewA'); box.textContent = ''; HUD.crew[sd] = []; box.classList.toggle('many', S.team[sd].units.length > 4);          // 六個兵：頭像小一號
    for (const u of S.team[sd].units) {
      const el = document.createElement('span'); el.className = 'cu'; el.title = u.def.name;
      el.appendChild(unitPortrait(u.type, sd)); box.appendChild(el); HUD.crew[sd].push({ el, u, st: '' });
    }
  }
  // 魔王城：城防條上標出換階段的位置
  const hb = $('hpB'); hb.querySelectorAll('.tick').forEach((e) => e.remove());
  const bossDef = S.lv.boss || S.lv.beast; if (bossDef) for (const p of [bossDef.p2, bossDef.p3]) { const t = document.createElement('span'); t.className = 'tick'; t.style.right = (p * 100) + '%'; hb.appendChild(t); }          // 魔王、機關巨獸：城防條上標出換階段的位置
  $('foeLbl').textContent = S.lv.boss ? '魔王' : S.lv.beast ? '機關巨獸' : S.lv.aerie ? '天空要塞' : '敵城';
  $('windBox').hidden = !S.lv.wind; $('gustTxt').hidden = true; $('hud').classList.remove('gusty');
  HUD.a = HUD.b = -1; HUD.ult = HUD.sh = -1; HUD.wind = 99; HUD.deg = HUD.pow = -1; HUD.mile = 0; HUD.turn = ''; HUD.round = -1; HUD.fire = -1; HUD.boost = null;
  $('turnChip').hidden = true;                                       // 上一局留下來的「輪到你」不能帶進新的一局
}
function foeBar() { return teamBar(1); }
// 角落的按鈕（發射、仰角力道、護罩、連珠）在畫布上佔哪裡。用版面座標算（舞台轉了 90 度也一樣）
function hudAvoid() {
  const stage = $('stage'), k = V.W / (stage.offsetWidth || 1), out = [];
  for (const id of ['btnFire', 'aimInfo', 'btnShield', 'btnUlt', 'turnChip']) {
    const el = $(id); if (!el || !el.offsetWidth) continue;
    let x = 0, y = 0; for (let e = el; e && e !== stage; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    out.push([x * k - 4, y * k - 4, (x + el.offsetWidth) * k + 4, (y + el.offsetHeight) * k + 4]);
  }
  RD.avoid = out;
}
function hudUpdate() {
  if ((HUD.n++ & 63) === 0) hudAvoid();
  const a = Math.round(teamBar(0) * 100), b = Math.round(foeBar() * 100);
  // 帥旗死守：城防條歸零了，改寫「死守」和對方還剩幾輪（打倒扛旗的兵就破城，撐過這幾輪殘兵投降）
  const fl = (s) => { const F = S.flags && S.flags[s]; return F && F.u.alive ? '死守 ' + Math.max(0, FLAG_VOL - (S.team[1 - s].volleys - F.v0)) : ''; }, la = fl(0), lb = fl(1);
  if (a !== HUD.a || la !== HUD.la) { if (HUD.a >= 0 && a < HUD.a) replayFlash($('hpA')); HUD.a = a; HUD.la = la; $('pctA').textContent = la || a + '%'; $('barA').style.transform = 'scaleX(' + (a / 100) + ')'; }
  if (b !== HUD.b || lb !== HUD.lb) { if (HUD.b >= 0 && b < HUD.b) replayFlash($('hpB')); HUD.b = b; HUD.lb = lb; $('pctB').textContent = lb || b + '%'; $('barB').style.transform = 'scaleX(' + (b / 100) + ')'; }
  // 輪到誰
  const play = S.state === 'play', bld = play && S.phase === 'build' && S.turn === 0 && S.build && S.build.st === 'move', mine = (play && S.phase === 'aim' && S.turn === 0) || bld;
  // 敵軍瞄準的彈道會穿過倍增符：先講，讓玩家來得及開護罩
  const eA = S.team[1].ai, em = play && S.phase === 'aim' && S.turn === 1 && eA && eA.st === 2 && eA.warn >= 2 ? Math.round(eA.warn) : 0;
  // 回合結束的環境變化（第三篇）：暴潮、漲潮、退潮
  const E = S.env, envT = S.phase === 'hazard' && E ? (E.surge ? 'surge' : E.tideA ? (S.water && S.water.lava ? 'lava' : E.tideA.to > E.tideA.from ? 'up' : 'down') : S.pass && S.pass.anim ? 'pass' : S.saw && S.saw.rot ? 'saw' : '') : '';
  const bt = S.phase === 'build' && S.build ? (S.build.st === 'move' ? (S.turn === 0 && !S.team[0].ai ? ':' + Math.max(0, Math.ceil(S.stack.C.time - S.build.t)) : '') : ':f') : '';          // 築城：還剩幾秒（時間到就照現在的位置放下）、落下中
  const tk = !play || S.phase === 'intro' || (S.phase === 'hazard' && !S.hz && !envT) ? '' : S.phase === 'hazard' ? (envT ? 'e' + envT : 'hz') : S.phase + S.turn + bt + (S.team[S.turn].ult.armed ? 'u' : '') + (em ? 'm' + em : '');
  if (tk !== HUD.turn) {
    HUD.turn = tk; const el = $('turnChip');
    if (!tk) el.hidden = true;
    else {
      el.hidden = false;
      el.className = 'chamfer ' + (tk === 'hz' || envT ? 'hz' : S.turn === 0 ? 'me' : 'foe') + (mine ? ' go' : '') + (S.turn === 1 && S.phase === 'aim' && (em || S.team[1].ult.armed) ? ' warn' : '');
      el.textContent = envT ? (envT === 'surge' ? '暴潮！' : envT === 'lava' ? '岩漿上漲' : envT === 'pass' ? (S.pass.kind === 'tunnel' ? '進隧道' : S.pass.outKind === 'tunnel' ? '出隧道' : '路邊換景') : envT === 'saw' ? '天秤傾斜' : envT === 'up' ? '漲潮' : '退潮') : tk === 'hz' ? (S.lv.rocks && S.lv.rocks.sym ? '火山彈！' : '落石！') : S.phase === 'cards' ? '攻下了！挑一張卡' : S.phase === 'advance' ? '攻城車推進中…' : S.phase === 'build' ? (bt === ':f' ? '磚組落下中…' : S.turn === 0 ? '築城：左右拖、點一下轉向、按「放下」' + (bt ? '（' + bt.slice(1) + '）' : '') : '敵軍築城中') : S.phase === 'aim' ? (S.turn === 0 ? '輪到你：拖曳瞄準，放開發射' : S.team[1].ult.armed ? '敵軍連珠砲上膛！' : em ? '敵軍的砲彈會穿過' + (S.lv.boss ? '聖光符' : '倍增符') + '：×' + em + '！' : '敵軍瞄準中') : (S.turn === 0 ? '我方砲擊' : '敵軍砲擊');
    }
  }
  const fk = (mine ? 1 : 0) + (bld ? 2 : 0); if (fk !== HUD.fire) { HUD.fire = fk; const bf = $('btnFire'); bf.classList.toggle('ready', !!mine); bf.classList.toggle('btn-gold', !!mine); bf.firstElementChild.textContent = bld ? '放下' : '發射'; bf.setAttribute('aria-label', bld ? '放下磚組' : '發射'); }
  const sawK = S.saw ? Math.round(sawAngle() * 180 / Math.PI) : S.aerie ? aerieLifts() * 2 + (S.aerie.charge ? 1 : 0) : S.sand ? Math.round((sandDepth(0) + sandDepth(1) * 100) * 10) : 0;          // 天秤歪的角度、要塞的晶石和主砲、流沙陷的深度變了也要重寫
  if (S.round !== HUD.round || sawK !== HUD.sawK) { HUD.round = S.round; HUD.sawK = sawK; $('roundTxt').textContent = S.siege ? '第' + numZh(S.siege.stage + 1) + '座・' + siegeName(S.siege.stage) + (S.round > 0 ? '・第' + S.round + '回合' : '') : S.round > 0 ? (S.lv.tide || S.lv.pass || S.saw || S.lv.arches || S.sand || S.aerie || S.lv.night ? '第' + S.round + '回合' : '第 ' + S.round + ' 回合') + (S.lv.tide ? '・' + TIDE_NAME[tideNow()] : S.pass && S.pass.kind === 'tunnel' ? '・隧道' : S.saw ? '・' + sawTxt() : S.lv.arches ? '・古門通往' + ARCH_NAME[archNext(S.round)] : S.sand ? '・陷沙 我' + sandDepth(0).toFixed(1) + '／敵' + sandDepth(1).toFixed(1) + '公尺' : S.aerie ? '・浮空晶石 ' + aerieLifts() + '／4' + (S.aerie.charge ? '・主砲充能' : '') : S.lv.night ? '・無月' : '') : ''; }
  if ((HUD.n & 3) !== 0) return;
  for (let sd = 0; sd < 2; sd++) for (const k of HUD.crew[sd]) { const st = k.u.reserve ? 'wait' : !k.u.alive ? 'dead' : k.u.frozen > 0 ? 'frozen' : k.u.stun > 0 ? 'stun' : ''; if (st !== k.st) { k.st = st; k.el.className = 'cu' + (st ? ' ' + st : ''); } }
  const T = S.team[0], bu = $('btnUlt'), bs = $('btnShield');
  const up = clamp(T.ult.c / T.ult.need, 0, 1), armed = T.ult.armed, uk = Math.round(up * 100) + (armed ? 1000 : 0);
  if (uk !== HUD.ult) { HUD.ult = uk; bu.style.setProperty('--p', armed ? '1' : up.toFixed(3)); bu.classList.toggle('ready', up >= 1 && !armed); bu.classList.toggle('on', armed); $('ultNum').textContent = armed ? '已上膛' : up >= 1 ? '可用' : Math.floor(up * 100) + '%'; }
  // 兵比敵軍少：連珠集氣加快（按鈕上掛一個「逆轉」的小牌子）
  const boost = S.state === 'play' && ultK(0) > 1; if (boost !== HUD.boost) { HUD.boost = boost; bu.classList.toggle('boost', boost); }
  const sp = clamp(T.shield.c / T.shield.need, 0, 1), son = T.shield.on, sk = Math.round(sp * 100) + (son ? 1000 : 0);
  if (sk !== HUD.sh) { HUD.sh = sk; bs.style.setProperty('--p', son ? '1' : sp.toFixed(3)); bs.classList.toggle('ready', sp >= 1 && !son); bs.classList.toggle('on', son); $('shNum').textContent = son ? '展開中' : sp >= 1 ? '可用' : Math.floor(sp * 100) + '%'; }
  if (S.lv.wind) {
    const w = S.wind, G = S.gust, wk = w + (G ? '|' + G.t + ':' + G.w : '');
    // 陣風（第十四關）：回合、風的下面多一行「飛幾秒後反過來、變多強」
    if (wk !== HUD.wind) { HUD.wind = wk; const box = $('windBox'), m = Math.abs(w); box.classList.toggle('calm', m < 1); $('windTxt').textContent = m < 1 ? '無風' : '風 ' + m; const gt = $('gustTxt'); gt.hidden = !G; $('hud').classList.toggle('gusty', !!G); if (G) gt.textContent = '陣風：飛 ' + G.t + ' 秒後' + (G.w < 0 ? '←' : '→') + Math.abs(G.w); $('windArr').style.transform = 'scaleX(' + (w < 0 ? -1 : 1) * (0.55 + Math.min(1, m / 12) * 0.6) + ')'; }
  }
  const ang = Math.round(Math.atan2(T.aim[1], T.aim[0]) * 180 / Math.PI), pw = Math.round((Math.hypot(T.aim[0], T.aim[1]) - VMIN) / (VMAX - VMIN) * 100);
  if (ang !== HUD.deg) { HUD.deg = ang; $('aimDeg').textContent = ang; }
  if (pw !== HUD.pow) { HUD.pow = pw; $('aimPow').textContent = pw; }
  while (HUD.mile < MILES.length && S.stat.peak >= MILES[HUD.mile][0]) { mile(MILES[HUD.mile][1]); HUD.mile++; }
}
const TIDE_NAME = ['退潮', '漲潮', '大潮', '落潮'];
// 第十九關：巨樑往哪邊歪、歪幾度（正的角度是我方那頭沉下去）
function sawTxt() { const d = Math.round(sawAngle() * 180 / Math.PI); return Math.abs(d) < 1 ? '天秤持平' : (d > 0 ? '我方沉' : '敵方沉') + Math.abs(d) + '°'; }          // 第十三關：這一回合的潮（大潮那一回合結束時有暴潮）
function replayFlash(el) { el.classList.add('hit'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('hit'), 90); }
