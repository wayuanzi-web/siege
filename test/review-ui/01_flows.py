"""流程走一遍（滑鼠、844x390）：主畫面選關（含鎖住的）→ 設定 → 強化 → 每一關用自動玩家打幾回合 →
   暫停／繼續／重來／回主畫面（瞄準中、砲擊中）→ 勝負結算 → 下一關／再戰／回主畫面。
   每一步都記下殘留狀態（提示、回合牌、護罩、彈道、慢動作、配樂），最後列出 console / page error。
   python3 test/review-ui/01_flows.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

LEFT = """(() => { const q = window.__qp, G = q.G, S = q.S, FX = q.FX, RD = q.RD, $ = (i) => document.getElementById(i);
  const vis = (i) => { const e = $(i); if (!e) return null; const cs = getComputedStyle(e); return !e.hidden && cs.display !== 'none' && e.offsetParent !== null; };
  return {mode: G.mode, demo: G.demo, phase: S.phase, turn: S.turn, round: S.round, state: S.state,
    hud: vis('hud'), home: vis('home'), opt: vis('opt'), shop: vis('shop'), result: vis('result'),
    hint: vis('hint'), chip: vis('turnChip') ? $('turnChip').textContent + ' [' + $('turnChip').className + ']' : null,
    say: $('say').className + ' | ' + $('say').textContent.slice(0, 18), sayOp: +getComputedStyle($('say')).opacity,
    banner: $('banner').className + ' | ' + $('banner').textContent, bannerOp: +getComputedStyle($('banner')).opacity,
    fireReady: $('btnFire').classList.contains('ready'), shBtn: $('btnShield').className, ultBtn: $('btnUlt').className,
    rdSh: RD.sh.map(v => +v.toFixed(2)), trail: RD.trail ? RD.trail.n : null, showAim: RD.showAim, slow: FX.slow, slowT: +FX.slowT.toFixed(2), flash: +FX.flash.toFixed(2), shake: +FX.shake.toFixed(2),
    parts: FX.n, pops: FX.pops.length, rings: FX.rings.length, drag: !!G.drag, mus: q.AU.mus ? q.AU.mus.th.bpm : null, wind: $('windBox').hidden ? null : $('windTxt').textContent, ticks: document.querySelectorAll('#hpB .tick').length,
    foeLbl: $('foeLbl').textContent, name: $('hudName').textContent, roundTxt: $('roundTxt').textContent}; })()"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390)
        log = lambda *a: print(*a, flush=True)
        left = lambda: pg.evaluate(LEFT)
        st = lambda: pg.evaluate(JS_STATE)

        # ---------- 主畫面：六關都點一次（一開始只有第一關解鎖） ----------
        for i in range(6):
            await pg.click(f'#lvls button:nth-child({i + 1})')
            await pg.wait_for_timeout(150)
            r = await pg.evaluate("(() => ({sel: window.__qp.UI.sel, idx: window.__qp.S.idx, demo: window.__qp.G.demo, go: document.getElementById('btnGo').disabled, tip: document.getElementById('liTip').textContent.slice(0, 26), name: document.getElementById('liName').textContent}))()")
            log('home sel', i, r)
        # 鎖住的關：硬點「出戰」不能進去
        box = await pg.evaluate("(() => { const r = document.getElementById('btnGo').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
        await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(200)
        log('locked go ->', (await st())['mode'])
        # 鍵盤：Tab 到出戰按 Enter（disabled 不該進）
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
        log('locked enter ->', (await st())['mode'])

        # ---------- 設定 ----------
        await pg.click('#btnOpt'); await pg.wait_for_timeout(300)
        for t in ('tSfx', 'tMus', 'tVib'):
            await pg.click('#' + t); await pg.wait_for_timeout(60)
        log('toggles off', await pg.evaluate("(() => { const s = window.__qp.SV; return [s.sfx, s.mus, s.vib, JSON.parse(localStorage.getItem('qianpao-pocheng-1')).sfx]; })()"))
        for t in ('tSfx', 'tMus', 'tVib'):
            await pg.click('#' + t); await pg.wait_for_timeout(60)
        for d in (0, 2, 1):
            await pg.click(f'#diffSeg button[data-d="{d}"]'); await pg.wait_for_timeout(60)
            log('diff', d, await pg.evaluate("window.__qp.SV.diff"), await pg.evaluate("[...document.querySelectorAll('#diffSeg button')].map(b => b.getAttribute('aria-pressed')).join()"))
        await pg.click('#btnWipe'); await pg.wait_for_timeout(100)
        log('wipe armed text:', await pg.inner_text('#btnWipe'))
        await pg.click('#opt [data-close]'); await pg.wait_for_timeout(100)
        await pg.click('#btnOpt'); await pg.wait_for_timeout(200)
        log('reopen -> wipe text:', await pg.inner_text('#btnWipe'), '| armed', await pg.evaluate("window.__qp.UI.wipeArm"))
        await pg.click('#btnUnlock'); await pg.wait_for_timeout(200)
        log('unlock', await pg.evaluate("[window.__qp.SV.open, document.querySelectorAll('#lvls .locked').length, document.getElementById('opt').hidden]"))

        # ---------- 強化 ----------
        await pg.click('#btnShop'); await pg.wait_for_timeout(300)
        await pg.click('#upList li:nth-child(1) button'); await pg.wait_for_timeout(100)
        log('buy with 0 coins', await pg.evaluate("JSON.stringify(window.__qp.SV.up) + ' ' + window.__qp.SV.coins"))
        await pg.evaluate("window.__qp.SV.coins = 99999"); await pg.click('#shop [data-close]'); await pg.click('#btnShop'); await pg.wait_for_timeout(200)
        for k in range(6):
            dis = await pg.evaluate("document.querySelector('#upList li:nth-child(2) button').disabled")
            if dis: break
            await pg.click('#upList li:nth-child(2) button'); await pg.wait_for_timeout(60)
        log('aim maxed', await pg.evaluate("JSON.stringify(window.__qp.SV.up) + ' ' + window.__qp.SV.coins + ' ' + document.querySelector('#upList li:nth-child(2) button').textContent + ' homeCoins=' + document.getElementById('homeCoins').textContent"))
        await pg.screenshot(path=shot_path('flow_shop_maxed'))
        await pg.click('#shop [data-close]'); await pg.wait_for_timeout(150)

        # ---------- 每一關：自動玩家打幾回合（凍結即時迴圈，手動推進） ----------
        for lv in range(6):
            await pg.click(f'#lvls button:nth-child({lv + 1})'); await pg.wait_for_timeout(120)
            await pg.click('#btnGo'); await pg.wait_for_timeout(250)
            l0 = await left()
            log(f'L{lv + 1} start', json.dumps({k: l0[k] for k in ('mode', 'hint', 'chip', 'say', 'sayOp', 'banner', 'rdSh', 'trail', 'slow', 'mus', 'wind', 'ticks', 'foeLbl', 'name')}, ensure_ascii=False))
            await pg.evaluate("(() => { const q = window.__qp; q.G.freeze = true; q.aiInit(q.S.team[0], q.BOTS.casual, {aiErr: 1}); })()")
            for chunk in range(8):
                r = await pg.evaluate("(() => { const q = window.__qp, S = q.S; q.advance(12); return {t: +S.time.toFixed(0), round: S.round, phase: S.phase, state: S.state, me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100), parts: q.FX.n, blocks: S.blocks.length, nfrag: S.nfrag}; })()")
                if r['state'] != 'play': break
            log(f'L{lv + 1} bot', r, 'errors so far', len(msgs))
            await pg.screenshot(path=shot_path(f'flow_L{lv + 1}_bot'))
            await pg.evaluate("window.__qp.G.freeze = false")
            if r['state'] == 'play':
                # 還沒分勝負：暫停 → 回主畫面
                await pg.click('#btnPause'); await pg.wait_for_timeout(250)
                await pg.click('#btnQuit'); await pg.wait_for_timeout(300)
            else:
                await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(1500)
                await pg.screenshot(path=shot_path(f'flow_L{lv + 1}_result'))
                log(f'L{lv + 1} result', await pg.evaluate("(() => ({title: document.getElementById('resTitle').textContent, next: !document.getElementById('btnNext').hidden, stars: document.querySelectorAll('#resStars .on').length, coins: document.getElementById('rsCoins').textContent, tip: document.getElementById('resTip').hidden ? null : document.getElementById('resTip').textContent}))()"))
                await pg.click('#btnHome'); await pg.wait_for_timeout(300)
            l1 = await left()
            log(f'L{lv + 1} home', json.dumps({k: l1[k] for k in ('mode', 'demo', 'hud', 'home', 'result', 'opt', 'showAim', 'trail', 'slow', 'flash', 'mus', 'drag')}, ensure_ascii=False))
        log('ERRORS after six levels:', msgs)

        # ---------- 暫停／繼續／重來／離開：瞄準中、砲擊中 ----------
        await pg.click('#lvls button:nth-child(2)'); await pg.click('#btnGo'); await wait_my_aim(pg)
        await pg.click('#btnPause'); await pg.wait_for_timeout(200)
        t0 = await pg.evaluate("window.__qp.S.time"); await pg.wait_for_timeout(400); t1 = await pg.evaluate("window.__qp.S.time")
        log('pause mid-aim frozen', t0 == t1, (await left())['opt'])
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150); log('esc resume ->', (await st())['mode'])
        await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(150); log('P pause ->', (await st())['mode'])
        await pg.click('#btnResume'); await pg.wait_for_timeout(150)
        # 開火後馬上暫停（砲擊中）
        await pg.click('#btnFire'); await pg.wait_for_timeout(350)
        await pg.click('#btnPause'); await pg.wait_for_timeout(200)
        s = await st(); l = await left(); log('pause mid-volley', s['phase'], s['shots'], 'chip:', l['chip'])
        await pg.screenshot(path=shot_path('flow_pause_midvolley'))
        await pg.click('#btnRetry'); await pg.wait_for_timeout(120)
        l = await left(); s = await st()
        log('RETRY mid-volley -> ', json.dumps({k: l[k] for k in ('mode', 'phase', 'round', 'chip', 'fireReady', 'say', 'sayOp', 'hint', 'trail', 'slow', 'parts', 'wind', 'roundTxt')}, ensure_ascii=False), 'shots', s['shots'])
        await pg.screenshot(path=shot_path('flow_retry_stale_chip'))
        await pg.wait_for_timeout(700)
        l = await left(); log('  +0.8s chip:', l['chip'], 'phase', l['phase'])
        await wait_my_aim(pg)
        # 敵軍回合中離開，再進另一關
        await pg.click('#btnFire'); await wait_phase(pg, 'aim', 1); await pg.wait_for_timeout(200)
        l = await left(); log('enemy aim chip:', l['chip'])
        await pg.click('#btnPause'); await pg.click('#btnQuit'); await pg.wait_for_timeout(300)
        await pg.click('#lvls button:nth-child(1)'); await pg.click('#btnGo'); await pg.wait_for_timeout(150)
        l = await left(); log('QUIT during enemy aim -> start L1: ', json.dumps({k: l[k] for k in ('phase', 'chip', 'fireReady', 'wind', 'name', 'roundTxt', 'shBtn', 'ultBtn')}, ensure_ascii=False))
        await pg.screenshot(path=shot_path('flow_newlevel_stale_chip'))

        # ---------- 贏、下一關、輸、再戰、強化、回主畫面 ----------
        await wait_my_aim(pg)
        await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
        await pg.wait_for_timeout(600)
        # 結束演出中：暫停鍵、發射鍵、技能鍵都不該出事
        await pg.click('#btnPause'); await pg.click('#btnFire'); await pg.click('#btnShield'); await pg.click('#btnUlt'); await pg.keyboard.press('Space'); await pg.keyboard.press('Escape')
        log('during finale mode', (await st())['mode'])
        await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(1600)
        l = await left(); log('WIN result leftovers', json.dumps({k: l[k] for k in ('mode', 'hud', 'result', 'chip', 'hint', 'sayOp', 'bannerOp', 'slow', 'flash', 'shake', 'mus')}, ensure_ascii=False))
        await pg.screenshot(path=shot_path('flow_win'))
        await pg.click('#btnNext'); await pg.wait_for_timeout(300)
        s = await st(); log('next ->', s['mode'], 'idx', s['idx'])
        await wait_my_aim(pg)
        await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[0].units) q.killUnit(u, 1, 0); })()")
        await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(600)
        await pg.screenshot(path=shot_path('flow_lose'))
        await pg.click('#btnUp'); await pg.wait_for_timeout(250)
        await pg.screenshot(path=shot_path('flow_lose_shop'))
        await pg.click('#upList li:nth-child(1) button'); await pg.wait_for_timeout(100)
        await pg.click('#shop [data-close]'); await pg.wait_for_timeout(150)
        l = await left(); log('shop from result closed ->', json.dumps({k: l[k] for k in ('mode', 'result', 'shop', 'home')}))
        await pg.click('#btnAgain'); await pg.wait_for_timeout(300)
        s = await st(); log('again ->', s['mode'], 'idx', s['idx'], 'dmg mul', await pg.evaluate("window.__qp.S.team[0].dmg"))
        await pg.click('#btnPause'); await pg.click('#btnQuit'); await pg.wait_for_timeout(300)
        # 清除進度（兩段式）
        await pg.click('#btnOpt'); await pg.click('#btnWipe'); await pg.click('#btnWipe'); await pg.wait_for_timeout(250)
        log('wiped', await pg.evaluate("JSON.stringify({c: window.__qp.SV.coins, open: window.__qp.SV.open, up: window.__qp.SV.up, stars: window.__qp.SV.stars, sel: window.__qp.UI.sel, diff: window.__qp.SV.diff, seen: window.__qp.SV.seen})"), 'locked:', await pg.evaluate("document.querySelectorAll('#lvls .locked').length"))
        log('FINAL ERRORS:', msgs)
        await b.close()

asyncio.run(main())
