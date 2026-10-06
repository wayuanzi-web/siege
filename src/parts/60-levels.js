/* ===== 60-levels: 六個關卡 =====
   ground  地面起伏 [x, y]…（城腳一定在 y=0）；voids 沒有地面的區間（砲彈直接掉下去）
   me/foe  castle 用哪張藍圖、crew 依兵位 1、2、3… 放什麼兵
   foe.ai  err 落點誤差、think 幾秒重新瞄一次、gate 會去穿倍增符的機率、hate 會打我方倍增符的機率、turn 砲口轉速
   foe.hp / rate / dmg  敵軍的耐久、射速、傷害倍率；foe.delay 開局幾秒後才開火
   gates   倍增符：owner 0 我方（藍）、1 敵方（赤，可以打掉）、2 黃金（兩邊都能用）、3 折損（÷2）
           mult 倍數、h 半高、spots 輪流出現的位置、at 幾秒後出現、life 存在幾秒、uses 能用幾次、gap 消失後隔多久再出現
           move  {t:'bob', a 振幅, per 週期}、{t:'orbit', rx, ry, per}
   objs    機關：mirror 冰鏡、portal 傳送門、geyser 地火
   wind    max 最強風力、per 幾秒變一次
   repeat  重複發生的事：lantern 天燈、rocks 落石 */
const LEVELS = [
  {
    name: '青丘試砲', tag: '基本玩法', theme: 0,
    tip: '按住畫面拖曳，調砲口的角度和力道。砲彈穿過藍色倍增符，一發變多發',
    ground: [[-40, 3], [0, 0], [36, 0], [44, -2.5], [56, -3.8], [68, -2.5], [76, 0], [112, 0], [152, 3]],
    me: { castle: 'P1', crew: ['rocket', 'bolt', 'rocket'] },
    foe: { castle: 'E1', crew: ['rocket', 'rocket'], delay: 7, hp: 0.9, rate: 0.8, ai: { err: 10, think: 3.8, gate: 0, turn: 1.3 } },
    gates: [
      { owner: 0, mult: 2, h: 6.5, spots: [[48, 36]], at: 0, hp: 900 },
      { owner: 0, mult: 3, h: 5.5, spots: [[62, 43.5], [60, 32], [66, 38]], at: 15, life: 12, gap: 5 }
    ],
    repeat: [{ do: 'lantern', at: 34, every: 30 }]
  },
  {
    name: '黃沙風口', tag: '風向・移動的符', theme: 1,
    tip: '風會把砲彈吹偏，看旗子和虛線修正。紫色的折損符會吃掉一半砲彈',
    ground: [[-40, 4], [0, 0], [36, 0], [42, -2], [49, 2], [53, 10], [56, 13], [59, 10], [63, 2], [70, -2], [76, 0], [112, 0], [152, 4]],
    me: { castle: 'P1', crew: ['rocket', 'bolt', 'bomb'] },
    foe: { castle: 'E2', crew: ['bomb', 'rocket', 'rocket'], delay: 4.5, ai: { err: 8, think: 3.1, gate: 0.5, turn: 1.8 } },
    wind: { max: 13, per: 9, at: 8 },
    gates: [
      { owner: 0, mult: 2, h: 6, spots: [[46, 38]], move: { t: 'bob', a: 6, per: 7 }, at: 0 },
      { owner: 0, mult: 3, h: 5.5, spots: [[60, 44]], move: { t: 'bob', a: 4, per: 8 }, at: 6 },
      { owner: 3, mult: 2, h: 5.5, spots: [[60, 32.5]], move: { t: 'bob', a: 4, per: 8 }, at: 6 },
      { owner: 1, mult: 2, h: 5.5, spots: [[70, 33], [68, 43.5]], at: 14, life: 16, gap: 8, regap: 14 }
    ],
    repeat: [{ do: 'lantern', at: 30, every: 28 }]
  },
  {
    name: '霜河冰壁', tag: '冰牆・冰鏡・冰凍', theme: 2,
    tip: '中間的冰牆擋住平射，吊高越過去。打太遠的砲彈會被冰鏡彈回來；兵被凍住就開護城罩',
    ground: [[-40, 3], [0, 0], [36, 0], [41, -2], [71, -2], [76, 0], [112, 0], [152, 3]],
    me: { castle: 'P2', crew: ['bolt', 'bomb', 'fire'] },
    foe: { castle: 'E3', crew: ['ice', 'rocket', 'ice'], delay: 4, ai: { err: 7, think: 2.9, gate: 0.6, turn: 2, lob: 1 } },
    extra: [{ castle: 'WALL', x: 56, y: -2, hp: 1.1 }],
    objs: [
      { t: 'mirror', x: 104, y: 45.5, len: 5.5, ang: 0.62, swing: 0.5, sw: 0.2, ph: 0 },
      { t: 'mirror', x: 8, y: 45.5, len: 5.5, ang: -0.62, swing: 0.5, sw: 0.2, ph: 2 }
    ],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[56, 43.5]], at: 0 },
      { owner: 0, mult: 2, h: 5.5, spots: [[43, 41]], move: { t: 'bob', a: 5, per: 7 }, at: 8 },
      { owner: 1, mult: 2, h: 5.5, spots: [[69, 43]], at: 12, regap: 14 }
    ],
    repeat: [{ do: 'lantern', at: 28, every: 27 }]
  },
  {
    name: '熔岩雙峰', tag: '地火・落石・火藥桶', theme: 3,
    tip: '砲彈穿過噴發的地火會著火，傷害更高、還能點燃木頭。敵城裡的火藥桶一打就爆',
    ground: [[-40, 5], [0, 0], [36, 0], [40, -3.5], [72, -3.5], [76, 0], [112, 0], [152, 5]],
    me: { castle: 'P2', crew: ['rocket', 'bomb', 'ice'] },
    foe: { castle: 'E4', crew: ['fire', 'fire', 'bomb'], delay: 3.5, ai: { err: 6, think: 2.7, gate: 0.65, hate: 0.2, turn: 2.2 } },
    objs: [
      { t: 'geyser', x: 46, w: 2.8, hgt: 45, per: 8.4, dur: 2.6, lead: 1.1, ph: 0 },
      { t: 'geyser', x: 56, w: 2.8, hgt: 48, per: 8.4, dur: 2.6, lead: 1.1, ph: 5.6 },
      { t: 'geyser', x: 66, w: 2.8, hgt: 45, per: 8.4, dur: 2.6, lead: 1.1, ph: 2.8 }
    ],
    gates: [
      { owner: 0, mult: 2, h: 5.5, spots: [[51, 34], [51, 43]], at: 0, life: 16, gap: 3 },
      { owner: 0, mult: 3, h: 5.5, spots: [[61, 43.5], [61, 33]], at: 10, life: 12, gap: 6 },
      { owner: 1, mult: 2, h: 5.5, spots: [[71, 33], [71, 43.5]], at: 9, life: 15, gap: 6, regap: 13 }
    ],
    repeat: [{ do: 'rocks', at: 16, every: 13, n: 3 }, { do: 'lantern', at: 26, every: 26 }]
  },
  {
    name: '雲海浮島', tag: '傳送門・氣球・防空弩', theme: 4,
    tip: '藍色傳送門會把砲彈送到敵城頭頂往下灌。轟炸氣球飄過來之前先打下來；防空弩要靠倍增的彈幕壓過去',
    voids: [[36, 76]],
    me: { castle: 'P3', crew: ['bolt', 'ice', 'zap', 'rocket'] },
    foe: { castle: 'E5', crew: ['bal', 'zap', 'flak', 'bolt'], delay: 3.5, ai: { err: 5.5, think: 2.6, gate: 0.7, hate: 0.25, turn: 2.3 } },
    objs: [
      { t: 'portal', owner: 0, x: 46, y: 29, r: 3.4, ex: 93.3, ey: 51, ea: -Math.PI / 2, ej: 0.4, ew: 15, mv: { a: 3.5, per: 9 } },
      { t: 'portal', owner: 1, x: 66, y: 29, r: 3.4, ex: 18.7, ey: 51, ea: -Math.PI / 2, ej: 0.4, ew: 15, mv: { a: 3.5, per: 9, ph: 0.5 } }
    ],
    gates: [
      { owner: 0, mult: 2, h: 5.5, spots: [[50, 41]], move: { t: 'orbit', rx: 3.5, ry: 4, per: 10 }, at: 0 },
      { owner: 0, mult: 3, h: 5.5, spots: [[62, 37], [60, 43.5]], at: 9, life: 12, gap: 6 },
      { owner: 2, mult: 5, h: 5.5, spots: [[56, 43.5]], at: 24, life: 9, gap: 15 },
      { owner: 1, mult: 2, h: 5.5, spots: [[70, 42], [70, 33]], at: 10, life: 15, gap: 6, regap: 13 }
    ],
    repeat: [{ do: 'lantern', at: 22, every: 22 }]
  },
  {
    name: '魔王城', tag: '魔王三階段', theme: 5,
    tip: '魔王城的城防掉到三分之二會張開結界，瞄缺口打；毀滅光球飛過來要打掉或開護城罩',
    voids: [[36, 69.5]],
    me: { castle: 'P3', crew: ['rocket', 'zap', 'bomb', 'fire'] },
    foe: { castle: 'E6', crew: ['boss', 'rocket', 'bomb', 'flak'], delay: 3.5, ai: { err: 5, think: 2.5, gate: 0.75, hate: 0.3, turn: 2.4 } },
    boss: { p2: 0.66, p3: 0.33, orbEvery: 11, spin: 0.5, arc: 0.5, segHp: 80, regen: 7, metEvery: 8.5 },
    gates: [
      { owner: 0, mult: 2, h: 6, spots: [[45, 37]], at: 0 },
      { owner: 0, mult: 3, h: 5.5, spots: [[55, 43.5], [56, 33]], at: 10, life: 12, gap: 5 },
      { owner: 1, mult: 2, h: 5.5, spots: [[63, 43.5]], at: 8, regap: 13 },
      { owner: 1, mult: 3, h: 5.5, spots: [[65, 33]], phase: 2, at: 2, life: 14, gap: 9, regap: 15 },
      { owner: 2, mult: 8, h: 5.5, spots: [[51, 43.5]], phase: 3, at: 3, life: 10, gap: 14 }
    ],
    repeat: [{ do: 'lantern', at: 24, every: 24 }],
    sudden: 190
  }
];
