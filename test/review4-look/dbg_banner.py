"""查：分出勝負那一刻的橫幅有沒有出現（每一格記下 #banner 的 class 和不透明度）。"""
import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT, upright

async def main():
    async with Game(844, 390, scale=2) as g:
        await g.sec(1)
        await g.tap_el('#btnGo'); await g.pump(4)
        rows = await g.js("""() => { const out = []; const b = document.getElementById('banner'); for (let i = 0; i < 150; i++) { window.__pump(1); out.push([i, b.className, +(+getComputedStyle(b).opacity).toFixed(2), b.textContent]); } return out.filter((r, i) => i < 12 || i % 10 === 0); }""")
        for r in rows: print(r)
        # 直接讓敵軍全倒
        await g.sec(3)
        await g.js("(() => { const q = window.__qp; for (const u of q.S.team[1].units) q.killUnit(u, 0, 0); })()")
        rows = await g.js("""() => { const out = []; const b = document.getElementById('banner'); const q = window.__qp; for (let i = 0; i < 300; i++) { window.__pump(1); out.push([i, b.className, +(+getComputedStyle(b).opacity).toFixed(2), b.textContent, q.S.state, q.G.mode, +q.G.endT.toFixed(2), +q.FX.slow.toFixed(2)]); if (i === 40) window.__mark = 1; } return out.filter((r, i) => i < 8 || i % 20 === 0); }""")
        for r in rows: print(r)
        print('anims', await g.js("document.getAnimations().map(a => [a.animationName || 'transition', a.playState, Math.round(a.currentTime), a.effect.target.id || a.effect.target.className]).slice(0, 20)"))
asyncio.run(main())
