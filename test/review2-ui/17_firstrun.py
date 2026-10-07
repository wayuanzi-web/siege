"""新玩家（空的存檔）第一次開遊戲，真實時間、真的輸入事件。記下玩家每一刻看得到的字（教學提示、底部提示、回合牌、橫幅），
和每一次操作有沒有反應；每次畫面上的字換了就截一張，最後拼成一張。
python3 test/review2-ui/17_firstrun.py touch|mouse|portrait [rounds=5]"""
import asyncio, io, sys
from playwright.async_api import async_playwright
from PIL import Image
from common import *

MODE = sys.argv[1] if len(sys.argv) > 1 else 'touch'
ROUNDS = next((int(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('rounds=')), 5)
W, H, TOUCH = {'touch': (844, 390, True), 'mouse': (1280, 720, False), 'portrait': (390, 844, True)}[MODE]

SNAP = """(() => { const q = window.__qp, S = q.S, $ = (i) => document.getElementById(i), op = (i) => +getComputedStyle($(i)).opacity;
  return {mode: q.G.mode, r: S.round, ph: S.phase + S.turn, st: S.state, hint: !$('hint').hidden && !$('hud').hidden ? $('hintTxt').textContent : '', say: !$('hud').hidden && op('say') > 0.4 ? $('say').textContent : '', banner: !$('hud').hidden && op('banner') > 0.4 ? $('banner').textContent : '',
    mile: !$('hud').hidden && op('mile') > 0.4 ? $('mile').textContent : '', chip: $('turnChip').hidden || $('hud').hidden ? '' : $('turnChip').textContent, tut: q.G.tut, v: S.team[0].volleys, turnHint: !$('turn').hidden,
    me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100)}; })()"""
# 要把瞄準調到「打得到第一個還活著的敵兵」需要拖多少（舞台座標的像素：右、下為正）
PLAN = """(() => { const q = window.__qp, S = q.S, V = q.V, T = S.team[0]; let u = null; for (const k of T.units) if (k.alive && k.w && k.frozen <= 0 && k.stun <= 0) { u = k; break; }
  let e = null; for (const k of S.team[1].units) if (k.alive) { e = k; break; } if (!u || !e) return [30, -20];
  let best = null; for (const tau of [1.5, 1.7, 1.9, 2.1, 1.3]) { const vx = (e.x - u.x - 1.3 - 0.5 * S.wind * tau * tau) / tau, vy = (e.y + 1.6 - u.y - 2.3 + 24 * tau * tau) / tau, v = Math.hypot(vx, vy), a = Math.atan2(vy, vx); if (v >= 32 && v <= 86 && a > 0.1 && a < 1.5) { best = [vx, vy]; break; } }
  if (!best) return [30, -20]; const k = (V.dpr / V.s) * 1.5; return [(best[0] - T.aim[0]) / k, -(best[1] - T.aim[1]) / k]; })()"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, W, H, touch=TOUCH, dsf=2 if TOUCH else 1)
        cdp = await ctx.new_cdp_session(pg); T = Touch(cdp); M = pg.mouse
        rot = await pg.evaluate("window.__qp.G.rot")
        def scr(gx, gy): return (gx, gy) if rot == 0 else ((-gy, gx) if rot == 1 else (gy, -gx))
        print(f'{MODE} {W}x{H} rot={rot} | save at boot:', await pg.evaluate("localStorage.getItem('qianpao-pocheng-1')"), '| SV.seen', await pg.evaluate("window.__qp.SV.seen"))
        t0 = asyncio.get_event_loop().time(); now = lambda: asyncio.get_event_loop().time() - t0
        log = []; tiles = []; last = [None]
        async def sample(why=''):
            s = await pg.evaluate(SNAP); key = (s['hint'], s['say'], s['banner'], s['mile'], s['chip'], s['turnHint'])
            if key != last[0] or why:
                last[0] = key; line = f"{now():6.1f}s r{s['r']} {s['ph']:9s} tut{s['tut']} | chip「{s['chip']}」 hint「{s['hint'][:12]}」 say「{s['say']}」 banner「{s['banner']}」{' mile「' + s['mile'] + '」' if s['mile'] else ''}{' [rotate-phone overlay]' if s['turnHint'] else ''}{'  <== ' + why if why else ''}"
                print(line, flush=True); log.append(line)
                if len(tiles) < 48:
                    im = Image.open(io.BytesIO(await pg.screenshot())).convert('RGB')
                    if rot: im = im.rotate(90 if rot == 1 else -90, expand=True)
                    tiles.append(im.resize((844, 390 if MODE != 'mouse' else 475)))
            return s
        async def wait(ms):
            end = now() + ms / 1000
            while now() < end: await sample(); await pg.wait_for_timeout(120)
        async def press(x, y):
            if TOUCH: await T.down(1, x, y)
            else: await M.move(x, y); await M.down()
        async def move(x, y):
            if TOUCH: await T.move(1, x, y)
            else: await M.move(x, y)
        async def release():
            if TOUCH: await T.up(1)
            else: await M.up()
        async def drag(gx, gy, x0=None, y0=None, n=12, hold=0):
            x0 = W * 0.5 if x0 is None else x0; y0 = H * 0.55 if y0 is None else y0
            dx, dy = scr(gx, gy)
            # 別拖出畫面
            x0 = min(max(x0, 20 + max(0, -dx)), W - 20 - max(0, dx)); y0 = min(max(y0, 20 + max(0, -dy)), H - 20 - max(0, dy))
            await press(x0, y0)
            for k in range(1, n + 1): await move(x0 + dx * k / n, y0 + dy * k / n); await pg.wait_for_timeout(25)
            if hold: await wait(hold)
            await release()
        async def tap_el(sel):
            r = await pg.evaluate("(s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel)
            if TOUCH: await pg.touchscreen.tap(r[0], r[1])
            else: await M.click(r[0], r[1])

        await wait(800 if not rot else 3700)
        await sample('home screen')
        await tap_el('#btnGo'); await sample('tapped 出戰')
        # 開場橫幅還在的時候就急著拖（很多人會這樣）
        await pg.wait_for_timeout(250)
        s = await pg.evaluate(SNAP); v0 = s['v']
        await drag(50, -30, n=6); s = await sample(f"dragged 58px + released during the intro (phase {s['ph']})")
        await pg.wait_for_function("window.__qp.S.phase === 'aim'", timeout=10000); await wait(900)
        # 新手：先點一下
        await press(W * 0.5, H * 0.5); await pg.wait_for_timeout(80); await release(); await wait(700)
        s = await sample('tapped once (no drag): volleys=%d' % (await pg.evaluate(VOLLEYS)))
        # 小小拖一下（8px）
        await drag(8, 0, n=3); await wait(600); s = await sample('tiny 8px drag: volleys=%d' % (await pg.evaluate(VOLLEYS)))
        for turn in range(ROUNDS):
            for _ in range(400):
                s = await sample()
                if s['st'] != 'play' or s['mode'] != 'play' or (s['ph'] == 'aim0'): break
                await pg.wait_for_timeout(120)
            if s['st'] != 'play' or s['mode'] != 'play': break
            await wait(1500)                                    # 看一下提示再動手
            plan = await pg.evaluate(PLAN); v0 = await pg.evaluate(VOLLEYS); a0 = await pg.evaluate(AIM)
            gx, gy = plan
            if abs(gx) + abs(gy) < 24: gx += 30        # 已經瞄好了：隨便再拖一點才放得出去
            await drag(gx, gy, n=14, hold=500)
            await pg.wait_for_timeout(120); v1 = await pg.evaluate(VOLLEYS)
            await sample(f'round {s["r"]}: dragged ({gx:.0f},{gy:.0f})px aim {a0} -> {await pg.evaluate(AIM)}; fired={v1 - v0}')
        for _ in range(60):
            s = await sample()
            if s['mode'] == 'result': break
            await pg.wait_for_timeout(150)
        s = await sample('end of script: mode=%s state=%s me=%d%% foe=%d%%' % (s['mode'], s['st'], s['me'], s['foe']))
        if s['mode'] == 'result':
            await pg.wait_for_timeout(1500); await sample('result screen')
            print('  result:', pj(await pg.evaluate("({title: document.getElementById('resTitle').textContent, stars: document.querySelectorAll('#resStars .on').length, bar: document.getElementById('rsBar').textContent, hudBar: document.getElementById('pctA').textContent, coins: document.getElementById('rsCoins').textContent, tip: document.getElementById('resTip').hidden ? null : document.getElementById('resTip').textContent})")))
        print('  save after:', await pg.evaluate("localStorage.getItem('qianpao-pocheng-1')"))
        cols = 4; rows = (len(tiles) + cols - 1) // cols; tw, th = tiles[0].size
        sheet_im = Image.new('RGB', (tw * cols, th * rows), (0, 0, 0))
        for i, im in enumerate(tiles): sheet_im.paste(im, ((i % cols) * tw, (i // cols) * th))
        sheet_im.save(shot_path(f'firstrun_{MODE}_sheet')); print('sheet', sheet_im.size, len(tiles), 'tiles; errors:', msgs)
        await b.close()

asyncio.run(main())
