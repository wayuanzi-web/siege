"""review4：不用假時鐘，真的照牆上時鐘跑一小段（自動玩家），看：每格大概多久、有沒有因為太慢自動降畫質、主控台有沒有錯誤、提示有沒有照時間出現。
   （這台機器沒有顯示卡，數字只當參考；重點是真實時間底下流程一樣走得完）"""
import asyncio, sys, json, pathlib, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT

async def main():
    for (W, H, scale) in [(844, 390, 1), (390, 844, 2)]:
        async with Game(W, H, scale=scale, clock=False) as g:
            await g.pg.wait_for_timeout(1200)
            await g.tap_el('#btnGo') if False else None
            r = await g.center('#btnGo'); await g.pg.touchscreen.tap(r[0], r[1]); await g.pg.wait_for_timeout(400)
            await g.pg.evaluate("(() => { const q = window.__qp; q.aiInit(q.S.team[0], q.BOTS.casual, {aiErr: 1}); window.__says = []; const el = document.getElementById('say'); new MutationObserver(() => { if (el.textContent) window.__says.push([+q.S.time.toFixed(1), el.textContent.slice(0, 16)]); }).observe(el, {childList: true, characterData: true, subtree: true}); })()")
            t0 = time.time(); rows = []
            while time.time() - t0 < 75:
                await g.pg.wait_for_timeout(5000)
                st = await g.pg.evaluate("(() => { const q = window.__qp, S = q.S; return {t: +S.time.toFixed(1), mode: q.G.mode, state: S.state, round: S.round, ft: +q.G.ft.toFixed(1), low: q.FX.low, dpr: q.G.dprCap, rot: q.G.rot}; })()")
                rows.append(st)
                if st['mode'] == 'result': break
            wall = time.time() - t0
            says = await g.pg.evaluate("window.__says")
            await g.shot(f'realtime_{W}x{H}')
            print(f'{W}x{H} scale{scale}: wall {wall:.0f}s game {rows[-1]["t"]}s -> game speed {rows[-1]["t"] / wall:.2f}x; frame-time EMA samples {[r["ft"] for r in rows]}; low-FX {rows[-1]["low"]} dprCap {rows[-1]["dpr"]}; end mode {rows[-1]["mode"]} state {rows[-1]["state"]} round {rows[-1]["round"]}; toasts {says[:8]}; console {g.msgs[:5]}')
asyncio.run(main())
