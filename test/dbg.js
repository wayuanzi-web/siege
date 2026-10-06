// node test/dbg.js <關卡> <seed 編號> [bot] ：印出每一次兵受傷的來源（看兵是怎麼死的）
const G = require('./load')('hurtUnit, K_CRUSH');
const { S, simInit, simStep, LEVELS, BOTS, teamBar } = G;
const li = +process.argv[2] - 1, sd = +(process.argv[3] || 0), bot = process.argv[4] || 'casual';
simInit(li, {}, 500 + sd * 7919 + li * 131, 1, { botA: BOTS[bot], mute: process.env.MUTE === undefined ? undefined : +process.env.MUTE });
const hp = new Map(); for (const u of S.units) hp.set(u, u.hp);
let lastR = 0;
S.on = (t, a, b, c, d, e, f) => { if (t === 'cell' && (c === 7 || process.env.CELLS)) console.log(`   r${S.round} t=${S.time.toFixed(2)} block mat${c} side${d} gone @(${a.toFixed(1)},${b.toFixed(1)}) kind=${e} ${f.frag ? 'frag' : ''}${f.prop ? 'prop' : ''} w=${f.w.toFixed(1)} h=${f.h.toFixed(1)}`); if (t === 'boom' && process.env.BOOMS) console.log(`   r${S.round} t=${S.time.toFixed(2)} boom w${d} @(${a.toFixed(1)},${b.toFixed(1)}) r=${c} side${e} mass=${f}`); if (t === 'udie') console.log(`   r${S.round} t=${S.time.toFixed(1)} ${c === 0 ? 'ME ' : 'foe'} ${d} DOWN (${['hit', 'crush', '', 'burn', 'fell'][e]})`); else if (t === 'chain') console.log(`   r${S.round} chain ×${a} by ${b}`); else if (t === 'phase') console.log(`   r${S.round} boss phase ${a}`); };
while (S.state === 'play' && S.round < 40) {
  simStep(1 / 60);
  for (const u of S.units) { const h = hp.get(u); if (u.hp < h - 0.5) { if (h - u.hp >= 8) console.log(`   r${S.round} t=${S.time.toFixed(1)} ${u.side ? 'foe' : 'ME '} ${u.type}#${u.slot} -${(h - u.hp).toFixed(0)} → ${Math.max(0, u.hp).toFixed(0)} y=${u.y.toFixed(1)} vy=${u.vy.toFixed(0)} phase=${S.phase}/${S.turn}`); hp.set(u, u.hp); } }
  if (S.round !== lastR) { lastR = S.round; console.log(`round ${S.round}: me ${(teamBar(0) * 100).toFixed(0)}%/${S.team[0].alive} foe ${(teamBar(1) * 100).toFixed(0)}%/${S.team[1].alive}`); }
}
console.log(S.state, 'rounds', S.round);
