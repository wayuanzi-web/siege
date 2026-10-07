"""每一關的 hints 是照「第幾回合」固定講的，不看戰局：講到的東西已經不在了也照講。
用假時鐘（佇列計時照常），攔 #say 的每一次寫入。
  L5 第 3 回合「防空弩每一輪會射下你三發砲彈，先解決它」—— 防空弩兵第 1 回合就被打倒了
  L4 第 2 回合「樓上是火藥庫：炸到一桶，三桶連環爆」—— 火藥桶第 1 回合就全炸光了
  L3 第 4 回合「最後一個兵躲在冰板底下的大廳…」—— 大廳那個兵已經倒了／還有別的兵活著
python3 test/review2-ui/33_stale_hints.py"""
import asyncio, re
from playwright.async_api import async_playwright
from common import *

HOOK = """(() => { const el = document.getElementById('say'), d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent'); window.__say = [];
  Object.defineProperty(el, 'textContent', {configurable: true, get() { return d.get.call(this); }, set(v) { window.__say.push({r: window.__qp.S.round, txt: String(v)}); d.set.call(this, v); }}); })()"""

async def to_round(pg, rnd):
    for _ in range(1500):
        await pg.clock.run_for(100)
        s = await pg.evaluate("(() => { const S = window.__qp.S; return [S.round, S.phase, S.turn, S.state]; })()")
        if s[3] != 'play': return s
        if s[1] == 'aim' and s[2] == 0:
            if s[0] >= rnd: return s
            await pg.clock.run_for(2500)                # 看一下提示
            await pg.evaluate("(() => { const q = window.__qp; q.simAim(0, 30, 30); q.simFire(0); })()")      # 隨便打一發（打不到東西）
    return s

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1)
        await ctx.route(re.compile(r'^https?://'), lambda r: r.abort())
        pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.clock.install(time=0); await pg.goto(URL); await pg.clock.run_for(400)
        await pg.evaluate(HOOK)
        cases = [
            (4, 3, "(() => { const q = window.__qp, S = q.S; for (const u of S.team[1].units) if (u.def.flak) q.killUnit(u, 0, 0); for (const u of S.team[0].units) { u.hpMax *= 20; u.hp = u.hpMax; } })()", "({flakAlive: window.__qp.S.team[1].units.filter(u => u.def.flak && u.alive).length})", '防空弩'),
            (3, 2, "(() => { const q = window.__qp, S = q.S; for (const b of S.blocks) if (!b.dead && b.mat === S.blocks.find(x => /keg/i.test(String(x.kind)) || x.kg)?.mat) {} ; const kegs = S.blocks.filter(b => !b.dead && q.PH && b.side === 1 && b.w < 3.5 && b.h < 3.5 && b.prop); for (const u of S.team[0].units) { u.hpMax *= 20; u.hp = u.hpMax; } window.__kegs0 = S.blocks.filter(b => !b.dead && b.hm && b.mat === 8).length; })()", "({})", '火藥庫'),
            (2, 4, "(() => { const q = window.__qp, S = q.S; const us = S.team[1].units.slice().sort((a, b) => a.y - b.y); q.killUnit(us[0], 0, 0); for (const u of S.team[0].units) { u.hpMax *= 20; u.hp = u.hpMax; } })()", "({enemyAlive: window.__qp.S.team[1].units.filter(u => u.alive).map(u => u.type + '@y' + Math.round(u.y)), lowestWasKilled: true})", '最後一個兵'),
        ]
        for (lv, rnd, setup, probe, key) in cases:
            await pg.evaluate("([lv]) => { const q = window.__qp; q.SV.seen = true; q.SV.open = 6; window.__say.length = 0; q.startLevel(lv); }", [lv])
            await to_round(pg, 1); await pg.evaluate(setup)
            s = await to_round(pg, rnd); await pg.clock.run_for(8000)
            says = await pg.evaluate("window.__say"); st = await pg.evaluate(probe)
            hit = [x for x in says if key in x['txt']]
            print(f'L{lv + 1}: reached round {s[0]} ({s[3]}); state {pj(st)}')
            for x in hit: print(f'    round {x["r"]} toast: {x["txt"]}')
            if not hit: print('    (hint not shown)', [x['txt'][:12] for x in says])
        print('errors:', msgs)
        await b.close()
asyncio.run(main())
