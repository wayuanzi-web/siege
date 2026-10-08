"""review5 第 7 項：瞄準的時候火還會不會繼續把磚燒掉。打到「輪到我方瞄準、場上有磚在燒」的時刻，拿掉自動玩家等 15 秒，
   比較每一塊著火的磚的耐久、著火的塊數、有沒有兵倒下；再放回自動玩家，看開火之後火有沒有接著燒。
   python3 test/review5-look/burn5.py "lvl,seed,bot" ..."""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from start4 import START, start_args
from q4 import Game, parse_opts, label, sheet
OUT = HERE.parent.parent / 'shots' / 'review5'
SNAP = "(() => { const S = window.__qp.S; const bs = S.blocks.filter((b) => !b.dead && b.burn > 0); return { t: +S.time.toFixed(2), phase: S.phase + S.turn, round: S.round, nburn: S.nburn, n: bs.length, hp: +bs.reduce((a, b) => a + b.hp, 0).toFixed(1), burnLeft: +bs.reduce((a, b) => a + b.burn, 0).toFixed(2), alive: S.team[0].alive + '/' + S.team[1].alive, ids: bs.map((b) => b.id) }; })()"
async def main():
    args, opt = parse_opts(sys.argv[1:])
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    tiles = []
    async with Game(844, 390, scale=1.5, save=save) as g:
        await g.sec(0.5); await g.pg.add_style_tag(content='#say,#hint,#mile,#banner{display:none!important}')
        for a in args:
            lvl, seed, bot = a.split(','); lvl = int(lvl); seed = int(seed)
            await g.js(START, start_args(lvl, seed, bot))
            # 等第二回合輪到我方瞄準；場上沒有火就自己點三塊敵城的木頭（跟火油兵點的一樣：burn 秒數、burnBy、S.nburn）
            ok = await g.until("G.mode === 'result' || (S.state === 'play' && S.phase === 'aim' && S.turn === 0 && S.round >= 2)", max_sec=300, step=1)
            lit = await g.js("() => { const S = window.__qp.S; let n = S.blocks.filter((b) => !b.dead && b.burn > 0).length, add = 0; if (n < 2) for (const b of S.st[1].blocks) { if (add >= 3) break; if (!b.dead && !b.frag && b.mat === 1 && !(b.burn > 0)) { b.burn = 7; b.burnBy = 0; S.nburn++; add++; } } return [n, add]; }")
            print(a, 'burning already / lit by the test:', lit)
            st = await g.state()
            if st['mode'] == 'result' or not ok: print(a, 'no burning blocks at my aim in this game'); await g.js("window.__qp.goHome()"); await g.pump(10); continue
            await g.js("() => { const S = window.__qp.S; window.__keepAi = S.team[0].ai; S.team[0].ai = null; }")
            s0 = await g.js(SNAP); im0 = await g.shot(None); await g.sec(15); s1 = await g.js(SNAP); im1 = await g.shot(None)
            await g.js("() => { window.__qp.S.team[0].ai = window.__keepAi; }")
            await g.until("S.phase === 'resolve' || G.mode === 'result'", max_sec=30, step=1); await g.sec(2.0); s2 = await g.js(SNAP)
            same = [i for i in s0['ids'] if i in s1['ids']]
            print(json.dumps({'case': a, 'aim_start': {k: s0[k] for k in ('t', 'phase', 'round', 'n', 'hp', 'burnLeft', 'alive')}, 'after_15s_idle': {k: s1[k] for k in ('t', 'phase', 'n', 'hp', 'burnLeft', 'alive')}, 'burned_during_aim_hp': round(s0['hp'] - s1['hp'], 1), 'blocks_lost_during_aim': s0['n'] - len(same), '2s_into_next_resolve': {k: s2[k] for k in ('t', 'phase', 'n', 'hp', 'burnLeft', 'alive')}}), flush=True)
            label(im0, f"L{lvl} seed{seed} t{s0['t']} my aim starts: {s0['n']} blocks burning, hp {s0['hp']}"); label(im1, f"15 s later, still aiming: {s1['n']} burning, hp {s1['hp']}")
            tiles += [im0, im1]
            await g.js("window.__qp.goHome()"); await g.pump(10)
        print('console:', g.msgs[:3])
    if tiles: sheet(tiles, 2, max_w=2200).save(OUT / 'burn5.png'); print('saved', OUT / 'burn5.png')
asyncio.run(main())
