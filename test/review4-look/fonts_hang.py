"""字型的 <link rel=stylesheet> 連不上時遊戲開不開得起來：
   (a) 請求馬上失敗（飛航模式）  (b) 請求一直沒有回應（網路很慢、被擋、驗證頁）。
   每種情況記下：頁面開了幾秒之後 window.__qp 才出現、畫面上有沒有東西。"""
import asyncio, sys, time, pathlib, io
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import OUT, PAGE
from playwright.async_api import async_playwright
from PIL import Image

async def run(p, mode, page_file):
    b = await p.chromium.launch()
    ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, has_touch=True, is_mobile=True)
    hung = []
    async def handler(route):
        url = route.request.url
        if url.startswith('http'):
            if mode == 'hang': hung.append(url[:60]); return        # 不回應
            await route.abort()
        else: await route.continue_()
    await ctx.route('**/*', handler)
    pg = await ctx.new_page(); t0 = time.time()
    try: await pg.goto(page_file.as_uri(), wait_until='commit', timeout=8000)
    except Exception as e: print('  goto:', str(e)[:80])
    rows = []
    for wait in (0.5, 1, 2, 4, 8, 15):
        await asyncio.sleep(max(0, wait - (time.time() - t0)))
        try:
            st = await asyncio.wait_for(pg.evaluate("(() => ({qp: typeof window.__qp, ready: document.readyState, mode: window.__qp ? window.__qp.G.mode : null, home: !!document.getElementById('home'), canvasW: (document.getElementById('cv') || {}).width || 0}))()"), 3)
        except Exception as e: st = {'error': type(e).__name__}
        rows.append((wait, st))
    try:
        png = await asyncio.wait_for(pg.screenshot(), 8); im = Image.open(io.BytesIO(png)).convert('RGB'); im.save(OUT / f'fonts_{mode}_{page_file.stem}.png')
        px = im.resize((16, 8)).getdata(); dark = sum(1 for r, g, bb in px if r + g + bb < 60) / len(px)
    except Exception as e: dark = None; print('  screenshot failed:', type(e).__name__)
    print(f'{page_file.name} fonts={mode}: ' + ' | '.join(f"{w}s: {s}" for w, s in rows) + f'  blank-ish fraction of screenshot: {dark}  pending font requests: {len(hung)}')
    await b.close()

async def main():
    async with async_playwright() as p:
        for mode in ('abort', 'hang'):
            await run(p, mode, PAGE)
        await run(p, 'hang', PAGE.with_name('qianpao.html'))
asyncio.run(main())
