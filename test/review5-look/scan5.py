"""review5：跑 review4 的 scan4.py，但讀 shots/review5/ 底下的紀錄。另外把每一關「講過的每一句提示」照時間列出來（附當時的階段和場上狀況）。
   python3 test/review5-look/scan5.py F_L1 F_L2 ..."""
import sys, json, pathlib
HERE = pathlib.Path(__file__).resolve().parent
OUT5 = HERE.parent.parent / 'shots' / 'review5'
src = (HERE.parent / 'review4-look' / 'scan4.py').read_text().replace("'review4'", "'review5'")
exec(compile(src, 'scan4.py', 'exec'))
for key in sys.argv[1:]:
    f = OUT5 / f'{key}.json'
    if not f.exists(): continue
    meta = json.loads(f.read_text()); last = None
    print(f'--- {key}: toasts in order (first screenshot where each was visible)')
    for it in meta:
        st = it['st']; say = st.get('say', '')
        if say and say != last and st.get('sayOp', 1) > 0.3:
            print(f"   #{it['k']:03d} t{st['t']:6.1f} r{st['round']} {st['phase']}{st['turn']} a{st['a0']}/{st['a1']} gates{st['gates']} objs{[o for o in st['objs'] if not o.startswith('geyser')]} frozen{st['frozen']} marks{st['marks']} ult{st['ult']} sh{st['sh']}: 「{say}」")
        last = say if say else last
