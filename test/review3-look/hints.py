"""review3：每一關頭幾回合畫面底下的提示到底講了什麼（即時跑，不凍結；用真的「發射」按鈕開火）。
   python3 test/review3-look/hints.py <關卡 1-6> [--seen=0|1（是不是第一次玩，只影響第一關的教學）] [--rounds=4] [--tag=…] [--aim=unit|miss（故意打地上）] [--think=1.5（輪到我之後幾秒才開火）]
   每次輪到我方：等提示出現 → 截全畫面 shots/review3/hint_L<關>_<tag>_r<回合>.png → 對著敵兵打一輪。
   另外把底下那條提示說過的每一句話照順序印出來（含第幾回合、哪個階段）。"""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from r3 import Session, HELPERS, parse_opts, OUT

async def main():
    args, opt = parse_opts(sys.argv[1:])
    lvl = int(args[0]); seen = opt.get('seen', '1') == '1'; rounds = int(opt.get('rounds', 4)); tag = opt.get('tag', 'seen' if seen else 'first')
    think = float(opt.get('think', 1.5)); aim = opt.get('aim', 'unit')
    async with Session() as sess:
        ctx, pg, msgs = await sess.page(844, 390, 2, touch=True)
        await pg.evaluate("""([l, seen]) => { const q = window.__qp; q.SV.open = 6; q.SV.seen = seen; q.UI.sel = l - 1; window.__says = [];
            const log = (id) => { const el = document.getElementById(id); new MutationObserver(() => { const t = el.textContent.trim(); const L = window.__says; if (t && !el.hidden && (!L.length || L[L.length - 1].txt !== t || L[L.length - 1].id !== id)) L.push({id, txt: t, round: q.S.round, phase: q.S.phase, turn: q.S.turn, time: +q.S.time.toFixed(1), alert: el.classList.contains('alert')}); }).observe(el, {childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class']}); };
            log('say'); log('banner'); log('hint'); log('mile'); }""", [lvl, seen])
        # 主畫面的關卡說明：真的去點那一關的按鈕（不能先改 UI.sel，不然它以為已經選了、不會重畫）
        await pg.evaluate("(l) => { const q = window.__qp; q.UI.sel = l === 1 ? 1 : 0; document.querySelectorAll('#lvls button')[l - 1].click(); }", lvl)
        await pg.wait_for_timeout(500)
        tip = await pg.evaluate("[document.getElementById('liName').textContent, document.getElementById('liTag').textContent, document.getElementById('liTip').textContent]")
        await pg.screenshot(path=str(OUT / f'hint_L{lvl}_home.png'))
        print('HOME', tip)
        await pg.evaluate("document.getElementById('btnGo').click()")
        await pg.evaluate(HELPERS)
        st = lambda: pg.evaluate("(() => { const q = window.__qp, S = q.S; return {state: S.state, phase: S.phase, turn: S.turn, round: S.round, tut: q.G.tut, hint: !document.getElementById('hint').hidden, say: document.getElementById('say').textContent, sayOn: document.getElementById('say').classList.contains('show'), chip: document.getElementById('turnChip').textContent}; })()")
        last_round = 0
        for _ in range(3000):
            s = await st()
            if s['state'] != 'play': print('game over', s); break
            if s['phase'] == 'aim' and s['turn'] == 0 and s['round'] != last_round:
                last_round = s['round']
                if last_round > rounds: break
                await pg.wait_for_timeout(1500)
                s = await st()
                await pg.screenshot(path=str(OUT / f'hint_L{lvl}_{tag}_r{last_round}.png'))
                extra = await pg.evaluate("(() => { const q = window.__qp, S = q.S; return {hinted: Object.keys(q.G.hinted || {}).map(Number), foe: S.team[1].units.filter(u => u.alive).map(u => u.slot + ':' + u.type), kegs: S.st[1].blocks.filter(b => !b.dead && b.mat === 7).length, simT: +S.time.toFixed(1)}; })()")
                print(f"round {last_round}: tut={s['tut']} hintBox={s['hint']} say={s['say']!r} showing={s['sayOn']} chip={s['chip']!r} hinted={extra['hinted']} foe={extra['foe']} kegs={extra['kegs']} simT={extra['simT']}")
                if think > 1.5:
                    await pg.wait_for_timeout(int((think - 1.5) * 1000))
                    s = await st(); await pg.screenshot(path=str(OUT / f'hint_L{lvl}_{tag}_r{last_round}b.png'))
                    print(f"   +{think}s: say={s['say']!r} showing={s['sayOn']}")
                # 對著還活著的第一個敵兵吊一發（把風算進去），再按「發射」
                await pg.evaluate("""(aim) => { const q = window.__qp, S = q.S; let tg = null; for (const u of S.team[1].units) if (u.alive) { tg = u; break; }
                    if (aim === 'miss') tg = {x: 60, y: -3};          // 故意打在兩城中間的地上：敵城保持原樣，提示的條件才不會變
                    let best = null; for (let tau = 1.2; tau < 3.2; tau += 0.05) { const a = R3.aimAt(0, tg.x, tg.y + 1.5, tau); const v = Math.hypot(a[0], a[1]), ang = Math.atan2(a[1], a[0]); if (a[0] > 0 && v >= 32 && v <= 86 && ang >= 0.1 && ang <= 1.5) { best = a; if (tau > 1.7) break; } }
                    if (best) q.simAim(0, best[0], best[1]);
                    const el = document.getElementById('btnFire'); el.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true, button: 0})); }""", aim)
            await pg.wait_for_timeout(120)
        says = await pg.evaluate("window.__says")
        print('--- transcript ---')
        for m in says: print(f"  [{m['id']}] r{m['round']} {m['phase']}/t{m['turn']} t={m['time']}{' ALERT' if m['alert'] else ''}: {m['txt']}")
        (OUT / f'hint_L{lvl}_{tag}.json').write_text(json.dumps({'home': tip, 'says': says}, ensure_ascii=False, indent=1))
        print('console:', msgs[:5])
        await ctx.close()
asyncio.run(main())
