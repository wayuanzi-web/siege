"""review5：自動玩家跑完整場（真的每一格迴圈＋假時鐘），一次掛好幾個 hook（review4 的 hook_rest / hook_late / hook_udie / hook_bars ＋ review5 的 hook_new5），
   每一場各 hook 的結果存成 shots/review5/multi_<tag>.json，之後用 sum5.py 看統計。
   python3 test/review5-look/multi5.py --tag=A --levels=1,2,3,4,5,6 --seeds=1,2,3 --bot=casual [--size=844x390] [--hooks=rest,late,udie,bars,new5]
   （各個 hook 都會包住 S.on；這裡負責把彼此的記號互相補上，免得每一格重複包。）"""
import asyncio, sys, json, pathlib, time
HERE = pathlib.Path(__file__).resolve().parent
R4 = HERE.parent / 'review4-look'
sys.path.insert(0, str(R4))
from start4 import START, start_args
from q4 import Game, parse_opts
OUT = HERE.parent.parent / 'shots' / 'review5'; OUT.mkdir(parents=True, exist_ok=True)
FILES = {'rest': R4 / 'hook_rest.js', 'late': R4 / 'hook_late.js', 'udie': R4 / 'hook_udie.js', 'bars': R4 / 'hook_bars.js', 'new5': HERE / 'hook_new5.js', 'hang': R4 / 'hook_hang.js'}

COMBINE = r"""
(names) => {
  const hooks = window.__subHooks.slice(), results = window.__subResults.slice(), q = window.__qp, S = q.S, FL = ['__w', '__w2', '__w3', '__w5'];
  let seen = {}, lastOn = null;
  window.__hook = () => {
    if (S.on !== lastOn && S.on && !FL.some((k) => S.on[k])) seen = {};
    for (const h of hooks) { try { h(); } catch (e) { console.error('SUBHOOK ' + (e && e.stack || e)); }
      if (S.on) { for (const k of FL) if (S.on[k]) seen[k] = 1; for (const k of FL) if (seen[k]) S.on[k] = 1; } }
    lastOn = S.on;
  };
  window.__hookResult = () => { const o = {}; names.forEach((n, i) => { o[n] = results[i] ? results[i]() : null; }); return o; };
}
"""

async def main():
    args, opt = parse_opts(sys.argv[1:])
    W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
    levels = [int(x) for x in opt.get('levels', '1,2,3,4,5,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '1,2,3').split(',')]
    bot = opt.get('bot', 'casual'); maxsec = int(opt.get('maxsec', 500)); tag = opt.get('tag', 'A')
    names = opt.get('hooks', 'rest,late,udie,bars,new5').split(',')
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': int(opt.get('diff', 1)), 'flip': False}
    games = []; t00 = time.time()
    if 'page' in opt:
        import q4 as _q4; _q4.PAGE = pathlib.Path(opt['page'])          # 換一版頁面來跑（跟舊版比）
    async with Game(W, H, scale=1, save=save) as g:
        await g.sec(0.5)
        await g.js("() => { window.__subHooks = []; window.__subResults = []; }")
        for n in names:
            await g.js(FILES[n].read_text())
            await g.js("() => { window.__subHooks.push(window.__hook); window.__subResults.push(window.__hookResult); window.__hook = null; window.__hookResult = null; }")
        await g.js(COMBINE, names)
        for lvl in levels:
            for seed in seeds:
                t0 = time.time()
                await g.js(START, start_args(lvl, seed, bot))
                ok = await g.until("G.mode === 'result'", max_sec=maxsec, step=4)
                st = await g.state(); res = await g.js('window.__hookResult()')
                games.append({'lvl': lvl, 'seed': seed, 'bot': bot, 'size': f'{W}x{H}', 'state': st['state'], 'round': st['round'], 't': st['t'], 'ok': ok, 'res': res, 'msgs': list(g.msgs)})
                n5 = (res or {}).get('new5') or {}
                print(f"L{lvl} seed{seed} {bot}: {st['state']} r{st['round']} t{st['t']} ok={ok} {time.time() - t0:.0f}s | overlaps {len(n5.get('overlaps', []))} edges {len(n5.get('edges', []))} seps {len(n5.get('seps', []))} inside {len(n5.get('inside', []))} jit {len(n5.get('jitters', []))} deaths {len(n5.get('deaths', []))} rev {len(n5.get('revives', []))} onHead {len(n5.get('onHead', []))} pops {n5.get('pops', {}).get('n')} msgs {len(g.msgs)}", flush=True)
                g.msgs.clear()
                await g.js("window.__qp.goHome()"); await g.pump(10)
                (OUT / f'multi_{tag}.json').write_text(json.dumps(games, ensure_ascii=False))
    print(f'saved multi_{tag}.json; {len(games)} games, {time.time() - t00:.0f}s')
asyncio.run(main())
