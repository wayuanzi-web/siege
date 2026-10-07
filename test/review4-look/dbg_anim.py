"""小實驗：被 script 暫停過的 CSS 動畫，class 拿掉再加回去之後，舊的那個會不會留著。"""
import asyncio
from playwright.async_api import async_playwright
HTML = """<style>@keyframes b{0%{opacity:0}12%{opacity:1}78%{opacity:1}100%{opacity:0}} #x{opacity:0} #x.show{animation:b 1.8s both}</style><div id=x>hi</div>"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); await pg.set_content(HTML)
        for mode in ['none', 'pause', 'pause+seek', 'seek-only']:
            r = await pg.evaluate("""(mode) => {
              const el = document.getElementById('x'); el.className = ''; void el.offsetWidth; for (const a of document.getAnimations()) a.cancel();
              el.classList.add('show'); let a = document.getAnimations()[0];
              if (mode.startsWith('pause')) a.pause();
              if (mode.includes('seek')) a.currentTime = 5000;
              const before = document.getAnimations().map(a => [a.animationName, a.playState, a.currentTime]);
              el.className = 'gold'; el.classList.remove('show'); void el.offsetWidth; const mid = document.getAnimations().map(a => [a.animationName, a.playState, a.currentTime]); const midState = a.playState;
              el.classList.add('show');
              const after = document.getAnimations().map(a => [a.animationName, a.playState, a.currentTime]);
              return {mode, before, mid, midState, after, opacity: getComputedStyle(el).opacity};
            }""", mode)
            print(r)
        await b.close()
asyncio.run(main())
