"""把各個畫面（主畫面、暫停、強化、勝負結算）截圖下來看版面：python3 test/ui.py [寬x高] [--portrait]"""
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
        await shot('home')
        await pg.evaluate("document.getElementById('btnOpt').click()"); await pg.wait_for_timeout(350); await shot('opt')
        await pg.evaluate("document.querySelector('#opt [data-close]').click()")
        await pg.evaluate("window.__qp.SV.coins = 400; document.getElementById('btnShop').click()"); await pg.wait_for_timeout(350); await shot('shop')
        await pg.evaluate("document.querySelector('#shop [data-close]').click()")
        await pg.evaluate("document.getElementById('btnGo').click()"); await pg.wait_for_timeout(2600); await shot('play')
        await pg.evaluate("document.getElementById('btnPause').click()"); await pg.wait_for_timeout(350); await shot('pause')
        await pg.evaluate("document.getElementById('btnResume').click()")
        # 直接讓敵城垮掉，看勝利結算
        await pg.evaluate("(() => { const q = window.__qp, st = q.S.st[1]; for (let i = 0; i < st.n; i++) if (st.m[i] && st.m[i] !== 8) st.hp[i] = 0.01; for (const u of q.S.team[1].units) u.hp = 0.01; q.aiInit(q.S.team[0], q.BOTS.expert, {aiErr:1, aiThink:1}); })()")
        await pg.wait_for_timeout(9000); await shot('win')
        st = await pg.evaluate("(() => { const q = window.__qp; return {mode: q.G.mode, state: q.S.state, res: !document.getElementById('result').hidden}; })()"); print('win', st)
        await pg.evaluate("document.getElementById('btnAgain').click()"); await pg.wait_for_timeout(600)
        await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[0].units) u.hp = 0.01; const st = q.S.st[0]; for (let i = 0; i < st.n; i++) if (st.m[i] && st.m[i] !== 8) st.hp[i] = 0.01; })()")
        await pg.wait_for_timeout(11000); await shot('lose')
        st = await pg.evaluate("(() => { const q = window.__qp; return {mode: q.G.mode, state: q.S.state, res: !document.getElementById('result').hidden}; })()"); print('lose', st)
        print('console:', msgs[:10]); await b.close()
asyncio.run(main())
