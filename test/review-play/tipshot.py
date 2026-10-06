"""即時（不凍結）進某一關，等提示泡泡出現時截圖：python3 test/review-play/tipshot.py <關卡> [等幾秒=2.9] [寬x高=844x390] → shots/review-play/tip_L<n>_<寬x高>.png"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent.parent
lvl = int(sys.argv[1]); wait = float(sys.argv[2]) if len(sys.argv) > 2 else 2.9
W, H = [int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else '844x390').split('x')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page()
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(700)
        await pg.evaluate("(l) => { const q = window.__qp; q.SV.open = 6; q.SV.seen = true; q.startLevel(l - 1); }", lvl)
        await pg.wait_for_timeout(int(wait * 1000))
        out = root / f'shots/review-play/tip_L{lvl}_{W}x{H}.png'; await pg.screenshot(path=str(out))
        r = await pg.evaluate("(() => { const e = document.getElementById('say').getBoundingClientRect(); return [Math.round(e.left), Math.round(e.top), Math.round(e.width), Math.round(e.height), document.getElementById('say').textContent.length]; })()")
        print('saved', out, 'say box (x, y, w, h, chars):', r); await b.close()
asyncio.run(main())
