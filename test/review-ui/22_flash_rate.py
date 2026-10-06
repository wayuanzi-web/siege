"""全螢幕閃光的頻率：雷法師的砲彈穿過倍增符之後一輪會劈很多道雷，每一道都把 FX.flash 拉到 0.22（整個畫面蓋一層近白色）。
   逐步推進戰局，記下 FX.flash「往上跳」的次數，算任一秒內最多閃幾次（WCAG 2.3.1：一秒不超過三次）。
   也記畫面震動（FX.shake）被重新觸發的次數。  python3 test/review-ui/22_flash_rate.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

RUN = """((lv) => { const q = window.__qp, S = q.S, FX = q.FX; q.G.freeze = true; q.SV.seen = true; q.SV.open = 6; q.startLevel(lv); q.aiInit(S.team[0], q.BOTS.expert, {aiErr: 1});
  const on = [], vals = []; let prev = 0, n = 0, worst = 0, worstAt = 0, maxShots = 0;
  while (n++ < 60 * 120 && S.state === 'play' && S.round < 8) { q.advance(1 / 60); const f = FX.flash; if (f > prev + 0.02) on.push({t: S.time, a: +f.toFixed(2), col: FX.flashCol, r: S.round, turn: S.turn}); prev = f; if (q.SH.n > maxShots) maxShots = q.SH.n; }
  // 任一秒內最多幾次
  for (let i = 0; i < on.length; i++) { let k = i; while (k < on.length && on[k].t - on[i].t < 1) k++; if (k - i > worst) { worst = k - i; worstAt = i; } }
  const w = on.slice(worstAt, worstAt + worst);
  return {level: lv + 1, rounds: S.round, flashOnsets: on.length, maxOnsetsInOneSecond: worst, during: w.length ? {round: w[0].r, side: w[0].turn, alphas: w.map(o => o.a).slice(0, 12), col: w[0].col} : null, maxShotsInAir: maxShots}; })"""

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, reduced_motion='reduce')
        print('prefers-reduced-motion: reduce is ON for this run')
        for lv in (4, 5, 4, 5):
            r = await pg.evaluate(RUN + "(%d)" % lv)
            print(json.dumps(r, ensure_ascii=False), flush=True)
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
