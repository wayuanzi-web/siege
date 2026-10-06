"""長時間遊玩：進關卡 → 打一小段（有爆炸、碎塊）→ 暫停 → 回主畫面，重複 30 次（六關輪流），
   每 5 次記一次：JS heap（強制 GC 之後）、DOM 節點數、畫布建立總數與還活著的數量、planck 剛體數、FX 陣列、還沒到期的 timer、事件監聽器數量。
   python3 test/review-ui/11_soak.py [次數=30]"""
import asyncio, json, sys
from playwright.async_api import async_playwright
from common import *

N = int(sys.argv[1]) if len(sys.argv) > 1 else 30
INIT = """(() => {
  // 數畫布：建立總數，以及用 FinalizationRegistry 追蹤還沒被回收的
  const ce = document.createElement.bind(document); window.__cv = {made: 0, live: 0, px: 0};
  const reg = new FinalizationRegistry((px) => { window.__cv.live--; window.__cv.px -= px; });
  document.createElement = function (tag) { const el = ce.apply(document, arguments); if (String(tag).toLowerCase() === 'canvas') { window.__cv.made++; window.__cv.live++; reg.register(el, 0); } return el; };
  // 數 timer
  const st = window.setTimeout.bind(window), ct = window.clearTimeout.bind(window); window.__tm = {set: 0, pending: new Set()};
  window.setTimeout = function (fn, ms) { const a = [].slice.call(arguments, 2); window.__tm.set++; const id = st(function () { window.__tm.pending.delete(id); if (typeof fn === 'function') fn.apply(null, a); }, ms); window.__tm.pending.add(id); return id; };
  window.clearTimeout = function (id) { window.__tm.pending.delete(id); return ct(id); };
  // 數 addEventListener
  const ael = EventTarget.prototype.addEventListener; window.__ls = 0; EventTarget.prototype.addEventListener = function () { window.__ls++; return ael.apply(this, arguments); };
})()"""
STAT = """(() => { const q = window.__qp, S = q.S, FX = q.FX;
  return {dom: document.getElementsByTagName('*').length, cvMade: window.__cv.made, cvLive: window.__cv.live, bodies: q.PH.world.getBodyCount(), blocks: S.blocks.length, units: S.units.length,
    fx: [FX.n, FX.rings.length, FX.bolts.length, FX.pops.length, FX.flung.length, FX.tracers.length], gpop: Object.keys(FX.gpop).length, glow: Object.keys(q.RD.glow).length,
    timers: window.__tm.pending.size, timersSet: window.__tm.set, listeners: window.__ls, said: Object.keys(q.G.said).length, auLast: Object.keys(q.AU.last).length, crew: document.querySelectorAll('.cu').length, ticks: document.querySelectorAll('.tick').length}; })()"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, init=INIT, launch_args=['--js-flags=--expose-gc', '--enable-precise-memory-info'])
        cdp = await ctx.new_cdp_session(pg)

        async def heap():
            for _ in range(3): await cdp.send('HeapProfiler.collectGarbage')
            await pg.wait_for_timeout(150)
            r = await cdp.send('Runtime.getHeapUsage'); return round(r['usedSize'] / 1e6, 2)

        await pg.mouse.click(400, 30)
        await pg.evaluate("window.__qp.SV.open = 6; window.__qp.SV.seen = true")
        print('start   ', 'heapMB', await heap(), json.dumps(await pg.evaluate(STAT)), flush=True)
        for i in range(1, N + 1):
            lv = (i - 1) % 6
            await pg.evaluate("(l) => { const q = window.__qp; q.UI.sel = l; document.getElementById('btnGo').disabled = false; document.getElementById('btnGo').click(); q.aiInit(q.S.team[0], q.BOTS.expert, {aiErr: 1}); }", lv)
            # 快轉兩回合左右（凍結即時迴圈、手動推進），再回到即時迴圈跑一下
            await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.G.freeze = true; let n = 0; while (n++ < 240 && S.round < 3 && S.state === 'play') q.advance(0.25); q.G.freeze = false; })()")
            await pg.wait_for_timeout(250)
            if (await pg.evaluate("window.__qp.G.mode")) == 'play' and (await pg.evaluate("window.__qp.S.state")) == 'play':
                await pg.evaluate("document.getElementById('btnPause').click()"); await pg.wait_for_timeout(60)
                await pg.evaluate("document.getElementById('btnQuit').click()")
            else:
                await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000)
                await pg.evaluate("document.getElementById('btnHome').click()")
            await pg.wait_for_timeout(150)
            if i % 5 == 0 or i == 1:
                print(f'cycle {i:2d}', 'heapMB', await heap(), json.dumps(await pg.evaluate(STAT)), flush=True)
        # 最後停在主畫面 20 秒（示範戰局一直跑）
        await pg.wait_for_timeout(20000)
        print('idle 20s', 'heapMB', await heap(), json.dumps(await pg.evaluate(STAT)), flush=True)
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
