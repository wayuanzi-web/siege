"""整場戰局的分鏡：每一回合輪到我瞄準時（塵埃落定之後）拍一張全景，最後再拍結束後的樣子。
   python3 test/review-play/story.py <關卡> [--bot=casual] [--seed=7] [--cols=3] [--scale=1] [--max=12] [--both]（--both：輪到敵軍瞄準時也拍）
   → shots/review-play/story_L<關卡>_<bot><seed>.png"""
import asyncio, sys, pathlib, json, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
lvl = int(args[0]) if args else 1
W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
scale = float(opt.get('scale', 1)); bot = opt.get('bot', 'casual'); seed = int(opt.get('seed', 7)); cols = int(opt.get('cols', 3)); mx = int(opt.get('max', 12))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=scale)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        await pg.evaluate("([l, seed, bot]) => { const q = window.__qp; q.G.freeze = true; Math.random = (() => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(); q.startLevel(l - 1); q.aiInit(q.S.team[0], q.BOTS[bot], {aiErr: 1}); }", [lvl, seed, bot])
        await pg.evaluate("""() => { const q = window.__qp, S = q.S; window.__ev = []; const f0 = S.on; S.on = function (t, a, b, c, d, e, f) {
            if (t === 'udie') window.__ev.push((c === 0 ? 'ME ' : 'FOE ') + d + ' ' + ['hit', 'crush', '', 'burn', 'fell'][e]);
            else if (t === 'chain') window.__ev.push('chain x' + a + ' by ' + b);
            else if (t === 'phase' || t === 'bossback' || t === 'orbdie' || t === 'barbreak' || t === 'pop' || t === 'bonus' || (t === 'gbreak' && d === 1) || (t === 'shield') || t === 'ult') window.__ev.push(t + (t === 'bonus' ? ':' + d + (c ? '(foe)' : '(me)') : t === 'shield' || t === 'ult' ? (c ? '(foe)' : '(me)') : ''));
            return f0.apply(this, arguments); }; }""")
        await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}')
        tiles = []
        both = 'both' in opt
        while len(tiles) < mx:
            st = await pg.evaluate("""([both]) => { const q = window.__qp, S = q.S; let n = 0; const r0 = S.round, t0 = S.turn, p0 = S.phase;
                // 走到下一次「輪到…瞄準」
                while (n++ < 60 * 200 && S.state === 'play' && !(S.phase === 'aim' && (both || S.turn === 0) && (S.round !== r0 || S.turn !== t0 || p0 !== 'aim'))) q.advance(1 / 60);
                if (S.state !== 'play') q.advance(3.2);
                else q.advance(0.05);
                let aw = 0; for (let b = q.PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic() && b.isAwake()) { const v = b.getLinearVelocity(); if (v.x * v.x + v.y * v.y > 0.25 || Math.abs(b.getAngularVelocity()) > 0.3) aw++; }
                return {state: S.state, round: S.round, turn: S.turn, me: Math.round(q.teamBar(0) * 100), foebar: Math.round(q.teamBar(1) * 100), alive: [S.team[0].alive, S.team[1].alive], t: +S.time.toFixed(1), moving: aw, ev: window.__ev.splice(0), foe: S.team[1].units.filter(u => u.alive).map(u => u.type + '@' + Math.round(u.x) + ',' + Math.round(u.y)), mine: S.team[0].units.filter(u => u.alive).map(u => u.type + '@' + Math.round(u.x) + ',' + Math.round(u.y)), vis: [+q.V.x0.toFixed(1), +q.V.x1.toFixed(1)], boss: S.boss ? S.boss.phase : 0}; }""", [both])
            print('  r%d t=%s %s me %d%%/%d foe %d%%/%d  foe units: %s | my units: %s | visible x %s phase %s | %s' % (st['round'], st['t'], st['state'], st['me'], st['alive'][0], st['foebar'] if 'foebar' in st else -1, st['alive'][1], ' '.join(st['foe']), ' '.join(st['mine']), st['vis'], st['boss'], '; '.join(st['ev'])))
            im = Image.open(io.BytesIO(await pg.screenshot())).convert('RGB')
            d = ImageDraw.Draw(im)
            lab = f"r{st['round']} {'me' if st['turn'] == 0 else 'foe'} aim  t={st['t']}s me {st['me']}%/{st['alive'][0]} foe {st['foebar']}%/{st['alive'][1]} moving{st['moving']}" if st['state'] == 'play' else f"{st['state'].upper()} after round {st['round']} t={st['t']}s"
            d.text((int(60 * scale), int(H * scale * 0.2)), lab, fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
            y = int(H * scale * 0.2) + 13
            for e in st['ev'][:7]: d.text((int(60 * scale), y), e, fill=(255, 230, 90), stroke_width=2, stroke_fill=(0, 0, 0)); y += 12
            tiles.append(im)
            if st['state'] != 'play': break
        tw, th = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new('RGB', (tw * cols + 4 * (cols - 1), th * rows + 4 * (rows - 1)), (20, 20, 28))
        for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
        (root / 'shots/review-play').mkdir(parents=True, exist_ok=True)
        out = root / f"shots/review-play/story_L{lvl}_{bot}{seed}{'_both' if both else ''}.png"; sheet.save(out)
        print('saved', out, sheet.size, 'frames', len(tiles), 'final', st['state'], 'round', st['round']); print('console:', msgs[:8])
        await b.close()
asyncio.run(main())
