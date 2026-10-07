"""查：真實時間（不用假時鐘）下，分出勝負那一刻的橫幅有沒有出現。"""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT, upright

async def main():
    async with Game(844, 390, scale=1, clock=False) as g:
        await g.pg.wait_for_timeout(800)
        await g.pg.evaluate("document.getElementById('btnGo').click()")
        for i in range(6):
            await g.pg.wait_for_timeout(250)
            print('start', i, await g.pg.evaluate("(() => { const b = document.getElementById('banner'); return [b.className, +(+getComputedStyle(b).opacity).toFixed(2), b.textContent, +window.__qp.G.ft.toFixed(1)]; })()"))
        await g.pg.wait_for_timeout(3000)
        await g.pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
        for i in range(10):
            await g.pg.wait_for_timeout(250)
            print('end', i, await g.pg.evaluate("(() => { const b = document.getElementById('banner'); const q = window.__qp; return [b.className, +(+getComputedStyle(b).opacity).toFixed(2), b.textContent, q.S.state, q.G.mode, +q.G.endT.toFixed(2), +q.G.ft.toFixed(1), q.FX.low]; })()"))
            if i == 2: await g.shot('dbg_rt_end_banner')
        print('anims', await g.pg.evaluate("document.getAnimations().map(a => [a.animationName || 'transition', a.playState, Math.round(a.currentTime), a.effect.target.id || a.effect.target.className]).slice(0, 20)"))
asyncio.run(main())
