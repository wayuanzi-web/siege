"""里程碑字（#mile：彈如雨下／百砲齊發…）跟橫幅（#banner）同時出現的時候疊在一起。
真實時間：第一、二關，守軍只剩一點血，自動玩家瞄倍增符、連珠上膛打最後一輪；開火後每 80ms 量一次兩者的不透明度，兩個都看得到的時候截圖。
python3 test/review2-ui/32_mile_banner.py"""
import asyncio
from playwright.async_api import async_playwright
from common import *

OP = """(() => { const m = document.getElementById('mile'), b = document.getElementById('banner'), o = (e) => +(+getComputedStyle(e).opacity).toFixed(2), R = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
  const q = window.__qp; return {mile: o(m), banner: o(b), mileTxt: m.textContent, bannerTxt: b.textContent, mr: R(m), br: R(b), state: q.S.state, peak: q.S.stat.peak, phase: q.S.phase + q.S.turn}; })()"""

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, touch=True)
        hits = 0
        for (lv, attempt) in [(0, 0), (0, 1), (1, 0), (1, 1), (0, 2), (1, 2), (0, 3), (1, 3)]:
            await fresh(pg, lv)
            await pg.evaluate("(() => { const q = window.__qp, S = q.S, T = S.team[0]; for (const u of S.team[1].units) u.hp = 1; T.ult.c = T.ult.need; q.aiInit(T, {err: 0.5, think: 0.4, gate: 1, hate: 0, skill: 1, sh: 0}, {aiErr: 1}); })()")
            # 輪到我的那一刻已經過了（aiBegin 沒跑到）：手動上膛，讓自動玩家這一步開始想
            await pg.evaluate("(() => { const q = window.__qp, T = q.S.team[0]; q.simSkill(0, 'ult'); T.ai.st = 0; })()")
            best = None
            for i in range(70):
                s = await pg.evaluate(OP)
                both = min(s['mile'], s['banner'])
                if both > 0.5 and (best is None or both > best[0]):
                    best = (both, s); await pg.screenshot(path=shot_path(f'mile_banner_L{lv + 1}_{attempt}'))
                if s['state'] != 'play' and s['banner'] < 0.05 and i > 30: break
                await pg.wait_for_timeout(70)
            print(f'L{lv + 1} attempt {attempt}: peak shots {s["peak"]}, state {s["state"]} ->', ('BOTH VISIBLE at once: ' + pj(best[1])) if best else 'did not coincide this time')
            if best: hits += 1
            if hits >= 2: break
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
