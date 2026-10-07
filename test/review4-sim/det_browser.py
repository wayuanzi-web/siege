"""同一個種子：在瀏覽器裡（1）只跑模擬、不畫圖，（2）每一步都畫圖＋特效＋資訊列，結果跟 Node 一不一樣。
   用來分辨「畫面那一半會不會回頭影響戰局」跟「兩個環境的浮點數函式不一樣」。
   python3 test/review4-sim/det_browser.py"""
import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CASES = [[4, 591041, 'casual', 1], [2, 626071, 'newbie', 1], [0, 610102, 'newbie', 1]]
JS = r"""
([li, seed, bot, diff, withRender]) => {
  const q = window.__qp, S = q.S; q.G.freeze = true;
  if (withRender) { q.SV.open = 6; q.SV.diff = diff; q.startLevel(li); }
  q.simInit(li, {}, seed, diff, { botA: q.BOTS[bot] });
  if (!withRender) S.on = null;
  let n = 0;
  while (S.state === 'play' && S.round < 40) { q.simStep(1 / 60); n++; if (withRender) { q.fxStep(1 / 60, 1 / 60); if (n % 3 === 0) { q.hudUpdate(); q.renderFrame(0.05, 0.05); } } }
  let h = 0; for (const u of S.units) h += u.hp;
  const out = `${S.state} r${S.round} t=${S.time.toFixed(2)} hp=${h.toFixed(3)} blocks=${S.blocks.filter((b) => !b.dead).length}`;
  if (withRender) q.goHome();
  return out;
}
"""
MATH = "(() => [Math.pow(1.7, 0.6), Math.pow(3.3, -0.6), Math.sin(1.2345), Math.cos(2.5), Math.atan2(0.3, -1.1), Math.hypot(3.3, 4.4), Math.pow(0.9876, 0.8), Math.sqrt(2.2), Math.exp(1.1), Math.tan(0.7)].map((v) => v.toString()).join(' '))()"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={'width': 844, 'height': 390})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        print('browser Math:', await pg.evaluate(MATH)); print('UA:', await pg.evaluate('navigator.userAgent'))
        for c in CASES:
            a = await pg.evaluate(JS, c + [False]); r = await pg.evaluate(JS, c + [True])
            print(f'L{c[0] + 1} {c[2]} seed{c[1]}: browser sim-only [{a}] | browser with render+fx+hud [{r}] -> {"same" if a == r else "DIFFERENT"}')
        if errs: print('errors', errs[:3])
        await b.close()
asyncio.run(main())
