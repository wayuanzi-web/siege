"""從 film3 的表裡把指定幾格原尺寸裁出來並排（放大看細節）。 python3 test/review4-look/tile.py <name> <k1,k2,...> [zoom=1] [x0,y0,x1,y1 (0..1，格子內的比例)] [out]"""
import sys, json, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
def tiles(name, ks, zoom=1.0, frac=None, out=None, folder='review3'):
    d = ROOT / 'shots' / folder; m = json.loads((d / f'{name}.json').read_text()) if (d / f'{name}.json').exists() else None
    im = Image.open(d / f'{name}.png').convert('RGB')
    if m: tw, th = m['tile']; cols = m['cols']; gap = m['gap']
    else: raise SystemExit('no json')
    res = []
    for k in ks:
        i = k - 1; x = (i % cols) * (tw + gap); y = (i // cols) * (th + gap); t = im.crop((x, y, x + tw, y + th))
        if frac: t = t.crop((int(frac[0] * tw), int(frac[1] * th), int(frac[2] * tw), int(frac[3] * th)))
        if zoom != 1: t = t.resize((int(t.size[0] * zoom), int(t.size[1] * zoom)), Image.LANCZOS)
        res.append(t)
    o = Image.new('RGB', (sum(t.size[0] for t in res) + 6 * (len(res) - 1), res[0].size[1]), (0, 0, 0)); x = 0
    for t in res: o.paste(t, (x, 0)); x += t.size[0] + 6
    f = ROOT / 'shots' / 'review4' / (out or f'tile_{name}.png'); o.save(f); return f, o.size
if __name__ == '__main__':
    a = sys.argv[1:]; ks = [int(x) for x in a[1].split(',')]; zoom = float(a[2]) if len(a) > 2 else 1.0; frac = [float(x) for x in a[3].split(',')] if len(a) > 3 and a[3] != '-' else None
    print(tiles(a[0], ks, zoom, frac, a[4] if len(a) > 4 else None))
