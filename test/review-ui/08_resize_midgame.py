"""打到場上有碎塊之後改變視窗大小／降解析度（frame() 裡的自動降畫質會走同一條路），看碎塊的貼圖有沒有跟著重畫、位置對不對。
   每個狀態存一張「碎塊特寫」拼圖：每塊碎塊一格，格子裡是畫面上那一塊的截圖。
   python3 test/review-ui/08_resize_midgame.py"""
import asyncio, json, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
from common import *

FRAGS = """(() => { const q = window.__qp, S = q.S, V = q.V, G = q.G, k = V.W / G.sw, out = [];
  for (const b of S.blocks) { if (b.dead || !b.frag) continue; const p = b.body.getPosition();
    out.push({id: b.id, mat: b.mat, x: ((p.x - 56) * V.s + V.cx) / k + G.ox, y: (V.gy - p.y * V.s) / k + G.oy, r: Math.max(b.w, b.h) * 0.75 * V.s / k, sp: b._sp ? [b._sp.cv.width, b._sp.cv.height, +b._spS.toFixed(3)] : null}); }
  return {frags: out, s: +V.s.toFixed(3), cv: [V.W, V.H], dprCap: G.dprCap, low: q.FX.low}; })()"""


async def contact(pg, tag, ids=None):
    info = await pg.evaluate(FRAGS)
    png = await pg.screenshot(); im = Image.open(io.BytesIO(png)).convert('RGB'); dsf = im.size[0] / (await pg.evaluate("innerWidth"))
    fr = [f for f in info['frags'] if (ids is None or f['id'] in ids)][:12]
    cell = 150; sheet = Image.new('RGB', (cell * max(1, len(fr)), cell + 16), (20, 20, 28)); d = ImageDraw.Draw(sheet)
    for i, f in enumerate(fr):
        r = max(8, f['r']); box = [int((f['x'] - r) * dsf), int((f['y'] - r) * dsf), int((f['x'] + r) * dsf), int((f['y'] + r) * dsf)]
        try: tile = im.crop(box).resize((cell, cell), Image.LANCZOS)
        except Exception: continue
        sheet.paste(tile, (i * cell, 16)); d.text((i * cell + 3, 2), f"#{f['id']} m{f['mat']} {f['sp']}", fill=(255, 255, 255))
    sheet.save(shot_path('resize_frags_' + tag))
    await pg.screenshot(path=shot_path('resize_full_' + tag))
    print(tag, {k: info[k] for k in ('s', 'cv', 'dprCap', 'low')}, 'frags', len(info['frags']), [(f['id'], f['sp']) for f in fr[:6]], flush=True)
    return [f['id'] for f in fr]


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390)
        await pg.add_style_tag(content='#hud{display:none!important}')
        # 打到有碎塊為止，然後整個停住（連 rAF 迴圈都停，免得畫面再變）
        await pg.evaluate("""(() => { const q = window.__qp, S = q.S; q.G.freeze = true; q.SV.seen = true; q.startLevel(1); q.aiInit(S.team[0], q.BOTS.expert, {aiErr: 1});
          let n = 0; while (n++ < 2000 && !(S.nfrag >= 10 && S.phase === 'aim' && S.turn === 0)) q.advance(0.1); })()""")
        await pg.wait_for_timeout(200)
        ids = await contact(pg, '1_844x390')
        await pg.set_viewport_size({'width': 667, 'height': 375}); await pg.wait_for_timeout(500)
        await contact(pg, '2_667x375', ids)
        await pg.set_viewport_size({'width': 1280, 'height': 720}); await pg.wait_for_timeout(500)
        await contact(pg, '3_1280x720', ids)
        await pg.set_viewport_size({'width': 844, 'height': 390}); await pg.wait_for_timeout(500)
        await contact(pg, '4_back_844x390', ids)
        # 自動降畫質的那條路：dprCap 2 → 1
        await pg.evaluate("(() => { const q = window.__qp; q.FX.low = true; q.G.dprCap = 1; q.layout(); })()"); await pg.wait_for_timeout(400)
        await contact(pg, '5_dprCap1', ids)
        # 直拿
        await pg.evaluate("(() => { const q = window.__qp; q.G.dprCap = 2; q.FX.low = false; q.G.forceTouch = true; })()")
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(500)
        info = await pg.evaluate(FRAGS); print('portrait', {k: info[k] for k in ('s', 'cv')}, 'rot', await pg.evaluate("window.__qp.G.rot"))
        await pg.screenshot(path=shot_path('resize_full_6_portrait'))
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
