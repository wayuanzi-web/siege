"""滑鼠與鍵盤的操作規則（1280x720，dpr 1），用 Playwright 的真實滑鼠／鍵盤事件。
   python3 test/review-ui/03_input_mouse_kbd.py [only=<名稱片段>]"""
import asyncio, json, sys, math
from playwright.async_api import async_playwright
from common import *

ONLY = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('only=')]
AIM = "(() => { const a = window.__qp.S.team[0].aim; return [+(Math.atan2(a[1], a[0]) * 180 / Math.PI).toFixed(1), +Math.hypot(a[0], a[1]).toFixed(1), +a[0].toFixed(1), +a[1].toFixed(1)]; })()"
VOL = "window.__qp.S.team[0].volleys"
# 瞄準線在 tau 秒時的位置（畫面座標，CSS px）跟游標差多遠
MISS = """([mx, my]) => { const q = window.__qp, S = q.S, V = q.V, G = q.G, RD = q.RD, T = S.team[0];
  let u = null; for (const k of T.units) if (k.alive && k.w && k.frozen <= 0 && k.stun <= 0) { u = k; break; }
  const tau = Math.min(0.9, RD.aimT * 0.85), ox = u.x + 1.3, oy = u.y + 2.3, w = S.wind;
  const wx = ox + T.aim[0] * tau + 0.5 * w * tau * tau, wy = oy + T.aim[1] * tau - 0.5 * 48 * tau * tau;
  const k = V.W / G.sw, px = ((wx - 56) * V.s + V.cx) / k + G.ox, py = (V.gy - wy * V.s) / k + G.oy;
  return {aimPx: [Math.round(px), Math.round(py)], cursor: [mx, my], missPx: +Math.hypot(px - mx, py - my).toFixed(1), tau}; }"""


async def mclick(pg, sel):
    # 按鈕有呼吸動畫，Playwright 的 click 會一直等它「穩定」，改成直接用滑鼠點它的中心
    r = await pg.evaluate("(s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel)
    await pg.mouse.click(r[0], r[1])


async def fresh(pg, lv=0):
    await pg.evaluate("(lv) => { const q = window.__qp; q.G.freeze = false; q.SV.seen = true; q.SV.open = 6; q.startLevel(lv); }", lv)
    await wait_my_aim(pg); await pg.wait_for_timeout(100)


async def main():
    async with async_playwright() as p:
        W, H = 1280, 720
        b, ctx, pg, msgs = await open_page(p, W, H, dsf=1)
        class Out(dict):
            def __setitem__(self, k, v):
                print(k, '=>', json.dumps(v, ensure_ascii=False, indent=1) if isinstance(v, (dict, list)) and len(json.dumps(v)) > 200 else json.dumps(v, ensure_ascii=False), flush=True)
        out = Out(); want = lambda n: (not ONLY) or any(o in n for o in ONLY)
        aim = lambda: pg.evaluate(AIM); vol = lambda: pg.evaluate(VOL)
        M = pg.mouse

        if want('click'):
            await fresh(pg); a0 = await aim()
            await M.move(700, 250); await M.down(); await pg.wait_for_timeout(60); await M.up(); await pg.wait_for_timeout(150)
            out['short click: no fire, aim jumps to cursor'] = {'volleys': await vol(), 'aim': [a0[:2], (await aim())[:2]], 'toast': await pg.evaluate("document.getElementById('say').textContent"), 'miss': await pg.evaluate(MISS, [700, 250])}
            await M.move(640, 300); await M.down(); await pg.wait_for_timeout(320); await M.up(); await pg.wait_for_timeout(150)
            out['press 320ms without moving: fires (by design)'] = await vol()
            await fresh(pg)
            await M.move(640, 300); await M.down(button='right'); await pg.wait_for_timeout(300); await M.up(button='right'); await pg.wait_for_timeout(100)
            await M.down(button='middle'); await pg.wait_for_timeout(300); await M.up(button='middle'); await pg.wait_for_timeout(100)
            out['right/middle button: no fire'] = await vol()

        if want('track'):
            await fresh(pg); res = []
            await M.move(500, 400); await M.down()
            for (x, y) in [(600, 300), (800, 200), (900, 120), (1000, 300), (700, 500), (420, 200), (300, 100), (640, 20), (1270, 10)]:
                await M.move(x, y, steps=4); await pg.wait_for_timeout(40)
                r = await pg.evaluate(MISS, [x, y]); r['aim'] = (await aim())[:2]; res.append(r)
            await M.up(); await pg.wait_for_timeout(100)
            out['mouse drag: preview passes through cursor?'] = res
            out['mouse drag release fires'] = await vol()

        if want('lob'):
            # 滑鼠瞄準能吊多高：游標掃過整個畫面，記下各力道區間能到的最大仰角
            res = {}
            for (w, h) in [(1280, 720), (844, 390), (1024, 768), (1920, 1080)]:
                await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(250)
                await fresh(pg)
                r = await pg.evaluate("""(() => { const q = window.__qp, S = q.S, V = q.V, G = q.G, RD = q.RD, T = S.team[0];
                  let u = null; for (const k of T.units) if (k.alive && k.w) { u = k; break; }
                  const tau = Math.min(0.9, RD.aimT * 0.85), k = V.W / G.sw, ox = u.x + 1.3, oy = u.y + 2.3;
                  let maxAng = 0, maxVy = 0, best = null; const byPow = {};
                  for (let py = 0; py <= G.sh; py += 2) for (let px = 0; px <= G.sw; px += 4) {
                    const tx = (px * k - V.cx) / V.s + 56, ty = (V.gy - py * k) / V.s;
                    let vx = (tx - ox) / tau, vy = (ty - oy + 24 * tau * tau) / tau;
                    // clampAim
                    if (vx < 1) vx = 1; let a = Math.atan2(vy, vx), v = Math.hypot(vx, vy); a = Math.min(1.5, Math.max(0.1, a)); v = Math.min(86, Math.max(32, v));
                    vx = Math.cos(a) * v; vy = Math.sin(a) * v;
                    const pb = Math.round(v / 10) * 10; if (!(byPow[pb] >= a)) byPow[pb] = a;
                    // 這個初速打不打得到敵城（落回砲口高度時的水平距離）
                    const range = vx * 2 * vy / 48; const st = S.st[1];
                    if (vy > maxVy && ox + range > st.x0 && ox + range < st.x1) { maxVy = vy; best = {vx: +vx.toFixed(1), vy: +vy.toFixed(1), ang: +(a * 57.3).toFixed(1), v: +v.toFixed(1), descent: +(Math.atan2(vy, vx) * 57.3).toFixed(1)}; }
                  }
                  for (const p in byPow) byPow[p] = +(byPow[p] * 57.3).toFixed(1);
                  return {unitY: +u.y.toFixed(1), top: +V.top.toFixed(1), tau: +tau.toFixed(3), maxAngleByPower: byPow, steepestShotThatReachesEnemyCastle: best}; })()""")
                res[f'{w}x{h}'] = r
            await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(250)
            out['mouse: steepest reachable lob (touch/keyboard can reach 86 deg at any power)'] = res

        if want('outside'):
            await fresh(pg)
            await M.move(640, 300); await M.down(); await M.move(700, 100, steps=3); await M.move(700, -200, steps=3); await pg.wait_for_timeout(50)
            a = await aim(); d = await pg.evaluate("!!window.__qp.G.drag")
            await M.up(); await pg.wait_for_timeout(120)
            out['mouse dragged above the window, released outside'] = {'aimWhileOutside': a, 'dragAlive': d, 'volleys': await vol()}
            await fresh(pg)
            await M.move(640, 300); await M.down(); await M.move(700, 200, steps=3)
            await pg.evaluate("window.dispatchEvent(new Event('blur'))"); await M.move(720, 180); await M.up(); await pg.wait_for_timeout(120)
            out['window blur mid-drag: release does not fire'] = await vol()

        if want('keys'):
            await fresh(pg); a0 = await aim(); res = {}
            await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(300); await pg.keyboard.up('ArrowUp'); a1 = await aim()
            await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(300); await pg.keyboard.up('ArrowRight'); a2 = await aim()
            await pg.keyboard.down('Alt'); await pg.keyboard.down('ArrowDown'); await pg.wait_for_timeout(300); await pg.keyboard.up('ArrowDown'); await pg.keyboard.up('Alt'); a3 = await aim()
            res['arrows'] = [a0[:2], a1[:2], a2[:2], a3[:2]]
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.shield.c = 100; T.ult.c = 100; })()")
            await pg.keyboard.press('KeyX'); res['X arms'] = await pg.evaluate("window.__qp.S.team[0].ult.armed")
            await pg.keyboard.press('KeyC'); res['C disarms'] = not await pg.evaluate("window.__qp.S.team[0].ult.armed")
            await pg.keyboard.press('KeyZ'); res['Z shield'] = await pg.evaluate("window.__qp.S.team[0].shield.on")
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(80); res['Space fires'] = await vol()
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(80); res['Enter during volley no double'] = await vol()
            await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(80); res['P pauses'] = await pg.evaluate("window.__qp.G.mode")
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(80); res['Space while paused'] = [await pg.evaluate("window.__qp.G.mode"), await vol()]
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(80); res['Esc resumes'] = await pg.evaluate("window.__qp.G.mode")
            # 按住方向鍵時暫停，放開後繼續：不該卡鍵
            await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(60); await pg.keyboard.press('KeyP'); await pg.keyboard.up('ArrowUp'); await pg.keyboard.press('KeyP'); a4 = await aim(); await pg.wait_for_timeout(300); a5 = await aim()
            res['no stuck key after pause'] = a4[:2] == a5[:2]
            out['keyboard'] = res

        if want('focus'):
            # 用滑鼠按過 HUD 按鈕之後，焦點留在按鈕上；之後按 Enter 發射，瀏覽器還會「按一下」那顆按鈕
            res = {}
            await fresh(pg)
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.shield.c = 100; })()")
            await mclick(pg, '#btnShield'); await pg.wait_for_timeout(100)
            res['after click: focused'] = await pg.evaluate("document.activeElement.id")
            # 下一回合護罩又集滿了
            await pg.evaluate("(() => { const q = window.__qp, T = q.S.team[0]; T.shield.on = false; T.shield.c = 100; })()")
            await M.move(700, 250); await M.down(); await M.move(760, 220, steps=3); await pg.wait_for_timeout(60)
            await pg.keyboard.press('Escape'); await pg.keyboard.press('Escape'); await M.up()      # 隨便做點別的事，焦點還在嗎
            res['focused before Enter'] = await pg.evaluate("document.activeElement.id")
            u0 = await pg.evaluate("window.__qp.S.team[0].shield.uses"); v0 = await vol()
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(120)
            res['Enter -> volleys +'] = (await vol()) - v0
            res['Enter -> shield uses + (should be 0)'] = (await pg.evaluate("window.__qp.S.team[0].shield.uses")) - u0
            # 暫停鍵：滑鼠按暫停 → Esc 繼續 → Enter 發射
            await fresh(pg)
            await mclick(pg, '#btnPause'); await pg.wait_for_timeout(120); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(120)
            res['pause-click, Esc resume: focused'] = await pg.evaluate("document.activeElement.id + ' mode=' + window.__qp.G.mode")
            v0 = await vol(); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(150)
            res['then Enter -> '] = {'volleys+': (await vol()) - v0, 'mode (should be play)': await pg.evaluate("window.__qp.G.mode")}
            if (await pg.evaluate("window.__qp.G.mode")) == 'pause': await pg.keyboard.press('Escape')
            # Space：keydown 有 preventDefault，應該不會多按
            await fresh(pg)
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.shield.c = 100; })()")
            await mclick(pg, '#btnShield'); await pg.evaluate("(() => { const q = window.__qp, T = q.S.team[0]; T.shield.on = false; T.shield.c = 100; })()")
            u0 = await pg.evaluate("window.__qp.S.team[0].shield.uses"); v0 = await vol()
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(120)
            res['Space with focused shield button'] = {'volleys+': (await vol()) - v0, 'shield uses+': (await pg.evaluate("window.__qp.S.team[0].shield.uses")) - u0}
            # 發射鈕有焦點時按 Enter：發射 + 一聲錯誤音？
            await fresh(pg)
            await mclick(pg, '#btnFire'); await pg.wait_for_timeout(100)
            res['after clicking fire: focus'] = await pg.evaluate("document.activeElement.id")
            out['focused HUD button + Enter/Space'] = res

        if want('modkeys'):
            await fresh(pg); res = {}
            await pg.evaluate("(() => { const T = window.__qp.S.team[0]; T.shield.c = 100; T.ult.c = 100; })()")
            await pg.keyboard.press('Control+KeyC'); res['Ctrl+C arms ult'] = await pg.evaluate("window.__qp.S.team[0].ult.armed")
            await pg.keyboard.press('Shift+Tab'); res['Shift(+Tab) fires shield'] = await pg.evaluate("window.__qp.S.team[0].shield.on")
            out['modifier combos trigger skills'] = res

        print('errors:', msgs)
        await b.close()

asyncio.run(main())
