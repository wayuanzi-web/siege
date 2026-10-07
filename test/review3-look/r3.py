"""review3 的共用工具：開頁面、把戰局推到指定的時刻、動手腳（引爆、打掉磚、切樓板、發一顆真的砲彈）、
連續截圖並自動挑畫面排成一張表，另外把每一幀的數字和最後靜止時的檢查結果寫成 JSON。

從 test/film.py 改寫，多了：
  * 事件紀錄（boom / cell / udie / yelp / chain …），用來找「第一下打中」的時刻，從那之前一格開始排
  * 這一輪塵埃落定之後把戰局停住（S.phase = 'r3hold'），再多拍兩秒：最後三格應該一模一樣，不一樣就是有東西還在動
  * 靜止檢查：沒有東西撐著卻不動的磚和兵、互相卡進去的、腳底下是空的兵
  * 跳出來的字有沒有互相蓋到（有的話另外存一張全畫面）
圖一律存到 shots/review3/。
"""
import asyncio, io, json, math, pathlib
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'shots' / 'review3'
OUT.mkdir(parents=True, exist_ok=True)
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
    FONT_S = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
except Exception:
    FONT = FONT_S = ImageFont.load_default()

HELPERS = r"""
(() => {
  const q = window.__qp, S = q.S, PH = q.PH, SH = q.SH, STEP = 1 / 60;
  const KEEP = new Set(['boom', 'cell', 'udie', 'yelp', 'chain', 'thud', 'orbback', 'orb', 'orbgo', 'orbdie', 'phase', 'bossback', 'end', 'gate', 'pop', 'revive', 'bonus', 'skip', 'freeze', 'turn', 'round', 'volley', 'rockwarn', 'rumble', 'launch', 'ignite', 'gbreak', 'barbreak', 'shield', 'ult', 'drop', 'zap', 'rockstop', 'lantern', 'sudden']);
  const R = { log: [], hold: false, held: false, heldAt: -1, noEndBefore: 0, sched: [] };
  // 凍結即時迴圈之後，真實時間跟戰局時間就脫鉤了；靠 performance.now() 節流的特效（「×3」多久跳一次、整個畫面多久閃一次）改成看戰局時間
  if (q.G.freeze) { const base = performance.now(), t00 = S.time; performance.now = () => base + (S.time - t00) * 1000; }
  R.hook = () => {
    const orig = S.on;
    S.on = function (t, a, b, c, d, e, f) {
      if (KEEP.has(t)) { const n = (v) => (typeof v === 'number' ? +v.toFixed(2) : typeof v === 'string' ? v : null); R.log.push([+S.time.toFixed(3), t, n(a), n(b), n(c), n(d), n(e)]); }
      return orig.apply(this, arguments);
    };
  };
  // 不畫圖，只把戰局往前推（快轉用）
  // （屋內暗色背景的淡出是在畫圖的時候算的：快轉完補畫一次、一步到位，不然早就垮掉的房間背景會留到開拍的頭幾格）
  R.ff = (cond, maxSec) => { let n = 0; const lim = Math.round((maxSec || 400) * 60); while (n++ < lim && !cond()) { q.simStep(STEP); q.fxStep(STEP, STEP); if (q.G.mode === 'play' && S.state !== 'play') q.G.endT += STEP; } q.renderFrame(0, 1); return n < lim; };
  R.render = () => { if (q.G.mode === 'play') q.hudUpdate(); q.renderFrame(STEP, STEP); };
  // 跟 __qp.advance 一樣，多了兩件事：排好時間的手腳到點就做；這一輪快要結束的那一步把戰局停住
  R.adv = (sec) => {
    const n = Math.round(sec / STEP); let acc = 0;
    for (let i = 0; i < n; i++) {
      while (R.sched.length && R.sched[0].t <= S.time + 1e-9) { const e = R.sched.shift(); e.fn(); }
      if (R.hold && !R.held && !R.sched.length && S.time >= R.noEndBefore && S.state === 'play' && (S.phase === 'resolve' || S.phase === 'hazard') && (S.quietT + STEP >= 0.45 - 1e-6 || S.phaseT + STEP > 9)) {
        R.held = true; R.heldAt = S.time; R.heldPhase = S.phase; R.heldTimeout = S.phaseT + STEP > 9 ? 1 : 0;
        if (S.chain >= 6) S.on('chain', S.chain, S.turn);         // chainNote() 會做的事（「坍塌 ×N」）
        S.phase = 'r3hold';
      }
      q.simStep(STEP); q.fxStep(STEP, STEP); acc += STEP;
      if (q.G.mode === 'play' && S.state !== 'play') q.G.endT += STEP;
      if (acc >= 0.05 && i < n - 1) { q.renderFrame(acc, acc); acc = 0; }
    }
    if (q.G.mode === 'play') q.hudUpdate();
    q.renderFrame(acc || STEP, acc || STEP);
  };
  R.stat = () => {
    let aw = 0; for (let b = PH.world.getBodyList(); b; b = b.getNext()) if (b.isDynamic() && b.isAwake()) aw++;
    const V = q.V, FX = q.FX;
    const pops = FX.pops.map((p) => { const f = p.t / p.max, sc = f < 0.12 ? 0.6 + f / 0.12 * 0.5 : 1.1 - Math.min(0.1, (f - 0.12) * 0.5), fz = p.size * V.s * sc; const x = Math.min(Math.max((p.x - 56) * V.s + V.cx, fz * 2), V.W - fz * 2), y = Math.max(V.gy - p.y * V.s - f * V.s * 3.5, V.hud + fz * 0.9); return { txt: p.txt, x: Math.round(x), y: Math.round(y), fz: Math.round(fz), a: +(f > 0.7 ? (1 - f) / 0.3 : 1).toFixed(2) }; });
    return { t: +S.time.toFixed(3), phase: S.phase, turn: S.turn, round: S.round, state: S.state, me: Math.round(q.teamBar(0) * 100), foe: Math.round(q.teamBar(1) * 100), shots: SH.n, awake: aw, chain: S.chain, a0: S.team[0].alive, a1: S.team[1].alive, nfrag: S.nfrag, nburn: S.nburn, pops, boss: S.boss ? S.boss.phase : 0, held: R.held ? 1 : 0, slow: +FX.slow.toFixed(2) };
  };
  R.probe = () => {
    const W = PH.world, info = new Map();
    const get = (b) => { let r = info.get(b); if (!r) { r = { nc: 0, sup: 0, pen: 0 }; info.set(b, r); } return r; };
    for (let c = W.getContactList(); c; c = c.getNext()) {
      if (!c.isTouching()) continue;
      const A = c.getFixtureA().getBody(), B = c.getFixtureB().getBody(), m = c.getManifold();
      if (!m.pointCount) continue;
      const wm = c.getWorldManifold(null); if (!wm) continue;
      let sep = 0; for (let k = 0; k < m.pointCount; k++) { const s = wm.separations[k]; if (s < sep) sep = s; }
      const ra = get(A), rb = get(B), ny = wm.normal.y;
      ra.nc++; rb.nc++; if (ny < -0.3) ra.sup++; if (ny > 0.3) rb.sup++;
      if (sep < ra.pen) ra.pen = sep; if (sep < rb.pen) rb.pen = sep;
    }
    const blocks = [], units = [], z = { nc: 0, sup: 0, pen: 0 };
    for (const b of S.blocks) {
      if (b.dead) continue;
      const bd = b.body, p = bd.getPosition(), v = bd.getLinearVelocity(), r = info.get(bd) || z;
      blocks.push({ id: b.id, side: b.side, mat: b.mat, kind: b.kind, frag: b.frag, prop: b.prop, seg: b.seg ? b.cw : 0, w: +b.w.toFixed(2), h: +b.h.toFixed(2), x: +p.x.toFixed(2), y: +p.y.toFixed(2), a: +bd.getAngle().toFixed(3), vx: +v.x.toFixed(2), vy: +v.y.toFixed(2), om: +bd.getAngularVelocity().toFixed(2), awake: bd.isAwake() ? 1 : 0, inPlace: b.inPlace ? 1 : 0, nc: r.nc, sup: r.sup, pen: +r.pen.toFixed(2), burn: b.burn > 0 ? 1 : 0, hp: +(b.hp / b.hm).toFixed(2), base: b.base ? 1 : 0, x0: +b.x0.toFixed(2), y0: +b.y0.toFixed(2) });
    }
    for (const u of S.units) {
      if (!u.alive) continue;
      const bd = u.body, p = bd.getPosition(), v = bd.getLinearVelocity(), r = info.get(bd) || z;
      const fy = p.y - u.bh / 2, hw = u.bw / 2, feet = [];
      for (const dx of [-hw * 0.85, 0, hw * 0.85]) { let hit = 0; W.rayCast({ x: p.x + dx, y: fy + 0.5 }, { x: p.x + dx, y: fy - 0.7 }, (f, pt, n, fr) => { if (f.getBody() === bd) return -1; const o = f.getUserData(); hit = o && !o.isBlock ? 2 : 1; return fr; }); feet.push(hit); }
      units.push({ side: u.side, slot: u.slot, type: u.type, x: +u.x.toFixed(2), y: +u.y.toFixed(2), vx: +v.x.toFixed(2), vy: +v.y.toFixed(2), awake: bd.isAwake() ? 1 : 0, nc: r.nc, sup: r.sup, pen: +r.pen.toFixed(2), feet, hp: +(u.hp / u.hpMax).toFixed(2), frozen: u.frozen, stun: u.stun, bw: +u.bw.toFixed(2), bh: +u.bh.toFixed(2), hx: +u.hx.toFixed(2), hy: +u.hy.toFixed(2) });
    }
    return { t: +S.time.toFixed(3), blocks, units, objs: S.objs.filter((o) => o.t === 'orb' || o.t === 'balloon' || o.t === 'lantern').map((o) => ({ t: o.t, st: o.st, x: +o.x.toFixed(1), y: +o.y.toFixed(1), hp: +o.hp.toFixed(1) })) };
  };
  // ---- 動手腳 ----
  R.nearest = (x, y, pred) => { let best = null, bd = 1e9; for (const b of S.blocks) { if (b.dead || (pred && !pred(b))) continue; const p = b.body.getPosition(), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = b; } } return best; };
  // 離 (x, y) 最近的那一塊（看表面距離，長樑、樓板才不會因為中心很遠而選不到）
  R.at = (x, y, pred) => {
    let best = null, bd = 1e9;
    for (const b of S.blocks) {
      if (b.dead || (pred && !pred(b))) continue;
      const p = b.body.getPosition(), a = b.body.getAngle(), c = Math.cos(a), s = Math.sin(a), dx = x - p.x, dy = y - p.y, lx = dx * c + dy * s, ly = -dx * s + dy * c;
      const hw = b.w / 2, hh = b.h / 2, qx = Math.max(-hw, Math.min(hw, lx)), qy = Math.max(-hh, Math.min(hh, ly)), d = Math.hypot(lx - qx, ly - qy) + Math.hypot(dx, dy) * 1e-3;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  };
  R.resolve = () => { if (S.phase === 'aim') { S.phase = 'resolve'; S.phaseT = 0; S.quietT = 0; S.vol++; S.chain = 0; } };
  R.kill = (x, y) => { const b = R.nearest(x, y, (o) => o.inPlace); if (!b) return null; R.resolve(); const r = { id: b.id, mat: b.mat, kind: b.kind, w: b.w, h: b.h, seg: b.seg ? b.cw : 0 }; q.blockKill(b, 0, 0); return r; };
  // 只切掉樓板／長樑的一格（跟被砲彈一格一格打穿一樣）：把那一格的耐久調到只剩一點，再補一箭
  R.cut = (x, y) => {
    const b = R.at(x, y, (o) => o.seg && !o.frag); if (!b) return null; R.resolve();
    const p = b.body.getPosition(), a = b.body.getAngle(), lx = (x - p.x) * Math.cos(a) + (y - p.y) * Math.sin(a);
    let k = Math.floor((lx + b.w / 2) / (b.w / b.cw)); k = k < 0 ? 0 : k >= b.cw ? b.cw - 1 : k;
    b.seg[k] = 0.01;
    const r = { id: b.id, mat: b.mat, cw: b.cw, k };
    q.physExplode(x, y, q.WPN.bolt, 0, 1, 0, b, 0, -1);
    return r;
  };
  R.bomb = (x, y, w, side) => { R.resolve(); q.physExplode(x, y, q.WPN[w], side === undefined ? 0 : side, 1, 0, null, 1, -0.3); return w; };
  // 一顆真的砲彈（不是直接引爆）：會照正常的規則打中第一個碰到的東西
  R.shot = (x, y, vx, vy, w, mass, side, flag) => {
    R.resolve(); const i = SH.n++; side = side === undefined ? 0 : side;
    SH.x[i] = x; SH.y[i] = y; SH.vx[i] = vx; SH.vy[i] = vy; SH.age[i] = 1; SH.mass[i] = mass || 1; SH.side[i] = side; SH.w[i] = q.WPN[w].i; SH.flag[i] = flag || 0; SH.mask[i] = 0; SH.lin[i] = 1; SH.cnt[side]++;
    return i;
  };
  // 一小群砲彈（穿過倍增符之後的樣子）
  R.swarm = (x, y, vx, vy, w, n, spread, mass, side) => { for (let k = 0; k < n; k++) { const a = (k - (n - 1) / 2) * (spread || 0.02), c = Math.cos(a), s = Math.sin(a); R.shot(x - vx * 0.012 * k, y - vy * 0.012 * k, vx * c - vy * s, vy * c + vx * s, w, mass || 0.4, side); } };
  R.later = (dt, fn) => { R.sched.push({ t: S.time + dt, fn }); R.sched.sort((a, b) => a.t - b.t); };
  // 從砲口打到 (tx, ty)：tau 秒後到
  R.aimAt = (side, tx, ty, tau) => { const T = S.team[side]; let lead = null; for (const u of T.units) if (u.alive && u.w) { lead = u; break; } if (!lead) return null; const big = lead.def.big ? 1.85 : 1, mx = lead.x + T.dir * 1.3 * big, my = lead.y + 2.3 * big, w = S.wind; return [(tx - mx - 0.5 * w * tau * tau) / tau, (ty - my + 0.5 * 48 * tau * tau) / tau]; };
  window.R3 = R;
})();
"""


def parse_opts(argv):
    args = [a for a in argv if not a.startswith('--')]
    opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in argv if a.startswith('--'))
    return args, opt


class Session:
    """一個瀏覽器、一次只開一頁。"""
    def __init__(self):
        self.p = None; self.b = None

    async def __aenter__(self):
        self.p = await async_playwright().start()
        self.b = await self.p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        return self

    async def __aexit__(self, *a):
        await self.b.close(); await self.p.stop()

    async def page(self, W=844, H=390, scale=2, touch=False):
        ctx = await self.b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=scale, has_touch=touch, is_mobile=touch)
        pg = await ctx.new_page(); msgs = []
        pg.on('console', lambda m: msgs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: msgs.append('PAGEERR ' + str(e)))
        await pg.goto((ROOT / 'src/dist/index.html').as_uri()); await pg.wait_for_timeout(600)
        return ctx, pg, msgs


async def start_level(pg, lvl, seed=7, bot='expert', diff=None, clean=True, nohud=False):
    await pg.evaluate("""([l, seed, bot, diff]) => { const q = window.__qp; q.G.freeze = true;
        Math.random = (() => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
        if (diff !== null) q.SV.diff = diff;
        q.startLevel(l - 1); if (bot) q.aiInit(q.S.team[0], q.BOTS[bot], {aiErr: 1}); }""", [lvl, seed, bot, diff])
    await pg.evaluate(HELPERS); await pg.evaluate("R3.hook()")
    css = ''
    if clean: css += '#banner,#say,#hint,#mile{display:none!important}'
    if nohud: css += '#hud{display:none!important}'
    if css: await pg.add_style_tag(content=css)


def flags_from(probe, probe0=None):
    """靜止檢查。回傳 [(種類, 說明, x, y)]"""
    out = []
    for u in probe['units']:
        sp = math.hypot(u['vx'], u['vy'])
        who = f"unit s{u['side']}#{u['slot']}({u['type']})"
        if sp < 0.6:
            if u['sup'] == 0 and u['feet'] == [0, 0, 0]: out.append(('U_AIR', f"{who} at rest with nothing under it", u['x'], u['y']))
            elif u['feet'][1] == 0: out.append(('U_EDGE', f"{who} centre of feet over nothing feet={u['feet']} sup={u['sup']}", u['x'], u['y']))
            if 2 in u['feet']: out.append(('U_ONUNIT', f"{who} standing on another unit feet={u['feet']}", u['x'], u['y']))
        if u['pen'] < -0.3: out.append(('U_PEN', f"{who} overlaps something by {-u['pen']:.2f}", u['x'], u['y']))
    for b in probe['blocks']:
        sp = math.hypot(b['vx'], b['vy'])
        who = f"block#{b['id']} mat{b['mat']} {b['kind']}{' frag' if b['frag'] else ''}{' prop' if b['prop'] else ''} {b['w']}x{b['h']}"
        if not b['awake'] and b['nc'] == 0: out.append(('B_FLOAT', f"{who} asleep with no contact at all", b['x'], b['y']))
        elif sp < 0.3 and abs(b['om']) < 0.2 and b['sup'] == 0 and b['y'] > 1.0: out.append(('B_NOSUP', f"{who} at rest with no supporting contact (nc={b['nc']})", b['x'], b['y']))
        if b['pen'] < -0.35: out.append(('B_PEN', f"{who} overlaps something by {-b['pen']:.2f}", b['x'], b['y']))
        if b['awake'] and (sp > 0.05 or abs(b['om']) > 0.05): out.append(('B_AWAKE', f"{who} still moving v={sp:.2f} om={b['om']}", b['x'], b['y']))
    if probe0:
        old = {b['id']: b for b in probe0['blocks']}
        for b in probe['blocks']:
            o = old.get(b['id'])
            if not o: continue
            d = math.hypot(b['x'] - o['x'], b['y'] - o['y']); da = abs(b['a'] - o['a'])
            if d > 0.2 or da > 0.06:
                out.append(('B_CREEP', f"block#{b['id']} mat{b['mat']} {b['kind']}{' frag' if b['frag'] else ''}{' prop' if b['prop'] else ''} moved {d:.2f} rot {da:.2f} after the turn ended", b['x'], b['y']))
        oldu = {(u['side'], u['slot']): u for u in probe0['units']}
        for u in probe['units']:
            o = oldu.get((u['side'], u['slot']))
            if o and math.hypot(u['x'] - o['x'], u['y'] - o['y']) > 0.2: out.append(('U_CREEP', f"unit s{u['side']}#{u['slot']} moved {math.hypot(u['x'] - o['x'], u['y'] - o['y']):.2f} after the turn ended", u['x'], u['y']))
    return out


def pop_overlaps(pops):
    """跳出來的字互相蓋到的（用字數估寬度）。回傳 [(a, b)]"""
    out = []
    def box(p):
        n = sum(1.0 if ord(ch) > 255 else 0.62 for ch in p['txt'])
        return p['x'] - n * p['fz'] / 2, p['y'] - p['fz'] * 0.55, p['x'] + n * p['fz'] / 2, p['y'] + p['fz'] * 0.55
    for i in range(len(pops)):
        for j in range(i + 1, len(pops)):
            a, b = pops[i], pops[j]
            if a['a'] < 0.35 or b['a'] < 0.35: continue
            A, B = box(a), box(b)
            ox = min(A[2], B[2]) - max(A[0], B[0]); oy = min(A[3], B[3]) - max(A[1], B[1])
            if ox > 0.25 * min(A[2] - A[0], B[2] - B[0]) and oy > 0.35 * min(A[3] - A[1], B[3] - B[1]): out.append((a['txt'], b['txt']))
    return out


async def view_info(pg):
    return await pg.evaluate("(() => { const q = window.__qp, V = q.V, S = q.S; return {s: V.s, cx: V.cx, gy: V.gy, W: V.W, H: V.H, hud: V.hud, st: S.st.map(t => [t.x0, t.y0, t.x1, t.y1])}; })()")


class Cam:
    """戰場座標 → 截圖像素；box 是裁下來的那一塊。"""
    def __init__(self, info, W, H, scale, world):
        self.k = scale / (info['W'] / W); self.s = info['s']; self.cx = info['cx']; self.gy = info['gy']
        cx0, cy0, cx1, cy1 = world
        sc = int(scale); ev = lambda v: int(v) // sc * sc          # 對齊到整數的 CSS 像素，截圖才不會被重新取樣
        self.box = (ev(max(0, self.X(cx0))), ev(max(0, self.Y(cy1))), ev(min(W * scale, self.X(cx1))), ev(min(H * scale, self.Y(cy0))))
        self.clip = {'x': self.box[0] / scale, 'y': self.box[1] / scale, 'width': (self.box[2] - self.box[0]) / scale, 'height': (self.box[3] - self.box[1]) / scale}
        self.world = world
    def X(self, wx): return ((wx - 56) * self.s + self.cx) * self.k
    def Y(self, wy): return (self.gy - wy * self.s) * self.k
    def tile(self, wx, wy): return self.X(wx) - self.box[0], self.Y(wy) - self.box[1]
    def meta(self): return {'k': self.k, 's': self.s, 'cx': self.cx, 'gy': self.gy, 'box': self.box, 'world': self.world, 'ppu': self.s * self.k}


def label(im, txt, sub=None, col=(255, 255, 255)):
    d = ImageDraw.Draw(im)
    d.text((6, 4), txt, fill=col, font=FONT, stroke_width=3, stroke_fill=(0, 0, 0))
    if sub: d.text((6, 26), sub, fill=(255, 230, 120), font=FONT_S, stroke_width=3, stroke_fill=(0, 0, 0))


def make_sheet(tiles, cols, gap=4):
    tw, th = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (tw * cols + gap * (cols - 1), th * rows + gap * (rows - 1)), (20, 20, 28))
    for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * (tw + gap), (i // cols) * (th + gap)))
    return sheet


def pick(n0, n1, n, power=1.5):
    """n0..n1 之間挑 n 格，前面密、後面疏"""
    if n1 <= n0: return [n0]
    if n1 - n0 + 1 <= n: return list(range(n0, n1 + 1))
    out = []
    for i in range(n):
        v = n0 + round((n1 - n0) * (i / (n - 1)) ** power)
        while v in out and v < n1: v += 1
        if v not in out: out.append(v)
    return sorted(out)


async def capture(pg, cam, W, H, scale, *, fine=0.1, tail=2.0, tmax=14.0, n_act=13, cols=4, name='x', imp_from=None, hold=True, endlen=None, note='', lead_frames=1, keep_pops=True, tgt_x=None, power=1.5):
    """從現在開始每 fine 秒截一張，直到這一輪塵埃落定再多拍 tail 秒（或拍滿 endlen 秒）。挑畫面排成一張表。"""
    await pg.evaluate("(h) => { R3.hold = h; R3.held = false; R3.log.length = 0; R3.t0 = window.__qp.S.time; }", bool(hold))
    await pg.evaluate("R3.render()")
    frames = []; t = 0.0; held_t = None; probe0 = None; pop_hit = None
    while True:
        png = await pg.screenshot(clip=cam.clip)
        st = await pg.evaluate("R3.stat()")
        frames.append({'t': round(t, 3), 'png': png, 'st': st})
        if keep_pops and st['pops']:
            ov = pop_overlaps(st['pops'])
            if ov and (pop_hit is None or len(ov) > len(pop_hit[1])): pop_hit = (Image.open(io.BytesIO(await pg.screenshot())).convert('RGB'), ov, round(t, 3))
        if st['held'] and held_t is None:
            held_t = t; probe0 = await pg.evaluate("R3.probe()")
        if endlen is not None:
            if t >= endlen - 1e-6: break
        elif held_t is not None and t >= held_t + tail - 1e-6: break
        elif t >= tmax - 1e-6: break
        elif hold and st['state'] != 'play' and t > 1.0 and held_t is None:
            # 這一輪打完就分出勝負了：改成拍垮城
            endlen = t + 5.0
        await pg.evaluate("(dt) => R3.adv(dt)", fine); t += fine
    probe1 = await pg.evaluate("R3.probe()")
    log = await pg.evaluate("R3.log"); t0 = await pg.evaluate("R3.t0")
    # 第一下打中：第一個 boom / cell（只看目標那一側的）
    t_imp = None
    for e in log:
        if e[1] in ('boom', 'cell', 'udie'):
            if tgt_x is not None and isinstance(e[2], (int, float)) and not (tgt_x[0] <= e[2] <= tgt_x[1]): continue
            t_imp = e[0] - t0; break
    if imp_from is not None: t_imp = imp_from
    nF = len(frames)
    i_imp = 0 if t_imp is None else max(0, min(nF - 1, int(math.floor(t_imp / fine + 1e-6)) - (lead_frames - 1)))
    if held_t is not None:
        i_q = min(nF - 1, int(round(held_t / fine)))
        rest = [min(nF - 1, int(round((held_t + tail * 0.5) / fine))), nF - 1]
    else:
        i_q = nF - 1; rest = []
    act = pick(i_imp, i_q, n_act - len(rest), power)
    idx = act + [r for r in rest if r not in act]
    tiles = []
    for k, i in enumerate(idx):
        f = frames[i]; st = f['st']; im = Image.open(io.BytesIO(f['png'])).convert('RGB')
        is_rest = held_t is not None and f['t'] >= held_t - 1e-6
        label(im, f"#{k + 1} t+{f['t']:.2f}s {st['phase']}{st['turn']} me{st['me']} foe{st['foe']} sh{st['shots']} aw{st['awake']} ch{st['chain']} fr{st['nfrag']}" + (' REST' if is_rest else ''), None, (140, 255, 160) if is_rest else (255, 255, 255))
        tiles.append(im)
    sheet = make_sheet(tiles, cols)
    out = OUT / f'{name}.png'; sheet.save(out)
    fl = flags_from(probe1, probe0) if held_t is not None else flags_from(probe1, None)
    pop_file = None
    if pop_hit:
        pop_file = OUT / f'{name}_pop.png'; pop_hit[0].save(pop_file)
    ev_count = {}
    for e in log: ev_count[e[1]] = ev_count.get(e[1], 0) + 1
    meta = {
        'name': name, 'note': note, 'sheet': str(out), 'cols': cols, 'tile': list(tiles[0].size), 'gap': 4, 'cam': cam.meta(),
        'frames': [{'k': k + 1, 't': frames[i]['t'], 'st': {kk: vv for kk, vv in frames[i]['st'].items()}} for k, i in enumerate(idx)],
        't_imp': t_imp, 'held_t': held_t, 'n_captured': nF, 'events': ev_count,
        'udie': [e for e in log if e[1] == 'udie'], 'chain': [e for e in log if e[1] == 'chain'], 'yelp': [e for e in log if e[1] == 'yelp'],
        'flags': [{'kind': a, 'msg': b, 'x': x, 'y': y, 'tile_px': [round(v) for v in cam.tile(x, y + 1.5)]} for a, b, x, y in fl],
        'pop_overlap': {'file': str(pop_file), 'pairs': pop_hit[1], 't': pop_hit[2]} if pop_hit else None,
        'final': {'me': frames[-1]['st']['me'], 'foe': frames[-1]['st']['foe'], 'a0': frames[-1]['st']['a0'], 'a1': frames[-1]['st']['a1'], 'state': frames[-1]['st']['state'], 'awake': frames[-1]['st']['awake'], 'nfrag': frames[-1]['st']['nfrag']},
        'first': {'me': frames[0]['st']['me'], 'foe': frames[0]['st']['foe'], 'a0': frames[0]['st']['a0'], 'a1': frames[0]['st']['a1'], 'round': frames[0]['st']['round']},
        'heldTimeout': await pg.evaluate("R3.heldTimeout || 0"),
        'probe_end': probe1,
    }
    (OUT / f'{name}.json').write_text(json.dumps(meta, ensure_ascii=False))
    return meta


def summary(meta, verbose=True):
    f0, f1 = meta['first'], meta['final']
    s = f"{meta['name']}: r{f0['round']} me {f0['me']}→{f1['me']} foe {f0['foe']}→{f1['foe']} alive {f0['a0']}/{f0['a1']}→{f1['a0']}/{f1['a1']} imp={meta['t_imp'] if meta['t_imp'] is None else round(meta['t_imp'], 2)} held={meta['held_t'] if meta['held_t'] is None else round(meta['held_t'], 2)}{' TIMEOUT' if meta.get('heldTimeout') else ''} cap={meta['n_captured']} ev={meta['events']} end_awake={f1['awake']} nfrag={f1['nfrag']} state={f1['state']}"
    if meta['udie']: s += '\n    udie: ' + '; '.join(f"t{e[0]} side{e[4]} {e[5]} how{e[6]} @({e[2]},{e[3]})" for e in meta['udie'])
    if meta['pop_overlap']: s += f"\n    POP OVERLAP t+{meta['pop_overlap']['t']} {meta['pop_overlap']['pairs']} -> {meta['pop_overlap']['file']}"
    if verbose and meta['flags']:
        kinds = {}
        for fl in meta['flags']: kinds.setdefault(fl['kind'], []).append(fl)
        for kd, lst in kinds.items():
            s += f"\n    {kd} x{len(lst)}: " + ' | '.join(f"{fl['msg']} @({fl['x']},{fl['y']}) px{fl['tile_px']}" for fl in lst[:6]) + (' ...' if len(lst) > 6 else '')
    return s
