"""src/dist/qianpao.html（給 Artifact 用的片段）包進一個最陽春的頁面骨架會怎樣。
   片段的 CSS 沒有 [hidden]{display:none!important}（只有 index.html 的 full_page() 會補），
   而 .screen / .modal / .stack / .seg 都自己設了 display，會蓋掉瀏覽器內建的 [hidden] 規則。
   python3 test/review-ui/15_fragment.py <包好的 html 路徑>"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
from common import *

async def main():
    path = pathlib.Path(sys.argv[1]).resolve()
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, url=path.as_uri())
        await pg.wait_for_timeout(500)
        r = await pg.evaluate("""(() => { const out = {}; for (const id of ['hud', 'home', 'shop', 'opt', 'result', 'pauseBtns', 'homeOpts', 'diffSeg', 'btnFlip', 'hint', 'turnChip', 'windBox', 'turn'])
          { const e = document.getElementById(id); out[id] = {hiddenAttr: e.hidden, display: getComputedStyle(e).display}; } return out; })()""")
        wrong = {k: v for k, v in r.items() if v['hiddenAttr'] and v['display'] != 'none'}
        print('elements with the hidden attribute that are still displayed:', json.dumps(wrong))
        await pg.screenshot(path=shot_path('fragment_bare_wrapper_home'))
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
