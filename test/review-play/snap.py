"""等到某個狀況出現就截一張全螢幕（含資訊列）：
   python3 test/review-play/snap.py <關卡> --when="<JS 條件，可用 S、q、boss()、aim0（輪到我瞄準）>" [--seed=7] [--bot=casual] [--tag=名字] [--size=844x390] [--seeds=1,2,3 逐一試到成立為止] [--after=0.1 成立後再走幾秒] [--print="<JS 運算式>"]
   → shots/review-play/snap_L<關卡>_<tag>.png"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
lvl = int(args[0]) if args else 1
W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
bot = opt.get('bot', 'casual'); tag = opt.get('tag', 'a'); when = opt['when']; after = float(opt.get('after', 0.1))
seeds = [int(x) for x in opt.get('seeds', opt.get('seed', '7')).split(',')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2)
        pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        for seed in seeds:
            await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(500)
            await pg.evaluate("([l, seed, bot]) => { const q = window.__qp; q.G.freeze = true; Math.random = (() => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(); q.startLevel(l - 1); q.aiInit(q.S.team[0], q.BOTS[bot], {aiErr: 1}); }", [lvl, seed, bot])
            if 'keephints' not in opt: await pg.add_style_tag(content='#banner,#say,#hint,#mile{display:none!important}')
            ok = await pg.evaluate("""([when, after]) => { const q = window.__qp, S = q.S; const boss = () => S.team[1].units.find(u => u.type === 'boss');
                const test = new Function('S', 'q', 'boss', 'aim0', 'return (' + when + ');'); let n = 0;
                while (n++ < 60 * 400 && S.state === 'play') { q.advance(1 / 60); if (test(S, q, boss, S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.15)) { q.advance(after); return true; } }
                return false; }""", [when, after])
            if ok: break
        if not ok: print('condition never became true for seeds', seeds); await b.close(); return
        out = root / f'shots/review-play/snap_L{lvl}_{tag}.png'
        await pg.screenshot(path=str(out))
        info = await pg.evaluate("""(pr) => { const q = window.__qp, S = q.S; const boss = () => S.team[1].units.find(u => u.type === 'boss');
            const base = {round: S.round, phase: S.phase, turn: S.turn, t: +S.time.toFixed(1), me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100), foeUnits: S.team[1].units.filter(u => u.alive).map(u => u.type + '@' + Math.round(u.x) + ',' + Math.round(u.y)), myUnits: S.team[0].units.filter(u => u.alive).map(u => u.type + '@' + Math.round(u.x) + ',' + Math.round(u.y)), gates: S.gates.map(g => (g.owner === 3 ? '÷2' : '×' + g.mult) + (g.owner === 1 ? 'red' : g.owner === 2 ? 'gold' : '') + '@' + g.x.toFixed(0) + ',' + g.y.toFixed(1) + '±' + g.h), objs: S.objs.filter(o => o.t !== 'geyser' || o.on).map(o => o.t + '@' + Math.round(o.x) + ',' + Math.round(o.y)), viewTop: +q.V.top.toFixed(1), viewX: [+q.V.x0.toFixed(1), +q.V.x1.toFixed(1)]};
            if (pr) base.extra = new Function('S', 'q', 'boss', 'return (' + pr + ');')(S, q, boss); return base; }""", opt.get('print'))
        print('saved', out, 'seed', seed); print(json.dumps(info, ensure_ascii=False)); print('errors:', msgs[:5])
        await b.close()
asyncio.run(main())
