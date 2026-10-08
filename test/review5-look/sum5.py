"""review5：把 multi5.py 存下來的結果（shots/review5/multi_<tag>.json）整理成統計。
   python3 test/review5-look/sum5.py A1 A2 B1 B2 [--show=rest,late,udie,bars,overlaps,edges,seps,inside,jitters,boss,deaths,revives,onhead,pops]"""
import sys, json, pathlib, collections
OUT = pathlib.Path(__file__).resolve().parent.parent.parent / 'shots' / 'review5'
tags = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
show = set(opt.get('show', 'rest,late,udie,bars,overlaps,edges,seps,inside,jitters,boss,deaths,revives,onhead,pops').split(','))
games = []
for t in tags: games += json.loads((OUT / f'multi_{t}.json').read_text())
HOW = {0: 'shot', 1: 'crush/fall', 3: 'fire', 4: 'void', 5: 'out of castle', 6: 'off field'}
J = lambda o: json.dumps(o, ensure_ascii=False)
print(f'{len(games)} games:', collections.Counter((g['bot'], g['size']) for g in games), 'results', collections.Counter(g['state'] for g in games), 'console msgs', sum(len(g['msgs']) for g in games))
for g in games:
    if g['msgs']: print('  MSG', g['lvl'], g['seed'], g['msgs'][:3])
gid = lambda g: f"L{g['lvl']} s{g['seed']} {g['bot']}"

if 'rest' in show:
    tot = collections.Counter(); ends = 0; uc = 0; tw = collections.Counter()
    for g in games:
        r = g['res']['rest']; ends += r['ends']; uc += r['unitChecks']
        for rec in r['recs']:
            for k in set(f[0] for f in rec['flags']): tw[k] += 1
            for f in rec['flags']:
                tot[f[0]] += 1
                if f[0] in ('U_AIR', 'U_EDGE', 'U_PEN', 'U_ONUNIT', 'B_FLOAT'): print(f"   REST {gid(g)} t{rec['t']} r{rec['round']} {rec['next']}: {f}")
    print(f'REST: turn-ends {ends}, unit checks {uc}; flag instances {dict(tot)}; turn-ends with >=1: ' + str({k: f'{v} ({100 * v / max(1, ends):.0f}%)' for k, v in tw.items()}))

if 'late' in show:
    allr = []
    for g in games:
        for r in g['res']['late']: r = dict(r, seed=g['seed'], bot=g['bot']); allr.append(r)
    clean = [r for r in allr if not r['hazard']]; n = len(clean)
    for th in (0.5, 1.0, 3.4):
        l = [r for r in clean if r['maxMove'] > th and r['startedAt'] > 0.3]
        print(f'LATE: windows without hazard {n}: something in the castle moved > {th} starting >0.3 s after the turn ended: {len(l)} ({100 * len(l) / max(1, n):.1f}%)')
    for r in clean:
        if r['maxMove'] > 1.0 and r['startedAt'] > 0.3: print('   LATE', J({k: r[k] for k in ('lvl', 'seed', 'bot', 'round', 'castle', 't0', 'window', 'maxMove', 'who', 'startedAt', 'n05', 'n34', 'deaths')}))
    d = [r for r in clean if r['deaths']]; print('LATE: windows with a death in that castle after the turn ended:', len(d), [(r['lvl'], r['seed'], r['round'], r['castle'], r['deaths']) for r in d][:12])

if 'udie' in show:
    allr = []
    for g in games:
        for r in g['res']['udie']: allr.append(dict(r, seed=g['seed'], bot=g['bot']))
    late = [r for r in allr if r['phase'] == 'aim']
    print(f'UDIE: deaths while game undecided: {len(allr)}; during an aim phase: {len(late)} ({100 * len(late) / max(1, len(allr)):.0f}%)', [(r['lvl'], r['seed'], r['round'], 'turn' + str(r['turn']), 'side' + str(r['side']), r['type'], HOW.get(r['how'], r['how']), 'phaseT' + str(r['phaseT'])) for r in late])
    print('   by cause:', collections.Counter(HOW.get(r['how'], r['how']) for r in allr).most_common(), ' by phase:', collections.Counter(r['phase'] for r in allr).most_common())

if 'bars' in show:
    recs = []
    for g in games:
        for r in g['res']['bars']['recs']: recs.append(dict(r, seed=g['seed'], bot=g['bot']))
    print('BARS: UP', sum(1 for r in recs if r['kind'] == 'UP'), 'IDLE', sum(1 for r in recs if r['kind'] == 'IDLE'))
    for r in recs[:14]: print('   BAR', J(r))

N = lambda key: [dict(r, seed=g['seed'], bot=g['bot'], size=g['size']) for g in games for r in g['res']['new5'][key]]
if 'overlaps' in show:
    o = N('overlaps'); print(f"OVERLAPS (centres closer than 0.8 body widths, bodies overlapping vertically, >= 0.8 s): {len(o)} in {len(set((r['lvl'], r['seed'], r['bot']) for r in o))} games; >=3 s: {sum(1 for r in o if r['dur'] >= 3)}; heavy (mean dx < 1.2) and >= 2 s: {sum(1 for r in o if r['meanDx'] < 1.2 and r['dur'] >= 2)}")
    for r in sorted(o, key=lambda r: -r['dur']): print('   OV', J(r))
if 'edges' in show:
    e = N('edges'); died = [r for r in e if 'died' in r]; fell = [r for r in e if r['dy'] < -1.5]
    print(f"EDGE slides: {len(e)}; unit dropped >1.5: {len(fell)}; unit died during/just after: {len(died)}; started with no explosion within 11 units in the last 2 s: {sum(1 for r in e if r['boomDt'] > 2)}; during aim: {sum(1 for r in e if r['phase'].startswith('aim'))}")
    for r in e: print('   EDGE', J(r))
if 'seps' in show:
    s = N('seps'); print(f"SEP pushes (unit episodes): {len(s)}; lasted > 2.4 s (gave up, still overlapping): {sum(1 for r in s if r['dur'] > 2.4)}; died: {sum(1 for r in s if 'died' in r)}; dropped >1.5 while pushed: {sum(1 for r in s if r['dy'] < -1.5)}")
    for r in s: print('   SEP', J(r))
if 'inside' in show:
    i = N('inside'); print(f'INSIDE a block >0.75 s: {len(i)}')
    for r in i: print('   IN', J(r))
if 'jitters' in show:
    j = N('jitters'); aims = sum(g['res']['new5']['aims'] for g in games); uc = sum(g['res']['new5']['aimUnitChecks'] for g in games)
    print(f'JITTER during aim: {len(j)} flagged of {uc} unit-aim-phases ({aims} aim phases)')
    for r in j: print('   JIT', J(r))
if 'boss' in show:
    b = N('bossMoves'); bb = N('bossBack')
    print(f"BOSS moves >0.8: {len(b)}; with no explosion within 14 units in the last 1.5 s: {sum(1 for r in b if r['boomDt'] > 1.5)}; edge-slide seen: {sum(1 for r in b if r['edge'] or r['edgeSeen'])}; during aim: {sum(1 for r in b if r['phase'].startswith('aim'))}; bossback events {len(bb)}")
    for r in b: print('   BOSS', J(r))
    for r in bb: print('   BOSSBACK', J(r))
if 'deaths' in show:
    d = N('deaths'); play = [r for r in d if r['state'] == 'play']
    sus = [r for r in play if r['how'] in (1, 4, 5, 6) and r['boomDt'] > 2.5]
    print(f"DEATHS (game undecided) {len(play)}: by cause {collections.Counter(HOW.get(r['how'], r['how']) for r in play).most_common()}; edge-slide within 2 s before: {sum(1 for r in play if r['edgeDt'] < 2)}; pushed-apart within 2 s before: {sum(1 for r in play if r['sepDt'] < 2)}; fall/void/out with no explosion within 11 units in the last 2.5 s: {len(sus)}")
    for r in play:
        if r['edgeDt'] < 2 or r['sepDt'] < 2 or r in sus or r['phase'] == 'aim': print('   DEATH', J(dict(r, how=HOW.get(r['how'], r['how']))))
if 'revives' in show:
    r_ = N('revives'); print(f"REVIVES: {len(r_)}; overlapping another unit 0.5 s later: {sum(1 for r in r_ if r['overlap'])}; inside a block: {sum(1 for r in r_ if r['inBlock'])}; dead again within 0.5 s: {sum(1 for r in r_ if not r['alive'])}")
    for r in r_: print('   REV', J(r))
if 'onhead' in show:
    h = N('onHead'); te = sum(g['res']['new5']['turnEnds'] for g in games)
    whole = [r for r in h if not r['block'].startswith('frag')]; roofs = [r for r in h if r['roof']]
    print(f"ON-HEAD at turn end ({te} turn-ends): contacts {len(h)}; intact (non-fragment) blocks: {len(whole)}; roof material: {len(roofs)} (intact roof: {sum(1 for r in roofs if not r['block'].startswith('frag'))}); kinds {collections.Counter(r['block'].split(':')[0] + ':' + r['block'].split(':')[1] for r in h).most_common()}")
    seen = set()
    for r in h:
        k = (r['lvl'], r['seed'], r['bot'], r['who'], r['block'])
        if k in seen: continue
        seen.add(k); n = sum(1 for x in h if (x['lvl'], x['seed'], x['bot'], x['who'], x['block']) == k)
        print('   HEAD', J(r), f'x{n} turn-ends')
if 'pops' in show:
    P = collections.Counter(); samples = []; moved = []; texts = collections.Counter(); bysize = collections.defaultdict(collections.Counter)
    for g in games:
        p = g['res']['new5']['pops']
        for k in ('n', 'kills', 'cov30', 'cov60', 'cutBottom', 'cutTop', 'cutSide', 'moved'): P[k] += p[k]; bysize[g['size']][k] += p[k]
        samples += [dict(s, seed=g['seed'], bot=g['bot'], size=g['size']) for s in p['samples']]; moved += [dict(s, seed=g['seed'], bot=g['bot'], size=g['size']) for s in p.get('movedS', [])]
        texts.update(p['texts'])
    print('POPS (measured where they were really drawn, 12th frame):', dict(P)); print('   by size:', {k: dict(v) for k, v in bysize.items()})
    print('   texts:', dict(texts.most_common()))
    for s in samples: print('   POP', J(s))
    for s in moved[:16]: print('   POP-MOVED', J(s))
