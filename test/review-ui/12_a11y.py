"""無障礙的基本項目：按鈕有沒有名字、鍵盤焦點框看不看得到、prefers-reduced-motion 有沒有被尊重、彈出視窗的焦點。
   python3 test/review-ui/12_a11y.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

NAMES = """(() => { const out = []; for (const b of document.querySelectorAll('button')) { const n = (b.getAttribute('aria-label') || b.textContent || '').trim(); if (!n) out.push(b.id || b.className); } return {buttons: document.querySelectorAll('button').length, unnamed: out}; })()"""
FOCUS = """(() => { const e = document.activeElement, cs = getComputedStyle(e); let clip = null; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = getComputedStyle(n).clipPath; if (c && c !== 'none') { clip = (n === e ? 'self' : (n.id || n.className)); break; } }
  const r = e.getBoundingClientRect(); return {el: e.id || (e.className + '').split(' ').slice(0, 2).join('.') || e.tagName, txt: (e.textContent || '').trim().slice(0, 6), outline: cs.outlineStyle + ' ' + cs.outlineWidth, focusVisible: e.matches(':focus-visible'), clippedBy: clip, hiddenBehindModal: (() => { const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(t === e || e.contains(t)); })()}; })()"""
ANIMS = """(() => document.getAnimations().filter(a => a.playState === 'running').map(a => (a.effect && a.effect.target ? (a.effect.target.id || a.effect.target.className) : '?') + ':' + (a.animationName || a.transitionProperty || 'anim') + (a.effect && a.effect.getComputedTiming().iterations === Infinity ? '(loop)' : '')))()"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390)
        # 1. 名字
        res = {}
        res['home'] = await pg.evaluate(NAMES)
        await pg.evaluate("window.__qp.SV.coins = 500; document.getElementById('btnShop').click()"); await pg.wait_for_timeout(100)
        res['shop'] = await pg.evaluate(NAMES)
        print('1. button names:', json.dumps(res, ensure_ascii=False))
        print('   pause btn label:', await pg.evaluate("document.getElementById('btnPause').getAttribute('aria-label')"), '| modal roles:', await pg.evaluate("[...document.querySelectorAll('.modal')].map(m => m.getAttribute('role') + '/' + m.getAttribute('aria-modal')).join()"), '| toast aria-live:', await pg.evaluate("document.getElementById('say').getAttribute('aria-live')"), '| html lang:', await pg.evaluate("document.documentElement.lang"))
        await pg.evaluate("document.querySelector('#shop [data-close]').click()")

        # 2. 鍵盤焦點：一路 Tab
        print('2. Tab order on home (outline = computed outline; clippedBy = clip-path that cuts the outline off):')
        seq = []
        for i in range(10):
            await pg.keyboard.press('Tab'); await pg.wait_for_timeout(40); f = await pg.evaluate(FOCUS); seq.append(f)
            print('    ', json.dumps(f, ensure_ascii=False))
            if i == 0: await pg.screenshot(path=shot_path('a11y_focus_first_tab'), clip={'x': 0, 'y': 180, 'width': 300, 'height': 210})
        # 打開設定：焦點有沒有移進視窗、能不能 Tab 到後面的主畫面
        await pg.evaluate("document.getElementById('btnOpt').focus()"); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
        print('   options opened by keyboard -> focus on:', (await pg.evaluate(FOCUS))['el'])
        behind = []
        for i in range(14):
            await pg.keyboard.press('Tab'); f = await pg.evaluate(FOCUS)
            if f['hiddenBehindModal']: behind.append(f['el'] + '「' + f['txt'] + '」')
        print('   Tab while options modal is open reaches controls behind it:', behind)
        await pg.evaluate("document.getElementById('tSfx').focus()"); await pg.keyboard.press('Tab'); await pg.keyboard.press('Shift+Tab'); await pg.wait_for_timeout(60)
        await pg.screenshot(path=shot_path('a11y_focus_toggle_vs_btn'))
        print('   focus on toggle:', await pg.evaluate(FOCUS))
        await pg.evaluate("document.querySelector('#opt [data-close]').focus()"); await pg.keyboard.press('Tab'); await pg.keyboard.press('Shift+Tab'); await pg.wait_for_timeout(60)
        await pg.screenshot(path=shot_path('a11y_focus_back_btn'))
        print('   focus on 返回:', await pg.evaluate(FOCUS))
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
        # 選關之後焦點跑去哪
        await pg.evaluate("window.__qp.SV.open = 6; document.querySelector('#lvls button').focus()"); await pg.keyboard.press('Tab'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
        print('   after choosing level 2 with Enter, focus is on:', await pg.evaluate("document.activeElement.tagName + '#' + document.activeElement.id"), '(list is rebuilt, focused button destroyed)')
        await b.close()

        # 3. prefers-reduced-motion
        b, ctx, pg, msgs = await open_page(p, 844, 390, reduced_motion='reduce')
        print('3. prefers-reduced-motion: reduce ->', await pg.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"))
        await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = false; q.startLevel(0); })()"); await pg.wait_for_timeout(300)
        print('   intro banner anims:', await pg.evaluate(ANIMS))
        await wait_my_aim(pg); await pg.wait_for_timeout(300)
        await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.shield.c = 100; T.ult.c = 100; })()"); await pg.wait_for_timeout(200)
        print('   my aim, skills ready, tutorial hint: CSS anims running:', await pg.evaluate(ANIMS))
        # 畫布上的震動、全螢幕閃白、慢動作
        await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
        peak = {'shake': 0, 'flash': 0, 'slow': 1, 'shx': 0}
        for i in range(30):
            r = await pg.evaluate("(() => { const F = window.__qp.FX; return [F.shake, F.flash, F.slow, Math.abs(F.shx) + Math.abs(F.shy)]; })()")
            peak['shake'] = max(peak['shake'], r[0]); peak['flash'] = max(peak['flash'], r[1]); peak['slow'] = min(peak['slow'], r[2]); peak['shx'] = max(peak['shx'], r[3])
            if i == 1: await pg.screenshot(path=shot_path('a11y_reduced_motion_flash'))
            await pg.wait_for_timeout(30)
        print('   castle destroyed with reduced motion requested -> peak canvas shake', round(peak['shake'], 2), '(offset up to', round(peak['shx'], 1), 'canvas px), full-screen flash alpha', round(peak['flash'], 2), ', slow-mo factor', peak['slow'])
        await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(200)
        print('   result modal anims:', await pg.evaluate(ANIMS))
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
