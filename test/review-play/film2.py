"""審查用的連續畫面（改自 test/film.py）：自動等到第一發快要打到才開始拍，圖存到 shots/review-play/。
   python3 test/review-play/film2.py <關卡> [--side=0|1] [--skip=先打幾回合] [--bot=casual] [--seed=7] [--frames=16] [--dt=0.2] [--cols=4]
        [--scale=2] [--crop=x0,y0,x1,y1] [--full] [--end] [--aim=vx,vy] [--pre=0.15 拍之前再多走幾秒] [--tag=名字] [--hud]
   每一格左上角：開拍後幾秒、階段、雙方城防、天上幾發、還醒著的物體、這段時間發生的事（兵倒下、連鎖）。"""
import asyncio, sys, pathlib, json, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
lvl = int(args[0]) if args else 1
frames = int(opt.get('frames', 16)); dt = float(opt.get('dt', 0.2)); cols = int(opt.get('cols', 4)); skip = int(opt.get('skip', 0))
W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
scale = float(opt.get('scale', 2)); side = int(opt.get('side', 0)); bot = opt.get('bot', 'casual'); seed = int(opt.get('seed', 7))
HOOK = """() => { const q = window.__qp, S = q.S; if (!window.__ev) { window.__ev = []; const f0 = S.on; S.on = function (t, a, b, c, d, e, f) {
    if (t === 'udie') window.__ev.push((c === 0 ? 'ME ' : 'FOE ') + d + ' ' + ['hit', 'crush', '', 'burn', 'fell'][e]);
    else if (t === 'chain') window.__ev.push('chain x' + a + ' by ' + b);
    else if (t === 'phase' || t === 'bossback' || t === 'orb' || t === 'orbdie' || t === 'barbreak' || t === 'launch' || t === 'pop' || t === 'bonus' || t === 'gbreak' && d === 1 || t === 'freeze' || t === 'skip' || t === 'rockstop' || t === 'shield' || t === 'ult') window.__ev.push(t + (t === 'bonus' ? ':' + d : ''));
    return f0.apply(this, arguments); }; } }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=scale)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        await pg.evaluate("([l, seed, bot]) => { const q = window.__qp; q.G.freeze = true; Math.random = (() => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(); q.startLevel(l - 1); q.aiInit(q.S.team[0], q.BOTS[bot], {aiErr: 1}); }", [lvl, seed, bot])
        await pg.evaluate(HOOK)
        await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}' + ('' if 'hud' in opt else '#hud{display:none!important}'))
        await pg.evaluate("""([skip, side]) => { const q = window.__qp, S = q.S; let n = 0;
            while (n++ < 60 * 600 && S.state === 'play' && !(S.round >= skip + 1 && S.phase === 'aim' && S.turn === side)) q.advance(1 / 60); }""", [skip, side])
        pre = await pg.evaluate("(() => { const q = window.__qp, S = q.S; return {state: S.state, round: S.round, me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100), alive: [S.team[0].alive, S.team[1].alive]}; })()")
        if pre['state'] != 'play' and 'end' not in opt:
            print('game already over before this round:', pre); await b.close(); return
        if 'end' in opt:
            # 先整場跑一遍，記下分出勝負的時間；重新開同一場（亂數種子一樣，戰局會一模一樣），跑到結束前 lead 秒再開始拍
            tEnd = await pg.evaluate("""() => { const q = window.__qp, S = q.S; let n = 0; while (n++ < 60 * 1500 && S.state === 'play') q.advance(1 / 60); return S.time; }""")
            await pg.reload(); await pg.wait_for_timeout(600)
            await pg.evaluate("([l, seed, bot]) => { const q = window.__qp; q.G.freeze = true; Math.random = (() => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(); q.startLevel(l - 1); q.aiInit(q.S.team[0], q.BOTS[bot], {aiErr: 1}); }", [lvl, seed, bot])
            await pg.evaluate(HOOK)
            await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}' + ('' if 'hud' in opt else '#hud{display:none!important}'))
            t2 = await pg.evaluate("""([tEnd, lead]) => { const q = window.__qp, S = q.S; let n = 0; while (n++ < 60 * 1500 && S.state === 'play' && S.time < tEnd - lead) q.advance(1 / 60); return [S.time, S.state, S.round]; }""", [tEnd, float(opt.get('lead', 1.0))])
            print('end at sim t=%.2f, filming from %.2f (%s, round %d)' % (tEnd, t2[0], t2[1], t2[2]))
        else:
            if 'aim' in opt:
                vx, vy = [float(v) for v in opt['aim'].split(',')]
                await pg.evaluate("([s, vx, vy]) => { const q = window.__qp; q.S.team[s].ai = null; q.simAim(s, vx, vy); q.simFire(s); }", [side, vx, vy])
            elif 'ataim' in opt:
                pass                                   # 從輪到這一邊瞄準的那一刻開始拍
            else:
                await pg.evaluate("() => { const q = window.__qp, S = q.S; let n = 0; while (n++ < 900 && S.phase === 'aim') q.advance(1 / 60); }")
            # 等到這一邊的砲彈（或氣球丟下來的炸彈）快要碰到對面的城樓（--nowait：一開火就拍）
            if 'nowait' not in opt and 'ataim' not in opt: await pg.evaluate("""([side]) => { const q = window.__qp, S = q.S, SH = q.SH, tg = S.st[1 - side]; let n = 0;
                const near = () => { for (let i = 0; i < SH.n; i++) { if (SH.side[i] !== side) continue; const x = SH.x[i], y = SH.y[i]; if (x > tg.x0 - 7 && x < tg.x1 + 7 && y < tg.y1 + 9) return true; } return false; };
                const hp0 = S.st[1 - side].hpNow, ev0 = window.__ev.length;
                while (n++ < 60 * 9 && S.state === 'play' && !near() && S.st[1 - side].hpNow >= hp0 - 0.01 && !(S.phase === 'aim')) q.advance(1 / 60); }""", [side])
            if 'pre' in opt: await pg.evaluate("(t) => window.__qp.advance(t)", float(opt['pre']))
        info = await pg.evaluate("(() => { const q = window.__qp, V = q.V, S = q.S; return {s: V.s, cx: V.cx, gy: V.gy, W: V.W, H: V.H, st: S.st.map(t => [t.x0, t.y0, t.x1, t.y1]), loser: S.loser, round: S.round}; })()")
        tgt = info['st'][1 - side]
        if 'end' in opt:
            # 還沒分出勝負（提前開拍），看兩邊誰快輸了
            los = await pg.evaluate("(() => { const q = window.__qp, S = q.S; if (S.loser >= 0) return S.loser; return q.teamBar(0) < q.teamBar(1) ? 0 : 1; })()")
            if 'loser' in opt: los = int(opt['loser'])
            tgt = info['st'][los]
        if 'crop' in opt: cx0, cy0, cx1, cy1 = [float(v) for v in opt['crop'].split(',')]
        elif 'full' in opt: cx0, cy0, cx1, cy1 = -9, -9, 121, 58
        else: cx0, cy0, cx1, cy1 = tgt[0] - 9, -5, tgt[2] + 9, tgt[3] + 9
        k = scale / (info['W'] / W)
        X = lambda wx: ((wx - 56) * info['s'] + info['cx']) * k
        Y = lambda wy: (info['gy'] - wy * info['s']) * k
        box = (int(max(0, X(cx0))), int(max(0, Y(cy1))), int(min(W * scale, X(cx1))), int(min(H * scale, Y(cy0))))
        tiles = []; last = None
        await pg.evaluate("window.__ev.length = 0")
        for f in range(frames):
            png = await pg.screenshot()
            im = Image.open(io.BytesIO(png)).convert('RGB').crop(box)
            st = await pg.evaluate("(() => { const q = window.__qp, S = q.S; let aw = 0, mv = 0; for (let b = q.PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic() && b.isAwake()) { aw++; const v = b.getLinearVelocity(); if (v.x * v.x + v.y * v.y > 0.25 || Math.abs(b.getAngularVelocity()) > 0.3) mv++; } const ev = window.__ev.splice(0); return [S.phase, S.turn, Math.round(q.teamBar(0)*100), Math.round(q.teamBar(1)*100), q.SH.n, aw, mv, S.team[0].alive, S.team[1].alive, ev, S.state]; })()")
            d = ImageDraw.Draw(im)
            d.text((6, 4), f't+{f*dt:.2f}s {st[0]}/{st[1]} me{st[2]}%/{st[7]} foe{st[3]}%/{st[8]} shots{st[4]} moving{st[6]}', fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
            if st[9]: d.text((6, 18), ' | '.join(st[9])[:90], fill=(255, 230, 90), stroke_width=2, stroke_fill=(0, 0, 0))
            tiles.append(im); last = st
            await pg.evaluate("(t) => window.__qp.advance(t)", dt)
        tw, th = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new('RGB', (tw * cols + 4 * (cols - 1), th * rows + 4 * (rows - 1)), (20, 20, 28))
        for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
        (root / 'shots/review-play').mkdir(parents=True, exist_ok=True)
        tag = opt.get('tag', ('end' if 'end' in opt else ('e' if side else 'a') + str(skip + 1)) + '_' + bot + str(seed))
        out = root / f"shots/review-play/film_L{lvl}_{tag}.png"; sheet.save(out)
        print('saved', out, sheet.size, 'round', info['round'], 'before', pre, 'last', last[:9], 'state', last[10]); print('console:', msgs[:8])
        await b.close()
asyncio.run(main())
