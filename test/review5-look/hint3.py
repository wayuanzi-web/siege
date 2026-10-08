"""review5：第三關第二回合那句改過的提示（4fe1f3d）在小螢幕上放不放得下。人的步調的自動玩家打到那句提示出現，截圖並量提示框。"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from start4 import START, start_args
from q4 import Game, label, sheet
OUT = HERE.parent.parent / 'shots' / 'review5'
async def main():
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    tiles = []
    for W, H in ((667, 375), (844, 390)):
        async with Game(W, H, scale=2, save=save) as g:
            await g.sec(0.5); await g.js(START, start_args(3, 21, 'casual'))
            await g.js("() => { const q = window.__qp; q.aiInit(q.S.team[0], Object.assign({}, q.BOTS.casual, { think: 6 }), { aiErr: 1 }); }")
            ok = await g.until("document.getElementById('say').classList.contains('show') && document.getElementById('say').textContent.includes('牆腳')", max_sec=120, step=1)
            await g.pump(30)
            m = await g.js("(() => { const e = document.getElementById('say'), b = e.getBoundingClientRect(), cs = getComputedStyle(e); const others = ['btnFire', 'aimInfo', 'btnShield', 'btnUlt', 'turnChip'].map((id) => { const o = document.getElementById(id); if (!o || o.hidden) return null; const r = o.getBoundingClientRect(); const ox = Math.min(b.right, r.right) - Math.max(b.left, r.left), oy = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top); return ox > 0 && oy > 0 ? id + ':' + Math.round(ox) + 'x' + Math.round(oy) : null; }).filter(Boolean); return { txt: e.textContent, box: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], lines: Math.round(b.height / parseFloat(cs.lineHeight || cs.fontSize)), font: cs.fontSize, vw: innerWidth, vh: innerHeight, clipped: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1, overlaps: others }; })()")
            print(W, H, ok, json.dumps(m, ensure_ascii=False))
            im = await g.shot(None); label(im, f"{W}x{H} L3 round-2 hint (4fe1f3d wording)"); tiles.append(im.resize((1200, round(im.size[1] * 1200 / im.size[0]))))
    sheet(tiles, 1).save(OUT / 'hint3.png'); print('saved', OUT / 'hint3.png')
asyncio.run(main())
