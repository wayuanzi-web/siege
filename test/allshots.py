"""python3 test/allshots.py <levels e.g. 1-12> <seconds> <tag> [WxH] [--bot]: one screenshot per level after N seconds, contact sheet"""
import asyncio, sys, pathlib, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent
rg = sys.argv[1].split('-'); L0, L1 = int(rg[0]), int(rg[-1])
T = float(sys.argv[2]); tag = sys.argv[3]; W, H = [int(x) for x in (sys.argv[4] if len(sys.argv) > 4 and 'x' in sys.argv[4] else '1200x560').split('x')]
bot = '--bot' in sys.argv
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
        await ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: msgs.append(m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        tiles = []
        for l in range(L0, L1 + 1):
            await pg.evaluate("(a) => { const q = window.__qp; q.G.freeze = true; q.startLevel(a[0] - 1); if (!a[1]) { q.S.team[0].ai = null; q.S.team[1].ai = null; } else q.aiInit(q.S.team[0], q.BOTS.casual, {aiErr: 1}); }", [l, bot])
            await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}')
            await pg.evaluate("(s) => window.__qp.advance(s)", T)
            png = await pg.screenshot()
            im = Image.open(io.BytesIO(png)).convert('RGB'); d = ImageDraw.Draw(im); d.rectangle([0, H - 26, 90, H], fill=(0, 0, 0)); d.text((6, H - 20), f'L{l} t={T}', fill=(255, 255, 255))
            tiles.append(im)
        await b.close()
    print('console:', msgs[:12])
    cols = 2 if len(tiles) > 1 else 1; rows = (len(tiles) + cols - 1) // cols
    k = 0.5; sw, sh = int(W * k), int(H * k)
    sheet = Image.new('RGB', (sw * cols, sh * rows), (0, 0, 0))
    for i, im in enumerate(tiles): sheet.paste(im.resize((sw, sh)), ((i % cols) * sw, (i // cols) * sh))
    out = root / 'shots' / f'all_{tag}.png'; (root / 'shots').mkdir(exist_ok=True); sheet.save(out); print(out)
asyncio.run(main())
