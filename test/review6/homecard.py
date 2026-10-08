"""主畫面關卡卡片：各尺寸、各關量「我方／敵軍」標籤的寬高、頭像大小、點頭像前後標題有沒有跳動；667x375、740x360 各截一張第五、六關。
   python3 test/review6/homecard.py"""
import asyncio, sys, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from q4 import Game
OUT = HERE.parent.parent / 'shots' / 'review6'; OUT.mkdir(parents=True, exist_ok=True)
M = """(() => {
  const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const lb = [...document.querySelectorAll('#liCrew small')].map((e) => r(e));
  const cu = [...document.querySelectorAll('#liCrew .cu')].map((e) => r(e)[2]);
  const card = document.querySelector('.lvinfo'), cb = r(card), sw = document.getElementById('stage').getBoundingClientRect();
  return { lb, cu, name: r(document.getElementById('liName')), card: cb, over: card.scrollWidth > card.clientWidth + 1 || cb[1] + cb[3] > sw.bottom + 1 || cb[1] < sw.top - 1 };
})()"""
async def main():
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    bad = 0
    for W, H in ((844, 390), (667, 375), (740, 360), (932, 430), (1280, 720), (390, 844)):
        async with Game(W, H, scale=2, save=save) as g:
            await g.sec(1.0)
            for lvl in range(1, 7):
                await g.tap_el(f'#lvls > button:nth-child({lvl})'); await g.pump(30)
                m = await g.js(M); jumps = []
                rows = await g.js("[...document.querySelectorAll('#liCrew .grp')].map((r) => r.querySelectorAll('.cu').length)")
                for ri, n in enumerate(rows):
                    for k in range(n):
                        sel = f'#liCrew .grp:nth-child({ri + 1}) .cu:nth-of-type({k + 1})'
                        await g.tap_el(sel); await g.pump(20)
                        m2 = await g.js(M); jumps.append(m2['name'][1] - m['name'][1])
                        await g.tap_el(sel); await g.pump(20)
                        m3 = await g.js(M); jumps.append(m3['name'][1] - m['name'][1])
                lbw = [x[2] for x in m['lb']]; lbh = [x[3] for x in m['lb']]
                ok = max(abs(j) for j in jumps) <= 1 and min(m['cu']) >= 30 and not m['over']
                if not ok: bad += 1
                print(f"{'ok ' if ok else 'BAD'} {W}x{H} L{lvl}: label {lbw}x{lbh}  portraits {min(m['cu'])}-{max(m['cu'])}px  title jump {min(jumps)}..{max(jumps)}px  card {m['card'][2]}x{m['card'][3]}{'  OVERFLOW' if m['over'] else ''}")
                if (W, H) in ((667, 375), (740, 360)) and lvl in (1, 5, 6):
                    c = m['card']; im = await g.shot(None, clip={'x': c[0] - 4, 'y': c[1] - 4, 'width': c[2] + 8, 'height': c[3] + 8}); im.save(OUT / f'card_{W}x{H}_L{lvl}.png')
                    await g.tap_el('#liCrew .grp:nth-child(1) .cu:nth-of-type(1)'); await g.pump(20)
                    c = (await g.js(M))['card']; im = await g.shot(None, clip={'x': c[0] - 4, 'y': c[1] - 4, 'width': c[2] + 8, 'height': c[3] + 8}); im.save(OUT / f'card_{W}x{H}_L{lvl}_tap.png')
                    await g.tap_el('#liCrew .grp:nth-child(1) .cu:nth-of-type(1)'); await g.pump(20)
    print('全部正常' if not bad else f'{bad} 項有問題')
asyncio.run(main())
