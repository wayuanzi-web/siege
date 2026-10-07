"""review3：拍一次砲擊／一次坍塌的連續畫面（看城樓怎麼垮）。圖和 JSON 存到 shots/review3/<name>.png / .json

  python3 test/review3-look/film3.py <關卡 1-6> --name=<檔名> [選項]
  python3 test/review3-look/film3.py @清單.txt          （一行一個場景，跟上面一樣的寫法；# 開頭的是註解）

  要拍什麼（擇一，預設是自動玩家打一輪）：
    --side=0|1            拍哪一邊開火（0 我方打敵城、1 敵軍打我方）；鏡頭對著被打的那座城
    --end=1               一路打到分出勝負，拍整座垮掉
    --kill=x,y[@t];…      把離 (x,y) 最近、還在原位的那一塊磚整塊打掉
    --cut=x,y[@t];…       只切掉樓板／長樑在 (x,y) 的那一格
    --bomb=x,y,武器[@t];… 在 (x,y) 直接引爆（rocket / bomb / fire / ice / zap / keg / drop / doom）
    --shot=x,y,vx,vy,武器[,mass][@t];…   從 (x,y) 發一顆真的砲彈
    --swarm=x,y,vx,vy,武器,n[,spread,mass][@t];…   一小群砲彈
    --js=程式[@t]         隨便跑一段（頁面裡有 q = __qp、S、R3）
    --until=條件          快轉到這個條件成立再開拍（例：S.phase==='hazard'&&S.hz 是落石砸下來的那一刻）；配 --cam=0|1
  其他：
    --bot=expert|casual|newbie   --seed=7   --skip=N（先打完 N 回合）   --diff=0|1|2
    --mute=0|1            讓某一邊整場只瞄不打（另一座城保持完好）
    --crop=x0,y0,x1,y1    鏡頭（戰場座標）；--cam=0|1 對著哪座城；--full=1 整個戰場
    --fine=0.1 每幾秒截一張   --tail=2 塵埃落定後多拍幾秒   --n=16 表上放幾格   --cols=4   --max=14
    --nohold=1            不要在這一輪結束時把戰局停住（看接下來自然發生的事）
    --from=T              表上從第 T 秒開始排（預設從第一下打中開始）   --pow=1.5 挑格子的疏密（1 = 等間隔）
    --hud=0               把上方資訊列也藏起來
"""
import asyncio, sys, pathlib, json, shlex, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from r3 import Session, start_level, view_info, Cam, capture, summary, parse_opts, OUT


def items(s):
    out = []
    for part in s.split(';'):
        part = part.strip()
        if not part: continue
        t = 0.0
        if '@' in part: part, tt = part.rsplit('@', 1); t = float(tt)
        out.append((part, t))
    return out


async def run_one(sess, argv):
    args, opt = parse_opts(argv)
    lvl = int(args[0]) if args else 1
    W, H = [int(x) for x in opt.get('size', '844x390').split('x')]; scale = float(opt.get('scale', 2))
    seed = int(opt.get('seed', 7)); bot = opt.get('bot', 'expert'); skip = int(opt.get('skip', 0)); side = int(opt.get('side', 0))
    staged = any(k in opt for k in ('kill', 'cut', 'bomb', 'shot', 'swarm', 'js'))
    name = opt.get('name') or f"L{lvl}_{opt.get('tag', 'a')}"
    ctx, pg, msgs = await sess.page(W, H, scale)
    try:
        await start_level(pg, lvl, seed, bot, int(opt['diff']) if 'diff' in opt else None, nohud=opt.get('hud') == '0')
        if 'mute' in opt: await pg.evaluate("(s) => { window.__qp.S.team[s].mute = true; }", int(opt['mute']))
        if 'pre' in opt: await pg.evaluate("(code) => { const q = window.__qp, S = q.S; (new Function('q', 'S', 'R3', code))(q, S, window.R3); }", opt['pre'])
        ok = await pg.evaluate("([skip, side]) => { const S = window.__qp.S; return R3.ff(() => S.state !== 'play' || (S.round >= skip + 1 && S.phase === 'aim' && S.turn === side), 600); }", [skip, side if not staged else 0])
        if 'until' in opt:
            # 再快轉到某個條件成立（例如落石階段開始：S.phase==='hazard'&&S.hz）
            ok = await pg.evaluate("(code) => { const q = window.__qp, S = q.S; const f = new Function('q', 'S', 'R3', 'return (' + code + ')'); return R3.ff(() => S.state !== 'play' || !!f(q, S, window.R3), 900); }", opt['until'])
        st0 = await pg.evaluate("R3.stat()")
        if st0['state'] != 'play' and 'end' not in opt:
            print(f"{name}: game already over before round {skip + 1} (state={st0['state']} round={st0['round']})"); return None
        info = await view_info(pg)
        cam_side = 1 - side
        endlen = None; imp_from = None; hold = 'nohold' not in opt; tgt_x = None
        if 'end' in opt:
            await pg.evaluate("() => { const S = window.__qp.S; R3.ff(() => S.state !== 'play', 900); }")
            loser = await pg.evaluate("window.__qp.S.loser"); cam_side = loser if loser in (0, 1) else 1
            endlen = float(opt.get('endlen', 6.0)); hold = False; imp_from = 0.0
        elif staged:
            cam_side = int(opt.get('cam', 1)); imp_from = 0.0; last = 0.0
            for key in ('kill', 'cut', 'bomb', 'shot', 'swarm', 'js'):
                if key not in opt: continue
                for part, t in (items(opt[key]) if key != 'js' else [(opt[key].rsplit('@', 1)[0], float(opt[key].rsplit('@', 1)[1])) if '@' in opt[key] and opt[key].rsplit('@', 1)[1].replace('.', '').isdigit() else (opt[key], 0.0)]):
                    last = max(last, t)
                    if key == 'js': code = part
                    else:
                        v = part.split(',')
                        if key == 'kill': code = f"R3.kill({float(v[0])}, {float(v[1])})"
                        elif key == 'cut': code = f"R3.cut({float(v[0])}, {float(v[1])})"
                        elif key == 'bomb': code = f"R3.bomb({float(v[0])}, {float(v[1])}, {json.dumps(v[2])})"
                        elif key == 'shot': code = f"R3.shot({float(v[0])}, {float(v[1])}, {float(v[2])}, {float(v[3])}, {json.dumps(v[4])}, {float(v[5]) if len(v) > 5 else 1})"
                        elif key == 'swarm': code = f"R3.swarm({float(v[0])}, {float(v[1])}, {float(v[2])}, {float(v[3])}, {json.dumps(v[4])}, {int(v[5])}, {float(v[6]) if len(v) > 6 else 0.02}, {float(v[7]) if len(v) > 7 else 0.4})"
                    if t <= 0:
                        r = await pg.evaluate("(code) => { const q = window.__qp, S = q.S; R3.resolve(); const r = (new Function('q', 'S', 'R3', 'return (' + code + ')'))(q, S, window.R3); return r === undefined ? null : JSON.stringify(r); }", code)
                        print(f"   {key} {part} -> {r}")
                    else:
                        await pg.evaluate("([code, t]) => { const q = window.__qp, S = q.S; R3.resolve(); R3.later(t, () => (new Function('q', 'S', 'R3', 'return (' + code + ')'))(q, S, window.R3)); }", [code, t])
            await pg.evaluate("(t) => { R3.noEndBefore = window.__qp.S.time + t + 0.3; }", last)
        elif 'until' in opt:
            cam_side = int(opt.get('cam', 0)); imp_from = float(opt['from']) if 'from' in opt else None
        else:
            if 'aim' in opt:
                vx, vy = [float(v) for v in opt['aim'].split(',')]
                await pg.evaluate("([s, vx, vy]) => { const q = window.__qp; q.S.team[s].ai = null; q.simAim(s, vx, vy); q.simFire(s); }", [side, vx, vy])
            else:
                await pg.evaluate("() => { const S = window.__qp.S; R3.ff(() => S.phase !== 'aim' || S.state !== 'play', 20); }")
            tg = info['st'][1 - side]; tgt_x = (tg[0] - 10, tg[2] + 10)
        tgt = info['st'][cam_side]
        if 'crop' in opt: world = [float(v) for v in opt['crop'].split(',')]
        elif 'full' in opt: world = [-6, -8, 118, 56]
        else: world = [tgt[0] - 14, -7, tgt[2] + 12, tgt[3] + 10] if cam_side == 1 else [tgt[0] - 12, -7, tgt[2] + 14, tgt[3] + 10]
        cam = Cam(info, W, H, scale, world)
        meta = await capture(pg, cam, W, H, scale, fine=float(opt.get('fine', 0.1)), tail=float(opt.get('tail', 2.0)), tmax=float(opt.get('max', 14.0)), n_act=int(opt.get('n', 16)), cols=int(opt.get('cols', 4)),
                             name=name, imp_from=float(opt['from']) if 'from' in opt else imp_from, hold=hold, endlen=endlen, note=' '.join(argv), tgt_x=tgt_x, power=float(opt.get('pow', 1.5)))
        s = summary(meta)
        if msgs: s += '\n    console: ' + ' | '.join(msgs[:6])
        print(s, flush=True)
        with open(OUT / 'log.txt', 'a') as f: f.write(time.strftime('%H:%M:%S ') + ' '.join(argv) + '\n' + s + '\n')
        return meta
    finally:
        await ctx.close()


async def main():
    argv = sys.argv[1:]
    jobs = []
    if argv and argv[0].startswith('@'):
        for line in pathlib.Path(argv[0][1:]).read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#'): jobs.append(shlex.split(line))
    else: jobs.append(argv)
    async with Session() as sess:
        for j in jobs:
            try: await run_one(sess, j)
            except Exception as e:
                import traceback; print('FAILED', ' '.join(j), '\n', traceback.format_exc(), flush=True)

asyncio.run(main())
