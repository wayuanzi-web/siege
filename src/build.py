#!/usr/bin/env python3
"""建置《千砲破城》。把 src/parts/ 依檔名順序串成單一頁面。

  python3 src/build.py
      src/dist/qianpao.html  Claude Artifact 用的頁面片段
      src/dist/index.html    可直接用瀏覽器開的完整頁面（測試用）

  python3 src/build.py https://<帳號>.github.io/<repo>/
      另外在 repo 根目錄產生公開網頁 App：index.html、sw.js、manifest.webmanifest
      （圖示與預覽圖用 src/gen_icons.py 產生一次即可）
"""
import pathlib, re, sys, time, urllib.parse
root = pathlib.Path(__file__).resolve().parent
parts = root / 'parts'
head = (parts / '00-head.html').read_text(encoding='utf8')
js_files = sorted(p for p in parts.glob('*.js'))
js = '\n'.join(p.read_text(encoding='utf8') for p in js_files)
js = js.replace("'use strict';\n", '', 1)

# 標題字型只載畫面上真的會出現的中文字：HTML 內文，加上程式裡的字串（註解不算）
web_path = root / 'webparts' / '90-web.js'
web_js = web_path.read_text(encoding='utf8') if web_path.exists() else ''
body_html = re.sub(r'<style>.*?</style>', '', head, flags=re.S)
code = re.sub(r'/\*.*?\*/', '', js + web_js, flags=re.S)
code = re.sub(r'(?m)(^|\s)//.*$', '', code)
cjk = sorted(set(ch for ch in body_html + code if '一' <= ch <= '鿿'))
# 字型的樣式表不能擋住頁面：訊號很差、連線卡住不回應的時候，一般的 <link rel=stylesheet> 會讓整頁停在那裡等（遊戲根本不會開始）。
# 先用 media="print" 載（瀏覽器不會為了列印用的樣式表等），載到了再改成 all；載不到就用系統字型，照樣能玩
def font_link(href):
    return '<link rel="stylesheet" href="' + href + '" media="print" onload="this.media=\'all\'">'
fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         + font_link('https://fonts.googleapis.com/css2?family=Lilita+One&display=swap')
         + font_link('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@900&display=swap&text=' + urllib.parse.quote(''.join(cjk))))
head = head.replace('<!--FONTS-->', fonts)

# 物理引擎 planck.js（MIT 授權）：原封不動放進另一個 <script>，授權聲明跟著一起放
vendor = root / 'vendor'
planck_js = (vendor / 'planck.min.js').read_text(encoding='utf8').replace('</script', '<\\/script')
planck_lic = ' '.join((vendor / 'planck-LICENSE.txt').read_text(encoding='utf8').split())
lib = '<script>\n/*! planck.js v1.5.0 | ' + planck_lic.replace('*/', '* /') + ' */\n' + planck_js + '\n</script>\n'

def script(code):
    return lib + '<script>\n(function () {\n\'use strict\';\n' + code + '\n})();\n</script>\n'

def full_page(extra_head, code):
    # 完整頁面：<title>、字型、樣式放進 <head>，其餘是 <body>
    cut = head.index('<div id="app"')
    return ('<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
            + extra_head + head[:cut] +
            '<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>'
            '</head><body>\n' + head[cut:] + '\n' + script(code) + '</body></html>\n')

dist = root / 'dist'; dist.mkdir(exist_ok=True)
frag = head + '\n' + script(js)
(dist / 'qianpao.html').write_text(frag, encoding='utf8')
(dist / 'index.html').write_text(full_page('', js), encoding='utf8')
print('built', len(frag) // 1024, 'KB (planck', len(planck_js) // 1024, 'KB);', len(js_files), 'js parts;', len(cjk), 'cjk glyphs')

if len(sys.argv) > 1:
    url = sys.argv[1].rstrip('/') + '/'
    site = root.parent
    desc = '兩座城樓輪流開砲：拖曳調角度和力道，砲彈穿過倍增符一發變多發；打斷柱子、打穿樓板，看對面的城一層一層垮下來。十二個關卡：竹樁吊樓、石碑骨牌、懸空寺、天秤寨、琉璃宮、五重塔、魔王城。手機橫拿、點開就能玩。'
    meta = ('<meta name="theme-color" content="#120f1c">'
            f'<meta name="description" content="{desc}">'
            '<link rel="manifest" href="manifest.webmanifest">'
            '<link rel="icon" type="image/png" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
            '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
            '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="千砲破城">'
            '<meta property="og:type" content="website"><meta property="og:title" content="千砲破城">'
            f'<meta property="og:description" content="{desc}"><meta property="og:image" content="{url}og.png"><meta property="og:url" content="{url}">'
            '<meta name="twitter:card" content="summary_large_image">')
    (site / 'index.html').write_text(full_page(meta, js + '\n' + web_js), encoding='utf8')
    stamp = time.strftime('%Y%m%d%H%M%S')
    sw = (root / 'webparts' / 'sw.js').read_text(encoding='utf8').replace('__CACHE__', 'qianpao-' + stamp)
    (site / 'sw.js').write_text(sw, encoding='utf8')
    (site / 'manifest.webmanifest').write_text((root / 'webparts' / 'manifest.json').read_text(encoding='utf8'), encoding='utf8')
    (site / '.nojekyll').touch()
    print('web app written to', site, 'for', url, 'cache', 'qianpao-' + stamp)
