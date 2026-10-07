"""全螢幕閃光的頻率（真實時間）和 prefers-reduced-motion。
用假時鐘快轉（performance.now、rAF 一起走，所以 flash() 的限速跟真的玩一樣），第五、六關雙方都用自動玩家打（雷法師＋倍增符＝很多道雷）。
頁面裡每 4ms 取樣一次 FX.flash / FX.shake / FX.shx。
python3 test/review2-ui/20_motion_flash.py [normal|reduce|toggle|css]"""
import asyncio, re, sys, time
from playwright.async_api import async_playwright
from common import *

WHAT = sys.argv[1:] or ['normal', 'reduce', 'toggle', 'css']

SAMPLER = """(() => { const q = window.__qp, FX = q.FX; window.__fl = {on: [], peak: 0, shake: 0, shx: 0, last: -1e9, prev: 0, n: 0, slowMin: 1};
  setInterval(() => { const f = window.__fl, now = performance.now(); f.n++;
    if (FX.fl1 !== f.last) { f.last = FX.fl1; if (FX.fl1 > 0) f.on.push({t: FX.fl1, a: +FX.flash.toFixed(3), col: FX.flashCol}); }
    if (FX.flash > f.peak) f.peak = FX.flash; if (FX.shake > f.shake) f.shake = FX.shake; const s = Math.abs(FX.shx) + Math.abs(FX.shy); if (s > f.shx) f.shx = s; if (FX.slow < f.slowMin) f.slowMin = FX.slow; }, 8); })()"""
START = """(([lv]) => { const q = window.__qp; q.SV.seen = true; q.SV.open = 6; q.startLevel(lv); q.aiInit(q.S.team[0], q.BOTS.expert, {aiErr: 1});
  for (const u of q.S.units) { u.hpMax *= 6; u.hp = u.hpMax; }      /* 打久一點 */
  if (lv === 5) { const bu = q.S.team[1].units.find(u => u.type === 'boss'); bu.hp = bu.hpMax * 0.72; } })"""


async def open_clock(p, reduced):
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, reduced_motion='reduce' if reduced else 'no-preference')
    await ctx.route(re.compile(r'^https?://'), lambda r: r.abort())
    pg = await ctx.new_page(); msgs = []
    pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
    await pg.clock.install(time=0); await pg.goto(URL); await pg.clock.run_for(300)
    return b, pg, msgs


async def battle(pg, lv, secs):
    await pg.evaluate(START, [lv]); await pg.evaluate(SAMPLER)
    t0 = time.time(); done = 0
    while done < secs * 1000 and time.time() - t0 < 40:
        await pg.clock.run_for(1000); done += 1000
        if await pg.evaluate("window.__qp.G.mode !== 'play'"): break
    r = await pg.evaluate("(() => { const f = window.__fl, q = window.__qp; return {on: f.on, peak: +f.peak.toFixed(3), shake: +f.shake.toFixed(2), shx: +f.shx.toFixed(1), slowMin: f.slowMin, rounds: q.S.round, state: q.S.state, calm: q.FX.calm, peakShots: q.S.stat.peak}; })()")
    on = r['on']; worst = 0; wi = 0
    for i in range(len(on)):
        k = i
        while k < len(on) and on[k]['t'] - on[i]['t'] < 1000: k += 1
        if k - i > worst: worst = k - i; wi = i
    gaps = [round(on[i + 2]['t'] - on[i]['t']) for i in range(len(on) - 2)]
    return {'level': lv + 1, 'gameSec': done / 1000, 'rounds': r['rounds'], 'state': r['state'], 'calm': r['calm'], 'flashes': len(on), 'maxInAny1000ms': worst, 'at': [round(o['t']) for o in on[wi:wi + worst]], 'minSpanOf3': min(gaps) if gaps else None,
            'peakFlashAlpha': r['peak'], 'peakShake': r['shake'], 'peakShakeOffsetPx': r['shx'], 'slowMoMin': r['slowMin'], 'peakShotsInAir': r['peakShots']}


async def main():
    async with async_playwright() as p:
        for mode in ('normal', 'reduce'):
            if mode not in WHAT: continue
            b, pg, msgs = await open_clock(p, mode == 'reduce')
            print(f'--- {mode}: prefers-reduced-motion matches =', await pg.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"))
            for lv in (4, 5, 3):
                print('  ', pj(await battle(pg, lv, 150)), flush=True)
            print('   errors:', msgs); await b.close()

        if 'toggle' in WHAT:
            b, ctx, pg, msgs = await open_page(p, 844, 390, dsf=1)
            await fresh(pg)
            c0 = await pg.evaluate("window.__qp.FX.calm")
            await pg.emulate_media(reduced_motion='reduce'); await pg.wait_for_timeout(100); c1 = await pg.evaluate("window.__qp.FX.calm")
            await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()"); await pg.wait_for_timeout(250)
            s1 = await pg.evaluate("[window.__qp.FX.shake, window.__qp.FX.flash]")
            await pg.emulate_media(reduced_motion='no-preference'); await pg.wait_for_timeout(100); c2 = await pg.evaluate("window.__qp.FX.calm")
            print(f'--- toggle at runtime: calm {c0} -> (reduce) {c1} -> (no-preference) {c2}; castle destroyed while reduced: shake {s1[0]:.2f} flash {s1[1]:.2f}; errors {msgs}')
            await b.close()

        if 'css' in WHAT:
            ANIMS = """(() => document.getAnimations().filter(a => a.playState === 'running').map(a => { const t = a.effect && a.effect.target, tm = a.effect.getComputedTiming(); return (t ? (t.id || (t.className + '').split(' ')[0] || t.tagName) : '?') + ':' + (a.animationName || ('transition ' + a.transitionProperty)) + (tm.iterations === Infinity ? '(loops)' : ''); }))()"""
            MOVES = """(() => { const out = []; for (const a of document.getAnimations()) { if (a.playState !== 'running' || !a.effect) continue; const kf = a.effect.getKeyframes(); const tr = [...new Set(kf.map(k => k.transform).filter(Boolean))]; if (tr.length > 1) out.push((a.effect.target.id || a.effect.target.className) + ':' + (a.animationName || a.transitionProperty) + ' moves ' + tr.join(' -> ').slice(0, 90)); } return out; })()"""
            b, ctx, pg, msgs = await open_page(p, 844, 390, dsf=1, reduced_motion='reduce')
            print('--- CSS animations still running with prefers-reduced-motion: reduce')
            await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = false; q.startLevel(0); })()"); await pg.wait_for_timeout(350)
            print('   intro banner:', await pg.evaluate(ANIMS))
            await wait_my_aim(pg); await pg.wait_for_timeout(300)
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.shield.c = 100; T.ult.c = 100; })()"); await pg.wait_for_timeout(250)
            print('   my turn (tutorial hint, ready skills, "your turn" chip):', await pg.evaluate(ANIMS))
            await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.startLevel(1); })()"); await wait_my_aim(pg); await pg.wait_for_timeout(250)
            print('   toast showing:', await pg.evaluate(ANIMS), '| moving parts:', await pg.evaluate(MOVES))
            await pg.evaluate("(() => { const q = window.__qp; q.S.stat.peak = 400; })()"); await pg.wait_for_timeout(120)
            print('   milestone text:', await pg.evaluate(ANIMS), '| moving parts:', await pg.evaluate(MOVES))
            await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(60); print('   pause menu opening:', await pg.evaluate(ANIMS), '| moving parts:', await pg.evaluate(MOVES)); await pg.keyboard.press('KeyP')
            await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
            await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(450)
            print('   result (stars popping):', await pg.evaluate(ANIMS), '| moving parts:', await pg.evaluate(MOVES))
            await pg.evaluate("document.getElementById('btnHome').click()"); await pg.wait_for_timeout(100)
            await pg.evaluate("document.querySelectorAll('#lvls button')[1].click()"); await pg.wait_for_timeout(40)
            print('   home, level picked:', await pg.evaluate(ANIMS), '| moving parts:', await pg.evaluate(MOVES))
            await pg.evaluate("document.getElementById('btnOpt').click(); document.getElementById('tSfx').click()"); await pg.wait_for_timeout(40)
            print('   options, toggle flipped:', await pg.evaluate(ANIMS), '| moving parts:', await pg.evaluate(MOVES))
            print('   errors:', msgs); await b.close()
            # 直拿：轉向提示
            b, ctx, pg, msgs = await open_page(p, 390, 844, touch=True, dsf=1, reduced_motion='reduce')
            print('   portrait rotate-your-phone overlay:', await pg.evaluate(ANIMS), '| moving parts:', await pg.evaluate(MOVES)); await b.close()

asyncio.run(main())
