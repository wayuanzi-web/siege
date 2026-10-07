"""review3：把每一張表的最後一格（塵埃落定之後）拼成幾張總覽，快速掃一遍有沒有東西懸在半空、卡在牆裡。
   python3 test/review3-look/lastframes.py [每張幾格=30] [欄數=6] [縮小倍數=0.5]  → shots/review3/zoom/last_<n>.png，並印出每一格是哪一張表"""
import sys, json, glob, pathlib
from PIL import Image, ImageDraw, ImageFont
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'shots/review3'
per = int(sys.argv[1]) if len(sys.argv) > 1 else 30
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 6
k = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
names = []
for f in sorted(glob.glob(str(OUT / '*.json'))):
    if 'hint_' in f or 'survey' in f: continue
    try: m = json.load(open(f))
    except Exception: continue
    if 'frames' not in m or '_full' in m['name'] or '_n_' in m['name'] or '_h_' in m['name'] or '_c_' in m['name'] or '_w_' in m['name'] or 'orb_strike' in m['name']: continue
    names.append(m)
W, H = 330, 330
page = 0
for s in range(0, len(names), per):
    chunk = names[s:s + per]; rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (W * cols + 3 * (cols - 1), H * rows + 3 * (rows - 1)), (20, 20, 28))
    for i, m in enumerate(chunk):
        im = Image.open(OUT / (m['name'] + '.png')); tw, th = m['tile']; gap = m['gap']; c = m['cols']; n = len(m['frames']) - 1
        t = im.crop(((n % c) * (tw + gap), (n // c) * (th + gap), (n % c) * (tw + gap) + tw, (n // c) * (th + gap) + th))
        r = min(W / tw, H / th); t = t.resize((round(tw * r), round(th * r)), Image.LANCZOS)
        cell = Image.new('RGB', (W, H), (0, 0, 0)); cell.paste(t, ((W - t.width) // 2, (H - t.height) // 2))
        ImageDraw.Draw(cell).text((4, H - 20), f"{s + i + 1} {m['name']}", fill=(255, 255, 120), font=font, stroke_width=3, stroke_fill=(0, 0, 0))
        sheet.paste(cell, ((i % cols) * (W + 3), (i // cols) * (H + 3)))
    page += 1; p = OUT / 'zoom' / f'last_{page}.png'; sheet.save(p); print('saved', p, sheet.size, [m['name'] for m in chunk])
