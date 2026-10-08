#!/usr/bin/env python3
"""重新產生 App 圖示與連結預覽圖（og.png）。
需要：pip install playwright pillow，以及 Noto Serif CJK 字型。
python3 src/gen_icons.py [預覽圖要用的遊戲截圖.png]（沒給就用 src/og-shot.png）"""
import asyncio, base64, io, pathlib, sys
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent
out = root.parent
js = "\n".join((root / 'parts' / f).read_text(encoding='utf8') for f in ['10-core.js', '15-view.js', '30-art.js', '40-defs.js'])
PAGE = """<body style="margin:0;background:#333"><canvas id="c" width="512" height="512"></canvas><script>%s
function drawIcon(maskable) {
  const cv = document.getElementById('c'), c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 512, 512); c.lineJoin = 'round'; c.lineCap = 'round';
  // 黃昏的天空，城後面一團暖光
  c.fillStyle = lg(c, 0, 0, 0, 512, [0, '#1b1540', 0.5, '#4b2b63', 0.82, '#a3475a', 1, '#e0864a']); c.fillRect(0, 0, 512, 512);
  c.fillStyle = rg(c, 352, 300, 10, 290, [0, 'rgba(255,196,96,.62)', 0.5, 'rgba(255,150,80,.22)', 1, 'rgba(255,150,80,0)']); c.fillRect(0, 0, 512, 512);
  const s = maskable ? 0.8 : 1;                       // maskable 圖示要把內容縮進安全區
  c.save(); c.translate(256, 256); c.scale(s, s); c.translate(-256, -256);
  // 地面
  c.beginPath(); c.moveTo(-60, 452); c.quadraticCurveTo(150, 418, 300, 436); c.quadraticCurveTo(430, 450, 580, 430); c.lineTo(580, 600); c.lineTo(-60, 600); c.closePath();
  c.fillStyle = lg(c, 0, 420, 0, 520, [0, '#3a2a48', 1, '#1a1428']); c.fill();
  // 敵城：用遊戲裡的磚畫（沙城的石磚、紅瓦）
  const sc = 21, blk = (mat, x, y, w, h, a, ds, kind, skin) => {
    const b = { skin: skin || 'sand', mat, kind: kind || 'box', w, h, il: kind === 'roof' ? w * 0.18 : 0, ir: kind === 'roof' ? w * 0.18 : 0, deco: 0, vr: 0 };
    c.save(); c.translate(x, y); c.rotate(a || 0); c.translate(-w * sc / 2, -h * sc / 2); paintBlock(c, b, ds || 0, w * sc, h * sc, sc); c.restore();
  };
  // 底下兩層還站著
  blk(M_STONE, 302, 412, 3.4, 3.4, 0, 0); blk(M_STONE, 374, 412, 3.4, 3.4, 0, 1); blk(M_STONE, 446, 412, 3.4, 3.4, 0, 0);
  blk(M_STONE, 318, 342, 1.7, 3.4, 0, 1); blk(M_STONE, 440, 342, 1.7, 3.4, 0, 0);
  // 上面那一層正在垮：樓板斷成兩截往下歪、磚塊飛出去、屋頂翻過來
  blk(M_WOOD, 344, 290, 4.6, 1.0, 0.2, 1); blk(M_WOOD, 446, 300, 3.0, 1.0, -0.42, 2);
  blk(M_STONE, 352, 238, 3.4, 3.4, 0.32, 2); blk(M_STONE, 452, 214, 3.0, 3.0, -0.5, 1);
  blk(M_ROOF, 404, 140, 7.4, 2.6, 0.38, 0, 'roof');
  // 碎塊
  const chips = [[300, 196, 0.6, 1.1], [500, 168, 1.5, 0.8], [336, 156, -0.4, 0.7], [486, 268, 0.9, 0.6], [270, 246, 2.2, 0.55]];
  for (const [x, y, a, k] of chips) { c.save(); c.translate(x, y); c.rotate(a); c.scale(k, k); poly(c, [-14, -9, 12, -12, 15, 8, -9, 12]); fs(c, lg(c, 0, -12, 0, 12, [0, '#f4dcaa', 1, '#ad8b54']), INK, 3.2); c.restore(); }
  // 一個赤潮兵被轟上天
  c.save(); c.translate(462, 96); c.rotate(0.6); c.scale(1.35, 1.35); c.translate(-32, -40); UNIT_ART.rocket(c, 1, TEAM_PAL[1]); c.restore();
  // 命中的火光
  c.save(); c.translate(398, 262); c.globalCompositeOperation = 'lighter';
  c.fillStyle = rg(c, 0, 0, 2, 110, [0, 'rgba(255,250,220,.95)', 0.3, 'rgba(255,190,70,.6)', 1, 'rgba(255,120,40,0)']); c.beginPath(); c.arc(0, 0, 110, 0, TAU); c.fill(); c.restore();
  c.save(); c.translate(398, 262); c.rotate(0.2); c.fillStyle = '#fff6c8'; c.beginPath();
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = (i & 1) ? 18 : 52; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.restore();
  // 砲彈：從左下飛出、穿過倍增符，一發變三發
  const gx = 214, gy = 150;
  const trail = (x0, y0, cx, cy, x1, y1, w) => {
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,200,90,.35)'; c.lineWidth = w * 2.4; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();
    c.strokeStyle = 'rgba(255,240,190,.9)'; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke(); c.restore();
  };
  const ball = (x, y, r) => { c.save(); c.fillStyle = rg(c, x, y, 1, r * 2.6, [0, 'rgba(255,220,120,.7)', 1, 'rgba(255,160,60,0)']); c.beginPath(); c.arc(x, y, r * 2.6, 0, TAU); c.fill();
    c.beginPath(); c.arc(x, y, r, 0, TAU); fs(c, rg(c, x - r * 0.35, y - r * 0.35, 1, r * 1.2, [0, '#5b5168', 1, '#1a1420']), '#fff0b0', 3); c.restore(); };
  trail(196, 286, 196, 214, gx, gy, 9);
  trail(gx, gy, 300, 40, 372, 236, 7); trail(gx, gy, 316, 96, 398, 262, 7); trail(gx, gy, 300, 150, 344, 286, 7);
  ball(327, 108, 13); ball(352, 172, 13); ball(316, 214, 13);
  // 藍色的倍增符
  c.save(); c.translate(gx, gy);
  c.fillStyle = rg(c, 0, 0, 10, 92, [0, 'rgba(120,200,255,.55)', 1, 'rgba(80,150,255,0)']); c.beginPath(); c.arc(0, 0, 92, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(0, 0, 46, 62, 0, 0, TAU); c.lineWidth = 15; c.strokeStyle = '#1c4fd0'; c.stroke(); c.lineWidth = 8; c.strokeStyle = '#8fd0ff'; c.stroke();
  c.font = '900 50px "Lilita One", "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 8; c.strokeStyle = '#0f2a78'; c.strokeText('×3', 0, 2); c.fillStyle = '#fff'; c.fillText('×3', 0, 2);
  c.restore();
  // 主角：我方的火箭兵
  c.save(); c.translate(98, 470); c.scale(4.6, 4.6); c.translate(-32, -58); UNIT_ART.rocket(c, 0, TEAM_PAL[0]); c.restore();
  c.restore();
  if (!maskable) { c.strokeStyle = '#ffc93c'; c.lineWidth = 10; const k = 46; c.beginPath(); c.moveTo(k, 5); c.lineTo(512 - k, 5); c.lineTo(507, k); c.lineTo(507, 512 - k); c.lineTo(512 - k, 507); c.lineTo(k, 507); c.lineTo(5, 512 - k); c.lineTo(5, k); c.closePath(); c.stroke(); }
  return cv.toDataURL('image/png');
}
</script></body>""" % js
async def main():
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 512, 'height': 512})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.set_content(PAGE)
        imgs = {}
        for name, mask in [('plain', False), ('mask', True)]:
            data = await pg.evaluate('(m) => drawIcon(m)', mask)
            imgs[name] = Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
        await b.close()
        if errs: print('errors', errs); sys.exit(1)
    plain = imgs['plain']
    # 切角：四個角透明，跟遊戲裡的按鈕同一個造型
    m = Image.new('L', (512, 512), 0); d = ImageDraw.Draw(m); k = 46
    d.polygon([(k, 0), (512 - k, 0), (512, k), (512, 512 - k), (512 - k, 512), (k, 512), (0, 512 - k), (0, k)], fill=255)
    cut = plain.copy(); cut.putalpha(m)
    cut.save(out / 'icon-512.png'); cut.resize((192, 192), Image.LANCZOS).save(out / 'icon-192.png')
    imgs['mask'].convert('RGB').save(out / 'icon-maskable-512.png')
    plain.convert('RGB').resize((180, 180), Image.LANCZOS).save(out / 'apple-touch-icon.png')
    # 連結預覽圖 1200×630：左邊標題、右邊一張遊戲畫面
    shot = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'og-shot.png'
    og = Image.new('RGB', (1200, 630), '#120f1c')
    if shot.exists():
        s = Image.open(shot).convert('RGB')
        bg = s.resize((1200, int(s.height * 1200 / s.width)), Image.LANCZOS)
        top = max(0, (bg.height - 630) // 3)
        bg = bg.crop((0, top, 1200, top + 630)).filter(ImageFilter.GaussianBlur(14))
        og.paste(Image.blend(bg, Image.new('RGB', (1200, 630), '#120f1c'), 0.62))
        ph = s.resize((int(s.width * 360 / s.height), 360), Image.LANCZOS)
        if ph.width > 690: ph = ph.crop(((ph.width - 690) // 2, 0, (ph.width - 690) // 2 + 690, 360))
        frame = Image.new('RGB', (ph.width + 12, ph.height + 12), '#ffc93c'); frame.paste(ph, (6, 6))
        og.paste(frame, (1200 - frame.width - 40, 630 - frame.height - 36))
    d = ImageDraw.Draw(og)
    def font(sz):
        for f in ['/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc', '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc']:
            try: return ImageFont.truetype(f, sz, index=3)
            except Exception: pass
        return ImageFont.load_default()
    d.text((66, 36), '輪 流 開 砲 · 一 層 一 層 垮', font=font(30), fill='#fff0b0')
    d.text((58, 70), '千砲破城', font=font(118), fill='#ffc93c', stroke_width=6, stroke_fill='#3a2203')
    d.text((66, 262), '拖曳瞄準', font=font(34), fill='#f6eeda')
    d.text((66, 310), '穿過倍增符', font=font(34), fill='#f6eeda')
    d.text((66, 358), '打斷柱子', font=font(34), fill='#f6eeda')
    d.text((66, 406), '整座城垮下來', font=font(34), fill='#f6eeda')
    d.text((66, 486), '十二個關卡・不用帳號', font=font(28), fill='#aea6c8')
    d.text((66, 528), '手機橫拿就能玩', font=font(28), fill='#aea6c8')
    og.save(out / 'og.png', optimize=True)
    print('icons and og.png written to', out)
asyncio.run(main())
