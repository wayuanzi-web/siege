"""六關一覽：python3 test/sheet.py [推進秒數=0.3] [寬x高=844x390] [標籤]  → shots/sheet_<標籤>.png"""
import asyncio, sys, pathlib, io
from playwright.async_api import async_playwright
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]; flags = [a for a in sys.argv[1:] if a.startswith('--')]
T = float(args[0]) if args else 0.3
W, H = [int(x) for x in (args[1] if len(args) > 1 else '844x390').split('x')]
tag = args[2] if len(args) > 2 else 'a'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1.5)
        pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
        await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}' + ('#hud{display:none!important}' if '--nohud' in flags else ''))
        tiles = []
        for l in range(12):
            await pg.evaluate("([l, t]) => { const q = window.__qp; q.G.freeze = true; q.startLevel(l); q.aiInit(q.S.team[0], q.BOTS.casual, {aiErr: 1}); q.advance(t); }", [l, T])
            tiles.append(Image.open(io.BytesIO(await pg.screenshot())).convert('RGB'))
        tw, th = tiles[0].size
        sheet = Image.new('RGB', (tw * 2 + 6, th * 3 + 12), (10, 10, 16))
        for i, im in enumerate(tiles): sheet.paste(im, ((i % 2) * (tw + 6), (i // 2) * (th + 6)))
        out = root / f'shots/sheet_{tag}.png'; sheet.save(out); print('saved', out, sheet.size, msgs[:6])
        await b.close()
asyncio.run(main())
