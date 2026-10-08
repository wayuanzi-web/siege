"""review5：沿用 review4 的工具，但把輸出改到 shots/review5/。
   python3 test/review5-look/run5.py <review4-look 裡的腳本名.py | 任何路徑> [參數…]
   做法：先載入 q4，把 q4.OUT 換成 shots/review5，再把指定的腳本當主程式跑（它們都是 from q4 import OUT）。"""
import sys, pathlib, runpy
HERE = pathlib.Path(__file__).resolve().parent
R4 = HERE.parent / 'review4-look'
sys.path.insert(0, str(R4)); sys.path.insert(0, str(HERE))
import q4
q4.OUT = HERE.parent.parent / 'shots' / 'review5'
q4.OUT.mkdir(parents=True, exist_ok=True)
script = sys.argv[1]
p = pathlib.Path(script)
if not p.exists(): p = R4 / script
if not p.exists(): p = HERE / script
sys.argv = [str(p)] + sys.argv[2:]
runpy.run_path(str(p), run_name='__main__')
