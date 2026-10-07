"""review3：某個時刻某一塊磚到底靠什麼撐著。動完手腳、等塵埃落定之後，印出離 (x,y) 最近那塊磚的所有接觸（對方是誰、接觸點、法線）。
   python3 test/review3-look/contacts.py <關卡> <手腳：kill=x,y | cut=x,y | bomb=x,y,w> <要看的磚 x,y> [等幾秒=5]"""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from r3 import Session, start_level
async def main():
    lvl = int(sys.argv[1]); act = sys.argv[2]; tx, ty = [float(v) for v in sys.argv[3].split(',')]; wait = float(sys.argv[4]) if len(sys.argv) > 4 else 5
    k, v = act.split('=', 1); v = v.split(',')
    code = {'kill': f"R3.kill({v[0]},{v[1]})", 'cut': f"R3.cut({v[0]},{v[1]})", 'bomb': f"R3.bomb({v[0]},{v[1]},'{v[2] if len(v) > 2 else 'bomb'}')", 'none': '0'}[k]
    async with Session() as s:
        ctx, pg, msgs = await s.page()
        await start_level(pg, lvl, 7, 'expert')
        r = await pg.evaluate("""([code, tx, ty, wait]) => { const q = window.__qp, S = q.S; R3.ff(() => S.phase === 'aim' && S.turn === 0, 60); S.team[0].mute = true; S.team[1].mute = true;
            (new Function('q', 'S', 'R3', 'return ' + code))(q, S, R3);
            for (let i = 0; i < wait * 60; i++) q.simStep(1 / 60);
            const b = R3.at(tx, ty, (o) => !o.frag), bd = b.body, p = bd.getPosition(), out = [];
            const nm = (o) => !o ? 'ground' : o.isBlock ? `block#${o.id} mat${o.mat} ${o.kind} ${o.w.toFixed(1)}x${o.h.toFixed(1)} @(${o.body.getPosition().x.toFixed(2)},${o.body.getPosition().y.toFixed(2)}) a=${o.body.getAngle().toFixed(3)}${o.prop ? ' prop' : ''}${o.frag ? ' frag' : ''}` : `unit s${o.side}#${o.slot} ${o.type} @(${o.x.toFixed(2)},${o.y.toFixed(2)})`;
            for (let ce = bd.getContactList(); ce; ce = ce.next) { const c = ce.contact; if (!c.isTouching()) continue; const wm = c.getWorldManifold(null), m = c.getManifold(); if (!wm) continue; const A = c.getFixtureA().getBody(), other = A === bd ? c.getFixtureB() : c.getFixtureA(); const sgn = A === bd ? 1 : -1;
                out.push({other: nm(other.getUserData()), n: [+(wm.normal.x * sgn).toFixed(2), +(wm.normal.y * sgn).toFixed(2)], pts: wm.points.slice(0, m.pointCount).map(pt => [+pt.x.toFixed(2), +pt.y.toFixed(2)]), sep: wm.separations.slice(0, m.pointCount).map(v => +v.toFixed(3))}); }
            return {me: nm(b), awake: bd.isAwake(), mass: +bd.getMass().toFixed(1), out}; }""", [code, tx, ty, wait])
        print('BLOCK', r['me'], 'awake', r['awake'], 'mass', r['mass'])
        for c in r['out']: print('   touches', c['other'], ' normal(from me)', c['n'], ' points', c['pts'], ' sep', c['sep'])
        await ctx.close()
asyncio.run(main())
