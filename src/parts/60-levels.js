/* ===== 60-levels: 十二個關卡（第一篇 1–6、第二篇 7–12；魔王城在最後） =====
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
// 敵城藍圖上第 cx 欄（照藍圖寫的方向）、由上往下第 row 列的那塊磚（還在原位才算）
const foeB = (cx, row) => { const st = S.st[1], b = st.cellB[(st.rows - 1 - row) * st.cols + (st.cols - 1 - cx)]; return b && !b.dead && b.inPlace ? b : null; };
// 自動玩家（我方）想打的要害：直接打中那一塊最好
// （瞄的是那一格的位置：長樑、長柱子要打的是指定的那一段，不是整根的正中間）
const tgB = (cells, w) => { const out = []; for (const [cx, row] of cells) { const b = foeB(cx, row); if (b) { const P = cellPt(S.st[1], [cx, row, 0.5, 0.5]); out.push({ x: P.x, y: P.y, w, blk: b }); } } return out; };
// 第七關：戰場中間還站著的石碑（由左到右）
const steles = () => { const out = []; for (const q of S.structs) if (q.side === 2 && !q.loose) for (const b of q.blocks) if (!b.dead && b.dom && b.inPlace) out.push(b); return out.sort((a, b) => a.x0 - b.x0); };
// 第八關：鐵鍊還在不在（tag）
const ropeLeft = (tag) => S.ropes.some((r) => !r.cut && r.side === 1 && r.tag === tag);
// 第九關：天秤歪了沒有
const tilted = () => S.pivots.some((o) => Math.abs(o.ang) > 0.15);
// 敵城還有幾塊某種材質的磚在原位（第十關的琉璃、第十一關的木柱）
const foeLeft = (mat, tall) => { let n = 0; for (const b of S.st[1].blocks) if (!b.dead && b.inPlace && b.mat === mat && (!tall || b.h > b.w)) n++; return n; };
// 吊燈還吊著
const lampUp = () => S.ropes.some((r) => r.side === 1 && r.hang && r.hang.hang === 'lamp' && !r.cut && !r.hang.dead && r.a && r.a.inPlace);
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
    name: '竹海吊樓', sayTop: 1, tag: '竹樁・索橋・河水', theme: 6, stress: 1,
    tip: '吊腳樓蓋在細細的竹樁上：打斷竹樁，剩下的撐不住，樓子一歪就連人滑進河裡被沖走。竹子一點就著',
    hints: [{ r: 1, t: '吊腳樓只靠兩三根細竹樁撐著：打斷一根，剩下的撐不住，會嘎吱嘎吱一根接一根斷' },
      { r: 2, t: '掉進河裡的兵會被水沖走：把樓子打歪，讓它整間滑進河裡', ok: () => foeHome(1) || foeHome(3) || foeHome(4) },
      { r: 3, t: '望樓靠兩根細竹竿撐在河中間的大石頭上：打斷竹竿，整座望樓連人摔下來', ok: () => foeHome(2) }],
    ground: [[-40, 3], [0, 0], [37, 0], [41, -1.5], [46, -7], [170, -7]],
    water: { x0: 42, x1: 175, y: -1.6, cur: 2.4 },
    me: { castle: 'P3', crew: ['rocket', 'fire', 'bolt', 'bomb'] },
    foe: { castle: 'E7', y0: -7, crew: ['bolt', 'rocket', 'bomb', 'fire'], hp: 1.7, dmg: 2.9, open: 0.6, ai: { err: 3.0, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 1.5 } },
    // 竹樁露在水面上的那一截（泡在水裡的打不到）
    weak: (side) => side === 0 ? tgB([[10, 7], [12, 7], [3, 7], [0, 7], [5, 4], [8, 4]], 0.95) : [],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[47, 36]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[55, 44], [53, 29]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[60, 36]], at: 2, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[52, 47], [57, 25]] }
  },
  {
    name: '石林骨牌', sayTop: 1, tag: '石碑骨牌・投石兵', theme: 7, stress: 1,
    tip: '戰場中間一排石碑，往敵城那邊一塊比一塊高：推倒最矮的那塊，一路倒過去砸進敵城。投石兵丟的大石頭最會推',
    hints: [{ r: 1, t: '投石兵丟的是一顆真的大石頭：砸中最左邊那塊矮石碑的上半截，整排石碑一路倒過去，最高的那塊砸進敵城', ok: () => steles().length >= 3 },
      { r: 2, t: '中間那根石柱頂上只靠兩根細石頸撐著：打斷前面那根，整棟屋子往前倒，砸在前面那間小屋上', ok: () => foeHome(2) || foeHome(4) },
      { r: 3, t: '石柱頂的小屋只有一根石頸撐著，炸到一邊就翻：站在上面的兵會從十幾格高摔下來', ok: () => foeHome(1) || foeHome(3) }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    me: { castle: 'P3', crew: ['stone', 'rocket', 'bolt', 'bomb'] },
    foe: { castle: 'E8', crew: ['rocket', 'bomb', 'stone', 'bolt'], hp: 1.5, dmg: 2.8, open: 0.6, ai: { err: 2.9, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.1 } },
    extra: [{ castle: 'DOM', x: 50.8, y: 0, hp: 1 }],
    weak: (side) => {
      if (side !== 0) return [];
      const out = tgB([[6, 5], [5, 5], [10, 8], [1, 7]], 1.0), st = steles();
      // 最左邊（最矮）那塊石碑的上半截、偏左一點：往右推倒
      if (st.length >= 3 && st[0].x0 < 44) { const b = st[0], p = b.body.getPosition(); out.push({ x: p.x - b.w * 0.5, y: p.y + b.h * 0.3, w: 1.1, blk: b }); }
      return out;
    },
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[46, 37]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 45], [52, 30]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[64, 38]], at: 2, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[51, 48], [58, 27]] }
  },
  {
    name: '懸空寺', tag: '懸臂・鐵鍊・銅鐘', theme: 8, stress: 1,
    tip: '兩間殿從懸崖伸出來，外端各用一條鐵鍊吊著。打斷鐵鍊，整間殿的重量壓在插進岩壁的樑上，撐不住就連人掉進深谷',
    hints: [{ r: 1, t: '每間殿的外端吊著一條鐵鍊：轟天砲兩發就斷，火箭、雷要打好幾發，箭射不太動。斷了之後樑嘎吱嘎吱往下垂，撐不了多久', ok: () => ropeLeft('stay') },
      { r: 2, t: '岩簷底下吊著一口大銅鐘，正下方就是上面那間殿的兵：打斷吊鐘的鐵鍊，鐘砸穿屋頂', ok: () => ropeLeft('bell') },
      { r: 3, t: '上面那間殿掉下來會砸在下面那間上：兩間一起壓垮、一起掉進深谷', ok: () => foeHome(3) && (foeHome(1) || foeHome(2)) }],
    ground: [[-40, 3], [0, 0], [49, 0], [53, -3], [96, -3], [97, 0], [152, 0]],
    voids: [[53.5, 95.2]],
    me: { castle: 'P3', crew: ['rocket', 'zap', 'bolt', 'bomb'] },
    foe: { castle: 'E9', crew: ['fire', 'bomb', 'zap', 'bolt'], hp: 1.45, dmg: 3.0, open: 0.6, ai: { err: 2.7, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.1 } },
    weak: (side) => side === 0 ? tgB([[4, 11], [4, 7], [9, 10], [8, 6]], 0.95) : [],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[47, 38]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[57, 46], [55, 30]], at: 2, hop: true },
      { owner: 1, mult: 3, h: 5.5, spots: [[63, 40]], at: 2, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[52, 49], [60, 26]] }
  },
  {
    name: '天秤寨', tag: '天秤・配重・深谷', theme: 9, stress: 1,
    tip: '整座寨子架在一根會轉的大樑上，兩頭各吊一籃配重。哪一頭變輕，大樑就往另一頭翻，上面的東西全滑下去',
    hints: [{ r: 1, t: '前面那籃配重只用麻繩吊著，幾箭就斷：配重沒了，大樑往後翻，後面那座樓滑下去', ok: () => !tilted() },
      { r: 2, t: '後面那籃是鐵鍊吊的（要轟天砲、投石）：它斷了，大樑往前翻，前面那座樓連人滑進深谷', ok: () => !tilted() },
      { r: 3, t: '把一頭的兵和磚打掉，那一頭變輕，打掉夠多大樑也會翻', ok: () => !tilted() }],
    ground: [[-40, 4], [0, 0], [56, 0], [58, -3], [80, -3], [82, 0], [152, 4]],
    voids: [[58.5, 81.5]],
    wind: { max: 6, at: 3 },
    me: { castle: 'P3', crew: ['rocket', 'bolt', 'stone', 'bomb'] },
    foe: { castle: 'E10', crew: ['bomb', 'rocket', 'ice', 'bolt'], hp: 1.45, dmg: 2.5, open: 0.6, ai: { err: 3.0, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 1.5 } },
    weak: (side) => side === 0 ? tgB([[12, 3], [9, 3], [12, 1], [9, 1]], 0.9) : [],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[46, 39]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 46], [53, 31]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[61, 40]], at: 2, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[51, 49], [58, 27]] }
  },
  {
    name: '琉璃宮', tag: '琉璃・共鳴晶柱・吊燈', theme: 10, stress: 1,
    tip: '整座宮殿是琉璃，一撞就碎。上層正中間的紫色晶柱被重重打中，整座宮殿的琉璃會一圈一圈震碎',
    hints: [{ r: 1, t: '先把上層的琉璃牆打開，再瞄準正中間的紫色共鳴晶柱：一下打掉它一半，整座宮殿一起震碎', ok: () => !!foeB(5, 3) },
      { r: 2, t: '大廳天花板吊著一盞水晶吊燈，正下方就是一個兵：把天花板打穿，吊燈砸下來', ok: () => foeHome(1) && lampUp() },
      { r: 3, t: '琉璃碎片砸到下面的琉璃也會碎：從上往下打，一層壓垮一層', ok: () => foeLeft(M_GLASS) >= 8 }],
    ground: [[-40, 3], [0, 0], [38, 0], [42, -3.5], [70, -3.5], [74, 0], [112, 0], [152, 3]],
    me: { castle: 'P3', crew: ['rocket', 'stone', 'zap', 'bomb'] },
    foe: { castle: 'E11', crew: ['bomb', 'ice', 'zap', 'rocket'], hp: 1.6, dmg: 2.8, open: 0.6, ai: { err: 2.7, think: 1.1, gate: 0.85, hate: 0.3, skill: 0.85, sap: 0.6, warm: 2.1 } },
    weak: (side) => side === 0 ? tgB([[5, 3]], 1.25).concat(tgB([[5, 4]], 0.6)) : [],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[46, 37]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[56, 45], [52, 30]], at: 2, hop: true },
      { owner: 0, mult: 10, h: 5.5, spots: [[51, 47]], at: 4, life: 1, gap: 2 },
      { owner: 1, mult: 3, h: 5.5, spots: [[63, 38], [61, 46]], at: 2, hop: true, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[50, 49], [59, 26]] }
  },
  {
    name: '五重塔', tag: '高塔・連層崩塌・火', theme: 11, stress: 1,
    tip: '五層木塔，一層的柱子斷了一根，另一根撐不住，上面整疊一層一層壓下來。全是木頭和瓦，火會往上燒',
    hints: [{ r: 1, t: '每一層只有兩根柱子：打斷一根，另一根會嘎吱嘎吱響，撐不了多久，上面幾層一起壓下來', ok: () => foeHome(1) || foeHome(2) },
      { r: 2, t: '火油兵點著的柱子會越燒越細：燒到撐不住就斷，整座塔一層壓一層垮下來', ok: () => foeLeft(M_WOOD, 1) >= 5 },
      { r: 3, t: '塔頂的兵最高：底下任何一層垮了，他都會一路摔下來', ok: () => foeHome(4) }],
    ground: [[-40, 3], [0, 0], [112, 0], [152, 3]],
    wind: { max: 5, at: 3 },
    me: { castle: 'P3', crew: ['fire', 'rocket', 'stone', 'bomb'] },
    foe: { castle: 'E12', crew: ['bomb', 'fire', 'rocket', 'bolt'], hp: 1.6, dmg: 2.4, open: 0.45, ai: { err: 3.3, think: 1.1, gate: 0.7, hate: 0.25, skill: 0.5, sap: 0.6, warm: 2.1 } },
    weak: (side) => side === 0 ? tgB([[3, 10], [9, 10], [4, 8], [8, 8]], 1.0) : [],
    gates: [
      { owner: 0, mult: 3, h: 5.5, spots: [[46, 38]], move: { t: 'bob', a: 4, per: 8 } },
      { owner: 0, mult: 5, h: 5.5, spots: [[55, 46], [52, 30]], at: 2, hop: true },
      { owner: 1, mult: 2, h: 5.5, spots: [[62, 40]], at: 3, regap: 2 }
    ],
    lantern: { at: 3, every: 3, spots: [[50, 49], [58, 26]] }
  },
  {
    name: '魔王城', tag: '魔王三階段・鐵吊燈', theme: 5,
    tip: '打倒魔王就贏。大殿屋頂吊著一盞鐵吊燈，正好在他頭頂：打斷鐵鍊或木柱，砸下來。毀滅光球打爆了會掉頭砸回去',
    hints: [{ r: 1, t: '打倒魔王就贏：鐵吊燈就吊在他頭頂，打斷鐵鍊（轟天砲、雷法師），或打斷大殿的木柱讓屋頂連燈一起砸下來' }, { r: 2, t: '把魔王腳下的樓板打穿，他摔一層就痛一次；轟出城外也會摔掉一截血' }],
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
