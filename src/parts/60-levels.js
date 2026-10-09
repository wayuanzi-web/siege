/* ===== 60-levels: 十二個關卡（第一篇 1–6、第二篇 7–12；魔王城在最後）。每一關雙方用同一座城（castle），各自派自己的兵 =====
   castle  這一關雙方的城樓（藍圖見 40-defs；我方照寫的放左邊，敵城左右鏡射放右邊）；y0 城腳的高度
   ground  地面起伏 [x, y]…（城腳一定在 y=0）；voids 沒有地面的區間（東西掉下去就沒了）；water 水面 { x0, x1, y, cur 水流 }
   me/foe  crew 依兵位 1、2、3… 放什麼兵
   foe.ai  err 落點誤差、think 想多久才開火、gate 這一輪會去找倍增符的機率、hate 會打我方倍增符的機率、lob 偏好吊高、
           skill 連珠砲集滿之後會拿來用的機率（0 = 不會用）、sap 會把牆和柱子也列進目標的機率（列進去也多半還是瞄兵）、
           guard 會不會去打天燈、氣球（0 = 不會）、warm 第一回合的手抖是平常的幾倍
   foe.hp / dmg  敵軍的耐久、傷害倍率；foe.open 第一回合敵軍打到我方的兵只算幾成（開場不會還沒打就先倒一個）
   gates   倍增符：owner 0 我方（藍）、1 敵方（赤，會擋我方的砲，可以打掉）、2 黃金（兩邊都能用）、3 折損（÷2）
           mult 倍數、h 半高、spots 位置（hop: true 的每回合換下一個）、at 第幾回合開始出現、
           life 出現幾回合、gap 消失後隔幾回合再出現、regap 被打掉後隔幾回合、move {t:'bob', a 振幅, per 週期（秒）}
   objs    機關：mirror 冰鏡、portal 傳送門、geyser 地火（每回合輪流開一個）
   wind    max 最強風力、at 第幾回合開始有風（每回合換一次）
   lantern 天燈：at 第幾回合開始、every 每隔幾回合、spots 出現的位置
   rocks   落石：at、every、n 幾顆（回合開始時預告落點，回合結束時砸下來）、foe 砸到敵城頭上的機率
   rollers 滾石坡上的大石頭：{ x 石頭中心, r 半徑, stake 擋住它的木樁 x, to 往哪一邊的城滾（0 我方、1 敵城）, every 滾下去之後隔幾回合補一顆 }
   bell    戰場中間吊著的大鐘 { x, y 吊點, len 鐵鍊長, w, h, den }
   boss    魔王：p2、p3 血量剩幾成進第二、第三階段；segHp 結界每一段的耐久、regen 打破後隔幾回合補回來；
           orbHp 毀滅光球的耐久、orbGap 第二／第三階段各隔幾輪放一顆；meteors 第三階段每回合幾顆隕石
   sudden  第幾回合之後雙方砲火開始加重（沒寫就是第 10 回合）
   weak    自動玩家（敵軍、測試用的我方）想打的要害：weak(side) 回傳 side 這一邊要打的目標（對方城上的格子、對方那一頭的機關）
   tip     主畫面上的關卡說明（兩三句就好：這一關的機關是什麼、最該打哪裡；細節進了關卡輪到玩家的時候再講）
   hints   進了關卡之後輪到你的時候講的訣竅，一回合最多一句：r 第幾回合起可以講、t 內容、ok 還用得上才講（沒寫就一定講） */
// 某一邊的第幾號兵位還有沒有人、還待在原本的位置上（沒被打倒、也還沒摔下來）
const sideAt = (side, slot) => S.team[side].units.some((u) => u.alive && u.slot === slot);
const atHome = (u) => { const q = platLocal(u.st, u.x, u.y); return Math.abs(q.x - u.hx0) < 2.2 && Math.abs(q.y - u.hy0) < 1.6; };
const foeAt = (slot) => sideAt(1, slot);
const foeHas = (type) => S.team[1].units.some((u) => u.alive && u.type === type);
// 敵軍第幾號兵還待在原本的位置上：教「怎麼把他弄下來」的訣竅，要他還在上面才講
const foeHome = (slot) => S.team[1].units.some((u) => u.alive && u.slot === slot && atHome(u));
// side 那座城藍圖上第 cx 欄（照藍圖寫的方向，由左數）、由上往下第 row 列的那塊磚（還在原位才算）
const castleB = (side, cx, row) => { const st = S.st[side], b = st.cellB[(st.rows - 1 - row) * st.cols + (st.mirror ? st.cols - 1 - cx : cx)]; return b && !b.dead && b.inPlace ? b : null; };
const foeB = (cx, row) => castleB(1, cx, row);
// 戰場中間的牆（中立的那一座）還剩幾塊在原位
const wallLeft = () => { let n = 0; for (const q of S.structs) if (q.side === 2 && !q.loose && q.def && q.def === CASTLES.ICEWALL) for (const b of q.blocks) if (!b.dead && b.inPlace) n++; return n; };
// 自動玩家想打 side 對面那座城的要害：直接打中那一塊最好
// （瞄的是那一格的位置：長樑、長柱子要打的是指定的那一段，不是整根的正中間）
const tgC = (side, cells, w) => { const out = [], o = 1 - side, st = S.st[o]; for (const [cx, row] of cells) { const b = castleB(o, cx, row); if (b) { const P = cellPt(st, [cx, row, 0.5, 0.5]); out.push({ x: P.x, y: P.y, w, blk: b }); } } return out; };
// 第七關：戰場中間還站著的石碑（由左到右）
const steles = () => { const out = []; for (const q of S.structs) if (q.side === 2 && !q.loose) for (const b of q.blocks) if (!b.dead && b.dom && b.inPlace) out.push(b); return out.sort((a, b) => a.x0 - b.x0); };
// 某一邊的繩索、鐵鍊還在不在（tag）
const ropeLeft = (tag, side) => S.ropes.some((r) => !r.cut && r.side === (side === undefined ? 1 : side) && r.tag === tag);
// 天秤歪了沒有
const tilted = (side) => S.pivots.some((o) => o.st.side === (side === undefined ? 1 : side) && Math.abs(o.ang) > 0.15);
// 某一邊還有幾塊某種材質的磚在原位（琉璃、木柱）
const sideLeft = (side, mat, tall) => { let n = 0; for (const b of S.st[side].blocks) if (!b.dead && b.inPlace && b.mat === mat && (!tall || b.h > b.w)) n++; return n; };
const foeLeft = (mat, tall) => sideLeft(1, mat, tall);
// 吊燈還吊著
const lampUp = (side) => S.ropes.some((r) => r.side === (side === undefined ? 1 : side) && r.hang && r.hang.hang === 'lamp' && !r.cut && !r.hang.dead && r.a && r.a.inPlace);
// 第五關：某一邊還有幾顆氣球
const tethersLeft = (side) => S.objs.filter((o) => o.t === 'tether' && o.side === side && o.hp > 0).length;
// 第六關：某一邊的船艙進水的程度（最多的那一艙）
const flooded = (side) => { const P = S.st[side].plat; if (!P || !P.comps) return 0; let f = 0; for (const c of P.comps) f = Math.max(f, c.flood); return f; };
// 第四關：引信點著了沒有
const fuseLit = (side) => { const F = S.st[side].fuse; return !!(F && (F.fronts.length || F.done)); };
// 第二關：擋住滾石的木樁（往 to 那一邊滾的那顆）還在不在
const stakeUp = (to) => S.rollers.some((r) => r.to === to && r.ball && !r.go);
// 第三關：冰棚還架著（積雪還沒崩）
const shelfUp = (side) => S.st[side].blocks.some((b) => !b.dead && b.mat === M_SNOW && b.inPlace);

const LEVELS = [
  {
    name: '望樓對峙', tag: '基本玩法・望樓', theme: 0, castle: 'TOWER',
    tip: '雙方輪流開火。拖曳瞄準、放開發射；穿過藍色倍增符，一發變多發。打斷望樓最底下的細柱子，整座連人一起倒',
    hints: [{ r: 1, t: '打斷望樓最底下的細柱子，上面兩層平台連人一起倒下來', ok: () => foeHome(1) || foeHome(3) }, { r: 2, t: '把守軍全部打倒就破城；你的兵全倒就輸了' }],
    ground: [[-40, 3], [0, 0], [36, 0], [44, -2.5], [56, -3.8], [68, -2.5], [76, 0], [112, 0], [152, 3]],
    me: { crew: ['rocket', 'bolt', 'rocket'] },
    foe: { crew: ['rocket', 'rocket', 'bolt'], hp: 1.0, dmg: 0.85, open: 0.5, ai: { err: 7.5, think: 1.3, gate: 0, sap: 0, guard: 0, warm: 1.6 } },
    weak: (side) => tgC(side, [[6, 6], [8, 6]], 0.9),
    gates: [
      { owner: 0, mult: 3, h: 6.5, spots: [[50, 36]] },
      { owner: 0, mult: 5, h: 5.5, spots: [[60, 44], [58, 31], [64, 38]], at: 2, hop: true }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 48], [52, 27], [60, 26]] }
  },
  {
    name: '滾石坡', sayTop: 1, tag: '滾石・風向・投石兵', theme: 1, castle: 'GATE',
    tip: '中間的山坡上兩顆大滾石，各用一根木樁擋著。打斷對面那根木樁，滾石就衝下坡、撞破敵城的大門。風每回合都在變',
    hints: [{ r: 1, t: '山坡右邊那根木樁擋著一顆大滾石：打斷它，滾石衝下坡，撞破敵城一樓的大門', ok: () => stakeUp(1) },
      { r: 2, t: '小心左邊那顆：敵軍打斷它的木樁，滾石就往你這邊衝過來', ok: () => stakeUp(0) },
      { r: 3, t: '滾石撞停就碎了；過兩回合山坡上再架一顆，常常一路衝進後面那座望樓', ok: () => !stakeUp(1) }],
    ground: [[-40, 4], [0, 0], [40.5, 0], [44, 1.4], [47, 4.6], [50.6, 5.4], [53.6, 9.8], [56, 10.8], [58.4, 9.8], [61.4, 5.4], [65, 4.6], [68, 1.4], [71.5, 0], [112, 0], [152, 4]],
    me: { crew: ['rocket', 'bolt', 'stone', 'bomb'] },
    foe: { crew: ['bomb', 'rocket', 'stone', 'rocket'], hp: 0.8, dmg: 0.7, open: 0.55, ai: { err: 7.5, think: 1.2, gate: 0.5, sap: 0.25, warm: 1.6 } },
    wind: { max: 8, at: 2 },
    rollers: [{ x: 49.1, r: 2.35, stake: 45.9, to: 0, every: 2 }, { x: 62.9, r: 2.35, stake: 66.1, to: 1, every: 2 }],
    weak: (side) => tgC(side, [[9, 6], [5, 6]], 0.8),
    gates: [
      { owner: 0, mult: 3, h: 6, spots: [[47, 39]], move: { t: 'bob', a: 6, per: 7 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[60, 45]], move: { t: 'bob', a: 4, per: 8 }, at: 2 },
      { owner: 3, mult: 2, h: 5.5, spots: [[60, 32.5]], move: { t: 'bob', a: 4, per: 8 }, at: 2 },
      { owner: 1, mult: 2, h: 5.5, spots: [[66, 34], [65, 44]], at: 3, hop: true, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 48], [50, 30], [62, 28]] }
  },
  {
    name: '冰崖雪崩', tag: '雪崩・冰牆・冰凍', theme: 2, castle: 'ICE', stress: 1, snow: 1,
    tip: '崖頂的冰棚壓著一大片積雪，外端只靠兩根冰柱撐著：打斷冰柱，積雪整片崩下來把守軍埋掉。冰很滑，火一烤就化',
    hints: [{ r: 1, t: '敵城崖頂的冰棚壓著一大堆雪，外端只靠兩根冰柱撐著：打掉冰柱（火一烤就化），雪就崩下來', ok: () => shelfUp(1) },
      { r: 2, t: '中間的冰牆擋住平射：吊高越過去，或是先把它轟倒', ok: () => wallLeft() >= 6 },
      { r: 3, t: '冰很滑：把冰板打歪一點，上面的兵就溜下去', ok: () => foeHome(2) }],
    ground: [[-40, 3], [0, 0], [41, 0], [44, -2], [68, -2], [71, 0], [112, 0], [152, 3]],
    me: { crew: ['fire', 'bolt', 'bomb', 'rocket'] },
    foe: { crew: ['ice', 'rocket', 'bomb', 'fire'], hp: 0.9, dmg: 0.75, open: 0.55, ai: { err: 7.0, think: 1.2, gate: 0.6, hate: 0.15, lob: 1, skill: 0.4, sap: 0.4, warm: 1.7 } },
    extra: [{ castle: 'ICEWALL', x: 56, y: -2, hp: 1 }],
    weak: (side) => tgC(side, [[6, 4], [7, 4], [6, 3], [6, 5]], 1.05),
    gates: [
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 44]] },
      { owner: 0, mult: 3, h: 5.5, spots: [[47, 41], [48, 32]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[66, 42]], at: 3, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[48, 48], [64, 48]] }
  },
  {
    name: '引信火藥塔', tag: '引信・火藥・地火', theme: 3, castle: 'POWDER',
    tip: '塔裡每一層都擺著火藥桶，一條引信從塔頂窗口垂出來串著它們。只有火油兵的火點得著引信頭：一點著，火順著引信一路往下燒，一層炸完炸下一層',
    hints: [{ r: 1, t: '敵塔頂的窗外垂著引信頭：用塔頂那個火油兵的虛線瞄它，火一燒到就點著了', ok: () => !fuseLit(1) && sideAt(0, 1) },
      { r: 2, t: '讓砲彈從正在噴的地火裡穿過去：會著火，打磚、打兵威力多五成（但點不著引信）' },
      { r: 3, t: '你的塔頂也垂著一條引信：敵軍的火油兵會瞄它。先把他們打倒，你的火藥就安全了', ok: () => !fuseLit(0) && foeHas('fire') }],
    ground: [[-40, 5], [0, 0], [38, 0], [41, -3.5], [71, -3.5], [74, 0], [112, 0], [152, 5]],
    me: { crew: ['fire', 'rocket', 'bomb', 'ice'] },
    foe: { crew: ['fire', 'bomb', 'rocket', 'fire'], hp: 1.55, dmg: 1.4, open: 0.55, ai: { err: 4.4, think: 1.1, gate: 0.65, hate: 0.2, skill: 0.5, sap: 0.45, warm: 2.2 } },
    objs: [
      { t: 'geyser', x: 46, w: 2.8, hgt: 45 },
      { t: 'geyser', x: 56, w: 2.8, hgt: 48 },
      { t: 'geyser', x: 66, w: 2.8, hgt: 45 }
    ],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[51, 35], [51, 44]], hop: true },
      { owner: 0, mult: 5, h: 5.5, spots: [[61, 44], [61, 34]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[70, 35], [70, 45]], at: 3, hop: true, regap: 2 }
    ],
    rocks: { at: 2, every: 2, n: 1, foe: 0.38 },
    lantern: { at: 3, every: 3, spots: [[56, 26], [45, 47], [67, 47]] }
  },
  {
    name: '雲海浮島', tag: '氣球・浮島・防空弩', theme: 4, castle: 'SKY', y0: 6,
    tip: '兩座城都蓋在浮島上，各用四顆大氣球吊著。打破同一頭的兩顆氣球，那一頭就往下掉，整座城滑進雲海。防空弩會射下飛過來的砲彈',
    hints: [{ r: 1, t: '敵城的浮島前後各吊著兩顆氣球：專打同一頭，兩顆都破了，浮島就歪下去', ok: () => tethersLeft(1) >= 3 },
      { r: 2, t: '把砲彈射進藍色傳送門，會從敵城頭頂灌下去', ok: () => tethersLeft(1) >= 3 },
      { r: 3, t: '防空弩每一輪射下你三發砲彈：先把它打掉，或是用倍增符多打幾發', ok: () => foeHas('flak') }],
    voids: [[-60, 172]],
    me: { crew: ['rocket', 'zap', 'bolt', 'bomb'] },
    foe: { crew: ['bal', 'rocket', 'flak', 'zap'], hp: 1.35, dmg: 1.5, open: 0.55, ai: { err: 3.7, think: 1.1, gate: 0.75, hate: 0.25, skill: 0.5, sap: 0.5, warm: 1.8 } },
    objs: [
      // 藍色傳送門放在 ×3 符的後面：穿過符的砲彈順勢飛進去，從敵城正上方灌下來
      { t: 'portal', owner: 0, x: 58, y: 40, r: 3.8, ex: 89.9, ey: 52, ea: -Math.PI / 2, ej: 0.22, ew: 14, mv: { a: 3, per: 9 } },
      { t: 'portal', owner: 1, x: 54, y: 27, r: 3.8, ex: 22.1, ey: 52, ea: -Math.PI / 2, ej: 0.22, ew: 14, mv: { a: 3, per: 9, ph: 0.5 } }
    ],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[47, 37]], move: { t: 'bob', a: 3, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[64, 44], [48, 27]], at: 2, hop: true },
      { owner: 0, mult: 10, h: 5.5, spots: [[52, 46]], at: 4, life: 1, gap: 2 },
      { owner: 1, mult: 2, h: 5.5, spots: [[68, 33], [66, 22]], at: 3, hop: true, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 24], [52, 47], [60, 30]] }
  },
  {
    name: '怒海艦城', sayTop: 1, tag: '戰船・進水・翻覆', theme: 6, castle: 'SHIP', y0: -5.2,
    tip: '兩邊都是浮在海上的戰船，船身分成前、中、後三個船艙。打穿船艙就一直進水，哪一頭沉下去，甲板一歪，人就滑進海裡',
    hints: [{ r: 1, t: '打敵船靠近水面的船身：船艙破了就會一直進水，船頭一沉，整艘往前歪', ok: () => flooded(1) < 0.5 },
      { r: 2, t: '掉進海裡的兵會被浪捲走：把船打歪，讓甲板上的東西連人滑下去', ok: () => foeHome(1) || foeHome(2) },
      { r: 3, t: '專打同一頭的船艙：兩艙都進滿了水，那一頭整個栽進海裡', ok: () => flooded(1) < 0.95 }],
    ground: [[-60, -40], [172, -40]],
    water: { x0: -60, x1: 172, y: 0, cur: 0.6, rho: 0.85, sea: 1 },
    me: { crew: ['rocket', 'bomb', 'bolt', 'fire'] },
    foe: { crew: ['bomb', 'rocket', 'fire', 'bolt'], hp: 1.25, dmg: 1.35, open: 0.55, ai: { err: 3.6, think: 1.1, gate: 0.8, hate: 0.3, skill: 0.6, sap: 0.55, warm: 1.8 } },
    wind: { max: 6, at: 3 },
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[47, 36]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 44], [53, 29]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[64, 36]], at: 2, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[52, 46], [58, 26]] }
  },
  {
    name: '石林骨牌', sayTop: 1, tag: '石碑骨牌・石頸・投石兵', theme: 7, castle: 'SPIRE', stress: 1,
    tip: '戰場中間兩排石碑，各往一座城那邊一塊比一塊高：把靠中間那塊矮的往敵城推，一路倒過去，最高的那塊砸進敵城',
    hints: [{ r: 1, t: '右邊那排石碑：砸中最靠中間那塊矮的上半截，整排往右倒，最高的那塊砸進敵城', ok: () => steles().some((b) => b.x0 > 56) },
      { r: 2, t: '敵城石柱頂上那棟樓只靠兩根細石頸撐著：打斷一根，整棟樓就往那一邊翻下去', ok: () => foeHome(1) || foeHome(2) },
      { r: 3, t: '左邊那排會往你這邊倒：敵軍推倒它之前，可以先把它往中間推倒', ok: () => steles().some((b) => b.x0 < 56) }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    me: { crew: ['stone', 'rocket', 'bolt', 'bomb'] },
    foe: { crew: ['rocket', 'bomb', 'stone', 'bolt'], hp: 1.25, dmg: 1.25, open: 0.55, ai: { err: 3.6, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.0 } },
    extra: [{ castle: 'P5', x: 41.2, y: 0 }, { castle: 'P4', x: 46, y: 0 }, { castle: 'P3', x: 50.6, y: 0 }, { castle: 'P3', x: 61.4, y: 0 }, { castle: 'P4', x: 66, y: 0 }, { castle: 'P5', x: 70.8, y: 0 }],
    weak: (side) => {
      const out = tgC(side, [[3, 5], [1, 5], [6, 9], [8, 9]], 0.95), st = steles(), o = 1 - side;
      // 對面那一排最靠中間的那塊石碑：上半截、偏自己這一邊一點，往對面推倒
      const row = st.filter((b) => (o === 1 ? b.x0 > 56 : b.x0 < 56)).sort((a, b) => Math.abs(a.x0 - 56) - Math.abs(b.x0 - 56));
      if (row.length >= 2) { const b = row[0], p = b.body.getPosition(), d = o === 1 ? -1 : 1; out.push({ x: p.x + d * b.w * 0.5, y: p.y + b.h * 0.3, w: 1.15, blk: b }); }
      return out;
    },
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[47, 38]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 46], [53, 31]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[64, 39]], at: 2, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[52, 49], [59, 28]] }
  },
  {
    name: '懸空寺', tag: '懸臂・鐵鍊・銅鐘', theme: 8, castle: 'CLIFF', stress: 1,
    tip: '兩座寺各從自己的懸崖伸出來，殿的外端用鐵鍊吊著。打斷鐵鍊，整間殿壓在插進岩壁的樑上，撐不住就連人掉進深谷',
    hints: [{ r: 1, t: '敵寺每間殿的外端都吊著鐵鍊：用轟天砲、雷法師打斷它，整間殿就垂進深谷', ok: () => ropeLeft('stay') },
      { r: 2, t: '岩簷底下吊著一口大銅鐘，正下方就是上面那間殿的兵：打斷吊鐘的鐵鍊，鐘砸穿屋頂', ok: () => ropeLeft('bell') },
      { r: 3, t: '上面那間殿掉下來會砸在下面那間上：兩間一起壓垮、一起掉進深谷', ok: () => foeHome(3) && (foeHome(1) || foeHome(2)) }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    voids: [[13.8, 98.2]],
    me: { crew: ['rocket', 'zap', 'bolt', 'bomb'] },
    foe: { crew: ['fire', 'bomb', 'zap', 'bolt'], hp: 1.35, dmg: 1.95, open: 0.55, ai: { err: 2.5, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.0 } },
    weak: (side) => tgC(side, [[3, 11], [3, 7], [8, 10], [8, 6]], 0.95),
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[48, 40]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[57, 47], [55, 31]], at: 2, hop: true },
      { owner: 1, mult: 3, h: 5.5, spots: [[64, 41]], at: 2, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[52, 50], [60, 27]] }
  },
  {
    name: '天秤寨', sayTop: 1, tag: '天秤・配重・深谷', theme: 9, castle: 'BEAM', stress: 1,
    tip: '兩座寨子都架在一根會轉的大樑上，兩頭各吊一籃配重。少了一籃，大樑嘎一聲還撐得住；那一頭再變輕一點，大樑就整根翻過去，上面的東西全滑下去',
    hints: [{ r: 1, t: '敵寨前頭那籃配重只用麻繩吊著，一輪連弩就斷；斷了再打前面那座樓，大樑就往後翻', ok: () => !tilted() },
      { r: 2, t: '後頭那籃用鐵鍊吊著（要轟天砲、投石）：斷了再打後面那座樓，大樑往前翻，人滑進深谷', ok: () => !tilted() },
      { r: 3, t: '把一頭的兵和磚打掉，那一頭變輕，打掉夠多大樑也會翻', ok: () => !tilted() }],
    ground: [[-40, 4], [0, 0], [33.4, 0], [35, -3], [77, -3], [78.6, 0], [112, 0], [152, 4]],
    voids: [[34, 78]],
    wind: { max: 6, at: 3 },
    me: { crew: ['rocket', 'bolt', 'stone', 'bomb'] },
    foe: { crew: ['bomb', 'rocket', 'ice', 'bolt'], hp: 1.25, dmg: 1.55, open: 0.55, ai: { err: 3.2, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 1.8 } },
    weak: (side) => tgC(side, [[10, 3], [8, 3], [2, 3], [0, 3]], 0.9),
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[47, 40]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 47], [53, 32]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[63, 41]], at: 2, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[52, 50], [59, 28]] }
  },
  {
    name: '琉璃宮', tag: '琉璃・共鳴晶柱・吊燈', theme: 10, castle: 'GLASS', stress: 1,
    tip: '兩座宮殿都是琉璃，一撞就碎。上層正中間的紫色晶柱被重重打中，整座宮殿的琉璃會一圈一圈震碎',
    hints: [{ r: 1, t: '打開敵宮上層的琉璃牆，再打正中間的紫色共鳴晶柱：打掉快一半，整座宮殿一圈一圈震碎', ok: () => !!foeB(5, 3) },
      { r: 2, t: '大廳天花板吊著一盞水晶吊燈，正下方就是一個兵：把天花板打穿，吊燈砸下來', ok: () => foeHome(1) && lampUp() },
      { r: 3, t: '琉璃碎片砸到下面的琉璃也會碎：從上往下打，一層壓垮一層', ok: () => foeLeft(M_GLASS) >= 8 }],
    ground: [[-40, 3], [0, 0], [40, 0], [43, -3.5], [69, -3.5], [72, 0], [112, 0], [152, 3]],
    me: { crew: ['rocket', 'stone', 'zap', 'bomb'] },
    foe: { crew: ['bomb', 'ice', 'zap', 'rocket'], hp: 1.7, dmg: 1.65, open: 0.55, ai: { err: 3.0, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.0 } },
    weak: (side) => tgC(side, [[5, 3]], 1.25).concat(tgC(side, [[5, 4]], 0.6)),
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[47, 38]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 46], [53, 31]], at: 2, hop: true },
      { owner: 0, mult: 10, h: 5.5, spots: [[52, 48]], at: 4, life: 1, gap: 2 },
      { owner: 1, mult: 3, h: 5.5, spots: [[63, 39], [61, 47]], at: 2, hop: true, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[51, 50], [60, 27]] }
  },
  {
    name: '古寺撞鐘', tag: '大鐘擺・連層崩塌・火', theme: 11, castle: 'PAGODA', stress: 1,
    tip: '戰場正中間吊著一口大鐘。砲彈打在鐘上會把它往對面推：推得夠用力，大鐘盪過去撞進敵塔，柱子一斷，上面一層一層壓下來',
    hints: [{ r: 1, t: '打中間那口大鐘，把它往敵塔推：一輪打得越重，它盪得越高，撞進去的那一下越痛' },
      { r: 2, t: '每一層只有兩根柱子：打斷一根，另一根撐不了多久，上面幾層一起壓下來', ok: () => foeHome(1) || foeHome(2) },
      { r: 3, t: '火油兵點著的柱子會越燒越細：塔是木頭和瓦蓋的，火一路往上延燒', ok: () => foeLeft(M_WOOD, 1) >= 4 }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    wind: { max: 5, at: 3 },
    bell: { x: 56, y: 50.5, len: 34, w: 6.8, h: 7.4, den: 2.6 },
    me: { crew: ['fire', 'rocket', 'stone', 'bomb'] },
    foe: { crew: ['bomb', 'fire', 'rocket', 'bolt'], hp: 1.15, dmg: 0.95, open: 0.5, ai: { err: 4.3, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5, sap: 0.6, warm: 2.0 } },
    weak: (side) => tgC(side, [[1, 10], [9, 10], [2, 8], [8, 8], [3, 6]], 0.95),
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[46, 38]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[59, 42], [50, 30]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[65, 37]], at: 3, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[48, 45], [64, 45]] }
  },
  {
    name: '魔王城', tag: '魔王三階段・鐵吊燈', theme: 5, castle: 'KEEP',
    tip: '打倒魔王就贏。兩座城一模一樣：大殿屋頂吊著一盞鐵吊燈，正好在魔王頭頂（你這邊也有一盞）。毀滅光球打爆了會掉頭砸回去',
    hints: [{ r: 1, t: '打倒魔王就贏：鐵吊燈就吊在他頭頂，打斷鐵鍊（轟天砲、雷法師），或打斷大殿的木柱讓屋頂連燈一起砸下來' }, { r: 2, t: '把魔王腳下的樓板打穿，他摔一層就痛一次；轟出城外也會扣一大截血' }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    voids: [[41.5, 70.5]],
    me: { crew: ['rocket', 'zap', 'bomb', 'fire'] },
    foe: { crew: ['boss', 'rocket', 'bomb', 'fire'], hp: 1.1, dmg: 1.2, open: 0.55, ai: { err: 4.8, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5, sap: 0.6, warm: 1.8 } },
    weak: (side) => side === 1 ? tgC(side, [[3, 2], [7, 2]], 0.7) : [],
    boss: { p2: 0.8, p3: 0.45, segHp: 60, regen: 2, orbHp: 30, orbGap: [3, 2], meteors: 1 },
    gates: [
      { owner: 0, mult: 3, h: 6, spots: [[47, 38]] },
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 45], [57, 34]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[64, 45]], at: 3, regap: 2 },
      { owner: 0, mult: 20, h: 5.5, spots: [[50, 27]], phase: 3, life: 1, gap: 1 }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 25], [48, 48], [62, 48]] },
    sudden: 14
  }
];
