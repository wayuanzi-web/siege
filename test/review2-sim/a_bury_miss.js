// node test/review2-sim/a_bury_miss.js [關卡=1,2,3,4,5,6] [場數=12] [bot=casual]
// A5（反方向）：埋壓判定有沒有「明明被埋了卻沒算到」的？
// 每一次回合結束的埋壓判定，對挨打那一邊每一個活著的兵另外算兩個數字：
//   direct = 遊戲自己算的（直接碰到頭上的磚的質量總和）
//   stack  = 從兵的頭頂往上，一路「疊在上面」的所有磚（碰著兵的、再碰著那些磚而且位置更高的……）的質量總和，只算離開原位的磚和碎塊
//   cover  = 兵的正上方（左右各 1.3、頭頂往上 5 個單位）被幾塊「離開原位的磚或碎塊」蓋住
// 沒被判定埋壓（direct 沒過門檻）但 stack ≥ 40 而且 cover ≥ 2 的，就是「看起來被埋了卻沒事」。
const { load, H } = require('./lib');
const G = load({ patch: [["function burialCheck() {\n  const credit = S.turn;", "function burialCheck() {\n  const credit = S.turn; if (S.onBurial) S.onBurial(credit);"]] });
const { S, simInit, simStep, BOTS, LEVELS, CS } = G;
const lvs = (process.argv[2] || '1,2,3,4,5,6').split(',').map((x) => +x - 1), N = +(process.argv[3] || 12), bot = process.argv[4] || 'casual';
for (const li of lvs) {
  let checks = 0, pinned = 0, missed = 0, missedHome = 0, pinnedHome = 0; const ex = [];
  for (let sd = 0; sd < N; sd++) {
    simInit(li, {}, H.seed(9000, sd, li), 1, { botA: BOTS[bot] });
    S.onBurial = (credit) => {
      for (const u of S.units) {
        if (!u.alive || u.def.big || u.side === credit) continue;
        checks++;
        const p = u.body.getPosition(); let direct = 0; const seen = new Set(), queue = [];
        for (let ce = u.body.getContactList(); ce; ce = ce.next) {
          if (!ce.contact.isTouching()) continue; const o = ce.other.getUserData(); if (!o || !o.isBlock || o.dead) continue; const q = ce.other.getPosition();
          if (q.y > p.y + u.bh * 0.3 && Math.abs(q.x - p.x) < o.w / 2 + u.bw * 0.4) { direct += o.mass; if (!seen.has(o)) { seen.add(o); queue.push(o); } }
        }
        // 往上疊的
        let stack = 0; const all = [];
        while (queue.length) {
          const b = queue.pop(); if (!b.inPlace || b.frag) { stack += b.mass; all.push(b); }
          const bp = b.body.getPosition();
          for (let ce = b.body.getContactList(); ce; ce = ce.next) { if (!ce.contact.isTouching()) continue; const o = ce.other.getUserData(); if (!o || !o.isBlock || o.dead || seen.has(o)) continue; const q = ce.other.getPosition(); if (q.y > bp.y + 0.3) { seen.add(o); queue.push(o); } }
        }
        let cover = 0; for (const b of S.blocks) { if (b.dead || (b.inPlace && !b.frag)) continue; const q = b.body.getPosition(); if (Math.abs(q.x - p.x) < 1.3 + Math.min(b.w, 6) / 2 && q.y > p.y + u.bh * 0.3 && q.y < p.y + u.bh / 2 + 5) cover++; }
        const moved = Math.abs(u.x - u.hx) > CS * 0.8 || Math.abs(u.y - u.hy) > CS * 0.6, hit = direct > (moved ? 3 : 30);
        if (hit) { pinned++; if (!moved) pinnedHome++; }
        else if (stack >= 40 && cover >= 2) { missed++; if (!moved) missedHome++; if (ex.length < 5) ex.push(`sd ${sd} r${S.round}: ${u.side ? 'foe' : 'my'} ${u.type}#${u.slot} ${moved ? 'displaced' : 'at its post'}: touching load ${direct.toFixed(0)} (threshold ${moved ? 3 : 30}) but ${all.length} fallen blocks/fragments stacked on it weighing ${stack.toFixed(0)} in total; ${cover} loose pieces right over its head → no burial damage`); }
      }
    };
    while (S.state === 'play' && S.round < 40) simStep(1 / 60);
    S.onBurial = null;
  }
  console.log(`L${li + 1} ${N} ${bot} games: ${checks} unit checks; burial applied ${pinned} (at its post ${pinnedHome}); looked buried but got nothing ${missed} (at its post ${missedHome})`);
  for (const e of ex) console.log('    ' + e);
}
