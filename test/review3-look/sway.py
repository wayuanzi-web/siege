"""review3：第四關正面的鐵甲被炸一下之後晃多久。印出最上面那片鐵甲每 0.25 秒的角度、位置、速度，還有這一輪是什麼時候被判定「塵埃落定」的。
   python3 test/review3-look/sway.py [關卡=4] [x,y,武器=77.5,24,bomb] [秒數=14]"""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from r3 import Session, start_level
async def main():
    lvl = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    x, y, w = (sys.argv[2] if len(sys.argv) > 2 else '77.5,24,bomb').split(',')
    T = float(sys.argv[3]) if len(sys.argv) > 3 else 14
    async with Session() as s:
        ctx, pg, msgs = await s.page()
        await start_level(pg, lvl, 7, 'expert')
        await pg.evaluate("() => { const S = window.__qp.S; R3.ff(() => S.phase === 'aim' && S.turn === 0, 60); S.team[0].mute = true; S.team[1].mute = true; }")
        r = await pg.evaluate("""([x, y, w, T]) => { const q = window.__qp, S = q.S; R3.bomb(x, y, w);
            const iron = S.blocks.filter(b => b.mat === 3 && !b.dead).sort((a, b) => b.y0 - a.y0)[0];
            const out = []; let ended = null, t0 = S.time, ph = S.phase;
            for (let i = 0; i <= T * 60; i++) {
                if (i % 15 === 0) { const p = iron.body.getPosition(), v = iron.body.getLinearVelocity(); out.push([+(S.time - t0).toFixed(2), +(iron.body.getAngle() * 57.3).toFixed(2), +(p.x - iron.x0).toFixed(2), +Math.hypot(v.x, v.y).toFixed(2), +iron.body.getAngularVelocity().toFixed(2), iron.body.isAwake() ? 1 : 0, S.phase + S.turn, +S.quietT.toFixed(2)]); }
                q.simStep(1 / 60);
                if (S.phase !== ph) { if (ended === null && ph === 'resolve') ended = +(S.time - t0).toFixed(2); ph = S.phase; }
            }
            return {ended, out, h: iron.h}; }""", [float(x), float(y), w, T])
        print('turn judged settled at t+', r['ended'], ' (top iron plate is', r['h'], 'tall)')
        print('  t   angle°  dx   speed  omega awake phase quietT')
        for row in r['out']: print('  ' + '  '.join(str(v).rjust(5) for v in row))
        await ctx.close()
asyncio.run(main())
