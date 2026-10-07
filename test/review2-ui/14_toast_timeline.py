"""底部提示（say 佇列）在「真實時間」裡的樣子。用 Playwright 的假時鐘把遊戲快轉（performance.now / setTimeout / rAF 一起走，
所以佇列的計時跟真的玩一樣），我方由自動玩家代打、每回合想 4 秒才開火（跟人差不多）。
用的是加了觀測點的 out/index_instr.html（mk_instr.py 產生；只多了記錄，不改行為）。
每一關列出：每一句是什麼時候叫的、等了多久才出來、原本該顯示幾秒、實際顯示了幾秒（被下一句切掉的話會比較短）、哪些被丟掉。
python3 test/review2-ui/14_toast_timeline.py [關卡 0..5 …] [rounds=6] [first]     （first：第一關用新玩家的教學流程）"""
import asyncio, re, sys, time
from playwright.async_api import async_playwright
from common import *
import mk_instr

LVS = [int(a) for a in sys.argv[1:] if a.isdigit()] or [0, 1, 2, 3, 4, 5]
ROUNDS = next((int(a.split('=')[1]) for a in sys.argv[1:] if a.startswith('rounds=')), 6)
FIRST = 'first' in sys.argv[1:]


async def run_level(pg, lv, first):
    await pg.evaluate("""([lv, first]) => { const q = window.__qp; q.SV.seen = !first; q.SV.seenUlt = false; q.SV.seenSh = false; q.SV.open = 6; window.__sayLog = []; window.__ph = [];
      q.startLevel(lv); if (!first) q.aiInit(q.S.team[0], {err: 4, think: 4, gate: 0.7, hate: 0.2, skill: 0.6, sh: 0.5}, {aiErr: 1}); window.__t0 = performance.now(); }""", [lv, first])
    t_wall = time.time(); last_turn = None; human_at = None
    for step in range(1200):
        await pg.clock.run_for(200)
        s = await pg.evaluate("(() => { const q = window.__qp, S = q.S; return {state: S.state, phase: S.phase, turn: S.turn, round: S.round, mode: q.G.mode, t: performance.now() - window.__t0, tut: q.G.tut}; })()")
        key = (s['round'], s['phase'], s['turn'])
        if key != last_turn:
            last_turn = key; await pg.evaluate("([r, ph, t]) => window.__ph.push({t, r, ph})", [s['round'], s['phase'] + str(s['turn']), s['t']])
            human_at = s['t'] + 4000 if (s['phase'] == 'aim' and s['turn'] == 0) else None
        if first and human_at and s['t'] >= human_at and s['state'] == 'play':
            # 新玩家：瞄向第一道倍增符，按空白鍵（走 fireNow，教學才會往下走）
            await pg.evaluate("(() => { const q = window.__qp, S = q.S, T = S.team[0], g = S.gates[0]; let u = null; for (const k of T.units) if (k.alive && k.w) { u = k; break; } const tau = 0.6, vx = (g.x - u.x - 1.3 - 0.5 * S.wind * tau * tau) / tau, vy = (g.y - u.y - 2.3 + 24 * tau * tau) / tau; q.simAim(0, vx, vy); })()")
            await pg.keyboard.press('Space'); human_at = None
        if s['mode'] != 'play' or s['round'] > ROUNDS or time.time() - t_wall > 100: break
    log = await pg.evaluate("window.__sayLog"); ph = await pg.evaluate("window.__ph"); t0 = await pg.evaluate("window.__t0")
    end_t = (await pg.evaluate("performance.now()")) - t0
    def phase_at(t):
        cur = '?'
        for p in ph:
            if p['t'] <= t + 1: cur = 'r%d %s' % (p['r'], p['ph'])
        return cur
    shows = [e for e in log if e['op'] == 'show']; clears = [e['t'] for e in log if e['op'] == 'clear']
    print(f'--- L{lv + 1}{" (first-time tutorial)" if first else ""}: {s["round"]} rounds, {end_t / 1000:.0f}s game time, state {s["state"]}; say() calls {sum(1 for e in log if e["op"] == "say")}, shown {len(shows)}, dropped {sum(1 for e in log if e["op"] == "drop")}', flush=True)
    stats = []
    for e in log:
        t = (e['t'] - t0) / 1000
        if e['op'] == 'say':
            print(f"  {t:6.1f}s {phase_at(e['t'] - t0):12s} say{'!' if e['alert'] else ' '} {'(dup, ignored) ' if e['dup'] else ''}{e['txt'][:30]}{'…' if len(e['txt']) > 30 else ''}  [queue {e['qlen']}{', showing' if e['cur'] else ''}]")
        elif e['op'] == 'drop':
            print(f"  {t:6.1f}s {phase_at(e['t'] - t0):12s} DROPPED after waiting {e['waited'] / 1000:.1f}s: {e['txt'][:26]}  (key {e['key'] or 'none -> never repeated'})")
        elif e['op'] == 'show':
            nxt = min([x['t'] for x in shows if x['t'] > e['t']] + [c for c in clears if c > e['t']] + [e['t'] + e['dur']])
            vis = (nxt - e['t']) / 1000; n = len(e['txt']); stats.append((vis, e['dur'] / 1000, n, e['waited'] / 1000, e['txt']))
            flag = '' if vis >= e['dur'] / 1000 - 0.05 else f'  <-- CUT to {vis:.1f}s of {e["dur"] / 1000:.1f}s = {n / vis:.1f} chars/s'
            print(f"  {t:6.1f}s {phase_at(e['t'] - t0):12s}   SHOW after {e['waited'] / 1000:.1f}s wait, {n} chars: {e['txt'][:22]}…{flag}")
    return stats


async def main():
    url = mk_instr.build()
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1)
        await ctx.route(re.compile(r'^https?://'), lambda r: r.abort())
        pg = await ctx.new_page(); msgs = []
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.clock.install(time=0)
        await pg.goto(url); await pg.clock.run_for(500)
        allst = []
        for lv in LVS:
            allst += await run_level(pg, lv, FIRST and lv == 0)
        cut = [s for s in allst if s[0] < s[1] - 0.05]
        print(f'\nTOTAL shown {len(allst)}; cut short {len(cut)}; waited >3s before showing: {sum(1 for s in allst if s[3] > 3)}')
        if cut: print('  fastest forced reading speed: %.1f chars/s (%s…)' % max((s[2] / s[0], s[4][:16]) for s in cut))
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
