"""第三關「第一輪就贏」在瀏覽器裡（出貨的那個頁面、Chromium 的數學函式）是不是一樣常發生。
   python3 test/review4-sim/l3_browser.py [場數=40] [難度=1]"""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
DIFF = int(sys.argv[2]) if len(sys.argv) > 2 else 1
JS = r"""
async ([N, diff, a, v]) => {
  const q = window.__qp, S = q.S; q.G.freeze = true; let w1 = 0, w = 0; const how = {};
  for (let sd = 0; sd < N; sd++) {
    q.simInit(2, {}, 5550000 + sd * 7919 + 2 * 131, diff, {}); S.on = (t, x, y, c, d, e) => { if (t === 'udie' && c === 1 && S.round === 1) { const k = d + ':how' + e; how[k] = (how[k] || 0) + 1; } };
    let foe = 0; const on = S.on; S.on = (t, s, ...r) => { if (t === 'volley' && s === 1) foe++; return on(t, s, ...r); };
    while (S.state === 'play' && S.round < 30) { if (S.phase === 'aim' && S.turn === 0 && S.phaseT > 0.2) { q.simAim(0, Math.cos(a) * v, Math.sin(a) * v); q.simFire(0); } q.simStep(1 / 60); }
    if (S.state === 'won') { w++; if (!foe) w1++; }
    if (sd % 5 === 4) await new Promise((r) => setTimeout(r, 0));
  }
  q.goHome(); q.G.freeze = false;
  return { N, won: w, firstVolley: w1, how };
}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 844, 'height': 390})).new_page()
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        for (a, v) in [(0.6, 56), (0.9, 52)]:
            r = await pg.evaluate(JS, [N, DIFF, a, v])
            print(f"in Chromium, L3 diff{DIFF}, constant aim ({a} rad, power {v}): won {r['won']}/{r['N']}, by the first volley before the enemy fired: {r['firstVolley']} ({100 * r['firstVolley'] // r['N']}%); round-1 enemy deaths {json.dumps(r['how'])} (how1 = crushed, how5 = out of castle, how6/4 = off the field)")
        await b.close()
asyncio.run(main())
