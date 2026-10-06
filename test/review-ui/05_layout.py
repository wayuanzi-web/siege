"""各種視窗大小的版面檢查（device scale 2）。每個尺寸把主畫面、設定、強化、戰鬥（教學提示、風、魔王條）、暫停、勝負結算都截圖，
   並用 DOM 量：按鈕的可點範圍（<40 CSS px 就列出來）、HUD 元件互相重疊、文字溢出、彈出視窗有沒有超出舞台。
   python3 test/review-ui/05_layout.py [寬x高[t]] …      （加 t 表示觸控裝置；不給參數就跑全部）"""
import asyncio, json, sys
from playwright.async_api import async_playwright
from PIL import Image
from common import *

SIZES = [(667, 375, True), (844, 390, True), (932, 430, True), (1024, 768, False), (1280, 720, False), (1920, 1080, False), (375, 667, True), (390, 844, True), (430, 932, True)]
if len(sys.argv) > 1:
    SIZES = []
    for a in sys.argv[1:]:
        t = a.endswith('t'); w, h = [int(x) for x in a.rstrip('t').split('x')]; SIZES.append((w, h, t))

# 量目前畫面上看得到的東西
MEASURE = """(() => {
  const stage = document.getElementById('stage').getBoundingClientRect(), vw = innerWidth, vh = innerHeight, out = {small: [], off: [], overflow: [], overlap: [], modal: null};
  const vis = (e) => { if (!e) return false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (n.hidden || cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
  const R = (e) => { const r = e.getBoundingClientRect(); return {l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height}; };
  const name = (e) => e.id ? '#' + e.id : (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName) + (e.textContent ? '「' + e.textContent.trim().slice(0, 8) + '」' : '');
  // 最上層的彈出視窗（有的話只看它裡面的按鈕）
  const modals = ['shop', 'opt', 'result'].map((i) => document.getElementById(i)).filter(vis);
  const top = modals.length ? modals.sort((a, b) => +getComputedStyle(b).zIndex - +getComputedStyle(a).zIndex)[0] : null;
  const scope = top || (vis(document.getElementById('home')) ? document.getElementById('home') : document.getElementById('hud'));
  for (const b of scope.querySelectorAll('button')) {
    if (!vis(b)) continue; const r = R(b), m = Math.min(r.w, r.h);
    if (m < 40) out.small.push(name(b) + ' ' + r.w.toFixed(0) + 'x' + r.h.toFixed(0));
    if (r.l < stage.left - 0.5 || r.t < stage.top - 0.5 || r.r > stage.right + 0.5 || r.b > stage.bottom + 0.5) out.off.push(name(b) + ' ' + JSON.stringify([r.l, r.t, r.r, r.b].map(Math.round)));
  }
  // 文字被切掉（scrollWidth > clientWidth）
  for (const e of scope.querySelectorAll('button, b, strong, small, span, p, h1, h2, h3, dt, dd, em, div')) {
    if (!vis(e) || !e.clientWidth) continue; const cs = getComputedStyle(e);
    if (e.scrollWidth > e.clientWidth + 1 && (cs.overflow !== 'visible' || cs.whiteSpace === 'nowrap') && e.children.length === 0) out.overflow.push(name(e) + ' ' + e.scrollWidth + '>' + e.clientWidth);
  }
  if (top) { const pl = top.querySelector('.plaque'), r = R(pl); out.modal = {id: top.id, scrolls: top.scrollHeight > top.clientHeight + 1 || top.scrollWidth > top.clientWidth + 1, sh: [top.scrollHeight, top.clientHeight], plaque: [r.l, r.t, r.r, r.b].map(Math.round), stage: [stage.left, stage.top, stage.right, stage.bottom].map(Math.round), inside: r.l >= stage.left - 0.5 && r.t >= stage.top - 0.5 && r.r <= stage.right + 0.5 && r.b <= stage.bottom + 0.5}; }
  // HUD 元件互相重疊
  if (!top && scope.id === 'hud') {
    const ids = ['btnPause', 'crewA', 'hpA', 'hudName', 'roundTxt', 'windBox', 'hpB', 'crewB', 'btnFire', 'aimInfo', 'turnChip', 'btnShield', 'btnUlt', 'say', 'hint', 'pctA', 'pctB', 'foeLbl'];
    const els = ids.map((i) => document.getElementById(i)).filter((e) => vis(e) && (e.id !== 'say' || +getComputedStyle(e).opacity > 0.5));
    const rs = els.map(R);
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = rs[i], b = rs[j]; if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
      const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (ox > 1 && oy > 1) out.overlap.push(els[i].id + ' x ' + els[j].id + ' ' + ox.toFixed(0) + 'x' + oy.toFixed(0));
    }
    for (const e of els) { const r = R(e); if (r.l < stage.left - 0.5 || r.t < stage.top - 0.5 || r.r > stage.right + 0.5 || r.b > stage.bottom + 0.5) out.off.push('#' + e.id + ' ' + JSON.stringify([r.l, r.t, r.r, r.b].map(Math.round))); }
  }
  return out; })()"""


async def one(p, W, H, touch):
    b, ctx, pg, msgs = await open_page(p, W, H, touch=touch)
    tag = f'{W}x{H}'; port = H > W
    info = await pg.evaluate("(() => { const q = window.__qp, G = q.G; return {rot: G.rot, sw: G.sw, sh: G.sh, ox: G.ox, oy: G.oy, u: getComputedStyle(document.getElementById('stage')).getPropertyValue('--u'), cv: [q.V.W, q.V.H], s: +q.V.s.toFixed(2), top: +q.V.top.toFixed(1), x0: +q.V.x0.toFixed(1), x1: +q.V.x1.toFixed(1)}; })()")
    print(f'\n===== {tag} touch={touch}', json.dumps(info), flush=True)
    if port: await pg.wait_for_timeout(3500)      # 等「把手機橫過來」的提示消失

    async def snap(name):
        path = shot_path(f'layout_{tag}_{name}')
        await pg.screenshot(path=path)
        if port:       # 直拿：存一張轉回橫的方便看
            im = Image.open(path); im.rotate(90, expand=True).save(path)
        m = await pg.evaluate(MEASURE)
        flags = {k: v for k, v in m.items() if v and k != 'modal'}
        if m['modal'] and (m['modal']['scrolls'] or not m['modal']['inside']): flags['modal'] = m['modal']
        print(f'  [{name}]', json.dumps(flags, ensure_ascii=False) if flags else 'ok', flush=True)

    # 主畫面：第一關、鎖住的第六關
    await snap('home1')
    await pg.evaluate("document.querySelector('#lvls button:nth-child(6)').click()"); await pg.wait_for_timeout(250); await snap('home6_locked')
    await pg.evaluate("document.querySelector('#lvls button:nth-child(5)').click()"); await pg.wait_for_timeout(100)
    # 設定（清除進度按過一次，字最長）
    await pg.evaluate("document.getElementById('btnOpt').click(); document.getElementById('btnWipe').click()"); await pg.wait_for_timeout(300); await snap('opt')
    await pg.evaluate("document.querySelector('#opt [data-close]').click()")
    # 強化：有買得起、買不起、已滿
    await pg.evaluate("(() => { const q = window.__qp; q.SV.coins = 123456; q.SV.up.dmg = 5; q.SV.up.aim = 2; q.SV.open = 6; q.SV.stars = [3, 2, 1, 3, 0, 0]; document.getElementById('btnShop').click(); })()"); await pg.wait_for_timeout(300); await snap('shop')
    await pg.evaluate("document.querySelector('#shop [data-close]').click()"); await pg.wait_for_timeout(100); await snap('home5_progress')

    # 第一關：教學提示 + 輕點的提示
    await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = false; q.SV.up.aim = 0; q.startLevel(0); })()"); await wait_my_aim(pg); await pg.wait_for_timeout(700); await snap('L1_hint')
    # 真的輕點一下（不拖）：跳出「按住拖曳瞄準」的提示，跟教學提示同時出現
    cx, cy = W * 0.5, H * 0.42
    if touch: await pg.touchscreen.tap(cx, cy)
    else: await pg.mouse.click(cx, cy)
    await pg.wait_for_timeout(600); await snap('L1_hint_plus_tap_toast')

    # 第二關：風、回合數兩位數、技能各種狀態、最長的回合牌
    await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.startLevel(1); })()"); await wait_my_aim(pg)
    await pg.evaluate("(() => { const q = window.__qp, S = q.S, T = S.team[0]; q.G.freeze = true; S.round = 12; S.wind = -12; T.ult.c = 100; T.ult.armed = true; T.shield.c = 0; T.shield.on = true; for (let i = 0; i < 8; i++) q.hudUpdate(); q.renderFrame(0, 0); })()")
    await pg.wait_for_timeout(700); await snap('L2_wind_skills')
    # 關卡說明（最長的那種提示，三行）
    await pg.evaluate("(() => { const q = window.__qp, e = document.getElementById('say'); e.textContent = q.LEVELS[4].tip; e.className = 'chamfer alert'; e.style.opacity = 1; })()"); await pg.wait_for_timeout(150); await snap('L2_long_toast')
    await pg.evaluate("(() => { const e = document.getElementById('say'); e.style.opacity = ''; e.className = 'chamfer'; window.__qp.G.freeze = false; })()")
    # 暫停
    await pg.evaluate("document.getElementById('btnPause').click()"); await pg.wait_for_timeout(350); await snap('pause')
    await pg.evaluate("document.getElementById('btnResume').click()")

    # 第六關：魔王條的刻度、四個兵；敵軍連珠上膛的回合牌
    await pg.evaluate("(() => { const q = window.__qp; q.startLevel(5); })()"); await wait_my_aim(pg); await pg.wait_for_timeout(2400)
    await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.G.freeze = true; S.round = 23; for (let i = 0; i < 8; i++) q.hudUpdate(); })()"); await pg.wait_for_timeout(200); await snap('L6_boss')
    await pg.evaluate("window.__qp.G.freeze = false")
    # 贏（少一個兵 → 兩顆星 + 提示）
    await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.killUnit(S.team[0].units[3], 1, 0); for (const u of S.team[1].units) q.killUnit(u, 0, 0); })()")
    await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=20000); await pg.wait_for_timeout(1700); await snap('win_L6')
    # 第四關：輸（最長的提示）
    await pg.evaluate("(() => { const q = window.__qp; q.startLevel(3); })()"); await wait_my_aim(pg)
    await pg.evaluate("(() => { const q = window.__qp, S = q.S; for (const u of S.team[0].units) q.killUnit(u, 1, 0); })()")
    await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=20000); await pg.wait_for_timeout(400)
    await pg.evaluate("document.getElementById('resTip').textContent = '敵軍的赤符會擋住你的砲彈，也會讓他們的砲彈變多：先把它打掉，或是換個角度繞過去。'"); await pg.wait_for_timeout(150); await snap('lose_L4')
    # 第一關：贏（三個按鈕都在）
    await pg.evaluate("(() => { const q = window.__qp; q.startLevel(0); })()"); await wait_my_aim(pg)
    await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.killUnit(S.team[0].units[2], 1, 0); for (const u of S.team[1].units) q.killUnit(u, 0, 0); })()")
    await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=20000); await pg.wait_for_timeout(1700); await snap('win_L1')
    print('  errors:', msgs, flush=True)
    await b.close()


async def main():
    async with async_playwright() as p:
        for (w, h, t) in SIZES:
            try: await one(p, w, h, t)
            except Exception as e: print('  !! FAILED', w, h, repr(e)[:300], flush=True)

asyncio.run(main())
