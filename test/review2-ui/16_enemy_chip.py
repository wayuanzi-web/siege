"""敵軍回合的回合牌（#turnChip）：「敵軍瞄準了 ×N 倍增符！」的 N 對不對、會不會閃來閃去、開火之後會不會留著。
第五關（黃金符 ×10 第 4、7、10 回合出現）和第六關（第三階段的黃金符 ×20）各跑很多局；我方每回合照預設角度隨便打。
每個敵軍回合記：回合牌依序出現過哪些字、AI 選定的彈道預估倍數（A.mult）、真的開火之後敵軍砲彈實際穿過了哪些符。
python3 test/review2-ui/16_enemy_chip.py [局數=14] [關卡=4,5]"""
import asyncio, sys
from playwright.async_api import async_playwright
from common import *

RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 14
LVS = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else [4, 5]

RUN = """(([lv, maxRound, seed]) => { const q = window.__qp, S = q.S, G = q.G; G.freeze = true; q.SV.seen = true; q.SV.open = 6; q.startLevel(lv);
  const chip = document.getElementById('turnChip'), turns = []; let cur = null;
  const old = S.on; S.on = (t, a, b, c, d, e, f) => { if (t === 'gate' && e === 1 && cur) cur.passed.push(c + '/' + d); old(t, a, b, c, d, e, f); };
  if (lv === 5) { const bu = S.team[1].units.find(u => u.type === 'boss'); bu.hp = bu.hpMax * 0.38; }       // 魔王直接進第三階段（黃金符 ×20）
  for (const u of S.team[0].units) { u.hpMax *= 50; u.hp = u.hpMax; }                                         // 我方打不死，才撐得到後面的回合
  let n = 0, prevKey = '';
  while (n++ < 60 * 400 && S.state === 'play' && S.round <= maxRound) {
    if (S.phase === 'aim' && S.turn === 0) { q.simAim(0, 20 + (n * 7 % 30), 30 + (n * 13 % 40)); q.simFire(0); }
    q.simStep(1 / 60); q.hudUpdate();
    const key = S.round + ':' + S.turn + ':' + S.phase;
    if (S.turn === 1 && S.phase === 'aim') {
      if (!cur || cur.round !== S.round) { cur = {round: S.round, seq: [], pred: null, st2: 0, armed: S.team[1].ult.armed, passed: [], gold: S.gates.filter(g => g.owner === 2 && !g.dead).map(g => 'x' + g.mult), after: null, afterCls: null}; turns.push(cur); }
      const txt = chip.hidden ? '(hidden)' : chip.textContent, last = cur.seq[cur.seq.length - 1];
      if (!last || last.txt !== txt) cur.seq.push({txt, cls: chip.className.replace('chamfer ', ''), frames: 1}); else last.frames++;
      const A = S.team[1].ai; if (A.st === 2) { cur.st2++; cur.pred = A.mult; }
    } else if (cur && S.turn === 1 && S.phase === 'volley' && cur.after === null) { cur.after = chip.textContent; cur.afterCls = chip.className; }
    prevKey = key;
  }
  return {rounds: S.round, state: S.state, turns}; })"""


async def main():
    async with async_playwright() as p:
        b, ctx, pg, msgs = await open_page(p, 844, 390, dsf=1)
        tot = {'turns': 0, 'warn': 0, 'warnTrue': 0, 'warnFalse': 0, 'silentGold': 0, 'flicker': 0, 'stale': 0, 'wrongN': 0, 'goldTurns': 0}
        examples = {'warnFalse': [], 'silentGold': [], 'flicker': [], 'wrongN': [], 'stale': []}
        for lv in LVS:
            for run in range(RUNS):
                r = await pg.evaluate(RUN, [lv, 11 if lv == 4 else 9, run])
                for t in r['turns']:
                    tot['turns'] += 1
                    texts = [s['txt'] for s in t['seq']]
                    warn = [s for s in t['seq'] if '倍增符' in s['txt']]
                    passed_gold = any(x.endswith('/2') for x in t['passed'])
                    if t['gold']: tot['goldTurns'] += 1
                    # 閃：同一句出現兩次以上（中間換成別的又換回來）
                    if len(texts) != len(set(texts)): tot['flicker'] += 1; examples['flicker'].append((lv + 1, t['round'], [(s['txt'], s['frames']) for s in t['seq']]))
                    if t['after'] is not None and (t['after'] != '敵軍砲擊' or 'warn' in (t['afterCls'] or '')): tot['stale'] += 1; examples['stale'].append((lv + 1, t['round'], t['after'], t['afterCls']))
                    if warn:
                        tot['warn'] += 1
                        n_said = int(warn[-1]['txt'].split('×')[1].split(' ')[0])
                        gold_mults = [int(g[1:]) for g in t['gold']]
                        if n_said not in gold_mults: tot['wrongN'] += 1; examples['wrongN'].append((lv + 1, t['round'], warn[-1]['txt'], 'gates on field: ' + ','.join(t['gold']), 'A.mult=%s' % t['pred']))
                        if passed_gold: tot['warnTrue'] += 1
                        else: tot['warnFalse'] += 1; examples['warnFalse'].append((lv + 1, t['round'], warn[-1]['txt'], 'shown %d frames' % warn[-1]['frames'], 'enemy shots actually passed: ' + (','.join(sorted(set(t['passed']))) or 'no gate at all')))
                    elif passed_gold and not t['armed']:
                        tot['silentGold'] += 1; examples['silentGold'].append((lv + 1, t['round'], texts, 'A.mult=%s' % t['pred'], 'passed ' + ','.join(sorted(set(t['passed'])))))
                print(f'  L{lv + 1} run {run}: {r["rounds"]} rounds {r["state"]}; enemy turns so far {tot["turns"]}, warnings {tot["warn"]}', flush=True)
        print('\nTOTAL', pj(tot))
        print('  warn chip shown but NO enemy shot went through a gold gate (false alarm): %d of %d warnings' % (tot['warnFalse'], tot['warn']))
        for e in examples['warnFalse'][:8]: print('     ', pj(e))
        print('  enemy shots DID go through a gold gate but the chip never warned: %d' % tot['silentGold'])
        for e in examples['silentGold'][:8]: print('     ', pj(e))
        print('  number on the chip is not the multiplier of any gate on the field: %d' % tot['wrongN'])
        for e in examples['wrongN'][:8]: print('     ', pj(e))
        print('  chip text flip-flopped within one enemy aim phase: %d' % tot['flicker'])
        for e in examples['flicker'][:5]: print('     ', pj(e))
        print('  chip still on a warning / wrong text right after the enemy fired: %d' % tot['stale'])
        for e in examples['stale'][:5]: print('     ', pj(e))
        print('errors:', msgs)
        await b.close()

asyncio.run(main())
