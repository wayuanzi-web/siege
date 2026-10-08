"""第二篇的結算畫面：每一關打贏（敵軍全倒）、打輸（我方全倒）各一次，截圖；第六關贏了按「下一關」→ 第七關，再回主畫面看分頁；
   魔王關打贏看標題「魔王伏誅」、沒有下一關。也收集每一關輸了會出現的每一句訣竅（多輸幾次）。
   python3 test/review8/result.py [尺寸=844x390]"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from r8 import Game, OUT, label, sheet, SAVE_ALL, SAVE_OLD6

SIZE = sys.argv[1] if len(sys.argv) > 1 else '844x390'
W, H = [int(v) for v in SIZE.split('x')]

RES = r"""(() => { const $ = (id) => document.getElementById(id), vis = (e) => !!e && !e.hidden && e.offsetParent !== null;
  const st = $('stage'); const loc = (e) => { let x = 0, y = 0; for (let n = e; n && n !== st; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y, e.offsetWidth, e.offsetHeight]; };
  const pl = document.querySelector('#result .plaque'), pr = loc(pl);
  return { shown: !$('result').hidden, title: $('resTitle').textContent, cls: $('resTitle').className, sub: $('resSub').textContent, tip: vis($('resTip')) ? $('resTip').textContent : '', stars: [...$('resStars').children].map((s) => s.className).join(','),
    btns: [...document.querySelectorAll('#resBtns button')].filter((b) => !b.hidden).map((b) => b.textContent), plaque: pr, stageH: st.offsetHeight, overflow: pr[1] < 0 || pr[1] + pr[3] > st.offsetHeight, mode: window.__qp.G.mode }; })()"""


async def finish(g, who):
    # who = 1：敵軍全倒（贏）；0：我方全倒（輸）
    await g.until("S.state === 'play' && S.phase === 'aim'", 30)
    await g.js("(w) => { const q = window.__qp, S = q.S; for (const u of S.team[w].units) if (u.alive) q.killUnit(u, 1 - w, 0); }", who)
    await g.until("G.mode === 'result'", 30)
    await g.sec(1.6)


async def main():
    tiles = []
    tips = {}
    async with Game(W, H, scale=2, touch=True, save=SAVE_ALL) as g:
        await g.sec(0.5)
        for lvl in range(6, 13):
            for who in (1, 0):
                await g.js("(l) => { const q = window.__qp; q.goHome(); q.UI.sel = l - 1; q.homeRender(); }", lvl)
                await g.pump(3)
                await g.tap_el('#btnGo'); await g.pump(3)
                await finish(g, who)
                r = await g.js(RES)
                im = await g.shot(f'result_L{lvl}_{"win" if who else "lose"}_{W}x{H}')
                tiles.append(label(im.copy(), f'L{lvl} {"win" if who else "lose"}', r['title'] + ' ' + r['sub']))
                print(f'L{lvl} {"win " if who else "lose"}', json.dumps(r, ensure_ascii=False))
        # 每一關輸的訣竅：多輸幾次，收集出現過的句子
        for lvl in range(6, 13):
            seen = set()
            for k in range(8):
                await g.js("(l) => { const q = window.__qp; q.goHome(); q.UI.sel = l - 1; q.homeRender(); q.SV.diff = 0; }", lvl)
                await g.pump(3)
                await g.tap_el('#btnGo'); await g.pump(3)
                await finish(g, 0)
                seen.add(await g.js("document.getElementById('resTip').textContent"))
            tips[lvl] = sorted(seen)
        print('LOSE TIPS seen:')
        for lvl, ts in tips.items():
            for t in ts: print(f'  L{lvl}: {t}')
        print('console:', g.msgs[:6])
    sheet(tiles, 2, max_w=2400).save(OUT / f'result_sheet_{W}x{H}.png')

    # 第六關贏 → 下一關 → 第七關；暫停 → 主畫面：分頁跟著第二篇
    async with Game(W, H, scale=2, touch=True, save=SAVE_OLD6) as g:
        await g.sec(0.5)
        info = lambda: g.js("(() => { const q = window.__qp; return { sel: q.UI.sel, chap: q.UI.chap, open: q.SV.open, tabs: [...document.querySelectorAll('#chaps .chap')].map((e) => e.textContent + ':' + e.getAttribute('aria-selected') + (e.classList.contains('locked') ? ':locked' : '')).join(' | '), stars: q.SV.stars.join(''), mode: q.G.mode, idx: q.S.idx, hud: document.getElementById('hudName').textContent }; })()")
        print('old save at boot:', await info())
        await g.tap_el('#btnGo'); await g.pump(3)
        print('started:', await info())
        await finish(g, 1)
        print('L6 result:', json.dumps(await g.js(RES), ensure_ascii=False))
        await g.shot(f'flow_L6_result_{W}x{H}')
        await g.sec(0.5)
        await g.tap_el('#btnNext'); await g.pump(10)
        await g.sec(1.0)
        print('after 下一關:', await info())
        await g.shot(f'flow_L7_started_{W}x{H}')
        await g.tap_el('#btnPause'); await g.pump(5)
        await g.tap_el('#btnQuit'); await g.pump(10)
        await g.sec(0.6)
        print('home after quit:', await info())
        await g.shot(f'flow_home_after_L7_{W}x{H}')
        # 再從結算畫面的「回主畫面」：打贏第七關
        await g.tap_el('#btnGo'); await g.pump(3)
        await finish(g, 1)
        await g.sec(0.5)
        await g.tap_el('#btnHome'); await g.pump(10); await g.sec(0.6)
        print('home after L7 win → 回主畫面:', await info())
        await g.shot(f'flow_home_after_L7win_{W}x{H}')
        print('console:', g.msgs[:6])

asyncio.run(main())
