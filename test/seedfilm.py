"""重播一場固定種子的自動玩家對局（跟 test/table.js、test/why.js 同一個種子），連拍幾張。
   python3 test/seedfilm.py <關卡 1-12> <自動玩家> <第幾場> <秒數,…> [標籤]
   圖存 shots/seed_L<關>_<標籤>.png"""
import asyncio, sys, pathlib, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent
lvl = int(sys.argv[1]); bot = sys.argv[2]; sd = int(sys.argv[3]); times = [float(x) for x in sys.argv[4].split(',')]; tag = sys.argv[5] if len(sys.argv) > 5 else 'a'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1200, 'height': 560}, device_scale_factor=1)
        await ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        await pg.evaluate("([l, bot, sd]) => { const q = window.__qp; q.G.freeze = true; q.startLevel(l - 1); const on = q.S.on; q.simInit(l - 1, {}, 9000 + sd * 7919 + (l - 1) * 131, 1, { botA: q.BOTS[bot] }); q.S.on = on; }", [lvl, bot, sd])
        await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}')
        tiles = []; t = 0.0
        for tt in times:
            await pg.evaluate("(s) => window.__qp.advance(s)", tt - t); t = tt
            png = await pg.screenshot(); im = Image.open(io.BytesIO(png)).convert('RGB'); d = ImageDraw.Draw(im); d.rectangle([0, 0, 120, 28], fill=(0, 0, 0)); d.text((6, 6), f't={tt:.1f}s', fill=(255, 255, 255)); tiles.append(im)
        await b.close()
    cols = 2; rows = (len(tiles) + 1) // 2; sw, sh = tiles[0].size; k = 0.5
    sheet = Image.new('RGB', (int(sw * k) * cols, int(sh * k) * rows), (20, 20, 20))
    for i, im in enumerate(tiles): sheet.paste(im.resize((int(sw * k), int(sh * k))), ((i % cols) * int(sw * k), (i // cols) * int(sh * k)))
    out = root / 'shots' / f'seed_L{lvl}_{tag}.png'; sheet.save(out); print(out, msgs[:5])
asyncio.run(main())
