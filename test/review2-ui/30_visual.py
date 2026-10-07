"""畫面巡一遍：主畫面、設定、強化、六關開場、戰鬥中（提示＋回合牌）、暫停、勝負結算。
三種裝置：844x390 觸控、1280x720 滑鼠、390x844 直拿觸控（截圖轉回橫的存）。
python3 test/review2-ui/30_visual.py phone|desk|port [part=a|b|c]"""
import asyncio, sys
from playwright.async_api import async_playwright
from PIL import Image
from common import *

CFG = sys.argv[1] if len(sys.argv) > 1 else 'phone'
PART = next((a.split('=')[1] for a in sys.argv[1:] if a.startswith('part=')), 'abc')
W, H, TOUCH, DSF = {'phone': (844, 390, True, 2), 'desk': (1280, 720, False, 1), 'port': (390, 844, True, 2)}[CFG]


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, W, H, touch=TOUCH, dsf=DSF)
        rot = await pg.evaluate("window.__qp.G.rot")
        n = [0]
        async def snap(name):
            n[0] += 1; path = shot_path(f'v_{CFG}_{name}')
            await pg.screenshot(path=path)
            if rot: Image.open(path).rotate(90 if rot == 1 else -90, expand=True).save(path)
            print('  ', name, flush=True)
        async def aim_wait(ms=1900):
            await wait_my_aim(pg); await pg.wait_for_timeout(ms)
        if rot: await pg.wait_for_timeout(3600)

        if 'a' in PART:
            await snap('01_home_new')
            await pg.evaluate("(() => { const q = window.__qp; q.SV.coins = 1234; q.SV.open = 4; q.SV.stars = [3, 2, 1, 0, 0, 0]; q.SV.seen = true; document.querySelectorAll('#lvls button')[2].click(); })()"); await pg.wait_for_timeout(1500)
            await snap('02_home_progress_L3')
            await pg.evaluate("document.querySelectorAll('#lvls button')[5].click()"); await pg.wait_for_timeout(1500); await snap('03_home_L6_locked')
            await pg.evaluate("document.querySelectorAll('#lvls button')[4].click()"); await pg.wait_for_timeout(1200); await snap('03b_home_L5_locked')
            await pg.evaluate("document.querySelectorAll('#lvls button')[1].click(); document.getElementById('btnOpt').click()"); await pg.wait_for_timeout(500); await snap('04_options')
            await pg.evaluate("document.getElementById('btnWipe').click()"); await pg.wait_for_timeout(200); await snap('04b_options_wipe_armed')
            await pg.evaluate("document.querySelector('#opt [data-close]').click()")
            await pg.evaluate("(() => { const q = window.__qp; q.SV.up.dmg = 5; q.SV.up.aim = 2; q.SV.up.hp = 4; q.SV.coins = 300; document.getElementById('btnShop').click(); })()"); await pg.wait_for_timeout(500); await snap('05_shop')
            await pg.evaluate("document.querySelector('#shop [data-close]').click()")
            # 鍵盤焦點框（桌機）
            if CFG == 'desk':
                await pg.keyboard.press('Tab'); await pg.wait_for_timeout(100); await snap('06_focus_go')
                await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab'); await pg.wait_for_timeout(100); await snap('06b_focus_level')

        if 'b' in PART:
            await pg.evaluate("(() => { const q = window.__qp; q.SV.open = 6; q.SV.seen = false; q.G.freeze = false; q.startLevel(0); })()")
            await pg.wait_for_timeout(700); await snap('10_L1_intro_banner')
            await aim_wait(1700); await snap('11_L1_first_time_hint')
            for lv in range(6):
                await pg.evaluate("([lv]) => { const q = window.__qp; q.SV.seen = true; q.SV.up = {dmg: 0, aim: 0, hp: 0, shield: 0, ult: 0}; q.G.freeze = false; q.startLevel(lv); }", [lv])
                await aim_wait(2000); await snap(f'2{lv}_L{lv + 1}_start')
            # 準星升滿（虛線最長）、吊高砲
            await pg.evaluate("(() => { const q = window.__qp; q.SV.up.aim = 5; q.startLevel(2); })()"); await aim_wait(1500)
            await pg.evaluate("window.__qp.simAim(0, 14, 80)"); await pg.wait_for_timeout(300); await snap('27_L3_lob_aim5')
            await pg.evaluate("window.__qp.SV.up.aim = 0")

        if 'c' in PART:
            # 戰鬥中：自動玩家代打兩回合，停在我的回合（有提示）
            async def play_to(lv, rnd, phase='aim', turn=0):
                await pg.evaluate("([lv]) => { const q = window.__qp; q.SV.seen = true; q.SV.open = 6; q.G.freeze = true; q.startLevel(lv); q.aiInit(q.S.team[0], q.BOTS.casual, {aiErr: 1}); }", [lv])
                await pg.evaluate("([rnd, phase, turn]) => { const q = window.__qp, S = q.S; let n = 0; while (n++ < 60 * 200 && S.state === 'play' && !(S.round >= rnd && S.phase === phase && S.turn === turn)) q.advance(1 / 60); if (turn === 0) S.team[0].ai = null; }", [rnd, phase, turn])
                # 快轉的時候真實時間沒在走：開場橫幅的計時器（60ms）會在快轉完才響，這裡把它收掉，免得截圖裡多一個「第 N 關」
                await pg.wait_for_timeout(150); await pg.evaluate("document.getElementById('banner').className = ''")
            await play_to(1, 3); await pg.evaluate("window.__qp.G.freeze = false"); await pg.wait_for_timeout(900); await snap('30_L2_round3_my_turn_toast')
            # 敵軍瞄準：一般、穿過倍增符的警告、連珠上膛
            await play_to(4, 4, 'aim', 1)
            await pg.evaluate("(() => { const q = window.__qp, S = q.S; let n = 0; while (n++ < 200 && S.team[1].ai.st !== 2 && S.phase === 'aim') q.advance(1 / 60); q.advance(0.1); })()"); await pg.wait_for_timeout(500); await snap('31_L5_enemy_aiming')
            await pg.evaluate("(() => { const q = window.__qp, S = q.S; if (S.phase === 'aim' && S.turn === 1) { S.team[1].ai.st = 2; S.team[1].ai.mult = 10; for (let i = 0; i < 8; i++) q.hudUpdate(); q.renderFrame(0, 0); } })()"); await pg.wait_for_timeout(300); await snap('32_L5_enemy_gate_warning')
            await pg.evaluate("(() => { const q = window.__qp, S = q.S; if (S.phase === 'aim' && S.turn === 1) { S.team[1].ult.c = 100; q.simSkill(1, 'ult'); for (let i = 0; i < 8; i++) q.hudUpdate(); q.renderFrame(0, 0); } })()"); await pg.wait_for_timeout(700); await snap('33_L5_enemy_ult_armed')
            # 魔王第二階段（結界）、決戰時刻
            await play_to(5, 2)
            await pg.evaluate("(() => { const q = window.__qp, S = q.S; const bu = S.team[1].units.find(u => u.type === 'boss'); bu.hp = bu.hpMax * 0.6; q.aiInit(S.team[0], q.BOTS.casual, {aiErr: 1}); let n = 0; while (n++ < 60 * 60 && S.state === 'play' && !(S.boss.phase >= 2)) q.advance(1 / 60); S.team[0].ai = null; q.G.freeze = false; })()")
            await pg.wait_for_timeout(600); await snap('34_L6_phase2_banner'); await pg.wait_for_timeout(2600); await snap('35_L6_phase2_barrier_toast')
            # 我方技能：護罩展開、連珠上膛、風
            await play_to(1, 4)
            await pg.evaluate("(() => { const q = window.__qp, S = q.S, T = S.team[0]; T.shield.c = 100; T.ult.c = 100; q.simSkill(0, 'shield'); q.simSkill(0, 'ult'); q.G.freeze = false; })()"); await pg.wait_for_timeout(900); await snap('36_L2_shield_ult_wind')
            # 砲擊中（很多砲彈、里程碑字）
            await pg.evaluate("(() => { const q = window.__qp, S = q.S, g = S.gates.find(g => g.owner === 0), T = S.team[0]; let u = T.units.find(u => u.alive && u.w); const tau = 0.7; q.simAim(0, (g.x - u.x - 1.3 - 0.5 * S.wind * tau * tau) / tau, (g.y - u.y - 2.3 + 24 * tau * tau) / tau); q.simFire(0); })()")
            await pg.wait_for_timeout(1500); await snap('37_L2_volley_in_air')
            # 暫停
            await play_to(3, 2); await pg.evaluate("window.__qp.G.freeze = false"); await pg.wait_for_timeout(500)
            await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(500); await snap('40_pause')
            await pg.keyboard.press('KeyP')
            # 贏：三顆星（第一關）
            async def finish(lv, lose=False, hurt=False, rounds=3):
                await play_to(lv, rounds); await pg.evaluate("window.__qp.G.freeze = false")
                await pg.evaluate("([lose, hurt]) => { const q = window.__qp, S = q.S; if (hurt) q.killUnit(S.team[0].units[0], 1, 0); for (const u of S.team[lose ? 0 : 1].units) q.killUnit(u, lose ? 1 : 0, 0); }", [lose, hurt])
            await finish(0); await pg.wait_for_timeout(1500); await snap('41_win_finale_collapse')
            await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(1800); await snap('42_result_win_L1')
            await pg.evaluate("document.getElementById('btnUp').click()"); await pg.wait_for_timeout(500); await snap('43_shop_over_result')
            await pg.evaluate("document.querySelector('#shop [data-close]').click()")
            await finish(4, hurt=True); await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(1800); await snap('44_result_win_L5_tip')
            await finish(5); await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(1800); await snap('45_result_win_L6_final')
            await finish(3, lose=True); await pg.wait_for_timeout(1500); await snap('46_lose_finale_collapse')
            await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=15000); await pg.wait_for_timeout(600)
            await pg.evaluate("document.getElementById('resTip').textContent = '別只打屋頂：打斷柱子和牆，上面整層會自己塌下來。最底下的城基特別厚，打它沒什麼用。'"); await pg.wait_for_timeout(200); await snap('47_result_lose_L4_longest_tip')
        print('shots:', n[0], 'errors:', msgs)
        await b.close()

asyncio.run(main())
