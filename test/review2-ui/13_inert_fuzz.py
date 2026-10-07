"""隨機亂按選單（開設定、暫停、重來、回主畫面、強化、Esc、P、分頁切走、打完一關…），每一步之後檢查：
  - inert 有沒有跟「現在最上面是哪個視窗」對得上（#home / #hud / 三個視窗）
  - G.mode 跟畫面上開著的東西對不對得上
  - 最上層視窗裡的按鈕真的點得到（elementFromPoint）
python3 test/review2-ui/13_inert_fuzz.py [步數=400] [seed=1]"""
import asyncio, random, sys
from playwright.async_api import async_playwright
from common import *

N = int(sys.argv[1]) if len(sys.argv) > 1 else 400
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 1

CHECK = """(() => { const q = window.__qp, G = q.G, $ = (i) => document.getElementById(i), vis = (i) => !$(i).hidden, bad = [];
  const layers = ['result', 'opt', 'shop']; let top = -1; layers.forEach((id, i) => { if (vis(id)) top = i; });
  if ($('home').inert !== (top >= 0)) bad.push('home.inert=' + $('home').inert + ' but top=' + top);
  if ($('hud').inert !== (top >= 0)) bad.push('hud.inert=' + $('hud').inert + ' but top=' + top);
  layers.forEach((id, i) => { if ($(id).inert !== (i < top)) bad.push(id + '.inert=' + $(id).inert + ' top=' + layers[top]); });
  const open = ['shop', 'opt', 'result', 'home', 'hud'].filter(vis).join('+');
  const m = G.mode;
  if (m === 'home' && (!vis('home') || vis('hud') || vis('result'))) bad.push('mode home but open=' + open);
  if (m === 'play' && (!vis('hud') || vis('home') || vis('result') || vis('opt') || vis('shop'))) bad.push('mode play but open=' + open);
  if (m === 'pause' && (!vis('opt') || !vis('hud') || vis('home') || $('pauseBtns').hidden || !$('homeOpts').hidden)) bad.push('mode pause but open=' + open + ' pauseBtns.hidden=' + $('pauseBtns').hidden);
  if (m === 'result' && (!vis('result') || vis('home'))) bad.push('mode result but open=' + open);
  if (m !== 'pause' && vis('opt') && (!$('pauseBtns').hidden || $('homeOpts').hidden)) bad.push('options (not paused) shows pause buttons');
  if (m !== 'home' && m !== 'pause' && vis('opt')) bad.push('options open in mode ' + m);
  // 最上層的東西裡，每顆看得到的按鈕都要點得到
  const scope = top >= 0 ? $(layers[top]) : (vis('home') ? $('home') : $('hud'));
  for (const b of scope.querySelectorAll('button')) { if (b.offsetParent === null || b.disabled) continue; const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!(t === b || b.contains(t))) bad.push('button ' + (b.id || b.textContent.trim().slice(0, 4)) + ' in ' + scope.id + ' is covered by ' + (t ? (t.id || t.className || t.tagName) : null)); }
  const say = $('say'); if (m === 'home' && +getComputedStyle(say).opacity > 0.05 && vis('hud')) bad.push('toast visible on home');
  return {bad, open, mode: m, top: top >= 0 ? layers[top] : null, drag: !!G.drag, state: q.S.state, phase: q.S.phase}; })()"""

# 每個動作：名字 → (什麼時候可以做, JS)
ACTS = {
    'go': ("mode === 'home' && !top", "document.getElementById('btnGo').click()"),
    'lvl': ("mode === 'home' && !top", "document.querySelectorAll('#lvls button')[%d].click()"),
    'openOpt': ("mode === 'home' && !top", "document.getElementById('btnOpt').click()"),
    'openShop': ("mode === 'home' && !top", "document.getElementById('btnShop').click()"),
    'closeBtn': ("top === 'opt' && mode === 'home' || top === 'shop'", "(() => { const t = ['shop', 'opt'].map(i => document.getElementById(i)).find(e => !e.hidden); t.querySelector('[data-close]').click(); })()"),
    'toggle': ("top === 'opt'", "document.getElementById(['tSfx', 'tMus', 'tVib'][%d %% 3]).click()"),
    'diff': ("top === 'opt' && mode === 'home'", "document.querySelectorAll('#diffSeg button')[%d %% 3].click()"),
    'unlock': ("top === 'opt' && mode === 'home'", "document.getElementById('btnUnlock').click()"),
    'wipe': ("top === 'opt' && mode === 'home'", "document.getElementById('btnWipe').click()"),
    'buy': ("top === 'shop'", "(() => { window.__qp.SV.coins += 200; const b = document.querySelectorAll('#upList button')[%d %% 5]; if (b && !b.disabled) b.click(); })()"),
    'resume': ("mode === 'pause'", "document.getElementById('btnResume').click()"),
    'retry': ("mode === 'pause'", "document.getElementById('btnRetry').click()"),
    'quit': ("mode === 'pause'", "document.getElementById('btnQuit').click()"),
    'next': ("top === 'result'", "(() => { const b = document.getElementById('btnNext'); if (!b.hidden) b.click(); })()"),
    'again': ("top === 'result'", "document.getElementById('btnAgain').click()"),
    'up': ("top === 'result'", "document.getElementById('btnUp').click()"),
    'home': ("top === 'result'", "document.getElementById('btnHome').click()"),
    'win': ("mode === 'play' && state === 'play'", "(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()"),
    'lose': ("mode === 'play' && state === 'play'", "(() => { const q = window.__qp; for (const u of q.S.team[0].units) q.killUnit(u, 1, 0); })()"),
    'fire': ("mode === 'play'", "window.__qp.simFire(0)"),
    'hide': ("true", "(() => { Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); })()"),
    'blur': ("true", "window.dispatchEvent(new Event('blur'))"),
}
KEYS = ['Escape', 'KeyP', 'Space', 'Enter', 'KeyX', 'KeyZ', 'Tab']


async def main():
    rnd = random.Random(SEED)
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 1280, 720, dsf=1)
        await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.SV.open = 6; })()")
        hist = []; nbad = 0; counts = {}
        for step in range(N):
            c = await pg.evaluate(CHECK)
            env = {'mode': c['mode'], 'top': c['top'], 'state': c['state']}
            ok = [k for k, (cond, _) in ACTS.items() if eval(cond.replace('&&', ' and ').replace('||', ' or ').replace('===', '==').replace('!top', '(top is None)').replace('!==', '!=').replace('true', 'True'), {}, env)]
            r = rnd.random()
            if r < 0.22:
                k = rnd.choice(KEYS); name = 'key:' + k; await pg.keyboard.press(k)
            elif r < 0.30 and c['mode'] == 'play':
                # 真的用滑鼠按暫停鈕（HUD 沒被 inert 擋住才按得到）
                name = 'mouse:pause'; rr = await pg.evaluate("(() => { const b = document.getElementById('btnPause').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()"); await pg.mouse.click(rr[0], rr[1])
                await pg.wait_for_timeout(30)
                m = await pg.evaluate("window.__qp.G.mode + '/' + window.__qp.S.state")
                if m.startswith('play/play'): print(f'  !! step {step}: real mouse click on 暫停 did nothing ({m})', hist[-6:]); nbad += 1
            else:
                name = rnd.choice(ok)
                while name in ('blur', 'hide', 'fire') and rnd.random() < 0.8: name = rnd.choice(ok)      # 這三個隨時都能做，別讓它們佔掉大半
                js = ACTS[name][1]
                if '%d' in js: js = js % rnd.randrange(6)
                await pg.evaluate(js)
            counts[name] = counts.get(name, 0) + 1
            hist.append(name)
            # 有時候馬上接下一個動作（同一個畫面更新裡），有時候等一下；勝負要等結算
            w = rnd.choice([0, 0, 15, 15, 60, 250])
            if name in ('win', 'lose') and rnd.random() < 0.7:
                try: await pg.wait_for_function("window.__qp.G.mode !== 'play'", timeout=9000)
                except Exception: pass
            await pg.wait_for_timeout(max(w, 20))
            c2 = await pg.evaluate(CHECK)
            if c2['bad']:
                nbad += 1; print(f'  !! step {step} after {hist[-5:]}: {pj(c2)}', flush=True)
            if msgs: print('  !! console:', msgs, 'after', hist[-5:]); msgs.clear(); nbad += 1
        print(f'{N} random steps (seed {SEED}): {nbad} problems. final state: {pj(await pg.evaluate(CHECK))}')
        print('action counts:', pj(dict(sorted(counts.items()))))
        await b.close()

asyncio.run(main())
