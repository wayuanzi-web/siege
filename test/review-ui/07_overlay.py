"""畫面跟物理對不對得上：把 planck 每個 fixture 的外框（綠＝磚、洋紅＝兵、黃＝地形）直接描在遊戲畫布上再截圖。
   每一關開場各一張；再讓自動玩家打幾回合（有碎塊、歪掉的磚）一張。另外量每個兵的貼圖不透明範圍跟碰撞盒差多少。
   python3 test/review-ui/07_overlay.py [關卡…]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
from PIL import Image
from common import *

LEVELS = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4, 5, 6]

OVERLAY = """(() => { const q = window.__qp, V = q.V, c = document.getElementById('cv').getContext('2d'), PH = q.PH;
  const X = (wx) => (wx - 56) * V.s + V.cx, Y = (wy) => V.gy - wy * V.s;
  q.renderFrame(0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.lineWidth = Math.max(1.5, V.s * 0.12); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.setLineDash([]);
  for (let b = PH.world.getBodyList(); b; b = b.getNext()) {
    const p = b.getPosition(), a = b.getAngle(), cs = Math.cos(a), sn = Math.sin(a), ud = b.getUserData();
    for (let f = b.getFixtureList(); f; f = f.getNext()) {
      const sh = f.getShape(), t = sh.getType();
      c.strokeStyle = !ud ? '#ffe000' : ud.isBlock ? '#00ff5a' : '#ff00e0';
      c.beginPath();
      if (t === 'circle') { const cc = sh.getCenter(); c.arc(X(p.x + cc.x * cs - cc.y * sn), Y(p.y + cc.x * sn + cc.y * cs), sh.getRadius() * V.s, 0, 6.2832); c.moveTo(X(p.x), Y(p.y)); c.lineTo(X(p.x + cs * sh.getRadius()), Y(p.y + sn * sh.getRadius())); }
      else { const vs = sh.m_vertices; for (let i = 0; i < vs.length; i++) { const v = vs[i], x = X(p.x + v.x * cs - v.y * sn), y = Y(p.y + v.x * sn + v.y * cs); if (i) c.lineTo(x, y); else c.moveTo(x, y); } if (t === 'polygon') c.closePath(); }
      c.stroke();
    }
  }
  c.restore(); })()"""

# 每個兵：貼圖裡不透明像素的範圍（戰場單位，相對腳底）對照碰撞盒
UNIT_BOUNDS = """(() => { const q = window.__qp, S = q.S, V = q.V, cv = document.getElementById('cv'), c = cv.getContext('2d'), out = [];
  const X = (wx) => (wx - 56) * V.s + V.cx, Y = (wy) => V.gy - wy * V.s;
  for (const u of S.units) {
    if (!u.alive) continue;
    // 只畫這個兵：先清成洋紅底，再叫遊戲自己的 drawUnits 不可行（沒有匯出），改用差分：畫兩次場景，一次把這個兵藏起來
    q.renderFrame(0, 0); const big = u.def.big ? 2 : 1, x0 = Math.round(X(u.x - 4.5 * big)), y0 = Math.round(Y(u.y + 10 * big)), w = Math.round(9 * big * V.s), h = Math.round(11.5 * big * V.s);
    const A = c.getImageData(x0, y0, w, h).data;
    u.alive = false; q.renderFrame(0, 0); u.alive = true;
    const B = c.getImageData(x0, y0, w, h).data;
    let l = 1e9, r = -1, t = 1e9, b = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; } }
    const fx = u.body.getFixtureList().getShape().m_vertices; let hw = 0, hh = 0; for (const v of fx) { hw = Math.max(hw, Math.abs(v.x)); hh = Math.max(hh, Math.abs(v.y)); }
    out.push({side: u.side, type: u.type, sprite: {left: +((x0 + l - X(u.x)) / V.s).toFixed(2), right: +((x0 + r - X(u.x)) / V.s).toFixed(2), top: +((Y(u.y) - (y0 + t)) / V.s).toFixed(2), bottom: +((Y(u.y) - (y0 + b)) / V.s).toFixed(2)}, hitbox: {halfW: +hw.toFixed(2), height: +(hh * 2).toFixed(2)}});
  }
  q.renderFrame(0, 0); return out; })()"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 1280, 640, dsf=2)
        await pg.add_style_tag(content='#hud,#home{display:none!important}')
        # 遊戲自己的 rAF 迴圈每一幀都會重畫，把描上去的外框蓋掉：先把迴圈停掉，之後全靠 advance() 手動推進
        await pg.evaluate("window.requestAnimationFrame = () => 0"); await pg.wait_for_timeout(120)
        seen = set()
        for lv in LEVELS:
            await pg.evaluate("(l) => { const q = window.__qp; q.G.freeze = true; q.SV.seen = true; q.startLevel(l - 1); q.advance(1.3); }", lv)
            ub = await pg.evaluate(UNIT_BOUNDS)
            for r in ub:
                key = (r['side'], r['type'])
                if key in seen: continue
                seen.add(key)
                s, hb = r['sprite'], r['hitbox']
                print(f"L{lv} side{r['side']} {r['type']:7s} sprite x[{s['left']:+.2f},{s['right']:+.2f}] y[{s['bottom']:+.2f},{s['top']:+.2f}]  hitbox x[±{hb['halfW']:.2f}] y[0,{hb['height']:.2f}]  -> head sticks out {s['top'] - hb['height']:+.2f} above box ({(s['top'] - hb['height']) / s['top'] * 100:.0f}% of visible height)", flush=True)
            await pg.evaluate(OVERLAY)
            await pg.screenshot(path=shot_path(f'overlay_L{lv}_start'))
            # 打幾回合
            await pg.evaluate("(() => { const q = window.__qp; q.aiInit(q.S.team[0], q.BOTS.expert, {aiErr: 1}); let n = 0; while (n++ < 400 && q.S.round < 4 && q.S.state === 'play') q.advance(0.25); })()")
            st = await pg.evaluate(JS_STATE)
            await pg.evaluate(OVERLAY)
            await pg.screenshot(path=shot_path(f'overlay_L{lv}_r{st["round"]}'))
            print(f'L{lv} later:', st, flush=True)
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
