"""review4：零碎的操作檢查（真的觸控事件）。
   1 輕點不拖：不發射，跳出操作提示   2 按「發射」鈕   3 一根手指拖著瞄準時，另一根手指按護罩   4 敵軍回合就先按住，輪到我才拖、放開
   5 打到一半把手機轉成直的再轉回來   6 垮城演出中點畫面跳到結算；結算剛跳出來馬上點按鈕不算   7 重新整理頁面，進度還在"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT, upright
from layout4 import LAYOUT
import play4

async def main():
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    async with Game(844, 390, scale=2, save=save) as g:
        await g.sec(1); await g.seed_const(5)
        await g.tap_el('#lvls > button:nth-child(2)'); await g.pump(20); await g.tap_el('#btnGo'); await g.seed_lcg(5)
        await g.until("S.phase === 'aim' && S.turn === 0", 10); await g.pump(20)
        fired = lambda: g.js("window.__qp.S.team[0].volleys")
        # 1. 輕點
        v0 = await fired(); await g.tap(400, 200, hold_frames=4); await g.pump(20); st = await g.state()
        print('1 tap without drag: volleys', v0, '->', await fired(), '| toast:', st['say']); await g.shot('misc_1_tap')
        # 1b. 15 秒內再點一次：不會重複講
        await g.pump(240); await g.tap(420, 210); await g.pump(20); print('1b tap again 4 s later: toast now =', repr((await g.state())['say']))
        # 2. 按發射鈕
        await g.tap_el('#btnFire'); await g.pump(6); st = await g.state(); print('2 fire button: phase', st['phase'], 'volleys', await fired())
        # 4. 敵軍回合先按住
        await g.until("S.phase === 'aim' && S.turn === 1", 30); await g.pump(5)
        await g.drag_begin(300, 250); await g.drag_to(330, 230, steps=4); st = await g.state(); a_foe = st['aim']
        ok = await g.until("S.phase === 'aim' && S.turn === 0", 40); st = await g.state(); v1 = await fired()
        print('4 finger held since enemy turn; now my turn:', ok, 'phase', st['phase'], st['turn'], 'volleys', v1, 'aim moved during enemy turn:', a_foe)
        await g.pump(10); await g.drag_end(); await g.pump(4); print('4a release without moving after turn start -> volleys', await fired(), '(should not fire)', 'phase', (await g.state())['phase'])
        # 3. 兩根手指：一根拖、一根按護罩
        await g.js("window.__qp.S.team[0].shield.c = 100"); await g.pump(8)
        r = await g.center('#btnShield')
        await g._touch('touchStart', [(300, 250)]); await g.pump(2)
        for i in range(1, 6): await g._touch('touchMove', [(300 + i * 8, 250 - i * 5)]); await g.pump(1)
        await g._touch('touchStart', [(340, 225), (r[0], r[1])]); await g.pump(3)
        await g._touch('touchEnd', [(340, 225)]); await g.pump(3)          # 第二根手指放開
        st = await g.state(); print('3 two fingers: shield on =', st['shOn'], 'still dragging =', st['drag'], 'phase', st['phase'], 'volleys', await fired())
        await g.shot('misc_3_two_fingers')
        for i in range(1, 4): await g._touch('touchMove', [(340 + i * 6, 225 - i * 6)]); await g.pump(1)
        await g._touch('touchEnd', []); await g.pump(4); print('3a release first finger -> phase', (await g.state())['phase'], 'volleys', await fired())
        # 5. 打到一半轉成直的
        await g.until("S.phase === 'aim' && S.turn === 1", 30)
        await g.pg.set_viewport_size({'width': 390, 'height': 844}); await asyncio.sleep(0.4); await g.pump(30)
        st = await g.state(); lay = await g.js(LAYOUT); print('5 rotate to portrait mid-game: rot', st['rot'], 'mode', st['mode'], 'phase', st['phase'], 'layout flags', lay['flags'], 'stage', lay['sw'], lay['sh'])
        im = await g.shot(None); im.save(OUT / 'misc_5_portrait_raw.png'); upright(im, st['rot']).save(OUT / 'misc_5_portrait.png')
        ok = await g.until("S.phase === 'aim' && S.turn === 0", 40); await g.pump(10)
        # 直拿時拖曳：往「遊戲裡的右上」
        si = await play4.stage_info(g); a0 = (await g.state())['aim']; cx, cy = play4.stage_to_client(si, si['sw'] * 0.4, si['sh'] * 0.6)
        await g.drag_begin(cx, cy); dx, dy = g.to_client(40, -30, si['rot']); await g.drag_to(cx + dx, cy + dy, 6); a1 = (await g.state())['aim']
        await g.pg.set_viewport_size({'width': 844, 'height': 390}); await asyncio.sleep(0.4); await g.pump(20)       # 拖到一半又轉回橫的
        st = await g.state(); print('5a drag in portrait: aim', a0, '->', a1, '| rotated back while dragging: rot', st['rot'], 'drag still active', st['drag'], 'phase', st['phase'])
        await g._touch('touchEnd', []); await g.pump(6); st = await g.state(); print('5b released after rotating back: phase', st['phase'], 'volleys', await fired())
        lay = await g.js(LAYOUT); print('   layout flags after rotating back:', lay['flags']); await g.shot('misc_5_back_landscape')
        # 6. 分出勝負：演出中點畫面
        await g.until("S.phase === 'aim' && S.turn === 0", 60)
        await g.js("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()"); await g.pump(40)
        st = await g.state(); print('6 finale started: state', st['state'], 'endT', st['endT'], 'mode', st['mode'])
        await g.tap(420, 200); await g.pump(4); st = await g.state(); print('6a tap at endT<1.6: mode', st['mode'], 'endT', st['endT'])
        await g.pump(80); await g.tap(420, 200); await g.pump(4); st = await g.state(); print('6b tap at endT>1.6: mode', st['mode'], 'result shown', st['res'])
        r = await g.center('#btnNext'); await g.tap(r[0], r[1]); await g.pump(4); st = await g.state(); print('6c tap 下一關 immediately (<0.8 s): mode', st['mode'], '(should still be result)')
        await g.pump(60); await g.tap(r[0], r[1]); await g.pump(20); st = await g.state(); print('6d tap 下一關 after 1 s: mode', st['mode'], 'level idx', await g.js('window.__qp.S.idx'))
        ls = await g.js("localStorage.getItem('qianpao-pocheng-1')"); print('   save:', ls[:120])
        # 7. 重新整理
        pg2 = await g.ctx.new_page(); await pg2.goto((pathlib.Path(g.pg.url.replace('file://', ''))).as_uri()); await pg2.wait_for_timeout(300); await pg2.evaluate("window.__pump(40)")
        r = await pg2.evaluate("(() => { const q = window.__qp; return {coins: q.SV.coins, stars: q.SV.stars, open: q.SV.open, sel: q.UI.sel, homeCoins: document.getElementById('homeCoins').textContent, lvStars: [...document.querySelectorAll('#lvls .stars')].map(e => e.querySelectorAll('em')[0] ? e.querySelector('em').textContent.length : 0)}; })()")
        print('7 reload: ', r); await pg2.screenshot(path=str(OUT / 'misc_7_reload_home.png'))
        print('console:', g.msgs[:8])
asyncio.run(main())
