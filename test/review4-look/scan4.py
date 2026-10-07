"""掃 play4.py 留下的紀錄（shots/review4/<tag>_L<n>.json），列出「提示跟場上狀況對不上」和「跳字被蓋住／切掉」的那幾張。
   python3 test/review4-look/scan4.py B_L1 B_L2 ..."""
import sys, json, pathlib, re
OUT = pathlib.Path(__file__).resolve().parent.parent.parent / 'shots' / 'review4'
RULES = [
    ('輪到敵軍了', lambda st: st['phase'] == 'aim' and st['turn'] == 1, 'not the enemy aim phase'),
    ('天燈升起來了', lambda st: any(o.startswith('lantern') for o in st['objs']), 'no lantern on the field'),
    ('×20 的倍增符出現了', lambda st: any(g.endswith('x20') for g in st['gates']), 'no ×20 gate on the field'),
    ('連珠」集滿了', lambda st: st['ult'] >= 100 and not st['armed'], 'ult not full / already armed or used'),
    ('紅圈是這一回合結束時落石的位置', lambda st: st['marks'] > 0, 'no rock marker on the field'),
    ('毀滅光球', lambda st: any(o.startswith('orb') for o in st['objs']), 'no orb on the field'),
    ('轟炸氣球升空了', lambda st: any(o.startswith('balloon') for o in st['objs']), 'no balloon on the field'),
    ('兵被凍住了', lambda st: st['frozen'] > 0, 'nobody frozen'),
]
for key in sys.argv[1:]:
    f = OUT / f'{key}.json'
    if not f.exists(): print(key, 'missing'); continue
    meta = json.loads(f.read_text()); seen = set(); pop = {}
    for it in meta:
        st = it['st']; say = st.get('say', '')
        for txt, okfn, desc in RULES:
            if txt in say and st.get('sayOp', 1) > 0.5 and not okfn(st) and (txt, desc) not in seen:
                seen.add((txt, desc)); print(f"{key} #{it['k']:03d} t{st['t']} r{st['round']} {st['phase']}{st['turn']}: toast「{say[:22]}…」 but {desc}   -> {it['file']}")
        if '打斷望樓' in say and st.get('sayOp', 1) > 0.5 and ('tower',) not in seen:
            seen.add(('tower',)); print(f"{key} #{it['k']:03d} t{st['t']} r{st['round']} {st['phase']}{st['turn']}: toast「{say[:22]}…」 with enemy alive {st['a1']}/2   -> {it['file']}")
        if ('冰很滑' in say or '冰術士躲在' in say) and st.get('sayOp', 1) > 0.5 and (say[:4],) not in seen:
            seen.add((say[:4],)); print(f"{key} #{it['k']:03d} t{st['t']} r{st['round']} {st['phase']}{st['turn']}: toast「{say[:26]}…」 enemy alive {st['a1']}/3 foe bar {st['foe']}   -> {it['file']}")
        for k, m in it.get('flags', []):
            if k == 'POP' and ('covered by btn' in m or 'cut by screen edge' in m):
                kk = re.sub(r'[0-9]+', '#', m)
                if kk not in pop: pop[kk] = (it['k'], m, it['file'])
    for kk, (k, m, fl) in pop.items(): print(f"{key} #{k:03d}: POP {m}   -> {fl}")
