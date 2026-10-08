// node test/review8/l7dir.js [場數=16] [自動玩家=casual]
// 第七關：中間石柱頂上的屋子（石板 88.2,25.5）垮下來的時候往哪邊倒（往前 = 往玩家那邊 x 變小；往後 = x 變大），
// 跟提示「打斷前面那根，整棟屋子往前倒，砸在前面那間小屋上」對照。也記下先斷的是哪一根頸（前 86.5／後 89.9）。
const G = require('../load')('blockDist'); const { S, simInit, simStep, BOTS } = G;
const N = +(process.argv[2] || 16), bot = process.argv[3] || 'casual';
const tally = { fwd: 0, back: 0, none: 0 };
for (let sd = 0; sd < N; sd++) {
  simInit(6, {}, 9000 + sd * 7919 + 6 * 131, 1, { botA: BOTS[bot] });
  const st = S.st[1];
  const slab = st.blocks.find((b) => Math.abs(b.x0 - 88.2) < 0.2 && Math.abs(b.y0 - 25.5) < 0.2);
  const necks = st.blocks.filter((b) => Math.abs(b.y0 - 20.4) < 0.2 && (Math.abs(b.x0 - 86.5) < 0.2 || Math.abs(b.x0 - 89.9) < 0.2));
  let first = null, out = null, deaths = [];
  S.on = (t, x, y, c, d, e, f) => { if (t === 'udie' && c === 1) deaths.push('R' + S.round + '#' + f); };
  while (S.state === 'play' && S.round < 30) {
    simStep(1 / 60);
    if (!first) for (const n of necks) if (n.dead || !n.inPlace) { first = (Math.abs(n.x0 - 86.5) < 0.2 ? 'front' : 'back') + '@R' + S.round; break; }
    if (!out && slab && (slab.dead || !slab.inPlace)) {
      // 多跑兩秒看它落到哪
      for (let k = 0; k < 120 && S.state === 'play'; k++) simStep(1 / 60);
      const p = slab.dead ? null : slab.body.getPosition();
      out = p ? (p.x < 88.2 - 1 ? 'fwd' : p.x > 88.2 + 1 ? 'back' : 'none') + ` dx=${(p.x - 88.2).toFixed(1)} dy=${(p.y - 25.5).toFixed(1)}` : 'slab shattered';
    }
  }
  const k = out ? out.split(' ')[0] : 'none'; if (tally[k] !== undefined) tally[k]++;
  console.log(`#${sd} ${S.state} R${S.round}  first neck: ${first}  slab: ${out}  deaths: ${deaths.join(' ')}`);
}
console.log('tally', tally);
