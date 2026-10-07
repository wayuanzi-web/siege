"""review2-sim：把 Node 裡找到的某一場（同一個種子、同一種自動玩家）在瀏覽器裡重播，拍某一回合的連續畫面。
   python3 test/review2-sim/film2.py <關卡> <模擬種子> <bot> "<JS 條件式>" [--frames=8] [--dt=0.4] [--lead=0] [--tag=x] [--cols=2] [--scale=1.2] [--crop=x0,y0,x1,y1] [--diff=1] [--up=0]
   條件式裡可以用 S（戰局）、q（window.__qp）：一步一步往前跑，條件第一次成立就停下來開始拍。例："S.boss.phase===1 && S.turn===1 && S.phase==='resolve' && boss().hp < 0.7*boss().hpMax"
   注意：同一個種子在瀏覽器裡跑出來的戰局跟 Node 不一樣（Math.pow 的最後一位不同），所以時間點要在瀏覽器裡用條件找。
   用的是 src/dist/index.html（不重新建置）。橫幅和提示都留著（要看的就是玩家看到什麼）。圖存到 shots/r2sim_<tag>.png"""
import asyncio, sys, pathlib, json, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
lvl, seed, bot, cond = int(args[0]), int(args[1]), args[2], args[3]
frames = int(opt.get('frames', 8)); dt = float(opt.get('dt', 0.4)); cols = int(opt.get('cols', 2)); scale = float(opt.get('scale', 1.2)); lead = float(opt.get('lead', 0))
W, H = 844, 390
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=scale)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error',) and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
        # startLevel 用 (Math.random() * 1e9) | 0 當模擬種子：讓第一次 Math.random 回傳我們要的值
        await pg.evaluate("""([l, seed, bot, diff]) => { const q = window.__qp; q.G.freeze = true; q.SV.diff = diff; q.SV.seen = true; q.SV.seenUlt = true; q.SV.seenSh = true;
            const real = Math.random; Math.random = () => (seed + 0.5) / 1e9;
            const u = +up; q.SV.up = {dmg: u, aim: u, hp: u, shield: u, ult: u}; q.startLevel(l - 1); Math.random = real; q.aiInit(q.S.team[0], q.BOTS[bot], {aiErr: 1}); }""".replace('+up', str(int(opt.get('up', 0)))), [lvl, seed, bot, int(opt.get('diff', 1))])
        ok = await pg.evaluate("""([cond]) => { const q = window.__qp, S = q.S; let n = 0; const boss = () => S.team[1].units.find(u => u.type === 'boss');
            const want = new Function('S', 'q', 'boss', 'return (' + cond + ');');
            let hit = false;
            while (n++ < 60 * 1500 && S.state === 'play') { let ok = false; try { ok = !!want(S, q, boss); } catch (e) { ok = false; } if (ok) { hit = true; break; } q.advance(1 / 60); }
            return [hit, S.state, S.round, S.phase, S.turn, +S.time.toFixed(1)]; }""", [cond])
        if lead: await pg.evaluate("(t) => window.__qp.advance(t)", lead)
        info = await pg.evaluate("(() => { const q = window.__qp, V = q.V; return {s: V.s, cx: V.cx, gy: V.gy, W: V.W}; })()")
        k = scale / (info['W'] / W)
        X = lambda wx: ((wx - 56) * info['s'] + info['cx']) * k
        Y = lambda wy: (info['gy'] - wy * info['s']) * k
        box = None
        if 'crop' in opt:
            cx0, cy0, cx1, cy1 = [float(v) for v in opt['crop'].split(',')]
            box = (int(max(0, X(cx0))), int(max(0, Y(cy1))), int(min(W * scale, X(cx1))), int(min(H * scale, Y(cy0))))
        tiles = []; stats = []
        for f in range(frames):
            png = await pg.screenshot()
            im = Image.open(io.BytesIO(png)).convert('RGB')
            if box: im = im.crop(box)
            st = await pg.evaluate("""(() => { const q = window.__qp, S = q.S; const bu = S.team[1].units.find(u => u.type === 'boss');
                const orb = S.objs.find(o => o.t === 'orb'), bar = S.objs.find(o => o.t === 'barrier');
                return { ph: S.phase, turn: S.turn, r: S.round, me: S.team[0].alive, foe: S.team[1].alive, boss: bu ? Math.round(bu.hp) + '/' + Math.round(bu.hpMax) + (bu.alive ? '' : ' dead') : '', bp: S.boss ? S.boss.phase : 0,
                  orb: orb ? orb.st + '@' + orb.x.toFixed(0) + ',' + orb.y.toFixed(0) : '', bar: bar ? bar.segs.map(s => s.dead > 0 ? 'x' : s.on ? '#' : '_').join('') : '', gates: S.gates.map(g => (g.owner === 0 ? 'b' : g.owner === 1 ? 'r' : g.owner === 2 ? 'g' : 'p') + g.mult).join(' '), say: document.getElementById('say').textContent, ban: document.getElementById('banner').textContent, chip: document.getElementById('turnChip').hidden ? '' : document.getElementById('turnChip').textContent, sh: S.team[0].shield.on, marks: S.marks.length }; })()""")
            ImageDraw.Draw(im).text((6, im.size[1] - 16), f"t+{f*dt:.1f}s r{st['r']} {st['ph']}{st['turn']} units {st['me']}v{st['foe']} boss {st['boss']} P{st['bp']} orb[{st['orb']}] bar[{st['bar']}] gates[{st['gates']}]", fill=(255, 255, 0), stroke_width=2, stroke_fill=(0, 0, 0))
            tiles.append(im); stats.append(st)
            await pg.evaluate("(t) => window.__qp.advance(t)", dt)
        tw, th = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new('RGB', (tw * cols + 4 * (cols - 1), th * rows + 4 * (rows - 1)), (20, 20, 28))
        for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
        out = root / f"shots/r2sim_{opt.get('tag', 'a')}.png"; sheet.save(out)
        print('reached', ok); print('saved', out, sheet.size)
        for i, st in enumerate(stats): print(f"  f{i}: r{st['r']} {st['ph']}{st['turn']} units {st['me']}v{st['foe']} boss {st['boss']} P{st['bp']} orb[{st['orb']}] bar[{st['bar']}] gates[{st['gates']}] shield {st['sh']} marks {st['marks']} | banner '{st['ban']}' | chip '{st['chip']}' | say '{st['say']}'")
        print('console:', msgs[:6])
        await b.close()
asyncio.run(main())
