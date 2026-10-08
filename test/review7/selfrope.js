// node test/review7/selfrope.js <關卡> [自動玩家=casual] [場數=20] [seed0=4242]
// 敵軍自己那一輪，自己的繩子、鐵鍊有沒有被自己的砲彈打到（掉血、打斷），自己的兵有沒有被自己掉下來的吊鐘砸到；
// 以及敵軍砲彈炸在自己城裡（岩簷底下、岩壁上）的位置
const G = require('../load')('PH');
const { S, simInit, simStep, LEVELS, BOTS } = G;
const li = +process.argv[2] - 1, bot = process.argv[3] || 'casual', N = +(process.argv[4] || 20), seed0 = +(process.argv[5] || 4242);
let hits = 0, cuts = 0, vol = 0, ownBooms = 0, booms = 0, bonkSelf = 0; const pos = {}; const byTag = {};
for (let g = 0; g < N; g++) {
  simInit(li, {}, seed0 + g * 7919, 1, { botA: BOTS[bot] });
  const st = S.st[1]; let before = null;
  S.on = (t, a, b, c, d, e) => {
    if (t === 'boom' && e === 1 && S.turn === 1) { booms++; if (a > st.x0 - 1 && a < st.x1 + 1 && b > st.y0 - 2 && b < st.y1 + 3) { ownBooms++; const k = `${(Math.round(a / 2) * 2)},${(Math.round(b / 2) * 2)}`; pos[k] = (pos[k] || 0) + 1; } }
    if (t === 'snap' && d === 1 && S.turn === 1 && (S.phase === 'volley' || S.phase === 'resolve')) { cuts++; byTag[e] = (byTag[e] || 0) + 1; if (process.env.V) console.log(`  game ${g} seed ${seed0 + g * 7919} R${S.round}: enemy's own ${e} snapped during its own volley`); }
    if (t === 'bonk' && S.turn === 1) bonkSelf++;
  };
  let ph = '';
  while (S.state === 'play' && S.round < 40) {
    simStep(1 / 60);
    const key = S.phase + S.turn;
    if (key !== ph) {
      if (S.phase === 'volley' && S.turn === 1) { before = S.ropes.filter((r) => r.side === 1).map((r) => r.hp); vol++; }
      if (ph === 'resolve1' && before) { S.ropes.filter((r) => r.side === 1).forEach((r, k) => { if (r.hp < before[k] - 0.01 && r.kind === 'chain') { hits++; if (process.env.V) console.log(`  game ${g} R${S.round}: enemy chain ${r.tag} lost ${(before[k] - r.hp).toFixed(1)} hp in its own volley (now ${r.hp.toFixed(0)}/${r.hm.toFixed(0)})`); } }); before = null; }
      ph = key;
    }
  }
}
console.log(`L${li + 1} ${LEVELS[li].name} [${bot}] ${N} games, ${vol} enemy volleys: enemy booms ${booms}, inside own castle box ${ownBooms}; own chains damaged by own volley ${hits} times, own ropes/chains snapped in own volley ${cuts} (${JSON.stringify(byTag)}), bonks during enemy turn ${bonkSelf}`);
console.log('  own-castle boom spots (x,y rounded to 2): ' + Object.keys(pos).sort((a, b) => pos[b] - pos[a]).slice(0, 12).map((k) => `(${k})×${pos[k]}`).join(' '));
