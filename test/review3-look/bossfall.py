"""review3：魔王摔一層到底扣多少血。把他腳下的樓板整片打掉（一層、兩層），或是只打掉一格、兩格，印出前後的血量。"""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from r3 import Session, start_level
CASES = [
    ('whole top slab (falls 1 floor)', "R3.kill(89.9,28.9)"),
    ('top slab then lower slab (falls 2 floors)', "R3.kill(89.9,28.9); R3.later(1.5, () => R3.kill(89.9,18.7))"),
    ('one cell under his centre', "R3.cut(89.9,28.9)"),
    ('two cells: centre + front', "R3.cut(89.9,28.9); R3.later(0.3, () => R3.cut(86.5,28.9))"),
    ('two cells: centre + back', "R3.cut(89.9,28.9); R3.later(0.3, () => R3.cut(93.3,28.9))"),
    ('three cells: centre + both sides', "R3.cut(89.9,28.9); R3.later(0.3, () => R3.cut(86.5,28.9)); R3.later(0.6, () => R3.cut(93.3,28.9))"),
    ('front cell only (slab tips)', "R3.cut(83.1,28.9)"),
    ('both front posts of the hall (roof drops on him)', "R3.kill(83.1,34); R3.later(0.3, () => R3.kill(96.7,34))"),
    ('one bomb straight down on the roof', "R3.shot(89.9,52,0,-30,'bomb',1)"),
    ('one bomb direct hit on the boss (roof removed first)', "R3.kill(89.9,39); R3.later(0.6, () => R3.shot(89.9,52,0,-30,'bomb',1))"),
    ('one rocket volley (2) direct on the boss (roof removed first)', "R3.kill(89.9,39); R3.later(0.6, () => { R3.shot(89.9,52,0,-30,'rocket',1); R3.shot(89.5,54,0,-30,'rocket',1); })"),
]
async def main():
    async with Session() as s:
        for name, code in CASES:
            ctx, pg, msgs = await s.page()
            await start_level(pg, 6, 7, 'expert')
            r = await pg.evaluate("""(code) => { const q = window.__qp, S = q.S; R3.ff(() => S.phase === 'aim' && S.turn === 0, 60); S.team[0].mute = true; S.team[1].mute = true;
                const bu = S.team[1].units.find(u => u.type === 'boss'), hp0 = bu.hp, y0 = bu.y, x0 = bu.x;
                R3.resolve(); (new Function('q', 'S', 'R3', code))(q, S, R3);
                for (let i = 0; i < 6 * 60; i++) { while (R3.sched.length && R3.sched[0].t <= S.time + 1e-9) R3.sched.shift().fn(); q.simStep(1 / 60); }
                return {hp0: +hp0.toFixed(1), hp1: +bu.hp.toFixed(1), max: +bu.hpMax.toFixed(1), y0: +y0.toFixed(1), y1: +bu.y.toFixed(1), x0: +x0.toFixed(1), x1: +bu.x.toFixed(1), bar: Math.round(q.teamBar(1) * 100), phase: S.boss.phase}; }""", code)
            print(f"{name:62s} hp {r['hp0']} -> {r['hp1']} of {r['max']}  (-{(r['hp0'] - r['hp1']) / r['max'] * 100:.1f}%)  y {r['y0']} -> {r['y1']}  x {r['x0']} -> {r['x1']}  bar {r['bar']}%  phase {r['phase']}")
            await ctx.close()
asyncio.run(main())
