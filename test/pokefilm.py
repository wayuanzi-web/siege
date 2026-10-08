"""在瀏覽器裡（真的畫面）照 poke.js 的寫法引爆，連拍幾張：看坍塌的樣子。
   python3 test/pokefilm.py <關卡 1-12> "<武器>@x,y[,s] ; ..." <拍照的秒數,…> [標籤] [寬x高=1200x560]
   圖存 shots/poke_L<關>_<標籤>.png（一張拼好的連拍）"""
import asyncio, sys, pathlib, json, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent
lvl = int(sys.argv[1]); script = sys.argv[2]; times = [float(x) for x in sys.argv[3].split(',')]
tag = sys.argv[4] if len(sys.argv) > 4 else 'a'; W, H = [int(x) for x in (sys.argv[5] if len(sys.argv) > 5 else '1200x560').split('x')]
acts = []
for part in [x.strip() for x in script.split(';') if x.strip()]:
    w, rest = part.split('@'); xs = rest.split(','); acts.append({'w': w, 'x': float(xs[0]), 'y': float(xs[1]), 't': float(xs[2]) if len(xs) > 2 else 0.0})
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
        await ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: msgs.append(m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        await pg.evaluate("(l) => { const q = window.__qp; q.G.freeze = true; q.startLevel(l - 1); q.S.team[0].ai = null; q.S.team[1].ai = null; q.advance(1.3); q.S.phase = 'resolve'; q.S.turn = 0; }", lvl)
        await pg.add_style_tag(content='#banner,#say,#hint,#mile,#hud{display:none!important}')
        tiles = []; t = 0.0; done = [False] * len(acts)
        for tt in times:
            while t < tt - 1e-6:
                step = min(1 / 60, tt - t)
                for i, a in enumerate(acts):
                    if not done[i] and t >= a['t']:
                        done[i] = True
                        await pg.evaluate("(a) => { const q = window.__qp; let hit = null, best = 0.6; for (const b of q.S.blocks) { if (b.dead) continue; const d = q.blockDist(b, a.x, a.y); if (d < best) { best = d; hit = b; } } q.physExplode(a.x, a.y, q.WPN[a.w], 0, 1, 0, hit, 1, 0); }", a)
                await pg.evaluate("(s) => { const q = window.__qp; q.S.phase = 'resolve'; q.S.phaseT = 0; q.S.quietT = 0; q.advance(s); }", step)
                t += step
            png = await pg.screenshot()
            im = Image.open(io.BytesIO(png)).convert('RGB'); d = ImageDraw.Draw(im); d.rectangle([0, 0, 120, 28], fill=(0, 0, 0)); d.text((6, 6), f't={tt:.1f}s', fill=(255, 255, 255))
            tiles.append(im)
        info = await pg.evaluate("() => { const S = window.__qp.S; return S.units.map((u) => (u.side ? 'E' : 'P') + u.slot + (u.alive ? '' : 'x')).join(' ') + ' ropes cut ' + S.ropes.filter((r) => r.cut).length; }")
        await b.close()
    cols = 2 if len(tiles) > 1 else 1; rows = (len(tiles) + cols - 1) // cols
    sw, sh = tiles[0].size; k = 0.5
    sheet = Image.new('RGB', (int(sw * k) * cols, int(sh * k) * rows), (20, 20, 20))
    for i, im in enumerate(tiles): sheet.paste(im.resize((int(sw * k), int(sh * k))), ((i % cols) * int(sw * k), (i // cols) * int(sh * k)))
    out = root / 'shots' / f'poke_L{lvl}_{tag}.png'; sheet.save(out)
    print(out, info, msgs[:5])
asyncio.run(main())
