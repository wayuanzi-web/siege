"""幾個畫面細節的截圖（844x390，HUD 開著）：倍增符被瞄準時的高亮、護城罩、冰凍的磚、跳出來的字會不會被上方資訊列蓋住、
   氣球飛過我方城頂時、落石預告、上一輪的彈道。
   python3 test/review-ui/13_render_checks.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390)
        await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.SV.open = 6; q.G.freeze = true; })()")
        go = "(l) => { const q = window.__qp, S = q.S; q.startLevel(l); let n = 0; while (n++ < 300 && !(S.phase === 'aim' && S.turn === 0)) q.advance(1 / 30); }"
        await pg.add_style_tag(content='#banner,#say{display:none!important}')

        # 1. 虛線穿過倍增符：符要亮起來
        await pg.evaluate(go, 0)
        await pg.evaluate("(() => { const q = window.__qp; q.simAim(0, 35.3, 19.6); q.advance(0.3); })()")
        r = await pg.evaluate("(() => { const q = window.__qp; return {mask: q.RD.aimMask, gates: q.S.gates.map(g => [g.bit, g.x, g.y, g.mult])}; })()")
        print('1. aim through gate:', r); await pg.screenshot(path=shot_path('render_gate_aimed'))
        await pg.evaluate("(() => { const q = window.__qp; q.simAim(0, 20, 45); q.advance(0.3); })()"); await pg.screenshot(path=shot_path('render_gate_not_aimed'))
        print('   aim away -> mask', await pg.evaluate("window.__qp.RD.aimMask"))

        # 2. 護城罩 + 連珠上膛
        await pg.evaluate("(() => { const q = window.__qp, T = q.S.team[0]; T.shield.c = 100; T.ult.c = 100; q.simSkill(0, 'shield'); q.simSkill(0, 'ult'); q.advance(0.8); })()")
        await pg.screenshot(path=shot_path('render_shield_ult'))

        # 3. 上方資訊列底下的東西：直接丟事件，看字跳在哪
        await pg.evaluate(go, 1)
        await pg.evaluate("""(() => { const q = window.__qp, S = q.S; S.on('gbreak', 68, 43.5, 1, 1); S.on('bonus', 56, 47, 0, 'rage'); S.on('rockstop', 22, 47.6, 0); S.on('gate', 60, 47, 5, 0, 0); q.advance(0.5); })()""")
        await pg.screenshot(path=shot_path('render_pops_under_hud_844'))
        print('3. pops:', await pg.evaluate("(() => { const q = window.__qp; return q.FX.pops.map(p => [p.txt, p.x, +p.y.toFixed(1)]).concat([['screen top (world y)', +q.V.top.toFixed(1)]]); })()"))
        await pg.evaluate(go, 5)
        await pg.evaluate("""(() => { const q = window.__qp, S = q.S, st = S.st[1]; S.on('bossback', st.cx, st.y1 + 6); S.on('rockstop', S.st[0].cx, 51.1, 0); q.advance(0.4); })()""")
        await pg.screenshot(path=shot_path('render_pops_under_hud_L6'))
        print('   L6 pops:', await pg.evaluate("(() => { const q = window.__qp; return q.FX.pops.map(p => [p.txt, p.x, +p.y.toFixed(1)]).concat([['screen top (world y)', +q.V.top.toFixed(1)]]); })()"))

        # 4. 第三關：被冰彈炸到的磚（變脆、泛白）、被凍住的兵
        await pg.evaluate(go, 2)
        await pg.evaluate("""(() => { const q = window.__qp, S = q.S; q.physExplode(22, 30, q.WPN.ice, 1, 1, 0, null, -1, -0.3); q.physExplode(24, 20, q.WPN.fire, 1, 1, 0, null, -1, -0.3); q.advance(0.6); })()""")
        await pg.screenshot(path=shot_path('render_frost_soot_L3'))
        print('4. frozen/brittle:', await pg.evaluate("(() => { const q = window.__qp, S = q.S; return {frozen: S.team[0].units.map(u => u.frozen), brit: S.blocks.filter(b => b.brit > 0).length, soot: S.blocks.filter(b => b.soot > 0.05).length, burning: S.nburn, crewClass: [...document.querySelectorAll('#crewA .cu')].map(e => e.className)}; })()"))

        # 5. 第五關：氣球飛到我方城頂
        await pg.evaluate(go, 4)
        await pg.evaluate("""(() => { const q = window.__qp, S = q.S; q.aiInit(S.team[0], q.BOTS.newbie, {aiErr: 3}); let n = 0;
          while (n++ < 3000 && S.state === 'play') { q.advance(1 / 30); const o = S.objs.find(o => o.t === 'balloon' && o.st === 'run'); if (o && o.x < S.st[0].x1 - 4) break; } })()""")
        await pg.screenshot(path=shot_path('render_balloon_run_L5'))
        print('5. balloon:', await pg.evaluate("(() => { const q = window.__qp, o = q.S.objs.find(o => o.t === 'balloon'); return o ? {st: o.st, x: +o.x.toFixed(1), y: +o.y.toFixed(1), top: +q.V.top.toFixed(1)} : null; })()"))

        # 6. 第四關：落石預告 + 上一輪的彈道
        await pg.evaluate(go, 3)
        await pg.evaluate("""(() => { const q = window.__qp, S = q.S; document.getElementById('btnFire').click(); let n = 0; while (n++ < 3000 && !(S.round >= 2 && S.phase === 'aim' && S.turn === 0)) q.advance(1 / 30); q.simAim(0, 30, 50); q.advance(0.2); })()""")
        await pg.screenshot(path=shot_path('render_rockmark_trail_L4'))
        print('6. marks:', await pg.evaluate("(() => { const q = window.__qp; return {marks: q.S.marks.map(m => [+m.x.toFixed(1), m.sy]), trail: q.RD.trail && q.RD.trail.n}; })()"))
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
