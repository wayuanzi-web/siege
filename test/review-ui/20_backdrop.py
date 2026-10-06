"""屋內的暗色背景（backdrop）跟著牆壞掉的樣子合不合理。
   A. 第三關中間那道獨立的冰牆：它不是房子，但 mkCastle 一樣替每一格配了暗色背景；冰磚被炸歪、滑開一點（還算「在原位」）時，
      背景留在原本的格子上，會從縫裡露出來。
   B. 第一關我方城樓：打掉屋頂、打掉一根柱子、打掉樓板，各拍幾張連續畫面。
   python3 test/review-ui/20_backdrop.py"""
import asyncio, json, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
from common import *

async def strip(pg, name, world_box, n=6, dt=0.12):
    """world_box: x0,y0,x1,y1（戰場座標）。拍 n 張，每張之間推進 dt 秒。"""
    info = await pg.evaluate("(() => { const q = window.__qp, V = q.V, G = q.G; return {s: V.s, cx: V.cx, gy: V.gy, k: V.W / G.sw}; })()")
    dsf = 2; X = lambda wx: ((wx - 56) * info['s'] + info['cx']) / info['k'] * dsf; Y = lambda wy: (info['gy'] - wy * info['s']) / info['k'] * dsf
    box = (int(X(world_box[0])), int(Y(world_box[3])), int(X(world_box[2])), int(Y(world_box[1])))
    tiles = []
    for i in range(n):
        im = Image.open(io.BytesIO(await pg.screenshot())).convert('RGB').crop(box)
        ImageDraw.Draw(im).text((4, 2), f't+{i * dt:.2f}s', fill=(255, 255, 0), stroke_width=2, stroke_fill=(0, 0, 0)); tiles.append(im)
        await pg.evaluate("(t) => window.__qp.advance(t)", dt)
    w, h = tiles[0].size; sheet = Image.new('RGB', (w * n + 4 * (n - 1), h), (0, 0, 0))
    for i, t in enumerate(tiles): sheet.paste(t, (i * (w + 4), 0))
    sheet.save(shot_path(name)); print('saved', name, sheet.size)

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390)
        await pg.add_style_tag(content='#hud{display:none!important}')
        await pg.evaluate("window.requestAnimationFrame = () => 0"); await pg.wait_for_timeout(100)
        go = "(l) => { const q = window.__qp, S = q.S; q.G.freeze = true; q.SV.seen = true; q.startLevel(l); let n = 0; while (n++ < 300 && !(S.phase === 'aim' && S.turn === 0)) q.advance(1 / 30); }"
        # A. 冰牆：在牆的左邊中段炸一顆小的，讓上半截往右滑一點
        await pg.evaluate(go, 2)
        r = await pg.evaluate("""(() => { const q = window.__qp, S = q.S, st = S.structs.find(s => s.side === 2 && s.n > 0); q.S.phase = 'resolve'; q.S.phaseT = 0;
          q.physExplode(st.x0 - 1.5, st.y0 + 20, q.WPN.rocket, 0, 1, 0, null, 1, 0); q.advance(1.2);
          const sh = st.blocks.filter(b => !b.dead && !b.frag).map(b => { const p = b.body.getPosition(); return {dx: +(p.x - b.x0).toFixed(2), dy: +(p.y - b.y0).toFixed(2), a: +b.body.getAngle().toFixed(2), in: b.inPlace}; });
          return {box: [st.x0, st.y0, st.x1, st.y1], shiftedButInPlace: sh.filter(b => b.in && (Math.abs(b.dx) > 0.25 || Math.abs(b.a) > 0.05)).length, anyBack: Array.from(st.back).filter(v => v > 0.5).length, sample: sh.filter(b => Math.abs(b.dx) > 0.25).slice(0, 6)}; })()""")
        print('A. ice wall after a rocket on its left side:', json.dumps(r))
        bx = r['box']; await strip(pg, 'backdrop_A_icewall', (bx[0] - 8, bx[1] - 1, bx[2] + 10, bx[3] + 3), n=5, dt=0.5)
        # B. 我方城樓
        for name, js in (('roof', "S.st[0].blocks.filter(b => b.kind === 'roof' && b.cw === 5)"), ('pillar', "S.st[0].blocks.filter(b => b.mat === 1 && b.ch === 1 && b.cw === 1 && b.cy === 9 && b.cx === 8)"), ('floorbeam', "S.st[0].blocks.filter(b => b.mat === 1 && b.cw === 7)"), ('sidewall', "S.st[0].blocks.filter(b => b.cy === 5 && b.cx >= 7)")):
            await pg.evaluate(go, 0)
            n = await pg.evaluate("(() => { const q = window.__qp, S = q.S; S.phase = 'resolve'; S.phaseT = 0; const L = %s; for (const b of L) q.blockKill(b, 1, 0, true); q.advance(1 / 60); return L.length; })()" % js)
            st = await pg.evaluate("(() => { const st = window.__qp.S.st[0]; return [st.x0, st.y0, st.x1, st.y1]; })()")
            print('B.', name, 'blocks removed:', n)
            await strip(pg, 'backdrop_B_' + name, (st[0] - 3, st[1] + 14, st[2] + 4, st[3] + 6), n=7, dt=0.12)
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
