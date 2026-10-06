"""把各個畫面（主畫面、設定、強化、戰鬥、暫停、勝負結算）截圖下來看版面：python3 test/ui.py [寬x高] [--portrait]"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]; flags = [a for a in sys.argv[1:] if a.startswith('--')]
W, H = [int(x) for x in (args[0] if args else '844x390').split('x')]
port = '--portrait' in flags
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=port, is_mobile=port)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(900)
        tag = f'{W}x{H}'
        shot = lambda name: pg.screenshot(path=str(root / f'shots/ui_{name}_{tag}.png'))
        info = lambda: pg.evaluate("(() => { const q = window.__qp; return {mode: q.G.mode, state: q.S.state, round: q.S.round, res: !document.getElementById('result').hidden, stars: document.querySelectorAll('#resStars .on').length, coins: q.SV.coins, open: q.SV.open}; })()")
        await shot('home')
        await pg.evaluate("document.getElementById('btnOpt').click()"); await pg.wait_for_timeout(350); await shot('opt')
        await pg.evaluate("document.querySelector('#opt [data-close]').click()")
        await pg.evaluate("window.__qp.SV.coins = 400; document.getElementById('btnShop').click()"); await pg.wait_for_timeout(350); await shot('shop')
        await pg.evaluate("document.querySelector('#upList button').click()"); await pg.wait_for_timeout(200)
        print('shop after buy', await pg.evaluate("JSON.stringify(window.__qp.SV.up) + ' coins ' + window.__qp.SV.coins"))
        await pg.evaluate("document.querySelector('#shop [data-close]').click()")
        await pg.evaluate("document.getElementById('btnGo').click()"); await pg.wait_for_timeout(3000); await shot('play')
        await pg.evaluate("document.getElementById('btnPause').click()"); await pg.wait_for_timeout(350); await shot('pause'); print('paused', await info())
        t0 = await pg.evaluate("window.__qp.S.time"); await pg.wait_for_timeout(500); t1 = await pg.evaluate("window.__qp.S.time"); print('time frozen while paused:', t0 == t1)
        await pg.evaluate("document.getElementById('btnResume').click()"); await pg.wait_for_timeout(200)
        # 技能按鈕：護罩還沒滿，按了沒反應；直接灌滿再按
        await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.shield.c = 100; T.ult.c = 100; })()"); await pg.wait_for_timeout(120)
        await pg.evaluate("document.getElementById('btnShield').click(); document.getElementById('btnUlt').click()"); await pg.wait_for_timeout(500); await shot('skills')
        print('skills', await pg.evaluate("(() => { const T = window.__qp.S.team[0]; return {shieldOn: T.shield.on, armed: T.ult.armed, ultTxt: document.getElementById('ultNum').textContent, shTxt: document.getElementById('shNum').textContent}; })()"))
        await pg.evaluate("document.getElementById('btnFire').click()"); await pg.wait_for_timeout(1500); await shot('ultfire')
        print('after fire', await pg.evaluate("(() => { const q = window.__qp; return {phase: q.S.phase, shots: q.SH.n, fired: q.S.stat.fired, armed: q.S.team[0].ult.armed}; })()"))
        # 直接讓敵軍全倒，看勝利結算
        await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
        await pg.wait_for_timeout(2500); await shot('finale')
        await pg.wait_for_timeout(4500); await shot('win'); print('win', await info())
        await pg.evaluate("document.getElementById('btnAgain').click()"); await pg.wait_for_timeout(2500)
        await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[0].units) q.killUnit(u, 1, 0); })()")
        await pg.wait_for_timeout(6500); await shot('lose'); print('lose', await info())
        await pg.evaluate("document.getElementById('btnHome').click()"); await pg.wait_for_timeout(600); await shot('home2'); print('home', await info())
        print('console:', msgs[:10]); await b.close()
asyncio.run(main())
