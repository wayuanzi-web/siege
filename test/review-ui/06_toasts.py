"""底部的提示（#say）只有一格：同一個模擬步驟裡連續呼叫 say()，前面的字還沒被看到就被蓋掉，
   而且用 once() 的那些已經被記成「說過了」，之後不會再出現。
   這支腳本攔下 #say 的每一次寫入（記下第幾回合、第幾步、內容），六關各用自動玩家打幾回合，列出被蓋掉的提示。
   python3 test/review-ui/06_toasts.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

HOOK = """(() => { const el = document.getElementById('say'), d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent'); window.__say = [];
  Object.defineProperty(el, 'textContent', {configurable: true, get() { return d.get.call(this); },
    set(v) { const q = window.__qp, S = q.S; window.__say.push({adv: !!window.__adv, f: S.frame, t: +S.time.toFixed(2), r: S.round, ph: S.phase + S.turn, txt: String(v)}); d.set.call(this, v); }}); })()"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390)
        await pg.evaluate(HOOK)
        lost_all = {}
        for lv in range(6):
            for attempt in range(2):
                await pg.evaluate("([l, first]) => { const q = window.__qp; q.G.freeze = true; q.SV.seen = !first; q.SV.seenUlt = false; q.SV.seenSh = false; q.SV.open = 6; window.__say.length = 0; q.startLevel(l); q.aiInit(q.S.team[0], q.BOTS.casual, {aiErr: 1}); }", [lv, lv == 0])
                await pg.evaluate("(() => { const q = window.__qp, S = q.S; window.__adv = true; let n = 0; while (n++ < 4 * 150 && S.state === 'play' && S.round < 7) q.advance(0.25); window.__adv = false; })()")
                says = [s for s in await pg.evaluate("window.__say") if s['adv']]
                print(f'--- L{lv + 1} run {attempt + 1}: {len(says)} toasts in {says[-1]["r"] if says else 0} rounds', flush=True)
                for i, s in enumerate(says):
                    nxt = says[i + 1] if i + 1 < len(says) else None
                    gap = (nxt['t'] - s['t']) if nxt else 99
                    flag = 'CLOBBERED same step' if nxt and nxt['f'] == s['f'] else ('cut after %.1fs' % gap if gap < 2.5 else '')
                    if flag: lost_all.setdefault(f'L{lv + 1}', set()).add(s['txt'][:22] + ' <- ' + nxt['txt'][:16])
                    print(f"   r{s['r']} {s['ph']:9s} t={s['t']:6.2f} f={s['f']:5d}  {s['txt'][:34]:34s} {flag}", flush=True)
        print('\\nSUMMARY (toast replaced before it could be read):')
        for k, v in lost_all.items():
            for x in sorted(v): print('  ', k, x)
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
