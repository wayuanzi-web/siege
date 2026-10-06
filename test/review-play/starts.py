"""六關開場（第一回合輪到我瞄準、還沒人開火）的全景，不含資訊列：檢查有沒有一開場就倒了、浮著、歪著的東西。
   python3 test/review-play/starts.py [--scale=2] → shots/review-play/starts.png（2 欄）＋ 每一關各一張 starts_L<n>.png"""
import asyncio, sys, pathlib, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent.parent
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
scale = float(opt.get('scale', 2)); W, H = 844, 390
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=scale)
        pg = await ctx.new_page()
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
        await pg.add_style_tag(content='#banner,#say,#hint,#mile,#hud{display:none!important}')
        tiles = []
        for l in range(6):
            info = await pg.evaluate("""(l) => { const q = window.__qp, S = q.S; q.G.freeze = true; q.startLevel(l); q.S.team[0].ai = null; let n = 0; while (n++ < 600 && !(S.phase === 'aim' && S.turn === 0)) q.advance(1 / 60); q.advance(1.5);
                // 開場時每一個東西離它的設計位置多遠、有沒有醒著
                let moved = [], awake = 0; for (const b of S.blocks) { const p = b.body.getPosition(); const d = Math.hypot(p.x - b.x0, p.y - b.y0); if (d > 0.05 || Math.abs(b.body.getAngle()) > 0.01) moved.push([b.prop ? 'prop' : 'block', b.mat, +d.toFixed(2)]); if (b.body.isAwake()) awake++; }
                return {moved, awake, n: S.blocks.length}; }""", l)
            im = Image.open(io.BytesIO(await pg.screenshot())).convert('RGB'); im.save(root / f'shots/review-play/starts_L{l+1}.png')
            ImageDraw.Draw(im).text((10, 6), f"L{l+1} start: {info['n']} bodies, awake {info['awake']}, displaced {len(info['moved'])} {info['moved'][:4]}", fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
            tiles.append(im); print('L%d' % (l + 1), info)
        tw, th = tiles[0].size; sheet = Image.new('RGB', (tw * 2 + 4, th * 3 + 8), (20, 20, 28))
        for i, im in enumerate(tiles): sheet.paste(im, ((i % 2) * (tw + 4), (i // 2) * (th + 4)))
        sheet.save(root / 'shots/review-play/starts.png'); print('saved', sheet.size)
        await b.close()
asyncio.run(main())
