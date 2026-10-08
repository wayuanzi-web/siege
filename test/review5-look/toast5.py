"""review5 第 4 項：提示講出來的那一刻還用不用得上；重要的提示有沒有因為新的「用得上才講」而從來沒講。
   我方用「人的步調」的自動玩家（每一輪想 4 秒才放手；自動玩家原本半秒就開火，提示排隊的情形跟真人差很多），真的每一格迴圈＋假時鐘（setTimeout 也跟著假時鐘）。
   每一句提示第一次出現的那一格，記下戰局狀態，套規則檢查；另外記下整場發生過什麼（氣球、光球、冰凍、×10／×20 的符…）對照有沒有講。
   python3 test/review5-look/toast5.py --levels=1,2,3,4,5,6 --seeds=21,22 --bot=casual [--think=4] [--fresh=1]"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from start4 import START, start_args
from q4 import Game, parse_opts
OUT = HERE.parent.parent / 'shots' / 'review5'

HOOK = r"""
(() => {
  const q = window.__qp, S = q.S, G = q.G, $ = (id) => document.getElementById(id), log = []; let last = '', ever = {};
  const cell = (cx, cy) => { const st = S.st[1], b = st.cellB[cy * st.cols + (st.cols - 1 - cx)]; return !!(b && !b.dead && b.inPlace); };
  const home = (slot) => S.team[1].units.some((u) => u.alive && u.slot === slot && Math.abs(u.x - u.hx) < 2.2 && Math.abs(u.y - u.hy) < 1.6);
  const world = () => { const T = S.team[0], E = S.team[1]; let wall = 0; for (const s of S.structs) if (s.side === 2 && !s.loose) for (const b of s.blocks) if (!b.dead && b.inPlace) wall++;
    let slab = -1, pil = -1; if (S.idx === 2) { slab = 0; for (let cx = 0; cx < 9; cx++) if (cell(cx, 6)) slab++; pil = (cell(3, 4) ? 1 : 0) + (cell(5, 4) ? 1 : 0); }
    return { lvl: S.idx + 1, t: +S.time.toFixed(1), round: S.round, phase: S.phase, turn: S.turn, state: S.state,
      gates: S.gates.filter((g) => !g.dead).map((g) => g.owner + 'x' + g.mult), objs: S.objs.filter((o) => ['lantern', 'balloon', 'orb'].includes(o.t)).map((o) => o.t + ':' + (o.side === undefined ? '' : o.side) + ':' + (o.st || '') + ':' + (o.hp > 0 ? 1 : 0)),
      frozen: T.units.filter((u) => u.alive && (u.frozen > 0 || u.stun > 0)).length, canFire: T.units.filter((u) => u.alive && u.w && u.frozen <= 0 && u.stun <= 0).length, marks: S.marks.length, ult: Math.round(T.ult.c / T.ult.need * 100), armed: T.ult.armed, eArmed: E.ult.armed, sh: Math.round(T.shield.c / T.shield.need * 100), shOn: T.shield.on,
      boss: S.boss ? S.boss.phase : 0, home: [home(1), home(2), home(3), home(4)].map((v) => v ? 1 : 0).join(''), alive1: E.units.filter((u) => u.alive).map((u) => u.type).join(','), kegs: S.st[1].blocks.filter((b) => !b.dead && b.mat === 7).length, wall, slab, pil, tut: G.tut, wind: S.wind }; };
  window.__hook = () => {
    if (G.mode !== 'play') { last = ''; return; }
    for (const o of S.objs) { if (o.t === 'balloon' && o.side === 1) ever.balloon = 1; if (o.t === 'orb') ever.orb = 1; if (o.t === 'lantern') ever.lantern = 1; }
    for (const g of S.gates) { if (!g.dead && g.owner === 0 && g.mult >= 10) ever['big' + g.mult] = 1; if (!g.dead && g.owner === 1) ever.foeGate = 1; if (!g.dead && g.owner === 3) ever.halve = 1; if (!g.dead && g.owner === 2) ever.gold = 1; }
    if (S.team[0].units.some((u) => u.alive && u.frozen > 0)) ever.frozen = 1; if (S.marks.length) ever.marks = 1; if (S.boss && S.boss.phase >= 2) ever.bossP2 = 1; if (S.boss && S.boss.phase >= 3) ever.bossP3 = 1; if (S.team[1].ult.armed) ever.eUlt = 1; if (S.wind) ever.wind = 1;
    if (S.state === 'play' && S.phase === 'aim' && S.turn === 0 && S.team[0].ult.c >= S.team[0].ult.need) ever.ultFull = 1;
    if (S.state === 'play' && S.phase === 'aim' && S.turn === 1 && S.round >= 2 && S.team[0].shield.c >= S.team[0].shield.need) ever.shFull = 1;
    const el = $('say'), t = el.classList.contains('show') ? el.textContent : '';
    if (t && t !== last) log.push(Object.assign({ txt: t, alert: el.classList.contains('alert') ? 1 : 0 }, world()));
    last = t;
  };
  window.__hookResult = () => { const r = { log: log.slice(), ever: Object.assign({}, ever) }; log.length = 0; ever = {}; return r; };
})();
"""

def has(objs, kind, sts=None, side=None):
    for o in objs:
        t, sd, st, hp = o.split(':')
        if t == kind and hp == '1' and (sts is None or st in sts) and (side is None or sd == str(side)): return True
    return False

RULES = [
    ('天燈升起來了', lambda w: has(w['objs'], 'lantern'), 'no lantern on the field'),
    ('×20 的倍增符出現了', lambda w: '0x20' in w['gates'], 'no ×20 gate on the field'),
    ('×10 的倍增符出現了', lambda w: '0x10' in w['gates'], 'no ×10 gate on the field'),
    ('連珠」集滿了', lambda w: w['ult'] >= 100 and not w['armed'], 'ult not full / already armed'),
    ('紅圈是這一回合結束時落石的位置', lambda w: w['marks'] > 0 and w['phase'] != 'hazard', 'no rock marker / rocks already falling'),
    ('毀滅光球！', lambda w: has(w['objs'], 'orb', ('out', 'hover')), 'no orb waiting'),
    ('轟炸氣球升空了', lambda w: has(w['objs'], 'balloon', ('out', 'hover'), 1), 'no balloon waiting'),
    ('兵被凍住了', lambda w: w['frozen'] > 0, 'nobody frozen'),
    ('輪到敵軍了：按「護罩」', lambda w: w['turn'] == 1 and w['phase'] in ('aim', 'volley') and w['sh'] >= 100 and not w['shOn'], 'not the enemy turn / shield not ready'),
    ('打斷望樓', lambda w: w['home'][0] == '1', 'watchtower soldier no longer up there'),
    ('木板平台上擺著兩顆大石球', lambda w: any(t in w['alive1'] for t in ('rocket', 'bomb')), 'nobody left under the boulders'),
    ('冰很滑：把冰塔腳下的冰板打穿', lambda w: w['home'][0] == '1' or w['home'][1] == '1', 'no soldier left on a tower'),
    ('大廳裡兩根冰柱', lambda w: w['home'][2] == '1' and w['pil'] > 0 and w['slab'] >= 5, 'mage gone / pillars gone / slab already gone'),
    ('中間的冰牆擋住平射', lambda w: w['wall'] >= 6, 'wall already down'),
    ('樓上是火藥庫', lambda w: w['kegs'] > 0, 'no kegs left'),
    ('防空弩每一輪射下', lambda w: 'flak' in w['alive1'], 'flak already dead'),
    ('敵軍的赤符', lambda w: any(g.startswith('1x') for g in w['gates']), 'no enemy gate'),
    ('黃金符', lambda w: any(g.startswith('2x') for g in w['gates']), 'no golden gate'),
    ('紫色的折損符', lambda w: any(g.startswith('3x') for g in w['gates']), 'no halving gate'),
    ('魔王張開結界了', lambda w: w['boss'] >= 2, 'boss not in phase 2'),
    ('下一回合會出現 ×20', lambda w: w['boss'] >= 3 and '0x20' not in w['gates'], 'x20 already here / not phase 3'),
    ('這次讓虛線穿過藍色的倍增符', lambda w: w['turn'] == 0 and w['phase'] == 'aim', 'not my aim phase'),
    ('兵都動不了', lambda w: w['canFire'] == 0, 'somebody can fire'),
    ('敵軍連珠砲上膛了', lambda w: w['eArmed'] or (w['turn'] == 1 and w['phase'] in ('volley', 'resolve')), 'enemy ult not armed'),
    ('起風了', lambda w: w['wind'] != 0 or w['lvl'] == 2, 'no wind'),
]
EXPECT = [('balloon', '轟炸氣球升空了'), ('orb', '毀滅光球！'), ('frozen', '兵被凍住了'), ('big10', '×10 的倍增符出現了'), ('big20', '×20 的倍增符出現了'), ('lantern', '天燈升起來了'), ('marks', '紅圈是這一回合'), ('bossP2', '魔王張開結界了'), ('bossP3', '魔王暴怒了'), ('foeGate', '敵軍的赤符'), ('halve', '紫色的折損符'), ('eUlt', '敵軍連珠砲上膛了'), ('ultFull', '連珠」集滿了'), ('shFull', '輪到敵軍了：按「護罩」')]

async def main():
    args, opt = parse_opts(sys.argv[1:])
    levels = [int(x) for x in opt.get('levels', '1,2,3,4,5,6').split(',')]; seeds = [int(x) for x in opt.get('seeds', '21,22').split(',')]; bot = opt.get('bot', 'casual'); think = float(opt.get('think', 4)); fresh = 'fresh' in opt
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': False, 'seenSh': False, 'diff': 1, 'flip': False}
    allg = []; nflag = 0; ntoast = 0; missing = []
    async with Game(844, 390, scale=1, save=save) as g:
        await g.sec(0.5)
        for lvl in levels:
            for seed in seeds:
                # 每一場都當成還沒看過技能教學
                await g.js("() => { const q = window.__qp; q.SV.seenUlt = false; q.SV.seenSh = false; }")
                await g.js(HOOK)
                await g.js(START, start_args(lvl, seed, bot))
                await g.js("([bot, think]) => { const q = window.__qp; q.aiInit(q.S.team[0], Object.assign({}, q.BOTS[bot], { think }), { aiErr: 1 }); }", [bot, think])
                await g.until("G.mode === 'result'", max_sec=700, step=2)
                st = await g.state(); r = await g.js('window.__hookResult()')
                print(f"L{lvl} seed{seed} {bot} think{think}: {st['state']} r{st['round']} t{st['t']}  toasts {len(r['log'])}  happened {sorted(r['ever'])}", flush=True)
                for m in r['log']:
                    ntoast += 1; flag = ''
                    for key, ok, why in RULES:
                        if key in m['txt'] and not ok(m): flag = '   <<< STALE: ' + why; nflag += 1
                    print(f"   t{m['t']:6.1f} r{m['round']} {m['phase']}/{m['turn']} {'!' if m['alert'] else ' '}〔{m['txt']}〕 gates{m['gates']} objs{m['objs']} home{m['home']} fz{m['frozen']} mk{m['marks']} ult{m['ult']} sh{m['sh']} boss{m['boss']}" + (f" slab{m['slab']} pil{m['pil']} wall{m['wall']}" if lvl == 3 else '') + flag, flush=True)
                said = ' '.join(m['txt'] for m in r['log'])
                for ev, key in EXPECT:
                    if r['ever'].get(ev) and key not in said: missing.append((lvl, seed, ev, key)); print(f"   --- happened but never said: {ev} →「{key}…」", flush=True)
                allg.append({'lvl': lvl, 'seed': seed, 'state': st['state'], 'round': st['round'], 'log': r['log'], 'ever': r['ever']})
                await g.js("window.__qp.goHome()"); await g.pump(10)
        print('console:', g.msgs[:5])
    (OUT / f"toast5_{opt.get('tag', 'a')}.json").write_text(json.dumps(allg, ensure_ascii=False))
    print(f'{len(allg)} games, {ntoast} toasts, flagged stale {nflag}; happened-but-never-said {len(missing)}: {missing}')
asyncio.run(main())
