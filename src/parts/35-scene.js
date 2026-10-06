/* ===== 35-scene: 佈景的共用工具與組裝。每個場景自己一個檔（36-*.js），在 THEMES 裡登記 =====
   一個場景是一個物件：
     build(c, W, H)   畫靜態的遠景（天空、山…），只在進關卡或畫面大小改變時畫一次
     terrain(c)       畫地面（城腳所在的地、中間的地形），也是只畫一次
     back(c, t, dt)   每一幀畫在遠景上、城樓後面的會動的東西（雲、極光…），可省略
     front(c, t, dt)  每一幀畫在最前面的天氣（雪、沙、火星…），可省略
   座標一律用 X(wx)、Y(wy) 從戰場座標換成像素，V.s 是一個戰場單位幾個像素。 */
const THEMES = [];
const SCENE = { cv: null, key: '', theme: null, t: 0, wind: 0 };

// 一條由幾個正弦疊起來的稜線，回傳 f(x) ∈ 約 [-1, 1]
function ridgeFn(R, f0) {
  const p = [R() * TAU, R() * TAU, R() * TAU, R() * TAU];
  return (x) => Math.sin(x * f0 + p[0]) * 0.5 + Math.sin(x * f0 * 2.3 + p[1]) * 0.27 + Math.sin(x * f0 * 5.1 + p[2]) * 0.15 + Math.sin(x * f0 * 11.3 + p[3]) * 0.08;
}
// 畫一層山：稜線在 yBase ± amp（戰場座標），往下填到畫面底
function ridge(c, fn, yBase, amp, fill, step) {
  const x0 = V.x0 - 4, x1 = V.x1 + 4; step = step || 1.2;
  c.beginPath(); c.moveTo(X(x0), V.H + 2);
  for (let x = x0; x <= x1 + step; x += step) c.lineTo(X(x), Y(yBase + amp * fn(x)));
  c.lineTo(X(x1 + step), V.H + 2); c.closePath(); c.fillStyle = fill; c.fill();
}
// 有地面的區間（扣掉 voids）
function groundRuns() {
  const x0 = V.x0 - 8, x1 = V.x1 + 8, out = []; let a = x0;
  const v = (S.voids || []).slice().sort((p, q) => p[0] - q[0]);
  for (const [va, vb] of v) { if (va > a) out.push([a, Math.min(va, x1)]); a = Math.max(a, vb); }
  if (a < x1) out.push([a, x1]);
  return out;
}
// 沿著地面走一段路徑（dy 往上偏移，戰場單位）；first 為 true 時先 moveTo
function traceGround(c, xa, xb, dy, first) {
  const step = 0.5; let started = !first;
  for (let x = xa; x < xb; x += step) { const px = X(x), py = Y(groundYRaw(x) + dy); if (!started) { c.moveTo(px, py); started = true; } else c.lineTo(px, py); }
  c.lineTo(X(xb), Y(groundYRaw(xb) + dy));
}
function traceGroundBack(c, xa, xb, dy) { for (let x = xb; x > xa; x -= 0.5) c.lineTo(X(x), Y(groundYRaw(x) + dy)); c.lineTo(X(xa), Y(groundYRaw(xa) + dy)); }
// 不管 voids 的地面高度（畫圖用）
function groundYRaw(x) {
  const p = S.gpts; if (!p) return 0;
  if (x <= p[0][0]) return p[0][1];
  const n = p.length; if (x >= p[n - 1][0]) return p[n - 1][1];
  for (let i = 1; i < n; i++) if (x <= p[i][0]) { const a = p[i - 1], b = p[i]; return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0])); }
  return 0;
}
// 一般的實心地面：填色到畫面底，上緣一條表土
function solidGround(c, o) {
  for (const [xa, xb] of groundRuns()) {
    c.beginPath(); traceGround(c, xa, xb, 0, true); c.lineTo(X(xb), V.H + 4); c.lineTo(X(xa), V.H + 4); c.closePath();
    c.fillStyle = o.fill; c.fill();
    if (o.band) {
      c.beginPath(); traceGround(c, xa, xb, 0, true); traceGroundBack(c, xa, xb, -o.bandH); c.closePath(); c.fillStyle = o.band; c.fill();
    }
    if (o.edge) { c.beginPath(); traceGround(c, xa, xb, 0, true); c.strokeStyle = o.edge; c.lineWidth = Math.max(1.5, V.s * (o.edgeW || 0.35)); c.lineJoin = 'round'; c.stroke(); }
  }
}
// 軟綿綿的雲：幾個圓疊起來，畫進一張小圖，之後每幀只貼圖
function cloudSprite(w, h, R, top, bot, alpha) {
  const cv = mkCanvas(w, h), c = cv.getContext('2d'), n = 6 + ((R() * 4) | 0);
  c.fillStyle = bot;
  for (let k = 0; k < n; k++) { const x = w * (0.16 + 0.68 * (k / (n - 1))), r = h * (0.24 + 0.2 * Math.sin((k / (n - 1)) * Math.PI) + R() * 0.08); c.beginPath(); c.arc(x, h * 0.62 - r * 0.2, r, 0, TAU); c.fill(); }
  c.fillRect(w * 0.14, h * 0.6, w * 0.72, h * 0.22);
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = lg(c, 0, 0, 0, h, [0, top, 0.55, top, 1, bot]); c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'destination-in'; c.fillStyle = lg(c, 0, h * 0.62, 0, h * 0.86, [0, 'rgba(0,0,0,1)', 1, 'rgba(0,0,0,0)']); c.fillRect(0, h * 0.62, w, h); c.fillStyle = '#000'; c.fillRect(0, 0, w, h * 0.62);
  c.globalCompositeOperation = 'source-over';
  cv._a = alpha === undefined ? 1 : alpha;
  return cv;
}

function sceneBuild(force) {
  const th = THEMES[S.lv.theme] || THEMES[0], key = S.idx + '|' + V.W + '|' + V.H + '|' + V.padL;
  if (!force && SCENE.key === key && SCENE.cv) return;
  SCENE.key = key; SCENE.theme = th;
  const cv = SCENE.cv && SCENE.cv.width === V.W && SCENE.cv.height === V.H ? SCENE.cv : mkCanvas(V.W, V.H), c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, V.W, V.H);
  c.save(); th.build(c, V.W, V.H); c.restore();
  c.save(); th.terrain(c); c.restore();
  if (typeof drawFoundations === 'function') { c.save(); drawFoundations(c); c.restore(); }
  SCENE.cv = cv;
  if (th.init) th.init();
}
function sceneBack(c, t, dt) { c.drawImage(SCENE.cv, 0, 0); const th = SCENE.theme; if (th && th.back) { c.save(); th.back(c, t, dt); c.restore(); } }
function sceneFront(c, t, dt) { const th = SCENE.theme; if (th && th.front) { c.save(); th.front(c, t, dt); c.restore(); } }
