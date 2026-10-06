"""吊高砲的瞄準虛線看得到多少：虛線在自己城樓範圍內的那一段不畫（aimDots 的 box 規則），再往上就進到上方資訊列底下、或超出畫面。
   對每個仰角數「畫出來而且沒被資訊列蓋住」的點有幾顆（帶頭那個兵的那一串）。
   python3 test/review-ui/16_lob_preview.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

COUNT = """(([deg, pow]) => { const q = window.__qp, S = q.S, V = q.V, G = q.G, RD = q.RD, T = S.team[0], a = deg * Math.PI / 180;
  q.simAim(0, Math.cos(a) * pow, Math.sin(a) * pow); q.advance(1 / 30);
  let u = null; for (const k of T.units) if (k.alive && k.w && k.frozen <= 0 && k.stun <= 0) { u = k; break; }
  const box = S.st[0], mx = u.x + 1.3, my = u.y + 2.3, vx = T.aim[0], vy = T.aim[1], k = V.W / G.sw;
  const hud = document.getElementById('hpA').getBoundingClientRect(), stage = document.getElementById('stage').getBoundingClientRect();
  const hudBottomWorld = (V.gy - (hud.bottom - stage.top) * k) / V.s;      // 血條下緣對應的戰場高度（橫拿時）
  let drawn = 0, visible = 0, total = 0;
  for (let tt = 0.05; tt <= RD.aimT; tt += 0.065) { total++; const x = mx + vx * tt + 0.5 * S.wind * tt * (tt + 1 / 60), y = my + vy * tt - 24 * tt * (tt + 1 / 60);
    if (x > box.x0 - 1 && x < box.x1 + 1.2 && y < box.y1 + 2.5) continue; drawn++; if (y < hudBottomWorld && x < V.x1) visible++; }
  return {deg, pow, total, drawn, visible, hudBottomWorld: +hudBottomWorld.toFixed(1), top: +V.top.toFixed(1), castleTop: box.y1, aimT: +RD.aimT.toFixed(2)}; })"""


async def main():
    async with async_playwright() as p:
        for (W, H, touch) in [(844, 390, True), (667, 375, True), (1024, 768, False)]:
            b, ctx, pg, msgs = await open_page(p, W, H, touch=touch)
            await pg.add_style_tag(content='#banner,#say{display:none!important}')
            await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.SV.seen = true; q.SV.open = 6; q.G.freeze = true; q.startLevel(3); let n = 0; while (n++ < 300 && !(S.phase === 'aim' && S.turn === 0)) q.advance(1 / 30); })()")
            print(f'=== {W}x{H}  level 4 (tip: lob over the iron front through the roof)')
            for (deg, pw) in [(45, 60), (60, 60), (70, 60), (75, 65), (80, 70), (85, 70)]:
                r = await pg.evaluate(COUNT + "(%s)" % json.dumps([deg, pw]))
                print('  ', r, flush=True)
                if deg in (60, 80): await pg.screenshot(path=shot_path(f'lob_preview_{W}x{H}_{deg}deg'))
            await b.close()

asyncio.run(main())
