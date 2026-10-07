"""review3：第六關的毀滅光球。
   python3 test/review3-look/orb.py [--seed=7] [--mode=reflect|strike|bot] [--name=…] [--bot=expert]
   reflect  光球停在半路、輪到我方的時候，對準它打（看「反彈！」和它砸回魔王身上）
   bot      同一個時刻，讓自動玩家自己決定打哪裡
   strike   不打它，拍下一輪它砸在我方城樓上
   圖存到 shots/review3/<name>.png"""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from r3 import Session, start_level, view_info, Cam, capture, summary, parse_opts, OUT


async def main():
    args, opt = parse_opts(sys.argv[1:])
    seed = int(opt.get('seed', 7)); mode = opt.get('mode', 'reflect'); bot = opt.get('bot', 'expert')
    name = opt.get('name', f'L6_orb_{mode}_{seed}')
    W, H, scale = 844, 390, 2
    async with Session() as sess:
        ctx, pg, msgs = await sess.page(W, H, scale)
        await start_level(pg, 6, seed, bot)
        ok = await pg.evaluate("""() => { const S = window.__qp.S; return R3.ff(() => S.state !== 'play' || (S.phase === 'aim' && S.turn === 0 && S.objs.some(o => o.t === 'orb' && o.st === 'hover')), 900); }""")
        st = await pg.evaluate("R3.stat()")
        orb = await pg.evaluate("(() => { const o = window.__qp.S.objs.find(o => o.t === 'orb'); return o ? {x: o.x, y: o.y, st: o.st, hp: o.hp, hm: o.hm} : null; })()")
        print('at', st['state'], 'round', st['round'], 'boss phase', st['boss'], 'me', st['me'], 'foe', st['foe'], 'orb', orb)
        if st['state'] != 'play' or not orb or orb['st'] != 'hover':
            print('no hovering orb on the player turn with this seed'); await ctx.close(); return
        info = await view_info(pg)
        if mode == 'strike':
            # 我方這一輪照常打（但不准打光球：讓自動玩家不管飛行物），然後拍敵軍那一輪
            await pg.evaluate("() => { const q = window.__qp, S = q.S; S.team[0].ai.guard = 0; R3.ff(() => S.state !== 'play' || (S.phase === 'aim' && S.turn === 1), 60); R3.ff(() => S.phase !== 'aim' || S.state !== 'play', 20); }")
            tg = info['st'][0]; cam = Cam(info, W, H, scale, [-8, -7, 72, 52])
            meta = await capture(pg, cam, W, H, scale, name=name, n_act=16, tgt_x=(tg[0] - 10, tg[2] + 10), note='orb strike', tmax=16)
        else:
            if mode == 'reflect':
                r = await pg.evaluate("""() => { const q = window.__qp, S = q.S, o = S.objs.find(o => o.t === 'orb');
                    let best = null;
                    for (let tau = 0.7; tau < 2.6; tau += 0.05) { const a = R3.aimAt(0, o.x, o.y, tau); if (!a) break; const v = Math.hypot(a[0], a[1]), ang = Math.atan2(a[1], a[0]); if (a[0] > 0 && v >= 32 && v <= 86 && ang >= 0.1 && ang <= 1.5) { best = a; break; } }
                    if (!best) return null; S.team[0].ai = null; q.simAim(0, best[0], best[1]); q.simFire(0); return best; }""")
                print('aim', r)
            else:
                await pg.evaluate("() => { const S = window.__qp.S; R3.ff(() => S.phase !== 'aim' || S.state !== 'play', 20); }")
            cam = Cam(info, W, H, scale, [30, -7, 121, 54] if 'wide' in opt else [56, -7, 121, 54])
            meta = await capture(pg, cam, W, H, scale, name=name, n_act=16, tgt_x=(56, 121), note='orb ' + mode, tmax=16, fine=float(opt.get('fine', 0.1)))
        print(summary(meta)); print('console:', msgs[:5])
        log = await pg.evaluate("R3.log.filter(e => ['orb','orbback','orbdie','orbgo','phase','bossback','udie'].includes(e[1]))"); print(log)
        await ctx.close()

asyncio.run(main())
