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
      if (Array.isArray(s.stars)) {
        // 舊版（六關）的存檔：第六關魔王城現在是第十二關，星星搬過去；中間新加的第六到十一關從頭打
        if (s.stars.length === 6 && LEVELS.length === 12) { const st = s.stars.slice(); st[11] = st[5]; st[5] = 0; s.stars = st; }
        for (let i = 0; i < LEVELS.length; i++) SV.stars[i] = int(s.stars[i], 0, 3);
      }
      if (s.up && typeof s.up === 'object') { for (const k in SV.up) SV.up[k] = int(s.up[k], 0, 5); if (s.up.aim === undefined && s.up.rate) SV.up.aim = int(s.up.rate, 0, 5); }      // 舊版的「裝填」改成「準星」
      SV.sfx = s.sfx !== false; SV.mus = s.mus !== false; SV.vib = s.vib !== false; SV.seen = !!s.seen; SV.seenUlt = !!s.seenUlt; SV.seenSh = !!s.seenSh; SV.flip = !!s.flip;
      SV.diff = s.diff === 0 || s.diff === 2 ? s.diff : 1;
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
const UI = { sel: 0, chap: 0, wipeArm: 0, resRun: 0, resAt: -1e9 };
const CHAP = 6;                                          // 一篇幾關
const CHAPS = ['第一篇', '第二篇'];
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
function chapGo(k) {
  if (UI.chap === k) return;
  sfx('click'); UI.chap = k;
  const a = k * CHAP, b = Math.min(LEVELS.length, a + CHAP);
  UI.sel = clamp(SV.open - 1, a, b - 1);
  homeRender(); if (typeof demoStart === 'function') demoStart(UI.sel);
}
function homeRender() {
  const box = $('lvls'); box.textContent = '';
  UI.chap = Math.floor(UI.sel / CHAP);
  // 兩篇各一個分頁：一次只列一篇的六關（十二關排成一長條放不下）
  const tabs = $('chaps'); tabs.textContent = '';
  CHAPS.forEach((nm, k) => {
    if (k * CHAP >= LEVELS.length) return;
    const t = document.createElement('button'), lock = k * CHAP >= SV.open;
    t.className = 'chap chamfer' + (lock ? ' locked' : ''); t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', String(k === UI.chap));
    t.innerHTML = '<span>' + nm + '</span><small>' + (k * CHAP + 1) + '–' + Math.min(LEVELS.length, (k + 1) * CHAP) + '</small>';
    t.tabIndex = k === UI.chap ? 0 : -1;
    onTap(t, () => { chapGo(k); const nt = $('chaps').children[k]; if (nt) nt.focus({ preventScroll: true }); });
    // 方向鍵換篇（分頁的慣例）
    t.addEventListener('keydown', (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); const n = Math.ceil(LEVELS.length / CHAP), k2 = (k + (e.key === 'ArrowRight' ? 1 : n - 1)) % n; chapGo(k2); const nt = $('chaps').children[k2]; if (nt) nt.focus({ preventScroll: true }); });
    tabs.appendChild(t);
  });
  LEVELS.forEach((lv, i) => {
    if (Math.floor(i / CHAP) !== UI.chap) return;
    const b = document.createElement('button'), locked = i >= SV.open;
    // 還沒解鎖、可是有星星的（舊版存檔打過的魔王城搬到第十二關）：星星照樣顯示，不畫鎖頭
    b.className = 'lv chamfer' + (locked ? ' locked' : '') + (locked && SV.stars[i] > 0 ? ' had' : ''); b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(i === UI.sel));
    b.setAttribute('aria-label', '第' + numZh(i + 1) + '關 ' + lv.name + (locked ? '（未解鎖）' : ''));
    const n = document.createElement('b'); n.textContent = String(i + 1);
    const nm = document.createElement('strong'); nm.textContent = lv.name;
    const st = document.createElement('span'); st.className = 'stars'; st.innerHTML = starsHtml(SV.stars[i]);
    b.appendChild(n); b.appendChild(nm); b.appendChild(st);
    onTap(b, () => {
      sfx('click'); if (UI.sel === i) return; UI.sel = i; homeRender(); if (typeof demoStart === 'function') demoStart(i);
      const nb = $('lvls').children[i % CHAP]; if (nb) nb.focus({ preventScroll: true });      // 清單重畫過了，把焦點放回同一關（用鍵盤選關才不會跳掉）
    });
    box.appendChild(b);
  });
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
  const cr = $('liCrew'); cr.textContent = ''; let picked = null;
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
}
function openOpt(paused) {
  $('optTitle').textContent = paused ? '暫停' : '設定';
  $('pauseBtns').hidden = !paused; $('homeOpts').hidden = paused; $('diffSeg').hidden = paused; $('opt').hidden = false;
  UI.wipeArm = 0; $('btnWipe').textContent = '清除進度';
}
const LOSE_TIPS = [
  '瞄準的虛線會照真的彈道轉彎：碰到冰鏡、噴流、彈簧板、黑洞會跟著拐過去，照著它瞄就好。',
  '別只打屋頂：打斷柱子和牆，上面整層會自己塌下來；每一關城的下半部都藏著要害。',
  '輪到敵軍的時候按「護罩」，他們那一整輪都打不進來；護罩撐到你下一次瞄準為止。',
  '「連珠」集滿就按下去上膛，這一輪每個兵連打三次；先把彈道對準這一關的機關再放手。',
  '兵全倒就輸了：紅色的短虛線是敵軍在瞄的方向，瞄到你的兵就開護罩。',
  '樓板和木樑是一格一格碎的：打穿兵腳下那一格，他就摔到下一層；把樑的一頭打斷，整根會歪下去，上面的東西跟著滑下來。',
  '戰利品可以在「強化」升級火力、準星、城防、護罩和連珠。'
];
const TIP_EASY = '連輸幾場了？到主畫面的「設定」把難度調成「輕鬆」：敵軍比較不準，也比較不耐打。';
const LOSE_TIPS_LV = [
  ['上一輪的彈道會留一條淡淡的虛線，盡頭打一個叉：照著它微調就好。', '望樓最底下兩隻細腳中間夾著一桶火藥：打中它，腳一斷，上面兩層連人一起倒。', '讓虛線穿過藍色倍增符再落到敵城，一發變好幾發。', '敵軍也會打你的望樓：紅色的短虛線瞄到你的兵，就按「護罩」擋住那一輪。'],
  ['把砲彈打在山頂右邊一點的坡面上：它會一路滾下坡，越滾越重，撞進敵城一樓的大門（落點越高越痛）。', '滾下去的砲彈撞得斷擋滾石的木樁：滾石跟著衝下去。左邊那顆對著你，敵軍也會這樣打。', '每回合的風都不一樣，虛線已經把風算進去了。'],
  ['左邊那面冰鏡亮面朝上：從你這邊吊高打在上面，砲彈被彈成平射，打穿敵城最底層的薄牆、打到裡面的兩個兵。', '冰鏡彈過的砲彈會結霜：炸到的磚變脆，接下來的砲彈打它多六成；直接炸到的兵凍住一輪。', '敵城崖頂的冰棚壓著積雪，外端靠兩根冰柱撐著：火油兵的火一烤就化，冰柱一斷雪就崩下來。'],
  ['讓砲彈穿過正在噴的地火：每一個兵的砲彈都會著火，點得著敵塔頂垂下來的引信頭。', '敵塔城腳正面露出地窖火藥庫的大桶：著了火的砲彈直接打中它，整排一起炸，塔腳整個垮掉。', '你的塔也一樣：敵軍的火瞄上你的引信頭、火藥庫的那一輪，開護罩。', '紅圈是這一回合結束時落石的位置：火山不認人，敵城也會被砸。'],
  ['噴流往敵城吹的回合，把砲彈打進那條白色氣流帶：被捲住、加速、直直衝過去（威力 ×1.8）。噴流每兩回合換一個高度。', '浮島底下的浮空晶石碎了，那一頭沉一截、繩子吃滿重量；再把那一頭的氣球打破（或被打得一甩），整座島就盪下去。', '防空弩每一輪射下你三發砲彈：先把它打掉，或是多打幾發。'],
  ['仰角壓低、力道加大，平平地打到海面：砲彈會打水漂（一跳 ×1.3），最後撞進敵船的吃水線。', '敵船中艙底下是火藥庫：把中艙的船身打到剩一半，整艙炸開，甲板上的人連樓一起飛，中艙也灌滿水。', '專打同一頭的船艙：那一頭進滿水往下沉，甲板一歪，人就滑進海裡。'],
  ['右邊那排石碑往敵城那邊一塊比一塊高：砸中最靠中間那塊矮的上半截，整排往右倒，最高的那塊砸進敵城。', '敵城的石柱只踩著兩個石墩：打掉朝戰場那一個，整根石柱往前倒（投石兵的大石頭、轟天砲最有用）。', '石柱頂上那棟樓只靠兩根細石頸撐著：打斷一根，整棟樓往那一邊翻下去。'],
  ['砲彈穿過中間的雷雲會帶電，落地引一道雷，雷劈鐵鍊是三倍痛：先把敵寺岩簷頂上的避雷針打斷，不然雷全被它引走。', '打斷殿外側那條鐵鍊，整間殿往深谷那一頭歪下去，人就滑出去；上殿掉下去，吊在它底下的下殿跟著掉。', '你的避雷針也要護好：它還在，敵軍的雷就劈不到你的鐵鍊。'],
  ['敵寨岩柱腳下那台木頭絞盤是閘：打斷它，吊籠開始慢慢往下沉，沉到底配重桶升到岩臂，鋼纜一扯就斷。', '閘斷了以後打碎配重桶裡的石頭，吊籠沉得更快；吊籠上面那段鋼纜也打得斷（轟天砲、大石頭）。', '岩臂上的瞭望棚很窄：把它的牆打掉，兵很容易被炸下岩臂。', '峽谷正中間石柱頂上的彈簧板：打下去的砲彈會彈起來（×1.25），從底下打吊籠。'],
  ['穿過中間的稜鏡，一發砲彈分成紅（火）黃（雷）藍（霜）三發扇形散開：吊高、平射各散到不同的樓層。', '共鳴晶柱藏在敵宮石台的地窖裡，前面只隔一扇琉璃窗：打破窗、再打中晶柱（轟天砲一發、或火箭五六發），整座宮殿震碎。', '大廳天花板吊著水晶吊燈，正下方就是一個兵：把天花板打穿，吊燈砸下來。'],
  ['打在大鐘上的力道會累積（鐘兩邊的弧是雙方的鐘鳴）：你那條滿了就「噹」一聲，震波打在敵塔每一塊木頭上。', '敵塔一樓正中間那根紅色的是心柱：它還在，震波大半被它吃掉，只震得裂柱子；先打斷它，鐘鳴一響柱子整排斷、兵還會被震暈。', '一輪打得夠重，大鐘會盪過去撞進敵塔；每一層只有兩根柱子，斷一根上面一層層壓下來。'],
  ['魔王每回合會先預告招式：暗黑連射、隕石雨開護罩擋；毀滅光球停在半空，打爆它會掉頭砸回他身上。', '敵城城腳正面的兩顆紫色魔晶：打碎它們，魔王不能回血、結界補不回來、也叫不回魔兵。', '第二階段的黑洞會把砲彈吸過去再甩出來：擦過它、穿過繞著它轉的聖光符，一發變三發（太靠近會被吞）。他放完隕石雨會累，下一回合打他加倍。']
];
function showResult(won, st) {
  $('resTitle').textContent = won ? (st.idx === LEVELS.length - 1 ? '魔王伏誅' : '敵城攻破') : '城樓失守';
  $('resTitle').className = won ? '' : 'lose';
  $('resSub').textContent = '第' + numZh(st.idx + 1) + '關 ' + LEVELS[st.idx].name;
  const stars = $('resStars'); stars.hidden = !won;
  const run = ++UI.resRun;
  [...stars.children].forEach((s, i) => { s.className = ''; if (won && i < st.stars) setTimeout(() => { if (UI.resRun === run && !$('result').hidden) { s.className = 'on'; sfx('star', i); } }, 350 + i * 320); });
  $('rsBar').textContent = Math.round(st.bar * 100) + '%'; $('rsRounds').textContent = String(st.rounds);
  $('rsChain').textContent = st.chain ? st.chain + ' 塊' : '—'; // 有倍增符、稜鏡的關：一發最多分成幾發；其他關：最強的一發放大到幾倍（滾地、打水漂、噴流、彈簧板…）
  if (st.swarm > 1) { $('rsSwarmT').textContent = '一發最多變成'; $('rsSwarm').textContent = fmt(st.swarm) + ' 發'; } else { $('rsSwarmT').textContent = '最強的一發'; $('rsSwarm').textContent = st.amp > 1.05 ? '×' + st.amp.toFixed(1) : '—'; }
  $('rsCoins').textContent = '+' + fmt(st.coins);
  const tip = $('resTip'), own = LOSE_TIPS_LV[st.idx] || [], tips = Math.random() < 0.7 && own.length ? own : LOSE_TIPS;      // 多半講這一關自己的訣竅
  if (won) { tip.hidden = st.stars >= 3; if (st.stars < 3) tip.textContent = st.lost ? '三顆星：一個兵都不能倒，城防還要剩六成以上。' : '三顆星：城防要剩六成以上。'; }
  else { tip.hidden = false; tip.textContent = st.streak >= 3 && SV.diff > 0 && st.streak % 2 === 1 ? TIP_EASY : tips[(Math.random() * tips.length) | 0]; }        // 同一關連輸三場、五場…：提醒可以調難度
  const next = won && st.idx < LEVELS.length - 1;
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
    const box = $(sd ? 'crewB' : 'crewA'); box.textContent = ''; HUD.crew[sd] = [];
    for (const u of S.team[sd].units) {
      const el = document.createElement('span'); el.className = 'cu'; el.title = u.def.name;
      el.appendChild(unitPortrait(u.type, sd)); box.appendChild(el); HUD.crew[sd].push({ el, u, st: '' });
    }
  }
  // 魔王城：城防條上標出換階段的位置
  const hb = $('hpB'); hb.querySelectorAll('.tick').forEach((e) => e.remove());
  if (S.lv.boss) for (const p of [S.lv.boss.p2, S.lv.boss.p3]) { const t = document.createElement('span'); t.className = 'tick'; t.style.right = (p * 100) + '%'; hb.appendChild(t); }
  $('foeLbl').textContent = S.lv.boss ? '魔王' : '敵城';
  $('windBox').hidden = !S.lv.wind;
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
  if (a !== HUD.a) { if (HUD.a >= 0 && a < HUD.a) replayFlash($('hpA')); HUD.a = a; $('pctA').textContent = a + '%'; $('barA').style.transform = 'scaleX(' + (a / 100) + ')'; }
  if (b !== HUD.b) { if (HUD.b >= 0 && b < HUD.b) replayFlash($('hpB')); HUD.b = b; $('pctB').textContent = b + '%'; $('barB').style.transform = 'scaleX(' + (b / 100) + ')'; }
  // 輪到誰
  const play = S.state === 'play', mine = play && S.phase === 'aim' && S.turn === 0;
  // 敵軍瞄準的彈道會穿過倍增符：先講，讓玩家來得及開護罩
  const eA = S.team[1].ai, em = play && S.phase === 'aim' && S.turn === 1 && eA && eA.st === 2 && eA.warn >= 2 ? Math.round(eA.warn) : 0;
  const tk = !play || S.phase === 'intro' || (S.phase === 'hazard' && !S.hz) ? '' : S.phase === 'hazard' ? 'hz' : S.phase + S.turn + (S.team[S.turn].ult.armed ? 'u' : '') + (em ? 'm' + em : '');
  if (tk !== HUD.turn) {
    HUD.turn = tk; const el = $('turnChip');
    if (!tk) el.hidden = true;
    else {
      el.hidden = false;
      el.className = 'chamfer ' + (tk === 'hz' ? 'hz' : S.turn === 0 ? 'me' : 'foe') + (mine ? ' go' : '') + (S.turn === 1 && S.phase === 'aim' && (em || S.team[1].ult.armed) ? ' warn' : '');
      el.textContent = tk === 'hz' ? '落石！' : S.phase === 'aim' ? (S.turn === 0 ? '輪到你：拖曳瞄準，放開發射' : S.team[1].ult.armed ? '敵軍連珠砲上膛！' : em ? '敵軍的砲彈會穿過' + (S.lv.boss ? '聖光符' : '倍增符') + '：×' + em + '！' : '敵軍瞄準中') : (S.turn === 0 ? '我方砲擊' : '敵軍砲擊');
    }
  }
  const fk = mine ? 1 : 0; if (fk !== HUD.fire) { HUD.fire = fk; $('btnFire').classList.toggle('ready', !!mine); $('btnFire').classList.toggle('btn-gold', !!mine); }
  if (S.round !== HUD.round) { HUD.round = S.round; $('roundTxt').textContent = S.round > 0 ? '第 ' + S.round + ' 回合' : ''; }
  if ((HUD.n & 3) !== 0) return;
  for (let sd = 0; sd < 2; sd++) for (const k of HUD.crew[sd]) { const st = !k.u.alive ? 'dead' : k.u.frozen > 0 ? 'frozen' : k.u.stun > 0 ? 'stun' : ''; if (st !== k.st) { k.st = st; k.el.className = 'cu' + (st ? ' ' + st : ''); } }
  const T = S.team[0], bu = $('btnUlt'), bs = $('btnShield');
  const up = clamp(T.ult.c / T.ult.need, 0, 1), armed = T.ult.armed, uk = Math.round(up * 100) + (armed ? 1000 : 0);
  if (uk !== HUD.ult) { HUD.ult = uk; bu.style.setProperty('--p', armed ? '1' : up.toFixed(3)); bu.classList.toggle('ready', up >= 1 && !armed); bu.classList.toggle('on', armed); $('ultNum').textContent = armed ? '已上膛' : up >= 1 ? '可用' : Math.floor(up * 100) + '%'; }
  // 兵比敵軍少：連珠集氣加快（按鈕上掛一個「逆轉」的小牌子）
  const boost = S.state === 'play' && ultK(0) > 1; if (boost !== HUD.boost) { HUD.boost = boost; bu.classList.toggle('boost', boost); }
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
