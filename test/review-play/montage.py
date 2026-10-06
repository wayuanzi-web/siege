"""把幾張截圖拼成一張：python3 test/review-play/montage.py <輸出名> <欄數> <每張寬> <圖1> <圖2> …  → shots/review-play/<輸出名>.png"""
import sys, pathlib
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent.parent
name, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); files = sys.argv[4:]
tiles = []
for f in files:
    im = Image.open(f).convert('RGB'); th = round(im.height * tw / im.width); im = im.resize((tw, th), Image.LANCZOS)
    d = ImageDraw.Draw(im); d.text((70, th - 16), pathlib.Path(f).stem[-28:], fill=(255, 255, 120), stroke_width=2, stroke_fill=(0, 0, 0)); tiles.append(im)
th = max(t.height for t in tiles); rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (tw * cols + 4 * (cols - 1), th * rows + 4 * (rows - 1)), (20, 20, 28))
for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
out = root / 'shots/review-play' / (name + '.png'); sheet.save(out); print('saved', out, sheet.size)
