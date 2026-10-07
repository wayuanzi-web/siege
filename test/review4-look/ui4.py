"""review4：選單畫面逐一用手指點過（全新存檔），每個畫面截圖＋跑版面檢查。直拿時另外存沒轉正的原圖。
   python3 test/review4-look/ui4.py --size=390x844 --tag=UP"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from q4 import Game, OUT, parse_opts, upright
from layout4 import LAYOUT

async def main():
    args, opt = parse_opts(sys.argv[1:])
    W, H = [int(x) for x in opt.get('size', '844x390').split('x')]; tag = opt.get('tag', f'U{W}x{H}')
    async with Game(W, H, scale=2) as g:
        n = [0]
        async def snap(name, note=''):
            n[0] += 1; st = await g.state(); lay = await g.js(LAYOUT)
            im = await g.shot(None); f = f'{tag}_{n[0]:02d}_{name}'
            if st['rot']: im.save(OUT / f'{f}_raw.png')
            upright(im, st['rot']).save(OUT / f'{f}.png')
            print(f"{f}: mode={st['mode']} rot={st['rot']} modal={lay['modal']} flags={lay['flags']} small={[s for s in lay['small'] if s[1] < 10.4][:6]} {note}", flush=True)
            return st
        info = lambda: g.js("(() => { const q = window.__qp, $ = (id) => document.getElementById(id); return {sv: JSON.stringify(q.SV), sel: q.UI.sel, go: $('btnGo').disabled, tip: $('liTip').textContent, flipHidden: $('btnFlip').hidden, wipe: $('btnWipe').textContent, turnHidden: $('turn').hidden, diff: [...document.querySelectorAll('#diffSeg button')].map(b => b.getAttribute('aria-pressed')).join(','), keyHelp: $('keyHelp').hidden, ls: localStorage.getItem('qianpao-pocheng-1')}; })()")
        # （開頁面後已經推了 0.5 秒）
        await snap('home_first', json.dumps(await info(), ensure_ascii=False)[:400])
        await g.sec(4); await snap('home_after4s', 'turnHidden=' + str((await info())['turnHidden']))
        # 點鎖住的第三關
        await g.tap_el('#lvls > button:nth-child(3)'); await g.pump(30); i = await info(); await snap('home_locked3', f"go.disabled={i['go']} tip={i['tip']}")
        await g.tap_el('#btnGo'); await g.pump(20); st = await g.state(); print('   tap 出戰 on locked level -> mode', st['mode'])
        await g.tap_el('#lvls > button:nth-child(1)'); await g.pump(20)
        # 強化（沒錢）
        await g.tap_el('#btnShop'); await g.pump(30); await snap('shop_nomoney')
        await g.tap_el('#upList li:first-child button'); await g.pump(10); i = await info(); print('   buy with 0 coins ->', json.loads(i['sv'])['up'], json.loads(i['sv'])['coins'])
        await g.tap_el('#shop [data-close]'); await g.pump(20)
        # 設定
        await g.tap_el('#btnOpt'); await g.pump(30); i = await info(); await snap('opt', f"flipHidden={i['flipHidden']} keyHelpHidden={i['keyHelp']} diff={i['diff']}")
        await g.tap_el('#tSfx'); await g.tap_el('#tMus'); await g.tap_el('#tVib'); await g.pump(20)
        await g.tap_el('#diffSeg button[data-d="0"]'); await g.pump(20); i = await info(); await snap('opt_toggled', f"sv={i['sv'][:200]} diff={i['diff']}")
        await g.tap_el('#tSfx'); await g.tap_el('#tMus'); await g.tap_el('#tVib'); await g.tap_el('#diffSeg button[data-d="1"]'); await g.pump(10)
        await g.tap_el('#btnWipe'); await g.pump(20); i = await info(); await snap('opt_wipe_armed', f"wipe='{i['wipe']}'")
        await g.tap_el('#opt [data-close]'); await g.pump(20)
        await g.tap_el('#btnOpt'); await g.pump(20); i = await info(); print('   reopen: wipe label =', i['wipe'])
        await g.tap_el('#btnUnlock'); await g.pump(30); i = await info(); await snap('home_unlocked', f"open={json.loads(i['sv'])['open']} ls={(i['ls'] or '')[:80]}")
        # 每一關點一下，看說明文字
        for l in range(1, 7):
            await g.tap_el(f'#lvls > button:nth-child({l})'); await g.pump(50); await snap(f'home_sel{l}')
        if (await g.state())['rot']:
            # 直拿：設定裡的「畫面上下顛倒」
            await g.tap_el('#btnOpt'); await g.pump(20); await g.tap_el('#btnFlip'); await g.pump(40); st = await snap('opt_flipped', 'rot=' + str((await g.state())['rot']))
            await g.tap_el('#opt [data-close]'); await g.pump(20)
            # 顛倒之後拖曳方向對不對：進第一關，往「遊戲裡的右」拖，力道要變大；往「遊戲裡的上」拖，仰角要變大
            await g.tap_el('#lvls > button:nth-child(1)'); await g.pump(10); await g.tap_el('#btnGo'); await g.until("S.phase === 'aim' && S.turn === 0", 10)
            st = await g.state(); a0 = st['aim']; rot = st['rot']
            cx, cy = W / 2, H / 2
            await g.drag_begin(cx, cy); dx, dy = g.to_client(60, 0, rot); await g.drag_to(cx + dx, cy + dy, 6); a1 = (await g.state())['aim']
            dx2, dy2 = g.to_client(0, -50, rot); await g.drag_to(cx + dx + dx2, cy + dy + dy2, 6); a2 = (await g.state())['aim']
            await snap('flipped_dragging', f"aim {a0} -> right {a1} -> up {a2}  right_ok={a1[0] > a0[0]} up_ok={a2[1] > a1[1]}")
            await g.drag_end(); await g.pump(30); st = await g.state(); print('   released -> phase', st['phase'], 'fired', st['phase'] != 'aim')
        print('console:', g.msgs[:8])
asyncio.run(main())
