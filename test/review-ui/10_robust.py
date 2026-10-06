"""耐操度：localStorage 不能用／裡面是垃圾、沒有 AudioContext、很小很寬的視窗、dpr 3、一開始大小是 0。
   每種情況：開頁面 → 主畫面有沒有畫出來 → 進第一關打一輪 → 暫停 → 回主畫面，列出 console / page error。
   python3 test/review-ui/10_robust.py [only=<片段>]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
from common import *

ONLY = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('only=')]
KEY = 'qianpao-pocheng-1'


async def smoke(pg, msgs, tag, shot=False):
    """主畫面 → 第一關打一輪 → 暫停 → 回主畫面。回傳摘要。"""
    r = {}
    try:
        r['boot'] = await pg.evaluate("(() => { const q = window.__qp; if (!q) return 'NO __qp (boot crashed)'; const c = document.getElementById('cv'); return {mode: q.G.mode, lvls: document.querySelectorAll('#lvls button').length, cv: [c.width, c.height], sel: q.UI.sel, open: q.SV.open, coins: q.SV.coins, up: q.SV.up, stars: q.SV.stars, go: document.getElementById('btnGo').disabled, homeCoins: document.getElementById('homeCoins').textContent}; })()")
        if isinstance(r['boot'], str):
            if shot: await pg.screenshot(path=shot_path('robust_' + tag))
            return r
        await pg.evaluate("document.getElementById('btnShop').click()"); await pg.wait_for_timeout(120)
        r['shop'] = await pg.evaluate("[...document.querySelectorAll('#upList button')].map(b => b.textContent).join('|')")
        await pg.evaluate("document.querySelector('#shop [data-close]').click()")
        await pg.evaluate("(() => { const q = window.__qp; q.UI.sel = 0; document.getElementById('btnGo').disabled = false; document.getElementById('btnGo').click(); })()")
        await wait_my_aim(pg, 8000)
        await pg.evaluate("document.getElementById('btnFire').click()"); await pg.wait_for_timeout(900)
        r['play'] = await pg.evaluate("(() => { const q = window.__qp; return q.S.phase + ' shots=' + q.SH.n + ' au=' + (q.AU.ctx ? q.AU.ctx.state : 'none') + ' mus=' + !!q.AU.mus; })()")
        if shot: await pg.screenshot(path=shot_path('robust_' + tag))
        await pg.evaluate("document.getElementById('btnPause').click()"); await pg.wait_for_timeout(100)
        await pg.evaluate("document.getElementById('tSfx').click(); document.getElementById('tMus').click(); document.getElementById('tMus').click(); document.getElementById('tSfx').click(); document.getElementById('btnQuit').click()"); await pg.wait_for_timeout(200)
        r['home'] = await pg.evaluate("window.__qp.G.mode")
    except Exception as e:
        r['EXC'] = repr(e)[:200]
    r['errors'] = list(msgs)
    return r


async def main():
    want = lambda n: (not ONLY) or any(o in n for o in ONLY)
    async with async_playwright() as p:
        # ---------- localStorage ----------
        if want('storage'):
            cases = {
                'throws on access': "Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('denied', 'SecurityError'); }});",
                'getItem/setItem throw': "Storage.prototype.getItem = function () { throw new Error('nope'); }; Storage.prototype.setItem = function () { throw new Error('quota'); };",
                'undefined': "Object.defineProperty(window, 'localStorage', {value: undefined});",
            }
            for name, js in cases.items():
                b, ctx, pg, msgs = await open_page(p, 844, 390, init=js)
                print('localStorage', name, '=>', json.dumps(await smoke(pg, msgs, 'ls'), ensure_ascii=False), flush=True); await b.close()
            garbage = ['not json {', '[]', '42', '"str"', 'null', '{"coins":"abc","open":"x","stars":"zzz","up":7,"diff":"hard"}', '{"coins":-50,"open":-3,"stars":[9,-2,"a",null,{},[]],"up":{"dmg":99,"aim":-4,"hp":"x","shield":null,"ult":[]}}',
                       '{"open":2.5}', '{"open":6.9,"stars":[1.5,2.5,0,0,0,0]}', '{"up":{"dmg":2.5,"aim":0.4}, "coins": 1e400}', '{"coins":1e21,"open":3}', '{"stars":{"0":3},"up":"abc","coins":true}', '{"coins":12.7,"open":"4","diff":2,"flip":1,"sfx":0}']
            for g in garbage:
                b, ctx, pg, msgs = await open_page(p, 844, 390, init="try { localStorage.setItem(%s, %s); } catch (e) {}" % (json.dumps(KEY), json.dumps(g)))
                r = await smoke(pg, msgs, 'garbage_' + str(garbage.index(g)), shot=g in ('{"open":2.5}', '{"up":{"dmg":2.5,"aim":0.4}, "coins": 1e400}'))
                bad = isinstance(r.get('boot'), str) or r.get('EXC') or r['errors']
                print(('!! ' if bad else 'ok ') + 'garbage', g[:60], '=>', json.dumps(r, ensure_ascii=False), flush=True); await b.close()

        # ---------- AudioContext ----------
        if want('audio'):
            cases = {
                'no AudioContext': "delete window.AudioContext; delete window.webkitAudioContext; Object.defineProperty(window, 'AudioContext', {value: undefined}); Object.defineProperty(window, 'webkitAudioContext', {value: undefined});",
                'constructor throws': "window.AudioContext = function () { throw new Error('no audio device'); }; window.webkitAudioContext = window.AudioContext;",
                'resume() rejects': "const R = AudioContext.prototype.resume; AudioContext.prototype.resume = function () { return Promise.reject(new DOMException('not allowed', 'NotAllowedError')); };",
                'no navigator.vibrate': "Object.defineProperty(Navigator.prototype, 'vibrate', {value: undefined});",
            }
            for name, js in cases.items():
                b, ctx, pg, msgs = await open_page(p, 844, 390, init=js)
                print('audio', name, '=>', json.dumps(await smoke(pg, msgs, 'au'), ensure_ascii=False), flush=True); await b.close()

        # ---------- 視窗大小 ----------
        if want('size'):
            for (w, h, touch, dsf) in [(320, 200, True, 2), (480, 270, True, 2), (568, 264, True, 2), (200, 120, False, 1), (2560, 600, False, 1), (3000, 400, False, 1), (500, 1400, False, 1), (300, 300, False, 2), (932, 430, True, 3), (360, 640, True, 3), (280, 653, True, 3)]:
                b, ctx, pg, msgs = await open_page(p, w, h, touch=touch, dsf=dsf)
                info = await pg.evaluate("(() => { const q = window.__qp, G = q.G; return {rot: G.rot, stage: [G.sw, G.sh, G.ox, G.oy], u: getComputedStyle(document.getElementById('stage')).getPropertyValue('--u'), cv: [q.V.W, q.V.H], s: +q.V.s.toFixed(2)}; })()")
                await pg.screenshot(path=shot_path(f'robust_size_{w}x{h}_home'))
                r = await smoke(pg, msgs, f'size_{w}x{h}', shot=True)
                # 主畫面的東西有沒有跑出舞台
                over = await pg.evaluate("""(() => { const st = document.getElementById('stage').getBoundingClientRect(), out = [];
                  for (const e of document.querySelectorAll('#home button, #home h1, #home .lvinfo')) { const r = e.getBoundingClientRect(); if (r.left < st.left - 1 || r.top < st.top - 1 || r.right > st.right + 1 || r.bottom > st.bottom + 1) out.push((e.id || e.className.split(' ')[0] || e.tagName) + JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round))); }
                  const a = document.querySelector('.home-l').getBoundingClientRect(), l = document.querySelector('.logo').getBoundingClientRect(), ac = document.querySelector('.actions').getBoundingClientRect();
                  if (l.bottom > ac.top + 1) out.push('logo overlaps actions by ' + Math.round(l.bottom - ac.top));
                  const lv = [...document.querySelectorAll('#lvls button')].map(e => e.getBoundingClientRect()); if (lv.length && (lv[0].top < st.top - 1 || lv[lv.length - 1].bottom > st.bottom + 1)) out.push('level list taller than stage: ' + Math.round(lv[0].top) + '..' + Math.round(lv[lv.length - 1].bottom) + ' vs ' + Math.round(st.top) + '..' + Math.round(st.bottom));
                  return out; })()""")
                print(f'size {w}x{h} dsf{dsf}', json.dumps(info), '=>', json.dumps({k: r[k] for k in r if k != 'boot'}, ensure_ascii=False), 'HOME OVERFLOW:' if over else '', over, flush=True); await b.close()

        # ---------- 一開始大小是 0（例如放在還沒顯示的 iframe 裡） ----------
        if want('zero'):
            b, ctx, pg, msgs = await open_page(p, 844, 390, init="document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.display = 'none'; }, true);")
            r0 = await pg.evaluate("(() => { const q = window.__qp; return q ? {cv: [q.V.W, q.V.H], s: q.V.s} : 'NO __qp'; })()")
            await pg.evaluate("document.documentElement.style.display = ''"); await pg.wait_for_timeout(500)
            print('zero-size boot', r0, '=> after show', json.dumps(await smoke(pg, msgs, 'zero', shot=True), ensure_ascii=False), flush=True); await b.close()

asyncio.run(main())
