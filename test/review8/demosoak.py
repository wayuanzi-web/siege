"""主畫面背景的示範對戰：第二篇每一關各放 120 秒（假時鐘），看有沒有錯誤、會不會打完自動重來、有沒有卡住不動。
   python3 test/review8/demosoak.py"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from r8 import Game, SAVE_ALL
HOOK = r"""(() => { window.__ds = { restarts: 0, ends: 0, lastT: 0, maxRound: 0, states: {} }; window.__hook = () => { const q = window.__qp, S = q.S, d = window.__ds; if (S.time < d.lastT - 0.5) d.restarts++; d.lastT = S.time; d.maxRound = Math.max(d.maxRound, S.round); d.states[S.state] = (d.states[S.state] || 0) + 1; }; })()"""
async def main():
    async with Game(844, 390, scale=1, touch=True, save=SAVE_ALL) as g:
        await g.sec(0.5)
        for lvl in range(6, 13):
            await g.js("(l) => { const q = window.__qp; q.UI.sel = l - 1; q.homeRender(); q.demoStart(l - 1); }", lvl)
            await g.js(HOOK)
            await g.sec(120)
            d = await g.js("window.__ds")
            print(f'L{lvl}: demo restarts {d["restarts"]}  max round {d["maxRound"]}  frames by state {d["states"]}  console {g.msgs[-3:] if g.msgs else []}')
asyncio.run(main())
