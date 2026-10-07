"""鍵盤、焦點、各個彈出視窗的 Tab 順序和 Esc（1280x720、真的鍵盤事件）。
python3 test/review2-ui/12_keyboard_focus.py [only=<名稱片段>]"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *

ONLY = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('only=')]
FOC = """(() => { const e = document.activeElement; if (!e || e === document.body) return 'BODY';
  let where = ''; for (const id of ['shop', 'opt', 'result', 'home', 'hud']) if (document.getElementById(id).contains(e)) { where = id; break; }
  const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return where + ':' + (e.id || (e.textContent || '').trim().slice(0, 6)) + (e.matches(':focus-visible') ? '' : '(not-visible-ring)') + (t === e || e.contains(t) ? '' : '(COVERED)') + (e.closest('[inert]') ? '(INERT)' : ''); })()"""
ST = """(() => { const q = window.__qp, T = q.S.team[0]; const vis = (id) => !document.getElementById(id).hidden;
  return {mode: q.G.mode, v: T ? T.volleys : -1, armed: T ? T.ult.armed : null, sh: T ? T.shield.on : null, open: ['shop', 'opt', 'result', 'home', 'hud'].filter(vis).join('+'),
    inert: ['shop', 'opt', 'result', 'home', 'hud'].filter((id) => document.getElementById(id).inert).join('+')}; })()"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 1280, 720, dsf=1)
        K = pg.keyboard
        foc = lambda: pg.evaluate(FOC); st = lambda: pg.evaluate(ST)
        want = lambda n: (not ONLY) or any(o in n for o in ONLY)
        async def tabs(n, key='Tab'):
            seq = []
            for _ in range(n):
                await K.press(key); await pg.wait_for_timeout(30); seq.append(await foc())
            return seq
        async def my_aim(): await wait_my_aim(pg); await pg.wait_for_timeout(120)
        async def win(lv=0, lose=False):
            await pg.evaluate("([lv]) => { const q = window.__qp; q.G.freeze = false; q.SV.seen = true; q.SV.open = 6; q.startLevel(lv); }", [lv]); await my_aim()
            await pg.evaluate("(lose) => { const q = window.__qp, S = q.S; for (const u of S.team[lose ? 0 : 1].units) q.killUnit(u, lose ? 1 : 0, 0); }", lose)
            await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=20000); await pg.wait_for_timeout(300)

        if want('flow'):
            print('--- keyboard-only flow from the home screen')
            await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; })()")
            s = await tabs(1); print('  Tab ->', s)
            await K.press('Enter'); await pg.wait_for_timeout(200); print('  Enter on 出戰 ->', pj(await st()), '| focus', await foc())
            await my_aim(); await K.press('Space'); await pg.wait_for_timeout(150); print('  Space on my turn -> volleys', (await st())['v'], '| focus', await foc())
            await K.press('KeyP'); await pg.wait_for_timeout(150); print('  P ->', pj(await st()), '| focus', await foc())
            s = await tabs(8); print('  Tab x8 in pause menu ->', s)
            s = await tabs(2, 'Shift+Tab'); print('  Shift+Tab x2 ->', s)
            await pg.evaluate("document.getElementById('btnResume').focus()"); await K.press('Tab'); await K.press('Shift+Tab'); print('  focus on', await foc())
            v0 = (await st())['v']; await K.press('Space'); await pg.wait_for_timeout(150); s1 = await st(); print('  Space on 繼續 ->', pj(s1), '| focus', await foc(), '| fired by the same key press:', s1['v'] - v0)
            # 等輪到我，按住方向鍵
            await pg.evaluate(JS_TO_MY_AIM, 60); await pg.evaluate("window.__qp.G.freeze = false"); await pg.wait_for_timeout(150)
            a0 = await pg.evaluate(AIM); await K.down('ArrowUp'); await pg.wait_for_timeout(300); await K.up('ArrowUp'); a1 = await pg.evaluate(AIM)
            await K.down('Shift'); await K.down('ArrowUp'); await pg.wait_for_timeout(300); await K.up('ArrowUp'); await K.up('Shift'); a2 = await pg.evaluate(AIM)
            print('  ArrowUp 0.3s:', a0, '->', a1, '| Shift+ArrowUp 0.3s ->', a2, '(fine = about a third)')
            await K.press('NumpadEnter'); await pg.wait_for_timeout(120); print('  NumpadEnter fires?', (await st())['v'] - s1['v'])

        if want('hudtab'):
            print('--- Tab through the in-battle HUD')
            await fresh(pg); await pg.evaluate("document.activeElement.blur()")
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; T.shield.c = T.shield.need; })()")
            s = await tabs(6); print('  Tab x6 ->', s)
            await pg.evaluate("document.getElementById('btnFire').focus()"); await K.press('Shift+Tab'); await K.press('Tab'); print('  focus', await foc())
            await K.press('Space'); await pg.wait_for_timeout(200); print('  Space on focused 發射 -> volleys', (await st())['v'])
            await K.press('Enter'); await pg.wait_for_timeout(200); print('  Enter again during my volley -> volleys', (await st())['v'])
            # 連珠：Tab 選到、按住 Enter
            await fresh(pg); await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.ult.c = T.ult.need; window.__arm = []; const s = window.__qp.simSkill; })()")
            await pg.evaluate("document.getElementById('btnUlt').focus()"); await K.press('Shift+Tab'); await K.press('Tab'); print('  focus', await foc())
            await pg.evaluate("(() => { window.__clicks = 0; document.getElementById('btnUlt').addEventListener('click', () => window.__clicks++); })()")
            await K.down('Enter'); await pg.wait_for_timeout(40)
            for _ in range(6): await K.down('Enter'); await pg.wait_for_timeout(35)      # 按住不放的自動重複
            await K.up('Enter'); await pg.wait_for_timeout(120)
            print('  Enter held on focused 連珠 (1 press + 6 auto-repeats): click events', await pg.evaluate("window.__clicks"), '-> armed', (await st())['armed'])
            # 之後按空白鍵想發射
            v0 = (await st())['v']; await K.press('Space'); await pg.wait_for_timeout(200); s2 = await st()
            print('  then Space (focus still on 連珠): fired', s2['v'] - v0, '| armed', s2['armed'], '| focus', await foc())

        if want('opt'):
            print('--- options from home')
            await pg.evaluate("window.__qp.goHome()"); await pg.wait_for_timeout(200)
            await pg.evaluate("document.getElementById('btnOpt').focus()"); await K.press('Shift+Tab'); await K.press('Tab'); print('  focus', await foc())
            await K.press('Enter'); await pg.wait_for_timeout(200); print('  Enter ->', pj(await st()), '| focus right after opening:', await foc())
            s = await tabs(12); print('  Tab x12 ->', s)
            await K.press('Escape'); await pg.wait_for_timeout(200); print('  Esc ->', pj(await st()), '| focus after closing:', await foc())
            s = await tabs(1); print('  next Tab lands on ->', s)
            print('--- shop from home')
            await pg.evaluate("document.getElementById('btnShop').focus()"); await K.press('Shift+Tab'); await K.press('Tab')
            await K.press('Space'); await pg.wait_for_timeout(200); print('  Space on 強化 ->', pj(await st()), '| focus', await foc())
            s = await tabs(8); print('  Tab x8 ->', s)
            await K.press('KeyP'); await pg.wait_for_timeout(100); print('  P in shop ->', pj(await st()))
            await K.press('Escape'); await pg.wait_for_timeout(200); print('  Esc ->', pj(await st()), '| focus', await foc())

        if want('result'):
            print('--- result screen (won level 1)')
            await win(0); await pg.wait_for_timeout(1200)
            print('  state', pj(await st()), '| focus', await foc())
            s = await tabs(6); print('  Tab x6 ->', s)
            await K.press('Escape'); await pg.wait_for_timeout(150); print('  Esc on result ->', pj(await st()))
            await pg.evaluate("document.activeElement.blur()")
            for k in ('KeyP', 'Space', 'Enter', 'KeyX', 'KeyZ', 'ArrowUp'): await K.press(k)
            await pg.wait_for_timeout(150); print('  P, Space, Enter, X, Z, ArrowUp on result with focus on body ->', pj(await st()), '| focus', await foc())
            await pg.evaluate("document.getElementById('btnUp').focus()"); await K.press('Shift+Tab'); await K.press('Tab'); print('  focus', await foc())
            await K.press('Enter'); await pg.wait_for_timeout(200); print('  Enter on 強化 ->', pj(await st()), '| focus', await foc())
            s = await tabs(9); print('  Tab x9 in shop over result ->', s)
            await K.press('Escape'); await pg.wait_for_timeout(200); print('  Esc ->', pj(await st()), '| focus', await foc())
            s = await tabs(2); print('  Tab x2 ->', s)
            await K.press('Escape'); await pg.wait_for_timeout(150); print('  Esc again ->', pj(await st()))
            # 下一關：Enter
            await pg.evaluate("document.getElementById('btnNext').focus()"); await K.press('Shift+Tab'); await K.press('Tab')
            await K.press('Enter'); await pg.wait_for_timeout(300); print('  Enter on 下一關 ->', pj(await st()), 'idx', await pg.evaluate("window.__qp.S.idx"), '| focus', await foc())
            await my_aim(); await K.press('Space'); await pg.wait_for_timeout(150); print('  Space -> volleys', (await st())['v'])
            print('--- result screen (lost level 3)')
            await win(2, lose=True)
            s = await tabs(5); print('  Tab x5 ->', s)
            await pg.evaluate("document.getElementById('btnHome').focus()"); await K.press('Shift+Tab'); await K.press('Tab'); await K.press('Enter'); await pg.wait_for_timeout(300)
            print('  Enter on 回主畫面 ->', pj(await st()), '| focus', await foc())

        if want('pausekeys'):
            print('--- keys while paused / in menus')
            await fresh(pg)
            await K.press('Escape'); await pg.wait_for_timeout(120); print('  Esc ->', (await st())['mode'], '| focus', await foc())
            for k in ('KeyX', 'KeyZ', 'Space', 'Enter', 'ArrowUp'):
                await K.press(k)
            await pg.wait_for_timeout(120); print('  X Z Space Enter ArrowUp while paused ->', pj(await st()))
            # 用滑鼠點一下音效（焦點留在上面），再按空白鍵
            r = await pg.evaluate("(() => { const b = document.getElementById('tSfx').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
            await pg.mouse.click(r[0], r[1]); await pg.wait_for_timeout(80); sfx1 = await pg.evaluate("window.__qp.SV.sfx")
            await K.press('Space'); await pg.wait_for_timeout(80); sfx2 = await pg.evaluate("window.__qp.SV.sfx")
            print('  mouse click 音效 ->', sfx1, '| then Space ->', sfx2, '| focus', await foc(), '| mode', (await st())['mode'])
            if not sfx2: await pg.evaluate("document.getElementById('tSfx').click()")
            await K.press('KeyP'); await pg.wait_for_timeout(150); print('  P ->', pj(await st()), '| focus', await foc())
            v0 = (await st())['v']; await K.press('Space'); await pg.wait_for_timeout(150); print('  Space after resuming -> fired', (await st())['v'] - v0)
            # 暫停 → 重來（Enter）→ 開場時按空白鍵、Esc
            await pg.evaluate(JS_TO_MY_AIM, 60); await pg.evaluate("window.__qp.G.freeze = false")
            await K.press('KeyP'); await pg.wait_for_timeout(100)
            await pg.evaluate("document.getElementById('btnRetry').focus()"); await K.press('Shift+Tab'); await K.press('Tab'); await K.press('Enter'); await pg.wait_for_timeout(200)
            print('  Enter on 重來 ->', pj(await st()), 'phase', await pg.evaluate("window.__qp.S.phase"), '| focus', await foc())

        print('errors:', msgs)
        await b.close()

asyncio.run(main())
