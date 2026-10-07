"""把 play4.py 存下來的原尺寸截圖重新排成總覽（說明寫在每一格上方的黑條，不蓋到畫面）。
   python3 test/review4-look/resheet.py <tag>_L<n> [cols=2] [rows=4] [tile_w=836]"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import OUT, FONT, FONT_S
from PIL import Image, ImageDraw

def strip_tile(im, w, line1, line2):
    im2 = im.resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS)
    out = Image.new('RGB', (w, im2.size[1] + 40), (8, 8, 12)); out.paste(im2, (0, 40))
    d = ImageDraw.Draw(out); d.text((5, 1), line1, fill=(255, 255, 255), font=FONT); d.text((5, 22), line2, fill=(255, 225, 120), font=FONT_S)
    return out

def build(key, cols=2, rows=4, w=836):
    meta = json.loads((OUT / f'{key}.json').read_text())
    for f in OUT.glob(f'{key}_sheet*.png'): f.unlink()
    tiles = []
    for it in meta:
        st = it['st']; im = Image.open(OUT / it['file']).convert('RGB')
        fl = ' | '.join(k + ':' + m[:38] for k, m in it.get('flags', []))[:110]
        tiles.append(strip_tile(im, w, f"{it['k']:03d} {it['why'][:70]}", f"t{st['t']} r{st['round']} {st['phase']}{st['turn']} me{st['me']} foe{st['foe']} alive{st['a0']}/{st['a1']} ult{st['ult']} sh{st['sh']}" + (('  FLAGS ' + fl) if fl else '')))
    files = []; per = cols * rows
    for i in range(0, len(tiles), per):
        part = tiles[i:i + per]; tw, th = part[0].size; nr = (len(part) + cols - 1) // cols
        sh = Image.new('RGB', (tw * cols + 4 * (cols - 1), th * nr + 4 * (nr - 1)), (40, 40, 52))
        for j, t in enumerate(part): sh.paste(t, ((j % cols) * (tw + 4), (j // cols) * (th + 4)))
        f = OUT / f'{key}_sheet{i // per + 1:02d}.png'; sh.save(f); files.append(f.name)
    return files

if __name__ == '__main__':
    a = sys.argv[1:]
    print(build(a[0], int(a[1]) if len(a) > 1 else 2, int(a[2]) if len(a) > 2 else 4, int(a[3]) if len(a) > 3 else 836))
