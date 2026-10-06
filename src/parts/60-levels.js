/* ===== 60-levels: 六個關卡 =====
   ground  地面起伏 [x, y]…（城腳一定在 y=0）；voids 沒有地面的區間（東西掉下去就沒了）
   me/foe  castle 用哪張藍圖、crew 依兵位 1、2、3… 放什麼兵
   foe.ai  err 落點誤差、think 想多久才開火、gate 這一輪會去找倍增符的機率、hate 會打我方倍增符的機率、lob 偏好吊高、
           skill 連珠砲集滿之後會拿來用的機率（0 = 不會用）
   foe.hp / dmg  敵軍的耐久、傷害倍率
   gates   倍增符：owner 0 我方（藍）、1 敵方（赤，會擋我方的砲，可以打掉）、2 黃金（兩邊都能用）、3 折損（÷2）
           mult 倍數、h 半高、spots 位置（hop: true 的每回合換下一個）、at 第幾回合開始出現、
           life 出現幾回合、gap 消失後隔幾回合再出現、regap 被打掉後隔幾回合、move {t:'bob', a 振幅, per 週期（秒）}
   objs    機關：mirror 冰鏡、portal 傳送門、geyser 地火（每回合輪流開一個）
   wind    max 最強風力、at 第幾回合開始有風（每回合換一次）
   lantern 天燈：at 第幾回合開始、every 每隔幾回合、spots 出現的位置
   rocks   落石：at、every、n 幾顆（回合開始時預告落點，回合結束時砸下來）
   sudden  第幾回合之後雙方砲火開始加重 */
const LEVELS = [
  {
    name: '青丘試砲', tag: '基本玩法', theme: 0,
    tip: '雙方輪流開火。按住畫面拖曳瞄準，放開就發射；砲彈穿過藍色倍增符，一發變多發。打斷望樓的柱子，整座會倒下來。守軍全倒就破城',
    ground: [[-40, 3], [0, 0], [36, 0], [44, -2.5], [56, -3.8], [68, -2.5], [76, 0], [112, 0], [152, 3]],
    me: { castle: 'P1', crew: ['rocket', 'bolt', 'rocket'] },
    foe: { castle: 'E1', crew: ['rocket', 'rocket'], hp: 1.1, dmg: 1.5, ai: { err: 6.5, think: 1.3, gate: 0 } },
    gates: [
      { owner: 0, mult: 3, h: 6.5, spots: [[48, 36]] },
      { owner: 0, mult: 5, h: 5.5, spots: [[62, 43], [60, 32], [66, 38]], at: 2, hop: true }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 47], [53, 27], [59, 26]] }
  },
  {
    name: '黃沙風口', tag: '風向・移動的符・滾石', theme: 1,
    tip: '每回合風向都會變，虛線已經把風算進去。倍增符上下飄，抓準時機放手；紫色的折損符會吃掉一半砲彈。沙城的閣樓堆著大石球，打斷撐著它的木樑，石球就砸在底下的兵頭上',
    ground: [[-40, 4], [0, 0], [36, 0], [42, -2], [49, 2], [53, 10], [56, 13], [59, 10], [63, 2], [70, -2], [76, 0], [112, 0], [152, 4]],
    me: { castle: 'P1', crew: ['rocket', 'bolt', 'bomb'] },
    foe: { castle: 'E2', crew: ['bomb', 'rocket', 'rocket'], hp: 1.0, dmg: 1.1, ai: { err: 6.5, think: 1.2, gate: 0.5 } },
    wind: { max: 12, at: 2 },
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
    tip: '中間的冰牆擋住平射：把它轟倒，或是吊高越過去。冰很滑，打掉冰塔底下的支撐，整座就溜下來。兵被凍住會少打一輪，開護罩可以解凍',
    ground: [[-40, 3], [0, 0], [36, 0], [41, -2], [71, -2], [76, 0], [112, 0], [152, 3]],
    me: { castle: 'P2', crew: ['bolt', 'bomb', 'fire'] },
    foe: { castle: 'E3', crew: ['ice', 'bomb', 'ice'], hp: 1.6, dmg: 1.4, ai: { err: 5.5, think: 1.2, gate: 0.6, hate: 0.15, lob: 1, skill: 0.4 } },
    extra: [{ castle: 'WALL', x: 56, y: -2, hp: 1 }],
    objs: [
      { t: 'mirror', x: 104, y: 45.5, len: 5.5, ang: 0.62, swing: 0.5, sw: 0.2, ph: 0 },
      { t: 'mirror', x: 8, y: 45.5, len: 5.5, ang: -0.62, swing: 0.5, sw: 0.2, ph: 2 }
    ],
    gates: [
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 43.5]] },
      { owner: 0, mult: 3, h: 5.5, spots: [[43, 41], [44, 31]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[69, 43]], at: 3, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[47, 47], [65, 47]] }
  },
  {
    name: '熔岩雙峰', tag: '火藥庫・地火・落石', theme: 3,
    tip: '敵城正面是又厚又重的鐵甲：吊高從屋頂打進去。樓上是火藥庫，炸到一桶就三桶連環爆。砲彈穿過地火會著火、威力更大；紅圈是回合結束時的落石，開護罩擋得住',
    ground: [[-40, 5], [0, 0], [36, 0], [40, -3.5], [72, -3.5], [76, 0], [112, 0], [152, 5]],
    me: { castle: 'P2', crew: ['rocket', 'bomb', 'ice'] },
    foe: { castle: 'E4', crew: ['fire', 'fire', 'bomb'], hp: 1.3, dmg: 1.1, ai: { err: 5.5, think: 1.1, gate: 0.65, hate: 0.2, skill: 0.5 } },
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
    rocks: { at: 2, every: 2, n: 1 },
    lantern: { at: 3, every: 3, spots: [[56, 26], [44, 46], [68, 46]] }
  },
  {
    name: '雲海浮島', tag: '傳送門・氣球・防空弩', theme: 4,
    tip: '兩座城都蓋在浮島的邊緣，掉出去的就回不來了。藍色傳送門會把砲彈送到敵城頭頂往下灌；轟炸氣球先停在半路，下一輪才飛過來，趁現在打下來。防空弩每輪會射下三發砲彈',
    voids: [[36, 76]],
    me: { castle: 'P3', crew: ['rocket', 'ice', 'zap', 'bomb'] },
    foe: { castle: 'E5', crew: ['bal', 'bomb', 'flak', 'zap'], hp: 1.0, dmg: 1.0, ai: { err: 5, think: 1.1, gate: 0.75, hate: 0.25, skill: 0.5 } },
    objs: [
      // 藍色傳送門放在 ×3 符的後面：穿過符的砲彈順勢飛進去，從敵城正上方灌下來
      { t: 'portal', owner: 0, x: 58, y: 40, r: 3.8, ex: 93.3, ey: 50, ea: -Math.PI / 2, ej: 0.22, ew: 14, mv: { a: 3, per: 9 } },
      { t: 'portal', owner: 1, x: 54, y: 27, r: 3.8, ex: 18.7, ey: 50, ea: -Math.PI / 2, ej: 0.22, ew: 14, mv: { a: 3, per: 9, ph: 0.5 } }
    ],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[46, 38]], move: { t: 'bob', a: 3, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[64, 45], [47, 27]], at: 2, hop: true },
      { owner: 2, mult: 10, h: 5.5, spots: [[52, 46]], at: 4, life: 1, gap: 2 },
      { owner: 1, mult: 2, h: 5.5, spots: [[69, 33], [66, 22]], at: 3, hop: true, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[56, 24], [52, 47], [60, 30]] }
  },
  {
    name: '魔王城', tag: '魔王三階段', theme: 5,
    tip: '打倒魔王就贏。先轟掉屋頂，再把砲彈吊進大殿；把魔王轟出城，他會摔掉一截血再飛回來。魔王受傷後會張開結界，每回合換缺口：從沒有光牆的地方打。毀滅光球擋在城前面，順手打掉它，或是開護罩',
    voids: [[36, 69.5]],
    me: { castle: 'P3', crew: ['rocket', 'zap', 'bomb', 'fire'] },
    foe: { castle: 'E6', crew: ['boss', 'rocket', 'bomb', 'flak'], hp: 0.95, dmg: 0.9, ai: { err: 5.5, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5 } },
    boss: { p2: 0.7, p3: 0.4, segHp: 60, regen: 2, orbHp: 30, meteors: 1 },
    gates: [
      { owner: 0, mult: 3, h: 6, spots: [[45, 37]] },
      { owner: 0, mult: 5, h: 5.5, spots: [[55, 43.5], [56, 33]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[63, 43.5]], at: 3, regap: 2 },
      { owner: 2, mult: 20, h: 5.5, spots: [[51, 43.5]], phase: 3, life: 1, gap: 1 }
    ],
    lantern: { at: 3, every: 3, spots: [[53, 25], [47, 47], [58, 47]] },
    sudden: 20
  }
];
