"""少見的畫面路徑有沒有例外：把 fxOn / uiEvent 處理的每一種事件各丟一次（六關都丟），再塞幾個飛行物（氣球、天燈四種、光球、結界）、
   決戰時刻、援軍復活、魔王掉出戰場，每次都推進並重畫，最後看 console / page error。
   python3 test/review-ui/14_events.py"""
import asyncio, json
from playwright.async_api import async_playwright
from common import *

FUZZ = """((lv) => { const q = window.__qp, S = q.S, W = q.WPN, st0 = S.st[0], st1 = S.st[1], blk = S.blocks[5], out = [];
  const E = [['fire', 20, 30, 0, 0, 1], ['fire', 90, 30, 1, 6, 1], ['boom', 60, 30, 3, 0, 0, 1], ['boom', 60, 30, 8, 2, 1, 102], ['boom', 60, 30, 0, 1, 0, 1], ['boom', 60, 30, 4, 4, 0, 0.3], ['boom', 60, 30, 9, 9, 2, 1],
    ['cell', blk.x0, blk.y0, blk.mat, 1, 99, blk], ['cell', blk.x0, blk.y0, 5, 1, 0, blk], ['crack', 50, 20, 2], ['gate', 48, 36, 3, 0, 0], ['gate', 48, 36, 20, 2, 1], ['gbad', 60, 30], ['ghit', 60, 30, 1],
    ['gbreak', 60, 30, 1, 1], ['gbreak', 60, 30, 0, 1], ['gbreak', 60, 30, 2, 3], ['gbreak', 60, 30, 3, 4], ['gspawn', 60, 30, 0, 3], ['gspawn', 60, 30, 1, 2], ['gspawn', 60, 30, 2, 10], ['gspawn', 60, 30, 3, 2],
    ['thud', 30, 5, 3000, 12], ['udie', 20, 30, 0, 'rocket', 0, 1], ['udie', 90, 30, 1, 'boss', 1, 1], ['udie', 90, 30, 1, 'ice', 4, 2], ['udie', 90, 30, 1, 'fire', 3, 2], ['yelp', 20, 30, 0, 0], ['yelp', 90, 30, 1, 1], ['uland', 20, 30],
    ['zap', 90, 20, 78, 1], ['spark', 90, 20], ['ignite', 90, 20], ['lit', 56, 20], ['shield', st0.cx, 20, 0], ['shieldhit', 30, 40, 0], ['shieldhit', 80, 40, 1], ['ult', st0.cx, 20, 0], ['ult', st1.cx, 20, 1], ['ultarm', st0.cx, 20, 0], ['ultarm', st1.cx, 20, 1], ['ultoff', 0],
    ['shieldoff', 0], ['skip', 20, 30, 0, 0], ['skip', 20, 30, 0, 1], ['freeze', 20, 30, 0], ['freeze', 90, 30, 1], ['chain', 14, 0], ['chain', 40, 1], ['turn', 0, 3], ['turn', 1, 3], ['volley', 0, 1], ['round', 3], ['lanternoff', 56, 40],
    ['orbgo', 60, 22], ['port', 46, 29, 0, 0], ['port', 93, 48, 0, 1], ['ping', 104, 45], ['flak', 90, 20, 70, 30, 1, 1], ['flak', 90, 20, 70, 30, 0, 0], ['pop', 60, 25, 0, 1], ['pop', 60, 25, 0, 0], ['launch', 90, 30, 1], ['launch', 20, 30, 0], ['drop', 20, 44], ['lantern', 56, 47, 'heal'],
    ['bonus', 56, 47, 0, 'heal'], ['bonus', 56, 47, 1, 'rage'], ['bonus', 56, 47, 0, 'charge'], ['bonus', 56, 47, 1, 'troop'], ['revive', 20, 30, 0, 1], ['build', 20, 30], ['orb', 87, 40], ['orbdie', 60, 22], ['bar', 70, 30], ['barbreak', 70, 30], ['barup', 90, 20],
    ['erupt', 56, -3, 48], ['rockwarn', 20, 0], ['rockstop', 20, 47, 0], ['rockstop', 90, 47, 1], ['rumble'], ['dirt', 56, 0], ['tick', 60, 30, 0], ['bossback', st1.cx, 50], ['phase', 2], ['phase', 3], ['sudden'], ['wind', -9], ['say', '測試提示', 1], ['mystery-event', 1, 2, 3]];
  for (const e of E) { try { S.on.apply(null, e); q.advance(1 / 30); } catch (err) { out.push(e[0] + ': ' + err.message); } }
  // 飛行物、結界
  try {
    S.objs.push({t: 'balloon', side: 1, x: 60, y: 24, r: 3.6, hp: 30, st: 'hover', hx: 60, hy: 24, n: 3, cd: 0, flash: 1, dir: -1, age: 0, tgx0: st0.x0, tgx1: st0.x1});
    S.objs.push({t: 'balloon', side: 0, x: 50, y: 30, r: 3.6, hp: 30, st: 'out', hx: 52, hy: 24, n: 2, cd: 0, flash: 0, dir: 1, age: 0, tgx0: st1.x0, tgx1: st1.x1});
    for (const [k, kind] of ['heal', 'rage', 'charge', 'troop'].entries()) S.objs.push({t: 'lantern', x: 44 + k * 6, y: 40, by0: 40, r: 3.2, hp: 1, kind, by: -1, age: 0, bornR: S.round - (k & 1)});
    S.objs.push({t: 'orb', side: 1, x: 70, y: 30, hx: 64, hy: 22, tx: st0.cx, ty: 20, r: 4.2, hp: 40, hm: 60, st: 'hover', flash: 1, age: 0});
    S.objs.push({t: 'barrier', x: st1.cx, y: st1.y0 + st1.h * 0.45, R: Math.max(st1.w, st1.h) * 0.62 + 4, regen: 2, flash: 0, open: 1, segs: [[2.83, 3.67], [2.30, 2.83], [1.66, 2.30]].map((l, k) => ({a0: l[0], a1: l[1], hp: 30 + k * 15, hm: 60, dead: k === 2 ? 1 : 0, on: k !== 1, lvl: k === 1 ? 0 : 1, flash: k ? 0 : 1})) });
    S.marks.push({x: 20, big: false, t0: S.time}, {x: 50, big: true, t0: S.time});
    S.sudden = true; S.team[0].rage = 1; S.team[1].ult.armed = true; S.team[0].shield.on = true; S.team[1].shield.on = true;
    S.team[0].units[0].frozen = 1; S.team[0].units[1].stun = 1; S.team[1].units[0].frozen = 1; S.team[1].units[0].hp *= 0.2;
    q.advance(0.5);
  } catch (err) { out.push('objs: ' + err.message); }
  return out; })"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390)
        await pg.evaluate("(() => { const q = window.__qp; q.SV.seen = true; q.SV.open = 6; q.G.freeze = true; })()")
        for lv in range(6):
            await pg.evaluate("(l) => { const q = window.__qp, S = q.S; q.startLevel(l); let n = 0; while (n++ < 300 && !(S.phase === 'aim' && S.turn === 0)) q.advance(1 / 30); }", lv)
            r = await pg.evaluate(FUZZ + "(%d)" % lv)
            await pg.screenshot(path=shot_path(f'events_L{lv + 1}'))
            # 我方的兵全倒 → 援軍復活的畫面；然後一路打到結束
            r2 = await pg.evaluate("""(() => { const q = window.__qp, S = q.S, out = []; try { q.killUnit(S.team[0].units[0], 1, 0); q.advance(0.3);
              S.objs.push({t: 'lantern', x: 50, y: 30, by0: 30, r: 3.2, hp: 0, kind: 'troop', by: 0, age: 0, bornR: S.round}); q.advance(1.0);
              S.round = 30; q.advance(2.0); } catch (err) { out.push(err.message); } return out; })()""")
            print(f'L{lv + 1}: exceptions from events:', r, r2, '| console/page errors so far:', len(msgs), flush=True)
        # 主畫面的示範戰局也丟一輪事件
        await pg.evaluate("window.__qp.goHome()")
        r = await pg.evaluate(FUZZ + "(0)")
        print('home/demo: exceptions:', r, '| toast shown in demo?', await pg.evaluate("document.getElementById('say').className"), flush=True)
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
