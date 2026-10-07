"""資訊列、底部提示、教學提示、回合牌、橫幅在各種尺寸下會不會互相蓋到、會不會跑出舞台、會不會蓋到兵。
用 DOM 量（getBoundingClientRect）。每個尺寸、六關都看；文字用遊戲裡真的會出現的最長那幾句。
python3 test/review2-ui/15_hud_overlap.py [寬x高[t]] …"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *

SIZES = [(667, 375, True), (844, 390, True), (932, 430, True), (1024, 768, False), (1280, 720, False), (390, 844, True), (360, 640, True)]
if len(sys.argv) > 1:
    SIZES = []
    for a in sys.argv[1:]:
        t = a.endswith('t'); w, h = [int(x) for x in a.rstrip('t').split('x')]; SIZES.append((w, h, t))

TOASTS = ['轟炸氣球升空了！它先停在半路，下一輪才飛過來，趁現在打下來', '「連珠」集滿了！按右下角金色按鈕上膛，這一輪每個兵連打三次', '護罩把落石擋下來了']
CHIPS = [('輪到你：拖曳瞄準，放開發射', 'chamfer me go'), ('敵軍瞄準了 ×20 倍增符！', 'chamfer foe warn'), ('敵軍連珠砲上膛！', 'chamfer foe warn'), ('落石！', 'chamfer hz')]

MEASURE = """(([label]) => {
  const q = window.__qp, G = q.G, V = q.V, S = q.S, stage = document.getElementById('stage').getBoundingClientRect(), out = [];
  const vis = (e) => { if (!e) return false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (n.hidden || cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
  const R = (e) => { const r = e.getBoundingClientRect(); return {l: r.left, t: r.top, r: r.right, b: r.bottom}; };
  const ids = ['btnPause', 'crewA', 'hpA', 'hudName', 'roundTxt', 'windBox', 'hpB', 'crewB', 'btnFire', 'aimInfo', 'turnChip', 'btnShield', 'btnUlt', 'say', 'hint', 'mile', 'banner'];
  const els = ids.map((i) => document.getElementById(i)).filter((e) => vis(e) && (!['say', 'mile', 'banner'].includes(e.id) || e.dataset.force));
  const rs = els.map(R);
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = rs[i], b = rs[j]; if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
    const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (ox > 1 && oy > 1) out.push(els[i].id + ' overlaps ' + els[j].id + ' by ' + ox.toFixed(0) + 'x' + oy.toFixed(0) + 'px');
  }
  for (let i = 0; i < els.length; i++) { const r = rs[i]; if (els[i].id === 'banner') continue; if (r.l < stage.left - 0.5 || r.t < stage.top - 0.5 || r.r > stage.right + 0.5 || r.b > stage.bottom + 0.5) out.push(els[i].id + ' sticks out of the stage by ' + Math.max(stage.left - r.l, stage.top - r.t, r.r - stage.right, r.b - stage.bottom).toFixed(0) + 'px'); }
  // 文字被切掉
  for (const e of document.querySelectorAll('#hud b, #hud small, #hud span, #hud div, #hud button')) { if (!vis(e) || e.children.length || !e.clientWidth) continue; if (e.scrollWidth > e.clientWidth + 1) out.push('text clipped in ' + (e.id || e.className) + ' ' + e.scrollWidth + '>' + e.clientWidth); }
  // 蓋到兵：把提示的框換成戰場座標，跟每個活著的兵的身體比
  const toWorld = (cx, cy) => { let sx, sy; const r = document.getElementById('app').getBoundingClientRect(); cx -= r.left; cy -= r.top;
    if (G.rot === 1) { sx = cy - G.ox; sy = (G.vw - G.oy) - cx; } else if (G.rot === -1) { sx = (G.vh - G.ox) - cy; sy = cx - G.oy; } else { sx = cx - G.ox; sy = cy - G.oy; }
    const k = V.W / G.sw; return [(sx * k - V.cx) / V.s + 56, (V.gy - sy * k) / V.s]; };
  for (const id of ['say', 'hint', 'turnChip', 'aimInfo', 'btnFire', 'btnShield', 'btnUlt', 'hpA', 'hpB', 'crewA', 'crewB', 'hudName']) {
    const e = document.getElementById(id); if (!els.includes(e)) continue; const r = R(e), a = toWorld(r.l, r.t), b = toWorld(r.r, r.b);
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    for (const u of S.units) { if (!u.alive) continue; const big = u.def.big ? 1.9 : 1, ux0 = u.x - 1.4 * big, ux1 = u.x + 1.4 * big, uy0 = u.y, uy1 = u.y + 3.4 * big;
      const ox = Math.min(x1, ux1) - Math.max(x0, ux0), oy = Math.min(y1, uy1) - Math.max(y0, uy0);
      if (ox > 0.4 && oy > 0.4) out.push(id + ' covers ' + (u.side ? 'ENEMY' : 'my') + ' unit ' + u.type + ' at (' + u.x.toFixed(0) + ',' + u.y.toFixed(0) + ') by ' + (100 * ox * oy / ((ux1 - ux0) * (uy1 - uy0))).toFixed(0) + '% of its body'); }
    if (id === 'say' || id === 'hint') for (const g of S.gates) { const ox = Math.min(x1, g.x + 1.3) - Math.max(x0, g.x - 1.3), oy = Math.min(y1, g.y + g.h) - Math.max(y0, g.y - g.h); if (ox > 0.4 && oy > 0.4) out.push(id + ' covers gate x' + g.mult + ' at (' + g.x.toFixed(0) + ',' + g.y.toFixed(0) + ')'); }
  }
  return out; })"""

SETUP = """(([toast, chip, cls, hint, extra]) => { const q = window.__qp, S = q.S, $ = (i) => document.getElementById(i);
  const say = $('say'); say.textContent = toast || ''; say.className = 'chamfer' + (toast ? ' show' : ''); say.style.animation = 'none'; say.style.opacity = toast ? 1 : 0; if (toast) say.dataset.force = 1; else delete say.dataset.force;
  $('hint').hidden = !hint;
  const c = $('turnChip'); c.hidden = !chip; c.textContent = chip || ''; c.className = cls || 'chamfer'; c.style.animation = 'none';
  const b = $('banner'), m = $('mile');
  if (extra) { b.className = 'boss'; b.innerHTML = '<small>第二階段</small>魔王結界'; b.style.opacity = 1; b.dataset.force = 1; m.textContent = '千砲破城'; m.style.opacity = 1; m.dataset.force = 1; }
  else { b.style.opacity = ''; delete b.dataset.force; b.className = ''; m.style.opacity = ''; delete m.dataset.force; } })"""


async def one(p, W, H, touch):
    b, ctx, pg, msgs = await open_page(p, W, H, touch=touch, dsf=1)
    info = await pg.evaluate("(() => { const q = window.__qp, G = q.G; return {rot: G.rot, stage: [G.sw, G.sh], u: +parseFloat(getComputedStyle(document.getElementById('stage')).getPropertyValue('--u')).toFixed(2), unitsWide: +(G.sw / parseFloat(getComputedStyle(document.getElementById('stage')).getPropertyValue('--u'))).toFixed(0)}; })()")
    print(f'\n===== {W}x{H} touch={touch} {pj(info)}', flush=True)
    found = {}
    def note(lv, case, items):
        for it in items: found.setdefault(it, []).append(f'L{lv + 1}/{case}')
    for lv in range(6):
        await pg.evaluate("([lv]) => { const q = window.__qp; q.G.freeze = true; q.SV.seen = true; q.SV.open = 6; q.startLevel(lv); }", [lv])
        await pg.evaluate(JS_TO_MY_AIM, 10)
        # 最寬的狀態：回合兩位數、風 12、力道 100、技能字最長
        await pg.evaluate("(() => { const q = window.__qp, S = q.S, T = S.team[0]; S.round = 12; if (S.lv.wind) S.wind = -12; q.simAim(0, 86, 5); T.ult.c = T.ult.need; T.ult.armed = true; T.shield.on = true; for (let i = 0; i < 8; i++) q.hudUpdate(); q.renderFrame(0, 0); })()")
        for ti, toast in enumerate(TOASTS):
            for ci, (chip, cls) in enumerate(CHIPS):
                if ti > 0 and ci > 0: continue
                await pg.evaluate(SETUP, [toast, chip, cls, False, False])
                note(lv, f'toast{ti}+chip{ci}', await pg.evaluate(MEASURE, ['x']))
        # 教學提示 + 上面那一句（第一次玩才有，但六關的城都拿來比一下位置）
        if lv == 0:
            await pg.evaluate(SETUP, ['就是這樣！穿過倍增符，砲彈變多了', CHIPS[0][0], CHIPS[0][1], True, False]); note(lv, 'hint+toast', await pg.evaluate(MEASURE, ['x']))
            if (W, H) in ((667, 375), (360, 640)): await pg.screenshot(path=shot_path(f'overlap_{W}x{H}_L1_hint_toast'))
        await pg.evaluate(SETUP, [TOASTS[0], CHIPS[1][0], CHIPS[1][1], False, True]); note(lv, 'toast+banner+mile', await pg.evaluate(MEASURE, ['x']))
        if lv in (1, 5) and (W, H) in ((667, 375), (1024, 768), (360, 640)): await pg.screenshot(path=shot_path(f'overlap_{W}x{H}_L{lv + 1}_widest'))
    if not found: print('  no overlaps, nothing outside the stage, no clipped text, no unit covered')
    for k, v in found.items(): print('  -', k, '  [' + ', '.join(v[:6]) + (' …%d cases' % len(v) if len(v) > 6 else '') + ']')
    print('  errors:', msgs, flush=True)
    await b.close()


async def main():
    async with async_playwright() as p:
        for (w, h, t) in SIZES: await one(p, w, h, t)

asyncio.run(main())
