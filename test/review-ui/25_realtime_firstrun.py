"""新玩家第一次玩（存檔是空的）：844x390 手機、真觸控、即時（不凍結）。第一關打三回合，每 0.5 秒記一次畫面上的提示狀態，
   每 1.5 秒截一張圖拼成一長條，看教學提示／底部提示／回合牌／橫幅在真實時間裡有沒有打架。
   python3 test/review-ui/25_realtime_firstrun.py [關卡=1]"""
import asyncio, json, io, sys
from playwright.async_api import async_playwright
from PIL import Image
from common import *

LV = int(sys.argv[1]) if len(sys.argv) > 1 else 1
SNAP = """(() => { const q = window.__qp, S = q.S, $ = (i) => document.getElementById(i), op = (i) => +getComputedStyle($(i)).opacity;
  return {t: +S.time.toFixed(1), r: S.round, ph: S.phase + S.turn, hint: !$('hint').hidden, say: op('say') > 0.5 ? $('say').textContent.slice(0, 20) : '', banner: op('banner') > 0.5 ? $('banner').textContent : '', mile: op('mile') > 0.5 ? $('mile').textContent : '', chip: $('turnChip').hidden ? '' : $('turnChip').textContent.slice(0, 8), tut: q.G.tut}; })()"""

async def tp(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y, 'id': i} for (i, x, y) in pts]})

async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, touch=True)
        cdp = await ctx.new_cdp_session(pg)
        if LV > 1: await pg.evaluate("(() => { const q = window.__qp; q.SV.open = 6; q.SV.seen = true; q.UI.sel = %d; })()" % (LV - 1))
        r = await pg.evaluate("(() => { const b = document.getElementById('btnGo').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await pg.evaluate("document.getElementById('btnGo').disabled = false"); await pg.touchscreen.tap(r[0], r[1])
        log = []; tiles = []; last = None; t0 = asyncio.get_event_loop().time()

        async def sample(n=1):
            nonlocal last
            for _ in range(n):
                s = await pg.evaluate(SNAP); key = (s['hint'], s['say'], s['banner'], s['mile'], s['chip'])
                if key != last: last = key; log.append((round(asyncio.get_event_loop().time() - t0, 1), s))
                if len(log) and (len(tiles) < 40) and int((asyncio.get_event_loop().time() - t0) / 1.5) >= len(tiles):
                    tiles.append(Image.open(io.BytesIO(await pg.screenshot())).convert('RGB').resize((844, 390)))
                await pg.wait_for_timeout(450)

        for turn in range(3):
            # 等輪到我
            for _ in range(80):
                await sample()
                if await pg.evaluate("(() => { const S = window.__qp.S; return S.state !== 'play' || (S.phase === 'aim' && S.turn === 0); })()"): break
            if (await pg.evaluate("window.__qp.S.state")) != 'play': break
            if turn == 0:      # 新手先點一下（沒拖）
                await tp(cdp, 'touchStart', [(1, 420, 200)]); await pg.wait_for_timeout(70); await tp(cdp, 'touchEnd', []); await sample(3)
            # 拖到瞄準線穿過第一道倍增符，再放開
            tgt = await pg.evaluate("(() => { const q = window.__qp, S = q.S, T = S.team[0], g = S.gates[0]; let u = null; for (const k of T.units) if (k.alive && k.w) { u = k; break; } const tau = 0.6, vx = (g.x - u.x - 1.3 - 0.5 * S.wind * tau * tau) / tau, vy = (g.y - u.y - 2.3 + 24 * tau * tau) / tau; const k = (q.V.dpr / q.V.s) * 1.5; return [(vx - T.aim[0]) / k, -(vy - T.aim[1]) / k]; })()")
            x0, y0 = 300, 250
            await tp(cdp, 'touchStart', [(1, x0, y0)])
            for k in range(1, 11): await tp(cdp, 'touchMove', [(1, x0 + tgt[0] * k / 10, y0 + tgt[1] * k / 10)]); await pg.wait_for_timeout(60)
            await sample(2)
            await tp(cdp, 'touchEnd', []); await sample(2)
        for _ in range(12): await sample()
        for (t, s) in log: print(f'{t:5.1f}s', json.dumps(s, ensure_ascii=False))
        cols = 4; rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new('RGB', (844 * cols, 390 * rows), (0, 0, 0))
        for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * 844, (i // cols) * 390))
        sheet.save(shot_path(f'realtime_L{LV}_sheet')); print('sheet', sheet.size, 'errors:', msgs)
        await b.close()
asyncio.run(main())
