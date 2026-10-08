"""review5：跑 review3 的 film3.py，但先把瀏覽器的對外連線全部擋掉（原本的 film3 沒有擋，頁面會去抓 Google Fonts）。
   用法跟 film3.py 一樣： python3 test/review5-look/film3n.py @清單.txt   （圖一樣存 shots/review3/，檔名請用 r5_ 開頭）"""
import sys, pathlib, runpy
R3DIR = pathlib.Path(__file__).resolve().parent.parent / 'review3-look'
sys.path.insert(0, str(R3DIR))
import r3
_page = r3.Session.page
async def page(self, W=844, H=390, scale=2, touch=False):
    b = self.b; orig = b.new_context
    async def new_context(**kw):
        ctx = await orig(**kw)
        async def block(route):
            if route.request.url.startswith('http'): await route.abort()
            else: await route.continue_()
        await ctx.route('**/*', block)
        return ctx
    b.new_context = new_context
    try: return await _page(self, W, H, scale, touch)
    finally: b.new_context = orig
r3.Session.page = page
sys.argv = [str(R3DIR / 'film3.py')] + sys.argv[1:]
runpy.run_path(str(R3DIR / 'film3.py'), run_name='__main__')
