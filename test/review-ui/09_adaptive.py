"""frame() 裡的自動降畫質：連續 150 幀平均超過 38ms → FX.low；再 150 幀 → dprCap 每次降 0.5 並重新 layout()。
   用假的 rAF 時間戳（每幀 +50ms）讓遊戲以為很卡，在戰鬥進行中觸發，看每一階段有沒有出錯、畫面對不對、之後會不會恢復。
   python3 test/review-ui/09_adaptive.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

FAKE_RAF = """(() => { const raf = window.requestAnimationFrame.bind(window); let fake = 0; window.__slow = false;
  window.requestAnimationFrame = (cb) => raf((t) => { fake += window.__slow ? 50 : 16.667; cb(fake); }); })()"""
Q = "(() => { const q = window.__qp; return {low: q.FX.low, dprCap: q.G.dprCap, cv: [q.V.W, q.V.H], s: +q.V.s.toFixed(2), ft: +q.G.ft.toFixed(1), slowFrames: q.G.slowFrames, started: q.G.started, state: q.S.state, phase: q.S.phase, round: q.S.round, parts: q.FX.n}; })()"


async def main():
    async with async_playwright() as p:
        for (W, H, dsf) in [(844, 390, 3), (1920, 1080, 2)]:
            b, ctx, pg, msgs = await open_page(p, W, H, dsf=dsf, init=FAKE_RAF)
            print(f'=== {W}x{H} dpr{dsf}')
            await pg.mouse.click(W * 0.5, H * 0.1)          # G.started
            await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.startLevel(3); q.aiInit(q.S.team[0], q.BOTS.casual, {aiErr: 1}); })()")
            await pg.wait_for_timeout(1500)
            print('before', await pg.evaluate(Q)); await pg.screenshot(path=shot_path(f'adaptive_{W}_0_full'))
            await pg.evaluate("window.__slow = true")
            seen = {}
            for i in range(140):
                await pg.wait_for_timeout(250)
                q = await pg.evaluate(Q); key = (q['low'], q['dprCap'], tuple(q['cv']))
                if key not in seen:
                    seen[key] = 1; print(f'  t+{i * 0.25:.1f}s', q, 'errors', len(msgs), flush=True)
                    await pg.wait_for_timeout(300); await pg.screenshot(path=shot_path(f'adaptive_{W}_{len(seen)}_low{int(q["low"])}_cap{q["dprCap"]}'))
                if q['dprCap'] <= 1 and i > 100: break
            # 恢復正常幀率：畫質會不會回來？
            await pg.evaluate("window.__slow = false"); await pg.wait_for_timeout(6000)
            print('after 6s at 60fps', await pg.evaluate(Q))
            # 回主畫面、再進一關：設定還留著嗎
            await pg.evaluate("(() => { const q = window.__qp; q.goHome(); })()"); await pg.wait_for_timeout(300)
            await pg.evaluate("window.__qp.startLevel(0)"); await pg.wait_for_timeout(800)
            print('new level', await pg.evaluate(Q)); await pg.screenshot(path=shot_path(f'adaptive_{W}_9_newlevel'))
            print('errors:', msgs)
            await b.close()

asyncio.run(main())
