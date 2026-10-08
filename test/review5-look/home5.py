"""review5 第 8(d) 項：主畫面的關卡卡片（短說明＋我方／敵軍兩排頭像，點頭像看那個兵會什麼）。
   三種尺寸 × 六關：用真的觸控點關卡、點每一個頭像、再點一次；量版面（卡片有沒有超出畫面、說明文字有沒有被切掉、卡片有沒有蓋到別的按鈕、
   頭像多大、點了之後卡片高度跳多少），並截圖排成一張表。另外用只開到第一關的存檔看鎖住的關卡。
   python3 test/review5-look/home5.py [--sizes=844x390,667x375,390x844]"""
import asyncio, sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'review4-look'))
from q4 import Game, parse_opts, label, sheet, upright
OUT = HERE.parent.parent / 'shots' / 'review5'

MEASURE = r"""
(() => {
  const $ = (id) => document.getElementById(id), q = window.__qp, vw = innerWidth, vh = innerHeight;
  const R = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
  const card = document.querySelector('.lvinfo'), tip = $('liTip'), cr = [...document.querySelectorAll('#liCrew .cu')], rc = R(card);
  const vis = (el) => { const cs = getComputedStyle(el); return !el.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0; };
  const flags = [];
  if (rc[0] < -1 || rc[1] < -1 || rc[2] > vw + 1 || rc[3] > vh + 1) flags.push('card outside viewport ' + rc.join(','));
  // 說明文字有沒有被切掉（用未旋轉的版面尺寸比）
  if (tip.scrollHeight > tip.clientHeight + 1 || tip.scrollWidth > tip.clientWidth + 1) flags.push('tip clipped ' + tip.scrollHeight + '>' + tip.clientHeight);
  const inter = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  // 卡片跟卡片外面的按鈕有沒有疊到
  for (const b of document.querySelectorAll('#home button')) { if (!vis(b) || card.contains(b)) continue; const rb = R(b), a = inter(rc, rb); if (a > 4) flags.push('card overlaps button "' + (b.textContent || b.id).trim().slice(0, 8) + '" by ' + a + 'px²'); }
  // 頭像：大小、有沒有在卡片裡、彼此有沒有疊到
  const rs = cr.map(R); let minSize = 999;
  rs.forEach((r, i) => { const w = r[2] - r[0], h = r[3] - r[1]; minSize = Math.min(minSize, w, h); if (r[0] < rc[0] - 1 || r[1] < rc[1] - 1 || r[2] > rc[2] + 1 || r[3] > rc[3] + 1) flags.push('portrait ' + i + ' outside card'); if (r[0] < 0 || r[1] < 0 || r[2] > vw || r[3] > vh) flags.push('portrait ' + i + ' outside viewport'); for (let j = i + 1; j < rs.length; j++) if (inter(r, rs[j]) > 2) flags.push('portraits ' + i + '/' + j + ' overlap'); });
  const fs = (el) => +parseFloat(getComputedStyle(el).fontSize).toFixed(1);
  return { vw, vh, rot: q.G.rot, card: rc, cardH: card.offsetHeight, cardW: card.offsetWidth, tip: tip.textContent, tipLines: Math.round(tip.clientHeight / parseFloat(getComputedStyle(tip).lineHeight)), tipFont: fs(tip), labelFont: cr.length ? fs(document.querySelector('#liCrew small')) : 0, n: cr.length, minSize, pressed: cr.map((b) => b.getAttribute('aria-pressed') === 'true' ? 1 : 0).join(''), labels: cr.map((b) => b.getAttribute('aria-label')), go: $('btnGo').disabled ? 'disabled' : 'enabled', name: $('liName').textContent, flags };
})()
"""

async def run_size(W, H, opt):
    save = {'coins': 0, 'stars': [3, 2, 1, 0, 0, 0], 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    tiles = []; rows = []; allflags = []
    async with Game(W, H, scale=2, save=save) as g:
        await g.sec(1.0)
        for lvl in range(1, 7):
            ok = await g.tap_el(f'#lvls > button:nth-child({lvl})'); await g.pump(30)
            m0 = await g.js(MEASURE)
            im = upright(await g.shot(None), m0['rot']); label(im, f"{W}x{H} L{lvl} tip ({m0['tipLines']} lines, font {m0['tipFont']}px, portraits {m0['minSize']}px)", '; '.join(m0['flags'])[:90] or 'layout ok'); tiles.append(im)
            allflags += [(lvl, 'tip', f) for f in m0['flags']]
            dh = []; texts = []; bad = []
            for i in range(m0['n']):
                sel = f'#liCrew .cu >> nth={i}'
                r = await g.js("(i) => { const b = document.querySelectorAll('#liCrew .cu')[i].getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", i)
                await g.tap(r[0], r[1]); await g.pump(20)
                m = await g.js(MEASURE)
                dh.append(m['cardH'] - m0['cardH']); texts.append(m['tip'])
                if m['pressed'][i] != '1': bad.append(f'portrait {i} tap did not select (pressed={m["pressed"]})')
                exp = m0['labels'][i].split('：', 1)[1] if '：' in m0['labels'][i] else ''
                if exp and m['tip'].rstrip('。') not in exp.replace('。', '：', 1) and exp.split('。')[0] not in m['tip']: bad.append(f'portrait {i}: text {m["tip"][:20]} does not match {exp[:20]}')
                allflags += [(lvl, f'blurb{i}', f) for f in m['flags']]
                if i == m0['n'] - 1 or len(m['tip']) >= max(len(t) for t in texts):
                    keep = (m, upright(await g.shot(None), m['rot']))
            m, im2 = keep
            label(im2, f"{W}x{H} L{lvl} portrait tapped: card height change {min(dh):+d}..{max(dh):+d}px", (m['tip'][:44] + ' | ' + '; '.join(m['flags']))[:110]); tiles.append(im2)
            # 再點一次同一個：回到關卡說明
            last = m0['n'] - 1
            r = await g.js("(i) => { const b = document.querySelectorAll('#liCrew .cu')[i].getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }", last)
            await g.tap(r[0], r[1]); await g.pump(20); m1 = await g.js(MEASURE)
            if m1['pressed'][last] != '1': await g.tap(r[0], r[1]); await g.pump(20); m1 = await g.js(MEASURE)      # 上面最後留下來的可能不是最後一個
            await g.tap(r[0], r[1]); await g.pump(20); m2 = await g.js(MEASURE)
            back = m2['tip'] == m0['tip'] and '1' not in m2['pressed']
            rows.append({'lvl': lvl, 'name': m0['name'], 'tipLen': len(m0['tip']), 'tipLines': m0['tipLines'], 'tipFont': m0['tipFont'], 'labelFont': m0['labelFont'], 'portraits': m0['n'], 'minPortrait': m0['minSize'], 'cardH': m0['cardH'], 'dH': [min(dh), max(dh)], 'longestBlurb': max(len(t) for t in texts), 'tapBackRestores': back, 'bad': bad, 'flags': m0['flags']})
            print(json.dumps(rows[-1], ensure_ascii=False), flush=True)
        print('console:', g.msgs[:4])
    # 鎖住的關卡
    save2 = dict(save, open=1, stars=[0] * 6)
    async with Game(W, H, scale=2, save=save2) as g:
        await g.sec(1.0)
        for lvl in (3, 6):
            await g.tap_el(f'#lvls > button:nth-child({lvl})'); await g.pump(30); m = await g.js(MEASURE)
            im = upright(await g.shot(None), m['rot']); label(im, f"{W}x{H} L{lvl} LOCKED: go {m['go']}, portraits {m['n']}", (m['tip'][:40] + ' | ' + '; '.join(m['flags']))[:110]); tiles.append(im)
            print(json.dumps({'locked': lvl, 'tip': m['tip'], 'go': m['go'], 'portraits': m['n'], 'flags': m['flags']}, ensure_ascii=False), flush=True)
            allflags += [(lvl, 'locked', f) for f in m['flags']]
    out = sheet(tiles, 4 if W > H else 5, max_w=2400); f = OUT / f'home5_{W}x{H}.png'; out.save(f); print('saved', f, out.size)
    print(f'{W}x{H}: layout flags {len(allflags)}:', allflags[:12])

async def main():
    args, opt = parse_opts(sys.argv[1:])
    for s in opt.get('sizes', '844x390,667x375,390x844').split(','):
        W, H = [int(x) for x in s.split('x')]; await run_size(W, H, opt)
asyncio.run(main())
