// H13：天燈「援軍」把倒下的兵放回原本的位置（hx, hy）。原本的房間如果已經塌了：
//   (a) 原位是空的 → 兵直接出現在半空中摔下去；(b) 原位被瓦礫佔住 → 改從城頂 y1+8 空降。
// 兩種都可能一落地就摔死（復活只有七成血，摔傷最多扣八成五）。S.stat.lost / kills 也會再加一次。
const G = require('./h')();
const { S, simInit, simStep, blockKill, K_CRUSH } = G;
function scenario(name, li, side, slot, prep) {
  simInit(li, {}, 5, 1, { mute: 0 }); S.team[1].mute = true; S.team[0].ai = null;
  while (S.phase !== 'aim') simStep(1 / 60);
  const T = S.team[side], u = T.units.find((k) => k.slot === slot), st = S.st[side];
  prep(u, st);
  G.killUnit(u, 1 - side, 0);
  for (let i = 0; i < 240; i++) simStep(1 / 60);                 // 等塌完
  if (S.state !== 'play') { console.log(name + ': game already over, skip'); return; }
  const before = { lost: S.stat.lost, kills: S.stat.kills };
  let ev = []; S.on = (t, a, b, c, d, e) => { if (t === 'revive') ev.push(`revive at y=${b.toFixed(1)} (home y=${u.hy.toFixed(1)}, castle top ${st.y1.toFixed(1)})`); if (t === 'udie' && c === side) ev.push(`DIED again ${(S.time - t0).toFixed(2)}s later (how=${['hit', 'crush', '', 'burn', 'fell'][e]})`); };
  const t0 = S.time; G.grantBonus(side, 'troop', 50, 40);
  let minHp = u.hp; for (let i = 0; i < 300; i++) { simStep(1 / 60); if (u.alive && u.hp < minHp) minHp = u.hp; }
  console.log(`${name}: ${ev.join(' -> ')}; unit ${u.alive ? 'alive with ' + u.hp.toFixed(0) + '/' + u.hpMax.toFixed(0) + ' hp (revived at ' + (u.hpMax * 0.7).toFixed(0) + ')' : 'dead'}; stat.lost ${before.lost}->${S.stat.lost}, stat.kills ${before.kills}->${S.stat.kills}`);
}
// (a) 我方最上層的兵：整座城樓第 5 列以上都拆掉（房間沒了、原位是空的）
scenario('(a) home is empty air  [L1 me slot1]', 0, 0, 1, (u, st) => { for (const b of st.blocks.slice()) if (!b.dead && b.y0 > st.y0 + 4 * G.CS) blockKill(b, 2, K_CRUSH, true); });
// (b) 我方最上層的兵：只把他腳下的樓板和下面兩層拆掉，屋頂和牆掉下來堆在原位
scenario('(b) floors below removed [L3 me slot1]', 2, 0, 1, (u, st) => { for (const b of st.blocks.slice()) if (!b.dead && b.y0 < u.hy && b.y0 > st.y0 + 4 * G.CS) blockKill(b, 2, K_CRUSH, true); });
// (c) 敵方望樓頂上的兵：打斷望樓的柱子（第一關的主要玩法）
scenario('(c) watch-tower toppled  [L1 foe slot1]', 0, 1, 1, (u, st) => { for (const b of st.blocks.slice()) if (!b.dead && b.mat === G.M_WOOD && Math.abs(b.x0 - u.hx) < 5 && b.y0 < u.hy) blockKill(b, 2, K_CRUSH, true); });
// (d) 城樓完好、兵只是被打死：正常情況
scenario('(d) intact castle (control) [L1 me slot2]', 0, 0, 2, () => { });
