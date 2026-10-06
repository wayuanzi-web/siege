// node test/review-play/exp.js <關卡> <場數> [--bots=casual,expert,newbie] [--up=0] [--patches=balloon,oob] [--oobK=6]
//      [--lv='{"foe":{"hp":1.2},"rocks":{"every":2}}']  覆蓋 60-levels.js 這一關的欄位（物件會合併，陣列整個換掉）
//      [--castle='{"E4":["  ^^^^^  ", …]}']            換掉 40-defs.js 的藍圖
//      [--mat='{"keg":{"hp":30}}'] [--wl='{"keg":{"r":7}}'] [--unit='{"boss":{"hp":340}}']  改磚材／砲彈／兵種的數字
//      [--seed0=9000] [--label=文字]
// 「如果這樣改，勝率和回合數會變成多少」：只改記憶體裡的資料，不動 src/。一行印一種自動玩家的結果。
const opt = {}; const args = [];
for (const a of process.argv.slice(2)) { if (a.startsWith('--')) { const i = a.indexOf('='); opt[i < 0 ? a.slice(2) : a.slice(2, i)] = i < 0 ? '1' : a.slice(i + 1); } else args.push(a); }
const li = +args[0] - 1, N = +(args[1] || 40), upL = +(opt.up || 0), seed0 = +(opt.seed0 || 9000);
const G = require('./lib')({ patches: opt.patches ? opt.patches.split(',') : [], oobK: opt.oobK === undefined ? undefined : +opt.oobK, knock: opt.knock === undefined ? undefined : +opt.knock, retPen: opt.retPen === undefined ? undefined : +opt.retPen });
const { S, HOOK, simInit, simStep, LEVELS, BOTS, CASTLES, MAT, WPN, UNIT, teamBar } = G;
const merge = (dst, src) => { for (const k in src) { if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], src[k]); else dst[k] = src[k]; } };
if (opt.lv) merge(LEVELS[li], JSON.parse(opt.lv));
if (opt.castle) { const c = JSON.parse(opt.castle); for (const k in c) CASTLES[k].map = c[k]; }
if (opt.mat) { const m = JSON.parse(opt.mat); for (const k in m) merge(MAT.find((x) => x && x.k === k), m[k]); }
if (opt.wl) { const m = JSON.parse(opt.wl); for (const k in m) merge(WPN[k], m[k]); }
if (opt.unit) { const m = JSON.parse(opt.unit); for (const k in m) merge(UNIT[k], m[k]); }
const up = { dmg: upL, aim: upL, hp: upL, shield: upL, ult: upL };
const bots = (opt.bots || 'casual').split(',');
const out = [];
const fmtD = (o) => { const t = Object.values(o).reduce((a, b) => a + b, 0) || 1; return ['debris', 'landing', 'out', 'blast', 'burn'].map((k) => k + ' ' + ((o[k] || 0) / t * 100).toFixed(0) + '%').join(' '); };
for (const bot of bots) {
  let w = 0, r = 0, wr = 0, lost = 0, over14 = 0, t = 0, bar = 0, st3 = 0; const rl = [], kegR = [], firstFoe = [], foe2 = []; const dc = [{}, {}];
  for (let sd = 0; sd < N; sd++) {
    simInit(li, up, seed0 + sd * 7919 + li * 131, 1, { botA: BOTS[bot] });
    let keg = 0, deaths = []; const lastCrush = new Map();
    HOOK.blockKill = (b) => { if (b.mat === G.M_KEG && !keg) keg = S.round; };
    // 兵是怎麼倒的：out 飛出場外／掉下去、blast 被炸、landing 被炸飛之後摔到、debris 被別的東西砸到（對方比自己快）、burn 燒到
    HOOK.hurt = (u, d, side, kind) => {
      if (kind !== G.K_CRUSH || !u.body) return;
      let cls = 'landing'; const uv = u.body.getLinearVelocity(), usp = Math.hypot(uv.x, uv.y);
      for (let ce = u.body.getContactList(); ce; ce = ce.next) { if (!ce.contact.isTouching()) continue; const o = ce.other.getUserData(); if (!o || !o.isBlock) continue; const v = ce.other.getLinearVelocity(); if (Math.hypot(v.x, v.y) > usp + 2) cls = 'debris'; }
      lastCrush.set(u, cls);
    };
    HOOK.kill = (u, side, how) => { if (u.side === 1) deaths.push(S.round); const k = how === 4 ? 'out' : how === 3 ? 'burn' : how === 1 ? (lastCrush.get(u) || 'landing') : 'blast'; dc[u.side][k] = (dc[u.side][k] || 0) + 1; };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
    const won = S.state === 'won'; if (won) { w++; wr += S.round; bar += teamBar(0); if (teamBar(0) >= 0.6 && !S.stat.lost) st3++; }
    r += S.round; if (S.round > 14) over14++; lost += S.team[0].units.length - S.team[0].alive; t += S.time; rl.push((won ? 'W' : S.state === 'lost' ? 'L' : '?') + S.round);
    if (keg) kegR.push(keg); if (deaths.length) firstFoe.push(deaths[0]); if (deaths.length > 1) foe2.push(deaths[1]);
  }
  const se = Math.sqrt((w / N) * (1 - w / N) / N) * 100, avg = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
  out.push(`${bot.padEnd(6)} win ${(w / N * 100).toFixed(0).padStart(3)}% ±${se.toFixed(0)} (${w}/${N})  rounds ${(r / N).toFixed(1)} (wins ${w ? (wr / w).toFixed(1) : '-'})  >14r ${(over14 / N * 100).toFixed(0)}%  my losses ${(lost / N).toFixed(1)}  bar ${w ? (bar / w * 100).toFixed(0) : '-'}%  ★3 ${st3}  ${(t / N).toFixed(0)}s  1st foe down r${avg(firstFoe)} 2nd r${avg(foe2)}${kegR.length ? '  keg r' + avg(kegR) + ' (' + kegR.length + '/' + N + ')' : ''}  | foe deaths: ${fmtD(dc[1])}`);
}
console.log(`L${li + 1} ${LEVELS[li].name}${opt.label ? ' [' + opt.label + ']' : ''}${opt.patches ? ' patches=' + opt.patches : ''}${opt.oobK ? ' oobK=' + opt.oobK : ''}${opt.knock ? ' knock=' + opt.knock : ''}${opt.retPen ? ' retPen=' + opt.retPen : ''}${opt.lv ? ' lv=' + opt.lv : ''}${opt.mat ? ' mat=' + opt.mat : ''}${opt.wl ? ' wl=' + opt.wl : ''}${opt.unit ? ' unit=' + opt.unit : ''}${opt.castle ? ' castle=' + Object.keys(JSON.parse(opt.castle)) : ''} up${upL}`);
for (const o of out) console.log('   ' + o);
