// 第 4 項的語意檢查：護罩開著的時候落石／氣球炸彈／光球真的進不來嗎？天燈真的兩回合就走？防空弩一輪真的只射三發？
// 黃金符真的只出現一回合、隔兩回合？折損符真的每兩發吃一發？
const G = require('./h')();
const { S, SH, simInit, simStep, BOTS, simSkill, spawnShot, WPN, STEP } = G;
const out = [];
// (1) 落石 vs 護罩：第四關，我方每回合敵軍開火時把護罩灌滿打開（撐到下一次瞄準＝涵蓋災害階段）
{
  let rocksIn = 0, rockStops = 0, hazards = 0;
  for (let sd = 0; sd < 3; sd++) {
    simInit(3, {}, 600 + sd, 1, { mute: 1 }); S.team[0].mute = true; S.team[0].ai = null;
    S.on = (t, a, b, c) => { if (t === 'rockstop') rockStops++; if (t === 'rumble') hazards++; };
    for (let i = 0; i < 40000 && S.round < 12 && S.state === 'play'; i++) {
      if (S.phase === 'aim' && S.turn === 0) G.simFire(0);
      if (S.phase === 'volley' && S.turn === 1 && !S.team[0].shield.on) { S.team[0].shield.c = S.team[0].shield.need; simSkill(0, 'shield'); }
      simStep(STEP);
      if (S.phase === 'hazard') for (const b of S.rubble.blocks) { if (b.dead) continue; const p = b.body.getPosition(), st = S.st[0]; if (p.x > st.x0 && p.x < st.x1 && p.y < st.y1 + 1 && p.y > 2 && b.body.getLinearVelocity().y < -12 && S.team[0].shield.on) rocksIn++; }
    }
  }
  out.push(`(1) rocks vs shield, L4: ${hazards} rock falls, ${rockStops} stopped by my shield, rock still falling fast INSIDE my castle outline while shield up: ${rocksIn} step-samples ${rocksIn ? '<-- leak' : '(none)'}`);
}
// (2) 天燈壽命、黃金符的出現週期（第五關）
{
  simInit(4, {}, 11, 1, { mute: 1 }); S.team[0].mute = true; S.team[0].ai = null;
  const lan = {}, gold = [], seenRounds = [];
  for (let i = 0; i < 40000 && S.round < 14 && S.state === 'play'; i++) {
    if (S.phase === 'aim' && S.turn === 0) { const r = S.round; seenRounds.push(r); if (S.objs.some((o) => o.t === 'lantern')) lan[r] = 1; if (S.gates.some((g) => g.owner === 2)) gold.push(r); G.simFire(0); }
    simStep(STEP);
  }
  out.push(`(2) L5 lantern present in rounds [${Object.keys(lan).join(',')}] (spec: from round 3, every 3, stays 2 rounds);  gold gate present in rounds [${gold.join(',')}] (spec: from round 4, 1 round on, 2 off)`);
}
// (3) 防空弩一輪射下幾發；(4) 折損符每兩發吃一發
{
  simInit(4, {}, 12, 1, { mute: 1 }); S.team[0].mute = true; S.team[0].ai = null;
  while (!(S.phase === 'aim' && S.turn === 0)) simStep(STEP);
  let flak = 0; S.on = (t) => { if (t === 'flak') flak++; };
  S.team[0].mute = false; G.simAim(0, 45, 45); S.team[0].ult.c = 100; simSkill(0, 'ult'); G.simFire(0);
  for (let i = 0; i < 3000 && S.phase !== 'aim'; i++) simStep(STEP);
  out.push(`(3) flak: one enemy 防空弩, my ult volley fired ${S.team[0].fired} shots, shot down ${flak} (spec: 3 per volley)`);
  simInit(1, {}, 13, 1, { mute: 1 }); S.team[0].mute = true; S.team[0].ai = null;
  for (let i = 0; i < 6000 && (S.round < 2 || S.phase !== 'aim' || S.turn !== 0); i++) { if (S.phase === 'aim' && S.turn === 0) G.simFire(0); simStep(STEP); }
  const g = S.gates.find((q) => q.owner === 3); let eaten = 0, sent = 0; S.on = (t) => { if (t === 'gbad') eaten++; };
  for (let k = 0; k < 9; k++) { spawnShot(0, WPN.bolt.i, g.x - 6, g.y + (k - 4) * 0.5, 40, 0, 1, 0, 0, 1); sent++; }
  for (let i = 0; i < 30; i++) G.shotsStep(STEP);
  out.push(`(4) ÷2 gate: sent ${sent} shots through, ${eaten} eaten (spec: every second one)`);
}
console.log(out.join('\n'));
