"""review4：像真人一樣把關卡從頭玩到結算（真的觸控事件 → 真的每一格迴圈），在「重要的時刻」截圖。

  python3 test/review4-look/play4.py --size=844x390 --levels=1,2 --tag=A [--policy=good|naive|bad] [--seed=3] [--fresh=1] [--maxsec=420]

  每一關：主畫面點關卡 → 點「出戰」→ 輪到我：按住拖曳瞄準（先讓一個臨時的自動玩家想好要打哪，再用手指拖過去）、放開 →
          敵軍回合：護罩滿了就按 → … → 結算畫面 → 「下一關」／「再戰」
  截圖時機：輪到誰的牌子、提示、橫幅、跳字換了內容之後幾格；拖曳中；砲彈在天上；有兵倒下；落石；結算。
  輸出：shots/review4/<tag>_L<n>_NN_<why>.png（原尺寸）、<tag>_L<n>_sheet*.png（縮小排在一起）、<tag>_L<n>.json（每一張的狀態）
"""
import asyncio, sys, json, pathlib, time, re
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT, parse_opts, label, sheet, upright, STATE
from layout4 import LAYOUT
from PIL import Image

WATCH = r"""
(() => {
  const q = window.__qp, S = q.S, G = q.G, FX = q.FX, $ = (id) => document.getElementById(id);
  const W = window.__W = { last: {}, due: [], seenPop: {}, log: [], n: 0 };
  const DELAY = { chip: 8, say: 26, banner: 16, mile: 14, res: 12, alive: 8, phase: 6, boss: 10, mode: 10, hint: 20, objs: 20, gates: 24, marks: 20, held: 10, sh: 12, armed: 10, geyser: 40, wind: 30, burn: 30 };
  const op = (el) => { if (!el || el.hidden) return 0; const cs = getComputedStyle(el); return cs.display === 'none' ? 0 : +cs.opacity; };
  const cur = () => {
    const T = S.team[0], E = S.team[1];
    return {
      chip: $('turnChip').hidden ? '' : $('turnChip').textContent,
      say: $('say').classList.contains('show') ? $('say').textContent : '',
      banner: $('banner').classList.contains('show') && op($('banner')) > 0.02 ? $('banner').textContent : '',
      mile: $('mile').classList.contains('show') && op($('mile')) > 0.02 ? $('mile').textContent : '',
      res: $('result').hidden ? '' : $('resTitle').textContent,
      alive: T && E ? T.alive + '/' + E.alive : '',
      phase: S.state === 'play' ? (S.phase === 'hazard' ? 'hazard' + S.hz : '') : S.state,
      boss: S.boss ? 'p' + S.boss.phase : '',
      mode: G.mode,
      hint: $('hint').hidden ? '' : 'hint',
      objs: S.objs.filter((o) => o.t === 'balloon' || o.t === 'orb' || o.t === 'lantern' || o.t === 'barrier').map((o) => o.t + (o.st ? ':' + o.st : '')).join(','),
      gates: S.gates.map((g) => g.owner + 'x' + g.mult).join(','),
      geyser: S.objs.filter((o) => o.t === 'geyser' && o.on).map((o) => 'g' + o.x).join(','),
      wind: S.lv && S.lv.wind ? 'w' + S.wind : '',
      burn: S.nburn > 0 ? 'burning' : '',
      marks: S.marks.length ? 'marks' + S.marks.length : '',
      held: T ? T.units.filter((u) => u.alive && (u.frozen > 0 || u.stun > 0)).map((u) => u.slot + (u.frozen > 0 ? 'F' : 'S')).join('') : '',
      sh: (T && T.shield.on ? 'me' : '') + (E && E.shield.on ? 'foe' : ''),
      armed: (T && T.ult.armed ? 'me' : '') + (E && E.ult.armed ? 'foe' : '')
    };
  };
  W.reset = () => { W.last = cur(); W.due.length = 0; W.seenPop = {}; };
  // 推 maxFrames 格；有該截圖的事（或 stop 條件成立）就提早回來
  window.__run = (maxFrames, stop) => {
    const stopFn = stop ? new Function('q', 'S', 'G', 'return (' + stop + ')') : null;
    for (let i = 0; i < maxFrames; i++) {
      window.__pump(1);
      const now = window.__frames, c = cur();
      for (const k in c) if (c[k] !== W.last[k]) { W.last[k] = c[k]; if (c[k] !== '' || k === 'alive') W.due.push({ at: now + (DELAY[k] || 8), why: k + '=' + c[k] }); }
      // 跳出來的字：每一種第一次出現、還有同時出現很多個的時候
      for (const p of FX.pops) { const key = p.txt.replace(/[0-9]+/g, '#'); if (!W.seenPop[key]) { W.seenPop[key] = 1; W.due.push({ at: now + 9, why: 'pop=' + p.txt }); } }
      if (FX.pops.length >= 4 && !(W.popBusy > now - 90)) { W.popBusy = now; W.due.push({ at: now + 4, why: 'pops' + FX.pops.length }); }
      const d = W.due.filter((e) => e.at <= now);
      if (d.length) { W.due = W.due.filter((e) => e.at > now); return { why: d.map((e) => e.why), frames: i + 1 }; }
      if (stopFn && stopFn(q, S, G)) return { stop: true, why: [], frames: i + 1 };
    }
    return { why: [], frames: maxFrames };
  };
})();
"""

# 臨時的自動玩家：只用來「想好要打哪」，想好就拿掉，角度還原；真正的瞄準和發射用手指拖
PLAN = r"""
([bot, err]) => {
  const q = window.__qp, S = q.S, T = S.team[0];
  if (!(S.state === 'play' && S.phase === 'aim' && S.turn === 0)) return null;
  const keep = [T.aim[0], T.aim[1]];
  q.aiInit(T, Object.assign({}, q.BOTS[bot], { think: 1.2, skill: 0, sh: 0, err: err }), { aiErr: 1 });
  let n = 0;
  while (n++ < 240 && T.ai && T.ai.st !== 2 && S.phase === 'aim') window.__pump(1);
  const A = T.ai; let out = null;
  if (A && A.st === 2) out = { vx: A.px, vy: A.py, mult: A.warn, n };
  T.ai = null; q.simAim(0, keep[0], keep[1]);
  return out;
}
"""


class Rec:
    def __init__(self, g, tag, lvl):
        self.g, self.tag, self.lvl = g, tag, lvl
        self.items = []; self.k = 0

    async def snap(self, why, full=True):
        st = await self.g.state()
        self.k += 1
        short = re.sub(r'[^0-9A-Za-z一-鿿×÷]+', '_', why)[:40].strip('_')
        name = f'{self.tag}_L{self.lvl}_{self.k:03d}_{short}'
        im = await self.g.shot(None)
        im = upright(im, st['rot'])
        if full: im.save(OUT / f'{name}.png')
        lay = await self.g.js(LAYOUT)
        self.items.append({'k': self.k, 'why': why, 'file': name + '.png', 'st': st, 'im': im, 'flags': lay['flags'], 'small': lay['small'], 'lay': lay['items'], 'pops': lay['pops']})
        return st

    def flush(self):
        meta = [{k: v for k, v in it.items() if k != 'im'} for it in self.items]
        (OUT / f'{self.tag}_L{self.lvl}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=0))
        import resheet
        files = [str(OUT / f) for f in resheet.build(f'{self.tag}_L{self.lvl}')]
        self.flagsum = {}
        for it in self.items:
            for kind, msg in it['flags']:
                key = kind + ' ' + re.sub(r'[0-9]+', '#', msg)
                self.flagsum.setdefault(key, []).append((it['k'], msg))
        self.smallsum = {}
        for it in self.items:
            for nm, fz, txt in it['small']: self.smallsum[(nm, fz)] = txt
        return files


async def reseed(g, n):
    await g.js("(seed) => { let s = seed % 2147483646 + 1; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }", n)


async def stage_info(g):
    return await g.js("(() => { const q = window.__qp, G = q.G, V = q.V; const r = document.getElementById('app').getBoundingClientRect(); return {rot: G.rot, ox: G.ox, oy: G.oy, sw: G.sw, sh: G.sh, vw: G.vw, vh: G.vh, k: (V.dpr / V.s) * 1.5, left: r.left, top: r.top}; })()")


def stage_to_client(si, sx, sy):
    if si['rot'] == 1: return (si['vw'] - si['oy'] - sy + si['left'], sx + si['ox'] + si['top'])
    if si['rot'] == -1: return (sy + si['oy'] + si['left'], si['vh'] - si['ox'] - sx + si['top'])
    return (sx + si['ox'] + si['left'], sy + si['oy'] + si['top'])


async def my_turn(g, rec, policy, turn_no, rng):
    """輪到我：瞄準、發射。回傳這一輪做了什麼。"""
    si = await stage_info(g)
    st = await g.state()
    did = {'turn': turn_no}
    plan = None
    if policy == 'good' or (policy == 'naive' and turn_no >= 2):
        plan = await g.js(PLAN, ['expert' if policy == 'good' else 'casual', 1.5 if policy == 'good' else 4])
    await rec.snap(f'myturn{turn_no}_start')
    st = await g.state()
    if st['state'] != 'play' or not (st['phase'] == 'aim' and st['turn'] == 0): return did
    # 連珠滿了就上膛（第一次會有提示叫你按）
    if st['ult'] >= 100 and not st['armed'] and policy != 'bad':
        await g.tap_el('#btnUlt'); await g.pump(12); did['ult'] = 1
        await rec.snap(f'myturn{turn_no}_ult_armed')
    # 按住：舞台左邊中間偏下（不擋到城樓上面的字）
    sx0, sy0 = si['sw'] * 0.36, si['sh'] * 0.62
    cx0, cy0 = stage_to_client(si, sx0, sy0)
    aim0 = st['aim']
    if plan:
        dvx, dvy = plan['vx'] - aim0[0], plan['vy'] - aim0[1]
    elif policy == 'bad':
        dvx, dvy = (rng() - 0.5) * 6, (rng() - 0.2) * 5 + (4 if turn_no == 1 else 0)
        if abs(dvx) + abs(dvy) < 5.5: dvy += 6
    else:   # naive 第一輪：照手勢提示往右上拖一點
        dvx, dvy = 9, 6
    sdx, sdy = dvx / si['k'], -dvy / si['k']
    # 手指不能拖出螢幕：起點挪一下
    sx0 = min(max(sx0, 20 - min(0, sdx)), si['sw'] - 20 - max(0, sdx)); sy0 = min(max(sy0, 20 - min(0, sdy)), si['sh'] - 20 - max(0, sdy))
    cx0, cy0 = stage_to_client(si, sx0, sy0)
    await g.drag_begin(cx0, cy0)
    cdx, cdy = g.to_client(sdx, sdy, si['rot'])
    steps = max(6, int((abs(sdx) + abs(sdy)) / 9))
    await g.drag_to(cx0 + cdx * 0.6, cy0 + cdy * 0.6, steps=steps, frames_per=1)
    await rec.snap(f'myturn{turn_no}_dragging')
    await g.drag_to(cx0 + cdx, cy0 + cdy, steps=max(3, steps // 2), frames_per=1)
    # 微調：跟想打的角度還差多少，再補拖（真人也是看著虛線慢慢修）
    if plan:
        for _ in range(3):
            a = (await g.state())['aim']; ex, ey = plan['vx'] - a[0], plan['vy'] - a[1]
            if abs(ex) + abs(ey) < 0.5: break
            ddx, ddy = g.to_client(ex / si['k'], -ey / si['k'], si['rot'])
            await g.drag_to(g._dx + ddx, g._dy + ddy, steps=3, frames_per=1)
        # 想穿過倍增符：等符亮起來再放手（最多等 7 秒）
        if plan['mult'] > 1:
            lit = await g.until("q.RD.aimMask !== 0", max_sec=7, step=1)
            did['lit'] = lit
    await g.pump(6)
    stb = await rec.snap(f'myturn{turn_no}_before_release')
    did['aim'] = stb['aim']; did['plan'] = plan
    await g.drag_end()
    st2 = await g.state()
    did['fired'] = st2['phase'] != 'aim'
    if not did['fired']:
        # 沒發射出去（拖太短？）：改按「發射」
        await g.tap_el('#btnFire'); await g.pump(2); did['firebtn'] = 1
    return did


async def play_level(g, lvl, tag, policy='good', seed=3, maxsec=420, next_btn=None, select=True):
    rec = Rec(g, tag, lvl)
    s = [seed * 7919 + lvl * 104729 + 17]
    def rng():
        s[0] = (s[0] * 16807) % 2147483647; return s[0] / 2147483647
    st = await g.state()
    if not await g.js("!!window.__W"): await g.js(WATCH)
    if select:
        if st['mode'] != 'home':
            await g.js("window.__qp.goHome()"); await g.pump(20)
        # 點第 lvl 關、再點「出戰」
        ok = await g.tap_el(f'#lvls > button:nth-child({lvl})'); await g.pump(40)
        await rec.snap(f'home_sel{lvl}')
        await g.js("window.__W.reset()")
        await g.seed_const(seed * 1000 + lvl)
        await g.tap_el('#btnGo'); await g.pump(4)
        await g.seed_lcg(seed * 1000 + lvl)
    else: await g.js("window.__W.reset()")
    st = await g.state()
    if st['mode'] != 'play':
        await rec.snap('not_started'); rec.flush(); return {'lvl': lvl, 'error': 'level did not start', 'st': st}, rec
    turn_no = 0; last_round_acted = 0; shield_round = 0; frames0 = st['frames']; log = []; fly_shot = 0; paused = False
    while True:
        st = await g.state()
        if (st['frames'] - frames0) / 60 > maxsec: log.append('TIMEOUT'); break
        if st['mode'] == 'result': break
        # 我的回合
        if st['state'] == 'play' and st['phase'] == 'aim' and st['turn'] == 0 and st['round'] > last_round_acted:
            await g.pump(30)                                          # 人看到「輪到你」要反應一下
            turn_no += 1; last_round_acted = st['round']
            d = await my_turn(g, rec, policy, turn_no, rng); log.append(d); fly_shot = 0
            continue
        # 敵軍瞄準：護罩滿了就按（每回合一次）
        if st['state'] == 'play' and st['phase'] == 'aim' and st['turn'] == 1 and st['sh'] >= 100 and not st['shOn'] and shield_round != st['round'] and policy != 'bad':
            shield_round = st['round']; await g.pump(10)
            await g.tap_el('#btnShield'); await g.pump(14); await rec.snap('shield_pressed'); log.append({'shield': st['round']})
            continue
        # 第一次砲彈在天上：拍一張（看倍增、彈道）
        if st['shots'] > 0 and fly_shot < 2 and st['phase'] in ('volley', 'resolve'):
            fly_shot += 1; await g.pump(10 if fly_shot == 1 else 22); await rec.snap(f"shots_in_air_{'me' if st['turn'] == 0 else 'foe'}{fly_shot}")
            continue
        # 第三回合敵軍砲擊中：暫停一下看暫停選單
        if not paused and st['round'] == 2 and st['phase'] == 'resolve' and st['turn'] == 1 and st['state'] == 'play':
            paused = True
            await g.tap_el('#btnPause'); await g.pump(20); await rec.snap('paused')
            pst = await g.state(); t_before = pst['t']; await g.pump(60); t_after = (await g.state())['t']
            log.append({'pause_mode': pst['mode'], 'time_frozen': t_before == t_after})
            await g.tap_el('#btnResume'); await g.pump(10); await rec.snap('resumed')
            continue
        if st['state'] != 'play' and st['mode'] == 'play':
            await g.pump(36); await rec.snap(f"finale_{st['state']}_endT{st['endT']}")
            continue
        r = await g.js("([n, stop]) => window.__run(n, stop)", [90, "G.mode === 'result' || (S.state === 'play' && S.phase === 'aim' && S.turn === 0 && S.round > %d) || (S.state === 'play' && S.phase === 'aim' && S.turn === 1 && S.team[0].shield.c >= S.team[0].shield.need && !S.team[0].shield.on && S.round !== %d && %s) || (q.SH.n > 0 && %d < 2)" % (last_round_acted, shield_round, 'true' if policy != 'bad' else 'false', fly_shot)])
        if r['why']: await rec.snap('+'.join(r['why'])[:60])
    # 結算畫面
    st = await g.state()
    out = {'lvl': lvl, 'policy': policy, 'state': st['state'], 'mode': st['mode'], 'round': st['round'], 'sec': round((st['frames'] - frames0) / 60), 'turns': turn_no, 'log': log, 'msgs': list(g.msgs)}
    if st['mode'] == 'result':
        await g.pump(14); await rec.snap('result_early')
        await g.pump(110); st = await rec.snap('result_settled')
        out['result'] = await g.js("(() => { const $ = (id) => document.getElementById(id); return {title: $('resTitle').textContent, sub: $('resSub').textContent, stars: document.querySelectorAll('#resStars .on').length, starsHidden: $('resStars').hidden, bar: $('rsBar').textContent, rounds: $('rsRounds').textContent, chain: $('rsChain').textContent, swarm: $('rsSwarm').textContent, coins: $('rsCoins').textContent, tip: $('resTip').hidden ? '' : $('resTip').textContent, next: !$('btnNext').hidden, again: $('btnAgain').textContent, save: localStorage.getItem('qianpao-pocheng-1')}; })()")
    files = rec.flush()
    out['sheets'] = files; out['shots'] = len(rec.items)
    out['flags'] = {k: [v[0][1], 'x%d' % len(v), 'shots ' + ','.join(str(a) for a, b in v[:8])] for k, v in rec.flagsum.items()}
    out['small'] = sorted([[nm, fz, txt] for (nm, fz), txt in rec.smallsum.items()], key=lambda r: r[1])[:12]
    return out, rec


async def after_result(g, rec_tag, lvl, out, action):
    """結算畫面上用手指按按鈕。action: next / again / home / shop"""
    await g.pump(60)                                # 剛跳出來的 0.8 秒不收點擊
    sel = {'next': '#btnNext', 'again': '#btnAgain', 'home': '#btnHome', 'shop': '#btnUp'}[action]
    if action in ('next', 'again'): await g.seed_const(777000 + lvl * 31 + (1 if action == 'again' else 0))
    ok = await g.tap_el(sel); await g.pump(30)
    if action in ('next', 'again'): await g.seed_lcg(777000 + lvl * 31 + (1 if action == 'again' else 0))
    st = await g.state()
    return ok, st


async def main():
    args, opt = parse_opts(sys.argv[1:])
    W, H = [int(x) for x in opt.get('size', '844x390').split('x')]
    levels = [int(x) for x in opt.get('levels', '1').split(',')]
    tag = opt.get('tag', f'p{W}x{H}'); policy = opt.get('policy', 'good'); seed = int(opt.get('seed', 3)); maxsec = int(opt.get('maxsec', 420))
    campaign = 'campaign' in opt
    save = None
    if 'open' in opt: save = {'coins': int(opt.get('coins', 0)), 'stars': [0] * 6, 'open': int(opt['open']), 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': opt.get('seen', '1') == '1', 'seenUlt': False, 'seenSh': False, 'diff': int(opt.get('diff', 1)), 'flip': False}
    t00 = time.time()
    async with Game(W, H, scale=float(opt.get('scale', 2)), save=save) as g:
        await g.js("(seed) => { let s = seed; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }", seed * 1000 + 7)
        await g.sec(1.0)
        if 'hook' in opt: await g.js(pathlib.Path(opt['hook']).read_text())
        select = True; tries = 0; i = 0
        while i < len(levels):
            lvl = levels[i]; t0 = time.time()
            pol = policy
            if campaign and lvl == 1 and tries == 0 and policy == 'good': pol = 'naive'
            out, rec = await play_level(g, lvl, tag + ('' if tries == 0 else f'r{tries}'), pol, seed + tries, maxsec, select=select)
            brief = {k: v for k, v in out.items() if k not in ('log', 'sheets', 'flags', 'small')}
            print(json.dumps(brief, ensure_ascii=False), f'{time.time() - t0:.0f}s', flush=True)
            for d in out.get('log', []): print('    ', json.dumps(d, ensure_ascii=False)[:260], flush=True)
            for f in out.get('sheets', []): print('   sheet', f, flush=True)
            for k, v in out.get('flags', {}).items(): print('   FLAG', v[1], v[2], '|', k.split(' ', 1)[0], v[0], flush=True)
            print('   small text (css px):', out.get('small'), flush=True)
            if out.get('mode') != 'result': break
            won = out['state'] == 'won'
            if campaign:
                if won and lvl == 1:
                    # 第一次贏：先去「強化」看一眼
                    ok, st = await after_result(g, tag, lvl, out, 'shop'); im = await g.shot(None); upright(im, st['rot']).save(OUT / f'{tag}_L{lvl}_shop_from_result.png')
                    await g.tap_el('#upList li:first-child button'); await g.pump(20); im = await g.shot(None); upright(im, st['rot']).save(OUT / f'{tag}_L{lvl}_shop_after_buy.png')
                    print('   shop:', await g.js("JSON.stringify(window.__qp.SV.up) + ' coins ' + window.__qp.SV.coins + ' shopHidden ' + document.getElementById('shop').hidden"))
                    await g.tap_el('#shop [data-close]'); await g.pump(20)
                if won and i + 1 < len(levels) and levels[i + 1] == lvl + 1:
                    ok, st = await after_result(g, tag, lvl, out, 'next'); print('   next ->', ok, st['mode'], 'idx', await g.js("window.__qp.S.idx")); select = False; tries = 0; i += 1
                elif won: i += 1; select = True; tries = 0; await after_result(g, tag, lvl, out, 'home')
                else:
                    tries += 1
                    if tries > int(opt.get('retries', 2)): print('   gave up on level', lvl); break
                    ok, st = await after_result(g, tag, lvl, out, 'again'); print('   again ->', ok, st['mode']); select = False
            else:
                ok, st = await after_result(g, tag, lvl, out, 'home'); print('   home ->', ok, st['mode']); select = True; i += 1
        if 'hook' in opt: print('HOOK RESULT:', json.dumps(await g.js('window.__hookResult ? window.__hookResult() : null'), ensure_ascii=False)[:6000])
        print('console msgs:', g.msgs[:10])
    print(f'total {time.time() - t00:.0f}s')

if __name__ == '__main__':
    asyncio.run(main())
