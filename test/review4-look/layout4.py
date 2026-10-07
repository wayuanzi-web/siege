"""review4：版面自動檢查（在頁面裡跑）。回傳現在畫面上看得到的介面元素的位置（換成舞台座標），以及可疑的地方：
   OUT   元素超出舞台
   CLIP  文字被自己的框切掉（scrollWidth > clientWidth）
   OVER  兩個不該疊在一起的元素疊在一起
   POP   畫在戰場上的跳字被介面蓋住或超出畫面
   SCROLL 視窗內容比畫面高（要捲才看得到）
"""
LAYOUT = r"""
(() => {
  const q = window.__qp, G = q.G, V = q.V, FX = q.FX, $ = (id) => document.getElementById(id);
  const app = $('app').getBoundingClientRect();
  // 畫面座標 → 舞台座標（跟 85-main 的 stagePoint 一樣）
  const sp = (x, y) => { x -= app.left; y -= app.top; if (G.rot === 1) return [y - G.ox, (G.vw - G.oy) - x]; if (G.rot === -1) return [(G.vh - G.ox) - y, x - G.oy]; return [x - G.ox, y - G.oy]; };
  const rect = (el) => { const r = el.getBoundingClientRect(); const a = sp(r.left, r.top), b = sp(r.right, r.bottom); return { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) }; };
  const vis = (el) => { if (!el) return 0; let e = el, op = 1; while (e && e.nodeType === 1) { if (e.hidden) return 0; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; op *= +cs.opacity; e = e.parentElement; } return op; };
  const items = [], flags = [], sw = G.sw, sh = G.sh;
  const add = (name, el, opt) => { if (!el) return null; const o = vis(el); if (o < 0.3) return null; const r = rect(el); if (r.x1 - r.x0 < 1 || r.y1 - r.y0 < 1) return null; const it = Object.assign({ name, op: +o.toFixed(2), txt: (el.textContent || '').trim().slice(0, 40) }, r, opt || {}); items.push(it); return it; };
  const textRect = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); const a = sp(r.left, r.top), b = sp(r.right, r.bottom); return { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) }; };
  const addText = (name, el) => { if (!el) return null; const o = vis(el); if (o < 0.3 || !(el.textContent || '').trim()) return null; const r = textRect(el); if (r.x1 - r.x0 < 1) return null; const it = Object.assign({ name, op: +o.toFixed(2), txt: (el.textContent || '').trim().slice(0, 40), text: 1 }, r); items.push(it); return it; };
  const mode = G.mode, modalOpen = ['result', 'opt', 'shop'].filter((id) => !$(id).hidden);
  if (!$('hud').hidden) {
    add('btnPause', $('btnPause')); add('crewA', $('crewA')); add('hpA', $('hpA')); addText('pctA', $('pctA')); addText('lblA', $('hpA').querySelector('small'));
    addText('hudName', $('hudName')); addText('roundTxt', $('roundTxt')); if (!$('windBox').hidden) add('windBox', $('windBox'));
    add('hpB', $('hpB')); addText('pctB', $('pctB')); addText('lblB', $('foeLbl')); add('crewB', $('crewB'));
    add('hint', $('hint')); add('say', $('say')); addText('mile', $('mile')); addText('banner', $('banner'));
    add('btnFire', $('btnFire')); add('aimInfo', $('aimInfo')); add('turnChip', $('turnChip')); add('btnShield', $('btnShield')); add('btnUlt', $('btnUlt'));
    addText('shTxt', $('btnShield').querySelector('span')); addText('ultTxt', $('btnUlt').querySelector('span'));
  }
  if (!$('home').hidden) {
    addText('tagline', document.querySelector('.logo .tagline')); addText('h1', document.querySelector('.logo h1')); add('btnGo', $('btnGo')); add('btnShop', $('btnShop')); add('btnOpt', $('btnOpt'));
    add('lvinfo', document.querySelector('.lvinfo')); addText('liName', $('liName')); addText('liTag', $('liTag')); addText('liTip', $('liTip'));
    [...$('lvls').children].forEach((b, i) => { add('lv' + (i + 1), b); addText('lv' + (i + 1) + 'name', b.querySelector('strong')); });
    const wb = document.querySelector('.webbar'); if (wb) add('webbar', wb);
  }
  for (const id of modalOpen) {
    const m = $(id), pl = m.querySelector('.plaque'); add(id + '.plaque', pl);
    if (m.scrollHeight > m.clientHeight + 2) flags.push(['SCROLL', id + ' content ' + m.scrollHeight + 'px > ' + m.clientHeight + 'px visible']);
    m.querySelectorAll('h2, p, dt, dd, button, h3, .coin, .seg > span, .toggle span').forEach((el, i) => { if (vis(el) < 0.3 || el.hidden) return; const it = add(id + '.' + el.tagName.toLowerCase() + i, el); });
  }
  if ($('turn') && !$('turn').hidden) add('turnPrompt', $('turn'));
  // 文字被自己的框切掉
  const clipSel = '#hud *, #home *, .modal:not([hidden]) *';
  document.querySelectorAll(clipSel).forEach((el) => {
    if (!el.childNodes.length || vis(el) < 0.3) return;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own) return;
    const cs = getComputedStyle(el); if (cs.display === 'inline') return;
    if (el.scrollWidth > el.clientWidth + 1 && (cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis')) flags.push(['CLIP', (el.id || el.className || el.tagName) + ' "' + el.textContent.trim().slice(0, 24) + '" needs ' + el.scrollWidth + 'px has ' + el.clientWidth + 'px']);
  });
  // 超出舞台
  for (const it of items) { if (it.x0 < -1 || it.y0 < -1 || it.x1 > sw + 1 || it.y1 > sh + 1) { if (it.name === 'banner') { /* 橫幅的 small 是整列寬的區塊，放大動畫時邊界會超出一點：不算 */ } else if (it.name === 'mile') { if (it.x0 < -1 || it.x1 > sw + 1) flags.push(['OUT', it.name + ' "' + it.txt + '" x ' + Math.round(it.x0) + '..' + Math.round(it.x1) + ' of ' + sw]); } else flags.push(['OUT', it.name + ' "' + it.txt + '" [' + [it.x0, it.y0, it.x1, it.y1].map(Math.round) + '] stage ' + sw + 'x' + sh]); } }
  // 不該疊在一起的
  const by = {}; for (const it of items) by[it.name] = it;
  const ov = (a, b, pad) => { pad = pad || 0; const x = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), y = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); return x > pad && y > pad ? [Math.round(x), Math.round(y)] : null; };
  const pairs = [['say', 'turnChip'], ['say', 'hint'], ['hint', 'turnChip'], ['say', 'btnFire'], ['say', 'aimInfo'], ['say', 'btnShield'], ['say', 'btnUlt'], ['turnChip', 'aimInfo'], ['turnChip', 'btnFire'], ['turnChip', 'btnShield'], ['turnChip', 'btnUlt'],
    ['hint', 'aimInfo'], ['hint', 'btnFire'], ['hint', 'btnShield'], ['hint', 'btnUlt'], ['mile', 'hpA'], ['mile', 'hpB'], ['mile', 'hudName'], ['mile', 'roundTxt'], ['mile', 'banner'], ['banner', 'hudName'], ['banner', 'roundTxt'], ['banner', 'hpA'], ['banner', 'hpB'], ['banner', 'say'], ['banner', 'hint'],
    ['btnPause', 'crewA'], ['crewA', 'hpA'], ['hpA', 'hudName'], ['hpA', 'roundTxt'], ['hpA', 'windBox'], ['hudName', 'hpB'], ['roundTxt', 'hpB'], ['windBox', 'hpB'], ['hpB', 'crewB'], ['pctA', 'lblA'], ['pctB', 'lblB'], ['btnShield', 'btnUlt'], ['aimInfo', 'btnFire'],
    ['say', 'mile'], ['hint', 'mile'], ['h1', 'btnGo'], ['tagline', 'h1'], ['lvinfo', 'btnGo'], ['lvinfo', 'btnShop'], ['lvinfo', 'btnOpt'], ['lvinfo', 'lv1'], ['lvinfo', 'lv2'], ['lvinfo', 'lv3'], ['lvinfo', 'lv4'], ['lvinfo', 'lv5'], ['lvinfo', 'lv6'], ['h1', 'lvinfo'], ['h1', 'lv1']];
  for (const [a, b] of pairs) { if (by[a] && by[b]) { const o = ov(by[a], by[b], 1); if (o) flags.push(['OVER', a + ' × ' + b + ' overlap ' + o[0] + 'x' + o[1] + 'px  ("' + by[a].txt.slice(0, 14) + '" / "' + by[b].txt.slice(0, 14) + '")']); } }
  // 文字太小（CSS 像素）
  const small = [];
  if (!modalOpen.length) document.querySelectorAll('#hud *, #home *').forEach((el) => { if (vis(el) < 0.3) return; const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own) return; const fz = parseFloat(getComputedStyle(el).fontSize); if (fz < 10.5) small.push([(el.id || el.className || el.tagName), +fz.toFixed(1), el.textContent.trim().slice(0, 12)]); });
  else for (const id of modalOpen) $(id).querySelectorAll('*').forEach((el) => { if (vis(el) < 0.3) return; const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own) return; const fz = parseFloat(getComputedStyle(el).fontSize); if (fz < 10.5) small.push([(el.id || el.className || el.tagName), +fz.toFixed(1), el.textContent.trim().slice(0, 12)]); });
  // 戰場上跳出來的字（畫在 canvas 上）：有沒有被介面蓋住、超出畫面
  const pops = [];
  if (mode === 'play' && !modalOpen.length) {
    const mc = (window.__mc = window.__mc || document.createElement('canvas').getContext('2d')), s = V.s, k = 1 / V.dpr;
    const F_NUM = '"Lilita One", "NumFB", "Arial Black", system-ui, sans-serif', F_ZH = '900 1px "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif';
    for (const p of FX.pops) {
      const f = p.t / p.max, sc = f < 0.12 ? 0.6 + f / 0.12 * 0.5 : 1.1 - Math.min(0.1, (f - 0.12) * 0.5), fz = p.size * s * sc, al = f > 0.7 ? (1 - f) / 0.3 : 1;
      mc.font = /[^\x00-\xff]/.test(p.txt) && !/^×/.test(p.txt) ? F_ZH.replace('1px', fz + 'px') : '400 ' + fz * 1.15 + 'px ' + F_NUM;
      const w = mc.measureText(p.txt).width + fz * 0.22, x = Math.min(Math.max((p.x - 56) * s + V.cx, fz * 2), V.W - fz * 2), y = Math.max(V.gy - p.y * s - f * s * 3.5, V.hud + fz * 0.9);
      const r = { name: 'pop', txt: p.txt, op: +al.toFixed(2), x0: (x - w / 2) * k, x1: (x + w / 2) * k, y0: (y - fz * 0.6) * k, y1: (y + fz * 0.6) * k, pop: 1 };
      pops.push(r);
      if (al < 0.5) continue;
      if (r.x0 < -1 || r.x1 > sw + 1) flags.push(['POP', '"' + p.txt + '" cut by screen edge: x ' + Math.round(r.x0) + '..' + Math.round(r.x1) + ' of ' + sw]);
      for (const nm of ['btnShield', 'btnUlt', 'btnFire', 'aimInfo', 'turnChip', 'say', 'hint', 'hpA', 'hpB', 'crewA', 'crewB', 'btnPause', 'hudName', 'roundTxt']) { const it = by[nm]; if (!it) continue; const o = ov(r, it, 2); if (o && o[0] * o[1] > 0.12 * (r.x1 - r.x0) * (r.y1 - r.y0)) flags.push(['POP', '"' + p.txt + '" covered by ' + nm + ' ' + o[0] + 'x' + o[1] + 'px of ' + Math.round(r.x1 - r.x0) + 'x' + Math.round(r.y1 - r.y0)]); }
    }
    for (let i = 0; i < pops.length; i++) for (let j = i + 1; j < pops.length; j++) { const a = pops[i], b = pops[j]; if (a.op < 0.5 || b.op < 0.5) continue; const o = ov(a, b, 1); if (o && o[0] > 0.3 * Math.min(a.x1 - a.x0, b.x1 - b.x0) && o[1] > 0.4 * Math.min(a.y1 - a.y0, b.y1 - b.y0)) flags.push(['POP', '"' + a.txt + '" overlaps "' + b.txt + '" ' + o[0] + 'x' + o[1] + 'px']); }
  }
  return { sw, sh, rot: G.rot, mode, modal: modalOpen, flags, small, n: items.length, items: items.map((it) => [it.name, Math.round(it.x0), Math.round(it.y0), Math.round(it.x1), Math.round(it.y1)]), pops: pops.map((p) => [p.txt, Math.round(p.x0), Math.round(p.y0), Math.round(p.x1), Math.round(p.y1), p.op]) };
})()
"""
