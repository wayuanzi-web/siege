"""src/dist/qianpao.html（片段）包進最陽春的頁面；再把那一頁放進 <iframe>（一般的、sandbox 的），改 iframe 的大小、
把滑鼠拖出 iframe 放開。
python3 test/review2-ui/22_fragment_iframe.py [only=bare|iframe|sandbox]"""
import asyncio, re, sys, json
from playwright.async_api import async_playwright
from common import *

ONLY = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('only=')]
want = lambda n: (not ONLY) or n in ONLY
OUT = HERE / 'out'
BARE = OUT / 'bare.html'
BARE.write_text('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + FRAG.read_text(encoding='utf8') + '</body></html>', encoding='utf8')
HOST = OUT / 'host_iframe.html'
HOST.write_text('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>body{margin:0;background:#789;font:14px sans-serif}#f{position:absolute;left:60px;top:50px;width:800px;height:450px;border:0;background:#000}</style></head><body><p>host page</p><iframe id="f" src="bare.html"></iframe></body></html>', encoding='utf8')
HOST_SB = OUT / 'host_sandbox.html'
HOST_SB.write_text('<!doctype html><html><head><meta charset=utf-8><style>body{margin:0;background:#789}#f{position:absolute;left:60px;top:50px;width:800px;height:450px;border:0}</style></head><body><iframe id="f" sandbox="allow-scripts" src="bare.html"></iframe></body></html>', encoding='utf8')

PAGE = """(() => { const q = window.__qp; if (!q) return {fatal: 'no __qp'}; const G = q.G, de = document.documentElement, app = document.getElementById('app').getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
  const hiddenShown = ['hud', 'shop', 'opt', 'result', 'pauseBtns', 'btnFlip', 'hint', 'turnChip', 'windBox', 'turn', 'keyHelp'].filter((id) => { const e = document.getElementById(id); return e.hidden && getComputedStyle(e).display !== 'none'; });
  return {win: [innerWidth, innerHeight], app: [app.width, app.height].map(Math.round), stage: [G.sw, G.sh, G.ox, G.oy], rot: G.rot, u: +parseFloat(getComputedStyle(document.getElementById('stage')).getPropertyValue('--u')).toFixed(2),
    scroll: [de.scrollWidth - de.clientWidth, de.scrollHeight - de.clientHeight, document.body.scrollHeight - document.body.clientHeight], bodyMargin: getComputedStyle(document.body).margin, hiddenShown, title: document.title, mode: G.mode, frames: q.RD.frame,
    lvlsOver: (() => { const b = [...document.querySelectorAll('#lvls button')].map(e => e.getBoundingClientRect()); return b.length ? Math.round(Math.max(st.top - b[0].top, b[b.length - 1].bottom - st.bottom, 0)) : -1; })(), lang: de.lang || '(none)'}; })()"""
PLAY = """(async () => { const q = window.__qp; q.SV.seen = true; q.startLevel(0); q.G.freeze = true; let n = 0; while (n++ < 300 && q.S.phase !== 'aim') q.advance(1 / 60); q.G.freeze = false;
  const st = document.getElementById('stage').getBoundingClientRect(), off = []; for (const id of ['btnPause', 'hpA', 'hpB', 'btnFire', 'btnShield', 'btnUlt', 'turnChip', 'aimInfo', 'crewA', 'crewB']) { const e = document.getElementById(id); const r = e.getBoundingClientRect(); if (r.width && (r.left < st.left - 1 || r.top < st.top - 1 || r.right > st.right + 1 || r.bottom > st.bottom + 1)) off.push(id); }
  const ids = ['btnPause', 'crewA', 'hpA', 'hudName', 'roundTxt', 'hpB', 'crewB', 'btnFire', 'aimInfo', 'turnChip', 'btnShield', 'btnUlt'], els = ids.map(i => document.getElementById(i)).filter(e => e.getBoundingClientRect().width), rs = els.map(e => e.getBoundingClientRect()), ov = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { if (els[i].contains(els[j]) || els[j].contains(els[i])) continue; const a = rs[i], b = rs[j], ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ox > 1 && oy > 1) ov.push(els[i].id + 'x' + els[j].id + ' ' + Math.round(ox) + 'x' + Math.round(oy)); }
  return {phase: q.S.phase, offStage: off, overlap: ov, minTap: Math.round(Math.min(...['btnPause', 'btnFire', 'btnShield', 'btnUlt'].map(i => { const r = document.getElementById(i).getBoundingClientRect(); return Math.min(r.width, r.height); })))}; })()"""


async def main():
    async with async_playwright() as p:
        if want('bare'):
            print('--- fragment in a bare page')
            for (w, h, touch) in ((844, 390, True), (390, 844, True), (360, 640, True), (1280, 720, False), (1024, 768, False), (640, 480, False), (480, 320, False), (600, 800, False), (400, 700, False)):
                b, ctx, pg, msgs = await open_page(p, w, h, touch=touch, dsf=1, url=BARE.as_uri())
                r = await pg.evaluate(PAGE); pl = await pg.evaluate(PLAY)
                await pg.screenshot(path=shot_path(f'bare_{w}x{h}_L1'))
                flags = []
                if r.get('hiddenShown'): flags.append('hidden-but-shown ' + str(r['hiddenShown']))
                if any(v > 0 for v in r['scroll']): flags.append('page scrolls ' + str(r['scroll']))
                if r['app'] != [w, h]: flags.append('app size ' + str(r['app']))
                if r['lvlsOver'] > 0: flags.append('home level list sticks out of the stage by %dpx' % r['lvlsOver'])
                if pl['offStage']: flags.append('HUD off stage ' + str(pl['offStage']))
                if pl['overlap']: flags.append('HUD overlap ' + str(pl['overlap']))
                if pl['minTap'] < 40: flags.append('smallest battle button %dpx' % pl['minTap'])
                print(f"  {w}x{h}{' touch' if touch else ''}: stage {r['stage']} rot {r['rot']} u {r['u']} title {r['title']!r} lang {r['lang']} -> {'; '.join(flags) or 'ok'} | errors {msgs}")
                await b.close()

        for (name, host) in (('iframe', HOST), ('sandbox', HOST_SB)):
            if not want(name): continue
            print(f'--- inside an <iframe>{" sandbox=allow-scripts (no same-origin: localStorage throws)" if name == "sandbox" else ""}')
            b, ctx, pg, msgs = await open_page(p, 1100, 800, dsf=1, url=host.as_uri())
            await pg.wait_for_timeout(500)
            fr = [f for f in pg.frames if f != pg.main_frame][0]
            ls = await fr.evaluate("(() => { try { localStorage.setItem('x', '1'); return 'works'; } catch (e) { return 'throws ' + e.name; } })()")
            r = await fr.evaluate(PAGE); print('  boot:', pj({k: r[k] for k in ('win', 'stage', 'rot', 'u', 'mode', 'frames', 'hiddenShown', 'scroll')}), '| localStorage', ls)
            # 改 iframe 大小
            for (w, h) in ((400, 700), (320, 200), (0, 0), (900, 500), (500, 500), (800, 450)):
                await pg.evaluate("([w, h]) => { const f = document.getElementById('f'); f.style.width = w + 'px'; f.style.height = h + 'px'; }", [w, h]); await pg.wait_for_timeout(350)
                r = await fr.evaluate(PAGE); ok = (w == 0) or (r['stage'][0] <= w and r['stage'][1] <= h and r['win'] == [w, h])
                print(f"  iframe -> {w}x{h}: win {r['win']} stage {r['stage']} u {r['u']} frames {r['frames']} {'ok' if ok else 'MISMATCH'}")
            # display:none 再顯示
            f0 = (await fr.evaluate(PAGE))['frames']
            await pg.evaluate("document.getElementById('f').style.display = 'none'"); await pg.wait_for_timeout(500)
            await pg.evaluate("document.getElementById('f').style.display = ''"); await pg.wait_for_timeout(500)
            r = await fr.evaluate(PAGE); print('  display:none for 0.5s then shown again: stage', r['stage'], 'frames +', r['frames'] - f0)
            # 進關卡；滑鼠拖出 iframe 才放開
            pl = await fr.evaluate(PLAY); print('  level 1 in the 800x450 iframe:', pj(pl))
            M = pg.mouse; aim = lambda: fr.evaluate(AIM); vol = lambda: fr.evaluate(VOLLEYS)
            a0 = await aim()
            await M.move(60 + 400, 50 + 225); await M.down(); await M.move(60 + 460, 50 + 180, steps=5); a1 = await aim()
            await M.move(60 + 600, 20, steps=5); a2 = await aim()        # 往上拖出 iframe（到上面的主頁面）
            await M.move(1000, 700, steps=5); a3 = await aim()            # 再拖到 iframe 右下方外面
            d = await fr.evaluate("!!window.__qp.G.drag")
            await M.up(); await pg.wait_for_timeout(250)
            print('  mouse drag out of the iframe: aim', a0, '->', a1, '(inside) ->', a2, '(above iframe) ->', a3, '(outside, lower right); drag alive', d, '| released outside -> volleys', await vol(), '| drag left', await fr.evaluate("!!window.__qp.G.drag"))
            await M.move(60 + 300, 50 + 200, steps=3); a4 = await aim(); await M.move(60 + 500, 50 + 300, steps=3)
            print('  mouse back over the iframe with no button: aim moved', (await aim()) != a4)
            # 在 iframe 裡按住、到主頁面上點一下別的地方（iframe 失去焦點）
            await fr.evaluate("(async () => { const q = window.__qp; q.G.freeze = true; let n = 0; while (n++ < 4000 && !(q.S.phase === 'aim' && q.S.turn === 0)) q.advance(1 / 60); q.G.freeze = false; })()")
            v0 = await vol()
            await M.click(60 + 400, 50 + 225); await pg.keyboard.press('Space'); await pg.wait_for_timeout(150)
            print('  click inside the iframe then Space: fired', (await vol()) - v0, '| then click on the host page and press P:', end=' ')
            await M.click(20, 20); await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(150); print('mode', await fr.evaluate("window.__qp.G.mode"), '(keys go to the host page now)')
            # 存檔
            await fr.evaluate("(() => { const q = window.__qp; q.SV.coins = 77; try { document.getElementById('btnPause').click(); document.getElementById('btnQuit').click(); } catch (e) {} })()"); await pg.wait_for_timeout(200)
            print('  home again:', await fr.evaluate("window.__qp.G.mode"), '| errors', msgs)
            await pg.screenshot(path=shot_path(f'{name}_host'))
            await b.close()

asyncio.run(main())
