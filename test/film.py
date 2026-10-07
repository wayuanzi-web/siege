"""連續畫面：看一次砲擊後城樓怎麼垮。
   python3 test/film.py <關卡> [--side=1] [--aim=vx,vy] [--bomb=x,y,武器] [--kill=x,y] [--frames=12] [--dt=0.15] [--crop=x0,y0,x1,y1（戰場座標）] [--tag=名字] [--skip=回合數] [--cols=4] [--scale=2]
   預設：我方用自動玩家打一輪，鏡頭對著敵城。--bomb 直接在指定位置引爆一顆（看結構怎麼塌）。"""
import asyncio, sys, pathlib, json, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
lvl = int(args[0]) if args else 1
frames = int(opt.get('frames', 12)); dt = float(opt.get('dt', 0.15)); cols = int(opt.get('cols', 4)); skip = int(opt.get('skip', 0))
W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
scale = float(opt.get('scale', 2))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=scale)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        seed = int(opt.get('seed', 7))
        await pg.evaluate("([l, seed]) => { const q = window.__qp; q.G.freeze = true; Math.random = (() => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(); q.startLevel(l - 1); q.aiInit(q.S.team[0], q.BOTS[BOTNAME], {aiErr: 1}); }".replace('BOTNAME', json.dumps(opt.get('bot', 'expert'))), [lvl, seed])
        await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}' + ('#hud{display:none!important}' if 'nohud' in opt else ''))
        # 先跑到指定的回合、輪到指定的一邊開火
        side = int(opt.get('side', 0))
        await pg.evaluate("""([skip, side]) => { const q = window.__qp, S = q.S; let n = 0;
            while (n++ < 60 * 400 && S.state === 'play' && !(S.round >= skip + 1 && S.phase === 'aim' && S.turn === side)) q.advance(1 / 60); }""", [skip, side])
        if 'end' in opt:
            # 一路打到分出勝負的前一刻（最後一個兵倒下的那一步），從那裡開始拍
            await pg.evaluate("""() => { const q = window.__qp, S = q.S; let n = 0; while (n++ < 60 * 900 && S.state === 'play') q.advance(1 / 60); }""")
        elif 'kill' in opt:
            # 直接把離指定位置最近的那塊磚打掉（看上面的東西怎麼塌）
            x, y = [float(v) for v in opt['kill'].split(',')]
            await pg.evaluate("([x, y]) => { const q = window.__qp, S = q.S; let best = null, bd = 1e9; for (const b of S.blocks) { if (b.dead || !b.inPlace) continue; const p = b.body.getPosition(), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = b; } } S.phase = 'resolve'; S.phaseT = 0; q.blockKill(best, 0, 0); }", [x, y])
        elif 'bomb' in opt:
            x, y, w = opt['bomb'].split(','); 
            await pg.evaluate("([x, y, w]) => { const q = window.__qp; q.S.phase = 'resolve'; q.S.phaseT = 0; q.physExplode(x, y, q.WPN[w], 0, 1, 0, null, 1, -0.3); }", [float(x), float(y), w])
        else:
            if 'aim' in opt:
                vx, vy = [float(v) for v in opt['aim'].split(',')]
                await pg.evaluate("([s, vx, vy]) => { const q = window.__qp; q.S.team[s].ai = null; q.simAim(s, vx, vy); q.simFire(s); }", [side, vx, vy])
            else:
                await pg.evaluate("(side) => { const q = window.__qp, S = q.S; let n = 0; while (n++ < 600 && S.phase === 'aim') q.advance(1 / 60); }", side)
            if 'lead' in opt: await pg.evaluate("(t) => window.__qp.advance(t)", float(opt['lead']))
        info = await pg.evaluate("(() => { const q = window.__qp, V = q.V, S = q.S; return {s: V.s, cx: V.cx, gy: V.gy, W: V.W, H: V.H, st: S.st.map(t => [t.x0, t.y0, t.x1, t.y1])}; })()")
        tgt = info['st'][1 - side] if 'bomb' not in opt and 'kill' not in opt else info['st'][1]
        if 'end' in opt:
            loser = await pg.evaluate("window.__qp.S.loser"); tgt = info['st'][loser if loser in (0, 1) else 1]
        if 'crop' in opt: cx0, cy0, cx1, cy1 = [float(v) for v in opt['crop'].split(',')]
        elif 'full' in opt: cx0, cy0, cx1, cy1 = -6, -8, 118, 56
        else: cx0, cy0, cx1, cy1 = tgt[0] - 14, -6, tgt[2] + 12, tgt[3] + 10
        k = scale / (info['W'] / W)   # 截圖像素 / 畫布像素
        X = lambda wx: ((wx - 56) * info['s'] + info['cx']) * k
        Y = lambda wy: (info['gy'] - wy * info['s']) * k
        box = (int(max(0, X(cx0))), int(max(0, Y(cy1))), int(min(W * scale, X(cx1))), int(min(H * scale, Y(cy0))))
        tiles = []; stats = []
        for f in range(frames):
            png = await pg.screenshot()
            im = Image.open(io.BytesIO(png)).convert('RGB').crop(box)
            st = await pg.evaluate("(() => { const q = window.__qp, S = q.S; let aw = 0; for (let b = q.PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic() && b.isAwake()) aw++; return [S.phase, S.turn, Math.round(q.teamBar(0)*100), Math.round(q.teamBar(1)*100), q.SH.n, aw, S.chain, S.team[0].alive, S.team[1].alive]; })()")
            ImageDraw.Draw(im).text((6, 4), f't+{f*dt:.2f}s  {st[0]} me{st[2]} foe{st[3]} shots{st[4]} awake{st[5]} chain{st[6]}', fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
            tiles.append(im); stats.append(st)
            await pg.evaluate("(t) => window.__qp.advance(t)", dt)
        tw, th = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new('RGB', (tw * cols + 4 * (cols - 1), th * rows + 4 * (rows - 1)), (20, 20, 28))
        for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
        out = root / f"shots/film_L{lvl}_{opt.get('tag', 'a')}.png"; sheet.save(out)
        print('saved', out, sheet.size, 'last', stats[-1]); print('console:', msgs[:8])
        await b.close()
asyncio.run(main())
