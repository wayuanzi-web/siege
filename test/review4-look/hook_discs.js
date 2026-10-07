// 找出畫面左上角天空裡出現的粒子、圓圈（world x < 6, y > 30），記下它第一次出現時的種類和當時的戰局
(() => {
  const q = window.__qp, S = q.S, FX = q.FX, seen = [], NAMES = ['SPARK', 'SMOKE', 'DEBRIS', 'FLASH', 'EMBER', 'SHARD', 'DUST', 'CONF'];
  let last = -1e9;
  window.__hook = () => {
    if (q.G.mode !== 'play') return;
    const hits = [];
    for (let i = 0; i < FX.n; i++) { const x = FX.x[i], y = FX.y[i]; if (x < 6 && y > 30) hits.push({ k: 'part', type: NAMES[FX.type[i]], col: FX.col[i], size: +FX.size[i].toFixed(2), life: +FX.life[i].toFixed(2), max: +FX.max[i].toFixed(2), x: +x.toFixed(1), y: +y.toFixed(1), vx: +FX.vx[i].toFixed(1), vy: +FX.vy[i].toFixed(1) }); }
    for (const r of FX.rings) if (r.x < 6 && r.y > 30) hits.push({ k: 'ring', x: +r.x.toFixed(1), y: +r.y.toFixed(1), r0: r.r0, r1: r.r1, col: r.col });
    for (const f of FX.flung) if (f.x < 6 && f.y > 30) hits.push({ k: 'flung', flag: !!f.flag, x: +f.x.toFixed(1), y: +f.y.toFixed(1) });
    if (hits.length && S.time - last > 0.5 && seen.length < 40) { last = S.time; seen.push({ t: +S.time.toFixed(2), lvl: S.idx + 1, phase: S.phase, turn: S.turn, round: S.round, state: S.state, n: hits.length, hits: hits.slice(0, 4), units0: S.team[0].units.map((u) => u.alive ? [+u.x.toFixed(1), +u.y.toFixed(1)] : null), blocksOut: S.blocks.filter((b) => !b.dead && (b.body.getPosition().x < 2 || b.body.getPosition().y > 45)).map((b) => [b.mat, b.kind, +b.body.getPosition().x.toFixed(1), +b.body.getPosition().y.toFixed(1)]).slice(0, 6) }); }
  };
  window.__hookResult = () => seen;
})();
