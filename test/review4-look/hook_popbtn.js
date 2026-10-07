// 「擊倒！／轟飛了！…」這些字（畫在 canvas 上）有多少被右下角的技能鈕、左下角的發射鈕蓋住：
// 每一個新跳出來的擊倒字，在它出現後第 12 格（已經放大到正常大小）量它的範圍，跟各個按鈕的範圍比，記下被蓋住的面積比例。
(() => {
  const q = window.__qp, S = q.S, FX = q.FX, V = q.V, seen = new WeakMap(), out = { kills: 0, covered30: 0, covered60: 0, samples: [] };
  const KILL = new Set(['砸扁！', '摔下去了！', '轟出城外！', '轟飛了！', '燒到了！', '擊倒！', '被轟出城', '摔下去了', '被轟飛了', '被砸扁了', '陣亡']);
  const mc = document.createElement('canvas').getContext('2d');
  window.__hook = () => {
    if (q.G.mode !== 'play' || S.state !== 'play') return;
    for (const p of FX.pops) {
      if (!KILL.has(p.txt)) continue;
      const n = (seen.get(p) || 0) + 1; seen.set(p, n); if (n !== 12) continue;
      const f = p.t / p.max, sc = f < 0.12 ? 0.6 + f / 0.12 * 0.5 : 1.1 - Math.min(0.1, (f - 0.12) * 0.5), fz = p.size * V.s * sc, k = 1 / V.dpr;
      mc.font = '900 ' + fz + 'px "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif';
      const w = mc.measureText(p.txt).width, x = Math.min(Math.max((p.x - 56) * V.s + V.cx, fz * 2), V.W - fz * 2), y = Math.max(V.gy - p.y * V.s - f * V.s * 3.5, V.hud + fz * 0.9);
      const r = { x0: (x - w / 2) * k, x1: (x + w / 2) * k, y0: (y - fz * 0.55) * k, y1: (y + fz * 0.55) * k }, area = (r.x1 - r.x0) * (r.y1 - r.y0);
      let cov = 0, by = '';
      for (const id of ['btnShield', 'btnUlt', 'btnFire', 'aimInfo', 'turnChip']) { const el = document.getElementById(id); if (!el || el.hidden) continue; const b = el.getBoundingClientRect(); const ox = Math.min(r.x1, b.right) - Math.max(r.x0, b.left), oy = Math.min(r.y1, b.bottom) - Math.max(r.y0, b.top); if (ox > 0 && oy > 0) { cov += ox * oy; by += id + ' '; } }
      const below = r.y0 > V.H * k;
      out.kills++; const frac = below ? 1 : cov / area;
      if (frac >= 0.3) out.covered30++; if (frac >= 0.6) out.covered60++;
      if (frac >= 0.3 && out.samples.length < 5) out.samples.push({ lvl: S.idx + 1, t: +S.time.toFixed(2), txt: p.txt, covered: +frac.toFixed(2), by: below ? 'below screen' : by.trim() });
    }
  };
  window.__hookResult = () => { const r = JSON.parse(JSON.stringify(out)); out.kills = out.covered30 = out.covered60 = 0; out.samples = []; return r; };
})();
