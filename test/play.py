"""模擬真的玩家操作（不用自動玩家）：python3 test/play.py <關卡> [寬x高] [--portrait]
   進關卡 → 等輪到我 → 截圖 → 用觸控拖曳瞄準 → 放開發射 → 截圖 …"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]; flags = [a for a in sys.argv[1:] if a.startswith('--')]
lvl = int(args[0]) if args else 1
W, H = [int(x) for x in (args[1] if len(args) > 1 else '844x390').split('x')]
port = '--portrait' in flags
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(800)
        tag = f'{W}x{H}'
        shot = lambda name: pg.screenshot(path=str(root / f'shots/play{lvl}_{name}_{tag}.png'))
        await pg.evaluate("(l) => { const q = window.__qp; q.SV.open = 6; q.UI.sel = l - 1; }", lvl)
        await pg.evaluate("document.getElementById('btnGo').click()")
        await pg.wait_for_timeout(3200); await shot('1aim')
        st = lambda: pg.evaluate("(() => { const q = window.__qp, S = q.S; return {phase: S.phase, turn: S.turn, round: S.round, aim: S.team[0].aim.map(v => +v.toFixed(1)), rot: q.G.rot, tut: q.G.tut, hint: !document.getElementById('hint').hidden}; })()")
        print('ready', await st())
        rot = (await st())['rot']
        # 觸控拖曳：在畫面中間偏左按下，往「遊戲裡的右上」拖
        async def drag(dx, dy, steps=12, hold=False):
            sx, sy = (W * 0.4, H * 0.6) if not rot else (W * 0.4, H * 0.4)
            ev = "([t, x, y]) => document.getElementById('stage').dispatchEvent(new PointerEvent(t, {pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true}))"
            await pg.evaluate(ev, ['pointerdown', sx, sy])
            for i in range(1, steps + 1):
                gx, gy = dx * i / steps, dy * i / steps
                cx, cy = (sx + gx, sy + gy) if not rot else (sx - gy, sy + gx)      # 直拿時畫面轉了 90 度
                await pg.evaluate(ev, ['pointermove', cx, cy]); await pg.wait_for_timeout(16)
            if hold: return (cx, cy)
            await pg.evaluate(ev, ['pointerup', cx, cy])
        pos = await drag(30, -34, hold=True); await pg.wait_for_timeout(250); await shot('2drag'); print('dragging', await st())
        await pg.evaluate("([x, y]) => document.getElementById('stage').dispatchEvent(new PointerEvent('pointerup', {pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true}))", list(pos))
        await pg.wait_for_timeout(1300); await shot('3fired'); print('fired', await st())
        await pg.wait_for_timeout(2600); await shot('4impact'); print('impact', await st())
        await pg.wait_for_timeout(4200); await shot('5foe'); print('foe', await st())
        await pg.wait_for_timeout(5000); await shot('6next'); print('next', await st())
        print('console:', msgs[:10]); await b.close()
asyncio.run(main())
