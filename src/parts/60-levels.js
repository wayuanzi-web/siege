/* ===== 60-levels: 六個關卡 =====
   ground  地面起伏 [x, y]…（城腳一定在 y=0）；voids 沒有地面的區間（東西掉下去就沒了）
   me/foe  castle 用哪張藍圖、crew 依兵位 1、2、3… 放什麼兵
   foe.ai  err 落點誤差、think 想多久才開火、gate 這一輪會去找倍增符的機率、hate 會打我方倍增符的機率、lob 偏好吊高、
           skill 連珠砲集滿之後會拿來用的機率（0 = 不會用）、sap 會把牆和柱子也列進目標的機率（列進去也多半還是瞄兵）、
           guard 會不會去打天燈、氣球（0 = 不會）
   foe.hp / dmg  敵軍的耐久、傷害倍率
   gates   倍增符：owner 0 我方（藍）、1 敵方（赤，會擋我方的砲，可以打掉）、2 黃金（兩邊都能用）、3 折損（÷2）
           mult 倍數、h 半高、spots 位置（hop: true 的每回合換下一個）、at 第幾回合開始出現、
           life 出現幾回合、gap 消失後隔幾回合再出現、regap 被打掉後隔幾回合、move {t:'bob', a 振幅, per 週期（秒）}
   objs    機關：mirror 冰鏡、portal 傳送門、geyser 地火（每回合輪流開一個）
   wind    max 最強風力、at 第幾回合開始有風（每回合換一次）
   lantern 天燈：at 第幾回合開始、every 每隔幾回合、spots 出現的位置
   rocks   落石：at、every、n 幾顆（回合開始時預告落點，回合結束時砸下來）
   boss    魔王：p2、p3 血量剩幾成進第二、第三階段；segHp 結界每一段的耐久、regen 打破後隔幾回合補回來；
           orbHp 毀滅光球的耐久、orbGap 第二／第三階段各隔幾輪放一顆；meteors 第三階段每回合幾顆隕石
   sudden  第幾回合之後雙方砲火開始加重（沒寫就是第 10 回合）
   tip     主畫面上的關卡說明（兩三句就好：這一關的機關是什麼、最該打哪裡；細節進了關卡輪到玩家的時候再講）
   hints   進了關卡之後輪到你的時候講的訣竅，一回合最多一句：r 第幾回合起可以講、t 內容、ok 還用得上才講（沒寫就一定講） */
// 敵軍第幾號兵位還有沒有人、還有沒有某一種兵、還有沒有火藥桶
const foeAt = (slot) => S.team[1].units.some((u) => u.alive && u.slot === slot);
const foeHas = (type) => S.team[1].units.some((u) => u.alive && u.type === type);
// 敵軍第幾號兵還待在原本的位置上（沒被打倒、也還沒摔下來）：教「怎麼把他弄下來」的訣竅，要他還在上面才講
const foeHome = (slot) => S.team[1].units.some((u) => u.alive && u.slot === slot && Math.abs(u.x - u.hx) < 2.2 && Math.abs(u.y - u.hy) < 1.6);
// 敵城藍圖上第 cx 欄（照藍圖寫的方向，由左數）、第 cy 列（由下往上數，0 是最底下）的那塊磚還在不在原位
const foeCell = (cx, cy) => { const st = S.st[1], b = st.cellB[cy * st.cols + (st.cols - 1 - cx)]; return !!(b && !b.dead && b.inPlace); };
// 戰場中間的牆（中立的那一座）還剩幾塊在原位
const wallLeft = () => { let n = 0; for (const q of S.structs) if (q.side === 2 && !q.loose) for (const b of q.blocks) if (!b.dead && b.inPlace) n++; return n; };
const foeKegs = () => S.st[1].blocks.some((b) => !b.dead && b.mat === M_KEG);
const LEVELS = [
  {
    name: '青丘試砲', tag: '基本玩法', theme: 0,
    tip: '雙方輪流開火。拖曳瞄準、放開發射；穿過藍色倍增符，一發變多發。打斷望樓的柱子，整座就倒',
    hints: [{ r: 1, t: '打斷望樓最底下的細柱子，整座連人一起倒下來', ok: () => foeHome(1) }, { r: 2, t: '把守軍全部打倒就破城；你的兵全倒就輸了' }],
    ground: [[-40, 3], [0, 0], [36, 0], [44, -2.5], [56, -3.8], [68, -2.5], [76, 0], [112, 0], [152, 3]],
    me: { castle: 'P1', crew: ['rocket', 'bolt', 'rocket'] },
    foe: { castle: 'E1', crew: ['rocket', 'rocket'], hp: 1.1, dmg: 1.5, ai: { err: 6.5, think: 1.3, gate: 0, sap: 0, guard: 0 } },
    gates: [
      { owner: 0, mult: 3, h: 6.5, spots: [[48, 36]] },
      { owner: 0, mult: 5, h: 5.5, spots: [[62, 43], [60, 32], [66, 38]], at: 2, hop: true }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 47], [53, 27], [59, 26]] }
  },
  {
    name: '黃沙風口', tag: '風向・移動的符・滾石', theme: 1,
    tip: '每回合的風都不一樣，虛線已經算進去。木板平台上有兩顆大石球：把木板打穿，石球就砸在底下的兵頭上',
    hints: [{ r: 1, t: '木板平台上擺著兩顆大石球：把石球腳下的木板打穿，它就砸在底下的兵頭上', ok: () => foeAt(2) || foeAt(3) }, { r: 4, t: '倍增符上下飄：虛線穿過去的時候它會亮起來，那時候放手' }],
    ground: [[-40, 4], [0, 0], [36, 0], [42, -2], [49, 2], [53, 10], [56, 13], [59, 10], [63, 2], [70, -2], [76, 0], [112, 0], [152, 4]],
    me: { castle: 'P1', crew: ['rocket', 'bolt', 'bomb'] },
    foe: { castle: 'E2', crew: ['bomb', 'rocket', 'rocket'], hp: 1.0, dmg: 1.45, ai: { err: 6, think: 1.2, gate: 0.5, sap: 0.2 } },
    wind: { max: 8, at: 2 },
    gates: [
      { owner: 0, mult: 3, h: 6, spots: [[46, 38]], move: { t: 'bob', a: 6, per: 7 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[60, 44]], move: { t: 'bob', a: 4, per: 8 }, at: 2 },
      { owner: 3, mult: 2, h: 5.5, spots: [[60, 32.5]], move: { t: 'bob', a: 4, per: 8 }, at: 2 },
      { owner: 1, mult: 2, h: 5.5, spots: [[70, 33], [68, 43.5]], at: 3, hop: true, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 47], [50, 28], [64, 26]] }
  },
  {
    name: '霜河冰壁', tag: '冰牆・滑溜的冰・冰凍', theme: 2,
    tip: '冰牆擋住平射：轟倒它，或吊高越過去。打穿冰塔牆腳下的冰板，塔一歪人就溜下來；打斷大廳的冰柱，整片垮進去',
    hints: [{ r: 1, t: '中間的冰牆擋住平射：吊高越過去，或是先把它轟倒', ok: () => wallLeft() >= 6 },
      { r: 2, t: '冰很滑：把冰塔牆腳底下那一格冰板打穿，塔一歪，上面的兵就溜下來', ok: () => foeHome(1) || foeHome(2) },
      { r: 3, t: '大廳裡兩根冰柱撐著整片冰板：打斷冰柱（火一烤就化），冰板再破一格，就整片垮進大廳', ok: () => foeHome(3) && (foeCell(3, 4) || foeCell(5, 4)) }],
    ground: [[-40, 3], [0, 0], [36, 0], [41, -2], [71, -2], [76, 0], [112, 0], [152, 3]],
    me: { castle: 'P2', crew: ['bolt', 'bomb', 'fire'] },
    foe: { castle: 'E3', crew: ['rocket', 'bomb', 'ice'], hp: 1.3, dmg: 1.6, ai: { err: 4.4, think: 1.2, gate: 0.6, hate: 0.15, lob: 1, skill: 0.4, sap: 0.4 } },
    extra: [{ castle: 'WALL', x: 56, y: -2, hp: 1 }],
    gates: [
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 43.5]] },
      { owner: 0, mult: 3, h: 5.5, spots: [[43, 41], [44, 31]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[69, 43]], at: 3, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[47, 47], [65, 47]] }
  },
  {
    name: '熔岩雙峰', tag: '火藥庫・地火・落石', theme: 3,
    tip: '正面是鐵甲，吊高從屋頂打進去。炸到一桶火藥，三桶連環爆。紅圈是落石的位置，會砸到你就開護罩',
    hints: [{ r: 1, t: '敵城正面是鐵甲：吊高一點，從屋頂打進去' }, { r: 2, t: '樓上是火藥庫：炸到一桶，三桶連環爆', ok: foeKegs }],
    ground: [[-40, 5], [0, 0], [36, 0], [40, -3.5], [72, -3.5], [76, 0], [112, 0], [152, 5]],
    me: { castle: 'P2', crew: ['rocket', 'bomb', 'ice'] },
    foe: { castle: 'E4', crew: ['fire', 'fire', 'bomb'], hp: 1.5, dmg: 1.75, ai: { err: 5.0, think: 1.1, gate: 0.65, hate: 0.2, skill: 0.5, sap: 0.5 } },
    objs: [
      { t: 'geyser', x: 46, w: 2.8, hgt: 45 },
      { t: 'geyser', x: 56, w: 2.8, hgt: 48 },
      { t: 'geyser', x: 66, w: 2.8, hgt: 45 }
    ],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[51, 34], [51, 43]], hop: true },
      { owner: 0, mult: 5, h: 5.5, spots: [[61, 43.5], [61, 33]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[71, 33], [71, 43.5]], at: 3, hop: true, regap: 2 }
    ],
    rocks: { at: 2, every: 2, n: 1, foe: 0.35 },
    lantern: { at: 3, every: 3, spots: [[56, 26], [44, 46], [68, 46]] }
  },
  {
    name: '雲海浮島', tag: '傳送門・氣球・防空弩', theme: 4,
    tip: '掉出浮島就回不來。射進藍色傳送門，砲彈從敵城頭頂灌下去。把露台打斷，防空弩就掉進雲海',
    hints: [{ r: 1, t: '把砲彈射進藍色傳送門，會從敵城頭頂灌下去' }, { r: 2, t: '兩座城都在浮島邊上：把兵轟下去就回不來了' }, { r: 3, t: '防空弩每一輪射下你三發砲彈：把它腳下的木板露台打斷，它就掉進雲海', ok: () => foeHas('flak') }],
    voids: [[36, 77.6]],
    me: { castle: 'P3', crew: ['rocket', 'ice', 'zap', 'bomb'] },
    foe: { castle: 'E5', crew: ['bal', 'bomb', 'flak', 'zap'], hp: 1.4, dmg: 1.85, ai: { err: 3.2, think: 1.1, gate: 0.75, hate: 0.25, skill: 0.5, sap: 0.6 } },
    objs: [
      // 藍色傳送門放在 ×3 符的後面：穿過符的砲彈順勢飛進去，從敵城正上方灌下來
      { t: 'portal', owner: 0, x: 58, y: 40, r: 3.8, ex: 93.3, ey: 50, ea: -Math.PI / 2, ej: 0.22, ew: 14, mv: { a: 3, per: 9 } },
      { t: 'portal', owner: 1, x: 54, y: 27, r: 3.8, ex: 18.7, ey: 50, ea: -Math.PI / 2, ej: 0.22, ew: 14, mv: { a: 3, per: 9, ph: 0.5 } }
    ],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[46, 38]], move: { t: 'bob', a: 3, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[64, 45], [47, 27]], at: 2, hop: true },
      { owner: 0, mult: 10, h: 5.5, spots: [[52, 46]], at: 4, life: 1, gap: 2 },
      { owner: 1, mult: 2, h: 5.5, spots: [[69, 33], [66, 22]], at: 3, hop: true, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 24], [52, 47], [60, 30]] }
  },
  {
    name: '魔王城', tag: '魔王三階段', theme: 5,
    tip: '打倒魔王就贏。打斷大殿的木柱讓屋頂砸他，打穿腳下的樓板讓他摔。毀滅光球打爆了會掉頭砸回去',
    hints: [{ r: 1, t: '打倒魔王就贏：打斷大殿的木柱，屋頂會砸在他頭上；掀開了再把砲彈吊進去' }, { r: 2, t: '把魔王腳下的樓板打穿，他摔一層就痛一次；轟出城外也會摔掉一截血' }],
    voids: [[36, 69.5]],
    me: { castle: 'P3', crew: ['rocket', 'zap', 'bomb', 'fire'] },
    foe: { castle: 'E6', crew: ['boss', 'rocket', 'bomb', 'fire'], hp: 1.1, dmg: 1.9, ai: { err: 4.6, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5, sap: 0.6 } },
    boss: { p2: 0.8, p3: 0.45, segHp: 60, regen: 2, orbHp: 30, orbGap: [3, 2], meteors: 1 },
    gates: [
      { owner: 0, mult: 3, h: 6, spots: [[45, 37]] },
      { owner: 0, mult: 5, h: 5.5, spots: [[55, 43.5], [56, 33]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[63, 43.5]], at: 3, regap: 2 },
      { owner: 0, mult: 20, h: 5.5, spots: [[49, 26.5]], phase: 3, life: 1, gap: 1 }
    ],
    lantern: { at: 3, every: 3, spots: [[57, 24], [47, 47], [58, 47]] },
    sudden: 14
  }
];
