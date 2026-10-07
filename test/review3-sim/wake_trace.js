// node test/review3-sim/wake_trace.js <關卡> <seed> [回合=3]：我方不開火。敵城原本整座是靜止（睡著）的：它第一次被叫醒是什麼時候、是誰先醒、旁邊有什麼；之後每 0.5 秒印一次醒著幾塊、最快多快、哪些磚離開原位
const L = require('./lib'); const G = L.load();
const { S, SH, PH, simInit, simStep, simFire, CS } = G;
const li = +process.argv[2] - 1, seed = +process.argv[3], R = +(process.argv[4] || 3);
simInit(li, {}, seed, 1, { mute: 0 }); S.team[0].ai = null;
const st = S.st[1]; let woke = false, guard = 0, lastLine = '';
const nm = (o) => !o ? 'ground' : o.isBlock ? `${o.frag ? 'frag' : o.kind === 'ball' ? 'ball' : o.prop ? 'prop' : (o.seg ? 'seg' : 'blk') + o.cw + 'x' + o.ch} m${o.mat} s${o.side}${o.frag ? '' : ' c(' + o.cx + ',' + o.cy + ')'}` : `unit ${o.type} s${o.side}`;
S.on = (t, a, b, c, d, e, f) => { if (t === 'volley') console.log(`r${S.round} t=${S.time.toFixed(2)} volley by side${a}`); if (t === 'boom' && a > 60) console.log(`   t=${S.time.toFixed(2)} blast at (${a.toFixed(1)},${b.toFixed(1)}) by side${e}`); };
while (S.state === 'play' && S.round <= R && guard++ < 60 * 80 * R) {
  if (S.phase === 'aim' && S.turn === 0) simFire(0);
  simStep(1 / 60);
  const aw = st.blocks.filter((b) => !b.dead && b.body.isAwake()), awU = st.units.filter((u) => u.alive && u.body.isAwake());
  if (!woke && (aw.length || awU.length)) {
    woke = true; console.log(`t=${S.time.toFixed(2)} r${S.round} ${S.phase}/turn${S.turn}: enemy castle first woken: ${aw.length} blocks + ${awU.length} units awake`);
    for (const o of aw.slice(0, 6).concat(awU)) { const p = o.body.getPosition(), v = o.body.getLinearVelocity(), cs = []; for (let ce = o.body.getContactList(); ce; ce = ce.next) { const u = ce.other.getUserData(), ov = ce.other.getLinearVelocity(); if (ce.other.isAwake() && Math.hypot(ov.x, ov.y) > 0.5) cs.push(nm(u) + ` v=(${ov.x.toFixed(1)},${ov.y.toFixed(1)})`); } console.log(`     ${nm(o)} @(${p.x.toFixed(1)},${p.y.toFixed(1)}) v=(${v.x.toFixed(2)},${v.y.toFixed(2)}) moving neighbours: ${cs.join(' ; ') || '-'}`); }
    console.log(`     shots in the air: ${SH.n}; my-side shots ${SH.cnt[0]}, enemy shots ${SH.cnt[1]}`);
  }
  if (woke && S.frame % 30 === 0) { let vm = 0, who = ''; for (const b of aw) { const v = b.body.getLinearVelocity(), sp = Math.hypot(v.x, v.y); if (sp > vm) { vm = sp; who = nm(b); } } const out = st.blocks.filter((b) => !b.dead && !b.frag && !b.prop && !b.inPlace).map((b) => `${nm(b)} dx=${(b.body.getPosition().x - b.x0).toFixed(2)} dy=${(b.body.getPosition().y - b.y0).toFixed(2)}`); const line = `awake ${aw.length} fastest ${vm.toFixed(2)} (${who}) out of place: ${out.slice(0, 4).join(' | ') || '-'}`; if (line !== lastLine && (aw.length || out.length)) console.log(`   t=${S.time.toFixed(2)} r${S.round} ${S.phase}/turn${S.turn}: ${line}`); lastLine = line; }
}
