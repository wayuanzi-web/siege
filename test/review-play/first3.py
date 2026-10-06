"""第一次玩的人看到什麼：全新存檔、即時（不凍結）、真的觸控事件（CDP touchStart/Move/End），把第一關前三回合走一遍。
   python3 test/review-play/first3.py [--rounds=3] [--size=844x390] [--tag=a] [--style=newbie|gate]
   每個關鍵時刻截圖到 shots/review-play/first_<tag>_<nn>_<name>.png，並印出畫面上出現過的所有提示文字（時間、回合、輪到誰）。
   style=newbie：每回合隨手拖一下就放；style=gate：第二回合起照提示把虛線拖過倍增符。"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent.parent
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
ROUNDS = int(opt.get('rounds', 3)); tag = opt.get('tag', 'a'); style = opt.get('style', 'gate'); LEVEL = int(opt.get('level', 1))
out = root / 'shots/review-play'; out.mkdir(parents=True, exist_ok=True)
WATCH = """() => {
  const q = window.__qp, S = q.S, log = window.__log = [], t0 = performance.now();
  const rec = (kind, txt) => log.push({ t: +((performance.now() - t0) / 1000).toFixed(2), kind, txt, round: S.round, phase: S.phase, turn: S.turn });
  const watch = (id, kind) => { const el = document.getElementById(id); let last = '';
    new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'childList') { for (const n of m.addedNodes) { const tx = (n.textContent || '').trim(); if (tx) rec(kind, tx); } } else if (m.type === 'attributes') { if (m.attributeName === 'hidden') rec(kind + (el.hidden ? ':hide' : ':show'), el.textContent.trim()); } } }).observe(el, { childList: true, attributes: true, attributeFilter: ['hidden'] }); };
  watch('say', 'say'); watch('banner', 'banner'); watch('turnChip', 'chip'); watch('hint', 'hint'); watch('mile', 'mile');
  const seen = new Set();
  setInterval(() => { for (const p of q.FX.pops) { if (!seen.has(p)) { seen.add(p); rec('pop', p.txt); } } }, 50);
  const f0 = S.on; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((root / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(900)
        cdp = await ctx.new_cdp_session(pg)
        n = [0]
        async def shot(name):
            n[0] += 1; await pg.screenshot(path=str(out / f'first_{tag}_{n[0]:02d}_{name}.png'))
        st = lambda: pg.evaluate("(() => { const q = window.__qp, S = q.S; return {state: S.state, phase: S.phase, turn: S.turn, round: S.round, aim: S.team[0].aim.map(v => +v.toFixed(1)), tut: q.G.tut, mode: q.G.mode, me: Math.round(q.teamBar(0)*100), foe: Math.round(q.teamBar(1)*100), alive: [S.team[0].alive, S.team[1].alive], mask: q.RD.aimMask, sh: Math.round(S.team[0].shield.c), ult: Math.round(S.team[0].ult.c)}; })()")
        async def touch(kind, x, y):
            await cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})
        async def tap(x, y):
            await touch('touchStart', x, y); await pg.wait_for_timeout(50); await touch('touchEnd', x, y)
        async def drag(dx, dy, steps=14, hold_ms=250, x0=None, y0=None, release=True):
            x0 = W * 0.42 if x0 is None else x0; y0 = H * 0.55 if y0 is None else y0
            await touch('touchStart', x0, y0)
            for i in range(1, steps + 1):
                await touch('touchMove', x0 + dx * i / steps, y0 + dy * i / steps); await pg.wait_for_timeout(18)
            await pg.wait_for_timeout(hold_ms)
            if release: await touch('touchEnd', x0 + dx, y0 + dy)
            return (x0 + dx, y0 + dy)
        await shot('home')
        if LEVEL > 1: await pg.evaluate("(l) => { const q = window.__qp; q.SV.open = 6; q.SV.seen = true; q.UI.sel = l - 1; }", LEVEL)
        r = await pg.evaluate("(() => { const b = document.getElementById('btnGo').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await tap(r[0], r[1]); await pg.wait_for_timeout(120)
        await pg.evaluate(WATCH)
        await pg.wait_for_timeout(700); await shot('banner')
        # 等輪到我
        async def wait_for(cond, timeout=30000, step=100):
            t = 0
            while t < timeout:
                s = await st()
                if cond(s): return s
                await pg.wait_for_timeout(step); t += step
            return await st()
        s = await wait_for(lambda s: s['phase'] == 'aim' and s['turn'] == 0)
        print('first aim', s)
        await pg.wait_for_timeout(1500); await shot('r1_aim')
        k = 0.254 * (844 / W)          # 每拖 1 CSS px，初速變多少（844 寬時）
        k = await pg.evaluate("(() => { const q = window.__qp; return q.V.dpr / q.V.s * 1.5; })()")
        for rnd in range(1, ROUNDS + 1):
            s = await wait_for(lambda s: (s['phase'] == 'aim' and s['turn'] == 0) or s['state'] != 'play')
            if s['state'] != 'play': break
            await pg.wait_for_timeout(1200 if rnd > 1 else 200)
            await shot(f'r{rnd}_aim')
            if rnd == 1:
                # 新手：先點一下（不會發射），再隨手往右上拖一段放開
                await tap(W * 0.5, H * 0.5); await pg.wait_for_timeout(700); await shot('r1_tap')
                await drag(30, -34, release=False); await shot('r1_drag'); await touch('touchEnd', 0, 0)
            else:
                if style == 'gate':
                    # 照提示：把虛線拖過藍色倍增符。像人一樣邊拖邊看：目標是「穿過符、落在敵城」的那個角度
                    tgt = await pg.evaluate("""(() => { const q = window.__qp, S = q.S, T = S.team[0]; let lead = null; for (const u of T.units) if (u.alive && u.w) { lead = u; break; } if (!lead) return null;
                        const mx = lead.x + 1.3, my = lead.y + 2.3; let best = null, bs = -1;
                        const gs = S.gates.filter(g => g.owner === 0);
                        for (let a = 0.15; a < 1.3; a += 0.02) for (let v = 34; v <= 84; v += 1) { const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
                            // 簡單彈道：會不會穿過某個藍符、落點在不在敵城
                            let x = mx, y = my, vyy = vy, hit = 0, mult = 1; const used = new Set();
                            for (let t = 0; t < 4; t += 1 / 60) { vyy -= 48 / 60; const nx = x + vx / 60, ny = y + vyy / 60;
                                for (const g of gs) if (!used.has(g) && (x - g.x) * (nx - g.x) <= 0 && Math.abs(ny - g.y) < g.h) { used.add(g); mult *= g.mult; }
                                x = nx; y = ny; if (x > 80 && x < 106 && y < 34 && y > 2) { hit = 1; break; } if (y < 0) break; }
                            if (hit && used.size) { const sc = mult - Math.abs(a - 0.6); if (sc > bs) { bs = sc; best = [vx, vy, mult]; } } }
                        return best; })()""")
                    cur = s['aim']
                    if tgt:
                        dx, dy = (tgt[0] - cur[0]) / k, -(tgt[1] - cur[1]) / k
                        print(f'  round {rnd}: aim {cur} -> {tgt[:2]} (through x{tgt[2]}), drag {dx:.0f},{dy:.0f} px')
                        await drag(dx, dy, steps=24, release=False)
                    else:
                        await drag(6, -4, release=False)
                else:
                    await drag(10 * (1 if rnd % 2 else -1), -8, release=False)
                await shot(f'r{rnd}_drag'); print('   dragging', await st())
                await touch('touchEnd', 0, 0)
            await pg.wait_for_timeout(900); await shot(f'r{rnd}_flight')
            # 拍我方這一輪的著彈：每 0.5 秒一張，拍到輪到敵軍
            for i in range(8):
                await pg.wait_for_timeout(500); s = await st()
                if i in (1, 3): await shot(f'r{rnd}_impact{i}')
                if not (s['turn'] == 0 and s['phase'] in ('volley', 'resolve')): break
            s = await wait_for(lambda s: (s['turn'] == 1 and s['phase'] == 'aim') or s['state'] != 'play' or (s['turn'] == 0 and s['phase'] == 'aim' and s['round'] > rnd), 12000)
            if s['state'] != 'play': break
            await pg.wait_for_timeout(700); await shot(f'r{rnd}_foe_aim')
            s = await wait_for(lambda s: (s['turn'] == 1 and s['phase'] == 'resolve') or s['state'] != 'play', 8000)
            await pg.wait_for_timeout(1500); await shot(f'r{rnd}_foe_hit')
            print(f'round {rnd} done', await st())
        s = await st()
        if s['state'] != 'play':
            await pg.wait_for_timeout(1500); await shot('end_1p5s'); await pg.wait_for_timeout(1500); await shot('end_3s'); await pg.wait_for_timeout(2500); await shot('result')
        log = await pg.evaluate("window.__log")
        print('--- on-screen text log (seconds since level start, round, phase/turn) ---')
        for e in log:
            if e['kind'] == 'chip': continue
            print(f"  {e['t']:6.2f}s r{e['round']} {e['phase']}/{e['turn']} [{e['kind']}] {e['txt']}")
        print('--- turn chip texts ---'); print('  ' + ' | '.join(f"{e['t']:.1f}s {e['txt']}" for e in log if e['kind'] == 'chip')[:1500])
        print('final', await st()); print('console:', msgs[:10]); await b.close()
asyncio.run(main())
