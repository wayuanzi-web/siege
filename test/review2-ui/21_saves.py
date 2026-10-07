"""壞掉的存檔：每一種都要開得起來，而且開起來之後畫面上的數字要正常、能進關卡、能結算、能再存回去。
同一個瀏覽器分頁重複用（每個存檔 reload 一次），所以很快。
python3 test/review2-ui/21_saves.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

KEY = 'qianpao-pocheng-1'
BIG = '9' * 400
CASES = [
    '', 'null', 'true', '0', '-1', '"abc"', '[]', '[1,2,3]', '{}', '{', '}{', 'undefined', 'NaN', '{"coins":NaN}', "{'coins':5}", '\u0000', ' ', '[[[[[[[[[[]]]]]]]]]]',
    '{"coins":null,"open":null,"stars":null,"up":null,"diff":null,"sfx":null,"mus":null,"vib":null,"seen":null,"flip":null}',
    '{"coins":"1e3","open":"0x5","diff":"2"}', '{"coins":1e308,"open":1e308}', '{"coins":-1e308,"open":-1e308}', '{"coins":"Infinity","open":"Infinity"}', '{"coins":"-Infinity","open":"-Infinity"}',
    '{"coins":"' + BIG + '","open":"' + BIG + '"}', '{"coins":' + BIG + '}', '{"coins":0.0000001,"open":0.9999}', '{"coins":-0,"open":-0}', '{"coins":[5],"open":[3]}', '{"coins":[1,2],"open":[1,2]}', '{"coins":{"a":1},"open":{"a":1}}',
    '{"coins":true,"open":true}', '{"coins":"","open":""}', '{"coins":" 12 ","open":" 3 "}', '{"coins":"12abc","open":"3abc"}',
    '{"stars":[3,3,3,3,3,3],"open":1}', '{"stars":[0,0,0,0,0,3]}', '{"stars":[null,"2",2.9,-1,1e9,"x",3,3,3]}', '{"stars":"333333"}', '{"stars":{"0":3,"length":6}}', '{"stars":[]}', '{"stars":[[3],[2]]}', '{"stars":[true,false,true]}', '{"stars":[1e400,-1e400]}',
    '{"up":{"dmg":"5","aim":"abc","hp":true,"shield":[3],"ult":{"a":1}}}', '{"up":{"rate":4}}', '{"up":{"rate":"x"}}', '{"up":{"aim":null,"rate":4}}', '{"up":[5,5,5,5,5]}', '{"up":"dmg"}', '{"up":5}', '{"up":{"dmg":99,"aim":99,"hp":99,"shield":99,"ult":99}}', '{"up":{"dmg":-99,"aim":-99,"hp":-99,"shield":-99,"ult":-99}}', '{"up":{"dmg":1e400,"hp":-1e400}}', '{"up":{"dmg":4.99,"aim":0.5,"hp":"2.7"}}',
    '{"diff":0}', '{"diff":2}', '{"diff":3}', '{"diff":-1}', '{"diff":1.5}', '{"diff":"0"}', '{"diff":[2]}',
    '{"sfx":false,"mus":false,"vib":false,"seen":true,"seenUlt":true,"seenSh":true,"flip":true}', '{"sfx":0,"mus":"","vib":"false","seen":"false","flip":"no"}',
    '{"__proto__":{"coins":5,"open":6}}', '{"up":{"__proto__":{"dmg":3}},"constructor":{"prototype":{"x":1}}}', '{"toString":5,"valueOf":7,"hasOwnProperty":1}',
    '{"open":7}', '{"open":0}', '{"open":-1}', '{"open":1e9}', '{"open":6,"stars":[0,0,0,0,0,0]}', '{"coins":50}', '{"coins":9999999}', '{"coins":10000000}',
    json.dumps({"coins": 1234, "stars": [3, 2, 1, 0, 0, 0], "open": 4, "up": {"dmg": 2, "aim": 1, "hp": 3, "shield": 0, "ult": 5}, "sfx": True, "mus": False, "vib": True, "seen": True, "seenUlt": True, "seenSh": False, "diff": 2, "flip": False}),
]

CHECK = """(() => { const q = window.__qp; if (!q) return {fatal: 'NO __qp (boot crashed)'};
  const SV = q.SV, bad = [], fin = (v) => typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
  if (!fin(SV.coins) || SV.coins < 0 || SV.coins > 9999999) bad.push('coins=' + SV.coins);
  if (!fin(SV.open) || SV.open < 1 || SV.open > 6) bad.push('open=' + SV.open);
  if (!Array.isArray(SV.stars) || SV.stars.length !== 6 || SV.stars.some((s) => !fin(s) || s < 0 || s > 3)) bad.push('stars=' + JSON.stringify(SV.stars));
  for (const k of ['dmg', 'aim', 'hp', 'shield', 'ult']) if (!fin(SV.up[k]) || SV.up[k] < 0 || SV.up[k] > 5) bad.push('up.' + k + '=' + SV.up[k]);
  if (Object.keys(SV.up).length !== 5) bad.push('up keys=' + Object.keys(SV.up));
  if (![0, 1, 2].includes(SV.diff)) bad.push('diff=' + SV.diff);
  for (const k of ['sfx', 'mus', 'vib', 'seen', 'seenUlt', 'seenSh', 'flip']) if (typeof SV[k] !== 'boolean') bad.push(k + '=' + SV[k]);
  // 畫面上的字
  const txt = document.getElementById('home').innerText; if (/NaN|undefined|Infinity|null|\\[object/.test(txt)) bad.push('home text: ' + txt.replace(/\\s+/g, ' ').slice(0, 80));
  if (document.querySelectorAll('#lvls button').length !== 6) bad.push('level buttons=' + document.querySelectorAll('#lvls button').length);
  const locked = [...document.querySelectorAll('#lvls button')].filter((b) => b.classList.contains('locked')).length; if (locked !== 6 - SV.open) bad.push('locked=' + locked + ' open=' + SV.open);
  if (q.UI.sel !== Math.min(5, Math.max(0, SV.open - 1))) bad.push('sel=' + q.UI.sel);
  if (document.getElementById('btnGo').disabled) bad.push('出戰 disabled on boot');
  if (!(q.RD.frame > 3)) bad.push('main loop not running, frames=' + q.RD.frame);
  if (q.G.mode !== 'home') bad.push('mode=' + q.G.mode);
  // 強化
  document.getElementById('btnShop').click(); const shop = [...document.querySelectorAll('#upList button')].map((b) => b.textContent); document.querySelector('#shop [data-close]').click();
  if (shop.length !== 5 || shop.some((t) => !/^(80|150|240|360|520|已滿)$/.test(t))) bad.push('shop=' + shop.join('|'));
  // 進關卡（選到的那一關），打贏，結算
  q.G.freeze = true; q.startLevel(q.UI.sel); const S = q.S, T = S.team[0];
  for (const v of [T.dmg, T.hpMul, T.shield.gain, T.shield.c, T.ult.gain, q.RD.aimT, T.aim[0], T.aim[1]]) if (!(typeof v === 'number' && isFinite(v))) bad.push('team value ' + v);
  for (const u of S.units) if (!(u.hp > 0 && isFinite(u.hp))) bad.push('unit hp ' + u.hp);
  let n = 0; while (n++ < 200 && S.phase !== 'aim') q.advance(1 / 60);
  for (const u of S.team[1].units) q.killUnit(u, 0, 0);
  n = 0; while (n++ < 400 && q.G.mode === 'play') { q.advance(1 / 60); if (q.G.endT > 4.3) break; }
  return {bad, SV: JSON.stringify(SV), endT: +q.G.endT.toFixed(1), frames: q.RD.frame}; })()"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, dsf=1)
        nbad = 0
        for i, raw in enumerate(CASES):
            await pg.evaluate("([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }", [KEY, raw])
            msgs.clear()
            await pg.reload(); await pg.wait_for_timeout(350)
            try:
                r = await pg.evaluate(CHECK)
            except Exception as e:
                r = {'fatal': repr(e)[:200]}
            if 'fatal' not in r:
                # 真實時間裡等結算跳出來、存檔寫回去
                await pg.evaluate("window.__qp.G.freeze = false")
                try:
                    await pg.wait_for_function("window.__qp.G.mode === 'result'", timeout=3000)
                except Exception: r['bad'].append('result screen never appeared')
                res = await pg.evaluate("(() => { const t = document.getElementById('result').innerText; return {txt: t.replace(/\\s+/g, ' ').slice(0, 70), saved: localStorage.getItem('qianpao-pocheng-1')}; })()")
                if any(w in res['txt'] for w in ('NaN', 'undefined', 'Infinity', 'null')): r['bad'].append('result text: ' + res['txt'])
                try:
                    sv = json.loads(res['saved'])
                    if not (isinstance(sv['coins'], int) and 0 <= sv['coins']): r['bad'].append('saved coins ' + str(sv['coins']))
                    if sv['coins'] > 9999999: r['note'] = 'coins after reward = %d (over the 9,999,999 load cap; reload clamps it)' % sv['coins']
                except Exception as e: r['bad'].append('saved json: ' + repr(res['saved'])[:80])
            ok = 'fatal' not in r and not r['bad'] and not msgs
            if not ok: nbad += 1
            print(('ok  ' if ok else '!!  ') + repr(raw[:64]) + ('…' if len(raw) > 64 else ''), '=>', (r.get('SV') or '')[:150] if ok else pj({k: v for k, v in r.items() if k != 'SV'}), r.get('note', ''), msgs if msgs else '', flush=True)
        print(f'\n{len(CASES)} saves, {nbad} with problems')
        await b.close()

asyncio.run(main())
