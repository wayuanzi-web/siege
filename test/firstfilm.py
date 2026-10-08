"""重播 test/first.js 的某一場（敵軍先打、我方不還手），連拍幾張
   python3 test/firstfilm.py <關卡> <seed> <秒數,…> [標籤]"""
import asyncio, sys, pathlib, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent
lvl = int(sys.argv[1]); seed = int(sys.argv[2]); times = [float(x) for x in sys.argv[3].split(',')]; tag = sys.argv[4] if len(sys.argv) > 4 else 'a'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1200, 'height': 560}, device_scale_factor=1)
        await ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        pg = await ctx.new_page()
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        await pg.evaluate("([l, sd]) => { const q = window.__qp; q.G.freeze = true; q.startLevel(l - 1); const on = q.S.on; q.simInit(l - 1, {}, sd, 1, { mute: 0 }); q.S.team[0].ai = null; q.S.on = on; }", [lvl, seed])
        await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}')
        tiles = []; t = 0.0
        for tt in times:
            await pg.evaluate("(s) => { const q = window.__qp, S = q.S; const n = Math.round(s * 60); for (let i = 0; i < n; i++) { if (S.phase === 'aim' && S.turn === 0) q.simFire(0); q.advance(1 / 60); } }", tt - t); t = tt
            png = await pg.screenshot(); im = Image.open(io.BytesIO(png)).convert('RGB'); d = ImageDraw.Draw(im); d.rectangle([0, 0, 120, 28], fill=(0, 0, 0)); d.text((6, 6), f't={tt:.1f}s', fill=(255, 255, 255)); tiles.append(im.crop((0, 0, 600, 560)))
        await b.close()
    cols = 4; rows = (len(tiles) + 3) // 4; sw, sh = tiles[0].size; k = 0.6
    sheet = Image.new('RGB', (int(sw * k) * cols, int(sh * k) * rows), (20, 20, 20))
    for i, im in enumerate(tiles): sheet.paste(im.resize((int(sw * k), int(sh * k))), ((i % cols) * int(sw * k), (i // cols) * int(sh * k)))
    out = root / 'shots' / f'first_L{lvl}_{tag}.png'; sheet.save(out); print(out)
asyncio.run(main())
