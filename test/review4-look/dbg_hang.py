"""驗證「快要倒卻睡著」：把一根木樑（10.2 x 3.4）豎起來、用右下角立在草地上，往右歪 θ 度（平衡點是 18.4 度），不給任何速度，
   照遊戲自己的每一步往前推 8 秒，看它會不會停在半路睡著；順便驗證 hook_hang.js 的檢查抓不抓得到。"""
import asyncio, sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from start4 import START, start_args
from q4 import Game, OUT, label
from PIL import Image

async def main():
    save = {'coins': 0, 'stars': [0] * 6, 'open': 6, 'up': {'dmg': 0, 'aim': 0, 'hp': 0, 'shield': 0, 'ult': 0}, 'sfx': True, 'mus': True, 'vib': True, 'seen': True, 'seenUlt': True, 'seenSh': True, 'diff': 1, 'flip': False}
    tiles = []
    async with Game(844, 390, scale=2, save=save) as g:
        await g.sec(0.5); await g.js(pathlib.Path(__file__).with_name('hook_hang.js').read_text()); await g.js("window.__hook = null")
        await g.pg.add_style_tag(content='#say,#hint,#mile,#banner{display:none!important}')
        for what, sel, balance in (('beam 10.2x3.4', "b.side === 1 && b.mat === 1 && Math.abs(b.w - 10.2) < 0.1 && Math.abs(b.h - 3.4) < 0.1", 18.4), ('post 2.1x6.8', "b.side === 1 && b.mat === 1 && Math.abs(b.h - 6.8) < 0.1 && b.w < 2.5", 17.2)):
            for deg in (balance - 3, balance + 0.3, balance + 1, balance + 2, balance + 3, balance + 5, balance + 8):
                await g.js(START, start_args(1, 1, None)); await g.until("S.phase === 'aim' && S.turn === 0", 10)
                r = await g.js("""([sel, deg, standOnEnd]) => { const q = window.__qp, S = q.S; S.team[0].mute = S.team[1].mute = true;
                    const b = S.blocks.find((b) => !b.dead && (new Function('b', 'return ' + sel))(b)); if (!b) return null;
                    // 立起來：長邊朝上。beam 的長邊是 w，要先轉 90 度；post 的長邊本來就是 h
                    const L = Math.max(b.w, b.h), Wd = Math.min(b.w, b.h), base = b.w > b.h ? Math.PI / 2 : 0, th = deg * Math.PI / 180;
                    // 以「立著的長方形」來想：半寬 hw = Wd/2、半高 hh = L/2，順時針歪 th，右下角著地
                    const hw = Wd / 2, hh = L / 2, cxo = -(hw * Math.cos(th) - hh * Math.sin(th)), cyo = hw * Math.sin(th) + hh * Math.cos(th);
                    const gx = 116, gy = (gx - 112) * 3 / 40;
                    b.body.setTransform({ x: gx + cxo, y: gy + cyo + 0.01 }, base - th); b.body.setLinearVelocity({ x: 0, y: 0 }); b.body.setAngularVelocity(0); b.body.setAwake(true); b.inPlace = false; b.gone = true; b.calm = false; b.body.setLinearDamping(0); b.body.setAngularDamping(0.08);
                    const track = []; let slept = -1;
                    for (let i = 0; i < 480; i++) { q.simStep(1 / 60); if (b.dead || !b.body) return { deg: +deg.toFixed(1), broke: true, track: track.join(' ') }; const tilt = (base - b.body.getAngle()) * 180 / Math.PI; if (i % 30 === 29) track.push(tilt.toFixed(1) + (b.body.isAwake() ? '' : 'z')); if (slept < 0 && !b.body.isAwake()) slept = (i + 1) / 60; }
                    const tilt = (base - b.body.getAngle()) * 180 / Math.PI, p = b.body.getPosition();
                    const fl = window.__hangProbe().filter((f) => Math.abs(f.x - p.x) < 0.3);
                    q.renderFrame(0, 0);
                    return { deg: +deg.toFixed(1), finalTilt: +tilt.toFixed(1), asleepAt: slept, track: track.join(' '), flagged: fl.length ? { over: fl[0].over, span: fl[0].span, comX: fl[0].comX } : null, pos: [+p.x.toFixed(1), +p.y.toFixed(1)] }; }""", [sel, deg, True])
                print(what, json.dumps(r, ensure_ascii=False))
                if r and not r.get('broke') and abs(r['finalTilt']) < 60:
                    im = await g.shot(None, clip={'x': 690, 'y': 200, 'width': 154, 'height': 170}); label(im, f"{what} start {r['deg']} -> rests {r['finalTilt']} deg"); tiles.append(im)
    if tiles:
        out = Image.new('RGB', (sum(t.size[0] for t in tiles) + 6 * (len(tiles) - 1), tiles[0].size[1])); x = 0
        for t in tiles: out.paste(t, (x, 0)); x += t.size[0] + 6
        out.save(OUT / 'dbg_hang_frozen.png'); print('saved', out.size)
asyncio.run(main())
