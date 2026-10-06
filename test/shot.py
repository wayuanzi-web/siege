"""截圖：python3 test/shot.py <關卡> <推進秒數,…> [寬x高] [--home] [--portrait] [--nobot]
   例：python3 test/shot.py 1 3,12,25 844x390"""
import asyncio, sys, pathlib, json, os
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = [a for a in sys.argv[1:] if a.startswith('--')]
lvl = int(args[0]) if args else 1
times = [float(x) for x in (args[1] if len(args) > 1 else '3,12').split(',')]
size = args[2] if len(args) > 2 else '844x390'
W, H = [int(x) for x in size.split('x')]
tag = (args[3] if len(args) > 3 else '')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch='--portrait' in flags, is_mobile='--portrait' in flags)
        pg = await ctx.new_page()
        msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri())
        await pg.wait_for_timeout(700)
        (root / 'shots').mkdir(exist_ok=True)
        if '--home' in flags:
            await pg.evaluate("(() => { const q = window.__qp; q.G.freeze = true; q.advance(6); })()")
            await pg.screenshot(path=str(root / f'shots/home{tag}_{W}x{H}.png'))
            print('home shot'); print('console:', msgs[:10]); await b.close(); return
        await pg.evaluate("(l) => { const q = window.__qp; q.G.freeze = true; q.startLevel(l - 1); %s }" % ('' if '--nobot' in flags else "q.aiInit(q.S.team[0], q.BOTS.casual, {aiErr: 1, aiThink: 1});"), lvl)
        if '--clean' in flags: await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}')
        if '--nohud' in flags: await pg.add_style_tag(content='#hud{display:none!important}')
        t = 0
        for tt in times:
            await pg.evaluate("(s) => window.__qp.advance(s)", tt - t); t = tt
            st = await pg.evaluate("(() => { const q = window.__qp, S = q.S; return {state: S.state, t: +S.time.toFixed(1), me: Math.round(q.teamBar(0)*100), foe: Math.round(q.teamBar(1)*100), shots: q.SH.n, parts: q.FX.n, alive: [S.team[0].alive, S.team[1].alive]}; })()")
            await pg.screenshot(path=str(root / f'shots/L{lvl}{tag}_{int(tt):03d}_{W}x{H}.png'))
            print(tt, json.dumps(st))
        print('console:', msgs[:10])
        await b.close()
asyncio.run(main())
