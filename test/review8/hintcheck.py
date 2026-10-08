"""每一句關卡提示真的講出來的那一刻（#say 換字），記下那一關機關的狀態：吊燈、吊鐘、鐵鍊、配重、晶柱、塔各層的柱子還在不在。
   跟 play.py 同一種開局（同一個種子 → 同一場），所以截圖對得上。
   python3 test/review8/hintcheck.py [關卡,…] [局數=3] [bot=casual]"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from r8 import Game, OUT, SAVE_ALL

A = [a for a in sys.argv[1:] if not a.startswith('--')]
LV = [int(x) for x in (A[0] if len(A) > 0 else '6,7,8,9,10,11,12').split(',')]
GAMES = int(A[1]) if len(A) > 1 else 3
BOT = A[2] if len(A) > 2 else 'casual'

MECH = r"""(() => { const q = window.__qp, S = q.S, st = S.st[1];
  const hang = st.blocks.filter((b) => b.hang).map((b) => b.hang + ':' + (b.dead ? 'DEAD' : b.hangFree ? 'FREE' : b.inPlace ? 'up' : 'moved'));
  const ropes = S.ropes.filter((r) => r.side === 1).map((r) => (r.tag || r.kind) + (r.cut ? ':CUT' : ':ok'));
  const reso = st.blocks.filter((b) => b.reso).map((b) => 'reso:' + (b.dead ? 'DEAD' : b.resoDone ? 'done' : b.inPlace ? 'up' : 'moved'));
  let glass = 0, wood = 0; for (const b of st.blocks) if (!b.dead && b.inPlace) { if (b.mat === 9 || b.mat === 10 || b.mat === 11) glass++; }
  const inplace = st.blocks.filter((b) => !b.dead && b.inPlace).length, total = st.blocks.length;
  const piv = S.pivots.map((o) => +o.ang.toFixed(2)), pins = S.pins.map((o) => o.broke ? 'X' : 'ok');
  const units = S.team[1].units.map((u) => u.slot + (u.alive ? (Math.abs(u.x - u.hx) < 2.2 && Math.abs(u.y - u.hy) < 1.6 ? 'H' : 'm') : 'x')).join(' ');
  return { round: S.round, phase: S.phase + S.turn, hang, ropes, reso, piv, pins, units, inplace: inplace + '/' + total }; })()"""

HOOK = r"""(() => { window.__said = []; const el = document.getElementById('say'); let last = '';
  window.__hook = () => { const t = el.textContent; if (t && t !== last && el.classList.contains('show')) { last = t; window.__said.push({ t, m: (%s) }); } else if (!t) last = ''; }; })()""" % MECH.strip()


async def main():
    for lvl in LV:
        for game in range(GAMES):
            async with Game(844, 390, scale=1, touch=True, save=SAVE_ALL) as g:
                await g.sec(0.5)
                await g.js("(s) => { let k = s; Math.random = () => { k = (k * 16807) % 2147483647; return k / 2147483647; }; }", (7 + game) * 7919 + lvl)
                await g.js("(l) => { const q = window.__qp; q.UI.sel = l - 1; q.homeRender(); }", lvl)
                await g.tap_el('#btnGo'); await g.pump(2)
                await g.js("() => { const q = window.__qp; q.aiInit(q.S.team[0], q.BOTS['%s'], { aiErr: 1 }); }" % BOT)
                await g.js(HOOK)
                if '--pause' in sys.argv:
                    # 跟 play.py 一樣：每次輪到我，自動玩家先停 0.9 秒（同一個種子 → 跟 play.py 的截圖同一場）
                    for r in range(1, 7):
                        ok = await g.until("S.state !== 'play' || (S.phase === 'aim' && S.turn === 0 && S.round >= %d)" % r, 90)
                        if not ok or (await g.js("window.__qp.S.state")) != 'play': break
                        await g.js("() => { const S = window.__qp.S; window.__bot = S.team[0].ai; S.team[0].ai = null; }")
                        await g.sec(0.9)
                        await g.js("() => { const S = window.__qp.S; S.team[0].ai = window.__bot; }")
                        await g.until("S.state !== 'play' || (S.phase === 'aim' && S.turn === 1)", 90)
                await g.until("S.state !== 'play' || S.round >= 6", 240)
                said = await g.js("window.__said")
                st = await g.js("window.__qp.S.state")
                print(f'== L{lvl} game {game} ({st})')
                for s in said:
                    m = s['m']
                    print(f"  r{m['round']} {m['phase']}: {s['t'][:46]}")
                    print(f"      hang={m['hang']} ropes={m['ropes']} reso={m['reso']} piv={m['piv']} pins={m['pins']} units={m['units']} inplace={m['inplace']}")
                if g.msgs: print('  console:', g.msgs[:4])

asyncio.run(main())
