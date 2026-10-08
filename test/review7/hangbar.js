// node test/review7/hangbar.js：吊著的東西（吊鐘、吊燈、配重籃）有沒有被算進城樓完整度。hp0（開場的總量）跟 hpNow（castleScan 現在算的）比
const G = require('../load')('PH, castleScan, structBar');
const { S, simInit, LEVELS } = G;
for (const L of [8, 9, 10, 12]) {
  simInit(L - 1, {}, 1, 1, {});
  const st = S.st[1]; G.castleScan(st);
  const hang = st.blocks.filter((b) => b.hang);
  console.log(`L${L} ${LEVELS[L - 1].name}: hp0 ${st.hp0.toFixed(0)}, hpNow ${st.hpNow.toFixed(0)} (ratio ${(st.hpNow / st.hp0).toFixed(3)}); hanging objects ${hang.map((b) => `${b.hang} hp ${b.hp.toFixed(0)} wt ${b.wt}`).join(', ')}`);
  // 把吊著的東西拿掉（當作已經掉下去），看完整度掉多少
  for (const b of hang) b.inPlace = false, b.lost = true; let hp = 0; for (const b of st.blocks) if (!b.dead && !b.frag && b.inPlace && !b.lost) hp += b.hp * b.wt;
  console.log(`   if the hanging objects drop: hpNow ${hp.toFixed(0)} → ratio ${(hp / st.hp0).toFixed(3)}`);
}
