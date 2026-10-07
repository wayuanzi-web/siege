"""提示佇列遇到暫停／重來／回主畫面／結算。
前半用加了觀測點的版本＋假時鐘看佇列裡發生什麼事；後半用「原版＋真實時間」重現玩家看得到的現象並截圖。
python3 test/review2-ui/14b_toast_pause_restart.py [only=instr|real]"""
import asyncio, re, sys
from playwright.async_api import async_playwright
from common import *
import mk_instr

ONLY = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('only=')]
want = lambda n: (not ONLY) or n in ONLY


def show_log(log, t0, title):
    print(title)
    for e in log:
        t = (e['t'] - t0) / 1000
        if e['op'] == 'say': print(f"    {t:6.1f}s say{'!' if e['alert'] else ' '} {'(dup) ' if e['dup'] else ''}{e['txt'][:28]} [key {e['key'] or '-'}; queue {e['qlen']}]")
        elif e['op'] == 'show': print(f"    {t:6.1f}s   SHOW ({e['dur'] / 1000:.1f}s) {e['txt'][:28]}")
        elif e['op'] == 'drop': print(f"    {t:6.1f}s   DROP after {e['waited'] / 1000:.1f}s: {e['txt'][:24]} [key {e['key'] or 'none'}]")
        elif e['op'] == 'clear': print(f"    {t:6.1f}s   sayClear() (threw away {e['had']})")
        else: print(f"    {t:6.1f}s   -- {e['op']}")


async def instr(p):
    url = mk_instr.build()
    b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1)
    await ctx.route(re.compile(r'^https?://'), lambda r: r.abort())
    pg = await ctx.new_page(); msgs = []
    pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
    await pg.clock.install(time=0); await pg.goto(url); await pg.clock.run_for(500)
    mark = lambda name: pg.evaluate("(n) => window.__sayLog.push({op: n, t: performance.now()})", name)
    QS = "(() => { const q = window.__qp, S = q.SAY; return {cur: S.cur ? S.cur.txt.slice(0, 14) : null, queue: S.q.map(m => m.txt.slice(0, 10)), said: Object.keys(q.G.said).join(','), cls: document.getElementById('say').className, mode: q.G.mode, round: q.S.round}; })()"

    async def to_round(lv, rnd, extra_ms=300):
        await pg.evaluate("([lv]) => { const q = window.__qp; q.SV.seen = true; q.SV.seenUlt = false; q.SV.seenSh = false; q.SV.open = 6; window.__sayLog = []; q.startLevel(lv); q.aiInit(q.S.team[0], {err: 4, think: 2, gate: 0.7, skill: 0, sh: 0}, {aiErr: 1}); window.__t0 = performance.now(); }", [lv])
        for _ in range(900):
            await pg.clock.run_for(100)
            s = await pg.evaluate("(() => { const S = window.__qp.S; return [S.round, S.phase, S.turn, S.state]; })()")
            if s[3] != 'play' or (s[0] >= rnd and s[1] == 'aim' and s[2] == 0): break
        await pg.evaluate("window.__qp.S.team[0].ai = null")      # 之後由「人」來玩
        await pg.clock.run_for(extra_ms)

    # P1：第三關第三回合一開始排了三句（赤符警告、天燈、連珠），這時暫停 12 秒
    await to_round(2, 3)
    print('P1. L3 round 3 begins:', pj(await pg.evaluate(QS)))
    await pg.keyboard.press('KeyP'); await mark('PAUSE (P key)'); await pg.clock.run_for(12000)
    print('    after 12s in the pause menu:', pj(await pg.evaluate(QS)))
    await pg.keyboard.press('KeyP'); await mark('RESUME'); await pg.clock.run_for(6000)
    print('    6s after resuming:', pj(await pg.evaluate(QS)))
    show_log(await pg.evaluate("window.__sayLog"), await pg.evaluate("window.__t0"), '    log:')

    # P1b：魔王進第二階段的說明是 1.9 秒後才講（later）；這 1.9 秒內暫停
    await to_round(5, 1)
    await pg.evaluate("(() => { const q = window.__qp, S = q.S; const bu = S.team[1].units.find(u => u.type === 'boss'); bu.hp = bu.hpMax * 0.6; S.team[0].ai = null; q.simFire(0); })()")
    for _ in range(400):
        await pg.clock.run_for(100)
        if await pg.evaluate("window.__qp.S.boss.phase >= 2"): break
    await mark('BOSS PHASE 2 banner'); await pg.clock.run_for(600)
    await pg.keyboard.press('KeyP'); await mark('PAUSE'); await pg.clock.run_for(3000); await pg.keyboard.press('KeyP'); await mark('RESUME'); await pg.clock.run_for(8000)
    log = await pg.evaluate("window.__sayLog"); t0 = await pg.evaluate("window.__t0")
    k = next(i for i, e in enumerate(log) if e['op'] == 'BOSS PHASE 2 banner')
    show_log(log[k:], t0, 'P1b. boss enters phase 2 (the explanation is scheduled 1.9s later), player pauses 0.6s after the banner for 3s:')
    print('    barrier explanation ever shown:', any('結界分三段' in e['txt'] for e in log if e['op'] == 'show'))

    # P3：同樣排了三句的時候 暫停 → 重來
    await to_round(2, 3)
    await pg.keyboard.press('KeyP'); await pg.clock.run_for(300)
    await pg.evaluate("document.getElementById('btnRetry').click()"); await mark('RETRY'); await pg.clock.run_for(2500)
    print('P3. retry with 3 toasts pending -> 2.5s into the new attempt:', pj(await pg.evaluate(QS)))
    log = await pg.evaluate("window.__sayLog"); k = next(i for i, e in enumerate(log) if e['op'] == 'RETRY')
    show_log(log[k - 1:], await pg.evaluate("window.__t0"), '    log after retry:')

    # P4：排著三句的時候回主畫面，馬上進第一關
    await to_round(2, 3)
    await pg.keyboard.press('KeyP'); await pg.clock.run_for(200)
    await pg.evaluate("document.getElementById('btnQuit').click()"); await mark('HOME'); await pg.clock.run_for(400)
    print('P4. home with 3 toasts pending:', pj(await pg.evaluate(QS)), '| hud hidden', await pg.evaluate("document.getElementById('hud').hidden"))
    await pg.clock.run_for(8000)
    log = await pg.evaluate("window.__sayLog"); k = next(i for i, e in enumerate(log) if e['op'] == 'HOME')
    print('    anything said/shown during 8s on the home screen (demo battle running):', [e['op'] + ':' + e.get('txt', '')[:10] for e in log[k + 1:]])
    await pg.evaluate("(() => { const q = window.__qp; q.UI.sel = 0; document.getElementById('btnGo').click(); })()"); await mark('GO L1'); await pg.clock.run_for(2500)
    print('    2.5s into level 1:', pj(await pg.evaluate(QS)))

    # P5：結算
    await to_round(2, 3)
    await pg.evaluate("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()"); await mark('WIN')
    for _ in range(80):
        await pg.clock.run_for(100)
        if await pg.evaluate("window.__qp.G.mode === 'result'"): break
    print('P5. result screen:', pj(await pg.evaluate(QS)))
    log = await pg.evaluate("window.__sayLog"); k = next(i for i, e in enumerate(log) if e['op'] == 'WIN')
    show_log(log[k:], await pg.evaluate("window.__t0"), '    log from the winning blow:')

    # P6：佇列塞滿時 once() 的記號
    await to_round(0, 1)
    r = await pg.evaluate("""(() => { const q = window.__qp, out = []; q.sayClear(); q.G.said = {};
      q.say('甲甲甲甲甲甲甲甲甲甲'); q.say('乙乙乙乙乙乙乙乙乙乙'); q.say('丙丙丙丙丙丙丙丙丙丙'); q.say('丁丁丁丁丁丁丁丁丁丁');
      q.uiEvent('lantern'); out.push('after lantern event with a full queue: said.lan=' + q.G.said.lan + ' queue=' + q.SAY.q.map(m => m.txt.slice(0, 4)));
      q.uiEvent('lantern'); out.push('second lantern event: said.lan=' + q.G.said.lan + ' queue=' + q.SAY.q.map(m => m.txt.slice(0, 4)));
      q.uiEvent('rockwarn'); out.push('alert (rockwarn) with a full queue: said.rock=' + q.G.said.rock + ' queue=' + q.SAY.q.map(m => m.txt.slice(0, 4)) + ' cur=' + q.SAY.cur.txt.slice(0, 4));
      return out; })()""")
    print('P6. once() flags when the queue is full:'); [print('    ' + x) for x in r]
    print('errors:', msgs)
    await b.close()


async def real(p):
    # 原版、真實時間：第二關第一回合的提示（28 個字，5.2 秒）剛出現就暫停 7 秒
    b, ctx, pg, msgs = await open_page(p, 844, 390, touch=True, dsf=2)
    await pg.evaluate("""(() => { const el = document.getElementById('say'), d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent'); window.__say = [];
      Object.defineProperty(el, 'textContent', {configurable: true, get() { return d.get.call(this); }, set(v) { window.__say.push({t: Math.round(performance.now()), mode: window.__qp.G.mode, r: window.__qp.S.round, txt: String(v)}); d.set.call(this, v); }}); })()""")
    VIS = "(() => { const s = document.getElementById('say'); return {txt: s.textContent.slice(0, 16), opacity: +(+getComputedStyle(s).opacity).toFixed(2)}; })()"
    await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.SV.open = 6; q.startLevel(1); })()")
    await wait_my_aim(pg); await pg.wait_for_timeout(700)
    print('REAL build, real time. L2 round 1, 0.7s into my turn:', pj(await pg.evaluate(VIS)))
    await pg.screenshot(path=shot_path('toast_pause_1_before'))
    r = await pg.evaluate("(() => { const b = document.getElementById('btnPause').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
    await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(1500)
    print('  1.5s into the pause menu:', pj(await pg.evaluate(VIS)), '(the toast is dimmed behind the menu)')
    await pg.screenshot(path=shot_path('toast_pause_2_paused'))
    await pg.wait_for_timeout(5500)
    r = await pg.evaluate("(() => { const b = document.getElementById('btnResume').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
    await pg.touchscreen.tap(r[0], r[1]); await pg.wait_for_timeout(400)
    print('  resumed after 7s:', pj(await pg.evaluate(VIS)), '| mode', await pg.evaluate("window.__qp.G.mode"))
    await pg.screenshot(path=shot_path('toast_pause_3_resumed'))
    # 繼續玩兩回合，看那一句會不會再出現
    for _ in range(2):
        await wait_my_aim(pg); await pg.wait_for_timeout(300)
        rr = await pg.evaluate("(() => { const b = document.getElementById('btnFire').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()")
        await pg.touchscreen.tap(rr[0], rr[1]); await pg.wait_for_timeout(600)
        await pg.evaluate(JS_TO_MY_AIM, 60); await pg.evaluate("window.__qp.G.freeze = false")
    says = await pg.evaluate("window.__say")
    print('  every toast written during this session:'); [print('     ', s['t'], 'ms  round', s['r'], s['mode'], s['txt'][:30]) for s in says]
    print('  round-1 hint shown again after the pause:', sum(1 for s in says if s['txt'].startswith('沙城閣樓')) > 1)
    print('errors:', msgs)
    await b.close()


async def main():
    async with async_playwright() as p:
        if want('instr'): await instr(p)
        if want('real'): await real(p)

asyncio.run(main())
