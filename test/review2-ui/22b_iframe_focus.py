"""遊戲放在 <iframe> 裡（發佈的形式）：戰鬥中點畫面，iframe 拿不拿得到鍵盤焦點？
bindInput 的 pointerdown 在戰鬥中一律 e.preventDefault()（畫布和四顆戰鬥按鈕都是），滑鼠按下去的預設動作（把焦點移進這個 frame）跟著被取消。
所以：玩到一半點了一下外面的頁面，再點回遊戲畫面，鍵盤（方向鍵、空白鍵、P）就不會動了，按鍵全送到外面的頁面。
python3 test/review2-ui/22b_iframe_focus.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *

OUT = HERE / 'out'
BARE = OUT / 'bare.html'
BARE.write_text('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + FRAG.read_text(encoding='utf8') + '</body></html>', encoding='utf8')
HOST = OUT / 'host_focus.html'
HOST.write_text("""<!doctype html><html><head><meta charset=utf-8><style>body{margin:0;background:#789;font:14px sans-serif;height:3000px}#f{position:absolute;left:60px;top:60px;width:800px;height:450px;border:0}#t{position:absolute;left:60px;top:10px;width:300px}</style></head>
<body><input id="t" placeholder="host page text box"><iframe id="f" src="bare.html"></iframe>
<script>window.__keys = []; addEventListener('keydown', (e) => window.__keys.push(e.code));</script></body></html>""", encoding='utf8')

FOCUS = "(() => ({hostActive: document.activeElement.id || document.activeElement.tagName, hostText: document.getElementById('t').value, hostKeys: window.__keys.join(','), hostScrollY: Math.round(scrollY)}))()"


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 1000, 700, dsf=1, url=HOST.as_uri())
        await pg.wait_for_timeout(500)
        fr = [f for f in pg.frames if f != pg.main_frame][0]
        M = pg.mouse; K = pg.keyboard
        gs = lambda: fr.evaluate("(() => { const q = window.__qp; return {mode: q.G.mode, phase: q.S.phase + q.S.turn, volleys: q.S.team[0].volleys, aim: +(Math.atan2(q.S.team[0].aim[1], q.S.team[0].aim[0]) * 57.3).toFixed(1), frameHasFocus: document.hasFocus()}; })()")
        async def my_turn():
            await fr.evaluate("(async () => { const q = window.__qp; q.G.freeze = true; let n = 0; while (n++ < 6000 && !(q.S.state === 'play' && q.S.phase === 'aim' && q.S.turn === 0)) q.advance(1 / 60); q.G.freeze = false; })()"); await pg.wait_for_timeout(150)
        async def center(sel):
            r = await fr.evaluate("(s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel); return 60 + r[0], 60 + r[1]

        # 1. 正常開始：用滑鼠按「出戰」
        await fr.evaluate("window.__qp.SV.seen = true")
        x, y = await center('#btnGo'); await M.click(x, y); await my_turn()
        print('1. clicked 出戰 inside the iframe:', pj(await gs()), '| host', pj(await pg.evaluate(FOCUS)))
        await K.down('ArrowUp'); await pg.wait_for_timeout(300); await K.up('ArrowUp'); await K.press('Space'); await pg.wait_for_timeout(200)
        print('   ArrowUp 0.3s + Space:', pj(await gs()))

        # 2. 點一下外面頁面的輸入框，再點回遊戲畫面（畫布）
        await my_turn()
        await M.click(100, 20); await pg.wait_for_timeout(100)
        print('2. clicked the host page text box:', pj(await gs()), '| host', pj(await pg.evaluate(FOCUS)))
        await M.click(60 + 400, 60 + 200); await pg.wait_for_timeout(150)            # 點遊戲畫面（戰場）
        s0 = await gs(); print('   clicked the battlefield inside the iframe:', pj(s0), '| host', pj(await pg.evaluate(FOCUS)))
        await K.down('ArrowUp'); await pg.wait_for_timeout(300); await K.up('ArrowUp'); await K.press('Space'); await K.press('KeyP'); await pg.wait_for_timeout(250)
        s1 = await gs(); h = await pg.evaluate(FOCUS)
        print('   ArrowUp 0.3s + Space + P:', pj(s1), '| host', pj(h))
        print('   -> game reacted to the keys:', s1['volleys'] != s0['volleys'] or s1['aim'] != s0['aim'] or s1['mode'] != s0['mode'], '| keys ended up in the host page:', bool(h['hostKeys']), '| typed into the host text box:', repr(h['hostText']))
        # 拖曳一下（真的瞄準）也一樣嗎
        await M.move(60 + 400, 60 + 200); await M.down(); await M.move(60 + 430, 60 + 180, steps=4); await M.up(); await pg.wait_for_timeout(200)
        await my_turn(); await pg.evaluate("window.__keys = []")
        s0 = await gs(); await K.press('Space'); await pg.wait_for_timeout(200); s1 = await gs()
        print('   after a real aim drag + release (fired), next turn Space:', 'fired' if s1['volleys'] > s0['volleys'] else 'NOT fired', '| frame has focus', s1['frameHasFocus'], '| host got', (await pg.evaluate(FOCUS))['hostKeys'])
        # 按戰鬥中的按鈕（發射／暫停）
        for sel in ('#btnFire', '#btnShield'):
            x, y = await center(sel); await M.click(x, y); await pg.wait_for_timeout(150)
            print(f'   clicked {sel}: frame has focus', (await gs())['frameHasFocus'])
        # 3. 怎樣才救得回來：暫停鈕（滑鼠）→ 繼續
        await my_turn()
        x, y = await center('#btnPause'); await M.click(x, y); await pg.wait_for_timeout(200)
        f1 = (await gs())['frameHasFocus']
        x, y = await center('#btnResume'); await M.click(x, y); await pg.wait_for_timeout(200)
        s0 = await gs(); await K.press('Space'); await pg.wait_for_timeout(200); s1 = await gs()
        print('3. pause (mouse): frame focus', f1, '-> click 繼續: frame focus', s0['frameHasFocus'], '-> Space', 'fires' if s1['volleys'] > s0['volleys'] else 'does NOT fire')
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
