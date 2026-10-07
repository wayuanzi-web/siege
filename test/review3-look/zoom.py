"""review3：從 film3.py 排好的表上切幾格下來放大看。
   python3 test/review3-look/zoom.py <name> <格號,格號,…｜all> [x0,y0,x1,y1（戰場座標，不給就是整格）] [--k=2 放大倍數] [--cols=N] [--tag=後綴]
   → shots/review3/zoom/<name>_<tag>.png"""
import sys, json, pathlib
from PIL import Image, ImageDraw, ImageFont
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'shots/review3'
(OUT / 'zoom').mkdir(parents=True, exist_ok=True)
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
name = args[0]; meta = json.loads((OUT / f'{name}.json').read_text())
sheet = Image.open(OUT / f'{name}.png')
tw, th = meta['tile']; gap = meta['gap']; cols = meta['cols']; cam = meta['cam']
nums = list(range(1, len(meta['frames']) + 1)) if len(args) < 2 or args[1] == 'all' else [int(v) for v in args[1].split(',')]
k = float(opt.get('k', 2))
X = lambda wx: ((wx - 56) * cam['s'] + cam['cx']) * cam['k'] - cam['box'][0]
Y = lambda wy: (cam['gy'] - wy * cam['s']) * cam['k'] - cam['box'][1]
if len(args) > 2:
    x0, y0, x1, y1 = [float(v) for v in args[2].split(',')]
    sub = (max(0, int(X(x0))), max(0, int(Y(y1))), min(tw, int(X(x1))), min(th, int(Y(y0))))
else: sub = (0, 0, tw, th)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
except Exception: font = ImageFont.load_default()
tiles = []
for n in nums:
    i = n - 1; ox = (i % cols) * (tw + gap); oy = (i // cols) * (th + gap)
    im = sheet.crop((ox + sub[0], oy + sub[1], ox + sub[2], oy + sub[3]))
    if k != 1: im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    if len(args) > 2:
        f = meta['frames'][i]
        ImageDraw.Draw(im).text((5, 3), f"#{n} t+{f['t']:.2f}s", fill=(255, 255, 255), font=font, stroke_width=3, stroke_fill=(0, 0, 0))
    tiles.append(im)
oc = int(opt.get('cols', min(len(tiles), 4)))
w, h = tiles[0].size; rows = (len(tiles) + oc - 1) // oc
out = Image.new('RGB', (w * oc + 4 * (oc - 1), h * rows + 4 * (rows - 1)), (20, 20, 28))
for i, im in enumerate(tiles): out.paste(im, ((i % oc) * (w + 4), (i // oc) * (h + 4)))
tag = opt.get('tag', 'f' + '_'.join(str(n) for n in nums[:6]))
path = OUT / 'zoom' / f'{name}_{tag}.png'; out.save(path)
print('saved', path, out.size)
