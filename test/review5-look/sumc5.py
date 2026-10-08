"""review5：sum5.py 的輸出太長時用的精簡版——把 EDGE / SEP / DEATH / OV / JIT / HEAD 每一筆壓成一行。 python3 test/review5-look/sumc5.py <sum5.py 的參數>"""
import sys, json, re, subprocess, pathlib
out = subprocess.run([sys.executable, str(pathlib.Path(__file__).with_name('sum5.py'))] + sys.argv[1:], capture_output=True, text=True).stdout
for line in out.splitlines():
    m = re.match(r'\s+(EDGE|SEP|DEATH|OV|JIT|HEAD|REV|IN|BOSS|BOSSBACK|LATE|BAR|POP|POP-MOVED) (\{.*\})(.*)', line)
    if not m: print(line[:520]); continue
    k, d, rest = m.group(1), json.loads(m.group(2)), m.group(3)
    tag = f"L{d.get('lvl')} s{d.get('seed')} {str(d.get('bot'))[:3]}"
    if k == 'EDGE': print(f"  EDGE {tag} t{d['t0']} r{d['round']} {d['phase']} {d['who']} at({d['x0']},{d['y0']}) dir{d['dir']} sup {d['sup']} boomDt{d['boomDt']} restDt{d['restDt']} sp0 {d['sp0']} -> dx{d['dx']} dy{d['dy']} dur{d['dur']} {d['end']} {'DIED:' + str(d['died']) if 'died' in d else ''}")
    elif k == 'SEP': print(f"  SEP  {tag} t{d['t0']} r{d['round']} {d['phase']} {d['who']} vs {d['other']} at({d['x0']},{d['y0']}) sup {d['sup']} boomDt{d['boomDt']} -> dx{d['dx']} dy{d['dy']} dur{d['dur']} {d['end']} {'DIED:' + str(d['died']) if 'died' in d else ''}")
    elif k == 'DEATH': print(f"  DEATH {tag} t{d['t']} r{d['round']} {d['phase']}{d['turn']} pT{d['phaseT']} {d['who']} {d['how']} at({d['x']},{d['y']}) rest{d['rest']} restDt{d['restDt']} edgeDt{d['edgeDt']} sepDt{d['sepDt']} boomDt{d['boomDt']} load{d['load']}")
    elif k == 'OV': print(f"  OV   {tag} t{d['t0']}..{d['tEnd']} ({d['dur']}s) r{d['round']} {d['a']} + {d['b']} at({d['x']},{d['y']}) minDx{d['minDx']} meanDx{d['meanDx']} lastDx{d['lastDx']} rest{d['restFrac']} end:{d['end']}")
    elif k == 'JIT': print(f"  JIT  {tag} t{d['t0']} ({d['dur']}s) r{d['round']} aim{d['turn']} {d['who']} at({d['x']},{d['y']}) path{d['path']} net{d['net']} dy{d['dy']} rev{d['rev']} awake{d['awakeFrac']} maxSp{d['maxSp']} sepFr{d['sepFr']} edgeFr{d['edgeFr']} boomDt{d['boomDt']} alive{d['alive']}")
    elif k == 'HEAD': print(f"  HEAD {tag} t{d['t']} r{d['round']} {d['who']} {d['block']} at({d['x']},{d['y']}) load{d['load']} loadT{d['loadT']}{rest}")
    else: print('  ' + k + ' ' + tag + ' ' + json.dumps({a: b for a, b in d.items() if a not in ('lvl', 'seed', 'bot', 'size')}, ensure_ascii=False)[:420])
