"""主畫面兩篇分頁：各尺寸 × 新玩家／全開／舊存檔，量分頁、六張關卡卡片、資訊卡有沒有重疊、超出舞台、名字被截斷；截圖。
   python3 test/review8/home.py [尺寸,…]"""
import asyncio, sys, json
sys.path.insert(0, __import__('os').path.dirname(__file__))
from r8 import Game, OUT, label, sheet, upright, SAVE_ALL, SAVE_OLD6

M = r"""(() => {
  const st = document.getElementById('stage');
  const loc = (e) => { let x = 0, y = 0; for (let n = e; n && n !== st; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y, e.offsetWidth, e.offsetHeight]; };
  const W = st.offsetWidth, H = st.offsetHeight;
  const out = { W, H, issues: [] };
  const els = [...document.querySelectorAll('#chaps .chap'), ...document.querySelectorAll('#lvls .lv')];
  const R = els.map(loc);
  out.tabs = [...document.querySelectorAll('#chaps .chap')].map((e) => ({ txt: e.textContent, sel: e.getAttribute('aria-selected'), locked: e.classList.contains('locked'), r: loc(e) }));
  out.cards = [...document.querySelectorAll('#lvls .lv')].map((e) => { const s = e.querySelector('strong'), stars = e.querySelector('.stars'); return { txt: e.querySelector('b').textContent + ' ' + s.textContent, sel: e.getAttribute('aria-selected'), locked: e.classList.contains('locked'), trunc: s.scrollWidth > s.clientWidth + 1, starsVis: getComputedStyle(stars).visibility, stars: stars.textContent, gold: (stars.querySelector('em') || {}).textContent || '', r: loc(e) }; });
  for (let i = 0; i < R.length; i++) {
    const a = R[i];
    if (a[0] < 0 || a[1] < 0 || a[0] + a[2] > W + 0.5 || a[1] + a[3] > H + 0.5) out.issues.push('outside stage: ' + els[i].textContent + ' ' + JSON.stringify(a));
    for (let j = i + 1; j < R.length; j++) { const b = R[j]; if (a[0] < b[0] + b[2] - 0.5 && b[0] < a[0] + a[2] - 0.5 && a[1] < b[1] + b[3] - 0.5 && b[1] < a[1] + a[3] - 0.5) out.issues.push('overlap: ' + els[i].textContent + ' / ' + els[j].textContent); }
  }
  for (const id of ['liName', 'liTag', 'liTipBox', 'liCrew', 'btnGo', 'btnShop', 'btnOpt']) { const e = document.getElementById(id); const r = loc(e); if (r[1] + r[3] > H + 0.5 || r[1] < -0.5 || r[0] < -0.5 || r[0] + r[2] > W + 0.5) out.issues.push('outside stage: #' + id + ' ' + JSON.stringify(r)); }
  const card = document.querySelector('.lvinfo'), cr = loc(card); out.card = cr; if (cr[1] + cr[3] > H + 0.5) out.issues.push('info card bottom ' + (cr[1] + cr[3]) + ' > ' + H);
  const hr = document.getElementById('homeR'); out.homeR = loc(hr); if (hr.scrollHeight > hr.clientHeight + 1) out.issues.push('home-r overflow ' + hr.scrollHeight + '>' + hr.clientHeight);
  // 資訊卡和右欄重疊？
  const lv0 = R[R.length - 1];
  out.info = { name: document.getElementById('liName').textContent, tag: document.getElementById('liTag').textContent, tip: document.getElementById('liTip').textContent, go: document.getElementById('btnGo').disabled, crew: [...document.querySelectorAll('#liCrew .cu')].map((e) => e.getAttribute('aria-label').split('。')[0]) };
  const lbl = [...document.querySelectorAll('#liCrew small')].map(loc); out.lbl = lbl;
  out.cu = [...document.querySelectorAll('#liCrew .cu')].map((e) => loc(e)[2]);
  const q = window.__qp; out.sv = { open: q.SV.open, stars: q.SV.stars.join(''), sel: q.UI.sel, chap: q.UI.chap, demo: q.S.idx };
  out.focus = document.activeElement ? (document.activeElement.id || document.activeElement.className || document.activeElement.tagName) + ' ' + (document.activeElement.textContent || '').slice(0, 12) : null;
  return out;
})()"""

SIZES = [(844, 390), (667, 375), (740, 360), (932, 430), (1280, 720), (390, 844)]


async def run(W, H, save, tag, actions):
    port = H > W
    res = []
    async with Game(W, H, scale=2, touch=True, save=save) as g:
        await g.sec(1.2)
        rot = await g.js("window.__qp.G.rot")
        for name, act in actions:
            if act: await act(g)
            await g.sec(0.6)
            m = await g.js(M)
            im = await g.shot()
            im.save(OUT / f'home_{tag}_{name}_{W}x{H}.png')
            res.append((name, m))
            iss = m['issues']
            print(f"{W}x{H} {tag}/{name}: tabs={[ (t['txt'], t['sel'], t['locked']) for t in m['tabs']]} sel={m['sv']['sel']} demo=L{m['sv']['demo'] + 1} card={m['card']} info={m['info']['name']}|{m['info']['tag']}|go_disabled={m['info']['go']}")
            print('   cards:', [(c['txt'], c['sel'] == 'true', 'L' if c['locked'] else '', ('T' if c['trunc'] else ''), c['gold'], c['starsVis']) for c in m['cards']])
            print('   tip:', m['info']['tip'], '| crew:', m['info']['crew'], '| cu px', m['cu'], '| sv', m['sv'])
            if iss: print('   ISSUES:', iss)
        print('   console:', g.msgs[:6])
    return res


def tap_tab(k):
    async def f(g): await g.tap_el(f'#chaps .chap:nth-child({k})')
    return f


def tap_lv(k):
    async def f(g): await g.tap_el(f'#lvls .lv:nth-child({k})')
    return f


def tap_cu(row, k):
    async def f(g): await g.tap_el(f'#liCrew .grp:nth-child({row}) .cu:nth-of-type({k})')
    return f


async def main():
    sizes = SIZES
    if len(sys.argv) > 1: sizes = [tuple(int(v) for v in s.split('x')) for s in sys.argv[1].split(',')]
    for W, H in sizes:
        # 新玩家
        await run(W, H, None, 'new', [('start', None), ('tab2', tap_tab(2)), ('tab1', tap_tab(1))])
        # 全開：第二篇的每一關
        acts = [('start', None), ('tab2', tap_tab(2))] + [(f'L{6 + k}', tap_lv(k)) for k in range(1, 7)] + [('L7stone', None)]
        acts[-2] = ('L12', tap_lv(6))
        acts = [('start', None), ('tab2', tap_tab(2)), ('L7', tap_lv(1)), ('L7stone', tap_cu(1, 1)), ('L8', tap_lv(2)), ('L9', tap_lv(3)), ('L10', tap_lv(4)), ('L11', tap_lv(5)), ('L12', tap_lv(6)), ('back1', tap_tab(1)), ('L6', tap_lv(6))]
        await run(W, H, SAVE_ALL, 'all', acts)
        # 舊存檔
        await run(W, H, SAVE_OLD6, 'old6', [('start', None), ('tab2', tap_tab(2)), ('L12', tap_lv(6))])

asyncio.run(main())
