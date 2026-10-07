"""開三種尺寸的主畫面（全新存檔），量一下假時鐘推一秒要多久。"""
import asyncio, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT

async def main():
    for (W, H) in [(844, 390), (390, 844), (667, 375)]:
        async with Game(W, H, scale=2) as g:
            t0 = time.time(); await g.sec(2.0); dt = time.time() - t0
            st = await g.state()
            await g.shot(f'smoke_home_{W}x{H}')
            info = await g.js("(() => { const q = window.__qp; return {rot: q.G.rot, sw: q.G.sw, sh: q.G.sh, VW: q.V.W, VH: q.V.H, s: +q.V.s.toFixed(2), u: getComputedStyle(document.getElementById('stage')).getPropertyValue('--u'), coarse: matchMedia('(pointer: coarse)').matches, ls: localStorage.getItem('qianpao-pocheng-1'), fonts: [...document.fonts].map(f => f.family + ':' + f.status).slice(0, 6)}; })()")
            print(W, H, '2s pump took %.1fs' % dt, st['mode'], st['phase'], 'round', st['round'], info, 'net', len(g.net), g.net[:2], 'msgs', g.msgs[:5])
asyncio.run(main())
